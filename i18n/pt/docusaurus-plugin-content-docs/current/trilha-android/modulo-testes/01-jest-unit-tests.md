---
title: "Jest e Testes Unitários"
sidebar_label: "Jest e Testes Unitários"
sidebar_position: 1
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## JUnit → Jest

| JUnit / Kotlin | Jest |
|----------------|------|
| `@Test` | `test()` ou `it()` |
| `@BeforeEach` | `beforeEach()` |
| `@AfterEach` | `afterEach()` |
| `@BeforeAll` | `beforeAll()` |
| Bloco `describe {}` | `describe()` |
| `assertEquals(expected, actual)` | `expect(actual).toBe(expected)` |
| `assertNull(value)` | `expect(value).toBeNull()` |
| `assertThrows {}` | `expect(() => fn()).toThrow()` |
| `Mockito.mock(Class)` | `jest.fn()` / `jest.mock('modulo')` |
| `verify(mock).method()` | `expect(mockFn).toHaveBeenCalledWith(...)` |

---

## Escrevendo seu Primeiro Teste

```typescript
// utils/formatPrice.ts
export function formatPrice(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
```

```typescript
// utils/formatPrice.test.ts
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('formata centavos para string em BRL', () => {
    expect(formatPrice(1999)).toBe('R$ 19,99');
  });

  it('trata zero corretamente', () => {
    expect(formatPrice(0)).toBe('R$ 0,00');
  });

  it('suporta outras moedas', () => {
    const result = formatPrice(1000, 'USD');
    expect(result).toContain('10');
  });
});
```

---

## Testando Funções Puras — Lógica de Negócio

```typescript
// store/cart.test.ts
import { calculateTotal, applyDiscount, addItem } from './cart';

describe('calculateTotal', () => {
  it('retorna 0 para carrinho vazio', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('soma preço × quantidade de todos os itens', () => {
    const items = [
      { id: '1', name: 'A', price: 1000, quantity: 2 },
      { id: '2', name: 'B', price: 500, quantity: 3 },
    ];
    expect(calculateTotal(items)).toBe(3500);
  });
});

describe('applyDiscount', () => {
  it('aplica porcentagem corretamente', () => {
    expect(applyDiscount(1000, 10)).toBe(900);
  });

  it('lança erro para desconto inválido', () => {
    expect(() => applyDiscount(1000, -1)).toThrow('Invalid discount');
  });
});
```

---

## Mocking: jest.fn() e jest.mock()

```typescript
// jest.fn() — equivalente ao Mockito.mock()
const onSuccess = jest.fn();
const onError = jest.fn();

jest.spyOn(api, 'getUsers').mockResolvedValue([{ id: '1', name: 'Gui' }]);
await fetchUsers(onSuccess, onError);

expect(onSuccess).toHaveBeenCalledWith([{ id: '1', name: 'Gui' }]);
expect(onError).not.toHaveBeenCalled();
```

```typescript
// jest.mock() — mock de módulo completo
jest.mock('../api/userApi', () => ({
  getUsers: jest.fn().mockResolvedValue([]),
}));
```

---

## Código Assíncrono

```typescript
test('busca perfil do usuário', async () => {
  const profile = await fetchUserProfile('user-123');
  expect(profile.name).toBe('Guilherme');
});

test('lança erro em falha de rede', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
  await expect(fetchUserProfile('user-123')).rejects.toThrow('Network error');
});

// Timers falsos — como ShadowLooper do Robolectric
test('debounce dispara após delay', () => {
  jest.useFakeTimers();
  const callback = jest.fn();
  const debounced = debounce(callback, 300);

  debounced();
  expect(callback).not.toHaveBeenCalled();

  jest.advanceTimersByTime(300);
  expect(callback).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
```

---

## Testando Stores Zustand

```typescript
beforeEach(() => {
  useAuthStore.setState({ user: null, isLoading: false, error: null });
});

test('login define user no sucesso', async () => {
  jest.spyOn(authApi, 'login').mockResolvedValue({ id: '1', name: 'Gui' });

  await act(async () => {
    await useAuthStore.getState().login('gui@email.com', 'pass123');
  });

  expect(useAuthStore.getState().user?.name).toBe('Gui');
});
```

---

## Materiais de Estudo

- [Jest — Primeiros Passos](https://jestjs.io/docs/getting-started)
- [Jest — Mock Functions](https://jestjs.io/docs/mock-functions)
- [React Native — Visão Geral de Testes](https://reactnative.dev/docs/testing-overview)

---

## Próximo Passo

➡ [React Native Testing Library](./02-react-native-testing-library)
