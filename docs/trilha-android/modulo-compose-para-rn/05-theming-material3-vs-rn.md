---
title: "Theming: Material3 vs React Native"
sidebar_label: "Theming"
sidebar_position: 5
---

## Video Overview

> Video for this topic coming soon.

## The Problem Both Solve

Jetpack Compose's Material3 gives you a structured, token-based design system: color roles (primary, surface, onSurface…), typography scale, shape tokens, and dark mode support baked into `MaterialTheme`. All components read from these tokens automatically.

React Native has no built-in design system. The ecosystem has two dominant approaches:

1. **Custom theme via React Context** — roll your own token system with `useColorScheme` + `createContext`
2. **React Native Paper** — a Material Design 3 implementation for React Native, the closest equivalent to Compose's `MaterialTheme`

Both are legitimate. Large production apps commonly use a custom Context-based system. Teams migrating from Android and wanting Material3 parity use Paper. This file covers both.

---

## useColorScheme — Dark Mode Foundation

### Compose

```kotlin
val darkTheme = isSystemInDarkTheme()
MaterialTheme(
    colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
) {
    App()
}
```

### React Native

```tsx
import { useColorScheme } from 'react-native';

function App() {
  const colorScheme = useColorScheme(); // 'light' | 'dark' | null
  const isDark = colorScheme === 'dark';

  return (
    <ThemeProvider value={isDark ? darkTheme : lightTheme}>
      <MainNavigator />
    </ThemeProvider>
  );
}
```

`useColorScheme` reads the OS system setting — same as `isSystemInDarkTheme()` in Compose.

---

## Custom Theme System (Production Pattern)

This is the most common pattern in large React Native codebases. It mirrors the `MaterialTheme` token structure but is not tied to Material Design.

### 1. Define Tokens

```tsx
// theme/tokens.ts
export const colors = {
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  surface: '#FFFBFE',
  onSurface: '#1C1B1F',
  background: '#FFFBFE',
  error: '#B3261E',
  outline: '#79747E',
} as const;

export const darkColors: typeof colors = {
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  surface: '#1C1B1F',
  onSurface: '#E6E1E5',
  background: '#1C1B1F',
  error: '#F2B8B5',
  outline: '#938F99',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  displayLarge: { fontSize: 57, lineHeight: 64, letterSpacing: -0.25, fontWeight: '400' as const },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '400' as const },
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '400' as const },
  bodyLarge: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5, fontWeight: '400' as const },
  labelSmall: { fontSize: 11, lineHeight: 16, letterSpacing: 0.5, fontWeight: '500' as const },
} as const;

export type Colors = typeof colors;
export type Theme = {
  colors: Colors;
  spacing: typeof spacing;
  typography: typeof typography;
  isDark: boolean;
};
```

### 2. Create Context

```tsx
// theme/ThemeContext.tsx
import { createContext, useContext } from 'react';
import type { Theme } from './tokens';
import { colors, darkColors, spacing, typography } from './tokens';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext<Theme>({
  colors,
  spacing,
  typography,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const theme: Theme = {
    colors: isDark ? darkColors : colors,
    spacing,
    typography,
    isDark,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

### 3. Consume in Components

```tsx
import { useTheme } from '../theme/ThemeContext';

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, typography, spacing } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 100,
        alignItems: 'center',
      }}
    >
      <Text style={{ ...typography.labelSmall, color: colors.onPrimary }}>
        {label}
      </Text>
    </Pressable>
  );
}
```

This is the direct equivalent of:

```kotlin
@Composable
fun PrimaryButton(label: String, onClick: () -> Unit) {
    Button(onClick = onClick) {
        Text(label)
    }
}
// — where colors/typography come from MaterialTheme.colorScheme and MaterialTheme.typography
```

---

## React Native Paper — Material3 for React Native

[React Native Paper](https://reactnativepaper.com/) is the closest community equivalent to Compose's Material3. Install it:

```bash
npm install react-native-paper react-native-vector-icons
```

### Setup

```tsx
import { PaperProvider, MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';

function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={theme}>
      <MainNavigator />
    </PaperProvider>
  );
}
```

### Using Paper Components

```tsx
import { Button, Text, Card, TextInput, FAB, Chip } from 'react-native-paper';
import { useTheme } from 'react-native-paper';

function ProfileCard() {
  const theme = useTheme(); // MD3Theme — mirrors MaterialTheme

  return (
    <Card mode="elevated">
      <Card.Title title="Guilherme" subtitle="Android Engineer" />
      <Card.Content>
        <Text variant="bodyLarge">Building cross-platform with React Native</Text>
      </Card.Content>
      <Card.Actions>
        <Button mode="outlined">Cancel</Button>
        <Button mode="contained">Save</Button>
      </Card.Actions>
    </Card>
  );
}
```

### Custom Color Scheme with Material Theme Builder

Material Theme Builder generates a full MD3 color scheme. Export it as JSON, then apply:

```tsx
import { MD3LightTheme } from 'react-native-paper';

const customTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4',
    secondary: '#625B71',
    tertiary: '#7D5260',
    // ... all generated tokens
  },
};
```

[Use the Material Theme Builder](https://m3.material.io/theme-builder)

---

## Typography Scale: MaterialTheme.typography → Text variant

### Compose

```kotlin
Text("Display Large", style = MaterialTheme.typography.displayLarge)
Text("Body Large", style = MaterialTheme.typography.bodyLarge)
```

### React Native Paper

```tsx
<Text variant="displayLarge">Display Large</Text>
<Text variant="bodyLarge">Body Large</Text>
```

### Custom system (no Paper)

```tsx
const { typography } = useTheme();
<Text style={typography.bodyLarge}>Body Large</Text>
```

---

## Shape Tokens

Compose's `MaterialTheme.shapes` (small, medium, large, extraLarge, full) maps to `borderRadius` in React Native.

| Compose shape token    | Typical borderRadius in RN |
|------------------------|----------------------------|
| `shapes.extraSmall`    | `4`                        |
| `shapes.small`         | `8`                        |
| `shapes.medium`        | `12`                       |
| `shapes.large`         | `16`                       |
| `shapes.extraLarge`    | `28`                       |
| `shapes.full`          | `borderRadius: 1000` (pill)|

Add these to your token file for consistency:

```tsx
export const shape = {
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 1000,
} as const;
```

---

## Dynamic Color / Monet

Compose on Android 12+ can pull wallpaper-based dynamic colors with `dynamicDarkColorScheme` / `dynamicLightColorScheme`. React Native Paper supports this too via `@pchmn/expo-material3-theme` (Expo) or by reading Material You tokens via a TurboModule (advanced).

```tsx
// Expo — dynamic color (Material You)
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';

function App() {
  const colorScheme = useColorScheme();
  const { theme } = useMaterial3Theme();

  const paperTheme =
    colorScheme === 'dark'
      ? { ...MD3DarkTheme, colors: theme.dark }
      : { ...MD3LightTheme, colors: theme.light };

  return (
    <PaperProvider theme={paperTheme}>
      <MainNavigator />
    </PaperProvider>
  );
}
```

This is the React Native equivalent of:

```kotlin
val dynamicColor = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
val colorScheme = when {
    dynamicColor && darkTheme -> dynamicDarkColorScheme(context)
    dynamicColor && !darkTheme -> dynamicLightColorScheme(context)
    darkTheme -> DarkColorScheme
    else -> LightColorScheme
}
```

---

## Navigation + Paper: Combining Both

When using React Navigation alongside React Native Paper, synchronize their themes to avoid a mismatched background/surface on screens:

```tsx
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { adaptNavigationTheme, PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';

const { LightTheme: NavLight, DarkTheme: NavDark } = adaptNavigationTheme({
  reactNavigationLight: DefaultTheme,
  reactNavigationDark: DarkTheme,
});

function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  const navTheme = isDark ? NavDark : NavLight;

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navTheme}>
        <MainNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}
```

---

## Interactive Example

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@callstack/react-native-paper-example)

---

## Study Materials

### Official Documentation

- [React Native Paper — Getting Started](https://callstack.github.io/react-native-paper/docs/guides/getting-started)
- [React Native Paper — Theming](https://callstack.github.io/react-native-paper/docs/guides/theming)
- [React Native — useColorScheme](https://reactnative.dev/docs/usecolorscheme)
- [React Native — Appearance](https://reactnative.dev/docs/appearance)
- [Material Theme Builder](https://m3.material.io/theme-builder)
- [Compose — Material Theming](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Compose — Dark Theme](https://developer.android.com/develop/ui/compose/designsystems/material3#dark-theme)

### Packages

- [react-native-paper](https://github.com/callstack/react-native-paper) — Material Design 3 components
- [@pchmn/expo-material3-theme](https://github.com/pchmn/expo-material3-theme) — Dynamic Color / Material You for Expo

### Videos

- [Callstack — React Native Paper v5](https://www.youtube.com/watch?v=K0LKBx4_EKk)
- [Google — Material You on Android](https://www.youtube.com/watch?v=lyH5MFxPKjQ)
- [Theo (t3.gg) — Styling in React Native](https://www.youtube.com/watch?v=1Ur4UMfBObs)

---

## Module Summary

You have completed the Compose → React Native module. Here is what you mapped:

| Compose                          | React Native                                   |
|----------------------------------|------------------------------------------------|
| `@Composable` function           | Function component returning JSX               |
| `remember { mutableStateOf() }`  | `useState()`                                   |
| `remember { }`                   | `useRef()`                                     |
| `LaunchedEffect(key)`            | `useEffect(() => {}, [key])`                   |
| `derivedStateOf`                 | `useMemo()`                                    |
| `CompositionLocal`               | React Context + `useContext()`                 |
| `Column` / `Row` / `Box`         | `View` with Flexbox                            |
| `Modifier`                       | `style` prop                                   |
| `NavController` + `NavHost`      | `useNavigation()` + `NavigationContainer`      |
| `MaterialTheme.colorScheme`      | Theme Context or React Native Paper            |
| `MaterialTheme.typography`       | Token-based typography from theme              |
| `isSystemInDarkTheme()`          | `useColorScheme()`                             |

The next module covers the New Architecture: how Hermes, JSI, TurboModules, and Fabric work on Android — and how to write a real Kotlin TurboModule backed by Codegen.
