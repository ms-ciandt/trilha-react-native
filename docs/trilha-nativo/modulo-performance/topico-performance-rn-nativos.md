---
title: Performance React Native
---

# Topic — Performance React Native (Track 1: Native Devs)

## Topic Goal

By the end, you should be able to:
- Understand the RN thread model (JS, UI, and auxiliary native threads)
- Identify common bottlenecks in RN apps (large lists, excessive re-renders, heavy bridges)
- Optimize lists (`FlatList`, `SectionList`) for high-volume scenarios
- Minimize unnecessary re-renders using memoization and separation of concerns
- Use tools like Flipper and the RN perf monitor
- Relate performance symptoms in RN to their equivalents in Android/iOS

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/React_Native_Performance_-_nativo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Mapping: Android/iOS → React Native

| Native                          | React Native                       | Notes |
|---------------------------------|------------------------------------|-------|
| Main/UI Thread                  | UI Thread RN                       | Rendering, layout, animations |
| Worker Threads / background     | Internal native module threads     | I/O, heavy operations |
| Presentation logic (Presenter/ViewModel)| JS Thread (React)         | Render, state, UI logic |
| RecyclerView with ViewHolder    | `FlatList` / `SectionList`         | List virtualization |
| Native animations (Animator, Core Animation) | `react-native-reanimated`, Gesture Handler | Native-based animations |

---

## Thread Model

- **JS Thread**: executes JavaScript/TypeScript code (React, state logic, effects).
- **UI Thread**: responsible for drawing the UI, collecting touch events, executing native animations.
- **Auxiliary threads**: used internally by native modules for I/O, networking, etc.

Best practices:
- Avoid heavy synchronous operations on the JS thread (large loops, complex parsing).
- Move intensive tasks to native modules or asynchronous jobs.
- Ensure critical animations are driven by the UI thread whenever possible.

---

## Large Lists with `FlatList`

Just as a poorly configured `RecyclerView` causes jank, an unoptimized `FlatList` can freeze scrolling.

Example of a performant list:

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

Key points:
- Stable and unique `keyExtractor` (avoids extra reconciliation work).
- `getItemLayout` reduces layout calculations during scrolling.
- `windowSize` controls how many screens of data remain mounted simultaneously.
- `removeClippedSubviews` helps with long lists on Android.

---

## Minimizing Re-renders

### Item Memoization

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

Best practices:
- Avoid passing inline objects and functions as props to items.
- Extract filter/sort logic into hooks, not into the list component.
- Use `useCallback` and `useMemo` for functions and derived data used in render.

---

## Heavy and Frequent Bridges

Intense communication between JS and native (e.g., dozens of events per second) can cause bottlenecks.

Mitigations:
- Batch events when possible.
- Move part of the control logic to the native side.
- Use libraries that perform *worklet-based* animations (`react-native-reanimated`) to avoid transmitting all frames through the bridge.

---

## Profiling Tools

- **RN Perf Monitor**: shows FPS in JS UI, useful for detecting jank.
- **Flipper + React Native plugin**: performance inspection, logs, networking.
- **Native tools**:
  - Android Profiler for CPU/Memory in native code.
  - Instruments to detect issues in native iOS modules.

---

## Practical Exercise

Build a large list scenario and optimize it:

1. Create a `BigProductListScreen` with 5,000 mocked items.
2. Implement an initial version without optimizations (no `memo`, no `getItemLayout`).
3. Use the perf monitor to measure:
   - Average FPS during scrolling.
   - Initial render time.
4. Apply optimizations:
   - `React.memo` on `ProductRow`.
   - `useCallback` on `renderItem`.
   - `getItemLayout`, `initialNumToRender`, `windowSize`, `removeClippedSubviews`.
5. Compare before/after and document the gains in a `PERFORMANCE.md`.

---

## Study Materials

### Official Documentation
- [Optimizing Performance](https://reactnative.dev/docs/optimizing-performance)

### Articles
- *Improving FlatList Performance in React Native* — best practices for lists.
- *React Native Performance Tuning for Production Apps* — broader overview (bridge, animations, memory).

---

Next → **[Tests](../modulo-testes/topico-testes-nativos)**