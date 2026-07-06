---
id: estado-e-apis-web
title: "Estado Global & APIs"
sidebar_label: "Estado Global & APIs"
sidebar_position: 9
---

# Estado Global & APIs

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
