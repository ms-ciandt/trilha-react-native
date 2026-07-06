---
title: Lists & Navigation in React Native
---

# Lists & Navigation in React Native

> You've built lists with `.map()` and navigated with React Router. This module shows you RN's virtualized list APIs and how React Navigation handles screen transitions on mobile.

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

## Navigation with React Navigation

Mobile navigation is fundamentally different from the web. There's no URL bar — navigation is a **stack of screens pushed onto memory**, with native gestures (swipe back on iOS, Android back button) to pop them off.

**React Navigation** is the standard library for this. Install it in a React Native CLI project:

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

### Setting Up the Navigator

```tsx
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';

type RootStackParamList = {
    Home: undefined;
    Profile: { userId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
```

### Navigating Between Screens

```tsx
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function HomeScreen() {
    const navigation = useNavigation<HomeNavProp>();

    return (
        <View>
            {/* Push a new screen */}
            <Pressable onPress={() => navigation.navigate('Profile', { userId: '123' })}>
                <Text>Go to Profile</Text>
            </Pressable>
            {/* Go back */}
            <Pressable onPress={() => navigation.goBack()}>
                <Text>Back</Text>
            </Pressable>
            {/* Replace current screen (no back) */}
            <Pressable onPress={() => navigation.replace('Home')}>
                <Text>Reset</Text>
            </Pressable>
        </View>
    );
}
```

### Reading Route Params

```tsx
import { useRoute, RouteProp } from '@react-navigation/native';

type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;

function ProfileScreen() {
    const route = useRoute<ProfileRouteProp>();
    const { userId } = route.params;

    return <Text>User: {userId}</Text>;
}
```

### Tab Navigation

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// npm install @react-navigation/bottom-tabs

const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
```

---

## Web Routing vs Mobile Navigation

| Web (React Router / Next.js) | React Native (React Navigation) |
|------------------------------|---------------------------------|
| URL-based, shareable links | Deep links supported, but optional |
| Browser back button | Native back gesture (swipe left on iOS) |
| `<Link to="...">` | `navigation.navigate('ScreenName')` |
| `useNavigate()` push/replace | `navigation.navigate()` / `navigation.replace()` |
| Query strings `?key=val` | `route.params` object |
| Modal via route | `presentation: 'modal'` in Stack.Screen |
| 404 page | Catch-all screen in navigator |

---

> **About Expo Router**
>
> If you use **Expo** (instead of React Native CLI), **Expo Router** offers file-based routing — closer to Next.js App Router in mental model. It's a valid alternative, but it's tied to the Expo toolchain. Research it separately at [docs.expo.dev/router/introduction/](https://docs.expo.dev/router/introduction/).

---

## Resources

| Resource | Type | Link |
|---|---|---|
| React Navigation Getting Started | Official | [reactnavigation.org/docs/getting-started](https://reactnavigation.org/docs/getting-started) |
| React Navigation — Stack Navigator | Official | [reactnavigation.org/docs/native-stack-navigator](https://reactnavigation.org/docs/native-stack-navigator) |
| FlatList API | Official | [reactnative.dev/docs/flatlist](https://reactnative.dev/docs/flatlist) |
| SectionList API | Official | [reactnative.dev/docs/sectionlist](https://reactnative.dev/docs/sectionlist) |
| notJust.dev — Full Course (8hr) | Video | [youtube.com/@notjustdev](https://www.youtube.com/@notjustdev) |

---

 **You've completed the Web Dev Track!**

You now have the foundations to build real React Native apps. Next steps:
- Create your first Expo project: `npx create-expo-app@latest MyApp`
- Try [Expo Snack](https://snack.expo.dev) for quick experiments
- Watch [notJust.dev's free 8-hour course](https://www.youtube.com/@notjustdev) for a full project walkthrough
