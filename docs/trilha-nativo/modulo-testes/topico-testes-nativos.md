---
title: Testes
---

# Tópico — Testes (Trilha 1: Devs Nativos)

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Configurar Jest em um projeto RN
- Escrever testes de unidade para lógica (hooks, helpers, services)
- Escrever testes de componentes com `@testing-library/react-native`
- Entender o papel de testes E2E com Detox e como se comparam a Espresso/XCUITest
- Integrar a suíte de testes ao pipeline de CI

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Native_to_RN_Testing_-_nativo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Mapeamento: Android/iOS → React Native

| Nativo                      | React Native                            | Observação |
|-----------------------------|------------------------------------------|------------|
| JUnit / XCTest              | Jest                                     | Unit tests, mocks |
| Espresso / XCUITest         | Detox                                    | E2E de UI móvel |
| Testes de ViewModel / Presenter | Testes de hooks / stores            | Lógica de UI e estado |
| Testes de Fragment/ViewController | Testes de screens/containers RN | Comportamento visual + fluxo |

---

## Ferramentas principais

- **Jest**: runner de testes, mocks, snapshots.
- **@testing-library/react-native**: testes de componentes RN, focados em comportamento (não em implementação).
- **Detox**: testes E2E (não detalhado em código aqui, mas apresentado conceitualmente).

---

## Testando componentes com `@testing-library/react-native`

Exemplo de tela de login com validação simples:


```tsx
// src/features/auth/screens/LoginScreen.tsx
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
    // chama API ou navega...
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


Teste da tela:


```tsx
// src/features/auth/screens/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';

test('mostra mensagem de erro para email inválido', () => {
  const { getByTestId, getByText } = render(<LoginScreen />);

  const input = getByTestId('input-email');
  fireEvent.changeText(input, 'sem-arroba');
  fireEvent.press(getByText('Login'));

  expect(getByTestId('error-text').props.children).toBe('Email inválido');
});
```


---

## Testando lógica (hooks, helpers)


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
  it('retorna weak para senhas curtas', () => {
    expect(getPasswordStrength('123')).toBe('weak');
  });

  it('retorna medium quando não há dígitos', () => {
    expect(getPasswordStrength('abcdef')).toBe('medium');
  });

  it('retorna strong quando é longa e tem dígitos', () => {
    expect(getPasswordStrength('abc12345')).toBe('strong');
  });
});
```


---

## Papel dos testes E2E (Detox)

Detox ocupa o mesmo espaço conceitual de Espresso/XCUITest:
- Roda o app em um device/emulador real.
- Interage com elementos da UI por IDs/texto.
- Valida fluxos completos (login, navegação, etc.).

Recomendação neste tópico:
- Introduzir o conceito.
- Mostrar exemplos de comandos (instalação, run). 
- Detalhar implementação em um tópico próprio de testes E2E (fora do escopo imediato).

---

## Exercício prático

1. Escolha uma tela com validação simples (ex.: formulário de login ou cadastro).
2. Escreva testes cobrindo:
   - Renderização inicial.
   - Validação de campos (erro vs sucesso).
   - Chamada de callback de submit (use `jest.fn()` para mockar).
3. Execute a suíte de testes com `npm test` ou `yarn test`.
4. Integre a execução de testes ao pipeline de CI (ver tópico de CI/CD).

---

## Materiais de estudo

### Documentação oficial
- [Testing Overview](https://reactnative.dev/docs/testing-overview)

### Artigos
- *Testing React Native Components with Testing Library*.
- *From JUnit/XCTest to Jest: Mapping Mobile Test Practices to React Native*.

### Vídeos

#### Unit & UI Testing in React Native (Jest + Testing Library) — 30 min

<details>
<summary>Descrição do conteúdo</summary>

O vídeo apresenta de forma prática como configurar Jest em um projeto RN e como escrever testes de componentes com `@testing-library/react-native`. O foco é mostrar que o mindset de testes em RN é muito parecido com o de testes em apps nativos: isolar lógica, testar fluxos principais e garantir a robustez antes de subir para produção.

Tópicos:
- Configuração de Jest e mapeamento de módulos.
- Uso de `testID` para localizar elementos em RN.
- Boas práticas de testes voltados ao comportamento do usuário.
- Introdução rápida ao Detox como ferramenta de E2E.

</details>
