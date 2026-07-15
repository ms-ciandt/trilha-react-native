---
title: "TurboModuleRegistry: get vs getEnforcing"
---

# TurboModuleRegistry: `get` vs `getEnforcing`

> This is the most consequential API decision you make per module. The wrong choice either crashes silently (missed null) or crashes loudly at a bad time (wrong `getEnforcing`). Know the exact semantics.

---

## Type Signatures

```typescript
// Extracted from react-native TypeScript definitions
declare namespace TurboModuleRegistry {
  // Returns T | null — module may not be registered
  function get<T extends TurboModule>(name: string): T | null;

  // Returns T — throws immediately if module is not registered
  function getEnforcing<T extends TurboModule>(name: string): T;
}
```

Both calls are evaluated **at module load time** — when the spec file is first `import`ed. This means the check happens once, not on every call.

---

## `get<T>` — Nullable, Safe

```typescript
const NativeAnalytics = TurboModuleRegistry.get<Spec>('NativeAnalytics');
// Type: Spec | null

// Every call site must handle null
NativeAnalytics?.track('page_view');

if (NativeAnalytics !== null) {
  const count = NativeAnalytics.getQueueSize();
}
```

**Behavior:** if the module is not registered in the native binary, returns `null`. No exception is thrown — the caller decides what to do.

**Use when:**
- The module is optional (analytics, crash reporting, feature flags)
- The module only exists on one platform
- You are writing a library that runs in non-native environments (Storybook, web, Expo Go)
- You want graceful degradation rather than a crash

---

## `getEnforcing<T>` — Non-Null, Strict

```typescript
const NativeStorage = TurboModuleRegistry.getEnforcing<Spec>('NativeStorage');
// Type: Spec (never null — TypeScript trusts you)

// No null check needed
NativeStorage.setItem('theme', 'dark');
```

**Behavior:** if the module is not registered, throws an `Invariant Violation` immediately at module load time. The JS bundle fails to initialize.

**Use when:**
- The module is mandatory — its absence is a programming error, not a runtime condition
- You are certain the module is registered on every platform that will run this code
- You want crash-fast behavior that surfaces missing registration bugs during development

---

## The Exact Error

When `getEnforcing` fails, the error message tells you exactly what went wrong:

```
Invariant Violation: TurboModuleRegistry.getEnforcing(...):
  'NativeStorage' could not be found.
  Verify that a module by this name is registered in the native binary.
  Bridgeless mode: true.
  TurboModule interop: true.
  Modules loaded: ("NativeModules":["Networking","Timing",...] "TurboModules":["PlatformConstants",...])
```

The `Modules loaded` list tells you exactly which modules are available in the binary — use it to diagnose missing registrations.

**Root causes of this error:**

| Cause | Fix |
|---|---|
| Package not added to `MainApplication.kt` | Add `NativeMyModulePackage()` to `getPackages()` |
| `modulesProvider` missing in `package.json` `codegenConfig.ios` | Add the `NativeModule: "ClassProvider"` mapping |
| Name string mismatch with `getName()` / `moduleName` | Sync the string in the spec with the native `getName()` return value |
| Native binary not rebuilt after adding the module | Rebuild native (`./gradlew assembleDebug` / clean build in Xcode) |
| `getEnforcing` called unconditionally on a platform where module doesn't exist | Wrap in `Platform.select()` or use `get()` |

---

## Decision Matrix

```
Does the app crash or degrade if this module is missing?
│
├── Crash (core feature, data loss) → getEnforcing
│   │
│   └── But it may be absent on one platform?
│       ├── YES → Platform.select + getEnforcing per platform
│       └── NO  → getEnforcing unconditionally
│
└── Degrade gracefully → get
    │
    ├── Feature is completely optional (analytics, flags)?
    │   └── get + optional chaining (?.)
    │
    └── Feature needs a working fallback?
        └── Service abstraction with Noop (Pattern 3 from previous topic)
```

---

## Common Mistake: `getEnforcing` + Platform-Specific Module

This pattern crashes on the platform where the module doesn't exist:

```typescript
// WRONG — crashes on Android if module is iOS only
export default TurboModuleRegistry.getEnforcing<Spec>('NativeHealthKit');
```

Correct approach:

```typescript
// CORRECT — explicit per-platform behavior
export default Platform.select({
  ios: TurboModuleRegistry.getEnforcing<Spec>('NativeHealthKit'),
  android: null,
}) ?? null;
```

Or, if both platforms have the module but under different names:

```typescript
export default Platform.select({
  ios: TurboModuleRegistry.getEnforcing<iOSSpec>('NativeHealthKit'),
  android: TurboModuleRegistry.getEnforcing<AndroidSpec>('NativeGoogleFit'),
});
```

---

## Timing: When Is the Call Evaluated?

```typescript
// This runs at import time — when JS first loads this module
export default TurboModuleRegistry.getEnforcing<Spec>('NativeStorage');
```

If `NativeStorage` is not registered, the exception fires **when this file is first imported**, not when the app starts. This can make the crash appear to come from the wrong place in stack traces.

With `get()`:

```typescript
// Also runs at import time — but returns null instead of throwing
export default TurboModuleRegistry.get<Spec>('NativeStorage');
// null propagates silently to all callers — easier to reason about
```

---

## Study Materials

| Resource | Description |
|---|---|
| [TurboModuleRegistry source — react-native](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/TurboModule/TurboModuleRegistry.js) | The actual JS implementation — 30 lines, worth reading |
| [getEnforcing fails in brownfield — #49246](https://github.com/facebook/react-native/issues/49246) | Real crash analysis: module not registered on a specific surface |
| [0.76 TurboModuleRegistry error on iOS new arch — #48760](https://github.com/facebook/react-native/issues/48760) | Platform-specific registration issue post-upgrade |

---

Next → [Availability Guards (isAvailable)](./availability-guards)
