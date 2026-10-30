---
title: "Modelo de Threads & a Thread JS"
sidebar_label: "Modelo de Threads"
sidebar_position: 1
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/perf_01_thread.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/perf_01_thread.vtt" srclang="pt" label="Português" default>
  Seu navegador não suporta o elemento de vídeo.
</video>

## Threads que Você Já Conhece

O Android tem um modelo de threads claro: a thread Principal (UI) renderiza views e processa eventos de toque, e você nunca a bloqueia. Você despacha trabalho pesado para `Dispatchers.IO` ou `Dispatchers.Default` com coroutines.

O React Native com a Nova Arquitetura tem um modelo análogo — mas com nomes diferentes e uma diferença crítica: **o JavaScript roda em sua própria thread dedicada, separada da thread de UI**.

---

## As Três Threads Principais

| Thread | Equivalente no Android | O que executa aqui |
|--------|-------------------|----------------|
| **Thread JS** | Sem equivalente direto (mais próximo: `Dispatchers.Default`) | Seus componentes React, atualizações de estado, lógica de negócio, `useEffect`, busca de dados |
| **Thread de UI (Thread Principal)** | `Dispatchers.Main` | Criação de views nativas, layout, desenho — a mesma thread de UI do Android que você conhece |
| **Shadow Thread (Fabric)** | `RenderThread` | Cálculos de layout do Yoga, diffing da shadow tree — introduzido pela Nova Arquitetura |

Com a **Nova Arquitetura**, existem também:

| Thread | Propósito |
|--------|---------|
| **Frame Processor Thread** | Processadores de frame do Vision Camera (worklets JSI) |
| **Reanimated Worklet Thread** | Animações rodando fora da thread JS via JSI |
| **Pool de Threads de Módulos Nativos** | Operações assíncronas de TurboModules |

---

## A Regra de Ouro: Nunca Bloqueie a Thread JS

A thread JS e a thread de UI do Android são separadas, mas estão **acopladas**: se a thread JS estiver ocupada computando por mais de ~16ms, ela não consegue informar o Fabric para atualizar as views, o que causa queda de frames na thread de UI.

Este é o equivalente React Native de chamar uma requisição de rede na thread Principal do Android — a thread não trava, mas tudo congela.

```tsx
// RUIM — computação síncrona bloqueante na thread JS
function ExpensiveList({ items }: { items: RawItem[] }) {
  // Isso roda na thread JS a cada render
  // Se items tiver 10.000 entradas isso leva ~50ms — 3 frames perdidos
  const processed = items.map(item => expensiveTransform(item));

  return <FlatList data={processed} renderItem={...} />;
}

// BOM — memoizado, só recomputa quando items muda
function ExpensiveList({ items }: { items: RawItem[] }) {
  const processed = useMemo(
    () => items.map(item => expensiveTransform(item)),
    [items]
  );

  return <FlatList data={processed} renderItem={...} />;
}
```

---

## Detectando Bloqueio da Thread JS

### Em desenvolvimento — o monitor de FPS

Ative o overlay de FPS no menu de desenvolvimento (agite o dispositivo → "Show Perf Monitor"). Dois números aparecem:

- **UI**: frames por segundo na thread de UI — deve ser 60 (ou 120 em dispositivos de alta taxa de atualização)
- **JS**: frames por segundo na thread JS — cai quando seu JS está ocupado demais

Quando UI está em 60 mas JS está em 30, seu JavaScript é o gargalo. Quando ambos caem, é a camada de renderização nativa.

### No código — InteractionManager

```tsx
import { InteractionManager } from 'react-native';

// Adia trabalho pesado até que animações/transições terminem
// Equivalente a postar na thread principal após um frame com Handler.post()
function ScreenWithHeavyData() {
  const [data, setData] = useState<ProcessedItem[]>([]);

  useEffect(() => {
    // Espera a animação de transição de navegação terminar primeiro
    const task = InteractionManager.runAfterInteractions(() => {
      const result = heavyComputation();
      setData(result);
    });
    return () => task.cancel();
  }, []);

  return data.length === 0 ? <LoadingPlaceholder /> : <DataList data={data} />;
}
```

---

## Movendo Trabalho Para Fora da Thread JS

### Opção 1: Worklets do Reanimated (animações na thread de UI)

Animações que leem estado de gestos ou controlam layout devem rodar na thread de UI, não na thread JS. Coberto no tópico sobre Reanimated.

### Opção 2: Chamadas Nativas Síncronas via JSI

Computação pesada pode ser descarregada para Kotlin via TurboModule, mantendo a thread JS livre:

```kotlin
// Kotlin — roda em uma thread em background, resolvida de volta para JS
override fun processItems(items: ReadableArray, promise: Promise) {
    CoroutineScope(Dispatchers.Default).launch {
        val result = WritableNativeArray()
        repeat(items.size()) { i ->
            result.pushMap(transform(items.getMap(i)))
        }
        promise.resolve(result)
    }
}
```

```tsx
// JS — aguarda o resultado sem bloquear a thread JS
const processed = await NativeProcessor.processItems(rawItems);
```

### Opção 3: Web Workers via react-native-workers

Para lógica JS com uso intenso de CPU (criptografia, processamento de imagens, parsing):

```bash
npm install react-native-workers
```

```tsx
// worker.ts — roda em um contexto JS separado (instância Hermes separada)
self.onmessage = (event) => {
  const { items } = event.data;
  const result = items.map(expensiveTransform);
  self.postMessage(result);
};

// Thread principal
import Worker from './worker';
const worker = new Worker();
worker.postMessage({ items: rawItems });
worker.onmessage = (event) => setData(event.data);
```

---

## startTransition — Atualizações de Estado de Baixa Prioridade

O `startTransition` do React 18 marca uma atualização de estado como interrompível — a thread de UI pode processar atualizações mais urgentes (eventos de toque, animações) primeiro.

Equivalente ao padrão `Handler.postDelayed()` do Android para adiar trabalho de baixa prioridade, mas mais inteligente — o React pode interromper e reiniciar a atualização se um evento de maior prioridade chegar.

```tsx
import { startTransition, useState } from 'react';
import { TextInput } from 'react-native';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  function handleSearch(text: string) {
    // Urgente: atualiza o input imediatamente
    setQuery(text);

    // Não urgente: filtrar 10.000 itens pode esperar
    startTransition(() => {
      setResults(filterItems(allItems, text));
    });
  }

  return (
    <>
      <TextInput value={query} onChangeText={handleSearch} />
      <ResultList results={results} />
    </>
  );
}
```

---

## A Vantagem da Nova Arquitetura: Layout Síncrono

Na arquitetura antiga, todo cálculo de layout passava pela bridge assíncrona. Com o Fabric, o layout roda **sincronamente** em C++ na Shadow Thread — o mesmo pipeline de renderização que as views nativas do Android.

Isso significa:
- Callbacks de `onLayout` disparam no mesmo frame que a mudança de layout
- A posição de scroll pode ser lida sincronamente
- Chamadas `measure()` são síncronas (via `ref.current.measure(...)`)

```tsx
import { useRef } from 'react';
import { View } from 'react-native';

function MeasurableBox() {
  const ref = useRef<View>(null);

  function logSize() {
    // Síncrono na Nova Arquitetura — sem necessidade de callback assíncrono
    ref.current?.measureInWindow((x, y, width, height) => {
      console.log(`Position: ${x},${y} Size: ${width}x${height}`);
    });
  }

  return <View ref={ref} onLayout={logSize} />;
}
```

---

## Profiling: Encontrando Gargalos de Threads

### React Native DevTools — aba Profiler

1. Abra o React Native DevTools (pressione `j` no Metro)
2. Vá para a aba **Profiler**
3. Clique em **Record**
4. Interaja com a parte lenta do seu app
5. Pare a gravação
6. Inspecione o flame chart — cada barra é um render de componente

Procure por:
- Componentes que re-renderizam com muita frequência (largura da barra x frequência)
- Componentes com tempo de render longo (altura da barra no tempo)
- Re-renders em cascata (um pai re-renderizando todos os filhos desnecessariamente)

### Systrace — Timeline de Frames com Visão de Threads

```bash
python3 $ANDROID_HOME/platform-tools/systrace/systrace.py \
  --time=10 -o trace.html sched gfx view react
```

No trace, a **thread JS** aparece como `mqt_js`. Um bloco longo aqui é um gargalo de JS. Se você ver a thread JS bloqueada enquanto a thread de UI está ociosa, você precisa de `useMemo`, `memo` ou um worklet.

---

## Materiais de Estudo

### Documentação Oficial

- [React Native — Visão Geral de Performance](https://reactnative.dev/docs/performance)
- [React Native — Modelo de Threading](https://reactnative.dev/docs/the-new-architecture/threading-model)
- [React — startTransition](https://react.dev/reference/react/startTransition)
- [React Native — InteractionManager](https://reactnative.dev/docs/interactionmanager)

### Vídeos

- [React Native EU — Performance Deep Dive](https://www.youtube.com/watch?v=gvkqT_Uoahw)
- [Catalin Miron — React Native Performance](https://www.youtube.com/watch?v=1D78Tc46Xqo)

---

## Próximo Passo

Modelo de threads compreendido. Próximo: otimizando o `FlatList` — a fonte mais comum de lentidão na rolagem em apps React Native, e o que todo desenvolvedor Android precisa saber vindo do `RecyclerView`.

➡ [Otimização de FlatList](./02-flatlist-optimisation)
