---
title: State Management and API Calls
---

# State Management and API Calls

Swift gives you a well-defined stack: URLSession or Alamofire for networking, Combine for reactive state, CoreData or SwiftData for persistence, UserDefaults for lightweight key-value storage, and Keychain for secrets. React Native does not ship an equivalent stack — instead, the ecosystem converges on a set of libraries that map almost one-to-one to what you already know.

This module walks through each layer of the Swift stack and shows its React Native counterpart with full TypeScript examples.

---

## URLSession / Alamofire → Axios with Interceptors

Axios is the fetch library you will see in most React Native codebases. Like Alamofire, it supports a request pipeline through interceptors — the right place to attach authorization headers and to implement silent token refresh.

### Base instance

```typescript
// src/lib/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { getToken, refreshAccessToken, clearSession } from './auth';

const api: AxiosInstance = axios.create({
  baseURL: 'https://api.example.com/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach bearer token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — silent token refresh
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        queue.forEach((cb) => cb(newToken));
        queue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearSession();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

The pattern mirrors Alamofire's `RequestInterceptor` — a `adapt` step (request interceptor) and a `retry` step (response interceptor). The queue prevents multiple simultaneous refresh calls, the same race condition you guard against in Swift.

---

## Combine Publishers → TanStack Query

In SwiftUI you write an `@Published` property on an `ObservableObject`, combine it with `.sink` or `.receive(on:)`, and the view reacts. TanStack Query replaces this pattern for server state: it handles loading, error, caching, background refetch, and stale-while-revalidate without any manual state coordination.

### Query key factory

Centralizing query keys is the React Native equivalent of grouping Combine publishers by domain. It prevents typos and makes invalidation predictable.

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  user: {
    all: ['user'] as const,
    profile: (id: string) => ['user', 'profile', id] as const,
    settings: () => ['user', 'settings'] as const,
  },
  posts: {
    all: ['posts'] as const,
    list: (filters: Record<string, unknown>) => ['posts', 'list', filters] as const,
    detail: (id: string) => ['posts', id] as const,
  },
} as const;
```

### useQuery — reading data

```typescript
// src/features/profile/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

interface Profile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

async function fetchProfile(id: string): Promise<Profile> {
  const { data } = await api.get<Profile>(`/users/${id}`);
  return data;
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: queryKeys.user.profile(id),
    queryFn: () => fetchProfile(id),
    staleTime: 5 * 60 * 1000, // 5 minutes — like a Combine publisher with rate limiting
  });
}
```

In a component:

```typescript
function ProfileScreen({ userId }: { userId: string }) {
  const { data, isPending, isError, error } = useProfile(userId);

  if (isPending) return <ActivityIndicator />;
  if (isError) return <Text>Error: {error.message}</Text>;

  return <Text>{data.name}</Text>;
}
```

### useMutation — writing data

```typescript
// src/features/profile/useUpdateProfile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

interface UpdateProfileInput {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, ...body }: UpdateProfileInput) => {
      const { data } = await api.patch(`/users/${userId}`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate so the next read fetches fresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.profile(variables.userId),
      });
    },
  });
}
```

---

## CoreData / SwiftData → Server State + Zustand

React Native has no built-in persistence layer equivalent to CoreData. The community split the problem in two:

- **Server state** (data that lives on a backend): TanStack Query owns this. Its cache is the in-memory equivalent of a CoreData `NSManagedObjectContext`.
- **Local client state** (UI state, user preferences, draft forms): Zustand or Context.

There is no offline-first sync layer built in. If you need CoreData-level persistence with background sync, libraries such as WatermelonDB or MMKV-backed Zustand middleware are the starting point.

---

## UserDefaults → react-native-mmkv

UserDefaults is a synchronous key-value store backed by a plist. `react-native-mmkv` is the React Native equivalent: same use case, same synchronous API, 10–30x faster than AsyncStorage because it uses memory-mapped files rather than SQLite.

```typescript
// src/lib/storage.ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'app-storage' });

// Typed helpers
export function setItem<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function getItem<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function removeItem(key: string): void {
  storage.delete(key);
}
```

MMKV also ships a React hook for reactive reads:

```typescript
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/lib/storage';

function ThemeToggle() {
  const [theme, setTheme] = useMMKVString('theme', storage);
  // Re-renders automatically when `theme` changes — like @AppStorage in SwiftUI
  return (
    <Switch
      value={theme === 'dark'}
      onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
    />
  );
}
```

---

## Keychain → expo-secure-store

Swift Keychain stores encrypted data tied to the app's bundle. `expo-secure-store` wraps the platform Keychain (iOS) and Android Keystore with a consistent async API.

```typescript
// src/lib/auth.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export async function saveTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh),
  ]);
}

export async function getToken(key: 'accessToken' | 'refreshToken'): Promise<string | null> {
  return SecureStore.getItemAsync(
    key === 'accessToken' ? ACCESS_TOKEN_KEY : REFRESH_TOKEN_KEY,
  );
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
```

SecureStore is synchronous on the native side but returns promises from JS — always `await` it.

---

## ObservableObject → Zustand (Slices Pattern)

Zustand is a minimal state container. Think of it as a lightweight `ObservableObject` without Combine — it holds state, exposes actions, and components subscribe to exactly the slices they need without re-rendering for unrelated changes.

### Single store with slices

```typescript
// src/store/index.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/lib/storage';

// Auth slice
interface AuthSlice {
  isAuthenticated: boolean;
  userId: string | null;
  login: (userId: string) => void;
  logout: () => void;
}

// UI slice
interface UISlice {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

type AppStore = AuthSlice & UISlice;

const createAuthSlice = (set: (fn: (s: AppStore) => Partial<AppStore>) => void): AuthSlice => ({
  isAuthenticated: false,
  userId: null,
  login: (userId) => set(() => ({ isAuthenticated: true, userId })),
  logout: () => set(() => ({ isAuthenticated: false, userId: null })),
});

const createUISlice = (set: (fn: (s: AppStore) => Partial<AppStore>) => void): UISlice => ({
  theme: 'light',
  setTheme: (theme) => set(() => ({ theme })),
});

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...createAuthSlice(set),
      ...createUISlice(set),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      })),
      partialize: (state) => ({ theme: state.theme }), // only persist theme, not auth
    },
  ),
);
```

Components subscribe to individual fields — Zustand only re-renders a component when the selected value changes:

```typescript
function Header() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  // Only re-renders when `theme` changes
  return <Button onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />;
}
```

---

## Context vs Zustand

Use Context when the value is stable and rarely changes — a theme object, a router instance, a feature flag set loaded once at startup. Context re-renders every consumer on any change to its value, so high-frequency updates cause unnecessary renders.

Use Zustand for anything that changes at runtime: auth state, shopping cart, UI flags, form drafts. Zustand's selector-based subscription model means components only re-render when their specific slice changes.

| Criterion | Context | Zustand |
|---|---|---|
| Update frequency | Low (theme, locale) | Any |
| Consumer granularity | All consumers re-render | Per-selector subscriptions |
| Middleware (persist, devtools) | None built-in | Built-in |
| Boilerplate | Provider wrapping required | None |
| DevTools | No | Redux DevTools compatible |

---

## Swift async/await → JS async/await with TanStack Query

The syntax is identical. The operational difference is where you call async code.

In Swift you might write:

```swift
func loadUser(id: String) async throws -> User {
    let url = URL(string: "https://api.example.com/users/\(id)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}
```

In TypeScript:

```typescript
async function loadUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}
```

The difference is where this function is called. In SwiftUI you use `.task {}` or `Task { }`. In React Native you hand the function to TanStack Query's `queryFn` and let the library handle the lifecycle — cancellation, retry, background refetch, cache invalidation.

Calling async code directly inside a component with `useEffect` is the equivalent of calling `Task { }` with no structured lifecycle management. Prefer `useQuery` for reads and `useMutation` for writes.

---

## Error Boundaries vs Swift Result Type

Swift's `Result<Success, Failure>` makes errors explicit at the type level. JavaScript has no equivalent — errors propagate as thrown exceptions. TanStack Query surfaces them through the `isError` / `error` properties of each query, which covers network errors cleanly.

For unexpected render errors (unhandled JS exceptions during render), React provides error boundaries — a class component that catches errors thrown by its subtree:

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, Button } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to Sentry or similar
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <View>
          <Text>Something went wrong.</Text>
          <Button title="Retry" onPress={() => this.setState({ hasError: false, error: null })} />
        </View>
      );
    }
    return this.props.children;
  }
}
```

Use error boundaries at navigation screen boundaries so a crash in one screen does not tear down the whole app.

---

## Optimistic Updates

Optimistic updates in Swift require manual state management — you update the local model immediately, then roll back if the network call fails. TanStack Query handles this with `onMutate`, `onError`, and `onSettled` callbacks:

```typescript
// src/features/posts/useLikePost.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

interface Post {
  id: string;
  likeCount: number;
  likedByMe: boolean;
}

export function useLikePost(postId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.posts.detail(postId);

  return useMutation({
    mutationFn: () => api.post(`/posts/${postId}/like`),

    onMutate: async () => {
      // Cancel any in-flight refetches for this post
      await queryClient.cancelQueries({ queryKey: key });

      // Snapshot the previous value for rollback
      const previous = queryClient.getQueryData<Post>(key);

      // Optimistically update the cache
      queryClient.setQueryData<Post>(key, (old) =>
        old
          ? { ...old, likeCount: old.likeCount + 1, likedByMe: true }
          : old,
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Roll back to the snapshot
      if (context?.previous) {
        queryClient.setQueryData<Post>(key, context.previous);
      }
    },

    onSettled: () => {
      // Always refetch after mutation completes or errors
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
```

The three-callback pattern (mutate → optimistic update, error → rollback, settled → reconcile) is the standard idiom. It maps directly to the manual pattern you would write with Combine's `handleEvents` and `catch` operators, but the library manages the cache consistency for you.

---

## Putting It Together

A complete feature module looks like this:

```
src/features/posts/
  queryKeys.ts        ← domain-scoped keys (re-exported from global queryKeys)
  usePosts.ts         ← useQuery for list
  usePost.ts          ← useQuery for detail
  useCreatePost.ts    ← useMutation
  useLikePost.ts      ← useMutation with optimistic update
  postsStore.ts       ← Zustand slice for local draft state
```

Networking lives in `src/lib/api.ts` (Axios instance with interceptors), secrets in `expo-secure-store`, lightweight preferences in MMKV, and server state in TanStack Query's cache. Zustand manages only the UI state that has no server equivalent.

This separation mirrors the clean layering you get from Swift's combination of URLSession, Combine, CoreData, and UserDefaults — each tool has a clearly bounded responsibility, and they compose without coupling.
