---
title: TurboModules com Swift
---

# TurboModules com Swift

## Visão Geral em Vídeo

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/rec_05_turbomodule-swift.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/rec_05_turbomodule-swift.vtt" srclang="pt" label="Português" default>
  Seu navegador não suporta a tag de vídeo.
</video>

O sistema de TurboModules da New Architecture expõe uma interface C++ síncrona via JSI (JavaScript Interface). Isso cria uma restrição imediata para desenvolvedores Swift: Swift não pode ser chamado diretamente a partir de C++. Entender esse limite — e como o ObjC++ o transpõe — é essencial antes de escrever qualquer linha de código de implementação.

## Por Que Swift Não Pode Implementar TurboModules Diretamente

JSI é uma biblioteca C++. Quando o React Native chama um módulo nativo por meio de um TurboModule, o caminho da chamada é:

```
JavaScript (Hermes) → JSI (C++) → interface C++ do TurboModule → implementacao nativa
```

Swift tem zero interoperabilidade com C++ puro. O interop Swift/C++ da Apple (disponível desde o Swift 5.9) exige anotações explícitas `@_expose(Cxx)` e cobre apenas um subconjunto de padrões — não é compatível com a forma como o JSI espera resolver `getTurboModule:`. O runtime Objective-C, por outro lado, foi projetado para interoperar com C++ e Swift simultaneamente.

A consequência é inegociável: todo arquivo de implementação de TurboModule deve ser Objective-C++ (`.mm`). Sua lógica Swift pode residir em uma classe auxiliar, mas o arquivo que se registra no JSI e conforma ao protocolo gerado pelo Codegen deve ser `.mm`.

## O Requisito do Arquivo .mm

Objective-C++ é uma linguagem que permite que código C++ e Objective-C coexistam na mesma unidade de compilação. O Xcode reconhece `.mm` como a extensão de arquivo para Objective-C++. Quando você escreve:

```objc
// NativeStorageModule.mm
#import <ReactCommon/RCTTurboModule.h>
```

O compilador processa esses headers — que contêm templates C++ internamente — e permite que você chame o método C++ `getTurboModule:` no mesmo arquivo. Um arquivo `.m` (Objective-C puro) não pode incluir headers C++. Um arquivo `.swift` não pode chamar C++ por meios padrão. O arquivo `.mm` é o único ponto de integração sancionado entre o mundo C++ do JSI e sua lógica de negócio em Swift.

## O Bridging Header ObjC

Classes Swift não são visíveis para Objective-C (e, portanto, não são visíveis para seu arquivo `.mm`) por padrão. Você as expõe por meio de um bridging header.

### Criando o Bridging Header

1. No Xcode, vá em **File -> New -> File -> Header File**.
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

Esse header gerado expõe cada classe Swift marcada com `@objc` ou `@objcMembers` para o runtime Objective-C, tornando-as chamáveis a partir da sua implementação `.mm`.

## Exemplo de Ponta a Ponta: NativeStorageModule

Este exemplo constrói um módulo que armazena e recupera valores de string usando um dicionário Swift thread-safe.

### 1. Spec TypeScript

O Codegen lê essa spec e gera a interface C++ que seu `.mm` deve implementar.

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

### 2. Configuração do Codegen no package.json

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

O Codegen é executado automaticamente durante o `pod install`. Os arquivos gerados aparecem em `ios/build/generated/ios/`. Sempre execute `pod install` após modificar uma spec TypeScript antes de compilar no Xcode.

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

`@objcMembers` expõe cada método e propriedade para Objective-C sem exigir anotações `@objc` individuais. A fila de despacho concorrente fornece leituras thread-safe e escritas serializadas usando a flag `.barrier` nas mutações.

### 4. Implementação ObjC++

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

O método crítico é `getTurboModule:`. Ele retorna um `std::shared_ptr` para a classe C++ gerada pelo Codegen (`NativeStorageModuleSpecJSI`). Essa classe encapsula sua implementação ObjC e a expõe por meio do JSI. Sem esse método, o sistema TurboModule não consegue localizar seu módulo em tempo de execução — a chamada JavaScript vai cair no bridge legado ou falhar completamente.

`RCT_EXPORT_MODULE(NativeStorageModule)` registra o módulo com o runtime do React Native. O argumento string deve corresponder exatamente ao nome usado em `TurboModuleRegistry.strictGet<Spec>('NativeStorageModule')` na sua spec TypeScript.

## Alterações no AppDelegate

Com a New Architecture, os TurboModules são resolvidos por meio do protocolo `RCTTurboModuleManagerDelegate`.

### Usando RCTAppSetupUtils (Recomendado)

Se o seu projeto foi criado com React Native 0.73+ ou o workflow gerenciado do Expo, o scaffolding já chama `RCTAppSetupPrepareApp`. Módulos registrados com `RCT_EXPORT_MODULE` no mesmo app target são auto-descobertos — nenhuma alteração manual no `AppDelegate` é necessária.

### Configuração Manual do AppDelegate

Para um módulo que requer inicialização personalizada ou reside em um pod separado, implemente os métodos do delegate explicitamente:

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

## Podspec CocoaPods para um Módulo Personalizado

Ao empacotar o módulo como uma biblioteca reutilizável — para distribuição ou isolamento em monorepo — crie um arquivo `.podspec`:

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
- O glob `ios/**/*.{h,m,mm,swift}` captura tanto a implementação `.mm` quanto o auxiliar `.swift` em uma única declaração.
- Dentro de um pod target, o Xcode lida com o bridging Swift-para-ObjC automaticamente. Você não precisa de um bridging header manual dentro do pod; o header gerado `-Swift.h` é referenciado pelo arquivo `.mm` conforme mostrado na implementação acima.
- `React-RCTFabric` é necessário porque os headers JSI residem no pacote Fabric no grafo de dependências da New Architecture.

## Registrando com RCTAppSetupUtils vs AppDelegate Manual

| Cenário | Abordagem |
|---|---|
| Módulo está no app target | `RCT_EXPORT_MODULE` é suficiente; auto-descoberto |
| Módulo está em um pod separado, mesmo repositório | Adicione o pod ao `Podfile`; `RCT_EXPORT_MODULE` ainda é auto-descoberto |
| Módulo é uma biblioteca pod de terceiros | O consumidor adiciona ao `Podfile`; auto-descoberto via registro de classe |
| Módulo precisa de init personalizado (ex.: injetar um serviço compartilhado) | Sobrescreva `getModuleInstanceFromClass:` no `AppDelegate` |

`RCTAppSetupUtils` fornece `RCTAppSetupPrepareApp` (chamado uma vez em `application:didFinishLaunchingWithOptions:`) e `RCTAppSetupDefaultModuleFromClass` (chamado por módulo pelo manager). A menos que você precise de inicialização personalizada, confie nos padrões e mantenha as alterações no `AppDelegate` mínimas.

## Erros Comuns e Suas Causas

### "Cannot find module 'NativeStorageModule'"

Esse erro aparece em JavaScript em tempo de execução.

- O Codegen não foi executado. Execute `cd ios && bundle exec pod install` para acioná-lo.
- O nome do módulo em `TurboModuleRegistry.strictGet` não corresponde ao string passado para `RCT_EXPORT_MODULE`. Eles devem ser idênticos.
- O diretório de saída do Codegen (`build/generated/ios/`) não está incluído nas fases de build do Xcode. Verifique se a fase de script **Generate Specs** foi executada com sucesso na última compilação.

### "Does not conform to protocol 'NativeStorageModuleSpec'"

A classe ObjC++ está faltando um ou mais métodos declarados no protocolo gerado pelo Codegen.

1. Abra o header gerado em `ios/build/generated/ios/AppSpecs/AppSpecsJSI.h`.
2. Localize o bloco `@protocol NativeStorageModuleSpec`.
3. Compare cada assinatura de método com sua implementação `.mm` — tipos de parâmetros, rótulos e tipos de retorno devem corresponder exatamente.
4. Execute novamente o Codegen (`pod install`) após qualquer alteração na spec TypeScript.

### "Symbol not found: _OBJC_CLASS_$_NativeStorageModule"

O linker não consegue resolver a classe no momento da linkagem.

- O arquivo `.mm` não foi adicionado à fase de build **Compile Sources** no Xcode.
- O glob `source_files` do podspec não corresponde ao caminho do arquivo `.mm`.
- O `Podfile` do consumidor está sem `pod 'NativeStorageModule'`, ou o `pod install` não foi re-executado após adicioná-lo.

### "Include of non-modular header inside framework module"

Isso ocorre quando um header C++ (`jsi/jsi.h` ou internos do React) é importado em um contexto que espera headers modulares.

- Defina `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` em Build Settings.
- Confirme que o xcconfig do pod target define `CLANG_CXX_LANGUAGE_STANDARD` como `c++17`.
- Envolva os imports C++ em guards `#ifdef __cplusplus` em qualquer header compartilhado:

```objc
#ifdef __cplusplus
#import <jsi/jsi.h>
#import <ReactCommon/RCTTurboModule.h>
#endif
```

### Módulo compila mas retorna undefined em tempo de execução

- Verifique se `getTurboModule:` retorna um `shared_ptr` não nulo. Adicione um log dentro do método para confirmar que ele está sendo chamado.
- Confirme que `RCT_EXPORT_MODULE` usa exatamente o nome do módulo da spec TypeScript, não uma string vazia.
- Verifique se `RCTEnableTurboModule(YES)` é chamado dentro de `RCTAppSetupPrepareApp` antes do bridge ser criado. Sem essa flag, o runtime volta ao sistema de módulos legado e a resolução de TurboModule é ignorada completamente.
