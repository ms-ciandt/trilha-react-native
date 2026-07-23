---
title: "Architecture Patterns"
sidebar_label: "Architecture Patterns"
sidebar_position: 1
---

## Video Overview

> Video for this topic coming soon.

## MVVM → React Native Patterns

You know MVVM: the ViewModel holds UI state and business logic, the View observes it, the Repository abstracts data sources. React Native doesn't have a prescribed architecture, but the same separation of concerns applies with different primitives.

| Android MVVM / Clean | React Native equivalent |
|---------------------|------------------------|
| `ViewModel` | Zustand store slice or custom hook |
| `StateFlow<UiState>` | Zustand state + selector |
| `LiveData` | `useState` / Zustand reactive state |
| `Repository` | TanStack Query `queryFn` + API client |
| `RemoteDataSource` | API client (axios instance) |
| `LocalDataSource` | MMKV / expo-sqlite layer |
| `UseCase` | Plain async function / custom hook |
| `Hilt Module` | Not needed — Zustand is global, Context for DI |
| `sealed class UiState` | TypeScript discriminated union |
| `@Composable Screen` | Screen component |
| `@Composable Component` | Reusable component |

---

## Layered Architecture

```
src/
  api/           ← Remote data sources (axios instances, fetch wrappers)
  store/         ← Global client state (Zustand stores)
  hooks/         ← Custom hooks — business logic + data fetching
  components/    ← Reusable UI components (no data fetching)
  screens/       ← Screen components (compose hooks + components)
  navigation/    ← Navigator definitions, route types
  utils/         ← Pure helper functions
  specs/         ← TurboModule TypeScript specs
```

---

## The Data Flow

```
Screen component
  │
  ├── useProductList() ← custom hook (ViewModel equivalent)
  │     ├── TanStack Query (server state)
  │     └── Zustand (client state)
  │
  └── renders ProductCard components (pure, no data fetching)
```

```tsx
// hooks/useProductList.ts — the "ViewModel"
export function useProductList(category: string) {
  // Server state — TanStack Query
  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', category],
    queryFn: () => productApi.getByCategory(category),
  });

  // Client state — Zustand
  const { addToCart } = useCartStore();
  const favourites = useFavouritesStore(s => s.ids);

  // Derived state — computed from both
  const enriched = useMemo(
    () => products?.map(p => ({
      ...p,
      isFavourite: favourites.includes(p.id),
    })),
    [products, favourites]
  );

  return { products: enriched, isLoading, isError, refetch, addToCart };
}

// screens/ProductListScreen.tsx — the "View"
function ProductListScreen() {
  const { category } = useRoute<RouteProp<...>>().params;
  const { products, isLoading, isError, refetch, addToCart } = useProductList(category);

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  return (
    <FlatList
      data={products}
      keyExtractor={p => p.id}
      renderItem={({ item }) => (
        <ProductCard product={item} onAddToCart={addToCart} />
      )}
    />
  );
}
```

---

## Feature-Based Folder Structure (Scalable)

For larger apps, organise by feature rather than type:

```
src/
  features/
    auth/
      api/        authApi.ts
      store/      authStore.ts
      hooks/      useLogin.ts, useAuth.ts
      screens/    LoginScreen.tsx, RegisterScreen.tsx
      components/ LoginForm.tsx, SocialAuthButtons.tsx
      index.ts    ← public API — only export what other features need
    cart/
      api/
      store/      cartStore.ts
      hooks/      useCart.ts
      screens/
      components/
      index.ts
    products/
      ...
  shared/
    components/   Button, Input, Card — truly reusable across features
    hooks/        useDebounce, useNetworkStatus
    utils/        formatPrice, validateEmail
    navigation/
```

The `index.ts` barrel file controls what leaks between features:

```tsx
// features/cart/index.ts
export { useCartStore } from './store/cartStore';
export { CartScreen } from './screens/CartScreen';
// Do NOT export internal hooks or API clients
```

---

## Error Boundaries — Android's Try/Catch for UI

```tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface State { hasError: boolean; error?: Error }

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    crashReporter.recordError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Something went wrong.</Text>
          <Pressable onPress={() => this.setState({ hasError: false })}>
            <Text>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

// Wrap each screen
function App() {
  return (
    <NavigationContainer>
      <ErrorBoundary>
        <MainNavigator />
      </ErrorBoundary>
    </NavigationContainer>
  );
}
```

---

## Study Materials

- [Zustand — Best Practices](https://zustand.docs.pmnd.rs/guides/practice-with-no-store-actions)
- [TanStack Query — Architecture](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Bulletproof React — Architecture](https://github.com/alan2207/bulletproof-react)

---

## What's Next

Architecture patterns clear. Next: monorepo setup with Turborepo — sharing code between the RN app and a web app or backend.

➡ [Monorepo with Turborepo](./02-monorepo)
