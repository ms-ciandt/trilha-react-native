---
id: estado-e-apis-nativo
title: "Estado & APIs"
sidebar_label: "Estado & APIs"
sidebar_position: 11
---

# Estado & APIs

---

## Mapeamento: Android/iOS → React/RN

| Nativo | React Native | Observação |
|--------|-------------|------------|
| `@State` / `mutableStateOf` | `useState` | Estado local do componente |
| `ViewModel` + `LiveData` / `@StateObject` | Store reativo (Zustand, Redux) | Store global, sem prop drilling |
| `SharedPreferences` / `UserDefaults` | Storage chave-valor (MMKV) | MMKV é síncrono, criptografado |
| `Retrofit` / `URLSession` + Repository | Camada de dados com cache (TanStack Query) | Cache, retry e estados automáticos |
| `Room` / `CoreData` | Storage estruturado (WatermelonDB) | Para dados relacionais complexos |

---

## Estado local: componente é dono dos dados

O equivalente direto de `@State` (SwiftUI) ou `mutableStateOf` (Compose) é `useState`. O estado vive dentro do componente e provoca re-render quando muda — o mesmo modelo mental.

```tsx
const [isLoading, setIsLoading] = useState(false);
const [user, setUser] = useState<User | null>(null);
```

Para lógica mais complexa — múltiplos campos que mudam juntos, transições de estado explícitas — use `useReducer`. É conceitualmente idêntico a um `ViewModel` que recebe eventos (`Action`) e produz um novo estado:

```tsx
type State = { status: 'idle' | 'loading' | 'success' | 'error'; data: User | null };
type Action = { type: 'FETCH_START' } | { type: 'FETCH_SUCCESS'; payload: User } | { type: 'FETCH_ERROR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':   return { status: 'loading', data: null };
    case 'FETCH_SUCCESS': return { status: 'success', data: action.payload };
    case 'FETCH_ERROR':   return { status: 'error', data: null };
    default: return state;
  }
}

const [state, dispatch] = useReducer(reducer, { status: 'idle', data: null });
```

**Diferença importante:** no React, estado é imutável. Você nunca muta o objeto diretamente — sempre cria um novo. `setUser({ ...user, name: 'João' })` em vez de `user.name = 'João'`.

---

## Client state vs Server state

Esta é a divisão de conceito mais importante no ecossistema React — e que não existe explicitamente no nativo:

| | Client state | Server state |
|---|---|---|
| **O que é** | Estado que vive na memória do app | Dados que vêm do servidor |
| **Quem controla** | O próprio app | O servidor é a fonte da verdade |
| **Exemplos** | tema, sessão do usuário, carrinho | lista de produtos, perfil, pedidos |
| **Problema principal** | sincronizar entre componentes | cache, refetch, stale data, loading |
| **Ferramenta típica** | Zustand, Redux, Context | TanStack Query, SWR |

No nativo, o `ViewModel` normalmente cuida dos dois ao mesmo tempo. No React, separá-los explicitamente reduz muito a complexidade — cada camada lida apenas com o problema que sabe resolver.

---

## Estado global: store reativo

Quando múltiplas telas precisam do mesmo dado (ex.: sessão de autenticação), você precisa de um store compartilhado — o equivalente a um `ViewModel` no escopo do app inteiro.

O conceito é sempre o mesmo, independente da biblioteca:
1. Um objeto JavaScript centralizado guarda o estado
2. Funções do store atualizam esse estado
3. Qualquer componente pode ler e reagir a mudanças sem prop drilling

```tsx
// Conceito: um store de autenticação
const authStore = {
  token: null,
  user: null,
  setAuth(token, user) { /* atualiza e notifica subscribers */ },
  logout()           { /* limpa e notifica subscribers */ },
};

// Qualquer componente lê diretamente — sem passar props pela árvore
const { user, logout } = useAuthStore();
```

**Zustand** é a opção mais leve (2KB, sem providers obrigatórios) e adequada para a maioria dos apps. **Redux Toolkit** faz mais sentido em times grandes que precisam de rastreabilidade total de mudanças e ferramentas de debug avançadas.

---

## Persistência local: storage chave-valor

O equivalente de `SharedPreferences` (Android) ou `UserDefaults` (iOS) no React Native é um storage chave-valor em JavaScript.

O conceito é o mesmo: persistir pequenas quantidades de dados entre sessões — token de autenticação, preferências, tema.

```tsx
// Gravar
storage.set('token', 'abc123');

// Ler
const token = storage.getString('token');

// Remover
storage.delete('token');
```

**MMKV** é a opção recomendada para produção: API síncrona (sem `async/await`), criptografia AES embutida e ~30x mais rápido que `AsyncStorage`. O ponto-chave é que a API **síncrona** é uma vantagem real — você lê o token no momento em que precisa, sem callbacks ou promises.

O store de estado global (Zustand, Redux) pode usar esse storage como backend de persistência, fazendo com que o estado sobreviva a restarts do app automaticamente.

---

## Busca de dados: cache e estados automáticos

No nativo, o padrão Repository + `Retrofit`/`URLSession` resolve o fetch mas deixa para você gerenciar: loading state, error state, cache, retry, invalidação. No React Native, uma camada de dados como **TanStack Query** centraliza tudo isso.

O conceito central é: **a query é reativa**. Você descreve o que quer buscar e a biblioteca cuida do ciclo de vida.

```tsx
// Descreva o que quer — a biblioteca cuida do resto
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],          // chave de cache — igual ao cache key de Retrofit
  queryFn: fetchProducts,          // função que faz o fetch
  staleTime: 5 * 60 * 1000,       // por quanto tempo o cache é considerado fresco
});
```

Isso substitui o padrão manual de:
```kotlin
// Android — o que você faria manualmente
viewModel.state.observe(this) { state ->
    when (state) {
        is Loading -> showSpinner()
        is Success -> showData(state.data)
        is Error   -> showError(state.message)
    }
}
```

**Integração com React Navigation:** use `useFocusEffect` para refazer fetch ao voltar para uma tela, replicando o comportamento do `onResume` do Android:

```tsx
useFocusEffect(
  useCallback(() => { query.refetch(); }, [])
);
```

---

## Arquitetura recomendada

A separação client state / server state resulta em uma estrutura clara:

```
src/
├── stores/          # Client state — Zustand: auth, tema, preferências de UI
├── hooks/           # Server state — TanStack Query: dados do servidor
├── services/        # Funções de fetch puras (sem lógica React)
└── lib/
    └── storage.ts   # Instância do storage (MMKV)
```

Essa separação é o equivalente ao padrão **ViewModel + Repository** do nativo — cada camada tem uma responsabilidade única e testável.

---

## Exercício prático

1. Identifique em um app que você já construiu nativamente quais dados são **client state** e quais são **server state** — qual seria a divisão no modelo React?
2. Modele um store de autenticação: quais campos ele precisa ter? Quais ações ele expõe? Esboce o tipo TypeScript antes de escrever qualquer implementação
3. Pense em como o cache de uma lista de produtos deve se comportar: quando deve ser considerado "stale"? O que deve disparar um refetch? Compare com como você faria isso com Retrofit + Room no Android

---

## Materiais de estudo

| Recurso | Tipo | Link |
|---------|------|------|
| Como Gerenciar Estado no React Native | Artigo | [OneUptime](https://oneuptime.com/blog/post/2026-02-02-react-native-state-management/view) |
| Zustand + TanStack Query: Guia RN 2026 | Artigo | [React Native Relay](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query) |
| Comparativo: Redux vs Context vs Zustand | Artigo | [Java Code Geeks](https://www.javacodegeeks.com/2025/09/react-state-management-showdown-redux-vs-context-api-vs-zustand.html) |
| Como Persistir Estado com AsyncStorage e MMKV | Artigo | [OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view) |
| TanStack Query para React Native | Docs Oficiais | [tanstack.com](https://tanstack.com/query/v5/docs/framework/react/react-native) |
| react-native-mmkv | GitHub | [mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) |
