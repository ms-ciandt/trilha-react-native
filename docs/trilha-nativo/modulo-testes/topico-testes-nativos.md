---
title: Testing
---

# Testing

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_nativo/test_01_testes.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## The Same Pyramid, a Different Stack

If you're coming from Android or iOS, the testing pyramid is already part of your workflow: unit tests at the base, UI tests in the middle, E2E tests at the top. React Native maps cleanly onto that pyramid — only the tools change.

**Jest** is your JUnit/XCTest: fast, runs in Node, no device needed. **@testing-library/react-native** gives you component-level tests focused on behavior rather than implementation. **Detox** occupies the top tier — it drives a real device or emulator the same way Espresso and XCUITest do.

---

## Mapping: Android/iOS → React Native

| Native | React Native | Note |
|---|---|---|
| JUnit / XCTest | Jest | Unit tests, mocks, snapshots |
| Espresso / XCUITest | Detox | Mobile UI E2E on real device/emulator |
| ViewModel / Presenter tests | Hook and store tests | UI logic and state in isolation |
| Fragment / ViewController tests | Screen and container tests | Visual behavior and navigation flow |

---

## Testing Components

`@testing-library/react-native` follows the same philosophy as Testing Library on web: test what the user sees and does, not internal implementation details. You query by `testID`, by visible text, or by accessibility label — not by component class or instance variable.

A login screen with basic validation:

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
    // navigate or call API...
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

Its test:

```tsx
// src/features/auth/screens/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';

test('shows error message for invalid email', () => {
  const { getByTestId, getByText } = render(<LoginScreen />);

  fireEvent.changeText(getByTestId('input-email'), 'no-at-sign');
  fireEvent.press(getByText('Login'));

  expect(getByTestId('error-text').props.children).toBe('Invalid email');
});
```

`testID` is the RN equivalent of an accessibility identifier in XCTest or a `contentDescription` in Espresso — it's purely a test hook and has no effect on production behaviour.

---

## Testing Logic (hooks, helpers)

Pure logic — password validators, formatters, calculation helpers — is the easiest layer to test. No rendering, no device, just functions.

```ts
// src/features/auth/utils/passwordStrength.ts
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 6) return 'weak';
  if (!/[0-9]/.test(password)) return 'medium';
  return 'strong';
}
```

```ts
// src/features/auth/utils/passwordStrength.test.ts
import { getPasswordStrength } from './passwordStrength';

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

Keep this layer thick. The more behaviour you can push into pure functions, the less you need to render components or spin up emulators.

---

## E2E Tests with Detox

Detox occupies the same conceptual space as Espresso and XCUITest: it launches the real app on a device or emulator and drives it through complete user flows. It is slower and more brittle than unit tests — but it's the only layer that catches integration failures, deep link routing bugs, and platform-specific rendering issues that Jest simply cannot see.

The setup is heavier (you'll configure a Detox binary for each platform and wire it into CI), but the test code reads much like an Espresso test:

```js
// e2e/login.test.js
describe('Login flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('shows an error for an invalid email', async () => {
    await element(by.id('input-email')).typeText('not-an-email');
    await element(by.text('Login')).tap();
    await expect(element(by.id('error-text'))).toBeVisible();
  });
});
```

A practical split for most apps: Jest for all unit and component tests (fast feedback, runs in CI in seconds), Detox for the critical happy paths only (login, checkout, core navigation). Full-coverage E2E suites are expensive to maintain — treat them like integration tests in Android, not like unit tests.

---

## Running Tests

```bash
# Unit and component tests
npm test

# Watch mode during development
npm test -- --watch

# Coverage report
npm test -- --coverage
```

Jest configuration lives in `jest.config.js` or the `"jest"` key in `package.json`. The default RN template already ships a working config — you rarely need to touch it.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Testing Overview | Official Docs | [reactnative.dev/docs/testing-overview](https://reactnative.dev/docs/testing-overview) |
| @testing-library/react-native | Official Docs | [callstack.github.io/react-native-testing-library](https://callstack.github.io/react-native-testing-library) |
| Detox | Official Docs | [wix.github.io/Detox](https://wix.github.io/Detox) |
| Jest | Official Docs | [jestjs.io](https://jestjs.io) |

---

Next → **[CI/CD](../modulo-cicd/topico-ci-cd-nativos)**
