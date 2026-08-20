---
title: TurboModules with Swift
---

# TurboModules with Swift

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/rec_05_turbomodule-swift.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

The New Architecture's TurboModule system exposes a synchronous C++ interface via JSI (JavaScript Interface). This creates an immediate constraint for Swift developers: Swift cannot be called directly from C++. Understanding that limit — and how Objective-C++ bridges it — is essential before writing any implementation code.

## Why Swift Cannot Implement TurboModules Directly

JSI is a C++ library. When React Native calls a native module through a TurboModule, the call path is:

```
JavaScript (Hermes) → JSI (C++) → TurboModule C++ interface → native implementation
```

Swift has zero interoperability with plain C++. Apple's Swift/C++ interop (available since Swift 5.9) requires explicit `@_expose(Cxx)` annotations and covers only a subset of patterns — it is not compatible with the way JSI expects to resolve `getTurboModule:`. The Objective-C runtime, on the other hand, was designed to interoperate with both C++ and Swift simultaneously.

The consequence is non-negotiable: every TurboModule implementation file must be Objective-C++ (`.mm`). Your Swift logic can live in a helper class, but the file that registers with JSI and conforms to the Codegen-generated protocol must be `.mm`.

## The `.mm` File Requirement

Objective-C++ is a language that allows C++ and Objective-C code to coexist in the same compilation unit. Xcode recognizes `.mm` as the file extension for Objective-C++. When you write:

```objc
// NativeStorageModule.mm
#import <ReactCommon/RCTTurboModule.h>
```

the compiler processes those headers — which contain C++ templates internally — and lets you call the C++ method `getTurboModule:` in the same file. A `.m` file (plain Objective-C) cannot include C++ headers. A `.swift` file cannot call C++ by standard means. The `.mm` file is the only sanctioned integration point between JSI's C++ world and your Swift business logic.

## The ObjC Bridging Header

Swift classes are not visible to Objective-C (and therefore not visible to your `.mm` file) by default. You expose them through a bridging header.

### Creating the Bridging Header

1. In Xcode, go to **File → New → File → Header File**.
2. Name it `{ProjectName}-Bridging-Header.h`, matching your project name exactly (e.g., `MyApp-Bridging-Header.h`).
3. In **Build Settings**, search for `Objective-C Bridging Header` and set the value to `$(PROJECT_DIR)/MyApp/MyApp-Bridging-Header.h`.

```objc
// MyApp-Bridging-Header.h
// Import any ObjC or C headers your Swift code needs to call.
// Swift classes annotated with @objc are automatically visible to .mm files
// through the auto-generated "MyApp-Swift.h" module header.
#import <React/RCTBridgeModule.h>
```

To use a Swift class from a `.mm` file, add an import at the top of the `.mm` file:

```objc
#import "MyApp-Swift.h"   // Xcode auto-generates this from your @objc-annotated Swift code
```

This generated header exposes every Swift class marked with `@objc` or `@objcMembers` to the Objective-C runtime, making them callable from your `.mm` implementation.

## End-to-End Example: NativeStorageModule

This example builds a module that stores and retrieves string values using a thread-safe Swift dictionary.

### 1. TypeScript Spec

Codegen reads this spec and generates the C++ interface your `.mm` must implement.

```ts
// src/specs/NativeStorageModuleSpec.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
}

export default TurboModuleRegistry.strictGet<Spec>('NativeStorageModule');
```

### 2. Codegen Config in package.json

```json
{
  "name": "my-app",
  "codegenConfig": {
    "name": "AppSpecs",
    "type": "modules",
    "jsSrcsDir": "src/specs",
    "android": {
      "javaPackageName": "com.myapp"
    }
  }
}
```

Codegen runs automatically during `pod install`. The generated files appear in `ios/build/generated/ios/`. Always run `pod install` after modifying a TypeScript spec before building in Xcode.

### 3. Swift Helper Class

```swift
// NativeStorageHelper.swift
import Foundation

@objcMembers
class NativeStorageHelper: NSObject {
  private var store: [String: String] = [:]
  private let queue = DispatchQueue(
    label: "com.myapp.NativeStorageHelper",
    attributes: .concurrent
  )

  func setItem(key: String, value: String) {
    queue.async(flags: .barrier) {
      self.store[key] = value
    }
  }

  func getItem(key: String) -> String? {
    return queue.sync {
      return store[key]
    }
  }

  func removeItem(key: String) {
    queue.async(flags: .barrier) {
      self.store.removeValue(forKey: key)
    }
  }

  func clear() {
    queue.async(flags: .barrier) {
      self.store.removeAll()
    }
  }
}
```

`@objcMembers` exposes every method and property to Objective-C without requiring individual `@objc` annotations. The concurrent dispatch queue provides thread-safe reads and serialized writes using the `.barrier` flag on mutations.

### 4. Objective-C++ Implementation

```objc
// NativeStorageModule.h
#pragma once
#import <React/RCTBridgeModule.h>
```

```objc
// NativeStorageModule.mm
#import "NativeStorageModule.h"
#import "MyApp-Swift.h"           // exposes NativeStorageHelper to ObjC

// Generated by Codegen during pod install:
#import <AppSpecs/AppSpecsJSI.h>

#import <ReactCommon/RCTTurboModule.h>
#import <React/RCTBridgeModule.h>
#import <jsi/jsi.h>

using namespace facebook::jsi;
using namespace facebook::react;

@interface NativeStorageModule : NSObject <RCTBridgeModule, RCTTurboModule>
@end

@implementation NativeStorageModule {
  NativeStorageHelper *_helper;
}

RCT_EXPORT_MODULE(NativeStorageModule)

- (instancetype)init {
  if (self = [super init]) {
    _helper = [[NativeStorageHelper alloc] init];
  }
  return self;
}

// MARK: - TurboModule registration

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params {
  return std::make_shared<NativeStorageModuleSpecJSI>(params);
}

// MARK: - NativeStorageModuleSpec methods

- (void)setItem:(NSString *)key value:(NSString *)value {
  [_helper setItemWithKey:key value:value];
}

- (NSString *)getItem:(NSString *)key {
  return [_helper getItemWithKey:key];
}

- (void)removeItem:(NSString *)key {
  [_helper removeItemWithKey:key];
}

- (void)clear {
  [_helper clear];
}

@end
```

The critical method is `getTurboModule:`. It returns a `std::shared_ptr` to the Codegen-generated C++ class (`NativeStorageModuleSpecJSI`). That class wraps your ObjC implementation and exposes it through JSI. Without this method, the TurboModule system cannot locate your module at runtime — the JavaScript call will fall back to the legacy bridge or fail entirely.

`RCT_EXPORT_MODULE(NativeStorageModule)` registers the module with the React Native runtime. The string argument must match exactly the name used in `TurboModuleRegistry.strictGet<Spec>('NativeStorageModule')` in your TypeScript spec.

## AppDelegate Changes

With the New Architecture, TurboModules are resolved through the `RCTTurboModuleManagerDelegate` protocol.

### Using RCTAppSetupUtils (Recommended)

If your project was created with React Native 0.73+ or the Expo managed workflow, the scaffolding already calls `RCTAppSetupPrepareApp`. Modules registered with `RCT_EXPORT_MODULE` in the same app target are auto-discovered — no manual `AppDelegate` changes are needed.

### Manual AppDelegate Setup

For a module that requires custom initialization or lives in a separate pod, implement the delegate methods explicitly:

```objc
// AppDelegate.mm (excerpt)
#import "NativeStorageModule.h"

@interface AppDelegate () <RCTTurboModuleManagerDelegate>
@end

@implementation AppDelegate

- (Class)getModuleClassFromName:(const char *)name {
  return RCTCoreModulesClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(const std::string &)name
         jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker {
  // Return nullptr to fall through to default class-based resolution.
  return nullptr;
}

// Override this to inject dependencies into the module at creation time.
- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass {
  if (moduleClass == NativeStorageModule.class) {
    return [[NativeStorageModule alloc] init];
  }
  return RCTAppSetupDefaultModuleFromClass(moduleClass);
}

@end
```

## CocoaPods Podspec for a Custom Module

When packaging the module as a reusable library — for distribution or monorepo isolation — create a `.podspec` file:

```ruby
# NativeStorageModule.podspec
require "json"

Pod::Spec.new do |s|
  s.name         = "NativeStorageModule"
  s.version      = "1.0.0"
  s.summary      = "A TurboModule-backed storage module for React Native."
  s.homepage     = "https://github.com/your-org/native-storage-module"
  s.license      = "MIT"
  s.authors      = { "Your Name" => "you@example.com" }
  s.platforms    = { :ios => "13.4" }
  s.source       = {
    :git => "https://github.com/your-org/native-storage-module.git",
    :tag => "v#{s.version}"
  }

  # Glob all ObjC++ and Swift source files
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  # Core TurboModule dependencies
  s.dependency "React-Core"
  s.dependency "React-RCTFabric"              # brings JSI and Fabric renderer headers
  s.dependency "ReactCommon/turbomodule/core"
  s.dependency "React-Codegen"

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "HEADER_SEARCH_PATHS" => "$(PODS_ROOT)/boost"
  }

  s.swift_version = "5.9"
end
```

Notes on `source_files`:
- The glob `ios/**/*.{h,m,mm,swift}` captures both the `.mm` implementation and the `.swift` helper in a single declaration.
- Within a pod target, Xcode handles the Swift-to-ObjC bridging automatically. You do not need a manual bridging header inside the pod; the generated `-Swift.h` header is referenced by the `.mm` file as shown in the implementation above.
- `React-RCTFabric` is required because JSI headers live in the Fabric package in the New Architecture dependency graph.

## Registration: RCTAppSetupUtils vs Manual AppDelegate

| Scenario | Approach |
|----------|----------|
| Module is in the app target | `RCT_EXPORT_MODULE` is sufficient; auto-discovered |
| Module is in a separate pod, same repo | Add the pod to `Podfile`; `RCT_EXPORT_MODULE` is still auto-discovered |
| Module is a third-party pod library | Consumer adds to `Podfile`; auto-discovered via class registration |
| Module needs custom init (e.g. inject a shared service) | Override `getModuleInstanceFromClass:` in `AppDelegate` |

`RCTAppSetupUtils` provides `RCTAppSetupPrepareApp` (called once in `application:didFinishLaunchingWithOptions:`) and `RCTAppSetupDefaultModuleFromClass` (called per module by the manager). Unless you need custom initialization, rely on the defaults and keep `AppDelegate` changes minimal.

## Common Errors and Their Causes

### "Cannot find module 'NativeStorageModule'"

This error appears in JavaScript at runtime.

- Codegen has not run. Run `cd ios && bundle exec pod install` to trigger it.
- The module name in `TurboModuleRegistry.strictGet` does not match the string passed to `RCT_EXPORT_MODULE`. They must be identical.
- The Codegen output directory (`build/generated/ios/`) is not included in Xcode's build phases. Check that the **Generate Specs** script phase ran successfully in the last build.

### "Does not conform to protocol 'NativeStorageModuleSpec'"

The ObjC++ class is missing one or more methods declared in the Codegen-generated protocol.

1. Open the generated header at `ios/build/generated/ios/AppSpecs/AppSpecsJSI.h`.
2. Locate the `@protocol NativeStorageModuleSpec` block.
3. Compare each method signature with your `.mm` implementation — parameter types, labels, and return types must match exactly.
4. Re-run Codegen (`pod install`) after any change to the TypeScript spec.

### "Symbol not found: _OBJC_CLASS_$_NativeStorageModule"

The linker cannot resolve the class at link time.

- The `.mm` file was not added to the **Compile Sources** build phase in Xcode.
- The podspec `source_files` glob does not match the `.mm` file path.
- The consumer's `Podfile` is missing `pod 'NativeStorageModule'`, or `pod install` was not re-run after adding it.

### "Include of non-modular header inside framework module"

This occurs when a C++ header (`jsi/jsi.h` or React internals) is imported in a context that expects modular headers.

- Set `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` in Build Settings.
- Confirm the pod target xcconfig sets `CLANG_CXX_LANGUAGE_STANDARD` to `c++17`.
- Wrap C++ imports in `#ifdef __cplusplus` guards in any shared header:

```objc
#ifdef __cplusplus
#import <jsi/jsi.h>
#import <ReactCommon/RCTTurboModule.h>
#endif
```

### Module compiles but returns undefined at runtime

- Verify that `getTurboModule:` returns a non-null `shared_ptr`. Add a log inside the method to confirm it is being called.
- Confirm that `RCT_EXPORT_MODULE` uses exactly the module name from the TypeScript spec, not an empty string.
- Verify that `RCTEnableTurboModule(YES)` is called inside `RCTAppSetupPrepareApp` before the bridge is created. Without this flag, the runtime falls back to the legacy module system and TurboModule resolution is bypassed entirely.
