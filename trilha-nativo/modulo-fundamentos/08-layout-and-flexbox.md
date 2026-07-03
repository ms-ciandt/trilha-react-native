---
id: layout-and-flexbox
title: Layout & Flexbox in React Native
sidebar_label: Layout & Flexbox
nav_order: 8
parent: Fundamentos
grand_parent: Trilha Nativo
---

# Layout & Flexbox in React Native

> React Native uses Flexbox for all layout — the same model as CSS Flexbox, with a few RN-specific defaults.

## Key Differences from Web CSS Flexbox

| Property | Web CSS default | React Native default |
|----------|----------------|---------------------|
| `flexDirection` | `row` | **`column`** |
| `alignContent` | `stretch` | `flex-start` |
| Units | `px`, `%`, `em`, etc. | **Unitless numbers** (density-independent pixels) |
| `flex` shorthand | `flex: 1 1 auto` | **`flex: N` only** (grows/shrinks equally) |
| Position | `static` | `relative` |

The biggest gotcha: **`flexDirection` defaults to `column`** in RN. Content stacks vertically by default.

---

## The Mental Model

Think of every `View` as a **flex container**. The `style` prop is how you configure it.

{% raw %}
```tsx
// This is a vertical stack (column is default)
<View style={{ flex: 1 }}>
    <View style={{ height: 60, backgroundColor: 'red' }} />
    <View style={{ flex: 1, backgroundColor: 'green' }} />  {/* takes remaining space */}
    <View style={{ height: 60, backgroundColor: 'blue' }} />
</View>
```
{% endraw %}

---

## Core Flexbox Properties

### `flexDirection`

{% raw %}
```tsx
// Column (default) — children stack top to bottom
<View style={{ flexDirection: 'column' }}>

// Row — children sit left to right
<View style={{ flexDirection: 'row' }}>

// Reverse variants
<View style={{ flexDirection: 'column-reverse' }}>
<View style={{ flexDirection: 'row-reverse' }}>
```
{% endraw %}

### `justifyContent` — Main Axis Alignment

{% raw %}
```tsx
// Along flexDirection axis (vertical for column, horizontal for row)
<View style={{ justifyContent: 'flex-start' }}>  {/* default */}
<View style={{ justifyContent: 'flex-end' }}>
<View style={{ justifyContent: 'center' }}>
<View style={{ justifyContent: 'space-between' }}>
<View style={{ justifyContent: 'space-around' }}>
<View style={{ justifyContent: 'space-evenly' }}>
```
{% endraw %}

### `alignItems` — Cross Axis Alignment

{% raw %}
```tsx
// Perpendicular to flexDirection
<View style={{ alignItems: 'flex-start' }}>
<View style={{ alignItems: 'flex-end' }}>
<View style={{ alignItems: 'center' }}>
<View style={{ alignItems: 'stretch' }}>  {/* default */}
<View style={{ alignItems: 'baseline' }}>
```
{% endraw %}

### Center Something (The Classic)

{% raw %}
```tsx
// Center a child horizontally and vertically — the most common layout pattern
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Centered Content</Text>
</View>
```
{% endraw %}

**Kotlin/Android comparison:**
{% raw %}
```xml
<!-- ConstraintLayout or Gravity -->
<FrameLayout android:layout_gravity="center" />
<LinearLayout android:gravity="center" />
```
{% endraw %}

**SwiftUI comparison:**
{% raw %}
```swift
// Idiomatic SwiftUI centering
ZStack {
    Text("Centered")
}
.frame(maxWidth: .infinity, maxHeight: .infinity)
```
{% endraw %}

---

## `flex` — Proportional Space

{% raw %}
```tsx
// flex: N — take N proportional shares of available space
<View style={{ flexDirection: 'row', height: 100 }}>
    <View style={{ flex: 1, backgroundColor: 'red' }} />   {/* 1/3 */}
    <View style={{ flex: 2, backgroundColor: 'green' }} /> {/* 2/3 */}
</View>

// flex: 1 on a child of a Screen — fill all available space
<View style={{ flex: 1 }}>
    {/* This fills the entire screen */}
</View>
```
{% endraw %}

---

## Spacing: `margin` and `padding`

{% raw %}
```tsx
// Individual sides
<View style={{
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 12,
    marginRight: 12,
    paddingHorizontal: 16,  // shorthand for paddingLeft + paddingRight
    paddingVertical: 8,     // shorthand for paddingTop + paddingBottom
    padding: 16,            // all sides
    margin: 8,
}} />

// The RN naming is the same as Android's XML attributes
// marginTop == android:layout_marginTop
// paddingHorizontal has no direct Android XML equivalent (use paddingLeft+paddingRight)
```
{% endraw %}

---

## `position: 'absolute'`

For overlays, badges, and elements that float outside the normal flow:

{% raw %}
```tsx
// Parent needs position: 'relative' (the default)
<View style={{ width: 60, height: 60 }}>
    <Image source={{ uri: avatarUrl }} style={{ width: 60, height: 60, borderRadius: 30 }} />
    {/* Badge in top-right corner */}
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
{% endraw %}

---

## Responsive Sizing with `Dimensions`

{% raw %}
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
{% endraw %}

:::caution Stale on orientation change
`Dimensions.get('window')` captures the value once at module load. If the user rotates their device the value stays stale. Use `useWindowDimensions` instead for anything that should respond to rotation.
:::

For dynamic responsive layouts (handles rotation/orientation changes), use `useWindowDimensions`:

{% raw %}
```tsx
import { useWindowDimensions } from 'react-native';

function ResponsiveCard() {
    const { width } = useWindowDimensions();
    const columns = width > 600 ? 3 : 2; // tablet vs phone layout
    // ...
}
```
{% endraw %}

---

## `StyleSheet.create` vs Inline Styles

{% raw %}
```tsx
// Inline styles — convenient but slightly slower (no optimization)
<View style={{ flex: 1, backgroundColor: 'red' }} />

// StyleSheet.create — preferred (validated, optimized, autocomplete)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
<View style={styles.container} />

// Combining styles (like applying multiple Android XML attributes)
<View style={[styles.container, styles.padded, { marginTop: 8 }]} />
```
{% endraw %}

---

## `gap` — Spacing Between Children

Since React Native 0.71, you can use `gap`, `rowGap`, and `columnGap` instead of adding margin to every child:

{% raw %}
```tsx
// Before gap — manual margin on all-but-last child
<View style={{ flexDirection: 'row' }}>
    <View style={{ marginRight: 8 }} />
    <View style={{ marginRight: 8 }} />
    <View /> {/* no margin on last */}
</View>

// After gap — clean and correct
<View style={{ flexDirection: 'row', gap: 8 }}>
    <View />
    <View />
    <View />
</View>

// rowGap / columnGap for grid-like layouts
<View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 8 }}>
    {items.map(item => <Card key={item.id} />)}
</View>
```
{% endraw %}

**SwiftUI parallel:** `spacing:` parameter on `HStack`/`VStack`. **Compose parallel:** `Arrangement.spacedBy(8.dp)`.

---

## Practice: Flexbox Froggy

The best way to internalize Flexbox is through play. Since RN uses the same flexbox model as CSS:

🐸 **[Play Flexbox Froggy](https://flexboxfroggy.com/)** — 24 levels that teach every flexbox property through an interactive game.

---

## Common Layout Patterns

{% raw %}
```tsx
// Navigation bar with title and action button
<View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
    <Text style={{ flex: 1, fontSize: 18, fontWeight: 'bold' }}>Title</Text>
    <Pressable onPress={handleAction}>
        <Text>Action</Text>
    </Pressable>
</View>

// Card with image on left, text on right
<View style={{ flexDirection: 'row', padding: 12 }}>
    <Image style={{ width: 60, height: 60 }} source={{ uri: '...' }} />
    <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: 'bold' }}>Title</Text>
        <Text numberOfLines={2}>Description...</Text>
    </View>
</View>

// Bottom-pinned button (common screen pattern)
<View style={{ flex: 1 }}>
    <ScrollView style={{ flex: 1 }}>
        {/* scrollable content */}
    </ScrollView>
    <View style={{ padding: 16 }}>
        <Button title="Continue" onPress={handleContinue} />
    </View>
</View>
```
{% endraw %}

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Flexbox Froggy | Interactive Game | [flexboxfroggy.com](https://flexboxfroggy.com/) |
| RN Layout with Flexbox | Official Docs | [reactnative.dev/docs/flexbox](https://reactnative.dev/docs/flexbox) |
| RN Layout Props | Official Docs | [reactnative.dev/docs/layout-props](https://reactnative.dev/docs/layout-props) |
| Yoga (the layout engine RN uses) | Reference | [yogalayout.dev](https://yogalayout.dev/) |

---

Next → **[Styling in React Native](./styling)**
