---
title: CI/CD
---

# CI/CD

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_nativo/cicd_01_ci_cd.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## The Pipeline Delta

If you already have a CI pipeline for an Android or iOS app, adding React Native is mostly additive. The native build steps stay exactly the same — `./gradlew assembleRelease`, `xcodebuild`, Fastlane lanes. You're just prepending a short JS phase: install Node dependencies, lint, run Jest. The RN JS bundle is compiled automatically as part of the native build, so there's no separate bundle step to wire up.

The mental model: think of RN as a new Gradle module (Android) or a new Xcode target (iOS) that happens to need `npm ci` before the native build starts.

---

## Mapping: Android/iOS → React Native

| Native | React Native / CI | Note |
|---|---|---|
| `./gradlew assembleRelease` (APK/AAB) | Same command | RN bundle is included automatically |
| `xcodebuild` / Fastlane (IPA) | Same command | RN is just another Xcode target |
| Ktlint / SwiftLint | ESLint | Runs in parallel with native linters |
| JUnit / XCTest | Jest | Complementary — both run in CI |

---

## A Typical RN Pipeline

The pipeline splits into two jobs: one for Android on an `ubuntu-latest` runner, one for iOS on `macos-latest`. They can run in parallel — neither depends on the other.

### Android

```yaml
name: React Native CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-android:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test

      - name: Build Android
        run: cd android && ./gradlew assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
```

The `cache: 'npm'` key on `setup-node` caches `node_modules` keyed to `package-lock.json`. On a warm cache, `npm ci` goes from ~60s to ~5s — worth adding from day one.

### iOS

```yaml
  build-ios:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Pods
        run: cd ios && pod install

      - name: Build iOS
        run: |
          cd ios
          xcodebuild \
            -workspace MyApp.xcworkspace \
            -scheme MyApp \
            -configuration Release \
            -sdk iphoneos
```

`pod install` is the most expensive step on iOS CI — it regularly takes 3–5 minutes on a cold runner. Cache `Pods/` keyed to `Podfile.lock` if your runner supports it; otherwise at minimum cache the CocoaPods spec repo.

---

## Points to Watch

**JS bundle generation** happens automatically inside `./gradlew assembleRelease` and `xcodebuild` — the native build scripts call `react-native bundle` internally. You only need a manual bundle step if you're distributing the bundle separately (e.g. for over-the-air updates).

**Environment variables** — make sure the runner has `JAVA_HOME`, `ANDROID_HOME`, and the Android SDK/NDK versions your project requires. GitHub-hosted `ubuntu-latest` runners ship with Android SDK pre-installed, but you may need to install a specific NDK version via `sdkmanager`.

**Signing** — for a distributable IPA or a signed APK, you'll need to inject keystore/certificate secrets. Store them as GitHub Secrets and pass them to Gradle/Fastlane as environment variables. Never commit signing material to the repo.

**macOS runners are expensive.** Run the full iOS build only on `push` to `main` or on release branches. For PR checks, lint + Jest on `ubuntu-latest` is fast and catches most issues without the macOS cost.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| GitHub Actions — official docs | Official | [docs.github.com/en/actions](https://docs.github.com/en/actions) |
| Fastlane | Official | [fastlane.tools](https://fastlane.tools) |
| React Native — Publishing to stores | Official Docs | [reactnative.dev/docs/publishing-to-app-store](https://reactnative.dev/docs/publishing-to-app-store) |
| EAS Build (Expo alternative) | Official | [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction) |

---