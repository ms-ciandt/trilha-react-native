---
title: Defensive Loading of Modules
---

# Defensive Loading of Modules

> Never blindly call a TurboModule. Modules can be absent in environments you did not anticipate — and a `getEnforcing` in the wrong place will crash the app silently in production.

---

## When a Module Can Be Absent

| Environment | Why the module may not exist |
|---|---|
| **Expo Go** | Only bundled Expo modules are available — your custom module is not in the Expo Go binary |
| **Web / react-native-web** | No native runtime at all |
| **Storybook** | Runs in a JS-only environment (Node or browser) |
| **Jest tests** | No native runtime unless you explicitly mock the registry |
| **OTA update scenario** | A new JS bundle is deployed before the native binary is updated — the module exists in native but may have a different API version |
| **Brownfield surfaces** | A specific surface may not register all modules |
| **One platform only** | A module implemented only on iOS will be absent on Android |

---

## Pattern 1: `get()` + Optional Chaining

Use for modules that are **optional extras** — the feature degrades gracefully if the module is absent.

```typescript
// specs/NativeAnalytics.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  track(event: string): void;
  flush(): Promise<{ flushedCount: number }>;
}

// get() returns Spec | null
export default TurboModuleRegistry.get<Spec>('NativeAnalytics');
```

```typescript
// src/analytics.ts
import NativeAnalytics from '../specs/NativeAnalytics';

// Optional chaining — no-op if module is null
export function track(event: string): void {
  NativeAnalytics?.track(event);
}

export const isAnalyticsAvailable = NativeAnalytics !== null;
```

---

## Pattern 2: Platform Guard + `get()`

Use when a module is only implemented on one platform.

```typescript
// specs/NativeHealthKit.ts
import { Platform } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  requestAuthorization(permissions: string[]): Promise<boolean>;
  getStepCount(startDate: number, endDate: number): Promise<number>;
}

// Explicitly null on Android — caller doesn't need to know about Platform
export default Platform.OS === 'ios'
  ? TurboModuleRegistry.get<Spec>('NativeHealthKit')
  : null;
```

```typescript
// src/health.ts
import NativeHealthKit from '../specs/NativeHealthKit';

export async function fetchSteps(from: number, to: number): Promise<number> {
  if (!NativeHealthKit) {
    return 0; // Android or HealthKit unavailable
  }
  return NativeHealthKit.getStepCount(from, to);
}
```

---

## Pattern 3: Service Abstraction with Noop Fallback

The **cleanest production pattern** — the rest of the app never deals with null checks. The service layer absorbs the uncertainty.

```typescript
// src/services/AnalyticsService.ts
import type { Spec } from '../specs/NativeAnalytics';
import { TurboModuleRegistry } from 'react-native';

// Public interface — independent of native implementation
interface AnalyticsService {
  track(event: string, properties?: Record<string, unknown>): void;
  flush(): Promise<{ flushedCount: number }>;
  setUserId(id: string): void;
}

// Noop used in Storybook, web, Expo Go, Jest
const NoopAnalytics: AnalyticsService = {
  track: () => {},
  flush: () => Promise.resolve({ flushedCount: 0 }),
  setUserId: () => {},
};

function buildService(): AnalyticsService {
  const native = TurboModuleRegistry.get<Spec>('NativeAnalytics');

  if (!native) {
    return NoopAnalytics;
  }

  return {
    track: (event) => native.track(event),
    flush: () => native.flush(),
    setUserId: (id) => native.setUserId(id),
  };
}

// Evaluated once at module load time — singleton
export const Analytics = buildService();
export const isAnalyticsAvailable =
  TurboModuleRegistry.get<Spec>('NativeAnalytics') !== null;
```

Any component or hook imports `Analytics` and calls it without null checks:

```typescript
import { Analytics } from '../services/AnalyticsService';

function CheckoutScreen() {
  const handlePurchase = () => {
    Analytics.track('purchase_completed', { total: 99.9 });
    // Works in all environments — noop in web/Storybook/Jest
  };
}
```

---

## When Pattern 3 Is the Right Default

| Situation | Pattern |
|---|---|
| Analytics, crash reporting, feature flags | Pattern 3 — noop fallback |
| iOS-only sensors or OS APIs | Pattern 2 — platform guard |
| Core app feature, crash on absence is acceptable | `getEnforcing` (next topic) |
| Third-party library you ship to others | Pattern 1 or 2 — you don't know the consumer's environment |

---

## The Version Mismatch Trap

In OTA deployments, the JS bundle can be updated independently of the native binary. If a new spec method is called from JS before the native side has been updated:

- `getEnforcing` will succeed (the module exists), but the method is `undefined` at runtime — an untyped crash
- The defensive solution: version-gate new methods

```typescript
// Calling a method that may not exist in older native binaries
const native = TurboModuleRegistry.get<Spec>('NativeAnalytics');
const canUseBatchTrack = native && typeof native.batchTrack === 'function';

if (canUseBatchTrack) {
  native.batchTrack(events);
} else {
  events.forEach((e) => native?.track(e.name));
}
```

---

## Study Materials

| Resource | Description |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Official guide — `get` vs `getEnforcing` usage |
| [react-native-device-info](https://github.com/react-native-device-info/react-native-device-info) | Real-world defensive `get()` patterns and platform guards |
| [getEnforcing fails in brownfield — #49246](https://github.com/facebook/react-native/issues/49246) | Why `getEnforcing` crashes in unregistered brownfield surfaces |

---

Next → [TurboModuleRegistry: get vs getEnforcing](./get-vs-getenforcing)
