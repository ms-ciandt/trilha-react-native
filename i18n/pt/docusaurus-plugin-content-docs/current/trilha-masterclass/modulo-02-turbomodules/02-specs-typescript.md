---
title: SPECS em TypeScript
---

# SPECS em TypeScript

> O arquivo de spec é a **fonte única de verdade** para a interface de um TurboModule. O Codegen o lê em tempo de build para gerar código nativo tipado. Tudo que vem depois — a classe abstrata Java gerada, o protocolo ObjC++, o header JSI em C++ — deriva deste arquivo.

---

## Regras de Nomenclatura — Não Negociáveis

O Codegen impõe essas regras em tempo de build. Violações são erros, não avisos.

| Regra | Exemplo | Por quê |
|---|---|---|
| Arquivo deve começar com `Native` | `NativeCalculator.ts` | O Codegen ignora arquivos sem esse prefixo |
| Interface deve ser nomeada exatamente `Spec` | `export interface Spec extends TurboModule` | Qualquer outro nome lança `MisnamedModuleInterfaceParserError` |
| A string do nome do módulo deve corresponder ao prefixo `Native` | `getEnforcing<Spec>('NativeCalculator')` | Deve corresponder ao que o nativo registra via `getName()` |
| Extensão de arquivo `.ts` ou `.tsx` | `NativeStorage.ts` | `.js`/`.jsx` são tratados como specs Flow |

---

## Anatomia de um Arquivo de Spec

```typescript
// specs/NativeCalculator.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Síncrono — retorna valor diretamente via JSI
  add(a: number, b: number): number;

  // Assíncrono — retorna uma Promise
  fetchRemoteValue(key: string): Promise<string>;

  // Retorno void
  logEvent(name: string, payload: Object): void;

  // Retorno anulável
  getCachedUser(userId: string): Object | null;

  // Estilo callback (prefira Promise quando possível)
  getDeviceId(callback: (id: string) => void): void;
}

// getEnforcing: lança exceção se o módulo não estiver registrado no binário nativo
export default TurboModuleRegistry.getEnforcing<Spec>('NativeCalculator');
```

---

## Uma Spec Real: `NativeAnalytics`

```typescript
// specs/NativeAnalytics.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

// Sempre use object literals tipados — nunca Object genérico quando possível
type TrackPayload = Readonly<{
  eventName: string;
  userId: string;
  properties: Object;
  timestamp: number;
}>;

type FlushResult = Readonly<{
  flushedCount: number;
  failedCount: number;
}>;

export interface Spec extends TurboModule {
  track(payload: TrackPayload): void;
  flush(): Promise<FlushResult>;
  setUserId(userId: string): void;
  optOut(): void;
  isOptedOut(): boolean;
  getQueueSize(): number;

  // EventEmitter — nativo envia eventos para o JS (RN 0.76+)
  readonly onQueueDrained: EventEmitter<FlushResult>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAnalytics');
```

---

## Uma Spec Real: `NativeLocation` (apenas iOS)

```typescript
// specs/NativeLocation.ts
import { Platform } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

type LocationPayload = Readonly<{
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
}>;

export interface Spec extends TurboModule {
  requestPermission(): Promise<boolean>;
  startUpdates(distanceFilter: number): void;
  stopUpdates(): void;

  readonly onLocationChanged: EventEmitter<LocationPayload>;
  readonly onPermissionChanged: EventEmitter<Readonly<{ granted: boolean }>>;
}

// Guard de plataforma no nível da spec — null no Android
export default Platform.OS === 'ios'
  ? TurboModuleRegistry.get<Spec>('NativeLocation')
  : null;
```

---

## Composição de Specs: Dividindo Módulos Grandes

Quando um módulo tem muitos métodos, divida por domínio em vez de combinar tudo em uma única spec. Cada spec gera seu próprio conjunto de interfaces nativas.

```typescript
// specs/NativeStorageReader.ts
export interface Spec extends TurboModule {
  getItem(key: string): string | null;
  getMultipleItems(keys: string[]): Array<Readonly<{ key: string; value: string | null }>>;
  getAllKeys(): string[];
}
export default TurboModuleRegistry.getEnforcing<Spec>('NativeStorageReader');

// specs/NativeStorageWriter.ts
export interface Spec extends TurboModule {
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  mergeItem(key: string, value: string): Promise<void>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('NativeStorageWriter');
```

No lado nativo, cada spec mapeia para sua própria classe de módulo registrada — as duas classes nativas podem compartilhar a implementação interna (por exemplo, ambas delegam para o mesmo wrapper de `SharedPreferences` / `NSUserDefaults`).

---

## O que o Codegen Faz com a Spec

Quando você executa `./gradlew generateCodegenArtifactsFromSchema` (Android) ou `pod install` (iOS), o Codegen:

1. Analisa o arquivo `.ts` de spec usando um parser TypeScript embutido no `react-native-codegen`
2. Valida os tipos — tipos não suportados (ex.: `Partial<T>`, `number | null`) causam um erro de build aqui
3. Gera:
   - **Android**: uma classe Java abstrata que você estende (`NativeAnalyticsSpec.java`) + glue JSI em C++ (`NativeAnalytics.h`, `NativeAnalytics-generated.cpp`)
   - **iOS**: um protocolo ObjC++ que você adota (`NativeAnalyticsSpec.h`) + glue JSI (`NativeAnalyticsSpec-generated.mm`)

Os arquivos gerados ficam em `build/` e nunca devem ser editados manualmente.

---

## Erros Comuns

| Erro | Mensagem | Correção |
|---|---|---|
| Interface nomeada `ISpec`, `MySpec` ou qualquer coisa diferente de `Spec` | `MisnamedModuleInterfaceParserError` | Renomeie para `Spec` |
| Arquivo nomeado `AnalyticsModule.ts` (sem prefixo `Native`) | O Codegen ignora o arquivo silenciosamente | Renomeie para `NativeAnalyticsModule.ts` |
| `number \| null` como tipo de retorno | Erro do Codegen: number anulável não é suportado | Use valor sentinela (`-1`) ou envolva em `{ value: number } \| null` |
| Uso de `Partial<T>` | Erro do Codegen | Expanda para campos opcionais explícitos |
| A string do nome do módulo não corresponde a `getName()` | `Invariant Violation` em tempo de execução | Sincronize a string com o valor de retorno do `getName()` nativo |

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Guia oficial com spec + implementação passo a passo |
| [TypeScript Support — reactwg #27](https://github.com/reactwg/react-native-new-architecture/discussions/27) | Como o parser TypeScript funciona no Codegen, casos extremos |
| [Codegen Missing Features — reactwg #91](https://github.com/reactwg/react-native-new-architecture/discussions/91) | Lista oficial de tipos não suportados e adições planejadas |
| [Partial\<T\> not supported — #35864](https://github.com/facebook/react-native/issues/35864) | Por que Partial é rejeitado e o contorno |

---

Próximo → [Codegen: Interfaces Nativas Tipadas](./codegen)
