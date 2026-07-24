---
title: State and Hooks
---

# State and Hooks

In SwiftUI, state drives the UI. When a `@State` property changes, SwiftUI recomputes the body. React works the same way: state is the source of truth, and when state changes, the component re-renders. Hooks are the mechanism React provides to manage state and side effects inside function components — the equivalent of SwiftUI's property wrappers and lifecycle modifiers.

---

## @State → useState (local state)

In SwiftUI, `@State` is for simple, view-local mutable values:

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        Button("Count: \(count)") {
            count += 1
        }
    }
}
```

In React, `useState` is the direct equivalent:

```tsx
import React, { useState } from 'react';
import { Button, Text, View } from 'react-native';

function CounterView() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
    </View>
  );
}
```

Key differences to internalize:

- In SwiftUI you mutate `count` directly. In React you always call the setter (`setCount`). Never mutate state directly.
- `useState` returns a tuple: `[currentValue, setter]`. The setter triggers a re-render.
- You can call `useState` multiple times in a single component, one per piece of state.
- To update based on previous value, pass a function to the setter: `setCount(prev => prev + 1)`.

---

## @ObservableObject / @Published → useRef and custom hooks

In SwiftUI, when state lives outside a single view, you reach for `ObservableObject` with `@Published` properties:

```swift
class TimerViewModel: ObservableObject {
    @Published var elapsed: Int = 0
    private var timer: Timer?

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            self.elapsed += 1
        }
    }

    func stop() {
        timer?.invalidate()
    }
}
```

React separates this concern into two primitives: `useRef` for mutable values that do not trigger re-renders, and custom hooks for reusable stateful logic.

`useRef` holds a mutable container whose `.current` property survives renders without causing new ones. Think of it as an instance variable that is invisible to the render cycle:

```tsx
import React, { useRef } from 'react';

function TimerView() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    intervalRef.current = setInterval(() => {
      console.log('tick');
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
  };

  return null; // simplified
}
```

Use `useRef` when you need to store a value across renders without the component reacting to changes in it — timer IDs, previous values, DOM/native node references.

---

## Custom hooks as ViewModels

The closest React equivalent to an `ObservableObject` ViewModel is a **custom hook**. Custom hooks are plain functions whose names start with `use`. They can call other hooks internally:

```tsx
import { useState, useRef, useEffect } from 'react';

function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (intervalRef.current !== null) return;
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  return { elapsed, start, stop };
}
```

Consuming it in a component:

```tsx
function TimerScreen() {
  const { elapsed, start, stop } = useTimer();

  return (
    <View>
      <Text>{elapsed}s</Text>
      <Button title="Start" onPress={start} />
      <Button title="Stop" onPress={stop} />
    </View>
  );
}
```

This pattern replaces the `@StateObject` / `@ObservedObject` + ViewModel pattern entirely. The hook is the ViewModel; it owns state and business logic; the component is purely presentational.

---

## useEffect vs .onAppear / .onDisappear / .onChange

SwiftUI has lifecycle modifiers attached to views:

```swift
Text("Hello")
    .onAppear { fetchData() }
    .onDisappear { cancelTasks() }
    .onChange(of: searchText) { fetchResults(for: $0) }
```

React consolidates all of these into `useEffect`. The behavior depends on the dependency array:

| SwiftUI modifier | useEffect equivalent |
|---|---|
| `.onAppear` | `useEffect(() => { ... }, [])` — empty array, runs once on mount |
| `.onDisappear` | cleanup function inside `useEffect` |
| `.onChange(of: value)` | `useEffect(() => { ... }, [value])` — runs when `value` changes |

```tsx
import { useEffect, useState } from 'react';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);

  // Equivalent to .onAppear
  useEffect(() => {
    console.log('Screen mounted');
  }, []);

  // Equivalent to .onChange(of: query)
  useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      return;
    }
    fetchResults(query).then(setResults);
  }, [query]);

  return null; // simplified
}

async function fetchResults(q: string): Promise<string[]> {
  return [];
}
```

---

## useEffect cleanup → deinit / cancellables

In Swift, you release resources in `deinit` or by cancelling Combine subscriptions stored in `Set<AnyCancellable>`:

```swift
class LocationViewModel: ObservableObject {
    private var cancellables = Set<AnyCancellable>()

    init() {
        locationPublisher
            .sink { self.location = $0 }
            .store(in: &cancellables)
    }

    deinit {
        cancellables.removeAll()
    }
}
```

In React, `useEffect` accepts a cleanup function returned from its body. React calls this when the component unmounts or before the effect re-runs due to a dependency change:

```tsx
useEffect(() => {
  const subscription = eventEmitter.addListener('locationUpdate', handleUpdate);

  // Cleanup: equivalent to deinit / cancellables.removeAll()
  return () => {
    subscription.remove();
  };
}, []);
```

Always return a cleanup function when your effect subscribes to something, starts a timer, or opens a connection. Forgetting cleanup is the React equivalent of a memory leak from unreleased cancellables.

---

## SwiftUI .task modifier → useEffect with async

SwiftUI's `.task` modifier runs an async function tied to the view's lifetime and cancels it on disappear:

```swift
Text("Loading…")
    .task {
        await loadData()
    }
```

`useEffect` does not accept an async function directly, but you can define and immediately invoke one inside:

```tsx
useEffect(() => {
  let cancelled = false;

  async function loadData() {
    const data = await fetchSomething();
    if (!cancelled) {
      setData(data);
    }
  }

  loadData();

  return () => {
    cancelled = true; // prevent stale state updates after unmount
  };
}, []);
```

The `cancelled` flag mirrors how Swift's structured concurrency cooperatively checks for cancellation. This pattern prevents the "Can't perform a React state update on an unmounted component" warning.

---

## useCallback → storing stable function references

In SwiftUI, functions passed as closures are created fresh each render. In React this matters because passing a new function reference to a child component causes it to re-render even if nothing changed.

`useCallback` memoizes a function so its reference stays stable across renders as long as its dependencies have not changed:

```tsx
import { useCallback, useState } from 'react';

function ParentScreen() {
  const [count, setCount] = useState(0);

  const handlePress = useCallback(() => {
    setCount(prev => prev + 1);
  }, []); // stable reference — no deps

  return <ChildButton onPress={handlePress} />;
}
```

Without `useCallback`, every render of `ParentScreen` creates a new `handlePress` function, which would force `ChildButton` to re-render even if `count` has not changed. Think of `useCallback` as `lazy var` for closures — computed once, reused.

---

## useMemo → computed properties

In SwiftUI, `var` with a `get` block is a computed property — recalculated each time it is accessed. For expensive calculations you reach for caching strategies or `@Published` properties updated only when inputs change.

React's `useMemo` is the equivalent: it recomputes a value only when its dependencies change, caching the result between renders:

```tsx
import { useMemo } from 'react';

type Product = { name: string; price: number };

function ProductList({ products }: { products: Product[] }) {
  const expensiveProducts = useMemo(
    () => products.filter(p => p.price > 100).sort((a, b) => b.price - a.price),
    [products] // recompute only when products array changes
  );

  return (
    <View>
      {expensiveProducts.map(p => (
        <Text key={p.name}>{p.name}</Text>
      ))}
    </View>
  );
}
```

Reserve `useMemo` for genuinely expensive computations. Overusing it adds overhead without benefit — the same mistake as adding `lazy var` to every property in Swift.

---

## Reactive streams: Combine → useEffect patterns

Combine in Swift lets you declaratively respond to sequences of values over time. The React equivalent is not a library built into the framework — it is the `useEffect` + `useState` pattern applied to event streams.

For instance, reacting to a network status publisher in Swift:

```swift
NWPathMonitor().publisher
    .map { $0.status == .satisfied }
    .assign(to: &$isOnline)
```

In React Native with the `@react-native-community/netinfo` package:

```tsx
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return unsubscribe; // cleanup = cancel subscription
  }, []);

  return isOnline;
}
```

The pattern maps cleanly: subscribe in the effect body, store current value in state, unsubscribe in the cleanup. The dependency array `[]` means subscribe once at mount, matching how Combine subscriptions are stored in `cancellables` during `init`.

---

## Rules of hooks

React enforces two rules that have no direct parallel in Swift but are easy to follow:

**Rule 1 — Call hooks only at the top level.** Never call hooks inside conditionals, loops, or nested functions. This ensures React sees the same hooks in the same order every render.

```tsx
// Wrong
function BadComponent({ show }: { show: boolean }) {
  if (show) {
    const [value, setValue] = useState(''); // conditionally called — breaks rules
  }
}

// Correct
function GoodComponent({ show }: { show: boolean }) {
  const [value, setValue] = useState(''); // always called
  if (!show) return null;
  return <Text>{value}</Text>;
}
```

**Rule 2 — Call hooks only from React function components or custom hooks.** Not from plain utility functions, class methods, or event handlers.

---

## Dependency array pitfalls

The dependency array of `useEffect`, `useCallback`, and `useMemo` must include every value from the component scope that the effect reads. Omitting dependencies causes stale closures — the effect sees old values from a previous render, analogous to capturing a weak reference that has already been deallocated.

```tsx
function StaleExample() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // Bug: count is captured at 0 and never updates
      console.log(count);
    }, 1000);
    return () => clearInterval(id);
  }, []); // missing count in deps

  return <Button title="+" onPress={() => setCount(c => c + 1)} />;
}
```

Fix: either add `count` to the dependency array (effect re-runs each time `count` changes) or use the functional updater form to avoid reading `count` at all:

```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(prev => prev + 1); // reads prev from React, not from closure
  }, 1000);
  return () => clearInterval(id);
}, []); // safe — no external values read
```

The ESLint plugin `eslint-plugin-react-hooks` enforces correct dependency arrays automatically. Enable it — it is the equivalent of the Swift compiler catching uninitialized variables.

---

## Summary

| Swift / SwiftUI | React hook |
|---|---|
| `@State` | `useState` |
| `@State` on non-rendering value | `useRef` |
| `ObservableObject` / ViewModel | custom hook |
| `.onAppear` | `useEffect(() => {}, [])` |
| `.onDisappear` | cleanup return from `useEffect` |
| `.onChange(of:)` | `useEffect(() => {}, [value])` |
| `.task` | `useEffect` with internal async IIFE |
| `deinit` / `cancellables` | cleanup return from `useEffect` |
| `lazy var` / computed caching | `useMemo` |
| stable closure reference | `useCallback` |
| Combine subscription | `useEffect` subscribe/unsubscribe pattern |

Hooks are the entire state and lifecycle story in React. There is no class-based alternative in modern React Native — every ViewModel pattern you built with `ObservableObject` maps cleanly to a custom hook. Once this mental model clicks, the rest of React's component model follows naturally.
