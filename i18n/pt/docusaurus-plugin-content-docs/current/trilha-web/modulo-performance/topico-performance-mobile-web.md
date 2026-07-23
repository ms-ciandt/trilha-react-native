---
title: Performance Mobile
---

# Tópico — Performance Mobile (Trilha Web) 

### Objetivo do tópico

Ao final, o dev deve conseguir:

- Explicar o modelo de threads do RN (JS vs UI vs nativo)
- Utilizar `FlatList` de forma performática para listas grandes
- Reduzir re-renders desnecessários com `React.memo`, `useCallback`, `useMemo`
- Perceber diferenças entre performance web e mobile (hardware, toques, animações)
- Usar Perf Monitor e React Native DevTools para inspecionar FPS e uso de recursos

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Mobile_Performance_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Modelo mental de performance em RN

RN não tem DOM, mas tem problemas equivalentes a “excesso de render” que você já conhece:

- **JS Thread**: semelhante ao “main thread” da aplicação React web — roda sua lógica, hooks, render. Se travar por ~16ms a 60Hz (ou ~8ms em telas 120Hz, comuns em celulares intermediários), um frame cai.
- **UI Thread**: cuida da renderização nativa de views, toques, animações.
- **Native module threads**: usados internamente por I/O, rede e trabalho em segundo plano de módulos nativos.

#### New Architecture (RN 0.76+, padrão)

O modelo de três threads acima descreve a arquitetura legada. Desde o RN 0.76, a New Architecture é padrão e muda os internos:

- **JSI** (JavaScript Interface) substitui a bridge assíncrona — JS chama C++ diretamente e de forma síncrona, sem serialização.
- **TurboModules** substituem o `NativeModules` legado — carregamento lazy no primeiro acesso.
- **Fabric** substitui o renderer antigo — a árvore de views é computada em C++ e suporta as concurrent features do React 18.
- **Thread de layout:** na arquitetura legada, o Yoga rodava em uma Shadow Thread dedicada. No Fabric, o layout é computado em C++.

Para o trabalho do dia a dia, as mesmas regras se aplicam (memoização, FlatList, animações na UI Thread). Para mais contexto, veja a [introdução à New Architecture](../../introducao/02-new-architecture).

---

### Listas grandes — `FlatList` como “virtualized list”

Assim como você não renderiza 10.000 itens no DOM de uma vez, em RN você usa `FlatList`:


```tsx
import React, { useCallback } from 'react';
import { FlatList, Text, View } from 'react-native';

type Item = { id: string; title: string };

const ITEM_HEIGHT = 60;

function ItemRow({ item }: { item: Item }) {
  return (
    <View style={{ height: ITEM_HEIGHT, justifyContent: 'center' }}>
      <Text>{item.title}</Text>
    </View>
  );
}

const MemoItemRow = React.memo(ItemRow);

export function BigList({ items }: { items: Item[] }) {
  const renderItem = useCallback(
    ({ item }: { item: Item }) => <MemoItemRow item={item} />, 
    []
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      initialNumToRender={12}
      windowSize={5}
      getItemLayout={(_, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
    />
  );
}
```


Boas práticas (paralelo com web):

- `React.memo` em itens de lista — equivalente ao evitar re-render de linhas de tabela.
- `useCallback` para `renderItem` — evita função nova por render.
- `getItemLayout` — ajuda RN a calcular posições sem precisar medir (ganho em scroll).

---

### Minimizar trabalho na JS thread

Tal como no browser:

- Evite loops pesados em handlers de scroll ou eventos frequentes.
- Evite construir objetos grandes em cada render.
- Use memoização (`useMemo`) quando cálculo for caro e dependências raramente mudarem.

Exemplo simples:

```tsx
const expensiveComputedList = useMemo(
  () => computeSomethingHuge(rawList),
  [rawList]
);
```

---

### Ferramentas de observação

- **Perf Monitor** (menu de shake → Perf Monitor): mostra FPS de UI/JS em tempo real — primeiro lugar para verificar jank.
- **React Native DevTools** (0.76+): profiler de componentes, destacamento de re-renders, inspetor de rede e logs. Disponível via Menu de Desenvolvedor (shake o dispositivo ou pressione `j` no terminal do Metro). Substitui o Flipper.

:::note Flipper está deprecado
O Flipper foi deprecado no RN 0.73 e removido do template padrão. Use o **React Native DevTools** embutido para profiling.
:::

---

### Exercício prático

1. Crie uma tela com uma lista de 5.000 itens mockados.
2. Implemente versão “ingênua”:
   - Usando `ScrollView` com `.map()` ou `FlatList` sem nenhuma otimização.
3. Observe:
   - Latência ao abrir a tela.
   - Fluidez do scroll.
4. Migre para uma versão otimizada:
   - `FlatList` com `React.memo`, `useCallback`, `getItemLayout`, `initialNumToRender`, `windowSize`.
5. Documente as diferenças (antes/depois) em FPS e sensação de uso.

---

### Materiais de estudo

- [Optimizing Performance — React Native Docs](https://reactnative.dev/docs/optimizing-performance)
- Artigo: *From React Web to React Native — Performance Gotchas*
- Vídeo: *Performance Tips for Web Devs Coming to React Native*

---

Next → **[Testes](../modulo-testes/topico-testes-web)**
