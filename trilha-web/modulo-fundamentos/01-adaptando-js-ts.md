---
id: adapting-js-for-mobile
title: "Module 1: Adapting JS/TS for Mobile"
sidebar_label: "Adapting JS for Mobile"
nav_order: 1
parent: Fundamentos
grand_parent: Trilha Web
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

{% raw %}
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
{% endraw %}

---

## What Changes

### Storage

{% raw %}
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
{% endraw %}

### Platform Detection

{% raw %}
```typescript
// Web
if (navigator.userAgent.includes('Mobile')) { ... }

// React Native
import { Platform } from 'react-native';
if (Platform.OS === 'ios') { ... }
if (Platform.OS === 'android') { ... }
Platform.select({ ios: '#f2f2f7', android: '#ffffff', default: '#fff' });
```
{% endraw %}

### Linking & Deep Links

{% raw %}
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
{% endraw %}

### Clipboard

{% raw %}
```typescript
// Web
navigator.clipboard.writeText('hello');

// React Native
import * as Clipboard from 'expo-clipboard';
await Clipboard.setStringAsync('hello');
```
{% endraw %}

---

## Mobile-Specific Concepts You'll Need

### 1. Safe Areas
Mobile screens have notches, dynamic islands, and home indicators. Content can be hidden behind them.

{% raw %}
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
{% endraw %}

### 2. Keyboard Avoidance
The keyboard pushes up from the bottom and can cover input fields.

{% raw %}
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
{% endraw %}

### 3. Gesture Handling
Mobile apps respond to swipes, pinches, and long presses — not just taps:

{% raw %}
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
{% endraw %}

### 4. Status Bar
The thin bar at the top of the screen with time and battery:

{% raw %}
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
{% endraw %}

---

## The TypeScript Setup

Expo projects come with TypeScript pre-configured. Key things to know:

{% raw %}
```json
// tsconfig.json — what Expo generates
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```
{% endraw %}

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
