---
title: Testing
---

# Topic — Testing (Web Track)

### Topic Goal

By the end, you should be able to:

- Configure Jest in an RN project
- Write RN component tests with `@testing-library/react-native`
- Write hook and logic tests with Jest
- Understand the role of Detox for E2E (even if you don't implement everything in this topic)

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Web_to_RN_Testing_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Tools

- **Jest** — test runner and assertions.
- **@testing-library/react-native** — same philosophy as Testing Library web: test behavior, not implementation.
- **Detox** — automated E2E tests on devices/emulators (conceptual introduction).

---

### Testing an RN Component (parallel with web)

Component:

```tsx
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
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';

it('shows error when email is invalid', () => {
  const { getByTestId, getByText } = render(<LoginScreen />);

  const input = getByTestId('input-email');
  fireEvent.changeText(input, 'invalid-email');
  fireEvent.press(getByText('Login'));

  expect(getByTestId('error-text').props.children).toBe('Invalid email');
});
```

Main differences compared to web:

- `TextInput` instead of `<input />`, and method `changeText` instead of `change`.
- `testID` is the recommended way to identify elements in RN (there is no `data-testid` by default).

---

### Practical Exercise

1. Choose an RN component with simple logic:
   - Ex.: a form with 2 fields and basic validation.
2. Write tests that cover:
   - Initial state (no error).
   - Errors when fields are invalid.
   - Success when fields are valid.
3. Compare with your React web tests and list:
   - What is the same.
   - What changes (component types, events, environment).

---

### Study Materials

- [@testing-library/react-native Docs](https://testing-library.com/docs/react-native-testing-library/intro/)
- Guide: *Testing React Native for React Web Developers*
- Video: *Jest & Testing Library in React Native*

---

Next → **[CI/CD](../modulo-cicd/topico-ci-cd-web)**