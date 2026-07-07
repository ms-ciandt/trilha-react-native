---
title: Mobile Performance
---

# Topic — Mobile Performance (Web Track)

### Topic Goal

By the end, you should be able to:

- Explain the RN thread model (JS vs UI vs native)
- Use `FlatList` in a performant way for large lists
- Reduce unnecessary re-renders with `React.memo`, `useCallback`, `useMemo`
- Notice differences between web and mobile performance (hardware, touches, animations)
- Use the perf monitor and Flipper to inspect FPS and resource usage

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Mobile_Performance_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Mental model for performance in RN

RN has no DOM, but it has problems equivalent to "excessive re-renders" that you already know:

- **JS Thread**: similar to the "main thread" of a React web application — runs your logic, hooks, render.
- **UI Thread**: handles native view rendering, touches, animations.
- **Bridge**: communication between JS and native; excessive traffic can hurt performance.

---

### Large lists — `FlatList` as a "virtualized list"

Just as you don't render 10,000 items in the DOM at once, in RN you use `FlatList`:


```tsx
import React, { useCallback } from 'react';
import { FlatList, Text, View } from 'react-native';

type Item = { id: string; title: string };

const ITEM_HEIGHT = 60;

function ItemRow({ item }: { item: Item }) {
  return (
    <View style={{ height: ITEM_HEIGHT, justifyContent: 'center' }}>
      <Text>{item.title}</Text>
    </View>
  );
}

const MemoItemRow = React.memo(ItemRow);

export function BigList({ items }: { items: Item[] }) {
  const renderItem = useCallback(
    ({ item }: { item: Item }) => <MemoItemRow item={item} />, 
    []
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


Best practices (parallel with web):

- `React.memo` on list items — equivalent to avoiding re-renders of table rows.
- `useCallback` for `renderItem` — avoids creating a new function on each render.
- `getItemLayout` — helps RN calculate positions without measuring (scroll performance gain).

---

### Minimizing work on the JS thread

Just like in the browser:

- Avoid heavy loops in scroll handlers or frequent event handlers.
- Avoid building large objects on every render.
- Use memoization (`useMemo`) when computation is expensive and dependencies rarely change.

Simple example:

```tsx
const expensiveComputedList = useMemo(
  () => computeSomethingHuge(rawList),
  [rawList]
);
```

---

### Observation tools

- **Perf Monitor** (`Debug → Show Perf Monitor`): shows UI/JS FPS.
- **Flipper**:
  - React Native plugin for viewing performance, logs, and events.
  - Helps identify warnings like "VirtualizedLists should never be nested" and misconfigured lists.

---

### Hands-on exercise

1. Create a screen with a list of 5,000 mocked items.
2. Implement a "naive" version:
   - Using `ScrollView` with `.map()` or `FlatList` with no optimizations.
3. Observe:
   - Latency when opening the screen.
   - Scroll smoothness.
4. Migrate to an optimized version:
   - `FlatList` with `React.memo`, `useCallback`, `getItemLayout`, `initialNumToRender`, `windowSize`.
5. Document the differences (before/after) in FPS and perceived usability.

---

### Study Materials

- [Optimizing Performance — React Native Docs](https://reactnative.dev/docs/optimizing-performance)
- Article: *From React Web to React Native — Performance Gotchas*
- Video: *Performance Tips for Web Devs Coming to React Native*

---

Next → **[Tests](../modulo-testes/topico-testes-web)**