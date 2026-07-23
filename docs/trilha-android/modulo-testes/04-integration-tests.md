---
title: "Integration Tests"
sidebar_label: "Integration Tests"
sidebar_position: 4
---

## Video Overview

> Video for this topic coming soon.

## Unit vs Integration Tests in React Native

| Scope | Tool | What you test |
|-------|------|--------------|
| Pure function | Jest | Business logic, transformations, reducers |
| Component | RNTL | Single component in isolation |
| Screen (integration) | RNTL + mocked API | Full screen with navigation, state, API |
| E2E | Detox | Real device, real gestures, real navigation |

Integration tests in React Native render a full screen (or small navigator) with real state management and mocked network calls. They catch bugs that unit tests miss — wrong data flow, broken navigation, state not updating the UI correctly.

---

## A Full Screen Integration Test

```tsx
// screens/ProductListScreen.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '../test-utils'; // custom render with providers
import { server } from '../mocks/server'; // MSW mock server
import { http, HttpResponse } from 'msw';
import { ProductListScreen } from './ProductListScreen';

// MSW — Mock Service Worker: intercepts real fetch() calls in tests
// Equivalent of MockWebServer (OkHttp testing)

describe('ProductListScreen', () => {
  it('loads and displays products', async () => {
    server.use(
      http.get('https://api.example.com/products', () =>
        HttpResponse.json([
          { id: '1', name: 'Laptop', price: 299900 },
          { id: '2', name: 'Phone', price: 99900 },
        ])
      )
    );

    render(<ProductListScreen />);

    // Loading state
    expect(screen.getByTestId('loader')).toBeTruthy();

    // Data loaded
    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeTruthy();
      expect(screen.getByText('Phone')).toBeTruthy();
    });
  });

  it('shows error state on network failure', async () => {
    server.use(
      http.get('https://api.example.com/products', () =>
        HttpResponse.error()
      )
    );

    render(<ProductListScreen />);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    });
  });

  it('navigates to detail screen on product press', async () => {
    server.use(
      http.get('https://api.example.com/products', () =>
        HttpResponse.json([{ id: '1', name: 'Laptop', price: 299900 }])
      )
    );

    render(<ProductListScreen />);
    await waitFor(() => screen.getByText('Laptop'));

    fireEvent.press(screen.getByText('Laptop'));

    await waitFor(() => {
      expect(screen.getByText('Product Detail')).toBeTruthy();
    });
  });
});
```

---

## Setting Up MSW (Mock Service Worker)

MSW intercepts `fetch` at the network level — your production API code runs unchanged, only the response is mocked.

```bash
npm install --save-dev msw
```

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/users', () =>
    HttpResponse.json([{ id: '1', name: 'Guilherme' }])
  ),
  http.post('https://api.example.com/users', async ({ request }) => {
    const body = await request.json() as { name: string };
    return HttpResponse.json({ id: '2', name: body.name }, { status: 201 });
  }),
  http.delete('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ deleted: params.id })
  ),
];
```

```typescript
// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// jest.setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers()); // reset overrides between tests
afterAll(() => server.close());
```

---

## Testing with Real Zustand State

```tsx
// screens/CartScreen.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { useCartStore } from '../store/cartStore';
import { CartScreen } from './CartScreen';

beforeEach(() => {
  // Reset store to initial state
  useCartStore.setState({ items: [], total: 0 });
});

test('adds item to cart and updates total', async () => {
  useCartStore.setState({
    items: [{ id: '1', name: 'Laptop', price: 299900, quantity: 1 }],
    total: 299900,
  });

  render(<CartScreen />);

  expect(screen.getByText('Laptop')).toBeTruthy();
  expect(screen.getByText('R$ 2.999,00')).toBeTruthy();

  // Increase quantity
  fireEvent.press(screen.getByTestId('increase-qty-1'));

  await waitFor(() => {
    expect(screen.getByText('R$ 5.998,00')).toBeTruthy();
  });
});
```

---

## Snapshot Testing — Use Sparingly

Snapshot tests capture the rendered output and fail when it changes. Useful for stable presentational components, brittle for complex screens.

```tsx
import renderer from 'react-test-renderer';

test('PrimaryButton renders correctly', () => {
  const tree = renderer
    .create(<PrimaryButton label="Submit" onPress={jest.fn()} />)
    .toJSON();

  expect(tree).toMatchSnapshot();
});
```

> Use snapshots only for leaf components with no state and no async behaviour. For screens, prefer explicit assertions (`getByText`, `getByRole`) — they document intent, not implementation.

---

## Study Materials

- [MSW — Mock Service Worker](https://mswjs.io/)
- [Testing Library — User Interactions](https://testing-library.com/docs/user-event/intro)
- [Kent C. Dodds — Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests)

---

## What's Next

Integration tests done. Final topic: Detox — E2E tests on a real Android device or emulator.

➡ [Detox E2E Tests](./05-detox-e2e)
