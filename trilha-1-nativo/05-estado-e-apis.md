# Tópico 5 — Estado & APIs (Trilha 1: Devs Nativos)

> **Perfil:** Devs com background Android/iOS. Já lidam com ViewModel/LiveData (Android) ou @StateObject/@ObservedObject (iOS/SwiftUI). O foco é mapear esses padrões para o ecossistema React e entender as diferenças de modelo mental.

---

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Gerenciar estado local com `useState` e `useReducer`
- Usar Context API para estado compartilhado simples
- Implementar estado global com Zustand (recomendado) ou Redux Toolkit
- Consumir APIs REST com TanStack Query
- Persistir dados localmente com MMKV
- Entender a divisão: server state vs client state

---

## Mapeamento: Android/iOS → React/RN

| Nativo | React Native | Observação |
|--------|-------------|------------|
| `ViewModel` + `LiveData` | Zustand store | Store reativo, sem boilerplate |
| `@StateObject` (SwiftUI) | `useState` / `useReducer` | Estado local do componente |
| `SharedPreferences` / `UserDefaults` | MMKV / AsyncStorage | MMKV é síncrono e 30x mais rápido |
| `Retrofit` / `URLSession` | TanStack Query + Axios/fetch | Cache, retry e loading states automáticos |
| `Repository Pattern` | Custom hook + TanStack Query | Separação de responsabilidades mantida |
| `Room` / `CoreData` | MMKV + estrutura manual ou WatermelonDB | Para dados relacionais complexos |

---

## Estado local: useState e useReducer

```tsx
// useState — para valores simples
const [count, setCount] = useState(0);

// useReducer — para lógica mais complexa (análogo ao ViewModel com events)
type State = { count: number; status: 'idle' | 'loading' };
type Action = { type: 'INCREMENT' } | { type: 'SET_LOADING' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT': return { ...state, count: state.count + 1 };
    case 'SET_LOADING': return { ...state, status: 'loading' };
    default: return state;
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0, status: 'idle' });
```

---

## Estado global: Zustand (recomendado para apps de médio porte)

```bash
npm install zustand
```

```tsx
// store/useAuthStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../lib/storage'; // MMKV adapter

type AuthStore = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => storage), // MMKV
    }
  )
);

// Uso no componente
const { user, logout } = useAuthStore();
```

> **Por que Zustand?** 2KB, sem providers, API baseada em hooks, 30-50% mais eficiente que Redux para apps médios. Para times grandes com regras complexas, Redux Toolkit ainda se justifica.

---

## Estado global: Redux Toolkit (para apps grandes)

```bash
npm install @reduxjs/toolkit react-redux
```

```tsx
// store/productsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async () => {
    const response = await fetch('https://api.example.com/products');
    return response.json();
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      });
  },
});
```

---

## APIs REST: TanStack Query

```bash
npm install @tanstack/react-query
```

```tsx
// App.tsx — configuração da raiz
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 2,
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

```tsx
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json()),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewProduct) =>
      fetch('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      // Invalida cache — próxima renderização refaz o fetch
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Uso na tela
const { data, isLoading, error } = useProducts();
const { mutate: createProduct } = useCreateProduct();
```

> **TanStack Query + React Navigation:** Use `useIsFocused()` para refazer fetch ao voltar para uma tela, replicando o comportamento do `onResume` do Android.

---

## Persistência local: MMKV

```bash
npm install react-native-mmkv react-native-nitro-modules
cd ios && pod install
```

```tsx
// lib/storage.ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

// API síncrona — sem async/await
storage.set('token', 'abc123');
const token = storage.getString('token');
storage.delete('token');
```

### Adapter MMKV para Zustand persist

```tsx
import { StateStorage } from 'zustand/middleware';

export const zustandStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.delete(name),
};
```

---

## Arquitetura recomendada: Zustand (client state) + TanStack Query (server state)

```
src/
├── stores/          # Zustand: auth, UI state, preferências
│   ├── useAuthStore.ts
│   └── useThemeStore.ts
├── hooks/           # TanStack Query: dados do servidor
│   ├── useProducts.ts
│   └── useOrders.ts
├── services/        # Funções de fetch (sem lógica de UI)
│   └── api.ts
└── lib/
    └── storage.ts   # MMKV instance
```

> Essa separação cobre ~95% dos casos de uso de um app mobile — equivalente ao pattern ViewModel + Repository nativo.

---

## Exercício prático

1. Crie uma store Zustand para autenticação com persistência em MMKV
2. Implemente `useProducts` com TanStack Query consumindo uma API pública (ex: `https://fakestoreapi.com/products`)
3. Adicione paginação com `useInfiniteQuery`
4. Invalide o cache após criar um novo produto com `useMutation`
5. Teste o comportamento offline desligando o Wi-Fi

---

## Materiais de estudo

### Vídeos

#### Learn Redux Toolkit In 11 Minutes — React Native Tutorial
[Assistir no YouTube](https://www.youtube.com/watch?v=o21Ln1Ib4Bo)

<details>
<summary>Descrição do conteúdo</summary>

Este vídeo apresenta uma implementação concisa e passo a passo do Redux Toolkit como solução de gerenciamento de estado para uma aplicação React Native. O conceito central introduzido é o **store de estado global**: um único objeto JavaScript centralizado que mantém todo o estado da aplicação e cujas mutações são realizadas exclusivamente por meio de actions despachadas — nunca por atribuição direta. Esse modelo torna as mudanças de estado previsíveis, rastreáveis e testáveis.

> **Nota brownfield:** em um projeto brownfield, o store Redux é limitado à árvore de componentes React Native. Ele não é compartilhado com o lado nativo — o estado nativo (ex: sessão do usuário gerenciada pelo app nativo) deve ser passado para a camada RN como props iniciais via bridge de módulo nativo, ou mantido sincronizado por meio de um módulo nativo dedicado. O `Provider` envolve apenas o componente raiz do RN, não a aplicação nativa inteira.

**Conceitos Fundamentais**

- **Store**: a fonte única de verdade para todo o estado da camada RN. Criado uma vez e disponibilizado para todos os componentes RN via `Provider`. Em brownfield, o store é instanciado no ponto de entrada do RN e existe apenas durante o tempo de vida da view RN.
- **Slice**: uma unidade modular que encapsula um domínio de estado — seu valor inicial, suas funções reducer e seus action creators gerados automaticamente — em uma única chamada `createSlice`.
- **Reducer**: uma função pura que recebe o estado atual e uma action, e retorna o próximo estado. O Redux Toolkit usa o Immer internamente, portanto os reducers podem ser escritos como operações mutantes (ex: `state.value += 1`), mesmo que o estado subjacente permaneça imutável.
- **Action**: um objeto simples que descreve o que aconteceu (`{ type: 'counter/increment' }`). Os action creators são gerados automaticamente pelo `createSlice` e exportados para uso nos componentes.
- **`useSelector`**: um hook que inscreve um componente em uma fatia do store e dispara uma re-renderização quando aquela fatia muda.
- **`useDispatch`**: um hook que retorna a função `dispatch`, o único mecanismo pelo qual o estado pode ser mutado.

**Instalação**

Em projetos brownfield, nenhum Expo CLI é utilizado. As dependências são instaladas diretamente:

```bash
yarn add @reduxjs/toolkit react-redux
```

Nenhuma configuração nativa adicional é necessária — ambas as bibliotecas são JavaScript puro.

**Definição do Slice**

Um arquivo `store/counterSlice.ts` é criado. O slice declara o estado inicial, três funções reducer e exporta seus action creators correspondentes:

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

**Configuração do Store**

O reducer do slice é registrado no `configureStore`. Os tipos `RootState` e `AppDispatch` são derivados do store e exportados para consumo tipado em toda a camada RN:

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

Em um projeto brownfield, o `Provider` é colocado no componente RN registrado com `AppRegistry`. O estado inicial proveniente do lado nativo (ex: um token de usuário passado pelo app nativo) pode ser incorporado na opção `preloadedState` do store neste ponto de entrada:

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

**Leitura de Estado com `useSelector`**

`useSelector` recebe uma função seletora que acessa o `RootState` completo e retorna apenas a porção que o componente precisa. O componente re-renderiza somente quando aquele valor específico muda:

```tsx
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const value = useSelector((state: RootState) => state.counter.value);
const testName = useSelector((state: RootState) => state.counter.testName);

<Text>{value}</Text>
<Text>{testName}</Text>
```

O mesmo seletor utilizado simultaneamente nas telas Home e Profile confirma que o estado é globalmente acessível e automaticamente sincronizado em todos os componentes RN que assinam o store.

**Mutação de Estado com `useDispatch`**

`useDispatch` retorna a função `dispatch` do store. Os action creators retornados pelo `createSlice` são chamados e passados para o `dispatch`. Para actions com payload (como `incrementByAmount`), o argumento se torna `action.payload` dentro do reducer:

```tsx
import { useDispatch } from 'react-redux';
import { increment, decrement, incrementByAmount } from '../store/counterSlice';

const dispatch = useDispatch();

<Button title="Increment" onPress={() => dispatch(increment())} />
<Button title="Decrement" onPress={() => dispatch(decrement())} />
<Button title="+4"        onPress={() => dispatch(incrementByAmount(4))} />
```

A propagação em tempo real das mudanças de estado em todas as telas RN renderizadas simultaneamente — Home, Profile e Settings — é validada, confirmando a natureza global e reativa do store Redux dentro do limite RN.

</details>

#### React Redux Toolkit Tutorial For Beginners — CRUD
[Assistir no YouTube](https://www.youtube.com/watch?v=QgK_-G-hWeA)

<details>
<summary>Descrição do conteúdo</summary>

Este tutorial apresenta um exame estruturado e voltado para iniciantes do Redux Toolkit aplicado a um caso de uso completo de Criar, Ler e Deletar (CRD). Um sistema de gerenciamento de filmes é construído como exemplo concreto, e cada conceito é explicado antes de sua implementação.

> **Nota brownfield:** a arquitetura demonstrada neste tutorial se aplica à camada React Native de uma aplicação brownfield. O store Redux está confinado à árvore de componentes RN — ele não compartilha estado com o lado nativo. Dados que precisam fluir entre o aplicativo nativo e o store RN (ex: tokens de autenticação, feature flags ou preferências do usuário gerenciadas nativamente) devem ser passados por módulos nativos ou props iniciais no momento em que a view RN é montada.

**Conceitos Fundamentais**

- **Store**: o contêiner único e centralizado para todo o estado dentro da camada RN. Todos os componentes RN leem e escrevem neste único objeto, tornando o estado previsível e auditável.
- **Slice**: agrupa o estado inicial, as funções reducer e os action creators para um domínio específico (ex: filmes). A API `createSlice` gera action creators automaticamente a partir dos nomes dos reducers, eliminando boilerplate.
- **Reducer**: uma função pura `(state, action) => newState`. O Redux Toolkit usa o Immer internamente, portanto os reducers podem ser escritos com sintaxe mutante (ex: `state.movies.push(...)`) mesmo que o estado subjacente permaneça imutável.
- **Action / Payload**: uma action é um objeto simples com uma string `type`. Quando dados precisam ser passados — como um novo título de filme ou um ID para deletar — eles são transportados em `action.payload`, definido pelo argumento passado para o action creator no momento do dispatch.
- **`Provider`**: um wrapper de React Context colocado no ponto de entrada do RN que disponibiliza o store para todos os componentes descendentes sem prop drilling.
- **`useSelector`**: lê uma fatia do store e inscreve o componente em atualizações. Re-renderiza apenas quando o valor selecionado muda.
- **`useDispatch`**: retorna a função `dispatch`, o único mecanismo válido pelo qual o estado pode ser mutado.

**Instalação**

```bash
npm install @reduxjs/toolkit react-redux
```

Nenhuma configuração nativa é necessária — ambas as bibliotecas são JavaScript puro.

**Definição do Slice**

O arquivo `movieSlice.js` define o domínio de filmes. O reducer `addMovie` deriva o ID da nova entrada a partir do último elemento do array atual e constrói o objeto completo a partir do payload, mantendo a lógica de geração de ID dentro do store em vez da UI. O reducer `removeMovie` usa `Array.filter` para produzir um novo array que exclui a entrada alvo:

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

**Configuração do Store**

O reducer do slice é registrado sob a chave `movies`. Esse caminho de chave determina como `useSelector` acessa o estado (`state.movies.movies`):

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

Em um projeto brownfield, o `Provider` é colocado no componente RN registrado com `AppRegistry`. Dados do lado nativo (ex: uma lista de filmes pré-carregada de um cache nativo) podem ser injetados como `preloadedState`:

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

**Leitura de Estado — Componente MovieList**

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

Um input controlado captura o título do filme via `useState` local. Ao submeter, `dispatch(addMovie(title))` é chamado. A string se torna `action.payload` dentro do reducer, que constrói o objeto completo com seu ID:

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
- [Como Gerenciar Estado no React Native — OneUptime (2026)](https://oneuptime.com/blog/post/2026-02-02-react-native-state-management/view)
- [Zustand + TanStack Query: Guia RN 2026 — React Native Relay](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query)
- [Do Básico ao Avançado: Dominando Zustand no React Native — Medium](https://medium.com/@harshitmadhav/from-basics-to-pro-mastering-zustand-in-react-native-7f372464d984)
- [Comparativo de Gerenciamento de Estado: Redux vs Context vs Zustand — Java Code Geeks](https://www.javacodegeeks.com/2025/09/react-state-management-showdown-redux-vs-context-api-vs-zustand.html)
- [Como Persistir Estado com AsyncStorage e MMKV — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view)
- [TanStack Query para React Native — Documentação oficial](https://tanstack.com/query/v5/docs/framework/react/react-native)
- [Substituindo AsyncStorage por MMKV — DEV.to](https://dev.to/ajmal_hasan/react-native-mmkv-5787)
- [react-native-mmkv — GitHub](https://github.com/mrousavy/react-native-mmkv)
