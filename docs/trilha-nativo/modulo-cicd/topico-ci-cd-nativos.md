---
title: CI/CD
---

# Topic — CI/CD (Track 1: Native Devs)

## Topic Goal

By the end, you should be able to:
- Understand how RN fits into the Android/iOS build pipeline
- Configure a simple pipeline with:
  - JS dependency installation (`npm ci`/`yarn install`)
  - Lint + tests
  - Android build (`./gradlew assembleRelease`)
  - iOS build (`xcodebuild` or Fastlane)
- Generate artifacts (APK/IPA) and make them available to the team
- Compare with the flow already used in pure native apps

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/React_Native_CI_CD__The_Pipeline_Delta.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Mapping: Android/iOS → React Native

| Native                         | React Native / CI                      | Note |
|--------------------------------|----------------------------------------|------|
| Build Gradle (APK/AAB)        | `./gradlew assembleRelease`            | Same as native, with RN bundle included |
| Xcode build (IPA)             | `xcodebuild` / Fastlane                | Same iOS pipeline, RN is just another target |
| Lint (Ktlint, SwiftLint)      | ESLint for JS/TS                       | Runs in parallel with native linters |
| Unit tests JUnit/XCTest       | Jest                                   | Complementary to native tests |

---

## Typical CI flow for RN

### Android (GitHub Actions, example)

```yaml
name: React Native CI

on:
  push:
    branches: [ main ]
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

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build Android
        run: cd android && ./gradlew assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
```

### iOS (macOS runner)

```yaml
  build-ios:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install pods
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

---

## Points to watch out for

- **JS dependency cache**: use `node_modules` or `npm ci` cache to speed up builds.
- **iOS Pods**: caching `Pods/` (when possible) or `Podfile.lock` to reduce `pod install` time.
- **Build environment**: ensure RN, Android, and iOS environment variables are configured (JAVA_HOME, ANDROID_HOME, etc.).
- **JS bundle**: the JS bundle is generated automatically as part of the native build; a separate CI step is not needed in most cases.

---

## Practical Exercise

1. Create a CI workflow for Android that:
   - Runs lint (`npm run lint`).
   - Runs tests (`npm test`).
   - Generates a release APK (`./gradlew assembleRelease`).
2. Configure the workflow to publish the APK as an artifact.
3. Document for the team in a `CI-CD.md`:
   - How the pipeline works.
   - Where to find the artifacts.
   - Which checks are required before merge (lint/test/build).

---

## Study Materials

### Documentation & Guides
- GitHub Actions — official documentation.
- Fastlane — automation guide for Android/iOS.

### Articles
- *React Native CI/CD Best Practices* — overview of pipelines for RN.
- *Automating Android & iOS Builds for React Native Apps* — focus on deployment.

---

Next → **[Architecture](../modulo-arquitetura/topico-arquitetura-nativos)**