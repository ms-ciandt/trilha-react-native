---
title: Integration Tests
---

# Testes de Integração

## Testes de Integração vs Testes Unitários no React Native

Testes unitários isolam uma única função ou componente, substituindo todas as dependências por mocks. Testes de integração renderizam uma funcionalidade com seus componentes filhos reais, conectando a árvore de componentes real enquanto ainda controlam as fronteiras externas, como a rede e a navegação.

Em um projeto iOS típico, você já conhece essa distinção. Um teste unitário com XCTest pode verificar um único método de `ViewModel` injetando um repositório falso. Um teste de integração com XCTest instanciaria um `UIViewController` real com sub-views reais, verificando que um toque em um botão realmente aciona a transição de estado de UI correta em toda a hierarquia.

Os testes de integração do React Native seguem a mesma filosofia: renderize o componente `Screen` real, deixe-o montar seus filhos reais (listas, formulários, cabeçalhos) e intercepte apenas o que vive fora da fronteira JavaScript — chamadas HTTP, a pilha de navegação nativa e as APIs do dispositivo.

### O que os testes de integração cobrem

| Preocupação | Teste unitário | Teste de integração |
|---|---|---|
| Lógica de hook isolada | Sim | Não (exagero) |
| Componente renderiza JSX correto | Sim | Parcial |
| Tela completa com filhos reais | Não | Sim |
| Carregamento / erro / sucesso de rede | Mock em testes de hook | MSW na fronteira HTTP |
| Navegação após uma ação | Não | Sim (navigator mockado) |
| Fluxo de validação e envio de formulário | Não | Sim |

---

## MSW para Interceptação de Rede

O Mock Service Worker (MSW) intercepta requisições HTTP no nível de rede, não no ponto de chamada do `fetch`. No navegador, ele utiliza um Service Worker. No React Native (e em executores de teste baseados em Node), ele usa `msw/node`, que substitui as implementações globais de `fetch` e `XMLHttpRequest`.

Para um desenvolvedor iOS, o modelo mental é próximo ao de subclassar `URLProtocol` — você registra um handler que intercepta requisições que correspondem a um padrão e retorna uma resposta personalizada, sem tocar no código de produção que faz a requisição.

### Instalação

```bash
npm install msw --save-dev
```

### Criando handlers

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/articles', () => {
    return HttpResponse.json([
      { id: '1', title: 'Getting started with RN', published: true },
      { id: '2', title: 'Fabric deep dive', published: true },
    ]);
  }),

  http.post('https://api.example.com/articles', async ({ request }) => {
    const body = await request.json() as { title: string };
    return HttpResponse.json({ id: '3', title: body.title, published: false }, { status: 201 });
  }),
];
```

### Configurando o servidor para os testes

```ts
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```ts
// jest.setup.ts
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

A opção `onUnhandledRequest: 'error'` é importante — qualquer requisição que seu teste faça sem um handler correspondente lançará um erro, prevenindo vazamento silencioso de dados entre testes.

---

## Configuração de Testes com TanStack Query

O TanStack Query (React Query) armazena resultados em cache e tenta novamente requisições falhas por padrão. Ambos os comportamentos quebram testes de integração: dados em cache de um teste vazam para o próximo, e a lógica de retry torna os testes de estado de erro lentos e instáveis.

Crie uma factory que produza um `QueryClient` novo por teste, com retries e coleta de lixo desativados.

```ts
// src/test-utils/createTestQueryClient.ts
import { QueryClient } from '@tanstack/react-query';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
```

`retry: 0` — requisições falhas surgem imediatamente como erros em vez de tentar novamente três vezes.  
`gcTime: 0` — o cache de queries é coletado imediatamente quando os observadores são desmontados, evitando vazamento de dados entre testes.  
`staleTime: 0` — cada montagem dispara um novo fetch, dando ao MSW controle total sobre os dados que cada teste recebe.

---

## Testando um Componente de Tela Completo

### A tela sendo testada

```tsx
// src/screens/ArticleListScreen.tsx
import React from 'react';
import { FlatList, Text, View, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchArticles } from '../api/articles';

export function ArticleListScreen() {
  const navigation = useNavigation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['articles'],
    queryFn: fetchArticles,
  });

  if (isLoading) return <ActivityIndicator testID="loading-indicator" />;
  if (isError) return <Text testID="error-message">Failed to load articles.</Text>;

  return (
    <FlatList
      testID="article-list"
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          testID={`article-item-${item.id}`}
          onPress={() => navigation.navigate('ArticleDetail', { id: item.id })}
        >
          <Text>{item.title}</Text>
        </Pressable>
      )}
    />
  );
}
```

### Utilitário wrapper

```tsx
// src/test-utils/renderWithProviders.tsx
import React, { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createTestQueryClient } from './createTestQueryClient';

export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();

  const navigationRef = React.createRef<any>();
  const navigate = jest.fn();

  // Fornece um mock mínimo de navegação para que useNavigation() seja resolvido
  const navigationContext = {
    navigate,
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    isFocused: () => true,
    addListener: jest.fn(() => () => {}),
    removeListener: jest.fn(),
    canGoBack: jest.fn(() => false),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer ref={navigationRef}>
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  );

  const result = render(ui, { wrapper: Wrapper });
  return { ...result, navigate, queryClient };
}
```

---

## Testando Estados de Carregamento, Erro e Sucesso

```tsx
// src/screens/__tests__/ArticleListScreen.test.tsx
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { userEvent } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { ArticleListScreen } from '../ArticleListScreen';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

describe('ArticleListScreen', () => {
  it('exibe um indicador de carregamento enquanto busca dados', async () => {
    // Usa um handler com atraso para que o estado de carregamento seja visível
    server.use(
      http.get('https://api.example.com/articles', async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return HttpResponse.json([]);
      }),
    );

    renderWithProviders(<ArticleListScreen />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renderiza os artigos após uma busca bem-sucedida', async () => {
    // Os handlers padrão retornam dois artigos
    renderWithProviders(<ArticleListScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('article-list')).toBeTruthy();
    });

    expect(screen.getByText('Getting started with RN')).toBeTruthy();
    expect(screen.getByText('Fabric deep dive')).toBeTruthy();
  });

  it('exibe uma mensagem de erro quando a requisição falha', async () => {
    server.use(
      http.get('https://api.example.com/articles', () => {
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
      }),
    );

    renderWithProviders(<ArticleListScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeTruthy();
    });

    expect(screen.getByText('Failed to load articles.')).toBeTruthy();
  });
});
```

Cada teste recebe um escopo de handler MSW renovado via `server.resetHandlers()` no `afterEach`, e um `QueryClient` novo via a factory do wrapper, então o estado nunca cruza as fronteiras entre testes.

---

## Testando Transições de Navegação

```tsx
it('navega para a tela de detalhes quando um artigo é tocado', async () => {
  const { navigate } = renderWithProviders(<ArticleListScreen />);

  await waitFor(() => {
    expect(screen.getByTestId('article-item-1')).toBeTruthy();
  });

  await userEvent.press(screen.getByTestId('article-item-1'));

  expect(navigate).toHaveBeenCalledWith('ArticleDetail', { id: '1' });
});
```

O mock `navigate` captura o destino e os parâmetros. Isso é equivalente a verificar em um XCTest que `navigationController.pushViewController(_:animated:)` foi chamado com o tipo correto de view controller — você não está testando o próprio framework de navegação, apenas que sua tela aciona a transição correta.

---

## Testando Fluxos de Envio de Formulário

Testes de integração de formulário verificam todo o caminho: entrada do usuário, feedback de validação, chamada de rede e estado da UI resultante.

```tsx
// src/screens/__tests__/NewArticleScreen.test.tsx
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { userEvent } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { NewArticleScreen } from '../NewArticleScreen';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

describe('NewArticleScreen', () => {
  it('envia o formulário e exibe uma confirmação de sucesso', async () => {
    renderWithProviders(<NewArticleScreen />);

    const titleInput = screen.getByTestId('title-input');
    await userEvent.type(titleInput, 'My new article');
    await userEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeTruthy();
    });
  });

  it('exibe um erro de validação quando o título está vazio', async () => {
    renderWithProviders(<NewArticleScreen />);

    await userEvent.press(screen.getByTestId('submit-button'));

    expect(screen.getByText('Title is required.')).toBeTruthy();
    // A rede nunca foi chamada — nenhum handler MSW necessário
  });

  it('exibe um erro do servidor quando a API rejeita o envio', async () => {
    server.use(
      http.post('https://api.example.com/articles', () => {
        return HttpResponse.json({ message: 'Unprocessable Entity' }, { status: 422 });
      }),
    );

    renderWithProviders(<NewArticleScreen />);

    await userEvent.type(screen.getByTestId('title-input'), 'Bad article');
    await userEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error-message')).toBeTruthy();
    });
  });
});
```

---

## Testes de Integração XCTest vs Testes de Integração React Native

| Dimensão | Testes de integração XCTest | Testes de integração RN (RNTL + MSW) |
|---|---|---|
| Ambiente de renderização | Hierarquia UIKit real, simulador ou dispositivo | Árvore de componentes virtual no lado JS via JSDOM / React Test Renderer |
| Interceptação de rede | Subclasse de `URLProtocol` ou injeção de `URLSession` | MSW substitui `fetch` / `XMLHttpRequest` no nível do Node |
| Navegação | `UINavigationController` real ou um dublê de teste | `NavigationContainer` com contexto de navigator mockado |
| Animação | Core Animation real, asserções exigem delays | Animações são mockadas ou desativadas por padrão no executor de testes |
| Asserções assíncronas | `XCTestExpectation` com `waitForExpectations(timeout:)` | `waitFor(() => ...)` da Testing Library |
| Armazenamento de dados | Stack Core Data em memória ou SQLite em diretório temporário | `QueryClient` novo por teste, ou store Zustand/Redux mockada |
| Fonte de instabilidade | Timing de animações e transições | Atualizações de estado assíncronas não tratadas, lógica de retry não desativada |

A diferença crítica é que os testes de integração XCTest podem exercitar caminhos de código nativos reais, incluindo persistência com CoreData e animações UIKit. Os testes de integração RN operam inteiramente na camada JavaScript, o que significa que são mais rápidos e não requerem um simulador, mas não conseguem detectar bugs de renderização nativa ou problemas de layout do Fabric. Para isso, você precisa de testes end-to-end com Detox (abordados na próxima seção).

---

## Armadilhas Comuns

**Não desativar os retries.** O TanStack Query tenta novamente queries com falha até três vezes com backoff exponencial. Sem `retry: 0`, um teste de estado de erro aguardará vários segundos antes de o erro aparecer.

**QueryClient compartilhado entre testes.** Construir um único `QueryClient` no nível do módulo faz com que o cache do primeiro teste persista no segundo. Sempre construa um novo cliente por teste dentro da factory do wrapper.

**Ordem dos handlers MSW.** `server.use()` dentro de um teste sobrescreve os handlers padrão apenas para aquele teste. `server.resetHandlers()` no `afterEach` restaura os padrões. Se você esquecer o `resetHandlers`, a sobrescrita vaza para os testes subsequentes.

**`await` ausente em eventos de usuário.** No `@testing-library/react-native` v12+, os métodos de `userEvent` são assíncronos e devem ser aguardados. Esquecer o `await` antes de `userEvent.press()` ou `userEvent.type()` produz condições de corrida onde as asserções são executadas antes do evento ser processado.

**Consultar antes de a fronteira assíncrona ser resolvida.** Após renderizar uma tela que busca dados, sempre envolva a primeira asserção em `waitFor`. O handler MSW responde no próximo tick, portanto o estado de carregamento é a renderização inicial e o estado com dados requer ao menos uma resolução assíncrona.
