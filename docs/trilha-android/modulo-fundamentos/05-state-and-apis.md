---
title: "State & APIs"
sidebar_label: "State & APIs"
sidebar_position: 5
---

## Video Overview

> Video for this topic coming soon.

## Mapping Android Architecture to React Native

You already know how Android architecture works: `ViewModel` holds UI state, `Repository` abstracts data sources, `Flow`/`LiveData` streams updates to the UI layer. React Native has direct equivalents for all of it.

| Android pattern                  | React Native equivalent                        |
|----------------------------------|------------------------------------------------|
| `ViewModel` + `StateFlow`        | Zustand store                                  |
| `LiveData`                       | `useState` / Zustand selector                  |
| `Repository`                     | TanStack Query query function                  |
| `Room` (local DB)                | MMKV / SQLite via `expo-sqlite`               |
| `Retrofit` / `Ktor`              | `fetch` / `axios`                              |
| `Coroutines` + `suspend fun`     | `async/await` + `Promise`                      |
| `Hilt` / `Koin`                  | React Context / Zustand (no DI framework needed) |
| `sealed class UiState`           | TypeScript discriminated union                 |

---

## Local State: useState + useReducer

For component-level state (no sharing between screens), `useState` is equivalent to a local mutable state in a Composable:

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

function LikeButton({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);

  function handlePress() {
    setLiked(l => !l);
    setCount(c => liked ? c - 1 : c + 1);
  }

  return (
    <Pressable onPress={handlePress}>
      <Text>{liked ? '❤️' : '🤍'} {count}</Text>
    </Pressable>
  );
}
```

For state with multiple fields and transitions (sealed class UiState pattern), use `useReducer`:

```tsx
import { useReducer } from 'react';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; users: User[] }
  | { status: 'error'; message: string };

type Action =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; users: User[] }
  | { type: 'ERROR'; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH':   return { status: 'loading' };
    case 'SUCCESS': return { status: 'success', users: action.users };
    case 'ERROR':   return { status: 'error', message: action.message };
    default:        return state;
  }
}

function UserScreen() {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });

  async function loadUsers() {
    dispatch({ type: 'FETCH' });
    try {
      const users = await api.getUsers();
      dispatch({ type: 'SUCCESS', users });
    } catch (err) {
      dispatch({ type: 'ERROR', message: (err as Error).message });
    }
  }

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error')   return <Error message={state.message} />;
  if (state.status === 'success') return <UserList users={state.users} />;
  return <Pressable onPress={loadUsers}><Text>Load</Text></Pressable>;
}
```

---

## Global State: Zustand

Zustand is the lightweight state management library that maps most directly to Android's `ViewModel` + `StateFlow` pattern. No boilerplate, no reducers required, no Provider wrapping.

```bash
npm install zustand
```

### Creating a store

```tsx
// store/authStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authApi.login(email, password);
      set({ user, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  logout: () => set({ user: null }),
}));
```

### Using the store in any component

```tsx
// No Provider needed — store is global
function ProfileScreen() {
  const user = useAuthStore(state => state.user);         // selector
  const logout = useAuthStore(state => state.logout);

  if (!user) return <LoginScreen />;

  return (
    <View>
      <Text>{user.name}</Text>
      <Pressable onPress={logout}><Text>Logout</Text></Pressable>
    </View>
  );
}
```

> **Selector pattern**: `useAuthStore(state => state.user)` — only re-renders when `user` changes, not when `isLoading` changes. This is the equivalent of `stateFlow.map { it.user }.collectAsState()` in Compose.

### Persist store to storage (like DataStore)

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useSettingsStore = create(
  persist(
    (set) => ({
      darkMode: false,
      language: 'en',
      toggleDark: () => set(s => ({ darkMode: !s.darkMode })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## Server State: TanStack Query

Local state (`useState`, Zustand) is for client-owned data. API data — users, posts, feed — has a different lifecycle: fetching, caching, background refetch, pagination, mutations. TanStack Query (formerly React Query) handles this, the equivalent of a `Repository` + `RemoteDataSource` with automatic caching.

```bash
npm install @tanstack/react-query
```

### Setup

```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // data is fresh for 5 minutes
      retry: 2,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainNavigator />
    </QueryClientProvider>
  );
}
```

### useQuery — fetching data

```tsx
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Text } from 'react-native';

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('https://api.example.com/users');
  if (!res.ok) throw new Error('Network error');
  return res.json();
}

function UserListScreen() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users'],       // cache key — equivalent to Room's cache key
    queryFn: fetchUsers,
  });

  if (isLoading) return <ActivityIndicator />;
  if (isError)   return <Text>Error: {error.message}</Text>;

  return (
    <FlatList
      data={data}
      keyExtractor={u => u.id}
      renderItem={({ item }) => <UserRow user={item} />}
      onRefresh={refetch}
      refreshing={isLoading}
    />
  );
}
```

### useMutation — write operations (POST/PUT/DELETE)

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function DeleteUserButton({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/users/${id}`, { method: 'DELETE' }).then(r => r.json()),

    onSuccess: () => {
      // Invalidate and refetch — equivalent to Room's @Delete + Flow re-emission
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <Pressable
      onPress={() => deleteMutation.mutate(userId)}
      disabled={deleteMutation.isPending}
    >
      <Text>{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</Text>
    </Pressable>
  );
}
```

### Parametrised queries

```tsx
function UserDetailScreen({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['users', userId],   // cache key includes the ID
    queryFn: () => fetchUser(userId),
    enabled: !!userId,             // don't fetch if userId is empty
  });

  return <Text>{user?.name}</Text>;
}
```

---

## Local Persistence: MMKV

MMKV is the React Native equivalent of `SharedPreferences` — fast, synchronous key-value storage backed by Tencent's MMKV library (the same one WeChat uses).

```bash
npm install react-native-mmkv
```

```tsx
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Write
storage.set('user.token', 'eyJhbG...');
storage.set('user.id', '42');
storage.set('onboarded', true);

// Read
const token = storage.getString('user.token');  // string | undefined
const userId = storage.getNumber('user.id');     // number | undefined
const onboarded = storage.getBoolean('onboarded'); // boolean | undefined

// Delete
storage.delete('user.token');

// Check existence
if (storage.contains('user.token')) { ... }
```

### MMKV with Zustand persist

```tsx
import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

const mmkvStorage = new MMKV();

const zustandMmkvStorage: StateStorage = {
  getItem: (key) => mmkvStorage.getString(key) ?? null,
  setItem: (key, value) => mmkvStorage.set(key, value),
  removeItem: (key) => mmkvStorage.delete(key),
};

// Use in persist middleware instead of AsyncStorage
storage: createJSONStorage(() => zustandMmkvStorage),
```

> **MMKV vs AsyncStorage**: MMKV is synchronous and 10–100x faster than AsyncStorage. Use MMKV for auth tokens, user preferences, app settings. Use `expo-sqlite` for relational data.

---

## HTTP Requests: fetch and axios

### Native fetch (built-in, no install needed)

```tsx
async function getUser(id: string): Promise<User> {
  const response = await fetch(`https://api.example.com/users/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storage.getString('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return response.json() as Promise<User>;
}
```

### axios (recommended for production)

```bash
npm install axios
```

```tsx
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

// Request interceptor — equivalent to OkHttp Interceptor
api.interceptors.request.use(config => {
  const token = storage.getString('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — global error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Usage
const { data: user } = await api.get<User>(`/users/${id}`);
await api.post<void>('/users', { name, email });
```

---

## Architecture Pattern: Putting It Together

A complete screen following the Android MVVM-inspired pattern in React Native:

```tsx
// The "ViewModel equivalent" lives in Zustand or TanStack Query
// The "View" is the screen component

function ProductScreen({ route }: NativeStackScreenProps<RootStack, 'Product'>) {
  const { productId } = route.params;

  // Server state — TanStack Query (Repository + RemoteDataSource)
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.get<Product>(`/products/${productId}`).then(r => r.data),
  });

  // Global client state — Zustand (ViewModel)
  const addToCart = useCartStore(state => state.addItem);

  // Local UI state — useState
  const [quantity, setQuantity] = useState(1);

  if (isLoading) return <LoadingScreen />;
  if (!product) return <NotFound />;

  return (
    <ScrollView>
      <Image source={{ uri: product.imageUrl }} style={styles.image} />
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.price}>R$ {product.price.toFixed(2)}</Text>
      <QuantityPicker value={quantity} onChange={setQuantity} />
      <Pressable style={styles.btn} onPress={() => addToCart(product, quantity)}>
        <Text style={styles.btnLabel}>Add to Cart</Text>
      </Pressable>
    </ScrollView>
  );
}
```

---

## Interactive Example

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/network)

---

## Study Materials

### Official Documentation

- [Zustand — Documentation](https://zustand.docs.pmnd.rs/getting-started/introduction)
- [TanStack Query — React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [MMKV — react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
- [React Native — Network](https://reactnative.dev/docs/network)
- [Axios — Documentation](https://axios-http.com/docs/intro)

### Videos

- [Jack Herrington — Zustand — State Management for React](https://www.youtube.com/watch?v=_ngCLZ5Iz-0)
- [Theo (t3.gg) — You Might Not Need React Query](https://www.youtube.com/watch?v=vxkbf5QMA2g) — context on when to use it
- [TkDodo — Practical React Query](https://www.youtube.com/watch?v=novnyCaa7To)

---

## Module Summary

You have completed the Fundamentals module for the Android Native Trail. Here is the full map:

| Concept | Where to find it |
|---------|-----------------|
| JavaScript variables, functions, closures | Topic 01 |
| TypeScript types, generics, sealed classes | Topic 02 |
| View/Text/Image/FlatList/Pressable | Topic 03 |
| StyleSheet, Platform, shadows, transforms | Topic 04 |
| useState, Zustand, TanStack Query, MMKV | Topic 05 |
| @Composable → Component | Compose → RN module, Topic 01 |
| remember/useState/useEffect | Compose → RN module, Topic 02 |
| Column/Row/Flexbox | Compose → RN module, Topic 03 |
| Navigation | Compose → RN module, Topic 04 |
| MaterialTheme → Paper/Context | Compose → RN module, Topic 05 |

The next module dives into the New Architecture: Hermes, JSI, TurboModules in Kotlin, and Fabric Native Components backed by Jetpack Compose views.
