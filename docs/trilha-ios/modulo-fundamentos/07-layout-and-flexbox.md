---
title: Layout and Flexbox — SwiftUI and Auto Layout Mapping
---

# Layout and Flexbox — SwiftUI and Auto Layout Mapping

iOS gives you two layout systems: Auto Layout, which expresses constraints between views, and SwiftUI's declarative stacks and modifiers. React Native replaces both with a single system called Yoga, a cross-platform implementation of Flexbox. Once you understand the mapping between the two mental models, you will find React Native layout familiar — SwiftUI stacks and Flexbox are closer than they appear.

---

## The Mental Model Shift: Constraints to Flexbox

Auto Layout thinks in terms of relationships. You declare that a view's leading edge is 16 points from its superview's leading edge, that its width equals 50% of its container, and that it is vertically centered. The constraint solver resolves these declarations into a final frame at render time.

Flexbox thinks in terms of flow. A container declares how its children are arranged along a main axis and how remaining space is distributed. Children can opt into growing or shrinking. There are no cross-view constraints — each container governs only its direct children.

SwiftUI sits closer to Flexbox than Auto Layout does. `VStack` and `HStack` are flex containers with a declared axis. `Spacer()` inserts a greedy child that consumes remaining space. SwiftUI's `frame(maxWidth: .infinity)` is equivalent to `flex: 1` in React Native.

If you have spent more time with SwiftUI than Auto Layout, the React Native mapping will feel natural. If you have spent more time with Auto Layout, the shift to "containers own their children's layout" is the key insight to internalize.

---

## Yoga Defaults That Differ From Web CSS

React Native uses the same Flexbox vocabulary as web CSS, but several defaults differ. Knowing these upfront prevents most layout surprises:

| Property | Web CSS default | React Native default | SwiftUI analogy |
|---|---|---|---|
| `flexDirection` | `row` | `column` | `VStack` is the default |
| `alignItems` | `stretch` | `stretch` | children fill cross axis |
| `position` | `static` | `relative` | in-flow by default |
| `flexShrink` | `1` | `0` | children do not compress by default |

The most important difference: `flexDirection` defaults to `'column'`. A plain `View` with children stacks them vertically, exactly like `VStack`.

---

## VStack and HStack — flexDirection

SwiftUI's `VStack` and `HStack` correspond directly to a `View` with `flexDirection: 'column'` or `flexDirection: 'row'`.

```swift
// SwiftUI
VStack(spacing: 12) {
    Text("Title")
    Text("Subtitle")
}

HStack(spacing: 8) {
    Image(systemName: "star")
    Text("Featured")
}
```

```tsx
import { View, Text, StyleSheet } from 'react-native';

// VStack equivalent — flexDirection: 'column' is the default, so it can be omitted
<View style={styles.vstack}>
  <Text style={styles.title}>Title</Text>
  <Text style={styles.subtitle}>Subtitle</Text>
</View>

// HStack equivalent
<View style={styles.hstack}>
  <StarIcon size={16} />
  <Text style={styles.label}>Featured</Text>
</View>

const styles = StyleSheet.create({
  vstack:   { flexDirection: 'column', gap: 12 },
  hstack:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:    { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#6b7280' },
  label:    { fontSize: 16, color: '#1a1a2e' },
});
```

`gap` replaces the `spacing:` parameter of `VStack`/`HStack`. It sets the space between all direct children uniformly, without adding space at the start or end.

---

## ZStack and Overlays — position absolute

SwiftUI's `ZStack` layers views along the depth axis. React Native has no dedicated ZStack primitive. Instead, you use `position: 'absolute'` to lift a child out of the normal flow and place it at a specific position within its nearest `relative` ancestor.

```swift
// SwiftUI
ZStack(alignment: .bottomLeading) {
    Image("background")
        .resizable()
        .scaledToFill()
    Text("Caption")
        .padding(16)
}
```

```tsx
import { View, Text, Image, StyleSheet } from 'react-native';

// ZStack equivalent
<View style={styles.container}>
  <Image
    source={require('./bg.png')}
    style={StyleSheet.absoluteFill}  // fills the parent completely
    resizeMode="cover"
  />
  <Text style={styles.caption}>Caption</Text>
</View>

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
  },
  caption: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

`StyleSheet.absoluteFill` is a convenience shorthand equivalent to `{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }`. It is exactly the pattern for a background image in a ZStack.

`position: 'relative'` (the default) means a view participates in the normal flex flow. `position: 'absolute'` means it is removed from the flow and positioned relative to its nearest ancestor that is `relative` or `absolute` — equivalent to `UIView` with `translatesAutoresizingMaskIntoConstraints = false` placed without constraints, or the `overlay` modifier in SwiftUI.

---

## Spacer() — flex: 1 and justifyContent

SwiftUI's `Spacer()` inserts a greedy view that expands to fill all available space. In a horizontal context it pushes siblings apart; in a vertical context it fills empty height.

React Native expresses the same intent in two ways depending on the situation.

**Using `flex: 1` for a greedy spacer child:**

```swift
// SwiftUI — push title left, button right
HStack {
    Text("Title")
    Spacer()
    Button("Edit") { }
}
```

```tsx
// React Native equivalent
<View style={styles.header}>
  <Text style={styles.title}>Title</Text>
  <View style={{ flex: 1 }} />
  <Pressable onPress={onEdit}><Text>Edit</Text></Pressable>
</View>

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  title:  { fontSize: 18, fontWeight: '700' },
});
```

**Using `justifyContent` to distribute space without an explicit spacer:**

```tsx
// justifyContent: 'space-between' pushes first and last child to the edges
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
  <Text>Left</Text>
  <Text>Right</Text>
</View>
```

`justifyContent` controls distribution along the main axis:

| Value | Effect | SwiftUI analogy |
|---|---|---|
| `'flex-start'` | Children packed at start | No Spacer — default |
| `'flex-end'` | Children packed at end | Leading Spacer |
| `'center'` | Children centered | Spacer on both sides |
| `'space-between'` | First/last at edges, equal gaps between | Multiple Spacers |
| `'space-around'` | Equal space around each child | — |
| `'space-evenly'` | Equal space between and around | — |

---

## padding() — StyleSheet Padding Shorthand

SwiftUI's `.padding()` modifier applies to all four edges. `.padding(.horizontal, 16)` applies to leading and trailing only. React Native mirrors this with separate properties.

```swift
// SwiftUI
Text("Hello")
    .padding(16)
    .padding(.horizontal, 24)
    .padding(.top, 8)
```

```tsx
const styles = StyleSheet.create({
  // All four sides
  allSides:   { padding: 16 },

  // Vertical and horizontal shorthand
  symmetric:  { paddingVertical: 12, paddingHorizontal: 24 },

  // Individual sides
  individual: { paddingTop: 8, paddingRight: 16, paddingBottom: 8, paddingLeft: 16 },
});
```

`paddingVertical` expands to `paddingTop` + `paddingBottom`. `paddingHorizontal` expands to `paddingLeft` + `paddingRight`. There is no single shorthand like CSS's `padding: 8px 16px` — use the explicit properties.

The same pattern applies to `margin`.

---

## frame(width:height:) — Width and Height in StyleSheet

SwiftUI's `.frame(width: 200, height: 48)` sets an exact size. `.frame(maxWidth: .infinity)` makes a view fill its parent's width. React Native uses the same concepts in StyleSheet.

```swift
// SwiftUI
Rectangle()
    .frame(width: 200, height: 48)

Button("Full width") { }
    .frame(maxWidth: .infinity)
```

```tsx
const styles = StyleSheet.create({
  // Exact size
  fixedSize:  { width: 200, height: 48 },

  // Fill available width — like frame(maxWidth: .infinity)
  fullWidth:  { width: '100%' },

  // Fill remaining space in a flex container — like Spacer() or maxWidth: .infinity in a Stack
  flexible:   { flex: 1 },

  // Aspect ratio
  square:     { width: 100, aspectRatio: 1 },
  widescreen: { width: '100%', aspectRatio: 16 / 9 },
});
```

`width: '100%'` is a percentage of the parent's width, equivalent to `frame(maxWidth: .infinity)` in a full-width stack. `flex: 1` is different: it means "take one share of the remaining space after fixed-size siblings are placed", which has no direct SwiftUI equivalent but resembles `LayoutPriority` in UIKit.

---

## alignment — alignItems and alignSelf

SwiftUI's `VStack(alignment: .leading)` and `HStack(alignment: .center)` set how children are positioned on the cross axis. React Native separates this into two properties: `alignItems` on the container, and `alignSelf` on individual children.

```swift
// SwiftUI
VStack(alignment: .leading) {
    Text("Title")
    Text("Subtitle — left-aligned")
}
```

```tsx
// alignItems on the container — affects all children
<View style={{ alignItems: 'flex-start' }}>
  <Text>Title</Text>
  <Text>Subtitle — left-aligned</Text>
</View>
```

`alignItems` values:

| Value | Cross-axis positioning | SwiftUI |
|---|---|---|
| `'stretch'` (default) | Children fill cross axis | `.leading` in VStack when maxWidth: .infinity |
| `'flex-start'` | Pack at start of cross axis | `.leading` (VStack) / `.top` (HStack) |
| `'flex-end'` | Pack at end of cross axis | `.trailing` (VStack) / `.bottom` (HStack) |
| `'center'` | Center on cross axis | `.center` |

`alignSelf` on a child overrides the container's `alignItems` for that one child — equivalent to applying a different alignment modifier to a single child inside a SwiftUI stack.

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text>Left — centered vertically</Text>
  <Text style={{ alignSelf: 'flex-end' }}>Right — bottom-aligned</Text>
</View>
```

---

## GeometryReader — Dimensions API and onLayout

SwiftUI's `GeometryReader` exposes the available size so children can adapt to it. React Native offers two mechanisms.

**Dimensions API — screen and window size:**

```tsx
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  halfScreen: { width: width / 2, height: height * 0.4 },
});
```

`Dimensions.get('window')` returns the usable area (excluding any system bars on Android). `Dimensions.get('screen')` returns the full physical screen. For orientation-aware layouts, subscribe to dimension changes:

```tsx
import { Dimensions, useEffect, useState } from 'react';

const useDimensions = () => {
  const [dims, setDims] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDims(window);
    });
    return () => subscription.remove();
  }, []);

  return dims;
};
```

**onLayout — component size at render time:**

For the size of a specific component (the equivalent of reading `geometry.size` inside a `GeometryReader`), use the `onLayout` prop:

```tsx
import { View, useState } from 'react-native';

const AdaptiveCard = () => {
  const [cardWidth, setCardWidth] = useState(0);

  return (
    <View
      onLayout={(event) => {
        setCardWidth(event.nativeEvent.layout.width);
      }}
      style={styles.card}
    >
      <Text>Card is {cardWidth.toFixed(0)}pt wide</Text>
    </View>
  );
};
```

`onLayout` fires after the view has been measured and laid out, providing `x`, `y`, `width`, and `height` in the coordinate space of the parent view — equivalent to `GeometryReader`'s `proxy.size` and `proxy.frame(in: .local)`.

---

## LazyVGrid — FlatList numColumns

SwiftUI's `LazyVGrid` creates a grid that renders items lazily as they come into view. React Native's `FlatList` with `numColumns` is the direct equivalent, with the same lazy rendering behavior.

```swift
// SwiftUI
LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3)) {
    ForEach(photos) { photo in
        PhotoThumbnail(photo: photo)
    }
}
```

```tsx
import { FlatList, Image, StyleSheet } from 'react-native';

<FlatList
  data={photos}
  keyExtractor={(item) => item.id}
  numColumns={3}
  columnWrapperStyle={styles.row}
  renderItem={({ item }) => (
    <Image source={{ uri: item.uri }} style={styles.thumbnail} />
  )}
/>

const styles = StyleSheet.create({
  row:       { justifyContent: 'space-between', marginBottom: 4 },
  thumbnail: { width: '32%', aspectRatio: 1, borderRadius: 4 },
});
```

The `aspectRatio` property — available since React Native 0.72 — eliminates the need to compute pixel heights from `Dimensions`. It matches SwiftUI's `.aspectRatio(1, contentMode: .fill)`.

---

## flexWrap — Wrapping Children

When children overflow the main axis, `flexWrap: 'wrap'` causes them to wrap to the next line, like CSS flexbox and unlike any SwiftUI stack primitive. This is useful for tag clouds, pill groups, and flexible chip rows.

```tsx
<View style={styles.tagRow}>
  {tags.map((tag) => (
    <View key={tag} style={styles.tag}>
      <Text style={styles.tagText}>{tag}</Text>
    </View>
  ))}
</View>

const styles = StyleSheet.create({
  tagRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:      { backgroundColor: '#e0e7ff', borderRadius: 16, paddingVertical: 4, paddingHorizontal: 12 },
  tagText:  { fontSize: 13, color: '#3730a3' },
});
```

SwiftUI achieves a similar effect with `Layout` protocol implementations or third-party `FlowLayout` packages. React Native's `flexWrap` is simpler to reach for.

---

## Practical Example: Card Layout

A content card with a cover image, title, subtitle, and an action row — the kind of component that appears in any feed or dashboard.

```tsx
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

interface ContentCardProps {
  imageUri: string;
  title: string;
  subtitle: string;
  category: string;
  onPress: () => void;
}

const ContentCard = ({ imageUri, title, subtitle, category, onPress }: ContentCardProps) => (
  <Pressable
    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    onPress={onPress}
    accessibilityRole="button"
  >
    {/* Cover image with category badge overlaid — ZStack pattern */}
    <View style={styles.imageContainer}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{category}</Text>
      </View>
    </View>

    {/* Text content — VStack */}
    <View style={styles.body}>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card:          { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardPressed:   { opacity: 0.92 },
  imageContainer:{ width: '100%', height: 160 },
  image:         { ...StyleSheet.absoluteFillObject },
  badge:         { position: 'absolute', top: 12, left: 12, backgroundColor: '#6366f1', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText:     { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  body:          { padding: 16, gap: 6 },
  title:         { fontSize: 17, fontWeight: '700', color: '#1a1a2e', lineHeight: 24 },
  subtitle:      { fontSize: 14, color: '#6b7280' },
});
```

---

## Practical Example: Navigation Bar

A custom navigation bar with a back button on the left, a title centered, and an action on the right — matching a `NavigationBar` or `UINavigationBar` layout.

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavBarProps {
  title: string;
  onBack: () => void;
  onAction: () => void;
}

const NavBar = ({ title, onBack, onAction }: NavBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {/* Back button — left side */}
        <Pressable
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.sideSlot}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Title — centered absolutely so sidebars do not compress it */}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        {/* Action — right side */}
        <Pressable
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          style={[styles.sideSlot, styles.right]}
        >
          <Text style={styles.actionText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#ffffff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  bar:       { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  sideSlot:  { minWidth: 60 },
  right:     { alignItems: 'flex-end' },
  title:     { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1a1a2e' },
  backText:  { fontSize: 17, color: '#6366f1' },
  actionText:{ fontSize: 17, color: '#6366f1', fontWeight: '600' },
});
```

`flex: 1` on the title allows it to fill remaining space between the two side slots and then `textAlign: 'center'` centers the text within that space. When both slots have the same `minWidth`, the title lands at the true visual center.

---

## Practical Example: List Item

A row component for a settings-style list — icon on the left, label and sublabel stacked in the middle, chevron on the right.

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface ListItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
}

const ListItem = ({ icon, label, sublabel, onPress }: ListItemProps) => (
  <Pressable
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    onPress={onPress}
    accessibilityRole="button"
  >
    {/* Leading icon */}
    <View style={styles.iconSlot}>{icon}</View>

    {/* Label and optional sublabel — takes all remaining width */}
    <View style={styles.content}>
      <Text style={styles.label}>{label}</Text>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
    </View>

    {/* Trailing chevron */}
    <Text style={styles.chevron}>›</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#ffffff', gap: 12 },
  rowPressed: { backgroundColor: '#f9fafb' },
  iconSlot:   { width: 36, height: 36, borderRadius: 8, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center' },
  content:    { flex: 1, gap: 2 },
  label:      { fontSize: 16, fontWeight: '500', color: '#1a1a2e' },
  sublabel:   { fontSize: 13, color: '#9ca3af' },
  chevron:    { fontSize: 22, color: '#d1d5db', lineHeight: 24 },
});
```

`flex: 1` on the content `View` mirrors `HStack { icon; VStack { label; sublabel }; Spacer(); chevron }` in SwiftUI — the content expands to fill the space between the icon and chevron.

---

## Flexbox Property Summary

| Property | Values | Purpose |
|---|---|---|
| `flexDirection` | `'column'`, `'row'`, `'column-reverse'`, `'row-reverse'` | Main axis direction |
| `justifyContent` | `'flex-start'`, `'flex-end'`, `'center'`, `'space-between'`, `'space-around'`, `'space-evenly'` | Main axis distribution |
| `alignItems` | `'stretch'`, `'flex-start'`, `'flex-end'`, `'center'`, `'baseline'` | Cross axis alignment for all children |
| `alignSelf` | Same as `alignItems` | Cross axis alignment for one child (overrides parent) |
| `flex` | Any number | Growth factor for remaining space |
| `flexWrap` | `'nowrap'`, `'wrap'`, `'wrap-reverse'` | Whether children wrap to next line |
| `gap` | Number in points | Space between children (replaces manual margins) |
| `position` | `'relative'`, `'absolute'` | In-flow vs. lifted out of flow |

---

## Exercises

1. Replicate SwiftUI's `ZStack` with a `.overlay` modifier: create a circular avatar image with a small green "online" indicator badge in the bottom-right corner using `position: 'absolute'`.

2. Build a tag cloud component using `flexDirection: 'row'` and `flexWrap: 'wrap'` that renders an array of string tags as pill-shaped `View` components with `gap: 8` between them.

3. Use `onLayout` to build a component that renders either one or two columns of content depending on whether its measured width is above or below 500 points — a simple responsive layout equivalent to a SwiftUI `HStack` with a fallback `VStack`.

4. Recreate the `ContentCard` example above, then extend it to display a row of up to three avatar images at the bottom of the card using `flexDirection: 'row'` and negative `marginLeft` to overlap them, matching the style of a grouped avatar strip.
