---
title: Layout & Flexbox no React Native
---

# Layout & Flexbox no React Native

> O React Native usa Flexbox para todo layout — o mesmo modelo do CSS Flexbox, com alguns padrões específicos do RN.

## Diferenças Principais em Relação ao CSS Flexbox

| Propriedade | Padrão CSS Web | Padrão React Native |
|----------|----------------|---------------------|
| `flexDirection` | `row` | **`column`** |
| `alignContent` | `stretch` | `flex-start` |
| Unidades | `px`, `%`, `em`, etc. | **Números sem unidade** (pixels independentes de densidade) |
| Atalho `flex` | `flex: 1 1 auto` | **`flex: N` apenas** (cresce/encolhe igualmente) |
| Position | `static` | `relative` |

O maior pulo do gato: **`flexDirection` tem padrão `column`** no RN. O conteúdo empilha verticalmente por padrão.

---

## O Modelo Mental

Pense em cada `View` como um **flex container**. A prop `style` é como você o configura.

```tsx
// Esta é uma pilha vertical (column é o padrão)
<View style={{ flex: 1 }}>
    <View style={{ height: 60, backgroundColor: 'red' }} />
    <View style={{ flex: 1, backgroundColor: 'green' }} />  {/* ocupa o espaço restante */}
    <View style={{ height: 60, backgroundColor: 'blue' }} />
</View>
```

---

## Propriedades Core do Flexbox

### `flexDirection`

```tsx
// Column (padrão) — filhos empilham de cima para baixo
<View style={{ flexDirection: 'column' }}>

// Row — filhos ficam da esquerda para a direita
<View style={{ flexDirection: 'row' }}>

// Variantes reversas
<View style={{ flexDirection: 'column-reverse' }}>
<View style={{ flexDirection: 'row-reverse' }}>
```

### `justifyContent` — Alinhamento no Eixo Principal

```tsx
// Ao longo do eixo flexDirection (vertical para column, horizontal para row)
<View style={{ justifyContent: 'flex-start' }}>  {/* padrão */}
<View style={{ justifyContent: 'flex-end' }}>
<View style={{ justifyContent: 'center' }}>
<View style={{ justifyContent: 'space-between' }}>
<View style={{ justifyContent: 'space-around' }}>
<View style={{ justifyContent: 'space-evenly' }}>
```

### `alignItems` — Alinhamento no Eixo Cruzado

```tsx
// Perpendicular ao flexDirection
<View style={{ alignItems: 'flex-start' }}>
<View style={{ alignItems: 'flex-end' }}>
<View style={{ alignItems: 'center' }}>
<View style={{ alignItems: 'stretch' }}>  {/* padrão */}
<View style={{ alignItems: 'baseline' }}>
```

### Centralizar Algo (O Clássico)

```tsx
// Centraliza um filho horizontal e verticalmente — o padrão de layout mais comum
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Conteúdo Centralizado</Text>
</View>
```

**Comparação Kotlin/Android:**
```xml
<!-- ConstraintLayout ou Gravity -->
<FrameLayout android:layout_gravity="center" />
<LinearLayout android:gravity="center" />
```

**Comparação SwiftUI:**
```swift
// Centralização idiomática no SwiftUI
ZStack {
    Text("Centralizado")
}
.frame(maxWidth: .infinity, maxHeight: .infinity)
```

---

## `flex` — Espaço Proporcional

```tsx
// flex: N — ocupa N partes proporcionais do espaço disponível
<View style={{ flexDirection: 'row', height: 100 }}>
    <View style={{ flex: 1, backgroundColor: 'red' }} />   {/* 1/3 */}
    <View style={{ flex: 2, backgroundColor: 'green' }} /> {/* 2/3 */}
</View>

// flex: 1 em filho de uma Tela — preenche todo o espaço disponível
<View style={{ flex: 1 }}>
    {/* Preenche a tela inteira */}
</View>
```

---

## Espaçamento: `margin` e `padding`

```tsx
// Lados individuais
<View style={{
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 12,
    marginRight: 12,
    paddingHorizontal: 16,  // atalho para paddingLeft + paddingRight
    paddingVertical: 8,     // atalho para paddingTop + paddingBottom
    padding: 16,            // todos os lados
    margin: 8,
}} />

// A nomenclatura do RN é a mesma dos atributos XML do Android
// marginTop == android:layout_marginTop
// paddingHorizontal não tem equivalente direto no XML Android (use paddingLeft+paddingRight)
```

---

## `position: 'absolute'`

Para overlays, badges e elementos que flutuam fora do fluxo normal:

```tsx
// O pai precisa de position: 'relative' (o padrão)
<View style={{ width: 60, height: 60 }}>
    <Image source={{ uri: avatarUrl }} style={{ width: 60, height: 60, borderRadius: 30 }} />
    {/* Badge no canto superior direito */}
    <View style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'red',
    }} />
</View>
```

---

## Dimensionamento Responsivo com `Dimensions`

```tsx
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    halfScreen: {
        width: width / 2,
        height: height * 0.3,
    },
});
```

:::caution Fica desatualizado na mudança de orientação
`Dimensions.get('window')` captura o valor uma vez na carga do módulo. Se o usuário rotacionar o dispositivo, o valor fica obsoleto. Use `useWindowDimensions` para qualquer coisa que deva responder à rotação.
:::

Para layouts responsivos dinâmicos (responde à mudança de rotação/orientação), use `useWindowDimensions`:

```tsx
import { useWindowDimensions } from 'react-native';

function ResponsiveCard() {
    const { width } = useWindowDimensions();
    const columns = width > 600 ? 3 : 2; // layout tablet vs celular
    // ...
}
```

---

## `StyleSheet.create` vs Estilos Inline

```tsx
// Estilos inline — convenientes mas levemente mais lentos (sem otimização)
<View style={{ flex: 1, backgroundColor: 'red' }} />

// StyleSheet.create — preferido (validado, otimizado, autocomplete)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
<View style={styles.container} />

// Combinando estilos (como aplicar múltiplos atributos XML do Android)
<View style={[styles.container, styles.padded, { marginTop: 8 }]} />
```

---

## `gap` — Espaçamento Entre Filhos

Desde o React Native 0.71, você pode usar `gap`, `rowGap` e `columnGap` em vez de adicionar margin a cada filho:

```tsx
// Antes do gap — margin manual em todos os filhos exceto o último
<View style={{ flexDirection: 'row' }}>
    <View style={{ marginRight: 8 }} />
    <View style={{ marginRight: 8 }} />
    <View /> {/* sem margin no último */}
</View>

// Com gap — limpo e correto
<View style={{ flexDirection: 'row', gap: 8 }}>
    <View />
    <View />
    <View />
</View>

// rowGap / columnGap para layouts em grade
<View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 8 }}>
    {items.map(item => <Card key={item.id} />)}
</View>
```

**Paralelo SwiftUI:** parâmetro `spacing:` no `HStack`/`VStack`. **Paralelo Compose:** `Arrangement.spacedBy(8.dp)`.

---

## Prática: Flexbox Froggy

A melhor forma de internalizar o Flexbox é brincando. Como o RN usa o mesmo modelo flexbox do CSS:

 **[Jogar Flexbox Froggy](https://flexboxfroggy.com/)** — 24 níveis que ensinam cada propriedade flexbox através de um jogo interativo.

---

## Padrões de Layout Comuns

```tsx
// Barra de navegação com título e botão de ação
<View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
    <Text style={{ flex: 1, fontSize: 18, fontWeight: 'bold' }}>Título</Text>
    <Pressable onPress={handleAction}>
        <Text>Ação</Text>
    </Pressable>
</View>

// Card com imagem à esquerda, texto à direita
<View style={{ flexDirection: 'row', padding: 12 }}>
    <Image style={{ width: 60, height: 60 }} source={{ uri: '...' }} />
    <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: 'bold' }}>Título</Text>
        <Text numberOfLines={2}>Descrição...</Text>
    </View>
</View>

// Botão fixado na parte inferior (padrão comum de tela)
<View style={{ flex: 1 }}>
    <ScrollView style={{ flex: 1 }}>
        {/* conteúdo rolável */}
    </ScrollView>
    <View style={{ padding: 16 }}>
        <Button title="Continuar" onPress={handleContinue} />
    </View>
</View>
```

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| Flexbox Froggy | Jogo Interativo | [flexboxfroggy.com](https://flexboxfroggy.com/) |
| Layout RN com Flexbox | Docs Oficiais | [reactnative.dev/docs/flexbox](https://reactnative.dev/docs/flexbox) |
| Props de Layout RN | Docs Oficiais | [reactnative.dev/docs/layout-props](https://reactnative.dev/docs/layout-props) |
| Yoga (o motor de layout que o RN usa) | Referência | [yogalayout.dev](https://yogalayout.dev/) |

---

Próximo → **[Estilização no React Native](./styling)**
