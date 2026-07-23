---
title: No DOM, No CSS — What That Actually Means
---

# No DOM, No CSS — What That Actually Means

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_web/fund_04_sem_dom_css.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> This is the hardest mindset shift for web developers. Let's make it concrete.

## No `document`, No `window`

These browser globals simply don't exist in React Native:

```typescript
//  None of this exists in React Native
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

```typescript
//  React Native equivalents
// Get element ref → useRef()
// Scroll → ref.current.scrollTo()
// Screen dimensions → Dimensions.get('window') or useWindowDimensions()
// Resize/orientation → useWindowDimensions() hook updates automatically
// Navigation → React Navigation (or Expo Router if using Expo)
// Geolocation → expo-location
// Clipboard → expo-clipboard
```

---

## No `innerHTML`, No Direct DOM Manipulation

You cannot modify the native view tree imperatively the way you can with the DOM.

```typescript
//  Web — direct DOM manipulation
document.getElementById('title').innerHTML = '<strong>New Title</strong>';
element.classList.add('active');
element.style.backgroundColor = 'red';

//  React Native — ALL changes go through state → re-render
const [title, setTitle] = useState('Old Title');
const [isActive, setIsActive] = useState(false);

<Text style={[styles.title, isActive && styles.active]}>
    {title}
</Text>
```

This is actually the same constraint that React itself imposes on web. If you've been using React correctly (no `document.querySelector` in useEffect), you're already used to this.

---

## No CSS Selectors, No Cascade

```css
/*  None of this works in React Native */
.card > .title { font-size: 18px; }
.card:hover { background-color: #f5f5f5; }
.button:focus { outline: 2px solid blue; }
@media (max-width: 768px) { .sidebar { display: none; } }
* { box-sizing: border-box; }
:root { --primary: #0064d2; }
```

```typescript
//  React Native — no selectors, no cascade, no hover, no media queries
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

---

## No `box-sizing`, No `display: block` vs `inline`

React Native has a simplified layout model:

- **Every component is a flex container by default** — no block vs inline vs inline-block distinction
- **`box-sizing: border-box` is the default** — you don't need to set it
- **`display: 'none'` works** — and it behaves **the same as on the web**: the component stays mounted (state preserved), but is hidden and takes no space. This is not a React Native difference — on the web, `display: none` also keeps the React component mounted with its state intact.

  ```tsx
  // display: 'none' — component stays mounted (state preserved), but hidden and takes no space
  // This is identical to web behavior
  <MyComponent style={{ display: isVisible ? 'flex' : 'none' }} />

  // Conditional rendering — component fully unmounts (state lost, memory freed)
  // Also identical to web behavior
  {isVisible && <MyComponent />}
  ```
  Use `display: 'none'` when you need to preserve state while hiding (e.g. tab screens, where you want the user to return to where they left off). Use conditional rendering when you want a clean unmount.

---

## Layout Properties That Don't Exist in RN

| CSS Property | Status in RN |
|---|---|
| `display: grid` | ❌ — use nested Flexbox |
| `display: inline-flex` | ❌ — use `flexDirection: 'row'` |
| `display: contents` / `block` / `inline` | ❌ — `display` is effectively `flex` or `none` |
| `float: left/right` | ❌ — use `flexDirection: 'row'` |
| `overflow: scroll` | ❌ — use `ScrollView` or `FlatList` |
| `clip-path` | ❌ — use `overflow: 'hidden'` with `borderRadius` |
| `grid-template-columns` | ❌ — use `FlatList` with `numColumns` prop |
| CSS `transition` | ❌ — use Reanimated or `Animated.spring/timing` |
| CSS `animation` | ❌ — use Reanimated worklets |
| `vh`, `vw` units | ❌ — use `Dimensions.get('window').height/width` |
| `calc()` | ❌ — do the math in JavaScript |
| `em`, `rem` units | ❌ — use raw numbers (device-independent pixels) |
| `order` | ❌ — order is determined by JSX order |
| `place-items` / `place-content` / `place-self` | ❌ — shorthand aliases don't exist |
| `visibility` | ❌ — use `display: 'none'` or `opacity: 0` |
| `overflow: hidden` | ✅ works |
| `z-index` | ✅ works as `zIndex` (orders siblings; does not create full CSS stacking context) |
| `gap` / `rowGap` / `columnGap` | ✅ since RN 0.71 |
| `position: 'static'` | ✅ since RN 0.74 (Yoga 3.0) — opt-in; elements are ignored as containing blocks for `absolute` children |
| `alignContent: 'space-evenly'` | ✅ since RN 0.74 (Yoga 3.0) |
| `boxShadow` / `filter` | ✅ since RN 0.76 (New Architecture) |

---

## `position` — How It Differs from CSS

Coming from the web, there are two important differences:

- **Default is `relative`, not `static`.** Every element starts as `relative` in RN. Unlike the web, a `relative` element in RN can be offset with `top`/`left`/etc. (shifting it without affecting siblings).
- **`absolute` always anchors to the nearest parent (pre-0.74).** On the web, `position: absolute` finds the nearest *positioned* ancestor. Before RN 0.74, it always anchored to the direct parent — there was no concept of "nearest positioned ancestor."
- **`position: 'static'` was added in RN 0.74 (Yoga 3.0).** Elements marked `static` cannot be offset *and are ignored* when an `absolute` child searches for its containing block — allowing you to position an absolute element relative to a non-parent ancestor (web-like, but opt-in).

```tsx
// Pre-0.74: absolute always anchors to parent
// 0.74+: mark intermediate nodes as static to skip them
<View style={{ position: 'relative' }}>
  <View style={{ position: 'static' }}>   {/* ignored as containing block */}
    <View style={{ position: 'absolute', top: 0, left: 0 }} />
    {/* anchors to the grandparent View, not this static parent */}
  </View>
</View>
```

`zIndex` works, but does not create the full CSS stacking context — sibling order and platform overlay rules also influence how elements stack.

---

## No `position: sticky`

On web, sticky positioning keeps a header visible during scroll. In RN, you handle this differently:

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
| `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` | iOS shadow. On Android 9+ (API 28), `shadowColor` + `elevation` tints the shadow color. On older Android, `shadowColor` is silently ignored. |
| `elevation` | Android shadow depth. Combine with `shadowColor` on Android 9+ for a colored shadow. |
| `boxShadow` | Cross-platform (New Architecture, RN 0.76+). CSS-compatible syntax, supports multiple shadows and `inset`. |
| `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`, `textAlign`, `textDecorationLine` | On `<Text>` only, not `<View>` |

---

## Resources

| Resource | Type | Link |
|---|---|---|
| RN Style Properties Reference | Official | [reactnative.dev/docs/view-style-props](https://reactnative.dev/docs/view-style-props) |
| Yoga Layout Engine | Reference | [yogalayout.dev](https://yogalayout.dev/) |

---

Next → **[Native Components for Web Devs](./componentes-nativos)**