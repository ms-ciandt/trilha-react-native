---
title: Styling in React Native
---

# Styling in React Native

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo/fund_08_styling.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> React Native uses JavaScript objects for styling — no CSS files, no class names. But the properties are familiar if you know CSS or Android XML.

## How Styling Works

```tsx
// Every component accepts a `style` prop
// Styles are plain JS objects (or arrays of objects)
<View style={{ backgroundColor: '#fff', padding: 16 }}>
    <Text style={{ fontSize: 16, color: '#333' }}>Hello</Text>
</View>
```

Property names are **camelCase** (like JavaScript, not kebab-case like CSS):

| CSS / Android XML | React Native |
|-------------------|--------------|
| `background-color` / `android:background` | `backgroundColor` |
| `font-size` / `android:textSize` | `fontSize` |
| `border-radius` | `borderRadius` |
| `padding-horizontal` | `paddingHorizontal` |
| `font-weight` | `fontWeight` |

---

## `StyleSheet.create`

The preferred way to define styles — provides type checking, optimization, and IDE autocomplete:

```tsx
import { StyleSheet, View, Text } from 'react-native';

function Card({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        // Shadow (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        // Shadow (Android)
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
});
```

---

## Dynamic Styles

```tsx
// Conditional styles using arrays
<View style={[
    styles.button,
    isDisabled && styles.buttonDisabled,
    variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
]} />

// Styles based on props — inline or computed
<Text style={{ color: isError ? '#ef4444' : '#111' }}>
    {message}
</Text>

// Computed style object — return a plain object, NOT StyleSheet.create()
// StyleSheet.create must be called at module level, not inside functions
function getButtonStyle(variant: 'primary' | 'secondary', size: 'sm' | 'md' | 'lg') {
    return {
        backgroundColor: variant === 'primary' ? '#0064d2' : 'transparent',
        paddingVertical: size === 'sm' ? 6 : size === 'md' ? 10 : 14,
        paddingHorizontal: size === 'sm' ? 12 : size === 'md' ? 16 : 24,
    };
}
```

---

## Platform-Specific Styles

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    header: {
        paddingTop: Platform.select({
            ios: 44,       // iOS status bar height
            android: 24,   // Android status bar height
            default: 0,
        }),
        // Or for simple two-way:
        backgroundColor: Platform.OS === 'ios' ? '#f2f2f7' : '#ffffff',
    },
    shadow: {
        // iOS uses shadow properties
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        // Android uses elevation
        elevation: 3,
    },
});
```

---

## Typography

```tsx
const styles = StyleSheet.create({
    heading1: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
        lineHeight: 34,
    },
    body: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,     // 1.5x line height
        color: '#374151',
    },
    caption: {
        fontSize: 12,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    link: {
        color: '#0064d2',
        textDecorationLine: 'underline',
    },
});
```

**Custom fonts** — load them at app startup:
```tsx
// Using Expo Font
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

export default function App() {
    const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_700Bold });
    if (!fontsLoaded) return <SplashScreen />;
    return <Navigation />;
}
```

---

## Colors

RN supports the same color formats as CSS:

```tsx
const colors = {
    hex: '#0064d2',
    hexAlpha: '#0064d280',   // 50% opacity
    rgb: 'rgb(0, 100, 210)',
    rgba: 'rgba(0, 100, 210, 0.5)',
    hsl: 'hsl(210, 100%, 41%)',
    named: 'cornflowerblue', // CSS color names work too
    transparent: 'transparent',
};
```

Best practice: define a **theme constants file**:

```typescript
// theme.ts
export const colors = {
    primary: '#0064d2',
    primaryDark: '#0050a8',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    border: '#e5e7eb',
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;
```

---

## Borders

```tsx
const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,

        // Individual border sides
        borderTopWidth: 2,
        borderTopColor: '#0064d2',

        // Individual corner radius
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
});
```

---

## Transforms

```tsx
<View style={{
    transform: [
        { rotate: '45deg' },
        { scale: 1.2 },
        { translateX: 10 },
        { translateY: -5 },
    ],
}} />
```

---

## Themed Styling with Context

For dark mode / dynamic theming, combine a theme context with `StyleSheet`:

```tsx
// hooks/useThemeStyles.ts
import { useColorScheme } from 'react-native';

export function useColors() {
    const scheme = useColorScheme(); // 'light' | 'dark' | null
    return scheme === 'dark' ? darkColors : lightColors;
}

const lightColors = { background: '#ffffff', text: '#111827' };
const darkColors  = { background: '#111827', text: '#f9fafb' };

// Usage
function MyScreen() {
    const colors = useColors();
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Text style={{ color: colors.text }}>Hello</Text>
        </View>
    );
}
```

---

## Exercises

1. **Build a themed `Button` component** that accepts `variant: 'primary' | 'secondary' | 'danger'` and `size: 'sm' | 'md' | 'lg'`. Use `StyleSheet.create` at module level for the base styles, and a plain object for the dynamic variant/size values. Combine them with the style array pattern.

2. **Implement dark mode** using `useColorScheme`. Create a `theme.ts` with `lightColors` and `darkColors` objects. Build a `useColors()` hook that returns the correct set, and apply it to a screen with a card, a heading, and some body text.

3. **Replicate a native shadow card**: a white card with iOS shadow properties (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) AND Android `elevation`. Verify the card looks correct on both platforms (or in the iOS and Android simulators separately in Expo Go).

---

## Resources

| Resource | Type | Link |
|---|---|---|
| RN StyleSheet API | Official Docs | [reactnative.dev/docs/stylesheet](https://reactnative.dev/docs/stylesheet) |
| RN View Style Props | Official Docs | [reactnative.dev/docs/view-style-props](https://reactnative.dev/docs/view-style-props) |
| RN Text Style Props | Official Docs | [reactnative.dev/docs/text-style-props](https://reactnative.dev/docs/text-style-props) |
| Expo Google Fonts | Expo | [docs.expo.dev/develop/user-interface/fonts/](https://docs.expo.dev/develop/user-interface/fonts/) |

---