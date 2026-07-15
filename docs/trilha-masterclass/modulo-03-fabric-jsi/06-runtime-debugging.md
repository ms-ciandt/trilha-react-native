---
title: "Runtime — Debugging & E2E"
---

## 4. Debugging the New Architecture

### Enabling Bridgeless Mode logs

In RN 0.76, `ReactHost`/`RCTHost` runs bridgeless by default. To enable verbose logging:

```kotlin
// Android — enable debug logs in debug builds
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            ReactFeatureFlags.enableBridgelessArchitecture = true
            // Enable verbose Fabric commit logging
            ReactFeatureFlags.enableFabricLogs = true
        }
    }
}
```

```swift
// iOS — build flag
// In Xcode: Edit Scheme → Run → Arguments → Add -RCTFabricLogs 1
```

### Chrome DevTools Protocol (CDP) debugging

RN 0.73+ uses CDP natively — you do not need Flipper for JS debugging:

```bash
# Start Metro
npx react-native start

# In another terminal, connect to the CDP inspector
open "chrome://inspect"
# Click "inspect" next to your device/simulator

# Or use VS Code with the "React Native Tools" extension:
# Run "Attach to Hermes application" debug configuration
```

Setting breakpoints in TurboModule HostFunctions works in debug builds. In release, use `__DEV__` guards and `console.log` which routes to `adb logcat` / Xcode console.

### Systrace / Perfetto

Systrace is the gold-standard tool for diagnosing thread behaviour in RN:

```bash
# Android — capture 10 seconds of systrace
python $ANDROID_HOME/platform-tools/systrace/systrace.py \
  -t 10 \
  -o trace.html \
  react_native_new_arch \  # custom RN trace category
  gfx \                    # GPU/render
  view \                   # view drawing
  dalvik                   # GC events
```

Open `trace.html` in Perfetto UI. Key things to look for:

| Trace Slice | Meaning |
|---|---|
| `Fabric::commit` | Fabric commit pipeline — should complete in < 8ms |
| `JSI::HostFunction::*` | Duration of each HostFunction call |
| `yoga::calculateLayout` | Layout pass — if >2ms, check for deep trees |
| `MountingTransaction::execute` | Time to apply mutations to native views |
| `Choreographer#doFrame` | Android VSync frame budget (16.6ms at 60fps) |

If `Fabric::commit` extends past the VSync deadline, you drop a frame. Common causes:
- Too many nodes in the shadow tree (flatten with `collapsable={true}` — it is the default)
- Large `measureInWindow` calls during layout
- Synchronous TurboModule calls that do expensive I/O on the JS thread

### Hermes sampling profiler

```typescript
// In-app profiling — enable in debug builds only
import { HermesProfiling } from 'react-native';

// Start capturing
HermesProfiling.startSamplingProfiler();

// ... do something expensive ...

// Stop and get profile
const profile = await HermesProfiling.stopSamplingProfiler();
// profile is a JSON string in Chrome CPU profile format
// Save it and open with chrome://inspect → Profiler → Load profile
```

The resulting flame chart shows:
- Time spent in each JS function
- Time spent in JSI HostFunction calls (appear as `[native]` frames)
- GC pause durations

### React DevTools Profiler

The React DevTools Profiler records component render times:

```bash
# Install standalone React DevTools
npm install -g react-devtools@latest
react-devtools
```

With the app running in debug mode, click the Profiler tab and record. After a UI interaction, the flame chart shows:
- Which components re-rendered
- Why they re-rendered (the `why did you render?` annotation)
- Render duration

This is your first stop when a UI interaction feels slow — before reaching for Perfetto.

### Feature Flags and gradual rollout

New Architecture ships several feature flags that let you control which features are active. These are useful for bisecting a regression:

```kotlin
// Android — ReactFeatureFlags.kt
ReactFeatureFlags.apply {
  enableBridgelessArchitecture = true       // default: true in 0.76
  enableFabricLogs = BuildConfig.DEBUG
  useModernEventCoalescing = true           // coalesce rapid scroll events
  enableEagerRootViewAttachment = true      // attach root view before JS loads
  enableBackgroundExecutor = false          // experimental: layout on background thread
}
```

```objc
// iOS — RCTFeatureFlags.h
RCTFeatureFlags::enableBridgelessArchitecture() = true;
RCTFeatureFlags::enableFabricLogs() = RCT_DEBUG;
```

If you suspect a Fabric regression, set `enableBridgelessArchitecture = false` to drop back to the legacy bridge. This is the canonical bisect step — if the regression disappears, it is a New Architecture bug; if it persists, the bug is in your JavaScript.

---

## 5. End-to-End: A Real TurboModule

The following is a complete, production-grade TurboModule. It reads from a native keychain synchronously via JSI and writes asynchronously.

### TypeScript spec

```typescript
// NativeSecureStorage.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface SecureItem {
  value: string;
  createdAt: number;
  expiresAt?: number | null;
}

export interface Spec extends TurboModule {
  // Synchronous — reads from an in-memory cache backed by keychain
  getSync(key: string): string | null;
  
  // Asynchronous — writes to keychain (I/O, must be async)
  set(key: string, value: string, ttlSeconds?: number | null): Promise<void>;
  delete(key: string): Promise<boolean>;
  
  // List all keys (synchronous — uses cached index)
  listKeys(): string[];
}

export default TurboModuleRegistry.getEnforcing<Spec>('SecureStorage');
```

### Android implementation

```kotlin
// SecureStorageModule.kt
class SecureStorageModule(
    reactContext: ReactApplicationContext,
    private val keychain: SecureKeychainService,
) : NativeSecureStorageSpec(reactContext) {

    // In-memory cache for synchronous reads
    private val cache = ConcurrentHashMap<String, String>()

    override fun getName() = NAME

    // Called on JS thread — must be fast
    override fun getSync(key: String): String? = cache[key]

    // Called on JS thread — returns Promise, work done on IO thread
    override fun set(key: String, value: String, ttlSeconds: Double?): Promise {
        return createPromise { resolve, reject ->
            Executors.newSingleThreadExecutor().submit {
                try {
                    keychain.store(key, value, ttlSeconds?.toLong())
                    cache[key] = value  // update cache (thread-safe via ConcurrentHashMap)
                    resolve.resolve(null)
                } catch (e: Exception) {
                    reject.reject("KEYCHAIN_ERROR", e.message, e)
                }
            }
        }
    }

    override fun delete(key: String): Promise {
        return createPromise { resolve, reject ->
            Executors.newSingleThreadExecutor().submit {
                try {
                    val existed = keychain.delete(key)
                    cache.remove(key)
                    resolve.resolve(existed)
                } catch (e: Exception) {
                    reject.reject("KEYCHAIN_ERROR", e.message, e)
                }
            }
        }
    }

    override fun listKeys(): WritableArray {
        return Arguments.createArray().apply {
            cache.keys.forEach { pushString(it) }
        }
    }

    companion object {
        const val NAME = "SecureStorage"
    }
}
```

### iOS implementation

```swift
// SecureStorageModule.mm
#import "NativeSecureStorageSpec.h"  // generated by Codegen

@implementation RCTSecureStorageModule {
    SecureKeychainService* _keychain;
    NSMutableDictionary<NSString*, NSString*>* _cache;
    dispatch_queue_t _ioQueue;
}

RCT_EXPORT_MODULE(SecureStorage)

- (instancetype)init {
    if (self = [super init]) {
        _keychain = [[SecureKeychainService alloc] init];
        _cache = [NSMutableDictionary dictionary];
        _ioQueue = dispatch_queue_create("com.app.SecureStorage", DISPATCH_QUEUE_SERIAL);
    }
    return self;
}

// Synchronous — JS thread, no await needed in JS
- (NSString* _Nullable)getSync:(NSString*)key {
    @synchronized(_cache) {
        return _cache[key];
    }
}

// Asynchronous — I/O on serial queue
- (void)set:(NSString*)key value:(NSString*)value ttlSeconds:(NSNumber* _Nullable)ttl
    resolve:(RCTPromiseResolveBlock)resolve
    reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(_ioQueue, ^{
        NSError* error;
        [self->_keychain store:key value:value ttl:ttl error:&error];
        if (error) {
            reject(@"KEYCHAIN_ERROR", error.localizedDescription, error);
        } else {
            @synchronized(self->_cache) { self->_cache[key] = value; }
            resolve(nil);
        }
    });
}

- (void)delete:(NSString*)key
    resolve:(RCTPromiseResolveBlock)resolve
    reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(_ioQueue, ^{
        NSError* error;
        BOOL existed = [self->_keychain delete:key error:&error];
        if (error) {
            reject(@"KEYCHAIN_ERROR", error.localizedDescription, error);
        } else {
            @synchronized(self->_cache) { [self->_cache removeObjectForKey:key]; }
            resolve(@(existed));
        }
    });
}

- (NSArray<NSString*>*)listKeys {
    @synchronized(_cache) {
        return _cache.allKeys;
    }
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams&)params {
    return std::make_shared<facebook::react::NativeSecureStorageSpecJSI>(params);
}

@end
```

### JavaScript consumption

```typescript
// useSecureStorage.ts
import NativeSecureStorage from './NativeSecureStorage';
import { useCallback, useEffect, useState } from 'react';

export function useSecureStorage(key: string) {
  // Read synchronously — no loading state needed for cached value
  const [value, setValue] = useState<string | null>(() =>
    NativeSecureStorage.getSync(key)
  );

  const store = useCallback(async (newValue: string, ttl?: number) => {
    await NativeSecureStorage.set(key, newValue, ttl ?? null);
    setValue(newValue);  // update local state after persisting
  }, [key]);

  const remove = useCallback(async () => {
    const existed = await NativeSecureStorage.delete(key);
    if (existed) setValue(null);
  }, [key]);

  return { value, store, remove };
}
```

### Expo Snack — TurboModule interaction pattern

This snack demonstrates calling a TurboModule (DeviceInfo) synchronously and observing the absence of a loading state:

https://snack.expo.dev/@react-native-community/device-info-example

In the Snack, watch Network tab — there are zero HTTP requests for the device info values. They come directly from JSI.

---

## Study Materials

### Official Source Code

| Resource | What you will find |
|---|---|
| [`ReactFeatureFlags.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/featureflags/ReactNativeFeatureFlags.h) | All feature flags for New Architecture — bridgeless, Fabric, concurrent rendering |
| [`TurboModule.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/ReactCommon/TurboModule.h) | Base TurboModule C++ class |
| [`TurboModuleBinding.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/TurboModuleBinding.cpp) | How `__turboModuleProxy` is installed on the JS global |
| [`BridgelessJSCallInvoker.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/bridgeless/BridgelessJSCallInvoker.cpp) | CallInvoker for bridgeless mode — how async C++ callbacks reach JS |
| [`Codegen scripts`](https://github.com/facebook/react-native/tree/main/packages/react-native-codegen/src) | The TypeScript → C++ generator source |

### Official Documentation

| Resource | Description |
|---|---|
| [New Architecture Introduction](https://reactnative.dev/docs/the-new-architecture/landing-page) | Official overview and why each piece exists |
| [TurboModules Guide](https://reactnative.dev/docs/turbo-native-modules-introduction) | Step-by-step: spec → Codegen → native implementation |
| [Hermes Guide](https://reactnative.dev/docs/hermes) | Enabling, profiling, and configuring Hermes |
| [Debugging New Architecture](https://reactnative.dev/docs/debugging-native-code) | CDP, Flipper, Systrace — official debugging reference |
| [React Native DevTools](https://reactnative.dev/docs/react-native-devtools) | The new unified debugger (experimental in 0.76) |

### Deep Dives

| Resource | Author | What you will learn |
|---|---|---|
| [How React Native New Architecture works](https://www.callstack.com/blog/new-react-native-architecture-explained) | Callstack | Codegen → JSI → TurboModules → Fabric: the full mental model |
| [TurboModules deep dive](https://blog.swmansion.com/turbomodules-the-new-native-modules-in-react-native-b4b1d90d80db) | Software Mansion | Type safety, lazy loading, interop layer details |
| [React Native Reanimated 3 internals](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary) | Software Mansion | Real production use of JSI for worklet threading |
| [op-sqlite — synchronous SQLite via JSI](https://ospfranco.com/post/2023/06/26/op-sqlite-fastest-sqlite-for-react-native/) | Oscar Franco | Full JSI implementation of a synchronous database |
| [Hermes Memory model and GC](https://hermesengine.dev/docs/gc/) | Hermes team | GC algorithm, heap layout, how to reduce GC pressure |

### Video Tutorials

| Resource | Duration | What you will learn |
|---|---|---|
| [React Native New Architecture — Complete Guide](https://www.youtube.com/watch?v=BPQKE3Yb7vI) | 45 min | Walk-through of all three pillars: JSI, Fabric, TurboModules |
| [TurboModules in practice](https://www.youtube.com/watch?v=GNCrFv_h0tE) | 28 min | Build a TurboModule from scratch with Codegen |
| [Hermes profiling in production](https://www.youtube.com/watch?v=Ma5MLdCAfRQ) | 20 min | CPU sampling, heap snapshots, GC tuning |
| [React Native Europe 2023 — Debugging New Arch](https://www.youtube.com/watch?v=tJGMJiSTkEU) | 35 min | CDP, Perfetto, Hermes profiler — live demo |
| [App.js Conf 2024 — Concurrent RN in production](https://www.youtube.com/watch?v=Ck0N9FsKAhI) | 30 min | `useTransition`, Suspense, and Fabric in a real app |

### Interactive

| Resource | What to do |
|---|---|
| [React Native New Architecture playground](https://snack.expo.dev/) | Create a Snack, open React DevTools Profiler, record a render |
| [Hermes playground](https://playground.hermesengine.dev/) | Paste JS, inspect bytecode output, see register assignments |
| [Yoga playground](https://yogalayout.dev/playground) | Test Flexbox rules, see computed layout numbers |
| [reactwg/react-native-new-architecture](https://github.com/reactwg/react-native-new-architecture/discussions) | Working group discussions — the source of truth for migration decisions |

---

← [Fabric — New Renderer](./02-fabric-renderer.md) | Module 03 complete
