---
title: "React Native Core Components"
sidebar_label: "Core Components"
sidebar_position: 3
---

## Video Overview

> Video for this topic coming soon.

## There Is No XML Here

In Android you write layout XML and inflate it. In React Native there is no XML, no `LayoutInflater`, no `R.layout.*`. Every UI element is a JavaScript component that compiles to the platform's native view.

When you write `<View>` in React Native, Fabric (the new renderer) creates an actual `android.view.View` on the Android side — you're not rendering to a WebView. The components are native, the bridge is gone, and JSI connects JS directly to the native layer.

---

## The Fundamental Mapping

| Android View / Widget      | React Native Component  | Notes |
|----------------------------|-------------------------|-------|
| `View`                     | `View`                  | Generic container, like a `FrameLayout` |
| `TextView`                 | `Text`                  | **All text must be inside `<Text>`** |
| `ImageView`                | `Image`                 | Local and remote images |
| `EditText`                 | `TextInput`             | Single and multiline |
| `Button` / `ImageButton`   | `Pressable`             | New API — replaces `TouchableOpacity` |
| `RecyclerView`             | `FlatList`              | Virtualised list |
| `ScrollView`               | `ScrollView`            | Non-virtualised scroll |
| `BottomSheetDialog`        | `Modal`                 | Overlay/modal |
| `AlertDialog`              | `Alert` (API)           | Native OS alert |
| `Switch`                   | `Switch`                | Toggle |
| `ActivityIndicator`        | `ActivityIndicator`     | Loading spinner |
| `ViewPager2`               | `FlatList` horizontal   | `horizontal={true}` + `pagingEnabled` |
| `ConstraintLayout`         | `View` + Flexbox        | Flexbox handles all layout |
| `LinearLayout` vertical    | `View` (default)        | Default flex direction is column |
| `LinearLayout` horizontal  | `View` + `flexDirection: 'row'` | |

---

## View — The Container

Every React Native UI is a tree of `View` components. A `View` is a rectangular area with Flexbox layout, touch handling, and accessibility support.

```tsx
import { View } from 'react-native';

function Card() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
      <View style={{ height: 1, backgroundColor: '#eee' }} />
    </View>
  );
}
```

> **Rule**: `View` cannot contain raw strings. `<View>Hello</View>` throws an error. Text must be inside `<Text>`.

---

## Text — The Only Way to Render Text

```tsx
import { Text, StyleSheet } from 'react-native';

function Article() {
  return (
    <>
      <Text style={styles.title}>Breaking News</Text>
      <Text style={styles.body} numberOfLines={3} ellipsizeMode="tail">
        Long article body that will be truncated after 3 lines...
      </Text>
      {/* Nested Text — inherits parent style */}
      <Text style={styles.body}>
        Regular text with <Text style={{ fontWeight: 'bold' }}>bold</Text> inline.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  body:  { fontSize: 16, lineHeight: 24, color: '#555' },
});
```

### Key props

| Prop              | Type                                      | Android behaviour |
|-------------------|-------------------------------------------|-------------------|
| `numberOfLines`   | `number`                                  | Ellipsis after N lines |
| `ellipsizeMode`   | `'head' \| 'middle' \| 'tail' \| 'clip'` | Where to truncate |
| `selectable`      | `boolean`                                 | Long-press to select |
| `onPress`         | `() => void`                              | Tappable text |
| `adjustsFontSizeToFit` | `boolean`                          | Shrinks font to fit container |

---

## Image — Local and Remote

```tsx
import { Image, StyleSheet } from 'react-native';

function Avatar() {
  return (
    <>
      {/* Local asset — bundled at build time */}
      <Image source={require('./assets/avatar.png')} style={styles.avatar} />

      {/* Remote URL — requires width/height */}
      <Image
        source={{ uri: 'https://example.com/photo.jpg' }}
        style={styles.avatar}
        resizeMode="cover"
      />
    </>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32 },
});
```

### resizeMode values

| `resizeMode`  | Android equivalent             |
|---------------|-------------------------------|
| `cover`       | `centerCrop`                   |
| `contain`     | `fitCenter`                    |
| `stretch`     | `fitXY`                        |
| `center`      | `center`                       |

> For production apps, use [`expo-image`](https://docs.expo.dev/versions/latest/sdk/image/) or [`react-native-fast-image`](https://github.com/DylanVann/react-native-fast-image) — they add caching, progressive loading, and better memory handling than the built-in `Image`.

---

## TextInput — EditText

```tsx
import { TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';

function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <TextInput
      style={styles.input}
      value={query}
      onChangeText={setQuery}           // called on every keystroke
      onSubmitEditing={() => search(query)}
      placeholder="Search..."
      placeholderTextColor="#999"
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="default"            // 'email-address' | 'numeric' | 'phone-pad' | ...
      returnKeyType="search"            // changes the keyboard's return key label
      clearButtonMode="while-editing"   // iOS only — Android uses a separate clear icon
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});
```

> React Native TextInput is **controlled** by default (like Android's `EditText` with a `TextWatcher`). The `value` prop drives the displayed text; `onChangeText` gives you the new value to store in state.

---

## Pressable — The Touch Handler

`Pressable` is the modern way to handle all touch interactions. It replaces the older `TouchableOpacity`, `TouchableHighlight`, and `TouchableNativeFeedback`.

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => console.log('long press')}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,   // style changes while finger is down
      ]}
    >
      {({ pressed }) => (
        <Text style={[styles.label, pressed && { opacity: 0.7 }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button:  { backgroundColor: '#6750A4', borderRadius: 8, padding: 14, alignItems: 'center' },
  pressed: { backgroundColor: '#5a4494' },
  label:   { color: '#fff', fontWeight: '600', fontSize: 16 },
});
```

### Hit slop — expanding the touch area

```tsx
<Pressable
  onPress={handlePress}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <Text>Tap me</Text>
</Pressable>
```

This is equivalent to Android's `TouchDelegate` — extends the touchable area without changing the visual size.

---

## FlatList — The RecyclerView

`FlatList` virtualises long lists: only items near the viewport are mounted. It unmounts items as they scroll out of range, exactly like `RecyclerView`.

```tsx
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface User {
  id: string;
  name: string;
  email: string;
}

function UserList({ users }: { users: User[] }) {
  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
      ListHeaderComponent={<Text style={styles.header}>All Users</Text>}
      onEndReached={() => loadMore()}    // pagination
      onEndReachedThreshold={0.5}        // trigger 50% before end
      refreshing={isRefreshing}
      onRefresh={handleRefresh}          // pull-to-refresh
    />
  );
}
```

### RecyclerView vs FlatList mental model

| RecyclerView concept    | FlatList equivalent              |
|-------------------------|----------------------------------|
| `Adapter.getItemCount`  | `data.length`                    |
| `Adapter.onBindViewHolder` | `renderItem`                  |
| `DiffUtil.ItemCallback` | `keyExtractor` + React reconciler |
| `ItemDecoration`        | `ItemSeparatorComponent`         |
| `addOnScrollListener`   | `onScroll` prop                  |
| View recycling          | Automatic — same mechanism       |

---

## ScrollView — Non-Virtualised

Use `ScrollView` when you know the content is short and finite. For dynamic lists, always use `FlatList`.

```tsx
import { ScrollView } from 'react-native';

function SettingsScreen() {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"  // important: taps work while keyboard is open
    >
      <SettingsSection title="Account" />
      <SettingsSection title="Notifications" />
      <SettingsSection title="Privacy" />
    </ScrollView>
  );
}
```

---

## Modal — Bottom Sheet / Dialog

```tsx
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

function ConfirmDialog({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}   // Android back button
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Delete item?</Text>
          <Text style={styles.body}>This action cannot be undone.</Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={{ color: '#fff' }}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

---

## ActivityIndicator — Spinner

```tsx
import { ActivityIndicator, View } from 'react-native';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#6750A4" />
    </View>
  );
}
```

---

## SafeAreaView — Handling Notches and Navigation Bars

Android has system bars (status bar, navigation bar) and modern phones have notches or punch-hole cameras. Use `SafeAreaView` from `react-native-safe-area-context` (not the built-in one) to handle insets correctly:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {/* content is inset away from system UI */}
    </SafeAreaView>
  );
}
```

---

## Interactive Example

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/core-components-and-apis)

---

## Study Materials

### Official Documentation

- [React Native — Core Components and APIs](https://reactnative.dev/docs/components-and-apis)
- [React Native — View](https://reactnative.dev/docs/view)
- [React Native — Text](https://reactnative.dev/docs/text)
- [React Native — Image](https://reactnative.dev/docs/image)
- [React Native — TextInput](https://reactnative.dev/docs/textinput)
- [React Native — FlatList](https://reactnative.dev/docs/flatlist)
- [React Native — Pressable](https://reactnative.dev/docs/pressable)
- [React Native — Modal](https://reactnative.dev/docs/modal)

### Videos

- [Expo — Core Components Overview](https://www.youtube.com/watch?v=0-S5a0eXPoc)

---

## What's Next

You know the building blocks. Next: how to style them — `StyleSheet`, Platform-specific styles, and the full styling API.

➡ [Styling in React Native](./04-styling-stylesheet)
