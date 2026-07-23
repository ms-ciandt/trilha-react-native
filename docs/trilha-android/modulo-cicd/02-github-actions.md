---
title: "GitHub Actions for React Native"
sidebar_label: "GitHub Actions"
sidebar_position: 2
---

## Video Overview

> Video for this topic coming soon.

## The Pipeline Structure

A React Native CI pipeline for Android has three stages:

```
Push / PR
  │
  ├── Lint & Type Check (fast — 1-2 min)
  ├── Unit & Integration Tests (medium — 3-5 min)
  └── Build & Deploy (slow — 10-20 min, only on main/release)
```

---

## Workflow 1: PR Checks

```yaml
# .github/workflows/pr-check.yml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0

      - name: Unit tests
        run: npx jest --ci --coverage --coverageReporters=text-summary

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

---

## Workflow 2: Android Build and Deploy

```yaml
# .github/workflows/android-deploy.yml
name: Android Deploy

on:
  push:
    branches: [main]
  workflow_dispatch: # manual trigger

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}

      - name: Decode keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore

      - name: Build release AAB
        working-directory: android
        run: ./gradlew bundleRelease
        env:
          KEYSTORE_PATH: release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}

      - name: Upload to Play Store (internal)
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
          packageName: com.yourapp
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: internal
          status: completed
```

---

## Required Secrets

In your GitHub repo → Settings → Secrets:

| Secret | Value |
|--------|-------|
| `KEYSTORE_BASE64` | `base64 -i release.keystore` |
| `KEYSTORE_PASSWORD` | Your keystore password |
| `KEY_ALIAS` | Your key alias |
| `KEY_PASSWORD` | Your key password |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Contents of the Google Play JSON key |

---

## Caching Strategy

```yaml
# Cache node_modules — saves ~2 min per run
- uses: actions/cache@v4
  with:
    path: node_modules
    key: node-${{ hashFiles('package-lock.json') }}
    restore-keys: node-

# Cache Gradle — saves ~5 min per run
- uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
      android/.gradle
    key: gradle-${{ hashFiles('**/*.gradle*') }}
```

---

## Study Materials

- [GitHub Actions — Android](https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-android)
- [r0adkll/upload-google-play](https://github.com/r0adkll/upload-google-play)

---

## What's Next

GitHub Actions wired. Next: EAS Build — Expo's cloud build service for React Native.

➡ [EAS Build](./03-eas-build)
