---
title: "Modelo de Threads & a Thread JS"
sidebar_label: "Modelo de Threads"
sidebar_position: 1
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/perf_01_thread.mp4" type="video/mp4">
  Seu navegador nao suporta o elemento de video.
</video>

## Threads que Voce Ja Conhece

O Android tem um modelo de threads claro: a thread Principal (UI) renderiza views e processa eventos de toque, e voce nunca a bloqueia. Voce despacha trabalho pesado para `Dispatchers.IO` ou `Dispatchers.Default` com coroutines.

O React Native com a Nova Arquitetura tem um modelo analogo — mas com nomes diferentes e uma diferenca critica: **o JavaScript roda em sua propria thread dedicada, separada da thread de UI**.

---

## As Tres Threads Principais

| Thread | Equivalente no Android | O que executa aqui |
|--------|-------------------|----------------|
| **Thread JS** | Sem equivalente direto (mais proximo: `Dispatchers.Default`) | Seus componentes React, atualizacoes de estado, logica de negocio, `useEffect`, busca de dados |
| **Thread de UI (Thread Principal)** | `Dispatchers.Main` | Criacao de views nativas, layout, desenho — a mesma thread de UI do Android que voce conhece |
| **Shadow Thread (Fabric)** | `RenderThread` | Calculos de layout do Yoga, diffing da shadow tree — introduzido pela Nova Arquitetura |

Com a **Nova Arquitetura**, existem tambem:

| Thread | Proposito |
|--------|---------|
| **Frame Processor Thread** | Processadores de frame do Vision Camera (worklets JSI) |
| **Reanimated Worklet Thread** | Animacoes rodando fora da thread JS via JSI |
| **Pool de Threads de Modulos Nativos** | Operacoes assincronas de TurboModules |

---

## A Regra de Ouro: Nunca Bloqueie a Thread JS

A thread JS e a thread de UI do Android sao separadas, mas estao **acopladas**: se a thread JS estiver ocupada computando por mais de ~16ms, ela nao consegue informar o Fabric para atualizar as views, o que causa queda de frames na thread de UI.

Este e o equivalente React Native de chamar uma requisicao de rede na thread Principal do Android — a thread nao trava, mas tudo congela.

```tsx
// RUIM — computacao sincrona bloqueante na thread JS
function ExpensiveList({ items }: { items: RawItem[] }) {
  // Isso roda na thread JS a cada render
  // Se items tiver 10.000 entradas isso leva ~50ms — 3 frames perdidos
  const processed = items.map(item => expensiveTransform(item));

  return <FlatList data={processed} renderItem={...} />;
}

// BOM — memoizado, so recomputa quando items muda
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

Ative o overlay de FPS no menu de desenvolvimento (agite o dispositivo → "Show Perf Monitor"). Dois numeros aparecem:

- **UI**: frames por segundo na thread de UI — deve ser 60 (ou 120 em dispositivos de alta taxa de atualizacao)
- **JS**: frames por segundo na thread JS — cai quando seu JS esta ocupado demais

Quando UI esta em 60 mas JS esta em 30, seu JavaScript e o gargalo. Quando ambos caem, e a camada de renderizacao nativa.

### No codigo — InteractionManager

```tsx
import { InteractionManager } from 'react-native';

// Adia trabalho pesado ate que animacoes/transicoes terminem
// Equivalente a postar na thread principal apos um frame com Handler.post()
function ScreenWithHeavyData() {
  const [data, setData] = useState<ProcessedItem[]>([]);

  useEffect(() => {
    // Espera a animacao de transicao de navegacao terminar primeiro
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

### Opcao 1: Worklets do Reanimated (animacoes na thread de UI)

Animacoes que leem estado de gestos ou controlam layout devem rodar na thread de UI, nao na thread JS. Coberto no topico sobre Reanimated.

### Opcao 2: Chamadas Nativas Sincronas via JSI

Computacao pesada pode ser descarregada para Kotlin via TurboModule, mantendo a thread JS livre:

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

### Opcao 3: Web Workers via react-native-workers

Para logica JS com uso intenso de CPU (criptografia, processamento de imagens, parsing):

```bash
npm install react-native-workers
```

```tsx
// worker.ts — roda em um contexto JS separado (instancia Hermes separada)
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

## startTransition — Atualizacoes de Estado de Baixa Prioridade

O `startTransition` do React 18 marca uma atualizacao de estado como interrompivel — a thread de UI pode processar atualizacoes mais urgentes (eventos de toque, animacoes) primeiro.

Equivalente ao padrao `Handler.postDelayed()` do Android para adiar trabalho de baixa prioridade, mas mais inteligente — o React pode interromper e reiniciar a atualizacao se um evento de maior prioridade chegar.

```tsx
import { startTransition, useState } from 'react';
import { TextInput } from 'react-native';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  function handleSearch(text: string) {
    // Urgente: atualiza o input imediatamente
    setQuery(text);

    // Nao urgente: filtrar 10.000 itens pode esperar
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

## A Vantagem da Nova Arquitetura: Layout Sincrono

Na arquitetura antiga, todo calculo de layout passava pela bridge assincrona. Com o Fabric, o layout roda **sincronamente** em C++ na Shadow Thread — o mesmo pipeline de renderizacao que as views nativas do Android.

Isso significa:
- Callbacks de `onLayout` disparam no mesmo frame que a mudanca de layout
- A posicao de scroll pode ser lida sincronamente
- Chamadas `measure()` sao sincronas (via `ref.current.measure(...)`)

```tsx
import { useRef } from 'react';
import { View } from 'react-native';

function MeasurableBox() {
  const ref = useRef<View>(null);

  function logSize() {
    // Sincrono na Nova Arquitetura — sem necessidade de callback assincrono
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
2. Va para a aba **Profiler**
3. Clique em **Record**
4. Interaja com a parte lenta do seu app
5. Pare a gravacao
6. Inspecione o flame chart — cada barra e um render de componente

Procure por:
- Componentes que re-renderizam com muita frequencia (largura da barra x frequencia)
- Componentes com tempo de render longo (altura da barra no tempo)
- Re-renders em cascata (um pai re-renderizando todos os filhos desnecessariamente)

### Systrace — Timeline de Frames com Visao de Threads

```bash
python3 $ANDROID_HOME/platform-tools/systrace/systrace.py \
  --time=10 -o trace.html sched gfx view react
```

No trace, a **thread JS** aparece como `mqt_js`. Um bloco longo aqui e um gargalo de JS. Se voce ver a thread JS bloqueada enquanto a thread de UI esta ociosa, voce precisa de `useMemo`, `memo` ou um worklet.

---

## Materiais de Estudo

### Documentacao Oficial

- [React Native — Visao Geral de Performance](https://reactnative.dev/docs/performance)
- [React Native — Modelo de Threading](https://reactnative.dev/docs/the-new-architecture/threading-model)
- [React — startTransition](https://react.dev/reference/react/startTransition)
- [React Native — InteractionManager](https://reactnative.dev/docs/interactionmanager)

### Videos

- [React Native EU — Performance Deep Dive](https://www.youtube.com/watch?v=gvkqT_Uoahw)
- [Catalin Miron — React Native Performance](https://www.youtube.com/watch?v=1D78Tc46Xqo)

---

## Proximo Passo

Modelo de threads compreendido. Proximo: otimizando o `FlatList` — a fonte mais comum de lentidao na rolagem em apps React Native, e o que todo desenvolvedor Android precisa saber vindo do `RecyclerView`.

➡ [Otimizacao de FlatList](./02-flatlist-optimisation)
