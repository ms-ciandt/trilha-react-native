---
title: SwiftUI to React — Concept Mapping
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/fund_03_swiftui-to-react.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/fund_03_swiftui-to-react_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

If you already develop with SwiftUI, React's concepts will feel familiar: both are declarative, component-oriented, and react to state changes automatically. The difference lies in the language and conventions — not in the paradigm.

This document maps each SwiftUI pattern to its React/React Native equivalent, with side-by-side examples.

---

## View struct → Function Component

In SwiftUI, a `View` is a struct that implements the `View` protocol and exposes the computed property `body`. In React, the equivalent is a function that returns JSX.

**SwiftUI**

```swift
struct GreetingView: View {
    var name: String

    var body: some View {
        Text("Hello, \(name)!")
            .font(.title)
            .foregroundColor(.blue)
    }
}
```

**React Native (TSX)**

```tsx
import { Text } from 'react-native';

type GreetingProps = {
  name: string;
};

export function GreetingView({ name }: GreetingProps) {
  return (
    <Text style={{ fontSize: 24, color: 'blue' }}>
      Hello, {name}!
    </Text>
  );
}
```

:::info body property → return JSX
SwiftUI's `body` property is equivalent to the `return` block of a React component. Both describe the UI tree that the framework should render. You never imperatively mount the screen — you describe what it should display given the current state.
:::

---

## @State → useState

`@State` in SwiftUI is a local source of truth for the view. When it changes, the view re-renders. The direct equivalent in React is the `useState` hook.

**SwiftUI**

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") {
                count += 1
            }
        }
    }
}
```

**React Native (TSX)**

```tsx
import { useState } from 'react';
import { View, Text, Button } from 'react-native';

export function CounterView() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
    </View>
  );
}
```

:::info Immutability in React
Unlike SwiftUI where you can assign directly to `@State` (`count += 1`), in React you never mutate state directly. Always use the setter returned by `useState`. This allows React to detect the change and schedule a re-render.
:::

---

## @Binding → props + callback

`@Binding` creates a two-way link between a parent and child view — the child can read and modify the parent's state. In React, this pattern is implemented by passing the value and an update function as separate props.

**SwiftUI**

```swift
struct ToggleView: View {
    @Binding var isOn: Bool

    var body: some View {
        Toggle("Enabled", isOn: $isOn)
    }
}

struct ParentView: View {
    @State private var enabled = false

    var body: some View {
        ToggleView(isOn: $enabled)
    }
}
```

**React Native (TSX)**

```tsx
import { Switch, View, Text } from 'react-native';

type ToggleViewProps = {
  isOn: boolean;
  onToggle: (value: boolean) => void;
};

function ToggleView({ isOn, onToggle }: ToggleViewProps) {
  return (
    <View>
      <Text>Enabled</Text>
      <Switch value={isOn} onValueChange={onToggle} />
    </View>
  );
}

export function ParentView() {
  const [enabled, setEnabled] = useState(false);

  return <ToggleView isOn={enabled} onToggle={setEnabled} />;
}
```

:::info Unidirectional data flow
In SwiftUI, `@Binding` masks the fact that data flows from the parent. In React this flow is explicit: the parent passes `value` and `onChange`, and the child calls `onChange` when it wants to update. This is called a "controlled component" and is a central pattern in React.
:::

---

## @ObservableObject → Zustand (or useContext)

`@ObservableObject` with `@Published` encapsulates shared state in an observable class. In React Native, the closest equivalent for simple global state is Zustand; for medium-scope state, `useContext` with `useReducer`.

**SwiftUI**

```swift
class CartStore: ObservableObject {
    @Published var items: [String] = []

    func add(_ item: String) {
        items.append(item)
    }
}

struct CartView: View {
    @ObservedObject var cart: CartStore

    var body: some View {
        List(cart.items, id: \.self) { item in
            Text(item)
        }
    }
}
```

**React Native with Zustand (TSX)**

```tsx
import { create } from 'zustand';
import { FlatList, Text } from 'react-native';

type CartState = {
  items: string[];
  add: (item: string) => void;
};

const useCartStore = create<CartState>((set) => ({
  items: [],
  add: (item) => set((state) => ({ items: [...state.items, item] })),
}));

export function CartView() {
  const items = useCartStore((state) => state.items);

  return (
    <FlatList
      data={items}
      keyExtractor={(item, index) => String(index)}
      renderItem={({ item }) => <Text>{item}</Text>}
    />
  );
}
```

:::info Why Zustand?
`@ObservableObject` is a class with identity — you instantiate it and pass it to views. Zustand follows the same idea: a centralized store with state and actions. The difference is that Zustand is based on closures and hooks, without the need for classes or decorators.
:::

---

## @EnvironmentObject → React Context

`@EnvironmentObject` injects a shared object into the view hierarchy without explicitly passing it through each level. The equivalent in React is `Context`.

**SwiftUI**

```swift
class ThemeStore: ObservableObject {
    @Published var isDark = false
}

struct RootView: View {
    @StateObject var theme = ThemeStore()

    var body: some View {
        ContentView()
            .environmentObject(theme)
    }
}

struct ContentView: View {
    @EnvironmentObject var theme: ThemeStore

    var body: some View {
        Text("Dark mode: \(theme.isDark ? "on" : "off")")
    }
}
```

**React Native (TSX)**

```tsx
import { createContext, useContext, useState } from 'react';
import { Text, View } from 'react-native';

type ThemeContextType = {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  setIsDark: () => {},
});

export function RootView() {
  const [isDark, setIsDark] = useState(false);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <ContentView />
    </ThemeContext.Provider>
  );
}

function ContentView() {
  const { isDark } = useContext(ThemeContext);

  return <Text>Dark mode: {isDark ? 'on' : 'off'}</Text>;
}
```

---

## ViewModifier → StyleSheet or Styled Components

In SwiftUI, `ViewModifier` encapsulates a reusable set of visual modifications. In React Native, the equivalent is a style object in `StyleSheet.create` or a function that returns composed styles.

**SwiftUI**

```swift
struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(Color.white)
            .cornerRadius(12)
            .shadow(radius: 4)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardModifier())
    }
}

struct MyCard: View {
    var body: some View {
        Text("Hello")
            .cardStyle()
    }
}
```

**React Native (TSX)**

```tsx
import { View, Text, StyleSheet } from 'react-native';

const cardStyle = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

function Card({ children }: { children: React.ReactNode }) {
  return <View style={cardStyle.container}>{children}</View>;
}

export function MyCard() {
  return (
    <Card>
      <Text>Hello</Text>
    </Card>
  );
}
```

---

## Conditional Rendering

SwiftUI uses `if/else` inside the `body`. React uses JavaScript operators directly in JSX.

**SwiftUI**

```swift
struct StatusView: View {
    var isLoggedIn: Bool

    var body: some View {
        VStack {
            if isLoggedIn {
                Text("Welcome back!")
            } else {
                Text("Please sign in.")
            }
        }
    }
}
```

**React Native (TSX)**

```tsx
type StatusViewProps = { isLoggedIn: boolean };

export function StatusView({ isLoggedIn }: StatusViewProps) {
  return (
    <View>
      {isLoggedIn ? (
        <Text>Welcome back!</Text>
      ) : (
        <Text>Please sign in.</Text>
      )}
    </View>
  );
}
```

To render something only when a condition is true, use `&&`:

```tsx
{isLoggedIn && <Text>Welcome back!</Text>}
```

---

## ForEach → Array.map()

SwiftUI has `ForEach` to iterate over collections inside `body`. In React, you use JavaScript's native `.map()`.

**SwiftUI**

```swift
struct FruitList: View {
    let fruits = ["Apple", "Banana", "Cherry"]

    var body: some View {
        List {
            ForEach(fruits, id: \.self) { fruit in
                Text(fruit)
            }
        }
    }
}
```

**React Native (TSX)**

```tsx
const fruits = ['Apple', 'Banana', 'Cherry'];

export function FruitList() {
  return (
    <View>
      {fruits.map((fruit) => (
        <Text key={fruit}>{fruit}</Text>
      ))}
    </View>
  );
}
```

:::info The key prop
Just as the `id` parameter in SwiftUI's `ForEach` identifies each item for the framework, the `key` prop in React serves the same purpose: it allows the reconciler to identify which items changed, were added, or removed without recreating the entire list.
:::

For long lists, prefer `FlatList` in React Native, which virtualizes items and saves memory — analogous to `LazyVStack` with `ForEach`:

```tsx
import { FlatList, Text } from 'react-native';

export function FruitList() {
  return (
    <FlatList
      data={fruits}
      keyExtractor={(item) => item}
      renderItem={({ item }) => <Text>{item}</Text>}
    />
  );
}
```

---

## onChange → useEffect with dependency array

SwiftUI's `.onChange(of:)` modifier runs an action when a specific value changes. `useEffect` with a dependency array does the same in React.

**SwiftUI**

```swift
struct SearchView: View {
    @State private var query = ""
    @State private var results: [String] = []

    var body: some View {
        TextField("Search", text: $query)
            .onChange(of: query) { newValue in
                fetchResults(for: newValue)
            }
    }

    func fetchResults(for query: String) {
        // async search
    }
}
```

**React Native (TSX)**

```tsx
import { useState, useEffect } from 'react';
import { TextInput, View } from 'react-native';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (query.length === 0) return;

    fetchResults(query).then(setResults);
  }, [query]);

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search"
      />
    </View>
  );
}

async function fetchResults(query: string): Promise<string[]> {
  // async search
  return [];
}
```

:::info Effect cleanup
If `.onChange` in SwiftUI triggers an async operation that needs to be cancelled when the value changes again, `useEffect` supports this through a cleanup function. Return a function from `useEffect` to cancel pending tasks — equivalent to using `Task` and calling `task.cancel()` in Swift.
:::

```tsx
useEffect(() => {
  let cancelled = false;

  fetchResults(query).then((data) => {
    if (!cancelled) setResults(data);
  });

  return () => {
    cancelled = true;
  };
}, [query]);
```

---

## Computed Properties for Subviews → Helper Components

In SwiftUI, it is common to extract parts of `body` into computed properties to organize code. In React, the equivalent is extracting into helper functions or components.

**SwiftUI**

```swift
struct ProfileView: View {
    var username: String
    var bio: String

    var header: some View {
        VStack(alignment: .leading) {
            Text(username).font(.largeTitle)
            Text(bio).foregroundColor(.secondary)
        }
    }

    var body: some View {
        ScrollView {
            header
            // remaining content
        }
    }
}
```

**React Native (TSX)**

```tsx
type ProfileViewProps = {
  username: string;
  bio: string;
};

function ProfileHeader({ username, bio }: ProfileViewProps) {
  return (
    <View>
      <Text style={{ fontSize: 32 }}>{username}</Text>
      <Text style={{ color: '#888' }}>{bio}</Text>
    </View>
  );
}

export function ProfileView({ username, bio }: ProfileViewProps) {
  return (
    <ScrollView>
      <ProfileHeader username={username} bio={bio} />
      {/* remaining content */}
    </ScrollView>
  );
}
```

:::info Component vs computed property
In SwiftUI, computed properties returning `some View` are evaluated inline and have no state of their own. In React, separate components have their own lifecycle and can have independent `useState`. If the helper needs no state, it can also be a regular function called inside `return` — but the React convention is to prefer separate components for easier testing and reuse.
:::

---

## Previews → React DevTools

SwiftUI has `#Preview` to visualize components in real time in Xcode. In React Native, the equivalent is React DevTools combined with hot reload in Expo Go or Metro.

**SwiftUI**

```swift
#Preview {
    CounterView()
}
```

**React Native — Expo**

```bash
npx expo start
```

Open Expo Go on the device or emulator. Every saved change is reflected instantly via Fast Refresh — component state is preserved when possible, just as SwiftUI previews maintain state between compilations.

To isolate components visually, tools like **Storybook for React Native** provide an experience close to Xcode previews:

```bash
npx storybook@latest init
```

---

## Concept Mapping Summary

| SwiftUI | React Native |
|---|---|
| `struct MyView: View` | `function MyView()` |
| `body: some View` | `return (<JSX />)` |
| `@State` | `useState` |
| `@Binding` | prop + `onChange` callback |
| `@ObservableObject` | Zustand store |
| `@EnvironmentObject` | `useContext` |
| `ViewModifier` | `StyleSheet` or wrapper component |
| `ForEach` | `Array.map()` or `FlatList` |
| `.onChange(of:)` | `useEffect([dep])` |
| Computed view property | Helper component or function |
| `if/else` in body | Ternary `? :` or `&&` |
| `#Preview` | React DevTools + Fast Refresh |

The declarative paradigm is the same. The main adjustment is thinking in terms of JavaScript and hooks instead of structs and property wrappers — but the composition and reactivity logic you already master in SwiftUI transfers directly.
