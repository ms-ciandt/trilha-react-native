---
id: lists-and-navigation
title: Lists & Navigation in React Native
sidebar_label: Lists & Navigation
sidebar_position: 7
---

# Lists & Navigation in React Native

> You've built lists with `.map()` and navigated with React Router. This module shows you RN's virtualized list APIs and how Expo Router maps almost 1:1 to Next.js App Router.

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
            // ⚠️ removeClippedSubviews has documented content-missing bugs on Android
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

## Navigation with Expo Router

Expo Router uses file-based routing — **the same mental model as Next.js App Router**.

### File Structure → Routes

```
app/
├── _layout.tsx          → Root layout (like layout.tsx in Next.js)
├── index.tsx            → Route: /
├── (tabs)/              → Tab group (parentheses = layout group)
│   ├── _layout.tsx      → Tab bar layout
│   ├── home.tsx         → Route: /home
│   ├── explore.tsx      → Route: /explore
│   └── profile.tsx      → Route: /profile
├── user/
│   ├── [id].tsx         → Route: /user/123 (dynamic segment)
│   └── index.tsx        → Route: /user
└── modal.tsx            → Route: /modal
```

### Navigation

```tsx
import { Link, useRouter } from 'expo-router';

function HomeScreen() {
    const router = useRouter();

    return (
        <View>
            {/* Declarative navigation (like <a> or <Link> in Next.js) */}
            <Link href="/profile">Go to Profile</Link>
            <Link href="/user/123">User 123</Link>
            <Link href={{ pathname: '/user/[id]', params: { id: '123' } }}>User 123</Link>

            {/* Programmatic navigation */}
            <Pressable onPress={() => router.push('/settings')}>
                <Text>Settings</Text>
            </Pressable>
            <Pressable onPress={() => router.back()}>
                <Text>Back</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/login')}>
                <Text>Logout (replace history)</Text>
            </Pressable>
        </View>
    );
}
```

### Reading Route Params

```tsx
// app/user/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function UserScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <Text>User: {id}</Text>;
}
```

### Root Layout

```tsx
// app/_layout.tsx — like Next.js root layout
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
        </SafeAreaProvider>
    );
}
```

### Tab Navigation

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs>
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
```

---

## Web Routing vs Mobile Navigation

| Web (React Router / Next.js) | React Native (Expo Router) |
|------------------------------|---------------------------|
| URL-based, shareable links | Deep links supported, but optional |
| Browser back button | Native back gesture (swipe left on iOS) |
| `<Link href="...">` | `<Link href="...">` (same!) |
| `useNavigate()` push/replace | `router.push()` / `router.replace()` |
| Query strings `?key=val` | `useLocalSearchParams()` |
| Modal via route | `presentation: 'modal'` in Stack |
| 404 page | `+not-found.tsx` file |

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Expo Router Introduction | Official | [docs.expo.dev/router/introduction/](https://docs.expo.dev/router/introduction/) |
| FlatList API | Official | [reactnative.dev/docs/flatlist](https://reactnative.dev/docs/flatlist) |
| SectionList API | Official | [reactnative.dev/docs/sectionlist](https://reactnative.dev/docs/sectionlist) |
| notJust.dev — Full Course (8hr) | Video | [youtube.com/@notjustdev](https://www.youtube.com/@notjustdev) |

---

🎉 **You've completed the Web Dev Track!**

You now have the foundations to build real React Native apps. Next steps:
- Create your first Expo project: `npx create-expo-app@latest MyApp`
- Try [Expo Snack](https://snack.expo.dev) for quick experiments
- Watch [notJust.dev's free 8-hour course](https://www.youtube.com/@notjustdev) for a full project walkthrough
