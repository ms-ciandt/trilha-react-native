---
title: "Fault Diagnosis (RN Doctor)"
---

# Fault Diagnosis (RN Doctor)

> `react-native doctor` is your first tool after a failed build or environment setup. It does not fix upgrade problems, but it quickly surfaces the most common environment misconfigurations before you spend an hour reading build logs.

---

## What RN Doctor Is

`react-native doctor` was introduced in RN 0.62 as a diagnostic tool. It checks your development environment against the known requirements for the installed RN version and reports pass/fail/warning per dependency.

It is part of `@react-native-community/cli` — the same CLI that powers `react-native init`, `react-native start`, and `react-native run-android`.

```bash
# Run doctor (no install required)
npx react-native doctor
```

---

## What It Checks

```
Common
  ✓ Node.js (18.20.4) — required >= 18.0.0
  ✗ Watchman — not found (recommended for better performance)
  ✓ react-native@0.76.7 — version OK

Android
  ✓ ANDROID_HOME — /Users/yourname/Library/Android/sdk
  ✓ Android SDK — Android 15 (API 35) installed
  ✓ Android build tools — 35.0.0 installed
  ✗ Android NDK — not found (required for New Architecture, version >= 26)
  ✓ JAVA_HOME — /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
  ✓ JDK — OpenJDK 17.0.12

iOS
  ✓ Xcode — 16.1 (path: /Applications/Xcode.app/Contents/Developer)
  ✓ CocoaPods — 1.15.2
  ✗ ios-deploy — not found (optional, needed for physical device install without Xcode)
```

---

## Running Doctor After an Upgrade

```bash
# Check environment after bumping RN version
npx react-native doctor

# With fix proposals (doctor offers to fix some issues automatically)
# When prompted "Do you want to fix [issue]?" → press Y
```

The most important red (`✗`) items to fix before building:

| Check | If Red | Fix |
|---|---|---|
| `ANDROID_HOME` | Build cannot find Android SDK | Set env var: `export ANDROID_HOME=~/Library/Android/sdk` |
| `Android NDK` | New Architecture C++ compilation will fail | `sdkmanager "ndk;27.1.12297006"` |
| `JAVA_HOME` | Gradle uses wrong JDK | `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` |
| `JDK` | Gradle fails with unsupported class version | Install JDK 17 |
| `Xcode` | iOS build fails | Install correct Xcode version from App Store |
| `CocoaPods` | `pod install` fails | `sudo gem install cocoapods` or `bundle install` |

---

## Extending Doctor with Custom Checks

For teams with custom environment requirements (internal certificates, specific NDK versions, company proxy settings), you can add custom healthchecks:

```javascript
// react-native.config.js
module.exports = {
  healthChecks: [
    {
      label: 'Company Proxy Certificate',
      getDiagnostics: async () => {
        const { execSync } = require('child_process');
        try {
          execSync('security find-certificate -c "CompanyCert" ~/Library/Keychains/login.keychain');
          return { isRequired: true, version: 'installed', versionRange: 'installed' };
        } catch {
          return { isRequired: true, version: null };
        }
      },
      runAutomaticFix: async ({ loader, logManualInstallation }) => {
        loader.fail();
        logManualInstallation({
          message: 'Install the company certificate from https://internal.company.com/certs',
        });
      },
    },
  ],
};
```

---

## Beyond Doctor: Diagnosing Build Failures

Doctor only checks the environment. Once the environment is green, build failures need different tools.

### Android: reading Gradle output

```bash
# Get verbose output with failure reason
cd android && ./gradlew assembleDebug --stacktrace 2>&1 | tail -80

# The useful lines are after "FAILURE:" and before the stack trace
# Look for: "Caused by:" — this is the actual root cause
```

Common patterns:

```
# Missing namespace
Caused by: com.android.tools.build.bundletool.model.exceptions.InvalidBundleException:
  Namespace not specified in build file

# Fix: add namespace to android/app/build.gradle
android {
    namespace = "com.myapp"
}

# Codegen artifacts missing
Caused by: java.io.FileNotFoundException: .../jni/NativeMyModuleSpec.h (No such file or directory)

# Fix:
cd android && ./gradlew generateCodegenArtifactsFromSchema && cd ..
```

### iOS: reading xcodebuild output

```bash
# Filter to just errors
xcodebuild -workspace ios/MyApp.xcworkspace \
           -scheme MyApp \
           -configuration Debug \
           -sdk iphonesimulator \
           -destination 'platform=iOS Simulator,name=iPhone 16' \
           build 2>&1 | xcpretty

# Or without xcpretty:
... build 2>&1 | grep -E "error:|warning:" | head -30
```

### Metro bundler issues

```bash
# Reset all Metro caches
npx react-native start --reset-cache

# If Metro fails to start with module not found:
watchman watch-del-all   # clear Watchman state
rm -rf node_modules/.cache
npm install
```

### The "Haste module map" error

After an upgrade, if Metro throws:

```
Error: Haste module map has multiple entries for name
```

This means two files in `node_modules` export the same module name — often caused by duplicate versions of a package installed by different dependencies.

```bash
# Find the duplicate
npx react-native config 2>&1 | grep "Haste"

# Fix: add a resolver blocklist for the duplicate path
# metro.config.js
const config = getDefaultConfig(__dirname);
config.resolver.blocklist = [
  /node_modules\/duplicate-package\/.*\.(js|ts|tsx)$/,
];
```

### New Architecture-specific diagnosis

```bash
# Check if New Architecture is actually active at runtime
# Add this to a component that loads on startup:
if (__DEV__) {
  const { isFabricEnabled } = require('react-native/Libraries/Utilities/ReactNativeTestTools');
  console.log('Fabric enabled:', isFabricEnabled());
}
```

Or from the Metro log, look for:
```
Running "MyApp" with {"fabric":true,"initialProps":{},"rootTag":11}
```

The `"fabric":true` confirms Fabric (New Architecture renderer) is active.

---

## Useful Diagnostic Commands Reference

```bash
# Complete environment check
npx react-native doctor

# Version info for all RN-related deps
npx react-native info

# Detect and fix common project issues
npx react-native-clean-project

# Android: check Gradle project configuration
cd android && ./gradlew projects

# Android: list all tasks related to Codegen
cd android && ./gradlew tasks | grep -i codegen

# iOS: check CocoaPods installation
pod env
pod repo list

# Metro: bundle analysis (what's in your bundle)
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/bundle.js \
  --assets-dest /tmp/assets/
wc -l /tmp/bundle.js   # check bundle size
```

---

## Upgrade Diagnosis Flowchart

```
Build fails after upgrade
│
├── Run `npx react-native doctor`
│   ├── Red item found? Fix it → rebuild
│   └── All green? → check build logs
│
├── Android build fails?
│   ├── "Namespace not specified" → add `namespace` to build.gradle
│   ├── "Codegen artifact not found" → run generateCodegenArtifactsFromSchema
│   ├── "Could not resolve gradle plugin" → check gradle plugin vs wrapper version
│   └── Other → ./gradlew assembleDebug --stacktrace → read "Caused by:"
│
├── iOS build fails?
│   ├── "file not found" header → pod deintegrate && pod install
│   ├── Swift override error → update AppDelegate for RCTAppDelegate (0.76)
│   ├── CocoaPods conflict → check Podfile.lock, bump conflicting pod
│   └── Other → xcodebuild ... 2>&1 | grep "error:" | head -20
│
└── App runs but crashes at startup?
    ├── "TurboModuleRegistry.getEnforcing: X not found" → module registration missing
    ├── White screen on iOS → check RCTAppDelegate setup
    ├── Edge-to-edge layout broken → add react-native-edge-to-edge, useSafeAreaInsets
    └── Hermes crash → check for JSI type mismatches in custom native modules
```

---

## Study Materials

| Resource | Description |
|---|---|
| [Meet Doctor — RN Blog](https://reactnative.dev/blog/2019/11/18/react-native-doctor) | Original announcement, what it checks and why |
| [react-native-community/cli — GitHub](https://github.com/react-native-community/cli) | CLI source — doctor command lives in `packages/cli-doctor` |
| [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) | Official guide with environment prerequisites |
| [react-native info — docs](https://reactnative.dev/docs/environment-setup) | `npx react-native info` — full dependency version report |
| [react-native-clean-project](https://github.com/pmadruga/react-native-clean-project) | Clears all build caches, node_modules, Pods in one command |
| [xcpretty — GitHub](https://github.com/xcpretty/xcpretty) | Formats xcodebuild output to be human-readable |
