---
id: styling-and-flexbox
title: Styling & Flexbox for Web Developers
sidebar_label: Styling & Flexbox
sidebar_position: 6
---

# Styling & Flexbox for Web Developers

> Your CSS knowledge transfers directly to React Native's Flexbox. The main differences are default values and the absence of web-only properties.

## What Changes from CSS

### Property Names — camelCase

{% raw %}
```css
/* CSS */
background-color: #fff;
font-size: 16px;
border-radius: 8px;
padding-horizontal: 16px;  /* doesn't exist in CSS */
```
{% endraw %}

{% raw %}
```typescript
// React Native StyleSheet
backgroundColor: '#fff',   // camelCase, no hyphens
fontSize: 16,              // no 'px' unit — numbers are device-independent pixels
borderRadius: 8,
paddingHorizontal: 16,     // RN shorthand (= paddingLeft + paddingRight)
```
{% endraw %}

### No Units

{% raw %}
```typescript
// All values are unitless numbers = density-independent pixels
// Equivalent to CSS px on 1x screens; scales automatically on 2x/3x screens
fontSize: 16,       // NOT '16px', NOT '1rem'
padding: 16,        // NOT '16px'
borderRadius: 8,    // NOT '8px'
width: 200,         // fixed width in dp
width: '100%',      // percentage strings ARE supported for some properties
```
{% endraw %}

### Flexbox Default is Column

{% raw %}
```typescript
// CSS Flexbox default:    flexDirection: 'row'
// React Native default:   flexDirection: 'column'

// To get a horizontal row in RN (like a horizontal flex div):
<View style={{ flexDirection: 'row' }}>
```
{% endraw %}

---

## Flexbox Cheat Sheet (RN-Specific)

{% raw %}
```typescript
// Container properties
flexDirection: 'column' | 'row' | 'column-reverse' | 'row-reverse'
justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
alignContent: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around'
flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'
gap: 8               // RN 0.71+ — gap between items (like CSS gap)
rowGap: 8
columnGap: 8

// Child properties
flex: 1              // grow and fill available space (simplified vs CSS flex shorthand)
flexGrow: 1          // how much to grow
flexShrink: 1        // how much to shrink
flexBasis: 'auto' | 100  // initial size before grow/shrink
alignSelf: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch'
```
{% endraw %}

---

## The Two Most Common Patterns

### 1. Fill the Screen

{% raw %}
```tsx
// Make a component fill all available space (like height: 100vh in CSS)
<View style={{ flex: 1 }}>
    {/* fills the screen */}
</View>
```
{% endraw %}

### 2. Center Content

{% raw %}
```tsx
// Center horizontally and vertically (like CSS flexbox centering)
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Centered!</Text>
</View>
```
{% endraw %}

---

## Interactive Practice

The same Flexbox model you already know from web CSS works in RN:

🐸 **[Play Flexbox Froggy](https://flexboxfroggy.com/)** — 24 interactive levels. Every concept you learn here applies directly in RN.

---

## Shadow and Elevation

CSS `box-shadow` splits into two in RN — and they behave very differently per platform:

{% raw %}
```typescript
const styles = StyleSheet.create({
    card: {
        // iOS shadow — all four properties are required together
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,

        // Android shadow — elevation only. The four iOS properties above are
        // silently ignored on Android. Android shadow color cannot be customized
        // via core StyleSheet (always renders as system grey).
        elevation: 3,
    },
});
```
{% endraw %}

:::note Android shadow limitation
To get a custom-colored shadow on Android, use a solid-color View as a backdrop or the community library `react-native-shadow-2`.
:::

---

## Transforms

Same as CSS transforms, but written as an array of objects inside the style prop:

{% raw %}
```tsx
// CSS: transform: translateX(10px) rotate(45deg) scale(1.2);

// React Native — array of single-key objects:
<View style={{
    transform: [
        { translateX: 10 },
        { rotate: '45deg' },
        { scale: 1.2 },
    ],
}} />
```
{% endraw %}

---

## Responsive Design Without Media Queries

{% raw %}
```tsx
import { useWindowDimensions } from 'react-native';

function ResponsiveLayout() {
    const { width } = useWindowDimensions();

    // Breakpoints in JS
    const isTablet = width >= 768;
    const isLargeTablet = width >= 1024;

    return (
        <View style={[
            styles.container,
            isTablet && styles.containerTablet,
        ]}>
            <View style={{ width: isTablet ? width * 0.4 : '100%' }}>
                <Sidebar />
            </View>
            {isTablet && (
                <View style={{ flex: 1 }}>
                    <MainContent />
                </View>
            )}
        </View>
    );
}
```
{% endraw %}

---

## NativeWind — Tailwind in React Native

If you live in Tailwind on the web, **NativeWind** brings the same utility classes to RN:

:::warning NativeWind v4 requires several config steps
The install command alone won't work — styles will appear to compile but never apply (silent failure).
:::

**1. Install packages**
{% raw %}
```bash
npx expo install nativewind tailwindcss
```
{% endraw %}

**2. Initialize Tailwind**
{% raw %}
```bash
npx tailwindcss init
```
{% endraw %}

**3. Configure `tailwind.config.js`**
{% raw %}
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```
{% endraw %}

**4. Create `global.css`**
{% raw %}
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
{% endraw %}

**5. Update `babel.config.js`**
{% raw %}
```js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: ['nativewind/babel'],
    };
};
```
{% endraw %}

**6. Update `metro.config.js`**
{% raw %}
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```
{% endraw %}

**7. Import `global.css` in your root `_layout.tsx`**
{% raw %}
```tsx
import '../global.css';
```
{% endraw %}

Now the Tailwind classes work:

{% raw %}
```tsx
<View className="flex-1 bg-white p-4">
    <Text className="text-lg font-bold text-gray-900">Title</Text>
    <Text className="text-sm text-gray-500 mt-1">Subtitle</Text>
</View>
```
{% endraw %}

:::note NativeWind is not required
The official approach is `StyleSheet.create`. NativeWind compiles Tailwind classes to RN styles at build time. Full setup docs: [nativewind.dev/getting-started/expo-router](https://www.nativewind.dev/getting-started/expo-router)
:::

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Flexbox Froggy | Interactive Game | [flexboxfroggy.com](https://flexboxfroggy.com/) |
| RN Flexbox Docs | Official | [reactnative.dev/docs/flexbox](https://reactnative.dev/docs/flexbox) |
| NativeWind | Community | [nativewind.dev](https://www.nativewind.dev/) |
| Yoga Layout | Reference | [yogalayout.dev](https://yogalayout.dev/) |

---

Next → **[Lists & Navigation](./lists-and-navigation)**
