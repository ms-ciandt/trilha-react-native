---
title: Performance React Native
---

# Performance React Native

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_nativo/perf_01_performance.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## The Same Problem, a Different Runtime

If you've profiled a laggy `RecyclerView` or chased a dropped frame in Instruments, the mental model for React Native performance is already familiar. The symptoms are identical — janky scrolling, slow renders, frozen UI — and so is the diagnosis process: find what's blocking the thread that owns the screen.

The difference is that RN has _two_ threads to worry about, not one.

---

## Mapping: Android/iOS → React Native

| Native | React Native | Notes |
|---|---|---|
| Main / UI Thread | UI Thread RN | Rendering, layout, animations |
| Worker threads / background | Internal native module threads | I/O, heavy operations |
| Presenter / ViewModel logic | JS Thread (React) | Render, state, UI logic |
| RecyclerView + ViewHolder | `FlatList` / `SectionList` | List virtualization |
| Animator / Core Animation | `react-native-reanimated`, Gesture Handler | Runs on the UI thread — zero JS involvement |

---

## The Thread Model

React Native runs three threads that matter for performance:

- **JS Thread** — executes your TypeScript: React renders, state updates, effects, business logic.
- **UI Thread** — draws the interface, collects touch events, runs native animations.
- **Native module threads** — used internally for I/O, networking, and any background work you spin up in a native module.

The JS Thread is the most common bottleneck. Every re-render, every `useEffect`, every heavy computation runs there. If it stalls — even for 16ms — a frame drops. Keep it free for what only it can do: React's reconciliation and your app logic.

Animations are the classic example. A scroll animation that crosses through the JS Thread on every frame will visibly stutter on a mid-range device. The fix — `react-native-reanimated` — moves animation worklets entirely to the UI Thread, so they run at 60/120fps regardless of what JS is doing.

---

## Large Lists with `FlatList`

An unoptimized `FlatList` behaves exactly like a `RecyclerView` without `ViewHolder` — it mounts every item, re-renders everything on data change, and burns the JS Thread on layout calculations it could skip.

A performant list:

```tsx
import React, { useCallback } from 'react';
import { FlatList } from 'react-native';
import { ProductRow } from './ProductRow';

const ROW_HEIGHT = 72;

export type Product = {
  id: string;
  name: string;
  price: number;
};

export function ProductList({ products }: { products: Product[] }) {
  const renderItem = useCallback(
    ({ item }: { item: Product }) => <ProductRow product={item} />,
    [],
  );

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      initialNumToRender={10}
      windowSize={5}
      removeClippedSubviews
      getItemLayout={(_, index) => ({
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
        index,
      })}
    />
  );
}
```

- `getItemLayout` is the biggest win for fixed-height rows: it eliminates layout measurement during scrolling entirely, the same way pre-computing item offsets in a `RecyclerView.LayoutManager` does.
- `windowSize={5}` keeps five screens of items mounted at most — the rest are unmounted as the user scrolls away.
- `removeClippedSubviews` detaches off-screen views from the native view hierarchy on Android, reducing GPU overdraw.
- `keyExtractor` must return a stable, unique key — an unstable key forces React to remount items instead of reusing them.

---

## Minimizing Re-renders

React re-renders a component any time its props or state change. In a list of hundreds of items, one state update at the top can cascade through every row if they're not memoized.

```tsx
// ProductRow.tsx
import React from 'react';
import { View, Text } from 'react-native';
import type { Product } from './ProductList';

interface Props {
  product: Product;
}

export const ProductRow = React.memo(function ProductRow({ product }: Props) {
  return (
    <View>
      <Text>{product.name}</Text>
      <Text>{product.price}</Text>
    </View>
  );
});
```

`React.memo` is a shallow comparison — it skips the re-render if none of the props changed by reference. That means passing a new inline object or arrow function as a prop defeats it. Two rules that follow from this:

- Wrap callbacks with `useCallback`, not just the component.
- Keep filter/sort logic in hooks above the list, not inline in `renderItem` — inline functions get a new reference on every render.

---

## Bridge Traffic

Intense JS↔Native communication — sensor events, gesture callbacks, animation frames — can saturate the bridge and cause stutter. The old architecture serialized every message as JSON; even the New Architecture (JSI) benefits from reducing round trips.

Common mitigations:

- **Batch events on the native side** before sending them to JS. Emitting 60 individual battery-level events per second is rarely useful; debounce to what the UI actually needs.
- **Move animation logic off JS entirely.** Reanimated's `useAnimatedStyle` and `useSharedValue` execute worklets on the UI Thread — the JS Thread never sees individual frames.
- **Offload heavy computation to a native module.** If you're parsing a large payload or running image processing, do it in Kotlin/Swift and return only the result.

---

## Profiling Tools

| Tool | What it shows |
|---|---|
| RN Perf Monitor (shake menu → Perf Monitor) | Live JS FPS and UI FPS — first place to look |
| Flipper + React DevTools plugin | Component tree, re-render highlighting, bridge traffic |
| Android Profiler | CPU, memory, and thread activity in native code |
| Xcode Instruments | Frame timing, allocations, and native call stacks on iOS |

The workflow mirrors native: measure first, optimize second. Guessing at bottlenecks without data usually leads to memoizing the wrong things.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Optimizing Performance | Official Docs | [reactnative.dev/docs/optimizing-performance](https://reactnative.dev/docs/optimizing-performance) |
| Reanimated — worklets | Official Docs | [docs.swmansion.com/react-native-reanimated](https://docs.swmansion.com/react-native-reanimated) |
| FlatList API reference | Official Docs | [reactnative.dev/docs/flatlist](https://reactnative.dev/docs/flatlist) |

---

Next → **[Tests](../modulo-testes/topico-testes-nativos)**
