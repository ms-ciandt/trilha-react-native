---
title: Jest Unit Tests for iOS Developers
---

# Testes Unitários com Jest para Desenvolvedores iOS

Se você já escreveu testes Swift com Swift Testing, você já entende o modelo mental por trás dos testes unitários: isole um comportamento, verifique se ele produz o resultado esperado e repita. Jest funciona da mesma forma. O vocabulário é diferente, o ferramental é nativo de JavaScript, e alguns padrões exigem um pequeno ajuste de raciocínio — mas nada aqui é conceitualmente novo.

Swift Testing (introduzido no Xcode 16 / Swift 6) é o substituto moderno do XCTest. Sua API baseada em macros — `@Suite`, `@Test`, `#expect` — é estruturalmente mais próxima do Jest do que o XCTest jamais foi, o que torna o mapeamento especialmente direto.

Esta página mapeia seu conhecimento de Swift Testing para Jest, para que você possa ser produtivo imediatamente.

---

## Estrutura de arquivo de teste: @Suite/@Test vs blocos describe/it

No Swift Testing você marca uma struct ou classe com `@Suite` e anota cada função de teste com `@Test`. Jest usa funções livres — `describe`, `it` e `test` — dentro de um arquivo `.test.ts` ou `.spec.ts` simples. Não há classe para ser subclassificada em nenhum dos dois frameworks.

```swift
// Swift — Swift Testing
import Testing

@Suite("CartCalculator")
struct CartCalculatorTests {
    @Test("applies discount to the total")
    func totalWithDiscount() {
        let result = CartCalculator.total(items: [10.0, 20.0], discount: 0.1)
        #expect(result == 27.0)
    }
}
```

```typescript
// TypeScript — Jest
import { calculateTotal } from '../CartCalculator';

describe('CartCalculator', () => {
  it('applies discount to the total', () => {
    const result = calculateTotal([10.0, 20.0], 0.1);
    expect(result).toBe(27.0);
  });
});
```

`describe` agrupa testes relacionados — equivalente a `@Suite`. `it` e `test` são aliases idênticos; `it` se lê de forma mais natural para descrições orientadas a comportamento, enquanto `test` lê bem para nomes diretos de funções. Use o que sua equipe preferir e seja consistente.

Aninhar blocos `describe` é válido e espelha o aninhamento de tipos `@Suite` para sub-cenários:

```swift
// Swift Testing — suites aninhadas
@Suite("CartCalculator")
struct CartCalculatorTests {
    @Suite("when the cart is empty")
    struct EmptyCart {
        @Test func returnsZero() {
            #expect(CartCalculator.total(items: [], discount: 0) == 0)
        }
    }
}
```

```typescript
describe('CartCalculator', () => {
  describe('when the cart is empty', () => {
    it('returns zero', () => {
      expect(calculateTotal([], 0)).toBe(0);
    });
  });

  describe('when discount exceeds 100%', () => {
    it('clamps the total to zero', () => {
      expect(calculateTotal([50], 2.0)).toBe(0);
    });
  });
});
```

---

## Asserções: #expect/#require vs matchers do expect

O Swift Testing substituiu a família `XCTAssert*` por duas macros: `#expect` para asserções suaves (o teste continua em caso de falha) e `#require` para asserções rígidas (o teste para imediatamente). Jest centraliza tudo por meio de uma única chamada `expect(value)` seguida de um método matcher.

| Swift Testing | Jest |
|---|---|
| `#expect(a == b)` | `expect(a).toBe(b)` para primitivos, `expect(a).toEqual(b)` para objetos/arrays |
| `#expect(a != b)` | `expect(a).not.toBe(b)` |
| `#expect(x)` | `expect(x).toBeTruthy()` |
| `#expect(!x)` | `expect(x).toBeFalsy()` |
| `#expect(x == nil)` | `expect(x).toBeNull()` ou `expect(x).toBeUndefined()` |
| `#expect(x != nil)` | `expect(x).toBeDefined()` |
| `#expect(throws: MyError.self) { try f() }` | `expect(() => f()).toThrow()` |
| `try #require(x)` (para o teste em nil/falha) | Sem equivalente direto — Jest continua em caso de falha |

A distinção entre `toBe` e `toEqual` é importante. `toBe` usa `Object.is` — igualdade de referência estrita para objetos. `toEqual` realiza uma comparação estrutural profunda, que é o que você quer ao comparar dois literais de objeto ou arrays.

```typescript
// toBe — funciona para primitivos
expect(2 + 2).toBe(4);
expect('hello').toBe('hello');

// toEqual — funciona para objetos e arrays
expect({ id: 1, name: 'Alice' }).toEqual({ id: 1, name: 'Alice' });
expect([1, 2, 3]).toEqual([1, 2, 3]);

// toBeTruthy / toBeFalsy — verificação de veracidade flexível
expect('non-empty string').toBeTruthy();
expect(0).toBeFalsy();
expect(null).toBeFalsy();
```

Para correspondência parcial de objetos — útil quando uma função retorna um objeto grande e você só se importa com campos específicos — use `toMatchObject`:

```typescript
const user = createUser({ name: 'Alice', role: 'admin' });
expect(user).toMatchObject({ name: 'Alice' });
// passa mesmo que user tenha campos adicionais como id, createdAt, etc.
```

---

## setUp e tearDown: init/deinit vs beforeEach / afterEach

O Swift Testing não possui métodos de override `setUp`/`tearDown`. Em vez disso, ele aproveita o ciclo de vida de inicializadores do próprio Swift: como structs `@Suite` recebem uma **instância fresca por teste**, colocar a configuração no `init()` é equivalente a `beforeEach`. Cada teste roda em isolamento automaticamente.

```swift
// Swift Testing — init() é executado antes de cada função @Test
import Testing

@Suite
struct UserServiceTests {
    var service: UserService

    init() {
        service = UserService(environment: .test)
    }
    // Sem tearDown necessário para structs — a instância é descartada após cada teste
}
```

```typescript
// TypeScript — Jest
import { UserService } from '../UserService';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService({ environment: 'test' });
  });

  afterEach(() => {
    service.destroy();
  });

  it('returns the current user', () => {
    expect(service.currentUser()).toBeNull();
  });
});
```

Quando você precisa de lógica de teardown (ex.: cancelar uma task ou fechar uma conexão), declare o `@Suite` como `class` ou `actor` para ter acesso ao `deinit`:

```swift
@Suite
final class UserServiceTests {
    var service: UserService

    init() {
        service = UserService(environment: .test)
    }

    deinit {
        service.destroy() // equivalente a afterEach
    }
}
```

`beforeAll` / `afterAll` — configuração compartilhada executada uma vez por suite — não tem equivalente direto no Swift Testing para structs. O idioma é calcular o estado compartilhado custoso como `static let` ou movê-lo para fora da suite.

Os hooks respeitam o escopo do `describe`: um `beforeEach` dentro de um `describe` aninhado é executado após o `beforeEach` externo. Esse encadeamento permite configurar estado compartilhado no nível superior e especializá-lo em sub-grupos.

---

## Testes assíncronos: @Test async throws vs async/await do Jest

O Swift Testing suporta Swift Concurrency nativamente. Marque uma função `@Test` como `async throws` e use `await` diretamente — sem `XCTestExpectation` ou `waitForExpectations` necessários. Jest funciona de forma idêntica: marque a função de teste como `async` e aguarde Promises.

```swift
// Swift Testing — async throws, sem XCTestExpectation
@Test
func fetchUser() async throws {
    let user = try await service.fetchUser(id: "42")
    #expect(user.id == "42")
    #expect(user.name != nil)
}
```

```typescript
// TypeScript — Jest async/await
it('fetches a user', async () => {
  const user = await fetchUser('42');
  expect(user.id).toBe('42');
  expect(user.name).toBeDefined();
});
```

Ambos os frameworks reprovam o teste automaticamente se a função `async` lança um erro não capturado — sem sinalização manual necessária.

### Verificando erros lançados

```swift
// Swift Testing
@Test
func fetchUserNotFound() async {
    await #expect(throws: UserNotFoundError.self) {
        try await service.fetchUser(id: "nonexistent")
    }
}
```

```typescript
// Jest
it('throws when the user is not found', async () => {
  await expect(fetchUser('nonexistent')).rejects.toThrow('User not found');
});
```

### O callback done — padrão legado

Se você mantém código mais antigo baseado em callbacks que antecede o async/await, Jest ainda suporta o callback `done`. É o equivalente mais próximo ao `XCTestExpectation` do XCTest, mas raramente será necessário em código React Native moderno:

```typescript
it('fetches a user', (done) => {
  fetchUser('42', (user, error) => {
    expect(user).toBeDefined();
    done();
  });
});
```

Se `done` nunca for chamado, o teste expira e falha. Não misture `async/await` com `done` — Jest detecta a rejeição de uma Promise rejeitada automaticamente.

---

## Mocking: jest.mock() vs injeção de protocolo em Swift

O Swift Testing incentiva a testabilidade por meio da injeção de protocolo: defina um protocolo, implemente uma conformância mock como uma struct leve e passe-a para o tipo em teste. Jest tem um mecanismo diferente — ele intercepta o sistema de módulos.

```swift
// Swift Testing — injeção de protocolo com struct mock
import Testing

protocol NetworkClient {
    func get(url: URL) async throws -> Data
}

struct MockNetworkClient: NetworkClient {
    var stubbedData: Data = Data()
    func get(url: URL) async throws -> Data { stubbedData }
}

struct UserRepository {
    let client: NetworkClient
}

@Suite
struct UserRepositoryTests {
    var repo: UserRepository

    init() {
        repo = UserRepository(client: MockNetworkClient())
    }

    @Test
    func fetchUser() async throws {
        let user = try await repo.fetchUser("42")
        #expect(user.name == "Alice")
    }
}
```

```typescript
// TypeScript — jest.mock()
jest.mock('../api/networkClient', () => ({
  get: jest.fn().mockResolvedValue({ id: '42', name: 'Alice' }),
}));

import { UserRepository } from '../UserRepository';

it('returns a user from the network', async () => {
  const repo = new UserRepository();
  const user = await repo.fetchUser('42');
  expect(user.name).toBe('Alice');
});
```

`jest.mock()` substitui toda a importação do módulo por um auto-mock ou por uma factory que você fornece. A substituição é içada para o topo do arquivo antes de qualquer importação — um comportamento específico do Jest que difere de como você esperaria que a avaliação de módulos funcionasse.

Para um controle mais fino em testes individuais, use `jest.spyOn` para encapsular um método específico:

```typescript
import * as networkClient from '../api/networkClient';

it('calls the network with the correct URL', async () => {
  const spy = jest.spyOn(networkClient, 'get').mockResolvedValue({ id: '42' });

  await fetchUser('42');

  expect(spy).toHaveBeenCalledWith('/users/42');
  spy.mockRestore(); // restaura a implementação original após o teste
});
```

`jest.fn()` cria uma função mock independente que você pode inspecionar: `mockFn.mock.calls` contém os argumentos de cada invocação. Use `toHaveBeenCalled()`, `toHaveBeenCalledWith()` e `toHaveBeenCalledTimes()` como seus matchers de asserção.

Reinicie os mocks entre os testes para evitar vazamento de estado. A abordagem mais limpa é uma configuração global em `jest.config.js`:

```js
module.exports = {
  clearMocks: true,   // limpa o histórico de chamadas antes de cada teste
  resetMocks: false,  // mantém as implementações a menos que sejam explicitamente reiniciadas
  restoreMocks: true, // restaura os métodos espionados após cada teste
};
```

---

## Testes parametrizados: @Test(arguments:) vs it.each

O Swift Testing tem suporte nativo a testes parametrizados via `@Test(arguments:)`. Jest oferece o equivalente por meio de `it.each`. Ambos permitem executar a mesma lógica de asserção contra múltiplos inputs sem duplicar código de teste.

```swift
// Swift Testing — @Test(arguments:)
@Test(arguments: [
    (items: [10.0, 20.0], discount: 0.1, expected: 27.0),
    (items: [],            discount: 0.5, expected: 0.0),
    (items: [50.0],        discount: 2.0, expected: 0.0),
])
func totalCalculation(items: [Double], discount: Double, expected: Double) {
    #expect(CartCalculator.total(items: items, discount: discount) == expected)
}
```

```typescript
// Jest — it.each
it.each([
  { items: [10.0, 20.0], discount: 0.1, expected: 27.0 },
  { items: [],            discount: 0.5, expected: 0.0  },
  { items: [50.0],        discount: 2.0, expected: 0.0  },
])('calcula total: $items com desconto $discount%', ({ items, discount, expected }) => {
  expect(calculateTotal(items, discount)).toBe(expected);
});
```

Cada conjunto de argumentos roda como um caso de teste independente em ambos os frameworks, com seu próprio resultado de aprovação/reprovação no relatório de testes.

---

## Testando hooks customizados: renderHook

Hooks customizados não podem ser chamados fora de um componente React — React impõe as regras dos hooks em tempo de execução. O pacote `@testing-library/react-native` exporta `renderHook` exatamente para esse propósito.

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useCounter } from '../hooks/useCounter';

describe('useCounter', () => {
  it('starts at the initial value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments the count', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

`result.current` sempre reflete o valor mais recente renderizado do hook. Encapsule qualquer ação que acione atualizações de estado em `act()` — isso garante que o React processe todas as atualizações de estado e efeitos antes que suas asserções sejam executadas. Esquecer `act` é a fonte mais comum de falhas enganosas em testes de hooks.

Para hooks que dependem de contexto, passe uma opção `wrapper`:

```typescript
import { ThemeProvider } from '../context/ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme="dark">{children}</ThemeProvider>
);

const { result } = renderHook(() => useTheme(), { wrapper });
expect(result.current.theme).toBe('dark');
```

---

## Configuração do Jest para React Native

### Preset jest-expo

Se seu projeto usa Expo (Expo SDK 56 ou posterior), configure o Jest com o preset `jest-expo` no `package.json`:

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/react-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ]
  }
}
```

A entrada `transformIgnorePatterns` é necessária porque muitos pacotes React Native são distribuídos com sintaxe de módulo ES não transformada. O padrão acima inclui na lista branca os pacotes que precisam de transformação pelo Babel, enquanto ignora o restante de `node_modules`.

### @react-native/jest-preset

Para projetos React Native sem Expo (bare), use o preset oficial:

```json
{
  "jest": {
    "preset": "@react-native/jest-preset",
    "setupFilesAfterFramework": ["@testing-library/react-native/extend-expect"]
  }
}
```

Ambos os presets configuram o resolvedor de módulos, configuram o `@testing-library/react-native` e fazem mock de módulos específicos da plataforma como `NativeModules`. Raramente você precisará estendê-los, a menos que tenha módulos nativos customizados que exijam mock explícito.

---

## Hermes e o runtime do Jest

O React Native 0.76 usa Hermes como engine JavaScript padrão em tempo de execução. No entanto, Jest não executa testes dentro do Hermes — ele usa V8 (Node.js). Isso tem implicações práticas:

**Diferenças de comportamento a serem observadas:**

- Hermes tem comportamentos específicos em relação a `Date`, `RegExp` e alguns casos extremos nos métodos de `Array` e `String`. Testes que passam no Jest podem revelar um bug específico do Hermes somente em tempo de execução. O inverso também é verdadeiro.
- As características de desempenho diferem. Benchmarks escritos como testes Jest não refletem o desempenho do Hermes em produção.
- O Hermes desabilita certos recursos de introspecção de JavaScript por segurança. Se seu código depende de `Function.prototype.toString()` ou `arguments.callee`, ele falhará no Hermes mas passará no ambiente V8 do Jest.

**O que isso significa na prática:**

Testes unitários cobrem a correção da lógica — eles são válidos independentemente do engine. Mas se você está escrevendo código que depende de comportamento específico do engine, adicione uma observação e verifique manualmente no dispositivo ou em um build Expo Go / de desenvolvimento. O conjunto de testes oferece confiança no comportamento; o ambiente de execução permanece sendo o Hermes.

---

## Testes de snapshot

Testes de snapshot serializam um componente renderizado para um arquivo de texto e falham se a serialização mudar. Eles são semelhantes às imagens de baseline de testes de UI do iOS — rápidos de escrever, mas frágeis quando o componente muda por razões legítimas.

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { UserCard } from '../UserCard';

it('renders correctly', () => {
  const { toJSON } = render(<UserCard name="Alice" role="admin" />);
  expect(toJSON()).toMatchSnapshot();
});
```

Na primeira execução, Jest cria um diretório `__snapshots__/` ao lado do arquivo de teste contendo a saída serializada. Execuções subsequentes fazem diff em relação a ele. Para atualizar o snapshot após uma mudança intencional, execute `jest --updateSnapshot` ou `jest -u`.

**Use snapshots com parcimônia.** O sinal de falha deles tem pouca informação: você vê que algo mudou, mas não qual comportamento quebrou. Se um componente muda o texto de um label — uma atualização legítima — o snapshot falha e alguém precisa revisar e aceitar o diff. Com o tempo, equipes desenvolvem cegueira de snapshot e aceitam diffs sem revisá-los.

Prefira snapshots para:
- Componentes folha sem lógica — apresentação pura que você quer proteger de regressões acidentais
- Componentes extremamente estáveis que mudam com pouca frequência

Evite snapshots para:
- Componentes que recebem dados de APIs ou contexto — a saída é muito dinâmica
- Componentes em desenvolvimento ativo — você estará constantemente atualizando snapshots
- Testar comportamento — use `getByText`, `getByRole` e helpers de interação do `@testing-library/react-native`

---

## Resumo

| Conceito Swift Testing | Equivalente Jest |
|---|---|
| Struct/classe `@Suite` | Bloco `describe` |
| `@Test func foo()` | `it('foo', ...)` ou `test('foo', ...)` |
| `#expect(a == b)` | `expect(a).toBe(b)` / `.toEqual(b)` |
| `#expect(x)` | `expect(x).toBeTruthy()` |
| `#expect(x == nil)` | `expect(x).toBeNull()` |
| `try #require(x)` | Sem equivalente direto (Jest continua em caso de falha) |
| `init()` da struct `@Suite` | `beforeEach(() => ...)` |
| `deinit` da classe `@Suite` | `afterEach(() => ...)` |
| `@Test async throws` (nativo) | `async/await` na função de teste |
| `#expect(throws:)` | `expect(() => f()).toThrow()` / `.rejects.toThrow()` |
| `@Test(arguments:)` | `it.each([...])` |
| Conformância de mock por protocolo (struct) | `jest.mock()` ou `jest.spyOn()` |
| Imagem de baseline de UI test | Teste de snapshot |

A estrutura de testes, o modelo de asserção e os padrões assíncronos têm analogias claras com o que você já conhece do Swift Testing. O principal ajuste é pensar em mocking no nível de módulo em vez de injeção de protocolo, e aprender `@testing-library/react-native` para qualquer coisa que envolva renderização de componentes.
