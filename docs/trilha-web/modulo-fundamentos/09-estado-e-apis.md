---
id: estado-e-apis-web
title: "Global State & APIs"
sidebar_label: "Global State & APIs"
sidebar_position: 9
---

# Global State & APIs

---

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_web/fund_09_estado_apis.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## What changes from web to mobile

The state logic you already know from React works in React Native — `useState`, `useReducer`, Context, global stores are the same. What changes is the **environment** in which that state lives:

| Web concept | Mobile reality | Why it changes |
|---|---|---|
| `localStorage` | Device native storage | There is no `window` or DOM Storage |
| `sessionStorage` | In-memory state (no persist) | No concept of tab session |
| Browser HTTP cache | Explicit data layer cache | The browser does not auto-cache for you |
| Always stable connection | Unstable network, frequent offline | User enters the subway, loses signal |
| `visibilitychange` (window focus) | Screen focus (`useFocusEffect`) | The "I came back to this screen" event is different |
| `window.navigator.onLine` | Native connectivity API | No `window`, different API |

---

## Client state vs Server state

This is the most important distinction — and it applies to both web and mobile, but mobile makes it more urgent because of the unstable network:

| | Client state | Server state |
|---|---|---|
| **What it is** | State that lives in the app's memory | Data that comes from an API |
| **Source of truth** | The app itself | The server |
| **Examples** | theme, cart, open modal | product list, profile, orders |
| **Main problem** | syncing between screens | cache, refetch, stale data, offline |

On the web you probably already make this separation. On mobile, it is even more important because the cost of an unnecessary fetch is higher (battery, mobile data, latency).

---

## Local state: no changes

`useState` and `useReducer` work identically — no adaptation needed.

```tsx
const [isLoading, setIsLoading] = useState(false);
const [form, setForm] = useReducer(formReducer, initialFormState);
```

---

## Context API: same rules, same limitations

The Context API works the same as on the web. The limitations are also the same — Context is not suitable for state that changes frequently, because any change re-renders all consumers.

On mobile use Context for the same things as on the web: theme, i18n, authentication session. For data lists or UI state that changes frequently, prefer a global store or the data layer.


```tsx
// The pattern is identical to the web
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, token: null });
  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}
```


---

## Global state with Zustand

For client state that needs to be shared between screens without prop drilling, Zustand is the most straightforward option — the same you would use on the web. The API is identical: no Provider, no boilerplate.

```bash
npm install zustand
```

```tsx
import { create } from 'zustand';

type CartStore = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  clearCart: () => set({ items: [] }),
}));
```

```tsx
// In any component, on any screen — no Provider needed
const { items, addItem } = useCartStore();
```

To persist the store between app restarts, use the `persist` middleware with MMKV as storage:

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV();

const mmkvStorage = {
  getItem: (key: string) => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string) => mmkv.set(key, value),
  removeItem: (key: string) => mmkv.delete(key),
};

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'cart', storage: createJSONStorage(() => mmkvStorage) }
  )
);
```

---

## Local persistence: no localStorage

In the browser, `localStorage` is a DOM API — it does not exist on mobile. The equivalent is a native device storage, accessed through a JavaScript library.

The concept is the same: storing key-value pairs between sessions. The most important difference is that the recommended native storage (**MMKV**) has a **synchronous** API — no `await`, no callbacks:

```tsx
// Web
localStorage.setItem('token', 'abc123');
const token = localStorage.getItem('token');

// React Native (MMKV)
storage.set('token', 'abc123');
const token = storage.getString('token'); // synchronous — no await
```

This greatly simplifies code that needs to read data at initialization time or inside non-async functions.

The global store (Zustand, Redux) can use this storage as a persistence backend, making state survive app restarts — the equivalent of `redux-persist` on the web, but with native storage.

> **AsyncStorage vs MMKV:** you will encounter `@react-native-async-storage/async-storage` in many tutorials and community libraries — it is the older default option, with an asynchronous API (Promise-based). MMKV is faster and synchronous, making it the recommended choice for new projects. When integrating third-party libraries (e.g.: some Apollo clients, authentication libraries), check which storage they expect to receive.

---

## Data fetching: screen focus replaces window focus

On the web, `refetchOnWindowFocus` from TanStack Query / React Query revalidates data when the user returns to the tab. On mobile, there are no tabs — there are screens.

The equivalent concept is `useFocusEffect` from React Navigation: it runs when the screen receives focus, including when the user navigates back to it.

```tsx
// Web — automatic refetch when the window is focused (default setting)
const { data } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

// Mobile — refetch when the screen is focused (replacement for window focus behavior)
const query = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

useFocusEffect(
  useCallback(() => { query.refetch(); }, [])
);
```

It is also necessary to connect React Native's `AppState` to the data layer's focus manager, so that queries are revalidated when the app comes back to the foreground (equivalent to the browser's `visibilitychange`):

```tsx
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});
```

---

## Mutations: writing data and invalidating cache

`useQuery` handles reads; `useMutation` handles writes (POST, PATCH, DELETE). The pattern is the same as on the web — the relevant difference on mobile is that after a successful mutation, you invalidate the corresponding query to force a refetch and keep the screen in sync.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newProduct: NewProduct) =>
      fetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(newProduct),
      }).then((r) => r.json()),

    onSuccess: () => {
      // Invalidates the list cache — next screen focus fetches updated data
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

```tsx
// In the component
const { mutate, isPending } = useCreateProduct();

<Button
  title={isPending ? 'Saving...' : 'Save'}
  onPress={() => mutate({ name: 'Sneakers', price: 299 })}
/>
```

The `mutate → onSuccess → invalidateQueries` flow is the most common pattern in production: it ensures the list always reflects the server state after any write, without local state acrobatics.

---

## Offline-first: the biggest gap with the web

On the web, you assume a connection. On mobile, you assume the connection will drop — and the app needs to keep working.

The offline-first pattern inverts the logic:
1. Screen loads data from the **local cache** immediately — without waiting for the network
2. Fetch happens in the background to update the cache
3. If offline, the cache is displayed without error

```tsx
const { data, isFetching } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 5 * 60 * 1000,        // fresh cache for 5 min
  gcTime: 24 * 60 * 60 * 1000,     // keep in cache for 24h
});
// data comes from cache while isFetching === true in background
```

To pause fetches when the device is offline:

```tsx
// The data layer respects connectivity automatically
NetInfo.addEventListener(state => {
  onlineManager.setOnline(state.isConnected ?? true);
});
```

---

## Recommended architecture

The same client/server state separation that works on the web:

```
src/
├── stores/     # Client state — auth, theme, UI preferences
├── hooks/      # Server state — queries and mutations per domain
├── services/   # Pure fetch functions (no React logic)
└── lib/
    └── storage.ts  # Native storage instance
```

---

## Practical exercise

1. List the data from your last web project: which are **client state** and which are **server state**? Was that separation already clear in the code?
2. Identify a case where `refetchOnWindowFocus` was important in the project. How would you replicate that behavior on mobile with `useFocusEffect`?
3. Think about how the app should behave when the user loses connection in the middle of a listing. What should the user see? How does the cache solve this?

---

## Study Materials

| Resource | Type | Link |
|---------|------|------|
| Zustand + TanStack Query: RN Guide 2026 | Article | [React Native Relay](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query) |
| State Management in React 2026 | Article | [Zignuts](https://www.zignuts.com/blog/react-state-management-2025) |
| How to Handle State Management in React Native | Article | [OneUptime](https://oneuptime.com/blog/post/2026-02-02-react-native-state-management/view) |
| Offline-First Architecture in React Native | Article | [OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-offline-architecture/view) |
| How to Persist State with AsyncStorage and MMKV | Article | [OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view) |
| TanStack Query for React Native | Official Docs | [tanstack.com](https://tanstack.com/query/v5/docs/framework/react/react-native) |
| MMKV vs AsyncStorage in React Native | Article | [reactnativeexpert.com](https://reactnativeexpert.com/blog/mmkv-vs-asyncstorage-in-react-native/) |
| react-native-mmkv | GitHub | [mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) |

---