---
title: Testes
---

# Tópico — Testes (Trilha Web) 

### Objetivo do tópico

Ao final, o dev deve conseguir:

- Configurar Jest em um projeto RN
- Escrever testes de componentes RN com `@testing-library/react-native`
- Escrever testes de hooks e lógica com Jest
- Entender o papel de Detox para E2E (mesmo que não implemente tudo neste tópico)

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Web_to_RN_Testing_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Ferramentas

- **Jest** — runner e asserções.
- **@testing-library/react-native** — mesma filosofia do Testing Library web: testar o comportamento, não a implementação.
- **Detox** — testes E2E automatizados em devices/emuladores (introdução conceitual).

---

### Testando um componente RN (paralelo com web)

Componente:

```tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!email.includes('@')) {
      setError('Email inválido');
      return;
    }
    // chama API...
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

Teste:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';

it('exibe erro quando email é inválido', () => {
  const { getByTestId, getByText } = render(<LoginScreen />);

  const input = getByTestId('input-email');
  fireEvent.changeText(input, 'invalid-email');
  fireEvent.press(getByText('Login'));

  expect(getByTestId('error-text').props.children).toBe('Email inválido');
});
```

Diferenças principais em relação ao web:

- `TextInput` em vez de `<input />`, e método `changeText` em vez de `change`.
- `testID` é a forma recomendada de identificar elementos em RN (não há `data-testid` por padrão).

---

### Exercício prático

1. Escolha um componente RN com lógica simples:
   - Ex.: um formulário com 2 campos e validação básica.
2. Escreva testes que cubram:
   - Estado inicial (sem erro).
   - Erros quando campos são inválidos.
   - Sucesso quando campos são válidos.
3. Compare com seus testes em React web e liste:
   - O que é igual.
   - O que muda (tipos de componentes, eventos, ambiente).

---

### Materiais de estudo

- [@testing-library/react-native Docs](https://testing-library.com/docs/react-native-testing-library/intro/)
- Guia: *Testing React Native for React Web Developers*
- Vídeo: *Jest & Testing Library in React Native*

---

Next → **[CI/CD](../modulo-cicd/topico-ci-cd-web)**
