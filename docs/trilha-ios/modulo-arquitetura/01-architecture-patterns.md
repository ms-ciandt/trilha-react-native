---
title: Architecture Patterns — iOS to React Native
---

# Architecture Patterns — iOS to React Native

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/arq_01_architecture-patterns.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/arq_01_architecture-patterns_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

As a Swift developer you already think in well-defined layers: ViewModels own presentation logic, Repositories abstract data sources, and dependency injection keeps modules testable. React Native respects every one of those instincts. The vocabulary is different, but the separation of concerns is identical.

---

## MVVM: ObservableObject becomes a custom hook

In SwiftUI, a ViewModel is a class that publishes state changes through `ObservableObject` and `@Published`. The View subscribes, re-renders when state changes, and never calls the network itself.

```swift
// Swift — ProductListViewModel.swift
final class ProductListViewModel: ObservableObject {
    @Published var products: [Product] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let repository: ProductRepository

    init(repository: ProductRepository = ProductRepositoryImpl()) {
        self.repository = repository
    }

    func load() async {
        isLoading = true
        do {
            products = try await repository.fetchAll()
        } catch {
            self.error = error
        }
        isLoading = false
    }
}
```

```tsx
// React Native — useProductListViewModel.ts
import { useState, useCallback } from 'react';
import { useProductRepository } from '../repositories/productRepository';
import type { Product } from '../types/product';

interface ProductListState {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
}

export function useProductListViewModel() {
  const repository = useProductRepository();
  const [state, setState] = useState<ProductListState>({
    products: [],
    isLoading: false,
    error: null,
  });

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const products = await repository.fetchAll();
      setState({ products, isLoading: false, error: null });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: error as Error }));
    }
  }, [repository]);

  return { ...state, load };
}
```

The View (SwiftUI) and the component (React Native) are both thin consumers:

```swift
// SwiftUI — ProductListView.swift
struct ProductListView: View {
    @StateObject private var vm = ProductListViewModel()

    var body: some View {
        List(vm.products) { product in ProductRow(product: product) }
            .task { await vm.load() }
    }
}
```

```tsx
// React Native — ProductListScreen.tsx
import { useEffect } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { useProductListViewModel } from './useProductListViewModel';
import { ProductRow } from './ProductRow';

export function ProductListScreen() {
  const { products, isLoading, load } = useProductListViewModel();

  useEffect(() => { load(); }, [load]);

  if (isLoading) return <ActivityIndicator />;
  return <FlatList data={products} renderItem={({ item }) => <ProductRow product={item} />} />;
}
```

The `use[Feature]ViewModel` naming convention makes the intent explicit and easy to grep for. Keep the hook free of JSX — it returns data and callbacks only.

---

## VIPER: folder structure by feature

VIPER separates Presenter, Interactor, Router, Entity, and View into distinct files per feature. React Native doesn't enforce this, but the same intent maps cleanly onto a feature-oriented folder structure.

```
// VIPER folder layout (iOS)
Features/
  ProductList/
    ProductListView.swift
    ProductListPresenter.swift
    ProductListInteractor.swift
    ProductListRouter.swift
    ProductListEntity.swift

// Feature-sliced layout (React Native)
src/
  features/
    product-list/
      ProductListScreen.tsx       ← View + wiring
      useProductListViewModel.ts  ← Presenter logic
      useProductListInteractor.ts ← use case / business logic
      productListRepository.ts    ← data access (Interactor dependency)
      types.ts                    ← Entity types
      index.ts                    ← feature's public API
```

The `index.ts` barrel file is the module boundary. Nothing outside `product-list/` imports directly from the internal files — they import from `features/product-list`. This is the same encapsulation Swift modules give you for free with `internal` access control.

```ts
// src/features/product-list/index.ts
export { ProductListScreen } from './ProductListScreen';
export type { Product } from './types';
```

---

## Repository pattern: URLSession + Codable becomes a typed API client

In iOS, you typically write a `ProductRepository` protocol and a concrete `ProductRepositoryImpl` backed by `URLSession`.

```swift
// Swift
protocol ProductRepository {
    func fetchAll() async throws -> [Product]
}

final class ProductRepositoryImpl: ProductRepository {
    func fetchAll() async throws -> [Product] {
        let url = URL(string: "https://api.example.com/products")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([Product].self, from: data)
    }
}
```

In React Native, the equivalent is a typed API client — a simple function or class that wraps `fetch` (or Axios) and returns typed data:

```ts
// src/services/apiClient.ts
const BASE_URL = 'https://api.example.com';

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export const apiClient = { get };
```

```ts
// src/features/product-list/productListRepository.ts
import { apiClient } from '../../services/apiClient';
import type { Product } from './types';

export interface ProductRepository {
  fetchAll(): Promise<Product[]>;
}

export function createProductRepository(): ProductRepository {
  return {
    fetchAll: () => apiClient.get<Product[]>('/products'),
  };
}
```

TypeScript plays the role of `Codable`: the generic `get<T>` call forces the caller to declare the expected shape of the data.

---

## Dependency injection: @Environment and constructor injection become Context + custom hooks

Swift's `@EnvironmentObject` injects a dependency anywhere in the view hierarchy without prop drilling. React Context does the same job.

```swift
// Swift — injecting a repository via environment
struct ProductListView: View {
    @EnvironmentObject var repository: ProductRepositoryImpl
    // ...
}

// At the root
ProductListView().environmentObject(ProductRepositoryImpl())
```

```tsx
// React Native — Context as a DI container
// src/context/RepositoryContext.tsx
import { createContext, useContext } from 'react';
import { createProductRepository, ProductRepository } from '../features/product-list/productListRepository';

interface Repositories {
  products: ProductRepository;
}

const RepositoryContext = createContext<Repositories | null>(null);

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  return (
    <RepositoryContext.Provider value={{ products: createProductRepository() }}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('useRepositories must be used inside RepositoryProvider');
  return ctx;
}
```

```tsx
// src/features/product-list/useProductListViewModel.ts
import { useRepositories } from '../../context/RepositoryContext';

export function useProductListViewModel() {
  const { products: repository } = useRepositories();
  // ... same as before
}
```

For tests, swap in a mock provider:

```tsx
// In tests
<RepositoryContext.Provider value={{ products: mockProductRepository }}>
  <ProductListScreen />
</RepositoryContext.Provider>
```

This is constructor injection: the test decides which implementation gets injected, exactly like you'd pass a mock repository in a Swift unit test.

---

## ObservableObject + @Published becomes a Zustand store

When multiple screens share state that must outlive a component's lifetime, `@Published` on a singleton `ObservableObject` is the Swift pattern. Zustand is the direct equivalent.

```swift
// Swift — shared cart store
final class CartStore: ObservableObject {
    @Published var items: [CartItem] = []

    func add(_ item: CartItem) { items.append(item) }
    func remove(id: UUID) { items.removeAll { $0.id == id } }
}
```

```ts
// src/stores/cartStore.ts
import { create } from 'zustand';
import type { CartItem } from '../types/cart';

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  add: (item) => set((state) => ({ items: [...state.items, item] })),
  remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
}));
```

Any component calls `useCartStore` and gets reactive updates — no need to wrap it in a provider. For slices (multiple `ObservableObject` stores combined), Zustand supports `combine` or separate stores imported side by side.

---

## Combine pipeline becomes TanStack Query + Zustand

In iOS, a common pattern is a Combine pipeline that fetches data from the network, maps the response, and publishes it to a `@Published` property. The React Native equivalent splits that responsibility cleanly:

- **TanStack Query** manages server state: fetching, caching, background refetch, loading/error states.
- **Zustand** manages client state: user selections, UI flags, cart contents.

```swift
// Swift — Combine pipeline
cancellable = URLSession.shared.dataTaskPublisher(for: productsURL)
    .map(\.data)
    .decode(type: [Product].self, decoder: JSONDecoder())
    .receive(on: DispatchQueue.main)
    .sink(receiveCompletion: { _ in }, receiveValue: { [weak self] in self?.products = $0 })
```

```ts
// React Native — TanStack Query
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import type { Product } from './types';

export function useProductsQuery() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.get<Product[]>('/products'),
    staleTime: 60_000,
  });
}
```

```tsx
// ProductListScreen.tsx
export function ProductListScreen() {
  const { data: products, isLoading, error } = useProductsQuery();
  const { add } = useCartStore();

  if (isLoading) return <ActivityIndicator />;
  if (error) return <ErrorView error={error} />;
  return <FlatList data={products} renderItem={({ item }) => <ProductRow item={item} onAdd={add} />} />;
}
```

TanStack Query's `queryKey` is the cache key — equivalent to the publisher's identity in Combine. Background refetch on window focus mirrors `@Published` updating automatically whenever your Combine subject emits.

---

## Keeping components thin

In SwiftUI the rule is: Views should not hold business logic. The same rule applies to React Native components. A component should only:

1. Call a hook (ViewModel, Query, or Store selector) to get state.
2. Render that state.
3. Forward user interactions back to the hook as callbacks.

```tsx
// Thin component — correct
export function ProductRow({ item, onAdd }: { item: Product; onAdd: (item: Product) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>${item.price.toFixed(2)}</Text>
      <Pressable onPress={() => onAdd(item)}>
        <Text>Add to cart</Text>
      </Pressable>
    </View>
  );
}
```

If you catch yourself writing `fetch`, `async/await`, or business conditionals inside the component body, move that logic into a hook. The component isn't the right place for it — just like a SwiftUI View isn't the right place for network calls.

---

## Folder structure: feature-first vs layer-first

**Layer-first** mirrors classic Clean Architecture and feels natural coming from VIPER:

```
src/
  components/
  hooks/
  repositories/
  screens/
  services/
  stores/
  types/
```

It works fine in small codebases, but forces you to jump across many folders to understand a single feature.

**Feature-first** groups everything a feature needs together:

```
src/
  features/
    product-list/
    cart/
    user-profile/
  shared/
    components/
    hooks/
    services/
```

Feature-first scales better. Remove a feature, delete a folder. Onboard a developer onto `cart/`, they read one folder. The `shared/` folder plays the role of a Swift framework target — utilities consumed by multiple features.

For most React Native apps, feature-first is the recommended starting point. Move to a monorepo with separate packages (Yarn Workspaces) once features need to be versioned independently or shared across multiple apps.

---

## Summary: the mapping at a glance

| Swift / iOS concept | React Native equivalent |
|---|---|
| `ObservableObject` + `@Published` | Zustand store |
| `@StateObject` / `@ObservedObject` | `useCartStore()` (Zustand hook) |
| `@EnvironmentObject` | React Context + `useContext` |
| Constructor injection | Context Provider with concrete implementation |
| `URLSession` + `Codable` | `fetch` / Axios + TypeScript generics |
| Combine pipeline | TanStack Query (`useQuery`, `useMutation`) |
| MVVM ViewModel class | Custom hook (`use[Feature]ViewModel`) |
| VIPER module boundary | Feature folder with barrel `index.ts` |
| Swift's `internal` access control | Barrel export (`index.ts`) as module boundary |
| Protocol for testability | TypeScript interface + Context swap in tests |

The architectural philosophy doesn't change crossing from Swift to TypeScript. Keep data-fetching out of components, keep components declarative, keep business logic in a named layer that's easy to test in isolation.
