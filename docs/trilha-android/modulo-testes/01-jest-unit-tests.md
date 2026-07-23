---
title: "Jest & Unit Tests"
sidebar_label: "Jest & Unit Tests"
sidebar_position: 1
---

## Video Overview

> Video for this topic coming soon.

## JUnit → Jest

You already know the discipline: write small, fast, isolated tests that verify a single unit of behaviour. Jest is the standard test runner for React Native — it's to JS what JUnit is to Kotlin, with built-in mocking, assertions, and coverage.

| JUnit / Kotlin Test | Jest |
|---------------------|------|
| `@Test` | `test()` or `it()` |
| `@BeforeEach` | `beforeEach()` |
| `@AfterEach` | `afterEach()` |
| `@BeforeAll` | `beforeAll()` |
| `describe {}` block | `describe()` |
| `assertEquals(expected, actual)` | `expect(actual).toBe(expected)` |
| `assertNull(value)` | `expect(value).toBeNull()` |
| `assertTrue(condition)` | `expect(condition).toBe(true)` |
| `assertThrows {}` | `expect(() => fn()).toThrow()` |
| `Mockito.mock(Class)` | `jest.fn()` / `jest.mock('module')` |
| `verify(mock).method()` | `expect(mockFn).toHaveBeenCalledWith(...)` |

---

## Setup

React Native CLI and Expo both include Jest pre-configured. The relevant parts of `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "react-native",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!(react-native|@react-native|expo|@expo|react-native-reanimated)/)"
    ]
  }
}
```

---

## Writing Your First Test

```typescript
// utils/formatPrice.ts
export function formatPrice(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
```

```typescript
// utils/formatPrice.test.ts
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('formats cents to BRL currency string', () => {
    expect(formatPrice(1999)).toBe('R$ 19,99');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('R$ 0,00');
  });

  it('supports other currencies', () => {
    const result = formatPrice(1000, 'USD');
    expect(result).toContain('10');
  });

  it('throws for negative values', () => {
    expect(() => formatPrice(-1)).toThrow();
  });
});
```

Run tests:

```bash
npx jest utils/formatPrice.test.ts
npx jest --watch          # re-runs on file change
npx jest --coverage       # generates coverage report
```

---

## Testing Pure Functions — Business Logic

```typescript
// store/cart.ts
export interface CartItem {
  id: string;
  name: string;
  price: number; // cents
  quantity: number;
}

export function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function applyDiscount(total: number, percent: number): number {
  if (percent < 0 || percent > 100) throw new Error('Invalid discount');
  return Math.round(total * (1 - percent / 100));
}

export function addItem(cart: CartItem[], item: CartItem): CartItem[] {
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    return cart.map(i =>
      i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
    );
  }
  return [...cart, item];
}
```

```typescript
// store/cart.test.ts
import { calculateTotal, applyDiscount, addItem } from './cart';

const mockItem = (overrides = {}): CartItem => ({
  id: '1', name: 'Test', price: 1000, quantity: 1, ...overrides,
});

describe('calculateTotal', () => {
  it('returns 0 for empty cart', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('sums price × quantity for all items', () => {
    const items = [
      mockItem({ price: 1000, quantity: 2 }),
      mockItem({ id: '2', price: 500, quantity: 3 }),
    ];
    expect(calculateTotal(items)).toBe(3500);
  });
});

describe('applyDiscount', () => {
  it('applies percentage correctly', () => {
    expect(applyDiscount(1000, 10)).toBe(900);
    expect(applyDiscount(1000, 50)).toBe(500);
  });

  it('throws for invalid discount', () => {
    expect(() => applyDiscount(1000, -1)).toThrow('Invalid discount');
    expect(() => applyDiscount(1000, 101)).toThrow('Invalid discount');
  });
});

describe('addItem', () => {
  it('adds new item to cart', () => {
    const result = addItem([], mockItem());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('increments quantity for existing item', () => {
    const cart = [mockItem({ quantity: 1 })];
    const result = addItem(cart, mockItem({ quantity: 2 }));
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });
});
```

---

## Mocking: jest.fn() and jest.mock()

### jest.fn() — Mockito.mock() equivalent

```typescript
// Testing a function that calls a callback
function fetchUsers(onSuccess: (users: User[]) => void, onError: (err: Error) => void) {
  api.getUsers().then(onSuccess).catch(onError);
}

test('calls onSuccess with users on successful fetch', async () => {
  const onSuccess = jest.fn();  // Mockito.mock(Function.class)
  const onError = jest.fn();

  jest.spyOn(api, 'getUsers').mockResolvedValue([{ id: '1', name: 'Gui' }]);

  await fetchUsers(onSuccess, onError);

  // verify(onSuccess).invoke([{ id: '1', name: 'Gui' }])
  expect(onSuccess).toHaveBeenCalledWith([{ id: '1', name: 'Gui' }]);
  expect(onError).not.toHaveBeenCalled();
});
```

### jest.mock() — module-level mocking

```typescript
// Mock an entire module
jest.mock('../api/userApi', () => ({
  getUsers: jest.fn().mockResolvedValue([]),
  deleteUser: jest.fn().mockResolvedValue({ success: true }),
}));

import { getUsers } from '../api/userApi';

test('loads users on init', async () => {
  (getUsers as jest.Mock).mockResolvedValueOnce([
    { id: '1', name: 'Gui' },
  ]);

  // ... test logic
});
```

---

## Testing Async Code

```typescript
// Async with async/await — like Kotlin's runTest {}
test('fetches user profile', async () => {
  const profile = await fetchUserProfile('user-123');
  expect(profile.name).toBe('Guilherme');
});

// Testing rejected promises
test('throws on network error', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
  await expect(fetchUserProfile('user-123')).rejects.toThrow('Network error');
});

// Testing with fake timers — like Robolectric's ShadowLooper
test('debounce fires after delay', () => {
  jest.useFakeTimers();
  const callback = jest.fn();
  const debounced = debounce(callback, 300);

  debounced();
  expect(callback).not.toHaveBeenCalled();

  jest.advanceTimersByTime(300);
  expect(callback).toHaveBeenCalledTimes(1);

  jest.useRealTimers();
});
```

---

## Testing Zustand Stores

```typescript
// store/authStore.test.ts
import { act } from '@testing-library/react-native';
import { useAuthStore } from './authStore';

// Reset store between tests
beforeEach(() => {
  useAuthStore.setState({ user: null, isLoading: false, error: null });
});

test('login sets user on success', async () => {
  jest.spyOn(authApi, 'login').mockResolvedValue({ id: '1', name: 'Gui' });

  await act(async () => {
    await useAuthStore.getState().login('gui@email.com', 'pass123');
  });

  const { user, isLoading, error } = useAuthStore.getState();
  expect(user?.name).toBe('Gui');
  expect(isLoading).toBe(false);
  expect(error).toBeNull();
});

test('login sets error on failure', async () => {
  jest.spyOn(authApi, 'login').mockRejectedValue(new Error('Invalid credentials'));

  await act(async () => {
    await useAuthStore.getState().login('bad@email.com', 'wrong');
  });

  expect(useAuthStore.getState().error).toBe('Invalid credentials');
  expect(useAuthStore.getState().user).toBeNull();
});
```

---

## Coverage

```bash
npx jest --coverage --coverageReporters=text-summary

# Output:
# Statements   : 87.5% (56/64)
# Branches     : 80%   (16/20)
# Functions    : 90%   (18/20)
# Lines        : 87.5% (56/64)
```

In `jest` config, set thresholds:

```json
"jest": {
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 70,
      "functions": 80,
      "lines": 80
    }
  }
}
```

---

## Study Materials

- [Jest — Getting Started](https://jestjs.io/docs/getting-started)
- [Jest — Mock Functions](https://jestjs.io/docs/mock-functions)
- [Jest — Timer Mocks](https://jestjs.io/docs/timer-mocks)
- [React Native — Testing](https://reactnative.dev/docs/testing-overview)

### Videos

- [Fireship — Jest Crash Course](https://www.youtube.com/watch?v=7r4xVDI2vho)

---

## What's Next

Unit tests solid. Next: React Native Testing Library — testing components the way a user interacts with them.

➡ [React Native Testing Library](./02-react-native-testing-library)
