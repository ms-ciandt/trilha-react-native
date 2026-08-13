---
title: "State & APIs"
sidebar_label: "State & APIs"
sidebar_position: 5
---

## Video Overview

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/fund_05_state_and_apis.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/fund_05_state_and_apis.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## Video Overview

> Video para este topico em breve.

## Mapeando a Arquitetura Android para React Native

Voce ja conhece como a arquitetura Android funciona: `ViewModel` guarda o estado da UI, `Repository` abstrai as fontes de dados, `Flow`/`LiveData` transmite atualizacoes para a camada de UI. React Native tem equivalentes diretos para tudo isso.

| Padrao Android                   | Equivalente em React Native                    |
|----------------------------------|------------------------------------------------|
| `ViewModel` + `StateFlow`        | Zustand store                                  |
| `LiveData`                       | `useState` / Zustand selector                  |
| `Repository`                     | TanStack Query query function                  |
| `Room` (local DB)                | MMKV / SQLite via `expo-sqlite`               |
| `Retrofit` / `Ktor`              | `fetch` / `axios`                              |
| `Coroutines` + `suspend fun`     | `async/await` + `Promise`                      |
| `Hilt` / `Koin`                  | React Context / Zustand (sem framework de DI)  |
| `sealed class UiState`           | Union discriminada em TypeScript               |

---

## Estado Local: useState + useReducer

Para estado no nivel do componente (sem compartilhamento entre telas), `useState` e equivalente a um estado mutavel local em um Composable:

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

function LikeButton({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);

  function handlePress() {
    setLiked(l => !l);
    setCount(c => liked ? c - 1 : c + 1);
  }

  return (
    <Pressable onPress={handlePress}>
      <Text>{liked ? '❤️' : '🤍'} {count}</Text>
    </Pressable>
  );
}
```

Para estado com multiplos campos e transicoes (padrao sealed class UiState), use `useReducer`:

```tsx
import { useReducer } from 'react';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; users: User[] }
  | { status: 'error'; message: string };

type Action =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; users: User[] }
  | { type: 'ERROR'; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH':   return { status: 'loading' };
    case 'SUCCESS': return { status: 'success', users: action.users };
    case 'ERROR':   return { status: 'error', message: action.message };
    default:        return state;
  }
}

function UserScreen() {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });

  async function loadUsers() {
    dispatch({ type: 'FETCH' });
    try {
      const users = await api.getUsers();
      dispatch({ type: 'SUCCESS', users });
    } catch (err) {
      dispatch({ type: 'ERROR', message: (err as Error).message });
    }
  }

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error')   return <Error message={state.message} />;
  if (state.status === 'success') return <UserList users={state.users} />;
  return <Pressable onPress={loadUsers}><Text>Load</Text></Pressable>;
}
```

---

## Estado Global: Zustand

Zustand e a biblioteca de gerenciamento de estado que mapeia mais diretamente para o padrao `ViewModel` + `StateFlow` do Android. Sem boilerplate, sem reducers obrigatorios, sem necessidade de envolver com Provider.

```bash
npm install zustand
```

### Criando uma store

```tsx
// store/authStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authApi.login(email, password);
      set({ user, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  logout: () => set({ user: null }),
}));
```

### Usando a store em qualquer componente

```tsx
// Nenhum Provider necessario — a store e global
function ProfileScreen() {
  const user = useAuthStore(state => state.user);         // selector
  const logout = useAuthStore(state => state.logout);

  if (!user) return <LoginScreen />;

  return (
    <View>
      <Text>{user.name}</Text>
      <Pressable onPress={logout}><Text>Logout</Text></Pressable>
    </View>
  );
}
```

> **Padrao selector**: `useAuthStore(state => state.user)` — re-renderiza apenas quando `user` muda, nao quando `isLoading` muda. E o equivalente de `stateFlow.map { it.user }.collectAsState()` no Compose.

### Persistir store em storage (como DataStore)

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useSettingsStore = create(
  persist(
    (set) => ({
      darkMode: false,
      language: 'en',
      toggleDark: () => set(s => ({ darkMode: !s.darkMode })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## Estado de Servidor: TanStack Query

Estado local (`useState`, Zustand) e para dados do cliente. Dados de API — usuarios, posts, feed — tem um ciclo de vida diferente: busca, cache, refetch em background, paginacao, mutacoes. TanStack Query (anteriormente React Query) lida com isso, equivalente a um `Repository` + `RemoteDataSource` com cache automatico.

```bash
npm install @tanstack/react-query
```

### Configuracao

```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // dados sao frescos por 5 minutos
      retry: 2,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainNavigator />
    </QueryClientProvider>
  );
}
```

### useQuery — buscando dados

```tsx
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Text } from 'react-native';

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('https://api.example.com/users');
  if (!res.ok) throw new Error('Network error');
  return res.json();
}

function UserListScreen() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users'],       // chave de cache — equivalente a chave de cache do Room
    queryFn: fetchUsers,
  });

  if (isLoading) return <ActivityIndicator />;
  if (isError)   return <Text>Error: {error.message}</Text>;

  return (
    <FlatList
      data={data}
      keyExtractor={u => u.id}
      renderItem={({ item }) => <UserRow user={item} />}
      onRefresh={refetch}
      refreshing={isLoading}
    />
  );
}
```

### useMutation — operacoes de escrita (POST/PUT/DELETE)

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function DeleteUserButton({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/users/${id}`, { method: 'DELETE' }).then(r => r.json()),

    onSuccess: () => {
      // Invalida e refetch — equivalente ao @Delete do Room + re-emissao de Flow
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <Pressable
      onPress={() => deleteMutation.mutate(userId)}
      disabled={deleteMutation.isPending}
    >
      <Text>{deleteMutation.isPending ? 'Deletando...' : 'Deletar'}</Text>
    </Pressable>
  );
}
```

### Queries parametrizadas

```tsx
function UserDetailScreen({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['users', userId],   // chave de cache inclui o ID
    queryFn: () => fetchUser(userId),
    enabled: !!userId,             // nao busca se userId estiver vazio
  });

  return <Text>{user?.name}</Text>;
}
```

---

## Persistencia Local: MMKV

MMKV e o equivalente React Native do `SharedPreferences` — armazenamento de chave-valor rapido e sincrono baseado na biblioteca MMKV da Tencent (a mesma usada pelo WeChat).

```bash
npm install react-native-mmkv
```

```tsx
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Escrita
storage.set('user.token', 'eyJhbG...');
storage.set('user.id', '42');
storage.set('onboarded', true);

// Leitura
const token = storage.getString('user.token');  // string | undefined
const userId = storage.getNumber('user.id');     // number | undefined
const onboarded = storage.getBoolean('onboarded'); // boolean | undefined

// Remocao
storage.delete('user.token');

// Verificar existencia
if (storage.contains('user.token')) { ... }
```

### MMKV com persistencia do Zustand

```tsx
import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

const mmkvStorage = new MMKV();

const zustandMmkvStorage: StateStorage = {
  getItem: (key) => mmkvStorage.getString(key) ?? null,
  setItem: (key, value) => mmkvStorage.set(key, value),
  removeItem: (key) => mmkvStorage.delete(key),
};

// Use no middleware persist no lugar de AsyncStorage
storage: createJSONStorage(() => zustandMmkvStorage),
```

> **MMKV vs AsyncStorage**: MMKV e sincrono e 10–100x mais rapido que AsyncStorage. Use MMKV para tokens de autenticacao, preferencias de usuario, configuracoes de app. Use `expo-sqlite` para dados relacionais.

---

## Requisicoes HTTP: fetch e axios

### fetch nativo (built-in, sem instalacao)

```tsx
async function getUser(id: string): Promise<User> {
  const response = await fetch(`https://api.example.com/users/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storage.getString('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return response.json() as Promise<User>;
}
```

### axios (recomendado para producao)

```bash
npm install axios
```

```tsx
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

// Interceptor de requisicao — equivalente ao OkHttp Interceptor
api.interceptors.request.use(config => {
  const token = storage.getString('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor de resposta — tratamento global de erros
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Uso
const { data: user } = await api.get<User>(`/users/${id}`);
await api.post<void>('/users', { name, email });
```

---

## Padrao Arquitetural: Juntando Tudo

Uma tela completa seguindo o padrao inspirado em MVVM do Android em React Native:

```tsx
// O "equivalente ao ViewModel" vive no Zustand ou TanStack Query
// A "View" e o componente de tela

function ProductScreen({ route }: NativeStackScreenProps<RootStack, 'Product'>) {
  const { productId } = route.params;

  // Estado de servidor — TanStack Query (Repository + RemoteDataSource)
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.get<Product>(`/products/${productId}`).then(r => r.data),
  });

  // Estado global do cliente — Zustand (ViewModel)
  const addToCart = useCartStore(state => state.addItem);

  // Estado local de UI — useState
  const [quantity, setQuantity] = useState(1);

  if (isLoading) return <LoadingScreen />;
  if (!product) return <NotFound />;

  return (
    <ScrollView>
      <Image source={{ uri: product.imageUrl }} style={styles.image} />
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.price}>R$ {product.price.toFixed(2)}</Text>
      <QuantityPicker value={quantity} onChange={setQuantity} />
      <Pressable style={styles.btn} onPress={() => addToCart(product, quantity)}>
        <Text style={styles.btnLabel}>Add to Cart</Text>
      </Pressable>
    </ScrollView>
  );
}
```

---

## Exemplo Interativo

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/network)

---

## Materiais de Estudo

### Documentacao Oficial

- [Zustand — Documentacao](https://zustand.docs.pmnd.rs/getting-started/introduction)
- [TanStack Query — React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [MMKV — react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
- [React Native — Network](https://reactnative.dev/docs/network)
- [Axios — Documentacao](https://axios-http.com/docs/intro)

### Videos

- [Jack Herrington — Zustand — State Management for React](https://www.youtube.com/watch?v=_ngCLZ5Iz-0)
- [Theo (t3.gg) — You Might Not Need React Query](https://www.youtube.com/watch?v=vxkbf5QMA2g) — contexto sobre quando usar
- [TkDodo — Practical React Query](https://www.youtube.com/watch?v=novnyCaa7To)

---

## Resumo do Modulo

Voce concluiu o modulo de Fundamentos da Trilha Android Nativo. Aqui esta o mapa completo:

| Conceito | Onde encontrar |
|---------|-----------------|
| Variaveis, funcoes e closures em JavaScript | Topico 01 |
| Tipos, generics e sealed classes em TypeScript | Topico 02 |
| View/Text/Image/FlatList/Pressable | Topico 03 |
| StyleSheet, Platform, sombras, transforms | Topico 04 |
| useState, Zustand, TanStack Query, MMKV | Topico 05 |
| @Composable → Component | Modulo Compose → RN, Topico 01 |
| remember/useState/useEffect | Modulo Compose → RN, Topico 02 |
| Column/Row/Flexbox | Modulo Compose → RN, Topico 03 |
| Navegacao | Modulo Compose → RN, Topico 04 |
| MaterialTheme → Paper/Context | Modulo Compose → RN, Topico 05 |

O proximo modulo mergulha na New Architecture: Hermes, JSI, TurboModules em Kotlin e Fabric Native Components baseados em views do Jetpack Compose.
