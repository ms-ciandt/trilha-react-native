---
title: Memo and Render Optimization
---

# Memo and Render Optimization

React renders a component whenever its state or props change. Most of the time this is fast enough not to matter. But in long lists, animations, or screens with many nested components, unnecessary re-renders accumulate and the frame rate drops visibly.

This module translates the optimization patterns you already use in SwiftUI and Swift to their React equivalents — and, more importantly, teaches you when to apply none of them.

---

## SwiftUI Equatable Body and React.memo

In SwiftUI, when a view conforms to the `Equatable` protocol, the framework can skip re-evaluating `body` if the values it depends on have not changed:

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

The compiler can invoke `.equatableView()` automatically when it detects that props are `Equatable`, avoiding unnecessary recalculation of `body`.

React has the exact equivalent: `React.memo`. It wraps a functional component and only allows re-rendering when props have changed — shallow comparison by default, exactly like SwiftUI's default `==` for structs.

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

When the parent component re-renders, `PriceCard` only re-renders if `price` or `currency` changed. If the values are the same objects or equal primitives, React reuses the previous result.

### Custom comparison with React.memo

Just as you implement `Equatable` manually for complex structs, `React.memo` accepts a second argument — a comparison function:

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
    // returns true if props are EQUAL (skip re-render)
    // returns false if props CHANGED (re-render)
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.price === nextProps.product.price
    );
  }
);
```

---

## SwiftUI Computed Properties and useMemo

In Swift and SwiftUI, you use computed properties to derive values without storing them redundantly. The compiler does not recalculate the property every frame — only when the base values change:

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

`totalPrice` is only recalculated when `items` changes. In React, every function inside a functional component is recreated on every render — there is no automatic computed property equivalent. That is what `useMemo` is for:

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

The `[items]` array is the dependency list — analogous to saying "recalculate only when `items` changes". If `items` is the same array reference between renders, `totalPrice` returns the cached value.

### useMemo for values referenced by other hooks

`useMemo` is also necessary when you need reference stability for an object or array that will be passed as a prop or as a dependency of another hook:

```tsx
const filters = useMemo(() => ({
  minPrice: priceRange[0],
  maxPrice: priceRange[1],
  category: selectedCategory,
}), [priceRange, selectedCategory]);

// filters has a stable reference between renders if dependencies haven't changed
useEffect(() => {
  fetchProducts(filters);
}, [filters]);
```

Without `useMemo`, an object literal `{}` always creates a new reference on every render, causing `useEffect` to fire in a loop.

---

## Swift Stored Function Properties and useCallback

In Swift, you can store a closure as a property so it is not recreated every time the method is called:

```swift
class ProductViewModel: ObservableObject {
    var onAddToCart: ((Product) -> Void)?

    // the closure is stored and has stable identity
    func configure(handler: @escaping (Product) -> Void) {
        self.onAddToCart = handler
    }
}
```

In React components, functions defined inside the component body are recreated on every render. When passed as props to child components that use `React.memo`, this cancels the memoization — the child receives a "new" function and re-renders anyway.

`useCallback` returns a memoized version of the function that only changes when its dependencies change:

```tsx
import React, { useCallback, useState } from 'react';
import { FlatList } from 'react-native';

const ProductList = ({ products }: { products: Product[] }) => {
  const [cart, setCart] = useState<Product[]>([]);

  const handleAddToCart = useCallback((product: Product) => {
    setCart(prev => [...prev, product]);
  }, []); // no dependencies — setCart is stable by React's guarantee

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

Without `useCallback`, every render of `ProductList` would create a new `handleAddToCart` function, causing every memoized `ProductCard` to re-render even without changes in the product data.

---

## When Not to Memoize — Premature Optimization

In Swift you do not apply `lazy` to every property by default — only when the computation cost justifies it. The same logic applies here.

`React.memo`, `useMemo`, and `useCallback` have a cost: React needs to store previous values, compare dependencies, and manage the cache. For most simple components, this overhead outweighs the benefit of avoiding a cheap re-render.

Do not memoize when:

- The component renders only simple primitive elements (text, static icon)
- The calculation inside `useMemo` is trivial (sum of two numbers)
- The component almost always receives different props on every render anyway
- You have not measured and have no evidence of a performance problem

Memoize when:

- There is profiler evidence of unnecessary renders causing jank
- The component renders frequently inside a long list
- The memoized calculation is genuinely expensive (large array filter, complex formatting)
- The stable reference is needed to prevent side effects in `useEffect`

The rule is the same one you already know in iOS: measure first, optimize later.

---

## React DevTools Profiler — Flame Chart

The React DevTools Profiler is equivalent to Instruments Time Profiler, but focused specifically on component renders.

To use with React Native:

1. Install the standalone React DevTools app: `npx react-devtools`
2. Start your application in the simulator or device
3. Go to the "Profiler" tab
4. Click "Record", interact with the screen, and click "Stop"

The flame chart shows each render commit. For each commit, you see:

- Which components rendered (in colors — gray means "did not render in this commit")
- How long each component took to render
- Why the component rendered (props changed, state changed, parent re-rendered)

The "Why did this render?" column is the starting point for identifying unnecessary renders. If a component shows "parent re-rendered" but its props did not change, it is a candidate for `React.memo`.

To read the flame chart: components higher up the stack are the parents; wider bars mean more time. Unlike Instruments, the X axis is not absolute time — it is component hierarchy in the commit.

---

## why-did-you-render library

The `React DevTools Profiler` shows what rendered. The `why-did-you-render` (WDYR) library shows why it rendered, with details about which prop or state changed — including when the change is unnecessary (same value, different reference).

Installation:

```bash
npm install @welldone-software/why-did-you-render
```

Setup in a bootstrap file (e.g. `wdyr.ts`), imported before everything else in the entry point:

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

To monitor a specific component:

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

The library will print to the console when `ProductCard` re-renders and which prop caused the re-render — even if the value is the same reconstituted object. This exposes exactly the cases where `useCallback` and `useMemo` are needed.

---

## Component splitting to minimize re-render scope

In SwiftUI, you split views into smaller subviews not only for organization, but because the compiler can invalidate and re-render individual subviews without recalculating the entire parent view. The same strategy works in React.

If a large component manages several independent states, a change in any state re-renders everything. The solution is to extract the parts that depend on specific state into child components:

```tsx
// Before: one large component with multiple states
const ProductScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [filters, setFilters] = useState(defaultFilters);

  // Any change re-renders SearchBar, CartBadge and FilterPanel together
  return (
    <View>
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <CartBadge count={cartCount} />
      <FilterPanel filters={filters} onChange={setFilters} />
      <ProductGrid query={searchQuery} filters={filters} />
    </View>
  );
};

// After: state moved down, each part re-renders independently
const SearchSection = ({ onQueryChange }: { onQueryChange: (q: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleChange = useCallback((q: string) => {
    setSearchQuery(q);
    onQueryChange(q);
  }, [onQueryChange]);

  return <SearchBar value={searchQuery} onChange={handleChange} />;
};
```

The rule: move state to the closest component that needs it. Do not centralize state at the screen root unless multiple independent components genuinely need to share it.

---

## Context value stability — useMemo for Context Value

React's Context API has a classic pitfall: when the provider re-renders, all consumers re-render, regardless of which context values they use.

The typical problem:

```tsx
// Problem: new object created on every render of AuthProvider
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

`{ user, isLoading, setUser }` is a new object literal on every render of `AuthProvider`. Any component that consumes `AuthContext` re-renders, even if `user` and `isLoading` have not changed.

The fix with `useMemo`:

```tsx
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    setUser,
  }), [user, isLoading]); // setUser is stable — no need to be a dependency

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

Now the context object only changes reference when `user` or `isLoading` change, significantly reducing consumer re-renders.

---

## useState vs useReducer for complex state

In Swift, when a screen's state has multiple related properties and transitions that depend on the current state, you tend to model it with an `enum` or an immutable state struct with a transition method. `useReducer` follows the same logic.

Prefer `useReducer` when:

- There are multiple state values that change together in a coordinated way
- The next transition depends on the current state
- The state update logic is complex enough to deserve isolated testing

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

Beyond clarity, `dispatch` has a stable reference between renders — it can be passed as a prop or placed in `useEffect` without needing `useCallback`.

---

## React 18 Concurrent Features — startTransition

On iOS, you separate work by priority. Urgent tasks go on the main thread; heavy processing goes on `DispatchQueue.global(qos: .background)`:

```swift
DispatchQueue.global(qos: .userInitiated).async {
    let results = performHeavySearch(query: query)
    DispatchQueue.main.async {
        self.searchResults = results
    }
}
```

React 18 introduces an equivalent mechanism for prioritizing state updates: `startTransition`. It marks a state update as non-urgent — React can interrupt it to process higher-priority interactions like user input.

```tsx
import React, { useState, useTransition } from 'react';
import { TextInput, FlatList, ActivityIndicator } from 'react-native';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (text: string) => {
    // Urgent update — the input field responds immediately
    setQuery(text);

    // Non-urgent update — can be interrupted if the user types again
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

`isPending` indicates that a transition is in progress — use it to show a loading indicator without blocking the input. The text field always responds with zero latency; the list updates as soon as React has time available.

`startTransition` is not a replacement for `useCallback` or `React.memo` — each solves a different problem. `startTransition` prioritizes what renders; `React.memo` avoids unnecessary renders; `useMemo` and `useCallback` maintain reference stability.

---

## Equivalence Summary

| Swift / SwiftUI | React Native |
|---|---|
| `View: Equatable` + `.equatableView()` | `React.memo(Component)` |
| Computed property | `useMemo(() => value, [deps])` |
| Closure stored as property | `useCallback(() => fn, [deps])` |
| `DispatchQueue.global` for low-priority work | `startTransition(() => setState(...))` |
| `enum` state + transition method | `useReducer(reducer, initialState)` |
| Time Profiler in Instruments | React DevTools Profiler (flame chart) |

The underlying principle is the same on both platforms: understand the rendering model, measure before optimizing, and apply the tools surgically where data shows there is a problem.
