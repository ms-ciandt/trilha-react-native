---
title: Listas no React Native
---

# Listas no React Native

> Você já construiu listas com `.map()` na web. Este módulo mostra as APIs de listas virtualizadas do RN — `FlatList`, `SectionList` e layouts em grid.

## Listas

### Quando Usar o Quê

| Situação | Use |
|-----------|-----|
| Lista estática curta (< ~20 itens) | `ScrollView` + `.map()` |
| Lista longa ou dinâmica | `FlatList` |
| Lista agrupada (como configurações do iOS) | `SectionList` |
| Layout em grade | `FlatList` com `numColumns` |

### `FlatList` — O Carro-chefe

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
            keyExtractor={product => String(product.id)} // sempre converta — String() lida com ids numéricos e string
            renderItem={renderProduct}

            // Performance
            // ️ removeClippedSubviews tem bugs documentados de conteúdo faltando no Android
            // (áreas em branco ao rolar de volta). Meça antes de habilitar em produção.
            // Maior impacto: getItemLayout (itens de altura fixa) e windowSize (padrão 21, tente 5–10).
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            initialNumToRender={8}

            // Layout
            contentContainerStyle={{ padding: 16, gap: 8 }}
            showsVerticalScrollIndicator={false}

            // Estado vazio
            ListEmptyComponent={
                <View style={{ alignItems: 'center', padding: 32 }}>
                    <Text style={{ color: '#9ca3af' }}>Nenhum produto encontrado</Text>
                </View>
            }

            // Carregar mais
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isLoading ? <ActivityIndicator /> : null}

            // Atualizar
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
        />
    );
}
```

### Grade com `numColumns`

```tsx
// Como CSS grid com colunas iguais
<FlatList
    data={images}
    keyExtractor={img => String(img.id)}
    numColumns={3}
    columnWrapperStyle={{ gap: 2 }}
    contentContainerStyle={{ gap: 2 }}
    renderItem={({ item }) => (
        <Image
            source={{ uri: item.url }}
            style={{ flex: 1, aspectRatio: 1 }}  // células quadradas
        />
    )}
/>
```

### `SectionList` — Conteúdo Agrupado

```tsx
interface Section {
    title: string;
    data: Product[];
}

const sections: Section[] = [
    { title: 'Destaques', data: featuredProducts },
    { title: 'Novidades', data: newProducts },
    { title: 'Em Promoção', data: saleProducts },
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
    stickySectionHeadersEnabled={true}  // fixo como headers de seção do iOS
/>
```

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| API FlatList | Oficial | [reactnative.dev/docs/flatlist](https://reactnative.dev/docs/flatlist) |
| API SectionList | Oficial | [reactnative.dev/docs/sectionlist](https://reactnative.dev/docs/sectionlist) |
| notJust.dev — Curso Completo (8h) | Vídeo | [youtube.com/@notjustdev](https://www.youtube.com/@notjustdev) |

---

Próximo → **[Navegação](./navegacao-web)**
