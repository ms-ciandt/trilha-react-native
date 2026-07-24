---
title: "Code Signing & Keystore"
sidebar_label: "Code Signing"
sidebar_position: 4
---

## Video Overview

> Video for this topic coming soon.

## The Same Keystore You Already Know

React Native Android apps are signed with the same Java Keystore (.jks) you use for any Android app. The process is identical — the only difference is where you configure the signing in the Gradle build.

---

## Generating a Keystore

```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias myapp \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Store this file securely — losing it means you can never update your app on the Play Store.

---

## Configuring Gradle Signing

### Option 1: Environment variables (recommended for CI)

```groovy
// android/app/build.gradle
android {
  signingConfigs {
    release {
      storeFile file(System.getenv("KEYSTORE_PATH") ?: "debug.keystore")
      storePassword System.getenv("KEYSTORE_PASSWORD") ?: "android"
      keyAlias System.getenv("KEY_ALIAS") ?: "androiddebugkey"
      keyPassword System.getenv("KEY_PASSWORD") ?: "android"
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
```

### Option 2: gradle.properties (local development only — never commit)

```properties
# android/gradle.properties (add to .gitignore)
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=myapp
MYAPP_RELEASE_STORE_PASSWORD=yourpassword
MYAPP_RELEASE_KEY_PASSWORD=yourpassword
```

```groovy
signingConfigs {
  release {
    storeFile file(MYAPP_RELEASE_STORE_FILE)
    storePassword MYAPP_RELEASE_STORE_PASSWORD
    keyAlias MYAPP_RELEASE_KEY_ALIAS
    keyPassword MYAPP_RELEASE_KEY_PASSWORD
  }
}
```

---

## Play App Signing

Google's Play App Signing service holds your upload key (what you sign with) and the app signing key (what users download). This protects you if your upload key is compromised.

Enable it in the Play Console:
**Release → Setup → App integrity → App signing**

With Play App Signing enabled:
- Your `release.keystore` is the **upload key** — used only to authenticate uploads
- Google re-signs the final APK/AAB with the app signing key
- If you lose your upload key, Google can replace it

---

## Storing the Keystore in CI

```bash
# Encode to base64
base64 -i release.keystore | pbcopy

# Add as GitHub secret: KEYSTORE_BASE64

# In CI workflow — decode before building
echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore
```

---

## ProGuard / R8 for React Native — Deep Dive

React Native release builds use R8 (Google's replacement for ProGuard) when `minifyEnabled true` is set. R8 does three things: shrinks (removes unused code), optimises (inlines, rewrites), and obfuscates (renames classes/methods). Each step can break React Native if not configured correctly.

### Why R8 is more aggressive than ProGuard

R8 performs full-program analysis — it traces every call graph from your entry points and removes everything not reachable. This means reflection-based code (TurboModules, Codegen-generated classes, JNI registrations, JSON deserialisation) is invisible to the analyser and gets removed unless you explicitly keep it.

### The Complete proguard-rules.pro for React Native

```proguard
# android/app/proguard-rules.pro

# ── React Native Core ──────────────────────────────────────────────────────
# The core RN runtime — never shrink these
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.**   { *; }

# Fabric renderer internals — required for New Architecture
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.uimanager.** { *; }

# ── Hermes ─────────────────────────────────────────────────────────────────
# Hermes registers native methods via JNI at runtime — R8 must not rename them
-keepclassmembers class com.facebook.hermes.reactexecutor.HermesExecutor {
    native <methods>;
}

# ── Your TurboModules ──────────────────────────────────────────────────────
# Codegen generates a Spec class; your implementation extends it.
# R8 must keep both — the Spec is looked up by name at runtime.
-keep class com.yourapp.NativeDeviceInfoModule      { *; }
-keep class com.yourapp.NativeDeviceInfoModuleSpec  { *; }

# Pattern rule — keeps all your native modules without listing each one
-keep class com.yourapp.Native*Module               { *; }
-keep class com.yourapp.Native*ModuleSpec           { *; }

# ── Fabric Native Components ───────────────────────────────────────────────
-keep class com.yourapp.*ViewManager               { *; }
-keep class com.yourapp.*ComposeView               { *; }

# ── JNI: native methods ────────────────────────────────────────────────────
# Any class with native methods — JNI registration uses the full class+method name
-keepclasseswithmembers class * {
    native <methods>;
}

# ── Kotlin ─────────────────────────────────────────────────────────────────
# Kotlin metadata — needed for reflection, serialization, and coroutines
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-dontwarn kotlin.**

# Coroutines — state machines use reflection internally
-keep class kotlinx.coroutines.** { *; }
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# Kotlin Serialization — @Serializable classes are read by reflection
-keepattributes *Annotation*
-keep @kotlinx.serialization.Serializable class * { *; }
-keep class kotlinx.serialization.** { *; }

# ── Common third-party libraries ───────────────────────────────────────────

# OkHttp (used by Metro in debug, sometimes bundled)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Retrofit (if used in your Kotlin code bundled natively)
-keep class retrofit2.** { *; }
-keepattributes Exceptions

# Gson (JSON serialization — reads field names via reflection)
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Moshi (alternative to Gson)
-keep class com.squareup.moshi.** { *; }
-keep @com.squareup.moshi.JsonClass class * { *; }

# ── Crash reporting ────────────────────────────────────────────────────────
# Sentry — needs original class names to symbolicate crashes
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# Firebase Crashlytics
-keep class com.google.firebase.crashlytics.** { *; }
-keepattributes SourceFile, LineNumberTable

# ── Source file names ──────────────────────────────────────────────────────
# Preserve file names and line numbers in stack traces
# (sent to Sentry/Crashlytics for symbolication)
-keepattributes SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile
```

### Debugging R8 Shrinking Issues

When a release build crashes but debug works fine, R8 removed or renamed something it shouldn't have. Three tools to diagnose:

**1. `-printusage` — see what R8 removed**

```proguard
# Add temporarily, then check build/outputs/mapping/release/usage.txt
-printusage build/outputs/mapping/release/usage.txt
```

**2. `-printconfiguration` — see the effective merged config**

```proguard
-printconfiguration build/outputs/mapping/release/configuration.txt
```

**3. Mapping file — deobfuscate a crash stack trace**

R8 generates `build/outputs/mapping/release/mapping.txt`. Upload it to Sentry/Crashlytics so crashes are deobfuscated automatically. For manual deobfuscation:

```bash
# Android SDK tool
java -jar $ANDROID_HOME/tools/proguard/lib/retrace.jar \
  build/outputs/mapping/release/mapping.txt \
  stacktrace.txt
```

**4. Check if a class survived shrinking**

```bash
# After a release build, inspect the AAB/APK with bundletool
bundletool dump manifest --bundle=app-release.aab

# Or unzip and use dexdump
unzip app-release.apk classes.dex -d /tmp/dex
$ANDROID_HOME/build-tools/34.0.0/dexdump /tmp/dex/classes.dex | grep NativeDeviceInfoModule
```

---

## ABI Splits and AAB — Optimising Binary Size

### What ABIs Are

Android devices run on different CPU architectures. Your C++ code (Hermes engine, Codegen-generated JSI bindings, any CMakeLists.txt libraries) must be compiled for each architecture you support:

| ABI | Devices | Size impact |
|-----|---------|-------------|
| `arm64-v8a` | All modern Android phones (2015+) | ~15MB |
| `armeabi-v7a` | Older 32-bit ARM devices | ~10MB |
| `x86_64` | Emulators, some Chromebooks | ~15MB |
| `x86` | Old emulators | ~10MB |

A default React Native APK bundles all four — the user downloads all of them even though their device only uses one.

### AAB — The Production Solution

The Android App Bundle (AAB) is the correct solution for production. Google Play extracts only the ABI the user's device needs, so the installed app is smaller:

```groovy
// android/app/build.gradle

android {
    // For production — always build an AAB, not an APK
    // Gradle task: bundleRelease → app-release.aab
}
```

```bash
# Build the AAB
cd android && ./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

Upload the `.aab` to the Play Console. Never upload a fat APK to production.

### abiFilters — Faster Development Builds

During development, you're running on one device or emulator. Building all four ABIs is wasted time. `abiFilters` restricts the build to only what you need:

```groovy
// android/app/build.gradle
android {
    defaultConfig {
        // Global default — builds all ABIs
        // Do NOT set abiFilters here for production
    }

    // Development-only flavour: build only for your test device
    flavorDimensions "env"
    productFlavors {
        dev {
            dimension "env"
            applicationIdSuffix ".dev"
            ndk {
                // Pixel 7/8/9: arm64-v8a
                // Emulator (AVD): x86_64
                abiFilters "arm64-v8a"
            }
        }
        prod {
            dimension "env"
            // No abiFilters — build all ABIs for the AAB
        }
    }
}
```

Build times with one ABI vs all four:

| Config | Clean build time (Hermes + Codegen) |
|--------|-------------------------------------|
| All 4 ABIs (default) | ~4–6 minutes |
| arm64-v8a only | ~1.5–2 minutes |

### APK Splits — If You Must Ship APKs

For F-Droid, enterprise distribution, or side-loading where you cannot use AAB:

```groovy
android {
    splits {
        abi {
            enable true
            reset()                                // clear default ABIs
            include "arm64-v8a", "armeabi-v7a"    // only these two
            universalApk false                     // don't generate a fat APK
        }
    }
}

// Version codes must be unique per ABI for the Play Store
// Convention: prefix the ABI index to the base version code
ext.abiCodes = ['armeabi-v7a': 1, 'arm64-v8a': 2, 'x86': 3, 'x86_64': 4]

android.applicationVariants.all { variant ->
    variant.outputs.each { output ->
        def abi = output.getFilter(com.android.build.OutputFile.ABI)
        if (abi != null) {
            output.versionCodeOverride =
                ext.abiCodes.get(abi, 0) * 1000 + variant.versionCode
        }
    }
}
```

Output:

```
app-arm64-v8a-release.apk      → for all modern phones (~25MB)
app-armeabi-v7a-release.apk    → for older devices (~18MB)
```

vs a universal APK: `app-release.apk` (~55MB — includes all ABIs).

### Checking What's in Your AAB

```bash
# Install bundletool
brew install bundletool  # macOS

# Inspect AAB contents
bundletool dump manifest --bundle=app-release.aab
bundletool dump resources --bundle=app-release.aab

# Build APKs from AAB (simulates what Play does)
bundletool build-apks \
  --bundle=app-release.aab \
  --output=app.apks \
  --ks=release.keystore \
  --ks-pass=pass:yourpassword \
  --ks-key-alias=myapp \
  --key-pass=pass:yourpassword

# Install on a connected device (Play-style: only your device's ABI + language)
bundletool install-apks --apks=app.apks
```

---

## Study Materials

- [React Native — Publishing to Play Store](https://reactnative.dev/docs/signed-apk-android)
- [Android — Sign your app](https://developer.android.com/studio/publish/app-signing)
- [Google Play — App signing](https://support.google.com/googleplay/android-developer/answer/9842756)

---

## What's Next

Signing configured. Final CI/CD topic: OTA updates with EAS Update — pushing JS changes without a full Play Store release.

➡ [OTA Updates with EAS Update](./05-ota-updates)
