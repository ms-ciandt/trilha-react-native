---
title: "Estilização no React Native"
sidebar_label: "Estilização"
sidebar_position: 4
---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_android/fund_04_styling_stylesheet.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Video Overview

> Vídeo para este tópico em breve.

## Sem XML, Sem Arquivos CSS

No Android você escreve XML de layout com atributos como `android:textColor`, `android:padding`, `android:background`. No React Native não há arquivos XML nem CSS — os estilos são objetos JavaScript.

Todo componente aceita uma prop `style`. As propriedades são versões camelCase das propriedades CSS, com valores em pixels lógicos independentes de densidade (não `dp` ou `sp` — apenas números simples).

---

## StyleSheet.create — O Padrão Recomendado

```tsx
import { View, Text, StyleSheet } from 'react-native';

function Card({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',       // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,              // Android shadow
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
});
```

`StyleSheet.create` faz duas coisas: fornece verificação de tipos TypeScript para as propriedades de estilo e otimiza os estilos enviando-os para a camada nativa uma única vez ao carregar o módulo (e não a cada renderização).

---

## Unidades: Sem dp, Sem sp

O React Native usa um sistema de números sem unidade. Todos os valores estão em **pixels lógicos** — equivalente ao `dp` do Android. O framework realiza a conversão de densidade automaticamente.

```tsx
// Android XML
// android:padding="16dp"
// android:textSize="16sp"

// React Native
paddingHorizontal: 16,  // equivalent to 16dp
fontSize: 16,           // equivalent to 16sp (roughly)
```

Para dimensionamento dinâmico com base nas dimensões da tela:

```tsx
import { Dimensions, useWindowDimensions } from 'react-native';

// Static — does not update on rotation
const { width, height } = Dimensions.get('window');

// Dynamic — updates on orientation change (preferred)
function ResponsiveBox() {
  const { width } = useWindowDimensions();
  return <View style={{ width: width * 0.9, height: 200 }} />;
}
```

---

## Combinando Estilos: Arrays

Passe um array para `style` para mesclar múltiplos objetos de estilo. Entradas posteriores sobrescrevem as anteriores — equivalente ao `copy()` do Kotlin em um objeto de estilo.

```tsx
function Button({ primary, disabled }: { primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      style={[
        styles.base,
        primary && styles.primary,
        disabled && styles.disabled,
      ]}
    >
      <Text>Click</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base:     { borderRadius: 8, padding: 14, alignItems: 'center' },
  primary:  { backgroundColor: '#6750A4' },
  disabled: { opacity: 0.4 },
});
```

Os valores `false` / `null` / `undefined` no array são ignorados com segurança — não é necessário filtrá-los.

---

## Estilização de Texto

```tsx
const styles = StyleSheet.create({
  // Font
  body: {
    fontFamily: 'Roboto',       // must be bundled in the app
    fontSize: 16,
    fontWeight: '400',           // '100' to '900' as strings, or 'bold'
    fontStyle: 'italic',
    lineHeight: 24,
    letterSpacing: 0.5,
  },

  // Colour and decoration
  link: {
    color: '#6750A4',
    textDecorationLine: 'underline',
  },

  // Alignment
  centered: {
    textAlign: 'center',         // 'left' | 'right' | 'center' | 'justify'
    textAlignVertical: 'center', // Android only
  },

  // Transform
  upper: {
    textTransform: 'uppercase',  // 'uppercase' | 'lowercase' | 'capitalize'
  },
});
```

---

## Bordas

```tsx
const styles = StyleSheet.create({
  // All sides
  outlined: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },

  // Individual sides
  bottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  // Individual corners
  topRounded: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  // Circle
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,            // half of width/height
  },
});
```

---

## Sombras

Android e iOS usam APIs de sombra diferentes. Ambas devem ser definidas para suporte multiplataforma:

```tsx
const styles = StyleSheet.create({
  card: {
    // Android — uses elevation
    elevation: 4,

    // iOS — requires all four properties
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,

    // Required for shadow to show on Android
    backgroundColor: '#fff',
  },
});
```

---

## Estilos Específicos por Plataforma

### Platform.OS

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? 24 : 0,
    backgroundColor: Platform.select({
      android: '#6750A4',
      ios: '#fff',
      default: '#fff',
    }),
  },
});
```

### Platform.select

```tsx
const style = Platform.select({
  android: { fontFamily: 'Roboto' },
  ios:     { fontFamily: 'San Francisco' },
  default: { fontFamily: 'System' },
});
```

### Arquivos específicos por plataforma

Para diferenças maiores, crie arquivos separados:

```
Button.android.tsx   ← loaded on Android
Button.ios.tsx       ← loaded on iOS
```

O bundler do React Native escolhe o arquivo correto automaticamente.

---

## Estilos Dinâmicos: Padrão de Temas

Combine `StyleSheet.create` com um hook de tema para modo claro/escuro dinâmico:

```tsx
import { StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

function ThemedCard() {
  const { colors, spacing } = useTheme();

  // StyleSheet with runtime values from theme
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
    },
    title: {
      color: colors.onSurface,
      fontSize: 18,
      fontWeight: '700',
    },
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Themed Card</Text>
    </View>
  );
}
```

> Para melhor desempenho, mova o `StyleSheet.create` para fora do componente (ou memorize-o) se o tema não mudar com frequência. Chamar `StyleSheet.create` dentro de um corpo de função cria um novo objeto de estilo a cada renderização.

---

## Overflow, Clipping e zIndex

```tsx
const styles = StyleSheet.create({
  clipped: {
    overflow: 'hidden',   // clips children to the view's bounds — like clipToPadding
  },

  onTop: {
    zIndex: 10,           // equivalent to View.setTranslationZ() / elevation for ordering
    elevation: 10,        // Android: also needed for z-ordering with shadows
  },
});
```

---

## Transformações

```tsx
const styles = StyleSheet.create({
  rotated: {
    transform: [{ rotate: '45deg' }],
  },
  scaled: {
    transform: [{ scale: 1.2 }],
  },
  translated: {
    transform: [{ translateX: 20 }, { translateY: -10 }],
  },
  combined: {
    transform: [{ rotate: '10deg' }, { scale: 0.9 }],
  },
});
```

Para animações, use `Animated.Value` ou a biblioteca `react-native-reanimated` (abordada no módulo de Performance).

---

## StyleSheet vs Estilos Inline

```tsx
// Inline — creates a new object on every render, no optimisation
<View style={{ padding: 16, backgroundColor: '#fff' }} />

// StyleSheet.create — optimised, type-checked, defined once
<View style={styles.card} />
```

Use `StyleSheet.create` para todos os estilos estáticos. Use estilos inline apenas para valores calculados em tempo de renderização (ex.: largura dinâmica via `useWindowDimensions`).

---

## Exemplo Interativo

---

## Material de Estudo

### Documentação Oficial

- [React Native — Style](https://reactnative.dev/docs/style)
- [React Native — StyleSheet](https://reactnative.dev/docs/stylesheet)
- [React Native — Colors](https://reactnative.dev/docs/colors)
- [React Native — Transforms](https://reactnative.dev/docs/transforms)
- [React Native — Shadow Props](https://reactnative.dev/docs/shadow-props)

### Vídeos

- [William Candillon — React Native Styling](https://www.youtube.com/watch?v=06pBTnDf9B4)

---

## O Que Vem a Seguir

Você já sabe construir e estilizar componentes. Último tópico dos fundamentos: gerenciamento de estado e busca de dados — Zustand, TanStack Query e MMKV, todos mapeados a partir dos padrões ViewModel e Repository do Android.

➡ [Estado & APIs](./05-state-and-apis)
