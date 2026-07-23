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

## ProGuard / R8 for React Native

```
# android/app/proguard-rules.pro

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep your TurboModules
-keep class com.yourapp.NativeDeviceInfoModule { *; }

# Keep Kotlin serialization
-keepattributes *Annotation*
-keep class kotlinx.serialization.** { *; }
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
