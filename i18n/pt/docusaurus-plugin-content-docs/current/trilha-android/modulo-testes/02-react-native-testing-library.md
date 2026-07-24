---
title: "React Native Testing Library"
sidebar_label: "RNTL"
sidebar_position: 2
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## Espresso → React Native Testing Library

| Espresso | RNTL |
|----------|------|
| `onView(withId(R.id.btn))` | `screen.getByRole('button', { name: 'Enviar' })` |
| `onView(withText("Olá"))` | `screen.getByText('Olá')` |
| `.perform(click())` | `fireEvent.press(element)` |
| `.check(matches(isDisplayed()))` | `expect(element).toBeVisible()` |
| `waitFor { ... }` | `await waitFor(() => ...)` |

---

## Renderizando um Componente

```tsx
// components/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('renderiza campos de email e senha', () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Senha')).toBeTruthy();
  });

  it('chama onSubmit com as credenciais digitadas', () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'gui@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Senha'), 'pass123');
    fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledWith('gui@example.com', 'pass123');
  });

  it('exibe mensagem de erro quando a prop error está definida', () => {
    render(<LoginForm onSubmit={jest.fn()} error="Credenciais inválidas" />);
    expect(screen.getByText('Credenciais inválidas')).toBeTruthy();
  });
});
```

---

## Queries: Encontrando Elementos

```tsx
// Por papel de acessibilidade — preferido
screen.getByRole('button', { name: 'Enviar' });
screen.getByRole('textbox', { name: 'Email' });

// Por texto
screen.getByText('Olá Mundo');
screen.getByText(/olá/i); // regex — sem distinção maiúsculas/minúsculas

// Por placeholder
screen.getByPlaceholderText('Digite o email');

// Por testID — último recurso
screen.getByTestId('submit-button');

// queryBy* — retorna null se não encontrado (sem lançar erro)
expect(screen.queryByText('Erro')).toBeNull();

// findBy* — assíncrono, aguarda o elemento aparecer
await screen.findByText('Carregado!');
```

---

## Testando Comportamento Assíncrono

```tsx
test('exibe loader e depois o nome do usuário', async () => {
  jest.spyOn(api, 'getUser').mockResolvedValue({ id: '1', name: 'Guilherme' });
  render(<UserProfile userId="1" />, { wrapper });

  expect(screen.getByTestId('loader')).toBeTruthy();

  await waitFor(() => {
    expect(screen.getByText('Guilherme')).toBeTruthy();
  });
});
```

---

## Render Customizado com Providers

```tsx
// test-utils.tsx
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

## Materiais de Estudo

- [React Native Testing Library — Docs](https://callstack.github.io/react-native-testing-library/)
- [Jack Herrington — React Native Testing Library](https://www.youtube.com/watch?v=CpTQb0XWlRc)

---

## Próximo Passo

➡ [Mockando Módulos Nativos](./03-mocking-native-modules)
