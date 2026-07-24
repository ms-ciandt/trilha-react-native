---
title: "State & Effects: remember vs useState"
sidebar_label: "State & Effects"
sidebar_position: 2
---

## Video Overview

> Video for this topic coming soon.

## What You Already Know

In Compose, state is created with `remember { mutableStateOf(value) }`. The `remember` block keeps the value alive across recompositions; `mutableStateOf` wraps it so Compose can observe changes and trigger recomposition.

React Native uses hooks — plain functions prefixed with `use` — to express the same ideas. There is no annotation, no compiler magic: just function calls with a strict execution contract.

---

## useState: The Core State Hook

### Compose

```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }
    Button(onClick = { count++ }) {
        Text("Count: $count")
    }
}
```

### React Native

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Pressable onPress={() => setCount(c => c + 1)}>
        <Text>Count: {count}</Text>
      </Pressable>
    </View>
  );
}
```

`useState` returns a tuple: `[currentValue, setter]`. The setter schedules a re-render with the new value.

> **Use the functional updater form** (`setCount(c => c + 1)`) when the new state depends on the previous value. React batches state updates; the closure over `count` may be stale. The updater function always receives the freshest value.

---

## State Update Batching

Compose's snapshot system batches all state changes inside an event handler atomically. React 18+ does the same via automatic batching: all `useState` setters called within the same event handler (or inside `startTransition`) are batched into a single re-render.

```tsx
function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit() {
    setName('');   // ← these two do NOT cause two renders
    setEmail('');  // ← React 18 batches them into one re-render
  }

  return (/* ... */);
}
```

---

## useRef: remember Without State

In Compose, `remember { someObject }` stores a non-state value that survives recomposition. In React, `useRef` is the exact analogue — it stores a mutable value that **does not trigger a re-render when mutated**.

### Compose

```kotlin
@Composable
fun Timer() {
    val elapsedMs = remember { mutableLongStateOf(0L) }
    val startTime = remember { System.currentTimeMillis() }
    // startTime survives recomposition but changing it does NOT recompose
}
```

### React Native

```tsx
import { useRef, useState, useEffect } from 'react';
import { Text, View } from 'react-native';

function Timer() {
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now()); // survives re-renders, mutation is invisible to React

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startTime.current);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return <Text>{elapsed}ms</Text>;
}
```

`useRef` is also used to hold references to native view instances — the equivalent of `rememberCoroutineScope()` + `view.findViewTreeLifecycleOwner()` patterns:

```tsx
import { useRef } from 'react';
import { TextInput } from 'react-native';

function SearchBar() {
  const inputRef = useRef<TextInput>(null);

  function focusInput() {
    inputRef.current?.focus(); // imperative call on the native view
  }

  return <TextInput ref={inputRef} placeholder="Search..." />;
}
```

---

## useEffect: The Side-Effect Hook

### LaunchedEffect and SideEffect in Compose

```kotlin
@Composable
fun UserProfile(userId: String) {
    var profile by remember { mutableStateOf<Profile?>(null) }

    LaunchedEffect(userId) {
        // Runs when userId changes. Cancels previous coroutine automatically.
        profile = fetchProfile(userId)
    }

    profile?.let { ProfileCard(it) } ?: LoadingSpinner()
}
```

### useEffect in React Native

```tsx
import { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

function UserProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await fetchProfile(userId);
      if (!cancelled) setProfile(data);
    }

    load();

    return () => {
      cancelled = true; // cleanup — equivalent to coroutine cancellation
    };
  }, [userId]); // re-runs whenever userId changes

  if (!profile) return <ActivityIndicator />;
  return <ProfileCard profile={profile} />;
}
```

### Dependency Array — The Critical Difference

Compose's `LaunchedEffect(key)` accepts one or more keys; it re-runs when any key changes. `useEffect` takes a dependency array as the second argument with three distinct modes:

| Second argument         | Behaviour                                      | Compose analogue              |
|-------------------------|------------------------------------------------|-------------------------------|
| `[dep1, dep2]`          | Runs when any dep changes (and on mount)       | `LaunchedEffect(dep1, dep2)`  |
| `[]` (empty array)      | Runs once on mount, cleanup on unmount         | `LaunchedEffect(Unit)`        |
| Omitted                 | Runs after every render — almost never correct | No direct analogue            |

> Forgetting dependencies is the most common React bug. The `eslint-plugin-react-hooks` `exhaustive-deps` rule catches it at lint time — enable it in your project config.

---

## useMemo and useCallback: derivedStateOf and Stable References

### derivedStateOf

```kotlin
@Composable
fun FilteredList(items: List<Item>, query: String) {
    val filtered by remember(items, query) {
        derivedStateOf { items.filter { it.name.contains(query) } }
    }
    LazyColumn {
        items(filtered) { ItemRow(it) }
    }
}
```

### useMemo

```tsx
import { useMemo } from 'react';
import { FlatList } from 'react-native';

function FilteredList({ items, query }: { items: Item[]; query: string }) {
  const filtered = useMemo(
    () => items.filter(item => item.name.includes(query)),
    [items, query] // recomputes only when items or query change
  );

  return <FlatList data={filtered} renderItem={({ item }) => <ItemRow item={item} />} />;
}
```

### Stable Callback References: useCallback

When you pass a callback to a `memo()`-wrapped child, a new function reference every render breaks the memo bailout — the child re-renders even if nothing logically changed. `useCallback` solves this, analogous to how Compose avoids creating new lambda instances on each recomposition by using `remember { }`.

```tsx
import { useCallback, memo } from 'react';
import { FlatList } from 'react-native';

function ParentList({ items }: { items: Item[] }) {
  const handleDelete = useCallback((id: string) => {
    // deleteItem(id)
  }, []); // stable reference — only created once

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <MemoizedRow item={item} onDelete={handleDelete} />
      )}
    />
  );
}

const MemoizedRow = memo(function Row({
  item,
  onDelete,
}: {
  item: Item;
  onDelete: (id: string) => void;
}) {
  return (/* ... */);
});
```

---

## CompositionLocal → React Context

`CompositionLocal` provides implicit data to a composable subtree. React Context does the same.

### Compose

```kotlin
val LocalTheme = compositionLocalOf { LightTheme }

@Composable
fun App() {
    CompositionLocalProvider(LocalTheme provides DarkTheme) {
        Screen()
    }
}

@Composable
fun Screen() {
    val theme = LocalTheme.current
    Text("Background: ${theme.background}", color = theme.text)
}
```

### React Native

```tsx
import { createContext, useContext } from 'react';

interface Theme {
  background: string;
  text: string;
}

const ThemeContext = createContext<Theme>({ background: '#fff', text: '#000' });

function App() {
  return (
    <ThemeContext.Provider value={{ background: '#000', text: '#fff' }}>
      <Screen />
    </ThemeContext.Provider>
  );
}

function Screen() {
  const theme = useContext(ThemeContext);
  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.text }}>Dark screen</Text>
    </View>
  );
}
```

---

## State Machine Pattern: useReducer

For complex local state that involves multiple sub-values or state transitions (think `sealed class UIState`), `useReducer` is the idiomatic choice — the exact React equivalent of a Compose + ViewModel reducer pattern.

```tsx
import { useReducer } from 'react';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; message: string };

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: string[] }
  | { type: 'FETCH_ERROR'; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':   return { status: 'loading' };
    case 'FETCH_SUCCESS': return { status: 'success', data: action.payload };
    case 'FETCH_ERROR':   return { status: 'error', message: action.message };
    default:              return state;
  }
}

function DataScreen() {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });

  // dispatch({ type: 'FETCH_START' }) to kick off
  // ...
}
```

---

## Rules of Hooks

Unlike Compose, there is **no compiler** enforcing hook calls at the call site. The rules are enforced at runtime (and caught by the ESLint plugin):

1. Only call hooks at the top level of a function component or custom hook — never inside `if`, `for`, or nested functions.
2. Only call hooks from React function components or custom hooks — never from plain JavaScript functions.

```tsx
// WRONG — hook inside a condition
function Broken({ show }: { show: boolean }) {
  if (show) {
    const [value, setValue] = useState(''); // runtime error in development
  }
}

// RIGHT — condition inside the hook's effect
function Fixed({ show }: { show: boolean }) {
  const [value, setValue] = useState('');
  useEffect(() => {
    if (!show) return;
    // do work when show is true
  }, [show]);
}
```

---

## Interactive Example

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/hooks)

---

## Study Materials

### Official Documentation

- [React — useState](https://react.dev/reference/react/useState)
- [React — useEffect](https://react.dev/reference/react/useEffect)
- [React — useRef](https://react.dev/reference/react/useRef)
- [React — useMemo](https://react.dev/reference/react/useMemo)
- [React — useCallback](https://react.dev/reference/react/useCallback)
- [React — useReducer](https://react.dev/reference/react/useReducer)
- [React — useContext](https://react.dev/reference/react/useContext)
- [Compose — State and Jetpack Compose](https://developer.android.com/develop/ui/compose/state)

### Interactive

- [React — Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects) — deep-dive on useEffect and dependencies
- [useHooks.com](https://usehooks.com/) — catalogue of battle-tested custom hooks

### Videos

- [Jack Herrington — Mastering React's useEffect](https://www.youtube.com/watch?v=dH6i3GurZW8)
- [Fireship — 10 React Hooks Explained](https://www.youtube.com/watch?v=TNhaISOUy6Q)

---

## What's Next

You now understand how Compose state maps to React hooks. Next: how `Column`/`Row`/`Box` layout from Compose translates to React Native's Flexbox system.

➡ [Layout: Column/Row vs Flexbox](./03-layout-column-row-vs-flexbox)
