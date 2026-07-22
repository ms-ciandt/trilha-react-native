---
title: Tipos Suportados e Serialização
---

# Tipos Suportados e Serialização

> O Codegen valida tipos em **tempo de build**. Tipos inválidos são erros do Codegen, não crashes em tempo de execução. Esta é uma das maiores melhorias de segurança em relação à bridge antiga — incompatibilidades de tipo se tornam falhas de CI, não incidentes em produção.

---

## Tipos Primitivos

| TypeScript | Android (Java/Kotlin) | iOS (ObjC++/C++) | Observações |
|---|---|---|---|
| `string` | `String` | `NSString *` | Sempre por valor |
| `boolean` | `boolean` | `BOOL` | |
| `number` | `double` | `double` | Todos os números JS são double no nível JSI |
| `Int32` | `int` | `int32_t` | Importe de `'react-native/Libraries/Types/CodegenTypes'` |
| `Float` | `float` | `float` | Mesmo import |
| `Double` | `double` | `double` | Mesmo import — intenção explícita |

```typescript
import type { Int32, Float, Double } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  setVolume(level: Float): void;          // float no nativo
  seekTo(positionMs: Int32): void;        // int no nativo
  computePrecise(value: Double): Double;  // double explícito
  getCount(): number;                     // também double — adequado para a maioria dos casos
}
```

> `Int32` foi afetado por um bug em algumas versões do RN onde o Codegen gerava `double` em vez de `int` no Java. Verifique com `./gradlew generateCodegenArtifactsFromSchema` e inspecione a saída. Referência: [#45659](https://github.com/facebook/react-native/issues/45659).

---

## Tipos de Objeto

| TypeScript | Android | iOS | Observações |
|---|---|---|---|
| `Object` | `ReadableMap` | `NSDictionary *` | Sem tipagem — evite em código novo |
| `{ key: string; count: number }` | `ReadableMap` | `NSDictionary *` | Object literal tipado — o Codegen valida o formato |
| `Readonly<{ key: string; count: number }>` | Igual | Igual | Preferido — comunica imutabilidade |

**Sempre prefira object literals tipados a `Object`:**

```typescript
// Evite — o Codegen não consegue validar o formato
logEvent(name: string, payload: Object): void;

// Prefira — o Codegen conhece os campos exatos
type EventPayload = Readonly<{
  name: string;
  value: number;
  tags: string[];
  metadata: Object;  // use Object apenas para dados verdadeiramente arbitrários
}>;

logEvent(payload: EventPayload): void;
```

No lado nativo, objetos tipados ainda chegam como `ReadableMap` (Android) / `NSDictionary` (iOS) — mas o Codegen valida que você está passando o formato correto do JS, e o código de despacho gerado extrai os campos por nome na camada C++ antes de entregá-los à sua implementação.

---

## Tipos de Array

| TypeScript | Android | iOS |
|---|---|---|
| `Array<string>` | `ReadableArray` | `NSArray<NSString *> *` |
| `Array<number>` | `ReadableArray` | `NSArray<NSNumber *> *` |
| `Array<Readonly<{ id: string; label: string }>>` | `ReadableArray` | `NSArray *` |

Arrays são **somente leitura na fronteira JSI** — mutações no nativo não se refletem no JS. Retorne um novo array se precisar comunicar mudanças.

```typescript
export interface Spec extends TurboModule {
  // Retorna um snapshot imutável
  getAllKeys(): Array<string>;

  // Recebe uma lista somente leitura — o nativo não deve manter referência após a chamada
  setMultipleItems(entries: Array<Readonly<{ key: string; value: string }>>): void;
}
```

---

## Tipos Anuláveis

```typescript
export interface Spec extends TurboModule {
  // Retorno anulável — nativo retorna null quando o valor está ausente
  getCachedUser(id: string): Readonly<UserType> | null;

  // Parâmetro anulável — nativo recebe null como sinal explícito de ausência
  configure(options: Readonly<ConfigType> | null): void;

  // String anulável
  getLastError(): string | null;
}
```

**Restrição importante:** `number` não pode ser anulável em uma spec de TurboModule.

```typescript
// NÃO válido em uma spec — erro do Codegen
getProgress(): number | null;

// Alternativas válidas:
getProgress(): Readonly<{ value: number; hasValue: boolean }> | null;
getProgress(): number; // use -1 como valor sentinela
```

---

## Tipos Assíncronos: Promise

```typescript
export interface Spec extends TurboModule {
  // Assíncrono simples
  fetchData(url: string): Promise<string>;

  // Resultado em objeto tipado
  getUserProfile(id: string): Promise<Readonly<{
    name: string;
    email: string;
    avatarUrl: string | null;
  }>>;

  // Promise<void> — sinaliza conclusão sem dados
  clearCache(): Promise<void>;
}
```

**Implementação Android:**

```kotlin
override fun fetchData(url: String, promise: Promise) {
    coroutineScope.launch(Dispatchers.IO) {
        try {
            val result = httpClient.get(url)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("FETCH_ERROR", e.message, e)
        }
    }
}
```

**Implementação iOS:**

```objc
- (void)fetchData:(NSString *)url
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSError *error = nil;
        NSString *result = [self->_client GET:url error:&error];
        if (error) {
            reject(@"FETCH_ERROR", error.localizedDescription, error);
        } else {
            resolve(result);
        }
    });
}
```

---

## Tipos de Callback

Válido, mas prefira Promises. Use callbacks apenas quando a API nativa é inerentemente baseada em callback e o overhead de envolver em uma Promise não se justifica.

```typescript
// Válido — callback de uso único
getDeviceId(callback: (id: string) => void): void;

// Melhor — compatível com async/await
getDeviceId(): Promise<string>;
```

Callbacks não podem ser chamados mais de uma vez sem criar uma nova invocação nativa — use `EventEmitter` para eventos recorrentes.

---

## EventEmitter (RN 0.76+)

`EventEmitter` é um tipo de nível de spec que gera código tipado de subscrição de eventos em ambas as plataformas. Ele substitui o antigo padrão `NativeEventEmitter` + `DeviceEventEmitter`.

```typescript
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  startLocationUpdates(intervalMs: number): void;
  stopLocationUpdates(): void;

  readonly onLocationChanged: EventEmitter<Readonly<{
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
  }>>;

  readonly onPermissionChanged: EventEmitter<Readonly<{
    granted: boolean;
    status: string;
  }>>;
}
```

**Emitindo do Android:**

```kotlin
// Codegen gera emitOnLocationChanged — sem chaves de string, totalmente tipado
emitOnLocationChanged(Arguments.createMap().apply {
    putDouble("latitude", location.latitude)
    putDouble("longitude", location.longitude)
    putDouble("accuracy", location.accuracy.toDouble())
    putNull("altitude")
})
```

**Emitindo do iOS:**

```objc
// Codegen gera esta assinatura de método — parâmetros verificados pelo compilador
[self emitOnLocationChangedWithLatitude:location.coordinate.latitude
                              longitude:location.coordinate.longitude
                               accuracy:location.horizontalAccuracy
                               altitude:nil];
```

**Subscrevendo no JS:**

```typescript
useEffect(() => {
    NativeLocation.startLocationUpdates(1000);

    const sub = NativeLocation.onLocationChanged((loc) => {
        // loc é totalmente tipado: { latitude, longitude, accuracy, altitude }
        setCoordinates({ lat: loc.latitude, lng: loc.longitude });
    });

    return () => {
        sub.remove();
        NativeLocation.stopLocationUpdates();
    };
}, []);
```

---

## Tipos Não Suportados — O Codegen Retornará Erro

| Tipo | Por que não é suportado | Alternativa |
|---|---|---|
| `number \| null` | Números mapeiam para tipos primitivos sem representação null em C++ | Use `{ value: number } \| null` ou um valor sentinela |
| `Partial<T>` | O parser do Codegen não resolve utility types | Expanda para campos opcionais explícitos |
| `number \| boolean` | Uniões não-string não são suportadas em parâmetros de método | Dois métodos separados |
| `Map<K, V>` | Sem equivalente JSI | `Object` ou object literal tipado |
| `Set<T>` | Sem equivalente JSI | `Array<T>` com deduplicação no nativo |
| Tipos recursivos | O parser não consegue resolver ciclos | Achate a estrutura |
| Parâmetros de tipo genérico `<T>` | As specs do Codegen devem ser concretas | Especialize por método |
| `Tuple` (`[string, number]`) | Sem equivalente JSI | Use um objeto tipado |

---

## O Custo de Serialização que Não Existe Mais

Com a bridge antiga, todo valor era serializado em JSON e de volta. Com JSI/TurboModules:

- `string` → C++ `std::string` → `jsi::String` — zero-copy no Hermes
- `number` → `double` — primitivo, sem alocação
- `Object` → `jsi::Object` — referência, não uma cópia serializada
- `Array` → `jsi::Array` — referência, não uma cópia serializada

A única serialização que ainda acontece é na **fronteira da implementação nativa** — quando o código Kotlin/Swift constrói um `WritableMap` (Android) ou `NSDictionary` (iOS) para retornar ao JS. Isso é inevitável sem módulos C++ puros, mas o overhead é muito menor do que o modelo antigo de JSON sobre fila.

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [TurboModules Introduction — Appendix](https://reactnative.dev/docs/appendix) | Tabela oficial de mapeamento de tipos |
| [Codegen Missing Features — reactwg #91](https://github.com/reactwg/react-native-new-architecture/discussions/91) | Lista de tipos não suportados e roadmap |
| [Int32 generates double on Java — #45659](https://github.com/facebook/react-native/issues/45659) | Bug de geração de tipo numérico + contorno |
| [EventEmitter PR — facebook/react-native](https://github.com/facebook/react-native/pull/44459) | PR que introduziu EventEmitter tipado às specs do Codegen |

---

Próximo → [Testes e Mocks para Módulos Nativos](./tests-mocks)
