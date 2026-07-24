---
title: "Styling in React Native"
sidebar_label: "Styling"
sidebar_position: 4
---

## Video Overview

> Video for this topic coming soon.

## No XML, No CSS Files

In Android you write layout XML with attributes like `android:textColor`, `android:padding`, `android:background`. In React Native there are no XML files and no CSS — styles are JavaScript objects.

Every component accepts a `style` prop. The properties are camelCase versions of CSS properties, with values in density-independent logical pixels (not `dp` or `sp` — just plain numbers).

---

## StyleSheet.create — The Standard Pattern

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

`StyleSheet.create` does two things: provides TypeScript type-checking for style properties, and optimises the styles by sending them to the native layer once at module load (not on every render).

---

## Units: No dp, No sp

React Native uses a single unitless number system. All values are in **logical pixels** — equivalent to Android's `dp`. The framework handles the density conversion automatically.

```tsx
// Android XML
// android:padding="16dp"
// android:textSize="16sp"

// React Native
paddingHorizontal: 16,  // equivalent to 16dp
fontSize: 16,           // equivalent to 16sp (roughly)
```

For dynamic sizing based on screen dimensions:

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

## Combining Styles: Arrays

Pass an array to `style` to merge multiple style objects. Later entries override earlier ones — equivalent to Kotlin's `copy()` on a style object.

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

The `false` / `null` / `undefined` values in the array are safely ignored — no need to filter them out.

---

## Text Styling

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

## Borders

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

## Shadows

Android and iOS use different shadow APIs. Both must be set for cross-platform support:

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

## Platform-Specific Styles

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

### Platform-specific files

For larger differences, create separate files:

```
Button.android.tsx   ← loaded on Android
Button.ios.tsx       ← loaded on iOS
```

React Native's bundler picks the right file automatically.

---

## Dynamic Styles: Theming Pattern

Combine `StyleSheet.create` with a theme hook for dynamic dark/light mode:

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

> For performance, move `StyleSheet.create` outside the component (or memoize it) if the theme does not change frequently. Calling `StyleSheet.create` inside a function body creates a new style object on every render.

---

## Overflow, Clipping, and zIndex

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

## Transforms

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

For animations, use `Animated.Value` or the `react-native-reanimated` library (covered in the Performance module).

---

## StyleSheet vs Inline Styles

```tsx
// Inline — creates a new object on every render, no optimisation
<View style={{ padding: 16, backgroundColor: '#fff' }} />

// StyleSheet.create — optimised, type-checked, defined once
<View style={styles.card} />
```

Use `StyleSheet.create` for all static styles. Use inline styles only for values computed at render time (e.g. dynamic width from `useWindowDimensions`).

---

## Interactive Example

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/style)

---

## Study Materials

### Official Documentation

- [React Native — Style](https://reactnative.dev/docs/style)
- [React Native — StyleSheet](https://reactnative.dev/docs/stylesheet)
- [React Native — Colors](https://reactnative.dev/docs/colors)
- [React Native — Transforms](https://reactnative.dev/docs/transforms)
- [React Native — Shadow Props](https://reactnative.dev/docs/shadow-props)

### Videos

- [William Candillon — React Native Styling](https://www.youtube.com/watch?v=06pBTnDf9B4)

---

## What's Next

You can build and style components. Last topic in fundamentals: state management and data fetching — Zustand, TanStack Query, and MMKV, all mapped from Android's ViewModel and Repository patterns.

➡ [State & APIs](./05-state-and-apis)
