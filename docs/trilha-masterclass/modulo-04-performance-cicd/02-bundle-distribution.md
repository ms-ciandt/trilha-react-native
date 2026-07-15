---
title: "Bundle — Metro & Production Builds"
---

# Bundle & Distribution

> **Module 04 — React Native Masterclass**
> Target: senior engineers responsible for the full release pipeline — from Metro configuration to Artifactory artifact publication.
> React Native 0.76+ — New Architecture, Hermes, Gradle 8, Xcode 16.

---

## 1. Metro and Build Generation

### What Metro does

Metro is React Native's JavaScript bundler. It is not Webpack, Vite, or esbuild — it is purpose-built for mobile, with three responsibilities:

1. **Resolution** — follow `import`/`require` paths, respecting `package.json#main`, `react-native` field, and platform-specific suffixes (`.android.ts`, `.ios.ts`)
2. **Transformation** — transpile JS/TS/JSX via Babel (transforms are cached by file hash)
3. **Serialisation** — concatenate all modules into a single bundle file (or multiple chunks for split bundles)

In release, Metro is invoked by Gradle / Xcode. In debug, Metro runs as an HTTP server and serves the bundle live.

### Metro configuration deep dive

```javascript
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/** @type {import('@react-native/metro-config').MetroConfig} */
const customConfig = {
  // ── Resolver ──────────────────────────────────────────────────────────
  resolver: {
    // Support additional file extensions
    sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json', 'svg'],
    assetExts: ['png', 'jpg', 'gif', 'webp', 'mp4', 'otf', 'ttf', 'woff2'],

    // Alias resolution — useful for monorepos
    extraNodeModules: {
      '@app': `${__dirname}/src`,
    },

    // Platform-specific extension precedence
    // .android.ts is tried before .ts on Android
    platforms: ['android', 'ios', 'native', 'web'],
  },

  // ── Transformer ───────────────────────────────────────────────────────
  transformer: {
    // Enable inline requires — defers module evaluation (see Performance)
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,
      },
    }),

    // Asset plugin — run custom transforms on image assets
    assetPlugins: ['@react-native/assets-plugin'],

    // Unstable flag — enables the new Babel transform worker (faster)
    unstable_allowRequireContext: true,
  },

  // ── Serialiser ────────────────────────────────────────────────────────
  serializer: {
    // Custom entry-point — useful for multi-bundle setups
    // createModuleIdFactory: ...

    // Add metadata to the bundle (see Section 3 — metadata and patches)
    customSerializer: buildCustomSerializer(),
  },

  // ── Server ────────────────────────────────────────────────────────────
  server: {
    port: 8081,
    enhanceMiddleware: (middleware) => {
      // Inject custom middleware — useful for auth in CI environments
      return (req, res, next) => {
        if (req.url.startsWith('/custom')) return handleCustomRoute(req, res);
        return middleware(req, res, next);
      };
    },
  },

  // ── Cache ─────────────────────────────────────────────────────────────
  cacheVersion: '1',           // bump to invalidate all Metro caches
  resetCache: false,           // set to true via CLI: metro --reset-cache
};

module.exports = mergeConfig(getDefaultConfig(__dirname), customConfig);
```

### Bundle generation: the CLI command

```bash
# Android release bundle
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res \
  --sourcemap-output android/app/src/main/assets/index.android.bundle.map \
  --minify true \
  --verbose

# iOS release bundle
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios \
  --sourcemap-output ios/main.jsbundle.map \
  --minify true
```

Flags that matter:

| Flag | Effect |
|---|---|
| `--dev false` | Disables `__DEV__`, strips dev warnings, enables minification |
| `--minify` | Runs Terser on the output — reduces bundle ~30–40% |
| `--sourcemap-output` | Generates source map for crash symbolication |
| `--profile` | Outputs timing data per module — use to find slow transforms |

### Bundle analysis

Identify what is making your bundle large before optimising:

```bash
# Install bundle visualiser
npm install --save-dev react-native-bundle-visualizer

# Generate interactive treemap
npx react-native-bundle-visualizer

# Or use source-map-explorer
npm install --save-dev source-map-explorer

npx react-native bundle \
  --platform android --dev false \
  --bundle-output /tmp/bundle.js \
  --sourcemap-output /tmp/bundle.js.map

npx source-map-explorer /tmp/bundle.js /tmp/bundle.js.map
```

The treemap shows every module's contribution to the final bundle size. Common findings:

| Finding | Fix |
|---|---|
| `moment` at 300 KB | Replace with `date-fns` or `dayjs` |
| `lodash` at 200 KB | Use named imports: `import debounce from 'lodash/debounce'` |
| `@sentry/react-native` > 500 KB | Already expected; configure `uploadSourceMaps` in CI only |
| Large font files | Use only the weights you need, consider system font |
| Duplicate dependencies | Use `npm dedupe` or `yarn-deduplicate` |

### Hermes pre-compilation in the Gradle build

When `hermesEnabled = true` in your Gradle config, the `bundleReleaseJsAndAssets` task runs:

```
Metro bundle  →  .js bundle  →  hermes compile  →  .hbc bytecode
```

The Hermes compile step is what `android/app/build.gradle` controls:

```groovy
// android/app/build.gradle (Groovy DSL)
react {
    bundleConfig = "metro.config.js"
    bundleAssetName = "index.android.bundle"
    entryFile = "index.js"
    hermesCommand = "../node_modules/react-native/sdks/hermesc/%OS-BIN%/hermesc"
    enableHermes = true     // compile JS to Hermes bytecode in release
    extraPackagerArgs = []
}
```

```kotlin
// android/app/build.gradle.kts (Kotlin DSL)
react {
    bundleConfig.set("metro.config.js")
    bundleAssetName.set("index.android.bundle")
    entryFile.set("index.js")
    enableHermes.set(true)
}
```

**Hermes compile flags** you can add via `extraPackagerArgs`:

```groovy
extraPackagerArgs = [
    "--lazy-compilation",   // compile functions lazily (experimental, may reduce startup)
]
```

### iOS bundle in Xcode build phases

For iOS, the bundle is generated by the `Bundle React Native code and images` Run Script in Xcode:

```bash
# The script (auto-generated by react-native init, do not edit manually):
set -e
WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
REACT_NATIVE_XCODE="../node_modules/react-native/scripts/react-native-xcode.sh"
/bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"
```

To customise the iOS bundle command, add environment variables to the Xcode scheme:

```
BUNDLE_COMMAND=bundle
BUNDLE_CONFIG=metro.config.js
ENTRY_FILE=index.js
HERMES_CLI_PATH=../node_modules/react-native/sdks/hermesc/osx-bin/hermesc
```

---

## 2. Android and iOS Production Bundles

### Android production build pipeline

```
index.js (entry)
    │
    ▼ Metro (bundleReleaseJsAndAssets Gradle task)
index.android.bundle.js   +   res/drawable-* (images)
    │
    ▼ hermesc (HermesExecutor compile step)
index.android.bundle     ← this is now Hermes bytecode (.hbc)
    │
    ▼ included in APK / AAB as asset
app-release.aab
    └── base/assets/index.android.bundle   ← compressed in the AAB
```

Release build commands:

```bash
# Android App Bundle (preferred for Play Store)
cd android && ./gradlew bundleRelease

# APK (for direct distribution / sideloading)
cd android && ./gradlew assembleRelease

# Signed bundle (requires keystore configured in gradle.properties)
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=/path/to/keystore.jks \
  -Pandroid.injected.signing.store.password=*** \
  -Pandroid.injected.signing.key.alias=my-key \
  -Pandroid.injected.signing.key.password=***
```

Keystore configuration in `android/gradle.properties` (never commit this file):

```properties
# android/gradle.properties (git-ignored)
MYAPP_UPLOAD_STORE_FILE=my-release-key.jks
MYAPP_UPLOAD_STORE_PASSWORD=supersecret
MYAPP_UPLOAD_KEY_ALIAS=my-key
MYAPP_UPLOAD_KEY_PASSWORD=supersecret
```

```groovy
// android/app/build.gradle — read from properties
android {
    signingConfigs {
        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true          // R8 code shrinking (native code only; JS is minified by Metro)
            shrinkResources true        // remove unused native resources
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### iOS production build pipeline

```
index.js (entry)
    │
    ▼ react-native-xcode.sh (Run Script build phase)
main.jsbundle + *.png assets
    │
    ▼ hermesc (if HERMES_ENABLED=true)
main.jsbundle.hbc
    │
    ▼ Copy Bundle Resources phase copies .jsbundle into .app
YourApp.app/main.jsbundle   ← compressed inside .ipa
```

Release archive from CLI:

```bash
# Build archive
xcodebuild archive \
  -workspace ios/YourApp.xcworkspace \
  -scheme YourApp \
  -configuration Release \
  -archivePath /tmp/YourApp.xcarchive \
  -destination "generic/platform=iOS" \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="YourApp Release Profile"

# Export IPA from archive
xcodebuild -exportArchive \
  -archivePath /tmp/YourApp.xcarchive \
  -exportPath /tmp/YourApp-ipa \
  -exportOptionsPlist ExportOptions.plist
```

`ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>    <!-- or 'ad-hoc', 'enterprise' -->
  <key>signingStyle</key>
  <string>manual</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>com.yourcompany.yourapp</key>
    <string>YourApp Release Profile</string>
  </dict>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
```

### ProGuard and R8 — what to keep

R8 (the successor to ProGuard) shrinks native Java/Kotlin code in release builds. React Native requires specific keep rules:

```proguard
# android/app/proguard-rules.pro

# React Native core — never remove
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Your TurboModules — keep all spec-generated classes
-keep class com.yourapp.NativeModules.** { *; }

# Keep native methods (JNI entry points)
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# If using Crashlytics/Sentry — keep stack trace information
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
```

---
