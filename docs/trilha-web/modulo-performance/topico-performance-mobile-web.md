---
title: Mobile Performance
---

# Mobile Performance

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_web/perf_01_performance.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## The Same Instincts, a Harder Target

Web performance and mobile performance share the same root causes: too much work on the main thread, unnecessary re-renders, rendering more than the user can see. The mental model you built for React web transfers directly.

The difference is the hardware. A mid-range Android phone has a fraction of the CPU and memory of the MacBook you develop on. What's imperceptible in a browser can drop frames on a real device. The bar is lower, the margin for waste is smaller.

---

## The Thread Model

React Native runs three threads that matter for performance:

- **JS Thread** — runs your TypeScript: React renders, hooks, effects, business logic. This is your main thread. If it stalls for ~16ms at 60Hz (or ~8ms on 120Hz devices, now common on mid-range phones), a frame drops.
- **UI Thread** — handles native view rendering, touch events, and native animations. It should never be blocked by JS work.
- **Native module threads** — used internally for I/O, networking, and background work in native modules.

The key insight: animations that cross through the JS Thread on every frame will visibly stutter. Libraries like `react-native-reanimated` move animation worklets to the UI Thread entirely, making them immune to JS slowdowns.

### New Architecture (RN 0.76+, default)

The three-thread model above describes the legacy architecture. Since RN 0.76, the New Architecture is on by default and changes the internals:

- **JSI** (JavaScript Interface) replaces the asynchronous bridge. JS now calls C++ directly and synchronously — no serialization overhead, no queue.
- **TurboModules** replace the old `NativeModules` — they load lazily on first access instead of at startup.
- **Fabric** replaces the old renderer. The view tree is computed in C++ and supports React 18 concurrent features (`startTransition`, `useDeferredValue`).
- **Layout thread:** in the legacy architecture, Yoga ran on a dedicated Shadow Thread. In Fabric, layout is computed in C++ and can run on the background thread or the main thread depending on context.

For day-to-day performance work, the same rules apply (memoization, FlatList, offloading animations). The New Architecture primarily removes the bridge bottleneck that caused jank in complex animated UIs. For deeper background, see the [New Architecture intro](../../introducao/02-new-architecture).

---

## Mapping: Web → React Native

| Web | React Native | Note |
|---|---|---|
| DOM virtualization (react-window, react-virtual) | `FlatList` / `SectionList` | Built-in virtualization |
| `React.memo` / `useMemo` / `useCallback` | Same | Identical API, same purpose |
| Avoiding layout thrash | `getItemLayout` | Pre-computing item positions avoids measurement |
| Lighthouse / DevTools profiler | Perf Monitor + React Native DevTools | Different tools, same questions |

---

## Large Lists with `FlatList`

`FlatList` is React Native's built-in virtualized list — it only renders the items currently visible, plus a configurable buffer. The same principle as `react-window` on the web, but built into the framework.

```tsx
import React, { useCallback } from 'react';
import { FlatList, Text, View } from 'react-native';

type Item = { id: string; title: string };

const ITEM_HEIGHT = 60;

const ItemRow = React.memo(function ItemRow({ item }: { item: Item }) {
  return (
    <View style={{ height: ITEM_HEIGHT, justifyContent: 'center' }}>
      <Text>{item.title}</Text>
    </View>
  );
});

export function BigList({ items }: { items: Item[] }) {
  const renderItem = useCallback(
    ({ item }: { item: Item }) => <ItemRow item={item} />,
    [],
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

- `getItemLayout` is the biggest win for fixed-height rows — it tells RN the position of every item upfront, eliminating layout measurement during scrolling entirely.
- `windowSize={5}` keeps five screens of items mounted at most. Items scrolled far away are unmounted.
- `React.memo` on `ItemRow` prevents re-renders when unrelated state changes above the list. Wrap `renderItem` in `useCallback` for the same reason — a new function reference on every render defeats `memo`.
- Never nest a `FlatList` inside a `ScrollView`. RN cannot calculate the inner list's height and will render all items at once, defeating virtualization.

---

## Minimizing Re-renders

The same rules as React web apply:

```tsx
const expensiveList = useMemo(
  () => filterAndSort(rawItems),
  [rawItems],
);
```

Avoid building new objects or arrays inline in JSX — every render creates a new reference, which defeats shallow comparison in `React.memo`. Keep derived data in `useMemo`, callbacks in `useCallback`, and heavy computation out of the render path.

---

## Profiling Tools

| Tool | What it shows |
|---|---|
| Perf Monitor (shake menu → Perf Monitor) | Live JS FPS and UI FPS — first place to look for jank |
| React Native DevTools (0.76+) | Component profiler, re-render highlighting, network inspector, logs — replaces Flipper |
| React DevTools (standalone) | Component profiler, same as web DevTools — still works as an alternative |

:::note Flipper is deprecated
Flipper was deprecated in RN 0.73 and removed from the default template. For profiling, use the built-in **React Native DevTools**, available via the Dev Menu (shake the device or press `j` in the Metro terminal).
:::

The workflow is the same as web: measure first, then optimize. Check the Perf Monitor on a real mid-range Android device, not on a simulator — simulators share your machine's CPU and hide real-world bottlenecks.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Optimizing Performance | Official Docs | [reactnative.dev/docs/optimizing-performance](https://reactnative.dev/docs/optimizing-performance) |
| FlatList API | Official Docs | [reactnative.dev/docs/flatlist](https://reactnative.dev/docs/flatlist) |
| Reanimated | Official Docs | [docs.swmansion.com/react-native-reanimated](https://docs.swmansion.com/react-native-reanimated) |

---

Next → **[Tests](../modulo-testes/topico-testes-web)**
