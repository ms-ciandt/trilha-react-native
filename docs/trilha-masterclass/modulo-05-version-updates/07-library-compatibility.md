---
title: Compatibility of Third-Party Libraries
---

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc05_07_library-compatibility.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# Compatibility of Third-Party Libraries

> The single largest source of upgrade friction is third-party libraries that have not migrated to the New Architecture. Before committing to an upgrade timeline, inventory your dependencies first.

---

## The Two Compatibility Problems

### Problem 1: New Architecture support (the big one for 0.76+)

Libraries that use the old bridge (`NativeModules`, `NativeEventEmitter`, `requireNativeComponent`) work on New Architecture via the **Interop Layer** — but with caveats:

- Most libraries work transparently through the interop layer
- Libraries with deep native integrations (JSI, C++, custom Fabric components) may break
- Libraries that are actively maintained have usually already migrated; abandoned ones have not

### Problem 2: Peer dependency version mismatch

A library may be New Architecture compatible but declare a peer dependency on `react-native@^0.74.x` that your package manager rejects at 0.76. This is a metadata problem, not a functional one — you can usually `--legacy-peer-deps` or `overrides` your way through it, but verify the library actually runs on the new version.

---

## Before the Upgrade: Library Inventory

```bash
# Generate a list of all your RN-related dependencies
cat package.json | jq '.dependencies, .devDependencies' | grep -E '"react-native|@react-native|expo'
```

For each library, check:

1. **React Native Directory** — does it have the "New Architecture" badge?
2. **Library's GitHub releases** — is there a recent release mentioning 0.76 or New Architecture?
3. **Library's GitHub issues** — search "new architecture" or "0.76" — any known problems?

---

## Tools for Bulk Compatibility Checking

### Tool 1: `react-native-check-new-archi` (CLI)

```bash
# Install globally or use with npx
npx react-native-check-new-archi

# Output example:
Checking 47 packages...
✓ @react-navigation/native@6.1.18 — New Architecture supported
✓ react-native-reanimated@3.15.0 — New Architecture supported
✓ react-native-mmkv@3.1.0 — New Architecture supported
✗ react-native-camera@1.13.0 — NOT supported (archived)
⚠ react-native-pdf@6.7.3 — Unknown (not in directory)
```

Source: [github.com/arochedy/react-native-check-new-archi](https://github.com/arochedy/react-native-check-new-archi)

### Tool 2: React Native Directory (web)

```
https://reactnative.directory/
```

Filter: **New Architecture → Supported**

Shows the library's last update, maintenance status, weekly downloads, and compatibility flags. The most reliable signal — the Directory data comes from library maintainers who self-report.

### Tool 3: React Native Package Checker (web — bulk)

```
https://react-native-package-checker.vercel.app
```

Paste your entire `package.json` dependencies block. Outputs a table: library name, latest version, New Architecture support, last updated.

### Tool 4: `@rnx-kit/align-deps` (dependency alignment)

```bash
npx @rnx-kit/align-deps --requirements react-native@0.76

# Output:
✗ react-native-camera@1.13.0
  Expected: No compatible version found for react-native@0.76
  Suggestion: Consider an alternative — see react-native.directory
```

---

## The Three Scenarios and What to Do

### Scenario A: Library is New Architecture compatible (ideal)

Most actively maintained libraries. Just upgrade and move on.

```bash
yarn add react-native-reanimated@latest
# Verify: cat node_modules/react-native-reanimated/package.json | grep '"react-native"'
# Should show a peer dep range that includes your RN version
```

### Scenario B: Library works via Interop Layer (common)

The library uses the old bridge but the Interop Layer makes it work transparently on New Architecture. You may see a deprecation warning in Metro logs, but the library functions.

```
WARN RCTBridge required for some APIs is deprecated. Use RCTHost instead.
```

If you see this warning and the feature works: it's fine for now. File an issue or PR with the library to migrate to TurboModules. Do not panic-disable New Architecture for this.

To verify a specific library works through the interop layer:

```bash
# Enable New Architecture and run the feature
# Check Metro / Logcat for errors, not just warnings
```

### Scenario C: Library is incompatible or abandoned

```bash
# Step 1: Check for forks with New Architecture support
# Search GitHub: "react-native-camera new architecture fork 2024"

# Step 2: Check if there is a well-maintained alternative
open https://reactnative.directory/
# Search for the same functionality with "New Architecture" filter

# Step 3: If no alternative, consider wrapping with a custom TurboModule
# This is the Module 02 (TurboModules) scenario — write a thin spec over the native API
```

### Common alternatives for unmigrated libraries

| Abandoned library | New Architecture alternative |
|---|---|
| `react-native-camera` | `react-native-vision-camera` (mrousavy) |
| `react-native-firebase` (old) | `@react-native-firebase/*` v21+ |
| `react-native-maps` | `react-native-maps` 1.10+ (actively maintained) |
| `react-native-svg` | `react-native-svg` 15+ (NA compatible) |
| `react-native-linear-gradient` | `react-native-linear-gradient` 2.8+ |
| `react-native-video` | `react-native-video` 6.4+ |

---

## Library-Specific Migration Patterns

### react-native-reanimated (critical dependency)

Reanimated has a major version boundary at v3. v2.x does not support New Architecture.

```bash
yarn add react-native-reanimated@3.x

# iOS: pod install
# Android: no extra steps — Reanimated auto-configures its JSI turbo module
```

Check your animations still work — v3 has minor API changes for `useSharedValue` and `withSpring` default configs.

### react-native-screens

Any version below 3.29 has known issues with New Architecture. Update to the latest:

```bash
yarn add react-native-screens@latest
```

### @react-navigation/*

Navigation v7 is New Architecture compatible. Navigation v6 works via interop on 0.76 but you will see warnings. Plan to upgrade to v7 when upgrading to 0.76.

```bash
yarn add @react-navigation/native@7.x
yarn add @react-navigation/stack@7.x   # or whatever navigators you use
```

### react-native-gesture-handler

Version 2.21+ is fully New Architecture compatible. Older versions used the old event system and may behave differently on Fabric.

```bash
yarn add react-native-gesture-handler@latest
```

---

## If You Must Disable New Architecture Temporarily

When one incompatible library is blocking your entire upgrade, disable New Architecture for that release and plan a follow-up:

```properties
# android/gradle.properties
newArchEnabled=false
```

```ruby
# ios/Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

This keeps you on 0.76 (getting all the RN improvements) but with the Legacy Architecture while you resolve the library issue. Set a deadline — this is not a permanent state.

---

## New Architecture Working Group: Library Status Tracker

The reactwg publishes a tracker of popular libraries and their New Architecture status:

```
https://github.com/reactwg/react-native-new-architecture/discussions/167
```

As of 2024, >61% of the 400 most-installed RN libraries support New Architecture. The number grows each month.

---

## Study Materials

| Resource | Description |
|---|---|
| [React Native Directory](https://reactnative.directory/) | Searchable registry with New Architecture filter |
| [react-native-check-new-archi](https://github.com/arochedy/react-native-check-new-archi) | CLI to check all package.json deps for compatibility |
| [React Native Package Checker](https://react-native-package-checker.vercel.app/) | Web tool for bulk compatibility report |
| [@rnx-kit/align-deps](https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps) | Aligns peer dep versions after an RN upgrade |
| [Library support tracker — reactwg #167](https://github.com/reactwg/react-native-new-architecture/discussions/167) | Official 2024 status tracker of popular library compatibility |
| [New Architecture is Here](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here) | Which libraries are compatible at 0.76 launch |

---

Next → [Environment Requirements (Node, Xcode, SDKs)](./environment-requirements)
