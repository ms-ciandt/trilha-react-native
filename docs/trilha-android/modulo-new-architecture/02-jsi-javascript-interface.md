---
title: "JSI: The Bridge Killer"
sidebar_label: "JSI"
sidebar_position: 2
---

## Video Overview

> Video for this topic coming soon.

## The Problem With the Old Bridge

Before the New Architecture, React Native used an **asynchronous message-passing bridge** between JavaScript and native code. Every call from JS to native (and back) was:

1. Serialised to JSON
2. Queued on the bridge
3. Deserialized on the other side
4. Executed asynchronously

```
JS Thread ──[JSON serialize]──▶ Bridge Queue ──[JSON deserialize]──▶ Native Thread
                                  (async, batched)
```

This model has three fundamental problems for Android developers:

| Problem | Android analogy | Impact |
|---------|-----------------|--------|
| No synchronous calls | Like `Looper` that only accepts `post()`, never `postSync()` | Cannot block JS waiting for native result |
| JSON serialisation overhead | Like serialising every Binder IPC call to JSON | CPU and memory cost per call |
| No shared memory | Like two processes with no shared memory map | Large data (images, buffers) copied completely |

---

## JSI: JavaScript Interface

JSI (JavaScript Interface) is a **C++ layer** that gives the JavaScript engine a direct reference to native objects — no serialisation, no queuing, no async round-trip required.

```
JS Thread ──[C++ function pointer]──▶ Native (C++/Kotlin via JNI) — synchronous
```

The JS engine (Hermes) holds a C++ object reference. When JS calls a method on that object, it's a direct C++ function call — the same call overhead as calling a function in any C++ program.

### The key insight for Android developers

JSI is conceptually similar to JNI (Java Native Interface) — it's a bridge between two execution environments that speaks C++. Where JNI bridges Java/Kotlin ↔ C++, JSI bridges JavaScript ↔ C++. The native side of a TurboModule is reachable via both.

```
JavaScript (Hermes)
      │
      │ JSI — C++ function call (synchronous)
      ▼
C++ Host Object (HostObject)
      │
      │ JNI — standard Java/Kotlin ↔ C++ bridge
      ▼
Kotlin TurboModule implementation
```

---

## Host Objects: The JSI Primitive

A `HostObject` is a C++ class that JSI exposes to JavaScript. JS can call methods on it synchronously as if it were a regular JavaScript object.

```cpp
// C++ — simplified HostObject
class NativeStorageModule : public facebook::jsi::HostObject {
public:
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& name) override {
    auto methodName = name.utf8(rt);

    if (methodName == "getString") {
      return jsi::Function::createFromHostFunction(rt, name, 1,
        [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t) {
          std::string key = args[0].getString(rt).utf8(rt);
          // Synchronous — returns directly
          return jsi::String::createFromUtf8(rt, mmkv->getString(key));
        });
    }
    return jsi::Value::undefined();
  }
};
```

From JavaScript, calling this looks completely native:

```tsx
// JS side — synchronous call, no await needed
const value = NativeStorage.getString('user.token'); // returns immediately
```

This is why MMKV (`react-native-mmkv`) is synchronous — it uses JSI directly, bypassing the bridge entirely.

---

## What JSI Enables in Practice

### 1. Synchronous native calls

```tsx
// Old Bridge — async only
NativeModules.Storage.getString('key', (value) => {
  // callback — can't use the value outside this function
  console.log(value);
});

// JSI — synchronous
const value = storage.getString('key'); // direct return, no callback
console.log(value); // available immediately
```

### 2. Shared ArrayBuffer — zero-copy data transfer

```tsx
// Pass a buffer from JS to native without copying
const buffer = new ArrayBuffer(1024 * 1024); // 1MB
const view = new Uint8Array(buffer);
view.fill(42);

// With JSI: native receives a pointer to the same memory — no copy
NativeImageProcessor.processBuffer(buffer);
```

This is critical for camera frames, audio buffers, and any high-throughput data — the exact use cases where the old bridge was a bottleneck.

### 3. JS objects directly in native

```tsx
// Native code can hold a reference to a JS function and call it
// at any time — used for event listeners, callbacks, streams

NativeEventEmitter.addListener('onFrame', (frame) => {
  // This callback is a JS function stored by JSI in C++
  // Native calls it directly when a new camera frame arrives
  processFrame(frame);
});
```

---

## JSI and the Codegen

You will rarely write JSI C++ code directly. The **Codegen** generates the JSI glue automatically from your TypeScript spec. Your job as a Kotlin developer is:

1. Write a TypeScript spec (the contract)
2. Write the Kotlin implementation
3. Codegen generates the C++ JSI layer between them

```
TypeScript Spec
      │
      │ npx react-native codegen
      ▼
C++ JSI glue (auto-generated — do not edit)
      │
      │ JNI (auto-generated)
      ▼
Your Kotlin class (you write this)
```

This is covered in depth in the TurboModules topic.

---

## JSI Runtime: Reading and Writing JS Values from C++

If you ever need to write JSI C++ directly (for a low-level library), these are the value types:

```cpp
jsi::Runtime& rt // always the first argument — the JS engine instance

// Reading from JS
std::string str  = args[0].getString(rt).utf8(rt);
double      num  = args[1].getNumber();
bool        flag = args[2].getBool();

// Reading an object property
jsi::Object obj  = args[0].getObject(rt);
double width     = obj.getProperty(rt, "width").getNumber();

// Writing back to JS
return jsi::String::createFromUtf8(rt, "result");
return jsi::Value(42.0);
return jsi::Value::undefined();
return jsi::Value::null();

// Calling a JS function from C++
jsi::Function callback = args[0].getObject(rt).asFunction(rt);
callback.call(rt, jsi::String::createFromUtf8(rt, "hello"));
```

---

## The New Architecture Runtime Stack

With JSI, the full New Architecture stack on Android looks like this:

```
┌─────────────────────────────────────────────┐
│  JavaScript (Hermes)                        │
│  Your React Native components               │
├─────────────────────────────────────────────┤
│  JSI Layer (C++)                            │
│  TurboModuleRegistry / Fabric               │
├─────────────────────────────────────────────┤
│  Codegen-generated C++ bindings             │
│  (NativeXxxSpecJSI.cpp — auto-generated)    │
├─────────────────────────────────────────────┤
│  JNI Bridge (C++ ↔ Java/Kotlin)             │
│  (also auto-generated by Codegen)           │
├─────────────────────────────────────────────┤
│  Your Kotlin TurboModule / Fabric Component │
│  Runs on the native Android thread          │
└─────────────────────────────────────────────┘
```

---

## Concurrent Rendering and JSI

With the New Architecture, React Native can now render on multiple threads simultaneously — like Android's `RenderThread` + `UIThread` split:

| Old Architecture | New Architecture |
|-----------------|-----------------|
| JS thread + UI thread | JS thread + UI thread + Background thread |
| Layout calculated on JS thread | Layout calculated natively (Fabric) |
| All state updates block UI | Concurrent rendering — low-priority updates yield |
| No `startTransition` equivalent | `startTransition` works (React 18 concurrent features) |

---

## Inspecting JSI in a Running App

Using the Hermes CDP debugger (Chrome DevTools connected to your app):

1. Open the **Console** tab
2. Type `global.HermesInternal` — you can inspect the JSI-exposed global
3. Type `global.nativeFabricUIManager` — Fabric's JSI binding (present if New Architecture is enabled)
4. Type `global.RN$Bridgeless` — `true` if bridge is fully disabled

```js
// In Chrome DevTools console attached to your RN app:
> global.RN$Bridgeless
true
> global.nativeFabricUIManager !== undefined
true
> typeof global.HermesInternal
"object"
```

---

## Study Materials

### Official Documentation

- [React Native — New Architecture Introduction](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [React Native — JSI](https://reactnative.dev/docs/the-new-architecture/why)
- [Hermes — JSI Header](https://github.com/facebook/hermes/blob/main/API/jsi/jsi/jsi.h) — the C++ interface

### Deep Dives

- [Lorenzo Sciandra — The New Architecture deep dive](https://www.youtube.com/watch?v=5ZBZPXaJgYI)
- [Nicola Corti — Under the hood of the New Architecture](https://www.youtube.com/watch?v=BxaCnA_lhns)

### Videos

- [React Native EU 2022 — New Architecture Overview](https://www.youtube.com/watch?v=BxaCnA_lhns)

---

## What's Next

You understand what JSI does. Now the practical part: writing a real TurboModule in Kotlin — from TypeScript spec to Codegen to running Kotlin code — with zero bridge overhead.

➡ [TurboModules in Kotlin](./03-turbomodule-kotlin)
