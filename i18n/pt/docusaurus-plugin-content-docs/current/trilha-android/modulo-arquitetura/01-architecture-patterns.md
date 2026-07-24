---
title: "Padrões de Arquitetura"
sidebar_label: "Padrões de Arquitetura"
sidebar_position: 1
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## MVVM → Padrões React Native

| Android MVVM / Clean | React Native equivalente |
|---------------------|-------------------------|
| `ViewModel` | Slice Zustand ou hook customizado |
| `StateFlow<UiState>` | Estado Zustand + selector |
| `LiveData` | `useState` / estado reativo Zustand |
| `Repository` | `queryFn` do TanStack Query + cliente API |
| `RemoteDataSource` | Cliente API (instância axios) |
| `LocalDataSource` | Camada MMKV / expo-sqlite |
| `UseCase` | Função async pura / hook customizado |
| `Hilt Module` | Não necessário — Zustand é global |
| `sealed class UiState` | Union discriminada TypeScript |

---

## Arquitetura em Camadas

```
src/
  api/           ← Fontes de dados remotas (instâncias axios)
  store/         ← Estado global do cliente (stores Zustand)
  hooks/         ← Hooks customizados — lógica de negócio + busca de dados
  components/    ← Componentes de UI reutilizáveis (sem busca de dados)
  screens/       ← Componentes de tela (compõem hooks + componentes)
  navigation/    ← Definições de navegadores, tipos de rotas
  utils/         ← Funções auxiliares puras
  specs/         ← Specs TypeScript para TurboModules
```

---

## O Fluxo de Dados

```tsx
// hooks/useProductList.ts — o "ViewModel"
export function useProductList(category: string) {
  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', category],
    queryFn: () => productApi.getByCategory(category),
  });

  const { addToCart } = useCartStore();
  const favourites = useFavouritesStore(s => s.ids);

  const enriched = useMemo(
    () => products?.map(p => ({ ...p, isFavourite: favourites.includes(p.id) })),
    [products, favourites]
  );

  return { products: enriched, isLoading, isError, refetch, addToCart };
}

// screens/ProductListScreen.tsx — a "View"
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

## Estrutura por Feature (Escalável)

```
src/
  features/
    auth/
      api/        authApi.ts
      store/      authStore.ts
      hooks/      useLogin.ts
      screens/    LoginScreen.tsx
      components/ LoginForm.tsx
      index.ts    ← API pública — exporte apenas o necessário
    cart/
      ...
      index.ts
  shared/
    components/   Button, Input, Card
    hooks/        useDebounce, useNetworkStatus
    utils/        formatPrice, validateEmail
    navigation/
```

---

## Error Boundaries

```tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    crashReporter.recordError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Algo deu errado.</Text>
          <Pressable onPress={() => this.setState({ hasError: false })}>
            <Text>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
```

---

## Materiais de Estudo

- [Zustand — Boas Práticas](https://zustand.docs.pmnd.rs/guides/practice-with-no-store-actions)
- [Bulletproof React — Arquitetura](https://github.com/alan2207/bulletproof-react)

---

## Próximo Passo

➡ [Monorepo com Turborepo](./02-monorepo)
