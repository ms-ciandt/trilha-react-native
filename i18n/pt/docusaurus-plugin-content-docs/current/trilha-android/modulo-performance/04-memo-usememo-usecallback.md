---
title: "Otimização de Re-renders: memo, useMemo, useCallback"
sidebar_label: "Otimização de Re-renders"
sidebar_position: 4
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/perf_04_memo.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/perf_04_memo.vtt" srclang="pt" label="Português" default>
  Seu navegador não suporta o elemento de vídeo.
</video>

## O Problema: Tudo Re-renderiza por Padrão

No Jetpack Compose, a recomposição inteligente é **automática** — o compilador rastreia quais composables leem qual estado e pula os que não mudaram. O React faz o oposto: por padrão, **todo componente re-renderiza quando seu pai re-renderiza**, independente de suas props terem mudado.

Esta é a diferença de performance mais importante entre Compose e React que você precisa internalizar.

```tsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Pressable onPress={() => setCount(c => c + 1)}>
        <Text>Count: {count}</Text>
      </Pressable>
      {/* Re-renderiza a CADA mudança de count — mesmo que title nunca mude */}
      <ExpensiveChild title="Static Title" />
    </View>
  );
}
```

Toda vez que `count` muda, `ExpensiveChild` re-renderiza — mesmo que `title` seja sempre `"Static Title"`. No Compose, o compilador pularia `ExpensiveChild` automaticamente. No React, você precisa optar explicitamente.

---

## memo — O Skip Manual do Compose

`memo` envolve um componente e pula a re-renderização se suas props forem superficialmente iguais ao render anterior.

```tsx
import { memo } from 'react';

// Sem memo: re-renderiza sempre que o Parent re-renderiza
function ExpensiveChild({ title }: { title: string }) {
  return <Text>{title}</Text>;
}

// Com memo: só re-renderiza quando title realmente muda
const ExpensiveChild = memo(function ExpensiveChild({ title }: { title: string }) {
  return <Text>{title}</Text>;
});
```

### Quando memo funciona

```tsx
// Props são primitivos — igualdade superficial funciona
<ExpensiveChild title="Hello" count={5} active={true} />
// Re-renderiza apenas se title, count ou active mudarem ✓
```

### Quando memo não funciona

```tsx
// Props incluem objetos ou arrays criados inline — nova referência a cada render
function Parent() {
  return (
    // RUIM: novo array a cada render → memo nunca pula
    <ExpensiveChild items={[1, 2, 3]} />
  );
}

// CORRETO: referência estável com useMemo
function Parent() {
  const items = useMemo(() => [1, 2, 3], []);
  return <ExpensiveChild items={items} />;
}
```

```tsx
// Props incluem funções — nova referência a cada render
function Parent() {
  return (
    // RUIM: nova função a cada render → memo nunca pula
    <ExpensiveChild onPress={() => console.log('pressed')} />
  );
}

// CORRETO: referência estável com useCallback
function Parent() {
  const handlePress = useCallback(() => console.log('pressed'), []);
  return <ExpensiveChild onPress={handlePress} />;
}
```

---

## useMemo — Cache de Computações Custosas

```tsx
import { useMemo } from 'react';

function ProductList({ products, category, sortBy }: Props) {
  // Sem useMemo: executa a cada render — mesmo quando products não mudou
  const filtered = products
    .filter(p => p.category === category)
    .sort((a, b) => a[sortBy] > b[sortBy] ? 1 : -1);

  // Com useMemo: só recomputa quando products, category ou sortBy mudam
  const filtered = useMemo(
    () => products
      .filter(p => p.category === category)
      .sort((a, b) => a[sortBy] > b[sortBy] ? 1 : -1),
    [products, category, sortBy]
  );

  return <FlatList data={filtered} />;
}
```

### Quando usar useMemo

Use quando:
- A computação é visivelmente lenta (> 1ms — profile primeiro)
- O resultado é usado como prop de um componente encapsulado com `memo()`
- O resultado é dependência de outro `useMemo` ou `useCallback`

**Não** use para:
- Operações simples como concatenação de strings ou matemática básica
- Toda computação "por precaução" — tem seu próprio custo (memória + comparação)

---

## useCallback — Referências de Função Estáveis

`useCallback(fn, deps)` é equivalente a `useMemo(() => fn, deps)` — memoiza uma referência de função para que ela não mude a cada render.

```tsx
function UserList({ users }: { users: User[] }) {
  const queryClient = useQueryClient();

  // Sem useCallback: nova função a cada render → UserRow re-renderiza sempre
  const handleDelete = async (id: string) => {
    await api.deleteUser(id);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  // Com useCallback: referência estável → UserRow só re-renderiza se queryClient mudar
  const handleDelete = useCallback(async (id: string) => {
    await api.deleteUser(id);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }, [queryClient]);

  return (
    <FlatList
      data={users}
      keyExtractor={u => u.id}
      renderItem={({ item }) => (
        <UserRow user={item} onDelete={handleDelete} />
      )}
    />
  );
}

const UserRow = memo(function UserRow({
  user,
  onDelete,
}: {
  user: User;
  onDelete: (id: string) => void;
}) {
  return (
    <Pressable onPress={() => onDelete(user.id)}>
      <Text>{user.name}</Text>
    </Pressable>
  );
});
```

---

## O Array de Dependências: Acertando

Os bugs mais comuns vêm de arrays de dependências errados — seja por deps faltando (closure desatualizado) ou deps desnecessários (invalida a memoização).

### Closure desatualizado — dependência faltando

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  // BUG: count é capturado no momento em que o callback é criado (0)
  // Cada chamada loga 0 — closure desatualizado
  const logCount = useCallback(() => {
    console.log('Count:', count); // sempre 0
  }, []); // faltando: count

  // CORRETO 1: adicionar count às deps
  const logCount = useCallback(() => {
    console.log('Count:', count);
  }, [count]);

  // CORRETO 2: usar uma ref quando não quer recriar o callback
  const countRef = useRef(count);
  useEffect(() => { countRef.current = count; }, [count]);
  const logCount = useCallback(() => {
    console.log('Count:', countRef.current); // sempre atualizado
  }, []); // referência estável
}
```

### Dependências em excesso — invalida a memoização

```tsx
function SearchBar({ config }: { config: { debounceMs: number } }) {
  // BUG: config é um novo objeto a cada render do pai
  // useCallback recria a cada render — memo nunca pula
  const handleSearch = useCallback((query: string) => {
    setTimeout(() => search(query), config.debounceMs);
  }, [config]); // config é sempre uma nova referência

  // CORRETO: desestruturar o valor específico que precisa
  const { debounceMs } = config;
  const handleSearch = useCallback((query: string) => {
    setTimeout(() => search(query), debounceMs);
  }, [debounceMs]); // primitivo estável
}
```

---

## React DevTools Profiler — Encontrando Re-renders Desnecessários

1. Abra o React Native DevTools (pressione `j` no Metro)
2. Aba **Profiler** → **Record**
3. Interaja com a tela
4. Pare a gravação
5. Clique em qualquer barra no gráfico de chama — ele mostra **por que este componente re-renderizou**

A informação "Why did this render?" mostra:
- **Props changed** — qual prop e de qual valor para qual valor
- **State changed** — qual hook `useState` disparou o re-render
- **Parent re-rendered** — o componente re-renderizou porque seu pai re-renderizou (aqui é onde `memo` ajuda)
- **Hooks changed** — um valor de contexto ou dependência de hook mudou

---

## Uma Árvore de Decisão

```
Devo adicionar memo() a este componente?
├── Está em uma lista renderizada por FlatList? → SIM, sempre memo() em componentes de linha
├── Re-renderiza visivelmente com frequência demais? → Profile primeiro, depois SIM
├── É um componente folha sem filhos? → Apenas se for custoso de renderizar
└── É um wrapper simples com 1-2 filhos? → Geralmente NÃO — custo > benefício

Devo adicionar useMemo() a este valor?
├── É uma lista filtrada/ordenada/derivada? → SIM
├── É um objeto passado como prop a um componente com memo()? → SIM
├── É uma string ou número simples? → NÃO
└── O profiling mostrou que esta computação é lenta? → SIM

Devo adicionar useCallback() a esta função?
├── É passada como prop a um componente com memo()? → SIM
├── É uma dependência de useEffect/useMemo? → SIM
├── É usada apenas dentro deste componente? → Geralmente NÃO
└── É um handler de evento em elemento nativo? → NÃO (Pressable, TextInput, etc. não se beneficiam)
```

---

## Materiais de Estudo

### Documentação Oficial

- [React — memo](https://react.dev/reference/react/memo)
- [React — useMemo](https://react.dev/reference/react/useMemo)
- [React — useCallback](https://react.dev/reference/react/useCallback)
- [React — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

### Vídeos

- [Jack Herrington — React memo, useMemo, and useCallback](https://www.youtube.com/watch?v=uojLJFt9SzY)
- [Theo — When to useMemo and useCallback](https://www.youtube.com/watch?v=Il5sN7aJjMM)

---

## Próximo Passo

Re-renders sob controle. Tópico final: tamanho do bundle e performance de inicialização — bytecode Hermes, lazy loading e como manter seu app rápido no primeiro launch no Android.

➡ [Bundle Size & Startup Performance](./05-bundle-startup)
