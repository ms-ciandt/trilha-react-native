---
title: "Bundle Size & Startup Performance"
sidebar_label: "Bundle & Startup"
sidebar_position: 5
---

## Video Overview

> Video for this topic coming soon.

## Cold Start on Android: Where the Time Goes

You already know Android cold start: ART loads the DEX, `Application.onCreate()` runs, the main `Activity` inflates layout, and the first frame appears. React Native adds a JS layer on top of this sequence.

```
Android cold start (your Kotlin app):
  ART loads DEX → Application.onCreate() → Activity.onCreate() → First frame
  ~200ms                ~50ms               ~100ms              = ~350ms total

React Native cold start (New Architecture + Hermes):
  ART loads DEX → RN initialises → Hermes loads bytecode → JS executes → First frame
  ~200ms          ~150ms           ~50ms (pre-compiled!)   ~100ms       = ~500ms total
```

The Hermes bytecode step is fast because it was pre-compiled at build time (covered in the Hermes topic). The main levers for improving startup are:

1. **Reduce bundle size** — less to load into Hermes
2. **Lazy load modules** — defer non-critical code
3. **Optimise `Application.onCreate()`** — the native side is still yours to control
4. **Inline requires** — load modules on demand, not at startup

---

## Measuring Bundle Size

```bash
# Build the JS bundle and measure it
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/bundle.js \
  --assets-dest /tmp/assets

# Check uncompressed size
wc -c /tmp/bundle.js
# Compressed (what the device actually downloads)
gzip -k /tmp/bundle.js && wc -c /tmp/bundle.js.gz
```

A typical React Native app bundle:
- **Good**: < 1MB uncompressed
- **Acceptable**: 1–3MB
- **Needs attention**: > 3MB

---

## Bundle Analyser: What's Taking Space

```bash
npm install --dev react-native-bundle-visualizer
npx react-native-bundle-visualizer
```

This opens a treemap showing every module in your bundle by size — the equivalent of Android Studio's APK Analyser for the JS layer.

Common culprits:
- `moment.js` (240KB) → replace with `date-fns` or `dayjs` (10–20KB)
- `lodash` (entire library) → import specific functions: `import debounce from 'lodash/debounce'`
- Large icon sets → use `react-native-vector-icons` with only the needed icon family
- Duplicate dependencies (two versions of the same library)

---

## Inline Requires — Lazy Module Loading

By default, every `import` at the top of a file is loaded when the app starts. **Inline requires** move the `require()` call to the first time the module is actually used.

Enable in `metro.config.js`:

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.inlineRequires = true;

module.exports = config;
```

With inline requires, this:

```tsx
// Loaded at startup — even if this screen is never visited
import HeavyChartLibrary from 'heavy-chart-library';
```

Becomes effectively:

```tsx
// Loaded only when this code path executes
function ChartsScreen() {
  const HeavyChartLibrary = require('heavy-chart-library');
  // ...
}
```

Metro handles the transformation automatically — you keep writing `import` at the top, Metro rewrites it.

---

## React.lazy — Dynamic Screen Loading

For screens that are rarely visited (settings, onboarding, admin panels), load them lazily:

```tsx
import React, { Suspense, lazy } from 'react';
import { ActivityIndicator } from 'react-native';

// NOT loaded until this screen is first navigated to
const AdminPanel = lazy(() => import('./screens/AdminPanel'));
const OnboardingFlow = lazy(() => import('./screens/OnboardingFlow'));

function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Admin"
        component={() => (
          <Suspense fallback={<ActivityIndicator />}>
            <AdminPanel />
          </Suspense>
        )}
      />
    </Stack.Navigator>
  );
}
```

---

## Measuring Startup: TTI (Time to Interactive)

### Using Performance.now()

```tsx
// index.js — entry point
const appStart = global.performance.now();

// App.tsx — first meaningful render
function App() {
  useEffect(() => {
    const tti = global.performance.now() - appStart;
    console.log(`TTI: ${tti.toFixed(0)}ms`);
    // Send to analytics: analytics.track('app_startup', { tti })
  }, []);

  return <Navigator />;
}
```

### Using Flipper — startup plugin

Flipper's **React Native Performance** plugin shows a waterfall of startup events:

- `nativeModulesSetupStart` / `End` — native module init
- `bundleLoad` — Hermes loading the bytecode
- `jsExecutionStart` / `End` — JavaScript running
- `contentAppeared` — first meaningful frame

---

## Reducing Native Startup: Application.onCreate()

The React Native JS layer can't start until the native side is ready. Optimise `MainApplication.kt`:

```kotlin
class MainApplication : Application(), ReactApplication {

  override fun onCreate() {
    super.onCreate()

    // Don't do heavy work here — it blocks the first frame
    // BAD: synchronous network call, heavy DB migration, large file read

    // GOOD: defer non-critical initialisation
    CoroutineScope(Dispatchers.IO).launch {
      analyticsLibrary.init(applicationContext)  // can be async
      crashReporter.init(applicationContext)
    }

    // This must be synchronous — React Native needs it
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load()
    }
  }
}
```

---

## RAM Bundles — Pre-split Bundle Loading

For very large apps (> 5MB bundle), RAM Bundles split the bundle into modules loaded on demand:

In `metro.config.js`:

```js
config.serializer.processModuleFilter = (module) => true;
```

In `android/app/build.gradle`:

```gradle
project.ext.react = [
    bundleInRelease: true,
    extraPackagerArgs: ["--indexed-ram-bundle"]
]
```

RAM Bundles load each module file individually from the filesystem — the app starts faster because only the entry point and direct dependencies load at launch. Rarely needed unless your bundle exceeds 5MB.

---

## Image Optimisation

Images are often bigger than the JS bundle. A few rules:

```tsx
import { Image } from 'expo-image'; // use expo-image, not the built-in Image

// BAD: loading a 2000x2000px image into a 100x100 view
<Image source={{ uri: 'https://cdn.example.com/original.jpg' }} style={{ width: 100, height: 100 }} />

// GOOD: request the right size from the server (if your CDN supports it)
<Image
  source={{ uri: 'https://cdn.example.com/image.jpg?w=200&h=200' }}
  style={{ width: 100, height: 100 }}
  contentFit="cover"
  cachePolicy="memory-disk"  // expo-image: aggressive caching
/>
```

For local assets, use `@2x` and `@3x` variants:

```
assets/
  logo.png       ← 1x (48x48px)
  logo@2x.png    ← 2x (96x96px)
  logo@3x.png    ← 3x (144x144px)
```

Metro picks the right resolution automatically based on `PixelRatio.get()`.

---

## The Performance Checklist

Before publishing a release build, run through these:

```
Bundle:
  □ Bundle analyser run — no surprise large dependencies
  □ inline requires enabled in metro.config.js
  □ Hermes enabled (default in RN 0.70+)
  □ dev: false in release build

Lists:
  □ All FlatLists have keyExtractor with stable IDs
  □ Row components wrapped in memo()
  □ renderItem wrapped in useCallback
  □ getItemLayout set for fixed-height rows (or FlashList used)

Re-renders:
  □ React DevTools Profiler run — no unexpected re-renders
  □ Expensive computations wrapped in useMemo
  □ Callbacks to memo() children wrapped in useCallback

Startup:
  □ Application.onCreate() — no blocking work
  □ Rarely-visited screens lazy-loaded with React.lazy
  □ Images sized to display size (no massive images in small views)

Animations:
  □ All animations use Reanimated (not Animated with useNativeDriver)
  □ No heavy JS work during active animations
```

---

## Study Materials

### Official Documentation

- [React Native — Performance Overview](https://reactnative.dev/docs/performance)
- [React Native — Profiling](https://reactnative.dev/docs/profiling)
- [Metro — Bundle Optimisation](https://metrobundler.dev/docs/configuration)
- [expo-image — Documentation](https://docs.expo.dev/versions/latest/sdk/image/)

### Tools

- [react-native-bundle-visualizer](https://github.com/IjzerenHein/react-native-bundle-visualizer)
- [Flashlight](https://flashlight.dev/) — mobile performance measurement tool

### Videos

- [React Native EU — React Native Performance in 2024](https://www.youtube.com/watch?v=gvkqT_Uoahw)
- [Callstack — Optimising React Native](https://www.youtube.com/watch?v=5mBGpWNSMrM)

---

## Module Summary

You have completed the Performance module. Here is the full map:

| Topic | What you covered |
|-------|-----------------|
| Thread Model | JS thread vs UI thread, InteractionManager, startTransition |
| FlatList | keyExtractor, getItemLayout, windowSize, FlashList |
| Reanimated | useSharedValue, useAnimatedStyle, gestures on UI thread |
| Re-render Optimisation | memo, useMemo, useCallback, DevTools Profiler |
| Bundle & Startup | Bundle analyser, inline requires, React.lazy, TTI measurement |

The next module covers testing — Jest, React Native Testing Library, and Detox, mapped from JUnit, Espresso, and Kotlin test patterns.
