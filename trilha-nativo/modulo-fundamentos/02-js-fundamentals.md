---
title: JavaScript Fundamentals for Native Developers
---

# JavaScript Fundamentals for Native Developers

> A focused tour of JS — told from the perspective of someone who already writes Kotlin or Swift.

## Variables: `const`, `let`, never `var`

```typescript
const name = "Alice";       // Kotlin: val name = "Alice"  — immutable binding
let count = 0;              // Kotlin: var count = 0        — mutable binding
count = 1;                  // OK
// name = "Bob";            // Error — const cannot be reassigned
```

:::caution Always use const by default
Use `const` for everything. Switch to `let` only when you need to reassign. Never use `var` — it has function-scoped hoisting that causes subtle bugs.
:::

---

## Types: Dynamic by Default, Static with TypeScript

JavaScript is dynamically typed. TypeScript adds a compile-time type layer:

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

**Kotlin/Swift comparison:**

```kotlin
// Kotlin
var x: Int = 5
// x = "hello" // compile error
```

```swift
// Swift
var x: Int = 5
// x = "hello" // compile error
```

TypeScript with `strict: true` is comparably safe.

---

## Functions: Three Forms

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

**Kotlin comparison:**
```kotlin
// Regular function
fun add(a: Int, b: Int): Int = a + b

// Lambda
val multiply: (Int, Int) -> Int = { a, b -> a * b }
```

**Swift comparison:**
```swift
// Regular function
func add(a: Int, b: Int) -> Int { a + b }

// Closure
let multiply: (Int, Int) -> Int = { a, b in a * b }
```

---

## Destructuring — JavaScript's Named Parameters

Swift has proper named parameters. Kotlin has data class destructuring. JavaScript/TypeScript has **destructuring**:

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

**Swift comparison:**
```swift
// Named parameters
func createUser(name: String, age: Int) -> String {
    return "\(name) is \(age)"
}
createUser(name: "Bob", age: 25)
```

---

## Spread Operator & Rest Parameters

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

---

## Arrays: map, filter, reduce

These are the workhorses of React rendering. You'll use them constantly.

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

**Kotlin comparison:**
```kotlin
val numbers = listOf(1, 2, 3, 4, 5)
val doubled = numbers.map { it * 2 }
val evens = numbers.filter { it % 2 == 0 }
val total = numbers.fold(0) { acc, n -> acc + n }
```

---

## Promises — The Foundation of Async JS

Before `async/await` there were Promises. You'll see them constantly in library code and RN APIs, so you need to recognize them even if you prefer `async/await`.

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

`async/await` is syntax sugar over Promises — the two are interchangeable. Most modern code uses `async/await` but you must recognise `.then()` chains in library source and documentation.

---

## Async/Await — The JS Equivalent of Kotlin Coroutines

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

**Kotlin coroutines comparison:**
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

The mental model is identical — `async/await` in JS is directly analogous to `suspend fun` in Kotlin.

---

## The JavaScript Thread Model — Critical for Mobile Devs

This is the biggest mental-model shift from native development:

**JavaScript in React Native runs on a single thread.** There is no `Dispatchers.IO`, no `DispatchQueue.global()`, no background thread pool you can spin up from JS.

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

```typescript
// math.ts — named exports
export const PI = 3.14159;
export function add(a: number, b: number) { return a + b; }
export function multiply(a: number, b: number) { return a * b; }

// Default export (one per file)
export default function subtract(a: number, b: number) { return a - b; }
```

```typescript
// app.ts — importing
import subtract from './math';           // default import
import { add, PI } from './math';        // named imports
import { multiply as mult } from './math'; // rename on import
import * as MathUtils from './math';     // import everything as namespace
```

---

## Closures — The Key JavaScript Concept

Closures are functions that "remember" the variables from the scope where they were created. This is fundamental to React hooks.

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

In React Native, you'll see closures in event handlers constantly:

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
