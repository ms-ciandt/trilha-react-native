---
title: "Runtime — Hermes & Codegen"
---

# Runtime — New Architecture

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc03_05_runtime-new-architecture.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc03_05_runtime-new-architecture.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> **Módulo 03 — React Native Masterclass**
> Público-alvo: engenheiros sênior que precisam entender como todas as partes da New Architecture se conectam — do bytecode Hermes aos commits do Fabric e chamadas de TurboModule.
> React Native 0.76+ — modo Bridgeless, Codegen, JSI-first.

---

## 1. JS com o Engine Hermes

### O pipeline completo de execução

Quando seu app inicia, o seguinte acontece antes de um único componente React renderizar:

```
Lançamento do app
    │
    ▼
ReactHost.start() / RCTHost.start()
    │
    ├─ Inicializa a VM Hermes (uma por ReactHost)
    │      └─ Inicializa GC, config do runtime, objetos built-in
    │
    ├─ Carrega o bundle JS
    │      ├─ Se release: lê .hbc do disco (mmap)
    │      └─ Se debug: busca do Metro bundler (HTTP)
    │
    ├─ Executa o bundle (Hermes avalia o código de módulo de nível superior)
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

### Configuração do Hermes

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

## 2. Bytecode e Compilação

### Como o Hermes compila JavaScript

O Hermes tem dois modos de compilação:

**AOT sem JIT (o padrão para builds de release)**

```
source.js  ──compilador hermes──►  source.hbc  ──embarcado no APK/IPA──►  dispositivo
```

A compilação acontece em tempo de build, não em tempo de execução. O dispositivo nunca vê JavaScript textual — apenas bytecode pré-parseado e pré-compilado.

**Interpretação sem JIT (builds de debug)**

```
Servidor Metro  ──serve──►  source.js  ──hermes parseia em runtime──►  AST ──►  bytecode em RAM
```

Builds de debug não usam `.hbc` porque os source maps precisam ser precisos linha a linha.

### O formato de bytecode

O bytecode do Hermes é um conjunto de instruções de VM baseado em registradores (não em pilha). Cada função no seu bundle JS se torna uma sequência de instruções de máquina de registradores:

```
// JS original:
function add(a, b) { return a + b; }

// Bytecode Hermes (dump legível por humanos via `hermes -dump-bytecode`):
Function<add>(2 params, 1 registers):
  Add       r0, a0, a1   ; r0 = a + b
  Ret       r0           ; return r0
```

Compare com a saída JIT do JSC: o JSC gera código de máquina (ARM64/x86) em tempo de execução. O Hermes pula isso — ele interpreta bytecode diretamente. Para a maioria das cargas de trabalho React Native (renderização de UI, chamadas de API, gerenciamento de estado), a interpretação é rápida o suficiente e o ganho no cold-start é significativo.

### Medindo o impacto da compilação

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

Antes do Hermes, a melhor otimização de startup era o RAM Bundle (seções indexadas para que o Metro carregasse apenas os módulos realmente necessários na inicialização). Com Hermes, o RAM Bundle é desnecessário — `.hbc` já é mais eficiente que o RAM bundle. Você **não deve** usar `bundleCommand: 'ram-bundle'` quando o Hermes está habilitado.

| Estratégia | Benefício no cold-start | Trade-off |
|---|---|---|
| Hermes .hbc | Parse + JIT eliminados | Compilação AOT em tempo de build |
| RAM Bundle | Carrega apenas módulos necessários | Exige indexação JS, incompatível com Hermes |
| Hermes + inline requires | Reduz ainda mais o código avaliado na inicialização | Complexidade no código-fonte |

### Inline requires (avaliação lazy de módulos)

Mesmo com bytecode Hermes, cada `require()` no nível superior do módulo executa no carregamento do bundle. Inline requires adiam isso:

```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,  // transforma requires de nível superior em getters lazy
      },
    }),
  },
};
```

Com `inlineRequires: true`, este código:

```javascript
import HeavyLibrary from 'heavy-library';  // avaliado imediatamente no carregamento

export function doSomething() {
  return HeavyLibrary.compute();
}
```

Torna-se no nível de bytecode:

```javascript
// O import é adiado até a primeira chamada a doSomething()
export function doSomething() {
  const HeavyLibrary = require('heavy-library');  // agora lazy
  return HeavyLibrary.compute();
}
```

É por isso que `enableInlineRequires` em `react-native.config.js` melhora significativamente o TTI (time to interactive) em apps com muitas dependências.

---

## 3. Interação: Codegen / Fabric / TurboModules

Esta seção explica como os três pilares da New Architecture se conectam e quem chama quem.

### O diagrama completo de interação

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
│                         TEMPO DE EXECUÇÃO                                     │
│                                                                               │
│  VM Hermes                                                                    │
│    └─ global.__turboModuleProxy (JSI HostObject)                              │
│         └─ JS chama: TurboModuleRegistry.get('MyModule')                      │
│               └─► C++ TurboModuleProxy consulta o registry                   │
│                     └─► Retorna JSI HostObject encapsulando a impl nativa     │
│                           └─► JS chama métodos diretamente via JSI            │
│                                                                               │
│  global.nativeFabricUIManager (JSI HostObject)                                │
│    └─ React chama: createNode, appendChild, commitTree                        │
│         └─► Fabric C++ cria/atualiza ShadowNodes                             │
│               └─► Yoga calcula o layout                                       │
│                     └─► MountingCoordinator → thread de UI → views nativas    │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Codegen em detalhes

Codegen é um gerador de código em tempo de build que lê specs TypeScript e emite headers C++. Ele elimina as "magic strings" que assombravam a arquitetura antiga (onde `NativeModules.MyModule.doThing()` era uma busca em dicionário em tempo de execução que podia falhar silenciosamente).

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
    // Cada método é registrado como uma JSI HostFunction
    methodMap_["add"] = MethodMetadata{2, __hostFunction_NativeCalculatorCxxSpec_add};
    methodMap_["computeAsync"] = MethodMetadata{1, __hostFunction_NativeCalculatorCxxSpec_computeAsync};
  }

  // Puramente virtual — você implementa nos seu TurboModule
  virtual double add(jsi::Runtime& rt, double a, double b) = 0;
  virtual jsi::Value computeAsync(jsi::Runtime& rt, double n) = 0;
};

} // namespace facebook::react
```

Sua implementação apenas herda desta classe:

```cpp
// CalculatorModule.cpp — voce escreve esta parte
class CalculatorModule : public NativeCalculatorCxxSpec {
public:
  CalculatorModule(std::shared_ptr<CallInvoker> jsInvoker)
      : NativeCalculatorCxxSpec(jsInvoker) {}

  double add(jsi::Runtime& rt, double a, double b) override {
    return a + b;  // síncrono, roda na thread JS
  }

  jsi::Value computeAsync(jsi::Runtime& rt, double n) override {
    // Constrói uma Promise, agenda trabalho pesado em thread de background
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

Na arquitetura antiga, todos os módulos nativos eram instanciados na inicialização independentemente de serem usados. TurboModules são **instanciados de forma lazy** — o objeto nativo é criado apenas quando o JS chama `TurboModuleRegistry.get('NomeDoModulo')` pela primeira vez.

É por isso que apps RN grandes veem melhorias de startup com a New Architecture: um módulo para, digamos, `BluetoothModule` nunca é inicializado se o usuário nunca visitar uma tela de Bluetooth.

```typescript
// JS: padrão de carregamento lazy — não chame getEnforcing no nível do módulo
// RUIM — módulo instanciado no momento do carregamento do bundle
import NativeBluetoothModule from './NativeBluetoothModule'; // dispara init imediatamente

// BOM — módulo instanciado apenas quando a função é chamada
function scanForDevices() {
  const bluetooth = TurboModuleRegistry.get('BluetoothModule');
  if (!bluetooth) throw new Error('Bluetooth not available');
  return bluetooth.scan();
}
```

### Loop de eventos TurboModule + Fabric

A coisa mais importante a entender é que na New Architecture **não há um tick do event loop entre uma chamada TurboModule e seu retorno síncrono**. A bridge antiga forçava tudo por uma fila, o que significava que o nativo nunca podia retornar um valor para o JS no mesmo frame. O JSI elimina isso:

```typescript
// RN 0.76 — chamada TurboModule síncrona
const NativeKeychain = TurboModuleRegistry.getEnforcing('Keychain');

// Isso executa C++ de forma síncrona na thread JS — sem await necessário
const value = NativeKeychain.getSync('session_token');

// Atualização de UI disparada por leitura síncrona — resolve no mesmo frame
setAuthToken(value);
```

Como o Fabric sabe sobre essa atualização? A cadeia de chamadas:

1. `setAuthToken(value)` → React agenda uma atualização de prioridade discreta
2. O reconciliador React produz uma nova árvore de elementos
3. Fabric C++ recebe a nova árvore via `nativeFabricUIManager.createNode` (JSI, síncrono)
4. Layout calculado em C++
5. `MountingTransaction` despachada para a thread de UI
6. Views nativas atualizadas — tudo dentro do mesmo frame VSync

---
