---
title: CI/CD
---

# CI/CD

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_web/cicd_01_ci_cd.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Your Pipeline, Extended

A web CI pipeline ends at `npm run build` — a bundle of JS and static assets. A React Native pipeline keeps the same JS phase and adds a native build on top: `./gradlew assembleRelease` for Android, `xcodebuild` for iOS.

The JS steps you already know (`npm ci`, lint, tests) are unchanged and run first. They're cheap and fast on any runner. The native build is what's new, and it's where most of the configuration complexity lives.

---

## Web CI vs RN CI

| Web | React Native | Note |
|---|---|---|
| `npm ci` | `npm ci` | Identical |
| `npm run lint` | `npm run lint` | Identical — ESLint on the same codebase |
| `npm test` | `npm test` | Identical — Jest |
| `npm run build` → JS bundle | `cd android && ./gradlew assembleRelease` | Native build that bundles JS internally |
| Deploy to CDN | Upload APK / IPA artifact | Distributed to stores or testers |

The JS bundle is generated **inside** the native build — Gradle calls `react-native bundle` as part of `assembleRelease`. You do not need a separate bundle step.

---

## Android Pipeline (GitHub Actions)

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

`cache: 'npm'` on the `setup-node` step caches `node_modules` keyed to `package-lock.json`. On a warm cache, `npm ci` drops from ~60s to ~5s — add it from day one.

The GitHub-hosted `ubuntu-latest` runner comes with the Android SDK pre-installed. For most projects, no extra SDK setup is needed.

---

## Reading Gradle Errors

When the Android build fails, the error is in the Gradle output, not in the JS layer. Common patterns:

- `error: cannot find symbol` — a native dependency is missing or misconfigured. Check `android/build.gradle` and `android/app/build.gradle`.
- `Execution failed for task ':app:bundleReleaseJsAndAssets'` — the JS bundle step failed. The actual JS error will be a few lines above in the log.
- `JAVA_HOME is not set` — the runner is missing a Java environment. Add a `setup-java` step before the Gradle step.

When you see a Gradle failure you don't recognize, search the full error message — Gradle errors are verbose but specific, and the relevant line is usually in the last 20 lines of output.

---

## iOS Builds

iOS builds require a `macos-latest` runner, which costs significantly more than `ubuntu-latest`. A practical split:

- **On every PR**: run lint + tests on `ubuntu-latest`. Fast, cheap, catches most regressions.
- **On merge to main**: add the Android build. Still on Ubuntu.
- **On release branches**: add the iOS build on `macos-latest`.

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

`pod install` is slow on a cold runner (3–5 minutes). Cache the `Pods/` directory keyed to `Podfile.lock` if your runner supports it.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| GitHub Actions | Official Docs | [docs.github.com/en/actions](https://docs.github.com/en/actions) |
| Fastlane | Official | [fastlane.tools](https://fastlane.tools) |
| EAS Build (Expo alternative) | Official | [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction) |
| React Native — Publishing | Official Docs | [reactnative.dev/docs/publishing-to-app-store](https://reactnative.dev/docs/publishing-to-app-store) |

---

Next → **[Architecture](../modulo-arquitetura/topico-arquitetura-web)**
