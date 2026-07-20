---
id: estado-e-apis-nativo
title: "State & APIs"
sidebar_label: "State & APIs"
sidebar_position: 11
---

# State & APIs

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo/fund_10_estado_apis.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Mapping: Android/iOS → React/RN

| Native | React Native | Note |
|--------|-------------|------|
| `@State` / `mutableStateOf` | `useState` | Local component state |
| `ViewModel` + `LiveData` / `@StateObject` | Reactive store (Zustand, Redux) | Global store, no prop drilling |
| `SharedPreferences` / `UserDefaults` | Key-value storage (MMKV) | MMKV is synchronous, encrypted |
| `Retrofit` / `URLSession` + Repository | Data layer with cache (TanStack Query) | Automatic cache, retry, and states |
| `Room` / `CoreData` | Structured storage (WatermelonDB) | For complex relational data |

---

## Local state: the component owns the data

The direct equivalent of `@State` (SwiftUI) or `mutableStateOf` (Compose) is `useState`. State lives inside the component and triggers a re-render when it changes — the same mental model.

```tsx
const [isLoading, setIsLoading] = useState(false);
const [user, setUser] = useState<User | null>(null);
```

For more complex logic — multiple fields that change together, explicit state transitions — use `useReducer`. It is conceptually identical to a `ViewModel` that receives events (`Action`) and produces a new state:

```tsx
type State = { status: 'idle' | 'loading' | 'success' | 'error'; data: User | null };
type Action = { type: 'FETCH_START' } | { type: 'FETCH_SUCCESS'; payload: User } | { type: 'FETCH_ERROR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':   return { status: 'loading', data: null };
    case 'FETCH_SUCCESS': return { status: 'success', data: action.payload };
    case 'FETCH_ERROR':   return { status: 'error', data: null };
    default: return state;
  }
}

const [state, dispatch] = useReducer(reducer, { status: 'idle', data: null });
```

**Important difference:** in React, state is immutable. You never mutate the object directly — you always create a new one. `setUser({ ...user, name: 'John' })` instead of `user.name = 'John'`.

---

## Initialization and side effects: useEffect

In native development, the screen lifecycle — `onCreate`, `viewDidLoad` — is where you initialize data, configure observers, and register listeners. In React, that responsibility belongs to `useEffect`.

```tsx
useEffect(() => {
  // Runs after the first render — equivalent to onCreate / viewDidLoad
  fetchUserProfile();

  return () => {
    // Cleanup — equivalent to onDestroy / deinit
    // Use to cancel subscriptions, remove listeners
  };
}, []); // empty array = runs once
```

The second argument is the dependency array. This has no direct equivalent in native — it is a React concept:

```tsx
useEffect(() => {
  // Runs every time userId changes
  fetchUserProfile(userId);
}, [userId]);
```

The practical rule: `[]` for one-time initialization, `[dep]` when the effect needs to react to a specific change. Omitting the array makes the effect run on every render — almost never what you want.

---

## The reactive model: state changes, UI updates automatically

This is the most important conceptual shift for native developers: **you never tell the UI to update**.

On Android, after changing data in an adapter, you call `notifyDataSetChanged()`. On iOS, you call `tableView.reloadData()`. In React, neither of these exists.

When you call `setState` or update a store, React automatically recomputes which parts of the UI depend on that state and re-renders only those parts.

```tsx
// Native — imperative: you control WHEN the UI updates
items.add(newItem)
adapter.notifyItemInserted(items.size - 1)  // Android
tableView.reloadData()                       // iOS

// React — declarative: the UI IS a function of state
const [items, setItems] = useState<Item[]>([]);

// You only change the state — React handles the UI
setItems(prev => [...prev, newItem]);
```

The list rendered in JSX always reflects the current state. There is no explicit refresh call — the declaration `<FlatList data={items} />` always shows the current `items` because it re-renders whenever `items` changes.

This inversion of control is the core of the React model: instead of manually coordinating UI and data, you keep the state correct and let the framework synchronize the UI.

---

## Client state vs Server state

This is the most important conceptual split in the React ecosystem — and one that does not exist explicitly in native development:

| | Client state | Server state |
|---|---|---|
| **What it is** | State that lives in the app's memory | Data that comes from the server |
| **Who controls it** | The app itself | The server is the source of truth |
| **Examples** | theme, user session, cart | product list, profile, orders |
| **Main problem** | synchronizing between components | cache, refetch, stale data, loading |
| **Typical tool** | Zustand, Redux, Context | TanStack Query, SWR |

In native development, the `ViewModel` typically handles both at the same time. In React, separating them explicitly greatly reduces complexity — each layer only deals with the problem it knows how to solve.

---

## Global state: reactive store

When multiple screens need the same data (e.g., authentication session), you need a shared store — the equivalent of a `ViewModel` scoped to the entire app.

The concept is always the same, regardless of the library:
1. A centralized JavaScript object holds the state
2. Store functions update that state
3. Any component can read and react to changes without prop drilling

```tsx
// Concept: an authentication store
const authStore = {
  token: null,
  user: null,
  setAuth(token, user) { /* updates and notifies subscribers */ },
  logout()           { /* clears and notifies subscribers */ },
};

// Any component reads directly — without passing props down the tree
const { user, logout } = useAuthStore();
```

**Zustand** is the lightest option (2KB, no mandatory providers) and suitable for most apps. **Redux Toolkit** makes more sense in large teams that need full change traceability and advanced debugging tools.

Real example with Zustand:

```tsx
import { create } from 'zustand';

type AuthState = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}));

// In any component — no Provider, no prop drilling
const { user, logout } = useAuthStore();
```

The `set` function partially replaces the state (automatic merge), equivalent to Kotlin's `copy()` or Swift's mutable `struct` — you never mutate the object directly.

---

## Local persistence: key-value storage

The equivalent of `SharedPreferences` (Android) or `UserDefaults` (iOS) in React Native is a key-value storage in JavaScript.

The concept is the same: persist small amounts of data between sessions — authentication token, preferences, theme.

```tsx
// Write
storage.set('token', 'abc123');

// Read
const token = storage.getString('token');

// Delete
storage.delete('token');
```

**MMKV** is the recommended option for production: synchronous API (no `async/await`), built-in AES encryption, and ~30x faster than `AsyncStorage`. The key point is that the **synchronous** API is a real advantage — you read the token exactly when you need it, without callbacks or promises.

The global state store (Zustand, Redux) can use this storage as a persistence backend, making state survive app restarts automatically.

---

## Services layer: pure fetch functions

Before connecting to TanStack Query, you need a function that performs the fetch. It lives in `services/` — no React logic, no hooks, just HTTP calls and error handling. This makes the function independently testable, exactly like a repository method in native development.

```tsx
// services/products.ts
export type Product = { id: string; name: string; price: number };

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('https://api.example.com/products', {
    headers: { Authorization: `Bearer ${storage.getString('token')}` },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<Product> {
  const response = await fetch('https://api.example.com/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${storage.getString('token')}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
```

The `throw new Error` when `response.ok` is `false` is important: `fetch` does not throw on HTTP errors (4xx, 5xx) — it only throws on network failure. Without this check, a 401 or 500 would reach the component as a success.

---

## Data fetching: automatic cache and states

In native development, the Repository + `Retrofit`/`URLSession` pattern handles the fetch but leaves you to manage: loading state, error state, cache, retry, and invalidation. In React Native, a data layer like **TanStack Query** centralizes all of that.

The core concept is: **the query is reactive**. You describe what you want to fetch and the library handles the lifecycle.

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],          // cache key — same as Retrofit's cache key
  queryFn: fetchProducts,          // function defined in services/
  staleTime: 5 * 60 * 1000,       // how long the cache is considered fresh
});
```

This replaces the manual pattern of:
```kotlin
// Android — what you would do manually
viewModel.state.observe(this) { state ->
    when (state) {
        is Loading -> showSpinner()
        is Success -> showData(state.data)
        is Error   -> showError(state.message)
    }
}
```

**Integration with React Navigation:** use `useFocusEffect` to refetch when returning to a screen, replicating Android's `onResume` behavior:

```tsx
useFocusEffect(
  useCallback(() => { query.refetch(); }, [])
);
```

---

## Mutations: writing to the server

`useQuery` covers reads. For POST, PUT, and DELETE — any operation that writes to the server — the equivalent is `useMutation`. The `onSuccess` + `invalidateQueries` pattern is the most important: it discards the list cache after a creation or edit, forcing a refetch and keeping the UI in sync with the server.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct } from '../services/products';

function NewProductScreen() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      // Invalidates the 'products' cache — the next read will fetch from the server
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      console.error('Failed to create product:', error.message);
    },
  });

  function handleSubmit(data: { name: string; price: number }) {
    mutation.mutate(data);
  }

  return (
    <>
      {mutation.isPending && <ActivityIndicator />}
      {mutation.isError && <Text>Error: {mutation.error.message}</Text>}
      <Button title="Save" onPress={() => handleSubmit({ name: 'New', price: 99 })} />
    </>
  );
}
```

`mutation.isPending` while the request is in flight is the equivalent of `useQuery`'s `isLoading` — use it to disable the button and prevent double submissions, exactly as you would with a `ProgressDialog` on Android.

---

## Recommended architecture

The client state / server state separation results in a clear structure:

```
src/
├── stores/          # Client state — Zustand: auth, theme, UI preferences
├── hooks/           # Server state — TanStack Query: server data
├── services/        # Pure fetch functions (no React logic)
└── lib/
    └── storage.ts   # Storage instance (MMKV)
```

This separation is the equivalent of the native **ViewModel + Repository** pattern — each layer has a single, testable responsibility.

---

## Practical exercise

1. In an app you have already built natively, identify which data is **client state** and which is **server state** — what would the split look like in the React model?
2. Model an authentication store: what fields does it need? What actions does it expose? Sketch out the TypeScript type before writing any implementation.
3. Think about how the cache for a product list should behave: when should it be considered "stale"? What should trigger a refetch? Compare with how you would do this with Retrofit + Room on Android.

---

## Study Materials

| Resource | Type | Link |
|---------|------|------|
| How to Manage State in React Native | Article | [OneUptime](https://oneuptime.com/blog/post/2026-02-02-react-native-state-management/view) |
| Zustand + TanStack Query: RN Guide 2026 | Article | [React Native Relay](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query) |
| Comparison: Redux vs Context vs Zustand | Article | [Java Code Geeks](https://www.javacodegeeks.com/2025/09/react-state-management-showdown-redux-vs-context-api-vs-zustand.html) |
| How to Persist State with AsyncStorage and MMKV | Article | [OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view) |
| TanStack Query for React Native | Official Docs | [tanstack.com](https://tanstack.com/query/v5/docs/framework/react/react-native) |
| react-native-mmkv | GitHub | [mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) |

---

Next → **[Using Native Resources](../modulo-recursos-nativos/utilizando-recursos-nativos)**