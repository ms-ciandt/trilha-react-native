---
title: "Otimização de FlatList"
sidebar_label: "FlatList"
sidebar_position: 2
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/perf_02_flatlist.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/perf_02_flatlist.vtt" srclang="pt" label="Português" default>
  Seu navegador nao suporta o elemento de video.
</video>

## RecyclerView vs FlatList

Você conhece o `RecyclerView` em profundidade: padrão `ViewHolder`, `DiffUtil`, `setHasStableIds`, `RecycledViewPool`, `setItemViewCacheSize`. O FlatList é construído sobre o mesmo princípio de virtualização — apenas os itens visíveis são renderizados — mas a API e os controles de otimização são diferentes.

| Conceito no RecyclerView | Equivalente no FlatList |
|---------------------|-------------------|
| `Adapter.getItemCount()` | `data.length` |
| `onBindViewHolder` | `renderItem` |
| `DiffUtil.ItemCallback` | `keyExtractor` + reconciliador do React |
| `setHasStableIds(true)` | `keyExtractor` estável retornando IDs únicos |
| `RecycledViewPool` | `getItemLayout` (pula medição, melhora o reuso) |
| `setItemViewCacheSize` | `windowSize` |
| `prefetchEnabled` | `initialNumToRender` + `maxToRenderPerBatch` |
| `ItemDecoration` | `ItemSeparatorComponent` |
| Sticky headers | `stickyHeaderIndices` |

---

## As Props Mais Importantes

### keyExtractor — sempre forneça

```tsx
// RUIM — usa índice do array, quebra a reconciliação em reordenação/inserção/exclusão
<FlatList keyExtractor={(_, index) => String(index)} />

// BOM — ID único estável
<FlatList keyExtractor={(item) => item.id} />
```

Sem um `keyExtractor` estável, o React desmonta e remonta os itens a cada mudança de dados em vez de atualizá-los no lugar — equivalente a chamar `notifyDataSetChanged()` em vez de `notifyItemChanged(position)`.

### getItemLayout — pule a medição para itens de altura fixa

Esse é o maior ganho de performance para listas com linhas de altura fixa. Sem ele, o FlatList precisa medir cada item conforme ele entra na área visível — processo custoso. Com ele, as posições podem ser calculadas matematicamente.

```tsx
const ITEM_HEIGHT = 72;
const SEPARATOR_HEIGHT = 1;
const ITEM_TOTAL = ITEM_HEIGHT + SEPARATOR_HEIGHT;

<FlatList
  data={users}
  keyExtractor={u => u.id}
  renderItem={({ item }) => <UserRow user={item} />}
  getItemLayout={(_, index) => ({
    length: ITEM_TOTAL,
    offset: ITEM_TOTAL * index,
    index,
  })}
  ItemSeparatorComponent={() => <View style={{ height: SEPARATOR_HEIGHT }} />}
/>
```

Isso habilita:
- `scrollToIndex` sem precisar renderizar todos os itens anteriores primeiro
- Restauração mais rápida da posição de scroll inicial
- Menos overhead de medição durante o scroll

### windowSize — controle a janela de renderização

Controla quantas alturas de tela de itens são mantidas renderizadas acima e abaixo da viewport. O padrão é 21 (10 telas acima + viewport + 10 telas abaixo).

```tsx
<FlatList
  windowSize={5}        // 2 telas acima + viewport + 2 telas abaixo
  initialNumToRender={8} // renderiza 8 itens antes do primeiro paint
  maxToRenderPerBatch={5} // renderiza 5 itens por frame JS durante o scroll
  updateCellsBatchingPeriod={50} // ms entre batches de renderização
/>
```

`windowSize` menor = menos memória, mais flashes em branco ao rolar rápido. Maior = mais memória, scroll mais suave. Ajuste conforme a complexidade dos itens e o dispositivo alvo.

---

## Memorizando renderItem — O Padrão ViewHolder

Toda vez que o componente pai re-renderiza, `renderItem` recebe uma nova referência de função, o que quebra a memoização nos componentes de linha. Corrija com `useCallback`:

```tsx
// RUIM — nova referência de função a cada render do pai
function UserList({ users, onDelete }) {
  return (
    <FlatList
      data={users}
      renderItem={({ item }) => (
        <UserRow user={item} onDelete={onDelete} />
      )}
    />
  );
}

// BOM — referência estável + componente de linha memoizado
function UserList({ users, onDelete }) {
  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <UserRow user={item} onDelete={onDelete} />
    ),
    [onDelete] // recria apenas se onDelete mudar
  );

  return (
    <FlatList
      data={users}
      keyExtractor={u => u.id}
      renderItem={renderItem}
    />
  );
}

// Componente de linha — memo evita re-render se as props não mudaram
const UserRow = memo(function UserRow({
  user,
  onDelete,
}: {
  user: User;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{user.name}</Text>
      <Pressable onPress={() => onDelete(user.id)}>
        <Text>Delete</Text>
      </Pressable>
    </View>
  );
});
```

---

## Paginação — onEndReached

```tsx
function PaginatedList() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const newItems = await api.getItems({ page });
    setItems(prev => [...prev, ...newItems]);
    setHasMore(newItems.length > 0);
    setPage(p => p + 1);
    setLoading(false);
  }

  return (
    <FlatList
      data={items}
      keyExtractor={i => i.id}
      renderItem={({ item }) => <ItemRow item={item} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5} // dispara quando está 50% do fim
      ListFooterComponent={loading ? <ActivityIndicator /> : null}
    />
  );
}
```

Ou use o `useInfiniteQuery` do TanStack Query para um padrão mais limpo de dados paginados:

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlatList } from 'react-native';

function InfiniteList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: ({ pageParam = 1 }) => api.getItems({ page: pageParam }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length > 0 ? pages.length + 1 : undefined,
  });

  const items = data?.pages.flat() ?? [];

  return (
    <FlatList
      data={items}
      keyExtractor={i => i.id}
      renderItem={({ item }) => <ItemRow item={item} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
    />
  );
}
```

---

## Pull-to-Refresh

```tsx
function RefreshableList() {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetchData();
    setRefreshing(false);
  }

  return (
    <FlatList
      data={items}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      // ...
    />
  );
}
```

---

## FlatList Horizontal — Equivalente ao ViewPager

```tsx
function ImageCarousel({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();

  return (
    <>
      <FlatList
        data={images}
        horizontal
        pagingEnabled              // snap por página — como ViewPager2
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems[0]) setActiveIndex(viewableItems[0].index ?? 0);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width, height: 300 }} resizeMode="cover" />
        )}
      />
      {/* Indicadores de ponto */}
      <View style={styles.dots}>
        {images.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.activeDot]} />
        ))}
      </View>
    </>
  );
}
```

---

## FlashList — Performance de RecyclerView como Drop-in

O [FlashList](https://shopify.github.io/flash-list/) da Shopify é uma substituição direta do `FlatList` com performance significativamente melhor — ele reutiliza componentes de célula como o `ViewHolder` do `RecyclerView`, em vez de desmontá-los e remontá-los.

```bash
npm install @shopify/flash-list
npx expo install @shopify/flash-list
```

```tsx
import { FlashList } from '@shopify/flash-list';

// Substitua FlatList por FlashList — mesma API, melhor performance
function UserList({ users }: { users: User[] }) {
  return (
    <FlashList
      data={users}
      keyExtractor={u => u.id}
      renderItem={({ item }) => <UserRow user={item} />}
      estimatedItemSize={72} // obrigatório — dica para o render inicial
    />
  );
}
```

Principais melhorias em relação ao FlatList:
- **Reciclagem de células** — componentes de linha são reutilizados, não desmontados/remontados (padrão verdadeiro de `ViewHolder`)
- **Sem flashes em branco** — itens são sempre renderizados ao entrar na área visível
- **`estimatedItemSize` mais simples** vs `getItemLayout` do FlatList — API mais direta

Para listas com mais de 100 itens ou componentes de linha complexos, migre para o FlashList antes de qualquer outra otimização.

---

## Anti-Padrões Comuns

```tsx
// 1. Objetos de estilo anônimos no renderItem — cria novo objeto a cada render
renderItem={({ item }) => (
  <View style={{ padding: 16, margin: 8 }}> {/* novo objeto a cada chamada */}
    <Text>{item.name}</Text>
  </View>
)}
// Correção: use StyleSheet.create fora do componente

// 2. FlatLists aninhadas sem nestedScrollEnabled
<FlatList
  renderItem={() => (
    <FlatList ... /> // lista interna — conflito de scroll
  )}
/>
// Correção: evite FlatLists aninhadas. Use SectionList ou FlashList com seções customizadas.

// 3. Filtros/ordenações dentro do renderItem
renderItem={({ item }) => {
  const tags = item.tags.filter(t => t.active); // executa a cada render desta linha
  return <Row tags={tags} />;
}}
// Correção: pré-processe os dados antes de passá-los ao FlatList, ou use useMemo no componente de linha

// 4. Imagens grandes sem redimensionamento
renderItem={({ item }) => (
  <Image source={{ uri: item.imageUrl }} style={{ width: 50, height: 50 }} />
  // Carregar uma imagem 2000x2000 em uma view 50x50 desperdiça memória
)}
// Correção: redimensione as imagens no servidor ou use expo-image com contentFit
```

---

## Materiais de Estudo

### Documentação Oficial

- [React Native — FlatList](https://reactnative.dev/docs/flatlist)
- [React Native — Otimizando a Configuração do FlatList](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [FlashList — Documentação](https://shopify.github.io/flash-list/)

### Vídeos

- [Catalin Miron — FlatList Performance](https://www.youtube.com/watch?v=1D78Tc46Xqo)
- [Theo — FlatList vs FlashList](https://www.youtube.com/watch?v=pLLxVaHJpqg)

---

## O Que Vem a Seguir

FlatList otimizado. A seguir: Reanimated — rodando animações e gestos inteiramente na thread de UI via worklets JSI, a forma correta de construir interações fluidas em React Native.

➡ [Reanimated: Animações na Thread de UI](./03-reanimated)
