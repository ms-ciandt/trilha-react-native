---
title: Testes e Mocks para Módulos Nativos
---

# Testes e Mocks para Módulos Nativos

> Quando o Jest executa, não há runtime nativo. Qualquer chamada a `TurboModuleRegistry.getEnforcing()` sem um mock lança imediatamente. Este tópico cobre quatro estratégias, da mais simples à mais robusta.

---

## O Problema

```
Invariant Violation: TurboModuleRegistry.getEnforcing(...):
  'NativeAnalytics' could not be found.
  Verify that a module by this name is registered in the native binary.
```

Esse erro dispara no **momento do carregamento do módulo** — quando qualquer arquivo de teste faz `import` de uma spec que chama `getEnforcing`. A suite de testes crasha antes de executar uma única asserção.

---

## Estratégia 1: Mockar o Arquivo de Spec (Padrão Recomendado)

A abordagem mais direta: mockar o próprio módulo de spec antes que ele possa chamar o registry.

Crie um mock manual adjacente à spec:

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

No seu arquivo de teste:

```typescript
// analytics.test.ts
jest.mock('../specs/NativeAnalytics');  // Jest usa __mocks__/NativeAnalytics.ts

import NativeAnalytics from '../specs/NativeAnalytics';
import { track } from '../services/AnalyticsService';

describe('AnalyticsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delega track ao módulo nativo', () => {
    track('checkout_started');
    expect(NativeAnalytics.track).toHaveBeenCalledWith('checkout_started');
  });

  it('trata resultado de flush', async () => {
    const result = await NativeAnalytics.flush();
    expect(result.flushedCount).toBe(0);
  });

  it('mock é tipado como a Spec real', () => {
    // TypeScript ainda impõe o formato da interface aqui
    NativeAnalytics.setUserId('user_123');
    expect(NativeAnalytics.setUserId).toHaveBeenCalledWith('user_123');
  });
});
```

---

## Estratégia 2: Mock Global do Registry na Configuração do Jest

Para apps com muitos TurboModules, mockar cada spec individualmente se torna repetitivo. Mocke `TurboModuleRegistry` globalmente para que todo arquivo de spec encontre seu mock no registry.

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

// Intercepta todas as chamadas getEnforcing
jest.spyOn(TurboModuleRegistry, 'getEnforcing').mockImplementation((name: string) => {
  const mod = moduleRegistry[name];
  if (!mod) {
    throw new Error(
      `[Test] Mock de TurboModule não encontrado: "${name}". Adicione ao moduleRegistry em jest.setup.ts`
    );
  }
  return mod as ReturnType<typeof TurboModuleRegistry.getEnforcing>;
});

// Intercepta todas as chamadas get
jest.spyOn(TurboModuleRegistry, 'get').mockImplementation((name: string) => {
  return (moduleRegistry[name] ?? null) as ReturnType<typeof TurboModuleRegistry.get>;
});
```

Registre em `jest.config.js`:

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

A mensagem de erro no mock é intencional — se você adicionar um novo TurboModule e esquecer de registrar seu mock, a suite de testes informa claramente o que precisa ser adicionado.

---

## Estratégia 3: Factory Mock para `getEnforcing` no Momento da Importação

Quando o módulo em teste chama `getEnforcing` no nível superior do arquivo de spec, o mock do registry deve estar em vigor **antes de a spec ser importada**. O sistema de módulos do Jest processa chamadas `jest.mock()` antes de qualquer import, mesmo que escritas depois no código-fonte.

```typescript
// checkout.test.ts
const mockTrack = jest.fn();
const mockFlush = jest.fn().mockResolvedValue({ flushedCount: 3, failedCount: 0 });

// hoisting do jest.mock: executa antes de qualquer import abaixo
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
        // Cai no registry real para outros módulos
        return rn.TurboModuleRegistry.getEnforcing(name);
      },
    },
  };
});

// Import APÓS o mock estar configurado (embora o hoisting do jest.mock resolva isso)
import { Analytics } from '../services/AnalyticsService';

describe('AnalyticsService', () => {
  it('chama track', () => {
    Analytics.track('page_view');
    expect(mockTrack).toHaveBeenCalledWith('page_view');
  });

  it('retorna contagem de flush', async () => {
    const result = await Analytics.flush();
    expect(result.flushedCount).toBe(3);
  });
});
```

---

## Estratégia 4: Testando a Abstração de Serviço (Melhor para Lógica de Negócio)

Ao envolver o módulo nativo em um serviço (Padrão 3 de Carregamento Defensivo), você pode testar a lógica de negócio independentemente do módulo nativo. Mocke a spec para `null` — o serviço usa o fallback noop.

```typescript
// AnalyticsService.test.ts

// Mocka o módulo de spec para simular módulo indisponível
jest.mock('../specs/NativeAnalytics', () => ({
  default: null,   // simula get() retornando null
  isAvailable: false,
}));

import { Analytics, isAnalyticsAvailable } from '../services/AnalyticsService';

describe('AnalyticsService — modo noop', () => {
  it('reporta como indisponível', () => {
    expect(isAnalyticsAvailable).toBe(false);
  });

  it('não lança exceção ao rastrear', () => {
    expect(() => Analytics.track('test_event')).not.toThrow();
  });

  it('resolve flush com contagem zero', async () => {
    await expect(Analytics.flush()).resolves.toEqual({ flushedCount: 0 });
  });
});
```

Você também pode escrever o caminho "disponível":

```typescript
// AnalyticsService.test.ts — módulo nativo presente

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

describe('AnalyticsService — modo nativo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delega track', () => {
    Analytics.track('purchase_completed', { total: 99.9 });
    expect(mockNative.track).toHaveBeenCalledWith('purchase_completed');
  });

  it('delega flush', async () => {
    const result = await Analytics.flush();
    expect(result.flushedCount).toBe(5);
    expect(mockNative.flush).toHaveBeenCalledOnce();
  });
});
```

---

## Testando Assinaturas de EventEmitter

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

  it('inicia atualizações ao montar', () => {
    renderHook(() => useLocation());
    expect(NativeLocation!.startLocationUpdates).toHaveBeenCalledTimes(1);
  });

  it('subscreve a eventos de localização', () => {
    renderHook(() => useLocation());
    expect(mockAddListener).toHaveBeenCalledTimes(1);
  });

  it('para atualizações e remove subscrição ao desmontar', () => {
    const { unmount } = renderHook(() => useLocation());
    unmount();
    expect(NativeLocation!.stopLocationUpdates).toHaveBeenCalledTimes(1);
    expect(mockSubscription.remove).toHaveBeenCalledTimes(1);
  });

  it('atualiza estado quando um evento de localização dispara', () => {
    const { result } = renderHook(() => useLocation());

    // Simula o nativo enviando um evento
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

## Testes de Snapshot: Fixando Valores Estáveis

Módulos nativos retornam valores específicos do dispositivo. Mocke-os com valores estáveis antes de snapshots:

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

it('renderiza informações do dispositivo corretamente', () => {
  const tree = renderer.create(<DeviceInfoScreen />).toJSON();
  expect(tree).toMatchSnapshot();
});
```

---

## Qual Estratégia Usar

| Situação | Estratégia |
|---|---|
| Módulo único, um arquivo de teste | Estratégia 1 — arquivo `__mocks__` manual |
| Muitos módulos, muitos arquivos de teste | Estratégia 2 — mock global do registry em `jest.setup.ts` |
| Módulo chama `getEnforcing` no momento do import, mocking complexo | Estratégia 3 — factory mock via `jest.mock('react-native', ...)` |
| Testando lógica de negócio independente do nativo | Estratégia 4 — abstração de serviço + mock noop |
| Ciclo de vida de subscrição de EventEmitter | Estratégia 1 ou 4 — mocke o objeto de subscrição |

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [Testing React Native Apps — Jest](https://jestjs.io/docs/tutorial-react-native) | Guia oficial do Jest para RN |
| [react-native-async-storage test suite](https://github.com/react-native-async-storage/async-storage/tree/main/src/__tests__) | Referência real de testes para TurboModule |
| [react-native-harness — Callstack](https://www.callstack.com/blog/introducing-react-native-harness-fast-real-device-testing-for-native-modules) | Testes em dispositivo real sem build completo do app |
| [Testing NativeModules — oneuptime.com](https://oneuptime.com/blog/post/2026-01-15-react-native-mock-native-modules/view) | Padrões modernos de mocking para 2025+ |

---

Próximo → [Fabric e JSI a Fundo](../modulo-03-fabric-jsi/jsi-javascript-interface/)
