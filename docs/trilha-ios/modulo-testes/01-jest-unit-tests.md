---
title: Jest Unit Tests for iOS Developers
---

# Jest Unit Tests for iOS Developers

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/test_01_jest-unit-tests.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/test_01_jest-unit-tests_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

If you have been writing Swift tests with Swift Testing, you already understand the mental model behind unit testing: isolate a piece of behavior, assert it produces the expected result, and repeat. Jest works the same way. The vocabulary is different, the tooling is JavaScript-native, and a few patterns require a small adjustment in thinking — but nothing here is conceptually new.

Swift Testing (introduced in Xcode 16 / Swift 6) is the modern replacement for XCTest. Its macro-based API — `@Suite`, `@Test`, `#expect` — is structurally closer to Jest than XCTest ever was, which makes the mapping especially direct.

This page maps your Swift Testing knowledge onto Jest so you can be productive immediately.

---

## Test file structure: @Suite/@Test vs describe/it blocks

In Swift Testing you mark a struct or class with `@Suite` and annotate each test function with `@Test`. Jest uses free functions — `describe`, `it`, and `test` — inside a plain `.test.ts` or `.spec.ts` file. There is no class to subclass in either framework.

```swift
// Swift — Swift Testing
import Testing

@Suite("CartCalculator")
struct CartCalculatorTests {
    @Test("applies discount to the total")
    func totalWithDiscount() {
        let result = CartCalculator.total(items: [10.0, 20.0], discount: 0.1)
        #expect(result == 27.0)
    }
}
```

```typescript
// TypeScript — Jest
import { calculateTotal } from '../CartCalculator';

describe('CartCalculator', () => {
  it('applies discount to the total', () => {
    const result = calculateTotal([10.0, 20.0], 0.1);
    expect(result).toBe(27.0);
  });
});
```

`describe` groups related tests — equivalent to `@Suite`. `it` and `test` are identical aliases; `it` reads more naturally for behavior-focused descriptions, while `test` reads well for direct function names. Use whichever your team prefers and be consistent.

Nesting `describe` blocks is valid and mirrors nesting `@Suite` types for sub-scenarios:

```swift
// Swift Testing — nested suites
@Suite("CartCalculator")
struct CartCalculatorTests {
    @Suite("when the cart is empty")
    struct EmptyCart {
        @Test func returnsZero() {
            #expect(CartCalculator.total(items: [], discount: 0) == 0)
        }
    }
}
```

```typescript
describe('CartCalculator', () => {
  describe('when the cart is empty', () => {
    it('returns zero', () => {
      expect(calculateTotal([], 0)).toBe(0);
    });
  });

  describe('when discount exceeds 100%', () => {
    it('clamps the total to zero', () => {
      expect(calculateTotal([50], 2.0)).toBe(0);
    });
  });
});
```

---

## Assertions: #expect/#require vs expect matchers

Swift Testing replaced the `XCTAssert*` family with two macros: `#expect` for soft assertions (test continues on failure) and `#require` for hard assertions (test stops immediately). Jest centralizes everything through a single `expect(value)` call followed by a matcher method.

| Swift Testing | Jest |
|---|---|
| `#expect(a == b)` | `expect(a).toBe(b)` for primitives, `expect(a).toEqual(b)` for objects/arrays |
| `#expect(a != b)` | `expect(a).not.toBe(b)` |
| `#expect(x)` | `expect(x).toBeTruthy()` |
| `#expect(!x)` | `expect(x).toBeFalsy()` |
| `#expect(x == nil)` | `expect(x).toBeNull()` or `expect(x).toBeUndefined()` |
| `#expect(x != nil)` | `expect(x).toBeDefined()` |
| `#expect(throws: MyError.self) { try f() }` | `expect(() => f()).toThrow()` |
| `try #require(x)` (stops test on nil/failure) | No direct equivalent — Jest continues on failure |

The distinction between `toBe` and `toEqual` matters. `toBe` uses `Object.is` — strict reference equality for objects. `toEqual` performs a deep structural comparison, which is what you want when comparing two object literals or arrays.

```typescript
// toBe — works for primitives
expect(2 + 2).toBe(4);
expect('hello').toBe('hello');

// toEqual — works for objects and arrays
expect({ id: 1, name: 'Alice' }).toEqual({ id: 1, name: 'Alice' });
expect([1, 2, 3]).toEqual([1, 2, 3]);

// toBeTruthy / toBeFalsy — loose truthiness check
expect('non-empty string').toBeTruthy();
expect(0).toBeFalsy();
expect(null).toBeFalsy();
```

For partial object matching — useful when a function returns a large object and you only care about specific fields — use `toMatchObject`:

```typescript
const user = createUser({ name: 'Alice', role: 'admin' });
expect(user).toMatchObject({ name: 'Alice' });
// passes even if user has additional fields like id, createdAt, etc.
```

---

## setUp and tearDown: init/deinit vs beforeEach / afterEach

Swift Testing does not have `setUp`/`tearDown` override methods. Instead, it leverages Swift's own initializer lifecycle: because `@Suite` structs get a **fresh instance per test**, placing setup in `init()` is equivalent to `beforeEach`. Each test runs in isolation automatically.

```swift
// Swift Testing — init() runs before each @Test function
import Testing

@Suite
struct UserServiceTests {
    var service: UserService

    init() {
        service = UserService(environment: .test)
    }
    // No tearDown needed for structs — instance is discarded after each test
}
```

```typescript
// TypeScript — Jest
import { UserService } from '../UserService';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService({ environment: 'test' });
  });

  afterEach(() => {
    service.destroy();
  });

  it('returns the current user', () => {
    expect(service.currentUser()).toBeNull();
  });
});
```

When you need teardown logic (e.g. cancelling a task or closing a connection), declare the `@Suite` as a `class` or `actor` to gain access to `deinit`:

```swift
@Suite
final class UserServiceTests {
    var service: UserService

    init() {
        service = UserService(environment: .test)
    }

    deinit {
        service.destroy() // equivalent to afterEach
    }
}
```

`beforeAll` / `afterAll` — shared once-per-suite setup — has no direct Swift Testing equivalent for structs. The idiom is to compute expensive shared state as a `static let` or to move it outside the suite entirely.

Hooks respect `describe` scope: a `beforeEach` inside a nested `describe` runs after the outer `beforeEach`. This layering lets you set up shared state at the top level and specialize it in sub-groups.

---

## Async testing: @Test async throws vs Jest async/await

Swift Testing fully supports Swift Concurrency natively. Mark a `@Test` function as `async throws` and `await` your async calls directly — no `XCTestExpectation` or `waitForExpectations` needed. Jest works identically: mark the test function `async` and `await` Promises.

```swift
// Swift Testing — async throws, no XCTestExpectation needed
@Test
func fetchUser() async throws {
    let user = try await service.fetchUser(id: "42")
    #expect(user.id == "42")
    #expect(user.name != nil)
}
```

```typescript
// TypeScript — Jest async/await
it('fetches a user', async () => {
  const user = await fetchUser('42');
  expect(user.id).toBe('42');
  expect(user.name).toBeDefined();
});
```

Both frameworks fail the test automatically if the `async` function throws an uncaught error — no manual signaling needed.

### Asserting on thrown errors

```swift
// Swift Testing
@Test
func fetchUserNotFound() async {
    await #expect(throws: UserNotFoundError.self) {
        try await service.fetchUser(id: "nonexistent")
    }
}
```

```typescript
// Jest
it('throws when the user is not found', async () => {
  await expect(fetchUser('nonexistent')).rejects.toThrow('User not found');
});
```

### The done callback — legacy pattern

If you maintain older callback-based code that predates async/await, Jest still supports the `done` callback. It is the closest equivalent to `XCTestExpectation` from XCTest, but you will rarely need it in modern React Native code:

```typescript
it('fetches a user', (done) => {
  fetchUser('42', (user, error) => {
    expect(user).toBeDefined();
    done();
  });
});
```

If `done` is never called, the test times out and fails. Do not mix `async/await` with `done` — Jest detects the rejection from a rejected Promise automatically.

---

## Mocking: jest.mock() vs Swift protocol injection

Swift Testing encourages testability through protocol injection: define a protocol, implement a mock conformance as a lightweight struct, and pass it into the type under test. Jest has a different mechanism — it intercepts the module system.

```swift
// Swift Testing — protocol injection with struct mock
import Testing

protocol NetworkClient {
    func get(url: URL) async throws -> Data
}

struct MockNetworkClient: NetworkClient {
    var stubbedData: Data = Data()
    func get(url: URL) async throws -> Data { stubbedData }
}

struct UserRepository {
    let client: NetworkClient
}

@Suite
struct UserRepositoryTests {
    var repo: UserRepository

    init() {
        repo = UserRepository(client: MockNetworkClient())
    }

    @Test
    func fetchUser() async throws {
        let user = try await repo.fetchUser("42")
        #expect(user.name == "Alice")
    }
}
```

```typescript
// TypeScript — jest.mock()
jest.mock('../api/networkClient', () => ({
  get: jest.fn().mockResolvedValue({ id: '42', name: 'Alice' }),
}));

import { UserRepository } from '../UserRepository';

it('returns a user from the network', async () => {
  const repo = new UserRepository();
  const user = await repo.fetchUser('42');
  expect(user.name).toBe('Alice');
});
```

`jest.mock()` replaces the entire module import with an auto-mock or a factory you provide. The replacement is hoisted to the top of the file before any imports — a Jest-specific behavior that differs from how you might expect module evaluation to work.

For finer control on individual tests, use `jest.spyOn` to wrap a specific method:

```typescript
import * as networkClient from '../api/networkClient';

it('calls the network with the correct URL', async () => {
  const spy = jest.spyOn(networkClient, 'get').mockResolvedValue({ id: '42' });

  await fetchUser('42');

  expect(spy).toHaveBeenCalledWith('/users/42');
  spy.mockRestore(); // restore original implementation after the test
});
```

`jest.fn()` creates a standalone mock function you can inspect: `mockFn.mock.calls` holds every invocation's arguments. Use `toHaveBeenCalled()`, `toHaveBeenCalledWith()`, and `toHaveBeenCalledTimes()` as your assertion matchers.

Reset mocks between tests to prevent state leakage. The cleanest approach is a global configuration in `jest.config.js`:

```js
module.exports = {
  clearMocks: true,   // clear call history before each test
  resetMocks: false,  // keep implementations unless explicitly reset
  restoreMocks: true, // restore spied-on methods after each test
};
```

---

## Parameterized tests: @Test(arguments:) vs it.each

Swift Testing has built-in support for parameterized tests via `@Test(arguments:)`. Jest offers the same through `it.each`. Both let you run the same assertion logic against multiple inputs without duplicating test code.

```swift
// Swift Testing — @Test(arguments:)
@Test(arguments: [
    (items: [10.0, 20.0], discount: 0.1, expected: 27.0),
    (items: [],            discount: 0.5, expected: 0.0),
    (items: [50.0],        discount: 2.0, expected: 0.0),
])
func totalCalculation(items: [Double], discount: Double, expected: Double) {
    #expect(CartCalculator.total(items: items, discount: discount) == expected)
}
```

```typescript
// Jest — it.each
it.each([
  { items: [10.0, 20.0], discount: 0.1, expected: 27.0 },
  { items: [],            discount: 0.5, expected: 0.0  },
  { items: [50.0],        discount: 2.0, expected: 0.0  },
])('calculates total: $items with $discount% discount', ({ items, discount, expected }) => {
  expect(calculateTotal(items, discount)).toBe(expected);
});
```

Each argument set runs as an independent test case in both frameworks, with its own pass/fail result in the test report.

---

## Testing custom hooks: renderHook

Custom hooks cannot be called outside a React component — React enforces the rules of hooks at runtime. The `@testing-library/react-native` package exports `renderHook` for exactly this purpose.

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useCounter } from '../hooks/useCounter';

describe('useCounter', () => {
  it('starts at the initial value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments the count', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

`result.current` always reflects the latest rendered value of the hook. Wrap any action that triggers state updates in `act()` — this ensures React flushes all state updates and effects before your assertions run. Forgetting `act` is the most common source of misleading test failures in hook tests.

For hooks that depend on context, pass a `wrapper` option:

```typescript
import { ThemeProvider } from '../context/ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme="dark">{children}</ThemeProvider>
);

const { result } = renderHook(() => useTheme(), { wrapper });
expect(result.current.theme).toBe('dark');
```

---

## Jest configuration for React Native

### jest-expo preset

If your project uses Expo (Expo SDK 56 or later), configure Jest with the `jest-expo` preset in `package.json`:

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/react-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ]
  }
}
```

The `transformIgnorePatterns` entry is necessary because many React Native packages ship untransformed ES module syntax. The pattern above whitelists the packages that need Babel transformation while ignoring the rest of `node_modules`.

### @react-native/jest-preset

For bare React Native projects (not Expo), use the official preset:

```json
{
  "jest": {
    "preset": "@react-native/jest-preset",
    "setupFilesAfterFramework": ["@testing-library/react-native/extend-expect"]
  }
}
```

Both presets configure the module resolver, set up `@testing-library/react-native`, and mock platform-specific modules like `NativeModules`. You rarely need to extend them unless you have custom native modules that require explicit mocking.

---

## Hermes and the Jest runtime

React Native 0.76 uses Hermes as the default JavaScript engine at runtime. However, Jest does not execute tests inside Hermes — it uses V8 (Node.js). This has practical implications:

**Behavior differences to be aware of:**

- Hermes has specific behaviors around `Date`, `RegExp`, and some edge cases in `Array` and `String` methods. Tests that pass in Jest may reveal a Hermes-specific bug only at runtime. The reverse is also true.
- Performance characteristics differ. Benchmarks written as Jest tests do not reflect production Hermes performance.
- Hermes disables certain JavaScript introspection features for security. If your code relies on `Function.prototype.toString()` or `arguments.callee`, it will fail on Hermes but pass in Jest's V8 environment.

**What this means in practice:**

Unit tests cover logic correctness — they are valid regardless of the engine. But if you are writing code that relies on engine-specific behavior, add a note and verify manually on device or in an Expo Go / development build. The test suite gives you confidence in behavior; the runtime environment remains Hermes.

---

## Snapshot testing

Snapshot tests serialize a rendered component to a text file and fail if the serialization changes. They are similar to iOS UI test baselines — fast to write, but brittle when the component changes for legitimate reasons.

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { UserCard } from '../UserCard';

it('renders correctly', () => {
  const { toJSON } = render(<UserCard name="Alice" role="admin" />);
  expect(toJSON()).toMatchSnapshot();
});
```

On first run Jest creates a `__snapshots__/` directory next to the test file containing the serialized output. Subsequent runs diff against it. To update the snapshot after an intentional change, run `jest --updateSnapshot` or `jest -u`.

**Use snapshots sparingly.** Their failure signal is low-information: you see that something changed, but not what behavior broke. If a component changes its label text — a legitimate update — the snapshot fails and someone has to review and accept the diff. Over time, teams develop snapshot blindness and accept diffs without reviewing them.

Prefer snapshots for:
- Leaf components with no logic — pure presentation that you want to protect from accidental regressions
- Components that are extremely stable and change infrequently

Avoid snapshots for:
- Components that receive data from APIs or context — the output is too dynamic
- Components under active development — you will be constantly updating snapshots
- Testing behavior — use `getByText`, `getByRole`, and interaction helpers from `@testing-library/react-native` instead

---

## Summary

| Swift Testing concept | Jest equivalent |
|---|---|
| `@Suite` struct/class | `describe` block |
| `@Test func foo()` | `it('foo', ...)` or `test('foo', ...)` |
| `#expect(a == b)` | `expect(a).toBe(b)` / `.toEqual(b)` |
| `#expect(x)` | `expect(x).toBeTruthy()` |
| `#expect(x == nil)` | `expect(x).toBeNull()` |
| `try #require(x)` | No direct equivalent (Jest continues on failure) |
| `init()` of `@Suite` struct | `beforeEach(() => ...)` |
| `deinit` of `@Suite` class | `afterEach(() => ...)` |
| `@Test async throws` (native) | `async/await` in test function |
| `#expect(throws:)` | `expect(() => f()).toThrow()` / `.rejects.toThrow()` |
| `@Test(arguments:)` | `it.each([...])` |
| Protocol mock struct conformance | `jest.mock()` or `jest.spyOn()` |
| UI test baseline image | Snapshot test |

The test structure, assertion model, and async patterns all have clear analogues in what you already know from Swift Testing. The primary adjustment is thinking in module-level mocking rather than protocol injection, and learning `@testing-library/react-native` for anything that involves rendering components.
