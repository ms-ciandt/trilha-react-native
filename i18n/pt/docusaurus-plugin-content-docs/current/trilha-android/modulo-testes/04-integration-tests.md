---
title: "Testes de Integração"
sidebar_label: "Testes de Integração"
sidebar_position: 4
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## Unitário vs Integração vs E2E

| Escopo | Ferramenta | O que você testa |
|--------|-----------|-----------------|
| Função pura | Jest | Lógica de negócio, transformações |
| Componente | RNTL | Componente isolado |
| Tela (integração) | RNTL + API mockada | Tela completa com navegação e estado |
| E2E | Detox | Dispositivo real, gestos reais |

---

## Teste de Integração de uma Tela Completa

```tsx
// screens/ProductListScreen.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { ProductListScreen } from './ProductListScreen';

describe('ProductListScreen', () => {
  it('carrega e exibe produtos', async () => {
    server.use(
      http.get('https://api.example.com/products', () =>
        HttpResponse.json([
          { id: '1', name: 'Notebook', price: 299900 },
          { id: '2', name: 'Celular', price: 99900 },
        ])
      )
    );

    render(<ProductListScreen />);

    expect(screen.getByTestId('loader')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Notebook')).toBeTruthy();
      expect(screen.getByText('Celular')).toBeTruthy();
    });
  });

  it('exibe estado de erro em falha de rede', async () => {
    server.use(
      http.get('https://api.example.com/products', () => HttpResponse.error())
    );

    render(<ProductListScreen />);

    await waitFor(() => {
      expect(screen.getByText(/algo deu errado/i)).toBeTruthy();
    });
  });
});
```

---

## Configurando MSW (Mock Service Worker)

MSW intercepta chamadas `fetch` em nível de rede — equivalente ao `MockWebServer` do OkHttp.

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/users', () =>
    HttpResponse.json([{ id: '1', name: 'Guilherme' }])
  ),
  http.post('https://api.example.com/users', async ({ request }) => {
    const body = await request.json() as { name: string };
    return HttpResponse.json({ id: '2', name: body.name }, { status: 201 });
  }),
];
```

```typescript
// jest.setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Testando com Estado Zustand Real

```tsx
beforeEach(() => {
  useCartStore.setState({ items: [], total: 0 });
});

test('adiciona item ao carrinho e atualiza total', async () => {
  useCartStore.setState({
    items: [{ id: '1', name: 'Notebook', price: 299900, quantity: 1 }],
    total: 299900,
  });

  render(<CartScreen />);

  expect(screen.getByText('Notebook')).toBeTruthy();
  expect(screen.getByText('R$ 2.999,00')).toBeTruthy();

  fireEvent.press(screen.getByTestId('increase-qty-1'));

  await waitFor(() => {
    expect(screen.getByText('R$ 5.998,00')).toBeTruthy();
  });
});
```

---

## Materiais de Estudo

- [MSW — Mock Service Worker](https://mswjs.io/)
- [Kent C. Dodds — Escreva testes. Não muitos. Principalmente integração.](https://kentcdodds.com/blog/write-tests)

---

## Próximo Passo

➡ [Detox E2E](./05-detox-e2e)
