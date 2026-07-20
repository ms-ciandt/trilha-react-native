---
title: History & Architecture of React Native
---

# History & Architecture of React Native

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/introducao/01_history_architecture.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## The Story in Five Acts

### Act 1 — The Problem (2012)
Facebook had a mobile web app for its news feed. It was slow. Engineers tried wrapping it in a WebView for the mobile apps — it still felt sluggish compared to native. The gap between web development speed and native app performance was a real business problem.

### Act 2 — The Hackathon (2013)
Facebook engineer Jordan Walke had already created **React** for the web (2013). Another engineer, **Christopher Chedeau** (vjeux), started hacking on a way to run React on mobile. The key insight: _what if the rendering layer was native, but the logic layer was JavaScript?_

### Act 3 — Open Source (March 2015)
React Native was announced at Facebook's F8 conference and open-sourced. The initial release supported iOS only. Android support came six months later. The promise: **"Learn once, write anywhere"** (not "write once, run anywhere" — RN code is platform-aware by design).

### Act 4 — Growth & Growing Pains (2015–2022)
RN adoption exploded. Microsoft, Shopify, Walmart, Discord, and thousands of startups used it. But the original **"Bridge" architecture** had real limitations:

- All JS↔Native communication was **asynchronous** and **serialized to JSON**
- You couldn't call native code synchronously — even for something as simple as reading a layout value
- The bridge was a **bottleneck**: high-frequency operations like animations lagged behind
- React Concurrent Mode was **incompatible** with the old bridge

### Act 5 — The New Architecture (2022–2024, production-ready Oct 2024)
After years of incremental work, the **New Architecture** shipped as the default in React Native **0.76** (October 2024). This was a fundamental rewrite of the internals — not a patch, but a new foundation.

---

## Old Architecture vs New Architecture

### Old Architecture (the Bridge)

```
┌─────────────────────────────────────────────────┐
│               JavaScript Thread                  │
│    (your app code, React, business logic)        │
└─────────────────────────────────────────────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │       The Bridge       │  ← JSON serialization
           │    (async, batched)    │     every message
           └────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                Native Thread                     │
│        (UIKit on iOS, Android Views)             │
└─────────────────────────────────────────────────┘
```

Every interaction — drawing a pixel, responding to a gesture, measuring text — had to cross this bridge as a serialized JSON message. It was like sending a letter every time you wanted to talk to your neighbour.

### New Architecture (JSI + Fabric + TurboModules)

```
┌─────────────────────────────────────────────────┐
│           JavaScript Engine (Hermes)             │
│     JSI: direct C++ object references            │
│     (zero serialization, can be synchronous)     │
└─────────────────────────────────────────────────┘
                        │
              ↕ shared C++ layer ↕
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
┌──────────────────┐        ┌──────────────────────┐
│ Fabric Renderer  │        │    TurboModules       │
│ (new UI engine)  │        │ (lazy native modules) │
└──────────────────┘        └──────────────────────┘
          │                            │
          └─────────────┬──────────────┘
                        ▼
┌─────────────────────────────────────────────────┐
│                 Platform Layer                    │
│  UIKit / SwiftUI (iOS) | Android Views / Compose │
└─────────────────────────────────────────────────┘
```

#### The Three Pillars

| Pillar | What it replaces | What it does |
|--------|-----------------|--------------|
| **JSI** (JavaScript Interface) | The Bridge | Direct C++ ↔ JS bindings — synchronous, zero JSON serialization |
| **Fabric** | UIManager / ViewManager | New rendering engine in shared C++; enables synchronous layout, concurrent React |
| **TurboModules** | NativeModules | Lazily-loaded native modules backed by JSI; faster startup |

---

## Why React Native Is Excellent in 2026

### 1. True Cross-Platform with Native Feel
Unlike web-based frameworks (Cordova, Ionic), React Native renders **real native components** — not HTML in a WebView. A `<Button>` in RN renders a `UIButton` on iOS and an `android.widget.Button` on Android.

### 2. New Architecture Closes the Performance Gap
With JSI, layout measurement is synchronous. Animations via **Reanimated 3** run entirely on the UI thread — 60/120fps with zero bridge traffic. The performance gap vs. pure native is now negligible for most applications.

### 3. React Concurrent Mode Support
Fabric enables React 18/19 features: **Suspense**, **useTransition**, **startTransition** — the same concurrent features that make web React fast now work on mobile too.

### 4. Expo as an Alternative Toolchain
**Expo** is a popular framework built on top of React Native that simplifies project setup and adds first-party libraries. It offers:
- Over-the-air updates with **EAS Update**
- Native module access without Xcode/Android Studio for most use cases
- File-based routing with **Expo Router** (an alternative to React Navigation)
- Direct **SwiftUI** and **Jetpack Compose** interop

**This course uses React Native CLI + React Navigation** — the industry baseline you'll find in most production codebases. Expo (including Expo Router) is a valid alternative with its own trade-offs; if you want to explore it, the [Expo documentation](https://docs.expo.dev) is an excellent starting point.

### 5. One Language, Two Platforms
Write TypeScript once. Ship to both iOS and Android. Your Kotlin/Swift stays for the platform-specific modules that truly need it — but most app logic is shared.

### 6. Massive Ecosystem
- **React Navigation** for navigation (or **Expo Router** if using Expo)
- **React Query** / **Zustand** / **Jotai** for state management
- **MMKV** for fast storage, **Reanimated** for animations, **Skia** for 2D graphics
- All the JavaScript/TypeScript tooling you already know (ESLint, Prettier, Vitest)

### 7. Backed by Meta, Microsoft, Shopify, and Expo
The New Architecture was co-authored by Meta and Microsoft. Shopify rewrote their flagship app in RN. The framework is not a side project — it has the resources and the production pressure of major companies.

---

## Platform Comparison: The Same Screen

Let's see a simple "Hello World" screen across all four platforms:

**Web (React)**
```jsx
// React web
function App() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h1 style={{ color: '#0064d2' }}>Hello, World!</h1>
    </div>
  );
}
```

**Android (Kotlin)**
```kotlin
// activity_main.xml + MainActivity.kt
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        // layout XML defines the TextView with gravity="center"
    }
}
```

**iOS (Swift)**
```swift
// SwiftUI
struct ContentView: View {
    var body: some View {
        VStack {
            Spacer()
            Text("Hello, World!")
                .font(.title)
                .foregroundColor(.blue)
            Spacer()
        }
    }
}
```

**React Native (runs on both iOS and Android)**
```jsx
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, World!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#0064d2',
    fontWeight: 'bold',
  },
});
```

Notice:
- RN uses `View` instead of `div`, `Text` instead of `h1`
- Styles are JavaScript objects, not CSS files
- `flex: 1` means "fill all available space" — same flexbox model as web CSS
- The same file produces a native `UILabel` on iOS and a native `TextView` on Android

## Resources

| Resource | Type | Link |
|---|---|---|
| RN 0.76 — New Architecture announcement | Official Blog | [reactnative.dev/blog/2024/10/23/release-0.76-new-architecture](https://reactnative.dev/blog/2024/10/23/release-0.76-new-architecture) |
| New Architecture deep dive | Official Docs | [reactnative.dev/architecture/landing-page](https://reactnative.dev/architecture/landing-page) |
| RN History (Wikipedia) | Reference | [en.wikipedia.org/wiki/React_Native](https://en.wikipedia.org/wiki/React_Native) |
| Expo SDK 56 Changelog | Official | [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56) |

---

Next → **[New Architecture Deep Dive](./new-architecture)**