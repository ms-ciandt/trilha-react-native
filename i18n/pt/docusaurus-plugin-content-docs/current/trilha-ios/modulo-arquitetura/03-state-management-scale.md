---
title: State Management at Scale
---

# Gerenciamento de Estado em Escala

Conforme seu aplicativo React Native cresce além de algumas telas, as decisões que você toma sobre gerenciamento de estado começam a definir toda a arquitetura. Desenvolvedores iOS enfrentam um ponto de inflexão análogo quando uma única `ViewController` começa a acumular estado mutável demais, ou quando múltiplas stores `ObservableObject` começam a compartilhar dados de maneiras que criam acoplamento forte. Este documento percorre o cenário completo de gerenciamento de estado em aplicativos React Native de grande porte, com analogias concretas aos padrões Swift e UIKit/SwiftUI que você já conhece.

## Quando o useState se Torna Insuficiente

`useState` é a forma mais local de estado — com escopo restrito a um único componente, invisível para todo o resto. É o equivalente direto de uma propriedade privada em um `UIViewController` ou uma variável `@State` em uma `View` do SwiftUI. Funciona perfeitamente para entradas de formulário, estados de toggle e qualquer dado que não precise ser compartilhado.

Os sinais de que você superou o `useState`:

- Você está passando o mesmo valor como prop por três ou mais níveis de componentes (prop drilling)
- Múltiplas telas sem relação entre si precisam reagir à mesma mudança de dado
- O componente que possui o estado está alto na árvore e re-renderiza subárvores custosas a cada atualização
- Você precisa que o estado sobreviva a desmontagens e remontagens de componentes (transições de navegação no React Navigation destroem e recriam telas por padrão)

Quando você perceber esses padrões, precisará de um contêiner de estado que viva fora da árvore de componentes React.

## Zustand: Múltiplas Stores ObservableObject

Zustand é o equivalente mais próximo do padrão de ter múltiplas classes `ObservableObject` focadas no SwiftUI, cada uma responsável por um domínio específico. Em vez de uma store monolítica, você cria slices — stores instanciadas de forma independente que gerenciam, cada uma, uma parte coesa do estado da aplicação.

```ts
import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  token: string | null;
  login: (userId: string, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  token: null,
  login: (userId, token) => set({ userId, token }),
  logout: () => set({ userId: null, token: null }),
}));
```

Isso espelha um `AuthManager: ObservableObject` em Swift com propriedades `@Published`. A diferença fundamental é que qualquer componente pode se inscrever apenas no slice de estado de que precisa, usando um selector:

```ts
// Re-renderiza apenas quando userId muda, não quando token muda
const userId = useAuthStore((state) => state.userId);
```

Isso equivale ao `Publisher.map` do Combine seguido de `removeDuplicates()` — o componente recebe atualizações apenas para o valor exato que selecionou.

### Organizando Slices Zustand em Apps Grandes

O padrão de slices escala bem: crie uma store Zustand por domínio (autenticação, perfil do usuário, carrinho, histórico de navegação, feature flags). Mantenha cada arquivo abaixo de 150 linhas. Cada store é testável de forma independente, exatamente como isolar um teste unitário de um `ObservableObject`.

```
src/
  store/
    auth.store.ts
    cart.store.ts
    profile.store.ts
    notifications.store.ts
```

Para slices que precisam se comunicar, prefira chamadas explícitas entre stores em vez de combiná-las em uma store grande. O mesmo princípio se aplica em Swift quando um `AuthManager` notifica um `CartManager` para limpar os dados no logout.

## Redux Toolkit: Timeline do Instruments para Estado

O Redux Toolkit (RTK) ocupa uma posição diferente no ecossistema. Sua principal vantagem não é a simplicidade bruta, mas a depurabilidade. A extensão Redux DevTools para o navegador oferece uma timeline completa de cada transição de estado, com a capacidade de reproduzir, rebobinar e saltar para qualquer ponto no histórico. Isso é conceitualmente equivalente ao que o Instruments oferece para memória e CPU — uma timeline retroativa e navegável do que aconteceu e quando.

Quando o Redux Toolkit é a escolha certa:

- Sua equipe precisa diagnosticar bugs complexos que envolvem uma sequência de transições de estado
- Você tem requisitos rígidos de registro de auditoria ou analytics que mapeiam diretamente para actions disparadas
- Você está integrando com uma base de código Redux existente
- Múltiplos desenvolvedores precisam de um único padrão imposto para todas as mutações de estado

O RTK moderniza o Redux eliminando boilerplate por meio do `createSlice`:

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartState {
  items: CartItem[];
  total: number;
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], total: 0 } as CartState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload);
      state.total += action.payload.price;
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.total = state.items.reduce((sum, item) => sum + item.price, 0);
    },
  },
});
```

As mutações de aparência imutável dentro de `reducers` são seguras porque o RTK usa Immer internamente, que produz um novo estado imutável a partir de suas mutações de rascunho — equivalente à semântica de tipos de valor do Swift, onde atribuir a uma struct `var` produz uma cópia.

Para a maioria dos novos projetos, o Zustand entrega 80% dos benefícios do Redux com significativamente menos cerimônia. Escolha o RTK quando a depuração por viagem no tempo e o rastro de auditoria do log de actions são requisitos inegociáveis.

## Jotai: Composição de @State do SwiftUI

Jotai adota a abordagem oposta à do Zustand e do Redux. Em vez de uma store centralizada, o Jotai oferece átomos — a menor unidade de estado — que se compõem em átomos derivados. Isso se mapeia quase diretamente para o modelo mental de `@State` e `@Derived` do SwiftUI.

```ts
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubledAtom = atom((get) => get(countAtom) * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [doubled] = useAtom(doubledAtom);
  return <Text>{count} doubled is {doubled}</Text>;
}
```

`doubledAtom` é uma propriedade computada que invalida automaticamente quando `countAtom` muda — exatamente como um `@State` no SwiftUI acionando uma `var` computada que o corpo da view lê. O componente se inscreve apenas nos átomos que lê, e o Jotai garante que as re-renderizações sejam limitadas precisamente ao que mudou.

Jotai é excelente para:

- Reatividade granular onde existem muitas peças pequenas e independentes de estado
- Estado de formulário onde cada campo é um átomo e o botão de envio lê um átomo de validação derivado
- Feature flags ou tokens de tema que precisam ser lidos de qualquer componente sem prop drilling

A desvantagem é que a proliferação de átomos em um app grande exige disciplina na nomeação e organização.

## Estado de Servidor vs Estado do Cliente: A Separação Fundamental

Uma das decisões arquiteturais mais importantes em um aplicativo React Native em produção é distinguir entre duas categorias fundamentalmente diferentes de estado:

**Estado do cliente** é o dado que seu app possui e controla: a aba atualmente selecionada, se um modal está aberto, valores de rascunho de formulário, preferências do usuário armazenadas localmente. Zustand é a ferramenta certa para isso.

**Estado do servidor** é o dado que vive em um servidor remoto e está temporariamente em cache no seu app: o histórico de pedidos do usuário, catálogo de produtos, lista de amigos. Esse dado tem características diferentes — pode ficar obsoleto, pode ser buscado por múltiplos componentes simultaneamente, precisa de invalidação de cache e se beneficia de atualização em segundo plano.

Em termos de UIKit: estado do cliente é o que você armazena em `UserDefaults` ou em propriedades em memória no seu app delegate. Estado do servidor é o que você busca via `URLSession`, armazena em cache em `NSCache` e decide quando rebuscar.

TanStack Query (React Query) foi projetado especificamente para estado do servidor. Zustand não é a ferramenta certa para isso.

```
Arquitetura em Camadas de Estado

  TanStack Query         Zustand / Jotai
  ───────────────        ──────────────────
  Histórico de pedidos   Índice da aba selecionada
  Catálogo de produtos   Badge de contagem do carrinho
  Perfil do usuário      Estado de rascunho do formulário
  Lista de amigos        Modal aberto/fechado
  Feed de notificações   Preferência de tema
```

## TanStack Query: Propriedade do Estado do Servidor

TanStack Query gerencia o ciclo de vida completo dos dados do servidor: busca, cache, rebusca em segundo plano, deduplicação e estados de erro. A primitiva central é `useQuery`:

```ts
import { useQuery } from '@tanstack/react-query';

function OrderHistory() {
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetchOrders(userId),
    staleTime: 5 * 60 * 1000, // dados são frescos por 5 minutos
  });

  if (isLoading) return <ActivityIndicator />;
  if (error) return <ErrorView error={error} />;
  return <OrderList orders={orders} />;
}
```

Dois componentes que chamam `useQuery({ queryKey: ['orders', userId] })` compartilham a mesma entrada de cache — a requisição de rede é feita uma vez, não duas. Essa deduplicação acontece automaticamente, equivalente a encapsular uma task `URLSession` em um `NSOperation` com verificação de dependência.

## Padrão Query Key Factory

Conforme seu app cresce, as query keys se tornam uma fonte de bugs sutis quando definidas de forma inconsistente entre arquivos. O padrão query key factory centraliza as definições de chaves:

```ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};
```

O uso em todo o app se torna consistente e refatorável:

```ts
// Em um componente de lista
useQuery({ queryKey: orderKeys.list({ status: 'pending' }) });

// Invalidando todos os pedidos após uma mutação
queryClient.invalidateQueries({ queryKey: orderKeys.all });
```

Isso equivale a centralizar a construção de `URLRequest` em um enum `NetworkRouter` dedicado em Swift — uma única fonte de verdade para como as requisições são descritas, o que torna a refatoração segura.

## Atualizações Otimistas

Uma atualização otimista aplica uma mudança de estado na UI imediatamente, antes que o servidor confirme o sucesso, e depois reconcilia com a resposta real do servidor. Desenvolvedores iOS implementam esse padrão manualmente com URLSession — você atualiza seu modelo local, faz a chamada de rede e reverte se ela falhar.

TanStack Query fornece esse padrão com reversão automática:

```ts
const mutation = useMutation({
  mutationFn: (newItem: CartItem) => addItemToCart(newItem),
  onMutate: async (newItem) => {
    await queryClient.cancelQueries({ queryKey: orderKeys.all });
    const previousCart = queryClient.getQueryData(['cart']);

    queryClient.setQueryData(['cart'], (old: Cart) => ({
      ...old,
      items: [...old.items, newItem],
    }));

    return { previousCart };
  },
  onError: (err, newItem, context) => {
    // Reverte para o snapshot tirado antes da mutação
    queryClient.setQueryData(['cart'], context.previousCart);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  },
});
```

`onMutate` dispara antes da chamada de rede, captura um snapshot (equivalente a salvar uma cópia da sua struct Swift antes da mutação) e aplica a mudança otimista. `onError` restaura o snapshot se o servidor retornar um erro. `onSettled` aciona uma rebusca para sincronizar com a fonte verdadeira.

## Stale-While-Revalidate: NSCache + Atualização em Segundo Plano

O padrão stale-while-revalidate é a estratégia onde você exibe imediatamente os dados em cache (mesmo que potencialmente obsoletos) enquanto simultaneamente busca uma versão atualizada em segundo plano. Quando os dados frescos chegam, a UI é atualizada. O usuário vê o conteúdo instantaneamente em vez de um spinner de carregamento.

Isso é exatamente o que o `NSCache` possibilita no iOS: você serve a versão em cache da memória enquanto uma task `URLSession` em segundo plano busca a versão atualizada. Quando os novos dados chegam, você atualiza o cache e notifica os observadores.

TanStack Query implementa isso como comportamento padrão. As opções `staleTime` e `gcTime` controlam o ciclo de vida:

```ts
useQuery({
  queryKey: ['product-catalog'],
  queryFn: fetchProductCatalog,
  staleTime: 2 * 60 * 1000,  // Dados são "frescos" por 2 minutos — sem busca em segundo plano
  gcTime: 10 * 60 * 1000,    // Entrada de cache vive por 10 minutos após o último assinante
});
```

Quando `staleTime` expira, a próxima montagem de componente ou foco na janela aciona uma busca em segundo plano. Os dados em cache permanecem visíveis durante a busca — o usuário nunca vê uma tela em branco.

Para dados que raramente mudam (categorias de produto, configuração), use um `staleTime` maior. Para dados que mudam com frequência (estoque ao vivo, preços), use um `staleTime` curto ou zero.

## React Query DevTools: Instruments para Estado de Rede

O React Query DevTools fornece um painel flutuante que mostra cada query ativa, seu status (fresco, obsoleto, buscando, erro), os dados exatos em cache e quando a próxima rebusca em segundo plano está agendada. Para React Native, instale o devtools standalone:

```bash
npm install @tanstack/react-query-devtools
```

Use-o condicionalmente, apenas em builds de desenvolvimento:

```ts
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
      {__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

A experiência equivale a usar o template Network do Instruments — você pode ver cada requisição em andamento, inspecionar payloads em cache e acionar manualmente rebuscas para testar seus estados de carregamento. Combinado com Redux DevTools para estado do cliente, você tem observabilidade completa sobre ambas as categorias de estado.

## Normalização vs Desnormalização

Quando a mesma entidade aparece em múltiplas queries — por exemplo, um objeto `User` embutido tanto em um `Comment` quanto em um `Post` — você enfrenta uma decisão de normalização.

**Desnormalizado** (padrão do TanStack Query): cada query mantém uma cópia completa dos objetos embutidos. Quando o avatar do usuário muda, você deve invalidar cada query que embute um `User`. Isso é simples de implementar e é o padrão correto para a maioria dos apps.

**Normalizado** (RTK Query ou manual): entidades são armazenadas uma vez, em uma tabela de consulta plana indexada por ID. Cada query mantém apenas IDs, não objetos completos. Quando um `User` é atualizado, cada view que referencia aquele ID reflete automaticamente a mudança. Isso equivale a usar um grafo de entidades `Core Data` — relacionamentos são referências, não cópias.

RTK Query tem normalização integrada por meio de seu `createEntityAdapter`:

```ts
const usersAdapter = createEntityAdapter<User>();

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(),
  reducers: {
    upsertUser: usersAdapter.upsertOne,
    removeUser: usersAdapter.removeOne,
  },
});
```

Escolha normalização quando:
- Entidades são atualizadas com frequência a partir de múltiplas fontes (eventos WebSocket, push notifications, polling)
- A mesma entidade aparece em muitas views diferentes simultaneamente
- Dados obsoletos de entidade visíveis em uma tela enquanto outra exibe dados frescos é um problema de produto

Escolha desnormalização quando:
- Entidades são majoritariamente somente leitura ou se atualizam com pouca frequência
- Cada view tem um ponto natural de atualização (pull-to-refresh, foco na tela)
- A complexidade adicional da normalização não é justificada pela frequência de atualizações de múltiplas fontes

Para a maioria dos apps em produção, um híbrido funciona bem: TanStack Query para estado do servidor desnormalizado com chamadas estratégicas de `invalidateQueries`, e uma camada fina de Zustand para estado do cliente. Introduza normalização apenas quando o problema concreto de obsolescência de entidades entre views aparecer.

## Escolhendo a Ferramenta Certa

| Cenário | Ferramenta Recomendada |
|---|---|
| Valor de campo de formulário | `useState` |
| Modal aberto/fechado | `useState` ou Zustand |
| Identidade do usuário autenticado | Zustand |
| Dados remotos com cache | TanStack Query |
| Requisitos de trilha de auditoria complexa | Redux Toolkit |
| Composição granular de átomos | Jotai |
| Grafo de entidades compartilhado | RTK Query com `createEntityAdapter` |

A arquitetura de produção mais comum para um app React Native de médio a grande porte é TanStack Query para estado do servidor mais Zustand para estado do cliente, com React Query DevTools conectado para o ambiente de desenvolvimento. Essa combinação cobre a grande maioria das necessidades de gerenciamento de estado sem a sobrecarga do Redux, mantendo as duas categorias fundamentalmente diferentes de estado em ferramentas construídas especificamente para cada uma.
