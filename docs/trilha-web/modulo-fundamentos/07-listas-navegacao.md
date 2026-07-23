---
title: Lists in React Native
---

# Lists in React Native

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_web/fund_07_listas_navegacao.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> You've built lists with `.map()` on the web. This module shows you RN's virtualized list APIs — `FlatList`, `SectionList`, and grid layouts.

## Lists

### When to Use What

| Situation | Use |
|-----------|-----|
| Short static list (< ~20 items) | `ScrollView` + `.map()` |
| Long or dynamic list | `FlatList` |
| Grouped list (like iOS settings) | `SectionList` |
| Grid layout | `FlatList` with `numColumns` |

### `FlatList` — The Workhorse

```tsx
interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
}

function ProductList({ products }: { products: Product[] }) {
    const renderProduct = useCallback(({ item }: { item: Product }) => (
        <ProductCard product={item} />
    ), []);

    return (
        <FlatList
            data={products}
            keyExtractor={product => String(product.id)} // always coerce — String() handles number and string ids
            renderItem={renderProduct}

            // Performance
            // ️ removeClippedSubviews has documented content-missing bugs on Android
            // (blank areas on scroll-back). Measure before enabling in production.
            // Higher-impact: getItemLayout (fixed-height items) and windowSize (default 21, try 5–10).
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            initialNumToRender={8}

            // Layout
            contentContainerStyle={{ padding: 16, gap: 8 }}
            showsVerticalScrollIndicator={false}

            // Empty state
            ListEmptyComponent={
                <View style={{ alignItems: 'center', padding: 32 }}>
                    <Text style={{ color: '#9ca3af' }}>No products found</Text>
                </View>
            }

            // Load more
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isLoading ? <ActivityIndicator /> : null}

            // Refresh
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
        />
    );
}
```

### Grid with `numColumns`

```tsx
// Like CSS grid with equal columns
<FlatList
    data={images}
    keyExtractor={img => String(img.id)}
    numColumns={3}
    columnWrapperStyle={{ gap: 2 }}
    contentContainerStyle={{ gap: 2 }}
    renderItem={({ item }) => (
        <Image
            source={{ uri: item.url }}
            style={{ flex: 1, aspectRatio: 1 }}  // square cells
        />
    )}
/>
```

### `SectionList` — Grouped Content

```tsx
interface Section {
    title: string;
    data: Product[];
}

const sections: Section[] = [
    { title: 'Featured', data: featuredProducts },
    { title: 'New Arrivals', data: newProducts },
    { title: 'On Sale', data: saleProducts },
];

<SectionList
    sections={sections}
    keyExtractor={item => String(item.id)}
    renderItem={({ item }) => <ProductCard product={item} />}
    renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
    )}
    stickySectionHeadersEnabled={true}  // sticky like iOS section headers
/>
```

---

## Resources

| Resource | Type | Link |
|---|---|---|
| FlatList API | Official | [reactnative.dev/docs/flatlist](https://reactnative.dev/docs/flatlist) |
| SectionList API | Official | [reactnative.dev/docs/sectionlist](https://reactnative.dev/docs/sectionlist) |
| notJust.dev — Full Course (8hr) | Video | [youtube.com/@notjustdev](https://www.youtube.com/@notjustdev) |

---

Next → **[Navigation](./navegacao-web)**