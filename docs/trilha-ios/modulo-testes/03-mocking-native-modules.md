---
title: Mocking Native Modules and Platform APIs
---

# Mocking Native Modules and Platform APIs

When you write unit tests on iOS, the simulator provides a full UIKit and Foundation runtime. XCTest runs inside an actual Apple process, so calling `CLLocationManager` or `AVCaptureSession` in a test at least compiles and links, even if you stub the delegates yourself.

Jest runs in Node.js. There is no UIKit, no CoreLocation, no Objective-C runtime, and no Java bridge. Any native module that your React Native code imports will fail the moment it tries to call into its native counterpart, because that counterpart simply does not exist. The JavaScript side of the module may `import` just fine, but the first call to the underlying TurboModule host object will throw a `TypeError` or `ReferenceError` at test time.

Your job in the test environment is to replace every native boundary with a pure-JavaScript stand-in that behaves the way you need it to for each test scenario.

---

## Why Native Modules Cannot Run in Jest

A TurboModule is a JavaScript object whose methods are backed by native C++ or Objective-C implementations registered at app startup. When your app boots on a real device, the TurboModule registry is populated by the native side before JavaScript executes. In Jest, that bootstrap never happens. The registry is empty, so any call through it throws immediately.

Compare this to how you would stub a network layer on iOS. You never let a `URLSession` actually send HTTP requests in unit tests; you replace the session with a mock that returns canned `URLResponse` objects. Jest mocking is the same discipline applied to every platform boundary, not just networking.

---

## jest.mock() for TurboModules

The quickest way to replace a module is the `jest.mock()` call at the top of a test file or inside `beforeEach`. Jest intercepts the `require`/`import` call and returns your factory result instead.

```ts
// __tests__/location.test.ts
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: -23.5505, longitude: -46.6333, accuracy: 5 },
    timestamp: Date.now(),
  }),
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
}));
```

The factory function runs once, and every import of `expo-location` inside that test file receives the mock object. This is the equivalent of swapping a dependency via Swift's constructor injection before a test method runs.

---

## The __mocks__ Directory for Manual Mocks

When the same module needs the same default mock in every test file, repeating `jest.mock()` everywhere becomes noise. Create a file at `__mocks__/<module-name>.ts` (or inside `src/__mocks__/` for local modules) and Jest will use it automatically for any file that calls `jest.mock('module-name')` without a factory.

```
__mocks__/
  expo-location.ts
  expo-camera.ts
  react-native-mmkv.ts
  @react-native-async-storage/
    async-storage.ts
```

A manual mock for `expo-location`:

```ts
// __mocks__/expo-location.ts
export const requestForegroundPermissionsAsync = jest.fn().mockResolvedValue({
  status: 'granted',
});

export const getCurrentPositionAsync = jest.fn().mockResolvedValue({
  coords: { latitude: 0, longitude: 0, accuracy: 10 },
  timestamp: 0,
});

export const watchPositionAsync = jest.fn().mockResolvedValue({
  remove: jest.fn(),
});
```

Any test file that calls `jest.mock('expo-location')` with no second argument picks this up automatically. Tests that need a different behavior can override individual functions with `mockResolvedValueOnce` or `mockImplementation`.

---

## Mocking Expo Modules

### expo-location

```ts
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: -23.5505, longitude: -46.6333, altitude: 760, accuracy: 3 },
    timestamp: 1700000000000,
  }),
  watchPositionAsync: jest.fn().mockImplementation((_options, callback) => {
    callback({
      coords: { latitude: -23.5505, longitude: -46.6333, accuracy: 3 },
      timestamp: Date.now(),
    });
    return Promise.resolve({ remove: jest.fn() });
  }),
}));
```

### expo-camera

```ts
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestMicrophonePermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  },
  CameraView: 'CameraView', // rendered as a plain string element in enzyme/RTL
  useCameraPermissions: jest.fn().mockReturnValue([
    { granted: true, status: 'granted' },
    jest.fn(),
  ]),
}));
```

### expo-notifications

```ts
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id-123'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
}));
```

---

## Mocking react-native-mmkv

`react-native-mmkv` uses a native C++ TurboModule and will fail immediately in Jest. Replace it with an in-memory Map:

```ts
// __mocks__/react-native-mmkv.ts
const store = new Map<string, string | number | boolean>();

export const MMKV = jest.fn().mockImplementation(() => ({
  set: jest.fn((key: string, value: string | number | boolean) => {
    store.set(key, value);
  }),
  getString: jest.fn((key: string) => store.get(key) as string | undefined),
  getNumber: jest.fn((key: string) => store.get(key) as number | undefined),
  getBoolean: jest.fn((key: string) => store.get(key) as boolean | undefined),
  delete: jest.fn((key: string) => store.delete(key)),
  clearAll: jest.fn(() => store.clear()),
  contains: jest.fn((key: string) => store.has(key)),
  getAllKeys: jest.fn(() => Array.from(store.keys())),
}));
```

In tests that share state, call `store.clear()` in `beforeEach` or expose a reset helper on the mock.

---

## Mocking AsyncStorage

The `@react-native-async-storage/async-storage` package ships its own Jest mock. Enable it by adding the mock path to your Jest configuration:

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['./jest.setup.ts'],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage':
      require.resolve('@react-native-async-storage/async-storage/jest/async-storage-mock'),
  },
};
```

If you need a custom implementation, write it as a manual mock:

```ts
// __mocks__/@react-native-async-storage/async-storage.ts
const storage = new Map<string, string>();

export default {
  setItem: jest.fn(async (key: string, value: string) => {
    storage.set(key, value);
  }),
  getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
  removeItem: jest.fn(async (key: string) => {
    storage.delete(key);
  }),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => storage.set(key, value));
  }),
  multiGet: jest.fn(async (keys: string[]) =>
    keys.map((key) => [key, storage.get(key) ?? null] as [string, string | null])
  ),
  clear: jest.fn(async () => storage.clear()),
  getAllKeys: jest.fn(async () => Array.from(storage.keys())),
};
```

---

## Mocking Platform.OS and Dimensions

### Platform.OS

iOS developers often need to test conditional code paths gated on the platform. The React Native `Platform` module is imported from the `react-native` package, which jest-expo already mocks with sane defaults. Override it per test:

```ts
import { Platform } from 'react-native';

describe('platform-specific behavior', () => {
  afterEach(() => {
    // restore the default value
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
  });

  it('renders the iOS-specific component', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const { getByTestId } = render(<MyComponent />);
    expect(getByTestId('ios-button')).toBeTruthy();
  });

  it('renders the Android fallback', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const { getByTestId } = render(<MyComponent />);
    expect(getByTestId('android-button')).toBeTruthy();
  });
});
```

Because `Platform.OS` is a regular property on the module object, `Object.defineProperty` is the most reliable override. Assigning directly (`Platform.OS = 'android'`) may trigger a read-only error depending on the React Native version.

### Dimensions

```ts
import { Dimensions } from 'react-native';

jest.spyOn(Dimensions, 'get').mockImplementation((dim) => {
  if (dim === 'window') {
    return { width: 390, height: 844, scale: 3, fontScale: 1 };
  }
  return { width: 390, height: 844, scale: 3, fontScale: 1 };
});
```

To test responsive layout breakpoints, vary the `width` value and assert that different style objects are selected.

---

## MSW (Mock Service Worker) for API Mocking

On iOS, the standard approach for network stubbing in unit tests is `URLProtocol` subclassing — you register a custom protocol class that intercepts `URLSession` traffic and returns fixture data. MSW is the closest equivalent in the Jest world.

MSW installs itself as a Node.js HTTP interceptor. When your JavaScript code makes a `fetch` or `axios` call, MSW intercepts it before the request ever leaves the process, matches it against a handler list, and returns a synthetic response.

Install:

```bash
npm install --save-dev msw
```

Define handlers:

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/user/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Ana Lima',
      email: 'ana@example.com',
    });
  }),

  http.post('https://api.example.com/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    return HttpResponse.json({ token: 'jwt-token-abc123' });
  }),
];
```

Configure the server in setup:

```ts
// jest.setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './src/mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Override a handler per test for error scenarios:

```ts
it('shows an error banner when login fails', async () => {
  server.use(
    http.post('https://api.example.com/auth/login', () =>
      HttpResponse.json({ error: 'Service unavailable' }, { status: 503 })
    )
  );

  const { getByText } = render(<LoginScreen />);
  fireEvent.changeText(getByTestId('email'), 'test@example.com');
  fireEvent.changeText(getByTestId('password'), 'anypassword');
  fireEvent.press(getByTestId('login-button'));

  await waitFor(() => {
    expect(getByText(/Service unavailable/i)).toBeTruthy();
  });
});
```

The `onUnhandledRequest: 'error'` option in `server.listen` is especially valuable. Any network call your code makes that has no matching handler throws an error in the test, alerting you that you forgot to stub a dependency. This is stricter than the default iOS behavior where unstubbed requests either fail silently or hit the real network.

---

## jest.spyOn for Monitoring Calls

`jest.spyOn` wraps an existing function with a Jest mock wrapper, preserving the original implementation by default. This is equivalent to method swizzling on iOS, but without the global side effects.

```ts
import * as ExpoLocation from 'expo-location';

it('requests foreground permissions on mount', async () => {
  const spy = jest.spyOn(ExpoLocation, 'requestForegroundPermissionsAsync')
    .mockResolvedValue({ status: 'granted' } as ExpoLocation.LocationPermissionResponse);

  render(<MapScreen />);

  await waitFor(() => {
    expect(spy).toHaveBeenCalledTimes(1);
  });

  spy.mockRestore();
});
```

Use `mockRestore()` inside `afterEach` to avoid test pollution. If you set up spies in `beforeEach`, store the spy reference and restore it in `afterEach`:

```ts
let permissionSpy: jest.SpyInstance;

beforeEach(() => {
  permissionSpy = jest.spyOn(ExpoLocation, 'requestForegroundPermissionsAsync')
    .mockResolvedValue({ status: 'granted' } as ExpoLocation.LocationPermissionResponse);
});

afterEach(() => {
  permissionSpy.mockRestore();
});
```

---

## Factory Functions for Typed Mocks

As your test suite grows, you will find yourself constructing the same fixture objects repeatedly with minor variations. Factory functions enforce type safety and reduce duplication.

```ts
// src/mocks/factories.ts
import type { LocationObject } from 'expo-location';
import type { UserProfile } from '../types/user';

export function makeLocation(overrides?: Partial<LocationObject['coords']>): LocationObject {
  return {
    coords: {
      latitude: -23.5505,
      longitude: -46.6333,
      altitude: 760,
      accuracy: 5,
      altitudeAccuracy: 3,
      heading: 0,
      speed: 0,
      ...overrides,
    },
    timestamp: Date.now(),
    mocked: false,
  };
}

export function makeUserProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 'user-001',
    name: 'Ana Lima',
    email: 'ana@example.com',
    avatarUrl: null,
    role: 'member',
    ...overrides,
  };
}
```

Use in tests:

```ts
it('displays the user name from the profile', () => {
  const user = makeUserProfile({ name: 'Carlos Mendes', role: 'admin' });
  const { getByText } = render(<ProfileCard user={user} />);
  expect(getByText('Carlos Mendes')).toBeTruthy();
});

it('renders a high-accuracy location indicator', () => {
  const location = makeLocation({ accuracy: 1 });
  const { getByTestId } = render(<AccuracyBadge location={location} />);
  expect(getByTestId('high-accuracy-icon')).toBeTruthy();
});
```

TypeScript enforces that overrides conform to the actual interface, so factories catch type mismatches at authoring time rather than at runtime.

---

## Putting It Together

A typical test file for a location-aware screen might look like this:

```ts
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as ExpoLocation from 'expo-location';

import { NearbyScreen } from '../screens/NearbyScreen';
import { makeLocation } from '../mocks/factories';

jest.mock('expo-location');

describe('NearbyScreen', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock)
      .mockResolvedValue({ status: 'granted' });
    (ExpoLocation.getCurrentPositionAsync as jest.Mock)
      .mockResolvedValue(makeLocation());
  });

  it('shows the map once permissions are granted', async () => {
    const { getByTestId } = render(<NearbyScreen />);
    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });
  });

  it('shows a permission error screen when denied', async () => {
    (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock)
      .mockResolvedValue({ status: 'denied' });
    const { getByText } = render(<NearbyScreen />);
    await waitFor(() => {
      expect(getByText(/Location access required/i)).toBeTruthy();
    });
  });
});
```

Each test is fully isolated: no real GPS, no network, no device sensors. The iOS discipline of replacing dependencies at the boundary is exactly what Jest mocking enforces on the JavaScript side.
