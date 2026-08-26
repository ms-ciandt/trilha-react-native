---
title: RN Core Components — UIKit and SwiftUI Mapping
---

# RN Core Components — UIKit and SwiftUI Mapping

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/fund_06_rn-core-components.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/fund_06_rn-core-components_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

> React Native ships with a set of built-in components that map directly to native platform views. There is no HTML here — every component renders real native UI.

## Component Mapping at a Glance

| UIKit | SwiftUI | React Native |
|-------|---------|--------------|
| `UILabel` | `Text` | `<Text>` |
| `UIImageView` | `Image` | `<Image>` |
| `UIButton` | `Button` | `<Button>` / `<Pressable>` / `<TouchableOpacity>` |
| `UIScrollView` | `ScrollView` | `<ScrollView>` |
| `UITableView` | `List` | `<FlatList>` |
| `UICollectionView` | `LazyVGrid` / `LazyHGrid` | `<FlatList numColumns={N}>` |
| `UIStackView` (vertical) | `VStack` | `<View style={{ flexDirection: 'column' }}>` |
| `UIStackView` (horizontal) | `HStack` | `<View style={{ flexDirection: 'row' }}>` |
| `UITextField` | `TextField` | `<TextInput>` |
| `UISwitch` | `Toggle` | `<Switch>` |
| `UIActivityIndicatorView` / `UIProgressView` | `ProgressView` | `<ActivityIndicator>` |
| `UIView` with `safeAreaInsets` | `safeAreaInset` / `.ignoresSafeArea` | `<SafeAreaView>` |
| `UIApplication.setStatusBarStyle` | `.statusBar` modifier | `<StatusBar>` |

---

## `<Text>` — UILabel Equivalent

In UIKit, `UILabel` displays static text. In SwiftUI, the component is called `Text`. In React Native, the equivalent is `<Text>`:

```tsx
import { Text } from 'react-native';

// UIKit: label.text = "Hello, world"
// SwiftUI: Text("Hello, world")
<Text style={{ fontSize: 16, color: '#333' }}>Hello, world</Text>
```

Key props:

| Prop | UIKit / SwiftUI equivalent | Description |
|------|---------------------------|-------------|
| `numberOfLines` | `label.numberOfLines` / `.lineLimit()` | Limits the number of displayed lines |
| `ellipsizeMode` | `label.lineBreakMode` / `.truncationMode()` | Where to truncate the text |
| `selectable` | `label.isUserInteractionEnabled` | Allows text selection |
| `onPress` | `UITapGestureRecognizer` | Tappable text |

```tsx
<Text
    style={{ fontSize: 18, fontWeight: 'bold' }}
    numberOfLines={2}
    ellipsizeMode="tail"
    selectable={true}
    onPress={() => console.log('text pressed')}
>
    This is a long text that will be truncated after two lines when it exceeds the defined limit.
</Text>

{/* Nested text — equivalent to NSAttributedString or inline Text in SwiftUI */}
<Text>
    Normal text <Text style={{ fontWeight: 'bold' }}>bold part</Text> normal again
</Text>
```

---

## `<Image>` — UIImageView Equivalent

In UIKit, `UIImageView` displays local and remote images. In React Native, use `<Image>`:

```tsx
import { Image } from 'react-native';

// Remote image — equivalent to loading with URLSession + UIImageView
<Image
    source={{ uri: 'https://example.com/photo.jpg' }}
    style={{ width: 200, height: 200, borderRadius: 100 }}
    resizeMode="cover"  // "cover" | "contain" | "stretch" | "center"
/>

// Local image — equivalent to UIImage(named:) with project assets
<Image
    source={require('./assets/logo.png')}
    style={{ width: 100, height: 40 }}
/>
```

| `resizeMode` | UIKit equivalent | Behavior |
|--------------|-----------------|----------|
| `"cover"` | `.scaleAspectFill` | Fills the frame, may crop |
| `"contain"` | `.scaleAspectFit` | Fits in frame, may show empty space |
| `"stretch"` | `.scaleToFill` | Distorts to fill |
| `"center"` | `.center` | Centers without resizing |

:::tip Use expo-image in production
For better performance (caching, transitions, blurhash placeholders), use `expo-image`:
```tsx
import { Image } from 'expo-image';
<Image source="https://..." style={{ width: 200, height: 200 }} contentFit="cover" />
```
:::

---

## `<Button>`, `<Pressable>` and `<TouchableOpacity>` — UIButton Equivalent

In UIKit, `UIButton` is the standard button component. In React Native, there are three options:

```tsx
import { Button, Pressable, TouchableOpacity, Text } from 'react-native';

// Button — simple, no visual customization
<Button title="Save" onPress={() => {}} color="#007AFF" />

// TouchableOpacity — reduces opacity on press (familiar iOS behavior)
<TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
    <Text>Press here</Text>
</TouchableOpacity>

// Pressable — modern API, more flexible
<Pressable
    onPress={() => console.log('pressed')}
    onLongPress={() => console.log('long press')}
    style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
    ]}
>
    {({ pressed }) => (
        <Text style={pressed ? styles.textPressed : styles.text}>
            Press me
        </Text>
    )}
</Pressable>
```

### hitSlop — Expanding the Tap Target

In UIKit, `UIButton.contentEdgeInsets` expands the tappable area. In React Native, use `hitSlop`:

```tsx
// UIKit: button.contentEdgeInsets = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
<Pressable
    onPress={() => {}}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
    <Text>Small button, large tap area</Text>
</Pressable>
```

Use `Pressable` for all new code. `TouchableOpacity` still works but is considered legacy. `Button` is useful only for quick prototyping.

---

## `<ScrollView>` — UIScrollView Equivalent

`UIScrollView` is the base scroll component in UIKit. The equivalent in React Native is `<ScrollView>`:

```tsx
import { ScrollView } from 'react-native';

function ProductDetail() {
    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}              // iOS bounce behavior
            contentContainerStyle={{ padding: 16 }}
        >
            {/* content that exceeds the screen */}
        </ScrollView>
    );
}
```

`ScrollView` renders all children immediately. Use it for fixed-size, short content (forms, detail screens). For long dynamic lists, use `FlatList`.

---

## `<FlatList>` — UITableView and UICollectionView Equivalent

### FlatList vs UITableView — Cell Reuse

In UIKit, `UITableView` reuses cells with the `register`/`dequeueReusableCell` pattern. React Native does this automatically with `FlatList`:

```tsx
// UIKit:
// tableView.register(PostCell.self, forCellReuseIdentifier: "PostCell")
// let cell = tableView.dequeueReusableCell(withIdentifier: "PostCell", for: indexPath) as! PostCell

// React Native:
import { FlatList } from 'react-native';

interface Post { id: string; title: string; body: string; }

function FeedPosts({ posts }: { posts: Post[] }) {
    return (
        <FlatList
            data={posts}
            keyExtractor={post => post.id}
            renderItem={({ item }) => <PostCard post={item} />}

            // Performance props
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}

            // Pull-to-refresh — equivalent to UIRefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}

            // Load more on scroll — equivalent to scrollViewDidScroll
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}

            // Empty state
            ListEmptyComponent={<EmptyFeed />}

            // Header / Footer
            ListHeaderComponent={<FeedHeader />}
            ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
        />
    );
}
```

### Optimization with getItemLayout

If all items have a fixed height, use `getItemLayout` to avoid dynamic measurements — equivalent to implementing `tableView(_:heightForRowAt:)` with a constant value:

```tsx
<FlatList
    data={posts}
    renderItem={({ item }) => <PostCard post={item} />}
    getItemLayout={(data, index) => ({
        length: 80,    // fixed height per item
        offset: 80 * index,
        index,
    })}
/>
```

### numColumns — UICollectionView Equivalent

For grid layouts like `UICollectionView`, use the `numColumns` prop:

```tsx
// UIKit: UICollectionViewFlowLayout with 3 columns
// React Native:
<FlatList
    data={photos}
    numColumns={3}
    keyExtractor={photo => photo.id}
    renderItem={({ item }) => (
        <Image
            source={{ uri: item.url }}
            style={{ width: '33.33%', aspectRatio: 1 }}
        />
    )}
/>
```

---

## `<ScrollView>` vs `<FlatList>`

| | `ScrollView` | `FlatList` |
|---|---|---|
| Renders all children | Yes (immediately) | No (lazy / virtualized) |
| Best for | Short content, forms, detail screens | Long dynamic lists |
| Performance with 1000+ items | Poor | Good |
| Pull-to-refresh | Via `RefreshControl` | Built-in `refreshing` prop |
| iOS equivalent | `UIScrollView` | `UITableView` / `UICollectionView` |

---

## `<TextInput>` — UITextField Equivalent

In UIKit, `UITextField` and `UITextView` handle text input. In React Native, both are covered by `<TextInput>`:

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
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
            />
            <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={true}      // equivalent to isSecureTextEntry
                returnKeyType="done"
                onSubmitEditing={() => login()}
            />
        </View>
    );
}
```

| Prop | UIKit equivalent | Description |
|------|-----------------|-------------|
| `keyboardType` | `keyboardType` | Type of keyboard displayed |
| `secureTextEntry` | `isSecureTextEntry` | Password field |
| `autoCapitalize` | `autocapitalizationType` | Automatic capitalization |
| `returnKeyType` | `returnKeyType` | Return key label |
| `onSubmitEditing` | `textFieldShouldReturn` | Called when return is pressed |
| `multiline` | uses `UITextView` | Multi-line input field |

---

## `<Switch>` — UISwitch and Toggle Equivalent

In UIKit, `UISwitch`. In SwiftUI, `Toggle`. In React Native, `<Switch>`:

```tsx
import { Switch } from 'react-native';
import { useState } from 'react';

function NotificationSettings() {
    const [enabled, setEnabled] = useState(false);

    return (
        <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: '#767577', true: '#34C759' }} // iOS default green
            thumbColor="#fff"
            ios_backgroundColor="#3e3e3e"
        />
    );
}
```

---

## `<ActivityIndicator>` — UIActivityIndicatorView Equivalent

In UIKit, `UIActivityIndicatorView`. In SwiftUI, `ProgressView`. In React Native, `<ActivityIndicator>`:

```tsx
import { ActivityIndicator } from 'react-native';

<ActivityIndicator
    size="large"           // "small" | "large" | number
    color="#007AFF"        // iOS default blue
    animating={loading}    // show/hide without unmounting
/>
```

---

## `<SafeAreaView>` — Handling Notch and Home Indicator

In UIKit, you use `safeAreaInsets` or `safeAreaLayoutGuide` to respect the iPhone notch and home indicator. In React Native, use `<SafeAreaView>`:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

function Screen() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            {/* Content protected from notch and home indicator */}
        </SafeAreaView>
    );
}
```

:::tip Use react-native-safe-area-context
The built-in `SafeAreaView` from React Native only works on iOS. Use the community package `react-native-safe-area-context` for consistent cross-platform behavior.
:::

---

## `<StatusBar>` — Controlling the Status Bar

In UIKit, you use `UIApplication.shared.setStatusBarStyle` or `preferredStatusBarStyle` on the view controller. In React Native, use the `<StatusBar>` component:

```tsx
import { StatusBar } from 'react-native';

function MyApp() {
    return (
        <>
            <StatusBar
                barStyle="dark-content"   // "default" | "light-content" | "dark-content"
                backgroundColor="#fff"   // Android only
            />
            {/* rest of the UI */}
        </>
    );
}
```

---

## `<KeyboardAvoidingView>` — Preventing the Keyboard from Covering Inputs

In UIKit, you observed `keyboardWillShowNotification` and manually adjusted constraints or `contentInset`. In SwiftUI, the keyboard is avoided automatically in many cases. In React Native, use `KeyboardAvoidingView`:

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
                <Button title="Sign In" onPress={handleLogin} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
```

The `behavior` prop differs by platform:

| Platform | `behavior` | What it does |
|----------|------------|--------------|
| iOS | `'padding'` | Adds padding below content to push it upward |
| Android | `'height'` | Reduces view height to fit above the keyboard |

`keyboardShouldPersistTaps="handled"` on the `ScrollView` ensures that tapping a button while the keyboard is open triggers the button's `onPress` instead of just dismissing the keyboard.

:::tip
If `KeyboardAvoidingView` is still not enough, `react-native-keyboard-controller` offers more control with smooth animations tied to the keyboard frame — much closer to what SwiftUI provides automatically.
:::

---

## Exercises

1. **Build a `UserCard`** that displays a remote avatar image, a name, and an optional "verified" badge. Use `<Image>`, `<Text>`, and `<View>`. Add a `<Pressable>` wrapper with `hitSlop` that logs the user's name when pressed.

2. **Build a settings screen** with three `TextInput` fields (username, email, bio). Wire all of them to state. Add a "Save" button that stays disabled until all three fields are filled in.

3. **Build a paginated list** using `FlatList` with `onEndReached`. Start with 10 items. Each time the user scrolls to the end, append 10 more. Show an `ActivityIndicator` in `ListFooterComponent` while loading. Add `getItemLayout` if all items have a fixed height.

---

## Resources

| Resource | Type | Link |
|----------|------|------|
| RN Core Components | Official Docs | [reactnative.dev/docs/components-and-apis](https://reactnative.dev/docs/components-and-apis) |
| expo-image | Expo Docs | [docs.expo.dev/versions/latest/sdk/image/](https://docs.expo.dev/versions/latest/sdk/image/) |
| react-native-safe-area-context | Community | [github.com/AppAndFlow/react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context) |
| react-native-keyboard-controller | Community | [github.com/kirillzyusko/react-native-keyboard-controller](https://github.com/kirillzyusko/react-native-keyboard-controller) |
