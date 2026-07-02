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

{% raw %}
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
{% endraw %}

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

#### React Redux Toolkit Tutorial For Beginners — CRUD
[Assistir no YouTube](https://www.youtube.com/watch?v=QgK_-G-hWeA)

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
