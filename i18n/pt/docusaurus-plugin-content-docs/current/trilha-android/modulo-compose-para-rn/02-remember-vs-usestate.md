---
title: "Estado e Efeitos: remember vs useState"
sidebar_label: "Estado e Efeitos"
sidebar_position: 2
---

## Video Overview

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/compose_02_remember_vs_usestate.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/compose_02_remember_vs_usestate.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## O que Você Já Conhece

No Compose, o estado é criado com `remember { mutableStateOf(valor) }`. O bloco `remember` mantém o valor vivo entre recomposições; `mutableStateOf` o envolve para que o Compose possa observar mudanças e disparar recomposições.

O React Native usa hooks — funções simples prefixadas com `use` — para expressar as mesmas ideias. Não há anotação, nenhuma mágica de compilador: apenas chamadas de função com um contrato de execução estrito.

---

## useState: O Hook de Estado Central

### Compose

```kotlin
@Composable
fun Contador() {
    var count by remember { mutableStateOf(0) }
    Button(onClick = { count++ }) {
        Text("Contagem: $count")
    }
}
```

### React Native

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

function Contador() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Pressable onPress={() => setCount(c => c + 1)}>
        <Text>Contagem: {count}</Text>
      </Pressable>
    </View>
  );
}
```

`useState` retorna uma tupla: `[valorAtual, setter]`. O setter agenda um re-render com o novo valor.

> **Use a forma funcional do updater** (`setCount(c => c + 1)`) quando o novo estado depende do valor anterior. O React agrupa atualizações de estado; o closure sobre `count` pode estar desatualizado. A função updater sempre recebe o valor mais recente.

---

## Agrupamento (Batching) de Atualizações de Estado

O sistema de snapshot do Compose agrupa todas as mudanças de estado dentro de um event handler de forma atômica. O React 18+ faz o mesmo através do batching automático: todos os setters de `useState` chamados dentro do mesmo event handler (ou dentro de `startTransition`) são agrupados em um único re-render.

```tsx
function Formulario() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit() {
    setNome('');   // ← esses dois NÃO causam dois renders
    setEmail('');  // ← o React 18 os agrupa em um único re-render
  }

  return (/* ... */);
}
```

---

## useRef: remember Sem Estado

No Compose, `remember { algumObjeto }` armazena um valor não-estado que sobrevive à recomposição. No React, `useRef` é o análogo exato — armazena um valor mutável que **não dispara um re-render quando mutado**.

### Compose

```kotlin
@Composable
fun Temporizador() {
    val elapsedMs = remember { mutableLongStateOf(0L) }
    val startTime = remember { System.currentTimeMillis() }
    // startTime sobrevive à recomposição, mas alterá-lo NÃO recompõe
}
```

### React Native

```tsx
import { useRef, useState, useEffect } from 'react';
import { Text, View } from 'react-native';

function Temporizador() {
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now()); // sobrevive a re-renders, a mutação é invisível ao React

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startTime.current);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return <Text>{elapsed}ms</Text>;
}
```

`useRef` também é usado para manter referências a instâncias de views nativas — o equivalente aos padrões `rememberCoroutineScope()` + `view.findViewTreeLifecycleOwner()`:

```tsx
import { useRef } from 'react';
import { TextInput } from 'react-native';

function BarraDeBusca() {
  const inputRef = useRef<TextInput>(null);

  function focarInput() {
    inputRef.current?.focus(); // chamada imperativa na view nativa
  }

  return <TextInput ref={inputRef} placeholder="Buscar..." />;
}
```

---

## useEffect: O Hook de Efeitos Colaterais

### LaunchedEffect e SideEffect no Compose

```kotlin
@Composable
fun PerfilUsuario(userId: String) {
    var perfil by remember { mutableStateOf<Perfil?>(null) }

    LaunchedEffect(userId) {
        // Executa quando userId muda. Cancela a coroutine anterior automaticamente.
        perfil = buscarPerfil(userId)
    }

    perfil?.let { CartaoPerfil(it) } ?: Carregando()
}
```

### useEffect no React Native

```tsx
import { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

function PerfilUsuario({ userId }: { userId: string }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const data = await buscarPerfil(userId);
      if (!cancelado) setPerfil(data);
    }

    carregar();

    return () => {
      cancelado = true; // cleanup — equivalente ao cancelamento de coroutine
    };
  }, [userId]); // reexecuta sempre que userId muda

  if (!perfil) return <ActivityIndicator />;
  return <CartaoPerfil perfil={perfil} />;
}
```

### Array de Dependências — A Diferença Crítica

| Segundo argumento       | Comportamento                                  | Análogo Compose               |
|-------------------------|------------------------------------------------|-------------------------------|
| `[dep1, dep2]`          | Executa quando qualquer dep muda (e na montagem) | `LaunchedEffect(dep1, dep2)` |
| `[]` (array vazio)      | Executa uma vez na montagem, cleanup na desmontagem | `LaunchedEffect(Unit)`   |
| Omitido                 | Executa após cada render — quase nunca correto | Sem análogo direto            |

> Esquecer dependências é o bug mais comum do React. A regra `exhaustive-deps` do `eslint-plugin-react-hooks` detecta isso em tempo de lint — habilite-a na configuração do seu projeto.

---

## useMemo e useCallback: derivedStateOf e Referências Estáveis

### derivedStateOf

```kotlin
@Composable
fun ListaFiltrada(itens: List<Item>, query: String) {
    val filtrados by remember(itens, query) {
        derivedStateOf { itens.filter { it.nome.contains(query) } }
    }
    LazyColumn {
        items(filtrados) { LinhaItem(it) }
    }
}
```

### useMemo

```tsx
import { useMemo } from 'react';
import { FlatList } from 'react-native';

function ListaFiltrada({ itens, query }: { itens: Item[]; query: string }) {
  const filtrados = useMemo(
    () => itens.filter(item => item.nome.includes(query)),
    [itens, query] // recalcula apenas quando itens ou query mudam
  );

  return <FlatList data={filtrados} renderItem={({ item }) => <LinhaItem item={item} />} />;
}
```

### Referências Estáveis de Callback: useCallback

Quando você passa um callback para um filho envolvido em `memo()`, uma nova referência de função a cada render quebra o bailout do memo — o filho re-renderiza mesmo que nada tenha mudado logicamente. `useCallback` resolve isso, análogo a como o Compose evita criar novas instâncias de lambda a cada recomposição usando `remember { }`.

```tsx
import { useCallback, memo } from 'react';
import { FlatList } from 'react-native';

function ListaPai({ itens }: { itens: Item[] }) {
  const handleDeletar = useCallback((id: string) => {
    // deletarItem(id)
  }, []);

  return (
    <FlatList
      data={itens}
      renderItem={({ item }) => (
        <LinhaMemorizada item={item} onDeletar={handleDeletar} />
      )}
    />
  );
}

const LinhaMemorizada = memo(function Linha({
  item,
  onDeletar,
}: {
  item: Item;
  onDeletar: (id: string) => void;
}) {
  return (/* ... */);
});
```

---

## CompositionLocal → React Context

`CompositionLocal` fornece dados implícitos para uma subárvore de composables. O React Context faz o mesmo.

### Compose

```kotlin
val LocalTema = compositionLocalOf { TemaClaro }

@Composable
fun App() {
    CompositionLocalProvider(LocalTema provides TemaEscuro) {
        Tela()
    }
}

@Composable
fun Tela() {
    val tema = LocalTema.current
    Text("Fundo: ${tema.fundo}", color = tema.texto)
}
```

### React Native

```tsx
import { createContext, useContext } from 'react';

interface Tema {
  fundo: string;
  texto: string;
}

const ContextoTema = createContext<Tema>({ fundo: '#fff', texto: '#000' });

function App() {
  return (
    <ContextoTema.Provider value={{ fundo: '#000', texto: '#fff' }}>
      <Tela />
    </ContextoTema.Provider>
  );
}

function Tela() {
  const tema = useContext(ContextoTema);
  return (
    <View style={{ backgroundColor: tema.fundo }}>
      <Text style={{ color: tema.texto }}>Tela escura</Text>
    </View>
  );
}
```

---

## useReducer — Máquina de Estado

Para estado local complexo com múltiplas transições, `useReducer` é a escolha idiomática — equivalente exato do padrão ViewModel reducer do Compose.

```tsx
import { useReducer } from 'react';

type Estado =
  | { status: 'idle' }
  | { status: 'carregando' }
  | { status: 'sucesso'; dados: string[] }
  | { status: 'erro'; mensagem: string };

type Acao =
  | { tipo: 'INICIAR_BUSCA' }
  | { tipo: 'BUSCA_SUCESSO'; payload: string[] }
  | { tipo: 'BUSCA_ERRO'; mensagem: string };

function reducer(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case 'INICIAR_BUSCA':  return { status: 'carregando' };
    case 'BUSCA_SUCESSO':  return { status: 'sucesso', dados: acao.payload };
    case 'BUSCA_ERRO':     return { status: 'erro', mensagem: acao.mensagem };
    default:               return estado;
  }
}

function TelaDados() {
  const [estado, dispatch] = useReducer(reducer, { status: 'idle' });

  // dispatch({ tipo: 'INICIAR_BUSCA' }) para começar
  // ...
}
```

---

## Regras dos Hooks

Ao contrário do Compose, não há **compilador** aplicando as regras no local da chamada. As regras são aplicadas em runtime (e detectadas pelo plugin do ESLint):

1. Chame hooks apenas no nível superior de um componente de função ou hook customizado — nunca dentro de `if`, `for` ou funções aninhadas.
2. Chame hooks apenas de componentes de função React ou hooks customizados — nunca de funções JavaScript simples.

```tsx
// ERRADO — hook dentro de uma condição
function Quebrado({ mostrar }: { mostrar: boolean }) {
  if (mostrar) {
    const [valor, setValor] = useState(''); // erro em runtime durante o desenvolvimento
  }
}

// CORRETO — condição dentro do efeito do hook
function Corrigido({ mostrar }: { mostrar: boolean }) {
  const [valor, setValor] = useState('');
  useEffect(() => {
    if (!mostrar) return;
    // faz o trabalho quando mostrar é true
  }, [mostrar]);
}
```

---

## Exemplo Interativo

[![Abrir no Expo Snack](https://img.shields.io/badge/Abrir%20no-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/hooks)

---

## Materiais de Estudo

### Documentação Oficial

- [React — useState](https://react.dev/reference/react/useState)
- [React — useEffect](https://react.dev/reference/react/useEffect)
- [React — useRef](https://react.dev/reference/react/useRef)
- [React — useMemo](https://react.dev/reference/react/useMemo)
- [React — useCallback](https://react.dev/reference/react/useCallback)
- [React — useReducer](https://react.dev/reference/react/useReducer)
- [React — useContext](https://react.dev/reference/react/useContext)
- [Compose — Estado no Jetpack Compose](https://developer.android.com/develop/ui/compose/state)

### Interativo

- [React — Ciclo de Vida de Efeitos Reativos](https://react.dev/learn/lifecycle-of-reactive-effects) — aprofundamento em useEffect e dependências
- [useHooks.com](https://usehooks.com/) — catálogo de hooks customizados testados em produção

### Vídeos

- [Jack Herrington — Dominando useEffect do React](https://www.youtube.com/watch?v=dH6i3GurZW8)
- [Fireship — 10 React Hooks Explicados](https://www.youtube.com/watch?v=TNhaISOUy6Q)

---

## Próximo Passo

Você entende como o estado do Compose mapeia para hooks React. Próximo: como o layout `Column`/`Row`/`Box` do Compose se traduz para o sistema Flexbox do React Native.

➡ [Layout: Column/Row vs Flexbox](./03-layout-column-row-vs-flexbox)
