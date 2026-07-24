---
title: Mocking Native Modules and Platform APIs
---

# Mocking de Módulos Nativos e APIs de Plataforma

Quando você escreve testes unitários no iOS, o simulador fornece um runtime completo de UIKit e Foundation. O XCTest roda dentro de um processo Apple real, portanto chamar `CLLocationManager` ou `AVCaptureSession` em um teste ao menos compila e linka, mesmo que você implemente os delegates manualmente.

O Jest roda em Node.js. Não há UIKit, nem CoreLocation, nem runtime Objective-C, nem Java bridge. Qualquer módulo nativo que seu código React Native importar vai falhar no momento em que tentar chamar sua contraparte nativa, porque essa contraparte simplesmente não existe. O lado JavaScript do módulo pode fazer `import` normalmente, mas a primeira chamada ao objeto host do TurboModule vai lançar um `TypeError` ou `ReferenceError` durante os testes.

Seu trabalho no ambiente de testes é substituir cada fronteira nativa por um substituto puramente em JavaScript que se comporte da forma necessária para cada cenário de teste.

---

## Por Que Módulos Nativos Não Podem Rodar no Jest

Um TurboModule é um objeto JavaScript cujos métodos são implementados por código nativo em C++ ou Objective-C, registrado na inicialização do app. Quando seu app é iniciado em um dispositivo real, o registro de TurboModules é preenchido pelo lado nativo antes que o JavaScript execute. No Jest, esse bootstrap nunca acontece. O registro está vazio, então qualquer chamada por meio dele lança uma exceção imediatamente.

Compare isso com a forma como você stubaria uma camada de rede no iOS. Você nunca deixa uma `URLSession` enviar requisições HTTP de verdade em testes unitários; você substitui a sessão por um mock que retorna objetos `URLResponse` pré-definidos. O mocking no Jest é a mesma disciplina aplicada a cada fronteira de plataforma, não apenas à rede.

---

## jest.mock() para TurboModules

A forma mais rápida de substituir um módulo é com a chamada `jest.mock()` no topo de um arquivo de teste ou dentro do `beforeEach`. O Jest intercepta a chamada `require`/`import` e retorna o resultado da sua factory no lugar.

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

A função factory é executada uma vez, e todo import de `expo-location` dentro desse arquivo de teste recebe o objeto mock. Isso é equivalente a trocar uma dependência via injeção por construtor do Swift antes de um método de teste ser executado.

---

## O Diretório __mocks__ para Mocks Manuais

Quando o mesmo módulo precisa do mesmo mock padrão em todos os arquivos de teste, repetir `jest.mock()` em todo lugar vira ruído. Crie um arquivo em `__mocks__/<nome-do-modulo>.ts` (ou dentro de `src/__mocks__/` para módulos locais) e o Jest o utilizará automaticamente para qualquer arquivo que chamar `jest.mock('nome-do-modulo')` sem uma factory.

```
__mocks__/
  expo-location.ts
  expo-camera.ts
  react-native-mmkv.ts
  @react-native-async-storage/
    async-storage.ts
```

Um mock manual para `expo-location`:

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

Qualquer arquivo de teste que chamar `jest.mock('expo-location')` sem segundo argumento usará esse mock automaticamente. Testes que precisam de comportamento diferente podem sobrescrever funções individuais com `mockResolvedValueOnce` ou `mockImplementation`.

---

## Mocking de Módulos Expo

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
  CameraView: 'CameraView', // renderizado como elemento string simples no enzyme/RTL
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

## Mocking do react-native-mmkv

O `react-native-mmkv` usa um TurboModule nativo em C++ e vai falhar imediatamente no Jest. Substitua-o por um Map em memória:

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

Em testes que compartilham estado, chame `store.clear()` no `beforeEach` ou exponha um helper de reset no mock.

---

## Mocking do AsyncStorage

O pacote `@react-native-async-storage/async-storage` já vem com seu próprio mock para Jest. Ative-o adicionando o caminho do mock à sua configuração do Jest:

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

Se você precisar de uma implementação personalizada, escreva-a como mock manual:

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

## Mocking de Platform.OS e Dimensions

### Platform.OS

Desenvolvedores iOS frequentemente precisam testar caminhos de código condicionais baseados na plataforma. O módulo `Platform` do React Native é importado do pacote `react-native`, que o jest-expo já mocka com valores padrão sensatos. Sobrescreva-o por teste:

```ts
import { Platform } from 'react-native';

describe('comportamento específico de plataforma', () => {
  afterEach(() => {
    // restaura o valor padrão
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
  });

  it('renderiza o componente específico para iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const { getByTestId } = render(<MyComponent />);
    expect(getByTestId('ios-button')).toBeTruthy();
  });

  it('renderiza o fallback para Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const { getByTestId } = render(<MyComponent />);
    expect(getByTestId('android-button')).toBeTruthy();
  });
});
```

Como `Platform.OS` é uma propriedade normal no objeto do módulo, `Object.defineProperty` é a forma mais confiável de sobrescrever. Atribuir diretamente (`Platform.OS = 'android'`) pode lançar um erro de somente leitura dependendo da versão do React Native.

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

Para testar breakpoints de layout responsivo, varie o valor de `width` e asserte que diferentes objetos de estilo são selecionados.

---

## MSW (Mock Service Worker) para Mocking de API

No iOS, a abordagem padrão para stubbing de rede em testes unitários é a subclasse de `URLProtocol` — você registra uma classe de protocolo personalizada que intercepta o tráfego de `URLSession` e retorna dados de fixture. O MSW é o equivalente mais próximo no mundo do Jest.

O MSW se instala como um interceptor HTTP do Node.js. Quando seu código JavaScript faz uma chamada `fetch` ou `axios`, o MSW a intercepta antes que a requisição saia do processo, compara com uma lista de handlers e retorna uma resposta sintética.

Instalação:

```bash
npm install --save-dev msw
```

Definindo handlers:

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

Configurando o servidor no setup:

```ts
// jest.setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './src/mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Sobrescrevendo um handler por teste para cenários de erro:

```ts
it('exibe um banner de erro quando o login falha', async () => {
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

A opção `onUnhandledRequest: 'error'` no `server.listen` é especialmente valiosa. Qualquer chamada de rede que seu código faça sem um handler correspondente lança um erro no teste, alertando que você esqueceu de fazer o stub de uma dependência. Isso é mais rigoroso do que o comportamento padrão no iOS, onde requisições sem stub podem falhar silenciosamente ou atingir a rede real.

---

## jest.spyOn para Monitorar Chamadas

`jest.spyOn` envolve uma função existente com um wrapper de mock do Jest, preservando a implementação original por padrão. Isso é equivalente ao method swizzling no iOS, mas sem os efeitos colaterais globais.

```ts
import * as ExpoLocation from 'expo-location';

it('solicita permissões em primeiro plano ao montar', async () => {
  const spy = jest.spyOn(ExpoLocation, 'requestForegroundPermissionsAsync')
    .mockResolvedValue({ status: 'granted' } as ExpoLocation.LocationPermissionResponse);

  render(<MapScreen />);

  await waitFor(() => {
    expect(spy).toHaveBeenCalledTimes(1);
  });

  spy.mockRestore();
});
```

Use `mockRestore()` dentro do `afterEach` para evitar poluição entre testes. Se você configurar spies no `beforeEach`, armazene a referência do spy e restaure-a no `afterEach`:

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

## Funções Factory para Mocks Tipados

Conforme sua suite de testes cresce, você vai se encontrar construindo os mesmos objetos de fixture repetidamente com pequenas variações. Funções factory garantem a segurança de tipos e reduzem a duplicação.

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

Uso nos testes:

```ts
it('exibe o nome do usuário a partir do perfil', () => {
  const user = makeUserProfile({ name: 'Carlos Mendes', role: 'admin' });
  const { getByText } = render(<ProfileCard user={user} />);
  expect(getByText('Carlos Mendes')).toBeTruthy();
});

it('renderiza o indicador de alta precisão de localização', () => {
  const location = makeLocation({ accuracy: 1 });
  const { getByTestId } = render(<AccuracyBadge location={location} />);
  expect(getByTestId('high-accuracy-icon')).toBeTruthy();
});
```

O TypeScript garante que os overrides estejam em conformidade com a interface real, de modo que as factories detectam incompatibilidades de tipo no momento da escrita, e não em tempo de execução.

---

## Colocando Tudo Junto

Um arquivo de teste típico para uma tela que usa localização pode ter esta aparência:

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

  it('exibe o mapa após as permissões serem concedidas', async () => {
    const { getByTestId } = render(<NearbyScreen />);
    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });
  });

  it('exibe uma tela de erro de permissão quando negada', async () => {
    (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock)
      .mockResolvedValue({ status: 'denied' });
    const { getByText } = render(<NearbyScreen />);
    await waitFor(() => {
      expect(getByText(/Location access required/i)).toBeTruthy();
    });
  });
});
```

Cada teste é completamente isolado: sem GPS real, sem rede, sem sensores do dispositivo. A disciplina do iOS de substituir dependências na fronteira é exatamente o que o mocking do Jest impõe no lado JavaScript.
