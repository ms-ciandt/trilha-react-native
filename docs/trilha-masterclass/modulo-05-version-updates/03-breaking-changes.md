---
title: Analysis of Breaking Changes
---

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc05_03_breaking-changes.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# Analysis of Breaking Changes

> Breaking changes in React Native occur in three layers independently: the JavaScript API surface, the Android native build system, and the iOS native build system. A change can break iOS without touching Android. Reading only the JS changelog is not enough.

---

## Where to Find Breaking Changes

### Source 1: The official CHANGELOG.md

```
https://github.com/facebook/react-native/blob/main/CHANGELOG.md
```

The authoritative source. Every version has a `Breaking Changes` subsection. Read it first — before the Upgrade Helper diff, before the blog posts.

Format:

```
## v0.76.0

### Breaking Changes
- **Android**: Minimum SDK raised from 23 to 24 (#46252) — devices below Android 7.0 no longer supported
- **Android**: `StatusBar.setBackgroundColor` deprecated — edge-to-edge enforcement at targetSdk=35
- **iOS**: `AppDelegate` must extend `RCTAppDelegate` — manual `RCTRootViewFactory` setup removed
- **JS**: `Animated.event` with `useNativeDriver` now throws if handler is missing (#45123)
```

### Source 2: reactwg/react-native-releases discussions

```
https://github.com/reactwg/react-native-releases/discussions
```

The Releases Working Group publishes a "Road to 0.7x" thread for each upcoming release. Community members report issues with the RC — this is where you find breaking changes that didn't make the official changelog yet, or where the migration path is explained in detail.

### Source 3: GitHub Release Notes (per tag)

```
https://github.com/facebook/react-native/releases/tag/v0.76.0
```

Shorter than the full CHANGELOG but focused per release. Good for quick scanning.

### Source 4: Meta Engineering / RN Team Blog

```
https://reactnative.dev/blog
```

Major versions (0.73, 0.74, 0.76) get a dedicated blog post explaining the biggest changes, migration steps, and the intent behind decisions. These are the most readable summaries.

---

## High-Impact Breaking Changes by Version (0.72 → 0.76)

### 0.73 — Hermes as the only bundled engine

**What changed:** JSC (JavaScriptCore) is no longer bundled with RN. Hermes is the only engine.

**Impact:** If you explicitly set `hermes_enabled: false` in your Podfile or `enableHermes = false` in `android/app/build.gradle`, the app will fail to compile — there is no JSC to use.

**Fix:**
```ruby
# ios/Podfile — remove or flip to true
use_react_native!(
  :hermes_enabled => true,  # this is now the only valid value
)
```

```kotlin
// android/app/build.gradle — remove the flag
// the block below should be deleted:
// project.ext.react = [enableHermes: false]
```

### 0.74 — Metro `package.json` `exports` field support on by default

**What changed:** Metro now respects the `exports` field in `package.json`, which changes module resolution for some packages.

**Impact:** Libraries that use different `exports` for Node vs browser vs RN may now resolve to a different entry point than before. Most visibly, some libraries that worked before now throw `Module not found` or import a wrong version of a file.

**Fix:**

```javascript
// metro.config.js — if a library breaks, add it to unstable_enablePackageExports
const { getDefaultConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;  // now default
// If a library breaks, add it to the blocklist:
config.resolver.unstable_packageExportsResolveMode = 'browser';

module.exports = config;
```

### 0.74 — `minSdkVersion` raised to 23

Devices below Android 6.0 (API 23) are no longer supported. This is roughly 0.5% of devices as of 2025 — check your analytics.

### 0.75 — Swift AppDelegate required (iOS)

**What changed:** The template switched to Swift (`AppDelegate.swift`) as the primary AppDelegate language. Objective-C AppDelegate (`AppDelegate.mm`) still works but is no longer the default.

**Impact:** No code change required if you stay on `.mm`. But if you have a mix of Swift and ObjC++ in your iOS project, the bridging header may need updating when you add new native code.

### 0.76 — New Architecture ON by default

**What changed:** `newArchEnabled=true` is set in `gradle.properties` and the Podfile by default. The bridge (`RCTBridge`) is replaced by `ReactHost` (Android) and `RCTHost` (iOS).

**Impact:** Any library that has not migrated to TurboModules/Fabric will either use the interop layer (most cases — transparent) or break if it has deep native integrations.

**Check your libraries before upgrading:**

```bash
npx react-native-check-new-archi
```

Output example:

```
Checking 47 packages...
✓ @react-navigation/native          — New Architecture compatible
✓ react-native-mmkv                 — New Architecture compatible
✗ react-native-camera               — NOT compatible (last checked 2024-01)
⚠ react-native-permissions          — Partial support (some methods missing)
```

**To temporarily disable New Architecture** while migrating libraries:

```properties
# android/gradle.properties
newArchEnabled=false
```

```ruby
# ios/Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

### 0.76 — ReactActivity exposes ReactHost (Android)

`getReactHost()` is now a public method on `ReactActivity`. If you were accessing the host via reflection or by subclassing `ReactHostDelegate`, switch to the public API.

```kotlin
// Before (workaround)
val host = (application as BrownfieldApp).reactHost

// After 0.76 (clean API)
val host = reactActivity.getReactHost()
```

### 0.76 — Edge-to-Edge on Android (targetSdk 35)

Covered in detail in the [Native Settings](./native-settings) topic, but the key breaking change here is:

```
StatusBar.setBackgroundColor() → no-op on Android 15
StatusBar.translucent prop → no-op on Android 15
```

Apps that set `targetSdkVersion = 35` and use either of these will silently stop working.

---

## Breaking Change Impact Matrix

For each change, assess the impact on your codebase before applying:

| Change | Affected Code Pattern | Migration Effort |
|---|---|---|
| Hermes only (0.73) | `enableHermes: false` in build files | Low — delete one line |
| Metro `exports` (0.74) | Libraries with `exports` in `package.json` | Low–Medium — usually one config flag |
| `minSdkVersion 24` (0.76) | Any code using Android API 23-only APIs | Low if unused; Medium if you have explicit API 23 fallbacks |
| New Arch default (0.76) | Custom native modules without TurboModule spec | High — requires TurboModule migration |
| RCTAppDelegate (0.76 iOS) | Custom `AppDelegate` setup | Medium — rewrite init method, test lifecycle |
| Edge-to-edge (0.76 + targetSdk 35) | `StatusBar.setBackgroundColor`, hardcoded padding | Medium — screen-by-screen audit required |
| Metro strict mode (ongoing) | Re-exported types, circular deps | Low per file, medium in aggregate |

---

## Automating the Analysis: `@rnx-kit/align-deps`

After bumping the RN version, run Microsoft's dependency aligner to surface incompatible package versions across your entire dependency tree:

```bash
npx @rnx-kit/align-deps --requirements react-native@0.76 --write
```

Output:

```
✗ react-native-reanimated@2.17.0
  Expected: ^3.0.0 for react-native@0.76
  Run: yarn add react-native-reanimated@3.x

✗ @react-native-async-storage/async-storage@1.19.0
  Expected: ^2.0.0 for react-native@0.76
  Run: yarn add @react-native-async-storage/async-storage@2.x

✓ react-native-screens@3.34.0 — OK
```

`--write` patches your `package.json` automatically. Review the changes before committing.

---

## Checking a Specific Library's New Architecture Support

```bash
# Interactive check
open https://reactnative.directory

# CLI check (all dependencies in your package.json)
npx react-native-check-new-archi

# Bulk web check
open https://react-native-package-checker.vercel.app
```

The Directory has a filter: `Libraries > New Architecture > Supported`. Use it before adding any new library to a New Architecture project.

---

## Study Materials

| Resource | Description |
|---|---|
| [CHANGELOG.md — facebook/react-native](https://github.com/facebook/react-native/blob/main/CHANGELOG.md) | Authoritative changelog with Breaking Changes per version |
| [reactwg/react-native-releases](https://github.com/reactwg/react-native-releases) | Working group — RC discussions, pre-release known issues |
| [GitHub Releases](https://github.com/facebook/react-native/releases) | Per-version release notes |
| [New Architecture is Here (0.76)](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here) | Meta blog post: every breaking change in 0.76 explained |
| [react-native-check-new-archi](https://github.com/arochedy/react-native-check-new-archi) | CLI to scan your package.json for New Architecture compatibility |
| [@rnx-kit/align-deps](https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps) | Aligns all peer dependencies after a version bump |
| [React Native Directory](https://reactnative.directory/) | Library registry with New Architecture filter |
| [Library support — reactwg #167](https://github.com/reactwg/react-native-new-architecture/discussions/167) | 2024 status tracker of library adoption for New Architecture |

---