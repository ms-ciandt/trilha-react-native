---
title: Memo e Otimização de Renders
---

# Memo e Otimização de Renders

React renderiza um componente sempre que seu estado ou props mudam. Na maior parte das vezes isso é rápido o suficiente para não importar. Mas em listas longas, animações ou telas com muitos componentes aninhados, renderizações desnecessárias se acumulam e o frame rate cai visivelmente.

Este módulo traduz os padrões de otimização que você já usa em SwiftUI e Swift para o equivalente em React — e, mais importante, ensina quando não aplicar nenhum deles.

---

## SwiftUI Equatable Body e React.memo

Em SwiftUI, quando uma view conforma ao protocolo `Equatable`, o framework pode pular a re-avaliação do `body` se os valores que ela depende não mudaram:

```swift
struct PriceCard: View, Equatable {
    let price: Double
    let currency: String

    static func == (lhs: PriceCard, rhs: PriceCard) -> Bool {
        lhs.price == rhs.price && lhs.currency == rhs.currency
    }

    var body: some View {
        Text("\(currency) \(price, specifier: "%.2f")")
    }
}
```

O compilador pode invocar `.equatableView()` automaticamente quando detecta que as props são `Equatable`, evitando recálculo do `body` sem necessidade.

React tem o equivalente exato: `React.memo`. Ele envolve um componente funcional e só permite re-renderização quando as props mudaram — comparação rasa (shallow) por padrão, exatamente como o `==` padrão do SwiftUI para structs.

```tsx
import React from 'react';
import { Text, View } from 'react-native';

type PriceCardProps = {
  price: number;
  currency: string;
};

const PriceCard = React.memo(({ price, currency }: PriceCardProps) => {
  return (
    <View>
      <Text>{currency} {price.toFixed(2)}</Text>
    </View>
  );
});

export default PriceCard;
```

Quando o componente pai re-renderiza, `PriceCard` só re-renderiza se `price` ou `currency` mudaram. Se os valores forem os mesmos objetos ou primitivos iguais, o React reutiliza o resultado anterior.

### Comparação personalizada com React.memo

Assim como você implementa `Equatable` manualmente para structs complexas, `React.memo` aceita um segundo argumento — uma função de comparação:

```tsx
const ProductCard = React.memo(
  ({ product, onPress }: ProductCardProps) => {
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{product.name}</Text>
        <Text>{product.price}</Text>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // retorna true se as props são IGUAIS (pular re-render)
    // retorna false se as props MUDARAM (re-renderizar)
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.price === nextProps.product.price
    );
  }
);
```

---

## SwiftUI Computed Properties e useMemo

Em Swift e SwiftUI, você usa propriedades computadas para derivar valores sem armazená-los redundantemente. O compilador não recalcula a propriedade a cada frame — apenas quando os valores base mudam:

```swift
struct OrderSummary: View {
    let items: [OrderItem]

    private var totalPrice: Double {
        items.reduce(0) { $0 + $1.price * Double($1.quantity) }
    }

    var body: some View {
        Text("Total: \(totalPrice, specifier: "%.2f")")
    }
}
```

`totalPrice` só é recalculado quando `items` muda. Em React, toda função dentro de um componente funcional é recriada a cada renderização — não há equivalente automático de propriedade computada. É para isso que serve o `useMemo`:

```tsx
import React, { useMemo } from 'react';
import { Text } from 'react-native';

type OrderItem = { price: number; quantity: number };

type OrderSummaryProps = {
  items: OrderItem[];
};

const OrderSummary = ({ items }: OrderSummaryProps) => {
  const totalPrice = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  return <Text>Total: {totalPrice.toFixed(2)}</Text>;
};
```

O array `[items]` é a lista de dependências — análogo a dizer "recalcule apenas quando `items` mudar". Se `items` for a mesma referência de array entre renderizações, `totalPrice` retorna o valor em cache.

### useMemo para valores referenciados por outros hooks

`useMemo` também é necessário quando você precisa de estabilidade de referência para um objeto ou array que será passado como prop ou dependência de outro hook:

```tsx
const filters = useMemo(() => ({
  minPrice: priceRange[0],
  maxPrice: priceRange[1],
  category: selectedCategory,
}), [priceRange, selectedCategory]);

// filters tem referência estável entre renders se as dependências não mudarem
useEffect(() => {
  fetchProducts(filters);
}, [filters]);
```

Sem o `useMemo`, um objeto literal `{}` sempre cria uma nova referência a cada render, fazendo o `useEffect` disparar em loop.

---

## Swift Stored Function Properties e useCallback

Em Swift, você pode armazenar uma closure como propriedade para que ela não seja recriada a cada vez que o método é chamado:

```swift
class ProductViewModel: ObservableObject {
    var onAddToCart: ((Product) -> Void)?

    // a closure é armazenada e tem identidade estável
    func configure(handler: @escaping (Product) -> Void) {
        self.onAddToCart = handler
    }
}
```

Em componentes React, funções definidas dentro do corpo do componente são recriadas a cada renderização. Quando passadas como props para componentes filhos que usam `React.memo`, isso cancela a memoização — o filho recebe uma "nova" função e re-renderiza de qualquer forma.

`useCallback` retorna uma versão memoizada da função que só muda quando as dependências mudam:

```tsx
import React, { useCallback, useState } from 'react';
import { FlatList } from 'react-native';

const ProductList = ({ products }: { products: Product[] }) => {
  const [cart, setCart] = useState<Product[]>([]);

  const handleAddToCart = useCallback((product: Product) => {
    setCart(prev => [...prev, product]);
  }, []); // sem dependências — setCart é estável por garantia do React

  return (
    <FlatList
      data={products}
      renderItem={({ item }) => (
        <ProductCard product={item} onPress={handleAddToCart} />
      )}
      keyExtractor={item => item.id}
    />
  );
};
```

Sem `useCallback`, cada render de `ProductList` criaria uma nova função `handleAddToCart`, o que faria cada `ProductCard` memoizado re-renderizar mesmo sem mudança nos dados do produto.

---

## Quando Não Memoizar — Otimização Prematura

Em Swift você não aplica `lazy` em toda propriedade por padrão — só quando o custo de computação justifica. A mesma lógica se aplica aqui.

`React.memo`, `useMemo` e `useCallback` têm custo: o React precisa armazenar os valores anteriores, comparar dependências e gerenciar o cache. Para a maioria dos componentes simples, esse overhead supera o benefício de evitar uma re-renderização barata.

Não memoize quando:

- O componente renderiza apenas elementos primitivos simples (texto, ícone estático)
- O cálculo dentro do `useMemo` é trivial (soma de dois números)
- O componente quase sempre recebe props diferentes a cada render de qualquer forma
- Você ainda não mediu e não tem evidência de problema de performance

Memoize quando:

- Há evidência via profiler de renderizações desnecessárias que causam jank
- O componente é renderizado frequentemente dentro de uma lista longa
- O cálculo memoizado é genuinamente caro (filtro de grande array, formatação complexa)
- A referência estável é necessária para evitar efeitos colaterais em `useEffect`

A regra é a mesma que você já conhece em iOS: meça primeiro, otimize depois.

---

## React DevTools Profiler — Flame Chart

O Profiler do React DevTools é o equivalente ao Instruments Time Profiler, mas focado especificamente em renderizações de componentes.

Para usar com React Native:

1. Instale o aplicativo standalone React DevTools: `npx react-devtools`
2. Inicie sua aplicação no simulador ou dispositivo
3. Vá para a aba "Profiler"
4. Clique em "Record", interaja com a tela e clique em "Stop"

O flame chart mostra cada commit de renderização. Para cada commit, você vê:

- Quais componentes foram renderizados (em cores — cinza significa "não renderizou neste commit")
- Quanto tempo cada componente levou para renderizar
- Por que o componente renderizou (props changed, state changed, parent re-rendered)

A coluna "Why did this render?" é o ponto de partida para identificar renderizações desnecessárias. Se um componente mostra "parent re-rendered" mas suas props não mudaram, ele é candidato a `React.memo`.

Para ler o flame chart: componentes mais ao topo da pilha são os pais; barras mais largas significam mais tempo. Diferente do Instruments, o eixo X não é tempo absoluto — é hierarquia de componente no commit.

---

## Biblioteca why-did-you-render

O `React DevTools Profiler` mostra o que renderizou. A biblioteca `why-did-you-render` (WDYR) mostra por que renderizou, com detalhes de qual prop ou estado mudou — incluindo quando a mudança é desnecessária (mesmo valor, referência diferente).

Instalação:

```bash
npm install @welldone-software/why-did-you-render
```

Configuração em um arquivo de bootstrap (ex.: `wdyr.ts`), importado antes de tudo no entry point:

```ts
import React from 'react';

if (__DEV__) {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: false,
    trackHooks: true,
    logOnDifferentValues: true,
  });
}
```

Para monitorar um componente específico:

```tsx
const ProductCard = ({ product, onPress }: ProductCardProps) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{product.name}</Text>
    </TouchableOpacity>
  );
};

ProductCard.whyDidYouRender = true;

export default React.memo(ProductCard);
```

A biblioteca imprimirá no console quando `ProductCard` re-renderizar e qual prop causou a re-renderização — mesmo que o valor seja o mesmo objeto reconstituído. Isso expõe exatamente os casos onde `useCallback` e `useMemo` são necessários.

---

## Divisão de Componentes para Minimizar Escopo de Re-render

Em SwiftUI, você divide views em subviews menores não apenas por organização, mas porque o compilador consegue invalidar e re-renderizar subviews individuais sem recalcular toda a view pai. A mesma estratégia funciona em React.

Se um componente grande gerencia vários estados independentes, uma mudança em qualquer estado re-renderiza tudo. A solução é extrair as partes que dependem de estado específico para componentes filhos:

```tsx
// Antes: um componente grande com múltiplos estados
const ProductScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [filters, setFilters] = useState(defaultFilters);

  // Qualquer mudança re-renderiza SearchBar, CartBadge e FilterPanel juntos
  return (
    <View>
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <CartBadge count={cartCount} />
      <FilterPanel filters={filters} onChange={setFilters} />
      <ProductGrid query={searchQuery} filters={filters} />
    </View>
  );
};

// Depois: estado movido para baixo, cada parte re-renderiza independentemente
const SearchSection = ({ onQueryChange }: { onQueryChange: (q: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleChange = useCallback((q: string) => {
    setSearchQuery(q);
    onQueryChange(q);
  }, [onQueryChange]);

  return <SearchBar value={searchQuery} onChange={handleChange} />;
};
```

A regra: mova o estado para o componente mais próximo que precisa dele. Não centralize estado na raiz da tela a menos que múltiplos componentes independentes realmente precisem compartilhá-lo.

---

## Estabilidade de Valor em Context — useMemo para Context Value

O Context API do React tem uma armadilha clássica: quando o provedor re-renderiza, todos os consumidores re-renderizam, independente de quais valores do context eles usam.

O problema típico:

```tsx
// Problema: novo objeto criado a cada render do AuthProvider
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
```

`{ user, isLoading, setUser }` é um objeto literal novo a cada render do `AuthProvider`. Qualquer componente que consome `AuthContext` re-renderiza, mesmo que `user` e `isLoading` não tenham mudado.

A correção com `useMemo`:

```tsx
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    setUser,
  }), [user, isLoading]); // setUser é estável — não precisa ser dependência

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

Agora o objeto do context só muda de referência quando `user` ou `isLoading` mudam, reduzindo significativamente re-renderizações de consumidores.

---

## useState vs useReducer para Estado Complexo

Em Swift, quando o estado de uma tela tem múltiplas propriedades relacionadas e transições que dependem do estado atual, você tende a modelar com um `enum` ou uma struct de estado imutável com um método de transição. `useReducer` segue a mesma lógica.

Prefira `useReducer` quando:

- Há múltiplos valores de estado que mudam juntos de forma coordenada
- A próxima transição depende do estado atual
- A lógica de atualização de estado é complexa o suficiente para merecer teste isolado

```tsx
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

type FetchAction<T> =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: T }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'RESET' };

function fetchReducer<T>(state: FetchState<T>, action: FetchAction<T>): FetchState<T> {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading' };
    case 'FETCH_SUCCESS':
      return { status: 'success', data: action.payload };
    case 'FETCH_ERROR':
      return { status: 'error', message: action.message };
    case 'RESET':
      return { status: 'idle' };
    default:
      return state;
  }
}

const ProductList = () => {
  const [state, dispatch] = useReducer(fetchReducer<Product[]>, { status: 'idle' });

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });
    fetchProducts()
      .then(data => dispatch({ type: 'FETCH_SUCCESS', payload: data }))
      .catch(err => dispatch({ type: 'FETCH_ERROR', message: err.message }));
  }, []);

  if (state.status === 'loading') return <ActivityIndicator />;
  if (state.status === 'error') return <Text>{state.message}</Text>;
  if (state.status === 'success') return <FlatList data={state.data} />;
  return null;
};
```

Além da clareza, `dispatch` tem referência estável entre renders — pode ser passado como prop ou colocado em `useEffect` sem precisar de `useCallback`.

---

## React 18 Concurrent Features — startTransition

Em iOS, você separa trabalho por prioridade. Tarefas urgentes vão na main thread; processamento pesado vai em `DispatchQueue.global(qos: .background)`:

```swift
DispatchQueue.global(qos: .userInitiated).async {
    let results = performHeavySearch(query: query)
    DispatchQueue.main.async {
        self.searchResults = results
    }
}
```

O React 18 introduz um mecanismo equivalente de priorização de atualizações de estado: `startTransition`. Ele marca uma atualização de estado como não urgente — o React pode interrompê-la para processar interações de maior prioridade como input do usuário.

```tsx
import React, { useState, useTransition } from 'react';
import { TextInput, FlatList, ActivityIndicator } from 'react-native';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (text: string) => {
    // Atualização urgente — campo de input responde imediatamente
    setQuery(text);

    // Atualização não urgente — pode ser interrompida se o usuário digitar novamente
    startTransition(() => {
      const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(text.toLowerCase())
      );
      setResults(filtered);
    });
  };

  return (
    <>
      <TextInput value={query} onChangeText={handleSearch} />
      {isPending && <ActivityIndicator />}
      <FlatList data={results} renderItem={renderProduct} />
    </>
  );
};
```

`isPending` indica que há uma transição em andamento — use para mostrar um indicador de carregamento sem bloquear o input. O campo de texto sempre responde com latência zero; a lista atualiza assim que o React tiver tempo disponível.

`startTransition` não é um substituto para `useCallback` ou `React.memo` — cada um resolve um problema diferente. `startTransition` prioriza o que renderiza; `React.memo` evita renderizações desnecessárias; `useMemo` e `useCallback` mantêm estabilidade de referência.

---

## Resumo de Equivalências

| Swift / SwiftUI | React Native |
|---|---|
| `View: Equatable` + `.equatableView()` | `React.memo(Component)` |
| Propriedade computada | `useMemo(() => value, [deps])` |
| Closure armazenada como propriedade | `useCallback(() => fn, [deps])` |
| `DispatchQueue.global` para trabalho de baixa prioridade | `startTransition(() => setState(...))` |
| `enum` de estado + método de transição | `useReducer(reducer, initialState)` |
| Time Profiler no Instruments | React DevTools Profiler (flame chart) |

O princípio subjacente é o mesmo em ambas as plataformas: entenda o modelo de renderização, meça antes de otimizar, e aplique as ferramentas cirurgicamente onde os dados mostram que há problema.
