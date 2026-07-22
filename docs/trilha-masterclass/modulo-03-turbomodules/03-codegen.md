---
title: "Codegen: Native Typed Interfaces"
---

# Codegen: Native Typed Interfaces

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc02_03_codegen.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> Codegen is a build-time compiler. It reads your TypeScript spec and writes the native boilerplate — the abstract classes, protocols, and JSI dispatch tables — so you never write bridging glue by hand.

---

## Configuration in `package.json`

```json
{
  "name": "my-app",
  "codegenConfig": {
    "name": "AppSpecs",
    "type": "modules",
    "jsSrcsDir": "specs",
    "android": {
      "javaPackageName": "com.myapp.specs"
    },
    "ios": {
      "modulesProvider": {
        "NativeCalculator": "RCTNativeCalculator",
        "NativeAnalytics": "RCTNativeAnalytics"
      }
    }
  }
}
```

- `name`: the name of the generated spec group — used as the CMake target name and the iOS framework name
- `jsSrcsDir`: where Codegen looks for `Native*.ts` files
- `android.javaPackageName`: the Java package for generated classes
- `ios.modulesProvider`: maps the JS module name to the native class that will be instantiated

---

## What Codegen Generates

### Android output

```
build/generated/source/codegen/
├── java/
│   └── com/myapp/specs/
│       └── NativeCalculatorSpec.java       ← abstract class you extend
└── jni/
    ├── NativeCalculator.h                  ← C++ JSI header
    └── NativeCalculator-generated.cpp      ← JSI dispatch table (auto-generated)
```

**`NativeCalculatorSpec.java`** (what Codegen writes — you never edit this):

```java
// AUTO-GENERATED — do not edit
package com.myapp.specs;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

public abstract class NativeCalculatorSpec extends ReactContextBaseJavaModule {

    public NativeCalculatorSpec(ReactApplicationContext context) {
        super(context);
    }

    // Synchronous methods — annotated @ReactMethod
    @ReactMethod(isBlockingSynchronousMethod = true)
    public abstract double add(double a, double b);

    // Async methods — Promise injected by the framework
    @ReactMethod
    public abstract void fetchRemoteValue(String key, Promise promise);

    // Void methods
    @ReactMethod
    public abstract void logEvent(String name, ReadableMap payload);
}
```

**Your implementation** extends it and is forced by the compiler to implement every method:

```kotlin
// android/app/src/main/java/com/myapp/NativeCalculatorModule.kt
class NativeCalculatorModule(reactContext: ReactApplicationContext) :
    NativeCalculatorSpec(reactContext) {

    override fun getName() = NAME

    override fun add(a: Double, b: Double): Double = a + b

    override fun fetchRemoteValue(key: String, promise: Promise) {
        Thread {
            try {
                val result = myRepository.fetch(key)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("FETCH_ERROR", e.message, e)
            }
        }.start()
    }

    override fun logEvent(name: String, payload: ReadableMap) {
        Analytics.log(name, payload.toHashMap())
    }

    companion object { const val NAME = "NativeCalculator" }
}
```

---

### iOS output

```
build/generated/ios/
└── NativeCalculatorSpec/
    ├── NativeCalculatorSpec.h              ← ObjC++ protocol
    └── NativeCalculatorSpec-generated.mm  ← JSI dispatch table
```

**`NativeCalculatorSpec.h`** (simplified — Codegen writes this):

```objc
// AUTO-GENERATED — do not edit
#pragma once
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace facebook::react {

// The JSI dispatch layer — generated from the spec
class JSI_EXPORT NativeCalculatorCxxSpec
    : public TurboModule {
public:
  NativeCalculatorCxxSpec(std::shared_ptr<CallInvoker> jsInvoker);
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& propName) override;

private:
  // One dispatch function per spec method
  static jsi::Value __hostFunction_NativeCalculatorSpecJSI_add(
      jsi::Runtime& rt,
      TurboModule& turboModule,
      const jsi::Value* args,
      size_t count);

  static jsi::Value __hostFunction_NativeCalculatorSpecJSI_fetchRemoteValue(
      jsi::Runtime& rt,
      TurboModule& turboModule,
      const jsi::Value* args,
      size_t count);
};

} // namespace facebook::react
```

**ObjC++ protocol** that your class adopts:

```objc
@protocol NativeCalculatorSpec <RCTBridgeModule, RCTTurboModule>
- (double)add:(double)a b:(double)b;
- (void)fetchRemoteValue:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)logEvent:(NSString *)name payload:(NSDictionary *)payload;
@end
```

**Your implementation** in `.mm` (must be Objective-C++, not `.m`):

```objc
// ios/RCTNativeCalculator.mm
#import "RCTNativeCalculator.h"

@implementation RCTNativeCalculator

RCT_EXPORT_MODULE()

- (double)add:(double)a b:(double)b {
    return a + b;
}

- (void)fetchRemoteValue:(NSString *)key
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSString *result = [self->_repository fetch:key];
        if (result) {
            resolve(result);
        } else {
            reject(@"FETCH_ERROR", @"Key not found", nil);
        }
    });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCalculatorSpecJSI>(params);
}

@end
```

---

## Registering the Package (Android)

```kotlin
// android/app/src/main/java/com/myapp/NativeCalculatorPackage.kt
class NativeCalculatorPackage : BaseReactPackage() {

    override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeCalculatorModule.NAME -> NativeCalculatorModule(context)
            else -> null
        }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            NativeCalculatorModule.NAME to ReactModuleInfo(
                name = NativeCalculatorModule.NAME,
                className = NativeCalculatorModule.NAME,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = true
            )
        )
    }
}
```

```kotlin
// MainApplication.kt
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(NativeCalculatorPackage())
    }
```

---

## Triggering Codegen

```bash
# Android — runs automatically during build, or explicitly:
cd android && ./gradlew generateCodegenArtifactsFromSchema

# iOS — runs automatically on pod install:
cd ios && bundle exec pod install
```

To preview generated output without a full build:

```bash
node node_modules/react-native/scripts/generate-codegen-artifacts.js \
  --path . \
  --outputPath /tmp/codegen-preview \
  --targetPlatform ios
```

---

## The Full Flow

```
specs/NativeCalculator.ts   ← you write this
         │
         ▼  Codegen (build time)
NativeCalculatorSpec.java         ← Android abstract class
NativeCalculatorSpec.h            ← iOS ObjC++ protocol + C++ JSI spec
NativeCalculator-generated.cpp    ← JSI dispatch table (both platforms)
         │
         ▼  you write these (extending / adopting the generated interfaces)
NativeCalculatorModule.kt         ← Kotlin implementation
RCTNativeCalculator.mm            ← ObjC++ implementation
         │
         ▼  runtime (JSI)
JS: NativeCalculator.add(1, 2) → C++ lambda → result back to JS
```

---

## Study Materials

| Resource | Description |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Official end-to-end guide including Codegen config |
| [Codegen reference — reactwg](https://github.com/reactwg/react-native-new-architecture/blob/main/docs/codegen.md) | Generated file structure, configuration options |
| [Build a TurboModule for Android — LogRocket](https://blog.logrocket.com/build-custom-react-native-turbo-module-android/) | Hands-on Kotlin + Codegen walkthrough |
| [Build TurboModules with Swift](https://medium.com/@varunkukade999/build-native-and-turbo-modules-in-react-native-with-swift-e5d942226855) | iOS implementation and Codegen setup |
| [Codegen internals — Dev.to](https://dev.to/amitkumar13/the-turbo-way-to-talk-native-react-natives-new-bridging-system-2nh8) | How Codegen parses specs and generates the JSI dispatch |

---

Next → [Defensive Loading of Modules](./defensive-loading)
