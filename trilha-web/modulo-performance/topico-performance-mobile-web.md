# Tópico — Performance Mobile (Trilha Web) 

### Objetivo do tópico

Ao final, o dev deve conseguir:

- Explicar o modelo de threads do RN (JS vs UI vs nativo)
- Utilizar `FlatList` de forma performática para listas grandes
- Reduzir re-renders desnecessários com `React.memo`, `useCallback`, `useMemo`
- Perceber diferenças entre performance web e mobile (hardware, toques, animações)
- Usar perf monitor e Flipper para inspecionar FPS e uso de recursos

---

### Modelo mental de performance em RN

RN não tem DOM, mas tem problemas equivalentes a “excesso de render” que você já conhece:

- **JS Thread**: semelhante ao “main thread” da aplicação React web — roda sua lógica, hooks, render.
- **UI Thread**: cuida da renderização nativa de views, toques, animações.
- **Ponte (bridge)**: comunicação entre JS e nativo; tráfego excessivo pode prejudicar performance.

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

- **Perf Monitor** (`Debug → Show Perf Monitor`): mostra FPS de UI/JS.
- **Flipper**:
  - Plugin React Native para ver perf, logs e eventos.
  - Ajuda a identificar warnings como “VirtualizedLists should never be nested” e listas mal configuradas.

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
