---
title: "Layout: Column/Row vs Flexbox"
sidebar_label: "Layout: Column/Row vs Flexbox"
sidebar_position: 3
---

## Video Overview

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/compose_03_layout_column_row_vs_flexbox.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/compose_03_layout_column_row_vs_flexbox.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## Sistemas de Layout Lado a Lado

Os layouts do Jetpack Compose são nomeados e explícitos: `Column` para vertical, `Row` para horizontal, `Box` para empilhamento/sobreposição. O React Native usa um único sistema Flexbox unificado para tudo — mas os padrões são ajustados para que os padrões comuns se traduzam de forma limpa.

Este arquivo mapeia todo conceito importante de layout do Compose para o equivalente em React Native, com código lado a lado e uma referência completa das propriedades do Flexbox.

---

## A Diferença do Eixo Padrão

A diferença mais importante para memorizar:

| Sistema              | Eixo principal padrão | Alinhamento padrão no eixo cruzado |
|---------------------|----------------------|-------------------------------------|
| Compose Column      | Vertical             | Start (esquerda)                    |
| Compose Row         | Horizontal           | CenterVertically possível           |
| React Native View   | **Vertical**         | Stretch                             |
| CSS Flexbox (web)   | Horizontal           | Stretch                             |

O `flexDirection` do React Native é `'column'` por padrão (não `'row'` como na web). Uma `<View>` simples com filhos já os empilha verticalmente — correspondendo ao `Column` do Compose.

---

## Column → View (Flexbox padrão)

### Compose

```kotlin
@Composable
fun SecaoPerfil() {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth().padding(16.dp)
    ) {
        Text("Nome")
        Text("Email")
        Text("Telefone")
    }
}
```

### React Native

```tsx
import { View, Text, StyleSheet } from 'react-native';

function SecaoPerfil() {
  return (
    <View style={estilos.container}>
      <Text>Nome</Text>
      <Text>Email</Text>
      <Text>Telefone</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: 'column',  // padrão — pode ser omitido
    alignItems: 'center',     // Alignment.CenterHorizontally
    padding: 16,
    gap: 8,                   // Arrangement.spacedBy(8.dp) — RN 0.71+
    width: '100%',
  },
});
```

> `gap` foi adicionado ao React Native na versão 0.71. Para projetos mais antigos, use `marginBottom` em cada filho ou um componente `Spacer`.

---

## Row → View com flexDirection: 'row'

### Compose

```kotlin
@Composable
fun BarraDeAcoes() {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
    ) {
        IconButton(onClick = { }) { Icon(Icons.Default.ArrowBack, null) }
        Text("Título", style = MaterialTheme.typography.titleLarge)
        IconButton(onClick = { }) { Icon(Icons.Default.MoreVert, null) }
    }
}
```

### React Native

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';

function BarraDeAcoes() {
  return (
    <View style={estilos.barra}>
      <Pressable><Text>←</Text></Pressable>
      <Text style={estilos.titulo}>Título</Text>
      <Pressable><Text>⋮</Text></Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Arrangement.SpaceBetween
    alignItems: 'center',            // Alignment.CenterVertically
    paddingHorizontal: 16,
    width: '100%',
  },
  titulo: { fontSize: 20, fontWeight: '600' },
});
```

---

## Box → View com position: 'absolute'

### Compose

```kotlin
@Composable
fun AvatarComBadge(badgeCount: Int) {
    Box(contentAlignment = Alignment.TopEnd) {
        Image(
            painter = painterResource(R.drawable.avatar),
            contentDescription = null,
            modifier = Modifier.size(48.dp).clip(CircleShape)
        )
        if (badgeCount > 0) {
            Badge { Text("$badgeCount") }
        }
    }
}
```

### React Native

```tsx
import { View, Text, Image, StyleSheet } from 'react-native';

function AvatarComBadge({ badgeCount }: { badgeCount: number }) {
  return (
    <View style={estilos.container}>
      <Image source={require('./avatar.png')} style={estilos.avatar} />
      {badgeCount > 0 && (
        <View style={estilos.badge}>
          <Text style={estilos.badgeTexto}>{badgeCount}</Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { width: 48, height: 48 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  badge: {
    position: 'absolute',
    top: -4, right: -4,
    backgroundColor: '#e53935',
    borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTexto: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
```

---

## Modifier → prop style

| Compose Modifier                         | Propriedade style React Native           |
|------------------------------------------|------------------------------------------|
| `Modifier.fillMaxWidth()`                | `width: '100%'`                          |
| `Modifier.fillMaxHeight()`               | `height: '100%'`                         |
| `Modifier.fillMaxSize()`                 | `flex: 1` ou `width: '100%', height: '100%'` |
| `Modifier.size(48.dp)`                   | `width: 48, height: 48`                  |
| `Modifier.padding(16.dp)`               | `padding: 16`                            |
| `Modifier.padding(horizontal = 16.dp)`  | `paddingHorizontal: 16`                  |
| `Modifier.background(Color.Red)`        | `backgroundColor: 'red'`                 |
| `Modifier.clip(CircleShape)`            | `borderRadius: N` (metade da largura/altura) |
| `Modifier.border(1.dp, Color.Gray)`     | `borderWidth: 1, borderColor: '#999'`    |
| `Modifier.weight(1f)`                   | `flex: 1`                                |
| `Modifier.wrapContentWidth()`           | sem propriedade `width` (dimensionamento natural) |
| `Modifier.alpha(0.5f)`                  | `opacity: 0.5`                           |
| `Modifier.rotate(45f)`                  | `transform: [{ rotate: '45deg' }]`       |

---

## flex: 1 — O Equivalente de fillMaxSize

```tsx
function DoisPaineis() {
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ flex: 1, backgroundColor: '#e3f2fd' }} />
      <View style={{ flex: 2, backgroundColor: '#fce4ec' }} />
    </View>
  );
}
```

Equivalente em Compose:

```kotlin
Row(Modifier.fillMaxSize()) {
    Box(Modifier.weight(1f).background(Color(0xFFE3F2FD)))
    Box(Modifier.weight(2f).background(Color(0xFFFCE4EC)))
}
```

---

## Referência Completa de Arrangement e Alignment

### justifyContent — distribuição no eixo principal

| Compose Arrangement          | React Native justifyContent   |
|------------------------------|-------------------------------|
| `Arrangement.Start`          | `'flex-start'` (padrão)       |
| `Arrangement.End`            | `'flex-end'`                  |
| `Arrangement.Center`         | `'center'`                    |
| `Arrangement.SpaceBetween`   | `'space-between'`             |
| `Arrangement.SpaceAround`    | `'space-around'`              |
| `Arrangement.SpaceEvenly`    | `'space-evenly'`              |
| `Arrangement.spacedBy(8.dp)` | `gap: 8`                      |

### alignItems — alinhamento no eixo cruzado

| Compose Alignment                       | React Native alignItems        |
|-----------------------------------------|--------------------------------|
| `Alignment.Start` / `Alignment.Top`     | `'flex-start'`                 |
| `Alignment.End` / `Alignment.Bottom`    | `'flex-end'`                   |
| `Alignment.CenterHorizontally` / etc.   | `'center'`                     |
| (padrão — Compose estica)               | `'stretch'` (padrão RN)        |

### Alinhamento individual do filho: alignSelf

Para um único filho sobrescrever o `alignItems` do pai:

```tsx
// Pai: alignItems: 'center'
// Este filho específico se alinha ao flex-start em vez disso
<View style={{ alignSelf: 'flex-start' }}>
  <Text>Alinhado à esquerda em uma coluna centralizada</Text>
</View>
```

---

## FlexWrap: Row com Quebra de Linha

O `FlowRow`/`FlowColumn` do Compose quebram os filhos em múltiplas linhas. O React Native usa `flexWrap: 'wrap'`.

```tsx
function ListaDeTags({ tags }: { tags: string[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {tags.map(tag => (
        <View key={tag} style={estilos.tag}>
          <Text style={estilos.tagTexto}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}
```

---

## Dimensionamento Intrínseco

O React Native não suporta `IntrinsicSize` (o `IntrinsicSize.Max/Min` do Compose). Os filhos se dimensionam de acordo com o conteúdo por padrão quando nenhuma largura/altura/flex explícita é definida. Se você precisar que os irmãos correspondam à altura do irmão mais alto, use `alignItems: 'stretch'` (padrão) ou meça com `onLayout`.

---

## Playground Interativo

Aprenda Flexbox visualmente com o jogo Flexbox Froggy — os eixos, `justify-content`, `align-items`, `flex-wrap` e `align-content` se aplicam diretamente ao React Native:

[https://flexboxfroggy.com/](https://flexboxfroggy.com/)

[![Abrir no Expo Snack](https://img.shields.io/badge/Abrir%20no-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/layout-flexbox)

---

## Materiais de Estudo

### Documentação Oficial

- [React Native — Layout com Flexbox](https://reactnative.dev/docs/flexbox) — referência exaustiva de propriedades
- [React Native — Altura e Largura](https://reactnative.dev/docs/height-and-width)
- [React Native — StyleSheet](https://reactnative.dev/docs/stylesheet)
- [Compose — Layouts no Compose](https://developer.android.com/develop/ui/compose/layouts/basics)
- [Compose — Layouts Customizados](https://developer.android.com/develop/ui/compose/layouts/custom)

### Interativo

- [Flexbox Froggy](https://flexboxfroggy.com/) — aprenda os eixos do Flexbox através de um jogo
- [Yoga Playground](https://yogalayout.dev/playground) — engine de layout interno do React Native

### Vídeos

- [William Candillon — Crash Course de Layout React Native](https://www.youtube.com/watch?v=NlT3bF2aHB4)
- [Google — Layouts no Jetpack Compose](https://www.youtube.com/watch?v=0kfq3vHOBnI) — reveja como base de comparação

---

## Próximo Passo

Layout pronto. Próximo: como o Navigation Compose (NavHost/NavController) mapeia para os navegadores de stack e tab do React Navigation 7.

➡ [Navegação: NavHost vs React Navigation](./04-navigation-navhost-vs-react-navigation)
