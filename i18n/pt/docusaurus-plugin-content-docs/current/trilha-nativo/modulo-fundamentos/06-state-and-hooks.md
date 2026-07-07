---
title: Estado & Hooks em Profundidade
---

# Estado & Hooks em Profundidade

> Hooks são como componentes funcionais React gerenciam estado, efeitos colaterais, performance e lógica compartilhada. Eles substituem os métodos de ciclo de vida de classes e ViewModels.

## Regras dos Hooks

Antes de tudo — hooks têm duas regras rígidas:

1. **Chame hooks apenas no nível superior** — não dentro de loops, condicionais ou funções aninhadas
2. **Chame hooks apenas de componentes React** (ou de outros hooks)

```tsx
// ERRADO
function MyComponent({ show }: { show: boolean }) {
    if (show) {
        const [value, setValue] = useState(0); // ERRO — hook condicional
    }
}

// CORRETO
function MyComponent({ show }: { show: boolean }) {
    const [value, setValue] = useState(0); // sempre no nível superior
    if (!show) return null;
    return <Text>{value}</Text>;
}
```

---

## `useState` — Estado Reativo

```tsx
// Valor simples
const [count, setCount] = useState(0);

// Estado como objeto
const [form, setForm] = useState({ email: '', password: '' });
// Atualiza um campo de forma imutável
const updateEmail = (email: string) => setForm(prev => ({ ...prev, email }));

// Atualização funcional (quando o novo estado depende do anterior)
const increment = () => setCount(prev => prev + 1);
// Use a forma funcional quando o novo valor depende do antigo
// — evita bugs de closure desatualizada em código assíncrono
```

---

## `useEffect` — Efeitos Colaterais

Abordado em Fundamentos do React. Padrões principais:

```tsx
// Busca de dados na montagem
useEffect(() => {
    fetchData().then(setData);
}, []);

// Subscription com limpeza
useEffect(() => {
    const subscription = eventEmitter.addListener('event', handler);
    return () => subscription.remove(); // limpeza na desmontagem
}, []);

// Efeito derivado quando um valor muda (ex.: atualizar título do header de navegação)
useEffect(() => {
    navigation.setOptions({ title: `Contagem: ${count}` });
}, [count]);
```

---

## `useReducer` — Lógica de Estado Complexa

Quando as transições de estado ficam complexas — múltiplos valores relacionados, estado que depende do anterior, ou muitas ações diferentes — `useReducer` é mais limpo do que vários `useState`.

```tsx
import { useReducer } from 'react';

// Define o formato do estado e todas as ações possíveis
interface AuthState {
    status: 'idle' | 'loading' | 'success' | 'error';
    user: User | null;
    error: string | null;
}

type AuthAction =
    | { type: 'LOGIN_START' }
    | { type: 'LOGIN_SUCCESS'; user: User }
    | { type: 'LOGIN_ERROR'; message: string }
    | { type: 'LOGOUT' };

// Função reducer pura — mesmo conceito do MVI do Android ou Redux
function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'LOGIN_START':
            return { ...state, status: 'loading', error: null };
        case 'LOGIN_SUCCESS':
            return { status: 'success', user: action.user, error: null };
        case 'LOGIN_ERROR':
            return { ...state, status: 'error', error: action.message };
        case 'LOGOUT':
            return { status: 'idle', user: null, error: null };
    }
}

const initialState: AuthState = { status: 'idle', user: null, error: null };

function LoginScreen() {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const handleLogin = async (email: string, password: string) => {
        dispatch({ type: 'LOGIN_START' });
        try {
            const user = await login(email, password);
            dispatch({ type: 'LOGIN_SUCCESS', user });
        } catch (e) {
            dispatch({ type: 'LOGIN_ERROR', message: (e as Error).message });
        }
    };

    if (state.status === 'loading') return <ActivityIndicator />;
    if (state.status === 'error') return <Text>{state.error}</Text>;
    return <Button title="Login" onPress={() => handleLogin('a@b.com', 'pw')} />;
}
```

**Paralelos nativos:**

| Nativo | `useReducer` |
|--------|-------------|
| Android MVI `reduce(state, intent)` | `authReducer(state, action)` |
| Swift Composable Architecture `Reducer` | Mesmo padrão, nomenclatura diferente |
| Redux reducer | Conceito idêntico |

**`useState` vs `useReducer`:**

- Use `useState` para valores simples independentes
- Use `useReducer` quando múltiplos campos de estado mudam juntos ou quando as transições precisam ser explícitas e testáveis

---

## `useRef` — Valores Mutáveis Sem Re-renderização

`useRef` é como um contêiner mutável que sobrevive às renderizações sem acionar uma. Pense nele como uma variável de instância em um `remember` do Compose — persiste entre recomposições mas não causa uma ao mudar.

```tsx
import { useRef, useEffect } from 'react';
import { TextInput } from 'react-native';

function SearchBar() {
    // Ref para um nó DOM/nativo — como findViewById no Android
    const inputRef = useRef<TextInput>(null);

    // Ref para um valor mutável (como uma variável de instância)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Auto-focus na montagem — como input.requestFocus() no Android
        inputRef.current?.focus();
    }, []);

    const handleChange = (text: string) => {
        // Debounce sem acionar re-renderização a cada tecla
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            performSearch(text);
        }, 300);
    };

    return <TextInput ref={inputRef} onChangeText={handleChange} />;
}
```

---

## `useMemo` — Computações Custosas

`useMemo` armazena em cache um valor computado. Recomputa apenas quando as dependências mudam. Como `remember(key) { ... }` do Compose:

```tsx
import { useMemo } from 'react';

function ProductList({ products, filterText }: Props) {
    // Recomputa apenas quando products ou filterText muda
    const filteredProducts = useMemo(() => {
        return products
            .filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()))
            .sort((a, b) => a.price - b.price);
    }, [products, filterText]);

    return <FlatList data={filteredProducts} renderItem={...} />;
}
```

Não otimize em excesso com `useMemo` — use apenas para operações genuinamente custosas.

---

## `useCallback` — Referências de Função Estáveis

`useCallback` memoiza uma função. Evita que componentes filhos re-renderizem desnecessariamente quando um callback não mudou de fato:

```tsx
import { useCallback } from 'react';

function ParentList() {
    const [items, setItems] = useState(['a', 'b', 'c']);

    // Sem useCallback: nova referência de função a cada render
    // → renderItem da FlatList re-renderizaria cada linha
    const handleDelete = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item !== id));
    }, []); // deps vazias — a função nunca muda

    return (
        <FlatList
            data={items}
            keyExtractor={item => item}
            renderItem={({ item }) => (
                <ItemRow item={item} onDelete={handleDelete} />
            )}
        />
    );
}
```

---

## Custom Hooks — Lógica Reutilizável

Você pode extrair lógica com estado em seus próprios hooks. Convenção de nomenclatura: **deve começar com `use`**.

```tsx
// Hook parecido com useLocalStorage para React Native (usando AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

function usePersistedState<T>(key: string, initialValue: T) {
    const [value, setValue] = useState<T>(initialValue);

    useEffect(() => {
        AsyncStorage.getItem(key).then(stored => {
            if (stored !== null) {
                try {
                    setValue(JSON.parse(stored));
                } catch {
                    // storage corrompido — descarta e mantém valor inicial
                    AsyncStorage.removeItem(key);
                }
            }
        });
    }, [key]);

    const setPersistedValue = (newValue: T) => {
        setValue(newValue);
        AsyncStorage.setItem(key, JSON.stringify(newValue));
    };

    return [value, setPersistedValue] as const;
}

// Uso — igual ao useState, mas persistido entre reinicializações do app
function SettingsScreen() {
    const [isDark, setIsDark] = usePersistedState('theme', false);
    return <Switch value={isDark} onValueChange={setIsDark} />;
}
```

Custom hooks são o equivalente a uma função de extensão Kotlin em um ViewModel, ou um view modifier do SwiftUI — lógica reutilizável que qualquer componente pode plugar.

---

## Tabela Comparativa de Hooks

| Hook | Equivalente Nativo | Quando Usar |
|------|------------------|-------------|
| `useState` | `mutableStateOf` / `@State` | Qualquer valor reativo |
| `useEffect` | `LaunchedEffect` / `onAppear` + `onDisappear` | Efeitos colaterais, subscriptions, busca de dados |
| `useRef` | Variável de instância / `remember { ... }` sem `State` | Valores mutáveis não-reativos, refs de nós nativos |
| `useMemo` | `remember(key) { ... }` | Valores derivados custosos |
| `useCallback` | N/A (Compose usa lambdas estáveis) | Referências de função estáveis para componentes filhos |
| `useContext` | `CompositionLocal` / `@EnvironmentObject` | Dados transversais (tema, auth, locale) |
| Custom hook | Extensão em ViewModel / ViewModifier | Lógica com estado reutilizável |

---

## Exercícios

1. **Construa um hook `useDebounce`** que recebe um valor e um delay, e retorna o valor com debounce (só atualiza após o delay passar sem outra mudança).

2. **Construa um hook `useFetch<T>`** que recebe uma URL e retorna `{ data: T | null, loading: boolean, error: string | null }`.

3. **Identifique o bug** neste código e corrija:
   ```tsx
   function Timer() {
       const [seconds, setSeconds] = useState(0);
       useEffect(() => {
           const interval = setInterval(() => {
               setSeconds(seconds + 1); // bug aqui
           }, 1000);
           return () => clearInterval(interval);
       }, []);
       return <Text>{seconds}</Text>;
   }
   ```

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| react.dev — Referência de Hooks | Docs Oficiais | [react.dev/reference/react](https://react.dev/reference/react) |
| react.dev — Escape Hatches (useRef, useEffect) | Docs Oficiais | [react.dev/learn/escape-hatches](https://react.dev/learn/escape-hatches) |
| usehooks.com | Community Hooks | [usehooks.com](https://usehooks.com/) |

---

Próximo → **[Componentes Core do React Native](./rn-core-components)**
