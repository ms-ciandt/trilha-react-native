---
title: "Re-render Optimisation: memo, useMemo, useCallback"
sidebar_label: "Re-render Optimisation"
sidebar_position: 4
---

## Video Overview

> Video for this topic coming soon.

## The Problem: Everything Re-renders by Default

In Jetpack Compose, smart recomposition is **automatic** — the compiler tracks which composables read which state and skips those that didn't change. React does the opposite: by default, **every component re-renders when its parent re-renders**, regardless of whether its props changed.

This is the single most important performance difference between Compose and React to internalise.

```tsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Pressable onPress={() => setCount(c => c + 1)}>
        <Text>Count: {count}</Text>
      </Pressable>
      {/* Re-renders on EVERY count change — even though title never changes */}
      <ExpensiveChild title="Static Title" />
    </View>
  );
}
```

Every time `count` changes, `ExpensiveChild` re-renders — even though `title` is always `"Static Title"`. In Compose, the compiler would skip `ExpensiveChild` automatically. In React, you must opt in.

---

## memo — The Manual Compose Skip

`memo` wraps a component and skips re-rendering if its props are shallowly equal to the previous render.

```tsx
import { memo } from 'react';

// Without memo: re-renders whenever Parent re-renders
function ExpensiveChild({ title }: { title: string }) {
  return <Text>{title}</Text>;
}

// With memo: only re-renders when title actually changes
const ExpensiveChild = memo(function ExpensiveChild({ title }: { title: string }) {
  return <Text>{title}</Text>;
});
```

### When memo works

```tsx
// Props are primitives — shallow equality works
<ExpensiveChild title="Hello" count={5} active={true} />
// Re-renders only if title, count, or active change ✓
```

### When memo breaks

```tsx
// Props include objects or arrays created inline — new reference every render
function Parent() {
  return (
    // BAD: new array on every render → memo never skips
    <ExpensiveChild items={[1, 2, 3]} />
  );
}

// FIX: stable reference with useMemo
function Parent() {
  const items = useMemo(() => [1, 2, 3], []);
  return <ExpensiveChild items={items} />;
}
```

```tsx
// Props include functions — new reference every render
function Parent() {
  return (
    // BAD: new function on every render → memo never skips
    <ExpensiveChild onPress={() => console.log('pressed')} />
  );
}

// FIX: stable reference with useCallback
function Parent() {
  const handlePress = useCallback(() => console.log('pressed'), []);
  return <ExpensiveChild onPress={handlePress} />;
}
```

---

## useMemo — Cache Expensive Computations

```tsx
import { useMemo } from 'react';

function ProductList({ products, category, sortBy }: Props) {
  // Without useMemo: runs on every render — even when products didn't change
  const filtered = products
    .filter(p => p.category === category)
    .sort((a, b) => a[sortBy] > b[sortBy] ? 1 : -1);

  // With useMemo: only recomputes when products, category, or sortBy change
  const filtered = useMemo(
    () => products
      .filter(p => p.category === category)
      .sort((a, b) => a[sortBy] > b[sortBy] ? 1 : -1),
    [products, category, sortBy]
  );

  return <FlatList data={filtered} />;
}
```

### When to use useMemo

Use it when:
- The computation is visibly slow (> 1ms — profile first)
- The result is used as a prop to a `memo()`-wrapped component
- The result is a dependency of another `useMemo` or `useCallback`

Do **not** use it for:
- Simple operations like string concatenation or basic math
- Every computation "just in case" — it has its own cost (memory + comparison)

---

## useCallback — Stable Function References

`useCallback(fn, deps)` is `useMemo(() => fn, deps)` — it memoises a function reference so it doesn't change on every render.

```tsx
function UserList({ users }: { users: User[] }) {
  const queryClient = useQueryClient();

  // Without useCallback: new function every render → UserRow re-renders every time
  const handleDelete = async (id: string) => {
    await api.deleteUser(id);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  // With useCallback: stable reference → UserRow only re-renders if queryClient changes
  const handleDelete = useCallback(async (id: string) => {
    await api.deleteUser(id);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }, [queryClient]);

  return (
    <FlatList
      data={users}
      keyExtractor={u => u.id}
      renderItem={({ item }) => (
        <UserRow user={item} onDelete={handleDelete} />
      )}
    />
  );
}

const UserRow = memo(function UserRow({
  user,
  onDelete,
}: {
  user: User;
  onDelete: (id: string) => void;
}) {
  return (
    <Pressable onPress={() => onDelete(user.id)}>
      <Text>{user.name}</Text>
    </Pressable>
  );
});
```

---

## The Dependency Array: Getting It Right

The most common bugs come from wrong dependency arrays — either missing deps (stale closure) or unnecessary deps (defeats memoisation).

### Stale closure — missing dependency

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  // BUG: count is captured at the time the callback is created (0)
  // Every call logs 0 — stale closure
  const logCount = useCallback(() => {
    console.log('Count:', count); // always 0
  }, []); // missing: count

  // FIX 1: add count to deps
  const logCount = useCallback(() => {
    console.log('Count:', count);
  }, [count]);

  // FIX 2: use a ref when you don't want to recreate the callback
  const countRef = useRef(count);
  useEffect(() => { countRef.current = count; }, [count]);
  const logCount = useCallback(() => {
    console.log('Count:', countRef.current); // always fresh
  }, []); // stable reference
}
```

### Over-specified dependencies — defeats memoisation

```tsx
function SearchBar({ config }: { config: { debounceMs: number } }) {
  // BUG: config is a new object on every parent render
  // useCallback recreates on every render — memo never skips
  const handleSearch = useCallback((query: string) => {
    setTimeout(() => search(query), config.debounceMs);
  }, [config]); // config is always a new reference

  // FIX: destructure the specific value you need
  const { debounceMs } = config;
  const handleSearch = useCallback((query: string) => {
    setTimeout(() => search(query), debounceMs);
  }, [debounceMs]); // stable primitive
}
```

---

## React DevTools Profiler — Finding Unnecessary Re-renders

1. Open React Native DevTools (press `j` in Metro)
2. **Profiler** tab → **Record**
3. Interact with the screen
4. Stop recording
5. Click any bar in the flame chart — it shows **why this component re-rendered**

The "Why did this render?" info shows:
- **Props changed** — which prop and from what value to what value
- **State changed** — which `useState` hook triggered the re-render
- **Parent re-rendered** — the component re-rendered because its parent did (this is where `memo` helps)
- **Hooks changed** — a context value or hook dependency changed

---

## A Decision Tree

```
Should I add memo() to this component?
├── Is it in a list rendered by FlatList? → YES, always memo() row components
├── Does it re-render visibly too often? → Profile first, then YES
├── Is it a leaf component with no children? → Only if it's expensive to render
└── Is it a simple wrapper with 1-2 children? → Usually NO — cost > benefit

Should I add useMemo() to this value?
├── Is it a filtered/sorted/derived list? → YES
├── Is it an object passed as prop to a memo() component? → YES
├── Is it a simple string or number? → NO
└── Did profiling show this computation is slow? → YES

Should I add useCallback() to this function?
├── Is it passed as prop to a memo() component? → YES
├── Is it a dependency of useEffect/useMemo? → YES
├── Is it only used inside this component? → Usually NO
└── Is it an event handler on a native element? → NO (Pressable, TextInput, etc. don't benefit)
```

---

## Study Materials

### Official Documentation

- [React — memo](https://react.dev/reference/react/memo)
- [React — useMemo](https://react.dev/reference/react/useMemo)
- [React — useCallback](https://react.dev/reference/react/useCallback)
- [React — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

### Videos

- [Jack Herrington — React memo, useMemo, and useCallback](https://www.youtube.com/watch?v=uojLJFt9SzY)
- [Theo — When to useMemo and useCallback](https://www.youtube.com/watch?v=Il5sN7aJjMM)

---

## What's Next

Re-renders under control. Final topic: bundle size and startup performance — Hermes bytecode, lazy loading, and keeping your app fast at first launch on Android.

➡ [Bundle Size & Startup Performance](./05-bundle-startup)
