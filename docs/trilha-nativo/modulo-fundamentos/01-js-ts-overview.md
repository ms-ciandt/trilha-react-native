---
title: "Module 1: JS/TS for Native Developers"
---

# Module 1: JS/TS for Native Developers

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_nativo_fundamentos-01_js_ts_overview.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

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

```kotlin
// Kotlin
fun greet(name: String): String {
    return "Hello, $name!"
}
```

```swift
// Swift
func greet(name: String) -> String {
    return "Hello, \(name)!"
}
```

```typescript
// TypeScript
function greet(name: string): string {
    return `Hello, ${name}!`;
}
// or as an arrow function:
const greet = (name: string): string => `Hello, ${name}!`;
```

---

**Next:** [JS Fundamentals →](./js-fundamentals)
