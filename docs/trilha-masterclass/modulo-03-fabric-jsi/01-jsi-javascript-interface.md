---
title: "JSI — JavaScript Interface"
---

# JSI — JavaScript Interface

> **Module 03 — React Native Masterclass**
> Target: senior engineers who want to understand how JavaScript calls C++ without a message queue.
> React Native 0.76+ — New Architecture (Bridgeless, JSI-first, Hermes).

---

## 1. The Problem JSI Solves

To understand JSI you must first understand what it replaced and exactly where the old bridge was slow.

### The old bridge — serialization as the bottleneck

The old architecture connected the JS engine (JavaScriptCore) and native via a one-way asynchronous message queue. Every call between layers followed this path:

```
JS thread
  └─► serialize JS value to JSON string (malloc + JSON.stringify)
        └─► enqueue message on C++ queue
              └─► dequeue on native thread
                    └─► parse JSON back to native types (alloc + JSON decode)
                          └─► run native code
                                └─► re-serialize result to JSON
                                      └─► async callback to JS thread
```

This had three hard costs:

| Cost | What happens | Typical impact |
|---|---|---|
| Serialization | Every number, string, array becomes a JSON string | 0.1–5 ms per large call |
| Memory pressure | String copy exists in both heaps simultaneously | 2× the payload size allocated |
| Asynchrony | No call can block and wait | All patterns require callbacks/promises |

The biggest consequence of the async-only constraint was that some APIs that **must be synchronous on native** (scroll event listeners, layout measurement, animation drivers) had to work around the bridge with complex workarounds — `InteractionManager`, `setNativeProps`, the old Animated driver. All of these exist because the bridge couldn't return a value synchronously.

### What JSI is

JSI stands for **JavaScript Interface**. It is a thin C++ header-only library that gives any C++ object direct access to the JavaScript heap — without serialization, without a message queue, without asynchrony as a forced constraint.

The key file: [`jsi/jsi.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi.h)

JSI defines three fundamental abstractions:
- `jsi::Runtime` — the JS engine itself (Hermes, JSC, V8)
- `jsi::Value` — a tagged union that holds any JS value (undefined, null, bool, number, string, object, symbol, bigint) **without copying it**
- `jsi::HostObject` / `jsi::HostFunction` — C++ objects you can hand to JS code

JSI is engine-agnostic. It is not Hermes-specific. Hermes, JavaScriptCore, and V8 all implement the `jsi::Runtime` interface. Swapping engines means swapping the `Runtime` implementation — JSI code above it is unchanged.

---

## 2. JSI vs Old Bridge — Side-by-Side

```
Old Bridge                          JSI

JS ──[JSON]──► Queue ──[JSON]──►   JS ──[pointer]──► C++ object
                                                         │
Native ◄──[JSON]── Queue ◄──[JSON]── (no queue at all, direct call)
```

| Dimension | Old Bridge | JSI |
|---|---|---|
| Call direction | Async only (queue) | Sync or async, caller decides |
| Data transfer | JSON serialization | Shared pointer to JS value |
| Memory | Copy in both heaps | Zero-copy (JS GC manages lifetime) |
| Thread model | JS thread → native thread | Same thread (sync) or any thread (async) |
| C++ surface area | RCTBridge (Obj-C++) | `jsi::Runtime` (pure C++) |
| Engine coupling | JavaScriptCore only | Any engine implementing `jsi::Runtime` |

---

## 3. Core JSI Types

### `jsi::Runtime`

The runtime is your entry point. You get one from the engine; you do not create it yourself. In React Native, `ReactInstance` holds the runtime and passes references to TurboModules, Fabric, and Codegen-generated bindings.

```cpp
// jsi/jsi.h (simplified)
class Runtime {
public:
  // Evaluate JS from a source string
  virtual Value evaluateJavaScript(
      const std::shared_ptr<const Buffer>& buffer,
      const std::string& sourceURL) = 0;

  // Access the global object
  virtual Object global() = 0;

  // Create values on the JS heap (these live under GC control)
  virtual Object createObject() = 0;
  virtual Object createObject(std::shared_ptr<HostObject> ho) = 0;
  virtual Function createFunctionFromHostFunction(
      const PropNameID& name,
      unsigned int paramCount,
      HostFunctionType func) = 0;

  // String interning
  virtual PropNameID createPropNameIDFromAscii(const char* str, size_t length) = 0;
};
```

### `jsi::Value`

A tagged union that can hold any JS value. It is **move-only** — copying is intentionally disabled to force explicit ownership.

```cpp
class Value {
  // Tags
  enum class ValueKind : uint32_t {
    UndefinedKind,
    NullKind,
    BooleanKind,
    NumberKind,
    SymbolKind,
    BigIntKind,
    StringKind,
    ObjectKind,
  };
  
public:
  // Type guards
  bool isUndefined() const;
  bool isNull() const;
  bool isBool() const;
  bool isNumber() const;
  bool isString() const;
  bool isObject() const;
  bool isSymbol() const;
  bool isBigInt() const;

  // Extractors (throw JSIException if wrong type)
  bool getBool() const;
  double getNumber() const;
  std::string getString(Runtime& rt) const;
  Object getObject(Runtime& rt) &&;    // move semantics: you take ownership
};
```

The move-only design is intentional: `jsi::Value` is a **reference** into the JS heap. Copying it would either require duplicating the heap object (expensive) or creating a second reference without the GC knowing (dangling pointer). Moving transfers ownership cleanly.

### `jsi::HostObject`

A C++ class that you expose as a JavaScript object. When JS reads a property, `get` is called. When JS writes a property, `set` is called.

```cpp
class HostObject {
public:
  virtual ~HostObject() {}
  
  // Called when JS reads: obj.someProperty
  virtual Value get(Runtime& rt, const PropNameID& name) = 0;
  
  // Called when JS writes: obj.someProperty = value
  virtual void set(Runtime& rt, const PropNameID& name, const Value& value) = 0;
  
  // Called when JS does: Object.keys(obj)
  virtual std::vector<PropNameID> getPropertyNames(Runtime& rt) = 0;
};
```

### `jsi::HostFunction`

A C++ lambda or function exposed as a JavaScript function. The `this` object and all arguments arrive as `jsi::Value` references.

```cpp
// Signature of a host function
using HostFunctionType = std::function<
    Value(Runtime& rt, const Value& thisVal, const Value* args, size_t count)
>;
```

---

## 4. Writing a HostObject from Scratch

The following shows a complete, minimal HostObject that wraps a native hardware sensor. No Codegen, no TurboModule scaffolding — pure JSI.

### C++ layer

```cpp
// SensorHostObject.h
#pragma once
#include <jsi/jsi.h>
#include <memory>

using namespace facebook::jsi;

class SensorHostObject : public HostObject {
public:
  explicit SensorHostObject(std::shared_ptr<ISensorDriver> driver)
      : driver_(std::move(driver)) {}

  Value get(Runtime& rt, const PropNameID& name) override {
    std::string propName = name.utf8(rt);
    
    if (propName == "lastReading") {
      // Return current sensor value synchronously — no async, no JSON
      double reading = driver_->readSync();
      return Value(reading);
    }
    
    if (propName == "subscribe") {
      // Return a JS function that installs a callback
      return Function::createFromHostFunction(
          rt,
          PropNameID::forAscii(rt, "subscribe"),
          1,  // arity
          [weakDriver = std::weak_ptr<ISensorDriver>(driver_)]
          (Runtime& rt, const Value& thisVal, const Value* args, size_t count) -> Value {
            if (count < 1 || !args[0].isObject()) {
              throw JSError(rt, "subscribe() requires a callback function");
            }
            
            auto callback = std::make_shared<Function>(
                args[0].getObject(rt).asFunction(rt)
            );
            
            auto driver = weakDriver.lock();
            if (!driver) return Value::undefined();
            
            driver->onReading([callback, &rt](double value) {
              callback->call(rt, Value(value));
            });
            
            return Value::undefined();
          }
      );
    }
    
    return Value::undefined();
  }

  void set(Runtime& rt, const PropNameID& name, const Value& value) override {
    throw JSError(rt, "SensorObject is read-only");
  }

  std::vector<PropNameID> getPropertyNames(Runtime& rt) override {
    return {
      PropNameID::forAscii(rt, "lastReading"),
      PropNameID::forAscii(rt, "subscribe"),
    };
  }

private:
  std::shared_ptr<ISensorDriver> driver_;
};
```

### Installing the HostObject into the JS global

```cpp
// JSIInstaller.cpp
void installSensorObject(Runtime& rt, std::shared_ptr<ISensorDriver> driver) {
  auto sensorObj = std::make_shared<SensorHostObject>(std::move(driver));
  
  // Wrap in a JSI Object managed by the JS GC
  auto jsObj = Object::createFromHostObject(rt, sensorObj);
  
  // Expose on the global scope: global.__sensorBridge
  rt.global().setProperty(rt, "__sensorBridge", std::move(jsObj));
}
```

### JavaScript consumption

```typescript
// JS side — no NativeModules, no require(), no Codegen
const sensor = (global as any).__sensorBridge;

// Synchronous read — returns immediately
const reading: number = sensor.lastReading;
console.log(reading); // e.g. 9.81

// Async callback subscription
sensor.subscribe((value: number) => {
  console.log('New reading:', value);
});
```

Key observations:
- `sensor.lastReading` executes C++ synchronously on the JS thread — no await, no Promise
- `sensor.subscribe()` installs a C++ callback — when the sensor fires, `callback->call(rt, ...)` runs the JS function
- There is no JSON, no queue, no serialization overhead

---
