---
title: React Native Testing Library
---

# React Native Testing Library

Se você já escreveu testes de UI com XCUITest, já compreende a filosofia central: interaja com o app como um usuário faria, e verifique o que o usuário vê. O React Native Testing Library (RNTL) aplica essa mesma filosofia aos testes de componentes. Ele renderiza uma árvore de componentes em um ambiente leve e oferece queries que espelham a forma como um usuário — ou o VoiceOver — encontraria elementos na tela.

## A Mudança de Modelo Mental

O XCUITest lança um simulador completo e inspeciona a hierarquia de acessibilidade produzida pelo UIKit. O RNTL renderiza uma árvore de componentes React Native no Node usando um ambiente de host simplificado (sem GPU, sem bridge nativa). Apesar da diferença de escopo, o vocabulário de consulta mapeia de forma próxima:

| XCUITest | RNTL |
|---|---|
| `app.buttons["Submit"]` | `getByRole('button', { name: 'Submit' })` |
| `app.staticTexts["Welcome"]` | `getByText('Welcome')` |
| `element.accessibilityIdentifier` | `getByTestId('my-id')` |
| `XCTAssertTrue(element.exists)` | `expect(element).toBeOnTheScreen()` |
| `element.tap()` | `await userEvent.press(element)` |
| `element.typeText("hello")` | `await userEvent.type(element, 'hello')` |

Instale a biblioteca e seus matchers complementares:

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

Adicione os matchers ao seu arquivo de setup do Jest:

```ts
// jest.setup.ts
import '@testing-library/jest-native/extend-expect';
```

## render() e o Objeto screen

No XCTest, `self` é o seu caso de teste e o XCUIApplication é seu ponto de entrada. No RNTL, `render()` é o ponto de entrada e `screen` é o objeto contra o qual você realiza as queries.

```tsx
import { render, screen } from '@testing-library/react-native';
import { LoginForm } from '../LoginForm';

test('shows a submit button', () => {
  render(<LoginForm />);

  const button = screen.getByRole('button', { name: 'Sign In' });
  expect(button).toBeOnTheScreen();
});
```

`render()` monta o componente e `screen` mantém referências a todas as funções de query com escopo para aquela renderização. Você também pode desestruturar as queries diretamente do valor de retorno de `render()`, mas usar `screen` é o padrão preferido porque evita referências desatualizadas de variáveis quando o componente é re-renderizado.

## Queries: Prefira Role e Text ao testID

O XCUITest incentiva o uso de `accessibilityIdentifier` como último recurso — primeiro tente labels e traits de acessibilidade. O RNTL segue a mesma hierarquia. Prefira queries nesta ordem:

1. `getByRole` — espelha traits do VoiceOver e roles ARIA
2. `getByText` — encontra elementos pelo conteúdo de texto visível
3. `getByLabelText` — encontra elementos pelo seu `accessibilityLabel`
4. `getByPlaceholderText` — encontra campos de texto pelo placeholder
5. `getByTestId` — último recurso, requer adicionar `testID` ao markup

### getByRole

`getByRole` é o equivalente mais próximo das queries de tipo de elemento do XCUITest. Internamente, ela lê as props `accessibilityRole` e `accessibilityState` nos elementos React Native.

```tsx
// Encontra um botão com o nome acessível "Delete Account"
const deleteButton = screen.getByRole('button', { name: 'Delete Account' });

// Encontra um checkbox marcado
const rememberMe = screen.getByRole('checkbox', { name: 'Remember me', checked: true });

// Encontra um cabeçalho
const title = screen.getByRole('header', { name: 'Profile' });
```

Valores de role comuns: `'button'`, `'link'`, `'checkbox'`, `'radio'`, `'switch'`, `'header'`, `'image'`, `'combobox'`, `'spinbutton'`.

### getByText

Use `getByText` quando não há uma role significativa ou quando o texto visível é o identificador natural:

```tsx
const label = screen.getByText('Terms and Conditions');
const partial = screen.getByText(/welcome/i);
```

O segundo argumento aceita uma string, regex ou função. Regex é útil para correspondências sem distinção de maiúsculas e minúsculas e strings parciais.

### getByTestId

Reserve o `testID` para elementos que não possuem role acessível ou texto — views animadas personalizadas, containers decorativos — ou para situações em que um seletor preciso é inevitável.

```tsx
// No componente
<Animated.View testID="loading-spinner" />

// No teste
const spinner = screen.getByTestId('loading-spinner');
```

### Variantes de Query

Cada query base possui seis variantes:

| Variante | Comportamento |
|---|---|
| `getBy*` | Retorna o elemento ou lança erro se não encontrado |
| `getAllBy*` | Retorna um array ou lança erro se nenhum for encontrado |
| `queryBy*` | Retorna o elemento ou `null` — use para verificar ausência |
| `queryAllBy*` | Retorna um array (pode estar vazio) |
| `findBy*` | Retorna uma Promise — aguarda o elemento aparecer |
| `findAllBy*` | Retorna uma Promise para um array |

Use `queryBy*` quando você espera que um elemento esteja ausente:

```tsx
expect(screen.queryByText('Error message')).not.toBeOnTheScreen();
```

## fireEvent vs userEvent

O RNTL fornece duas APIs de interação. Entender a diferença é importante para a fidelidade dos testes.

### fireEvent — Síncrono, de Baixo Nível

`fireEvent` despacha um evento sintético diretamente para um componente. É a API mais antiga e é síncrona. Pense nela como chamar diretamente o handler de evento, em vez de simular um gesto real.

```tsx
import { fireEvent } from '@testing-library/react-native';

fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
fireEvent.changeText(screen.getByPlaceholderText('Email'), 'user@example.com');
```

### userEvent — Assíncrono, Realista

`userEvent` simula a sequência completa de eventos que uma interação real produz. Um press gera eventos `pointerEnter`, `pointerDown`, `pointerUp`, `pointerLeave` e `press` em ordem. Uma interação de digitação dispara eventos `keyPress` por caractere. Esta é a API preferida porque testa o comportamento real do componente, não uma invocação idealizada de handler.

```tsx
import { userEvent } from '@testing-library/react-native';

test('submits login credentials', async () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  const user = userEvent.setup();

  await user.type(screen.getByPlaceholderText('Email'), 'kira@example.com');
  await user.type(screen.getByPlaceholderText('Password'), 'correct-horse');
  await user.press(screen.getByRole('button', { name: 'Sign In' }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'kira@example.com',
    password: 'correct-horse',
  });
});
```

`userEvent.setup()` retorna uma instância de usuario. Todas as interações nessa instância compartilham um clock e contexto de eventos, o que importa quando componentes fazem debounce de input ou agrupam atualizações de estado.

A regra: use `userEvent` para todos os novos testes. Use `fireEvent` apenas quando `userEvent` não conseguir expressar a interação (raro).

## Testando Comportamento Assíncrono: waitFor e findBy

O XCUITest lida com UI assíncrona com `XCTestExpectation` e `waitForExpectations(timeout:)`. O RNTL fornece `waitFor` e a família de queries `findBy*`.

### waitFor

`waitFor` reexecuta um callback a cada ciclo de renderização até que ele pare de lançar erros ou o timeout expire (padrão de 1000 ms). É equivalente a fazer polling de expectativas de predicado no XCUITest.

```tsx
import { waitFor } from '@testing-library/react-native';

test('shows user profile after fetch', async () => {
  render(<ProfileScreen userId="123" />);

  expect(screen.getByText('Loading...')).toBeOnTheScreen();

  await waitFor(() => {
    expect(screen.getByText('Kira Yamada')).toBeOnTheScreen();
  });

  expect(screen.queryByText('Loading...')).not.toBeOnTheScreen();
});
```

Passe um objeto de opções para sobrescrever o timeout ou o intervalo de polling:

```tsx
await waitFor(
  () => expect(screen.getByText('Saved')).toBeOnTheScreen(),
  { timeout: 3000, interval: 100 },
);
```

### Queries findBy

As queries `findBy*` são açúcar sintático sobre `waitFor` + `getBy*`. Prefira-as quando você está simplesmente aguardando um elemento aparecer:

```tsx
// Equivalente a: await waitFor(() => screen.getByText('Kira Yamada'))
const name = await screen.findByText('Kira Yamada');
expect(name).toBeOnTheScreen();
```

`findBy*` é mais limpo para esperas de elemento único. Use `waitFor` quando precisar verificar múltiplos elementos ou combinar asserções.

## act() — O Equivalente ao XCTestExpectation

O React agrupa atualizações de estado. Se um teste dispara uma atualização de estado fora de um handler de evento (um `setTimeout`, uma Promise resolvida, um `useEffect`), a atualização pode não ter sido processada antes da sua asserção executar. Encapsular o gatilho em `act()` diz ao React para processar todas as atualizações de estado e efeitos pendentes antes de continuar.

Em termos de XCTest, `act()` é equivalente a chamar `fulfill()` em um `XCTestExpectation` — sinaliza que uma operação assíncrona foi concluída e o estado está estável.

```tsx
import { act } from '@testing-library/react-native';

test('counter increments after delay', async () => {
  jest.useFakeTimers();
  render(<DelayedCounter />);

  expect(screen.getByText('0')).toBeOnTheScreen();

  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  expect(screen.getByText('1')).toBeOnTheScreen();
});
```

Na prática, `userEvent` e `waitFor` já encapsulam seus internos em `act()`. Você só precisa chamar `act()` diretamente quando estiver avançando timers manualmente ou resolvendo Promises mockadas fora das próprias APIs do RNTL.

## Evitando Testar Detalhes de Implementação

Uma das lições mais importantes do XCTest é testar comportamento, não implementação. As sessões da WWDC sobre testes enfatizam consistentemente escrever testes que sobrevivam a refatorações. O RNTL reforça essa disciplina ao não expor o estado interno do componente ou métodos de instância.

Evite:

```tsx
// Não inspecione o estado interno
const instance = component.getInstance();
expect(instance.state.isLoading).toBe(false);

// Não faça query pelo nome de exibição do componente
screen.UNSAFE_getByType(ActivityIndicator);
```

Prefira:

```tsx
// Teste o que o usuário vê
expect(screen.queryByText('Loading...')).not.toBeOnTheScreen();

// Teste a saída acessível
expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
```

Se uma refatoração mudar a estrutura de estado interno do componente mas não seu comportamento visível, seus testes devem continuar passando. Se quebrarem, os testes estavam acoplados demais à implementação.

## Testando Navegação

O React Navigation passa uma prop `navigation` para os componentes de tela. Em testes unitários, você não quer montar o navigator completo — em vez disso, passe um objeto de navegação mockado.

```tsx
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

test('navigates to detail screen on card press', async () => {
  render(<ItemListScreen navigation={mockNavigation} route={{ params: {} }} />);

  const user = userEvent.setup();
  await user.press(screen.getByText('Swift Concurrency'));

  expect(mockNavigate).toHaveBeenCalledWith('ItemDetail', { id: 'swift-concurrency' });
});
```

Para hooks como `useNavigation()`, encapsule o componente em um `NavigationContainer` mínimo ou mocke o hook no nível do módulo:

```tsx
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
```

## Testando com Providers

A maioria dos componentes de produção depende de contexto: um query client, um tema, uma sessão de autenticação. Crie um wrapper reutilizável e passe-o para `render()` via a opção `wrapper`.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../theme/ThemeProvider';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

test('displays user data from the API', async () => {
  render(<UserCard userId="42" />, { wrapper: createWrapper() });

  const name = await screen.findByText('Kira Yamada');
  expect(name).toBeOnTheScreen();
});
```

Definir `retry: false` no QueryClient impede que o React Query tente novamente requisições que falharam durante os testes, o que mantém as falhas rápidas e determinísticas.

Um padrão comum é exportar um helper `renderWithProviders` de um arquivo de utilitários de teste compartilhado:

```tsx
// test-utils.tsx
import { render } from '@testing-library/react-native';
import { createWrapper } from './createWrapper';

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

export * from '@testing-library/react-native';
```

Os testes então importam de `test-utils` em vez de `@testing-library/react-native`:

```tsx
import { renderWithProviders, screen } from '../test-utils';

test('shows profile', async () => {
  renderWithProviders(<ProfileScreen />);
  expect(await screen.findByText('Kira Yamada')).toBeOnTheScreen();
});
```

## Queries de Acessibilidade e Mapeamento com VoiceOver

`getByRole` lê a prop `accessibilityRole`, que mapeia diretamente para traits de UIAccessibility que o VoiceOver anuncia em um dispositivo real. Escrever testes baseados em role oferece dois benefícios: testes legíveis e cobertura implícita de acessibilidade.

| Trait de Acessibilidade iOS | accessibilityRole no React Native | Query no RNTL |
|---|---|---|
| `.button` | `'button'` | `getByRole('button')` |
| `.link` | `'link'` | `getByRole('link')` |
| `.header` | `'header'` | `getByRole('header')` |
| `.image` | `'image'` | `getByRole('image')` |
| `.adjustable` | `'adjustable'` | `getByRole('spinbutton')` |
| `.selected` | `accessibilityState.selected: true` | `getByRole('radio', { selected: true })` |
| `.disabled` | `accessibilityState.disabled: true` | `not toBeDisabled()` |

Testar o nome acessível junto com a role torna os testes resistentes a mudanças de layout e também verifica que o VoiceOver anunciará algo significativo:

```tsx
// Ruim — acopla o teste à posição do ícone no DOM
const button = screen.getAllByRole('button')[2];

// Bom — vincula ao nome acessível que um usuário de VoiceOver ouviria
const button = screen.getByRole('button', { name: 'Delete item' });
```

Se um componente não possui um label visível mas tem um `accessibilityLabel`, use `getByLabelText`:

```tsx
const closeButton = screen.getByLabelText('Close modal');
```

## Executando os Testes

```bash
# Executar todos os testes
npx jest

# Executar testes correspondentes a um padrão de arquivo
npx jest LoginForm

# Executar em modo watch
npx jest --watch

# Executar com cobertura
npx jest --coverage
```

O Jest executa os testes no Node, portanto eles são executados em milissegundos em comparação ao tempo de inicialização do simulador do XCUITest. Uma suite de testes com várias centenas de testes de componentes normalmente conclui em menos de trinta segundos.

## Próximos Passos

Com o RNTL em vigor, a próxima camada de testes é end-to-end: testes completos em dispositivo ou simulador que exercitam stacks de navegação, módulos nativos e chamadas de rede reais. O Detox (abordado na seção seguinte) preenche esse papel para o React Native da mesma forma que o XCUITest preenche para apps iOS nativos.
