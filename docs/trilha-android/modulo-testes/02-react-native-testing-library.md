---
title: "React Native Testing Library"
sidebar_label: "RNTL"
sidebar_position: 2
---

## Video Overview

> Video for this topic coming soon.

## Espresso → React Native Testing Library

Espresso tests your Android UI by finding views and asserting on them. React Native Testing Library (RNTL) does the same for React Native — but with a key philosophy difference: **test behaviour, not implementation**.

| Espresso | RNTL |
|----------|------|
| `onView(withId(R.id.btn))` | `screen.getByRole('button', { name: 'Submit' })` |
| `onView(withText("Hello"))` | `screen.getByText('Hello')` |
| `.perform(click())` | `fireEvent.press(element)` |
| `onView(...).check(matches(isDisplayed()))` | `expect(element).toBeVisible()` |
| `waitFor { ... }` | `await waitFor(() => ...)` |

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

---

## Rendering a Component

```tsx
// components/LoginForm.tsx
import { useState } from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function LoginForm({ onSubmit, isLoading = false, error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View>
      {error && <Text testID="error-message">{error}</Text>}
      <TextInput
        testID="email-input"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        testID="password-input"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable
        testID="submit-button"
        onPress={() => onSubmit(email, password)}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Log in"
      >
        <Text>{isLoading ? 'Loading...' : 'Log in'}</Text>
      </Pressable>
    </View>
  );
}
```

```tsx
// components/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('renders email and password inputs', () => {
    render(<LoginForm onSubmit={jest.fn()} />);

    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('calls onSubmit with typed credentials', () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'gui@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'pass123');
    fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(onSubmit).toHaveBeenCalledWith('gui@example.com', 'pass123');
  });

  it('shows error message when error prop is set', () => {
    render(<LoginForm onSubmit={jest.fn()} error="Invalid credentials" />);
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('disables button while loading', () => {
    render(<LoginForm onSubmit={jest.fn()} isLoading />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});
```

---

## Queries: Finding Elements

RNTL provides multiple query strategies — prefer accessibility-based queries:

```tsx
// By accessibility role — preferred (most resilient to UI changes)
screen.getByRole('button', { name: 'Submit' });
screen.getByRole('textbox', { name: 'Email' });

// By text content
screen.getByText('Hello World');
screen.getByText(/hello/i); // regex — case insensitive

// By placeholder
screen.getByPlaceholderText('Enter email');

// By testID — last resort, implementation detail
screen.getByTestId('submit-button');

// Variants:
// getBy* — throws if not found (use for elements that must be present)
// queryBy* — returns null if not found (use for elements that may be absent)
// findBy* — async, waits for element to appear (use for async renders)
```

### asserting absence

```tsx
// Assert element is NOT present
expect(screen.queryByText('Error')).toBeNull();

// Assert element is NOT visible (rendered but hidden)
expect(screen.queryByText('Tooltip')).not.toBeVisible();
```

---

## Testing Async Behaviour

```tsx
// components/UserProfile.tsx
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
  });

  if (isLoading) return <ActivityIndicator testID="loader" />;
  return <Text testID="user-name">{data?.name}</Text>;
}
```

```tsx
// components/UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfile } from './UserProfile';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

test('shows loader then user name', async () => {
  jest.spyOn(api, 'getUser').mockResolvedValue({ id: '1', name: 'Guilherme' });

  render(<UserProfile userId="1" />, { wrapper });

  // Loader appears immediately
  expect(screen.getByTestId('loader')).toBeTruthy();

  // Wait for name to appear (async)
  await waitFor(() => {
    expect(screen.getByTestId('user-name')).toBeTruthy();
  });

  expect(screen.getByText('Guilherme')).toBeTruthy();
});
```

---

## Firing Events

```tsx
// Text input
fireEvent.changeText(input, 'new value');

// Press
fireEvent.press(button);

// Scroll
fireEvent.scroll(scrollView, {
  nativeEvent: { contentOffset: { y: 500 } },
});

// Custom events
fireEvent(element, 'onLayout', {
  nativeEvent: { layout: { width: 300, height: 200 } },
});
```

---

## Testing Navigation

Wrap with a real or mock navigator:

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function TestNavigator({ initialRoute = 'Home' }) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

test('navigates to detail on press', async () => {
  render(<TestNavigator />);

  fireEvent.press(screen.getByText('View Detail'));

  await waitFor(() => {
    expect(screen.getByText('Detail Screen')).toBeTruthy();
  });
});
```

---

## Custom Render with Providers

Wrap all providers once in a test utility:

```tsx
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '../theme/ThemeContext';

function AllProviders({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <NavigationContainer>{children}</NavigationContainer>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function customRender(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react-native';
export { customRender as render };
```

---

## Study Materials

- [React Native Testing Library — Docs](https://callstack.github.io/react-native-testing-library/)
- [Testing Library — Queries](https://testing-library.com/docs/queries/about)
- [Kent C. Dodds — Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)

### Videos

- [Jack Herrington — React Native Testing Library](https://www.youtube.com/watch?v=CpTQb0XWlRc)

---

## What's Next

Components tested. Next: mocking TurboModules and native modules in Jest.

➡ [Mocking Native Modules](./03-mocking-native-modules)
