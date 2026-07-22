---
title: "TypeScript for Kotlin Developers"
sidebar_label: "TypeScript"
sidebar_position: 2
---

## Video Overview

> Video for this topic coming soon.

## TypeScript is JavaScript With Kotlin's Type System

If you loved Kotlin's type system — data classes, sealed classes, nullable types, generics — you'll feel at home in TypeScript. The philosophy is identical: catch bugs at compile time, not runtime.

TypeScript is a superset of JavaScript: all valid JS is valid TS. You add types progressively. In React Native, TypeScript is the default and strongly recommended.

---

## Setup: tsconfig.json

React Native CLI and Expo both generate a `tsconfig.json`. The most important setting:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "esnext",
    "lib": ["esnext"],
    "allowJs": true,
    "jsx": "react-native",
    "moduleResolution": "bundler",
    "baseUrl": "."
  }
}
```

`"strict": true` enables:
- `strictNullChecks` — `null` and `undefined` are not assignable to other types (like Kotlin's nullable system)
- `noImplicitAny` — variables without a type annotation get `any` only if inferable, otherwise error
- `strictFunctionTypes` — function parameter types are checked covariantly

---

## Primitive Types

```typescript
const name: string = "Guilherme";
const age: number = 30;
const active: boolean = true;
const nothing: null = null;
const missing: undefined = undefined;
```

TypeScript infers types — you rarely need to annotate primitives:

```typescript
const name = "Guilherme"; // TypeScript infers: string
const age = 30;           // inferred: number
```

---

## Nullable Types

Kotlin distinguishes `String` from `String?`. TypeScript uses a union type with `null` or `undefined`:

| Kotlin        | TypeScript                          |
|---------------|-------------------------------------|
| `String`      | `string`                            |
| `String?`     | `string \| null`                    |
| `String?`     | `string \| null \| undefined`       |
| `?.`          | `?.`                                |
| `?:`          | `??`                                |
| `!!`          | `!` (non-null assertion — avoid it) |

```typescript
function greet(name: string | null): string {
  return `Hello, ${name ?? "stranger"}`;
}

// With strictNullChecks, this is a compile error:
const upper = name.toUpperCase(); // Error: 'name' is possibly null

// Safe:
const upper = name?.toUpperCase() ?? "";
```

---

## Interfaces and Types

Kotlin has `data class` and `interface`. TypeScript has `interface` and `type`. They're largely interchangeable — `type` is more flexible, `interface` is more extendable.

### Kotlin data class → TypeScript interface

```kotlin
data class User(
    val id: String,
    val name: String,
    val email: String,
    val role: String = "viewer",
)
```

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role?: string; // optional — equivalent to default value
}

// Or with type alias
type User = {
  id: string;
  name: string;
  email: string;
  role?: string;
};
```

### Extending interfaces

```kotlin
interface Animal { val name: String }
interface Pet : Animal { val owner: String }
```

```typescript
interface Animal { name: string; }
interface Pet extends Animal { owner: string; }

// type alias intersection
type Pet = Animal & { owner: string };
```

---

## Discriminated Unions: Sealed Classes

This is one of TypeScript's most powerful features — identical in purpose to Kotlin's sealed classes.

### Kotlin sealed class

```kotlin
sealed class UiState {
    object Loading : UiState()
    data class Success(val data: List<User>) : UiState()
    data class Error(val message: String) : UiState()
}

fun render(state: UiState) = when (state) {
    is UiState.Loading -> showSpinner()
    is UiState.Success -> showList(state.data)
    is UiState.Error -> showError(state.message)
}
```

### TypeScript discriminated union

```typescript
type UiState =
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; message: string };

function render(state: UiState) {
  switch (state.status) {
    case 'loading':  return <ActivityIndicator />;
    case 'success':  return <UserList data={state.data} />;
    case 'error':    return <ErrorMessage message={state.message} />;
  }
}
```

The discriminant field (`status`) tells TypeScript which branch you're in — inside `case 'success'`, TypeScript knows `state.data` exists. This is exhaustiveness checking at compile time, exactly like Kotlin's `when` on sealed classes.

---

## Generics

```kotlin
data class ApiResponse<T>(
    val data: T,
    val error: String? = null,
)

fun <T> fetchData(url: String): ApiResponse<T> { ... }
```

```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const res = await fetch(url);
  const data: T = await res.json();
  return { data };
}

// Usage — TypeScript infers the return type
const response = await fetchData<User[]>('/api/users');
// response.data is User[]
```

### Generic Constraints

```kotlin
fun <T : Comparable<T>> max(a: T, b: T): T = if (a > b) a else b
```

```typescript
function max<T extends { valueOf(): number }>(a: T, b: T): T {
  return a.valueOf() > b.valueOf() ? a : b;
}
```

---

## Utility Types

TypeScript ships with built-in utility types that map to common Kotlin patterns:

| TypeScript Utility   | Kotlin equivalent                          | Description |
|----------------------|--------------------------------------------|-------------|
| `Partial<T>`         | All fields optional (no direct equivalent) | Makes all fields `?` |
| `Required<T>`        | Remove `?` from all fields                 | Opposite of Partial |
| `Readonly<T>`        | `val` for all fields                       | All fields read-only |
| `Pick<T, K>`         | No direct equivalent                       | Select subset of fields |
| `Omit<T, K>`         | No direct equivalent                       | Exclude subset of fields |
| `Record<K, V>`       | `Map<K, V>` (rough)                        | Object with typed keys and values |
| `NonNullable<T>`     | Non-nullable type                          | Removes `null`/`undefined` |
| `ReturnType<F>`      | Inferred return type                       | Extract return type of function |

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// For an update form — all fields optional
type UserUpdatePayload = Partial<Omit<User, 'id'>>;
// { name?: string; email?: string; password?: string }

// For display — never expose the password
type PublicUser = Omit<User, 'password'>;
// { id: string; name: string; email: string }

// For a lookup map
type UserMap = Record<string, User>;
// { [userId: string]: User }
```

---

## Enums vs Union Types

Kotlin uses `enum class`. TypeScript has two approaches:

### TypeScript enum (avoid in most cases)

```typescript
enum Direction { Up, Down, Left, Right }
```

### String union type (preferred in React Native)

```typescript
type Direction = 'up' | 'down' | 'left' | 'right';

function move(dir: Direction) { ... }
move('up');    // valid
move('north'); // Error: not assignable to type Direction
```

```kotlin
enum class Direction { UP, DOWN, LEFT, RIGHT }
```

Prefer union types over `enum` in TypeScript — they produce cleaner JavaScript output and work better with discriminated unions.

---

## Type Assertions and Type Guards

### Type Assertion (Kotlin's `as`)

```kotlin
val view = activity.findViewById(R.id.btn) as Button
```

```typescript
const input = document.getElementById('name') as HTMLInputElement;
// or (older syntax, don't use in JSX files)
const input = <HTMLInputElement>document.getElementById('name');
```

### Type Guard (Kotlin's `is`)

```kotlin
if (shape is Circle) { /* shape is smart-cast to Circle */ }
```

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}

if (isUser(response)) {
  console.log(response.name); // TypeScript knows it's a User here
}
```

---

## Typing React Native Components

This is the most practical TypeScript you'll write:

```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';

// Props interface — the equivalent of a Kotlin @Composable function signature
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, styles[variant], disabled && styles.disabled]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
  primary: { backgroundColor: '#6750A4' },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#6750A4' },
  disabled: { opacity: 0.4 },
  label: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
```

---

## Typing Async Functions and Promises

```kotlin
suspend fun fetchUser(id: String): User
```

```typescript
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<User>;
}

// Error handling
async function loadUser(id: string): Promise<User | null> {
  try {
    return await fetchUser(id);
  } catch (err) {
    console.error(err);
    return null;
  }
}
```

---

## Study Materials

### Official Documentation

- [TypeScript — Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) — complete language reference
- [TypeScript — TypeScript for Java/C# Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html) — maps OOP concepts (very relevant for Kotlin devs)
- [TypeScript — Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [React Native — TypeScript](https://reactnative.dev/docs/typescript)

### Interactive

- [TypeScript Playground](https://www.typescriptlang.org/play) — live TypeScript editor in the browser
- [Total TypeScript — Beginner's Tutorial](https://www.totaltypescript.com/tutorials/beginners-typescript) — free interactive exercises

### Videos

- [Fireship — TypeScript in 100 Seconds](https://www.youtube.com/watch?v=zQnBQ4tB3ZA)
- [Matt Pocock — TypeScript for React Developers](https://www.youtube.com/watch?v=37PafxU_uzQ)

---

## What's Next

TypeScript covered. Next: the core building blocks of React Native UIs — what replaces `TextView`, `ImageView`, `RecyclerView`, and every other Android view you know.

➡ [React Native Core Components](./03-rn-core-components)
