---
title: "Optimizacao de Re-renders: memo, useMemo, useCallback"
sidebar_label: "Optimizacao de Re-renders"
sidebar_position: 4
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/perf_04_memo.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/perf_04_memo.vtt" srclang="pt" label="Português" default>
  Seu navegador nao suporta o elemento de video.
</video>

## O Problema: Tudo Re-renderiza por Padrao

No Jetpack Compose, a recomposicao inteligente e **automatica** — o compilador rastreia quais composables leem qual estado e pula os que nao mudaram. O React faz o oposto: por padrao, **todo componente re-renderiza quando seu pai re-renderiza**, independente de suas props terem mudado.

Esta e a diferenca de performance mais importante entre Compose e React que voce precisa internalizar.

```tsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Pressable onPress={() => setCount(c => c + 1)}>
        <Text>Count: {count}</Text>
      </Pressable>
      {/* Re-renderiza a CADA mudanca de count — mesmo que title nunca mude */}
      <ExpensiveChild title="Static Title" />
    </View>
  );
}
```

Toda vez que `count` muda, `ExpensiveChild` re-renderiza — mesmo que `title` seja sempre `"Static Title"`. No Compose, o compilador pularia `ExpensiveChild` automaticamente. No React, voce precisa optar explicitamente.

---

## memo — O Skip Manual do Compose

`memo` envolve um componente e pula a re-renderizacao se suas props forem superficialmente iguais ao render anterior.

```tsx
import { memo } from 'react';

// Sem memo: re-renderiza sempre que o Parent re-renderiza
function ExpensiveChild({ title }: { title: string }) {
  return <Text>{title}</Text>;
}

// Com memo: so re-renderiza quando title realmente muda
const ExpensiveChild = memo(function ExpensiveChild({ title }: { title: string }) {
  return <Text>{title}</Text>;
});
```

### Quando memo funciona

```tsx
// Props sao primitivos — igualdade superficial funciona
<ExpensiveChild title="Hello" count={5} active={true} />
// Re-renderiza apenas se title, count ou active mudarem ✓
```

### Quando memo nao funciona

```tsx
// Props incluem objetos ou arrays criados inline — nova referencia a cada render
function Parent() {
  return (
    // RUIM: novo array a cada render → memo nunca pula
    <ExpensiveChild items={[1, 2, 3]} />
  );
}

// CORRETO: referencia estavel com useMemo
function Parent() {
  const items = useMemo(() => [1, 2, 3], []);
  return <ExpensiveChild items={items} />;
}
```

```tsx
// Props incluem funcoes — nova referencia a cada render
function Parent() {
  return (
    // RUIM: nova funcao a cada render → memo nunca pula
    <ExpensiveChild onPress={() => console.log('pressed')} />
  );
}

// CORRETO: referencia estavel com useCallback
function Parent() {
  const handlePress = useCallback(() => console.log('pressed'), []);
  return <ExpensiveChild onPress={handlePress} />;
}
```

---

## useMemo — Cache de Computacoes Custosas

```tsx
import { useMemo } from 'react';

function ProductList({ products, category, sortBy }: Props) {
  // Sem useMemo: executa a cada render — mesmo quando products nao mudou
  const filtered = products
    .filter(p => p.category === category)
    .sort((a, b) => a[sortBy] > b[sortBy] ? 1 : -1);

  // Com useMemo: so recomputa quando products, category ou sortBy mudam
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
- A computacao e visivelmente lenta (> 1ms — profile primeiro)
- O resultado e usado como prop de um componente encapsulado com `memo()`
- O resultado e dependencia de outro `useMemo` ou `useCallback`

**Nao** use para:
- Operacoes simples como concatenacao de strings ou matematica basica
- Toda computacao "por precaucao" — tem seu proprio custo (memoria + comparacao)

---

## useCallback — Referencias de Funcao Estaveis

`useCallback(fn, deps)` e equivalente a `useMemo(() => fn, deps)` — memoiza uma referencia de funcao para que ela nao mude a cada render.

```tsx
function UserList({ users }: { users: User[] }) {
  const queryClient = useQueryClient();

  // Sem useCallback: nova funcao a cada render → UserRow re-renderiza sempre
  const handleDelete = async (id: string) => {
    await api.deleteUser(id);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  // Com useCallback: referencia estavel → UserRow so re-renderiza se queryClient mudar
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

## O Array de Dependencias: Acertando

Os bugs mais comuns vem de arrays de dependencias errados — seja por deps faltando (closure desatualizado) ou deps desnecessarios (invalida a memorizacao).

### Closure desatualizado — dependencia faltando

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  // BUG: count e capturado no momento em que o callback e criado (0)
  // Cada chamada loga 0 — closure desatualizado
  const logCount = useCallback(() => {
    console.log('Count:', count); // sempre 0
  }, []); // faltando: count

  // CORRETO 1: adicionar count as deps
  const logCount = useCallback(() => {
    console.log('Count:', count);
  }, [count]);

  // CORRETO 2: usar uma ref quando nao quer recriar o callback
  const countRef = useRef(count);
  useEffect(() => { countRef.current = count; }, [count]);
  const logCount = useCallback(() => {
    console.log('Count:', countRef.current); // sempre atualizado
  }, []); // referencia estavel
}
```

### Dependencias em excesso — invalida a memorizacao

```tsx
function SearchBar({ config }: { config: { debounceMs: number } }) {
  // BUG: config e um novo objeto a cada render do pai
  // useCallback recria a cada render — memo nunca pula
  const handleSearch = useCallback((query: string) => {
    setTimeout(() => search(query), config.debounceMs);
  }, [config]); // config e sempre uma nova referencia

  // CORRETO: desestruturar o valor especifico que precisa
  const { debounceMs } = config;
  const handleSearch = useCallback((query: string) => {
    setTimeout(() => search(query), debounceMs);
  }, [debounceMs]); // primitivo estavel
}
```

---

## React DevTools Profiler — Encontrando Re-renders Desnecessarios

1. Abra o React Native DevTools (pressione `j` no Metro)
2. Aba **Profiler** → **Record**
3. Interaja com a tela
4. Pare a gravacao
5. Clique em qualquer barra no grafico de chama — ele mostra **por que este componente re-renderizou**

A informacao "Why did this render?" mostra:
- **Props changed** — qual prop e de qual valor para qual valor
- **State changed** — qual hook `useState` disparou o re-render
- **Parent re-rendered** — o componente re-renderizou porque seu pai re-renderizou (aqui e onde `memo` ajuda)
- **Hooks changed** — um valor de contexto ou dependencia de hook mudou

---

## Uma Arvore de Decisao

```
Devo adicionar memo() a este componente?
├── Esta em uma lista renderizada por FlatList? → SIM, sempre memo() em componentes de linha
├── Re-renderiza visivelmente com frequencia demais? → Profile primeiro, depois SIM
├── E um componente folha sem filhos? → Apenas se for custoso de renderizar
└── E um wrapper simples com 1-2 filhos? → Geralmente NAO — custo > beneficio

Devo adicionar useMemo() a este valor?
├── E uma lista filtrada/ordenada/derivada? → SIM
├── E um objeto passado como prop a um componente com memo()? → SIM
├── E uma string ou numero simples? → NAO
└── O profiling mostrou que esta computacao e lenta? → SIM

Devo adicionar useCallback() a esta funcao?
├── E passada como prop a um componente com memo()? → SIM
├── E uma dependencia de useEffect/useMemo? → SIM
├── E usada apenas dentro deste componente? → Geralmente NAO
└── E um handler de evento em elemento nativo? → NAO (Pressable, TextInput, etc. nao se beneficiam)
```

---

## Materiais de Estudo

### Documentacao Oficial

- [React — memo](https://react.dev/reference/react/memo)
- [React — useMemo](https://react.dev/reference/react/useMemo)
- [React — useCallback](https://react.dev/reference/react/useCallback)
- [React — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

### Videos

- [Jack Herrington — React memo, useMemo, and useCallback](https://www.youtube.com/watch?v=uojLJFt9SzY)
- [Theo — When to useMemo and useCallback](https://www.youtube.com/watch?v=Il5sN7aJjMM)

---

## Proximo Passo

Re-renders sob controle. Topico final: tamanho do bundle e performance de inicializacao — bytecode Hermes, lazy loading e como manter seu app rapido no primeiro launch no Android.

➡ [Bundle Size & Startup Performance](./05-bundle-startup)
