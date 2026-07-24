---
title: "Layout: Column/Row vs Flexbox"
sidebar_label: "Layout: Column/Row vs Flexbox"
sidebar_position: 3
---

## Video Overview

> Video for this topic coming soon.

## Layout Systems Side by Side

Jetpack Compose layouts are named and explicit: `Column` for vertical, `Row` for horizontal, `Box` for stacked/overlay. React Native uses a single unified Flexbox system for everything — but the defaults are tuned so that the common patterns translate cleanly.

This file maps every major Compose layout concept to its React Native equivalent, with side-by-side code and a full Flexbox property reference.

---

## The Default Axis Difference

The most important difference to memorise:

| System              | Default main axis | Default cross-axis alignment |
|---------------------|-------------------|------------------------------|
| Compose Column      | Vertical          | Start (left)                 |
| Compose Row         | Horizontal        | CenterVertically possible    |
| React Native View   | **Vertical**      | Stretch                      |
| CSS Flexbox (web)   | Horizontal        | Stretch                      |

React Native `flexDirection` defaults to `'column'` (not `'row'` like the web). A bare `<View>` with children already stacks them vertically — matching Compose's `Column`.

---

## Column → View (default Flexbox)

### Compose

```kotlin
@Composable
fun ProfileSection() {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth().padding(16.dp)
    ) {
        Text("Name")
        Text("Email")
        Text("Phone")
    }
}
```

### React Native

```tsx
import { View, Text, StyleSheet } from 'react-native';

function ProfileSection() {
  return (
    <View style={styles.container}>
      <Text>Name</Text>
      <Text>Email</Text>
      <Text>Phone</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',  // default — can be omitted
    alignItems: 'center',     // Alignment.CenterHorizontally
    padding: 16,
    gap: 8,                   // Arrangement.spacedBy(8.dp) — RN 0.71+
    width: '100%',
  },
});
```

> `gap` was added to React Native in 0.71. For older projects, use `marginBottom` on each child or a `Spacer` component.

---

## Row → View with flexDirection: 'row'

### Compose

```kotlin
@Composable
fun ActionBar() {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
    ) {
        IconButton(onClick = { /*back*/ }) { Icon(Icons.Default.ArrowBack, null) }
        Text("Title", style = MaterialTheme.typography.titleLarge)
        IconButton(onClick = { /*menu*/ }) { Icon(Icons.Default.MoreVert, null) }
    }
}
```

### React Native

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';

function ActionBar() {
  return (
    <View style={styles.bar}>
      <Pressable><Text>←</Text></Pressable>
      <Text style={styles.title}>Title</Text>
      <Pressable><Text>⋮</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Arrangement.SpaceBetween
    alignItems: 'center',            // Alignment.CenterVertically
    paddingHorizontal: 16,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
```

---

## Box → View with position: 'absolute'

Compose's `Box` stacks children with z-ordering. React Native uses `position: 'absolute'` for overlay children.

### Compose

```kotlin
@Composable
fun BadgedAvatar(badgeCount: Int) {
    Box(contentAlignment = Alignment.TopEnd) {
        Image(
            painter = painterResource(R.drawable.avatar),
            contentDescription = null,
            modifier = Modifier.size(48.dp).clip(CircleShape)
        )
        if (badgeCount > 0) {
            Badge { Text("$badgeCount") }
        }
    }
}
```

### React Native

```tsx
import { View, Text, Image, StyleSheet } from 'react-native';

function BadgedAvatar({ badgeCount }: { badgeCount: number }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('./avatar.png')}
        style={styles.avatar}
      />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  badge: {
    position: 'absolute',  // lifts out of normal flow
    top: -4,
    right: -4,
    backgroundColor: '#e53935',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
```

---

## Modifier → style prop

Compose `Modifier` is chainable and applies layout, drawing, and gesture behaviour. React Native uses a plain `style` prop (an object or `StyleSheet` entry). There is no chaining — you combine multiple properties in one object.

| Compose Modifier                         | React Native style property              |
|------------------------------------------|------------------------------------------|
| `Modifier.fillMaxWidth()`                | `width: '100%'`                          |
| `Modifier.fillMaxHeight()`               | `height: '100%'`                         |
| `Modifier.fillMaxSize()`                 | `flex: 1` or `width: '100%', height: '100%'` |
| `Modifier.size(48.dp)`                   | `width: 48, height: 48`                  |
| `Modifier.padding(16.dp)`               | `padding: 16`                            |
| `Modifier.padding(horizontal = 16.dp)`  | `paddingHorizontal: 16`                  |
| `Modifier.background(Color.Red)`        | `backgroundColor: 'red'`                 |
| `Modifier.clip(CircleShape)`            | `borderRadius: N` (half of width/height) |
| `Modifier.border(1.dp, Color.Gray)`     | `borderWidth: 1, borderColor: '#999'`    |
| `Modifier.weight(1f)`                   | `flex: 1`                                |
| `Modifier.wrapContentWidth()`           | no `width` property (natural sizing)     |
| `Modifier.alpha(0.5f)`                  | `opacity: 0.5`                           |
| `Modifier.rotate(45f)`                  | `transform: [{ rotate: '45deg' }]`       |

---

## flex: 1 — The fillMaxSize Equivalent

In Compose, `Modifier.fillMaxSize()` or `Modifier.weight(1f)` fills available space in the parent's axis. In React Native, `flex: 1` does the same thing — the view expands to fill remaining space.

```tsx
function TwoPane() {
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ flex: 1, backgroundColor: '#e3f2fd' }}>
        {/* takes 50% of width */}
      </View>
      <View style={{ flex: 2, backgroundColor: '#fce4ec' }}>
        {/* takes 66.7% of width */}
      </View>
    </View>
  );
}
```

Equivalent in Compose:

```kotlin
Row(Modifier.fillMaxSize()) {
    Box(Modifier.weight(1f).background(Color(0xFFE3F2FD)))
    Box(Modifier.weight(2f).background(Color(0xFFFCE4EC)))
}
```

---

## Arrangement and Alignment Full Reference

### justifyContent — main axis distribution (Row's horizontalArrangement / Column's verticalArrangement)

| Compose Arrangement          | React Native justifyContent   |
|------------------------------|-------------------------------|
| `Arrangement.Start`          | `'flex-start'` (default)      |
| `Arrangement.End`            | `'flex-end'`                  |
| `Arrangement.Center`         | `'center'`                    |
| `Arrangement.SpaceBetween`   | `'space-between'`             |
| `Arrangement.SpaceAround`    | `'space-around'`              |
| `Arrangement.SpaceEvenly`    | `'space-evenly'`              |
| `Arrangement.spacedBy(8.dp)` | `gap: 8`                      |

### alignItems — cross-axis alignment

| Compose Alignment                       | React Native alignItems        |
|-----------------------------------------|--------------------------------|
| `Alignment.Start` / `Alignment.Top`     | `'flex-start'`                 |
| `Alignment.End` / `Alignment.Bottom`    | `'flex-end'`                   |
| `Alignment.CenterHorizontally` / `CenterVertically` | `'center'`        |
| (default — Compose stretches)           | `'stretch'` (RN default)       |

### Individual child alignment: alignSelf

For a single child to override the parent's `alignItems`:

```tsx
// Parent: alignItems: 'center'
// This one child aligns to flex-start instead
<View style={{ alignSelf: 'flex-start' }}>
  <Text>Left-aligned in a centered column</Text>
</View>
```

---

## FlexWrap: Row with Wrapping

Compose's `FlowRow`/`FlowColumn` wrap children. React Native uses `flexWrap: 'wrap'`.

```tsx
function TagList({ tags }: { tags: string[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {tags.map(tag => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}
```

---

## Intrinsic Sizing

React Native does not support `IntrinsicSize` (Compose's `IntrinsicSize.Max/Min`). Children size to their content by default when no explicit width/height/flex is set. If you need siblings to match the tallest sibling's height, use `alignItems: 'stretch'` (default) or measure with `onLayout`.

---

## Interactive Playground

Learn Flexbox visually with the Flexbox Froggy game — the axes, `justify-content`, `align-items`, `flex-wrap` and `align-content` are directly applicable to React Native:

[https://flexboxfroggy.com/](https://flexboxfroggy.com/)

Try this Expo Snack that lets you tweak Flexbox properties live:

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/layout-flexbox)

---

## Study Materials

### Official Documentation

- [React Native — Layout with Flexbox](https://reactnative.dev/docs/flexbox) — exhaustive property reference
- [React Native — Height and Width](https://reactnative.dev/docs/height-and-width)
- [React Native — StyleSheet](https://reactnative.dev/docs/stylesheet)
- [Compose — Layouts in Compose](https://developer.android.com/develop/ui/compose/layouts/basics)
- [Compose — Custom Layouts](https://developer.android.com/develop/ui/compose/layouts/custom)

### Interactive

- [Flexbox Froggy](https://flexboxfroggy.com/) — learn Flexbox axes through a game
- [Yoga Playground](https://yogalayout.dev/playground) — the layout engine React Native uses internally

### Videos

- [William Candillon — React Native Layout Crash Course](https://www.youtube.com/watch?v=NlT3bF2aHB4)
- [Google — Layouts in Jetpack Compose](https://www.youtube.com/watch?v=0kfq3vHOBnI) — re-watch as comparison baseline

---

## What's Next

Layout done. Next: how Navigation Compose (NavHost/NavController) maps to React Navigation 7's stack and tab navigators.

➡ [Navigation: NavHost vs React Navigation](./04-navigation-navhost-vs-react-navigation)
