---
title: "Performance — Profiling & Renders"
---

## 3. Profiling and Bottleneck Detection

### The measurement loop

Do not optimise what you have not measured. The loop:

```
1. Establish a reproducible scenario
2. Measure (pick ONE metric)
3. Identify the slowest component
4. Change ONE thing
5. Measure again
6. Accept or revert
```

### Tool selection matrix

| What you suspect | Tool | Output |
|---|---|---|
| Slow startup | Perfetto (Android), Instruments App Launch (iOS) | Timeline of all threads |
| JS rendering too slow | React DevTools Profiler | Per-component render time |
| JS CPU hotspot | Hermes CPU sampling profiler | Flame chart |
| Excessive memory | Hermes heap snapshot | Retained size by constructor |
| Dropped frames during scroll | Perfetto `Choreographer` lane | Frame timing |
| Slow native view creation | Perfetto `Fabric::commit` | Shadow Tree commit time |
| Network bottleneck | Flipper Network plugin | Request/response waterfall |
| JS <-> native calls bottleneck | Perfetto `JSI` category | HostFunction call durations |

### React DevTools Profiler — finding re-render causes

The Profiler flame chart shows which components rendered in each commit. But the **"why did this render?"** information is equally important:

```bash
# Install standalone React DevTools
npm install -g react-devtools@latest
react-devtools
```

In the Profiler tab, enable "Record why each component rendered" (the gear icon). After recording, click any component bar — the panel shows exactly which prop or state changed.

Common findings and their fixes:

```typescript
// PROBLEM: object literal creates new reference on every render
<MyList config={{ pageSize: 20, sorted: true }} />

// FIX: useMemo or move constant outside component
const LIST_CONFIG = { pageSize: 20, sorted: true };
<MyList config={LIST_CONFIG} />
```

```typescript
// PROBLEM: inline arrow function creates new reference
<Button onPress={() => handlePress(item.id)} />

// FIX: useCallback
const handlePressItem = useCallback(
  () => handlePress(item.id),
  [item.id]
);
<Button onPress={handlePressItem} />
```

```typescript
// PROBLEM: context value is a new object every render
const ThemeContext = createContext({ color: 'blue', fontSize: 16 });

function ThemeProvider({ children }) {
  // NEW OBJECT EVERY RENDER — all consumers re-render
  return (
    <ThemeContext.Provider value={{ color, fontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

// FIX: memoize the context value
function ThemeProvider({ children }) {
  const value = useMemo(() => ({ color, fontSize }), [color, fontSize]);
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### FlashList — the correct tool for large lists

`FlatList` renders all items eagerly when they enter the recycler pool. `FlashList` from Shopify pre-allocates a fixed pool and recycles view objects — no mount/unmount per item:

```typescript
import { FlashList } from '@shopify/flash-list';

// Measure before switching — get baseline FPS from Perfetto
// Then switch:
<FlashList
  data={items}
  keyExtractor={(item) => item.id}
  estimatedItemSize={84}           // critical: must match average rendered height
  renderItem={({ item }) => <OrderRow order={item} />}
  // Avoid onLayout callback — it re-measures and causes extra renders
  overrideItemLayout={(layout, item) => {
    layout.size = item.isExpanded ? 168 : 84;
  }}
/>
```

`estimatedItemSize` is the most important prop — if it is wrong, FlashList miscalculates scroll position and causes jumps. Measure your real item height:

```typescript
// Measure actual item height in development
function OrderRow({ order }: { order: Order }) {
  return (
    <View onLayout={(e) => {
      if (__DEV__) console.log('OrderRow height:', e.nativeEvent.layout.height);
    }}>
      {/* ... */}
    </View>
  );
}
```

### Avoiding the `useSelector` performance trap

In Redux Toolkit, every `useSelector` call re-runs on every store dispatch. If a selector is expensive or returns a new reference, the component re-renders unnecessarily:

```typescript
// BAD — new array reference on every dispatch
const expensiveItems = useSelector((state) =>
  state.orders.items.filter(o => o.status === 'pending')
);

// GOOD — memoized selector with reselect
import { createSelector } from '@reduxjs/toolkit';

const selectPendingOrders = createSelector(
  [(state: RootState) => state.orders.items],
  (items) => items.filter(o => o.status === 'pending')
  // result is cached — new array only when items changes
);

const pendingOrders = useSelector(selectPendingOrders);
```

### Flipper — integrated performance panel

```bash
# Install Flipper
brew install --cask flipper  # macOS

# In your app (debug only):
# Flipper is auto-included via React Native 0.76 debug config
```

Flipper plugins useful for performance:

| Plugin | What it shows |
|---|---|
| React DevTools | Component tree, props, state, profiler |
| Network | All fetch/axios requests with timing |
| Databases | SQLite / MMKV / AsyncStorage contents |
| Layout | View hierarchy, measured bounds |
| Crash Reporter | Native crash symbolication |

### Systrace — frame-level analysis

For dropped-frame investigations, Systrace gives you the ground truth:

```bash
# Capture during a scroll interaction
python3 systrace.py -t 10 -o scroll.html \
  gfx view dalvik react_native_new_arch input

# Key things to look for in Perfetto UI:
# - Choreographer#doFrame longer than 16.7ms = dropped frame
# - Fabric::commit crossing VSync boundary
# - Long GC pauses coinciding with janky frames
```

---

## 4. Re-renders and Caching

### The rendering contract

React re-renders a component when:
1. Its own state changes (`useState`, `useReducer`)
2. Its parent re-renders and it is not wrapped in `React.memo`
3. A context it consumes changes
4. A hook it uses returns a new reference

Understanding this precisely lets you design components that opt out of unnecessary renders.

### `React.memo` — correct and incorrect usage

```typescript
// CORRECT — pure component with stable props
const ProductCard = React.memo(function ProductCard({ product, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(product.id)}>
      <Text>{product.name}</Text>
    </Pressable>
  );
}, (prev, next) => {
  // Custom comparator — only re-render when price changes
  return prev.product.price === next.product.price
      && prev.product.name === next.product.name;
});

// INCORRECT — memo is useless here because onPress is an inline function
// Parent re-renders → new onPress reference → memo comparison fails → re-renders anyway
<ProductCard product={p} onPress={(id) => handlePress(id)} />

// CORRECT — stable reference
const handlePress = useCallback((id: string) => {
  navigate('Product', { id });
}, [navigate]);
<ProductCard product={p} onPress={handlePress} />
```

### `useMemo` — when it pays off

`useMemo` has a cost: the dependency comparison on every render. It only pays off when the computation being memoized is significantly more expensive than the comparison.

```typescript
// NOT worth memoizing — addition is cheaper than comparison + cache lookup
const total = useMemo(() => a + b, [a, b]);  // worse than: const total = a + b;

// WORTH memoizing — sorting 10000 items is expensive
const sortedItems = useMemo(
  () => [...rawItems].sort(priceComparator),
  [rawItems]  // only re-sorts when rawItems reference changes
);

// WORTH memoizing — expensive formatting
const formattedData = useMemo(
  () => rawData.map(transformToChartPoint),  // complex transform
  [rawData]
);
```

### Zustand — fine-grained subscriptions

Zustand is more performant than Redux for most React Native apps because subscriptions are per-selector, not per-dispatch:

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface CartStore {
  items: CartItem[];
  totalPrice: number;
  addItem: (item: CartItem) => void;
}

const useCartStore = create<CartStore>()(
  subscribeWithSelector((set) => ({
    items: [],
    totalPrice: 0,
    addItem: (item) =>
      set((state) => ({
        items: [...state.items, item],
        totalPrice: state.totalPrice + item.price,
      })),
  }))
);

// This component ONLY re-renders when totalPrice changes
// It does NOT re-render when a new item is added without price change
function CartBadge() {
  const totalPrice = useCartStore((state) => state.totalPrice);
  return <Text>{totalPrice.toFixed(2)}</Text>;
}

// This component ONLY re-renders when items.length changes
function CartIcon() {
  const count = useCartStore((state) => state.items.length);
  return <Badge count={count} />;
}
```

### Image caching — FastImage vs Expo Image

Uncached images re-download and re-decode on every render. Both `react-native-fast-image` and `expo-image` provide disk + memory caching:

```typescript
import { Image } from 'expo-image';

// Expo Image — disk cache by default, blurhash placeholder
<Image
  source={{ uri: 'https://cdn.example.com/product/123.jpg' }}
  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}  // shown while loading
  contentFit="cover"
  cachePolicy="disk"   // 'none' | 'memory' | 'disk' | 'memory-disk'
  transition={200}     // fade-in duration ms
  style={{ width: 200, height: 200 }}
/>
```

For content that changes infrequently (product images, avatars), set `cachePolicy="disk"` and use a content-addressed URL (the URL itself acts as the cache key). When the server updates the image, change the URL.

### Query caching — TanStack Query

Network responses should be cached and never re-fetched while fresh. TanStack Query (React Query) handles this with a stale-while-revalidate model:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';

function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id),
    staleTime: 5 * 60 * 1000,     // 5 minutes: don't refetch if data is fresh
    gcTime: 30 * 60 * 1000,       // 30 minutes: keep in cache even when no subscriber
    refetchOnWindowFocus: false,   // don't refetch when app foregrounds
  });
}

// Prefetch on hover/approach — data is ready before navigation
const queryClient = useQueryClient();
function prefetchProduct(id: string) {
  queryClient.prefetchQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id),
    staleTime: 5 * 60 * 1000,
  });
}
```

With proper `staleTime` configuration, navigating back to a screen that has already been visited returns data instantly from cache — no loading spinner.

---

## Study Materials

### Official Documentation

| Resource | Description |
|---|---|
| [Performance Overview](https://reactnative.dev/docs/performance) | Official RN performance guide — JS frame rate, native frame rate |
| [Hermes guide](https://reactnative.dev/docs/hermes) | Enabling Hermes, profiling, release config |
| [React DevTools Profiler](https://reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html) | Original Profiler introduction — concepts apply directly to RN |
| [FlashList documentation](https://shopify.github.io/flash-list/) | Shopify's virtualised list — migration guide and performance benchmarks |
| [Reanimated worklets](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/#worklet) | Official worklet reference |

### Deep Dives

| Resource | Author | What you will learn |
|---|---|---|
| [React Native Performance — the ultimate guide](https://www.callstack.com/blog/the-ultimate-guide-to-react-native-optimization) | Callstack | 12-section deep dive: startup, memory, lists, images, animations |
| [React Native startup time](https://blog.swmansion.com/react-native-startup-time-how-to-measure-and-how-to-improve-it-e3fd7c00d695) | Software Mansion | Instrumentation, benchmark methodology, phase-by-phase analysis |
| [Hermes GC explained](https://hermesengine.dev/docs/gc/) | Hermes team | Generational GC, heap layout, tuning parameters |
| [Profiling RN apps — Systrace](https://reactnative.dev/docs/profiling) | RN Docs | Systrace setup, reading the output, common patterns |
| [Re-renders — a visual guide](https://www.developerway.com/posts/react-re-renders-guide) | Developer Way | Context, memo, useCallback — illustrated with React |

### Video Tutorials

| Resource | Duration | What you will learn |
|---|---|---|
| [React Native Performance Workshop](https://www.youtube.com/watch?v=83ffAY-CmL4) | 55 min | Live profiling session — startup, lists, animations |
| [Hermes internals](https://www.youtube.com/watch?v=oSHBQheFm48) | 22 min | Bytecode, GC, profiling tools |
| [FlashList: 10× better lists](https://www.youtube.com/watch?v=ZkRWHxZuVJw) | 20 min | Shopify team explains recycler pool and benchmarks |
| [Reanimated 3 worklets](https://www.youtube.com/watch?v=I-WZMBsgWJw) | 30 min | Worklet compilation, UI thread, SharedValue |
| [React Conf 2024 — RN performance](https://www.youtube.com/watch?v=Ck0N9FsKAhI) | 30 min | Concurrent rendering, Suspense, and performance in 0.76 |

### Interactive

| Resource | What to do |
|---|---|
| [Perfetto UI](https://ui.perfetto.dev/) | Load a Systrace HTML file — explore flame charts online |
| [Expo Snack — Reanimated worklet](https://snack.expo.dev/@reanimated/worklet-demo) | Run a worklet animation and observe 60 fps even with JS blocked |
| [Yoga playground](https://yogalayout.dev/playground) | Debug layout performance — see which flexbox properties trigger re-layout |
| [TanStack Query DevTools](https://tanstack.com/query/latest/docs/framework/react/devtools) | Inspect query cache, stale times, background refetch |

---

Next → [Bundle & Distribution](./bundle-distribution)
