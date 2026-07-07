# Módulo A — Fundamentos (Trilha Web)

> Arquivo consolidado com todo o conteúdo do Módulo A para devs React web.
> Conteúdo individual em arquivos numerados nesta pasta.

---

# Module 1: Adapting JavaScript/TypeScript for Mobile

> You already know JavaScript and React. This module is about the mental model shift from building for browsers to building for mobile devices.

## The Environment Difference

When you write React for the web, your code runs in a browser with:
- The DOM (`document`, `window`, `navigator`)
- Full CSS (every property, every selector)
- Network requests via `fetch` or `XMLHttpRequest`
- `localStorage`, `sessionStorage`, cookies
- A URL bar and routing via URL changes

When you write React Native, your JS runs in **Hermes** (a mobile JS engine) with:
- **No DOM** — no `document`, no `window`, no `innerHTML`
- **No CSS** — only a subset of layout/style properties as JS objects
- `fetch` still works (polyfilled)
- **No `localStorage`** — use `AsyncStorage` or `MMKV`
- **No URL routing** — navigation is stack/tab based

---

## What Still Works (Unchanged)

Most of your JavaScript knowledge transfers directly:


```typescript
// ✅ All of this works the same in React Native

// Core JS
const arr = [1, 2, 3].map(n => n * 2);
const { name, age } = user;
const message = `Hello, ${name}!`;

// Async/await
const data = await fetch('https://api.example.com/data');
const json = await data.json();

// Promises
Promise.all([fetchUsers(), fetchPosts()]).then(([users, posts]) => { ... });

// Array methods
users.filter(u => u.active).sort((a, b) => a.name.localeCompare(b.name));

// TypeScript types
interface User { id: string; name: string; }
type Status = 'loading' | 'success' | 'error';

// All React hooks
useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer
```


---

## What Changes

### Storage


```typescript
// Web
localStorage.setItem('token', value);
const token = localStorage.getItem('token');

// React Native — AsyncStorage (async!)
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('token', value);
const token = await AsyncStorage.getItem('token');

// React Native — MMKV (synchronous, much faster, recommended)
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV();
storage.set('token', value);
const token = storage.getString('token');
```


### Platform Detection


```typescript
// Web
if (navigator.userAgent.includes('Mobile')) { ... }

// React Native
import { Platform } from 'react-native';
if (Platform.OS === 'ios') { ... }
if (Platform.OS === 'android') { ... }
Platform.select({ ios: '#f2f2f7', android: '#ffffff', default: '#fff' });
```


### Linking & Deep Links


```typescript
// Web
window.open('https://example.com');
window.location.href = 'mailto:hello@example.com';

// React Native
import { Linking } from 'react-native';
await Linking.openURL('https://example.com');
await Linking.openURL('mailto:hello@example.com');
await Linking.openURL('tel:+15555555');
```


### Clipboard


```typescript
// Web
navigator.clipboard.writeText('hello');

// React Native
import * as Clipboard from 'expo-clipboard';
await Clipboard.setStringAsync('hello');
```


---

## Mobile-Specific Concepts You'll Need

### 1. Safe Areas
Mobile screens have notches, dynamic islands, and home indicators. Content can be hidden behind them.


```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

// Always wrap your screens in SafeAreaView
function HomeScreen() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            {/* Your content is safe here */}
        </SafeAreaView>
    );
}
```


### 2. Keyboard Avoidance
The keyboard pushes up from the bottom and can cover input fields.


```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

function LoginForm() {
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            style={{ flex: 1 }}
            // behavior="height" on Android compresses the container and routinely
            // hides inputs. Use "padding" on both platforms, or set
            // softwareKeyboardLayoutMode: "resize" in app.json and skip KAV on Android.
        >
            <TextInput placeholder="Email" />
            <TextInput placeholder="Password" secureTextEntry />
        </KeyboardAvoidingView>
    );
}
```


### 3. Gesture Handling
Mobile apps respond to swipes, pinches, and long presses — not just taps:


```tsx
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

function SwipeCard() {
    const translateX = useSharedValue(0);
    const [dismissed, setDismissed] = useState(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const swipe = Gesture.Pan()
        .onUpdate(event => {
            translateX.value = event.translationX;
        })
        .onEnd(() => {
            translateX.value = withSpring(0);
            // ⚠️ Gesture callbacks run on the UI thread.
            // To call React state setters, navigation, or any JS function,
            // you must wrap it with runOnJS — otherwise you get a hard crash:
            // "Calling into JavaScript from native is only allowed via JSI bridge"
            runOnJS(setDismissed)(true);
        });

    return (
        <GestureDetector gesture={swipe}>
            <Animated.View style={animatedStyle}>
                <Text>Swipe me</Text>
            </Animated.View>
        </GestureDetector>
    );
}
```


### 4. Status Bar
The thin bar at the top of the screen with time and battery:


```tsx
import { StatusBar } from 'expo-status-bar';

function App() {
    return (
        <>
            <StatusBar style="dark" />
            {/* ... */}
        </>
    );
}
```


---

## The TypeScript Setup

Expo projects come with TypeScript pre-configured. Key things to know:


```json
// tsconfig.json — what Expo generates
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```


The `expo/tsconfig.base` already configures path aliases, module resolution for React Native, and JSX settings. You don't need to configure these manually.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Expo Docs — Get Started | Official | [docs.expo.dev/get-started/introduction/](https://docs.expo.dev/get-started/introduction/) |
| RN Environment Setup | Official Docs | [reactnative.dev/docs/environment-setup](https://reactnative.dev/docs/environment-setup) |
| react-native-safe-area-context | Community | [github.com/AppAndFlow/react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context) |

---

Next → **[TypeScript for Web Devs](./typescript-for-web-devs)**


---

# TypeScript for Web Developers

> If you've used TypeScript on the web, you're mostly ready. This module covers the RN-specific types and patterns you'll encounter.

## React Native–Specific Types

### Style Types


```typescript
import { ViewStyle, TextStyle, ImageStyle, StyleProp } from 'react-native';

// Specific style types for each component category
const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: '#fff',
};

const labelStyle: TextStyle = {
    fontSize: 16,
    fontWeight: 'bold',
};

const avatarStyle: ImageStyle = {
    width: 40,
    height: 40,
    borderRadius: 20,
};

// StyleProp<T> allows both a single style and an array of styles
interface ButtonProps {
    style?: StyleProp<ViewStyle>;       // accepts style or [style1, style2]
    labelStyle?: StyleProp<TextStyle>;
}
```


### Component Ref Types


```typescript
import { useRef } from 'react';
import { TextInput, ScrollView, FlatList } from 'react-native';

const inputRef = useRef<TextInput>(null);
const scrollRef = useRef<ScrollView>(null);
const listRef = useRef<FlatList<unknown>>(null); // replace unknown with your item type, e.g. FlatList<Product>

// Use the ref
inputRef.current?.focus();
scrollRef.current?.scrollTo({ y: 0, animated: true });
listRef.current?.scrollToIndex({ index: 0 });
```


### Event Types


```typescript
import {
    NativeSyntheticEvent,
    NativeScrollEvent,
    TextInputChangeEventData,
    GestureResponderEvent,
} from 'react-native';

// Scroll events
function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize } = event.nativeEvent;
    console.log('scrollY:', contentOffset.y);
}

// TextInput change
function handleChange(event: NativeSyntheticEvent<TextInputChangeEventData>) {
    console.log(event.nativeEvent.text);
}

// Press event
function handlePress(event: GestureResponderEvent) {
    console.log('pressed at:', event.nativeEvent.locationX, event.nativeEvent.locationY);
}
```


---

## Typing Navigation (React Navigation)

React Navigation uses a typed param list to make navigation type-safe:


```typescript
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, Button } from 'react-native';

// Define the param list for the entire stack
type RootStackParamList = {
    Home: undefined;                    // no params
    Profile: { userId: string };        // requires userId
    Settings: { tab?: 'account' | 'privacy' };  // optional param
};

// Typed navigation hook for the Profile screen
type ProfileNavProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;
type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
    const navigation = useNavigation<ProfileNavProp>();
    const route = useRoute<ProfileRouteProp>();

    // route.params.userId is typed as `string` — no casting needed
    return (
        <View>
            <Text>User ID: {route.params.userId}</Text>
            <Button title="Go Back" onPress={() => navigation.goBack()} />
            <Button title="Go Home" onPress={() => navigation.navigate('Home')} />
        </View>
    );
}
```


---

## Typing AsyncStorage & Async Operations


```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserSession {
    userId: string;
    token: string;
    expiresAt: number;
}

async function saveSession(session: UserSession): Promise<void> {
    await AsyncStorage.setItem('session', JSON.stringify(session));
}

async function loadSession(): Promise<UserSession | null> {
    const raw = await AsyncStorage.getItem('session');
    if (!raw) return null;
    // ⚠️ `as` is not runtime validation — a stale or schema-changed value passes
    // TypeScript but can silently corrupt app state. In production, validate with
    // Zod: `const result = UserSessionSchema.safeParse(JSON.parse(raw))`
    return JSON.parse(raw) as UserSession;
}
```


---

## Useful Patterns in RN TypeScript

### Typing Component Variants


```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
}
```


### Discriminated Unions for API State


```typescript
type AsyncState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: string };

function useAsyncState<T>() {
    const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });
    // ...
    return state;
}
```


---

## Resources

| Resource | Type | Link |
|---|---|---|
| TypeScript Handbook | Official | [typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html) |
| React Native TypeScript | Official | [reactnative.dev/docs/typescript](https://reactnative.dev/docs/typescript) |
| Total TypeScript (free tutorials) | Community | [totaltypescript.com/tutorials](https://www.totaltypescript.com/tutorials) |

---

Next → **[Web vs React Native](./web-vs-rn)**


---

# Web vs React Native — Key Differences

> The most important mental model shift for React web developers moving to React Native.

## The Fundamental Difference

| | React (Web) | React Native |
|---|---|---|
| Renders to | DOM — HTML elements | Native views — UIKit / Android Views |
| Styling | CSS files, CSS-in-JS, Tailwind | JavaScript style objects |
| Layout | CSS Flexbox + Grid + Block + Inline | Flexbox only (column-first) |
| Routing | URL-based (React Router, Next.js) | Stack/Tab navigation |
| Fonts | Any web font, Google Fonts CDN | System fonts + loaded custom fonts |
| Scrolling | Browser handles it | `ScrollView` or `FlatList` |
| Animations | CSS animations / Web Animations API | Reanimated, Animated API |
| Deployment | Static hosting, CDN | App Store, Play Store |

---

## Components: HTML → React Native

This is the most immediate change. Every HTML element has an RN equivalent:


```tsx
// Web React
function WebCard() {
    return (
        <div className="card">
            <img src={avatarUrl} alt="Avatar" className="avatar" />
            <div className="content">
                <h2 className="name">{user.name}</h2>
                <p className="bio">{user.bio}</p>
                <button onClick={handleFollow}>Follow</button>
            </div>
        </div>
    );
}
```



```tsx
// React Native — same structure, native components
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

function NativeCard() {
    return (
        <View style={styles.card}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={styles.content}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.bio}>{user.bio}</Text>
                <Pressable onPress={handleFollow} style={styles.button}>
                    <Text style={styles.buttonText}>Follow</Text>
                </Pressable>
            </View>
        </View>
    );
}
```


The tree structure is identical — only the primitives change.

---

## Styling: CSS → StyleSheet


```css
/* styles.css */
.button {
    background-color: #0064d2;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: white;
    cursor: pointer;
}
```



```tsx
<button className="button">Click me</button>
```



```tsx
// React Native (StyleSheet)
const styles = StyleSheet.create({
    button: {
        backgroundColor: '#0064d2',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        // No fontSize/fontWeight on View — those go on Text
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
});

<Pressable style={styles.button}>
    <Text style={styles.buttonText}>Click me</Text>
</Pressable>
```


Key difference: **Text styling properties live on `<Text>`, not on container `<View>`**. There is no CSS inheritance in RN — `color` on a parent `View` does not apply to child `Text` elements.

---

## No CSS Inheritance

This trips up every web developer:


```tsx
// Web — color inherits through the tree
<div style={{ color: 'red' }}>
    <span>This is red</span>  {/* inherits from parent */}
</div>

// React Native — NO inheritance (except nested Text inside Text)
<View style={{ color: 'red' }}>   {/* THIS DOES NOTHING */}
    <Text>This is NOT red</Text>   {/* must set color on Text directly */}
</View>

// The only exception: nested Text inherits from parent Text
<Text style={{ color: 'red' }}>
    This is red <Text style={{ fontWeight: 'bold' }}>and this is bold red</Text>
</Text>
```


---

## No `className`, No CSS Files

You cannot use raw CSS files, CSS Modules, or the web version of `styled-components`. However, two popular alternatives are fully supported:

- **NativeWind** — Tailwind utility classes compiled to StyleSheet (covered in Module 6)
- **styled-components/native** — template literal styles via `import styled from 'styled-components/native'`

The official approach is still `StyleSheet.create`. All three options exist in production apps. In this course:


```tsx
// ❌ Does not work in React Native
<View className="flex-1 bg-white p-4" />        // No Tailwind
<View style="background-color: white; padding: 16px" /> // No CSS strings

// ✅ Works in React Native
<View style={{ flex: 1, backgroundColor: 'white', padding: 16 }} />
<View style={styles.container} />

// NativeWind — Tailwind for React Native (uses the same utility classes)
// This DOES work if you install NativeWind:
<View className="flex-1 bg-white p-4" />  // with NativeWind installed
```


---

## Navigation: URLs → Stacks


```tsx
// Web (React Router / Next.js)
import { Link, useNavigate } from 'react-router-dom';

function NavExample() {
    const navigate = useNavigate();
    return (
        <>
            <Link to="/profile">Go to Profile</Link>
            <button onClick={() => navigate('/home')}>Home</button>
            <button onClick={() => navigate(-1)}>Back</button>
        </>
    );
}
```



```tsx
// React Native with React Navigation (stack-based)
import { useNavigation } from '@react-navigation/native';

function NavExample() {
    const navigation = useNavigation();
    return (
        <>
            <Pressable onPress={() => navigation.navigate('Profile')}><Text>Go to Profile</Text></Pressable>
            <Pressable onPress={() => navigation.navigate('Home')}><Text>Home</Text></Pressable>
            <Pressable onPress={() => navigation.goBack()}><Text>Back</Text></Pressable>
        </>
    );
}
```


React Navigation uses a **stack model** — screens are pushed and popped like a call stack, matching native iOS/Android navigation behavior. If you prefer file-based routing (closer to Next.js), **Expo Router** offers that mental model but is tied to the Expo toolchain — research it separately.

---

## Events: onClick → onPress


```tsx
// Web
<button onClick={handleClick}>Click</button>
<input onChange={handleChange} />
<form onSubmit={handleSubmit}>

// React Native
<Pressable onPress={handlePress}>  // onClick → onPress
<TextInput onChangeText={setText} /> // onChange → onChangeText (gives you the string directly)
// No form elements — just group inputs manually
```


---

## Lists: map() → FlatList


```tsx
// Web — rendering a list with .map()
{users.map(user => (
    <div key={user.id} className="user-card">
        <span>{user.name}</span>
    </div>
))}
```



```tsx
// React Native — for short lists, .map() inside ScrollView is fine
<ScrollView>
    {users.map(user => (
        <View key={user.id} style={styles.userCard}>
            <Text>{user.name}</Text>
        </View>
    ))}
</ScrollView>

// For long lists — use FlatList (virtualized, like a React web virtual list)
<FlatList
    data={users}
    keyExtractor={user => user.id}
    renderItem={({ item }) => (
        <View style={styles.userCard}>
            <Text>{item.name}</Text>
        </View>
    )}
/>
```


---

## Resources

| Resource | Type | Link |
|---|---|---|
| RN Intro for React Web Devs | Official Docs | [reactnative.dev/docs/intro-react](https://reactnative.dev/docs/intro-react) |
| React Navigation | Official | [reactnavigation.org/docs/getting-started](https://reactnavigation.org/docs/getting-started) |
| NativeWind (Tailwind for RN) | Community | [nativewind.dev](https://www.nativewind.dev/) |

---

Next → **[No DOM, No CSS — Styling in Depth](./no-dom-no-css)**


---

# No DOM, No CSS — What That Actually Means

> This is the hardest mindset shift for web developers. Let's make it concrete.

## No `document`, No `window`

These browser globals simply don't exist in React Native:


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


---

## No `innerHTML`, No Direct DOM Manipulation

You cannot modify the native view tree imperatively the way you can with the DOM.


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


This is actually the same constraint that React itself imposes on web. If you've been using React correctly (no `document.querySelector` in useEffect), you're already used to this.

---

## No CSS Selectors, No Cascade


```css
/* ❌ None of this works in React Native */
.card > .title { font-size: 18px; }
.card:hover { background-color: #f5f5f5; }
.button:focus { outline: 2px solid blue; }
@media (max-width: 768px) { .sidebar { display: none; } }
* { box-sizing: border-box; }
:root { --primary: #0064d2; }
```



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


---

# Native Components for Web Developers

> You know React components. RN components work the same way — just different primitive names and a few mobile-specific behaviours.

## The Essential Swap

| Web | React Native | Notes |
|-----|--------------|-------|
| `<div>` | `<View>` | The container for everything |
| `<span>`, `<p>`, `<h1>`–`<h6>` | `<Text>` | ALL text must be in `<Text>` |
| `<img>` | `<Image>` | `source={{ uri }}` for remote, `require()` for local |
| `<input type="text">` | `<TextInput>` | `onChangeText` gives you the string directly |
| `<button>` | `<Pressable>` + `<Text>` | Or `<Button>` for a simple native button |
| `<a>` | `<Pressable>` + `navigation.navigate()` | No `href` on arbitrary elements; links are imperative |
| `<ul>` + infinite scroll | `<FlatList>` | Virtualized, handles large lists |
| `<select>` | Community `<Picker>` or ActionSheet | No built-in dropdown |
| `<textarea>` | `<TextInput multiline />` | Same component, different props |
| `<form>` | None | Group `TextInput`s manually |
| `<video>` | `expo-video` | Platform video player |
| `<input type="checkbox">` | `<Switch>` (toggle) or community lib | |
| `<progress>` | `<ProgressBar>` (community) | |

---

## `<View>` — Think `<div>` but Flexbox-First


```tsx
// Web div
<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div>Item 1</div>
    <div>Item 2</div>
</div>

// React Native View — flex column by default. gap, rowGap, columnGap all supported.
<View style={{ gap: 8 }}>
    <View><Text>Item 1</Text></View>
    <View><Text>Item 2</Text></View>
</View>
```


---

## `<Text>` — All Text Lives Here

The biggest change: you cannot render text outside of a `<Text>` component.


```tsx
// ❌ Text outside Text — CRASH
<View>
    Hello World
</View>

// ✅
<View>
    <Text>Hello World</Text>
</View>

// Inline styles via nested Text (no <strong>, <em>, <span>)
<Text style={{ fontSize: 16 }}>
    This is{' '}
    <Text style={{ fontWeight: 'bold' }}>bold</Text>
    {' '}and this is{' '}
    <Text style={{ fontStyle: 'italic', color: '#0064d2' }}>italic blue</Text>
</Text>
```


---

## `<TextInput>` — The Input Element


```tsx
// Web
<input
    type="text"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="Enter email"
/>

// React Native — onChangeText gives you the string directly (no e.target.value)
<TextInput
    value={email}
    onChangeText={setEmail}          // string, not event
    placeholder="Enter email"
    keyboardType="email-address"
    autoCapitalize="none"
    autoCorrect={false}
/>
```


### Common `TextInput` Props


```tsx
<TextInput
    // Content
    value={text}
    onChangeText={setText}
    defaultValue="initial"         // uncontrolled (like input's defaultValue on web)
    placeholder="Placeholder text"
    placeholderTextColor="#9ca3af"

    // Keyboard type
    keyboardType="default"         // "numeric" | "email-address" | "phone-pad" | "url"
    returnKeyType="next"           // "done" | "next" | "search" | "go"
    secureTextEntry={true}         // Password field

    // Behavior
    multiline={true}               // Textarea-like
    numberOfLines={4}              // Height hint for multiline
    autoFocus={true}
    autoCapitalize="sentences"     // "none" | "words" | "sentences" | "characters"
    autoCorrect={false}

    // Events
    onSubmitEditing={handleSubmit} // Return key pressed
    onFocus={handleFocus}
    onBlur={handleBlur}

    // Styling
    style={styles.input}
/>
```


---

## `<Pressable>` — The Click Handler

On the web, almost any element can have an `onClick`. In RN, you wrap things in `<Pressable>`:


```tsx
// Web — click on anything
<div onClick={handleClick}>Clickable div</div>
<span onClick={handleClick}>Clickable span</span>
<img src={...} onClick={handleClick} />

// React Native — wrap in Pressable
<Pressable onPress={handlePress}>
    <View style={styles.card}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <Text>Card title</Text>
    </View>
</Pressable>

// Pressable with visual feedback (like :hover/:active in CSS)
<Pressable
    onPress={handlePress}
    style={({ pressed }) => ({
        ...styles.button,
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
    })}
>
    <Text style={styles.buttonText}>Press Me</Text>
</Pressable>
```


---

## `<FlatList>` — The Virtualized List

For long lists, `FlatList` is essential — it only renders what's visible on screen:


```tsx
// Web — render all items (fine for short lists)
{items.map(item => <ItemCard key={item.id} item={item} />)}

// React Native — FlatList for potentially long lists
<FlatList
    data={items}
    keyExtractor={item => item.id}
    renderItem={({ item }) => <ItemCard item={item} />}

    // Grid layout (CSS grid equivalent)
    numColumns={2}
    columnWrapperStyle={{ gap: 8 }}  // gap between columns
    contentContainerStyle={{ padding: 16, gap: 8 }} // gap between rows

    // Pull to refresh
    refreshing={isRefreshing}
    onRefresh={handleRefresh}

    // Infinite scroll
    onEndReached={loadMore}
    onEndReachedThreshold={0.3}
/>
```


---

## `<Switch>` — Toggle


```tsx
import { Switch } from 'react-native';

const [isEnabled, setIsEnabled] = useState(false);

<Switch
    value={isEnabled}
    onValueChange={setIsEnabled}
    trackColor={{ false: '#d1d5db', true: '#0064d2' }}
    thumbColor={isEnabled ? '#ffffff' : '#f4f3f4'}
/>
```


---

## Exercises

1. **Convert this web React component** to React Native:
   ```tsx
   function UserCard({ user }: { user: User }) {
       return (
           <div className="card" onClick={() => navigate(`/users/${user.id}`)}>
               <img src={user.avatar} alt="avatar" className="avatar" />
               <div className="info">
                   <h3>{user.name}</h3>
                   <p>{user.email}</p>
               </div>
           </div>
       );
   }
   ```

2. **Build a search input** with a TextInput that debounces user input by 300ms before calling a `search(query)` function.

3. **Build a settings screen** with three toggle switches (Push Notifications, Dark Mode, Analytics), each persisting its state.

---

Next → **[Styling & Flexbox for Web Devs](./styling-and-flexbox)**


---

# Styling & Flexbox for Web Developers

> Your CSS knowledge transfers directly to React Native's Flexbox. The main differences are default values and the absence of web-only properties.

## What Changes from CSS

### Property Names — camelCase


```css
/* CSS */
background-color: #fff;
font-size: 16px;
border-radius: 8px;
padding-horizontal: 16px;  /* doesn't exist in CSS */
```



```typescript
// React Native StyleSheet
backgroundColor: '#fff',   // camelCase, no hyphens
fontSize: 16,              // no 'px' unit — numbers are device-independent pixels
borderRadius: 8,
paddingHorizontal: 16,     // RN shorthand (= paddingLeft + paddingRight)
```


### No Units


```typescript
// All values are unitless numbers = density-independent pixels
// Equivalent to CSS px on 1x screens; scales automatically on 2x/3x screens
fontSize: 16,       // NOT '16px', NOT '1rem'
padding: 16,        // NOT '16px'
borderRadius: 8,    // NOT '8px'
width: 200,         // fixed width in dp
width: '100%',      // percentage strings ARE supported for some properties
```


### Flexbox Default is Column


```typescript
// CSS Flexbox default:    flexDirection: 'row'
// React Native default:   flexDirection: 'column'

// To get a horizontal row in RN (like a horizontal flex div):
<View style={{ flexDirection: 'row' }}>
```


---

## Flexbox Cheat Sheet (RN-Specific)


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


---

## The Two Most Common Patterns

### 1. Fill the Screen


```tsx
// Make a component fill all available space (like height: 100vh in CSS)
<View style={{ flex: 1 }}>
    {/* fills the screen */}
</View>
```


### 2. Center Content


```tsx
// Center horizontally and vertically (like CSS flexbox centering)
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Centered!</Text>
</View>
```


---

## Interactive Practice

The same Flexbox model you already know from web CSS works in RN:

🐸 **[Play Flexbox Froggy](https://flexboxfroggy.com/)** — 24 interactive levels. Every concept you learn here applies directly in RN.

---

## Shadow and Elevation

CSS `box-shadow` splits into two in RN — and they behave very differently per platform:


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


:::note Android shadow limitation
To get a custom-colored shadow on Android, use a solid-color View as a backdrop or the community library `react-native-shadow-2`.
:::

---

## Transforms

Same as CSS transforms, but written as an array of objects inside the style prop:


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


---

## Responsive Design Without Media Queries


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


---

## NativeWind — Tailwind in React Native

If you live in Tailwind on the web, **NativeWind** brings the same utility classes to RN:

:::warning NativeWind v4 requires several config steps
The install command alone won't work — styles will appear to compile but never apply (silent failure).
:::

**1. Install packages**

```bash
npx expo install nativewind tailwindcss
```


**2. Initialize Tailwind**

```bash
npx tailwindcss init
```


**3. Configure `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```


**4. Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```


**5. Update `babel.config.js`**

```js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: ['nativewind/babel'],
    };
};
```


**6. Update `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```


**7. Import `global.css` in your root `_layout.tsx`**

```tsx
import '../global.css';
```


Now the Tailwind classes work:


```tsx
<View className="flex-1 bg-white p-4">
    <Text className="text-lg font-bold text-gray-900">Title</Text>
    <Text className="text-sm text-gray-500 mt-1">Subtitle</Text>
</View>
```


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


---

# Lists & Navigation in React Native

> You've built lists with `.map()` and navigated with React Router. This module shows you RN's virtualized list APIs and how React Navigation handles screen transitions on mobile.

## Lists

### When to Use What

| Situation | Use |
|-----------|-----|
| Short static list (< ~20 items) | `ScrollView` + `.map()` |
| Long or dynamic list | `FlatList` |
| Grouped list (like iOS settings) | `SectionList` |
| Grid layout | `FlatList` with `numColumns` |

### `FlatList` — The Workhorse


```tsx
interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
}

function ProductList({ products }: { products: Product[] }) {
    const renderProduct = useCallback(({ item }: { item: Product }) => (
        <ProductCard product={item} />
    ), []);

    return (
        <FlatList
            data={products}
            keyExtractor={product => String(product.id)} // always coerce — String() handles number and string ids
            renderItem={renderProduct}

            // Performance
            // ⚠️ removeClippedSubviews has documented content-missing bugs on Android
            // (blank areas on scroll-back). Measure before enabling in production.
            // Higher-impact: getItemLayout (fixed-height items) and windowSize (default 21, try 5–10).
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            initialNumToRender={8}

            // Layout
            contentContainerStyle={{ padding: 16, gap: 8 }}
            showsVerticalScrollIndicator={false}

            // Empty state
            ListEmptyComponent={
                <View style={{ alignItems: 'center', padding: 32 }}>
                    <Text style={{ color: '#9ca3af' }}>No products found</Text>
                </View>
            }

            // Load more
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isLoading ? <ActivityIndicator /> : null}

            // Refresh
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
        />
    );
}
```


### Grid with `numColumns`


```tsx
// Like CSS grid with equal columns
<FlatList
    data={images}
    keyExtractor={img => String(img.id)}
    numColumns={3}
    columnWrapperStyle={{ gap: 2 }}
    contentContainerStyle={{ gap: 2 }}
    renderItem={({ item }) => (
        <Image
            source={{ uri: item.url }}
            style={{ flex: 1, aspectRatio: 1 }}  // square cells
        />
    )}
/>
```


### `SectionList` — Grouped Content


```tsx
interface Section {
    title: string;
    data: Product[];
}

const sections: Section[] = [
    { title: 'Featured', data: featuredProducts },
    { title: 'New Arrivals', data: newProducts },
    { title: 'On Sale', data: saleProducts },
];

<SectionList
    sections={sections}
    keyExtractor={item => String(item.id)}
    renderItem={({ item }) => <ProductCard product={item} />}
    renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
    )}
    stickySectionHeadersEnabled={true}  // sticky like iOS section headers
/>
```


---

## Navigation with React Navigation

Mobile navigation is fundamentally different from the web. There's no URL bar — navigation is a **stack of screens pushed onto memory**, with native gestures (swipe back on iOS, Android back button) to pop them off.

**React Navigation** is the standard library for this. Install it in a React Native CLI project:

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

### Setting Up the Navigator


```tsx
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';

type RootStackParamList = {
    Home: undefined;
    Profile: { userId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
```


### Navigating Between Screens


```tsx
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function HomeScreen() {
    const navigation = useNavigation<HomeNavProp>();

    return (
        <View>
            {/* Push a new screen */}
            <Pressable onPress={() => navigation.navigate('Profile', { userId: '123' })}>
                <Text>Go to Profile</Text>
            </Pressable>
            {/* Go back */}
            <Pressable onPress={() => navigation.goBack()}>
                <Text>Back</Text>
            </Pressable>
            {/* Replace current screen (no back) */}
            <Pressable onPress={() => navigation.replace('Home')}>
                <Text>Reset</Text>
            </Pressable>
        </View>
    );
}
```


### Reading Route Params


```tsx
import { useRoute, RouteProp } from '@react-navigation/native';

type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;

function ProfileScreen() {
    const route = useRoute<ProfileRouteProp>();
    const { userId } = route.params;

    return <Text>User: {userId}</Text>;
}
```


### Tab Navigation


```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// npm install @react-navigation/bottom-tabs

const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
```


---

## Web Routing vs Mobile Navigation

| Web (React Router / Next.js) | React Native (React Navigation) |
|------------------------------|---------------------------------|
| URL-based, shareable links | Deep links supported, but optional |
| Browser back button | Native back gesture (swipe left on iOS) |
| `<Link to="...">` | `navigation.navigate('ScreenName')` |
| `useNavigate()` push/replace | `navigation.navigate()` / `navigation.replace()` |
| Query strings `?key=val` | `route.params` object |
| Modal via route | `presentation: 'modal'` in Stack.Screen |
| 404 page | Catch-all screen in navigator |

---

> **About Expo Router**
>
> If you use **Expo** (instead of React Native CLI), **Expo Router** offers file-based routing — closer to Next.js App Router in mental model. It's a valid alternative, but it's tied to the Expo toolchain. Research it separately at [docs.expo.dev/router/introduction/](https://docs.expo.dev/router/introduction/).

---

## Resources

| Resource | Type | Link |
|---|---|---|
| React Navigation Getting Started | Official | [reactnavigation.org/docs/getting-started](https://reactnavigation.org/docs/getting-started) |
| React Navigation — Stack Navigator | Official | [reactnavigation.org/docs/native-stack-navigator](https://reactnavigation.org/docs/native-stack-navigator) |
| FlatList API | Official | [reactnative.dev/docs/flatlist](https://reactnative.dev/docs/flatlist) |
| SectionList API | Official | [reactnative.dev/docs/sectionlist](https://reactnative.dev/docs/sectionlist) |
| notJust.dev — Full Course (8hr) | Video | [youtube.com/@notjustdev](https://www.youtube.com/@notjustdev) |

---

🎉 **You've completed the Web Dev Track!**

You now have the foundations to build real React Native apps. Next steps:
- Create your first project: `npx @react-native-community/cli init MyApp`
- Try [Expo Snack](https://snack.expo.dev) for quick experiments without local setup
- Watch [notJust.dev's free 8-hour course](https://www.youtube.com/@notjustdev) for a full project walkthrough


---

