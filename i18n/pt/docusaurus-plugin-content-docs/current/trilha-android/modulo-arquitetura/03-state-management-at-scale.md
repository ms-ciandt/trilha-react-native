---
title: "Estado em Escala"
sidebar_label: "Estado em Escala"
sidebar_position: 3
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## Duas Categorias de Estado — Sempre

| Categoria | Definição | Ferramenta |
|-----------|-----------|-----------|
| **Estado de servidor** | Dados que vivem em um servidor — buscados, cacheados, sincronizados | TanStack Query |
| **Estado do cliente** | Dados que vivem só no app — preferências, carrinho, sessão auth | Zustand |

---

## Zustand em Escala: Padrão de Slices

```typescript
// store/slices/authSlice.ts
export interface AuthSlice {
  user: User | null;
  token: string | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice & CartSlice, [], [], AuthSlice> =
  (set, get) => ({
    user: null,
    token: null,

    login: async (credentials) => {
      const { user, token } = await authApi.login(credentials);
      set({ user, token });
      mmkv.set('auth.token', token);
    },

    logout: () => {
      set({ user: null, token: null });
      mmkv.delete('auth.token');
      get().clearCart();
    },
  });
```

```typescript
// store/index.ts — combinar slices
export const useStore = create<AuthSlice & CartSlice>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createCartSlice(...args),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ token: state.token, items: state.items }),
    }
  )
);

// Selectors por feature
export const useAuth = () => useStore(s => ({ user: s.user, login: s.login, logout: s.logout }));
export const useCart = () => useStore(s => ({ items: s.items, total: s.total, addItem: s.addItem }));
```

---

## TanStack Query em Escala: Query Key Factory

```typescript
// queryKeys.ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    byId: (id: string) => ['users', id] as const,
  },
  products: {
    all: ['products'] as const,
    byCategory: (cat: string) => ['products', cat] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
} as const;

// Uso — tipado, sem erros de digitação
useQuery({ queryKey: queryKeys.users.byId(userId), queryFn: ... });
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
```

---

## Atualizações Otimistas

```typescript
function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productApi.delete(id),

    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.all });
      const previous = queryClient.getQueryData(queryKeys.products.all);

      // Remove otimisticamente do cache
      queryClient.setQueryData(queryKeys.products.all, (old: Product[] = []) =>
        old.filter(p => p.id !== deletedId)
      );

      return { previous };
    },

    onError: (err, _, context) => {
      queryClient.setQueryData(queryKeys.products.all, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
```

---

## Materiais de Estudo

- [Zustand — Padrão de Slices](https://zustand.docs.pmnd.rs/guides/slices-pattern)
- [TanStack Query — Atualizações Otimistas](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)

---

## Próximo Passo

➡ [Tratamento de Erros e Monitoramento](./04-error-handling-monitoring)
