---
title: State Management at Scale
---

# State Management at Scale

As your React Native app grows beyond a handful of screens, the decisions you make about state management begin to define the entire architecture. iOS developers face an analogous inflection point when a single `ViewController` starts holding too much mutable state, or when multiple `ObservableObject` stores begin sharing data in ways that create tight coupling. This document walks through the complete landscape of state management in large React Native applications, with concrete analogies to Swift and UIKit/SwiftUI patterns you already know.

## When useState Becomes Insufficient

`useState` is the most local form of state — scoped to a single component, invisible to everything else. It is the direct equivalent of a private property on a `UIViewController` or an `@State` variable in a SwiftUI `View`. It works perfectly for form inputs, toggle states, and any data that does not need to be shared.

The signals that you have outgrown `useState`:

- You are passing the same value as a prop through three or more component levels (prop drilling)
- Multiple unrelated screens need to react to the same data change
- The component that owns the state is high in the tree and re-renders expensive subtrees on every update
- You need the state to survive component unmounts and remounts (navigation transitions in React Navigation destroy and recreate screens by default)

When you notice these patterns, you need a state container that lives outside the React component tree.

## Zustand: Multiple ObservableObject Stores

Zustand is the closest equivalent to the pattern of having multiple focused `ObservableObject` classes in SwiftUI, each responsible for a specific domain. Instead of one monolithic store, you create slices — independently instantiated stores that each manage a cohesive piece of application state.

```ts
import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  token: string | null;
  login: (userId: string, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  token: null,
  login: (userId, token) => set({ userId, token }),
  logout: () => set({ userId: null, token: null }),
}));
```

This mirrors a Swift `AuthManager: ObservableObject` with `@Published` properties. The key difference is that any component can subscribe to only the slice of state it needs, using a selector:

```ts
// Only re-renders when userId changes, not when token changes
const userId = useAuthStore((state) => state.userId);
```

This is equivalent to Combine's `Publisher.map` followed by `removeDuplicates()` — the component only receives updates for the exact value it selected.

### Organizing Zustand Slices in Large Apps

The slice pattern scales well: create one Zustand store per domain (authentication, user profile, cart, navigation history, feature flags). Keep each file under 150 lines. Each store is independently testable, exactly like isolating an `ObservableObject` unit test.

```
src/
  store/
    auth.store.ts
    cart.store.ts
    profile.store.ts
    notifications.store.ts
```

For slices that need to communicate, prefer explicit calls between stores rather than combining them into one large store. The same principle applies in Swift when an `AuthManager` notifies a `CartManager` to clear data on logout.

## Redux Toolkit: Instruments Timeline for State

Redux Toolkit (RTK) occupies a different position in the ecosystem. Its primary advantage is not raw simplicity but debuggability. The Redux DevTools browser extension gives you a complete timeline of every state transition, with the ability to replay, rewind, and jump to any point in history. This is conceptually equivalent to what Instruments gives you for memory and CPU — a retroactive, scrubbing timeline of what happened and when.

When Redux Toolkit is the right choice:

- Your team needs to diagnose complex bugs that involve a sequence of state transitions
- You have strict requirements for audit logging or analytics that map directly to dispatched actions
- You are integrating with an existing Redux codebase
- Multiple developers need a single, enforced pattern for all state mutations

RTK modernizes Redux by eliminating boilerplate through `createSlice`:

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartState {
  items: CartItem[];
  total: number;
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], total: 0 } as CartState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload);
      state.total += action.payload.price;
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.total = state.items.reduce((sum, item) => sum + item.price, 0);
    },
  },
});
```

The immutable-looking mutations inside `reducers` are safe because RTK uses Immer under the hood, which produces a new immutable state from your draft mutations — equivalent to Swift's value-type semantics where assigning to a `var` struct produces a copy.

For most new projects, Zustand delivers 80% of Redux's benefits with significantly less ceremony. Choose RTK when the time-travel debugging and action-log audit trail are non-negotiable requirements.

## Jotai: SwiftUI @State Composition

Jotai takes the opposite approach from Zustand and Redux. Rather than a centralized store, Jotai gives you atoms — the smallest unit of state — which compose into derived atoms. This maps almost directly onto SwiftUI's `@State` and `@Derived` mental model.

```ts
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubledAtom = atom((get) => get(countAtom) * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [doubled] = useAtom(doubledAtom);
  return <Text>{count} doubled is {doubled}</Text>;
}
```

`doubledAtom` is a computed property that automatically invalidates when `countAtom` changes — exactly like a SwiftUI `@State` driving a computed `var` that the view body reads. The component subscribes only to the atoms it reads, and Jotai ensures re-renders are scoped to precisely what changed.

Jotai is excellent for:

- Fine-grained reactivity where many small independent pieces of state exist
- Form state where each field is an atom and the submit button reads a derived validation atom
- Feature flags or theme tokens that need to be read from any component without prop drilling

The tradeoff is that atom proliferation in a large app requires discipline in naming and organization.

## Server State vs Client State: The Fundamental Separation

One of the most important architectural decisions in a production React Native app is distinguishing between two fundamentally different categories of state:

**Client state** is data your app owns and controls: the currently selected tab, whether a modal is open, draft form values, user preferences stored locally. Zustand is the right tool for this.

**Server state** is data that lives on a remote server and is temporarily cached in your app: the user's order history, product catalog, friend list. This data has different characteristics — it can become stale, it can be fetched by multiple components simultaneously, it needs cache invalidation, and it benefits from background refresh.

In UIKit terms: client state is what you store in `UserDefaults` or in-memory properties on your app delegate. Server state is what you fetch via `URLSession`, cache in `NSCache`, and decide when to refetch.

TanStack Query (React Query) is designed specifically for server state. Zustand is not the right tool for it.

```
State Layer Architecture

  TanStack Query         Zustand / Jotai
  ───────────────        ──────────────────
  Order history          Selected tab index
  Product catalog        Cart item count badge
  User profile           Form draft state
  Friend list            Modal open/closed
  Notifications feed     Theme preference
```

## TanStack Query: Owning Server State

TanStack Query manages the entire lifecycle of server data: fetching, caching, background refetching, deduplication, and error states. The core primitive is `useQuery`:

```ts
import { useQuery } from '@tanstack/react-query';

function OrderHistory() {
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetchOrders(userId),
    staleTime: 5 * 60 * 1000, // data is fresh for 5 minutes
  });

  if (isLoading) return <ActivityIndicator />;
  if (error) return <ErrorView error={error} />;
  return <OrderList orders={orders} />;
}
```

Two components that both call `useQuery({ queryKey: ['orders', userId] })` share the same cache entry — the network request is made once, not twice. This deduplication happens automatically, equivalent to wrapping a `URLSession` task in an `NSOperation` with a dependency check.

## Query Key Factory Pattern

As your app grows, query keys become a source of subtle bugs when defined inconsistently across files. The query key factory pattern centralizes key definitions:

```ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};
```

Usage across the app becomes consistent and refactorable:

```ts
// In a list component
useQuery({ queryKey: orderKeys.list({ status: 'pending' }) });

// Invalidating all orders after a mutation
queryClient.invalidateQueries({ queryKey: orderKeys.all });
```

This is equivalent to centralizing your `URLRequest` construction in a dedicated `NetworkRouter` enum in Swift — a single source of truth for how requests are described, which makes refactoring safe.

## Optimistic Updates

An optimistic update applies a state change to the UI immediately, before the server confirms success, then reconciles with the real server response. iOS developers implement this pattern manually with URLSession — you update your local model, make the network call, and roll back if it fails.

TanStack Query provides this pattern with automatic rollback:

```ts
const mutation = useMutation({
  mutationFn: (newItem: CartItem) => addItemToCart(newItem),
  onMutate: async (newItem) => {
    await queryClient.cancelQueries({ queryKey: orderKeys.all });
    const previousCart = queryClient.getQueryData(['cart']);

    queryClient.setQueryData(['cart'], (old: Cart) => ({
      ...old,
      items: [...old.items, newItem],
    }));

    return { previousCart };
  },
  onError: (err, newItem, context) => {
    // Roll back to the snapshot taken before the mutation
    queryClient.setQueryData(['cart'], context.previousCart);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  },
});
```

`onMutate` fires before the network call, captures a snapshot (equivalent to saving a copy of your Swift struct before mutation), and applies the optimistic change. `onError` restores the snapshot if the server returns an error. `onSettled` triggers a refetch to sync with ground truth.

## Stale-While-Revalidate: NSCache + Background Refresh

The stale-while-revalidate pattern is the strategy where you immediately show cached data (even if potentially stale) while simultaneously fetching a fresh version in the background. When the fresh data arrives, the UI updates. The user sees content instantly rather than a loading spinner.

This is exactly what `NSCache` enables in iOS: you serve the cached version from memory while a background `URLSession` task fetches the updated version. When the new data arrives, you update the cache and notify observers.

TanStack Query implements this as its default behavior. The `staleTime` and `gcTime` options control the lifecycle:

```ts
useQuery({
  queryKey: ['product-catalog'],
  queryFn: fetchProductCatalog,
  staleTime: 2 * 60 * 1000,  // Data is "fresh" for 2 minutes — no background fetch
  gcTime: 10 * 60 * 1000,    // Cache entry lives for 10 minutes after last subscriber
});
```

When `staleTime` elapses, the next component mount or window focus triggers a background fetch. The cached data remains visible during the fetch — the user is never shown a blank screen.

For data that changes rarely (product categories, configuration), use a longer `staleTime`. For data that changes frequently (live inventory, prices), use a short or zero `staleTime`.

## React Query DevTools: Instruments for Network State

React Query DevTools provides a floating panel that shows every active query, its status (fresh, stale, fetching, error), the exact data in cache, and when the next background refetch is scheduled. For React Native, install the standalone devtools:

```bash
npm install @tanstack/react-query-devtools
```

Use it conditionally, only in development builds:

```ts
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
      {__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

The experience is equivalent to using Instruments' Network template — you can see every in-flight request, inspect cached payloads, and manually trigger refetches to test your loading states. Combined with Redux DevTools for client state, you have complete observability over both state categories.

## Normalization vs Denormalization

When the same entity appears in multiple queries — for example, a `User` object embedded in both a `Comment` and a `Post` — you face a normalization decision.

**Denormalized** (TanStack Query default): Each query holds a complete copy of the embedded objects. When the user's avatar changes, you must invalidate every query that embeds a `User`. This is simple to implement and the correct default for most apps.

**Normalized** (RTK Query or manual): Entities are stored once, in a flat lookup table keyed by ID. Every query holds only IDs, not full objects. When a `User` updates, every view that references that ID automatically reflects the change. This is equivalent to using a `Core Data` entity graph — relationships are references, not copies.

RTK Query has built-in normalization through its `createEntityAdapter`:

```ts
const usersAdapter = createEntityAdapter<User>();

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(),
  reducers: {
    upsertUser: usersAdapter.upsertOne,
    removeUser: usersAdapter.removeOne,
  },
});
```

Choose normalization when:
- Entities are updated frequently from multiple sources (WebSocket events, push notifications, polling)
- The same entity appears in many different views simultaneously
- Stale entity data visible in one screen while another screen shows fresh data is a product problem

Choose denormalization when:
- Entities are largely read-only or update infrequently
- Each view has a natural refresh point (pull-to-refresh, screen focus)
- The added complexity of normalization is not justified by the frequency of multi-source updates

For most production apps, a hybrid works well: TanStack Query for denormalized server state with strategic `invalidateQueries` calls, and a thin Zustand layer for client state. Introduce normalization only when the concrete problem of cross-view entity staleness appears.

## Choosing the Right Tool

| Scenario | Recommended Tool |
|---|---|
| Form field value | `useState` |
| Modal open/closed | `useState` or Zustand |
| Authenticated user identity | Zustand |
| Remote data with caching | TanStack Query |
| Complex audit trail requirements | Redux Toolkit |
| Fine-grained atom composition | Jotai |
| Shared entity graph | RTK Query with `createEntityAdapter` |

The most common production architecture for a mid-to-large React Native app is TanStack Query for server state plus Zustand for client state, with React Query DevTools wired in for development. This combination covers the vast majority of state management needs without the overhead of Redux, while keeping the two fundamentally different categories of state in tools purpose-built for each.
