---
title: Configuração do Projeto iOS — CocoaPods, Xcode Workspace e SPM
---

# Configuração do Projeto iOS — CocoaPods, Xcode Workspace e SPM

## Visão Geral em Vídeo

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/fund_00_ios-project-setup.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/fund_00_ios-project-setup.vtt" srclang="pt" label="Português" default>
  Seu navegador não suporta o elemento de vídeo.
</video>

Leia este arquivo antes de rodar o app pela primeira vez. A camada iOS do React Native é um projeto Xcode completo gerenciado pelo CocoaPods — o mesmo ferramental que você já conhece, mas com convenções que diferem de um app Swift puro. Acertar isso no primeiro dia evita uma categoria de erros de build fáceis de cometer e confusos de diagnosticar.

## Por Que o React Native Ainda Usa CocoaPods

Se você vem de um projeto Swift moderno, o primeiro instinto pode ser usar o Swift Package Manager. O SPM é excelente para dependências Swift puras, mas o core do React Native é escrito em C++ e Objective-C++. O runtime JSI, o renderer Fabric e a infraestrutura de TurboModules são distribuídos como CocoaPods porque:

- Exigem `pod_target_xcconfig` para definir flags de biblioteca padrão C++ (`c++17`, headers do Boost) — o SPM não tem equivalente para isso.
- A macro `use_react_native!` do Podfile aplica patches de build settings em todos os pod targets após a resolução — um sistema de post-install hook que o SPM não suporta.
- Muitas bibliotecas da comunidade distribuem arquivos `.podspec` e não possuem um manifesto SPM. O auto-linking via `use_native_modules!` depende do CocoaPods.

O React Native 0.76 inclui suporte experimental a SPM para um subconjunto de pacotes core, mas o stack completo — TurboModules, Fabric, Hermes — ainda exige CocoaPods. Trate o CocoaPods como uma ferramenta de primeira classe, não como um legado a ser contornado.

## A Pasta ios/

Rodar `npx react-native init MyApp` ou `npx create-expo-app` gera um diretório `ios/`:

```
ios/
  MyApp/
    AppDelegate.mm          ← ponto de entrada (Objective-C++, não Swift)
    AppDelegate.h
    Info.plist              ← bundle ID, permissões, nome de exibição
    Images.xcassets/        ← ícones e imagens de launch
    LaunchScreen.storyboard
    main.m
  MyApp.xcodeproj/          ← projeto Xcode puro — NÃO abrir diretamente
  MyApp.xcworkspace/        ← workspace que inclui os Pods — sempre abrir este
  Podfile                   ← manifesto de dependências — você edita este
  Podfile.lock              ← lockfile — commitar no git
  Pods/                     ← diretório gerado — NÃO commitar
```

A distinção entre `.xcworkspace` e `.xcodeproj` é idêntica a qualquer outro projeto CocoaPods. Abrir o `.xcodeproj` diretamente faz com que o Xcode não encontre os targets dos Pods — o build falha imediatamente com erros "No such module 'React'". Sempre abra o `.xcworkspace`.

## AppDelegate.mm — Por Que Não Swift

O `AppDelegate` é Objective-C++ (`.mm`) porque o runtime C++ do React Native (JSI, Fabric, TurboModules) é exposto através de headers C++. Um arquivo `.swift` não consegue importar esses headers diretamente. Esta não é uma limitação a ser contornada — é um limite intencional:

- Seu código de feature fica em Swift.
- Seus view controllers ficam em Swift.
- O ponto de entrada de inicialização do RN fica em `.mm`.

Se precisar de Swift no `AppDelegate`, você pode adicionar um helper Swift e importá-lo via `MyApp-Swift.h`, mas o arquivo em si deve permanecer `.mm` enquanto o app inicializar o runtime do React Native.

## Anatomia do Podfile

Um Podfile do React Native 0.76:

```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, min_ios_version_supported  # resolve para 14.0 no RN 0.76
prepare_react_native_project!

target 'MyApp' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true,
    :fabric_enabled => true,
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

| Entrada | O que faz |
|---------|-----------|
| `min_ios_version_supported` | Resolve para `14.0` — não reduza; Fabric e JSI requerem APIs Metal do iOS 14 |
| `use_native_modules!` | Varre `node_modules` em busca de cada pacote com `.podspec` e faz auto-linking |
| `use_react_native!` | Adiciona todos os pods core: `React-Core`, `React-Fabric`, `React-jsi`, `hermes-engine` |
| `react_native_post_install` | Aplica flags C++ e deployment targets em todos os pod targets — remover isso quebra o build |

### Adicionando uma Dependência

Instale um pacote npm que tenha código nativo iOS:

```bash
npx expo install react-native-mmkv   # ou: npm install react-native-mmkv
cd ios && bundle exec pod install
```

O `use_native_modules!` detecta o novo `.podspec` automaticamente. Você não adiciona uma linha `pod 'MMKV'` manualmente. Reabra o Xcode após o `pod install` terminar.

Para pacotes que não são auto-linkados (incomum), adicione a linha do pod manualmente antes de `use_react_native!`:

```ruby
target 'MyApp' do
  config = use_native_modules!
  pod 'SomeManualPod', '~> 2.0'
  use_react_native!( ... )
end
```

## pod install vs pod update

| Comando | Quando executar |
|---------|----------------|
| `pod install` | Após clonar, após `npm install`, após qualquer mudança no Podfile |
| `pod update NomeDoPod` | Quando quiser deliberadamente uma versão mais nova de um pod específico |
| `pod update` (sem argumentos) | Ao fazer upgrade do próprio `react-native` — resolve todos os pods para as versões compatíveis mais recentes |

O `pod install` fixa cada pod na versão registrada no `Podfile.lock`. Isso é intencional — garante que sua máquina, a máquina do seu colega e o CI buildem com exatamente o mesmo código nativo.

**Sempre commite o `Podfile.lock`.** Ele é o equivalente iOS do `yarn.lock`. Não commitá-lo significa que dois desenvolvedores rodando `pod install` na mesma branch podem silenciosamente obter versões diferentes de pods, causando falhas de build difíceis de diagnosticar no estilo "funciona na minha máquina".

**Nunca commite `Pods/`.** Adicione ao `.gitignore`. O diretório tem centenas de megabytes e é totalmente reproduzível com `pod install`.

## CocoaPods vs Swift Package Manager — Comparação Prática

| Capacidade | CocoaPods | Swift Package Manager |
|------------|-----------|----------------------|
| Dependências C++ | Sim — `pod_target_xcconfig` define flags do compilador | Limitado — sem equivalente ao `xcconfig` |
| Post-install hooks | Sim — `react_native_post_install` | Não |
| Auto-linking de pacotes npm | Sim — `use_native_modules!` | Não |
| Bibliotecas Swift puras | Sim | Sim (preferido para Swift puro) |
| Integração com projeto Xcode | Baseada em workspace | Integração nativa com Xcode |
| Suporte ao stack completo do React Native | Completo | Experimental (RN 0.76+, parcial) |

Na prática: use CocoaPods para tudo relacionado ao React Native. Se você adicionar uma biblioteca utilitária Swift pura que tem um pacote SPM (ex: `swift-algorithms`), pode adicioná-la pela integração SPM do Xcode lado a lado com o CocoaPods — os dois coexistem no mesmo projeto sem conflito.

## bundle exec pod install vs pod install

Se você tem o CocoaPods instalado globalmente (`gem install cocoapods`) e o projeto tem um `Gemfile` na raiz, sempre prefira:

```bash
bundle exec pod install
```

O `bundle exec` executa a versão do CocoaPods fixada no `Gemfile.lock`, não a versão global do seu sistema. Isso é crítico no CI — uma incompatibilidade de versão global entre máquinas de desenvolvedores e o CI é uma fonte comum de bugs do tipo "pod install funciona localmente mas falha no Actions".

Se não houver `Gemfile`, o `pod install` simples funciona. Verifique se o projeto tem um `Gemfile` antes de escolher.

## Erros Comuns na Primeira Execução

| Erro | Causa | Solução |
|------|-------|---------|
| `No such module 'React'` | Abriu `.xcodeproj` em vez de `.xcworkspace` | Feche o Xcode, abra `.xcworkspace` |
| `The sandbox is not in sync with the Podfile.lock` | `pod install` não foi executado após `npm install` | `cd ios && pod install` |
| `Unable to find a specification for 'React-Core'` | Rodou `pod install` antes de `npm install` | Execute `npm install` primeiro, depois `pod install` |
| `error: include of non-modular header` | Flag de padrão C++ faltando | Verifique se `react_native_post_install` está no bloco `post_install` |
| `Undefined symbols for architecture arm64` | Pod ausente do `Podfile` ou `pod install` não re-executado após adicionar pacote | Adicione o pod ou re-execute `pod install` |

## O Que Vem a Seguir

Uma vez que o `pod install` tenha sucesso e o app rode, o CocoaPods fica praticamente invisível no dia a dia. Você voltará a ele quando:

- Adicionar um novo pacote npm com código nativo — re-execute `pod install`
- Fazer upgrade do React Native — execute `pod update` e depois `pod install`
- Configurar CI — veja a [configuração de CI/CD com Xcode e CocoaPods](../modulo-cicd/xcode-cocoapods-setup) para estratégias de cache e configuração do `bundle exec`

O restante deste módulo cobre conceitos de JavaScript e React — a configuração do tooling iOS está agora resolvida.
