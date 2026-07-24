---
title: Xcode and CocoaPods Setup for React Native
---

# Configuracao do Xcode e CocoaPods para React Native

Como desenvolvedor iOS, voce ja conhece Xcode, provisioning profiles e CocoaPods. O React Native se baseia exatamente nesse conhecimento — a pasta `ios/` e um projeto Xcode completo, e toda dependencia nativa passa pelo CocoaPods. Este documento mapeia o que voce ja sabe para como o React Native utiliza esses recursos.

## Estrutura da Pasta ios/

Ao executar `npx react-native init MyApp`, o CLI gera um diretorio `ios/` com a seguinte estrutura:

```
ios/
  MyApp/
    AppDelegate.mm          ← ponto de entrada, substitui seu antigo AppDelegate.swift
    AppDelegate.h           ← header (interop Obj-C/C++)
    Info.plist              ← bundle ID, nome de exibicao, permissoes — igual ao que voce ja conhece
    Images.xcassets/        ← assets da launch screen
    LaunchScreen.storyboard ← launch screen
    main.m                  ← main em Obj-C, inicializa o AppDelegate
  MyApp.xcodeproj/          ← projeto Xcode bruto — NAO abra este diretamente
  MyApp.xcworkspace/        ← workspace que inclui os Pods — SEMPRE abra este
  Podfile                   ← seu manifesto de dependencias
  Podfile.lock              ← lockfile — commite este no git
  Pods/                     ← gerado pelo pod install — NAO commite isto
```

A distincao entre `.xcodeproj` e `.xcworkspace` e identica a qualquer outro projeto CocoaPods com o qual voce ja trabalhou. Abrir `.xcodeproj` diretamente significa que o Xcode nao consegue encontrar os targets de `Pods`, e o build falha imediatamente. Trate `.xcworkspace` como o unico ponto de entrada.

### AppDelegate.mm — Por que a Extensao .mm

O `AppDelegate` do React Native e escrito em Objective-C++ (`.mm`), nao em Swift. Isso ocorre porque o runtime C++ do React Native (JSI, Fabric, TurboModules) e exposto por meio de headers C++ que nao podem ser importados diretamente de um arquivo Swift puro. Se voce quiser escrever codigo Swift, faca isso dentro dos seus proprios view controllers e modulos — o ponto de entrada permanece em `.mm`.

A extensao do arquivo nao e uma limitacao que voce precisa contornar; e um limite deliberado. Seu codigo Swift permanece em Swift. O codigo de inicializacao do RN permanece em `.mm`.

## O Papel do CocoaPods no React Native

Toda a camada nativa do React Native e distribuida como CocoaPods. O pacote `react-native` no npm vem com um `React-Core.podspec` (e dezenas de sub-specs). Quando voce executa `pod install`, o CocoaPods resolve todos esses specs junto com suas proprias dependencias.

Todo pacote npm que possui um modulo iOS nativo vem com um `.podspec` na raiz. Exemplos:

- `react-native-camera` → `RNCamera.podspec`
- `react-native-async-storage` → `RNCAsyncStorage.podspec`
- `react-native-reanimated` → `RNReanimated.podspec`

O CLI do React Native automatiza o registro desses specs por meio do helper `use_native_modules!` no Podfile. Voce nao adiciona essas linhas de pod manualmente — `use_native_modules!` varre `node_modules` e as adiciona automaticamente.

## Anatomia do Podfile

Um Podfile gerado para um projeto React Native 0.76 tem a seguinte aparencia:

```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, min_ios_version_supported
prepare_react_native_project!

linkage = ENV['USE_FRAMEWORKS']
if linkage != nil
  Pod::UI.puts "Enabling #{linkage}ly linked Frameworks"
  use_frameworks! :linkage => linkage.to_sym
end

target 'MyApp' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true,
    :fabric_enabled => true,
    :flipper_configuration => FlipperConfiguration.disabled,
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
  end
end
```

### Entradas Principais

`platform :ios, min_ios_version_supported`
O helper `min_ios_version_supported` resolve para `14.0` no React Native 0.76. O iOS 14 e o minimo porque o renderer Fabric com suporte a Metal e o JSI requerem APIs introduzidas nessa versao. Nao reduza esse valor sem entender quais APIs do RN vao quebrar.

`use_native_modules!`
Varre `node_modules` em busca de todo pacote que possui um `.podspec` e faz o auto-link. O valor de retorno `config` carrega o caminho resolvido para o proprio pacote `react-native`.

`use_react_native!`
Uma macro definida pelo React Native que adiciona todos os pods principais: `React-Core`, `React-Fabric`, `React-jsi`, `React-hermes`, entre outros. Os argumentos nomeados controlam as flags da New Architecture:

| Argumento | Efeito |
|---|---|
| `:hermes_enabled => true` | Inclui o pod `hermes-engine`, define `RCT_NEW_ARCH_ENABLED` |
| `:fabric_enabled => true` | Habilita o renderer Fabric para componentes nativos |
| `:flipper_configuration` | Passe `FlipperConfiguration.disabled` para pipelines de producao |

`post_install`
O hook `react_native_post_install` aplica patches nas configuracoes de build em todos os targets de pod — deployment target minimo, biblioteca padrao C++, flags de linker. Nao o remova; os builds falharao sem ele.

## pod install vs pod update

Isso espelha a pratica padrao do CocoaPods com uma particularidade especifica do React Native.

**pod install** resolve dependencias de acordo com `Podfile.lock`. Se `Podfile.lock` existir, todo pod e fixado na versao exata ja registrada. Execute este comando:
- apos clonar o repositorio pela primeira vez
- apos adicionar ou remover um pacote npm que possui codigo nativo
- apos qualquer alteracao no `Podfile`
- apos executar `npm install` / `yarn` no CI

**pod update** ignora `Podfile.lock` e resolve a versao compativel mais recente de cada pod. Execute este comando de forma intencional, nao por padrao:
- quando voce quer obter uma versao mais recente de um pod (por exemplo, apos atualizar o proprio `react-native`)
- para atualizar um unico pod: `pod update RNReanimated`

**Estrategia de commit para Podfile.lock:** Sempre commite `Podfile.lock`. E o equivalente ao `yarn.lock` ou `Package.resolved` — ele fixa toda a arvore de dependencias iOS para que cada desenvolvedor e cada maquina de CI construam com exatamente o mesmo codigo nativo. Nao commitar significa que dois desenvolvedores executando `pod install` no mesmo branch podem obter versoes diferentes de pods, causando falhas de build dificeis de diagnosticar.

O diretorio `Pods/` em si deve estar no `.gitignore`. Ele e reproduzivel via `pod install` e frequentemente ocupa centenas de megabytes.

## AppDelegate.mm para a New Architecture

Com o React Native 0.76, `AppDelegate.mm` usa `RCTAppDelegate` como classe base. Este e o ponto de entrada onde voce sinaliza ao runtime que seu app utiliza os recursos da New Architecture.

```objc
#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"MyApp";
  self.initialProps = @{};
  return [super application:application
      didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings]
      jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
```

`RCTAppDelegate` internamente le as flags da New Architecture que foram inseridas no momento do pod install. Voce nao define `bridgelessEnabled`, `turboModuleEnabled` ou `fabricEnabled` manualmente no codigo gerado — esses sao controlados pelas macros do Podfile e propagados por meio de defines de preprocessador do compilador (`RCT_NEW_ARCH_ENABLED`).

**Quando voce precisa sobrescrever:** Se estiver migrando um app brownfield ou precisar desabilitar seletivamente um recurso, voce pode sobrescrever a propriedade:

```objc
- (BOOL)fabricEnabled
{
  return YES; // explicito, equivalente ao padrao quando RCT_NEW_ARCH_ENABLED=1
}
```

Para integracao brownfield, voce pode instanciar `RCTBridge` diretamente em vez de usar `RCTAppDelegate`. Nesse caso, voce e responsavel por configurar a bridge com um registro de modulos que corresponda as flags do seu Podfile. Esse padrao e abordado no modulo de Brownfield.

## xcconfig e Variaveis de Ambiente

Projetos React Native vem com arquivos de configuracao do Xcode gerados pelo CocoaPods. Apos `pod install`, voce vera:

```
ios/
  Pods/
    Target Support Files/
      Pods-MyApp/
        Pods-MyApp.debug.xcconfig
        Pods-MyApp.release.xcconfig
```

Esses arquivos sao referenciados automaticamente pelas configuracoes do seu projeto. Se voce quiser adicionar suas proprias configuracoes de build (por exemplo, uma variavel `BUILD_ENV` passada para o `Info.plist`), a abordagem correta e adicionar um `.xcconfig` personalizado que inclua o do Pods:

```
// ios/Config/Debug.xcconfig
#include "Pods/Target Support Files/Pods-MyApp/Pods-MyApp.debug.xcconfig"

BUILD_ENV = development
API_BASE_URL = https://api-dev.example.com
```

Em seguida, no `Info.plist`, referencie a variavel:

```xml
<key>APIBaseURL</key>
<string>$(API_BASE_URL)</string>
<key>BuildEnvironment</key>
<string>$(BUILD_ENV)</string>
```

No seu codigo Swift, leia em tempo de execucao:

```swift
let apiBase = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String ?? ""
```

Aponte cada configuracao do Xcode (Debug, Release, Staging) para o arquivo `.xcconfig` correspondente nas configuracoes do projeto, na aba "Info". O `.xcconfig` dos Pods deve sempre ser incluido no topo — o CocoaPods escreve flags de linker la, e omitir o include quebra a fase de link.

## Schemes e Configuracoes

O React Native gera duas configuracoes por padrao: `Debug` e `Release`. Isso corresponde ao que voce ja conhece do Xcode.

Para um ambiente `Staging`, adicione uma terceira configuracao:

1. No Xcode, abra o arquivo de projeto (nao um target). Em "Info", duplique "Release" e nomeie como "Staging".
2. Crie `ios/Config/Staging.xcconfig` (inclua `Pods-MyApp.release.xcconfig`, pois o Staging usa otimizacoes de modo release, mas aponta para um backend de staging).
3. Adicione um novo scheme: Product > Scheme > New Scheme, nomeie como `MyApp Staging`. Edite o scheme e mude a Build Configuration de cada acao (Build, Run, Archive) para `Staging`.
4. No CI, passe `-scheme "MyApp Staging" -configuration Staging` para o `xcodebuild`.

Os nomes das configuracoes importam: o CocoaPods associa as configuracoes de build dos pods as configuracoes do seu app pelo nome. Se voce adicionar "Staging" e o CocoaPods nao souber sobre ela, voce recebera avisos de include de `xcconfig` ausente. Adicione um mapeamento no Podfile:

```ruby
project 'MyApp', {
  'Debug' => :debug,
  'Release' => :release,
  'Staging' => :release
}
```

## Fases de Build: Bundle React Native Code and Images

O React Native adiciona um script de fase de build personalizado ao seu target Xcode chamado "Bundle React Native code and images". E ele que invoca o Metro durante um build de Debug e empacota o JS para Release:

```bash
set -e

WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
REACT_NATIVE_XCODE="../node_modules/react-native/scripts/react-native-xcode.sh"

/bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"
```

No modo `DEBUG`, esse script inicia o servidor de bundle do Metro (ou se conecta a um ja em execucao). O app carrega o bundle JS via HTTP de `localhost:8081`. E por isso que voce ve o Metro packager iniciando quando executa o app pelo Xcode no modo debug.

No modo `RELEASE`, o script chama `react-native bundle` para produzir um `main.jsbundle` estatico e o copia, junto com o catalogo de assets, para o bundle do app. O IPA resultante e autossuficiente — nenhum servidor Metro e necessario.

Nao remova nem reordene essa fase de build. Ela deve ser executada antes da fase "Copy Bundle Resources" para que o `main.jsbundle` gerado e a pasta `assets/` existam antes que o Xcode tente incorpora-los.

## Swift Package Manager vs CocoaPods

A partir do React Native 0.76, o CocoaPods e o gerenciador de dependencias obrigatorio para iOS. O Swift Package Manager ainda nao e um cidadao de primeira classe para as proprias dependencias do React Native.

Os motivos sao estruturais. A integracao CocoaPods do React Native usa helpers Ruby personalizados (`use_react_native!`, `react_native_post_install`) para propagar flags de compilador, corrigir deployment targets e configurar o Hermes engine em dezenas de sub-specs. O SPM nao possui um sistema de hooks equivalente.

**Estado atual:**
- Pods principais do React Native: somente CocoaPods
- A maioria das bibliotecas da comunidade: somente CocoaPods (baseado em `.podspec`)
- Algumas bibliotecas utilitarias pure-Swift: compativel com SPM, mas se nao possuem modulo RN nativo, nao interagem com o CocoaPods de qualquer forma

**Abordagem hibrida:** Voce pode usar SPM para suas proprias bibliotecas pure-Swift (analytics, componentes de design system escritos em Swift) junto com CocoaPods para dependencias RN. Adicione pacotes SPM por meio de File > Add Packages no Xcode normalmente. Os dois sistemas nao entram em conflito, desde que os pacotes SPM nao precisem se expor para a camada JavaScript.

**O que esta por vir:** A equipe do React Native sinalizou que o suporte a SPM e um objetivo para uma versao principal futura. Alguns membros da comunidade mantem forks compativeis com SPM de bibliotecas populares. Para projetos em producao hoje, trate o CocoaPods como o unico caminho suportado para qualquer coisa que faca bridge com JavaScript.

## Erros Comuns do Xcode e Correcoes

### "Undefined symbol: _OBJC_CLASS_$_RCTBridge"

Esse erro significa que o linker nao consegue encontrar os simbolos do React Native. Quase sempre causado por um dos seguintes:

- Abertura de `.xcodeproj` em vez de `.xcworkspace`. Feche o Xcode, abra o arquivo workspace.
- `pod install` ausente apos adicionar uma nova dependencia. Execute `pod install` e limpe a pasta de build (Product > Clean Build Folder, ou `Shift+Cmd+K`).
- Incompatibilidade entre a versao npm do `react-native` e a versao do pod. Delete `Pods/` e `Podfile.lock`, execute `pod install` novamente.

### "No podspec found for 'SomePod'"

Uma biblioteca se registrou em `use_native_modules!`, mas seu `.podspec` referencia um arquivo ou dependencia que nao existe.

Passos para diagnosticar:
1. Verifique se voce executou `npm install` antes de `pod install`.
2. Leia o `.podspec` na raiz do pacote npm com problema. Procure por uma `dependency` ou `source_files` que aponte para um caminho que nao existe.
3. Verifique as issues do GitHub da biblioteca — muitas vezes e uma incompatibilidade de versao que requer uma versao npm especifica da biblioteca.

### Build Falha Apos Alterar Flags do Podfile

Se voce alternar `:hermes_enabled` ou `:fabric_enabled` no Podfile, voce deve executar um ciclo completo de limpeza:

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
```

Em seguida, no Xcode: Product > Clean Build Folder. Tambem delete o DerivedData:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

O DerivedData armazena em cache os targets de pod compilados. Se voce alterar os defines do compilador (como `RCT_NEW_ARCH_ENABLED`) sem limpar o DerivedData, o Xcode pode linkar um binario em cache construido com os defines antigos, produzindo crashes sutis em tempo de execucao em vez de erros de build.

### "The iOS Simulator deployment target is set to X.Y, but the range of supported deployment targets is Y.Z to A.B"

Isso acontece quando `react_native_post_install` nao foi aplicado, ou quando um pod tem um deployment target minimo mais antigo do que o seu projeto. O hook de pos-instalacao corrige todos os targets de pod para corresponder ao valor definido em `platform :ios`. Se voce ver esse aviso apos o hook estar presente, geralmente significa que um pod possui um minimo explicito que o CocoaPods nao consegue sobrescrever. Reporte ao mantenedor dessa biblioteca ou adicione uma sobrescrita manual em `post_install`:

```ruby
post_install do |installer|
  react_native_post_install(installer, config[:reactNativePath])
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0'
    end
  end
end
```

### "Command PhaseScriptExecution failed with a nonzero exit code" na Fase de Bundle

A fase de bundle do Metro falhou. Execute o comando equivalente manualmente no terminal para ver o erro real:

```bash
cd ios
NODE_BINARY=$(command -v node) \
  ../node_modules/.bin/react-native bundle \
  --entry-file index.js \
  --platform ios \
  --dev false \
  --bundle-output /tmp/main.jsbundle \
  --assets-dest /tmp/assets
```

Causas comuns: o Metro nao consegue resolver um modulo (`npm install` ausente), um plugin do Babel esta mal configurado, ou `node` nao esta no PATH que o Xcode ve (solucao: defina `NODE_BINARY` no script da fase de bundle ou use `.xcode.env` para exportar o PATH correto).

## Resumo

Seu conhecimento de iOS se transfere diretamente. A pasta `ios/` e um projeto Xcode real. O CocoaPods gerencia todas as dependencias nativas — tanto os internos do proprio React Native quanto as bibliotecas da comunidade. O Podfile controla as flags da New Architecture, e `Podfile.lock` deve ser commitado. O AppDelegate.mm permanece em Objective-C++ por design. A configuracao especifica de ambiente flui por meio de arquivos `.xcconfig` herdados por scheme. Falhas de build quase sempre se enquadram em tres categorias: arquivo errado aberto, pod install ausente ou DerivedData desatualizado.
