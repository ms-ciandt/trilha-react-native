---
title: "React Fundamentals for Native Developers"
---

# React Fundamentals for Native Developers

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo/fund_03_react_fundamentals.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> React is a UI library with one core idea: **your UI is a function of your state**. If you've worked with modern Android (Jetpack Compose) or iOS (SwiftUI), this will click immediately.

## The Declarative Paradigm

**Imperative (Android View system / UIKit):**
```kotlin
// You tell the system HOW to change the UI step by step
val button = findViewById<Button>(R.id.myButton)
button.text = "Loading..."
button.isEnabled = false
spinner.visibility = View.VISIBLE
```

```swift
// UIKit
button.setTitle("Loading...", for: .normal)
button.isEnabled = false
spinner.startAnimating()
```

**Declarative (Compose / SwiftUI / React):**
```kotlin
// Compose — UI is a function of state
@Composable
fun MyButton(isLoading: Boolean) {
    if (isLoading) {
        CircularProgressIndicator()
    } else {
        Button(onClick = {}) { Text("Submit") }
    }
}
```

```tsx
// React — same idea, different syntax
function MyButton({ isLoading }: { isLoading: boolean }) {
    if (isLoading) {
        return <ActivityIndicator />;
    }
    return <Button onPress={() => {}} title="Submit" />;
}
```

The mental model: **describe what the UI should look like for a given state, not how to transition to it.** React figures out the diff and updates only what changed — exactly like Compose's recomposition or SwiftUI's view diffing.

---

## Components: The Building Block

A React component is a function that takes **props** and returns **JSX**:

```tsx
// The simplest possible component
function Greeting() {
    return <Text>Hello!</Text>;
}

// With typed props
interface GreetingProps {
    name: string;
    age?: number;
}

function Greeting({ name, age }: GreetingProps) {
    return (
        <View>
            <Text>Hello, {name}!</Text>
            {age !== undefined && <Text>Age: {age}</Text>}
        </View>
    );
}

// Usage
<Greeting name="Alice" age={30} />
<Greeting name="Bob" />
```

**Compose comparison:**
```kotlin
@Composable
fun Greeting(name: String, age: Int? = null) {
    Column {
        Text("Hello, $name!")
        age?.let { Text("Age: $it") }
    }
}
```

Components can be nested, composed, and reused — just like Composables.

---

## JSX — Not HTML, Not XML

JSX looks like HTML/XML but it's **JavaScript syntax sugar** that compiles to function calls:

```tsx
// JSX (what you write)
const element = <Text style={{ color: 'red' }}>Hello</Text>;

// What it compiles to (what you DON'T write)
const element = React.createElement(Text, { style: { color: 'red' } }, "Hello");
```

### JSX Rules

```tsx
// 1. Must return ONE root element (wrap in View or <> fragments)
function BadComponent() {
    // return <Text>First</Text><Text>Second</Text>; // ERROR
}

function GoodComponent() {
    return (
        <>
            <Text>First</Text>
            <Text>Second</Text>
        </>
    );
}

// 2. All tags must be closed
// <View>   — BAD
// <View /> — GOOD (self-closing)

// 3. className → style (in RN) / class → className (in React web)
// <Text className="title">  — web React
// <Text style={styles.title}> — React Native

// 4. JavaScript expressions go in { }
const name = "Alice";
<Text>Hello, {name}!</Text>
<Text>2 + 2 = {2 + 2}</Text>

// 5. Conditional rendering
{isLoggedIn && <ProfileScreen />}
{isLoggedIn ? <ProfileScreen /> : <LoginScreen />}
```

---

## Props: Component Inputs

Props are the component's interface — like constructor parameters in a Compose `@Composable` or a SwiftUI `View`.

```tsx
interface CardProps {
    title: string;
    subtitle?: string;         // optional
    onPress: () => void;        // callback (like a lambda/closure)
    children?: React.ReactNode; // nested content (like Compose's `content: @Composable`)
}

function Card({ title, subtitle, onPress, children }: CardProps) {
    return (
        <Pressable onPress={onPress} style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {children}
        </Pressable>
    );
}

// Usage with children
<Card title="My Card" onPress={() => console.log('pressed')}>
    <Text>This is child content</Text>
</Card>
```

**Props are read-only.** A component can never modify its own props — only the parent can change what it passes down.

---

## State with `useState`

State is data that, when changed, causes the component to re-render. Think of it like `mutableStateOf` in Compose or `@State` in SwiftUI.

```tsx
import { useState } from 'react';

function Counter() {
    // [currentValue, setterFunction] = useState(initialValue)
    const [count, setCount] = useState(0);
    const [name, setName] = useState('Alice');

    return (
        <View>
            <Text>Count: {count}</Text>
            <Button title="Increment" onPress={() => setCount(count + 1)} />
            <Button title="Reset" onPress={() => setCount(0)} />
        </View>
    );
}
```

**Compose comparison:**
```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }

    Column {
        Text("Count: $count")
        Button(onClick = { count++ }) { Text("Increment") }
        Button(onClick = { count = 0 }) { Text("Reset") }
    }
}
```

**SwiftUI comparison:**
```swift
struct Counter: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") { count += 1 }
            Button("Reset") { count = 0 }
        }
    }
}
```

The mental model is identical across all three — a reactive value that triggers re-render on change.

### Updating State Correctly

```tsx
// WRONG — mutating state directly (doesn't trigger re-render)
const [items, setItems] = useState(['a', 'b', 'c']);
items.push('d'); // BAD — React won't re-render

// CORRECT — always create new values
setItems([...items, 'd']);           // Add item
setItems(items.filter(i => i !== 'b')); // Remove item
setItems(items.map(i => i === 'a' ? 'A' : i)); // Update item

// For objects
const [user, setUser] = useState({ name: 'Alice', age: 30 });
setUser({ ...user, age: 31 }); // Update one field — spread creates new object
```

This immutable update pattern is fundamental to React's change detection.

---

## `useEffect` — Side Effects & Lifecycle

`useEffect` handles side effects — like `LaunchedEffect` in Compose, `onAppear` in SwiftUI, or `onCreate`/`viewDidLoad` in traditional native.

```tsx
import { useState, useEffect } from 'react';

function UserProfile({ userId }: { userId: string }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Runs after every render where userId changed
    useEffect(() => {
        let cancelled = false;

        async function loadUser() {
            setLoading(true);
            const data = await fetchUser(userId);
            if (!cancelled) {  // guard against stale updates
                setUser(data);
                setLoading(false);
            }
        }

        loadUser();

        // Cleanup function — runs before the next effect or unmount
        return () => { cancelled = true; };
    }, [userId]); // dependency array — re-run when userId changes

    if (loading) return <ActivityIndicator />;
    if (!user) return <Text>No user found</Text>;
    return <Text>{user.name}</Text>;
}
```

### `useEffect` Dependency Array

```tsx
useEffect(() => { /* runs after EVERY render */ });
useEffect(() => { /* runs ONCE on mount */ }, []);
useEffect(() => { /* runs when dep1 or dep2 changes */ }, [dep1, dep2]);
```

| Native Equivalent | useEffect Pattern |
|-------------------|-------------------|
| `onCreate` / `viewDidLoad` | `useEffect(() => {}, [])` |
| `onDestroy` / `deinit` | return cleanup from `useEffect` |
| `onResume` / `viewWillAppear` | Use `useFocusEffect` from React Navigation |
| Observe a value change | `useEffect(() => {}, [theValue])` |

---

## The Component Lifecycle at a Glance

```
Mount:   render → paint to screen → useEffect([], run once)
Update:  state/prop changes → re-render → paint → useEffect([deps], if deps changed)
Unmount: cleanup from useEffect → component removed
```

:::info useEffect runs after paint
Unlike `viewDidLoad` (iOS) or `onCreate` (Android) which run before the view is visible, `useEffect` fires **after** the screen has already painted. This is usually what you want (data fetches, subscriptions). For layout measurements that must happen synchronously before paint, use `useLayoutEffect` — the React Native equivalent of `viewDidLayoutSubviews`.
:::

---

## Lifting State Up

When two sibling components need to share state, move it to their common parent:

```tsx
// Parent owns the state
function App() {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <View>
            <UserList onSelect={setSelectedId} />
            <UserDetail userId={selectedId} />
        </View>
    );
}
```

This is analogous to a ViewModel in Android MVVM that both an Activity and a Fragment observe, or a Combine publisher that multiple SwiftUI views subscribe to.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| react.dev — Quick Start | Official Docs | [react.dev/learn](https://react.dev/learn) |
| react.dev — Thinking in React | Official Docs | [react.dev/learn/thinking-in-react](https://react.dev/learn/thinking-in-react) |
| react-tutorial.app | Interactive | [react-tutorial.app](https://react-tutorial.app/) |
| Scrimba — Learn React | Interactive Course | [scrimba.com/learn/learnreact](https://scrimba.com/learn/learnreact) |
| react.gg | Practice Problems | [react.gg](https://react.gg/) |

---

Next → **[Components & Props in Depth](./components-and-props)**