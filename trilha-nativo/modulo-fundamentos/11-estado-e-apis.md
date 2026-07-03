---
id: estado-e-apis-nativo
title: "Estado & APIs"
sidebar_label: "Estado & APIs"
sidebar_position: 11
---

# Estado & APIs

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

#### React Redux Toolkit Tutorial For Beginners — CRUD
[Assistir no YouTube](https://www.youtube.com/watch?v=QgK_-G-hWeA)

### Artigos e Docs
- [Como Gerenciar Estado no React Native — OneUptime (2026)](https://oneuptime.com/blog/post/2026-02-02-react-native-state-management/view)
- [Zustand + TanStack Query: Guia RN 2026 — React Native Relay](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query)
- [Do Básico ao Avançado: Dominando Zustand no React Native — Medium](https://medium.com/@harshitmadhav/from-basics-to-pro-mastering-zustand-in-react-native-7f372464d984)
- [Comparativo de Gerenciamento de Estado: Redux vs Context vs Zustand — Java Code Geeks](https://www.javacodegeeks.com/2025/09/react-state-management-showdown-redux-vs-context-api-vs-zustand.html)
- [Como Persistir Estado com AsyncStorage e MMKV — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view)
- [TanStack Query para React Native — Documentação oficial](https://tanstack.com/query/v5/docs/framework/react/react-native)
- [Substituindo AsyncStorage por MMKV — DEV.to](https://dev.to/ajmal_hasan/react-native-mmkv-5787)
- [react-native-mmkv — GitHub](https://github.com/mrousavy/react-native-mmkv)
