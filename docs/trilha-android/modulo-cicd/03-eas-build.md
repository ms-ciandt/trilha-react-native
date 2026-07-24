---
title: "EAS Build"
sidebar_label: "EAS Build"
sidebar_position: 3
---

## Video Overview

> Video for this topic coming soon.

## What EAS Build Is

EAS (Expo Application Services) Build is a cloud build service for React Native — Expo manages the build machines, Android SDK, Gradle, and signing. You push your code, it produces an APK or AAB.

For teams using Expo managed or bare workflow, EAS Build eliminates the need to maintain build machines locally or in CI for the native compilation step.

---

## Installation and Setup

```bash
npm install --global eas-cli
eas login
eas build:configure
```

This creates `eas.json` in your project root.

---

## eas.json — Build Profiles

```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

## Building

```bash
# Development build (includes dev client, for testing with Expo Go replacement)
eas build --platform android --profile development

# Preview build (APK for internal testing)
eas build --platform android --profile preview

# Production AAB
eas build --platform android --profile production

# Build and submit to Play Store in one command
eas build --platform android --profile production --auto-submit
```

---

## EAS Build in GitHub Actions

```yaml
- name: Build with EAS
  run: eas build --platform android --profile production --non-interactive
  env:
    EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

Get your `EXPO_TOKEN`:

```bash
eas login
eas whoami
# Then generate a token at expo.dev/accounts/[username]/settings/access-tokens
```

---

## Credentials Management

EAS manages Android keystores for you — no manual `keytool` commands:

```bash
# EAS generates and stores the keystore securely in Expo's credential store
eas credentials

# Or use your own keystore
eas credentials --platform android
# Choose: "Use a local keystore"
```

---

## Study Materials

- [EAS Build — Android](https://docs.expo.dev/build/introduction/)
- [EAS Submit — Play Store](https://docs.expo.dev/submit/android/)
- [EAS — CI/CD](https://docs.expo.dev/build/building-on-ci/)

---

## What's Next

EAS Build configured. Next: code signing and keystore management for Android.

➡ [Code Signing & Keystore](./04-code-signing-keystore)
