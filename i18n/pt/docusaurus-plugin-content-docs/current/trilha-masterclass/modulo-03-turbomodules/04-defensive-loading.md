---
title: Carregamento Defensivo de Módulos
---

# Carregamento Defensivo de Módulos

> Nunca chame um TurboModule às cegas. Módulos podem estar ausentes em ambientes que você não antecipou — e um `getEnforcing` no lugar errado vai derrubar o app silenciosamente em produção.

---

## Quando um Módulo Pode Estar Ausente

| Ambiente | Por que o módulo pode não existir |
|---|---|
| **Expo Go** | Apenas os módulos Expo embutidos estão disponíveis — seu módulo customizado não está no binário do Expo Go |
| **Web / react-native-web** | Sem runtime nativo |
| **Storybook** | Roda em ambiente apenas JavaScript (Node ou browser) |
| **Testes Jest** | Sem runtime nativo, a menos que você mock explicitamente o registry |
| **Cenário de atualização OTA** | Um novo bundle JS é implantado antes de o binário nativo ser atualizado — o módulo existe no nativo mas pode ter uma versão de API diferente |
| **Superfícies brownfield** | Uma superfície específica pode não registrar todos os módulos |
| **Apenas uma plataforma** | Um módulo implementado apenas no iOS estará ausente no Android |

---

## Padrão 1: `get()` + Encadeamento Opcional

Use para módulos que são **extras opcionais** — o recurso degrada graciosamente se o módulo estiver ausente.

```typescript
// specs/NativeAnalytics.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  track(event: string): void;
  flush(): Promise<{ flushedCount: number }>;
}

// get() retorna Spec | null
export default TurboModuleRegistry.get<Spec>('NativeAnalytics');
```

```typescript
// src/analytics.ts
import NativeAnalytics from '../specs/NativeAnalytics';

// Encadeamento opcional — no-op se o módulo for null
export function track(event: string): void {
  NativeAnalytics?.track(event);
}

export const isAnalyticsAvailable = NativeAnalytics !== null;
```

---

## Padrão 2: Guard de Plataforma + `get()`

Use quando um módulo está implementado apenas em uma plataforma.

```typescript
// specs/NativeHealthKit.ts
import { Platform } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  requestAuthorization(permissions: string[]): Promise<boolean>;
  getStepCount(startDate: number, endDate: number): Promise<number>;
}

// Explicitamente null no Android — o chamador não precisa saber sobre Platform
export default Platform.OS === 'ios'
  ? TurboModuleRegistry.get<Spec>('NativeHealthKit')
  : null;
```

```typescript
// src/health.ts
import NativeHealthKit from '../specs/NativeHealthKit';

export async function fetchSteps(from: number, to: number): Promise<number> {
  if (!NativeHealthKit) {
    return 0; // Android ou HealthKit indisponível
  }
  return NativeHealthKit.getStepCount(from, to);
}
```

---

## Padrão 3: Abstração de Serviço com Fallback Noop

O **padrão mais limpo para produção** — o restante do app nunca lida com verificações de null. A camada de serviço absorve a incerteza.

```typescript
// src/services/AnalyticsService.ts
import type { Spec } from '../specs/NativeAnalytics';
import { TurboModuleRegistry } from 'react-native';

// Interface pública — independente da implementação nativa
interface AnalyticsService {
  track(event: string, properties?: Record<string, unknown>): void;
  flush(): Promise<{ flushedCount: number }>;
  setUserId(id: string): void;
}

// Noop usado no Storybook, web, Expo Go, Jest
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

// Avaliado uma vez no carregamento do módulo — singleton
export const Analytics = buildService();
export const isAnalyticsAvailable =
  TurboModuleRegistry.get<Spec>('NativeAnalytics') !== null;
```

Qualquer componente ou hook importa `Analytics` e o chama sem verificações de null:

```typescript
import { Analytics } from '../services/AnalyticsService';

function CheckoutScreen() {
  const handlePurchase = () => {
    Analytics.track('purchase_completed', { total: 99.9 });
    // Funciona em todos os ambientes — noop no web/Storybook/Jest
  };
}
```

---

## Quando o Padrão 3 é o Padrão Correto

| Situação | Padrão |
|---|---|
| Analytics, relatório de crashes, feature flags | Padrão 3 — fallback noop |
| Sensores ou APIs de OS exclusivos do iOS | Padrão 2 — guard de plataforma |
| Recurso central do app, crash na ausência é aceitável | `getEnforcing` (próximo tópico) |
| Biblioteca de terceiros que você distribui | Padrão 1 ou 2 — você não conhece o ambiente do consumidor |

---

## A Armadilha da Incompatibilidade de Versão

Em implantações OTA, o bundle JS pode ser atualizado independentemente do binário nativo. Se um novo método da spec for chamado pelo JS antes de o lado nativo ser atualizado:

- `getEnforcing` terá sucesso (o módulo existe), mas o método será `undefined` em tempo de execução — um crash sem tipagem
- A solução defensiva: versionar novos métodos com gates

```typescript
// Chamando um método que pode não existir em binários nativos mais antigos
const native = TurboModuleRegistry.get<Spec>('NativeAnalytics');
const canUseBatchTrack = native && typeof native.batchTrack === 'function';

if (canUseBatchTrack) {
  native.batchTrack(events);
} else {
  events.forEach((e) => native?.track(e.name));
}
```

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Guia oficial — uso de `get` vs `getEnforcing` |
| [react-native-device-info](https://github.com/react-native-device-info/react-native-device-info) | Padrões defensivos reais com `get()` e guards de plataforma |
| [getEnforcing fails in brownfield — #49246](https://github.com/facebook/react-native/issues/49246) | Por que `getEnforcing` falha em superfícies brownfield não registradas |

---

Próximo → [TurboModuleRegistry: get vs getEnforcing](./get-vs-getenforcing)
