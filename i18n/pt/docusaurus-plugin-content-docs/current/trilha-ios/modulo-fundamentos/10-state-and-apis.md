---
title: State Management and API Calls
---

# Gerenciamento de Estado e Chamadas de API

O Swift oferece uma pilha bem definida: URLSession ou Alamofire para networking, Combine para estado reativo, CoreData ou SwiftData para persistência, UserDefaults para armazenamento leve de chave-valor e Keychain para segredos. O React Native não inclui uma pilha equivalente — em vez disso, o ecossistema converge em um conjunto de bibliotecas que se mapeiam quase um a um com o que você já conhece.

Este módulo percorre cada camada da pilha Swift e apresenta seu equivalente em React Native com exemplos completos em TypeScript.

---

## URLSession / Alamofire → Axios com Interceptors

Axios é a biblioteca de requisições que você encontrará na maioria das codebases React Native. Assim como o Alamofire, ele suporta um pipeline de requisições por meio de interceptors — o lugar certo para anexar headers de autorização e implementar renovação silenciosa de tokens.

### Instância base

```typescript
// src/lib/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { getToken, refreshAccessToken, clearSession } from './auth';

const api: AxiosInstance = axios.create({
  baseURL: 'https://api.example.com/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach bearer token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — silent token refresh
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        queue.forEach((cb) => cb(newToken));
        queue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearSession();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

O padrão espelha o `RequestInterceptor` do Alamofire — uma etapa `adapt` (interceptor de requisição) e uma etapa `retry` (interceptor de resposta). A fila evita múltiplas chamadas simultâneas de renovação, a mesma condição de corrida que você previne no Swift.

---

## Combine Publishers → TanStack Query

No SwiftUI você escreve uma propriedade `@Published` em um `ObservableObject`, combina com `.sink` ou `.receive(on:)`, e a view reage. O TanStack Query substitui esse padrão para estado de servidor: ele gerencia carregamento, erro, cache, refetch em background e stale-while-revalidate sem nenhuma coordenação manual de estado.

### Query key factory

Centralizar query keys é o equivalente React Native de agrupar publishers Combine por domínio. Evita erros de digitação e torna a invalidação previsível.

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  user: {
    all: ['user'] as const,
    profile: (id: string) => ['user', 'profile', id] as const,
    settings: () => ['user', 'settings'] as const,
  },
  posts: {
    all: ['posts'] as const,
    list: (filters: Record<string, unknown>) => ['posts', 'list', filters] as const,
    detail: (id: string) => ['posts', id] as const,
  },
} as const;
```

### useQuery — leitura de dados

```typescript
// src/features/profile/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

interface Profile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

async function fetchProfile(id: string): Promise<Profile> {
  const { data } = await api.get<Profile>(`/users/${id}`);
  return data;
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: queryKeys.user.profile(id),
    queryFn: () => fetchProfile(id),
    staleTime: 5 * 60 * 1000, // 5 minutes — like a Combine publisher with rate limiting
  });
}
```

Em um componente:

```typescript
function ProfileScreen({ userId }: { userId: string }) {
  const { data, isPending, isError, error } = useProfile(userId);

  if (isPending) return <ActivityIndicator />;
  if (isError) return <Text>Error: {error.message}</Text>;

  return <Text>{data.name}</Text>;
}
```

### useMutation — escrita de dados

```typescript
// src/features/profile/useUpdateProfile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

interface UpdateProfileInput {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, ...body }: UpdateProfileInput) => {
      const { data } = await api.patch(`/users/${userId}`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate so the next read fetches fresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.profile(variables.userId),
      });
    },
  });
}
```

---

## CoreData / SwiftData → Estado de Servidor + Zustand

O React Native não possui uma camada de persistência embutida equivalente ao CoreData. A comunidade dividiu o problema em duas partes:

- **Estado de servidor** (dados que residem em um backend): o TanStack Query é responsável por isso. Seu cache é o equivalente em memória de um `NSManagedObjectContext` do CoreData.
- **Estado local do cliente** (estado de UI, preferências do usuário, formulários em rascunho): Zustand ou Context.

Não há uma camada de sincronização offline-first embutida. Se você precisar de persistência com sincronização em background equivalente ao CoreData, bibliotecas como WatermelonDB ou middleware Zustand com suporte a MMKV são o ponto de partida.

---

## UserDefaults → react-native-mmkv

UserDefaults é um armazenamento síncrono de chave-valor baseado em plist. `react-native-mmkv` é o equivalente React Native: mesmo caso de uso, mesma API síncrona, 10 a 30x mais rápido que o AsyncStorage porque usa arquivos mapeados em memória em vez de SQLite.

```typescript
// src/lib/storage.ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'app-storage' });

// Typed helpers
export function setItem<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function getItem<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function removeItem(key: string): void {
  storage.delete(key);
}
```

O MMKV também inclui um hook React para leituras reativas:

```typescript
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/lib/storage';

function ThemeToggle() {
  const [theme, setTheme] = useMMKVString('theme', storage);
  // Re-renders automatically when `theme` changes — like @AppStorage in SwiftUI
  return (
    <Switch
      value={theme === 'dark'}
      onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
    />
  );
}
```

---

## Keychain → expo-secure-store

O Keychain do Swift armazena dados criptografados vinculados ao bundle do aplicativo. `expo-secure-store` encapsula o Keychain da plataforma (iOS) e o Android Keystore com uma API assíncrona consistente.

```typescript
// src/lib/auth.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export async function saveTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh),
  ]);
}

export async function getToken(key: 'accessToken' | 'refreshToken'): Promise<string | null> {
  return SecureStore.getItemAsync(
    key === 'accessToken' ? ACCESS_TOKEN_KEY : REFRESH_TOKEN_KEY,
  );
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
```

O SecureStore é síncrono no lado nativo, mas retorna promises a partir do JS — sempre use `await`.

---

## ObservableObject → Zustand (Padrão de Slices)

Zustand é um container de estado minimalista. Pense nele como um `ObservableObject` leve sem Combine — ele armazena estado, expõe ações, e os componentes se inscrevem exatamente nos slices de que precisam sem re-renderizar para mudanças não relacionadas.

### Store único com slices

```typescript
// src/store/index.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/lib/storage';

// Auth slice
interface AuthSlice {
  isAuthenticated: boolean;
  userId: string | null;
  login: (userId: string) => void;
  logout: () => void;
}

// UI slice
interface UISlice {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

type AppStore = AuthSlice & UISlice;

const createAuthSlice = (set: (fn: (s: AppStore) => Partial<AppStore>) => void): AuthSlice => ({
  isAuthenticated: false,
  userId: null,
  login: (userId) => set(() => ({ isAuthenticated: true, userId })),
  logout: () => set(() => ({ isAuthenticated: false, userId: null })),
});

const createUISlice = (set: (fn: (s: AppStore) => Partial<AppStore>) => void): UISlice => ({
  theme: 'light',
  setTheme: (theme) => set(() => ({ theme })),
});

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...createAuthSlice(set),
      ...createUISlice(set),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      })),
      partialize: (state) => ({ theme: state.theme }), // only persist theme, not auth
    },
  ),
);
```

Os componentes se inscrevem em campos individuais — o Zustand só re-renderiza um componente quando o valor selecionado muda:

```typescript
function Header() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  // Only re-renders when `theme` changes
  return <Button onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />;
}
```

---

## Context vs Zustand

Use Context quando o valor é estável e raramente muda — um objeto de tema, uma instância de roteador, um conjunto de feature flags carregado uma vez na inicialização. O Context re-renderiza todos os consumidores a qualquer mudança em seu valor, portanto atualizações de alta frequência causam renderizações desnecessárias.

Use Zustand para tudo que muda em tempo de execução: estado de autenticação, carrinho de compras, flags de UI, rascunhos de formulário. O modelo de subscrição baseado em seletores do Zustand faz com que os componentes só re-renderizem quando o slice específico deles muda.

| Critério | Context | Zustand |
|---|---|---|
| Frequência de atualização | Baixa (tema, locale) | Qualquer |
| Granularidade do consumidor | Todos os consumidores re-renderizam | Subscrições por seletor |
| Middleware (persist, devtools) | Nenhum embutido | Embutido |
| Boilerplate | Requer envolvimento com Provider | Nenhum |
| DevTools | Nao | Compativel com Redux DevTools |

---

## Swift async/await → JS async/await com TanStack Query

A sintaxe é identica. A diferenca operacional esta em onde voce chama o codigo assíncrono.

No Swift voce poderia escrever:

```swift
func loadUser(id: String) async throws -> User {
    let url = URL(string: "https://api.example.com/users/\(id)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}
```

Em TypeScript:

```typescript
async function loadUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}
```

A diferença esta em onde essa função e chamada. No SwiftUI voce usa `.task {}` ou `Task { }`. No React Native voce passa a função para o `queryFn` do TanStack Query e deixa a biblioteca gerenciar o ciclo de vida — cancelamento, retry, refetch em background, invalidação de cache.

Chamar código assíncrono diretamente dentro de um componente com `useEffect` é o equivalente a chamar `Task { }` sem nenhum gerenciamento de ciclo de vida estruturado. Prefira `useQuery` para leituras e `useMutation` para escritas.

---

## Error Boundaries vs Swift Result Type

O `Result<Success, Failure>` do Swift torna os erros explícitos no nível de tipos. O JavaScript não tem equivalente — erros se propagam como exceções lançadas. O TanStack Query os expoe por meio das propriedades `isError` / `error` de cada query, o que cobre erros de rede de forma limpa.

Para erros inesperados de renderização (exceções JS não tratadas durante a renderização), o React fornece error boundaries — um componente de classe que captura erros lançados pela sua subárvore:

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, Button } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to Sentry or similar
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <View>
          <Text>Something went wrong.</Text>
          <Button title="Retry" onPress={() => this.setState({ hasError: false, error: null })} />
        </View>
      );
    }
    return this.props.children;
  }
}
```

Use error boundaries nas fronteiras de telas de navegação para que uma falha em uma tela não derrube o aplicativo inteiro.

---

## Atualizações Otimistas

Atualizações otimistas no Swift exigem gerenciamento manual de estado — voce atualiza o modelo local imediatamente e reverte se a chamada de rede falhar. O TanStack Query gerencia isso com os callbacks `onMutate`, `onError` e `onSettled`:

```typescript
// src/features/posts/useLikePost.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

interface Post {
  id: string;
  likeCount: number;
  likedByMe: boolean;
}

export function useLikePost(postId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.posts.detail(postId);

  return useMutation({
    mutationFn: () => api.post(`/posts/${postId}/like`),

    onMutate: async () => {
      // Cancel any in-flight refetches for this post
      await queryClient.cancelQueries({ queryKey: key });

      // Snapshot the previous value for rollback
      const previous = queryClient.getQueryData<Post>(key);

      // Optimistically update the cache
      queryClient.setQueryData<Post>(key, (old) =>
        old
          ? { ...old, likeCount: old.likeCount + 1, likedByMe: true }
          : old,
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Roll back to the snapshot
      if (context?.previous) {
        queryClient.setQueryData<Post>(key, context.previous);
      }
    },

    onSettled: () => {
      // Always refetch after mutation completes or errors
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
```

O padrão de tres callbacks (mutate → atualização otimista, error → reversão, settled → reconciliação) e o idioma padrão. Ele se mapeia diretamente ao padrão manual que voce escreveria com os operadores `handleEvents` e `catch` do Combine, mas a biblioteca gerencia a consistência do cache por voce.

---

## Juntando Tudo

Um módulo de feature completo tem esta aparência:

```
src/features/posts/
  queryKeys.ts        ← domain-scoped keys (re-exported from global queryKeys)
  usePosts.ts         ← useQuery for list
  usePost.ts          ← useQuery for detail
  useCreatePost.ts    ← useMutation
  useLikePost.ts      ← useMutation with optimistic update
  postsStore.ts       ← Zustand slice for local draft state
```

O networking fica em `src/lib/api.ts` (instância Axios com interceptors), os segredos no `expo-secure-store`, as preferências leves no MMKV e o estado de servidor no cache do TanStack Query. O Zustand gerencia apenas o estado de UI que não tem equivalente no servidor.

Essa separação espelha a estruturação limpa que voce obtem da combinação Swift de URLSession, Combine, CoreData e UserDefaults — cada ferramenta tem uma responsabilidade claramente delimitada, e elas se compõem sem acoplamento.
