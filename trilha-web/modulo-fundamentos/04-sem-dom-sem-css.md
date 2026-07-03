---
id: no-dom-no-css
title: No DOM, No CSS — What That Actually Means
sidebar_label: No DOM, No CSS
nav_order: 4
parent: Fundamentos
grand_parent: Trilha Web
---

# No DOM, No CSS — What That Actually Means

> This is the hardest mindset shift for web developers. Let's make it concrete.

## No `document`, No `window`

These browser globals simply don't exist in React Native:

{% raw %}
```typescript
// ❌ None of this exists in React Native
document.getElementById('app');
document.querySelector('.button');
document.createElement('div');
window.scrollTo(0, 0);
window.innerWidth;
window.addEventListener('resize', handler);
window.location.href;
navigator.geolocation;    // ← removed from RN core in 0.60 — use expo-location
navigator.clipboard;      // ← not available — use expo-clipboard
```
{% endraw %}

{% raw %}
```typescript
// ✅ React Native equivalents
// Get element ref → useRef()
// Scroll → ref.current.scrollTo()
// Screen dimensions → Dimensions.get('window') or useWindowDimensions()
// Resize/orientation → useWindowDimensions() hook updates automatically
// Navigation → React Navigation (or Expo Router if using Expo)
// Geolocation → expo-location
// Clipboard → expo-clipboard
```
{% endraw %}

---

## No `innerHTML`, No Direct DOM Manipulation

You cannot modify the native view tree imperatively the way you can with the DOM.

{% raw %}
```typescript
// ❌ Web — direct DOM manipulation
document.getElementById('title').innerHTML = '<strong>New Title</strong>';
element.classList.add('active');
element.style.backgroundColor = 'red';

// ✅ React Native — ALL changes go through state → re-render
const [title, setTitle] = useState('Old Title');
const [isActive, setIsActive] = useState(false);

<Text style={[styles.title, isActive && styles.active]}>
    {title}
</Text>
```
{% endraw %}

This is actually the same constraint that React itself imposes on web. If you've been using React correctly (no `document.querySelector` in useEffect), you're already used to this.

---

## No CSS Selectors, No Cascade

{% raw %}
```css
/* ❌ None of this works in React Native */
.card > .title { font-size: 18px; }
.card:hover { background-color: #f5f5f5; }
.button:focus { outline: 2px solid blue; }
@media (max-width: 768px) { .sidebar { display: none; } }
* { box-sizing: border-box; }
:root { --primary: #0064d2; }
```
{% endraw %}

{% raw %}
```typescript
// ✅ React Native — no selectors, no cascade, no hover, no media queries
// You express all of this in JS

// Parent-child relationship → props drilling or composition
<Card titleStyle={{ fontSize: 18 }}>...</Card>

// Hover equivalent → Pressable state
<Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>

// Focus → managed internally by React Native

// Media queries → useWindowDimensions() hook
const { width } = useWindowDimensions();
const isTablet = width >= 768;
<View style={[styles.container, isTablet && styles.containerTablet]} />

// CSS variables → JS constants file
import { colors } from './theme';
<View style={{ backgroundColor: colors.primary }} />
```
{% endraw %}

---

## No `box-sizing`, No `display: block` vs `inline`

React Native has a simplified layout model:

- **Every component is a flex container by default** — no block vs inline vs inline-block distinction
- **`box-sizing: border-box` is the default** — you don't need to set it
- **`display: 'none'` works** — but behaves differently from conditional rendering:
  ```tsx
  // display: 'none' — component stays mounted (state preserved), but hidden and takes no space
  <MyComponent style={{ display: isVisible ? 'flex' : 'none' }} />

  // Conditional rendering — component fully unmounts (state lost, memory freed)
  {isVisible && <MyComponent />}
  ```
  Use `display: 'none'` when you need to preserve state while hiding (e.g. tab screens). Use conditional rendering when you want a clean unmount.

---

## Layout Properties That Don't Exist in RN

| CSS Property | React Native Alternative |
|---|---|
| `display: grid` | Use nested Flexbox |
| `display: inline-flex` | Use `flexDirection: 'row'` |
| `float: left/right` | Use `flexDirection: 'row'` |
| `overflow: scroll` | Use `ScrollView` or `FlatList` |
| `overflow: hidden` | `overflow: 'hidden'` works |
| `z-index` | `zIndex` works |
| `clip-path` | Not supported (use `overflow: 'hidden'` with `borderRadius`) |
| `grid-template-columns` | Use `FlatList` with `numColumns` prop |
| CSS `transition` | Use Reanimated or `Animated.spring/timing` |
| CSS `animation` | Use Reanimated worklets |
| `vh`, `vw` units | Use `Dimensions.get('window').height/width` |
| `calc()` | Do the math in JavaScript |
| `em`, `rem` units | Use raw numbers (device-independent pixels) |

---

## No `position: sticky`

On web, sticky positioning keeps a header visible during scroll. In RN, you handle this differently:

{% raw %}
```tsx
// Web: CSS position: sticky
<div style={{ position: 'sticky', top: 0 }}>Sticky header</div>

// React Native: stickyHeaderIndices on FlatList
<FlatList
    data={items}
    renderItem={renderItem}
    stickyHeaderIndices={[0]}  // the first item will be sticky
    ListHeaderComponent={<StickyHeader />}
/>
```
{% endraw %}

---

## What You Do Get

RN does support a useful subset of layout and style:

| Supported | Notes |
|-----------|-------|
| All Flexbox properties | Column-first by default |
| `borderRadius`, `borderWidth`, `borderColor` | Works identically to CSS |
| `backgroundColor`, `opacity` | — |
| `overflow: 'hidden'` | Clips children |
| `position: 'absolute'` / `'relative'` | No `fixed` or `sticky` |
| `zIndex` | — |
| `transform` | Array syntax: `[{ translateX: 10 }, { rotate: '45deg' }]` |
| `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` | **iOS only** — silently ignored on Android |
| `elevation` | **Android only** shadow — grey, not customizable |
| `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`, `textAlign`, `textDecorationLine` | On `<Text>` only, not `<View>` |

---

## Resources

| Resource | Type | Link |
|---|---|---|
| RN Style Properties Reference | Official | [reactnative.dev/docs/view-style-props](https://reactnative.dev/docs/view-style-props) |
| Yoga Layout Engine | Reference | [yogalayout.dev](https://yogalayout.dev/) |

---

Next → **[Native Components for Web Devs](./native-components)**
