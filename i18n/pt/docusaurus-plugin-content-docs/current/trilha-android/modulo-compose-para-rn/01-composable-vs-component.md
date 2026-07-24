---
title: "@Composable vs Componente React"
sidebar_label: "@Composable vs Componente"
sidebar_position: 1
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## O Paradigma que Você Já Conhece

Se você já escreveu Jetpack Compose, já entende o modelo de UI declarativa sobre o qual o React Native é construído. O salto mental é menor do que a maioria dos desenvolvedores Android espera — mas a terminologia e o runtime diferem significativamente.

Este arquivo mapeia tudo que você conhece do Compose para o equivalente em React/React Native, com precisão de código.

---

## Conceito Central: Funções que Retornam UI

No Compose, uma função `@Composable` descreve parte da UI. No React (e React Native), um Componente é uma função que retorna JSX. A filosofia é idêntica: **UI é uma função do estado**.

### Compose

```kotlin
@Composable
fun Greeting(name: String) {
    Text(text = "Olá, $name!")
}
```

### React Native

```tsx
function Greeting({ name }: { name: string }) {
  return <Text>Olá, {name}!</Text>;
}
```

As diferenças são superficiais: sem anotação, JSX em vez de chamadas composable, `{}` para expressões em vez de `${}` dentro de strings.

---

## Comparação de Anatomia

| Conceito Compose                 | Equivalente React Native                         |
|----------------------------------|--------------------------------------------------|
| Anotação `@Composable`           | Função simples que retorna JSX                   |
| `@Preview`                       | Expo Snack / Storybook                           |
| `Modifier`                       | prop `style` + `StyleSheet`                      |
| `remember { }`                   | `useRef()` para identidade estável               |
| `remember { mutableStateOf() }`  | `useState()`                                     |
| `LaunchedEffect(key)`            | `useEffect(() => {}, [key])`                     |
| `derivedStateOf { }`             | `useMemo(() => computação, [deps])`              |
| `CompositionLocal`               | React Context + `useContext()`                   |
| `ViewModel` + `collectAsState`   | Zustand store ou slice Redux + hook selector     |
| `@Stable` / `@Immutable`         | Sem equivalente exato — use `memo()` + refs estáveis |
| Recomposição                     | Re-render                                        |
| Slot API (content: @Composable)  | prop `children`                                  |

---

## O Modelo de Recomposição / Re-render

### Compose

O Compose rastreia quais composables leem quais snapshots de estado. Quando um estado muda, apenas os composables que leram aquele estado são recompostos. O Compose usa um plugin de compilador inteligente para pular subárvores não alteradas.

```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }
    Button(onClick = { count++ }) {
        Text("Contagem: $count")
    }
}
```

### React Native

O React re-renderiza o componente que mantém o estado, depois faz diff da árvore virtual abaixo dele. Você opta por sair dos re-renders com `memo()` — equivalente à recomposição inteligente automática do Compose.

```tsx
import { useState, memo } from 'react';
import { View, Text, Pressable } from 'react-native';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <View>
      <ExpensiveChild label="estático" />
      <Pressable onPress={() => setCount(c => c + 1)}>
        <Text>Contagem: {count}</Text>
      </Pressable>
    </View>
  );
}

const ExpensiveChild = memo(function ExpensiveChild({ label }: { label: string }) {
  return <Text>{label}</Text>;
});
```

> **Diferença principal**: O compilador do Compose analisa quais composables leem qual estado em tempo de compilação. O React re-renderiza subárvores inteiras e depende de `memo()`, `useMemo()` e `useCallback()` para bailout manual.

---

## Props: Parâmetros Compose vs Props do Componente

### Compose — parâmetros nomeados com defaults

```kotlin
@Composable
fun BotaoPrimario(
    label: String,
    onClick: () -> Unit,
    habilitado: Boolean = true,
) {
    Button(onClick = onClick, enabled = habilitado) {
        Text(label)
    }
}
```

### React Native — objeto props desestruturado + interface TypeScript

```tsx
interface BotaoPrimarioProps {
  label: string;
  onPress: () => void;
  habilitado?: boolean;
}

function BotaoPrimario({ label, onPress, habilitado = true }: BotaoPrimarioProps) {
  return (
    <Pressable onPress={onPress} disabled={!habilitado}>
      <Text>{label}</Text>
    </Pressable>
  );
}
```

---

## Children / Slot API

A slot API do Compose passa composables como parâmetros lambda. O React passa children como a prop `children`.

### Compose — slot API

```kotlin
@Composable
fun Card(
    titulo: String,
    conteudo: @Composable () -> Unit,
) {
    Column {
        Text(titulo)
        conteudo()
    }
}

Card(titulo = "Perfil") {
    Image(painter = painterResource(R.drawable.avatar), contentDescription = null)
    Text("Guilherme")
}
```

### React Native — prop children

```tsx
interface CardProps {
  titulo: string;
  children: React.ReactNode;
}

function Card({ titulo, children }: CardProps) {
  return (
    <View>
      <Text>{titulo}</Text>
      {children}
    </View>
  );
}

<Card titulo="Perfil">
  <Image source={require('./avatar.png')} />
  <Text>Guilherme</Text>
</Card>
```

---

## Renderização Condicional

### Compose

```kotlin
@Composable
fun StatusUsuario(estaLogado: Boolean) {
    if (estaLogado) {
        Text("Bem-vindo de volta!")
    } else {
        Text("Por favor, faça login.")
    }
}
```

### React Native

```tsx
function StatusUsuario({ estaLogado }: { estaLogado: boolean }) {
  return (
    <View>
      {estaLogado ? (
        <Text>Bem-vindo de volta!</Text>
      ) : (
        <Text>Por favor, faça login.</Text>
      )}
    </View>
  );
}
```

---

## Renderização de Listas: LazyColumn vs FlatList

### Compose

```kotlin
@Composable
fun ListaUsuarios(usuarios: List<Usuario>) {
    LazyColumn {
        items(usuarios, key = { it.id }) { usuario ->
            CardUsuario(usuario = usuario)
        }
    }
}
```

### React Native

```tsx
import { FlatList } from 'react-native';

function ListaUsuarios({ usuarios }: { usuarios: Usuario[] }) {
  return (
    <FlatList
      data={usuarios}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CardUsuario usuario={item} />}
    />
  );
}
```

Ambos virtualizam por padrão — apenas os itens próximos à viewport são montados.

---

## Exemplo Interativo

[![Abrir no Expo Snack](https://img.shields.io/badge/Abrir%20no-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/components-and-props)

---

## Materiais de Estudo

### Documentação Oficial

- [React Native — Conceitos Principais](https://reactnative.dev/docs/getting-started)
- [React — Pensando em React](https://react.dev/learn/thinking-in-react)
- [React — Descrevendo a UI](https://react.dev/learn/describing-the-ui)
- [Jetpack Compose — Pensando em Compose](https://developer.android.com/develop/ui/compose/mental-model)

### Interativo

- [Tutorial React — Jogo da Velha](https://react.dev/learn/tutorial-tic-tac-toe)
- [Expo Snack — Componentes & Props](https://snack.expo.dev/@react-native-community/components-and-props)

### Vídeos

- [Fireship — React em 100 Segundos](https://www.youtube.com/watch?v=Tn6-PIqc4UM)
- [Google — O que é Jetpack Compose](https://www.youtube.com/watch?v=U5BwfqBpiWU)

---

## Próximo Passo

Você agora tem o mapeamento mental de `@Composable` para componente React. O próximo tópico mergulha no sistema de estado: como `remember { mutableStateOf() }` mapeia para `useState` e `useEffect`.

➡ [Estado e Efeitos: remember vs useState](./02-remember-vs-usestate)
