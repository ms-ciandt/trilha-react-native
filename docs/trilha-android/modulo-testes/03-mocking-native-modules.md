---
title: "Mocking Native Modules"
sidebar_label: "Mocking Native"
sidebar_position: 3
---

## Video Overview

> Video for this topic coming soon.

## The Problem: Native Modules Don't Run in Jest

Jest runs in Node.js — there is no Android, no Hermes, no native layer. Any TurboModule or native API call will throw in tests unless you mock it. This is equivalent to needing `Robolectric` or `MockK` when testing Android code that calls system APIs.

---

## Mocking a TurboModule

```typescript
// src/specs/NativeDeviceInfoModule.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getDeviceModel(): string;
  getBatteryLevel(): Promise<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeDeviceInfoModule');
```

```typescript
// __mocks__/NativeDeviceInfoModule.ts
// Jest finds this automatically when the real module is imported
const NativeDeviceInfoModule = {
  getDeviceModel: jest.fn(() => 'Mock Device'),
  getBatteryLevel: jest.fn(() => Promise.resolve(85)),
};

export default NativeDeviceInfoModule;
```

Register in `jest.config.js`:

```js
module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '../specs/NativeDeviceInfoModule': '<rootDir>/__mocks__/NativeDeviceInfoModule',
  },
};
```

Now any test that imports the module gets the mock automatically:

```typescript
import NativeDeviceInfo from '../specs/NativeDeviceInfoModule';

test('useDeviceInfo returns model and battery', async () => {
  (NativeDeviceInfo.getBatteryLevel as jest.Mock).mockResolvedValueOnce(42);

  const { result } = renderHook(() => useDeviceInfo());
  await waitFor(() => expect(result.current.batteryLevel).toBe(42));
  expect(result.current.model).toBe('Mock Device');
});
```

---

## Mocking Expo Modules

Expo modules are mocked automatically by `jest-expo`. For custom mocks:

```typescript
// jest.setup.ts
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [
    { granted: true, status: 'granted' },
    jest.fn(),
  ]),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: -23.5, longitude: -46.6, accuracy: 10 },
    })
  ),
  watchPositionAsync: jest.fn(() =>
    Promise.resolve({ remove: jest.fn() })
  ),
  Accuracy: { Balanced: 3, High: 4 },
}));

jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string>();
  return {
    MMKV: jest.fn(() => ({
      set: jest.fn((key: string, value: string) => store.set(key, value)),
      getString: jest.fn((key: string) => store.get(key)),
      delete: jest.fn((key: string) => store.delete(key)),
      contains: jest.fn((key: string) => store.has(key)),
    })),
  };
});
```

---

## Mocking PermissionsAndroid

```typescript
// jest.setup.ts
jest.mock('react-native/Libraries/PermissionsAndroid/PermissionsAndroid', () => ({
  PERMISSIONS: {
    CAMERA: 'android.permission.CAMERA',
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
  check: jest.fn(() => Promise.resolve(true)),
  request: jest.fn(() => Promise.resolve('granted')),
  requestMultiple: jest.fn(() => Promise.resolve({})),
}));
```

Test the permission flow:

```typescript
import { PermissionsAndroid } from 'react-native';
import { ensureCameraPermission } from '../utils/permissions';

test('returns true when permission is granted', async () => {
  (PermissionsAndroid.request as jest.Mock).mockResolvedValueOnce('granted');
  const result = await ensureCameraPermission();
  expect(result).toBe(true);
});

test('opens settings when permanently denied', async () => {
  (PermissionsAndroid.request as jest.Mock).mockResolvedValueOnce('never_ask_again');
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  await ensureCameraPermission();
  expect(openSettings).toHaveBeenCalled();
});
```

---

## Mocking Navigation

```typescript
// jest.setup.ts
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: mockReplace,
  }),
  useRoute: () => ({
    params: { userId: 'test-user-id' },
  }),
}));

// In tests
beforeEach(() => {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
});

test('navigates to detail on item press', () => {
  render(<UserList />);
  fireEvent.press(screen.getByText('Guilherme'));
  expect(mockNavigate).toHaveBeenCalledWith('Detail', { userId: '1' });
});
```

---

## Study Materials

- [React Native — Testing Native Modules](https://reactnative.dev/docs/native-modules-setup#testing)
- [Masterclass — TurboModule Tests & Mocks](/trilha-masterclass/modulo-03-turbomodules/tests-mocks)
- [jest-expo — Mock setup](https://docs.expo.dev/develop/unit-testing/)

---

## What's Next

Native modules mocked. Next: integration tests — testing screens end-to-end within Jest.

➡ [Integration Tests](./04-integration-tests)
