---
title: "Hermes: The JavaScript Engine for Android"
sidebar_label: "Hermes Engine"
sidebar_position: 1
---

## Video Overview

> Video for this topic coming soon.

## What Hermes Is — and Why Android Gets the Most Benefit

React Native 0.70+ ships with Hermes as the **default JavaScript engine** on both Android and iOS. On Android, the gains are the most dramatic because the previous default — JavaScriptCore (JSC) — was never optimised for mobile.

Hermes is not a general-purpose JS engine. It was purpose-built by Meta for **React Native on mobile**: fast startup, low memory, small binary size. It does this by pre-compiling JavaScript to bytecode at **build time**, not at runtime.

---

## The Compilation Model: Hermes vs ART

As an Android developer you already understand ahead-of-time compilation. Hermes uses the same principle for JavaScript.

| Stage | ART (your Kotlin app) | Hermes (React Native) |
|-------|-----------------------|-----------------------|
| Source | `.kt` files | `.ts` / `.tsx` files |
| Compile step | `kotlinc` → `.class` → `dex` (build time) | Metro bundler + `hermesc` → `.hbc` bytecode (build time) |
| On device | Executes pre-compiled DEX | Executes pre-compiled `.hbc` bytecode |
| JIT | ART profiles hot methods and JIT-compiles them | Hermes does **not** JIT — pure interpreter of bytecode |
| Startup | Fast — no JIT warmup penalty | Fast — bytecode is loaded directly, no parse phase |

The critical difference from JSC: **JSC parses and compiles JavaScript at app launch**. On a low-end Android device this can take hundreds of milliseconds before the first frame renders. Hermes ships the bytecode pre-compiled inside the APK — the engine skips straight to execution.

---

## Hermes Bytecode: What's in the APK

When you run `npx react-native build-android` (or `eas build`), Metro bundles your JavaScript and `hermesc` compiles it to Hermes Bytecode (`index.android.bundle` is actually `.hbc` format when Hermes is enabled).

You can inspect it:

```bash
# Check if your bundle is Hermes bytecode
file android/app/src/main/assets/index.android.bundle
# Output with Hermes: "Hermes JavaScript bytecode, version 96"
# Output without:     "ASCII text"
```

The bytecode is roughly 20-30% smaller than the equivalent JavaScript source and loads significantly faster on cold start.

---

## Verifying Hermes is Active

In your React Native app at runtime:

```tsx
import { HermesInternal } from 'react-native';

const isHermes = () => !!global.HermesInternal;

function DebugInfo() {
  return (
    <Text>
      Engine: {isHermes() ? 'Hermes' : 'JavaScriptCore'}
    </Text>
  );
}
```

In `android/app/build.gradle` (React Native 0.70+):

```gradle
project.ext.react = [
    hermesEnabled: true,  // default — set false only for debugging JSC-specific issues
]
```

For the New Architecture (default in RN 0.76+), Hermes is mandatory. You cannot use JSC with the New Architecture.

---

## Memory Model: How Hermes Manages the JS Heap

Hermes uses a generational garbage collector tuned for mobile:

- **Young generation**: short-lived allocations (most React state updates, intermediate values). Collected frequently with low pause times.
- **Old generation**: long-lived objects (module cache, persistent state). Collected less frequently.
- **No concurrent GC**: Hermes GC runs on the JS thread. Pauses are short (typically < 5ms) but they are stop-the-world.

### What this means for your app

```tsx
// BAD — creates a new object on every render, pressures the young gen GC
function List({ items }) {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={{ padding: 16, margin: 8 }}> {/* new object every render */}
          <Text>{item.name}</Text>
        </View>
      )}
    />
  );
}

// GOOD — StyleSheet.create sends styles to native once, no GC pressure
const styles = StyleSheet.create({
  row: { padding: 16, margin: 8 },
});

function List({ items }) {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text>{item.name}</Text>
        </View>
      )}
    />
  );
}
```

---

## Hermes and the Chrome Debugger

When you connect Chrome DevTools to a React Native app using Hermes, the engine exposes a **Chrome DevTools Protocol (CDP)** endpoint directly — no proxy needed in RN 0.73+.

### Connecting

1. Start your app in development mode
2. Open Chrome and go to `chrome://inspect`
3. Your app appears under "Remote Target" — click **Inspect**

Or via React Native DevTools (built-in since RN 0.76):

```bash
npx react-native start
# Press 'j' in the Metro terminal to open the JS debugger
```

### What you can do

- Set breakpoints in TypeScript source (source maps are generated automatically)
- Inspect the call stack across async `await` boundaries
- Profile CPU usage with the Performance tab
- Inspect memory with the Memory tab — take heap snapshots, find leaks

---

## Hermes Profiling: Finding JS Performance Issues

Hermes has a built-in sampling profiler that produces traces compatible with Chrome's Performance tab.

### Method 1 — From the app (development build)

```tsx
// Trigger from a dev menu button or a debug screen
import { HermesInternal } from 'react-native';

function startProfiling() {
  if (HermesInternal?.enableSamplingProfiler) {
    HermesInternal.enableSamplingProfiler();
  }
}

function stopProfiling() {
  if (HermesInternal?.disableSamplingProfiler) {
    // Writes the profile to /sdcard/sampling-profiler-trace.cpuprofile
    HermesInternal.disableSamplingProfiler();
  }
}
```

Pull the file off the device:

```bash
adb pull /sdcard/sampling-profiler-trace.cpuprofile ./profile.cpuprofile
```

Open it in Chrome DevTools → Performance → Load Profile.

### Method 2 — Via Flipper (Hermes Debugger plugin)

Flipper's Hermes Debugger plugin wraps the CDP connection and provides one-click profiling without manual file management. Covered in the Debugging topic.

---

## Hermes Limits: What It Cannot Do

Hermes intentionally omits features that are expensive on mobile:

| Feature | Status | Workaround |
|---------|--------|------------|
| `eval()` | Disabled by default | Avoid — security risk anyway |
| `Function()` constructor | Disabled | Use regular functions |
| Proxy objects | Supported since Hermes 0.9 | — |
| WeakRef | Supported | — |
| `with` statement | Not supported | Don't use it |
| Regular expression named groups | Supported | — |
| BigInt | Supported since RN 0.70 | — |

If a third-party library uses `eval()` and breaks with Hermes, it needs to be replaced or patched — the library is not mobile-safe.

---

## Cold Start Impact: Real Numbers

A typical React Native app on a mid-range Android device (Snapdragon 680, 4GB RAM):

| Scenario | JSC (old default) | Hermes |
|----------|-------------------|--------|
| Bundle parse time | ~400ms | 0ms (pre-compiled) |
| Time to first frame | ~1400ms | ~800ms |
| JS heap at idle | ~35MB | ~18MB |
| APK size impact | baseline | +2MB (hermesc included) |

The 600ms cold start improvement is the single biggest win from the New Architecture for end users on Android.

---

## Study Materials

### Official Documentation

- [React Native — Using Hermes](https://reactnative.dev/docs/hermes)
- [Hermes — GitHub](https://github.com/facebook/hermes)
- [Hermes — Bytecode File Format](https://github.com/facebook/hermes/blob/main/doc/BytecodeFileFormat.md)

### Deep Dives

- [Engineering at Meta — Hermes: An open source JavaScript engine optimised for React Native](https://engineering.fb.com/2019/07/12/android/hermes/)
- [Callstack — Hermes performance analysis](https://www.callstack.com/blog/hermes-performance-on-ios)

### Videos

- [React Native EU — Hermes deep dive](https://www.youtube.com/watch?v=bDNh9tN2DdQ)

---

## What's Next

You understand how Hermes executes JavaScript on Android. Next: how JSI (JavaScript Interface) replaces the old asynchronous Bridge and enables synchronous, zero-copy communication between JS and native Kotlin code.

➡ [JSI: The Bridge Killer](./02-jsi-javascript-interface)
