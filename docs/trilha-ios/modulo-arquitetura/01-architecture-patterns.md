---
title: Architecture Patterns — iOS to React Native
---

# Architecture Patterns — iOS to React Native

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

The naming convention `use[Feature]ViewModel` makes the intent explicit and is easy to grep. Keep the hook free of JSX — it returns data and callbacks only.

---

The file is written to `/docs/trilha-ios/modulo-arquitetura/01-architecture-patterns.md` in the worktree. It covers all required topics across 323 lines: MVVM to custom hooks (`useProductListViewModel` pattern), VIPER to feature-sliced structure with barrel exports, Repository pattern mapping URLSession+Codable to a typed `apiClient` with TypeScript generics, DI via `@EnvironmentObject` to React Context + swappable providers for testing, `ObservableObject`+`@Published` to Zustand store, Combine pipeline to TanStack Query + Zustand split, the thin-component philosophy mirroring SwiftUI Views, and a feature-first vs layer-first folder structure comparison with a summary mapping table.
