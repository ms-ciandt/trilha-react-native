---
title: "React Native Core Components"
---

# React Native Core Components

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo/fund_06_rn_core_components.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> React Native ships with a set of built-in components that map directly to native platform views. There is no HTML here — every component renders actual native UI.

## The Fundamental Mapping

| Web HTML | Android | iOS | React Native |
|----------|---------|-----|--------------|
| `<div>` | `ViewGroup` / `FrameLayout` | `UIView` | `<View>` |
| `<p>`, `<span>`, `<h1>` | `TextView` | `UILabel` | `<Text>` |
| `<img>` | `ImageView` | `UIImageView` | `<Image>` |
| `<input>` | `EditText` | `UITextField` | `<TextInput>` |
| `<button>` | `Button` | `UIButton` | `<Button>` / `<Pressable>` |
| `<ul>` + `<li>` | `RecyclerView` | `UITableView` | `<FlatList>` / `<SectionList>` |
| `<ScrollView>` | `ScrollView` | `UIScrollView` | `<ScrollView>` |
| `<select>` | `Spinner` | `UIPickerView` | `<Picker>` (community) |

---

## `<View>` — The Universal Container

`View` is the fundamental building block. It renders as a `ViewGroup` on Android and `UIView` on iOS:

```tsx
import { View, StyleSheet } from 'react-native';

function Card() {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                {/* header content */}
            </View>
            <View style={styles.body}>
                {/* body content */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        elevation: 3, // Android shadow
    },
    header: { padding: 16 },
    body: { padding: 16, paddingTop: 0 },
});
```

---

## `<Text>` — All Text Must Be Wrapped

Unlike web HTML where text can float freely, **in React Native all text must be inside `<Text>`**:

```tsx
// ERROR: raw text outside Text
<View>
    Hello World  {/* This will crash */}
</View>

// CORRECT
<View>
    <Text>Hello World</Text>
</View>
```

Text features:
```tsx
<Text
    style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}
    numberOfLines={2}           // Truncate after 2 lines (like ellipsize in Android)
    ellipsizeMode="tail"        // "tail" | "head" | "middle" | "clip"
    selectable={true}           // Allow text selection
    onPress={() => {}}          // Text can be tappable
>
    This is some long text that will be truncated after two lines.
</Text>

{/* Nested Text — inline styling */}
<Text>
    Normal text <Text style={{ fontWeight: 'bold' }}>bold part</Text> normal again
</Text>
```

---

## `<Image>` — Local and Remote Images

```tsx
import { Image } from 'react-native';

// Remote image
<Image
    source={{ uri: 'https://example.com/photo.jpg' }}
    style={{ width: 200, height: 200, borderRadius: 100 }}
    resizeMode="cover"  // "cover" | "contain" | "stretch" | "center"
/>

// Local image (require resolves at build time — like drawable resources)
<Image
    source={require('./assets/logo.png')}
    style={{ width: 100, height: 40 }}
/>
```

:::tip Use Expo Image for production
For better performance (caching, transitions, blur hash placeholders), use `expo-image`:
```tsx
import { Image } from 'expo-image';
<Image source="https://..." style={{ width: 200, height: 200 }} contentFit="cover" />
```
:::

---

## `<TextInput>` — User Input

Like `EditText` (Android) or `UITextField`/`UITextView` (iOS):

```tsx
import { useState } from 'react';
import { TextInput, View } from 'react-native';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <View>
            <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"     // Shows email keyboard
                autoCapitalize="none"
                autoComplete="email"
            />
            <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={true}            // Password field
                returnKeyType="done"              // Keyboard return key label
                onSubmitEditing={() => login()}   // Called when return key pressed
            />
        </View>
    );
}
```

---

## `<Pressable>` — Tappable Areas

Prefer `Pressable` over `TouchableOpacity` for new code (it's the modern API):

```tsx
import { Pressable } from 'react-native';

<Pressable
    onPress={() => console.log('pressed')}
    onLongPress={() => console.log('long press')}
    style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed, // visual feedback
    ]}
>
    {({ pressed }) => (
        <Text style={pressed ? styles.textPressed : styles.text}>
            Press me
        </Text>
    )}
</Pressable>
```

---

## `<FlatList>` — Virtualized Lists

The equivalent of `RecyclerView` (Android) or `UITableView` (iOS) — only renders visible items:

```tsx
import { FlatList } from 'react-native';

interface Post { id: string; title: string; body: string; }

function PostFeed({ posts }: { posts: Post[] }) {
    return (
        <FlatList
            data={posts}
            keyExtractor={post => post.id}
            renderItem={({ item }) => <PostCard post={item} />}

            // Performance props
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}

            // Pull-to-refresh (like SwipeRefreshLayout in Android)
            refreshing={isRefreshing}
            onRefresh={handleRefresh}

            // Load more on scroll
            onEndReached={loadMore}
            onEndReachedThreshold={0.5} // trigger when 50% from bottom

            // Empty state
            ListEmptyComponent={<EmptyFeed />}

            // Header / Footer
            ListHeaderComponent={<FeedHeader />}
            ListFooterComponent={isLoadingMore ? <ActivityIndicator /> : null}
        />
    );
}
```

---

## `<ScrollView>` vs `<FlatList>`

| | `ScrollView` | `FlatList` |
|---|---|---|
| Renders all children | Yes (immediately) | No (lazy/virtualized) |
| Good for | Short content, forms, detail screens | Long dynamic lists |
| Performance with 1000+ items | Bad | Good |
| Pull-to-refresh | Via `RefreshControl` | Built-in `refreshing` prop |

---

## `<SafeAreaView>` — Handling Notches and Home Indicators

Essential for iPhone notches and Android nav bars:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

function Screen() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            {/* Content is inset away from notch/home indicator */}
        </SafeAreaView>
    );
}
```

:::tip Use react-native-safe-area-context
The built-in `SafeAreaView` from React Native only works on iOS. Use the community `react-native-safe-area-context` package for consistent cross-platform behavior.
:::

---

## `<Modal>` — Overlays

```tsx
import { Modal } from 'react-native';

function ConfirmDialog({ visible, onConfirm, onCancel }: Props) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"    // "none" | "slide" | "fade"
            onRequestClose={onCancel} // Android back button
        >
            <View style={styles.backdrop}>
                <View style={styles.dialog}>
                    <Text>Are you sure?</Text>
                    <Button title="Yes" onPress={onConfirm} />
                    <Button title="No" onPress={onCancel} />
                </View>
            </View>
        </Modal>
    );
}
```

---

## `<KeyboardAvoidingView>` — Prevent the Keyboard from Covering Inputs

One of the most common first-day RN problems: the software keyboard slides up and covers a text input. `KeyboardAvoidingView` shifts the layout to keep inputs visible.

```tsx
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

function LoginScreen() {
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView keyboardShouldPersistTaps="handled">
                <TextInput placeholder="Email" keyboardType="email-address" />
                <TextInput placeholder="Password" secureTextEntry />
                <Button title="Login" onPress={handleLogin} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
```

The `behavior` prop differs by platform — this is one of the clearest examples of RN's cross-platform reality:

| Platform | `behavior` | What it does |
|----------|-----------|--------------|
| iOS | `'padding'` | Adds padding below content to push it up |
| Android | `'height'` | Reduces the view height to fit above keyboard |

`keyboardShouldPersistTaps="handled"` on the `ScrollView` ensures tapping a button while the keyboard is open fires the button's `onPress` rather than just dismissing the keyboard.

:::tip
If `KeyboardAvoidingView` still isn't enough, `react-native-keyboard-controller` gives you more control with smooth animations tied to the keyboard frame.
:::

---

## `<ActivityIndicator>` — Loading Spinner

```tsx
<ActivityIndicator
    size="large"          // "small" | "large" | number
    color="#0064d2"
    animating={isLoading}  // show/hide without unmounting
/>
```

---

## Exercises

1. **Build a `UserCard`** that displays a remote avatar image, a name, and an optional "verified" badge. Use `<Image>`, `<Text>`, and `<View>`. Add a `<Pressable>` wrapper that logs the user's name when tapped.

2. **Build a settings screen** with three `TextInput` fields (username, email, bio). Wire them all to state. Add a "Save" button that is disabled until all three fields are non-empty.

3. **Build a paginated list** using `FlatList` with `onEndReached`. Start with 10 items. Each time the user scrolls to the bottom, append 10 more. Show an `ActivityIndicator` in `ListFooterComponent` while loading.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| RN Core Components | Official Docs | [reactnative.dev/docs/components-and-apis](https://reactnative.dev/docs/components-and-apis) |
| expo-image | Expo Docs | [docs.expo.dev/versions/latest/sdk/image/](https://docs.expo.dev/versions/latest/sdk/image/) |
| react-native-safe-area-context | Community | [github.com/AppAndFlow/react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context) |

---