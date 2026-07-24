---
title: Layout and Flexbox — SwiftUI and Auto Layout Mapping
---

# Layout e Flexbox — Mapeamento com SwiftUI e Auto Layout

O iOS oferece dois sistemas de layout: o Auto Layout, que expressa restrições entre views, e as stacks e modificadores declarativos do SwiftUI. O React Native substitui ambos por um único sistema chamado Yoga, uma implementação multiplataforma do Flexbox. Uma vez compreendido o mapeamento entre os dois modelos mentais, o layout do React Native parecerá familiar — as stacks do SwiftUI e o Flexbox são mais próximos do que aparentam.

---

## A Mudança de Modelo Mental: de Restrições para Flexbox

O Auto Layout pensa em termos de relacionamentos. Você declara que a borda inicial de uma view está a 16 pontos da borda inicial de sua superview, que sua largura equivale a 50% do container e que ela está centralizada verticalmente. O solver de restrições resolve essas declarações em um frame final no momento da renderização.

O Flexbox pensa em termos de fluxo. Um container declara como seus filhos são organizados ao longo de um eixo principal e como o espaço restante é distribuído. Os filhos podem optar por crescer ou encolher. Não há restrições entre views distintas — cada container governa apenas seus filhos diretos.

O SwiftUI está mais próximo do Flexbox do que o Auto Layout. `VStack` e `HStack` são containers flex com um eixo declarado. `Spacer()` insere um filho guloso que consome o espaço restante. O `frame(maxWidth: .infinity)` do SwiftUI equivale a `flex: 1` no React Native.

Se você passou mais tempo com SwiftUI do que com Auto Layout, o mapeamento para React Native parecerá natural. Se passou mais tempo com Auto Layout, o insight fundamental a internalizar é: "containers são donos do layout de seus filhos".

---

## Padrões do Yoga que Diferem do CSS Web

O React Native usa o mesmo vocabulário Flexbox do CSS web, mas vários padrões diferem. Conhecê-los com antecedência previne a maioria das surpresas de layout:

| Propriedade | Padrão no CSS Web | Padrão no React Native | Analogia no SwiftUI |
|---|---|---|---|
| `flexDirection` | `row` | `column` | `VStack` é o padrão |
| `alignItems` | `stretch` | `stretch` | filhos preenchem o eixo transversal |
| `position` | `static` | `relative` | no fluxo por padrão |
| `flexShrink` | `1` | `0` | filhos não comprimem por padrão |

A diferença mais importante: `flexDirection` tem padrão `'column'`. Uma `View` simples com filhos os empilha verticalmente, exatamente como o `VStack`.

---

## VStack e HStack — flexDirection

O `VStack` e o `HStack` do SwiftUI correspondem diretamente a uma `View` com `flexDirection: 'column'` ou `flexDirection: 'row'`.

```swift
// SwiftUI
VStack(spacing: 12) {
    Text("Title")
    Text("Subtitle")
}

HStack(spacing: 8) {
    Image(systemName: "star")
    Text("Featured")
}
```

```tsx
import { View, Text, StyleSheet } from 'react-native';

// Equivalente ao VStack — flexDirection: 'column' é o padrão e pode ser omitido
<View style={styles.vstack}>
  <Text style={styles.title}>Title</Text>
  <Text style={styles.subtitle}>Subtitle</Text>
</View>

// Equivalente ao HStack
<View style={styles.hstack}>
  <StarIcon size={16} />
  <Text style={styles.label}>Featured</Text>
</View>

const styles = StyleSheet.create({
  vstack:   { flexDirection: 'column', gap: 12 },
  hstack:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:    { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#6b7280' },
  label:    { fontSize: 16, color: '#1a1a2e' },
});
```

`gap` substitui o parâmetro `spacing:` do `VStack`/`HStack`. Ele define o espaço entre todos os filhos diretos de forma uniforme, sem adicionar espaço no início ou no fim.

---

## ZStack e Overlays — position absolute

O `ZStack` do SwiftUI empilha views ao longo do eixo de profundidade. O React Native não possui um primitivo ZStack dedicado. Em vez disso, usa-se `position: 'absolute'` para retirar um filho do fluxo normal e posicioná-lo em um local específico dentro de seu ancestral `relative` mais próximo.

```swift
// SwiftUI
ZStack(alignment: .bottomLeading) {
    Image("background")
        .resizable()
        .scaledToFill()
    Text("Caption")
        .padding(16)
}
```

```tsx
import { View, Text, Image, StyleSheet } from 'react-native';

// Equivalente ao ZStack
<View style={styles.container}>
  <Image
    source={require('./bg.png')}
    style={StyleSheet.absoluteFill}  // preenche o pai completamente
    resizeMode="cover"
  />
  <Text style={styles.caption}>Caption</Text>
</View>

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
  },
  caption: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

`StyleSheet.absoluteFill` é um atalho equivalente a `{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }`. É exatamente o padrão para uma imagem de fundo dentro de um ZStack.

`position: 'relative'` (o padrão) significa que a view participa do fluxo flex normal. `position: 'absolute'` significa que ela é removida do fluxo e posicionada em relação ao seu ancestral `relative` ou `absolute` mais próximo — equivalente a uma `UIView` com `translatesAutoresizingMaskIntoConstraints = false` posicionada sem restrições, ou ao modificador `overlay` no SwiftUI.

---

## Spacer() — flex: 1 e justifyContent

O `Spacer()` do SwiftUI insere uma view gulosa que se expande para preencher todo o espaço disponível. Em um contexto horizontal, ele afasta os irmãos; em um contexto vertical, preenche a altura vazia.

O React Native expressa a mesma intenção de duas formas, dependendo da situação.

**Usando `flex: 1` para um filho espaçador guloso:**

```swift
// SwiftUI — empurra título para esquerda, botão para direita
HStack {
    Text("Title")
    Spacer()
    Button("Edit") { }
}
```

```tsx
// Equivalente no React Native
<View style={styles.header}>
  <Text style={styles.title}>Title</Text>
  <View style={{ flex: 1 }} />
  <Pressable onPress={onEdit}><Text>Edit</Text></Pressable>
</View>

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  title:  { fontSize: 18, fontWeight: '700' },
});
```

**Usando `justifyContent` para distribuir espaço sem um espaçador explícito:**

```tsx
// justifyContent: 'space-between' empurra o primeiro e o último filho para as bordas
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
  <Text>Left</Text>
  <Text>Right</Text>
</View>
```

`justifyContent` controla a distribuição ao longo do eixo principal:

| Valor | Efeito | Analogia no SwiftUI |
|---|---|---|
| `'flex-start'` | Filhos agrupados no início | Sem Spacer — padrão |
| `'flex-end'` | Filhos agrupados no final | Spacer no início |
| `'center'` | Filhos centralizados | Spacer em ambos os lados |
| `'space-between'` | Primeiro/último nas bordas, espaços iguais entre eles | Múltiplos Spacers |
| `'space-around'` | Espaço igual ao redor de cada filho | — |
| `'space-evenly'` | Espaço igual entre e ao redor de todos | — |

---

## padding() — Atalhos de Padding no StyleSheet

O modificador `.padding()` do SwiftUI se aplica aos quatro lados. `.padding(.horizontal, 16)` se aplica apenas às laterais. O React Native espelha isso com propriedades separadas.

```swift
// SwiftUI
Text("Hello")
    .padding(16)
    .padding(.horizontal, 24)
    .padding(.top, 8)
```

```tsx
const styles = StyleSheet.create({
  // Todos os quatro lados
  allSides:   { padding: 16 },

  // Atalho vertical e horizontal
  symmetric:  { paddingVertical: 12, paddingHorizontal: 24 },

  // Lados individuais
  individual: { paddingTop: 8, paddingRight: 16, paddingBottom: 8, paddingLeft: 16 },
});
```

`paddingVertical` expande para `paddingTop` + `paddingBottom`. `paddingHorizontal` expande para `paddingLeft` + `paddingRight`. Não existe um atalho único como `padding: 8px 16px` do CSS — use as propriedades explícitas.

O mesmo padrão se aplica a `margin`.

---

## frame(width:height:) — Width e Height no StyleSheet

O `.frame(width: 200, height: 48)` do SwiftUI define um tamanho exato. `.frame(maxWidth: .infinity)` faz a view preencher a largura do pai. O React Native usa os mesmos conceitos no StyleSheet.

```swift
// SwiftUI
Rectangle()
    .frame(width: 200, height: 48)

Button("Full width") { }
    .frame(maxWidth: .infinity)
```

```tsx
const styles = StyleSheet.create({
  // Tamanho exato
  fixedSize:  { width: 200, height: 48 },

  // Preenche a largura disponível — como frame(maxWidth: .infinity)
  fullWidth:  { width: '100%' },

  // Preenche o espaço restante em um container flex — como Spacer() ou maxWidth: .infinity em uma Stack
  flexible:   { flex: 1 },

  // Proporção de aspecto
  square:     { width: 100, aspectRatio: 1 },
  widescreen: { width: '100%', aspectRatio: 16 / 9 },
});
```

`width: '100%'` é uma porcentagem da largura do pai, equivalente a `frame(maxWidth: .infinity)` em uma stack de largura total. `flex: 1` é diferente: significa "ocupe uma parte do espaço restante após os filhos de tamanho fixo serem posicionados", sem equivalente direto no SwiftUI, mas lembra o `LayoutPriority` no UIKit.

---

## alignment — alignItems e alignSelf

O `VStack(alignment: .leading)` e o `HStack(alignment: .center)` do SwiftUI definem como os filhos são posicionados no eixo transversal. O React Native separa isso em duas propriedades: `alignItems` no container e `alignSelf` em filhos individuais.

```swift
// SwiftUI
VStack(alignment: .leading) {
    Text("Title")
    Text("Subtitle — left-aligned")
}
```

```tsx
// alignItems no container — afeta todos os filhos
<View style={{ alignItems: 'flex-start' }}>
  <Text>Title</Text>
  <Text>Subtitle — left-aligned</Text>
</View>
```

Valores de `alignItems`:

| Valor | Posicionamento no eixo transversal | SwiftUI |
|---|---|---|
| `'stretch'` (padrão) | Filhos preenchem o eixo transversal | `.leading` no VStack quando maxWidth: .infinity |
| `'flex-start'` | Agrupados no início do eixo transversal | `.leading` (VStack) / `.top` (HStack) |
| `'flex-end'` | Agrupados no fim do eixo transversal | `.trailing` (VStack) / `.bottom` (HStack) |
| `'center'` | Centralizados no eixo transversal | `.center` |

`alignSelf` em um filho sobrescreve o `alignItems` do container para aquele filho específico — equivalente a aplicar um modificador de alinhamento diferente a um único filho dentro de uma stack SwiftUI.

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text>Esquerda — centralizado verticalmente</Text>
  <Text style={{ alignSelf: 'flex-end' }}>Direita — alinhado na base</Text>
</View>
```

---

## GeometryReader — Dimensions API e onLayout

O `GeometryReader` do SwiftUI expõe o tamanho disponível para que os filhos possam se adaptar a ele. O React Native oferece dois mecanismos.

**Dimensions API — tamanho da tela e da janela:**

```tsx
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  halfScreen: { width: width / 2, height: height * 0.4 },
});
```

`Dimensions.get('window')` retorna a área utilizável (excluindo barras do sistema no Android). `Dimensions.get('screen')` retorna a tela física completa. Para layouts sensíveis à orientação, assine as mudanças de dimensão:

```tsx
import { Dimensions, useEffect, useState } from 'react';

const useDimensions = () => {
  const [dims, setDims] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDims(window);
    });
    return () => subscription.remove();
  }, []);

  return dims;
};
```

**onLayout — tamanho do componente em tempo de renderização:**

Para obter o tamanho de um componente específico (equivalente a ler `geometry.size` dentro de um `GeometryReader`), use a prop `onLayout`:

```tsx
import { View, useState } from 'react-native';

const AdaptiveCard = () => {
  const [cardWidth, setCardWidth] = useState(0);

  return (
    <View
      onLayout={(event) => {
        setCardWidth(event.nativeEvent.layout.width);
      }}
      style={styles.card}
    >
      <Text>O card tem {cardWidth.toFixed(0)}pt de largura</Text>
    </View>
  );
};
```

`onLayout` é disparado após a view ser medida e posicionada, fornecendo `x`, `y`, `width` e `height` no espaço de coordenadas da view pai — equivalente ao `proxy.size` e `proxy.frame(in: .local)` do `GeometryReader`.

---

## LazyVGrid — FlatList numColumns

O `LazyVGrid` do SwiftUI cria uma grade que renderiza itens de forma lazy à medida que entram na viewport. O `FlatList` do React Native com `numColumns` é o equivalente direto, com o mesmo comportamento de renderização lazy.

```swift
// SwiftUI
LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3)) {
    ForEach(photos) { photo in
        PhotoThumbnail(photo: photo)
    }
}
```

```tsx
import { FlatList, Image, StyleSheet } from 'react-native';

<FlatList
  data={photos}
  keyExtractor={(item) => item.id}
  numColumns={3}
  columnWrapperStyle={styles.row}
  renderItem={({ item }) => (
    <Image source={{ uri: item.uri }} style={styles.thumbnail} />
  )}
/>

const styles = StyleSheet.create({
  row:       { justifyContent: 'space-between', marginBottom: 4 },
  thumbnail: { width: '32%', aspectRatio: 1, borderRadius: 4 },
});
```

A propriedade `aspectRatio` — disponível desde o React Native 0.72 — elimina a necessidade de calcular alturas em pixels a partir do `Dimensions`. Ela corresponde ao `.aspectRatio(1, contentMode: .fill)` do SwiftUI.

---

## flexWrap — Quebra de Linha dos Filhos

Quando os filhos excedem o eixo principal, `flexWrap: 'wrap'` faz com que quebrem para a próxima linha, como no flexbox do CSS e diferente de qualquer primitivo de stack do SwiftUI. Isso é útil para nuvens de tags, grupos de pills e linhas flexíveis de chips.

```tsx
<View style={styles.tagRow}>
  {tags.map((tag) => (
    <View key={tag} style={styles.tag}>
      <Text style={styles.tagText}>{tag}</Text>
    </View>
  ))}
</View>

const styles = StyleSheet.create({
  tagRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:      { backgroundColor: '#e0e7ff', borderRadius: 16, paddingVertical: 4, paddingHorizontal: 12 },
  tagText:  { fontSize: 13, color: '#3730a3' },
});
```

O SwiftUI alcança um efeito similar com implementações do protocolo `Layout` ou pacotes terceiros de `FlowLayout`. O `flexWrap` do React Native é mais simples de usar.

---

## Exemplo Prático: Layout de Card

Um card de conteúdo com imagem de capa, título, subtítulo e uma linha de ações — o tipo de componente que aparece em qualquer feed ou dashboard.

```tsx
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

interface ContentCardProps {
  imageUri: string;
  title: string;
  subtitle: string;
  category: string;
  onPress: () => void;
}

const ContentCard = ({ imageUri, title, subtitle, category, onPress }: ContentCardProps) => (
  <Pressable
    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    onPress={onPress}
    accessibilityRole="button"
  >
    {/* Imagem de capa com badge de categoria sobreposto — padrão ZStack */}
    <View style={styles.imageContainer}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{category}</Text>
      </View>
    </View>

    {/* Conteúdo textual — VStack */}
    <View style={styles.body}>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card:          { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardPressed:   { opacity: 0.92 },
  imageContainer:{ width: '100%', height: 160 },
  image:         { ...StyleSheet.absoluteFillObject },
  badge:         { position: 'absolute', top: 12, left: 12, backgroundColor: '#6366f1', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText:     { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  body:          { padding: 16, gap: 6 },
  title:         { fontSize: 17, fontWeight: '700', color: '#1a1a2e', lineHeight: 24 },
  subtitle:      { fontSize: 14, color: '#6b7280' },
});
```

---

## Exemplo Prático: Barra de Navegação

Uma barra de navegação personalizada com botão de voltar à esquerda, título centralizado e uma ação à direita — equivalente ao layout de uma `NavigationBar` ou `UINavigationBar`.

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavBarProps {
  title: string;
  onBack: () => void;
  onAction: () => void;
}

const NavBar = ({ title, onBack, onAction }: NavBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {/* Botão voltar — lado esquerdo */}
        <Pressable
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.sideSlot}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Título — centralizado de forma absoluta para que as laterais não o comprimam */}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        {/* Ação — lado direito */}
        <Pressable
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          style={[styles.sideSlot, styles.right]}
        >
          <Text style={styles.actionText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#ffffff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  bar:       { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  sideSlot:  { minWidth: 60 },
  right:     { alignItems: 'flex-end' },
  title:     { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1a1a2e' },
  backText:  { fontSize: 17, color: '#6366f1' },
  actionText:{ fontSize: 17, color: '#6366f1', fontWeight: '600' },
});
```

`flex: 1` no título permite que ele preencha o espaço restante entre os dois slots laterais, e então `textAlign: 'center'` centraliza o texto dentro desse espaço. Quando ambos os slots têm o mesmo `minWidth`, o título fica no centro visual real.

---

## Exemplo Prático: Item de Lista

Um componente de linha para uma lista estilo configurações — ícone à esquerda, label e sublabel empilhados no centro, chevron à direita.

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface ListItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
}

const ListItem = ({ icon, label, sublabel, onPress }: ListItemProps) => (
  <Pressable
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    onPress={onPress}
    accessibilityRole="button"
  >
    {/* Ícone à esquerda */}
    <View style={styles.iconSlot}>{icon}</View>

    {/* Label e sublabel opcional — ocupa toda a largura restante */}
    <View style={styles.content}>
      <Text style={styles.label}>{label}</Text>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
    </View>

    {/* Chevron à direita */}
    <Text style={styles.chevron}>›</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#ffffff', gap: 12 },
  rowPressed: { backgroundColor: '#f9fafb' },
  iconSlot:   { width: 36, height: 36, borderRadius: 8, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center' },
  content:    { flex: 1, gap: 2 },
  label:      { fontSize: 16, fontWeight: '500', color: '#1a1a2e' },
  sublabel:   { fontSize: 13, color: '#9ca3af' },
  chevron:    { fontSize: 22, color: '#d1d5db', lineHeight: 24 },
});
```

`flex: 1` na `View` de conteúdo espelha `HStack { icon; VStack { label; sublabel }; Spacer(); chevron }` do SwiftUI — o conteúdo se expande para preencher o espaço entre o ícone e o chevron.

---

## Resumo das Propriedades Flexbox

| Propriedade | Valores | Finalidade |
|---|---|---|
| `flexDirection` | `'column'`, `'row'`, `'column-reverse'`, `'row-reverse'` | Direção do eixo principal |
| `justifyContent` | `'flex-start'`, `'flex-end'`, `'center'`, `'space-between'`, `'space-around'`, `'space-evenly'` | Distribuição no eixo principal |
| `alignItems` | `'stretch'`, `'flex-start'`, `'flex-end'`, `'center'`, `'baseline'` | Alinhamento no eixo transversal para todos os filhos |
| `alignSelf` | Igual ao `alignItems` | Alinhamento no eixo transversal para um filho (sobrescreve o pai) |
| `flex` | Qualquer número | Fator de crescimento para o espaço restante |
| `flexWrap` | `'nowrap'`, `'wrap'`, `'wrap-reverse'` | Se os filhos quebram para a próxima linha |
| `gap` | Número em pontos | Espaço entre filhos (substitui margens manuais) |
| `position` | `'relative'`, `'absolute'` | No fluxo vs. retirado do fluxo |

---

## Exercicios

1. Reproduza o `ZStack` com modificador `.overlay` do SwiftUI: crie uma imagem de avatar circular com um pequeno indicador verde de "online" no canto inferior direito usando `position: 'absolute'`.

2. Construa um componente de nuvem de tags usando `flexDirection: 'row'` e `flexWrap: 'wrap'` que renderize um array de strings como componentes `View` em formato de pill com `gap: 8` entre eles.

3. Use `onLayout` para construir um componente que renderize uma ou duas colunas de conteúdo dependendo de sua largura medida ser acima ou abaixo de 500 pontos — um layout responsivo simples equivalente a um `HStack` com fallback `VStack` no SwiftUI.

4. Recrie o exemplo `ContentCard` acima e, em seguida, estenda-o para exibir uma linha de até três imagens de avatar na parte inferior do card usando `flexDirection: 'row'` e `marginLeft` negativo para sobrepô-las, no estilo de uma faixa de avatares agrupados.
