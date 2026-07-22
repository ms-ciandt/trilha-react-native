---
title: "Debugging the New Architecture"
sidebar_label: "Debugging"
sidebar_position: 5
---

## Video Overview

> Video for this topic coming soon.

## The Debugging Stack

The New Architecture changes which tools are relevant and how they connect. Here is the complete picture:

| Tool | What it shows | When to use |
|------|--------------|-------------|
| **React Native DevTools** | JS state, component tree, network, console | Daily development |
| **Chrome DevTools (CDP)** | JS breakpoints, heap snapshots, CPU profiles | JS bugs, memory leaks |
| **Flipper** | Network, Layout Inspector, crash logs, custom plugins | Integrated dev workflow |
| **Android Studio Profiler** | CPU, memory, energy, network at native level | Native performance issues |
| **Systrace** | Frame timeline, thread activity, Binder calls | UI jank, dropped frames |
| **React DevTools Standalone** | Component tree, props, state, re-renders | React-specific debugging |

---

## React Native DevTools (Built-in, RN 0.76+)

The new first-party debugger, replacing the old Chrome remote debugger. It opens automatically when you press `j` in the Metro terminal or shake the device and tap "Open DevTools".

```bash
npx react-native start
# Press 'j' to open React Native DevTools
```

### What you get

**Sources tab** — TypeScript source maps work out of the box. Set breakpoints in your `.tsx` files, step through `async/await`, inspect the call stack.

**Console tab** — `console.log`, `console.warn`, `console.error`. Logs include file and line numbers.

**Components tab** (React DevTools integration) — inspect the React component tree, see props and state for any component, edit state live.

**Profiler tab** — record a render trace, see which components re-rendered, why they re-rendered, and how long they took.

```tsx
// Force a component to highlight on re-render (dev builds only)
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  // In React DevTools Profiler: this component will show as "re-rendered"
  // every time count changes — expected
  // If it re-renders when it shouldn't, check props stability with memo()
  return (
    <Pressable onPress={() => setCount(c => c + 1)}>
      <Text>{count}</Text>
    </Pressable>
  );
}
```

---

## Chrome DevTools via CDP

For memory profiling and advanced JS debugging, connect Chrome DevTools directly to the Hermes engine:

1. Start the app in debug mode
2. Open `chrome://inspect` in Chrome
3. Click **Inspect** on your device

### Heap Snapshot — Finding Memory Leaks

```tsx
// A common leak pattern — event listener not cleaned up
function LeakyScreen() {
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onData', handleData);
    // BUG: no return cleanup — subscription leaks when component unmounts
  }, []);
}

// Fixed
function FixedScreen() {
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onData', handleData);
    return () => subscription.remove(); // cleanup on unmount
  }, []);
}
```

To find leaks with a heap snapshot:
1. Navigate to the screen
2. Take a snapshot (Memory tab → Take snapshot)
3. Navigate away
4. Take another snapshot
5. Compare — objects that remain in the second snapshot but should have been GC'd are leaks

### CPU Profile — JS Performance

1. Performance tab → Record
2. Perform the action you want to profile (scroll, animation, interaction)
3. Stop recording
4. Look for long tasks (red blocks > 50ms on the main thread)

---

## Flipper

Flipper is Meta's extensible desktop debugging tool. Install it from [https://fbflipper.com/](https://fbflipper.com/).

### Setup (React Native 0.73+)

Flipper is no longer included by default. Add it manually:

```bash
npm install --dev flipper-plugin-react-native-performance
```

In `android/app/build.gradle`:

```gradle
dependencies {
  debugImplementation("com.facebook.flipper:flipper:${FLIPPER_VERSION}")
  debugImplementation("com.facebook.flipper:flipper-network-plugin:${FLIPPER_VERSION}")
  debugImplementation("com.facebook.flipper:flipper-fresco-plugin:${FLIPPER_VERSION}")
}
```

### Network Plugin — Like Android Studio's Network Inspector

Every `fetch` and `XMLHttpRequest` call appears in Flipper's Network tab:
- Request headers, body, timing
- Response headers, body, status
- Timeline view showing all requests in parallel

```tsx
// All requests are automatically captured — no code changes needed
const response = await fetch('https://api.example.com/users');
// Appears in Flipper Network tab immediately
```

### Layout Inspector — Like Android Studio's Layout Inspector

Navigate to **UI Debugger** in Flipper. Click any element in the preview to see:
- The React component name
- All props
- The native view hierarchy underneath
- Margin, padding, and size values from Yoga

### Hermes Debugger Plugin

Flipper's Hermes Debugger provides one-click CPU profiling:

1. Connect device in Flipper
2. Open **Hermes Debugger** plugin
3. Click **Enable Profiling**
4. Perform the action to profile
5. Click **Disable Profiling**
6. The trace opens in the Performance tab automatically

---

## Android Studio Profiler — Native Performance

When the issue is in Kotlin (TurboModule, Fabric Component, or native code), use Android Studio's profiler — the same one you use for any Android app.

### Attach to a running React Native app

```
Android Studio → View → Tool Windows → Profiler → + → your device → your app process
```

### CPU Profiler — TurboModule performance

Use the CPU Profiler to see how long your Kotlin TurboModule methods take:

1. Start a **Sample Java/Kotlin Methods** recording
2. Trigger the TurboModule call from JS
3. Stop recording
4. Find your module's methods in the flame chart

```kotlin
// Add a trace section for detailed profiling
override fun getBatteryLevel(promise: Promise) {
    android.os.Trace.beginSection("NativeDeviceInfo.getBatteryLevel")
    try {
        val bm = reactApplicationContext
            .getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        promise.resolve(level.toDouble())
    } finally {
        android.os.Trace.endSection()
    }
}
```

The `Trace.beginSection/endSection` calls appear as named blocks in both the Android Studio Profiler and in Systrace.

### Memory Profiler — Fabric Component leaks

If your `AbstractComposeView` holds references that outlive the view:

1. Open the Memory Profiler
2. Navigate to the screen with the Fabric component
3. Force GC (garbage can icon)
4. Navigate away
5. Force GC again
6. Heap dump → filter by your class name

If your `RatingBarComposeView` (or similar) still appears after navigating away and forcing GC, you have a leak — usually a callback or listener not cleared in `onDetachedFromWindow`.

```kotlin
override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    // Clear any references that could leak
    onChangeCallback = null
    disposeComposition()  // important for AbstractComposeView
}
```

---

## Systrace — Frame Timeline

Systrace captures a detailed timeline of everything happening on the device during a capture window. It is the most powerful tool for diagnosing dropped frames.

```bash
# Start capture (10 seconds)
python3 $ANDROID_HOME/platform-tools/systrace/systrace.py \
  --time=10 \
  -o trace.html \
  sched gfx view react

# Open in Chrome
open trace.html
```

In the trace, look for:
- **Choreographer#doFrame** — one per 16ms (60fps). A gap means a dropped frame.
- **RenderThread** — if this is blocked, your Fabric layout is too heavy.
- **JS** — the JavaScript thread. Long sections here mean your JS is blocking.
- Your `Trace.beginSection` markers — exactly where your Kotlin code runs.

### Reading a jank trace

```
Timeline (1 frame = 16ms at 60fps)
│
├── Frame 1 [16ms] ✓ smooth
├── Frame 2 [16ms] ✓ smooth
├── Frame 3 [48ms] ✗ JANK — 3 frames dropped
│   ├── JS thread: 22ms  ← too long
│   │   └── [your FlatList renderItem]
│   └── RenderThread: 26ms
│       └── [shadow tree sync]
└── Frame 4 [16ms] ✓ smooth
```

The 22ms JS burst is the culprit — `renderItem` is doing too much work synchronously. Fix: move computation to `useMemo`, reduce component complexity, or use `getItemLayout` to skip measurement.

---

## LogBox — Structured Error Overlay

React Native's LogBox shows runtime errors and warnings as an overlay. As a TurboModule author, throw meaningful errors:

```kotlin
// Good — descriptive error codes and messages
promise.reject(
    "PERMISSION_DENIED",           // code — shown in LogBox
    "READ_EXTERNAL_STORAGE permission not granted. " +
    "Request it with PermissionsAndroid before calling readFile().",
    exception
)

// Bad — opaque
promise.reject("ERROR", "Something went wrong")
```

On the JS side, catch and display them:

```tsx
async function loadFile(path: string) {
  try {
    return await NativeDeviceInfo.readFile(path);
  } catch (error: any) {
    if (error.code === 'PERMISSION_DENIED') {
      Alert.alert('Permission Required', error.message);
    } else {
      throw error; // re-throw unexpected errors to LogBox
    }
  }
}
```

---

## Why Warnings and the Bridge

In the New Architecture with `RN$Bridgeless = true`, any call to the old bridge APIs will either warn or throw. Watch the LogBox for:

```
WARN: NativeModule RCTXxx is not available in the new architecture.
```

This means a library you depend on still uses old native modules. Solutions:
1. Update the library to a version with New Architecture support
2. Check [reactnative.directory](https://reactnative.directory/?newArchitecture=true) for NA-compatible alternatives
3. Use the interop layer (enabled by default in RN 0.74+) — old modules run in compatibility mode

---

## Debugging Checklist

Before filing a bug report or spending hours investigating, run through this:

```
JS layer:
  □ console.log at the call site — is the function being called?
  □ React DevTools — is the component re-rendering when expected?
  □ TanStack Query DevTools — is the query running, what is the cache key?

Native layer:
  □ Logcat (adb logcat | grep ReactNative) — any native exceptions?
  □ Promise.reject message — what error code and message came back?
  □ Android Studio Profiler — is the Kotlin method completing quickly?

Bridge/interop:
  □ global.RN$Bridgeless — is New Architecture actually enabled?
  □ LogBox — any "not available in new architecture" warnings?
  □ Flipper Network — is the API call going out? What is the response?
```

---

## Study Materials

### Official Documentation

- [React Native — Debugging](https://reactnative.dev/docs/debugging)
- [React Native — React Native DevTools](https://reactnative.dev/docs/react-native-devtools)
- [Android — System Tracing](https://developer.android.com/topic/performance/tracing)
- [Android — Android Studio Profiler](https://developer.android.com/studio/profile)

### Tools

- [Flipper](https://fbflipper.com/)
- [React DevTools](https://github.com/facebook/react/tree/main/packages/react-devtools)
- [Reactotron](https://github.com/infinitered/reactotron) — alternative to Flipper

### Videos

- [React Native EU — Debugging React Native in 2024](https://www.youtube.com/watch?v=Sy8a7oNfnkE)
- [Android Developers — Android Studio Profiler](https://www.youtube.com/watch?v=O5V9ZSL0BsM)

---

## Module Summary

You have completed the New Architecture module. Here is the full map:

| Topic | What you built / learned |
|-------|--------------------------|
| Hermes | Bytecode pre-compilation, memory model, profiling |
| JSI | C++ bridge replacement, synchronous calls, shared memory |
| TurboModule | TypeScript spec → Codegen → Kotlin implementation |
| Fabric + Compose | Jetpack Compose view exposed via Fabric ViewManager |
| Debugging | React Native DevTools, Flipper, Systrace, Android Studio |

The next module covers native device resources: Camera (CameraX), Permissions, Storage, Sensors — all from an Android developer's perspective.
