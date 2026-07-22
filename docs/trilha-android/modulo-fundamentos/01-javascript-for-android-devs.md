---
title: "JavaScript for Android Developers"
sidebar_label: "JavaScript"
sidebar_position: 1
---

## Video Overview

> Video for this topic coming soon.

## You Already Know How to Write Software

JavaScript will feel strange at first — not because it's hard, but because it breaks assumptions you built over years of Kotlin development. This file maps every core JS concept onto what you already know from Kotlin, so you can skip the "what does this even do?" phase and get to building.

---

## Variables: val/var → const/let

```kotlin
val name = "Guilherme"   // immutable
var age = 30             // mutable
```

```js
const name = "Guilherme"; // immutable reference
let age = 30;             // mutable
```

> **Never use `var`** in modern JavaScript. It has function scope (not block scope) and hoisting behavior that causes subtle bugs. `const` and `let` are always the right choice.

`const` does **not** mean the value is deeply immutable — it means the variable binding cannot be reassigned. Objects and arrays declared with `const` can still be mutated:

```js
const user = { name: "Guilherme" };
user.name = "Gui"; // valid — the binding didn't change, the object did
user = {};         // TypeError — binding cannot be reassigned
```

This is similar to Kotlin's `val` holding a mutable data class instance.

---

## Types: Dynamic by Default

Kotlin is statically typed. JavaScript is dynamically typed — the type of a variable is determined at runtime, not compile time. TypeScript (covered next topic) adds static types on top.

```js
let x = 42;       // x is a number
x = "hello";      // now x is a string — JavaScript allows this
x = true;         // now x is a boolean — still allowed
```

### The 8 Primitive Types

| JavaScript type | Kotlin equivalent        | Notes |
|-----------------|--------------------------|-------|
| `number`        | `Int`, `Long`, `Double`  | All numbers are 64-bit floats |
| `string`        | `String`                 | Immutable, template literals with backticks |
| `boolean`       | `Boolean`                | `true` / `false` |
| `null`          | `null`                   | Intentional absence of value |
| `undefined`     | No equivalent            | Variable declared but not assigned |
| `bigint`        | `Long` (rough)           | Integers larger than 2^53 |
| `symbol`        | No equivalent            | Unique identifiers |
| `object`        | `Any` (rough)            | Everything else (arrays, functions, objects) |

> **`undefined` vs `null`**: Kotlin only has `null`. JavaScript has both. `undefined` means "this variable was never given a value". `null` means "this was explicitly set to nothing". In practice: use `null` intentionally, treat `undefined` as "something went wrong".

---

## Functions: Three Syntaxes

### Function Declaration (hoisted)

```js
function add(a, b) {
  return a + b;
}
```

### Function Expression (not hoisted)

```js
const add = function(a, b) {
  return a + b;
};
```

### Arrow Function (most common in React Native)

```js
const add = (a, b) => a + b;         // implicit return
const greet = (name) => {
  const msg = `Hello, ${name}`;
  return msg;                         // explicit return needed with braces
};
```

Arrow functions do **not** have their own `this` — which is exactly why they're preferred in React: a callback passed as a prop uses the surrounding scope's context, not the receiver's.

```kotlin
// Kotlin lambda — same idea
val add: (Int, Int) -> Int = { a, b -> a + b }
```

### Default Parameters

```js
function createUser(name, role = "viewer") {
  return { name, role };
}
createUser("Gui");           // { name: "Gui", role: "viewer" }
createUser("Gui", "admin");  // { name: "Gui", role: "admin" }
```

```kotlin
fun createUser(name: String, role: String = "viewer") = User(name, role)
```

---

## Template Literals

```js
const name = "Guilherme";
const msg = `Hello, ${name}! You have ${3 + 4} messages.`;
// "Hello, Guilherme! You have 7 messages."
```

```kotlin
val msg = "Hello, $name! You have ${3 + 4} messages."
```

Nearly identical — backticks instead of double quotes, `${}` always (no bare `$name` shorthand).

---

## Destructuring

One of the most used patterns in React Native code.

### Object Destructuring

```js
const user = { name: "Gui", age: 30, role: "admin" };

// Without destructuring
const name = user.name;
const age = user.age;

// With destructuring
const { name, age } = user;

// Rename while destructuring
const { name: userName } = user;

// Default values
const { role = "viewer" } = user;
```

```kotlin
// Kotlin data class destructuring
val (name, age) = user  // positional, not named
```

JS destructuring is **named** (by property key), not positional like Kotlin's `componentN()`.

### Array Destructuring

```js
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]
```

This is how `useState` works:

```js
const [count, setCount] = useState(0);
// useState returns [value, setter] — you name them via destructuring
```

### Function Parameter Destructuring

```js
// Without destructuring
function greet(props) {
  return `Hello, ${props.name}`;
}

// With destructuring — the standard React Native pattern
function greet({ name, age = 0 }) {
  return `Hello, ${name}, age ${age}`;
}
```

---

## Spread Operator

```js
// Arrays
const a = [1, 2, 3];
const b = [...a, 4, 5]; // [1, 2, 3, 4, 5]

// Objects — shallow merge
const base = { color: "blue", size: 16 };
const override = { ...base, color: "red" }; // { color: "red", size: 16 }
```

```kotlin
// Rough Kotlin equivalent
val override = base.copy(color = "red")
```

Spread is everywhere in React Native — combining styles, updating state objects, passing through props.

---

## Array Methods: The Functional Core

You use Kotlin's collection functions every day. These are the exact equivalents:

| Kotlin               | JavaScript               | What it does                        |
|----------------------|--------------------------|-------------------------------------|
| `.map { }`           | `.map(x => ...)`         | Transform each element              |
| `.filter { }`        | `.filter(x => ...)`      | Keep elements matching predicate    |
| `.find { }`          | `.find(x => ...)`        | First match or `undefined`          |
| `.any { }`           | `.some(x => ...)`        | True if any element matches         |
| `.all { }`           | `.every(x => ...)`       | True if all elements match          |
| `.none { }`          | `!.some(x => ...)`       | True if no elements match           |
| `.reduce { acc, x }` | `.reduce((acc, x) => ...)` | Accumulate to single value        |
| `.flatMap { }`       | `.flatMap(x => ...)`     | Map then flatten one level          |
| `.forEach { }`       | `.forEach(x => ...)`     | Side effects only, no return value  |

```js
const users = [
  { name: "Gui", active: true, score: 42 },
  { name: "Ana", active: false, score: 88 },
  { name: "Leo", active: true, score: 15 },
];

// Kotlin: users.filter { it.active }.map { it.name }
const activeNames = users
  .filter(u => u.active)
  .map(u => u.name);
// ["Gui", "Leo"]

// Kotlin: users.maxByOrNull { it.score }?.name
const topUser = users.reduce((best, u) => u.score > best.score ? u : best).name;
// "Ana"
```

---

## Objects: Literals and Shorthand

```js
const name = "Gui";
const age = 30;

// Longhand
const user = { name: name, age: age };

// Shorthand — when variable name matches key
const user = { name, age };

// Computed property keys
const key = "role";
const user = { name, [key]: "admin" }; // { name: "Gui", role: "admin" }

// Methods
const greeter = {
  name: "Gui",
  greet() { return `Hi, I'm ${this.name}`; },
  greetArrow: () => `Hi`, // 'this' is NOT the object here — careful
};
```

---

## Modules: import / export

JavaScript modules replace Kotlin's package system.

```js
// math.js — named exports
export function add(a, b) { return a + b; }
export const PI = 3.14159;

// user.js — default export (one per file)
export default class User { ... }

// main.js — importing
import { add, PI } from './math';       // named
import User from './user';              // default
import * as MathUtils from './math';    // namespace import
```

```kotlin
// Kotlin — no explicit export needed, package-level visibility
import com.app.math.add
import com.app.math.PI
```

> React Native uses **CommonJS** (`require`/`module.exports`) in some config files and **ES Modules** (`import`/`export`) in app code. You'll see both. Prefer `import`/`export` in your own files.

---

## Truthy and Falsy

JavaScript coerces values to boolean in conditions. This is unlike Kotlin where only `Boolean` is valid in an `if`.

**Falsy values** (treated as `false`): `false`, `0`, `""`, `null`, `undefined`, `NaN`

**Everything else** is truthy — including empty arrays `[]` and empty objects `{}`.

```js
if (user) { ... }          // safe: null/undefined are falsy
if (items.length) { ... }  // true if array is non-empty
if (!name) { ... }         // true if name is "", null, or undefined
```

This pattern appears constantly in React Native JSX:

```jsx
{items.length > 0 && <List items={items} />}
// Don't write: {items.length && <List />} — renders "0" when empty!
```

---

## Optional Chaining and Nullish Coalescing

```js
// Optional chaining — same as Kotlin's ?.
const city = user?.address?.city;    // undefined if any step is null/undefined

// Nullish coalescing — same as Kotlin's ?:
const name = user?.name ?? "Guest";  // "Guest" if null or undefined

// Combined
const zip = user?.address?.zip ?? "00000";
```

```kotlin
val city = user?.address?.city
val name = user?.name ?: "Guest"
```

Identical semantics. One difference: `??` only short-circuits on `null`/`undefined`, not on falsy values like `0` or `""`. Kotlin's `?:` also only short-circuits on `null`.

---

## Closures

A closure is a function that "closes over" variables from its enclosing scope. This is the mechanism behind React hooks.

```js
function makeCounter(start) {
  let count = start; // this variable is captured

  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}

const counter = makeCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.value();     // 12
```

```kotlin
fun makeCounter(start: Int): Triple<() -> Int, () -> Int, () -> Int> {
    var count = start
    return Triple({ ++count }, { --count }, { count })
}
```

When you write `useEffect(() => { ... }, [count])`, the callback "closes over" the current value of `count`. If `count` changes and you don't re-declare the effect with the new dependency, the callback still sees the old value — this is the stale closure problem.

---

## Study Materials

### Official Documentation

- [MDN — JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) — the most reliable JS reference
- [MDN — Destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)
- [MDN — Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN — Array methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [javascript.info](https://javascript.info/) — comprehensive interactive JS guide

### Interactive

- [freeCodeCamp — JavaScript Algorithms and Data Structures](https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/) — hands-on exercises
- [Exercism — JavaScript Track](https://exercism.org/tracks/javascript) — practice with mentorship

### Videos

- [Fireship — JavaScript in 100 Seconds](https://www.youtube.com/watch?v=DHjqpvDnNGE)
- [Traversy Media — JavaScript Crash Course](https://www.youtube.com/watch?v=hdI2bqOjy3c)

---

## What's Next

You understand the JavaScript fundamentals. Next: TypeScript — how Kotlin's type system maps to TypeScript's, and how to write type-safe React Native code.

➡ [TypeScript for Kotlin Developers](./02-typescript-for-kotlin-devs)
