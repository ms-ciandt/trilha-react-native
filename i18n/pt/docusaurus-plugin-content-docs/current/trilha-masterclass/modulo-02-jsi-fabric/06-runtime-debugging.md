---
title: "Runtime — Debugging & E2E"
---

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc03_06_runtime-debugging.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc03_06_runtime-debugging.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## 4. Depurando a Nova Arquitetura

### Habilitando logs do modo Bridgeless

No RN 0.76, `ReactHost`/`RCTHost` roda em modo bridgeless por padrão. Para habilitar logs detalhados:

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

### Depuração via Chrome DevTools Protocol (CDP)

O RN 0.73+ usa CDP nativamente — você não precisa do Flipper para depurar JS:

```bash
# Iniciar o Metro
npx react-native start

# Em outro terminal, conectar ao inspetor CDP
open "chrome://inspect"
# Clicar em "inspect" ao lado do seu dispositivo/simulador

# Ou usar o VS Code com a extensão "React Native Tools":
# Executar a configuração de debug "Attach to Hermes application"
```

Definir breakpoints em HostFunctions de TurboModules funciona em builds de desenvolvimento. Em release, use guards com `__DEV__` e `console.log`, que direciona para `adb logcat` / console do Xcode.

### Systrace / Perfetto

O Systrace é a ferramenta definitiva para diagnosticar o comportamento das threads no RN:

```bash
# Android — captura 10 segundos de systrace
python $ANDROID_HOME/platform-tools/systrace/systrace.py \
  -t 10 \
  -o trace.html \
  react_native_new_arch \  # categoria de trace customizada do RN
  gfx \                    # GPU/renderização
  view \                   # desenho de views
  dalvik                   # eventos de GC
```

Abra `trace.html` na UI do Perfetto. Pontos principais a observar:

| Slice de Trace | Significado |
|---|---|
| `Fabric::commit` | Pipeline de commit do Fabric — deve concluir em < 8ms |
| `JSI::HostFunction::*` | Duração de cada chamada de HostFunction |
| `yoga::calculateLayout` | Passo de layout — se > 2ms, verifique árvores muito profundas |
| `MountingTransaction::execute` | Tempo para aplicar mutations nas views nativas |
| `Choreographer#doFrame` | Budget de frame VSync do Android (16,6ms a 60fps) |

Se `Fabric::commit` ultrapassar o deadline do VSync, um frame será descartado. Causas comuns:
- Muitos nós na shadow tree (achate com `collapsable={true}` — é o padrão)
- Chamadas grandes de `measureInWindow` durante o layout
- Chamadas síncronas a TurboModules que executam I/O pesado na thread JS

### Hermes sampling profiler

```typescript
// Profiling in-app — habilite apenas em builds de desenvolvimento
import { HermesProfiling } from 'react-native';

// Inicia a captura
HermesProfiling.startSamplingProfiler();

// ... execute algo custoso ...

// Para e obtém o perfil
const profile = await HermesProfiling.stopSamplingProfiler();
// profile é uma string JSON no formato de perfil de CPU do Chrome
// Salve-a e abra com chrome://inspect → Profiler → Load profile
```

O flame chart resultante mostra:
- Tempo gasto em cada função JS
- Tempo gasto em chamadas de HostFunction JSI (aparecem como frames `[native]`)
- Durações das pausas de GC

### React DevTools Profiler

O React DevTools Profiler registra os tempos de renderização dos componentes:

```bash
# Instala o React DevTools standalone
npm install -g react-devtools@latest
react-devtools
```

Com o app rodando em modo de desenvolvimento, clique na aba Profiler e grave. Após uma interação com a UI, o flame chart mostra:
- Quais componentes re-renderizaram
- Por que re-renderizaram (a anotação `why did you render?`)
- Duração da renderização

Este é o primeiro passo quando uma interação com a UI parece lenta — antes de recorrer ao Perfetto.

### Feature Flags e rollout gradual

A Nova Arquitetura inclui diversas feature flags que permitem controlar quais funcionalidades estão ativas. São úteis para isolar regressões:

```kotlin
// Android — ReactFeatureFlags.kt
ReactFeatureFlags.apply {
  enableBridgelessArchitecture = true       // padrão: true no 0.76
  enableFabricLogs = BuildConfig.DEBUG
  useModernEventCoalescing = true           // agrupa eventos de scroll rápidos
  enableEagerRootViewAttachment = true      // anexa a root view antes de o JS carregar
  enableBackgroundExecutor = false          // experimental: layout em thread de fundo
}
```

```objc
// iOS — RCTFeatureFlags.h
RCTFeatureFlags::enableBridgelessArchitecture() = true;
RCTFeatureFlags::enableFabricLogs() = RCT_DEBUG;
```

Se você suspeitar de uma regressão no Fabric, defina `enableBridgelessArchitecture = false` para voltar à bridge legada. Este é o passo canônico de bisect — se a regressão desaparecer, é um bug da Nova Arquitetura; se persistir, o bug está no seu JavaScript.

---

## 5. De Ponta a Ponta: Um TurboModule Real

A seguir há um TurboModule completo e pronto para produção. Ele lê de um keychain nativo de forma síncrona via JSI e escreve de forma assíncrona.

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
  // Síncrono — lê de um cache em memória respaldado pelo keychain
  getSync(key: string): string | null;
  
  // Assíncrono — escreve no keychain (I/O, deve ser async)
  set(key: string, value: string, ttlSeconds?: number | null): Promise<void>;
  delete(key: string): Promise<boolean>;
  
  // Lista todas as chaves (síncrono — usa índice em cache)
  listKeys(): string[];
}

export default TurboModuleRegistry.getEnforcing<Spec>('SecureStorage');
```

### Implementação Android

```kotlin
// SecureStorageModule.kt
class SecureStorageModule(
    reactContext: ReactApplicationContext,
    private val keychain: SecureKeychainService,
) : NativeSecureStorageSpec(reactContext) {

    // Cache em memória para leituras síncronas
    private val cache = ConcurrentHashMap<String, String>()

    override fun getName() = NAME

    // Chamado na thread JS — deve ser rápido
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

### Implementação iOS

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

// Síncrono — thread JS, sem necessidade de await no JS
- (NSString* _Nullable)getSync:(NSString*)key {
    @synchronized(_cache) {
        return _cache[key];
    }
}

// Assíncrono — I/O na fila serial
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
  // Lê sincronamente — sem estado de carregamento para o valor em cache
  const [value, setValue] = useState<string | null>(() =>
    NativeSecureStorage.getSync(key)
  );

  const store = useCallback(async (newValue: string, ttl?: number) => {
    await NativeSecureStorage.set(key, newValue, ttl ?? null);
    setValue(newValue);  // atualiza estado local após persistir
  }, [key]);

  const remove = useCallback(async () => {
    const existed = await NativeSecureStorage.delete(key);
    if (existed) setValue(null);
  }, [key]);

  return { value, store, remove };
}
```

### Expo Snack — padrão de interação com TurboModule

Este snack demonstra a chamada síncrona a um TurboModule (DeviceInfo) e a ausência de estado de carregamento:

https://snack.expo.dev/@react-native-community/device-info-example

No Snack, observe a aba Network — não há nenhuma requisição HTTP para os valores de informações do dispositivo. Eles chegam diretamente via JSI.

---

## Materiais de Estudo

### Código-fonte Oficial

| Recurso | O que você encontrará |
|---|---|
| [`ReactFeatureFlags.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/featureflags/ReactNativeFeatureFlags.h) | Todas as feature flags da Nova Arquitetura — bridgeless, Fabric, renderização concorrente |
| [`TurboModule.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/ReactCommon/TurboModule.h) | Classe base C++ de TurboModule |
| [`TurboModuleBinding.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/TurboModuleBinding.cpp) | Como `__turboModuleProxy` é instalado no global JS |
| [`BridgelessJSCallInvoker.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/bridgeless/BridgelessJSCallInvoker.cpp) | CallInvoker para o modo bridgeless — como callbacks C++ assíncronos chegam ao JS |
| [`Codegen scripts`](https://github.com/facebook/react-native/tree/main/packages/react-native-codegen/src) | Código-fonte do gerador TypeScript → C++ |

### Documentação Oficial

| Recurso | Descrição |
|---|---|
| [New Architecture Introduction](https://reactnative.dev/docs/the-new-architecture/landing-page) | Visão geral oficial e justificativa de cada componente |
| [TurboModules Guide](https://reactnative.dev/docs/turbo-native-modules-introduction) | Passo a passo: spec → Codegen → implementação nativa |
| [Hermes Guide](https://reactnative.dev/docs/hermes) | Habilitando, perfilando e configurando o Hermes |
| [Debugging New Architecture](https://reactnative.dev/docs/debugging-native-code) | CDP, Flipper, Systrace — referência oficial de depuração |
| [React Native DevTools](https://reactnative.dev/docs/react-native-devtools) | O novo depurador unificado (experimental no 0.76) |

### Aprofundamentos

| Recurso | Autor | O que você vai aprender |
|---|---|---|
| [How React Native New Architecture works](https://www.callstack.com/blog/new-react-native-architecture-explained) | Callstack | Codegen → JSI → TurboModules → Fabric: o modelo mental completo |
| [TurboModules deep dive](https://blog.swmansion.com/turbomodules-the-new-native-modules-in-react-native-b4b1d90d80db) | Software Mansion | Type safety, lazy loading, detalhes da camada de interoperabilidade |
| [React Native Reanimated 3 internals](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary) | Software Mansion | Uso real do JSI em produção para threading de worklets |
| [op-sqlite — synchronous SQLite via JSI](https://ospfranco.com/post/2023/06/26/op-sqlite-fastest-sqlite-for-react-native/) | Oscar Franco | Implementação JSI completa de um banco de dados síncrono |
| [Hermes Memory model and GC](https://hermesengine.dev/docs/gc/) | Hermes team | Algoritmo de GC, layout do heap, como reduzir pressão no GC |

### Vídeo Tutoriais

| Recurso | Duração | O que você vai aprender |
|---|---|---|
| [React Native New Architecture — Complete Guide](https://www.youtube.com/watch?v=BPQKE3Yb7vI) | 45 min | Walkthrough dos três pilares: JSI, Fabric, TurboModules |
| [TurboModules in practice](https://www.youtube.com/watch?v=GNCrFv_h0tE) | 28 min | Construa um TurboModule do zero com Codegen |
| [Hermes profiling in production](https://www.youtube.com/watch?v=Ma5MLdCAfRQ) | 20 min | Amostragem de CPU, snapshots de heap, ajuste de GC |
| [React Native Europe 2023 — Debugging New Arch](https://www.youtube.com/watch?v=tJGMJiSTkEU) | 35 min | CDP, Perfetto, Hermes profiler — demo ao vivo |
| [App.js Conf 2024 — Concurrent RN in production](https://www.youtube.com/watch?v=Ck0N9FsKAhI) | 30 min | `useTransition`, Suspense e Fabric em um app real |

### Interativo

| Recurso | O que fazer |
|---|---|
| [React Native New Architecture playground](https://snack.expo.dev/) | Crie um Snack, abra o React DevTools Profiler, grave uma renderização |
| [Hermes playground](https://playground.hermesengine.dev/) | Cole JS, inspecione a saída de bytecode, veja as atribuições de registradores |
| [Yoga playground](https://yogalayout.dev/playground) | Teste regras de Flexbox, veja os números de layout calculados |
| [reactwg/react-native-new-architecture](https://github.com/reactwg/react-native-new-architecture/discussions) | Discussões do grupo de trabalho — fonte da verdade para decisões de migração |

---

← [Fabric — New Renderer](./02-fabric-renderer.md) | Módulo 03 concluído
