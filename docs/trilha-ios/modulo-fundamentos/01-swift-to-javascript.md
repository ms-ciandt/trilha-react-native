---
title: Swift to JavaScript — Core Language Concepts
---

# Swift to JavaScript — Core Language Concepts

If you have been writing Swift for iOS, you already think in terms of type safety, value semantics, and structured error handling. JavaScript shares many of the same concepts, but expresses them differently — and TypeScript brings back the type guarantees you rely on in Swift. This module maps your existing Swift knowledge directly to JavaScript, so you can start reading and writing React Native code with confidence from day one.

---

## Variables: `let` and `var` (and `const`)

Swift uses `let` for constants and `var` for mutable variables. JavaScript has three keywords: `const`, `let`, and `var`. Treat `var` as legacy — modern JavaScript (ES2015+) and all React Native code uses `const` and `let` exclusively.

| Swift | JavaScript | Meaning |
|---|---|---|
| `let` | `const` | Immutable binding |
| `var` | `let` | Mutable binding |

```swift
// Swift
let appName = "MyApp"
var counter = 0
counter += 1
```

```js
// JavaScript
const appName = "MyApp";
let counter = 0;
counter += 1;
```

:::info const does not mean deeply immutable
In JavaScript, `const` prevents reassignment of the variable binding, but does not freeze the object it points to. An array or object declared with `const` can still have its contents mutated. This is different from Swift's `let` on a struct, which makes every property immutable.
:::

---

## Type Inference

Both Swift and JavaScript infer types from the assigned value. The difference is that Swift enforces the inferred type at compile time, while JavaScript is dynamically typed at runtime.

```swift
// Swift — compiler infers String, Int, Double
let name = "Alice"     // String
let age = 30           // Int
let score = 98.6       // Double
```

```js
// JavaScript — engine infers at runtime, type can change
let name = "Alice";    // string
let age = 30;          // number (no separate Int/Double)
let score = 98.6;      // number
```

:::tip Use TypeScript in React Native projects
React Native projects created with Expo or the React Native CLI default to TypeScript. With TypeScript you get the compile-time guarantees Swift developers expect: `const name: string = "Alice"` will catch type mismatches before the app runs.
:::

---

## Optionals vs `null` and `undefined`

Swift's optional system (`T?`) is one of its most distinctive features. JavaScript has two "absence of value" primitives: `null` (explicit absence) and `undefined` (value was never set). There is no compiler-enforced optional unwrapping, but the language provides operators that behave like Swift's optional syntax.

```swift
// Swift
var username: String? = nil
username = "alice"

if let name = username {
    print("Hello, \(name)")
}
```

```js
// JavaScript
let username = null;
username = "alice";

if (username !== null && username !== undefined) {
    console.log(`Hello, ${username}`);
}
```

---

## Optional Chaining (`?.`)

Swift uses `?.` to safely traverse a chain of optionals. JavaScript has the same operator with identical syntax.

```swift
// Swift
let city = user?.address?.city
```

```js
// JavaScript
const city = user?.address?.city;
```

If any link in the chain is `null` or `undefined`, the expression short-circuits and returns `undefined` instead of throwing a runtime error. Behavior is functionally identical to Swift.

---

## Nil Coalescing (`??`)

Swift's `??` operator provides a default value when an optional is `nil`. JavaScript's `??` (nullish coalescing) does exactly the same thing, returning the right-hand side when the left is `null` or `undefined`.

```swift
// Swift
let displayName = username ?? "Guest"
```

```js
// JavaScript
const displayName = username ?? "Guest";
```

:::tip ?? vs || in JavaScript
JavaScript developers sometimes use `||` as a fallback operator, but it treats any falsy value (`0`, `""`, `false`) as absent. Use `??` when you only want to fall back on `null` or `undefined`, which matches Swift's nil-coalescing behavior.
:::

---

## Guard Let → Early Return

Swift's `guard let` exits the current scope early if a condition is not met, keeping the happy path unindented. JavaScript has no `guard` keyword, but the same pattern is written as an explicit early `return`.

```swift
// Swift
func processUser(_ user: User?) {
    guard let user = user else { return }
    guard user.isActive else { return }
    // happy path — user is non-nil and active
    render(user)
}
```

```js
// JavaScript
function processUser(user) {
    if (user == null) return;
    if (!user.isActive) return;
    // happy path
    render(user);
}
```

The pattern is identical; only the syntax differs. In React Native you will use early returns extensively inside event handlers and component render functions.

---

## String Interpolation → Template Literals

Swift uses `\()` inside a string literal for interpolation. JavaScript uses backtick strings with `${}`.

```swift
// Swift
let greeting = "Hello, \(name). You are \(age) years old."
```

```js
// JavaScript
const greeting = `Hello, ${name}. You are ${age} years old.`;
```

Any JavaScript expression — function calls, ternaries, arithmetic — can appear inside `${}`.

```js
const label = `Items: ${cart.length > 0 ? cart.length : "none"}`;
```

---

## Closures → Arrow Functions

Swift closures and JavaScript arrow functions serve the same purpose: anonymous, first-class function values that capture their surrounding scope.

```swift
// Swift — trailing closure syntax
let doubled = numbers.map { $0 * 2 }

let greet: (String) -> String = { name in
    return "Hello, \(name)"
}
```

```js
// JavaScript — arrow function
const doubled = numbers.map(n => n * 2);

const greet = (name) => {
    return `Hello, ${name}`;
};

// single-expression shorthand (implicit return)
const greet = name => `Hello, ${name}`;
```

:::info Capturing `this` vs capturing `self`
Swift closures capture `self` explicitly when needed. JavaScript arrow functions capture the lexical `this` of their enclosing scope, which is why React components use arrow functions for event handlers — they avoid the classic `this` binding bugs of older `function` syntax.
:::

---

## Array and Collection Methods

Swift's `Array` and JavaScript arrays share `map`, `filter`, and `reduce` with nearly identical signatures.

### map

```swift
// Swift
let names = ["alice", "bob"]
let uppercased = names.map { $0.uppercased() }
// ["ALICE", "BOB"]
```

```js
// JavaScript
const names = ["alice", "bob"];
const uppercased = names.map(n => n.toUpperCase());
// ["ALICE", "BOB"]
```

### filter

```swift
// Swift
let scores = [45, 80, 92, 60]
let passing = scores.filter { $0 >= 70 }
// [80, 92]
```

```js
// JavaScript
const scores = [45, 80, 92, 60];
const passing = scores.filter(s => s >= 70);
// [80, 92]
```

### reduce

```swift
// Swift
let total = scores.reduce(0) { $0 + $1 }
// 277
```

```js
// JavaScript
const total = scores.reduce((acc, s) => acc + s, 0);
// 277
```

JavaScript also exposes `find` (like Swift's `first(where:)`), `some` (like Swift's `contains(where:)`), `every` (like Swift's `allSatisfy`), and `flatMap`.

---

## Dictionaries → Plain Objects and `Map`

Swift's `[String: Any]` dictionary maps directly to a JavaScript plain object. For keyed collections with guaranteed insertion order and non-string keys, JavaScript also has `Map`.

```swift
// Swift
var config: [String: Any] = [
    "theme": "dark",
    "fontSize": 16
]
let theme = config["theme"] as? String ?? "light"
```

```js
// JavaScript
const config = {
    theme: "dark",
    fontSize: 16,
};
const theme = config.theme ?? "light";
// or: config["theme"] ?? "light"  — bracket notation also works
```

---

## Swift Enums → JavaScript Objects (and TypeScript Enums)

Swift enums are first-class types with associated values and methods. JavaScript has no native enum type. The standard pattern is a frozen object used as a namespace for constants.

```swift
// Swift
enum Direction {
    case north, south, east, west
}

let heading = Direction.north
```

```js
// JavaScript — object-as-enum pattern
const Direction = Object.freeze({
    NORTH: "north",
    SOUTH: "south",
    EAST: "east",
    WEST: "west",
});

const heading = Direction.NORTH;
```

TypeScript adds a native `enum` keyword that behaves closer to Swift:

```ts
// TypeScript
enum Direction {
    North = "north",
    South = "south",
    East = "east",
    West = "west",
}

const heading: Direction = Direction.North;
```

:::tip Prefer string enums in TypeScript
Numeric TypeScript enums (the default) produce values like `0, 1, 2` that are hard to debug. String enums (`Direction.North = "north"`) serialize cleanly and behave predictably across API boundaries — the same tradeoff you'd consider with Swift raw-value enums.
:::

---

## Error Handling: `do/catch/throws` → `try/catch`

Swift and JavaScript both use `try/catch` blocks. The difference is in asynchronous code: Swift uses `async throws`, while JavaScript uses `async/await` with `Promise` rejection.

### Synchronous

```swift
// Swift
enum ParseError: Error {
    case invalidData
}

func parseValue(_ raw: String) throws -> Int {
    guard let value = Int(raw) else {
        throw ParseError.invalidData
    }
    return value
}

do {
    let result = try parseValue("abc")
} catch ParseError.invalidData {
    print("Invalid input")
} catch {
    print("Unknown error: \(error)")
}
```

```js
// JavaScript
function parseValue(raw) {
    const value = parseInt(raw, 10);
    if (isNaN(value)) {
        throw new Error("Invalid input");
    }
    return value;
}

try {
    const result = parseValue("abc");
} catch (error) {
    console.error(error.message);
}
```

### Asynchronous

```swift
// Swift
func fetchUser(id: String) async throws -> User {
    let data = try await api.get("/users/\(id)")
    return try JSONDecoder().decode(User.self, from: data)
}

Task {
    do {
        let user = try await fetchUser(id: "42")
    } catch {
        print("Failed: \(error)")
    }
}
```

```js
// JavaScript
async function fetchUser(id) {
    const response = await fetch(`/users/${id}`);
    if (!response.ok) throw new Error("Request failed");
    return response.json();
}

async function load() {
    try {
        const user = await fetchUser("42");
    } catch (error) {
        console.error("Failed:", error.message);
    }
}
```

The `async/await` pattern reads almost identically. The main difference is that JavaScript does not have typed `catch` clauses — you receive a single `error` value and must inspect it at runtime, similar to catching `Error` in Swift and then `as?`-casting to a specific type.

---

## Codable → JSON.parse / JSON.stringify

Swift's `Codable` protocol handles serialization to and from JSON automatically. JavaScript works directly with JSON as plain objects — no decoding step is needed for data that arrives over the network, since `fetch` returns a parsed JavaScript object via `.json()`.

```swift
// Swift — Codable struct
struct User: Codable {
    let id: Int
    let name: String
}

let json = """
{"id": 1, "name": "Alice"}
"""
let data = json.data(using: .utf8)!
let user = try JSONDecoder().decode(User.self, from: data)

let encoded = try JSONEncoder().encode(user)
```

```js
// JavaScript — plain parsing
const json = '{"id": 1, "name": "Alice"}';
const user = JSON.parse(json);        // user.id, user.name — no type declaration needed

const serialized = JSON.stringify(user);
```

In TypeScript you can add a type annotation to describe the shape of the parsed object without writing decoder logic:

```ts
// TypeScript
interface User {
    id: number;
    name: string;
}

const user = JSON.parse(json) as User;
// user.id and user.name are typed — but no runtime validation
```

:::info Runtime validation vs compile-time types
TypeScript's type annotations are erased at runtime. Unlike Swift's `Codable`, a TypeScript `as User` cast does not validate the JSON structure at runtime. If an API returns unexpected data, you will not get a compile-time error — you will get a runtime crash when you try to access a missing property. Libraries like `zod` provide runtime schema validation similar to what `Codable` does in Swift.
:::

---

## Swift Protocols → TypeScript Interfaces (Preview)

Swift protocols define a contract that types must fulfill. TypeScript interfaces serve the same role. You will use interfaces extensively in React Native to type component props, API responses, and service contracts.

```swift
// Swift
protocol Displayable {
    var displayName: String { get }
    func formattedDescription() -> String
}

struct Product: Displayable {
    let displayName: String
    func formattedDescription() -> String {
        return "Product: \(displayName)"
    }
}
```

```ts
// TypeScript
interface Displayable {
    displayName: string;
    formattedDescription(): string;
}

const product: Displayable = {
    displayName: "Widget",
    formattedDescription() {
        return `Product: ${this.displayName}`;
    },
};
```

TypeScript interfaces support extension (`extends`), optional members (`name?: string`), and index signatures — all concepts that map naturally from Swift protocol features. A full treatment of TypeScript in the React Native context is covered in the TypeScript module.

---

## Summary

| Swift concept | JavaScript / TypeScript equivalent |
|---|---|
| `let` (constant) | `const` |
| `var` (mutable) | `let` |
| `T?` optional | `T \| null \| undefined` |
| `?.` optional chaining | `?.` (identical syntax) |
| `??` nil coalescing | `??` (identical syntax) |
| `guard let … else { return }` | early `if (x == null) return` |
| `\(expression)` interpolation | `` `${expression}` `` template literal |
| Closure `{ $0 * 2 }` | Arrow function `n => n * 2` |
| `Array.map / filter / reduce` | `Array.map / filter / reduce` (identical semantics) |
| `[String: Any]` dictionary | Plain object `{}` |
| `enum` | `Object.freeze({})` or TypeScript `enum` |
| `do { try } catch` | `try { } catch (e)` |
| `async throws` | `async` + `await` + thrown `Error` |
| `Codable` / `JSONDecoder` | `JSON.parse` / `JSON.stringify` |
| `protocol` | TypeScript `interface` |

You will find that most of your Swift intuitions transfer cleanly. The largest adjustment is embracing JavaScript's dynamic type system at runtime while relying on TypeScript for compile-time safety — a combination that gives you a working environment closer to Swift than raw JavaScript alone.
