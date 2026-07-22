---
title: "FlatList Optimisation"
sidebar_label: "FlatList"
sidebar_position: 2
---

## Video Overview

> Video for this topic coming soon.

## RecyclerView vs FlatList

You know `RecyclerView` deeply: `ViewHolder` pattern, `DiffUtil`, `setHasStableIds`, `RecycledViewPool`, `setItemViewCacheSize`. FlatList is built on the same virtualisation principle — only visible items are rendered — but the API and optimisation levers are different.

| RecyclerView concept | FlatList equivalent |
|---------------------|-------------------|
| `Adapter.getItemCount()` | `data.length` |
| `onBindViewHolder` | `renderItem` |
| `DiffUtil.ItemCallback` | `keyExtractor` + React reconciler |
| `setHasStableIds(true)` | Stable `keyExtractor` returning unique IDs |
| `RecycledViewPool` | `getItemLayout` (skips measurement, improves recycling) |
| `setItemViewCacheSize` | `windowSize` |
| `prefetchEnabled` | `initialNumToRender` + `maxToRenderPerBatch` |
| `ItemDecoration` | `ItemSeparatorComponent` |
| Sticky headers | `stickyHeaderIndices` |

---

## The Most Important Props

### keyExtractor — always provide it

```tsx
// BAD — uses array index, breaks reconciliation on reorder/insert/delete
<FlatList keyExtractor={(_, index) => String(index)} />

// GOOD — stable unique ID
<FlatList keyExtractor={(item) => item.id} />
```

Without a stable `keyExtractor`, React unmounts and remounts items on every data change instead of updating in place — equivalent to calling `notifyDataSetChanged()` instead of `notifyItemChanged(position)`.

### getItemLayout — skip measurement for fixed-height items

This is the single biggest performance win for lists with fixed-height rows. Without it, FlatList must measure every item as it scrolls into view — expensive. With it, it can calculate positions mathematically.

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

This enables:
- `scrollToIndex` without rendering all preceding items first
- Faster initial scroll position restoration
- Reduced measurement overhead during scroll

### windowSize — control the render window

Controls how many screen-heights of items are kept rendered above and below the viewport. Default is 21 (10 screens above + viewport + 10 screens below).

```tsx
<FlatList
  windowSize={5}        // 2 screens above + viewport + 2 screens below
  initialNumToRender={8} // render 8 items before first paint
  maxToRenderPerBatch={5} // render 5 items per JS frame during scroll
  updateCellsBatchingPeriod={50} // ms between render batches
/>
```

Lower `windowSize` = less memory, more blank flashes when scrolling fast. Higher = more memory, smoother scroll. Tune based on your item complexity and device target.

---

## Memoising renderItem — The ViewHolder Pattern

Every time the parent re-renders, `renderItem` gets a new function reference, which breaks memoisation on row components. Fix it with `useCallback`:

```tsx
// BAD — new function reference on every parent render
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

// GOOD — stable reference + memoised row component
function UserList({ users, onDelete }) {
  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <UserRow user={item} onDelete={onDelete} />
    ),
    [onDelete] // only recreates if onDelete changes
  );

  return (
    <FlatList
      data={users}
      keyExtractor={u => u.id}
      renderItem={renderItem}
    />
  );
}

// Row component — memo prevents re-render if props didn't change
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

## Pagination — onEndReached

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
      onEndReachedThreshold={0.5} // trigger when 50% from the end
      ListFooterComponent={loading ? <ActivityIndicator /> : null}
    />
  );
}
```

Or use TanStack Query's `useInfiniteQuery` for a cleaner paginated data pattern:

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

## Horizontal FlatList — ViewPager Equivalent

```tsx
function ImageCarousel({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();

  return (
    <>
      <FlatList
        data={images}
        horizontal
        pagingEnabled              // snap to page — like ViewPager2
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
      {/* Dot indicators */}
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

## FlashList — Drop-in RecyclerView-Level Performance

[FlashList](https://shopify.github.io/flash-list/) by Shopify is a drop-in replacement for `FlatList` with significantly better performance — it reuses cell components like `RecyclerView`'s `ViewHolder`, instead of unmounting and remounting them.

```bash
npm install @shopify/flash-list
npx expo install @shopify/flash-list
```

```tsx
import { FlashList } from '@shopify/flash-list';

// Replace FlatList with FlashList — same API, better performance
function UserList({ users }: { users: User[] }) {
  return (
    <FlashList
      data={users}
      keyExtractor={u => u.id}
      renderItem={({ item }) => <UserRow user={item} />}
      estimatedItemSize={72} // required — hint for initial render
    />
  );
}
```

Key improvements over FlatList:
- **Cell recycling** — row components are reused, not unmounted/remounted (true `ViewHolder` pattern)
- **No blank flashes** — items are always rendered when they come into view
- **Better `estimatedItemSize`** vs FlatList's `getItemLayout` — simpler API

For lists with > 100 items or complex row components, switch to FlashList before optimising anything else.

---

## Common Anti-Patterns

```tsx
// 1. Anonymous style objects in renderItem — creates new object every render
renderItem={({ item }) => (
  <View style={{ padding: 16, margin: 8 }}> {/* new object each call */}
    <Text>{item.name}</Text>
  </View>
)}
// Fix: use StyleSheet.create outside the component

// 2. Nested FlatLists without nestedScrollEnabled
<FlatList
  renderItem={() => (
    <FlatList ... /> // inner list — scroll conflicts
  )}
/>
// Fix: avoid nested FlatLists. Use SectionList or FlashList with custom sections.

// 3. Filtering/sorting inside renderItem
renderItem={({ item }) => {
  const tags = item.tags.filter(t => t.active); // runs on every render of this row
  return <Row tags={tags} />;
}}
// Fix: pre-process data before passing to FlatList, or useMemo in the row component

// 4. Large images without resizing
renderItem={({ item }) => (
  <Image source={{ uri: item.imageUrl }} style={{ width: 50, height: 50 }} />
  // Loading a 2000x2000 image into a 50x50 view wastes memory
)}
// Fix: resize images on the server or use expo-image with contentFit
```

---

## Study Materials

### Official Documentation

- [React Native — FlatList](https://reactnative.dev/docs/flatlist)
- [React Native — Optimising FlatList Configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [FlashList — Documentation](https://shopify.github.io/flash-list/)

### Videos

- [Catalin Miron — FlatList Performance](https://www.youtube.com/watch?v=1D78Tc46Xqo)
- [Theo — FlatList vs FlashList](https://www.youtube.com/watch?v=pLLxVaHJpqg)

---

## What's Next

FlatList optimised. Next: Reanimated — running animations and gestures entirely on the UI thread via JSI worklets, the correct way to build fluid interactions in React Native.

➡ [Reanimated: Animations on the UI Thread](./03-reanimated)
