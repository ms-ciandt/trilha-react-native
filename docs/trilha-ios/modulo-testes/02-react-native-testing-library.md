---
title: React Native Testing Library
---

# React Native Testing Library

If you have written UI tests with XCUITest, you already understand the core philosophy: interact with your app the way a user would, and verify what the user sees. React Native Testing Library (RNTL) applies the same philosophy to component tests. It renders a component tree in a lightweight environment and gives you queries that mirror how a user — or VoiceOver — would find elements on screen.

## The Mental Model Shift

XCUITest launches a full simulator and inspects the accessibility hierarchy produced by UIKit. RNTL renders a React Native component tree in Node using a thin host environment (no GPU, no native bridge). Despite the difference in scope, the querying vocabulary maps closely:

| XCUITest | RNTL |
|---|---|
| `app.buttons["Submit"]` | `getByRole('button', { name: 'Submit' })` |
| `app.staticTexts["Welcome"]` | `getByText('Welcome')` |
| `element.accessibilityIdentifier` | `getByTestId('my-id')` |
| `XCTAssertTrue(element.exists)` | `expect(element).toBeOnTheScreen()` |
| `element.tap()` | `await userEvent.press(element)` |
| `element.typeText("hello")` | `await userEvent.type(element, 'hello')` |

Install the library and its companion matchers:

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

Add the matchers to your Jest setup file:

```ts
// jest.setup.ts
import '@testing-library/jest-native/extend-expect';
```

## render() and the screen Object

In XCTest, `self` is your test case and the XCUIApplication is your entry point. In RNTL, `render()` is your entry point and `screen` is the object you query against.

```tsx
import { render, screen } from '@testing-library/react-native';
import { LoginForm } from '../LoginForm';

test('shows a submit button', () => {
  render(<LoginForm />);

  const button = screen.getByRole('button', { name: 'Sign In' });
  expect(button).toBeOnTheScreen();
});
```

`render()` mounts the component and `screen` holds references to all query functions scoped to that render. You can also destructure queries directly from the return value of `render()`, but using `screen` is the preferred pattern because it avoids stale variable references when the component re-renders.

## Queries: Prefer Role and Text Over testID

XCUITest encourages `accessibilityIdentifier` as a last resort — first try accessibility labels and traits. RNTL follows the same hierarchy. Prefer queries in this order:

1. `getByRole` — mirrors VoiceOver traits and ARIA roles
2. `getByText` — finds elements by visible text content
3. `getByLabelText` — finds elements by their `accessibilityLabel`
4. `getByPlaceholderText` — finds text inputs by placeholder
5. `getByTestId` — last resort, requires adding `testID` to markup

### getByRole

`getByRole` is the closest equivalent to XCUITest's element type queries. Under the hood it reads the `accessibilityRole` and `accessibilityState` props on React Native elements.

```tsx
// Finds a button with the accessible name "Delete Account"
const deleteButton = screen.getByRole('button', { name: 'Delete Account' });

// Finds a checked checkbox
const rememberMe = screen.getByRole('checkbox', { name: 'Remember me', checked: true });

// Finds a heading
const title = screen.getByRole('header', { name: 'Profile' });
```

Common role values: `'button'`, `'link'`, `'checkbox'`, `'radio'`, `'switch'`, `'header'`, `'image'`, `'combobox'`, `'spinbutton'`.

### getByText

Use `getByText` when there is no meaningful role or when the visible text is the natural identifier:

```tsx
const label = screen.getByText('Terms and Conditions');
const partial = screen.getByText(/welcome/i);
```

The second argument accepts a string, regex, or function. Regex is useful for case-insensitive matches and partial strings.

### getByTestId

Reserve `testID` for elements that have no accessible role or text — custom animated views, decorative containers — or for situations where a precise DOM selector is unavoidable.

```tsx
// In the component
<Animated.View testID="loading-spinner" />

// In the test
const spinner = screen.getByTestId('loading-spinner');
```

### Query Variants

Each base query has six variants:

| Variant | Behavior |
|---|---|
| `getBy*` | Returns element or throws if not found |
| `getAllBy*` | Returns array or throws if none found |
| `queryBy*` | Returns element or `null` — use to assert absence |
| `queryAllBy*` | Returns array (may be empty) |
| `findBy*` | Returns a Promise — waits for element to appear |
| `findAllBy*` | Returns a Promise for an array |

Use `queryBy*` when you expect an element to be absent:

```tsx
expect(screen.queryByText('Error message')).not.toBeOnTheScreen();
```

## fireEvent vs userEvent

RNTL provides two interaction APIs. Understanding the difference matters for test fidelity.

### fireEvent — Synchronous, Low-Level

`fireEvent` dispatches a synthetic event directly to a component. It is the older API and is synchronous. Think of it as calling the event handler directly rather than simulating a real gesture.

```tsx
import { fireEvent } from '@testing-library/react-native';

fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
fireEvent.changeText(screen.getByPlaceholderText('Email'), 'user@example.com');
```

### userEvent — Async, Realistic

`userEvent` simulates the full sequence of events that a real interaction produces. A press generates `pointerEnter`, `pointerDown`, `pointerUp`, `pointerLeave`, and `press` events in order. A type interaction fires per-character `keyPress` events. This is the preferred API because it tests the component's actual behavior, not an idealized handler invocation.

```tsx
import { userEvent } from '@testing-library/react-native';

test('submits login credentials', async () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  const user = userEvent.setup();

  await user.type(screen.getByPlaceholderText('Email'), 'kira@example.com');
  await user.type(screen.getByPlaceholderText('Password'), 'correct-horse');
  await user.press(screen.getByRole('button', { name: 'Sign In' }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'kira@example.com',
    password: 'correct-horse',
  });
});
```

`userEvent.setup()` returns a user instance. All interactions on that instance share a clock and event context, which matters when components debounce input or batch state updates.

The rule: use `userEvent` for all new tests. Use `fireEvent` only when `userEvent` cannot express the interaction (rare).

## Testing Async Behavior: waitFor and findBy

XCUITest handles asynchronous UI with `XCTestExpectation` and `waitForExpectations(timeout:)`. RNTL provides `waitFor` and the `findBy*` query family.

### waitFor

`waitFor` retries a callback on each render cycle until it stops throwing or the timeout elapses (default 1000 ms). It is equivalent to polling XCUITest predicate expectations.

```tsx
import { waitFor } from '@testing-library/react-native';

test('shows user profile after fetch', async () => {
  render(<ProfileScreen userId="123" />);

  expect(screen.getByText('Loading...')).toBeOnTheScreen();

  await waitFor(() => {
    expect(screen.getByText('Kira Yamada')).toBeOnTheScreen();
  });

  expect(screen.queryByText('Loading...')).not.toBeOnTheScreen();
});
```

Pass an options object to override the timeout or polling interval:

```tsx
await waitFor(
  () => expect(screen.getByText('Saved')).toBeOnTheScreen(),
  { timeout: 3000, interval: 100 },
);
```

### findBy Queries

`findBy*` queries are syntactic sugar over `waitFor` + `getBy*`. Prefer them when you are simply waiting for an element to appear:

```tsx
// Equivalent to: await waitFor(() => screen.getByText('Kira Yamada'))
const name = await screen.findByText('Kira Yamada');
expect(name).toBeOnTheScreen();
```

`findBy*` is cleaner for single-element waits. Use `waitFor` when you need to assert on multiple elements or combine assertions.

## act() — The XCTestExpectation Equivalent

React batches state updates. If a test triggers a state update outside of an event handler (a `setTimeout`, a resolved Promise, a `useEffect`), the update might not be flushed before your assertion runs. Wrapping the trigger in `act()` tells React to flush all pending state updates and effects before continuing.

In XCTest terms, `act()` is equivalent to calling `fulfill()` on an `XCTestExpectation` — it signals that an asynchronous operation is complete and state is settled.

```tsx
import { act } from '@testing-library/react-native';

test('counter increments after delay', async () => {
  jest.useFakeTimers();
  render(<DelayedCounter />);

  expect(screen.getByText('0')).toBeOnTheScreen();

  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  expect(screen.getByText('1')).toBeOnTheScreen();
});
```

In practice, `userEvent` and `waitFor` already wrap their internals in `act()`. You only need to call `act()` directly when you are manually advancing timers or resolving mocked Promises outside of RNTL's own APIs.

## Avoiding Implementation Detail Testing

One of the most important XCTest lessons is to test behavior, not implementation. WWDC sessions on testing consistently emphasize writing tests that survive refactors. RNTL enforces the same discipline by not exposing the component's internal state or instance methods.

Avoid:

```tsx
// Do not inspect internal state
const instance = component.getInstance();
expect(instance.state.isLoading).toBe(false);

// Do not query by component display name
screen.UNSAFE_getByType(ActivityIndicator);
```

Prefer:

```tsx
// Test what the user sees
expect(screen.queryByText('Loading...')).not.toBeOnTheScreen();

// Test accessible output
expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
```

If a refactor changes your component's internal state shape but not its visible behavior, your tests should continue to pass. If they break, the tests were too tightly coupled to implementation.

## Testing Navigation

React Navigation passes a `navigation` prop to screen components. In unit tests you do not want to mount the full navigator — instead, pass a mocked navigation object.

```tsx
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

test('navigates to detail screen on card press', async () => {
  render(<ItemListScreen navigation={mockNavigation} route={{ params: {} }} />);

  const user = userEvent.setup();
  await user.press(screen.getByText('Swift Concurrency'));

  expect(mockNavigate).toHaveBeenCalledWith('ItemDetail', { id: 'swift-concurrency' });
});
```

For hooks like `useNavigation()`, wrap the component in a minimal `NavigationContainer` or mock the hook at the module level:

```tsx
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
```

## Testing with Providers

Most production components depend on context: a query client, a theme, an auth session. Create a reusable wrapper and pass it to `render()` via the `wrapper` option.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../theme/ThemeProvider';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

test('displays user data from the API', async () => {
  render(<UserCard userId="42" />, { wrapper: createWrapper() });

  const name = await screen.findByText('Kira Yamada');
  expect(name).toBeOnTheScreen();
});
```

Setting `retry: false` on the QueryClient prevents React Query from retrying failed requests during tests, which keeps failures fast and deterministic.

A common pattern is to export a `renderWithProviders` helper from a shared test utility file:

```tsx
// test-utils.tsx
import { render } from '@testing-library/react-native';
import { createWrapper } from './createWrapper';

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

export * from '@testing-library/react-native';
```

Tests then import from `test-utils` instead of from `@testing-library/react-native`:

```tsx
import { renderWithProviders, screen } from '../test-utils';

test('shows profile', async () => {
  renderWithProviders(<ProfileScreen />);
  expect(await screen.findByText('Kira Yamada')).toBeOnTheScreen();
});
```

## Accessibility Queries and VoiceOver Mapping

`getByRole` reads the `accessibilityRole` prop, which maps directly to UIAccessibility traits that VoiceOver announces on a real device. Writing role-based tests gives you two benefits: readable tests and implicit accessibility coverage.

| iOS Accessibility Trait | React Native accessibilityRole | RNTL query |
|---|---|---|
| `.button` | `'button'` | `getByRole('button')` |
| `.link` | `'link'` | `getByRole('link')` |
| `.header` | `'header'` | `getByRole('header')` |
| `.image` | `'image'` | `getByRole('image')` |
| `.adjustable` | `'adjustable'` | `getByRole('spinbutton')` |
| `.selected` | `accessibilityState.selected: true` | `getByRole('radio', { selected: true })` |
| `.disabled` | `accessibilityState.disabled: true` | not `toBeDisabled()` |

Testing the accessible name alongside the role makes tests resilient to layout changes while also verifying that VoiceOver will announce something meaningful:

```tsx
// Bad — couples test to icon position in the DOM
const button = screen.getAllByRole('button')[2];

// Good — ties to the accessible name a VoiceOver user would hear
const button = screen.getByRole('button', { name: 'Delete item' });
```

If a component lacks a visible label but has an `accessibilityLabel`, use `getByLabelText`:

```tsx
const closeButton = screen.getByLabelText('Close modal');
```

## Running Tests

```bash
# Run all tests
npx jest

# Run tests matching a file pattern
npx jest LoginForm

# Run in watch mode
npx jest --watch

# Run with coverage
npx jest --coverage
```

Jest runs tests in Node, so they execute in milliseconds compared to XCUITest's simulator launch time. A test suite of several hundred component tests typically completes in under thirty seconds.

## Next Steps

With RNTL in place, the next layer of testing is end-to-end: full device or simulator tests that exercise navigation stacks, native modules, and real network calls. Detox (covered in the following section) fills that role for React Native the same way XCUITest fills it for native iOS apps.
