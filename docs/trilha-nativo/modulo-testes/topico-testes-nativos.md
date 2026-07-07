---
title: Testing
---

# Topic — Testing (Track 1: Native Devs)

## Topic Goal

By the end, you should be able to:
- Configure Jest in a RN project
- Write unit tests for logic (hooks, helpers, services)
- Write component tests with `@testing-library/react-native`
- Understand the role of E2E tests with Detox and how they compare to Espresso/XCUITest
- Integrate the test suite into the CI pipeline

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Native_to_RN_Testing_-_nativo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Mapping: Android/iOS → React Native

| Native                      | React Native                            | Note |
|-----------------------------|------------------------------------------|------------|
| JUnit / XCTest              | Jest                                     | Unit tests, mocks |
| Espresso / XCUITest         | Detox                                    | Mobile UI E2E |
| ViewModel / Presenter tests | Hook / store tests            | UI logic and state |
| Fragment/ViewController tests | RN screen/container tests | Visual behavior + flow |

---

## Main Tools

- **Jest**: test runner, mocks, snapshots.
- **@testing-library/react-native**: RN component tests, focused on behavior (not implementation).
- **Detox**: E2E tests (not detailed in code here, but presented conceptually).

---

## Testing Components with `@testing-library/react-native`

Example of a login screen with simple validation:


```tsx
// src/features/auth/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!email.includes('@')) {
      setError('Invalid email');
      return;
    }
    // call API or navigate...
  };

  return (
    <View>
      <TextInput
        testID="input-email"
        value={email}
        onChangeText={setEmail}
      />
      <Button title="Login" onPress={handleSubmit} />
      {error ? <Text testID="error-text">{error}</Text> : null}
    </View>
  );
}
```


Screen test:


```tsx
// src/features/auth/screens/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';

test('shows error message for invalid email', () => {
  const { getByTestId, getByText } = render(<LoginScreen />);

  const input = getByTestId('input-email');
  fireEvent.changeText(input, 'no-at-sign');
  fireEvent.press(getByText('Login'));

  expect(getByTestId('error-text').props.children).toBe('Invalid email');
});
```


---

## Testing Logic (hooks, helpers)


```tsx
// src/features/auth/hooks/usePasswordStrength.ts
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 6) return 'weak';
  if (!/[0-9]/.test(password)) return 'medium';
  return 'strong';
}
```



```tsx
// src/features/auth/hooks/usePasswordStrength.test.ts
import { getPasswordStrength } from './usePasswordStrength';

describe('getPasswordStrength', () => {
  it('returns weak for short passwords', () => {
    expect(getPasswordStrength('123')).toBe('weak');
  });

  it('returns medium when there are no digits', () => {
    expect(getPasswordStrength('abcdef')).toBe('medium');
  });

  it('returns strong when long and has digits', () => {
    expect(getPasswordStrength('abc12345')).toBe('strong');
  });
});
```


---

## The Role of E2E Tests (Detox)

Detox occupies the same conceptual space as Espresso/XCUITest:
- Runs the app on a real device/emulator.
- Interacts with UI elements by IDs/text.
- Validates complete flows (login, navigation, etc.).

Recommendation for this topic:
- Introduce the concept.
- Show command examples (installation, run).
- Detail implementation in a dedicated E2E testing topic (outside the immediate scope).

---

## Practical Exercise

1. Choose a screen with simple validation (e.g.: login or registration form).
2. Write tests covering:
   - Initial rendering.
   - Field validation (error vs success).
   - Submit callback invocation (use `jest.fn()` to mock).
3. Run the test suite with `npm test` or `yarn test`.
4. Integrate test execution into the CI pipeline (see CI/CD topic).

---

## Study Materials

### Official Documentation
- [Testing Overview](https://reactnative.dev/docs/testing-overview)

### Articles
- *Testing React Native Components with Testing Library*.
- *From JUnit/XCTest to Jest: Mapping Mobile Test Practices to React Native*.

---

Next → **[CI/CD](../modulo-cicd/topico-ci-cd-nativos)**