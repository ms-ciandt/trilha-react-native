---
title: TypeScript for Swift Developers
---

# TypeScript for Swift Developers

> You already think in types. Swift has trained you to never trust an untyped value, to handle optionals explicitly, and to let the compiler catch mistakes before they reach the user. JavaScript does none of that — TypeScript gives it back.

## Why TypeScript Exists

JavaScript has no type system. Any variable can hold any value at any time, and nothing stops you from passing a `string` where a `number` was expected. The error appears at runtime, often in production.

TypeScript is a strict superset of JavaScript: every valid JavaScript file is also valid TypeScript. The TypeScript compiler (`tsc`) type-checks your code and then erases all type annotations, producing plain JavaScript that runs in any engine.

For a Swift developer, the mental model is: TypeScript is the compiler layer that brings the safety guarantees you already rely on.

:::info Swift parallels
TypeScript's role relative to JavaScript is roughly what Swift's type system does relative to Objective-C's `id`-heavy, runtime-crash-prone patterns. The types exist only at compile time and cost nothing at runtime.
:::

---

## Strict Mode — The tsconfig You Should Always Use

By default, TypeScript is lenient to ease JavaScript migration. You want strict mode, which makes it behave the way Swift's type system already does.

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Expo and React Native projects generate a strict `tsconfig.json` by default. Never downgrade it.

| TypeScript strict flag | Swift equivalent |
|---|---|
| `noImplicitAny` | Swift forbids untyped variables entirely |
| `strictNullChecks` | Swift optionals — `nil` must be explicit |
| `strictFunctionTypes` | Swift function parameter variance |
| `noUncheckedIndexedAccess` | Accessing an array index returns `T?` in Swift |

---

## Primitive Types

```typescript
const name: string = "Alice";
const age: number = 30;        // Swift has Int/Double/Float — TS has only `number`
const isActive: boolean = true;
const nothing: null = null;
const notSet: undefined = undefined;
```

| Swift | TypeScript |
|---|---|
| `String` | `string` |
| `Int`, `Double`, `Float` | `number` (all numeric types) |
| `Bool` | `boolean` |
| `nil` | `null` or `undefined` |
| `Void` | `void` |
| `Never` | `never` |
| `Any` | `any` (avoid) / `unknown` (safe) |

:::warning avoid `any`
`any` disables type checking entirely. Use `unknown` when you genuinely do not know the type — it forces you to narrow before use, just like `as? SomeType` in Swift.
:::

---

## Swift Optional `T?` → TypeScript `T | null | undefined`

Swift's optional type `T?` is syntactic sugar for `Optional<T>`. TypeScript splits this into two distinct nullish values.

**Swift**
```swift
var name: String? = nil
let length = name?.count
let display = name ?? "Anonymous"
let forced = name!  // runtime crash if nil — like force-unwrap
```

**TypeScript**
```typescript
let name: string | null = null;
const length = name?.length;           // optional chaining — same ?. syntax
const display = name ?? "Anonymous";   // nullish coalescing — same ?? syntax
const forced = name!;                  // non-null assertion — same ! (avoid it)
```

With `strictNullChecks` enabled, TypeScript behaves almost identically to Swift optionals. Without it, `null` and `undefined` silently pass through every type — which is why strict mode is mandatory.

:::info `null` vs `undefined`
In TypeScript, `null` means "intentionally absent" and `undefined` means "not yet set." In practice, React Native APIs use both. Declare props as `string | undefined` for optional props and `string | null` when a backend field can be explicitly absent.
:::

---

## Swift `struct` and `class` → TypeScript `interface` and `type`

TypeScript does not have value-type structs. Everything is reference-based at runtime. The type annotations, however, map naturally.

**Swift struct**
```swift
struct User {
    let id: String
    let name: String
    let email: String
    var age: Int?
}
```

**TypeScript interface**
```typescript
interface User {
    id: string;
    name: string;
    email: string;
    age?: number;  // ? means the field may be absent (same as Swift's optional property)
}
```

**TypeScript type alias**
```typescript
type UserId = string;
type AdminUser = User & { permissions: string[] };  // intersection — like protocol composition
```

Use `interface` for shapes that might be extended or implemented. Use `type` for unions, intersections, and aliases. For plain data shapes (the most common case in React Native), they are interchangeable.

---

## Swift `enum` → TypeScript Union Types and `const` Objects

Swift enums are first-class types with associated values. TypeScript's built-in `enum` is a second-class citizen that generates unexpected runtime code. The community consensus is to avoid it.

**Swift simple enum**
```swift
enum Direction {
    case up, down, left, right
}
```

**TypeScript string union (preferred)**
```typescript
type Direction = 'up' | 'down' | 'left' | 'right';
```

For cases where you need a stable reference (like Swift's `rawValue`), use a `const` object with `as const`:

**Swift enum with rawValue**
```swift
enum Status: String {
    case active = "active"
    case inactive = "inactive"
    case pending = "pending"
}
```

**TypeScript `as const` pattern**
```typescript
const Status = {
    Active: 'active',
    Inactive: 'inactive',
    Pending: 'pending',
} as const;

type Status = typeof Status[keyof typeof Status];
// type Status = 'active' | 'inactive' | 'pending'
```

`as const` tells TypeScript to infer the narrowest literal types (`'active'` instead of `string`) and makes the object readonly throughout.

---

## Swift `enum` with Associated Values → Discriminated Unions

Swift enums with associated values have a direct TypeScript equivalent: discriminated unions. This pattern is the most important TypeScript pattern in React Native codebases.

**Swift enum with associated values**
```swift
enum NetworkState {
    case loading
    case success(user: User)
    case failure(message: String)
}

switch state {
case .loading:
    showSpinner()
case .success(let user):
    render(user)
case .failure(let message):
    showError(message)
}
```

**TypeScript discriminated union**
```typescript
type NetworkState =
    | { status: 'loading' }
    | { status: 'success'; user: User }
    | { status: 'failure'; message: string };

switch (state.status) {
    case 'loading':
        return showSpinner();
    case 'success':
        return render(state.user);    // TypeScript knows .user exists here
    case 'failure':
        return showError(state.message); // TypeScript knows .message exists here
}
```

The discriminant field (`status` above) plays the role Swift's case name plays. TypeScript narrows the type inside each branch, giving you the same exhaustiveness guarantees as a Swift `switch` — especially with `noImplicitReturns` enabled.

---

## Swift Generics `<T>` → TypeScript Generics

The syntax is nearly identical.

**Swift**
```swift
func first<T>(_ array: [T]) -> T? {
    return array.first
}

struct ApiResponse<T: Codable> {
    let data: T
    let status: Int
    let message: String
}
```

**TypeScript**
```typescript
function first<T>(array: T[]): T | undefined {
    return array[0];
}

interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

type UserResponse = ApiResponse<User>;
type UserListResponse = ApiResponse<User[]>;
```

TypeScript generics support constraints with `extends`:

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}
// Swift equivalent: generic with protocol constraint <T: SomeProtocol>
```

---

## Swift `Codable` → Runtime Validation with Zod

Swift's `Codable` gives you compile-time-guaranteed JSON decoding. TypeScript's type system is erased at runtime — a network response typed as `User` is just an `unknown` object at runtime. TypeScript cannot protect you there.

**Swift**
```swift
struct User: Codable {
    let id: String
    let name: String
    let email: String
}

let user = try JSONDecoder().decode(User.self, from: data)
```

**TypeScript with Zod**
```typescript
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().optional(),
});

type User = z.infer<typeof UserSchema>; // derives the TypeScript type automatically

// Runtime validation — throws if the shape does not match
const user = UserSchema.parse(await response.json());

// Safe version — returns { success, data } or { success, error }
const result = UserSchema.safeParse(await response.json());
if (result.success) {
    console.log(result.data.name);
}
```

:::info Zod is the `Codable` of TypeScript
Zod validates at runtime and derives static types from the schema. This is the closest equivalent to Swift's `Codable` — define once, get both compile-time types and runtime safety.
:::

---

## Utility Types — Swift Equivalents

TypeScript ships built-in generic types that transform existing types. Swift achieves similar results through extensions and protocol conformances, but TypeScript makes them part of the type system itself.

```typescript
interface User {
    id: string;
    name: string;
    email: string;
    age: number;
}

// Partial — all fields optional (like a Swift memberwise init with default nil values)
type UserUpdate = Partial<User>;
// { id?: string; name?: string; email?: string; age?: number }

// Required — all fields required (removes ? from every field)
type StrictUser = Required<UserUpdate>;

// Pick — select specific fields (like a Swift struct with a subset of properties)
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string }

// Omit — exclude fields (complement of Pick)
type NewUser = Omit<User, 'id'>;
// { name: string; email: string; age: number }

// Readonly — all fields immutable (like Swift's `let` for every property)
type ImmutableUser = Readonly<User>;

// Record — typed dictionary (like Swift's [Key: Value])
type UserMap = Record<string, User>;
```

---

## The `satisfies` Operator

`satisfies` validates that a value matches a type without widening the inferred type. It is useful when you want the compiler to check your work but still keep narrow literal types.

**Without `satisfies` — type is widened**
```typescript
const palette: Record<string, string> = {
    primary: '#6366f1',
    secondary: '#818cf8',
};
palette.primary; // type: string (lost the literal)
```

**With `satisfies` — type is preserved**
```typescript
const palette = {
    primary: '#6366f1',
    secondary: '#818cf8',
} satisfies Record<string, string>;

palette.primary; // type: '#6366f1' (literal preserved)
```

In React Native, `satisfies` is useful for `StyleSheet` entries where you want type checking but also want autocomplete on the specific style object:

```typescript
import { StyleSheet, ViewStyle } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    } satisfies ViewStyle,
});
```

---

## `strictNullChecks` in Practice

Without `strictNullChecks`, every type silently accepts `null` and `undefined`. With it enabled (which `strict: true` does), you must handle them explicitly — exactly as Swift forces you to handle optionals.

```typescript
// strictNullChecks: false (dangerous — never use this)
function getLength(s: string): number {
    return s.length; // no error even if s is null at runtime
}

// strictNullChecks: true (correct)
function getLength(s: string | null): number {
    if (s === null) return 0;
    return s.length; // TypeScript knows s is string here
}

// Optional chaining shorthand
function getLength(s: string | null): number {
    return s?.length ?? 0;
}
```

This is isomorphic to Swift's optional handling — the compiler forces you to unwrap before use.

---

## React Native Types in Practice

```typescript
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

// Discriminated union for async state — replace Swift enum with associated values
type AsyncState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: Error };

// Typed navigation params — replace Swift enum routing
type RootStackParams = {
    Home: undefined;
    Profile: { userId: string };
    Settings: { section?: string };
};
```

---

## Exercises

1. Convert this Swift enum to a TypeScript discriminated union:

    ```swift
    enum AuthState {
        case unauthenticated
        case authenticating(email: String)
        case authenticated(user: User, token: String)
        case locked(reason: String, retryAfter: Date)
    }
    ```

2. Write a Zod schema for the following Swift `Codable` struct and derive the TypeScript type from it:

    ```swift
    struct Product: Codable {
        let id: String
        let name: String
        let priceInCents: Int
        let imageURL: URL?
        let tags: [String]
    }
    ```

3. Using utility types, derive `ProductPreview` (only `id` and `name`) and `ProductUpdate` (all fields optional, no `id`) from your `Product` interface.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| TypeScript Handbook | Official docs | [typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html) |
| TypeScript Playground | Interactive | [typescriptlang.org/play](https://www.typescriptlang.org/play/) |
| Zod Documentation | Library docs | [zod.dev](https://zod.dev/) |
| Total TypeScript | Free tutorials | [totaltypescript.com/tutorials](https://www.totaltypescript.com/tutorials) |
