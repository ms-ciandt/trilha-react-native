---
title: Architecture Patterns — iOS to React Native
---

# Architecture Patterns — iOS to React Native

Como desenvolvedor Swift, você já pensa em camadas bem definidas: ViewModels detêm a lógica de apresentação, Repositories abstraem as fontes de dados, e injeção de dependência mantém os módulos testáveis. O React Native respeita todos esses instintos. O vocabulário é diferente, mas a separação de responsabilidades é idêntica.

---

## MVVM: ObservableObject vira um custom hook

No SwiftUI, um ViewModel é uma classe que publica mudanças de estado por meio de `ObservableObject` e `@Published`. A View assina, re-renderiza quando o estado muda, e nunca chama a rede diretamente.

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

A View (SwiftUI) e o componente (React Native) são ambos consumidores enxutos:

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

A convenção de nomenclatura `use[Feature]ViewModel` torna a intenção explícita e é fácil de buscar com grep. Mantenha o hook livre de JSX — ele retorna apenas dados e callbacks.

---

## VIPER: estrutura de pastas por feature

O VIPER separa Presenter, Interactor, Router, Entity e View em arquivos distintos por feature. O React Native não impõe isso, mas a mesma intenção se mapeia de forma limpa para uma estrutura de pastas orientada a features.

```
// Layout de pastas VIPER (iOS)
Features/
  ProductList/
    ProductListView.swift
    ProductListPresenter.swift
    ProductListInteractor.swift
    ProductListRouter.swift
    ProductListEntity.swift

// Layout feature-sliced (React Native)
src/
  features/
    product-list/
      ProductListScreen.tsx       ← View + wiring
      useProductListViewModel.ts  ← lógica de Presenter
      useProductListInteractor.ts ← caso de uso / lógica de negócio
      productListRepository.ts    ← acesso a dados (dependência do Interactor)
      types.ts                    ← tipos de Entity
      index.ts                    ← API pública da feature
```

O arquivo barrel `index.ts` é a fronteira do módulo. Nada fora de `product-list/` importa diretamente dos arquivos internos — importam de `features/product-list`. Esse é o mesmo encapsulamento que os módulos Swift fornecem gratuitamente com o controle de acesso `internal`.

```ts
// src/features/product-list/index.ts
export { ProductListScreen } from './ProductListScreen';
export type { Product } from './types';
```

---

## Padrão Repository: URLSession + Codable vira um cliente de API tipado

No iOS, você tipicamente escreve um protocolo `ProductRepository` e uma implementação concreta `ProductRepositoryImpl` apoiada por `URLSession`.

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

No React Native, o equivalente é um cliente de API tipado — uma função ou classe simples que envolve `fetch` (ou Axios) e retorna dados tipados:

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

O TypeScript cumpre o papel do `Codable`: a chamada genérica `get<T>` impõe que quem chama declare a forma esperada dos dados.

---

## Injeção de dependência: @Environment e injeção via construtor viram Context + custom hooks

O `@EnvironmentObject` do Swift injeta uma dependência em qualquer lugar da hierarquia de views sem prop drilling. O React Context faz o mesmo trabalho.

```swift
// Swift — injetando um repository via environment
struct ProductListView: View {
    @EnvironmentObject var repository: ProductRepositoryImpl
    // ...
}

// Na raiz
ProductListView().environmentObject(ProductRepositoryImpl())
```

```tsx
// React Native — Context como container de DI
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
  // ... mesmo de antes
}
```

Para testes, substitua o provider por um mock:

```tsx
// Em testes
<RepositoryContext.Provider value={{ products: mockProductRepository }}>
  <ProductListScreen />
</RepositoryContext.Provider>
```

Isso é injeção via construtor: o teste decide qual implementação é injetada, exatamente como você passaria um repository mock em um teste unitário Swift.

---

## ObservableObject + @Published vira uma store Zustand

Quando múltiplas telas compartilham estado que deve persistir além do tempo de vida do componente, `@Published` em um `ObservableObject` singleton é o padrão Swift. O Zustand é o equivalente direto.

```swift
// Swift — store de carrinho compartilhada
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

Qualquer componente chama `useCartStore` e recebe atualizações reativas — sem necessidade de envolver com um provider. Para slices (múltiplas stores `ObservableObject` combinadas), o Zustand suporta `combine` ou stores separadas importadas lado a lado.

---

## Pipeline Combine vira TanStack Query + Zustand

No iOS, um padrão comum é um pipeline Combine que busca dados da rede, mapeia a resposta e publica em uma propriedade `@Published`. O equivalente em React Native divide essa responsabilidade de forma clara:

- **TanStack Query** gerencia o estado do servidor: busca, cache, refetch em segundo plano, estados de loading/error.
- **Zustand** gerencia o estado do cliente: seleções do usuário, flags de UI, conteúdo do carrinho.

```swift
// Swift — pipeline Combine
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

O `queryKey` do TanStack Query é a chave de cache — equivalente à identidade do publisher no Combine. O refetch em segundo plano ao retornar ao foco da janela espelha o `@Published` sendo atualizado automaticamente quando seu subject Combine emite.

---

## Mantendo os componentes enxutos

No SwiftUI a regra é: Views não devem ter lógica de negócio. A mesma regra se aplica a componentes React Native. Um componente deve apenas:

1. Chamar um hook (ViewModel, Query ou seletor de Store) para obter o estado.
2. Renderizar esse estado.
3. Repassar as interações do usuário de volta ao hook como callbacks.

```tsx
// Componente enxuto — correto
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

Se você se pegar escrevendo `fetch`, `async/await` ou condicionais de negócio dentro do corpo do componente, mova essa lógica para um hook. O componente não é o lugar certo para isso — assim como uma View SwiftUI não é o lugar certo para chamadas de rede.

---

## Estrutura de pastas: feature-first vs layer-first

**Layer-first** espelha a Clean Architecture clássica e parece natural para quem vem do VIPER:

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

Funciona bem em codebases pequenas, mas obriga você a pular por muitas pastas para entender uma única feature.

**Feature-first** coloca junto tudo o que uma feature precisa:

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

Feature-first escala melhor. Quando você remove uma feature, apaga uma pasta. Quando você integra um desenvolvedor a `cart/`, ele lê uma pasta. A pasta `shared/` cumpre o papel de um target de framework Swift — utilitários consumidos por múltiplas features.

Para a maioria dos apps React Native, feature-first é o ponto de partida recomendado. Migre para um monorepo com pacotes separados (Yarn Workspaces) quando as features precisarem ser versionadas de forma independente ou compartilhadas entre múltiplos apps.

---

## Resumo: o mapeamento de uma vez

| Conceito Swift / iOS | Equivalente React Native |
|---|---|
| `ObservableObject` + `@Published` | Store Zustand |
| `@StateObject` / `@ObservedObject` | `useCartStore()` (hook Zustand) |
| `@EnvironmentObject` | React Context + `useContext` |
| Injeção via construtor | Context Provider com implementacao concreta |
| `URLSession` + `Codable` | `fetch` / Axios + generics TypeScript |
| Pipeline Combine | TanStack Query (`useQuery`, `useMutation`) |
| Classe ViewModel MVVM | Custom hook (`use[Feature]ViewModel`) |
| Fronteira de modulo VIPER | Pasta de feature com barrel `index.ts` |
| Controle de acesso `internal` do Swift | Barrel export (`index.ts`) como fronteira de modulo |
| Protocol para testabilidade | Interface TypeScript + troca de Context nos testes |

A filosofia arquitetural nao muda ao cruzar de Swift para TypeScript. Mantenha o data-fetching fora dos componentes, mantenha os componentes declarativos, mantenha a logica de negocio em uma camada nomeada que seja facil de testar em isolamento.
