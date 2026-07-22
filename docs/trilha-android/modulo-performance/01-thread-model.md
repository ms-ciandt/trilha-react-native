---
title: "Thread Model & the JS Thread"
sidebar_label: "Thread Model"
sidebar_position: 1
---

## Video Overview

> Video for this topic coming soon.

## Threads You Already Know

Android has a clear threading model: the Main (UI) thread renders views and handles touch events, and you never block it. You dispatch heavy work to `Dispatchers.IO` or `Dispatchers.Default` with coroutines.

React Native with the New Architecture has an analogous model — but with different names and one critical difference: **JavaScript runs on its own dedicated thread, separate from the UI thread**.

---

## The Three Core Threads

| Thread | Android equivalent | What runs here |
|--------|-------------------|----------------|
| **JS Thread** | No direct equivalent (closest: `Dispatchers.Default`) | Your React components, state updates, business logic, `useEffect`, data fetching |
| **UI Thread (Main Thread)** | `Dispatchers.Main` | Native view creation, layout, drawing — the same Android UI thread you know |
| **Shadow Thread (Fabric)** | `RenderThread` | Yoga layout calculations, shadow tree diffing — introduced by New Architecture |

With the **New Architecture**, there is also:

| Thread | Purpose |
|--------|---------|
| **Frame Processor Thread** | Vision Camera frame processors (JSI worklets) |
| **Reanimated Worklet Thread** | Animations running off the JS thread via JSI |
| **Native Module Thread pool** | TurboModule async operations |

---

## The Golden Rule: Never Block the JS Thread

The JS thread and the Android UI thread are separate, but they are **coupled**: if the JS thread is busy computing for more than ~16ms, it cannot tell Fabric to update views, which causes dropped frames on the UI thread.

This is the React Native equivalent of calling a network request on the Android Main thread — the thread does not crash, but everything freezes.

```tsx
// BAD — blocking synchronous computation on the JS thread
function ExpensiveList({ items }: { items: RawItem[] }) {
  // This runs on the JS thread on every render
  // If items has 10,000 entries this takes ~50ms — 3 dropped frames
  const processed = items.map(item => expensiveTransform(item));

  return <FlatList data={processed} renderItem={...} />;
}

// GOOD — memoised, only recomputes when items changes
function ExpensiveList({ items }: { items: RawItem[] }) {
  const processed = useMemo(
    () => items.map(item => expensiveTransform(item)),
    [items]
  );

  return <FlatList data={processed} renderItem={...} />;
}
```

---

## Detecting JS Thread Blockage

### In development — the FPS monitor

Enable the FPS overlay from the dev menu (shake device → "Show Perf Monitor"). Two numbers appear:

- **UI**: frames per second on the UI thread — should be 60 (or 120 on high-refresh devices)
- **JS**: frames per second on the JS thread — drops when your JS is too busy

When UI is 60 but JS is 30, your JavaScript is the bottleneck. When both drop, it's the native rendering layer.

### In code — InteractionManager

```tsx
import { InteractionManager } from 'react-native';

// Defer expensive work until after animations/transitions complete
// Equivalent of posting to the main thread after a frame with Handler.post()
function ScreenWithHeavyData() {
  const [data, setData] = useState<ProcessedItem[]>([]);

  useEffect(() => {
    // Wait for the navigation transition animation to finish first
    const task = InteractionManager.runAfterInteractions(() => {
      const result = heavyComputation();
      setData(result);
    });
    return () => task.cancel();
  }, []);

  return data.length === 0 ? <LoadingPlaceholder /> : <DataList data={data} />;
}
```

---

## Moving Work Off the JS Thread

### Option 1: Reanimated Worklets (UI thread animations)

Animations that read gesture state or drive layout should run on the UI thread, not the JS thread. Covered in the Reanimated topic.

### Option 2: JSI Synchronous Native Calls

Heavy computation can be offloaded to Kotlin via a TurboModule, keeping the JS thread free:

```kotlin
// Kotlin — runs on a background thread, resolved back to JS
override fun processItems(items: ReadableArray, promise: Promise) {
    CoroutineScope(Dispatchers.Default).launch {
        val result = WritableNativeArray()
        repeat(items.size()) { i ->
            result.pushMap(transform(items.getMap(i)))
        }
        promise.resolve(result)
    }
}
```

```tsx
// JS — awaits the result without blocking the JS thread
const processed = await NativeProcessor.processItems(rawItems);
```

### Option 3: Web Workers via react-native-workers

For CPU-heavy JS logic (cryptography, image processing, parsing):

```bash
npm install react-native-workers
```

```tsx
// worker.ts — runs in a separate JS context (separate Hermes instance)
self.onmessage = (event) => {
  const { items } = event.data;
  const result = items.map(expensiveTransform);
  self.postMessage(result);
};

// Main thread
import Worker from './worker';
const worker = new Worker();
worker.postMessage({ items: rawItems });
worker.onmessage = (event) => setData(event.data);
```

---

## startTransition — Low-Priority State Updates

React 18's `startTransition` marks a state update as interruptible — the UI thread can handle more urgent updates (touch events, animations) first.

Equivalent to Android's `Handler.postDelayed()` pattern for deferring low-priority work, but smarter — React can interrupt and restart the update if a higher-priority event arrives.

```tsx
import { startTransition, useState } from 'react';
import { TextInput } from 'react-native';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  function handleSearch(text: string) {
    // Urgent: update the input immediately
    setQuery(text);

    // Non-urgent: filtering 10,000 items can wait
    startTransition(() => {
      setResults(filterItems(allItems, text));
    });
  }

  return (
    <>
      <TextInput value={query} onChangeText={handleSearch} />
      <ResultList results={results} />
    </>
  );
}
```

---

## The New Architecture Advantage: Synchronous Layout

In the old architecture, every layout calculation went through the async bridge. With Fabric, layout runs **synchronously** in C++ on the Shadow Thread — the same render pipeline as native Android views.

This means:
- `onLayout` callbacks fire in the same frame as the layout change
- Scroll position can be read synchronously
- `measure()` calls are synchronous (via `ref.current.measure(...)`)

```tsx
import { useRef } from 'react';
import { View } from 'react-native';

function MeasurableBox() {
  const ref = useRef<View>(null);

  function logSize() {
    // Synchronous in New Architecture — no async callback needed
    ref.current?.measureInWindow((x, y, width, height) => {
      console.log(`Position: ${x},${y} Size: ${width}x${height}`);
    });
  }

  return <View ref={ref} onLayout={logSize} />;
}
```

---

## Profiling: Finding Thread Bottlenecks

### React Native DevTools — Profiler tab

1. Open React Native DevTools (press `j` in Metro)
2. Go to **Profiler** tab
3. Click **Record**
4. Interact with the slow part of your app
5. Stop recording
6. Inspect the flame chart — each bar is a component render

Look for:
- Components that re-render too often (width of bar × frequency)
- Components with long render times (height of bar in time)
- Cascading re-renders (a parent re-rendering all its children unnecessarily)

### Systrace — Frame Timeline with Thread View

```bash
python3 $ANDROID_HOME/platform-tools/systrace/systrace.py \
  --time=10 -o trace.html sched gfx view react
```

In the trace, the **JS thread** appears as `mqt_js`. A long block here is a JS bottleneck. If you see the JS thread blocked while the UI thread is idle, you need `useMemo`, `memo`, or a worklet.

---

## Study Materials

### Official Documentation

- [React Native — Performance Overview](https://reactnative.dev/docs/performance)
- [React Native — Threading Model](https://reactnative.dev/docs/the-new-architecture/threading-model)
- [React — startTransition](https://react.dev/reference/react/startTransition)
- [React Native — InteractionManager](https://reactnative.dev/docs/interactionmanager)

### Videos

- [React Native EU — Performance Deep Dive](https://www.youtube.com/watch?v=gvkqT_Uoahw)
- [Catalin Miron — React Native Performance](https://www.youtube.com/watch?v=1D78Tc46Xqo)

---

## What's Next

Thread model understood. Next: optimising `FlatList` — the most common source of scroll jank in React Native apps, and what every Android developer needs to know coming from `RecyclerView`.

➡ [FlatList Optimisation](./02-flatlist-optimisation)
