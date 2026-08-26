---
title: Styling — StyleSheet, Platform and Shadows
---

# Styling — StyleSheet, Platform and Shadows

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/fund_08_styling.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/fund_08_styling_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

React Native's styling system has a different philosophy from traditional CSS and SwiftUI. There is no cascading style inheritance, no class selectors, and all layout uses Flexbox by default. For a Swift developer, the closest analogy is creating a `ViewModifier` for each component — isolated, explicit, and with no side effects on other components.

---

## SwiftUI ViewModifier → StyleSheet.create()

In SwiftUI you chain modifiers directly on the view:

```swift
Text("Hello")
    .font(.headline)
    .foregroundColor(.blue)
    .padding(16)
    .background(Color.white)
    .cornerRadius(8)
```

In React Native you define styles in an object and apply them via the `style` prop:

```tsx
import { Text, View, StyleSheet } from 'react-native';

export default function Card() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});
```

`StyleSheet.create()` is not mandatory — you can pass object literals — but it validates properties in development and allows the runtime to optimize sending styles to the native thread. Always prefer using it.

---

## UIColor / SwiftUI Color → Color formats in RN

React Native accepts four color formats in any property that expects a color:

| Format | Example |
|---|---|
| Hexadecimal | `'#007AFF'` |
| Hex with alpha | `'#007AFF99'` |
| `rgba()` | `'rgba(0, 122, 255, 0.6)'` |
| Named colors (CSS) | `'tomato'`, `'dodgerblue'` |

```tsx
const styles = StyleSheet.create({
  primary: { color: '#007AFF' },
  secondary: { color: 'rgba(0, 122, 255, 0.6)' },
  background: { backgroundColor: '#F2F2F7' },
  border: { borderColor: '#C6C6C8' },
});
```

There is no `Color` type as in Swift. Everything is a string. In more robust TypeScript projects, it is common to create typed constants:

```ts
export const Colors = {
  blue: '#007AFF' as const,
  gray: '#8E8E93' as const,
  background: '#F2F2F7' as const,
} satisfies Record<string, string>;
```

---

## UIKit Appearance API → Global styles with theme

In UIKit you use `UIAppearance` to define global styles:

```swift
UINavigationBar.appearance().tintColor = .systemBlue
UILabel.appearance().font = UIFont.systemFont(ofSize: 17)
```

React Native has no built-in global appearance mechanism equivalent. The standard approach is to create a theme module and import it where needed:

```ts
// theme.ts
export const theme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    text: '#1C1C1E',
    secondaryText: '#8E8E93',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    separator: '#C6C6C8',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const },
    title1: { fontSize: 28, fontWeight: '700' as const },
    headline: { fontSize: 17, fontWeight: '600' as const },
    body: { fontSize: 17, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
  },
};
```

Components consume the theme by importing it directly or via Context:

```tsx
import { theme } from '../theme';

const styles = StyleSheet.create({
  title: {
    ...theme.typography.headline,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
});
```

---

## Dynamic Type → accessibilityFontScale

On iOS, Dynamic Type respects the system font size preference. React Native does not scale fonts automatically — by default, `Text` has `allowFontScaling={true}`, which respects the device's accessibility setting.

To control this behavior:

```tsx
// Respects accessibility (default)
<Text style={styles.body}>Content</Text>

// Disables scaling (use with caution)
<Text allowFontScaling={false} style={styles.label}>Label</Text>

// Sets a maximum scale limit
<Text maxFontSizeMultiplier={1.5} style={styles.body}>Content</Text>
```

To replicate Dynamic Type behavior with semantic sizes, use `PixelRatio`:

```tsx
import { PixelRatio } from 'react-native';

const scale = PixelRatio.getFontScale();

const styles = StyleSheet.create({
  body: {
    fontSize: 17 * Math.min(scale, 1.5),
  },
});
```

---

## Dark Mode: @Environment(.colorScheme) → useColorScheme()

In SwiftUI you read the color scheme via environment:

```swift
@Environment(\.colorScheme) var colorScheme

var body: some View {
    Text("Hello")
        .foregroundColor(colorScheme == .dark ? .white : .black)
}
```

In React Native, the equivalent hook is `useColorScheme()`:

```tsx
import { useColorScheme, View, Text, StyleSheet } from 'react-native';

export default function ExampleScreen() {
  const scheme = useColorScheme(); // 'light' | 'dark' | null

  const dynamicStyles = {
    container: {
      backgroundColor: scheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
    },
    text: {
      color: scheme === 'dark' ? '#FFFFFF' : '#1C1C1E',
    },
  };

  return (
    <View style={[styles.base, dynamicStyles.container]}>
      <Text style={[styles.text, dynamicStyles.text]}>Current mode: {scheme}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    padding: 16,
  },
  text: {
    fontSize: 17,
  },
});
```

For larger projects, the recommended pattern is to encapsulate the theme in a Context that resolves dark mode internally:

```tsx
import { useColorScheme } from 'react-native';
import { createContext, useContext } from 'react';
import { lightTheme, darkTheme } from './themes';

const ThemeContext = createContext(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
```

---

## Platform.OS and Platform.select()

For platform-specific styles, use `Platform`:

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
  },
  shadow: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
});
```

`Platform.select()` receives an object with keys `'ios'`, `'android'`, `'web'` and `'default'`, and returns the value corresponding to the current platform. It is type-safe and more readable than multiple `if (Platform.OS === ...)` checks.

---

## Shadows: UIView.layer.shadow* → RN iOS/Android

In UIKit, shadows are configured via `CALayer`:

```swift
view.layer.shadowColor = UIColor.black.cgColor
view.layer.shadowOffset = CGSize(width: 0, height: 2)
view.layer.shadowOpacity = 0.15
view.layer.shadowRadius = 4
```

In React Native, the mapping is almost direct for iOS:

```tsx
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,

    // iOS — maps directly to CALayer
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
```

On Android, shadows work with the `elevation` property (Material Design):

```tsx
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,

    // Android — elevation creates shadow + ripple area
    elevation: 4,

    // iOS will ignore elevation; Android will ignore shadow*
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
```

For cross-platform shadows without repetition, use `Platform.select()`:

```tsx
const shadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  android: {
    elevation: 4,
  },
}) ?? {};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...shadow,
  },
});
```

---

## SwiftUI .font() → fontFamily / fontSize / fontWeight

In SwiftUI:

```swift
Text("Title")
    .font(.system(size: 28, weight: .bold, design: .rounded))
```

In React Native, typography is controlled by `Text` style properties:

```tsx
const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',      // '100' to '900' or 'bold'/'normal'
    fontStyle: 'normal',    // 'normal' | 'italic'
    letterSpacing: 0.5,
    lineHeight: 36,
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
  },
});
```

---

## Custom fonts: UIFont vs fontFamily

On iOS with UIKit, you register the font in `Info.plist` and use `UIFont(name:size:)`. In React Native the process is similar — the font needs to be linked in the native project and then referenced by its exact name:

With Expo:

```json
// app.json
{
  "expo": {
    "fonts": ["./assets/fonts/Inter-Regular.ttf"]
  }
}
```

```tsx
import { useFonts } from 'expo-font';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return <HomeScreen />;
}
```

```tsx
const styles = StyleSheet.create({
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 17,
  },
});
```

The name used in `fontFamily` must be exactly the name with which the font was registered in `useFonts`, not the filename.

---

## StyleSheet.flatten

When you compose styles via arrays, `StyleSheet.flatten()` resolves the array into a single object — useful for introspection or passing styles to libraries that expect a plain object:

```tsx
const baseStyle = StyleSheet.create({
  text: { fontSize: 17, color: '#1C1C1E' },
});

const highlightStyle = { fontWeight: '700' as const };

// Array of styles (last one overrides previous ones)
<Text style={[baseStyle.text, highlightStyle]}>Highlight</Text>

// Resolving to a plain object
const resolvedStyle = StyleSheet.flatten([baseStyle.text, highlightStyle]);
// { fontSize: 17, color: '#1C1C1E', fontWeight: '700' }
```

---

## Dynamic styles from state

In SwiftUI, the view re-renders automatically when state changes. In React Native, the same happens — you use state to compute inline styles or combine classes via array:

```tsx
import { useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export default function ToggleButton() {
  const [active, setActive] = useState(false);

  return (
    <Pressable
      onPress={() => setActive(v => !v)}
      style={[styles.button, active && styles.buttonActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>
        {active ? 'Active' : 'Inactive'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8E8E93',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
```

For styles that depend on numeric values (progress, position), use inline objects:

```tsx
<View style={[styles.bar, { width: `${progress}%` }]} />
```

---

## Alternatives: styled-components and NativeWind

For teams coming from React web or that prefer a different syntax, there are two popular alternatives to the native `StyleSheet`:

**styled-components/native** — same API as web styled-components, adapted for React Native:

```tsx
import styled from 'styled-components/native';

const Card = styled.View`
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  shadow-color: #000000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.12;
  shadow-radius: 8px;
`;

const Title = styled.Text`
  font-size: 17px;
  font-weight: 600;
  color: #1c1c1e;
`;
```

**NativeWind** — Tailwind CSS for React Native. Uses utility classes instead of style objects:

```tsx
import { View, Text } from 'react-native';

export default function Card() {
  return (
    <View className="bg-white rounded-xl p-4 shadow-md">
      <Text className="text-lg font-semibold text-gray-900">Title</Text>
    </View>
  );
}
```

Both approaches are valid, but the native `StyleSheet` remains the default choice for new projects — it offers better performance in render-intensive cases and requires no additional dependencies.

---

## Comparison Summary

| Swift / SwiftUI | React Native |
|---|---|
| `.modifier(ViewModifier)` | `style={styles.class}` |
| `UIColor`, `Color` | hex / rgba / named string |
| `UIAppearance` | theme module + Context |
| `Dynamic Type` | `allowFontScaling`, `maxFontSizeMultiplier` |
| `@Environment(.colorScheme)` | `useColorScheme()` |
| `UIView.layer.shadow*` | `shadowColor/Offset/Opacity/Radius` (iOS) |
| `UIView.elevation` (Material) | `elevation` (Android) |
| `.font(.system(size:weight:))` | `fontSize`, `fontWeight`, `fontFamily` |
| `UIFont(name:size:)` | `fontFamily` + `useFonts()` |
