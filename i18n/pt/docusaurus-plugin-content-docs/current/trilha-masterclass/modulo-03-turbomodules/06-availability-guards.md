---
title: "Guards de Disponibilidade (isAvailable)"
---

# Guards de Disponibilidade (`isAvailable`)

> `TurboModuleRegistry` não possui um método `isAvailable()` oficial. A verificação idiomática é `get() !== null`. Este tópico mostra onde colocar essa verificação e como expô-la de forma limpa aos consumidores.

---

## A Verificação Canônica de Disponibilidade

```typescript
import { TurboModuleRegistry } from 'react-native';
import type { Spec } from '../specs/NativeStorage';

// Avaliado uma vez no carregamento do módulo
const _module = TurboModuleRegistry.get<Spec>('NativeStorage');

export const isNativeStorageAvailable = _module !== null;
```

Atribua a uma `const` no escopo do módulo — isso executa uma vez quando o arquivo de spec é importado pela primeira vez. Cada acesso subsequente lê um boolean em cache, com zero overhead.

---

## Exportando `isAvailable` do Arquivo de Spec

O padrão mais limpo: coloque a disponibilidade junto ao próprio módulo.

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

Consumidor:

```typescript
import NativeStorage, { isAvailable as isStorageAvailable } from '../specs/NativeStorage';

if (!isStorageAvailable) {
  console.warn('NativeStorage não disponível — usando AsyncStorage como fallback');
}

// Tipado como Spec | null — o TypeScript impõe a verificação de null
NativeStorage?.setItem('theme', 'dark');
```

---

## Guard no Momento de Renderização do Componente

Quando a UI precisa divergir com base na disponibilidade do módulo:

```tsx
import { TurboModuleRegistry } from 'react-native';
import { useMemo } from 'react';
import type { Spec } from '../specs/NativeStorage';

function StorageFeature({ children }: { children: React.ReactNode }) {
  // useMemo evita reavaliação a cada renderização
  // (embora TurboModuleRegistry.get já seja cacheado internamente)
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

## Guards de Plataforma na Spec

Quando um módulo existe apenas em uma plataforma, expresse essa restrição na própria spec — não espalhada pelos pontos de chamada.

```typescript
// specs/NativeARKit.ts — apenas iOS
import { Platform } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  isSupported(): boolean;
  startSession(config: Readonly<{ planeDetection: boolean }>): Promise<void>;
  stopSession(): void;
}

// Null no Android — o consumidor recebe null sem verificações de Platform
export default Platform.OS === 'ios'
  ? TurboModuleRegistry.get<Spec>('NativeARKit')
  : null;

export const isAvailable =
  Platform.OS === 'ios' &&
  TurboModuleRegistry.get<Spec>('NativeARKit') !== null;
```

Consumidor — nenhuma lógica de `Platform.OS` vaza para fora:

```typescript
import NativeARKit, { isAvailable as isARAvailable } from '../specs/NativeARKit';

async function startAR() {
  if (!isARAvailable) {
    Alert.alert('AR não suportado neste dispositivo');
    return;
  }
  await NativeARKit!.startSession({ planeDetection: true });
}
```

---

## Guard para Verificações de Capacidade em Tempo de Execução

Alguns módulos existem, mas o hardware ou recurso de SO subjacente pode não estar disponível:

```typescript
import NativeARKit from '../specs/NativeARKit';

async function checkARCapabilities(): Promise<boolean> {
  if (!NativeARKit) {
    return false; // módulo não registrado
  }

  // Módulo existe — verifica se o hardware suporta
  const hardwareSupported = NativeARKit.isSupported();
  return hardwareSupported;
}
```

Verificação em dois níveis: **disponibilidade no registry** (o módulo está registrado?) e **disponibilidade de capacidade** (o hardware suporta o recurso?).

---

## `isAvailable` em um Hook

Encapsulando disponibilidade e capacidade em um único hook:

```typescript
// src/hooks/useARKit.ts
import { useState, useEffect } from 'react';
import NativeARKit, { isAvailable as isModuleAvailable } from '../specs/NativeARKit';

type ARKitStatus =
  | { state: 'unavailable' }           // módulo não registrado ou plataforma errada
  | { state: 'unsupported' }           // módulo presente mas hardware não suporta
  | { state: 'ready'; start: () => Promise<void>; stop: () => void };

export function useARKit(): ARKitStatus {
  const [status, setStatus] = useState<ARKitStatus>({ state: 'unavailable' });

  useEffect(() => {
    if (!isModuleAvailable || !NativeARKit) {
      return; // permanece 'unavailable'
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

Uso:

```tsx
function ARFeature() {
  const ar = useARKit();

  if (ar.state === 'unavailable') return <Text>Não disponível nesta plataforma</Text>;
  if (ar.state === 'unsupported') return <Text>Seu dispositivo não suporta AR</Text>;

  return (
    <View>
      <Button title="Iniciar AR" onPress={ar.start} />
      <Button title="Parar AR" onPress={ar.stop} />
    </View>
  );
}
```

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Padrão null oficial com `get` |
| [react-native-device-info](https://github.com/react-native-device-info/react-native-device-info) | Biblioteca real com padrões de disponibilidade específicos por plataforma |
| [Platform API — React Native](https://reactnative.dev/docs/platform) | `Platform.OS`, `Platform.select`, `Platform.Version` |

---

Próximo → [Tipos Suportados e Serialização](./supported-types)
