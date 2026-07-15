---
title: "JSI — Advanced Patterns"
---

## 5. Synchronous and Asynchronous Calls

JSI allows both. The choice is yours; JSI does not force asynchrony.

### Synchronous (same thread)

```cpp
// C++ — synchronous host function
auto syncHash = Function::createFromHostFunction(
    rt,
    PropNameID::forAscii(rt, "hashSync"),
    1,
    [](Runtime& rt, const Value&, const Value* args, size_t) -> Value {
      if (!args[0].isString()) throw JSError(rt, "hashSync requires string");
      std::string input = args[0].getString(rt).utf8(rt);
      uint32_t hash = fnv1a_hash(input);  // CPU-bound, runs on JS thread
      return Value(static_cast<double>(hash));
    }
);
rt.global().setProperty(rt, "hashSync", std::move(syncHash));
```

```typescript
// JS — blocks JS thread until C++ returns
const hash: number = (global as any).hashSync("hello world");
```

When is sync appropriate: reading a small cached value, performing a cheap calculation, accessing shared memory that C++ already holds. **Never call blocking I/O synchronously on the JS thread.**

### Asynchronous (via Promise)

When the work is I/O-bound or must run on a different thread, you return a `Promise` by constructing one from JS's global `Promise` constructor.

```cpp
// C++ — builds a JS Promise, resolves on background thread
Value asyncFetch(Runtime& rt, const Value& thisVal, const Value* args, size_t count) {
  std::string url = args[0].getString(rt).utf8(rt);
  
  // Get the JS Promise constructor
  auto promiseCtor = rt.global()
      .getPropertyAsFunction(rt, "Promise");
  
  // Capture the resolve/reject functions that the executor gives us
  std::shared_ptr<Function> resolve, reject;
  
  auto executor = Function::createFromHostFunction(
      rt,
      PropNameID::forAscii(rt, "executor"),
      2,
      [&resolve, &reject](Runtime& rt, const Value&, const Value* args, size_t) -> Value {
        resolve = std::make_shared<Function>(args[0].getObject(rt).asFunction(rt));
        reject  = std::make_shared<Function>(args[1].getObject(rt).asFunction(rt));
        return Value::undefined();
      }
  );
  
  // Actually construct the Promise — calls executor immediately
  Value promise = promiseCtor.callAsConstructor(rt, executor);
  
  // Schedule background work
  threadPool_.submit([url, resolve, reject, &rt]() {
    auto result = http::get(url);   // blocking I/O on background thread
    
    // Must call back on JS thread (runtime is not thread-safe)
    jsCallInvoker_->invokeAsync([resolve, result, &rt]() {
      resolve->call(rt, String::createFromUtf8(rt, result.body));
    });
  });
  
  return promise;
}
```

The critical rule: **the `Runtime` is not thread-safe**. All `jsi::Value` operations must happen on the thread that owns the runtime (the JS thread). `jsCallInvoker_->invokeAsync` is the hook that schedules work back onto the JS thread.

---

## 6. Interop with Hermes

Hermes is React Native's default JS engine since 0.64 and the only officially supported engine for New Architecture (though JSC still works via the JSI interface).

### Why Hermes?

| Property | Hermes | JavaScriptCore |
|---|---|---|
| Compilation | Ahead-of-time bytecode | JIT at runtime |
| Startup time | Faster (bytecode already compiled) | Slower (parse + JIT warmup) |
| RAM usage | Lower (no JIT compiler resident) | Higher |
| Debugger protocol | CDP (Chrome DevTools Protocol) | CDP |
| Engine size | Smaller binary | Larger binary |
| JSI implementation | `HermesRuntime` | `JSCRuntime` |

### Hermes bytecode

Hermes compiles `.js` → `.hbc` (Hermes Bytecode) at build time via `hermes` CLI:

```bash
# During Metro bundle — Hermes compiles automatically when hermesEnabled = true
# The resulting bundle is already bytecode, not text JS

# Manually inspect bytecode:
./hermes -dump-bytecode output.hbc
```

The `.hbc` format is a dense register-based VM instruction set. Because it is pre-compiled:
- No parser runs at app startup
- No AST is built
- No JIT warmup — execution starts from bytecode immediately

This is why Hermes shaves 200–800ms from cold-start times on real devices (the exact number depends heavily on bundle size and device CPU speed).

### HermesRuntime and JSI

`HermesRuntime` is the Hermes implementation of `jsi::Runtime`:

```cpp
// hermes/API/hermes/hermes.h
namespace facebook::hermes {
  std::unique_ptr<jsi::Runtime> makeHermesRuntime(
      const vm::RuntimeConfig& runtimeConfig = vm::RuntimeConfig()
  );
}
```

In React Native, `RCTHermesInstance` wraps this:

```objc
// iOS — RCTHermesInstance.mm
- (std::unique_ptr<facebook::jsi::Runtime>)createJSRuntimeWithConfig:
    (const facebook::react::RuntimeConfig&)config {
  return facebook::hermes::makeHermesRuntime(/* config */);
}
```

```kotlin
// Android — HermesExecutor.cpp
std::unique_ptr<JSRuntime> HermesExecutorFactory::createJSRuntime(...) {
  auto runtime = facebook::hermes::makeHermesRuntime(config);
  return std::make_unique<HermesExecutor>(std::move(runtime), ...);
}
```

### JSI Decorator pattern in Hermes

Hermes ships `DecoratedRuntime` — a wrapper that lets you add instrumentation, sampling profiling, or BigInt/Intl extensions without modifying the core engine:

```cpp
// Hermes profiling runtime (used by Flipper)
auto hermesRuntime = makeHermesRuntime(config);
auto profiledRuntime = std::make_unique<HermesDecoratedRuntime>(
    std::move(hermesRuntime),
    ProfilerDecorator{}  // intercepts createFunctionFromHostFunction, call, etc.
);
```

This is how the Hermes sampling profiler works — it wraps the runtime and intercepts `call` to record timestamps.

### BigInt and Hermes

Hermes 0.12+ (bundled with RN 0.71+) supports `BigInt`. From JSI perspective, `jsi::BigInt` is a separate type:

```cpp
// Checking BigInt from C++
if (value.isBigInt()) {
  int64_t n = value.getBigInt(rt).truncate(rt);  // lossy — use only if you know it fits
  // or convert to string for safe transfer
  std::string str = value.getBigInt(rt).toString(rt).utf8(rt);
}
```

---

## 7. Host Functions: Real-World Patterns

### Pattern 1: Measurement API (sync, no allocation)

This is the pattern Fabric uses internally for `measure()` and layout queries.

```cpp
// Synchronous layout measurement via JSI
auto measureHost = Function::createFromHostFunction(
    rt,
    PropNameID::forAscii(rt, "measure"),
    1,  // takes a node tag
    [uiManager](Runtime& rt, const Value&, const Value* args, size_t count) -> Value {
      int tag = static_cast<int>(args[0].getNumber());
      
      // UIManager is thread-safe for reads
      LayoutMetrics metrics = uiManager->getLayoutMetrics(tag);
      
      // Return a plain JS object — no JSON, no serialization
      auto result = Object(rt);
      result.setProperty(rt, "x",      Value(metrics.frame.origin.x));
      result.setProperty(rt, "y",      Value(metrics.frame.origin.y));
      result.setProperty(rt, "width",  Value(metrics.frame.size.width));
      result.setProperty(rt, "height", Value(metrics.frame.size.height));
      result.setProperty(rt, "pageX",  Value(metrics.pageOrigin.x));
      result.setProperty(rt, "pageY",  Value(metrics.pageOrigin.y));
      return result;
    }
);
```

In the old bridge, `measure()` was asynchronous because of the queue. With JSI, it is synchronous — no `useEffect` + callback required.

### Pattern 2: Shared ArrayBuffer (zero-copy binary data)

When you need to pass binary data (image pixels, audio samples) between C++ and JS without copying, use `ArrayBuffer`:

```cpp
// C++ — expose a native buffer directly to JS
auto getFrameBuffer = Function::createFromHostFunction(
    rt,
    PropNameID::forAscii(rt, "getFrameBuffer"),
    0,
    [&cameraDriver](Runtime& rt, const Value&, const Value* args, size_t) -> Value {
      // Get pointer to native frame buffer (already in memory)
      uint8_t* pixels = cameraDriver.lockCurrentFrame();
      size_t byteSize = cameraDriver.frameByteSize();
      
      // MutableBuffer is a JSI type that wraps a native pointer
      // The lambda is the destructor — called by GC when JS releases the buffer
      auto buffer = std::make_shared<jsi::MutableBuffer>(
          pixels,
          byteSize,
          [&cameraDriver](uint8_t*) {
            cameraDriver.unlockCurrentFrame();
          }
      );
      
      return ArrayBuffer(rt, std::move(buffer));
    }
);
```

```typescript
// JS — zero-copy access to native frame data
const buffer: ArrayBuffer = (global as any).getFrameBuffer();
const pixels = new Uint8ClampedArray(buffer);
// pixels[0..3] is the first pixel's RGBA — no copy was made
```

---

## 8. JSI Debugging

### Identifying JSI errors

JSI errors surface as `JSIException` in C++ and appear in the JS error boundary as standard `Error` objects. The stack trace will point to the `HostFunction` or `HostObject.get` that threw.

```cpp
// Throwing a typed error from C++
throw JSError(rt, "NativeSensor: device not calibrated");

// This becomes in JS:
// Error: NativeSensor: device not calibrated
//   at NativeSensor.lastReading (<anonymous>)
//   at MyComponent (MyComponent.tsx:24)
```

### Chrome DevTools + Hermes

With RN 0.73+, Hermes is debugged via CDP (Chrome DevTools Protocol) directly — no Flipper required:

1. In Metro output you will see: `Inspector proxy: ws://localhost:8081/inspector`
2. Open `chrome://inspect` in Chrome
3. Click "Inspect" on the listed device

You can set breakpoints inside `Function.createFromHostFunction` callbacks if you build a debug version with source maps. In release builds, use `console.log` bridged to native logging:

```cpp
// Log from C++ to Hermes console
rt.global()
    .getPropertyAsObject(rt, "console")
    .getPropertyAsFunction(rt, "log")
    .call(rt, String::createFromUtf8(rt, "[Native] sensor initialized"));
```

### Profiling JSI overhead with Perfetto

On Android, JSI calls appear in Perfetto traces under the `JSI` trace category. Enable it:

```bash
adb shell am start -n com.yourapp/.MainActivity \
  --ez "react_native_jsi_tracing" true
```

Each `HostFunction` call appears as a `JSI::HostFunction::<name>` slice. If you see unexpectedly long slices, the host function is doing too much work synchronously on the JS thread.

---

## Study Materials

### Official Source Code

| Resource | What you will find |
|---|---|
| [`jsi/jsi.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi.h) | Complete JSI type definitions — Runtime, Value, HostObject, HostFunction |
| [`jsi/jsi-inl.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi-inl.h) | Inline implementations of the Value constructors |
| [`ReactCommon/callinvoker`](https://github.com/facebook/react-native/tree/main/packages/react-native/ReactCommon/callinvoker) | `CallInvoker` — the correct way to schedule C++ work back onto the JS thread |
| [`hermes/API/hermes/hermes.h`](https://github.com/facebook/hermes/blob/main/API/hermes/hermes.h) | `HermesRuntime` public API |

### Official Documentation

| Resource | Description |
|---|---|
| [JSI Reference](https://reactnative.dev/docs/the-new-architecture/landing-page) | New Architecture landing page with JSI context |
| [TurboModules with JSI](https://reactnative.dev/docs/turbo-native-modules-introduction) | How Codegen generates JSI bindings from TypeScript specs |
| [Hermes documentation](https://hermesengine.dev/) | Official Hermes site: bytecode format, debugging, configuration |

### Deep Dives

| Resource | Author | What you will learn |
|---|---|---|
| [JSI: A new infrastructure for React Native](https://formidable.com/blog/2019/jsi-jsc-part-2/) | Formidable | Original breakdown of JSI design goals vs old bridge |
| [Deep dive into React Native's New Architecture](https://medium.com/engineering-housing/deep-dive-into-react-natives-new-architecture-fb67ae615ccd) | Housing.com Eng | End-to-end architecture: JSI → Fabric → TurboModules |
| [Writing a JSI module from scratch](https://ospfranco.com/post/2021/02/24/how-to-create-a-jsi-module/) | Oscar Franco | Full walkthrough: C++ HostObject, CMakeLists, iOS and Android wiring |
| [react-native-mmkv internals](https://github.com/mrousavy/react-native-mmkv/blob/main/ios/MmkvHostObject.cpp) | Marc Rousavy | Production HostObject implementation — read the actual source |
| [op-sqlite JSI source](https://github.com/OP-Engineering/op-sqlite/tree/main/cpp) | Oscar Franco | Synchronous SQLite via JSI — real-world binary data and thread handling |

### Video Tutorials

| Resource | Duration | What you will learn |
|---|---|---|
| [JSI in React Native — Explained](https://www.youtube.com/watch?v=wKwJ9VBovDc) | 18 min | Visual walkthrough of JSI replacing the bridge |
| [How Hermes Works](https://www.youtube.com/watch?v=oSHBQheFm48) | 22 min | Bytecode pipeline, GC, profiling |
| [React Native EU 2022 — JSI Internals](https://www.youtube.com/watch?v=yVhZnGl2C5M) | 30 min | Conference talk: JSI design decisions, edge cases, thread model |

### Interactive

| Resource | What to do |
|---|---|
| [Expo Snack — JSI via MMKV](https://snack.expo.dev/@mrousavy/react-native-mmkv) | Run MMKV in the browser — observe synchronous reads in action |
| [react-native-jsi-example](https://github.com/ospfranco/react-native-jsi-template) | Minimal template: one HostObject, CMakeLists, iOS + Android — fork and build |

---

Next → [Fabric — New Renderer](./02-fabric-renderer.md)
