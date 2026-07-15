---
title: "Availability Guards (isAvailable)"
---

# Availability Guards (`isAvailable`)

> `TurboModuleRegistry` has no official `isAvailable()` method. The idiomatic check is `get() !== null`. This topic shows where to put that check and how to expose it cleanly to consumers.

---

## The Canonical Availability Check

```typescript
import { TurboModuleRegistry } from 'react-native';
import type { Spec } from '../specs/NativeStorage';

// Evaluated once at module load time
const _module = TurboModuleRegistry.get<Spec>('NativeStorage');

export const isNativeStorageAvailable = _module !== null;
```

Assign to a `const` at module scope — this runs once when the spec file is first imported. Every subsequent access reads a cached boolean, with zero overhead.

---

## Exporting `isAvailable` From the Spec File

The cleanest pattern: colocate availability with the module itself.

```typescript
// specs/NativeStorage.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
}

const _mod = TurboModuleRegistry.get<Spec>('NativeStorage');

export const isAvailable = _mod !== null;

export default _mod;
```

Consumer:

```typescript
import NativeStorage, { isAvailable as isStorageAvailable } from '../specs/NativeStorage';

if (!isStorageAvailable) {
  console.warn('NativeStorage not available — falling back to AsyncStorage');
}

// Typed as Spec | null — TypeScript enforces the null check
NativeStorage?.setItem('theme', 'dark');
```

---

## Guard at Component Render Time

When the UI must branch based on module availability:

```tsx
import { TurboModuleRegistry } from 'react-native';
import { useMemo } from 'react';
import type { Spec } from '../specs/NativeStorage';

function StorageFeature({ children }: { children: React.ReactNode }) {
  // useMemo prevents re-evaluation on every render
  // (though TurboModuleRegistry.get is already cached internally)
  const available = useMemo(
    () => TurboModuleRegistry.get<Spec>('NativeStorage') !== null,
    []
  );

  if (!available) {
    return <AsyncStorageFallback />;
  }

  return <>{children}</>;
}
```

---

## Platform-Specific Guards in the Spec

When a module only exists on one platform, express that constraint in the spec itself — not scattered across call sites.

```typescript
// specs/NativeARKit.ts — iOS only
import { Platform } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  isSupported(): boolean;
  startSession(config: Readonly<{ planeDetection: boolean }>): Promise<void>;
  stopSession(): void;
}

// Null on Android — consumer receives null without Platform checks
export default Platform.OS === 'ios'
  ? TurboModuleRegistry.get<Spec>('NativeARKit')
  : null;

export const isAvailable =
  Platform.OS === 'ios' &&
  TurboModuleRegistry.get<Spec>('NativeARKit') !== null;
```

Consumer — no `Platform.OS` logic leaks out:

```typescript
import NativeARKit, { isAvailable as isARAvailable } from '../specs/NativeARKit';

async function startAR() {
  if (!isARAvailable) {
    Alert.alert('AR not supported on this device');
    return;
  }
  await NativeARKit!.startSession({ planeDetection: true });
}
```

---

## Guard for Runtime Capability Checks

Some modules exist but the underlying hardware or OS feature may not:

```typescript
import NativeARKit from '../specs/NativeARKit';

async function checkARCapabilities(): Promise<boolean> {
  if (!NativeARKit) {
    return false; // module not registered
  }

  // Module exists — check if hardware supports it
  const hardwareSupported = NativeARKit.isSupported();
  return hardwareSupported;
}
```

Two-level check: **registry availability** (is the module registered?) and **capability availability** (does the hardware support the feature?).

---

## `isAvailable` in a Hook

Encapsulating availability and capability in a single hook:

```typescript
// src/hooks/useARKit.ts
import { useState, useEffect } from 'react';
import NativeARKit, { isAvailable as isModuleAvailable } from '../specs/NativeARKit';

type ARKitStatus =
  | { state: 'unavailable' }           // module not registered or wrong platform
  | { state: 'unsupported' }           // module present but hardware doesn't support it
  | { state: 'ready'; start: () => Promise<void>; stop: () => void };

export function useARKit(): ARKitStatus {
  const [status, setStatus] = useState<ARKitStatus>({ state: 'unavailable' });

  useEffect(() => {
    if (!isModuleAvailable || !NativeARKit) {
      return; // stays 'unavailable'
    }

    const supported = NativeARKit.isSupported();
    if (!supported) {
      setStatus({ state: 'unsupported' });
      return;
    }

    setStatus({
      state: 'ready',
      start: () => NativeARKit!.startSession({ planeDetection: true }),
      stop: () => NativeARKit!.stopSession(),
    });
  }, []);

  return status;
}
```

Usage:

```tsx
function ARFeature() {
  const ar = useARKit();

  if (ar.state === 'unavailable') return <Text>Not available on this platform</Text>;
  if (ar.state === 'unsupported') return <Text>Your device does not support AR</Text>;

  return (
    <View>
      <Button title="Start AR" onPress={ar.start} />
      <Button title="Stop AR" onPress={ar.stop} />
    </View>
  );
}
```

---

## Study Materials

| Resource | Description |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Official `get` null pattern |
| [react-native-device-info](https://github.com/react-native-device-info/react-native-device-info) | Real library with platform-specific availability patterns |
| [Platform API — React Native](https://reactnative.dev/docs/platform) | `Platform.OS`, `Platform.select`, `Platform.Version` |

---

Next → [Supported Types and Serialization](./supported-types)
