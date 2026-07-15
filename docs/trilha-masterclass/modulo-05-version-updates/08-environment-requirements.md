---
title: "Environment Requirements (Node, Xcode, SDKs)"
---

# Environment Requirements (Node, Xcode, SDKs)

> A wrong environment version causes the most cryptic build failures — errors that have nothing to do with your code. Get the environment right first, before touching `package.json`.

---

## The Compatibility Matrix (Official Source)

Source: [reactwg/react-native-releases — support.md](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md)

| RN Version | Node (min) | JDK | Xcode (min) | CocoaPods | Android SDK (min API) | Gradle Plugin |
|---|---|---|---|---|---|---|
| 0.72 | 16 | 11 | 15.1 | 1.13.x | API 21 (5.0) | 7.4.x |
| 0.73 | 18 | 17 | 15.1 | 1.13.x | API 21 (5.0) | 8.0.x |
| 0.74 | 18 | 17 | 15.1 | 1.13.x | API 23 (6.0) | 8.3.x |
| 0.75 | 18 | 17 | 15.1 | 1.13.x | API 24 (7.0) | 8.6.x |
| 0.76 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.7.x |
| 0.77 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.8.x |
| 0.78 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.9.x |
| 0.79 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.10.x |
| 0.80 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.11.x |
| 0.81 | 20 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.12.x |
| 0.84+ | 22 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.13.x |

**Key transitions that break CI without a warning:**

- `0.72 → 0.73`: JDK 11 → **JDK 17** — the most common CI breakage
- `0.80 → 0.81`: Node 18 → **Node 20**
- `0.83 → 0.84`: Node 20 → **Node 22**
- `0.80 → 0.81`: Xcode 15.1 → **Xcode 16.1** (macOS 15 required for CI agent)

---

## Checking Your Current Environment

Run this before any upgrade — baseline your environment:

```bash
# Node
node --version       # must meet the minimum for your target RN version

# npm / Yarn
npm --version
yarn --version

# Java / JDK
java -version        # must be JDK 17 for RN 0.73+

# Ruby + Bundler (iOS)
ruby --version       # >= 2.7 for CocoaPods
bundle --version

# CocoaPods
pod --version        # check against matrix above

# Xcode
xcodebuild -version  # must meet minimum for your target RN version

# Android SDK
echo $ANDROID_HOME   # must be set
$ANDROID_HOME/tools/bin/sdkmanager --list | grep "platforms;android-"

# Watchman (required for Metro)
watchman --version
```

---

## Node Version Management

Never install Node globally with a system package manager (`apt`, `brew install node`). Use a version manager so you can switch per project.

### With `nvm` (most common)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Install and use a specific Node version
nvm install 20
nvm use 20

# Set per-project default via .nvmrc
echo "20" > .nvmrc
nvm use  # reads .nvmrc
```

### With `fnm` (faster alternative)

```bash
# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Install and use
fnm install 20
fnm use 20

# .nvmrc is also read by fnm
```

**Project `.nvmrc` example:**

```
# .nvmrc — checked into git
20.19.4
```

Every developer and every CI agent reads this file. No more "works on my machine, fails on CI" due to Node version mismatch.

---

## JDK Management (Android)

### macOS — with SDKMAN

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash

# List available JDK 17 distributions
sdk list java | grep 17

# Install Temurin 17 (Eclipse OpenJDK — free, no license issues)
sdk install java 17.0.12-tem
sdk use java 17.0.12-tem

# Verify
java -version
# openjdk version "17.0.12" 2024-07-16
```

### Set `JAVA_HOME` for Gradle

Gradle reads `JAVA_HOME`. If it's pointing to JDK 11 while `java -version` shows 17, Gradle will still fail.

```bash
# Add to ~/.zshrc or ~/.bash_profile
export JAVA_HOME="$(sdk home java current)"
# or, with homebrew JDK:
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"

# Verify
echo $JAVA_HOME
# Should output a path pointing to JDK 17
```

In CI (GitHub Actions):

```yaml
- uses: actions/setup-java@v4
  with:
    java-version: '17'
    distribution: 'temurin'
```

---

## Xcode Version Management

Xcode versions are tied to macOS versions. You cannot run Xcode 16.1 on macOS 13 Ventura.

| Xcode | Requires macOS | Required for RN |
|---|---|---|
| 15.1 | macOS 14 Sonoma | 0.73 – 0.80 |
| 16.1 | macOS 15 Sequoia | 0.81+ |

```bash
# Check Xcode version
xcode-select --print-path
xcodebuild -version

# Switch between Xcode versions (if multiple installed)
sudo xcode-select -s /Applications/Xcode_16.1.app
```

In CI (GitHub Actions), pin the macOS version explicitly:

```yaml
jobs:
  ios-build:
    runs-on: macos-15          # macOS 15 Sequoia — Xcode 16.1
    # or
    runs-on: macos-14          # macOS 14 Sonoma — Xcode 15.1
```

---

## CocoaPods Version Management

```bash
# Check current version
pod --version

# Install a specific version
sudo gem install cocoapods -v 1.15.2

# Use Bundler for per-project CocoaPods version (recommended)
# Gemfile:
source "https://rubygems.org"
gem "cocoapods", "~> 1.15"

# Install via bundler
bundle install
bundle exec pod install  # always use `bundle exec` to use Gemfile version
```

The `Gemfile.lock` pins the exact CocoaPods version. This is the only reliable way to ensure every developer and CI agent uses the same version.

---

## Android SDK Requirements

```bash
# Install required SDK components
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
  "platforms;android-35" \
  "build-tools;35.0.0" \
  "platform-tools" \
  "ndk;27.1.12297006"

# Verify
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --list_installed
```

Set these in `android/app/build.gradle` to match:

```kotlin
android {
    compileSdk = 35
    buildToolsVersion = "35.0.0"

    defaultConfig {
        minSdk = 24
        targetSdk = 35
    }
}
```

**NDK** is required for New Architecture (C++ compilation). RN 0.76+ requires NDK r27+.

```bash
# Check NDK
ls $ANDROID_HOME/ndk/
# Should show 27.x.xxxxxxx
```

---

## Environment Validation Before Upgrade

Run this script to check all requirements before starting the upgrade:

```bash
#!/bin/bash
# check-env.sh

echo "=== Node ===" && node --version
echo "=== JDK ===" && java -version 2>&1 | head -1
echo "=== Xcode ===" && xcodebuild -version 2>/dev/null || echo "Not on macOS or Xcode not installed"
echo "=== CocoaPods ===" && (bundle exec pod --version 2>/dev/null || pod --version)
echo "=== Android SDK ===" && echo $ANDROID_HOME
echo "=== NDK ===" && ls $ANDROID_HOME/ndk/ 2>/dev/null || echo "NDK not found"
echo "=== Ruby ===" && ruby --version
echo "=== Bundler ===" && bundle --version
echo "=== Watchman ===" && watchman --version
```

Compare the output against the compatibility matrix. Fix every mismatch **before** starting the upgrade.

---

## Study Materials

| Resource | Description |
|---|---|
| [react-native-releases — support.md](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md) | Official compatibility matrix — the primary source |
| [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) | Official setup guide, kept in sync with the current stable version |
| [nvm — GitHub](https://github.com/nvm-sh/nvm) | Node version manager |
| [fnm — GitHub](https://github.com/Schniz/fnm) | Faster Node version manager, reads `.nvmrc` |
| [SDKMAN](https://sdkman.io/) | JDK version manager for macOS/Linux |
| [sdkmanager — Android docs](https://developer.android.com/tools/sdkmanager) | Managing Android SDK components from the CLI |

---

Next → [Changes to Native Settings (Edge-to-Edge)](./native-settings)
