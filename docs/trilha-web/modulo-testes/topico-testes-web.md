---
title: Testing
---

# Testing

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/The_Native_Shift__Testing_React_Native_for_Web_Developers.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Familiar Tools, Small Differences

If you've written tests with Jest and Testing Library on a React web project, testing in React Native will feel immediately familiar. The philosophy is identical — test what the user sees and does, not internal implementation details. The API surface is nearly the same. The differences are small and mechanical.

---

## Mapping: Web → React Native

| Web | React Native | Note |
|---|---|---|
| `@testing-library/react` | `@testing-library/react-native` | Same query API, same `render`/`fireEvent` pattern |
| `data-testid` | `testID` prop | RN's built-in test identifier — no custom attribute needed |
| `fireEvent.change(input, { target: { value } })` | `fireEvent.changeText(input, value)` | Simplified — no synthetic event object |
| `userEvent.click` | `fireEvent.press` | Touch instead of click |
| Cypress / Playwright | Detox | E2E on real devices/emulators |

---

## Testing a Component

The structure is identical to web: render, interact, assert.

Component:

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
    // call API...
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

Test:

```tsx
// src/features/auth/screens/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';

it('shows error when email is invalid', () => {
  const { getByTestId, getByText } = render(<LoginScreen />);

  fireEvent.changeText(getByTestId('input-email'), 'invalid-email');
  fireEvent.press(getByText('Login'));

  expect(getByTestId('error-text').props.children).toBe('Invalid email');
});
```

The two differences from a web test: `fireEvent.changeText` instead of `fireEvent.change`, and `testID` instead of `data-testid`. Everything else — `render`, `getByTestId`, `getByText`, `expect` — is the same.

---

## Testing Logic (hooks, utils)

Pure logic tests are completely identical to web — no RN-specific API involved.

```ts
// src/features/auth/utils/validateEmail.ts
export function validateEmail(email: string): boolean {
  return email.includes('@');
}
```

```ts
// src/features/auth/utils/validateEmail.test.ts
import { validateEmail } from './validateEmail';

describe('validateEmail', () => {
  it('returns false for strings without @', () => {
    expect(validateEmail('not-an-email')).toBe(false);
  });

  it('returns true for a valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });
});
```

Push as much behaviour as possible into pure functions. The more logic lives outside components, the less you need to render anything to test it.

---

## E2E with Detox

Detox is the RN equivalent of Cypress or Playwright — it launches the real app on a device or emulator and drives it through complete flows. The setup is heavier than web E2E (you need a compiled native binary), but the test code is straightforward:

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

Use Detox selectively — critical happy paths and flows that cross the JS/native boundary. Full-coverage E2E suites are expensive to maintain on mobile; Jest covers the bulk of your cases faster and more reliably.

---

## Running Tests

```bash
# All unit and component tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

The default RN template ships with a working Jest config. You rarely need to change it.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| @testing-library/react-native | Official Docs | [callstack.github.io/react-native-testing-library](https://callstack.github.io/react-native-testing-library) |
| Jest | Official Docs | [jestjs.io](https://jestjs.io) |
| Detox | Official Docs | [wix.github.io/Detox](https://wix.github.io/Detox) |
| Testing Overview | Official Docs | [reactnative.dev/docs/testing-overview](https://reactnative.dev/docs/testing-overview) |

---

Next → **[CI/CD](../modulo-cicd/topico-ci-cd-web)**
