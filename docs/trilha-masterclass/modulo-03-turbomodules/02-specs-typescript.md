---
title: SPECS in TypeScript
---

# SPECS in TypeScript

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc02_02_specs-typescript.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> The spec file is the **single source of truth** for a TurboModule's interface. Codegen reads it at build time to generate typed native code. Everything downstream — the generated Java abstract class, the ObjC++ protocol, the C++ JSI header — derives from this file.

---

## Naming Rules — Non-Negotiable

Codegen enforces these rules at build time. Violations are errors, not warnings.

| Rule | Example | Why |
|---|---|---|
| File must start with `Native` | `NativeCalculator.ts` | Codegen ignores files without this prefix |
| Interface must be named exactly `Spec` | `export interface Spec extends TurboModule` | Any other name throws `MisnamedModuleInterfaceParserError` |
| Module name string must match the `Native` prefix | `getEnforcing<Spec>('NativeCalculator')` | Must match what native registers via `getName()` |
| File extension `.ts` or `.tsx` | `NativeStorage.ts` | `.js`/`.jsx` are treated as Flow specs |

---

## Anatomy of a Spec File

```typescript
// specs/NativeCalculator.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Synchronous — returns value directly via JSI
  add(a: number, b: number): number;

  // Async — returns a Promise
  fetchRemoteValue(key: string): Promise<string>;

  // Void return
  logEvent(name: string, payload: Object): void;

  // Nullable return
  getCachedUser(userId: string): Object | null;

  // Callback-style (prefer Promise when possible)
  getDeviceId(callback: (id: string) => void): void;
}

// getEnforcing: throws if the module is not registered in the native binary
export default TurboModuleRegistry.getEnforcing<Spec>('NativeCalculator');
```

---

## A Real-World Spec: `NativeAnalytics`

```typescript
// specs/NativeAnalytics.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

// Always use typed object literals — never generic Object when possible
type TrackPayload = Readonly<{
  eventName: string;
  userId: string;
  properties: Object;
  timestamp: number;
}>;

type FlushResult = Readonly<{
  flushedCount: number;
  failedCount: number;
}>;

export interface Spec extends TurboModule {
  track(payload: TrackPayload): void;
  flush(): Promise<FlushResult>;
  setUserId(userId: string): void;
  optOut(): void;
  isOptedOut(): boolean;
  getQueueSize(): number;

  // EventEmitter — native pushes events to JS (RN 0.76+)
  readonly onQueueDrained: EventEmitter<FlushResult>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAnalytics');
```

---

## A Real-World Spec: `NativeLocation` (iOS only)

```typescript
// specs/NativeLocation.ts
import { Platform } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

type LocationPayload = Readonly<{
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
}>;

export interface Spec extends TurboModule {
  requestPermission(): Promise<boolean>;
  startUpdates(distanceFilter: number): void;
  stopUpdates(): void;

  readonly onLocationChanged: EventEmitter<LocationPayload>;
  readonly onPermissionChanged: EventEmitter<Readonly<{ granted: boolean }>>;
}

// Platform guard at spec level — null on Android
export default Platform.OS === 'ios'
  ? TurboModuleRegistry.get<Spec>('NativeLocation')
  : null;
```

---

## Spec Composition: Splitting Large Modules

When a module has many methods, split by domain instead of combining everything in one spec. Each spec generates its own set of native interfaces.

```typescript
// specs/NativeStorageReader.ts
export interface Spec extends TurboModule {
  getItem(key: string): string | null;
  getMultipleItems(keys: string[]): Array<Readonly<{ key: string; value: string | null }>>;
  getAllKeys(): string[];
}
export default TurboModuleRegistry.getEnforcing<Spec>('NativeStorageReader');

// specs/NativeStorageWriter.ts
export interface Spec extends TurboModule {
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  mergeItem(key: string, value: string): Promise<void>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('NativeStorageWriter');
```

On native, each spec maps to its own registered module class — the two native classes can share internal implementation (e.g., both call through to the same `SharedPreferences` / `NSUserDefaults` wrapper).

---

## What Codegen Does With the Spec

When you run `./gradlew generateCodegenArtifactsFromSchema` (Android) or `pod install` (iOS), Codegen:

1. Parses the `.ts` spec file using a TypeScript parser built into `react-native-codegen`
2. Validates the types — unsupported types (e.g., `Partial<T>`, `number | null`) cause a build error here
3. Generates:
   - **Android**: an abstract Java class you extend (`NativeAnalyticsSpec.java`) + JSI C++ glue (`NativeAnalytics.h`, `NativeAnalytics-generated.cpp`)
   - **iOS**: an ObjC++ protocol you adopt (`NativeAnalyticsSpec.h`) + JSI glue (`NativeAnalyticsSpec-generated.mm`)

The generated files live in `build/` and should never be edited manually.

---

## Common Mistakes

| Mistake | Error | Fix |
|---|---|---|
| Interface named `ISpec`, `MySpec`, anything other than `Spec` | `MisnamedModuleInterfaceParserError` | Rename to `Spec` |
| File named `AnalyticsModule.ts` (no `Native` prefix) | Codegen silently ignores the file | Rename to `NativeAnalyticsModule.ts` |
| `number \| null` as a return type | Codegen error: nullable number not supported | Use sentinel value (`-1`) or wrap in `{ value: number } \| null` |
| Using `Partial<T>` | Codegen error | Expand to explicit optional fields |
| Module name string doesn't match `getName()` | Runtime `Invariant Violation` | Sync the string with the native `getName()` return value |

---

## Study Materials

| Resource | Description |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Official spec + implementation walkthrough |
| [TypeScript Support — reactwg #27](https://github.com/reactwg/react-native-new-architecture/discussions/27) | How the TS parser works in Codegen, edge cases |
| [Codegen Missing Features — reactwg #91](https://github.com/reactwg/react-native-new-architecture/discussions/91) | Official list of unsupported types and planned additions |
| [Partial\<T\> not supported — #35864](https://github.com/facebook/react-native/issues/35864) | Why Partial is rejected and the workaround |

---

Next → [Codegen: Native Typed Interfaces](./codegen)
