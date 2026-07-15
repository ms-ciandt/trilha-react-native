---
title: "Runtime — Hermes & Codegen"
---

# Runtime — New Architecture

> **Module 03 — React Native Masterclass**
> Target: senior engineers who need to understand how all parts of the New Architecture connect — from Hermes bytecode to Fabric commits and TurboModule calls.
> React Native 0.76+ — Bridgeless mode, Codegen, JSI-first.

---

## 1. JS with the Hermes Engine

### The full execution pipeline

When your app starts, the following happens before a single React component renders:

```
App launch
    │
    ▼
ReactHost.start() / RCTHost.start()
    │
    ├─ Spawn Hermes VM (one per ReactHost)
    │      └─ Initialize GC, runtime config, built-in objects
    │
    ├─ Load JS bundle
    │      ├─ If release: read .hbc from disk (mmap)
    │      └─ If debug: fetch from Metro bundler (HTTP)
    │
    ├─ Execute bundle (Hermes evaluates top-level module code)
    │      └─ AppRegistry.registerComponent('App', () => App)
    │
    ├─ Install TurboModule bindings (JSI)
    │      └─ global.__turboModuleProxy = C++ HostObject
    │
    ├─ Install Fabric bindings (JSI)
    │      └─ global.nativeFabricUIManager = C++ HostObject
    │
    └─ Call AppRegistry.runApplication('App', { ... })
           └─ React mounts root, Fabric creates Shadow Tree
```

### Hermes configuration

`ReactNativeHost` (Android) and `RCTHost` (iOS) accept a `RuntimeConfig` that controls Hermes behaviour:

```kotlin
// Android — configure Hermes via HermesExecutorFactory
class MyReactNativeHost(application: Application) : DefaultReactNativeHost(application) {

    override val isHermesEnabled = true

    override fun getJSExecutorFactory(): JSExecutorFactory {
        return HermesExecutorFactory(
            RuntimeConfig.Builder()
                .withEnableSampleProfiling(BuildConfig.DEBUG)
                .withGCConfig(
                    GCConfig.Builder()
                        // 256 MB heap — tune for your target device tier
                        .withMaxHeapSize(256 * 1024 * 1024)
                        .build()
                )
                .build()
        )
    }
}
```

```swift
// iOS — configure via RCTHermesInstance
final class AppJSEngineProvider: RCTJSEngineProvider {
    func createJSEngine() -> any RCTJSRuntime {
        var config = HermesRuntimeConfig()
        config.gcConfig.maxHeapSize = 256 * 1024 * 1024  // 256 MB
        config.enableSampleProfiling = false              // disable in release
        return RCTHermesInstance(runtimeConfig: config, onUnhandledError: nil)
    }
}
```

---

## 2. Bytecode and Compilation

### How Hermes compiles JavaScript

Hermes has two compilation modes:

**JIT-free AOT (the default for release builds)**

```
source.js  ──hermes compiler──►  source.hbc  ──shipped in APK/IPA──►  device
```

The compilation happens at build time, not at runtime. The device never sees text JavaScript — only pre-parsed, pre-compiled bytecode.

**JIT-free interpretation (debug builds)**

```
Metro server  ──serves──►  source.js  ──hermes parses at runtime──►  AST ──►  bytecode in RAM
```

Debug builds do not use `.hbc` because source maps must be accurate line-by-line.

### The bytecode format

Hermes bytecode is a register-based virtual machine instruction set (not stack-based). Each function in your JS bundle becomes a sequence of register-machine instructions:

```
// Original JS:
function add(a, b) { return a + b; }

// Hermes bytecode (human-readable dump via `hermes -dump-bytecode`):
Function<add>(2 params, 1 registers):
  Add       r0, a0, a1   ; r0 = a + b
  Ret       r0           ; return r0
```

Compare to JSC's JIT output: JSC generates machine code (ARM64/x86) at runtime. Hermes skips this — it interprets bytecode directly. For most React Native workloads (UI rendering, API calls, state management), interpretation is fast enough and the cold-start win is significant.

### Measuring compilation impact

```bash
# Build a release APK with Hermes
./gradlew assembleRelease

# Inspect the bytecode inside the bundle
unzip -p app/build/outputs/apk/release/app-release.apk assets/index.android.bundle \
  | file -

# Expected output:
# Hermes JavaScript compiler bytecode, version 96

# Measure bundle load time with systrace
adb shell am start -n com.yourapp/.MainActivity
adb shell am profile start com.yourapp --sampling 1000
# ... let the app load ...
adb shell am profile stop com.yourapp
```

In Perfetto / Android Studio CPU Profiler, look for:
- `HermesExecutor::loadBundle` — time to mmap the .hbc file
- `Runtime::callFunction` — time to execute `AppRegistry.runApplication`

### RAM Bundle vs Hermes Bytecode

Before Hermes, the best startup optimization was RAM Bundle (indexed sections so Metro only loads the modules actually required at startup). With Hermes, RAM Bundle is unnecessary — `.hbc` is already more efficient than RAM bundle. You should **not** use `bundleCommand: 'ram-bundle'` when Hermes is enabled.

| Strategy | Cold-start benefit | Trade-off |
|---|---|---|
| Hermes .hbc | Parse + JIT eliminated | AOT compile at build time |
| RAM Bundle | Only loads required modules | Requires JS indexing, incompatible with Hermes |
| Hermes + inline requires | Further reduces evaluated code at start | Source code complexity |

### Inline requires (lazy module evaluation)

Even with Hermes bytecode, every `require()` at module top-level runs at bundle load time. Inline requires defer this:

```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,  // transform top-level requires into lazy getters
      },
    }),
  },
};
```

With `inlineRequires: true`, this code:

```javascript
import HeavyLibrary from 'heavy-library';  // evaluated immediately at load time

export function doSomething() {
  return HeavyLibrary.compute();
}
```

Becomes at the bytecode level:

```javascript
// The import is deferred until the first call to doSomething()
export function doSomething() {
  const HeavyLibrary = require('heavy-library');  // now lazy
  return HeavyLibrary.compute();
}
```

This is why `enableInlineRequires` in `react-native.config.js` meaningfully improves TTI (time to interactive) on apps with many dependencies.

---

## 3. Interaction: Codegen / Fabric / TurboModules

This section explains how the three pillars of the New Architecture connect and who calls whom.

### The full interaction diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         BUILD TIME                                            │
│                                                                               │
│  TypeScript Specs                                                             │
│    ├── NativeMyModule.ts  ──codegen──►  C++ TurboModuleSpec header            │
│    └── NativeMyView.ts   ──codegen──►  C++ ShadowNode + Props + EventEmitter  │
└───────────────────────────────────────────────────────────────────────────────┘
                    │ compiled into app binary
┌───────────────────────────────────────────────────────────────────────────────┐
│                         RUNTIME                                               │
│                                                                               │
│  Hermes VM                                                                    │
│    └─ global.__turboModuleProxy (JSI HostObject)                              │
│         └─ JS calls: TurboModuleRegistry.get('MyModule')                      │
│               └─► C++ TurboModuleProxy looks up registry                     │
│                     └─► Returns JSI HostObject wrapping native impl           │
│                           └─► JS calls methods directly via JSI               │
│                                                                               │
│  global.nativeFabricUIManager (JSI HostObject)                                │
│    └─ React calls: createNode, appendChild, commitTree                        │
│         └─► Fabric C++ creates/updates ShadowNodes                           │
│               └─► Yoga calculates layout                                      │
│                     └─► MountingCoordinator → UI thread → native views        │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Codegen in detail

Codegen is a build-time code generator that reads TypeScript specs and emits C++ headers. It eliminates the "magic strings" that plagued the old architecture (where `NativeModules.MyModule.doThing()` was a runtime dictionary lookup that could silently fail).

Running Codegen manually:

```bash
# From project root
node node_modules/react-native/scripts/generate-codegen-artifacts.js \
  --path . \
  --outputPath android/app/build/generated/source/codegen
```

What it generates for a TurboModule spec:

```typescript
// Input: NativeCalculator.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  add(a: number, b: number): number;
  computeAsync(n: number): Promise<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Calculator');
```

```cpp
// Output: NativeCalculatorSpec.h (generated)
#pragma once
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace facebook::react {

JSI_EXPORT extern const char CalculatorModuleName[];

class JSI_EXPORT NativeCalculatorCxxSpec
    : public TurboModule {
public:
  NativeCalculatorCxxSpec(std::shared_ptr<CallInvoker> jsInvoker)
      : TurboModule(CalculatorModuleName, jsInvoker) {
    // Each method is registered as a JSI HostFunction
    methodMap_["add"] = MethodMetadata{2, __hostFunction_NativeCalculatorCxxSpec_add};
    methodMap_["computeAsync"] = MethodMetadata{1, __hostFunction_NativeCalculatorCxxSpec_computeAsync};
  }

  // Pure virtual — you implement these in your TurboModule
  virtual double add(jsi::Runtime& rt, double a, double b) = 0;
  virtual jsi::Value computeAsync(jsi::Runtime& rt, double n) = 0;
};

} // namespace facebook::react
```

Your implementation just subclasses this:

```cpp
// CalculatorModule.cpp — you write this part
class CalculatorModule : public NativeCalculatorCxxSpec {
public:
  CalculatorModule(std::shared_ptr<CallInvoker> jsInvoker)
      : NativeCalculatorCxxSpec(jsInvoker) {}

  double add(jsi::Runtime& rt, double a, double b) override {
    return a + b;  // synchronous, runs on JS thread
  }

  jsi::Value computeAsync(jsi::Runtime& rt, double n) override {
    // Build a Promise, schedule heavy work on background thread
    return createPromiseAsJSIValue(rt, [n, this](
        jsi::Runtime& rt,
        std::shared_ptr<Promise> promise
    ) {
      backgroundQueue_.submit([n, promise]() {
        double result = expensiveCompute(n);
        promise->resolve(result);
      });
    });
  }

private:
  ThreadPool backgroundQueue_;
};
```

### TurboModule lazy loading

In the old architecture, all native modules were instantiated at startup regardless of whether they were used. TurboModules are **lazily instantiated** — the native object is created only when JS first calls `TurboModuleRegistry.get('ModuleName')`.

This is why large RN apps see startup improvements with New Architecture: a module for, say, `BluetoothModule` is never initialized if the user never visits a Bluetooth screen.

```typescript
// JS: lazy load pattern — don't call getEnforcing at module level
// BAD — module instantiated at bundle load time
import NativeBluetoothModule from './NativeBluetoothModule'; // triggers init immediately

// GOOD — module instantiated only when the function is called
function scanForDevices() {
  const bluetooth = TurboModuleRegistry.get('BluetoothModule');
  if (!bluetooth) throw new Error('Bluetooth not available');
  return bluetooth.scan();
}
```

### TurboModule + Fabric event loop

The most important thing to understand is that in New Architecture there is **no event loop tick between a TurboModule call and its synchronous return**. The old bridge forced everything through a queue, which meant native could never return a value to JS in the same frame. JSI eliminates this:

```typescript
// RN 0.76 — synchronous TurboModule call
const NativeKeychain = TurboModuleRegistry.getEnforcing('Keychain');

// This runs C++ synchronously on the JS thread — no await needed
const value = NativeKeychain.getSync('session_token');

// UI update triggered by synchronous read — resolves in the same frame
setAuthToken(value);
```

How does Fabric know about this update? The call chain:

1. `setAuthToken(value)` → React schedules a discrete priority update
2. React reconciler produces a new element tree
3. Fabric C++ receives the new tree via `nativeFabricUIManager.createNode` (JSI, synchronous)
4. Layout computed in C++
5. `MountingTransaction` dispatched to UI thread
6. Native views updated — all within the same VSync frame

---
