---
title: "Runtime — Hermes & Codegen"
---

# Runtime — New Architecture

> **Modulo 03 — React Native Masterclass**
> Publico-alvo: engenheiros senior que precisam entender como todas as partes da New Architecture se conectam — do bytecode Hermes aos commits do Fabric e chamadas de TurboModule.
> React Native 0.76+ — modo Bridgeless, Codegen, JSI-first.

---

## 1. JS com o Engine Hermes

### O pipeline completo de execucao

Quando seu app inicia, o seguinte acontece antes de um unico componente React renderizar:

```
Lancamento do app
    │
    ▼
ReactHost.start() / RCTHost.start()
    │
    ├─ Inicializa a VM Hermes (uma por ReactHost)
    │      └─ Inicializa GC, config do runtime, objetos built-in
    │
    ├─ Carrega o bundle JS
    │      ├─ Se release: le .hbc do disco (mmap)
    │      └─ Se debug: busca do Metro bundler (HTTP)
    │
    ├─ Executa o bundle (Hermes avalia o codigo de modulo de nivel superior)
    │      └─ AppRegistry.registerComponent('App', () => App)
    │
    ├─ Instala bindings TurboModule (JSI)
    │      └─ global.__turboModuleProxy = C++ HostObject
    │
    ├─ Instala bindings Fabric (JSI)
    │      └─ global.nativeFabricUIManager = C++ HostObject
    │
    └─ Chama AppRegistry.runApplication('App', { ... })
           └─ React monta a raiz, Fabric cria a Shadow Tree
```

### Configuracao do Hermes

`ReactNativeHost` (Android) e `RCTHost` (iOS) aceitam um `RuntimeConfig` que controla o comportamento do Hermes:

```kotlin
// Android — configura o Hermes via HermesExecutorFactory
class MyReactNativeHost(application: Application) : DefaultReactNativeHost(application) {

    override val isHermesEnabled = true

    override fun getJSExecutorFactory(): JSExecutorFactory {
        return HermesExecutorFactory(
            RuntimeConfig.Builder()
                .withEnableSampleProfiling(BuildConfig.DEBUG)
                .withGCConfig(
                    GCConfig.Builder()
                        // 256 MB de heap — ajuste para o tier de dispositivo alvo
                        .withMaxHeapSize(256 * 1024 * 1024)
                        .build()
                )
                .build()
        )
    }
}
```

```swift
// iOS — configura via RCTHermesInstance
final class AppJSEngineProvider: RCTJSEngineProvider {
    func createJSEngine() -> any RCTJSRuntime {
        var config = HermesRuntimeConfig()
        config.gcConfig.maxHeapSize = 256 * 1024 * 1024  // 256 MB
        config.enableSampleProfiling = false              // desabilita em release
        return RCTHermesInstance(runtimeConfig: config, onUnhandledError: nil)
    }
}
```

---

## 2. Bytecode e Compilacao

### Como o Hermes compila JavaScript

O Hermes tem dois modos de compilacao:

**AOT sem JIT (o padrao para builds de release)**

```
source.js  ──compilador hermes──►  source.hbc  ──embarcado no APK/IPA──►  dispositivo
```

A compilacao acontece em tempo de build, nao em tempo de execucao. O dispositivo nunca ve JavaScript textual — apenas bytecode pre-parseado e pre-compilado.

**Interpretacao sem JIT (builds de debug)**

```
Servidor Metro  ──serve──►  source.js  ──hermes parseia em runtime──►  AST ──►  bytecode em RAM
```

Builds de debug nao usam `.hbc` porque os source maps precisam ser precisos linha a linha.

### O formato de bytecode

O bytecode do Hermes e um conjunto de instrucoes de VM baseado em registradores (nao em pilha). Cada funcao no seu bundle JS se torna uma sequencia de instrucoes de maquina de registradores:

```
// JS original:
function add(a, b) { return a + b; }

// Bytecode Hermes (dump legivel por humanos via `hermes -dump-bytecode`):
Function<add>(2 params, 1 registers):
  Add       r0, a0, a1   ; r0 = a + b
  Ret       r0           ; return r0
```

Compare com a saida JIT do JSC: o JSC gera codigo de maquina (ARM64/x86) em tempo de execucao. O Hermes pula isso — ele interpreta bytecode diretamente. Para a maioria das cargas de trabalho React Native (renderizacao de UI, chamadas de API, gerenciamento de estado), a interpretacao e rapida o suficiente e o ganho no cold-start e significativo.

### Medindo o impacto da compilacao

```bash
# Gerar um APK de release com Hermes
./gradlew assembleRelease

# Inspecionar o bytecode dentro do bundle
unzip -p app/build/outputs/apk/release/app-release.apk assets/index.android.bundle \
  | file -

# Saida esperada:
# Hermes JavaScript compiler bytecode, version 96

# Medir o tempo de carregamento do bundle com systrace
adb shell am start -n com.yourapp/.MainActivity
adb shell am profile start com.yourapp --sampling 1000
# ... deixa o app carregar ...
adb shell am profile stop com.yourapp
```

No Perfetto / Android Studio CPU Profiler, procure por:
- `HermesExecutor::loadBundle` — tempo para fazer mmap do arquivo .hbc
- `Runtime::callFunction` — tempo para executar `AppRegistry.runApplication`

### RAM Bundle vs Hermes Bytecode

Antes do Hermes, a melhor otimizacao de startup era o RAM Bundle (secoes indexadas para que o Metro carregasse apenas os modulos realmente necessarios na inicializacao). Com Hermes, o RAM Bundle e desnecessario — `.hbc` ja e mais eficiente que o RAM bundle. Voce **nao deve** usar `bundleCommand: 'ram-bundle'` quando o Hermes esta habilitado.

| Estrategia | Beneficio no cold-start | Trade-off |
|---|---|---|
| Hermes .hbc | Parse + JIT eliminados | Compilacao AOT em tempo de build |
| RAM Bundle | Carrega apenas modulos necessarios | Exige indexacao JS, incompativel com Hermes |
| Hermes + inline requires | Reduz ainda mais o codigo avaliado na inicializacao | Complexidade no codigo-fonte |

### Inline requires (avaliacao lazy de modulos)

Mesmo com bytecode Hermes, cada `require()` no nivel superior do modulo executa no carregamento do bundle. Inline requires adiam isso:

```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,  // transforma requires de nivel superior em getters lazy
      },
    }),
  },
};
```

Com `inlineRequires: true`, este codigo:

```javascript
import HeavyLibrary from 'heavy-library';  // avaliado imediatamente no carregamento

export function doSomething() {
  return HeavyLibrary.compute();
}
```

Torna-se no nivel de bytecode:

```javascript
// O import e adiado ate a primeira chamada a doSomething()
export function doSomething() {
  const HeavyLibrary = require('heavy-library');  // agora lazy
  return HeavyLibrary.compute();
}
```

E por isso que `enableInlineRequires` em `react-native.config.js` melhora significativamente o TTI (time to interactive) em apps com muitas dependencias.

---

## 3. Interacao: Codegen / Fabric / TurboModules

Esta secao explica como os tres pilares da New Architecture se conectam e quem chama quem.

### O diagrama completo de interacao

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         TEMPO DE BUILD                                        │
│                                                                               │
│  Specs TypeScript                                                             │
│    ├── NativeMyModule.ts  ──codegen──►  Header C++ TurboModuleSpec            │
│    └── NativeMyView.ts   ──codegen──►  C++ ShadowNode + Props + EventEmitter  │
└───────────────────────────────────────────────────────────────────────────────┘
                    │ compilado no binario do app
┌───────────────────────────────────────────────────────────────────────────────┐
│                         TEMPO DE EXECUCAO                                     │
│                                                                               │
│  VM Hermes                                                                    │
│    └─ global.__turboModuleProxy (JSI HostObject)                              │
│         └─ JS chama: TurboModuleRegistry.get('MyModule')                      │
│               └─► C++ TurboModuleProxy consulta o registry                   │
│                     └─► Retorna JSI HostObject encapsulando a impl nativa     │
│                           └─► JS chama metodos diretamente via JSI            │
│                                                                               │
│  global.nativeFabricUIManager (JSI HostObject)                                │
│    └─ React chama: createNode, appendChild, commitTree                        │
│         └─► Fabric C++ cria/atualiza ShadowNodes                             │
│               └─► Yoga calcula o layout                                       │
│                     └─► MountingCoordinator → thread de UI → views nativas    │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Codegen em detalhes

Codegen e um gerador de codigo em tempo de build que le specs TypeScript e emite headers C++. Ele elimina as "magic strings" que assombravam a arquitetura antiga (onde `NativeModules.MyModule.doThing()` era uma busca em dicionario em tempo de execucao que podia falhar silenciosamente).

Executando o Codegen manualmente:

```bash
# Da raiz do projeto
node node_modules/react-native/scripts/generate-codegen-artifacts.js \
  --path . \
  --outputPath android/app/build/generated/source/codegen
```

O que ele gera para uma spec TurboModule:

```typescript
// Input: NativeCalculator.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  add(a: number, b: number): number;
  computeAsync(n: number): Promise<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Calculator');
```

```cpp
// Output: NativeCalculatorSpec.h (gerado)
#pragma once
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace facebook::react {

JSI_EXPORT extern const char CalculatorModuleName[];

class JSI_EXPORT NativeCalculatorCxxSpec
    : public TurboModule {
public:
  NativeCalculatorCxxSpec(std::shared_ptr<CallInvoker> jsInvoker)
      : TurboModule(CalculatorModuleName, jsInvoker) {
    // Cada metodo e registrado como uma JSI HostFunction
    methodMap_["add"] = MethodMetadata{2, __hostFunction_NativeCalculatorCxxSpec_add};
    methodMap_["computeAsync"] = MethodMetadata{1, __hostFunction_NativeCalculatorCxxSpec_computeAsync};
  }

  // Puramente virtual — voce implementa nos seu TurboModule
  virtual double add(jsi::Runtime& rt, double a, double b) = 0;
  virtual jsi::Value computeAsync(jsi::Runtime& rt, double n) = 0;
};

} // namespace facebook::react
```

Sua implementacao apenas herda desta classe:

```cpp
// CalculatorModule.cpp — voce escreve esta parte
class CalculatorModule : public NativeCalculatorCxxSpec {
public:
  CalculatorModule(std::shared_ptr<CallInvoker> jsInvoker)
      : NativeCalculatorCxxSpec(jsInvoker) {}

  double add(jsi::Runtime& rt, double a, double b) override {
    return a + b;  // sincrono, roda na thread JS
  }

  jsi::Value computeAsync(jsi::Runtime& rt, double n) override {
    // Constroi uma Promise, agenda trabalho pesado em thread de background
    return createPromiseAsJSIValue(rt, [n, this](
        jsi::Runtime& rt,
        std::shared_ptr<Promise> promise
    ) {
      backgroundQueue_.submit([n, promise]() {
        double result = expensiveCompute(n);
        promise->resolve(result);
      });
    });
  }

private:
  ThreadPool backgroundQueue_;
};
```

### Carregamento lazy de TurboModule

Na arquitetura antiga, todos os modulos nativos eram instanciados na inicializacao independentemente de serem usados. TurboModules sao **instanciados de forma lazy** — o objeto nativo e criado apenas quando o JS chama `TurboModuleRegistry.get('NomeDoModulo')` pela primeira vez.

E por isso que apps RN grandes veem melhorias de startup com a New Architecture: um modulo para, digamos, `BluetoothModule` nunca e inicializado se o usuario nunca visitar uma tela de Bluetooth.

```typescript
// JS: padrao de carregamento lazy — nao chame getEnforcing no nivel do modulo
// RUIM — modulo instanciado no momento do carregamento do bundle
import NativeBluetoothModule from './NativeBluetoothModule'; // dispara init imediatamente

// BOM — modulo instanciado apenas quando a funcao e chamada
function scanForDevices() {
  const bluetooth = TurboModuleRegistry.get('BluetoothModule');
  if (!bluetooth) throw new Error('Bluetooth not available');
  return bluetooth.scan();
}
```

### Loop de eventos TurboModule + Fabric

A coisa mais importante a entender e que na New Architecture **nao ha um tick do event loop entre uma chamada TurboModule e seu retorno sincrono**. A bridge antiga forcava tudo por uma fila, o que significava que o nativo nunca podia retornar um valor para o JS no mesmo frame. O JSI elimina isso:

```typescript
// RN 0.76 — chamada TurboModule sincrona
const NativeKeychain = TurboModuleRegistry.getEnforcing('Keychain');

// Isso executa C++ de forma sincrona na thread JS — sem await necessario
const value = NativeKeychain.getSync('session_token');

// Atualizacao de UI disparada por leitura sincrona — resolve no mesmo frame
setAuthToken(value);
```

Como o Fabric sabe sobre essa atualizacao? A cadeia de chamadas:

1. `setAuthToken(value)` → React agenda uma atualizacao de prioridade discreta
2. O reconciliador React produz uma nova arvore de elementos
3. Fabric C++ recebe a nova arvore via `nativeFabricUIManager.createNode` (JSI, sincrono)
4. Layout calculado em C++
5. `MountingTransaction` despachada para a thread de UI
6. Views nativas atualizadas — tudo dentro do mesmo frame VSync

---
