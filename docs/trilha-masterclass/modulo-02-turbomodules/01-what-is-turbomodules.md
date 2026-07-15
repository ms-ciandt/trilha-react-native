---
title: What Is TurboModules
---

# What Is TurboModules

> Before the New Architecture, every native module call crossed the **asynchronous bridge**. TurboModules eliminate the bridge entirely — replacing it with JSI, a direct C++ channel between JavaScript and native code.

---

## The Bridge Problem

```
JS Thread ──serialize to JSON──► Bridge Queue ──deserialize──► Native Thread
                                                                     │
Native Thread ──serialize result──► Bridge Queue ──deserialize──► JS Thread
```

Every argument and return value was JSON-serialized on every call. There was no type safety at the boundary — the native side received a `ReadableMap` and fished out values by string key at runtime. Every module was loaded eagerly at startup, even if the user never triggered the feature that needed it.

| Old Bridge | TurboModules |
|---|---|
| JSON over an async queue | JSI — direct C++ calls, synchronous or async |
| No type safety at boundary | Codegen generates typed native interfaces from a TS spec |
| All modules loaded at startup | Lazy initialization — instantiated on first access |
| `NativeModules.Foo.method()` — untyped | `TurboModuleRegistry.getEnforcing<Spec>()` — typed |

---

## What a TurboModule Is

A TurboModule is a native module that satisfies four properties:

1. **Has a TypeScript spec file** — the contract between JS and native, read by Codegen
2. **Uses Codegen** — the spec is compiled at build time into typed C++/Java/ObjC++ interfaces
3. **Communicates via JSI** — JavaScript Interface, a C++ API that lets JS hold direct references to C++ objects without serialization
4. **Is lazy by default** — instantiated only when JS first calls `TurboModuleRegistry.get()` or `getEnforcing()`

---

## JSI: The Engine Underneath

JSI is a C++ abstraction over the JS engine (Hermes). It exposes two key primitives:

- **HostObject** — a C++ class that JS treats as a regular JS object. Methods on it are C++ lambdas called synchronously from JS.
- **HostFunction** — a single callable C++ function exposed to JS.

A TurboModule is a `HostObject`. When JS calls `NativeCalculator.add(1, 2)`, there is no serialization — the JSI runtime calls a C++ lambda directly on the JS thread (or schedules it as an async task).

```
JS: NativeCalculator.add(1, 2)
          │
          ▼  JSI — no JSON, no queue
   C++ TurboModule::add(jsi::Runtime& rt, double a, double b)
          │
          ▼  returns via JSI
   JS receives result (or Promise resolves)
```

This is why TurboModules can expose **synchronous methods** — something impossible with the old bridge, which was always async.

---

## Lazy Loading in Practice

With the old bridge, `getPackages()` in `MainApplication` instantiated every module at startup. With TurboModules, the registry holds a factory — the module object is created only when JS first accesses it.

```kotlin
// Android: register a factory, not an instance
override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
        NativeAnalyticsModule.NAME to ReactModuleInfo(
            name = NativeAnalyticsModule.NAME,
            className = NativeAnalyticsModule.NAME,
            canOverrideExistingModule = false,
            needsEagerInit = false,   // ← lazy
            isCxxModule = false,
            isTurboModule = true      // ← marks as TurboModule
        )
    )
}
```

`needsEagerInit = false` is the default. The analytics module is not constructed until something in JS calls `TurboModuleRegistry.get('NativeAnalytics')`.

---

## Interop Layer (Backward Compatibility)

RN 0.76+ ships with a **TurboModule Interop Layer** that lets legacy `NativeModules`-based modules continue to work without changes. The interop layer wraps them in a TurboModule facade automatically.

This means brownfield apps or apps with unmigrated third-party libraries do not break when enabling the New Architecture — but the benefits (JSI, type safety, lazy init) only apply to modules that have been properly converted.

| Module type | JSI | Lazy | Type-safe |
|---|---|---|---|
| Legacy (old bridge) | No | No | No |
| Legacy + interop layer | Partial | No | No |
| Native TurboModule | Yes | Yes | Yes |

---

## Study Materials

| Resource | Description |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Official step-by-step guide |
| [reactwg — TurboModules doc](https://github.com/reactwg/react-native-new-architecture/blob/main/docs/turbo-modules.md) | Working group reference |
| [JSI source — facebook/hermes](https://github.com/facebook/hermes/tree/main/API/jsi) | JSI C++ headers — `jsi::HostObject`, `jsi::Runtime` |
| [New Architecture overview](https://reactnative.dev/docs/the-new-architecture/landing-page) | Full context: JSI + Fabric + TurboModules together |

---

Next → [SPECS in TypeScript](./specs-typescript)
