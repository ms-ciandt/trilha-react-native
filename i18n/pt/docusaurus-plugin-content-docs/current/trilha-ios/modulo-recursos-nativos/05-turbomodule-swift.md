---
title: TurboModules com Swift
---

# TurboModules com Swift

O sistema de TurboModules da New Architecture expoe uma interface C++ sincrona via JSI (JavaScript Interface). Isso cria uma restricao imediata para desenvolvedores Swift: Swift nao pode ser chamado diretamente a partir de C++. Entender esse limite — e como o ObjC++ o transpoe — e essencial antes de escrever qualquer linha de codigo de implementacao.

## Por Que Swift Nao Pode Implementar TurboModules Diretamente

JSI e uma biblioteca C++. Quando o React Native chama um modulo nativo por meio de um TurboModule, o caminho da chamada e:

```
JavaScript (Hermes) → JSI (C++) → interface C++ do TurboModule → implementacao nativa
```

Swift tem zero interoperabilidade com C++ puro. O interop Swift/C++ da Apple (disponivel desde o Swift 5.9) exige anotacoes explicitas `@_expose(Cxx)` e cobre apenas um subconjunto de padroes — nao e compativel com a forma como o JSI espera resolver `getTurboModule:`. O runtime Objective-C, por outro lado, foi projetado para interoperar com C++ e Swift simultaneamente.

A consequencia e inegociavel: todo arquivo de implementacao de TurboModule deve ser Objective-C++ (`.mm`). Sua logica Swift pode residir em uma classe auxiliar, mas o arquivo que se registra no JSI e conforma ao protocolo gerado pelo Codegen deve ser `.mm`.

## O Requisito do Arquivo .mm

Objective-C++ e uma linguagem que permite que codigo C++ e Objective-C coexistam na mesma unidade de compilacao. O Xcode reconhece `.mm` como a extensao de arquivo para Objective-C++. Quando voce escreve:

```objc
// NativeStorageModule.mm
#import <ReactCommon/RCTTurboModule.h>
```

O compilador processa esses headers — que contem templates C++ internamente — e permite que voce chame o metodo C++ `getTurboModule:` no mesmo arquivo. Um arquivo `.m` (Objective-C puro) nao pode incluir headers C++. Um arquivo `.swift` nao pode chamar C++ por meios padrao. O arquivo `.mm` e o unico ponto de integracao sancionado entre o mundo C++ do JSI e sua logica de negocio em Swift.

## O Bridging Header ObjC

Classes Swift nao sao visiveis para Objective-C (e, portanto, nao sao visiveis para seu arquivo `.mm`) por padrao. Voce as expoe por meio de um bridging header.

### Criando o Bridging Header

1. No Xcode, va em **File -> New -> File -> Header File**.
2. Nomeie-o `{NomeDoProjeto}-Bridging-Header.h`, correspondendo exatamente ao nome do seu projeto (ex.: `MyApp-Bridging-Header.h`).
3. Em **Build Settings**, pesquise por `Objective-C Bridging Header` e defina o valor como `$(PROJECT_DIR)/MyApp/MyApp-Bridging-Header.h`.

```objc
// MyApp-Bridging-Header.h
// Importe quaisquer headers ObjC ou C que seu codigo Swift precise chamar.
// Classes Swift anotadas com @objc sao automaticamente visiveis para arquivos .mm
// por meio do header de modulo auto-gerado "MyApp-Swift.h".
#import <React/RCTBridgeModule.h>
```

Para usar uma classe Swift a partir de um arquivo `.mm`, adicione um import no topo do arquivo `.mm`:

```objc
#import "MyApp-Swift.h"   // Xcode auto-gera isso a partir do seu codigo Swift anotado com @objc
```

Esse header gerado expoe cada classe Swift marcada com `@objc` ou `@objcMembers` para o runtime Objective-C, tornando-as chamáveis a partir da sua implementacao `.mm`.

## Exemplo de Ponta a Ponta: NativeStorageModule

Este exemplo constroi um modulo que armazena e recupera valores de string usando um dicionario Swift thread-safe.

### 1. Spec TypeScript

O Codegen le essa spec e gera a interface C++ que seu `.mm` deve implementar.

```ts
// src/specs/NativeStorageModuleSpec.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
}

export default TurboModuleRegistry.strictGet<Spec>('NativeStorageModule');
```

### 2. Configuracao do Codegen no package.json

```json
{
  "name": "my-app",
  "codegenConfig": {
    "name": "AppSpecs",
    "type": "modules",
    "jsSrcsDir": "src/specs",
    "android": {
      "javaPackageName": "com.myapp"
    }
  }
}
```

O Codegen e executado automaticamente durante o `pod install`. Os arquivos gerados aparecem em `ios/build/generated/ios/`. Sempre execute `pod install` apos modificar uma spec TypeScript antes de compilar no Xcode.

### 3. Classe Auxiliar Swift

```swift
// NativeStorageHelper.swift
import Foundation

@objcMembers
class NativeStorageHelper: NSObject {
  private var store: [String: String] = [:]
  private let queue = DispatchQueue(
    label: "com.myapp.NativeStorageHelper",
    attributes: .concurrent
  )

  func setItem(key: String, value: String) {
    queue.async(flags: .barrier) {
      self.store[key] = value
    }
  }

  func getItem(key: String) -> String? {
    return queue.sync {
      return store[key]
    }
  }

  func removeItem(key: String) {
    queue.async(flags: .barrier) {
      self.store.removeValue(forKey: key)
    }
  }

  func clear() {
    queue.async(flags: .barrier) {
      self.store.removeAll()
    }
  }
}
```

`@objcMembers` expoe cada metodo e propriedade para Objective-C sem exigir anotacoes `@objc` individuais. A fila de despacho concorrente fornece leituras thread-safe e escritas serializadas usando a flag `.barrier` nas mutacoes.

### 4. Implementacao ObjC++

```objc
// NativeStorageModule.h
#pragma once
#import <React/RCTBridgeModule.h>
```

```objc
// NativeStorageModule.mm
#import "NativeStorageModule.h"
#import "MyApp-Swift.h"           // expoe NativeStorageHelper para ObjC

// Gerado pelo Codegen durante o pod install:
#import <AppSpecs/AppSpecsJSI.h>

#import <ReactCommon/RCTTurboModule.h>
#import <React/RCTBridgeModule.h>
#import <jsi/jsi.h>

using namespace facebook::jsi;
using namespace facebook::react;

@interface NativeStorageModule : NSObject <RCTBridgeModule, RCTTurboModule>
@end

@implementation NativeStorageModule {
  NativeStorageHelper *_helper;
}

RCT_EXPORT_MODULE(NativeStorageModule)

- (instancetype)init {
  if (self = [super init]) {
    _helper = [[NativeStorageHelper alloc] init];
  }
  return self;
}

// MARK: - TurboModule registration

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params {
  return std::make_shared<NativeStorageModuleSpecJSI>(params);
}

// MARK: - NativeStorageModuleSpec methods

- (void)setItem:(NSString *)key value:(NSString *)value {
  [_helper setItemWithKey:key value:value];
}

- (NSString *)getItem:(NSString *)key {
  return [_helper getItemWithKey:key];
}

- (void)removeItem:(NSString *)key {
  [_helper removeItemWithKey:key];
}

- (void)clear {
  [_helper clear];
}

@end
```

O metodo critico e `getTurboModule:`. Ele retorna um `std::shared_ptr` para a classe C++ gerada pelo Codegen (`NativeStorageModuleSpecJSI`). Essa classe encapsula sua implementacao ObjC e a expoe por meio do JSI. Sem esse metodo, o sistema TurboModule nao consegue localizar seu modulo em tempo de execucao — a chamada JavaScript vai cair no bridge legado ou falhar completamente.

`RCT_EXPORT_MODULE(NativeStorageModule)` registra o modulo com o runtime do React Native. O argumento string deve corresponder exatamente ao nome usado em `TurboModuleRegistry.strictGet<Spec>('NativeStorageModule')` na sua spec TypeScript.

## Alteracoes no AppDelegate

Com a New Architecture, os TurboModules sao resolvidos por meio do protocolo `RCTTurboModuleManagerDelegate`.

### Usando RCTAppSetupUtils (Recomendado)

Se o seu projeto foi criado com React Native 0.73+ ou o workflow gerenciado do Expo, o scaffolding ja chama `RCTAppSetupPrepareApp`. Modulos registrados com `RCT_EXPORT_MODULE` no mesmo app target sao auto-descobertos — nenhuma alteracao manual no `AppDelegate` e necessaria.

### Configuracao Manual do AppDelegate

Para um modulo que requer inicializacao personalizada ou reside em um pod separado, implemente os metodos do delegate explicitamente:

```objc
// AppDelegate.mm (trecho)
#import "NativeStorageModule.h"

@interface AppDelegate () <RCTTurboModuleManagerDelegate>
@end

@implementation AppDelegate

- (Class)getModuleClassFromName:(const char *)name {
  return RCTCoreModulesClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(const std::string &)name
         jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker {
  // Retorna nullptr para cair na resolucao padrao baseada em classe.
  return nullptr;
}

// Sobrescreva isso para injetar dependencias no modulo no momento da criacao.
- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass {
  if (moduleClass == NativeStorageModule.class) {
    return [[NativeStorageModule alloc] init];
  }
  return RCTAppSetupDefaultModuleFromClass(moduleClass);
}

@end
```

## Podspec CocoaPods para um Modulo Personalizado

Ao empacotar o modulo como uma biblioteca reutilizavel — para distribuicao ou isolamento em monorepo — crie um arquivo `.podspec`:

```ruby
# NativeStorageModule.podspec
require "json"

Pod::Spec.new do |s|
  s.name         = "NativeStorageModule"
  s.version      = "1.0.0"
  s.summary      = "A TurboModule-backed storage module for React Native."
  s.homepage     = "https://github.com/your-org/native-storage-module"
  s.license      = "MIT"
  s.authors      = { "Your Name" => "you@example.com" }
  s.platforms    = { :ios => "13.4" }
  s.source       = {
    :git => "https://github.com/your-org/native-storage-module.git",
    :tag => "v#{s.version}"
  }

  # Glob de todos os arquivos fonte ObjC++ e Swift
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  # Dependencias principais do TurboModule
  s.dependency "React-Core"
  s.dependency "React-RCTFabric"              # traz os headers JSI e do renderer Fabric
  s.dependency "ReactCommon/turbomodule/core"
  s.dependency "React-Codegen"

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "HEADER_SEARCH_PATHS" => "$(PODS_ROOT)/boost"
  }

  s.swift_version = "5.9"
end
```

Notas sobre `source_files`:
- O glob `ios/**/*.{h,m,mm,swift}` captura tanto a implementacao `.mm` quanto o auxiliar `.swift` em uma unica declaracao.
- Dentro de um pod target, o Xcode lida com o bridging Swift-para-ObjC automaticamente. Voce nao precisa de um bridging header manual dentro do pod; o header gerado `-Swift.h` e referenciado pelo arquivo `.mm` conforme mostrado na implementacao acima.
- `React-RCTFabric` e necessario porque os headers JSI residem no pacote Fabric no grafo de dependencias da New Architecture.

## Registrando com RCTAppSetupUtils vs AppDelegate Manual

| Cenario | Abordagem |
|---|---|
| Modulo esta no app target | `RCT_EXPORT_MODULE` e suficiente; auto-descoberto |
| Modulo esta em um pod separado, mesmo repositorio | Adicione o pod ao `Podfile`; `RCT_EXPORT_MODULE` ainda e auto-descoberto |
| Modulo e uma biblioteca pod de terceiros | O consumidor adiciona ao `Podfile`; auto-descoberto via registro de classe |
| Modulo precisa de init personalizado (ex.: injetar um servico compartilhado) | Sobrescreva `getModuleInstanceFromClass:` no `AppDelegate` |

`RCTAppSetupUtils` fornece `RCTAppSetupPrepareApp` (chamado uma vez em `application:didFinishLaunchingWithOptions:`) e `RCTAppSetupDefaultModuleFromClass` (chamado por modulo pelo manager). A menos que voce precise de inicializacao personalizada, confie nos padroes e mantenha as alteracoes no `AppDelegate` minimas.

## Erros Comuns e Suas Causas

### "Cannot find module 'NativeStorageModule'"

Esse erro aparece em JavaScript em tempo de execucao.

- O Codegen nao foi executado. Execute `cd ios && bundle exec pod install` para acioná-lo.
- O nome do modulo em `TurboModuleRegistry.strictGet` nao corresponde ao string passado para `RCT_EXPORT_MODULE`. Eles devem ser identicos.
- O diretorio de saida do Codegen (`build/generated/ios/`) nao esta incluido nas fases de build do Xcode. Verifique se a fase de script **Generate Specs** foi executada com sucesso na ultima compilacao.

### "Does not conform to protocol 'NativeStorageModuleSpec'"

A classe ObjC++ esta faltando um ou mais metodos declarados no protocolo gerado pelo Codegen.

1. Abra o header gerado em `ios/build/generated/ios/AppSpecs/AppSpecsJSI.h`.
2. Localize o bloco `@protocol NativeStorageModuleSpec`.
3. Compare cada assinatura de metodo com sua implementacao `.mm` — tipos de parametros, rotulos e tipos de retorno devem corresponder exatamente.
4. Execute novamente o Codegen (`pod install`) apos qualquer alteracao na spec TypeScript.

### "Symbol not found: _OBJC_CLASS_$_NativeStorageModule"

O linker nao consegue resolver a classe no momento da linkagem.

- O arquivo `.mm` nao foi adicionado a fase de build **Compile Sources** no Xcode.
- O glob `source_files` do podspec nao corresponde ao caminho do arquivo `.mm`.
- O `Podfile` do consumidor esta sem `pod 'NativeStorageModule'`, ou o `pod install` nao foi re-executado apos adicioná-lo.

### "Include of non-modular header inside framework module"

Isso ocorre quando um header C++ (`jsi/jsi.h` ou internos do React) e importado em um contexto que espera headers modulares.

- Defina `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` em Build Settings.
- Confirme que o xcconfig do pod target define `CLANG_CXX_LANGUAGE_STANDARD` como `c++17`.
- Envolva os imports C++ em guards `#ifdef __cplusplus` em qualquer header compartilhado:

```objc
#ifdef __cplusplus
#import <jsi/jsi.h>
#import <ReactCommon/RCTTurboModule.h>
#endif
```

### Modulo compila mas retorna undefined em tempo de execucao

- Verifique se `getTurboModule:` retorna um `shared_ptr` nao nulo. Adicione um log dentro do metodo para confirmar que ele esta sendo chamado.
- Confirme que `RCT_EXPORT_MODULE` usa exatamente o nome do modulo da spec TypeScript, nao uma string vazia.
- Verifique se `RCTEnableTurboModule(YES)` e chamado dentro de `RCTAppSetupPrepareApp` antes do bridge ser criado. Sem essa flag, o runtime volta ao sistema de modulos legado e a resolucao de TurboModule e ignorada completamente.
