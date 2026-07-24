---
title: "Estado e Efeitos: remember vs useState"
sidebar_label: "Estado e Efeitos"
sidebar_position: 2
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

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

> **Use a forma funcional do updater** (`setCount(c => c + 1)`) quando o novo estado depende do valor anterior. O React agrupa atualizações de estado; o closure sobre `count` pode estar desatualizado.

---

## useRef: remember Sem Estado

No Compose, `remember { algumObjeto }` armazena um valor não-estado que sobrevive à recomposição. No React, `useRef` é o análogo exato — armazena um valor mutável que **não dispara um re-render quando mutado**.

```tsx
import { useRef, useState, useEffect } from 'react';
import { Text } from 'react-native';

function Temporizador() {
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startTime.current);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return <Text>{elapsed}ms</Text>;
}
```

---

## useEffect: O Hook de Efeitos Colaterais

### LaunchedEffect no Compose

```kotlin
@Composable
fun PerfilUsuario(userId: String) {
    var perfil by remember { mutableStateOf<Perfil?>(null) }

    LaunchedEffect(userId) {
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
    return () => { cancelado = true; };
  }, [userId]);

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

---

## useMemo e useCallback

### useMemo — derivedStateOf

```tsx
import { useMemo } from 'react';
import { FlatList } from 'react-native';

function ListaFiltrada({ itens, query }: { itens: Item[]; query: string }) {
  const filtrados = useMemo(
    () => itens.filter(item => item.nome.includes(query)),
    [itens, query]
  );

  return <FlatList data={filtrados} renderItem={({ item }) => <LinhaItem item={item} />} />;
}
```

### useCallback — referências estáveis de callback

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
```

---

## Regras dos Hooks

Ao contrário do Compose, não há **compilador** aplicando as regras. Elas são aplicadas em runtime (e detectadas pelo ESLint):

1. Chame hooks apenas no nível superior de um componente de função ou hook customizado — nunca dentro de `if`, `for` ou funções aninhadas.
2. Chame hooks apenas de componentes de função React ou hooks customizados.

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
- [Compose — Estado no Jetpack Compose](https://developer.android.com/develop/ui/compose/state)

### Vídeos

- [Jack Herrington — Dominando useEffect do React](https://www.youtube.com/watch?v=dH6i3GurZW8)
- [Fireship — 10 React Hooks Explicados](https://www.youtube.com/watch?v=TNhaISOUy6Q)

---

## Próximo Passo

Você entende como o estado do Compose mapeia para hooks React. Próximo: como o layout `Column`/`Row`/`Box` do Compose se traduz para o sistema Flexbox do React Native.

➡ [Layout: Column/Row vs Flexbox](./03-layout-column-row-vs-flexbox)
