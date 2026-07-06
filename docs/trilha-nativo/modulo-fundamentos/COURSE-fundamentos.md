# Módulo A — Fundamentos (Trilha Nativo)

> Arquivo consolidado com todo o conteúdo do Módulo A para devs Android/iOS.
> Conteúdo individual em arquivos numerados nesta pasta.

---

# Module 1: JS/TS for Native Developers

> You already know how to write software. This module maps JavaScript and TypeScript onto your existing mental model — from a Kotlin or Swift perspective.

## What This Module Covers

| Lesson | What You'll Learn |
|--------|------------------|
| [JS Fundamentals](./js-fundamentals) | Variables, functions, closures, async/await, modules — with Kotlin/Swift parallels |
| [TypeScript for Native Devs](./typescript-for-native-devs) | Type system, interfaces, generics — mapped from Kotlin/Swift types |

## The Mental Shift

Coming from Kotlin or Swift, JavaScript will feel familiar in some ways and strange in others.

### What Transfers Directly

| Kotlin / Swift Concept | JavaScript Equivalent |
|------------------------|----------------------|
| `val` / `let` (immutable) | `const` |
| `var` (mutable) | `let` |
| Lambdas / closures | Arrow functions `() => {}` |
| String interpolation | Template literals `` `Hello ${name}` `` |
| Named parameters (Swift) | Destructuring `{ name, age }` |
| Null safety (`?.`, `!!`) | Optional chaining `?.`, nullish coalescing `??` |
| `suspend fun` / `async` | `async/await` |
| Coroutines / Combine | Promises + async/await (covered in JS Fundamentals) |
| List comprehension | `.map()`, `.filter()`, `.reduce()` |
| Sealed classes | TypeScript discriminated unions |
| Data classes | TypeScript interfaces / type aliases |

### What's Different

| Android/iOS | JavaScript |
|-------------|------------|
| Statically typed | Dynamically typed (TypeScript adds static types on top) |
| Compiled to native bytecode | Interpreted (or AOT-compiled by Hermes) |
| Strict null safety at compile time | Runtime null by default (TypeScript makes it strict) |
| Classes with proper OOP | Prototype-based; classes are syntax sugar |
| Package manager (Gradle/SPM) | npm / yarn / pnpm |
| Single entry point (main/AppDelegate) | Module system — every file can be imported |

:::info TypeScript is your friend
If Kotlin's type system appeals to you (which it should — it's excellent), you'll appreciate TypeScript. Enable **strict mode** (`"strict": true` in `tsconfig.json`) and TypeScript becomes genuinely comparable to Kotlin's type safety.
:::

## Quick Syntax Preview

Here's a quick feel for the three languages side by side:

**Defining a function:**

{% raw %}
```kotlin
// Kotlin
fun greet(name: String): String {
    return "Hello, $name!"
}
```
{% endraw %}

{% raw %}
```swift
// Swift
func greet(name: String) -> String {
    return "Hello, \(name)!"
}
```
{% endraw %}

{% raw %}
```typescript
// TypeScript
function greet(name: string): string {
    return `Hello, ${name}!`;
}
// or as an arrow function:
const greet = (name: string): string => `Hello, ${name}!`;
```
{% endraw %}

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/assets/videos/trilha_nativo_fundamentos-01_js_ts_overview.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

**Next:** [JS Fundamentals →](./js-fundamentals)


---

# JavaScript Fundamentals for Native Developers

> A focused tour of JS — told from the perspective of someone who already writes Kotlin or Swift.

## Variables: `const`, `let`, never `var`

{% raw %}
```typescript
const name = "Alice";       // Kotlin: val name = "Alice"  — immutable binding
let count = 0;              // Kotlin: var count = 0        — mutable binding
count = 1;                  // OK
// name = "Bob";            // Error — const cannot be reassigned
```
{% endraw %}

:::caution Always use const by default
Use `const` for everything. Switch to `let` only when you need to reassign. Never use `var` — it has function-scoped hoisting that causes subtle bugs.
:::

---

## Types: Dynamic by Default, Static with TypeScript

JavaScript is dynamically typed. TypeScript adds a compile-time type layer:

{% raw %}
```typescript
// Plain JS — no type checking
let x = 5;
x = "hello"; // Valid JS, but usually a bug

// TypeScript — type inference
let y = 5;       // TypeScript infers: number
// y = "hello"; // Error: Type 'string' is not assignable to type 'number'

// TypeScript — explicit annotation
let z: number = 5;
```
{% endraw %}

**Kotlin/Swift comparison:**

{% raw %}
```kotlin
// Kotlin
var x: Int = 5
// x = "hello" // compile error
```
{% endraw %}

{% raw %}
```swift
// Swift
var x: Int = 5
// x = "hello" // compile error
```
{% endraw %}

TypeScript with `strict: true` is comparably safe.

---

## Functions: Three Forms

{% raw %}
```typescript
// 1. Function declaration (hoisted — available before its line)
function add(a: number, b: number): number {
    return a + b;
}

// 2. Function expression
const multiply = function(a: number, b: number): number {
    return a * b;
};

// 3. Arrow function (most common in React/RN)
const divide = (a: number, b: number): number => a / b;

// Multi-line arrow function
const greet = (name: string): string => {
    const message = `Hello, ${name}!`;
    return message;
};
```
{% endraw %}

**Kotlin comparison:**
{% raw %}
```kotlin
// Regular function
fun add(a: Int, b: Int): Int = a + b

// Lambda
val multiply: (Int, Int) -> Int = { a, b -> a * b }
```
{% endraw %}

**Swift comparison:**
{% raw %}
```swift
// Regular function
func add(a: Int, b: Int) -> Int { a + b }

// Closure
let multiply: (Int, Int) -> Int = { a, b in a * b }
```
{% endraw %}

---

## Destructuring — JavaScript's Named Parameters

Swift has proper named parameters. Kotlin has data class destructuring. JavaScript/TypeScript has **destructuring**:

{% raw %}
```typescript
// Object destructuring
const user = { name: "Alice", age: 30, city: "NYC" };
const { name, age } = user;
console.log(name); // "Alice"

// With rename
const { name: userName } = user;
console.log(userName); // "Alice"

// With default value
const { city, country = "USA" } = user;
console.log(country); // "USA"

// Function parameters — like Swift named parameters
function createUser({ name, age }: { name: string; age: number }) {
    return `${name} is ${age}`;
}
createUser({ name: "Bob", age: 25 });

// Array destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5];
console.log(first);  // 1
console.log(rest);   // [3, 4, 5]
```
{% endraw %}

**Swift comparison:**
{% raw %}
```swift
// Named parameters
func createUser(name: String, age: Int) -> String {
    return "\(name) is \(age)"
}
createUser(name: "Bob", age: 25)
```
{% endraw %}

---

## Spread Operator & Rest Parameters

{% raw %}
```typescript
// Spread: expand an array or object
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2]; // [1, 2, 3, 4, 5, 6]

// Spread objects (immutable update pattern — used everywhere in React)
const user = { name: "Alice", age: 30 };
const updatedUser = { ...user, age: 31 }; // { name: "Alice", age: 31 }

// Rest parameters (like varargs in Kotlin)
function sum(...numbers: number[]): number {
    return numbers.reduce((acc, n) => acc + n, 0);
}
sum(1, 2, 3, 4); // 10
```
{% endraw %}

---

## Arrays: map, filter, reduce

These are the workhorses of React rendering. You'll use them constantly.

{% raw %}
```typescript
const numbers = [1, 2, 3, 4, 5];

// map — transform each element (like Kotlin's map)
const doubled = numbers.map(n => n * 2);       // [2, 4, 6, 8, 10]

// filter — keep matching elements (like Kotlin's filter)
const evens = numbers.filter(n => n % 2 === 0); // [2, 4]

// reduce — aggregate (like Kotlin's fold)
const total = numbers.reduce((sum, n) => sum + n, 0); // 15

// Chaining (very common in React)
const result = numbers
    .filter(n => n > 2)
    .map(n => n * 10);  // [30, 40, 50]
```
{% endraw %}

**Kotlin comparison:**
{% raw %}
```kotlin
val numbers = listOf(1, 2, 3, 4, 5)
val doubled = numbers.map { it * 2 }
val evens = numbers.filter { it % 2 == 0 }
val total = numbers.fold(0) { acc, n -> acc + n }
```
{% endraw %}

---

## Promises — The Foundation of Async JS

Before `async/await` there were Promises. You'll see them constantly in library code and RN APIs, so you need to recognize them even if you prefer `async/await`.

{% raw %}
```typescript
// A Promise represents a value that will arrive in the future
const promise: Promise<User> = fetchUser('123');

// .then/.catch — the explicit Promise API
fetchUser('123')
    .then(user => {
        console.log(user.name);
        return user.email; // returning from .then chains the next .then
    })
    .then(email => console.log(email))
    .catch(error => console.error('Failed:', error))
    .finally(() => setLoading(false)); // always runs

// Promise.all — wait for multiple in parallel (like async/await + structured concurrency)
const [user, posts] = await Promise.all([
    fetchUser('123'),
    fetchPosts('123'),
]);

// Creating your own Promise (wrapping a callback-based API)
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
await delay(1000); // wait 1 second
```
{% endraw %}

`async/await` is syntax sugar over Promises — the two are interchangeable. Most modern code uses `async/await` but you must recognise `.then()` chains in library source and documentation.

---

## Async/Await — The JS Equivalent of Kotlin Coroutines

{% raw %}
```typescript
// A function that returns a Promise (like Kotlin's suspend fun)
async function fetchUser(id: string): Promise<User> {
    const response = await fetch(`https://api.example.com/users/${id}`);
    const data = await response.json();
    return data as User;
}

// Calling it
async function loadProfile() {
    try {
        const user = await fetchUser("123");
        console.log(user.name);
    } catch (error) {
        console.error("Failed to fetch user:", error);
    }
}
```
{% endraw %}

**Kotlin coroutines comparison:**
{% raw %}
```kotlin
// Kotlin
suspend fun fetchUser(id: String): User {
    val response = httpClient.get("https://api.example.com/users/$id")
    return response.body<User>()
}

suspend fun loadProfile() {
    try {
        val user = fetchUser("123")
        println(user.name)
    } catch (e: Exception) {
        println("Failed: ${e.message}")
    }
}
```
{% endraw %}

The mental model is identical — `async/await` in JS is directly analogous to `suspend fun` in Kotlin.

---

## The JavaScript Thread Model — Critical for Mobile Devs

This is the biggest mental-model shift from native development:

**JavaScript in React Native runs on a single thread.** There is no `Dispatchers.IO`, no `DispatchQueue.global()`, no background thread pool you can spin up from JS.

{% raw %}
```typescript
// This blocks the JS thread — animations stutter, touches drop
function processLargeDataset(data: number[]) {
    // 10,000 synchronous operations — JS can't do anything else while this runs
    return data.map(n => heavyComputation(n));
}

// Better — chunk the work across multiple event loop ticks
async function processInChunks(data: number[]) {
    const CHUNK = 100;
    const results: number[] = [];
    for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        results.push(...chunk.map(n => heavyComputation(n)));
        await delay(0); // yield to the event loop between chunks
    }
    return results;
}
```
{% endraw %}

| Native | React Native JS |
|--------|----------------|
| `Dispatchers.IO` / `DispatchQueue.global()` | Doesn't exist — async/await is still single-threaded |
| `Dispatchers.Main` / `DispatchQueue.main` | The JS thread (only thread) |
| `Thread.sleep()` | `await delay(ms)` (non-blocking) |
| Heavy background work | Worklets (Reanimated), native modules, or `runOnJS` |

:::info Why async/await isn't multi-threaded
`await` suspends the current function and lets other code run — it doesn't move work to another thread. `fetch()` is non-blocking because the actual network I/O happens in a native thread; JS just waits for the result. CPU-heavy work still blocks.
:::

---

## Modules: import/export

Unlike Android's class path system or Swift's module system, JavaScript uses **ES modules**:

{% raw %}
```typescript
// math.ts — named exports
export const PI = 3.14159;
export function add(a: number, b: number) { return a + b; }
export function multiply(a: number, b: number) { return a * b; }

// Default export (one per file)
export default function subtract(a: number, b: number) { return a - b; }
```
{% endraw %}

{% raw %}
```typescript
// app.ts — importing
import subtract from './math';           // default import
import { add, PI } from './math';        // named imports
import { multiply as mult } from './math'; // rename on import
import * as MathUtils from './math';     // import everything as namespace
```
{% endraw %}

---

## Closures — The Key JavaScript Concept

Closures are functions that "remember" the variables from the scope where they were created. This is fundamental to React hooks.

{% raw %}
```typescript
function makeCounter(start: number) {
    let count = start; // this variable is "closed over"

    return {
        increment: () => ++count,
        decrement: () => --count,
        value: () => count,
    };
}

const counter = makeCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.decrement(); // 11
counter.value();     // 11
```
{% endraw %}

In React Native, you'll see closures in event handlers constantly:

{% raw %}
```tsx
function MyButton() {
    const [count, setCount] = useState(0);

    // This function closes over `count` and `setCount`
    const handlePress = () => {
        setCount(count + 1); // `count` from the enclosing scope
    };

    return <Button onPress={handlePress} title={`Pressed ${count} times`} />;
}
```
{% endraw %}

---

## Exercises

1. **Convert this Kotlin to TypeScript:**
   ```kotlin
   data class Product(val name: String, val price: Double, val inStock: Boolean)
   fun filterAffordable(products: List<Product>, maxPrice: Double) =
       products.filter { it.price <= maxPrice && it.inStock }
   ```

2. **Write an async function** that fetches data from `https://jsonplaceholder.typicode.com/todos/1`, extracts the `title` field, and returns it as a string.

3. **Use destructuring** to extract `street`, `city`, and `zip` from this nested object:
   ```typescript
   const person = { name: "Alice", address: { street: "123 Main St", city: "NYC", zip: "10001" } };
   ```

---

## Resources

| Resource | Type | Link |
|---|---|---|
| javascript.info | Interactive Tutorial | [javascript.info](https://javascript.info) |
| MDN JavaScript Reference | Official Docs | [developer.mozilla.org/en-US/docs/Web/JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) |
| Scrimba — Learn JavaScript | Interactive Course | [scrimba.com/learn/learnjavascript](https://scrimba.com/learn/learnjavascript) |
| TypeScript Playground | Interactive | [typescriptlang.org/play](https://www.typescriptlang.org/play/) |

---

Next → **[TypeScript for Native Developers](./typescript-for-native-devs)**


---

# TypeScript for Native Developers

> TypeScript is JavaScript with a type system bolted on. If you like Kotlin's or Swift's type systems, you'll feel at home here — with a few quirks.

## Setting Up: Strict Mode

Always enable strict mode. It makes TypeScript behave closer to Kotlin/Swift:

{% raw %}
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
{% endraw %}

Expo and React Native projects generate this for you by default.

---

## Primitive Types

{% raw %}
```typescript
const name: string = "Alice";
const age: number = 30;          // no Int/Float/Double split — all numbers are `number`
const isActive: boolean = true;
const nothing: null = null;
const notSet: undefined = undefined;
const id: bigint = 9007199254740991n;
const sym: symbol = Symbol("id");
```
{% endraw %}

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

{% raw %}
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
{% endraw %}

**Kotlin data class comparison:**
{% raw %}
```kotlin
data class User(
    val id: String,
    val name: String,
    val email: String,
    val age: Int? = null    // optional
)
```
{% endraw %}

**Swift struct comparison:**
{% raw %}
```swift
struct User {
    let id: String
    let name: String
    let email: String
    var age: Int?
}
```
{% endraw %}

---

## Union Types — Kotlin Sealed Classes / Swift Enums with Values

TypeScript's **discriminated unions** are the equivalent of Kotlin sealed classes or Swift enums with associated values:

{% raw %}
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
{% endraw %}

**Kotlin sealed class comparison:**
{% raw %}
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
{% endraw %}

This pattern is used constantly in React Native for loading states, API responses, and navigation parameters.

---

## Generics

{% raw %}
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
{% endraw %}

**Kotlin comparison:**
{% raw %}
```kotlin
fun <T> first(list: List<T>): T? = list.firstOrNull()

data class ApiResponse<T>(
    val data: T,
    val status: Int,
    val message: String
)
```
{% endraw %}

---

## Null Safety: `null`, `undefined`, `?.`, `??`

TypeScript with `strictNullChecks` requires you to handle null explicitly — like Kotlin's nullable types:

{% raw %}
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
{% endraw %}

**Kotlin comparison:**
{% raw %}
```kotlin
var maybeName: String? = null
val email = user?.email
val displayName = user?.name ?: "Anonymous"
val forcedName = user!!.name  // throws KotlinNullPointerException if null
```
{% endraw %}

The patterns are near-identical.

---

## Utility Types

TypeScript has built-in utility types that you'll use constantly in React Native:

{% raw %}
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
{% endraw %}

---

## Type Guards (Runtime Type Narrowing)

{% raw %}
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
{% endraw %}

---

## Enums vs Union Types

TypeScript has `enum` but the community prefers **union types** (they're simpler and don't generate extra runtime code):

{% raw %}
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
{% endraw %}

---

## React Native Type Annotations in Practice

{% raw %}
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
{% endraw %}

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


---

# Module 2: React Fundamentals for Native Developers

> React is a UI library with one core idea: **your UI is a function of your state**. If you've worked with modern Android (Jetpack Compose) or iOS (SwiftUI), this will click immediately.

## The Declarative Paradigm

**Imperative (Android View system / UIKit):**
{% raw %}
```kotlin
// You tell the system HOW to change the UI step by step
val button = findViewById<Button>(R.id.myButton)
button.text = "Loading..."
button.isEnabled = false
spinner.visibility = View.VISIBLE
```
{% endraw %}

{% raw %}
```swift
// UIKit
button.setTitle("Loading...", for: .normal)
button.isEnabled = false
spinner.startAnimating()
```
{% endraw %}

**Declarative (Compose / SwiftUI / React):**
{% raw %}
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
{% endraw %}

{% raw %}
```tsx
// React — same idea, different syntax
function MyButton({ isLoading }: { isLoading: boolean }) {
    if (isLoading) {
        return <ActivityIndicator />;
    }
    return <Button onPress={() => {}} title="Submit" />;
}
```
{% endraw %}

The mental model: **describe what the UI should look like for a given state, not how to transition to it.** React figures out the diff and updates only what changed — exactly like Compose's recomposition or SwiftUI's view diffing.

---

## Components: The Building Block

A React component is a function that takes **props** and returns **JSX**:

{% raw %}
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
{% endraw %}

**Compose comparison:**
{% raw %}
```kotlin
@Composable
fun Greeting(name: String, age: Int? = null) {
    Column {
        Text("Hello, $name!")
        age?.let { Text("Age: $it") }
    }
}
```
{% endraw %}

Components can be nested, composed, and reused — just like Composables.

---

## JSX — Not HTML, Not XML

JSX looks like HTML/XML but it's **JavaScript syntax sugar** that compiles to function calls:

{% raw %}
```tsx
// JSX (what you write)
const element = <Text style={{ color: 'red' }}>Hello</Text>;

// What it compiles to (what you DON'T write)
const element = React.createElement(Text, { style: { color: 'red' } }, "Hello");
```
{% endraw %}

### JSX Rules

{% raw %}
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
{% endraw %}

---

## Props: Component Inputs

Props are the component's interface — like constructor parameters in a Compose `@Composable` or a SwiftUI `View`.

{% raw %}
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
{% endraw %}

**Props are read-only.** A component can never modify its own props — only the parent can change what it passes down.

---

## State with `useState`

State is data that, when changed, causes the component to re-render. Think of it like `mutableStateOf` in Compose or `@State` in SwiftUI.

{% raw %}
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
{% endraw %}

**Compose comparison:**
{% raw %}
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
{% endraw %}

**SwiftUI comparison:**
{% raw %}
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
{% endraw %}

The mental model is identical across all three — a reactive value that triggers re-render on change.

### Updating State Correctly

{% raw %}
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
{% endraw %}

This immutable update pattern is fundamental to React's change detection.

---

## `useEffect` — Side Effects & Lifecycle

`useEffect` handles side effects — like `LaunchedEffect` in Compose, `onAppear` in SwiftUI, or `onCreate`/`viewDidLoad` in traditional native.

{% raw %}
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
{% endraw %}

### `useEffect` Dependency Array

{% raw %}
```tsx
useEffect(() => { /* runs after EVERY render */ });
useEffect(() => { /* runs ONCE on mount */ }, []);
useEffect(() => { /* runs when dep1 or dep2 changes */ }, [dep1, dep2]);
```
{% endraw %}

| Native Equivalent | useEffect Pattern |
|-------------------|-------------------|
| `onCreate` / `viewDidLoad` | `useEffect(() => {}, [])` |
| `onDestroy` / `deinit` | return cleanup from `useEffect` |
| `onResume` / `viewWillAppear` | Use `useFocusEffect` from React Navigation |
| Observe a value change | `useEffect(() => {}, [theValue])` |

---

## The Component Lifecycle at a Glance

{% raw %}
```
Mount:   render → paint to screen → useEffect([], run once)
Update:  state/prop changes → re-render → paint → useEffect([deps], if deps changed)
Unmount: cleanup from useEffect → component removed
```
{% endraw %}

:::info useEffect runs after paint
Unlike `viewDidLoad` (iOS) or `onCreate` (Android) which run before the view is visible, `useEffect` fires **after** the screen has already painted. This is usually what you want (data fetches, subscriptions). For layout measurements that must happen synchronously before paint, use `useLayoutEffect` — the React Native equivalent of `viewDidLayoutSubviews`.
:::

---

## Lifting State Up

When two sibling components need to share state, move it to their common parent:

{% raw %}
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
{% endraw %}

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


---

# Components & Props in Depth

## Component Composition

React's power comes from composing small, focused components. Each component does one thing well.

{% raw %}
```tsx
// Small, focused components
function Avatar({ uri, size = 40 }: { uri: string; size?: number }) {
    return (
        <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
        />
    );
}

function UserName({ name, isVerified }: { name: string; isVerified: boolean }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontWeight: 'bold' }}>{name}</Text>
            {isVerified && <Text>✓</Text>}
        </View>
    );
}

// Composed into a larger component
function UserCard({ user }: { user: User }) {
    return (
        <View style={styles.card}>
            <Avatar uri={user.avatarUrl} size={48} />
            <UserName name={user.name} isVerified={user.isVerified} />
        </View>
    );
}
```
{% endraw %}

---

## Children Props

The `children` prop lets you build container/wrapper components — like Compose's `content: @Composable () -> Unit` slot:

{% raw %}
```tsx
interface SectionProps {
    title: string;
    children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

// Usage
<Section title="Recent Activity">
    <ActivityItem text="Liked a photo" />
    <ActivityItem text="Posted a comment" />
</Section>
```
{% endraw %}

---

## Prop Drilling vs Context

When you need to pass data through many levels of components, **Context** avoids the "prop drilling" problem — like a Compose `CompositionLocal` or a SwiftUI `@EnvironmentObject`:

{% raw %}
```tsx
import { createContext, useContext, useState } from 'react';

// 1. Create context
interface ThemeContextType {
    isDark: boolean;
    toggle: () => void;
}
const ThemeContext = createContext<ThemeContextType | null>(null);

// 2. Provide it at the top of your tree
function App() {
    const [isDark, setIsDark] = useState(false);

    return (
        <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(d => !d) }}>
            <NavigationContainer>
                <MainStack />
            </NavigationContainer>
        </ThemeContext.Provider>
    );
}

// 3. Consume anywhere in the tree — no prop passing needed
function ThemedButton() {
    const theme = useContext(ThemeContext);
    if (!theme) throw new Error('ThemedButton must be inside ThemeContext.Provider');

    return (
        <Pressable
            onPress={theme.toggle}
            style={{ backgroundColor: theme.isDark ? '#333' : '#fff' }}
        >
            <Text>Toggle Theme</Text>
        </Pressable>
    );
}
```
{% endraw %}

---

## Rendering Lists

Instead of `RecyclerView` (Android) or `UITableView/UICollectionView` (iOS), React Native uses `FlatList`:

{% raw %}
```tsx
interface Item { id: string; title: string; }

const DATA: Item[] = [
    { id: '1', title: 'First Item' },
    { id: '2', title: 'Second Item' },
    { id: '3', title: 'Third Item' },
];

function ItemRow({ item }: { item: Item }) {
    return (
        <View style={styles.row}>
            <Text>{item.title}</Text>
        </View>
    );
}

function MyList() {
    return (
        <FlatList
            data={DATA}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ItemRow item={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
    );
}
```
{% endraw %}

`FlatList` is lazy — like `RecyclerView`, it only renders items visible on screen.

---

## Conditional Rendering Patterns

{% raw %}
```tsx
// Pattern 1: Early return (cleanest for loading/error states)
function UserScreen({ userId }: { userId: string }) {
    const { user, loading, error } = useUser(userId);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorView message={error} />;
    if (!user) return <EmptyState />;

    return <UserProfile user={user} />;
}

// Pattern 2: Ternary (for inline two-branch)
<Text>{isOnline ? '🟢 Online' : '🔴 Offline'}</Text>

// Pattern 3: && (for optional content)
{errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

// Pattern 4: Switch (for multiple mutually exclusive states)
function StatusBadge({ status }: { status: 'pending' | 'active' | 'closed' }) {
    const config = {
        pending: { color: '#f59e0b', label: 'Pending' },
        active:  { color: '#10b981', label: 'Active' },
        closed:  { color: '#6b7280', label: 'Closed' },
    }[status];

    return (
        <View style={[styles.badge, { backgroundColor: config.color }]}>
            <Text style={styles.badgeText}>{config.label}</Text>
        </View>
    );
}
```
{% endraw %}

---

## Key Prop for Lists

When rendering arrays, React needs a stable `key` to track which items changed:

{% raw %}
```tsx
// BAD — using array index as key (causes bugs when list reorders)
{users.map((user, index) => <UserRow key={index} user={user} />)}

// GOOD — use a stable unique identifier
{users.map(user => <UserRow key={user.id} user={user} />)}
```
{% endraw %}

---

## `React.memo` — Preventing Unnecessary Re-renders

By default, a child component re-renders whenever its parent re-renders — even if its own props haven't changed. `React.memo` wraps a component and skips the re-render when props are shallowly equal.

{% raw %}
```tsx
// Without memo — re-renders on every parent render, even if user is the same
function UserRow({ user }: { user: User }) {
    return <Text>{user.name}</Text>;
}

// With memo — skips re-render when user reference hasn't changed
const UserRow = React.memo(function UserRow({ user }: { user: User }) {
    return <Text>{user.name}</Text>;
});
```
{% endraw %}

`React.memo` pairs with `useCallback` — both are needed for a FlatList row to truly avoid unnecessary re-renders:

{% raw %}
```tsx
function UserList() {
    const [users, setUsers] = useState<User[]>([]);

    // stable function reference across parent renders
    const handlePress = useCallback((id: string) => {
        router.push(`/user/${id}`);
    }, []);

    return (
        <FlatList
            data={users}
            keyExtractor={u => u.id}
            renderItem={({ item }) => (
                <UserRow user={item} onPress={handlePress} />
            )}
        />
    );
}

const UserRow = React.memo(function UserRow({
    user,
    onPress,
}: {
    user: User;
    onPress: (id: string) => void;
}) {
    return (
        <Pressable onPress={() => onPress(user.id)}>
            <Text>{user.name}</Text>
        </Pressable>
    );
});
```
{% endraw %}

**Kotlin/Compose parallel:** `React.memo` is analogous to Compose's stable parameter system — a composable with stable inputs skips recomposition when they haven't changed.

:::caution Don't over-apply memo
Profile before you memoize. For cheap components or short lists the memo comparison overhead can exceed the render cost it avoids.
:::

---

## Exercises

1. **Build a `TagList` component** that takes `tags: string[]` and renders each as a colored pill badge. Make the color configurable via props.

2. **Convert this imperative Android code** to a declarative React Native component:
   ```kotlin
   // Android: show/hide a "Pro" badge based on user tier
   if (user.tier == "pro") {
       proBadge.visibility = View.VISIBLE
       proBadge.text = "PRO"
   } else {
       proBadge.visibility = View.GONE
   }
   ```

3. **Build a `Section` wrapper** (as shown above) and use it to group a list of items under a title, with a "See all" button that triggers a callback.

---

Next → **[State & Hooks in Depth](./state-and-hooks)**


---

# State & Hooks in Depth

> Hooks are how React function components manage state, side effects, performance, and shared logic. They replace class lifecycle methods and ViewModels.

## Rules of Hooks

Before anything else — hooks have two hard rules:

1. **Only call hooks at the top level** — not inside loops, conditions, or nested functions
2. **Only call hooks from React components** (or other hooks)

{% raw %}
```tsx
// WRONG
function MyComponent({ show }: { show: boolean }) {
    if (show) {
        const [value, setValue] = useState(0); // ERROR — conditional hook
    }
}

// CORRECT
function MyComponent({ show }: { show: boolean }) {
    const [value, setValue] = useState(0); // always at top level
    if (!show) return null;
    return <Text>{value}</Text>;
}
```
{% endraw %}

---

## `useState` — Reactive State

{% raw %}
```tsx
// Simple value
const [count, setCount] = useState(0);

// Object state
const [form, setForm] = useState({ email: '', password: '' });
// Update one field immutably
const updateEmail = (email: string) => setForm(prev => ({ ...prev, email }));

// Functional update (when new state depends on previous)
const increment = () => setCount(prev => prev + 1);
// Use the functional form when the new value depends on the old one
// — avoids stale closure bugs in async code
```
{% endraw %}

---

## `useEffect` — Side Effects

Covered in React Fundamentals. Key patterns:

{% raw %}
```tsx
// Data fetching on mount
useEffect(() => {
    fetchData().then(setData);
}, []);

// Subscription with cleanup
useEffect(() => {
    const subscription = eventEmitter.addListener('event', handler);
    return () => subscription.remove(); // cleanup on unmount
}, []);

// Derived effect when a value changes (e.g. update navigation header title)
useEffect(() => {
    navigation.setOptions({ title: `Count: ${count}` });
}, [count]);
```
{% endraw %}

---

## `useReducer` — Complex State Logic

When state transitions get complex — multiple related values, state that depends on the previous state, or many different actions — `useReducer` is cleaner than several `useState` calls.

{% raw %}
```tsx
import { useReducer } from 'react';

// Define state shape and all possible actions
interface AuthState {
    status: 'idle' | 'loading' | 'success' | 'error';
    user: User | null;
    error: string | null;
}

type AuthAction =
    | { type: 'LOGIN_START' }
    | { type: 'LOGIN_SUCCESS'; user: User }
    | { type: 'LOGIN_ERROR'; message: string }
    | { type: 'LOGOUT' };

// Pure reducer function — same concept as in Android MVI or Redux
function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'LOGIN_START':
            return { ...state, status: 'loading', error: null };
        case 'LOGIN_SUCCESS':
            return { status: 'success', user: action.user, error: null };
        case 'LOGIN_ERROR':
            return { ...state, status: 'error', error: action.message };
        case 'LOGOUT':
            return { status: 'idle', user: null, error: null };
    }
}

const initialState: AuthState = { status: 'idle', user: null, error: null };

function LoginScreen() {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const handleLogin = async (email: string, password: string) => {
        dispatch({ type: 'LOGIN_START' });
        try {
            const user = await login(email, password);
            dispatch({ type: 'LOGIN_SUCCESS', user });
        } catch (e) {
            dispatch({ type: 'LOGIN_ERROR', message: (e as Error).message });
        }
    };

    if (state.status === 'loading') return <ActivityIndicator />;
    if (state.status === 'error') return <Text>{state.error}</Text>;
    return <Button title="Login" onPress={() => handleLogin('a@b.com', 'pw')} />;
}
```
{% endraw %}

**Native parallels:**

| Native | `useReducer` |
|--------|-------------|
| Android MVI `reduce(state, intent)` | `authReducer(state, action)` |
| Swift Composable Architecture `Reducer` | Same pattern, different naming |
| Redux reducer | Identical concept |

**`useState` vs `useReducer`:**

- Use `useState` for independent simple values
- Use `useReducer` when multiple state fields change together or transitions need to be explicit and testable

---

## `useRef` — Mutable Values Without Re-render

`useRef` is like a mutable container that survives renders without triggering one. Think of it as an instance variable on a Compose `remember` — it persists across recompositions but changing it doesn't cause one.

{% raw %}
```tsx
import { useRef, useEffect } from 'react';
import { TextInput } from 'react-native';

function SearchBar() {
    // Ref to a DOM/native node — like findViewById in Android
    const inputRef = useRef<TextInput>(null);

    // Ref to a mutable value (like an instance variable)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Auto-focus on mount — like input.requestFocus() in Android
        inputRef.current?.focus();
    }, []);

    const handleChange = (text: string) => {
        // Debounce without triggering a re-render on each keystroke
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            performSearch(text);
        }, 300);
    };

    return <TextInput ref={inputRef} onChangeText={handleChange} />;
}
```
{% endraw %}

---

## `useMemo` — Expensive Computations

`useMemo` caches a computed value. Only recompute when dependencies change. Like Compose's `remember(key) { ... }`:

{% raw %}
```tsx
import { useMemo } from 'react';

function ProductList({ products, filterText }: Props) {
    // Only recomputes when products or filterText changes
    const filteredProducts = useMemo(() => {
        return products
            .filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()))
            .sort((a, b) => a.price - b.price);
    }, [products, filterText]);

    return <FlatList data={filteredProducts} renderItem={...} />;
}
```
{% endraw %}

Don't over-optimize with `useMemo` — only use it for genuinely expensive operations.

---

## `useCallback` — Stable Function References

`useCallback` memoizes a function. Prevents child components from re-rendering unnecessarily when a callback hasn't actually changed:

{% raw %}
```tsx
import { useCallback } from 'react';

function ParentList() {
    const [items, setItems] = useState(['a', 'b', 'c']);

    // Without useCallback: new function reference on every render
    // → FlatList's renderItem would re-render every row
    const handleDelete = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item !== id));
    }, []); // empty deps — function never changes

    return (
        <FlatList
            data={items}
            keyExtractor={item => item}
            renderItem={({ item }) => (
                <ItemRow item={item} onDelete={handleDelete} />
            )}
        />
    );
}
```
{% endraw %}

---

## Custom Hooks — Reusable Logic

You can extract stateful logic into your own hooks. Naming convention: **must start with `use`**.

{% raw %}
```tsx
// useLocalStorage-like hook for React Native (using AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

function usePersistedState<T>(key: string, initialValue: T) {
    const [value, setValue] = useState<T>(initialValue);

    useEffect(() => {
        AsyncStorage.getItem(key).then(stored => {
            if (stored !== null) {
                try {
                    setValue(JSON.parse(stored));
                } catch {
                    // corrupted storage — discard and keep initialValue
                    AsyncStorage.removeItem(key);
                }
            }
        });
    }, [key]);

    const setPersistedValue = (newValue: T) => {
        setValue(newValue);
        AsyncStorage.setItem(key, JSON.stringify(newValue));
    };

    return [value, setPersistedValue] as const;
}

// Usage — just like useState, but persisted across app restarts
function SettingsScreen() {
    const [isDark, setIsDark] = usePersistedState('theme', false);
    return <Switch value={isDark} onValueChange={setIsDark} />;
}
```
{% endraw %}

Custom hooks are the equivalent of a Kotlin extension function on a ViewModel, or a SwiftUI view modifier — reusable logic that any component can plug in.

---

## Hook Comparison Table

| Hook | Native Equivalent | When to Use |
|------|------------------|-------------|
| `useState` | `mutableStateOf` / `@State` | Any reactive value |
| `useEffect` | `LaunchedEffect` / `onAppear` + `onDisappear` | Side effects, subscriptions, data fetching |
| `useRef` | Instance variable / `remember { ... }` without `State` | Mutable non-reactive values, native node refs |
| `useMemo` | `remember(key) { ... }` | Expensive derived values |
| `useCallback` | N/A (Compose uses stable lambdas) | Stable function references for child components |
| `useContext` | `CompositionLocal` / `@EnvironmentObject` | Cross-tree data (theme, auth, locale) |
| Custom hook | Extension on ViewModel / ViewModifier | Reusable stateful logic |

---

## Exercises

1. **Build a `useDebounce` hook** that takes a value and a delay, and returns the debounced value (only updates after the delay passes without another change).

2. **Build a `useFetch<T>` hook** that takes a URL and returns `{ data: T | null, loading: boolean, error: string | null }`.

3. **Identify the bug** in this code and fix it:
   ```tsx
   function Timer() {
       const [seconds, setSeconds] = useState(0);
       useEffect(() => {
           const interval = setInterval(() => {
               setSeconds(seconds + 1); // bug here
           }, 1000);
           return () => clearInterval(interval);
       }, []);
       return <Text>{seconds}</Text>;
   }
   ```

---

## Resources

| Resource | Type | Link |
|---|---|---|
| react.dev — Hooks Reference | Official Docs | [react.dev/reference/react](https://react.dev/reference/react) |
| react.dev — Escape Hatches (useRef, useEffect) | Official Docs | [react.dev/learn/escape-hatches](https://react.dev/learn/escape-hatches) |
| usehooks.com | Community Hooks | [usehooks.com](https://usehooks.com/) |

---

Next → **[React Native Core Components](./rn-core-components)**


---

# Module 3: React Native Core Components

> React Native ships with a set of built-in components that map directly to native platform views. There is no HTML here — every component renders actual native UI.

## The Fundamental Mapping

| Web HTML | Android | iOS | React Native |
|----------|---------|-----|--------------|
| `<div>` | `ViewGroup` / `FrameLayout` | `UIView` | `<View>` |
| `<p>`, `<span>`, `<h1>` | `TextView` | `UILabel` | `<Text>` |
| `<img>` | `ImageView` | `UIImageView` | `<Image>` |
| `<input>` | `EditText` | `UITextField` | `<TextInput>` |
| `<button>` | `Button` | `UIButton` | `<Button>` / `<Pressable>` |
| `<ul>` + `<li>` | `RecyclerView` | `UITableView` | `<FlatList>` / `<SectionList>` |
| `<ScrollView>` | `ScrollView` | `UIScrollView` | `<ScrollView>` |
| `<select>` | `Spinner` | `UIPickerView` | `<Picker>` (community) |

---

## `<View>` — The Universal Container

`View` is the fundamental building block. It renders as a `ViewGroup` on Android and `UIView` on iOS:

{% raw %}
```tsx
import { View, StyleSheet } from 'react-native';

function Card() {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                {/* header content */}
            </View>
            <View style={styles.body}>
                {/* body content */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        elevation: 3, // Android shadow
    },
    header: { padding: 16 },
    body: { padding: 16, paddingTop: 0 },
});
```
{% endraw %}

---

## `<Text>` — All Text Must Be Wrapped

Unlike web HTML where text can float freely, **in React Native all text must be inside `<Text>`**:

{% raw %}
```tsx
// ERROR: raw text outside Text
<View>
    Hello World  {/* This will crash */}
</View>

// CORRECT
<View>
    <Text>Hello World</Text>
</View>
```
{% endraw %}

Text features:
{% raw %}
```tsx
<Text
    style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}
    numberOfLines={2}           // Truncate after 2 lines (like ellipsize in Android)
    ellipsizeMode="tail"        // "tail" | "head" | "middle" | "clip"
    selectable={true}           // Allow text selection
    onPress={() => {}}          // Text can be tappable
>
    This is some long text that will be truncated after two lines.
</Text>

{/* Nested Text — inline styling */}
<Text>
    Normal text <Text style={{ fontWeight: 'bold' }}>bold part</Text> normal again
</Text>
```
{% endraw %}

---

## `<Image>` — Local and Remote Images

{% raw %}
```tsx
import { Image } from 'react-native';

// Remote image
<Image
    source={{ uri: 'https://example.com/photo.jpg' }}
    style={{ width: 200, height: 200, borderRadius: 100 }}
    resizeMode="cover"  // "cover" | "contain" | "stretch" | "center"
/>

// Local image (require resolves at build time — like drawable resources)
<Image
    source={require('./assets/logo.png')}
    style={{ width: 100, height: 40 }}
/>
```
{% endraw %}

:::tip Use Expo Image for production
For better performance (caching, transitions, blur hash placeholders), use `expo-image`:
{% raw %}
```tsx
import { Image } from 'expo-image';
<Image source="https://..." style={{ width: 200, height: 200 }} contentFit="cover" />
```
{% endraw %}
:::

---

## `<TextInput>` — User Input

Like `EditText` (Android) or `UITextField`/`UITextView` (iOS):

{% raw %}
```tsx
import { useState } from 'react';
import { TextInput, View } from 'react-native';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <View>
            <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"     // Shows email keyboard
                autoCapitalize="none"
                autoComplete="email"
            />
            <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={true}            // Password field
                returnKeyType="done"              // Keyboard return key label
                onSubmitEditing={() => login()}   // Called when return key pressed
            />
        </View>
    );
}
```
{% endraw %}

---

## `<Pressable>` — Tappable Areas

Prefer `Pressable` over `TouchableOpacity` for new code (it's the modern API):

{% raw %}
```tsx
import { Pressable } from 'react-native';

<Pressable
    onPress={() => console.log('pressed')}
    onLongPress={() => console.log('long press')}
    style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed, // visual feedback
    ]}
>
    {({ pressed }) => (
        <Text style={pressed ? styles.textPressed : styles.text}>
            Press me
        </Text>
    )}
</Pressable>
```
{% endraw %}

---

## `<FlatList>` — Virtualized Lists

The equivalent of `RecyclerView` (Android) or `UITableView` (iOS) — only renders visible items:

{% raw %}
```tsx
import { FlatList } from 'react-native';

interface Post { id: string; title: string; body: string; }

function PostFeed({ posts }: { posts: Post[] }) {
    return (
        <FlatList
            data={posts}
            keyExtractor={post => post.id}
            renderItem={({ item }) => <PostCard post={item} />}

            // Performance props
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}

            // Pull-to-refresh (like SwipeRefreshLayout in Android)
            refreshing={isRefreshing}
            onRefresh={handleRefresh}

            // Load more on scroll
            onEndReached={loadMore}
            onEndReachedThreshold={0.5} // trigger when 50% from bottom

            // Empty state
            ListEmptyComponent={<EmptyFeed />}

            // Header / Footer
            ListHeaderComponent={<FeedHeader />}
            ListFooterComponent={isLoadingMore ? <ActivityIndicator /> : null}
        />
    );
}
```
{% endraw %}

---

## `<ScrollView>` vs `<FlatList>`

| | `ScrollView` | `FlatList` |
|---|---|---|
| Renders all children | Yes (immediately) | No (lazy/virtualized) |
| Good for | Short content, forms, detail screens | Long dynamic lists |
| Performance with 1000+ items | Bad | Good |
| Pull-to-refresh | Via `RefreshControl` | Built-in `refreshing` prop |

---

## `<SafeAreaView>` — Handling Notches and Home Indicators

Essential for iPhone notches and Android nav bars:

{% raw %}
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

function Screen() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            {/* Content is inset away from notch/home indicator */}
        </SafeAreaView>
    );
}
```
{% endraw %}

:::tip Use react-native-safe-area-context
The built-in `SafeAreaView` from React Native only works on iOS. Use the community `react-native-safe-area-context` package for consistent cross-platform behavior.
:::

---

## `<Modal>` — Overlays

{% raw %}
```tsx
import { Modal } from 'react-native';

function ConfirmDialog({ visible, onConfirm, onCancel }: Props) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"    // "none" | "slide" | "fade"
            onRequestClose={onCancel} // Android back button
        >
            <View style={styles.backdrop}>
                <View style={styles.dialog}>
                    <Text>Are you sure?</Text>
                    <Button title="Yes" onPress={onConfirm} />
                    <Button title="No" onPress={onCancel} />
                </View>
            </View>
        </Modal>
    );
}
```
{% endraw %}

---

## `<KeyboardAvoidingView>` — Prevent the Keyboard from Covering Inputs

One of the most common first-day RN problems: the software keyboard slides up and covers a text input. `KeyboardAvoidingView` shifts the layout to keep inputs visible.

{% raw %}
```tsx
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

function LoginScreen() {
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView keyboardShouldPersistTaps="handled">
                <TextInput placeholder="Email" keyboardType="email-address" />
                <TextInput placeholder="Password" secureTextEntry />
                <Button title="Login" onPress={handleLogin} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
```
{% endraw %}

The `behavior` prop differs by platform — this is one of the clearest examples of RN's cross-platform reality:

| Platform | `behavior` | What it does |
|----------|-----------|--------------|
| iOS | `'padding'` | Adds padding below content to push it up |
| Android | `'height'` | Reduces the view height to fit above keyboard |

`keyboardShouldPersistTaps="handled"` on the `ScrollView` ensures tapping a button while the keyboard is open fires the button's `onPress` rather than just dismissing the keyboard.

:::tip
If `KeyboardAvoidingView` still isn't enough, `react-native-keyboard-controller` gives you more control with smooth animations tied to the keyboard frame.
:::

---

## `<ActivityIndicator>` — Loading Spinner

{% raw %}
```tsx
<ActivityIndicator
    size="large"          // "small" | "large" | number
    color="#0064d2"
    animating={isLoading}  // show/hide without unmounting
/>
```
{% endraw %}

---

## Exercises

1. **Build a `UserCard`** that displays a remote avatar image, a name, and an optional "verified" badge. Use `<Image>`, `<Text>`, and `<View>`. Add a `<Pressable>` wrapper that logs the user's name when tapped.

2. **Build a settings screen** with three `TextInput` fields (username, email, bio). Wire them all to state. Add a "Save" button that is disabled until all three fields are non-empty.

3. **Build a paginated list** using `FlatList` with `onEndReached`. Start with 10 items. Each time the user scrolls to the bottom, append 10 more. Show an `ActivityIndicator` in `ListFooterComponent` while loading.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| RN Core Components | Official Docs | [reactnative.dev/docs/components-and-apis](https://reactnative.dev/docs/components-and-apis) |
| expo-image | Expo Docs | [docs.expo.dev/versions/latest/sdk/image/](https://docs.expo.dev/versions/latest/sdk/image/) |
| react-native-safe-area-context | Community | [github.com/AppAndFlow/react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context) |

---

Next → **[Layout & Flexbox](./layout-and-flexbox)**


---

# Layout & Flexbox in React Native

> React Native uses Flexbox for all layout — the same model as CSS Flexbox, with a few RN-specific defaults.

## Key Differences from Web CSS Flexbox

| Property | Web CSS default | React Native default |
|----------|----------------|---------------------|
| `flexDirection` | `row` | **`column`** |
| `alignContent` | `stretch` | `flex-start` |
| Units | `px`, `%`, `em`, etc. | **Unitless numbers** (density-independent pixels) |
| `flex` shorthand | `flex: 1 1 auto` | **`flex: N` only** (grows/shrinks equally) |
| Position | `static` | `relative` |

The biggest gotcha: **`flexDirection` defaults to `column`** in RN. Content stacks vertically by default.

---

## The Mental Model

Think of every `View` as a **flex container**. The `style` prop is how you configure it.

{% raw %}
```tsx
// This is a vertical stack (column is default)
<View style={{ flex: 1 }}>
    <View style={{ height: 60, backgroundColor: 'red' }} />
    <View style={{ flex: 1, backgroundColor: 'green' }} />  {/* takes remaining space */}
    <View style={{ height: 60, backgroundColor: 'blue' }} />
</View>
```
{% endraw %}

---

## Core Flexbox Properties

### `flexDirection`

{% raw %}
```tsx
// Column (default) — children stack top to bottom
<View style={{ flexDirection: 'column' }}>

// Row — children sit left to right
<View style={{ flexDirection: 'row' }}>

// Reverse variants
<View style={{ flexDirection: 'column-reverse' }}>
<View style={{ flexDirection: 'row-reverse' }}>
```
{% endraw %}

### `justifyContent` — Main Axis Alignment

{% raw %}
```tsx
// Along flexDirection axis (vertical for column, horizontal for row)
<View style={{ justifyContent: 'flex-start' }}>  {/* default */}
<View style={{ justifyContent: 'flex-end' }}>
<View style={{ justifyContent: 'center' }}>
<View style={{ justifyContent: 'space-between' }}>
<View style={{ justifyContent: 'space-around' }}>
<View style={{ justifyContent: 'space-evenly' }}>
```
{% endraw %}

### `alignItems` — Cross Axis Alignment

{% raw %}
```tsx
// Perpendicular to flexDirection
<View style={{ alignItems: 'flex-start' }}>
<View style={{ alignItems: 'flex-end' }}>
<View style={{ alignItems: 'center' }}>
<View style={{ alignItems: 'stretch' }}>  {/* default */}
<View style={{ alignItems: 'baseline' }}>
```
{% endraw %}

### Center Something (The Classic)

{% raw %}
```tsx
// Center a child horizontally and vertically — the most common layout pattern
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Centered Content</Text>
</View>
```
{% endraw %}

**Kotlin/Android comparison:**
{% raw %}
```xml
<!-- ConstraintLayout or Gravity -->
<FrameLayout android:layout_gravity="center" />
<LinearLayout android:gravity="center" />
```
{% endraw %}

**SwiftUI comparison:**
{% raw %}
```swift
// Idiomatic SwiftUI centering
ZStack {
    Text("Centered")
}
.frame(maxWidth: .infinity, maxHeight: .infinity)
```
{% endraw %}

---

## `flex` — Proportional Space

{% raw %}
```tsx
// flex: N — take N proportional shares of available space
<View style={{ flexDirection: 'row', height: 100 }}>
    <View style={{ flex: 1, backgroundColor: 'red' }} />   {/* 1/3 */}
    <View style={{ flex: 2, backgroundColor: 'green' }} /> {/* 2/3 */}
</View>

// flex: 1 on a child of a Screen — fill all available space
<View style={{ flex: 1 }}>
    {/* This fills the entire screen */}
</View>
```
{% endraw %}

---

## Spacing: `margin` and `padding`

{% raw %}
```tsx
// Individual sides
<View style={{
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 12,
    marginRight: 12,
    paddingHorizontal: 16,  // shorthand for paddingLeft + paddingRight
    paddingVertical: 8,     // shorthand for paddingTop + paddingBottom
    padding: 16,            // all sides
    margin: 8,
}} />

// The RN naming is the same as Android's XML attributes
// marginTop == android:layout_marginTop
// paddingHorizontal has no direct Android XML equivalent (use paddingLeft+paddingRight)
```
{% endraw %}

---

## `position: 'absolute'`

For overlays, badges, and elements that float outside the normal flow:

{% raw %}
```tsx
// Parent needs position: 'relative' (the default)
<View style={{ width: 60, height: 60 }}>
    <Image source={{ uri: avatarUrl }} style={{ width: 60, height: 60, borderRadius: 30 }} />
    {/* Badge in top-right corner */}
    <View style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'red',
    }} />
</View>
```
{% endraw %}

---

## Responsive Sizing with `Dimensions`

{% raw %}
```tsx
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    halfScreen: {
        width: width / 2,
        height: height * 0.3,
    },
});
```
{% endraw %}

:::caution Stale on orientation change
`Dimensions.get('window')` captures the value once at module load. If the user rotates their device the value stays stale. Use `useWindowDimensions` instead for anything that should respond to rotation.
:::

For dynamic responsive layouts (handles rotation/orientation changes), use `useWindowDimensions`:

{% raw %}
```tsx
import { useWindowDimensions } from 'react-native';

function ResponsiveCard() {
    const { width } = useWindowDimensions();
    const columns = width > 600 ? 3 : 2; // tablet vs phone layout
    // ...
}
```
{% endraw %}

---

## `StyleSheet.create` vs Inline Styles

{% raw %}
```tsx
// Inline styles — convenient but slightly slower (no optimization)
<View style={{ flex: 1, backgroundColor: 'red' }} />

// StyleSheet.create — preferred (validated, optimized, autocomplete)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
<View style={styles.container} />

// Combining styles (like applying multiple Android XML attributes)
<View style={[styles.container, styles.padded, { marginTop: 8 }]} />
```
{% endraw %}

---

## `gap` — Spacing Between Children

Since React Native 0.71, you can use `gap`, `rowGap`, and `columnGap` instead of adding margin to every child:

{% raw %}
```tsx
// Before gap — manual margin on all-but-last child
<View style={{ flexDirection: 'row' }}>
    <View style={{ marginRight: 8 }} />
    <View style={{ marginRight: 8 }} />
    <View /> {/* no margin on last */}
</View>

// After gap — clean and correct
<View style={{ flexDirection: 'row', gap: 8 }}>
    <View />
    <View />
    <View />
</View>

// rowGap / columnGap for grid-like layouts
<View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 8 }}>
    {items.map(item => <Card key={item.id} />)}
</View>
```
{% endraw %}

**SwiftUI parallel:** `spacing:` parameter on `HStack`/`VStack`. **Compose parallel:** `Arrangement.spacedBy(8.dp)`.

---

## Practice: Flexbox Froggy

The best way to internalize Flexbox is through play. Since RN uses the same flexbox model as CSS:

🐸 **[Play Flexbox Froggy](https://flexboxfroggy.com/)** — 24 levels that teach every flexbox property through an interactive game.

---

## Common Layout Patterns

{% raw %}
```tsx
// Navigation bar with title and action button
<View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
    <Text style={{ flex: 1, fontSize: 18, fontWeight: 'bold' }}>Title</Text>
    <Pressable onPress={handleAction}>
        <Text>Action</Text>
    </Pressable>
</View>

// Card with image on left, text on right
<View style={{ flexDirection: 'row', padding: 12 }}>
    <Image style={{ width: 60, height: 60 }} source={{ uri: '...' }} />
    <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: 'bold' }}>Title</Text>
        <Text numberOfLines={2}>Description...</Text>
    </View>
</View>

// Bottom-pinned button (common screen pattern)
<View style={{ flex: 1 }}>
    <ScrollView style={{ flex: 1 }}>
        {/* scrollable content */}
    </ScrollView>
    <View style={{ padding: 16 }}>
        <Button title="Continue" onPress={handleContinue} />
    </View>
</View>
```
{% endraw %}

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Flexbox Froggy | Interactive Game | [flexboxfroggy.com](https://flexboxfroggy.com/) |
| RN Layout with Flexbox | Official Docs | [reactnative.dev/docs/flexbox](https://reactnative.dev/docs/flexbox) |
| RN Layout Props | Official Docs | [reactnative.dev/docs/layout-props](https://reactnative.dev/docs/layout-props) |
| Yoga (the layout engine RN uses) | Reference | [yogalayout.dev](https://yogalayout.dev/) |

---

Next → **[Styling in React Native](./styling)**


---

# Styling in React Native

> React Native uses JavaScript objects for styling — no CSS files, no class names. But the properties are familiar if you know CSS or Android XML.

## How Styling Works

{% raw %}
```tsx
// Every component accepts a `style` prop
// Styles are plain JS objects (or arrays of objects)
<View style={{ backgroundColor: '#fff', padding: 16 }}>
    <Text style={{ fontSize: 16, color: '#333' }}>Hello</Text>
</View>
```
{% endraw %}

Property names are **camelCase** (like JavaScript, not kebab-case like CSS):

| CSS / Android XML | React Native |
|-------------------|--------------|
| `background-color` / `android:background` | `backgroundColor` |
| `font-size` / `android:textSize` | `fontSize` |
| `border-radius` | `borderRadius` |
| `padding-horizontal` | `paddingHorizontal` |
| `font-weight` | `fontWeight` |

---

## `StyleSheet.create`

The preferred way to define styles — provides type checking, optimization, and IDE autocomplete:

{% raw %}
```tsx
import { StyleSheet, View, Text } from 'react-native';

function Card({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        // Shadow (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        // Shadow (Android)
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
});
```
{% endraw %}

---

## Dynamic Styles

{% raw %}
```tsx
// Conditional styles using arrays
<View style={[
    styles.button,
    isDisabled && styles.buttonDisabled,
    variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
]} />

// Styles based on props — inline or computed
<Text style={{ color: isError ? '#ef4444' : '#111' }}>
    {message}
</Text>

// Computed style object — return a plain object, NOT StyleSheet.create()
// StyleSheet.create must be called at module level, not inside functions
function getButtonStyle(variant: 'primary' | 'secondary', size: 'sm' | 'md' | 'lg') {
    return {
        backgroundColor: variant === 'primary' ? '#0064d2' : 'transparent',
        paddingVertical: size === 'sm' ? 6 : size === 'md' ? 10 : 14,
        paddingHorizontal: size === 'sm' ? 12 : size === 'md' ? 16 : 24,
    };
}
```
{% endraw %}

---

## Platform-Specific Styles

{% raw %}
```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    header: {
        paddingTop: Platform.select({
            ios: 44,       // iOS status bar height
            android: 24,   // Android status bar height
            default: 0,
        }),
        // Or for simple two-way:
        backgroundColor: Platform.OS === 'ios' ? '#f2f2f7' : '#ffffff',
    },
    shadow: {
        // iOS uses shadow properties
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        // Android uses elevation
        elevation: 3,
    },
});
```
{% endraw %}

---

## Typography

{% raw %}
```tsx
const styles = StyleSheet.create({
    heading1: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
        lineHeight: 34,
    },
    body: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,     // 1.5x line height
        color: '#374151',
    },
    caption: {
        fontSize: 12,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    link: {
        color: '#0064d2',
        textDecorationLine: 'underline',
    },
});
```
{% endraw %}

**Custom fonts** — load them at app startup:
{% raw %}
```tsx
// Using Expo Font
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

export default function App() {
    const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_700Bold });
    if (!fontsLoaded) return <SplashScreen />;
    return <Navigation />;
}
```
{% endraw %}

---

## Colors

RN supports the same color formats as CSS:

{% raw %}
```tsx
const colors = {
    hex: '#0064d2',
    hexAlpha: '#0064d280',   // 50% opacity
    rgb: 'rgb(0, 100, 210)',
    rgba: 'rgba(0, 100, 210, 0.5)',
    hsl: 'hsl(210, 100%, 41%)',
    named: 'cornflowerblue', // CSS color names work too
    transparent: 'transparent',
};
```
{% endraw %}

Best practice: define a **theme constants file**:

{% raw %}
```typescript
// theme.ts
export const colors = {
    primary: '#0064d2',
    primaryDark: '#0050a8',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    border: '#e5e7eb',
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;
```
{% endraw %}

---

## Borders

{% raw %}
```tsx
const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,

        // Individual border sides
        borderTopWidth: 2,
        borderTopColor: '#0064d2',

        // Individual corner radius
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
});
```
{% endraw %}

---

## Transforms

{% raw %}
```tsx
<View style={{
    transform: [
        { rotate: '45deg' },
        { scale: 1.2 },
        { translateX: 10 },
        { translateY: -5 },
    ],
}} />
```
{% endraw %}

---

## Themed Styling with Context

For dark mode / dynamic theming, combine a theme context with `StyleSheet`:

{% raw %}
```tsx
// hooks/useThemeStyles.ts
import { useColorScheme } from 'react-native';

export function useColors() {
    const scheme = useColorScheme(); // 'light' | 'dark' | null
    return scheme === 'dark' ? darkColors : lightColors;
}

const lightColors = { background: '#ffffff', text: '#111827' };
const darkColors  = { background: '#111827', text: '#f9fafb' };

// Usage
function MyScreen() {
    const colors = useColors();
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Text style={{ color: colors.text }}>Hello</Text>
        </View>
    );
}
```
{% endraw %}

---

## Exercises

1. **Build a themed `Button` component** that accepts `variant: 'primary' | 'secondary' | 'danger'` and `size: 'sm' | 'md' | 'lg'`. Use `StyleSheet.create` at module level for the base styles, and a plain object for the dynamic variant/size values. Combine them with the style array pattern.

2. **Implement dark mode** using `useColorScheme`. Create a `theme.ts` with `lightColors` and `darkColors` objects. Build a `useColors()` hook that returns the correct set, and apply it to a screen with a card, a heading, and some body text.

3. **Replicate a native shadow card**: a white card with iOS shadow properties (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) AND Android `elevation`. Verify the card looks correct on both platforms (or in the iOS and Android simulators separately in Expo Go).

---

## Resources

| Resource | Type | Link |
|---|---|---|
| RN StyleSheet API | Official Docs | [reactnative.dev/docs/stylesheet](https://reactnative.dev/docs/stylesheet) |
| RN View Style Props | Official Docs | [reactnative.dev/docs/view-style-props](https://reactnative.dev/docs/view-style-props) |
| RN Text Style Props | Official Docs | [reactnative.dev/docs/text-style-props](https://reactnative.dev/docs/text-style-props) |
| Expo Google Fonts | Expo | [docs.expo.dev/develop/user-interface/fonts/](https://docs.expo.dev/develop/user-interface/fonts/) |

---

🎉 **You've completed the Native Dev Track — Modules 1, 2, and 3!**

You now have the foundations to build real React Native apps. Next steps:
- Set up your first project: `npx @react-native-community/cli init MyApp`
- Try [Expo Snack](https://snack.expo.dev) for quick experiments without local setup
- Add navigation with [React Navigation](https://reactnavigation.org/docs/getting-started)


---

