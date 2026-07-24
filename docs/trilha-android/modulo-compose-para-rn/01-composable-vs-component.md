---
title: "@Composable vs React Component"
sidebar_label: "@Composable vs Component"
sidebar_position: 1
---

## Video Overview

> Video for this topic coming soon.

## The Paradigm You Already Know

If you have written Jetpack Compose, you already understand the declarative UI model that React Native is built on. The mental jump is smaller than most Android developers expect — but the terminology and runtime differ significantly.

This file maps everything you know from Compose onto the React/React Native equivalent, with code-level precision.

---

## Core Concept: Functions That Return UI

In Compose, a `@Composable` function describes part of the UI. In React (and React Native), a Component is a function that returns JSX. The philosophy is identical: **UI is a function of state**.

### Compose

```kotlin
@Composable
fun Greeting(name: String) {
    Text(text = "Hello, $name!")
}
```

### React Native

```tsx
function Greeting({ name }: { name: string }) {
  return <Text>Hello, {name}!</Text>;
}
```

The differences are surface-level: no annotation, JSX instead of composable calls, `{}` for expressions instead of `${}` inside strings.

---

## Anatomy Comparison

| Compose concept                  | React Native equivalent                          |
|----------------------------------|--------------------------------------------------|
| `@Composable` annotation         | Plain function returning JSX                     |
| `@Preview`                       | Expo Snack / Storybook                           |
| `Modifier`                       | `style` prop + `StyleSheet`                      |
| `remember { }`                   | `useRef()` for stable identity                   |
| `remember { mutableStateOf() }`  | `useState()`                                     |
| `LaunchedEffect(key)`            | `useEffect(() => {}, [key])`                     |
| `derivedStateOf { }`             | `useMemo(() => computation, [deps])`             |
| `CompositionLocal`               | React Context + `useContext()`                   |
| `ViewModel` + `collectAsState`   | Zustand store or Redux slice + selector hook     |
| `@Stable` / `@Immutable`         | No exact equivalent — use `memo()` + stable refs |
| Recomposition                    | Re-render                                        |
| Slot API (content: @Composable)  | `children` prop                                  |

---

## The Recomposition / Re-render Model

### Compose

Compose tracks which composables read which state snapshots. When a state changes, only composables that read that state are recomposed. Compose uses a smart diffing compiler plugin to skip unchanged subtrees.

```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }
    // Only this composable re-runs when count changes
    Button(onClick = { count++ }) {
        Text("Count: $count")
    }
}
```

### React Native

React re-renders the component that holds state, then diffs the virtual DOM tree below it. You opt-out of re-renders with `memo()` — the equivalent of Compose's automatic smart recomposition.

```tsx
import { useState, memo } from 'react';
import { View, Text, Pressable } from 'react-native';

function Counter() {
  const [count, setCount] = useState(0);
  // Counter re-renders on every state change.
  // Child components wrapped in memo() are skipped if their props didn't change.
  return (
    <View>
      <ExpensiveChild label="static" />
      <Pressable onPress={() => setCount(c => c + 1)}>
        <Text>Count: {count}</Text>
      </Pressable>
    </View>
  );
}

// memo = Compose's automatic skip — but you have to opt in manually
const ExpensiveChild = memo(function ExpensiveChild({ label }: { label: string }) {
  return <Text>{label}</Text>;
});
```

> **Key difference**: Compose's compiler analyses which composables read which state at compile time. React re-renders entire component subtrees and relies on `memo()`, `useMemo()`, and `useCallback()` for manual bailout. Plan your component tree accordingly — small components are cheaper to re-render than large ones.

---

## Props: Compose Parameters vs Component Props

### Compose — named parameters with defaults

```kotlin
@Composable
fun PrimaryButton(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    Button(onClick = onClick, enabled = enabled) {
        Text(label)
    }
}
```

### React Native — destructured props object + TypeScript interface

```tsx
interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  enabled?: boolean;
}

function PrimaryButton({ label, onPress, enabled = true }: PrimaryButtonProps) {
  return (
    <Pressable onPress={onPress} disabled={!enabled}>
      <Text>{label}</Text>
    </Pressable>
  );
}
```

Differences to note:

- Props arrive as a single object, not individual parameters.
- The callback convention is `onPress` (not `onClick`) for touch events.
- Default values live in destructuring, not a Kotlin-style default parameter syntax.
- TypeScript's `?` marks optional props — Kotlin's `= default` handles both.

---

## Children / Slot API

Compose's slot API passes composables as lambda parameters. React passes children as the `children` prop.

### Compose — slot API

```kotlin
@Composable
fun Card(
    title: String,
    content: @Composable () -> Unit,
) {
    Column {
        Text(title)
        content()
    }
}

// Usage
Card(title = "Profile") {
    Image(painter = painterResource(R.drawable.avatar), contentDescription = null)
    Text("Guilherme")
}
```

### React Native — children prop

```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <View>
      <Text>{title}</Text>
      {children}
    </View>
  );
}

// Usage
<Card title="Profile">
  <Image source={require('./avatar.png')} />
  <Text>Guilherme</Text>
</Card>
```

For named slots (multiple lambdas in Compose), React uses multiple named props:

```tsx
interface LayoutProps {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

function Layout({ header, footer, children }: LayoutProps) {
  return (
    <View style={{ flex: 1 }}>
      {header}
      <View style={{ flex: 1 }}>{children}</View>
      {footer}
    </View>
  );
}
```

---

## Conditional Rendering

### Compose

```kotlin
@Composable
fun UserStatus(isLoggedIn: Boolean) {
    if (isLoggedIn) {
        Text("Welcome back!")
    } else {
        Text("Please log in.")
    }
}
```

### React Native

```tsx
function UserStatus({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <View>
      {isLoggedIn ? (
        <Text>Welcome back!</Text>
      ) : (
        <Text>Please log in.</Text>
      )}
    </View>
  );
}
```

Short-circuit rendering (render or nothing):

```tsx
{isLoggedIn && <ProfileBanner />}
```

> Compose uses `if` inside `@Composable` directly. React uses JavaScript ternary or `&&` inside JSX — both approaches are safe, but `&&` with a number (e.g. `{count && <X />}`) will render `0` when count is zero. Use `{count > 0 && <X />}` or the ternary form to be safe.

---

## List Rendering: LazyColumn vs FlatList

### Compose — LazyColumn

```kotlin
@Composable
fun UserList(users: List<User>) {
    LazyColumn {
        items(users, key = { it.id }) { user ->
            UserCard(user = user)
        }
    }
}
```

### React Native — FlatList

```tsx
import { FlatList } from 'react-native';

function UserList({ users }: { users: User[] }) {
  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <UserCard user={item} />}
    />
  );
}
```

Both virtualise by default — only items near the viewport are mounted. The `key` / `keyExtractor` function is mandatory in both to help the runtime track item identity during updates.

---

## Interactive Example

Try editing the composable-to-component mental model in this live Expo Snack:

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/components-and-props)

---

## Study Materials

### Official Documentation

- [React Native — Core Concepts](https://reactnative.dev/docs/getting-started) — start here if you haven't already
- [React — Thinking in React](https://react.dev/learn/thinking-in-react) — the mental model behind components and state
- [React — Describing the UI](https://react.dev/learn/describing-the-ui) — JSX, props, conditional rendering, lists
- [Jetpack Compose — Thinking in Compose](https://developer.android.com/develop/ui/compose/mental-model) — comparison baseline

### Interactive Tutorials

- [React Tutorial — Tic Tac Toe](https://react.dev/learn/tutorial-tic-tac-toe) — hands-on component + state introduction
- [Expo Snack — Components & Props](https://snack.expo.dev/@react-native-community/components-and-props) — interactive RN playground

### Videos

- [Fireship — React in 100 Seconds](https://www.youtube.com/watch?v=Tn6-PIqc4UM) — fast conceptual overview
- [Google — What is Jetpack Compose](https://www.youtube.com/watch?v=U5BwfqBpiWU) — re-watch with the RN parallels in mind

---

## What's Next

You now have the mental mapping from `@Composable` to React component. The next topic digs into the state system: how `remember { mutableStateOf() }` maps to `useState` and `useEffect`, and where the models diverge under the hood.

➡ [State and Effects: remember vs useState](./02-remember-vs-usestate)
