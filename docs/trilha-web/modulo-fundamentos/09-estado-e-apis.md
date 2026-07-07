---
id: estado-e-apis-web
title: "Estado Global & APIs"
sidebar_label: "Estado Global & APIs"
sidebar_position: 9
---

# Estado Global & APIs

---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_web_09_estado-e-api-en.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## O que muda da web para o mobile

A lógica de estado que você já conhece do React funciona em React Native — `useState`, `useReducer`, Context, stores globais são os mesmos. O que muda é o **ambiente** em que esse estado vive:

| Conceito web | Realidade mobile | Por quê muda |
|---|---|---|
| `localStorage` | Storage nativo do dispositivo | Não existe `window` nem DOM Storage |
| `sessionStorage` | Estado em memória (sem persist) | Sem conceito de sessão de aba |
| Cache HTTP do browser | Cache explícito da camada de dados | O browser não faz cache automático por você |
| Conexão sempre estável | Rede instável, offline frequente | Usuário entra no metrô, perde sinal |
| `visibilitychange` (foco de janela) | Foco de tela (`useFocusEffect`) | O evento de "voltei para esta tela" é diferente |
| `window.navigator.onLine` | API nativa de conectividade | Sem `window`, API diferente |

---

## Client state vs Server state

Esta é a divisão mais importante — e vale tanto na web quanto no mobile, mas o mobile torna ela mais urgente por causa da rede instável:

| | Client state | Server state |
|---|---|---|
| **O que é** | Estado que vive na memória do app | Dados que vêm de uma API |
| **Fonte da verdade** | O próprio app | O servidor |
| **Exemplos** | tema, carrinho, modal aberto | lista de produtos, perfil, pedidos |
| **Problema principal** | sincronizar entre telas | cache, refetch, stale data, offline |

Na web você provavelmente já faz essa separação. No mobile, ela é ainda mais importante porque o custo de um fetch desnecessário é maior (bateria, dados móveis, latência).

---

## Estado local: sem mudanças

`useState` e `useReducer` funcionam identicamente — nenhuma adaptação necessária.

```tsx
const [isLoading, setIsLoading] = useState(false);
const [form, setForm] = useReducer(formReducer, initialFormState);
```

---

## Context API: mesmas regras, mesmas limitações

A Context API funciona igual à web. As limitações também são as mesmas — Context não é adequada para estado que muda frequentemente, porque qualquer mudança re-renderiza todos os consumers.

No mobile use Context para o mesmo que na web: tema, i18n, sessão de autenticação. Para listas de dados ou estado de UI que muda com frequência, prefira um store global ou a camada de dados.


```tsx
// O padrão é idêntico ao da web
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, token: null });
  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}
```


---

## Estado global com Zustand

Para client state que precisa ser compartilhado entre telas sem prop drilling, Zustand é a opção mais direta — a mesma que você usaria na web. A API é idêntica: sem Provider, sem boilerplate.

```bash
npm install zustand
```

```tsx
import { create } from 'zustand';

type CartStore = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  clearCart: () => set({ items: [] }),
}));
```

```tsx
// Em qualquer componente, em qualquer tela — sem Provider
const { items, addItem } = useCartStore();
```

Para persistir o store entre restarts do app, use o middleware `persist` com MMKV como storage:

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV();

const mmkvStorage = {
  getItem: (key: string) => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string) => mmkv.set(key, value),
  removeItem: (key: string) => mmkv.delete(key),
};

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'cart', storage: createJSONStorage(() => mmkvStorage) }
  )
);
```

---

## Persistência local: sem localStorage

No browser, `localStorage` é uma API do DOM — não existe no mobile. O equivalente é um storage nativo do dispositivo, acessado por uma lib JavaScript.

O conceito é o mesmo: armazenar pares chave-valor entre sessões. A diferença mais importante é que o storage nativo recomendado (**MMKV**) tem API **síncrona** — sem `await`, sem callbacks:

```tsx
// Web
localStorage.setItem('token', 'abc123');
const token = localStorage.getItem('token');

// React Native (MMKV)
storage.set('token', 'abc123');
const token = storage.getString('token'); // síncrono — sem await
```

Isso simplifica muito o código que precisa ler dados no momento da inicialização ou dentro de funções não-assíncronas.

O store global (Zustand, Redux) pode usar esse storage como backend de persistência, fazendo com que o estado sobreviva a restarts do app — o equivalente ao `redux-persist` da web, mas com storage nativo.

> **AsyncStorage vs MMKV:** você vai encontrar `@react-native-async-storage/async-storage` em muitos tutoriais e libs da comunidade — é a opção padrão mais antiga, com API assíncrona (baseada em Promises). MMKV é mais rápido e síncrono, sendo a escolha recomendada para projetos novos. Ao integrar libs de terceiros (ex: alguns clientes Apollo, libs de autenticação), verifique qual storage elas esperam receber.

---

## Busca de dados: o foco da tela substitui o foco da janela

Na web, `refetchOnWindowFocus` do TanStack Query / React Query revalida dados quando o usuário volta para a aba. No mobile, não há abas — há telas.

O conceito equivalente é `useFocusEffect` do React Navigation: roda quando a tela recebe foco, incluindo quando o usuário navega de volta para ela.

```tsx
// Web — refetch automático ao focar a janela (configuração padrão)
const { data } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

// Mobile — refetch ao focar a tela (substituição do comportamento de janela)
const query = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

useFocusEffect(
  useCallback(() => { query.refetch(); }, [])
);
```

Também é necessário conectar o `AppState` do React Native ao gerenciador de foco da camada de dados, para que queries sejam revalidadas quando o app volta ao primeiro plano (equivalente ao `visibilitychange` do browser):

```tsx
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});
```

---

## Mutations: escrevendo dados e invalidando cache

`useQuery` lida com leitura; `useMutation` lida com escrita (POST, PATCH, DELETE). O padrão é o mesmo da web — a diferença relevante no mobile é que, após uma mutation bem-sucedida, você invalida a query correspondente para forçar o refetch e manter a tela sincronizada.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newProduct: NewProduct) =>
      fetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(newProduct),
      }).then((r) => r.json()),

    onSuccess: () => {
      // Invalida o cache da lista — próximo foco da tela busca dados atualizados
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

```tsx
// No componente
const { mutate, isPending } = useCreateProduct();

<Button
  title={isPending ? 'Salvando...' : 'Salvar'}
  onPress={() => mutate({ name: 'Tênis', price: 299 })}
/>
```

O fluxo `mutate → onSuccess → invalidateQueries` é o padrão mais comum em produção: garante que a lista sempre reflita o estado do servidor após qualquer escrita, sem acrobacia de estado local.

---

## Offline-first: o maior gap com a web

Na web, você assume conexão. No mobile, você assume que a conexão vai cair — e o app precisa continuar funcionando.

O padrão offline-first inverte a lógica:
1. Tela carrega dados do **cache local** imediatamente — sem esperar a rede
2. Fetch acontece em background para atualizar o cache
3. Se offline, o cache é exibido sem erro

```tsx
const { data, isFetching } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 5 * 60 * 1000,        // cache fresco por 5 min
  gcTime: 24 * 60 * 60 * 1000,     // manter no cache por 24h
});
// data vem do cache enquanto isFetching === true em background
```

Para pausar fetches quando o dispositivo está offline:

```tsx
// A camada de dados respeita a conectividade automaticamente
NetInfo.addEventListener(state => {
  onlineManager.setOnline(state.isConnected ?? true);
});
```

---

## Arquitetura recomendada

A mesma separação client/server state que funciona na web:

```
src/
├── stores/     # Client state — auth, tema, preferências de UI
├── hooks/      # Server state — queries e mutations por domínio
├── services/   # Funções de fetch puras (sem lógica React)
└── lib/
    └── storage.ts  # Instância do storage nativo
```

---

## Exercício prático

1. Liste os dados do seu último projeto web: quais são **client state** e quais são **server state**? Essa separação já estava clara no código?
2. Identifique um caso onde `refetchOnWindowFocus` era importante no projeto. Como você replicaria esse comportamento no mobile com `useFocusEffect`?
3. Pense em como o app deve se comportar quando o usuário perde conexão no meio de uma listagem. O que o usuário deve ver? Como o cache resolve isso?

---

## Materiais de estudo

| Recurso | Tipo | Link |
|---------|------|------|
| Zustand + TanStack Query: RN Guide 2026 | Artigo | [React Native Relay](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query) |
| State Management in React 2026 | Artigo | [Zignuts](https://www.zignuts.com/blog/react-state-management-2025) |
| How to Handle State Management in React Native | Artigo | [OneUptime](https://oneuptime.com/blog/post/2026-02-02-react-native-state-management/view) |
| Offline-First Architecture in React Native | Artigo | [OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-offline-architecture/view) |
| How to Persist State with AsyncStorage and MMKV | Artigo | [OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view) |
| TanStack Query para React Native | Docs Oficiais | [tanstack.com](https://tanstack.com/query/v5/docs/framework/react/react-native) |
| MMKV vs AsyncStorage in React Native | Artigo | [reactnativeexpert.com](https://reactnativeexpert.com/blog/mmkv-vs-asyncstorage-in-react-native/) |
| react-native-mmkv | GitHub | [mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) |
