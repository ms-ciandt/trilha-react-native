---
title: Tests and Mocks for Native Modules
---

# Tests and Mocks for Native Modules

> When Jest runs, there is no native runtime. Any call to `TurboModuleRegistry.getEnforcing()` without a mock throws immediately. This topic covers four strategies, from simplest to most robust.

---

## The Problem

```
Invariant Violation: TurboModuleRegistry.getEnforcing(...):
  'NativeAnalytics' could not be found.
  Verify that a module by this name is registered in the native binary.
```

This error fires at **module load time** — when any test file `import`s a spec that calls `getEnforcing`. The test suite crashes before running a single assertion.

---

## Strategy 1: Mock the Spec File (Recommended Default)

The most direct approach: mock the spec module itself before it can call the registry.

Create a manual mock adjacent to the spec:

```typescript
// specs/__mocks__/NativeAnalytics.ts
const NativeAnalyticsMock = {
  track: jest.fn(),
  flush: jest.fn().mockResolvedValue({ flushedCount: 0, failedCount: 0 }),
  setUserId: jest.fn(),
  optOut: jest.fn(),
  isOptedOut: jest.fn().mockReturnValue(false),
  getQueueSize: jest.fn().mockReturnValue(0),
  onQueueDrained: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
};

export default NativeAnalyticsMock;
export const isAvailable = true;
```

In your test file:

```typescript
// analytics.test.ts
jest.mock('../specs/NativeAnalytics');  // Jest picks up __mocks__/NativeAnalytics.ts

import NativeAnalytics from '../specs/NativeAnalytics';
import { track } from '../services/AnalyticsService';

describe('AnalyticsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates track to the native module', () => {
    track('checkout_started');
    expect(NativeAnalytics.track).toHaveBeenCalledWith('checkout_started');
  });

  it('handles flush result', async () => {
    const result = await NativeAnalytics.flush();
    expect(result.flushedCount).toBe(0);
  });

  it('mock is typed as the real Spec', () => {
    // TypeScript still enforces the interface shape here
    NativeAnalytics.setUserId('user_123');
    expect(NativeAnalytics.setUserId).toHaveBeenCalledWith('user_123');
  });
});
```

---

## Strategy 2: Global Registry Mock in Jest Setup

For apps with many TurboModules, mocking each spec individually becomes repetitive. Mock `TurboModuleRegistry` globally so every spec file finds its mock in the registry.

```typescript
// jest.setup.ts
import { TurboModuleRegistry } from 'react-native';

const moduleRegistry: Record<string, unknown> = {
  NativeAnalytics: {
    track: jest.fn(),
    flush: jest.fn().mockResolvedValue({ flushedCount: 0, failedCount: 0 }),
    setUserId: jest.fn(),
    optOut: jest.fn(),
    isOptedOut: jest.fn().mockReturnValue(false),
    getQueueSize: jest.fn().mockReturnValue(0),
  },
  NativeStorage: {
    setItem: jest.fn(),
    getItem: jest.fn().mockReturnValue(null),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  NativeLocation: {
    startLocationUpdates: jest.fn(),
    stopLocationUpdates: jest.fn(),
    requestPermission: jest.fn().mockResolvedValue(true),
    onLocationChanged: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
    onPermissionChanged: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
  },
};

// Intercept all getEnforcing calls
jest.spyOn(TurboModuleRegistry, 'getEnforcing').mockImplementation((name: string) => {
  const mod = moduleRegistry[name];
  if (!mod) {
    throw new Error(
      `[Test] TurboModule mock not found: "${name}". Add it to moduleRegistry in jest.setup.ts`
    );
  }
  return mod as ReturnType<typeof TurboModuleRegistry.getEnforcing>;
});

// Intercept all get calls
jest.spyOn(TurboModuleRegistry, 'get').mockImplementation((name: string) => {
  return (moduleRegistry[name] ?? null) as ReturnType<typeof TurboModuleRegistry.get>;
});
```

Register in `jest.config.js`:

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)',
  ],
};
```

The error message in the mock is intentional — if you add a new TurboModule and forget to register its mock, the test suite tells you clearly what to add.

---

## Strategy 3: Factory Mock for `getEnforcing` at Import Time

When the module under test calls `getEnforcing` at the top level of the spec file, the registry mock must be in place **before the spec is imported**. Jest's module system processes `jest.mock()` calls before any imports, even if written after them in the source.

```typescript
// checkout.test.ts
const mockTrack = jest.fn();
const mockFlush = jest.fn().mockResolvedValue({ flushedCount: 3, failedCount: 0 });

// jest.mock hoisting: this runs before any import below
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return {
    ...rn,
    TurboModuleRegistry: {
      ...rn.TurboModuleRegistry,
      getEnforcing: (name: string) => {
        if (name === 'NativeAnalytics') {
          return { track: mockTrack, flush: mockFlush, setUserId: jest.fn() };
        }
        // Fall through to the real registry for other modules
        return rn.TurboModuleRegistry.getEnforcing(name);
      },
    },
  };
});

// Import AFTER the mock is set up (though jest.mock hoisting handles this)
import { Analytics } from '../services/AnalyticsService';

describe('AnalyticsService', () => {
  it('calls track', () => {
    Analytics.track('page_view');
    expect(mockTrack).toHaveBeenCalledWith('page_view');
  });

  it('returns flush count', async () => {
    const result = await Analytics.flush();
    expect(result.flushedCount).toBe(3);
  });
});
```

---

## Strategy 4: Testing the Service Abstraction (Best for Business Logic)

By wrapping the native module in a service (Pattern 3 from Defensive Loading), you can test the business logic independently of the native module. Mock the spec to `null` — the service picks up the noop fallback.

```typescript
// AnalyticsService.test.ts

// Mock the spec module to simulate module-not-available
jest.mock('../specs/NativeAnalytics', () => ({
  default: null,   // simulate get() returning null
  isAvailable: false,
}));

import { Analytics, isAnalyticsAvailable } from '../services/AnalyticsService';

describe('AnalyticsService — noop mode', () => {
  it('reports as unavailable', () => {
    expect(isAnalyticsAvailable).toBe(false);
  });

  it('does not throw when tracking', () => {
    expect(() => Analytics.track('test_event')).not.toThrow();
  });

  it('resolves flush with zero count', async () => {
    await expect(Analytics.flush()).resolves.toEqual({ flushedCount: 0 });
  });
});
```

You can also write the "available" path:

```typescript
// AnalyticsService.test.ts — native module present

const mockNative = {
  track: jest.fn(),
  flush: jest.fn().mockResolvedValue({ flushedCount: 5, failedCount: 0 }),
  setUserId: jest.fn(),
};

jest.mock('../specs/NativeAnalytics', () => ({
  default: mockNative,
  isAvailable: true,
}));

import { Analytics } from '../services/AnalyticsService';

describe('AnalyticsService — native mode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates track', () => {
    Analytics.track('purchase_completed', { total: 99.9 });
    expect(mockNative.track).toHaveBeenCalledWith('purchase_completed');
  });

  it('delegates flush', async () => {
    const result = await Analytics.flush();
    expect(result.flushedCount).toBe(5);
    expect(mockNative.flush).toHaveBeenCalledOnce();
  });
});
```

---

## Testing EventEmitter Subscriptions

```typescript
// locationHook.test.ts
const mockSubscription = { remove: jest.fn() };
const mockAddListener = jest.fn().mockReturnValue(mockSubscription);

jest.mock('../specs/NativeLocation', () => ({
  default: {
    startLocationUpdates: jest.fn(),
    stopLocationUpdates: jest.fn(),
    requestPermission: jest.fn().mockResolvedValue(true),
    onLocationChanged: { addListener: mockAddListener },
  },
  isAvailable: true,
}));

import { renderHook, act } from '@testing-library/react-native';
import { useLocation } from '../hooks/useLocation';
import NativeLocation from '../specs/NativeLocation';

describe('useLocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts updates on mount', () => {
    renderHook(() => useLocation());
    expect(NativeLocation!.startLocationUpdates).toHaveBeenCalledTimes(1);
  });

  it('subscribes to location events', () => {
    renderHook(() => useLocation());
    expect(mockAddListener).toHaveBeenCalledTimes(1);
  });

  it('stops updates and removes subscription on unmount', () => {
    const { unmount } = renderHook(() => useLocation());
    unmount();
    expect(NativeLocation!.stopLocationUpdates).toHaveBeenCalledTimes(1);
    expect(mockSubscription.remove).toHaveBeenCalledTimes(1);
  });

  it('updates state when a location event fires', () => {
    const { result } = renderHook(() => useLocation());

    // Simulate native pushing an event
    const callback = mockAddListener.mock.calls[0][0];
    act(() => {
      callback({ latitude: -23.5, longitude: -46.6, accuracy: 5, altitude: null });
    });

    expect(result.current.latitude).toBe(-23.5);
    expect(result.current.longitude).toBe(-46.6);
  });
});
```

---

## Snapshot Tests: Lock in Stable Values

Native modules return device-specific values. Mock them to stable values before snapshots:

```typescript
// DeviceInfoScreen.test.tsx
jest.mock('../specs/NativeDeviceInfo', () => ({
  default: {
    getDeviceName: jest.fn().mockReturnValue('Test Device'),
    getOsVersion: jest.fn().mockReturnValue('17.0'),
    getBuildNumber: jest.fn().mockReturnValue('1234'),
    isTablet: jest.fn().mockReturnValue(false),
  },
}));

import renderer from 'react-test-renderer';
import { DeviceInfoScreen } from '../screens/DeviceInfoScreen';

it('renders device info correctly', () => {
  const tree = renderer.create(<DeviceInfoScreen />).toJSON();
  expect(tree).toMatchSnapshot();
});
```

---

## Which Strategy to Use

| Situation | Strategy |
|---|---|
| Single module, one test file | Strategy 1 — manual `__mocks__` file |
| Many modules, many test files | Strategy 2 — global registry mock in `jest.setup.ts` |
| Module calls `getEnforcing` at import time, complex mocking | Strategy 3 — factory mock via `jest.mock('react-native', ...)` |
| Testing business logic independent of native | Strategy 4 — service abstraction + noop mock |
| EventEmitter subscription lifecycle | Strategy 1 or 4 — mock the subscription object |

---

## Study Materials

| Resource | Description |
|---|---|
| [Testing React Native Apps — Jest](https://jestjs.io/docs/tutorial-react-native) | Official Jest guide for RN |
| [react-native-async-storage test suite](https://github.com/react-native-async-storage/async-storage/tree/main/src/__tests__) | Real-world TurboModule test reference |
| [react-native-harness — Callstack](https://www.callstack.com/blog/introducing-react-native-harness-fast-real-device-testing-for-native-modules) | On-device testing without a full app build |
| [Testing NativeModules — oneuptime.com](https://oneuptime.com/blog/post/2026-01-15-react-native-mock-native-modules/view) | Modern mocking patterns for 2025+ |

---

Next → [Fabric & JSI in Deep](../modulo-03-fabric-jsi/jsi-javascript-interface/)
