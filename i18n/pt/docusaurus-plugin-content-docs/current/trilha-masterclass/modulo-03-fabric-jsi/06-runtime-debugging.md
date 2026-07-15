---
title: "Runtime — Debugging & E2E"
---

## 4. Depurando a Nova Arquitetura

### Habilitando logs do modo Bridgeless

No RN 0.76, `ReactHost`/`RCTHost` roda em modo bridgeless por padrao. Para habilitar logs detalhados:

```kotlin
// Android — habilita logs de debug em builds de desenvolvimento
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            ReactFeatureFlags.enableBridgelessArchitecture = true
            // Habilita logs detalhados de commit do Fabric
            ReactFeatureFlags.enableFabricLogs = true
        }
    }
}
```

```swift
// iOS — flag de build
// No Xcode: Edit Scheme → Run → Arguments → Adicionar -RCTFabricLogs 1
```

### Depuracao via Chrome DevTools Protocol (CDP)

O RN 0.73+ usa CDP nativamente — voce nao precisa do Flipper para depurar JS:

```bash
# Iniciar o Metro
npx react-native start

# Em outro terminal, conectar ao inspetor CDP
open "chrome://inspect"
# Clicar em "inspect" ao lado do seu dispositivo/simulador

# Ou usar o VS Code com a extensao "React Native Tools":
# Executar a configuracao de debug "Attach to Hermes application"
```

Definir breakpoints em HostFunctions de TurboModules funciona em builds de desenvolvimento. Em release, use guards com `__DEV__` e `console.log`, que direciona para `adb logcat` / console do Xcode.

### Systrace / Perfetto

O Systrace e a ferramenta definitiva para diagnosticar o comportamento das threads no RN:

```bash
# Android — captura 10 segundos de systrace
python $ANDROID_HOME/platform-tools/systrace/systrace.py \
  -t 10 \
  -o trace.html \
  react_native_new_arch \  # categoria de trace customizada do RN
  gfx \                    # GPU/renderizacao
  view \                   # desenho de views
  dalvik                   # eventos de GC
```

Abra `trace.html` na UI do Perfetto. Pontos principais a observar:

| Slice de Trace | Significado |
|---|---|
| `Fabric::commit` | Pipeline de commit do Fabric — deve concluir em < 8ms |
| `JSI::HostFunction::*` | Duracao de cada chamada de HostFunction |
| `yoga::calculateLayout` | Passo de layout — se > 2ms, verifique arvores muito profundas |
| `MountingTransaction::execute` | Tempo para aplicar mutations nas views nativas |
| `Choreographer#doFrame` | Budget de frame VSync do Android (16,6ms a 60fps) |

Se `Fabric::commit` ultrapassar o deadline do VSync, um frame sera descartado. Causas comuns:
- Muitos nos na shadow tree (achate com `collapsable={true}` — e o padrao)
- Chamadas grandes de `measureInWindow` durante o layout
- Chamadas sincronas a TurboModules que executam I/O pesado na thread JS

### Hermes sampling profiler

```typescript
// Profiling in-app — habilite apenas em builds de desenvolvimento
import { HermesProfiling } from 'react-native';

// Inicia a captura
HermesProfiling.startSamplingProfiler();

// ... execute algo custoso ...

// Para e obtem o perfil
const profile = await HermesProfiling.stopSamplingProfiler();
// profile e uma string JSON no formato de perfil de CPU do Chrome
// Salve-a e abra com chrome://inspect → Profiler → Load profile
```

O flame chart resultante mostra:
- Tempo gasto em cada funcao JS
- Tempo gasto em chamadas de HostFunction JSI (aparecem como frames `[native]`)
- Duracoes das pausas de GC

### React DevTools Profiler

O React DevTools Profiler registra os tempos de renderizacao dos componentes:

```bash
# Instala o React DevTools standalone
npm install -g react-devtools@latest
react-devtools
```

Com o app rodando em modo de desenvolvimento, clique na aba Profiler e grave. Apos uma interacao com a UI, o flame chart mostra:
- Quais componentes re-renderizaram
- Por que re-renderizaram (a anotacao `why did you render?`)
- Duracao da renderizacao

Este e o primeiro passo quando uma interacao com a UI parece lenta — antes de recorrer ao Perfetto.

### Feature Flags e rollout gradual

A Nova Arquitetura inclui diversas feature flags que permitem controlar quais funcionalidades estao ativas. Sao uteis para isolar regressoes:

```kotlin
// Android — ReactFeatureFlags.kt
ReactFeatureFlags.apply {
  enableBridgelessArchitecture = true       // padrao: true no 0.76
  enableFabricLogs = BuildConfig.DEBUG
  useModernEventCoalescing = true           // agrupa eventos de scroll rapidos
  enableEagerRootViewAttachment = true      // anexa a root view antes de o JS carregar
  enableBackgroundExecutor = false          // experimental: layout em thread de fundo
}
```

```objc
// iOS — RCTFeatureFlags.h
RCTFeatureFlags::enableBridgelessArchitecture() = true;
RCTFeatureFlags::enableFabricLogs() = RCT_DEBUG;
```

Se voce suspeitar de uma regressao no Fabric, defina `enableBridgelessArchitecture = false` para voltar a bridge legada. Este e o passo canonico de bisect — se a regressao desaparecer, e um bug da Nova Arquitetura; se persistir, o bug esta no seu JavaScript.

---

## 5. De Ponta a Ponta: Um TurboModule Real

A seguir ha um TurboModule completo e pronto para producao. Ele le de um keychain nativo de forma sincrona via JSI e escreve de forma assincrona.

### Spec TypeScript

```typescript
// NativeSecureStorage.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface SecureItem {
  value: string;
  createdAt: number;
  expiresAt?: number | null;
}

export interface Spec extends TurboModule {
  // Sincrono — le de um cache em memoria respaldado pelo keychain
  getSync(key: string): string | null;
  
  // Assincrono — escreve no keychain (I/O, deve ser async)
  set(key: string, value: string, ttlSeconds?: number | null): Promise<void>;
  delete(key: string): Promise<boolean>;
  
  // Lista todas as chaves (sincrono — usa indice em cache)
  listKeys(): string[];
}

export default TurboModuleRegistry.getEnforcing<Spec>('SecureStorage');
```

### Implementacao Android

```kotlin
// SecureStorageModule.kt
class SecureStorageModule(
    reactContext: ReactApplicationContext,
    private val keychain: SecureKeychainService,
) : NativeSecureStorageSpec(reactContext) {

    // Cache em memoria para leituras sincronas
    private val cache = ConcurrentHashMap<String, String>()

    override fun getName() = NAME

    // Chamado na thread JS — deve ser rapido
    override fun getSync(key: String): String? = cache[key]

    // Chamado na thread JS — retorna Promise, trabalho feito na thread de IO
    override fun set(key: String, value: String, ttlSeconds: Double?): Promise {
        return createPromise { resolve, reject ->
            Executors.newSingleThreadExecutor().submit {
                try {
                    keychain.store(key, value, ttlSeconds?.toLong())
                    cache[key] = value  // atualiza cache (thread-safe via ConcurrentHashMap)
                    resolve.resolve(null)
                } catch (e: Exception) {
                    reject.reject("KEYCHAIN_ERROR", e.message, e)
                }
            }
        }
    }

    override fun delete(key: String): Promise {
        return createPromise { resolve, reject ->
            Executors.newSingleThreadExecutor().submit {
                try {
                    val existed = keychain.delete(key)
                    cache.remove(key)
                    resolve.resolve(existed)
                } catch (e: Exception) {
                    reject.reject("KEYCHAIN_ERROR", e.message, e)
                }
            }
        }
    }

    override fun listKeys(): WritableArray {
        return Arguments.createArray().apply {
            cache.keys.forEach { pushString(it) }
        }
    }

    companion object {
        const val NAME = "SecureStorage"
    }
}
```

### Implementacao iOS

```swift
// SecureStorageModule.mm
#import "NativeSecureStorageSpec.h"  // gerado pelo Codegen

@implementation RCTSecureStorageModule {
    SecureKeychainService* _keychain;
    NSMutableDictionary<NSString*, NSString*>* _cache;
    dispatch_queue_t _ioQueue;
}

RCT_EXPORT_MODULE(SecureStorage)

- (instancetype)init {
    if (self = [super init]) {
        _keychain = [[SecureKeychainService alloc] init];
        _cache = [NSMutableDictionary dictionary];
        _ioQueue = dispatch_queue_create("com.app.SecureStorage", DISPATCH_QUEUE_SERIAL);
    }
    return self;
}

// Sincrono — thread JS, sem necessidade de await no JS
- (NSString* _Nullable)getSync:(NSString*)key {
    @synchronized(_cache) {
        return _cache[key];
    }
}

// Assincrono — I/O na fila serial
- (void)set:(NSString*)key value:(NSString*)value ttlSeconds:(NSNumber* _Nullable)ttl
    resolve:(RCTPromiseResolveBlock)resolve
    reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(_ioQueue, ^{
        NSError* error;
        [self->_keychain store:key value:value ttl:ttl error:&error];
        if (error) {
            reject(@"KEYCHAIN_ERROR", error.localizedDescription, error);
        } else {
            @synchronized(self->_cache) { self->_cache[key] = value; }
            resolve(nil);
        }
    });
}

- (void)delete:(NSString*)key
    resolve:(RCTPromiseResolveBlock)resolve
    reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(_ioQueue, ^{
        NSError* error;
        BOOL existed = [self->_keychain delete:key error:&error];
        if (error) {
            reject(@"KEYCHAIN_ERROR", error.localizedDescription, error);
        } else {
            @synchronized(self->_cache) { [self->_cache removeObjectForKey:key]; }
            resolve(@(existed));
        }
    });
}

- (NSArray<NSString*>*)listKeys {
    @synchronized(_cache) {
        return _cache.allKeys;
    }
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams&)params {
    return std::make_shared<facebook::react::NativeSecureStorageSpecJSI>(params);
}

@end
```

### Consumo em JavaScript

```typescript
// useSecureStorage.ts
import NativeSecureStorage from './NativeSecureStorage';
import { useCallback, useEffect, useState } from 'react';

export function useSecureStorage(key: string) {
  // Le sincronamente — sem estado de carregamento para o valor em cache
  const [value, setValue] = useState<string | null>(() =>
    NativeSecureStorage.getSync(key)
  );

  const store = useCallback(async (newValue: string, ttl?: number) => {
    await NativeSecureStorage.set(key, newValue, ttl ?? null);
    setValue(newValue);  // atualiza estado local apos persistir
  }, [key]);

  const remove = useCallback(async () => {
    const existed = await NativeSecureStorage.delete(key);
    if (existed) setValue(null);
  }, [key]);

  return { value, store, remove };
}
```

### Expo Snack — padrao de interacao com TurboModule

Este snack demonstra a chamada sincrona a um TurboModule (DeviceInfo) e a ausencia de estado de carregamento:

https://snack.expo.dev/@react-native-community/device-info-example

No Snack, observe a aba Network — nao ha nenhuma requisicao HTTP para os valores de informacoes do dispositivo. Eles chegam diretamente via JSI.

---

## Materiais de Estudo

### Codigo-fonte Oficial

| Recurso | O que voce encontrara |
|---|---|
| [`ReactFeatureFlags.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/featureflags/ReactNativeFeatureFlags.h) | Todas as feature flags da Nova Arquitetura — bridgeless, Fabric, renderizacao concorrente |
| [`TurboModule.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/ReactCommon/TurboModule.h) | Classe base C++ de TurboModule |
| [`TurboModuleBinding.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/TurboModuleBinding.cpp) | Como `__turboModuleProxy` e instalado no global JS |
| [`BridgelessJSCallInvoker.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/bridgeless/BridgelessJSCallInvoker.cpp) | CallInvoker para o modo bridgeless — como callbacks C++ assincronos chegam ao JS |
| [`Codegen scripts`](https://github.com/facebook/react-native/tree/main/packages/react-native-codegen/src) | Codigo-fonte do gerador TypeScript → C++ |

### Documentacao Oficial

| Recurso | Descricao |
|---|---|
| [New Architecture Introduction](https://reactnative.dev/docs/the-new-architecture/landing-page) | Visao geral oficial e justificativa de cada componente |
| [TurboModules Guide](https://reactnative.dev/docs/turbo-native-modules-introduction) | Passo a passo: spec → Codegen → implementacao nativa |
| [Hermes Guide](https://reactnative.dev/docs/hermes) | Habilitando, perfilando e configurando o Hermes |
| [Debugging New Architecture](https://reactnative.dev/docs/debugging-native-code) | CDP, Flipper, Systrace — referencia oficial de depuracao |
| [React Native DevTools](https://reactnative.dev/docs/react-native-devtools) | O novo depurador unificado (experimental no 0.76) |

### Aprofundamentos

| Recurso | Autor | O que voce vai aprender |
|---|---|---|
| [How React Native New Architecture works](https://www.callstack.com/blog/new-react-native-architecture-explained) | Callstack | Codegen → JSI → TurboModules → Fabric: o modelo mental completo |
| [TurboModules deep dive](https://blog.swmansion.com/turbomodules-the-new-native-modules-in-react-native-b4b1d90d80db) | Software Mansion | Type safety, lazy loading, detalhes da camada de interoperabilidade |
| [React Native Reanimated 3 internals](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary) | Software Mansion | Uso real do JSI em producao para threading de worklets |
| [op-sqlite — synchronous SQLite via JSI](https://ospfranco.com/post/2023/06/26/op-sqlite-fastest-sqlite-for-react-native/) | Oscar Franco | Implementacao JSI completa de um banco de dados sincrono |
| [Hermes Memory model and GC](https://hermesengine.dev/docs/gc/) | Hermes team | Algoritmo de GC, layout do heap, como reduzir pressao no GC |

### Video Tutoriais

| Recurso | Duracao | O que voce vai aprender |
|---|---|---|
| [React Native New Architecture — Complete Guide](https://www.youtube.com/watch?v=BPQKE3Yb7vI) | 45 min | Walkthrough dos tres pilares: JSI, Fabric, TurboModules |
| [TurboModules in practice](https://www.youtube.com/watch?v=GNCrFv_h0tE) | 28 min | Construa um TurboModule do zero com Codegen |
| [Hermes profiling in production](https://www.youtube.com/watch?v=Ma5MLdCAfRQ) | 20 min | Amostragem de CPU, snapshots de heap, ajuste de GC |
| [React Native Europe 2023 — Debugging New Arch](https://www.youtube.com/watch?v=tJGMJiSTkEU) | 35 min | CDP, Perfetto, Hermes profiler — demo ao vivo |
| [App.js Conf 2024 — Concurrent RN in production](https://www.youtube.com/watch?v=Ck0N9FsKAhI) | 30 min | `useTransition`, Suspense e Fabric em um app real |

### Interativo

| Recurso | O que fazer |
|---|---|
| [React Native New Architecture playground](https://snack.expo.dev/) | Crie um Snack, abra o React DevTools Profiler, grave uma renderizacao |
| [Hermes playground](https://playground.hermesengine.dev/) | Cole JS, inspecione a saida de bytecode, veja as atribuicoes de registradores |
| [Yoga playground](https://yogalayout.dev/playground) | Teste regras de Flexbox, veja os numeros de layout calculados |
| [reactwg/react-native-new-architecture](https://github.com/reactwg/react-native-new-architecture/discussions) | Discussoes do grupo de trabalho — fonte da verdade para decisoes de migracao |

---

← [Fabric — New Renderer](./02-fabric-renderer.md) | Modulo 03 concluido
