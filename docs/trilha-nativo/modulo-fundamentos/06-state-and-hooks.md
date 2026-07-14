---
title: State & Hooks in Depth
---

# State & Hooks in Depth

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo/fund_05_state_hooks.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> Hooks are how React function components manage state, side effects, performance, and shared logic. They replace class lifecycle methods and ViewModels.

## Rules of Hooks

Before anything else — hooks have two hard rules:

1. **Only call hooks at the top level** — not inside loops, conditions, or nested functions
2. **Only call hooks from React components** (or other hooks)

```tsx
// WRONG
function MyComponent({ show }: { show: boolean }) {
    if (show) {
        const [value, setValue] = useState(0); // ERROR — conditional hook
    }
}

// CORRECT
function MyComponent({ show }: { show: boolean }) {
    const [value, setValue] = useState(0); // always at top level
    if (!show) return null;
    return <Text>{value}</Text>;
}
```

---

## `useState` — Reactive State

```tsx
// Simple value
const [count, setCount] = useState(0);

// Object state
const [form, setForm] = useState({ email: '', password: '' });
// Update one field immutably
const updateEmail = (email: string) => setForm(prev => ({ ...prev, email }));

// Functional update (when new state depends on previous)
const increment = () => setCount(prev => prev + 1);
// Use the functional form when the new value depends on the old one
// — avoids stale closure bugs in async code
```

---

## `useEffect` — Side Effects

Covered in React Fundamentals. Key patterns:

```tsx
// Data fetching on mount
useEffect(() => {
    fetchData().then(setData);
}, []);

// Subscription with cleanup
useEffect(() => {
    const subscription = eventEmitter.addListener('event', handler);
    return () => subscription.remove(); // cleanup on unmount
}, []);

// Derived effect when a value changes (e.g. update navigation header title)
useEffect(() => {
    navigation.setOptions({ title: `Count: ${count}` });
}, [count]);
```

---

## `useReducer` — Complex State Logic

When state transitions get complex — multiple related values, state that depends on the previous state, or many different actions — `useReducer` is cleaner than several `useState` calls.

```tsx
import { useReducer } from 'react';

// Define state shape and all possible actions
interface AuthState {
    status: 'idle' | 'loading' | 'success' | 'error';
    user: User | null;
    error: string | null;
}

type AuthAction =
    | { type: 'LOGIN_START' }
    | { type: 'LOGIN_SUCCESS'; user: User }
    | { type: 'LOGIN_ERROR'; message: string }
    | { type: 'LOGOUT' };

// Pure reducer function — same concept as in Android MVI or Redux
function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'LOGIN_START':
            return { ...state, status: 'loading', error: null };
        case 'LOGIN_SUCCESS':
            return { status: 'success', user: action.user, error: null };
        case 'LOGIN_ERROR':
            return { ...state, status: 'error', error: action.message };
        case 'LOGOUT':
            return { status: 'idle', user: null, error: null };
    }
}

const initialState: AuthState = { status: 'idle', user: null, error: null };

function LoginScreen() {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const handleLogin = async (email: string, password: string) => {
        dispatch({ type: 'LOGIN_START' });
        try {
            const user = await login(email, password);
            dispatch({ type: 'LOGIN_SUCCESS', user });
        } catch (e) {
            dispatch({ type: 'LOGIN_ERROR', message: (e as Error).message });
        }
    };

    if (state.status === 'loading') return <ActivityIndicator />;
    if (state.status === 'error') return <Text>{state.error}</Text>;
    return <Button title="Login" onPress={() => handleLogin('a@b.com', 'pw')} />;
}
```

**Native parallels:**

| Native | `useReducer` |
|--------|-------------|
| Android MVI `reduce(state, intent)` | `authReducer(state, action)` |
| Swift Composable Architecture `Reducer` | Same pattern, different naming |
| Redux reducer | Identical concept |

**`useState` vs `useReducer`:**

- Use `useState` for independent simple values
- Use `useReducer` when multiple state fields change together or transitions need to be explicit and testable

---

## `useRef` — Mutable Values Without Re-render

`useRef` is like a mutable container that survives renders without triggering one. Think of it as an instance variable on a Compose `remember` — it persists across recompositions but changing it doesn't cause one.

```tsx
import { useRef, useEffect } from 'react';
import { TextInput } from 'react-native';

function SearchBar() {
    // Ref to a DOM/native node — like findViewById in Android
    const inputRef = useRef<TextInput>(null);

    // Ref to a mutable value (like an instance variable)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Auto-focus on mount — like input.requestFocus() in Android
        inputRef.current?.focus();
    }, []);

    const handleChange = (text: string) => {
        // Debounce without triggering a re-render on each keystroke
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            performSearch(text);
        }, 300);
    };

    return <TextInput ref={inputRef} onChangeText={handleChange} />;
}
```

---

## `useMemo` — Expensive Computations

`useMemo` caches a computed value. Only recompute when dependencies change. Like Compose's `remember(key) { ... }`:

```tsx
import { useMemo } from 'react';

function ProductList({ products, filterText }: Props) {
    // Only recomputes when products or filterText changes
    const filteredProducts = useMemo(() => {
        return products
            .filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()))
            .sort((a, b) => a.price - b.price);
    }, [products, filterText]);

    return <FlatList data={filteredProducts} renderItem={...} />;
}
```

Don't over-optimize with `useMemo` — only use it for genuinely expensive operations.

---

## `useCallback` — Stable Function References

`useCallback` memoizes a function. Prevents child components from re-rendering unnecessarily when a callback hasn't actually changed:

```tsx
import { useCallback } from 'react';

function ParentList() {
    const [items, setItems] = useState(['a', 'b', 'c']);

    // Without useCallback: new function reference on every render
    // → FlatList's renderItem would re-render every row
    const handleDelete = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item !== id));
    }, []); // empty deps — function never changes

    return (
        <FlatList
            data={items}
            keyExtractor={item => item}
            renderItem={({ item }) => (
                <ItemRow item={item} onDelete={handleDelete} />
            )}
        />
    );
}
```

---

## Custom Hooks — Reusable Logic

You can extract stateful logic into your own hooks. Naming convention: **must start with `use`**.

```tsx
// useLocalStorage-like hook for React Native (using AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

function usePersistedState<T>(key: string, initialValue: T) {
    const [value, setValue] = useState<T>(initialValue);

    useEffect(() => {
        AsyncStorage.getItem(key).then(stored => {
            if (stored !== null) {
                try {
                    setValue(JSON.parse(stored));
                } catch {
                    // corrupted storage — discard and keep initialValue
                    AsyncStorage.removeItem(key);
                }
            }
        });
    }, [key]);

    const setPersistedValue = (newValue: T) => {
        setValue(newValue);
        AsyncStorage.setItem(key, JSON.stringify(newValue));
    };

    return [value, setPersistedValue] as const;
}

// Usage — just like useState, but persisted across app restarts
function SettingsScreen() {
    const [isDark, setIsDark] = usePersistedState('theme', false);
    return <Switch value={isDark} onValueChange={setIsDark} />;
}
```

Custom hooks are the equivalent of a Kotlin extension function on a ViewModel, or a SwiftUI view modifier — reusable logic that any component can plug in.

---

## Hook Comparison Table

| Hook | Native Equivalent | When to Use |
|------|------------------|-------------|
| `useState` | `mutableStateOf` / `@State` | Any reactive value |
| `useEffect` | `LaunchedEffect` / `onAppear` + `onDisappear` | Side effects, subscriptions, data fetching |
| `useRef` | Instance variable / `remember { ... }` without `State` | Mutable non-reactive values, native node refs |
| `useMemo` | `remember(key) { ... }` | Expensive derived values |
| `useCallback` | N/A (Compose uses stable lambdas) | Stable function references for child components |
| `useContext` | `CompositionLocal` / `@EnvironmentObject` | Cross-tree data (theme, auth, locale) |
| Custom hook | Extension on ViewModel / ViewModifier | Reusable stateful logic |

---

## Exercises

1. **Build a `useDebounce` hook** that takes a value and a delay, and returns the debounced value (only updates after the delay passes without another change).

2. **Build a `useFetch<T>` hook** that takes a URL and returns `{ data: T | null, loading: boolean, error: string | null }`.

3. **Identify the bug** in this code and fix it:
   ```tsx
   function Timer() {
       const [seconds, setSeconds] = useState(0);
       useEffect(() => {
           const interval = setInterval(() => {
               setSeconds(seconds + 1); // bug here
           }, 1000);
           return () => clearInterval(interval);
       }, []);
       return <Text>{seconds}</Text>;
   }
   ```

---

## Resources

| Resource | Type | Link |
|---|---|---|
| react.dev — Hooks Reference | Official Docs | [react.dev/reference/react](https://react.dev/reference/react) |
| react.dev — Escape Hatches (useRef, useEffect) | Official Docs | [react.dev/learn/escape-hatches](https://react.dev/learn/escape-hatches) |
| usehooks.com | Community Hooks | [usehooks.com](https://usehooks.com/) |

---

Next → **[React Native Core Components](./rn-core-components)**