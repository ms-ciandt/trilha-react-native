---
title: Integration Tests
---

# Integration Tests

## Integration Tests vs Unit Tests in React Native

Unit tests isolate a single function or component, replacing every dependency with a mock. Integration tests render a feature with its real child components, wiring together the actual component tree while still controlling external boundaries like the network and navigation.

In a typical iOS project you already know this distinction. An XCTest unit test might verify a single `ViewModel` method by injecting a fake repository. An XCTest integration test would spin up a real `UIViewController` with real sub-views, asserting that a tap on a button actually triggers the correct UI state transition across the whole hierarchy.

React Native integration tests follow the same philosophy: render the real `Screen` component, let it mount its real children (lists, forms, headers), and intercept only what lives outside the JavaScript boundary — HTTP calls, the native navigation stack, and device APIs.

### What integration tests cover

| Concern | Unit test | Integration test |
|---|---|---|
| Single hook logic | Yes | No (overkill) |
| Component renders correct JSX | Yes | Partial |
| Full screen with real children | No | Yes |
| Network loading / error / success | Mock in hook tests | MSW at HTTP boundary |
| Navigation after an action | No | Yes (mock navigator) |
| Form validation + submission flow | No | Yes |

---

## MSW for Network Interception

Mock Service Worker (MSW) intercepts HTTP requests at the network level, not at the `fetch` call site. In a browser it uses a Service Worker. In React Native (and Node-based test runners) it uses `msw/node`, which patches the global `fetch` and `XMLHttpRequest` implementations.

For an iOS developer, the mental model is close to `URLProtocol` subclassing — you register a handler that intercepts requests matching a pattern and returns a crafted response, without touching the production code that makes the request.

### Installation

```bash
npm install msw --save-dev
```

### Creating handlers

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/articles', () => {
    return HttpResponse.json([
      { id: '1', title: 'Getting started with RN', published: true },
      { id: '2', title: 'Fabric deep dive', published: true },
    ]);
  }),

  http.post('https://api.example.com/articles', async ({ request }) => {
    const body = await request.json() as { title: string };
    return HttpResponse.json({ id: '3', title: body.title, published: false }, { status: 201 });
  }),
];
```

### Setting up the server for tests

```ts
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```ts
// jest.setup.ts
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

The `onUnhandledRequest: 'error'` option is important — any request your test makes that has no handler will throw, preventing silent data leakage between tests.

---

## TanStack Query Test Setup

TanStack Query (React Query) caches results and retries failed requests by default. Both behaviours break integration tests: cached data from one test leaks into the next, and retry logic makes error-state tests slow and flaky.

Create a factory that produces a fresh `QueryClient` per test with retries and garbage collection disabled.

```ts
// src/test-utils/createTestQueryClient.ts
import { QueryClient } from '@tanstack/react-query';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
```

`retry: 0` — failed requests surface immediately as errors instead of retrying three times.  
`gcTime: 0` — query cache is garbage-collected immediately when observers unmount, so no data leaks between tests.  
`staleTime: 0` — every mount triggers a fresh fetch, giving MSW full control over what data each test sees.

---

## Testing a Full Screen Component

### The screen under test

```tsx
// src/screens/ArticleListScreen.tsx
import React from 'react';
import { FlatList, Text, View, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchArticles } from '../api/articles';

export function ArticleListScreen() {
  const navigation = useNavigation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['articles'],
    queryFn: fetchArticles,
  });

  if (isLoading) return <ActivityIndicator testID="loading-indicator" />;
  if (isError) return <Text testID="error-message">Failed to load articles.</Text>;

  return (
    <FlatList
      testID="article-list"
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          testID={`article-item-${item.id}`}
          onPress={() => navigation.navigate('ArticleDetail', { id: item.id })}
        >
          <Text>{item.title}</Text>
        </Pressable>
      )}
    />
  );
}
```

### Wrapper utility

```tsx
// src/test-utils/renderWithProviders.tsx
import React, { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createTestQueryClient } from './createTestQueryClient';

export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();

  const navigationRef = React.createRef<any>();
  const navigate = jest.fn();

  // Provide a minimal navigation mock so useNavigation() resolves
  const navigationContext = {
    navigate,
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    isFocused: () => true,
    addListener: jest.fn(() => () => {}),
    removeListener: jest.fn(),
    canGoBack: jest.fn(() => false),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer ref={navigationRef}>
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  );

  const result = render(ui, { wrapper: Wrapper });
  return { ...result, navigate, queryClient };
}
```

---

## Testing Loading, Error, and Success States

```tsx
// src/screens/__tests__/ArticleListScreen.test.tsx
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { userEvent } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { ArticleListScreen } from '../ArticleListScreen';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

describe('ArticleListScreen', () => {
  it('shows a loading indicator while fetching', async () => {
    // Use a delayed handler so the loading state is visible
    server.use(
      http.get('https://api.example.com/articles', async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return HttpResponse.json([]);
      }),
    );

    renderWithProviders(<ArticleListScreen />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders articles on successful fetch', async () => {
    // Default handlers return two articles
    renderWithProviders(<ArticleListScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('article-list')).toBeTruthy();
    });

    expect(screen.getByText('Getting started with RN')).toBeTruthy();
    expect(screen.getByText('Fabric deep dive')).toBeTruthy();
  });

  it('shows an error message when the request fails', async () => {
    server.use(
      http.get('https://api.example.com/articles', () => {
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
      }),
    );

    renderWithProviders(<ArticleListScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeTruthy();
    });

    expect(screen.getByText('Failed to load articles.')).toBeTruthy();
  });
});
```

Each test gets a fresh MSW handler scope via `server.resetHandlers()` in `afterEach`, and a fresh `QueryClient` via the wrapper factory, so state never crosses test boundaries.

---

## Testing Navigation Transitions

```tsx
it('navigates to the detail screen when an article is tapped', async () => {
  const { navigate } = renderWithProviders(<ArticleListScreen />);

  await waitFor(() => {
    expect(screen.getByTestId('article-item-1')).toBeTruthy();
  });

  await userEvent.press(screen.getByTestId('article-item-1'));

  expect(navigate).toHaveBeenCalledWith('ArticleDetail', { id: '1' });
});
```

The `navigate` mock captures the destination and params. This is equivalent to asserting in an XCTest that `navigationController.pushViewController(_:animated:)` was called with the correct view controller type — you are not testing the navigation framework itself, only that your screen triggers the correct transition.

---

## Testing Form Submission Flows

Form integration tests verify the entire path: user input, validation feedback, network call, and resulting UI state.

```tsx
// src/screens/__tests__/NewArticleScreen.test.tsx
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { userEvent } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { NewArticleScreen } from '../NewArticleScreen';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

describe('NewArticleScreen', () => {
  it('submits the form and shows a success confirmation', async () => {
    renderWithProviders(<NewArticleScreen />);

    const titleInput = screen.getByTestId('title-input');
    await userEvent.type(titleInput, 'My new article');
    await userEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeTruthy();
    });
  });

  it('shows a validation error when the title is empty', async () => {
    renderWithProviders(<NewArticleScreen />);

    await userEvent.press(screen.getByTestId('submit-button'));

    expect(screen.getByText('Title is required.')).toBeTruthy();
    // Network was never called — no MSW handler needed
  });

  it('shows a server error when the API rejects the submission', async () => {
    server.use(
      http.post('https://api.example.com/articles', () => {
        return HttpResponse.json({ message: 'Unprocessable Entity' }, { status: 422 });
      }),
    );

    renderWithProviders(<NewArticleScreen />);

    await userEvent.type(screen.getByTestId('title-input'), 'Bad article');
    await userEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error-message')).toBeTruthy();
    });
  });
});
```

---

## XCTest Integration Tests vs React Native Integration Tests

| Dimension | XCTest integration tests | RN integration tests (RNTL + MSW) |
|---|---|---|
| Render environment | Real UIKit hierarchy, simulator or device | JS-side virtual component tree via JSDOM / React Test Renderer |
| Network interception | `URLProtocol` subclass or `URLSession` injection | MSW patches `fetch` / `XMLHttpRequest` at the Node level |
| Navigation | Real `UINavigationController` or a test double | `NavigationContainer` with a mocked navigator context |
| Animation | Real Core Animation, assertions require delays | Animations are mocked or disabled by default in the test runner |
| Async assertions | `XCTestExpectation` with `waitForExpectations(timeout:)` | `waitFor(() => ...)` from Testing Library |
| Data store | In-memory Core Data stack or SQLite in a temp directory | Fresh `QueryClient` per test, or a mocked Zustand/Redux store |
| Flakiness source | Timing of animations and transitions | Unhandled async state updates, retry logic not disabled |

The critical difference is that XCTest integration tests can exercise real native code paths including CoreData persistence and UIKit animations. RN integration tests operate entirely within the JavaScript layer, which means they are faster and do not require a simulator, but they cannot catch native rendering bugs or Fabric layout issues. For those, you need Detox end-to-end tests (covered in the next section).

---

## Common Pitfalls

**Not disabling retries.** TanStack Query retries failed queries up to three times with exponential backoff. Without `retry: 0`, an error-state test will wait several seconds before the error surfaces.

**Shared QueryClient across tests.** Constructing one `QueryClient` at the module level means cache from the first test persists into the second. Always construct a new client per test inside the wrapper factory.

**MSW handler order.** `server.use()` inside a test overrides the default handlers for that test only. `server.resetHandlers()` in `afterEach` restores the defaults. If you forget `resetHandlers`, the override leaks into subsequent tests.

**Missing `await` on user events.** In `@testing-library/react-native` v12+, `userEvent` methods are asynchronous and must be awaited. Forgetting `await` before `userEvent.press()` or `userEvent.type()` produces race conditions where assertions run before the event is processed.

**Querying before the async boundary resolves.** After rendering a screen that fetches data, always wrap the first assertion in `waitFor`. The MSW handler responds on the next tick, so the loading state is the initial render and the data state requires at least one async resolution.
