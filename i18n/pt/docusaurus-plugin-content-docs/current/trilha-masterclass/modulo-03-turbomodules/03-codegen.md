---
title: "Codegen: Interfaces Nativas Tipadas"
---

# Codegen: Interfaces Nativas Tipadas

> O Codegen é um compilador de tempo de build. Ele lê sua spec TypeScript e escreve o boilerplate nativo — as classes abstratas, protocolos e tabelas de despacho JSI — para que você nunca precise escrever código de bridging manualmente.

---

## Configuração no `package.json`

```json
{
  "name": "my-app",
  "codegenConfig": {
    "name": "AppSpecs",
    "type": "modules",
    "jsSrcsDir": "specs",
    "android": {
      "javaPackageName": "com.myapp.specs"
    },
    "ios": {
      "modulesProvider": {
        "NativeCalculator": "RCTNativeCalculator",
        "NativeAnalytics": "RCTNativeAnalytics"
      }
    }
  }
}
```

- `name`: o nome do grupo de specs gerado — usado como nome do target CMake e nome do framework iOS
- `jsSrcsDir`: onde o Codegen procura os arquivos `Native*.ts`
- `android.javaPackageName`: o pacote Java para as classes geradas
- `ios.modulesProvider`: mapeia o nome do módulo JS para a classe nativa que será instanciada

---

## O que o Codegen Gera

### Saída Android

```
build/generated/source/codegen/
├── java/
│   └── com/myapp/specs/
│       └── NativeCalculatorSpec.java       ← classe abstrata que você estende
└── jni/
    ├── NativeCalculator.h                  ← header JSI em C++
    └── NativeCalculator-generated.cpp      ← tabela de despacho JSI (gerada automaticamente)
```

**`NativeCalculatorSpec.java`** (o que o Codegen escreve — você nunca edita isso):

```java
// GERADO AUTOMATICAMENTE — não edite
package com.myapp.specs;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

public abstract class NativeCalculatorSpec extends ReactContextBaseJavaModule {

    public NativeCalculatorSpec(ReactApplicationContext context) {
        super(context);
    }

    // Métodos síncronos — anotados com @ReactMethod
    @ReactMethod(isBlockingSynchronousMethod = true)
    public abstract double add(double a, double b);

    // Métodos assíncronos — Promise injetada pelo framework
    @ReactMethod
    public abstract void fetchRemoteValue(String key, Promise promise);

    // Métodos void
    @ReactMethod
    public abstract void logEvent(String name, ReadableMap payload);
}
```

**Sua implementação** estende a classe gerada e o compilador te obriga a implementar cada método:

```kotlin
// android/app/src/main/java/com/myapp/NativeCalculatorModule.kt
class NativeCalculatorModule(reactContext: ReactApplicationContext) :
    NativeCalculatorSpec(reactContext) {

    override fun getName() = NAME

    override fun add(a: Double, b: Double): Double = a + b

    override fun fetchRemoteValue(key: String, promise: Promise) {
        Thread {
            try {
                val result = myRepository.fetch(key)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("FETCH_ERROR", e.message, e)
            }
        }.start()
    }

    override fun logEvent(name: String, payload: ReadableMap) {
        Analytics.log(name, payload.toHashMap())
    }

    companion object { const val NAME = "NativeCalculator" }
}
```

---

### Saída iOS

```
build/generated/ios/
└── NativeCalculatorSpec/
    ├── NativeCalculatorSpec.h              ← protocolo ObjC++
    └── NativeCalculatorSpec-generated.mm  ← tabela de despacho JSI
```

**`NativeCalculatorSpec.h`** (simplificado — o Codegen escreve isso):

```objc
// GERADO AUTOMATICAMENTE — não edite
#pragma once
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace facebook::react {

// A camada de despacho JSI — gerada a partir da spec
class JSI_EXPORT NativeCalculatorCxxSpec
    : public TurboModule {
public:
  NativeCalculatorCxxSpec(std::shared_ptr<CallInvoker> jsInvoker);
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& propName) override;

private:
  // Uma função de despacho por método da spec
  static jsi::Value __hostFunction_NativeCalculatorSpecJSI_add(
      jsi::Runtime& rt,
      TurboModule& turboModule,
      const jsi::Value* args,
      size_t count);

  static jsi::Value __hostFunction_NativeCalculatorSpecJSI_fetchRemoteValue(
      jsi::Runtime& rt,
      TurboModule& turboModule,
      const jsi::Value* args,
      size_t count);
};

} // namespace facebook::react
```

**Protocolo ObjC++** que sua classe adota:

```objc
@protocol NativeCalculatorSpec <RCTBridgeModule, RCTTurboModule>
- (double)add:(double)a b:(double)b;
- (void)fetchRemoteValue:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)logEvent:(NSString *)name payload:(NSDictionary *)payload;
@end
```

**Sua implementação** em `.mm` (deve ser Objective-C++, não `.m`):

```objc
// ios/RCTNativeCalculator.mm
#import "RCTNativeCalculator.h"

@implementation RCTNativeCalculator

RCT_EXPORT_MODULE()

- (double)add:(double)a b:(double)b {
    return a + b;
}

- (void)fetchRemoteValue:(NSString *)key
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSString *result = [self->_repository fetch:key];
        if (result) {
            resolve(result);
        } else {
            reject(@"FETCH_ERROR", @"Key not found", nil);
        }
    });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCalculatorSpecJSI>(params);
}

@end
```

---

## Registrando o Pacote (Android)

```kotlin
// android/app/src/main/java/com/myapp/NativeCalculatorPackage.kt
class NativeCalculatorPackage : BaseReactPackage() {

    override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeCalculatorModule.NAME -> NativeCalculatorModule(context)
            else -> null
        }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            NativeCalculatorModule.NAME to ReactModuleInfo(
                name = NativeCalculatorModule.NAME,
                className = NativeCalculatorModule.NAME,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = true
            )
        )
    }
}
```

```kotlin
// MainApplication.kt
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(NativeCalculatorPackage())
    }
```

---

## Executando o Codegen

```bash
# Android — executado automaticamente durante o build, ou explicitamente:
cd android && ./gradlew generateCodegenArtifactsFromSchema

# iOS — executado automaticamente no pod install:
cd ios && bundle exec pod install
```

Para visualizar a saída gerada sem um build completo:

```bash
node node_modules/react-native/scripts/generate-codegen-artifacts.js \
  --path . \
  --outputPath /tmp/codegen-preview \
  --targetPlatform ios
```

---

## O Fluxo Completo

```
specs/NativeCalculator.ts   ← você escreve isso
         │
         ▼  Codegen (tempo de build)
NativeCalculatorSpec.java         ← classe abstrata Android
NativeCalculatorSpec.h            ← protocolo ObjC++ iOS + spec JSI C++
NativeCalculator-generated.cpp    ← tabela de despacho JSI (ambas as plataformas)
         │
         ▼  você escreve esses (estendendo / adotando as interfaces geradas)
NativeCalculatorModule.kt         ← implementação Kotlin
RCTNativeCalculator.mm            ← implementação ObjC++
         │
         ▼  runtime (JSI)
JS: NativeCalculator.add(1, 2) → lambda C++ → resultado de volta ao JS
```

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Guia oficial de ponta a ponta incluindo configuração do Codegen |
| [Codegen reference — reactwg](https://github.com/reactwg/react-native-new-architecture/blob/main/docs/codegen.md) | Estrutura de arquivos gerados, opções de configuração |
| [Build a TurboModule for Android — LogRocket](https://blog.logrocket.com/build-custom-react-native-turbo-module-android/) | Tutorial prático com Kotlin + Codegen |
| [Build TurboModules with Swift](https://medium.com/@varunkukade999/build-native-and-turbo-modules-in-react-native-with-swift-e5d942226855) | Implementação iOS e configuração do Codegen |
| [Codegen internals — Dev.to](https://dev.to/amitkumar13/the-turbo-way-to-talk-native-react-natives-new-bridging-system-2nh8) | Como o Codegen analisa specs e gera o despacho JSI |

---

Próximo → [Carregamento Defensivo de Módulos](./defensive-loading)
