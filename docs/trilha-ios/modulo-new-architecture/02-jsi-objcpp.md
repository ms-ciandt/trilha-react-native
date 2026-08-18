---
title: JSI and ObjC++ Interop
---

# JSI and ObjC++ Interop

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/na_02_jsi-objcpp.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

React Native 0.76 eliminated the legacy Bridge as the default path. In its place, all communication between JavaScript and native code happens via **JSI** — JavaScript Interface. For a Swift developer, understanding JSI means understanding why there is a C++ layer in the middle, and why `.mm` (ObjC++) is the necessary bridge between Swift and that C++ world.

---

## The legacy Bridge: historical context

Before JSI, React Native used an asynchronous Bridge based on JSON-serialized message exchange. The flow was:

1. JavaScript serializes an object to JSON.
2. The message is placed in a queue.
3. The native thread deserializes the JSON.
4. The native function executes.
5. The result travels the same path back.

Every call crossed the thread boundary — not literally different processes, but isolated threads without shared memory, communicating via copies of data. The cost was twofold: JSON serialization/deserialization on every call, and the inherent latency of an asynchronous message queue.

For high-frequency UI operations — gestures at 60 fps, frame-by-frame animations, sensor readings — this model imposed visible bottlenecks. A simple native call could take tens of milliseconds in queue overhead alone.

---

## JSI: shared memory, synchronous calls

JSI rewrites that relationship. The central point is this: **JavaScript and native code run in the same process and can share the same memory**.

The JavaScript runtime (Hermes, in modern React Native) exposes a C++ API called `jsi::Runtime`. Through it, C++ code can:

- Create and inspect JavaScript values directly.
- Install functions and objects in the JS global scope.
- Invoke JS functions synchronously.
- Receive JS callbacks, also synchronously.

No JSON. No queue. No mandatory data copies. A pointer to a native buffer can be passed to JS as an `ArrayBuffer` without copying a single byte.

---

## JSI's fundamental types

### `jsi::Runtime`

Represents the JavaScript execution environment. It is the entry point for any JSI operation. You do not create a Runtime — it is provided by the host (React Native) and passed to your module installation functions.

```cpp
// Typical signature of a module installation function
void installMyModule(jsi::Runtime& runtime);
```

The `Runtime` is thread-affine: you can only use it on the JavaScript thread. Storing a reference and using it on another thread is undefined behavior.

### `jsi::Value`

The universal type that represents any JavaScript value. It can hold:

- `undefined`
- `null`
- `bool`
- `double` (all JS numbers are doubles)
- `string` (`jsi::String`)
- `object` (`jsi::Object`)
- `symbol` (`jsi::Symbol`)
- `bigint` (`jsi::BigInt`)

```cpp
jsi::Value myValue = jsi::Value(42.0);
jsi::Value strValue = jsi::String::createFromUtf8(runtime, "hello");
jsi::Value boolValue = jsi::Value(true);
```

`jsi::Value` is a value type with move semantics. Copying is explicit (`.asObject(runtime)` returns a copy). This reflects that JS objects are reference-counted inside the runtime.

### `jsi::Object`

A subset of `jsi::Value` for JS objects. Allows reading and writing properties:

```cpp
jsi::Object obj = jsi::Object(runtime);
obj.setProperty(runtime, "width", jsi::Value(320.0));
obj.setProperty(runtime, "height", jsi::Value(568.0));

// Reading back
jsi::Value widthVal = obj.getProperty(runtime, "width");
double width = widthVal.asNumber(); // 320.0
```

### `jsi::Function`

Represents a JavaScript function. You can create one from a C++ lambda or a `HostFunction`, and also invoke existing JS functions:

```cpp
// Calling an existing JS function
jsi::Value result = myJsFunction.call(runtime, arg1, arg2);

// Creating a native function callable from JS
auto nativeFunc = jsi::Function::createFromHostFunction(
    runtime,
    jsi::PropNameID::forAscii(runtime, "myNativeFunc"),
    1, // number of expected arguments
    [](jsi::Runtime& rt,
       const jsi::Value& thisVal,
       const jsi::Value* args,
       size_t count) -> jsi::Value {
        double input = args[0].asNumber();
        return jsi::Value(input * 2.0);
    }
);

runtime.global().setProperty(runtime, "myNativeFunc", std::move(nativeFunc));
```

After this, `myNativeFunc(21)` in JavaScript returns `42` — no queue, no JSON, synchronously.

---

## The HostObject pattern

To expose a stateful native object to JavaScript, JSI offers `jsi::HostObject`. It is a C++ class with two virtual methods:

```cpp
class jsi::HostObject {
public:
    virtual jsi::Value get(jsi::Runtime& runtime,
                           const jsi::PropNameID& name) = 0;
    virtual void set(jsi::Runtime& runtime,
                     const jsi::PropNameID& name,
                     const jsi::Value& value) = 0;
    virtual std::vector<jsi::PropNameID> getPropertyNames(
                     jsi::Runtime& runtime);
};
```

You implement this interface in C++ and install the object in the global scope:

```cpp
class SensorHostObject : public jsi::HostObject {
    double lastReading_ = 0.0;

public:
    jsi::Value get(jsi::Runtime& rt,
                   const jsi::PropNameID& name) override {
        std::string key = name.utf8(rt);
        if (key == "lastReading") {
            return jsi::Value(lastReading_);
        }
        if (key == "read") {
            return jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "read"),
                0,
                [this](jsi::Runtime& r,
                       const jsi::Value&,
                       const jsi::Value*,
                       size_t) -> jsi::Value {
                    // direct hardware read, no serialization
                    lastReading_ = readHardwareSensor();
                    return jsi::Value(lastReading_);
                }
            );
        }
        return jsi::Value::undefined();
    }

    void set(jsi::Runtime& rt,
             const jsi::PropNameID& name,
             const jsi::Value& value) override {
        // read-only properties in this example
    }
};
```

Installation in the runtime:

```cpp
void installSensorModule(jsi::Runtime& runtime) {
    auto hostObj = std::make_shared<SensorHostObject>();
    auto jsObject = jsi::Object::createFromHostObject(runtime, hostObj);
    runtime.global().setProperty(runtime, "NativeSensor", std::move(jsObject));
}
```

In JavaScript:

```js
const reading = NativeSensor.read(); // synchronous, zero serialization
```

The `HostObject` lives as long as the corresponding JS object has active references. Hermes's garbage collector manages the lifecycle via `shared_ptr`.

---

## Why ObjC++ and not Swift directly

Here is the central limitation every Swift developer encounters: **Swift cannot expose C++ types to ObjC, and ObjC++ is the only layer that can bridge both sides**.

JSI is a C++ API. Its types (`jsi::Runtime`, `jsi::Value`, `jsi::HostObject`) are C++ classes with templates, virtual inheritance, and move semantics. Swift has evolving C++ interoperability (Swift 5.9+), but the restrictions are still significant for complex types with virtual inheritance, which is exactly what `jsi::HostObject` uses.

ObjC++ (`.mm` files) solves this because:

1. The Clang compiler compiles `.mm` as ObjC with full C++ access.
2. A `.mm` file can include JSI headers, instantiate `jsi::HostObject`, and use the entire C++ API.
3. That same file can define an ObjC class (`@interface`/`@implementation`) that exposes a clean interface to Swift.
4. Swift imports the ObjC class via the bridging header and calls its methods normally.

The chain looks like this:

```
Swift (.swift)
    |
    v  calls ObjC methods
ObjC++ (.mm)
    |
    v  uses directly
JSI C++ (jsi::Runtime, jsi::HostObject, jsi::Function)
    |
    v  communicates with
Hermes / JavaScript
```

---

## Practical structure of an iOS TurboModule

A minimal iOS TurboModule with JSI follows this file structure:

```
ios/
  MyModule/
    MyModule.h         ← ObjC interface (visible to Swift)
    MyModule.mm        ← ObjC++ implementation, uses JSI
    MyModuleSpec.h     ← protocol generated by Codegen
```

`MyModule.h` exposes only ObjC-compatible types:

```objc
// MyModule.h
#import <React/RCTBridgeModule.h>

@interface MyModule : NSObject <RCTBridgeModule>
@end
```

`MyModule.mm` implements the logic with full access to C++ and JSI:

```objc
// MyModule.mm
#import "MyModule.h"
#import <jsi/jsi.h>
#import <ReactCommon/TurboModule.h>

using namespace facebook::jsi;

@implementation MyModule

RCT_EXPORT_MODULE(MyModule)

- (void)installJSIBindings:(Runtime&)runtime {
    auto hostObj = std::make_shared<SensorHostObject>();
    auto jsObject = Object::createFromHostObject(runtime, hostObj);
    runtime.global().setProperty(runtime, "NativeSensor", std::move(jsObject));
}

@end
```

Swift sees only `MyModule` as a normal ObjC class. The C++ complexity is fully encapsulated in `.mm`.

---

## Performance implications

The difference between the legacy Bridge and JSI is not just theoretical:

| Aspect | Bridge (legacy) | JSI |
|---|---|---|
| Call model | Asynchronous via queue | Synchronous in-process |
| Serialization | Full JSON | None |
| Round-trip latency | Tens of ms | Microseconds |
| Memory sharing | Impossible (copies) | Direct via pointers |
| Use in 60fps gestures | Impractical | Viable |
| `ArrayBuffer` without copy | Not supported | Supported |

For cases like frame-by-frame image processing, high-frequency sensor reading, or Metal integration via shared buffers, the difference is the boundary between viable and infeasible.

The downside of the synchronous model: a slow operation on the native side blocks the JavaScript thread. Well-implemented TurboModules use JSI synchronously only for truly fast operations — reading state from memory, setting up callbacks — and delegate heavy work to native threads, notifying JS via events or Promises when done.

---

## Go Deeper

The complete exploration of JSI, Fabric, and the New Architecture as an integrated system is in the advanced trail:

- **Masterclass — Module 03: Fabric and JSI** (`docs/trilha-masterclass/modulo-03-fabric-jsi/`) — complete implementation of Fabric components with JSI, advanced HostObjects, Metal and CoreML integration via shared buffers, and performance analysis with Instruments.

The Masterclass module assumes you already have the JSI mental model covered here and goes directly to production implementations with Codegen and the complete Fabric renderer pipeline.
