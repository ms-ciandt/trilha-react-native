---
title: "State Management at Scale"
sidebar_label: "State at Scale"
sidebar_position: 3
---

## Video Overview

> Video for this topic coming soon.

## Two State Categories — Always

Before choosing a library, classify your state:

| Category | Definition | Tool |
|----------|-----------|------|
| **Server state** | Data that lives on a server — fetched, cached, synced | TanStack Query |
| **Client state** | Data that lives only in the app — preferences, cart, auth session | Zustand |

Mixing these into a single store is the most common architecture mistake in React Native — it leads to manual cache invalidation, stale data bugs, and loading state hell.

---

## Zustand at Scale: Slices Pattern

For large apps, split Zustand into domain slices — equivalent to separate `ViewModel` classes per feature:

```typescript
// store/slices/authSlice.ts
import type { StateCreator } from 'zustand';

export interface AuthSlice {
  user: User | null;
  token: string | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const createAuthSlice: StateCreator<
  AuthSlice & CartSlice, // combined store type
  [],
  [],
  AuthSlice
> = (set, get) => ({
  user: null,
  token: null,

  login: async (credentials) => {
    const { user, token } = await authApi.login(credentials);
    set({ user, token });
    // Persist token
    mmkv.set('auth.token', token);
  },

  logout: () => {
    set({ user: null, token: null });
    mmkv.delete('auth.token');
    // Clear cart on logout
    get().clearCart();
  },
});
```

```typescript
// store/slices/cartSlice.ts
export interface CartSlice {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
}

export const createCartSlice: StateCreator<AuthSlice & CartSlice, [], [], CartSlice> =
  (set, get) => ({
    items: [],
    total: 0,

    addItem: (item) => {
      set(state => {
        const updated = addItemToCart(state.items, item);
        return { items: updated, total: calculateTotal(updated) };
      });
    },

    removeItem: (id) => {
      set(state => {
        const updated = state.items.filter(i => i.id !== id);
        return { items: updated, total: calculateTotal(updated) };
      });
    },

    clearCart: () => set({ items: [], total: 0 }),
  });
```

```typescript
// store/index.ts — combine slices
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create<AuthSlice & CartSlice>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createCartSlice(...args),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ token: state.token, items: state.items }),
    }
  )
);

// Feature-scoped selectors
export const useAuth = () => useStore(s => ({ user: s.user, login: s.login, logout: s.logout }));
export const useCart = () => useStore(s => ({ items: s.items, total: s.total, addItem: s.addItem }));
```

---

## TanStack Query at Scale

### Query Key Factory

Avoid string typos in query keys with a typed factory:

```typescript
// queryKeys.ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    byId: (id: string) => ['users', id] as const,
    byRole: (role: string) => ['users', { role }] as const,
  },
  products: {
    all: ['products'] as const,
    byCategory: (cat: string) => ['products', cat] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
} as const;

// Usage — type-safe, no typos
useQuery({ queryKey: queryKeys.users.byId(userId), queryFn: ... });
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
```

### Prefetching — like Android's WorkManager prefetch

```typescript
// Prefetch product detail when hovering/near a list item
async function prefetchProduct(id: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productApi.getById(id),
    staleTime: 1000 * 60 * 5, // consider fresh for 5 min
  });
}

function ProductCard({ product }: { product: Product }) {
  const prefetch = useCallback(() => prefetchProduct(product.id), [product.id]);

  return (
    <Pressable
      onPressIn={prefetch}  // start prefetching when finger touches
      onPress={() => navigation.navigate('ProductDetail', { id: product.id })}
    >
      <Text>{product.name}</Text>
    </Pressable>
  );
}
```

### Optimistic Updates — instant UI response

```typescript
function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productApi.delete(id),

    onMutate: async (deletedId) => {
      // Cancel in-flight refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.products.all });

      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.products.all);

      // Optimistically remove from cache immediately
      queryClient.setQueryData(queryKeys.products.all, (old: Product[] = []) =>
        old.filter(p => p.id !== deletedId)
      );

      return { previous }; // context for rollback
    },

    onError: (err, _, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.products.all, context?.previous);
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
```

---

## Study Materials

- [Zustand — Slices Pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern)
- [TanStack Query — Query Key Factories](https://tanstack.com/query/latest/docs/framework/react/community/lukemorales-query-key-factory)
- [TanStack Query — Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)

---

## What's Next

State at scale. Next: error handling and monitoring — Sentry, crash reporting, and structured error patterns.

➡ [Error Handling & Monitoring](./04-error-handling-monitoring)
