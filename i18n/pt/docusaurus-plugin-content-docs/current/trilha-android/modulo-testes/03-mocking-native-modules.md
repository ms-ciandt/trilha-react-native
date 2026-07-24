---
title: "Mockando Módulos Nativos"
sidebar_label: "Mockando Nativos"
sidebar_position: 3
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## O Problema: Módulos Nativos Não Rodam no Jest

Jest roda em Node.js — não há Android, nem Hermes, nem camada nativa. Qualquer chamada a TurboModule ou API nativa lançará uma exceção nos testes, a menos que seja mockada. Equivalente a precisar do Robolectric ou MockK ao testar código Android que chama APIs do sistema.

---

## Mockando um TurboModule

```typescript
// __mocks__/NativeDeviceInfoModule.ts
const NativeDeviceInfoModule = {
  getDeviceModel: jest.fn(() => 'Dispositivo Mock'),
  getBatteryLevel: jest.fn(() => Promise.resolve(85)),
};

export default NativeDeviceInfoModule;
```

Registrar em `jest.config.js`:

```js
moduleNameMapper: {
  '../specs/NativeDeviceInfoModule': '<rootDir>/__mocks__/NativeDeviceInfoModule',
}
```

```typescript
import NativeDeviceInfo from '../specs/NativeDeviceInfoModule';

test('useDeviceInfo retorna modelo e bateria', async () => {
  (NativeDeviceInfo.getBatteryLevel as jest.Mock).mockResolvedValueOnce(42);
  const { result } = renderHook(() => useDeviceInfo());
  await waitFor(() => expect(result.current.batteryLevel).toBe(42));
});
```

---

## Mockando Módulos Expo

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
  Accuracy: { Balanced: 3, High: 4 },
}));

jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    MMKV: jest.fn(() => ({
      set: jest.fn((k, v) => store.set(k, v)),
      getString: jest.fn(k => store.get(k)),
      delete: jest.fn(k => store.delete(k)),
      contains: jest.fn(k => store.has(k)),
    })),
  };
});
```

---

## Mockando PermissionsAndroid

```typescript
jest.mock('react-native/Libraries/PermissionsAndroid/PermissionsAndroid', () => ({
  PERMISSIONS: { CAMERA: 'android.permission.CAMERA' },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
  check: jest.fn(() => Promise.resolve(true)),
  request: jest.fn(() => Promise.resolve('granted')),
}));

test('retorna true quando permissão é concedida', async () => {
  (PermissionsAndroid.request as jest.Mock).mockResolvedValueOnce('granted');
  const result = await ensureCameraPermission();
  expect(result).toBe(true);
});
```

---

## Mockando Navegação

```typescript
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { userId: 'test-id' } }),
}));

test('navega para detalhe ao pressionar item', () => {
  render(<UserList />);
  fireEvent.press(screen.getByText('Guilherme'));
  expect(mockNavigate).toHaveBeenCalledWith('Detail', { userId: '1' });
});
```

---

## Materiais de Estudo

- [React Native — Testando Módulos Nativos](https://reactnative.dev/docs/native-modules-setup#testing)
- [Masterclass — TurboModule Tests & Mocks](/trilha-masterclass/modulo-03-turbomodules/tests-mocks)

---

## Próximo Passo

➡ [Testes de Integração](./04-integration-tests)
