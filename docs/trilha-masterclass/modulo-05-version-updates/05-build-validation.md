---
title: Validation with a Build on Both Platforms
---

# Validation with a Build on Both Platforms

> A successful `yarn install` and a green `pod install` are not validation. Validation means a clean build on both platforms, passing tests, and a smoke test on a physical device. In that order.

---

## Why "Works on My Machine" Is Not Enough

After an upgrade, three failure modes exist that only surface on a specific platform or device:

1. **Build-time failures** — wrong Gradle plugin version, missing Xcode setting, CocoaPods resolution conflict
2. **Runtime crashes** — a native module not found, a JSI type mismatch, edge-to-edge layout overflow
3. **Behavioral regressions** — a screen that renders but scrolls wrong, a navigation gesture that changed

You need all three checked on both platforms before shipping.

---

## Step 1: Clean the Build Caches

Cached artifacts from the previous version will cause non-deterministic failures — you may get a green build for the wrong reason or a red build for no reason.

```bash
# JavaScript / Metro cache
npx react-native start --reset-cache &

# Android — clean Gradle caches
cd android
./gradlew clean
cd ..

# iOS — clean DerivedData and Pods
cd ios
rm -rf build/
rm -rf ~/Library/Developer/Xcode/DerivedData/*
pod deintegrate
pod install
cd ..
```

> `pod deintegrate` removes all pod-injected references from the Xcode project and then `pod install` rebuilds from the current Podfile. This is the only safe way to verify the iOS build after a Podfile change.

---

## Step 2: Build Both Platforms from Source

### Android Release Build

```bash
cd android

# Confirm the Gradle wrapper version
cat gradle/wrapper/gradle-wrapper.properties | grep distributionUrl

# Build release APK (or AAB for store)
./gradlew bundleRelease

# If bundleRelease fails, run with --info to see the exact error
./gradlew bundleRelease --info 2>&1 | tail -50
```

Common post-upgrade Android failures:

| Error | Cause | Fix |
|---|---|---|
| `Could not resolve com.android.tools.build:gradle:X.X` | Gradle plugin version doesn't match wrapper | Align both using Upgrade Helper diff |
| `Namespace not specified` | `android.namespace` missing in `build.gradle` | Add `namespace "com.yourapp"` to `android {}` block |
| `minSdk < 24` when targeting New Architecture | RN 0.76+ requires `minSdkVersion = 24` | Bump `minSdk` in `build.gradle` |
| `TurboModuleRegistry.getEnforcing: 'YourModule' not found` | Module registered under wrong name or missing from `getPackages()` | Verify name string + package registration |
| CMake / JNI build failure after Codegen | Codegen output files missing or stale | Run `./gradlew generateCodegenArtifactsFromSchema` then rebuild |

### iOS Release Build

```bash
cd ios

# Build release archive via xcodebuild
xcodebuild \
  -workspace MyApp.xcworkspace \
  -scheme MyApp \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath build/ \
  clean build \
  CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO

# If it fails, look for the last "error:" line
xcodebuild ... 2>&1 | grep -E "^.*error:|Build FAILED"
```

Common post-upgrade iOS failures:

| Error | Cause | Fix |
|---|---|---|
| `'RCTAppDelegate.h' file not found` | `React_RCTAppDelegate` pod not imported | Add `import React_RCTAppDelegate` in AppDelegate |
| `No such module 'React'` | Pod install after upgrade used stale cache | `pod deintegrate && pod install` |
| `Multiple commands produce 'Info.plist'` | Xcode project file has duplicate build phases | Open Xcode, target → Build Phases, remove duplicate |
| CocoaPods version conflict | Your local CocoaPods is older than what RN requires | `sudo gem install cocoapods -v 1.15.2` |
| `Swift Compiler Error: cannot override ... from superclass` | AppDelegate change (0.76+) — your override signature no longer matches | Update method signatures to match `RCTAppDelegate` |

---

## Step 3: Run the Test Suite

```bash
# Unit and integration tests
yarn test --watchAll=false

# With coverage (run before and after upgrade to detect regressions)
yarn test --coverage --watchAll=false
```

Tests that fail specifically after an upgrade usually indicate one of:

1. A mocked native module has a new method that the mock doesn't implement — update the mock
2. A snapshot test captured old behavior — update the snapshot after verifying the new behavior is correct (`yarn test -u`)
3. A timing assumption that changed (rare — Hermes GC behavior)

---

## Step 4: Smoke Test on Physical Devices

**Simulators and emulators miss:**
- Edge-to-edge issues on Android 15 (gesture navigation bar behavior)
- Performance regressions (simulators have different CPU/GPU than real hardware)
- Camera, biometrics, push notifications
- Real memory pressure and GC behavior
- Actual network latency (simulators use host network)

### Android smoke test device matrix

| Device tier | Why |
|---|---|
| Low-end (e.g., Samsung Galaxy A14, 3GB RAM) | Exposes memory and startup time regressions |
| Mid-range (Pixel 6a) | Representative of median target device |
| Android 15 (any device) | Required if `targetSdk = 35` — edge-to-edge |
| Android 7.0 (API 24) | Your new minimum — verify the app actually runs |

### iOS smoke test device matrix

| Device | Why |
|---|---|
| Current iPhone (iOS 18) | Latest APIs, dynamic island |
| Older iPhone (iOS 15 or 16) | Your deployment target — verify nothing uses newer APIs |
| iPad (if you support it) | Layout can break differently |

### Smoke test checklist

```
App lifecycle
[ ] App launches from cold start (no prior state)
[ ] App goes to background and returns (lifecycle hooks fire correctly)
[ ] App receives a push notification in foreground and background

Navigation
[ ] Navigate to every main screen (no white screens, no crashes)
[ ] Back gesture / hardware back button works correctly
[ ] Deep link opens the correct screen

Data and network
[ ] Auth flow completes (login or restore session)
[ ] Data loads on the main feed / list screen
[ ] An API error is handled gracefully (no unhandled promise rejection crash)

Native features (if used)
[ ] Camera opens and captures
[ ] Biometric auth succeeds
[ ] Location permission prompt appears
[ ] In-app purchase flow initiates

Layout
[ ] No content hidden under status bar or navigation bar (edge-to-edge)
[ ] Keyboard does not overlap input fields
[ ] SafeArea works on notched and punch-hole devices
```

---

## Step 5: Automated CI Pipeline Integration

Integrate upgrade validation into your CI pipeline so every future upgrade is validated the same way:

```yaml
# .github/workflows/build.yml
name: Build Validation

on:
  pull_request:
    paths:
      - 'package.json'
      - 'android/**'
      - 'ios/**'

jobs:
  android-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - uses: gradle/actions/setup-gradle@v3
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      - name: Build Android Release
        run: cd android && ./gradlew bundleRelease

  ios-build:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
      - name: Install pods
        run: cd ios && bundle exec pod install
      - name: Build iOS Release
        run: |
          xcodebuild \
            -workspace ios/MyApp.xcworkspace \
            -scheme MyApp \
            -configuration Release \
            -sdk iphonesimulator \
            -destination 'platform=iOS Simulator,name=iPhone 16' \
            clean build \
            CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO
```

---

## Monitoring After Release

A clean build on both platforms is not the end. Monitor the crash rate for 48 hours after the first production release on the new version:

```bash
# Firebase Crashlytics — check crash-free user rate
# Target: within ±0.5% of pre-upgrade baseline

# Sentry — check new issue count in first 2 hours
# Filter by: platform=android OR platform=ios, version=new

# Performance monitoring
# Check: JS bundle load time, screen render time, memory usage
```

If the crash rate spikes: rollback via CodePush (JS-layer crashes) or immediate hotfix release (native crashes).

---

## Study Materials

| Resource | Description |
|---|---|
| [react-native-clean-project](https://github.com/pmadruga/react-native-clean-project) | One command to clear all RN build caches on both platforms |
| [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) | Official guide for build prerequisites per platform |
| [Running on Android Device](https://reactnative.dev/docs/running-on-device) | Official device setup guide |
| [Running on iOS Device](https://reactnative.dev/docs/running-on-simulator-ios) | Simulator and device build instructions |

---

Next → [Recreation of Patches (patch-package)](./patches-recreation)
