---
title: TypeScript for Native Developers
---

# TypeScript for Native Developers

> TypeScript is JavaScript with a type system bolted on. If you like Kotlin's or Swift's type systems, you'll feel at home here — with a few quirks.

## Setting Up: Strict Mode

Always enable strict mode. It makes TypeScript behave closer to Kotlin/Swift:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,          // enables all strict checks
    "noImplicitAny": true,   // no untyped variables
    "strictNullChecks": true // null/undefined must be explicit
  }
}
```

Expo and React Native projects generate this for you by default.

---

## Primitive Types

```typescript
const name: string = "Alice";
const age: number = 30;          // no Int/Float/Double split — all numbers are `number`
const isActive: boolean = true;
const nothing: null = null;
const notSet: undefined = undefined;
const id: bigint = 9007199254740991n;
const sym: symbol = Symbol("id");
```

**Kotlin comparison:**

| Kotlin | TypeScript |
|--------|-----------|
| `String` | `string` |
| `Int`, `Long`, `Double` | `number` (all) |
| `Boolean` | `boolean` |
| `null` | `null` |
| `Unit` | `void` |
| `Nothing` | `never` |
| `Any` | `any` (avoid!) / `unknown` (safe) |

---

## Interfaces and Type Aliases

TypeScript has two ways to define shapes: `interface` and `type`. Use `interface` for objects that might be extended; `type` for unions and utility types.

```typescript
// Interface — like a Kotlin interface or data class shape
interface User {
    id: string;
    name: string;
    email: string;
    age?: number;  // optional — like Kotlin's Int?
}

// Type alias
type UserId = string;
type Status = 'active' | 'inactive' | 'pending'; // union type — like a Kotlin enum

// Intersection — combine types (like implementing multiple interfaces)
type AdminUser = User & {
    permissions: string[];
};
```

**Kotlin data class comparison:**
```kotlin
data class User(
    val id: String,
    val name: String,
    val email: String,
    val age: Int? = null    // optional
)
```

**Swift struct comparison:**
```swift
struct User {
    let id: String
    let name: String
    let email: String
    var age: Int?
}
```

---

## Union Types — Kotlin Sealed Classes / Swift Enums with Values

TypeScript's **discriminated unions** are the equivalent of Kotlin sealed classes or Swift enums with associated values:

```typescript
// TypeScript discriminated union
type NetworkState =
    | { status: 'loading' }
    | { status: 'success'; data: User }
    | { status: 'error'; message: string };

function renderState(state: NetworkState) {
    switch (state.status) {
        case 'loading':
            return 'Loading...';
        case 'success':
            return `Welcome, ${state.data.name}`; // TypeScript knows .data exists here
        case 'error':
            return `Error: ${state.message}`;     // TypeScript knows .message exists here
    }
}
```

**Kotlin sealed class comparison:**
```kotlin
sealed class NetworkState {
    object Loading : NetworkState()
    data class Success(val data: User) : NetworkState()
    data class Error(val message: String) : NetworkState()
}

fun renderState(state: NetworkState) = when (state) {
    is NetworkState.Loading -> "Loading..."
    is NetworkState.Success -> "Welcome, ${state.data.name}"
    is NetworkState.Error -> "Error: ${state.message}"
}
```

This pattern is used constantly in React Native for loading states, API responses, and navigation parameters.

---

## Generics

```typescript
// Generic function — like Kotlin's <T> generics
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

const firstNumber = first([1, 2, 3]);   // TypeScript infers T = number
const firstString = first(["a", "b"]);  // TypeScript infers T = string

// Generic interface
interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

type UserResponse = ApiResponse<User>;
type UserListResponse = ApiResponse<User[]>;
```

**Kotlin comparison:**
```kotlin
fun <T> first(list: List<T>): T? = list.firstOrNull()

data class ApiResponse<T>(
    val data: T,
    val status: Int,
    val message: String
)
```

---

## Null Safety: `null`, `undefined`, `?.`, `??`

TypeScript with `strictNullChecks` requires you to handle null explicitly — like Kotlin's nullable types:

```typescript
// Without strict: both null and undefined are assignable to any type (dangerous)
// With strict: you must declare nullability

let name: string = "Alice";
// name = null; // Error with strictNullChecks

let maybeName: string | null = null; // Explicitly nullable — like Kotlin's String?
let optionalName: string | undefined = undefined;

// Optional chaining — like Kotlin's ?.
const user: User | null = getUser();
const email = user?.email;        // string | undefined
const city = user?.address?.city; // nested optional chaining

// Nullish coalescing — like Kotlin's ?:
const displayName = user?.name ?? "Anonymous";

// Non-null assertion — like Kotlin's !!  (use sparingly!)
const forcedName = user!.name; // throws at runtime if user is null
```

**Kotlin comparison:**
```kotlin
var maybeName: String? = null
val email = user?.email
val displayName = user?.name ?: "Anonymous"
val forcedName = user!!.name  // throws KotlinNullPointerException if null
```

The patterns are near-identical.

---

## Utility Types

TypeScript has built-in utility types that you'll use constantly in React Native:

```typescript
interface User {
    id: string;
    name: string;
    email: string;
    age: number;
}

// Partial — all fields optional (like a Kotlin copy with named params)
type UserUpdate = Partial<User>;
// { id?: string; name?: string; email?: string; age?: number }

// Required — all fields required
type RequiredUser = Required<UserUpdate>;

// Pick — select specific fields
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string }

// Omit — exclude specific fields
type UserWithoutId = Omit<User, 'id'>;
// { name: string; email: string; age: number }

// Readonly — immutable version (like Kotlin's val for each field)
type ImmutableUser = Readonly<User>;

// Record — key-value map with typed keys and values
type UserMap = Record<string, User>;
// { [key: string]: User }
```

---

## Type Guards (Runtime Type Narrowing)

```typescript
// typeof guard
function processInput(input: string | number) {
    if (typeof input === 'string') {
        return input.toUpperCase(); // TypeScript knows it's string here
    }
    return input.toFixed(2); // TypeScript knows it's number here
}

// instanceof guard
function handleError(error: unknown) {
    if (error instanceof Error) {
        console.log(error.message); // TypeScript knows it has .message
    }
}

// Custom type guard
function isUser(obj: unknown): obj is User {
    return typeof obj === 'object' &&
           obj !== null &&
           'id' in obj &&
           'name' in obj;
}
```

---

## Enums vs Union Types

TypeScript has `enum` but the community prefers **union types** (they're simpler and don't generate extra runtime code):

```typescript
// Avoid: TypeScript enum
enum Direction { Up, Down, Left, Right }

// Prefer: union type (zero runtime overhead)
type Direction = 'Up' | 'Down' | 'Left' | 'Right';

// Or as a const object (gives you the value as a reference too)
const Direction = {
    Up: 'Up',
    Down: 'Down',
    Left: 'Left',
    Right: 'Right',
} as const;
type Direction = typeof Direction[keyof typeof Direction];
```

---

## React Native Type Annotations in Practice

```typescript
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Typing component props
interface ButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    style?: ViewStyle;          // RN's style type for View components
    textStyle?: TextStyle;      // RN's style type for Text components
}

// Typing state
interface AppState {
    users: User[];
    isLoading: boolean;
    error: string | null;
}

// Typing StyleSheet
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    } satisfies ViewStyle,   // `satisfies` checks without widening the type
});
```

---

## Exercises

1. **Define a discriminated union** for an `AuthState` that can be:
   - `unauthenticated`
   - `authenticating` (with an `email: string`)
   - `authenticated` (with a `user: User` and `token: string`)
   - `error` (with `message: string`)

2. **Write a generic `useAsync<T>` type** that represents either loading, success with data `T`, or an error.

3. **Convert this Kotlin data class** to a TypeScript interface with proper nullability:
   ```kotlin
   data class Profile(
       val id: String,
       val displayName: String,
       val avatarUrl: String?,
       val bio: String?,
       val followerCount: Int = 0
   )
   ```

---

## Resources

| Resource | Type | Link |
|---|---|---|
| TypeScript Handbook | Official Docs | [typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html) |
| TypeScript Playground | Interactive | [typescriptlang.org/play](https://www.typescriptlang.org/play/) |
| Total TypeScript (Matt Pocock) | Free tutorials | [totaltypescript.com/tutorials](https://www.totaltypescript.com/tutorials) |
| TypeScript Cheat Sheets | Reference | [typescriptlang.org/cheatsheets](https://www.typescriptlang.org/cheatsheets) |

---

Next → **[React Fundamentals](./react-fundamentals)**
