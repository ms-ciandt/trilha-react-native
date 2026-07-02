# Tópico 5 — Estado Global & APIs (Trilha 2: Devs Web/React)

> **Perfil:** Devs com background React web. Já conhecem Redux, Context API e React Query na web. O foco aqui é entender as adaptações necessárias para o contexto mobile: offline-first, persistência local, comportamento sem browser cache e particularidades da rede móvel.

---

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Reaproveitar o conhecimento de Zustand/Redux da web no contexto mobile
- Configurar TanStack Query com comportamentos mobile-first (revalidação por foco de tela)
- Persistir estado com MMKV (não com `localStorage`)
- Entender o padrão offline-first para apps mobile
- Adaptar padrões de Context API para o modelo mobile

---

## O que muda da web para o mobile

| Web | Mobile (React Native) | Por quê muda |
|-----|----------------------|-------------|
| `localStorage` | MMKV / AsyncStorage | Não existe `window.localStorage` |
| `sessionStorage` | Estado em memória (Zustand sem persist) | Sem conceito de sessão de aba |
| Cache do browser | TanStack Query cache explícito | Sem cache HTTP automático do browser |
| Conexão estável | Rede instável, offline frequente | Apps mobile precisam de offline-first |
| Foco de página (`visibilitychange`) | Foco de tela (`useFocusEffect`) | Eventos de foco são por tela, não por aba |
| `window.navigator.onLine` | `@react-native-community/netinfo` | API diferente para detectar conectividade |

---

## Estado local: sem mudanças

`useState` e `useReducer` funcionam exatamente igual à web — nenhuma adaptação necessária.

```tsx
const [count, setCount] = useState(0);
const [form, setForm] = useReducer(formReducer, initialFormState);
```

---

## Context API: use para estado simples e raramente mutável

A Context API funciona igual à web, mas atenção para re-renders em mobile — evite para estado que muda com frequência (ex: lista de produtos). Use para:
- Tema (dark/light)
- Idioma (i18n)
- Sessão de autenticação

```tsx
// Padrão Context + useReducer para auth
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, token: null });

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
```

---

## Zustand: recomendado para estado global (mesma API da web)

```bash
npm install zustand
npm install react-native-mmkv react-native-nitro-modules
```

```tsx
// stores/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// MMKV como storage (substitui localStorage)
import { MMKV } from 'react-native-mmkv';
const mmkv = new MMKV();

const zustandStorage = {
  setItem: (name: string, value: string) => mmkv.set(name, value),
  getItem: (name: string) => mmkv.getString(name) ?? null,
  removeItem: (name: string) => mmkv.delete(name),
};

type CartStore = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set({ items: [...get().items, item] }),
      removeItem: (id) => set({ items: get().items.filter(i => i.id !== id) }),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
```

> **Diferença da web:** troque `localStorage` por MMKV como backend do `persist`. O resto da API do Zustand é idêntico.

---

## MMKV: substituto do localStorage

```bash
npm install react-native-mmkv react-native-nitro-modules
cd ios && pod install
```

```tsx
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// API síncrona — sem async/await (diferente do AsyncStorage)
storage.set('token', 'abc123');
storage.set('user', JSON.stringify({ id: 1, name: 'João' }));

const token = storage.getString('token');
const user = JSON.parse(storage.getString('user') ?? 'null');
storage.delete('token');
```

### AsyncStorage vs MMKV

| | AsyncStorage | MMKV |
|--|-------------|------|
| Velocidade | Padrão | 30x mais rápido |
| API | Async (Promise) | Síncrona |
| Criptografia | Não | AES-128/256 embutido |
| Uso ideal | Projetos simples / legado | Produção — qualquer tamanho |

---

## TanStack Query: adaptações mobile-first

```bash
npm install @tanstack/react-query
```

### Configuração com revalidação por foco de tela

```tsx
// App.tsx
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

// Revalidar queries quando o app volta ao primeiro plano
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      // No mobile, não refazer fetch ao focar a "janela" (sem tabs)
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
    </QueryClientProvider>
  );
}
```

### Revalidar ao focar a tela (equivalente ao refetchOnWindowFocus da web)

```tsx
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';

export function useProducts() {
  const query = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  // Refaz fetch toda vez que a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      query.refetch();
    }, [query.refetch])
  );

  return query;
}
```

### Mutations com invalidação de cache

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewProduct) =>
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

---

## Offline-first: padrão importante no mobile

Diferente da web, apps mobile devem funcionar sem conexão. A camada de persistência do TanStack Query + MMKV viabiliza isso:

```tsx
// Detectar conectividade
import NetInfo from '@react-native-community/netinfo';

// Pausar queries quando offline
import { onlineManager } from '@tanstack/react-query';

NetInfo.addEventListener(state => {
  onlineManager.setOnline(state.isConnected ?? true);
});
```

```tsx
// Arquitetura offline-first
// 1. Tela carrega dados do cache local (MMKV) imediatamente
// 2. TanStack Query faz fetch em background
// 3. Se offline, usa cache sem erro

const { data, isLoading, isFetching } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  // Dados do cache são usados enquanto refetch ocorre em background
  staleTime: 5 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000, // manter cache por 24h
});
```

---

## Arquitetura recomendada

```
src/
├── stores/          # Zustand: UI state, auth, preferências
│   ├── useAuthStore.ts
│   └── useThemeStore.ts
├── hooks/           # TanStack Query: dados do servidor
│   ├── useProducts.ts
│   └── useUser.ts
├── services/        # Funções de fetch (sem lógica React)
│   ├── api.ts
│   └── endpoints/
│       ├── products.ts
│       └── users.ts
└── lib/
    └── storage.ts   # MMKV singleton
```

---

## Exercício prático

1. Migre uma store Zustand da web para mobile, trocando `localStorage` por MMKV
2. Configure TanStack Query com `focusManager` para revalidar quando o app volta ao primeiro plano
3. Implemente `useFocusEffect` para refazer fetch ao navegar de volta para uma tela
4. Adicione detecção de conectividade com `onlineManager` do TanStack Query
5. Teste o comportamento offline: carregue dados, desligue o Wi-Fi e navegue

---

## Materiais de estudo

### Vídeos

#### Learn Redux Toolkit In 11 Minutes — React Native Tutorial
[Assistir no YouTube](https://www.youtube.com/watch?v=o21Ln1Ib4Bo)

<details>
<summary>Descrição do conteúdo</summary>

Este vídeo apresenta uma implementação concisa e passo a passo do Redux Toolkit como solução de gerenciamento de estado para uma aplicação React Native. O conceito central introduzido é a **store de estado global**: um único objeto JavaScript centralizado que armazena todo o estado da aplicação e cujas mutações são realizadas exclusivamente por meio de actions despachadas — nunca por atribuição direta. Esse modelo torna as mudanças de estado previsíveis, rastreáveis e testáveis.

> **Nota brownfield:** em um projeto brownfield, a store do Redux está limitada à árvore de componentes React Native. Ela não é compartilhada com o lado nativo — o estado nativo (por exemplo, sessão do usuário gerenciada pelo app nativo) deve ser passado para a camada RN como props iniciais via bridge do módulo nativo, ou mantido sincronizado por meio de um módulo nativo dedicado. O `Provider` envolve apenas o componente raiz do RN, não toda a aplicação nativa.

**Conceitos Fundamentais**

- **Store**: a única fonte de verdade para todo o estado da camada RN. Criada uma vez e disponibilizada a todos os componentes RN via `Provider`. Em projetos brownfield, a store é instanciada no ponto de entrada do RN e existe apenas durante o tempo de vida da view RN.
- **Slice**: unidade modular que encapsula um domínio de estado — seu valor inicial, suas funções reducer e seus action creators gerados automaticamente — em uma única chamada `createSlice`.
- **Reducer**: função pura que recebe o estado atual e uma action, e retorna o próximo estado. O Redux Toolkit usa o Immer internamente, então os reducers podem ser escritos como operações mutantes (por exemplo, `state.value += 1`) mesmo que o estado subjacente permaneça imutável.
- **Action**: objeto simples que descreve o que aconteceu (`{ type: 'counter/increment' }`). Os action creators são gerados automaticamente pelo `createSlice` e exportados para uso nos componentes.
- **`useSelector`**: hook que inscreve um componente em uma fatia da store e dispara um re-render quando essa fatia é alterada.
- **`useDispatch`**: hook que retorna a função `dispatch`, o único mecanismo pelo qual o estado pode ser mutado.

**Instalação**

Projetos brownfield não utilizam o Expo CLI. As dependências são instaladas diretamente:

```bash
yarn add @reduxjs/toolkit react-redux
```

Nenhuma configuração nativa adicional é necessária — ambas as bibliotecas são JavaScript puro.

**Definição do Slice**

Um arquivo `store/counterSlice.ts` é criado. O slice declara o estado inicial, três funções reducer e exporta seus respectivos action creators:

```ts
// store/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
  testName: string;
}

const initialState: CounterState = { value: 0, testName: 'test name' };

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => { state.value += 1; },
    decrement: (state) => { state.value -= 1; },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
```

**Configuração da Store**

O reducer do slice é registrado no `configureStore`. Os tipos `RootState` e `AppDispatch` são derivados da store e exportados para uso tipado em toda a camada RN:

```ts
// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Configuração do Provider — Ponto de Entrada Brownfield**

Em um projeto brownfield, o `Provider` é colocado no componente RN registrado com `AppRegistry`. O estado inicial proveniente do lado nativo (por exemplo, um token de usuário passado pelo app nativo) pode ser incorporado à opção `preloadedState` da store nesse ponto de entrada:

```tsx
// index.js
import { AppRegistry } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { RootNavigator } from './src/navigation/RootNavigator';

function RNFeature() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}

AppRegistry.registerComponent('RNFeature', () => RNFeature);
```

**Lendo o Estado com `useSelector`**

`useSelector` recebe uma função seletora que acessa o `RootState` completo e retorna apenas a parte que o componente precisa. O componente só é re-renderizado quando aquele valor específico muda:

```tsx
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const value = useSelector((state: RootState) => state.counter.value);
const testName = useSelector((state: RootState) => state.counter.testName);

<Text>{value}</Text>
<Text>{testName}</Text>
```

O mesmo seletor utilizado simultaneamente nas telas Home e Profile confirma que o estado é globalmente acessível e automaticamente sincronizado entre todos os componentes RN que o assinam.

**Mutando o Estado com `useDispatch`**

`useDispatch` retorna a função `dispatch` da store. Os action creators retornados pelo `createSlice` são chamados e passados ao `dispatch`. Para actions com payload (como `incrementByAmount`), o argumento se torna `action.payload` dentro do reducer:

```tsx
import { useDispatch } from 'react-redux';
import { increment, decrement, incrementByAmount } from '../store/counterSlice';

const dispatch = useDispatch();

<Button title="Increment" onPress={() => dispatch(increment())} />
<Button title="Decrement" onPress={() => dispatch(decrement())} />
<Button title="+4"        onPress={() => dispatch(incrementByAmount(4))} />
```

A propagação em tempo real das mudanças de estado por todas as telas RN renderizadas simultaneamente — Home, Profile e Settings — é validada, confirmando a natureza global e reativa da store Redux dentro do limite RN.

</details>

#### React Redux Toolkit Tutorial For Beginners — CRUD
[Assistir no YouTube](https://www.youtube.com/watch?v=QgK_-G-hWeA)

<details>
<summary>Descrição do conteúdo</summary>

Este tutorial apresenta um exame estruturado e voltado para iniciantes do Redux Toolkit aplicado a um caso de uso completo de Criar, Ler e Excluir (CRD). Um sistema de gerenciamento de filmes é construído como exemplo concreto, e cada conceito é explicado antes de sua implementação.

> **Nota brownfield:** a arquitetura demonstrada neste tutorial se aplica à camada React Native de uma aplicação brownfield. A store do Redux está confinada à árvore de componentes RN — ela não compartilha estado com o lado nativo. Dados que precisam fluir entre a aplicação nativa e a store RN (por exemplo, tokens de autenticação, feature flags ou preferências do usuário gerenciadas nativamente) devem ser passados por meio de módulos nativos ou props iniciais no momento em que a view RN é montada.

**Conceitos Fundamentais**

- **Store**: o contêiner único e centralizado para todo o estado dentro da camada RN. Todos os componentes RN leem e escrevem nesse único objeto, tornando o estado previsível e auditável.
- **Slice**: agrupa o estado inicial, as funções reducer e os action creators para um domínio específico (por exemplo, filmes). A API `createSlice` gera os action creators automaticamente a partir dos nomes dos reducers, eliminando código repetitivo.
- **Reducer**: função pura `(state, action) => newState`. O Redux Toolkit usa o Immer internamente, então os reducers podem ser escritos com sintaxe mutante (por exemplo, `state.movies.push(...)`) mesmo que o estado subjacente permaneça imutável.
- **Action / Payload**: uma action é um objeto simples com uma string `type`. Quando dados precisam ser passados — como o título de um novo filme ou um ID para exclusão — eles são transportados em `action.payload`, definido pelo argumento passado ao action creator no momento do dispatch.
- **`Provider`**: wrapper de Context React colocado no ponto de entrada do RN que disponibiliza a store a todos os componentes descendentes sem prop drilling.
- **`useSelector`**: lê uma fatia da store e inscreve o componente em atualizações. Re-renderiza apenas quando o valor selecionado muda.
- **`useDispatch`**: retorna a função `dispatch`, o único mecanismo válido pelo qual o estado pode ser mutado.

**Instalação**

```bash
npm install @reduxjs/toolkit react-redux
```

Nenhuma configuração nativa é necessária — ambas as bibliotecas são JavaScript puro.

**Definição do Slice**

O arquivo `movieSlice.js` define o domínio de filmes. O reducer `addMovie` deriva o ID da nova entrada a partir do último elemento do array atual e constrói o objeto completo a partir do payload, mantendo a lógica de geração de ID dentro da store em vez da UI. O reducer `removeMovie` usa `Array.filter` para produzir um novo array que exclui a entrada alvo:

```js
// store/movieSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  movies: [
    { id: 1, name: 'Interstellar' },
    { id: 2, name: 'Harry Potter' },
  ],
};

const movieSlice = createSlice({
  name: 'movies',
  initialState,
  reducers: {
    addMovie: (state, action) => {
      const newMovie = {
        id: state.movies[state.movies.length - 1].id + 1,
        name: action.payload, // payload is the movie title string
      };
      state.movies.push(newMovie);
    },
    removeMovie: (state, action) => {
      // action.payload is the id of the movie to remove
      state.movies = state.movies.filter(
        (movie) => movie.id !== action.payload
      );
    },
  },
});

export const { addMovie, removeMovie } = movieSlice.actions;
export default movieSlice.reducer;
```

**Configuração da Store**

O reducer do slice é registrado sob a chave `movies`. Esse caminho de chave determina como o `useSelector` acessa o estado (`state.movies.movies`):

```js
// store/store.js
import { configureStore } from '@reduxjs/toolkit';
import movieReducer from './movieSlice';

export const store = configureStore({
  reducer: {
    movies: movieReducer,
  },
});
```

**Configuração do Provider — Ponto de Entrada Brownfield**

Em um projeto brownfield, o `Provider` é colocado no componente RN registrado com `AppRegistry`. Dados do lado nativo (por exemplo, uma lista de filmes pré-carregada de um cache nativo) podem ser injetados como `preloadedState`:

```js
// index.js
import { AppRegistry } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import movieReducer from './store/movieSlice';

export function createAppStore(nativeInitialData) {
  return configureStore({
    reducer: { movies: movieReducer },
    preloadedState: nativeInitialData ?? undefined,
  });
}

function RNFeature({ initialMovies }) {
  const store = createAppStore(initialMovies);
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}

AppRegistry.registerComponent('RNFeature', () => RNFeature);
```

**Lendo o Estado — Componente MovieList**

`useSelector` é chamado com um seletor que navega até `state.movies.movies`. O array retornado é mapeado para renderizar cada item:

```jsx
import { useSelector } from 'react-redux';

export function MovieList() {
  const movies = useSelector((state) => state.movies.movies);
  return (
    <div>
      {movies.map((movie) => (
        <div key={movie.id}>
          <span>{movie.name}</span>
          <DeleteButton movieId={movie.id} />
        </div>
      ))}
    </div>
  );
}
```

**Adicionando um Filme — Componente MovieInput**

Um input controlado captura o título do filme via `useState` local. Ao enviar, `dispatch(addMovie(title))` é chamado. A string se torna `action.payload` dentro do reducer, que constrói o objeto completo com seu ID:

```jsx
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addMovie } from '../store/movieSlice';

export function MovieInput() {
  const [newMovie, setNewMovie] = useState('');
  const dispatch = useDispatch();

  function handleAddMovie() {
    if (!newMovie) return;
    dispatch(addMovie(newMovie));
    setNewMovie('');
  }

  return (
    <div>
      <input value={newMovie} onChange={(e) => setNewMovie(e.target.value)} />
      <button onClick={handleAddMovie}>Add Movie</button>
    </div>
  );
}
```

**Removendo um Filme — Componente DeleteButton**

O `id` do filme é despachado como payload de `removeMovie`. O mecanismo de draft state do Immer lida com a restrição de imutabilidade de forma transparente:

```jsx
import { useDispatch } from 'react-redux';
import { removeMovie } from '../store/movieSlice';

export function DeleteButton({ movieId }) {
  const dispatch = useDispatch();
  return (
    <button onClick={() => dispatch(removeMovie(movieId))}>
      Delete Movie
    </button>
  );
}
```

O tutorial conclui reforçando que o mesmo padrão — slice, store, `Provider`, `useSelector`, `useDispatch` — é aplicado de forma consistente independentemente de o projeto ser greenfield ou brownfield. Em contextos brownfield, a única diferença estrutural está no ponto de entrada, onde `AppRegistry.registerComponent` substitui um `App.tsx` standalone.

</details>

### Artigos e Docs
- [Zustand + TanStack Query: RN Guide 2026 — React Native Relay](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query)
- [State Management in React 2026: Redux, Context & Zustand — Zignuts](https://www.zignuts.com/blog/react-state-management-2025)
- [How to Handle State Management in React Native — OneUptime](https://oneuptime.com/blog/post/2026-02-02-react-native-state-management/view)
- [How to Persist State with AsyncStorage and MMKV — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view)
- [Offline-First Architecture in React Native — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-offline-architecture/view)
- [TanStack Query para React Native — Documentação oficial](https://tanstack.com/query/v5/docs/framework/react/react-native)
- [Mastering Zustand in React Native — DEV Community](https://dev.to/james_mugambi_494c7da2b07/mastering-state-management-in-react-native-with-zustand-a-modern-guide-1bfd)
- [MMKV vs AsyncStorage in React Native](https://reactnativeexpert.com/blog/mmkv-vs-asyncstorage-in-react-native/)
- [react-native-mmkv — GitHub](https://github.com/mrousavy/react-native-mmkv)
