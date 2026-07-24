---
title: Jest Unit Tests for iOS Developers
---

# Testes Unitários com Jest para Desenvolvedores iOS

Se você já escreveu testes Swift com XCTest, você já entende o modelo mental por trás dos testes unitários: isole um comportamento, verifique se ele produz o resultado esperado e repita. Jest funciona da mesma forma. O vocabulário é diferente, o ferramental é nativo de JavaScript, e alguns padrões assíncronos exigem um pequeno ajuste de raciocínio — mas nada aqui é conceitualmente novo.

Esta página mapeia seu conhecimento de XCTest diretamente para Jest, para que você possa ser produtivo imediatamente.

---

## Estrutura de arquivo de teste: XCTestCase vs blocos describe/it

Em Swift você cria uma subclasse de `XCTestCase` e escreve métodos com o prefixo `test`. Jest usa funções livres — `describe`, `it` e `test` — que você chama dentro de um arquivo `.test.ts` ou `.spec.ts` simples. Não há classe para ser subclassificada.

```swift
// Swift — XCTest
class CartCalculatorTests: XCTestCase {
    func testTotalWithDiscount() {
        let result = CartCalculator.total(items: [10.0, 20.0], discount: 0.1)
        XCTAssertEqual(result, 27.0)
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

`describe` agrupa testes relacionados — equivalente ao nome da classe no XCTest. `it` e `test` são aliases idênticos; `it` se lê de forma mais natural para descrições orientadas a comportamento, enquanto `test` lê bem para nomes diretos de funções. Use o que sua equipe preferir e seja consistente.

Aninhar blocos `describe` é válido e espelha o padrão de `XCTestCase` aninhado que algumas equipes usam para sub-cenários:

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

## Asserções: XCTAssert* vs matchers do expect

XCTest tem uma família de funções `XCTAssert*`. Jest centraliza tudo por meio de uma única chamada `expect(value)` seguida de um método matcher.

| XCTest | Jest |
|---|---|
| `XCTAssertEqual(a, b)` | `expect(a).toBe(b)` para primitivos, `expect(a).toEqual(b)` para objetos/arrays |
| `XCTAssertNotEqual(a, b)` | `expect(a).not.toBe(b)` |
| `XCTAssertTrue(x)` | `expect(x).toBeTruthy()` |
| `XCTAssertFalse(x)` | `expect(x).toBeFalsy()` |
| `XCTAssertNil(x)` | `expect(x).toBeNull()` ou `expect(x).toBeUndefined()` |
| `XCTAssertNotNil(x)` | `expect(x).toBeDefined()` |
| `XCTAssertThrowsError(try f())` | `expect(() => f()).toThrow()` |

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

## setUp e tearDown: beforeEach / afterEach

Os métodos de ciclo de vida `setUp` e `tearDown` do XCTest são executados antes e depois de cada teste na classe. Jest fornece `beforeEach`, `afterEach`, `beforeAll` e `afterAll` como funções de nível superior dentro de um bloco `describe`.

```swift
// Swift
class UserServiceTests: XCTestCase {
    var service: UserService!

    override func setUp() {
        super.setUp()
        service = UserService(environment: .test)
    }

    override func tearDown() {
        service = nil
        super.tearDown()
    }
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

`beforeAll` e `afterAll` são executados uma vez para todo o bloco `describe` — equivalente a `setUpClass` se você usa esse padrão no XCTest. Use-os para configurações custosas que são seguras de compartilhar entre testes, como inicializar uma conexão de banco de dados ou interpretar um arquivo de fixture grande.

Os hooks respeitam o escopo do `describe`: um `beforeEach` dentro de um `describe` aninhado é executado após o `beforeEach` externo. Esse encadeamento permite configurar estado compartilhado no nível superior e especializá-lo em sub-grupos.

---

## Testes assíncronos: XCTestExpectation vs padrões assíncronos do Jest

No XCTest você usa `XCTestExpectation` com `waitForExpectations(timeout:)` para pausar um teste até que uma operação assíncrona seja concluída. Jest oferece duas alternativas mais limpas: o callback `done` e o `async/await` nativo.

### Callback done — mais próximo do XCTestExpectation

```swift
// Swift — XCTestExpectation
func testFetchUser() {
    let expectation = self.expectation(description: "fetch user")
    service.fetchUser(id: "42") { user, error in
        XCTAssertNotNil(user)
        expectation.fulfill()
    }
    waitForExpectations(timeout: 5)
}
```

```typescript
// TypeScript — callback done
it('fetches a user', (done) => {
  fetchUser('42', (user, error) => {
    expect(user).toBeDefined();
    done();
  });
});
```

Se `done` nunca for chamado, o teste expira e falha — o mesmo comportamento de um `XCTestExpectation` não satisfeito.

### async/await — preferível para código baseado em Promise

A maior parte do código React Native é baseada em Promises, então `async/await` é a escolha idiomática:

```typescript
it('fetches a user', async () => {
  const user = await fetchUser('42');
  expect(user.id).toBe('42');
  expect(user.name).toBeDefined();
});
```

Para verificar que uma Promise é rejeitada, encapsule-a com `expect(...).rejects`:

```typescript
it('throws when the user is not found', async () => {
  await expect(fetchUser('nonexistent')).rejects.toThrow('User not found');
});
```

Não misture `async/await` com `done` — se sua função de teste é `async`, retornar uma Promise rejeitada é suficiente para reprovar o teste. Jest detecta a rejeição automaticamente.

---

## Mocking: jest.mock() vs injeção de protocolo em Swift

Swift incentiva a testabilidade por meio da injeção de protocolo: defina um protocolo, implemente uma conformância mock e passe-o para a classe em teste. Jest tem um mecanismo diferente — ele intercepta o sistema de módulos.

```swift
// Swift — injeção de protocolo
protocol NetworkClient {
    func get(url: URL) async throws -> Data
}

class MockNetworkClient: NetworkClient {
    var stubbedResponse: Data = Data()
    func get(url: URL) async throws -> Data { stubbedResponse }
}

class UserRepository {
    let client: NetworkClient
    init(client: NetworkClient) { self.client = client }
}

// No teste:
let mock = MockNetworkClient()
let repo = UserRepository(client: mock)
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

| Conceito XCTest | Equivalente Jest |
|---|---|
| Subclasse de `XCTestCase` | Bloco `describe` |
| `func testFoo()` | `it('foo', ...)` ou `test('foo', ...)` |
| `XCTAssertEqual(a, b)` | `expect(a).toBe(b)` / `.toEqual(b)` |
| `XCTAssertTrue(x)` | `expect(x).toBeTruthy()` |
| `XCTAssertNil(x)` | `expect(x).toBeNull()` |
| `setUp()` | `beforeEach(() => ...)` |
| `tearDown()` | `afterEach(() => ...)` |
| `XCTestExpectation` | `async/await` ou callback `done` |
| Conformância de mock por protocolo | `jest.mock()` ou `jest.spyOn()` |
| Imagem de baseline de UI test | Teste de snapshot |

A estrutura de testes, o modelo de asserção e os padrões assíncronos têm analogias claras com o que você já conhece. O principal ajuste é pensar em mocking no nível de módulo em vez de injeção de dependência, e aprender `@testing-library/react-native` para qualquer coisa que envolva renderização de componentes.
