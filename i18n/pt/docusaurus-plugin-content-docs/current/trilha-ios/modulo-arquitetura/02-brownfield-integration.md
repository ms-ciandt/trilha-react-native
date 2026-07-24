---
title: Brownfield Integration — Embedding React Native in an Existing iOS App
---

# Brownfield Integration — Integrando React Native em um App iOS Existente

Integração brownfield significa que você já possui um aplicativo iOS funcionando e deseja adicionar telas React Native sem descartar o código existente. Esse é um caminho comum para equipes que querem adotar o RN de forma incremental, lançar uma nova funcionalidade rapidamente em JS multiplataforma, ou migrar uma tela por vez mantendo Swift e UIKit intactos.

## Quando o Brownfield Faz Sentido

Uma reescrita completa é cara e arriscada. O brownfield permite que você:

- Lance uma nova funcionalidade em React Native enquanto o restante do app permanece em Swift.
- Pilote a adoção do RN com uma única tela de baixo risco antes de comprometer toda a equipe.
- Migre gradualmente telas UIKit legadas sem congelar funcionalidades.
- Compartilhe lógica de negócio com um app Android desde o primeiro dia.

A restrição é que agora você possui dois runtimes em um único processo. Toda decisão arquitetural deve levar essa fronteira em consideração.

## Expo Não é uma Opção Aqui

O workflow gerenciado do Expo assume controle total do projeto nativo. Um app host brownfield já possui seu próprio projeto Xcode, seu próprio AppDelegate e seu próprio grafo de dependências. O Expo não pode ser adicionado em cima disso.

Você precisará de:

- **React Native CLI** (`npx react-native init`) — cria o workspace JS e o código nativo do React Native, mas você o integra ao seu projeto Xcode existente manualmente.
- **Bare workflow** — se você iniciou um projeto com `npx create-expo-app` e executou `expo prebuild`, você obtém um projeto Xcode bare que pode ser mesclado, mas isso é efetivamente equivalente ao CLI para fins de integração.

O restante deste guia assume o React Native CLI.

## Integração com CocoaPods

Seu app existente quase certamente usa CocoaPods. O React Native distribui suas dependências iOS através do CocoaPods, portanto o ponto de integração é o seu `Podfile`.

### Alterações mínimas no Podfile

```ruby
# Podfile (excerpt — merge into your existing file)

require_relative '../node_modules/react-native/scripts/react_native_pods'

platform :ios, '15.1'

prepare_react_native_project!

target 'YourExistingApp' do
  use_frameworks! :linkage => :static   # required for New Architecture

  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :fabric_enabled => true,            # New Architecture renderer
    :hermes_enabled => true
  )

  # your existing pods remain here unchanged
  pod 'Alamofire', '~> 5.8'
end
```

Pontos principais:

- `prepare_react_native_project!` define os flags de compilador necessários para JSI e Fabric.
- `:fabric_enabled => true` habilita o renderer Fabric (New Architecture). Sem isso, você retorna ao renderer Paper, que está depreciado.
- `:hermes_enabled => true` define o Hermes como a engine JS. Não remova isso — o Hermes é a única engine oficialmente suportada pela New Architecture.
- `use_frameworks! :linkage => :static` é obrigatório quando o Fabric está habilitado. Frameworks dinâmicos causam erros de símbolo duplicado no momento da linkagem.

Após editar seu Podfile:

```bash
cd ios
bundle exec pod install
```

Abra o `.xcworkspace` gerado, não o `.xcodeproj`.

### Localização do node_modules

Coloque seu `package.json` e `node_modules` na raiz do repositório (um nível acima da pasta `ios/`) ou ajuste o `:path` em `use_native_modules!` conforme necessário. O script de resolução de pods precisa encontrar `node_modules/react-native`.

## Apresentando uma Tela React Native a partir de um UIViewController

### Abordagem legada: RCTRootView

Antes da New Architecture, você criava uma view usando `RCTRootView`:

```swift
// Legacy — do not use with New Architecture
let bridge = RCTBridge(delegate: self, launchOptions: nil)
let rootView = RCTRootView(bridge: bridge!, moduleName: "MyRNScreen", initialProperties: nil)
```

Isso dependia da Bridge assíncrona, que está depreciada no React Native 0.76+.

### Abordagem com New Architecture: RCTFabricSurface

Com a New Architecture habilitada, o ponto de entrada é `RCTFabricSurface` coordenado pelo `RCTHost`.

```swift
import React
import ReactAppDependencyProvider

// AppDelegate.swift — initialize once per process
class AppDelegate: UIResponder, UIApplicationDelegate {

    var reactHost: RCTHost?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let bundleURL = RCTBundleURLProvider.sharedSettings().jsBundleURL(
            forBundleRoot: "index"
        )
        reactHost = RCTHost(
            bundleURL: bundleURL,
            hostDelegate: nil,
            turboModuleManagerDelegate: AppTurboModuleManagerDelegate(),
            jsEngineProvider: RCTHermesEngineProvider()
        )
        reactHost?.start()
        return true
    }
}
```

```swift
// ReactNativeViewController.swift
import React

class ReactNativeViewController: UIViewController {

    private var surface: RCTFabricSurface?

    var moduleName: String = "MyRNScreen"
    var initialProperties: [String: Any]? = nil

    override func viewDidLoad() {
        super.viewDidLoad()

        guard let host = (UIApplication.shared.delegate as? AppDelegate)?.reactHost else {
            return
        }

        surface = RCTFabricSurface(
            surfacePresenter: host.surfacePresenter,
            moduleName: moduleName,
            initialProperties: initialProperties ?? [:]
        )

        let surfaceHostingView = RCTFabricSurfaceHostingProxyRootView(surface: surface!)
        surfaceHostingView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(surfaceHostingView)

        NSLayoutConstraint.activate([
            surfaceHostingView.topAnchor.constraint(equalTo: view.topAnchor),
            surfaceHostingView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            surfaceHostingView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            surfaceHostingView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        surface?.start(with: CGSize(width: view.bounds.width, height: view.bounds.height))
    }
}
```

Apresente-o como qualquer outro view controller:

```swift
let rnVC = ReactNativeViewController()
rnVC.moduleName = "MyRNScreen"
rnVC.initialProperties = ["userId": currentUser.id, "theme": "dark"]
navigationController?.pushViewController(rnVC, animated: true)
```

## Passando Propriedades Iniciais do Swift para o React Native

`initialProperties` é um dicionário `[String: Any]` que se torna as `props` do componente raiz no lado JS. Ele é serializado via JSI de forma síncrona antes que a surface renderize seu primeiro frame.

Lado Swift:

```swift
rnVC.initialProperties = [
    "orderId": order.id,
    "customerName": order.customer.displayName,
    "returnRoute": "orders/detail"
]
```

Lado JS (o componente raiz registrado):

```tsx
import React from 'react';
import { View, Text } from 'react-native';

interface OrderScreenProps {
  orderId: string;
  customerName: string;
  returnRoute: string;
}

export default function OrderScreen({ orderId, customerName, returnRoute }: OrderScreenProps) {
  return (
    <View>
      <Text>{customerName} — Order {orderId}</Text>
    </View>
  );
}
```

As propriedades iniciais são somente leitura no momento da montagem. Para enviar dados após a surface estar visível, use um event emitter ou um método TurboModule.

## Integração com SwiftUI via UIViewControllerRepresentable

Se seu app usa SwiftUI, envolva `ReactNativeViewController` em um `UIViewControllerRepresentable`:

```swift
import SwiftUI

struct ReactNativeScreen: UIViewControllerRepresentable {

    let moduleName: String
    let initialProperties: [String: Any]?

    func makeUIViewController(context: Context) -> ReactNativeViewController {
        let vc = ReactNativeViewController()
        vc.moduleName = moduleName
        vc.initialProperties = initialProperties
        return vc
    }

    func updateUIViewController(_ uiViewController: ReactNativeViewController, context: Context) {
        // initialProperties are set at creation; live updates go through TurboModule events
    }
}
```

Uso em uma view SwiftUI:

```swift
struct ContentView: View {
    var body: some View {
        NavigationStack {
            NavigationLink("Open React Native Screen") {
                ReactNativeScreen(
                    moduleName: "SettingsScreen",
                    initialProperties: ["section": "notifications"]
                )
                .ignoresSafeArea()
            }
        }
    }
}
```

O modificador `.ignoresSafeArea()` garante que o React Native gerencie seus próprios insets de safe area, o que ele faz através do `react-native-safe-area-context`.

## Chamando Métodos Swift do React Native via TurboModule

Quando uma tela React Native precisa acionar um comportamento nativo — abrir uma câmera nativa, escrever no Keychain, ler o HealthKit — o caminho correto é um TurboModule.

### Implementação Swift

```swift
// NativeAnalyticsModule.swift
import Foundation

@objc(NativeAnalyticsModule)
class NativeAnalyticsModule: NSObject, NativeAnalyticsModuleSpec {

    @objc func trackEvent(_ name: String, properties: NSDictionary) {
        AnalyticsService.shared.track(name: name, props: properties as? [String: Any] ?? [:])
    }

    @objc static func requiresMainQueueSetup() -> Bool { false }
}
```

### Especificação JS (Codegen)

```ts
// NativeAnalyticsModule.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  trackEvent(name: string, properties: Record<string, unknown>): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAnalyticsModule');
```

### Uso em JS

```tsx
import NativeAnalytics from './NativeAnalyticsModule';

function handlePurchase(itemId: string) {
  NativeAnalytics.trackEvent('purchase_completed', { itemId, source: 'rn_screen' });
}
```

O Codegen gera o código de cola em C++ no momento da build a partir da especificação TypeScript. A chamada cruza para o Swift via JSI — sem overhead de serialização, sem round-trip assíncrono.

## Handoff de Navegação e Dados de Deep Link

Quando uma notificação push ou universal link aponta para uma tela React Native específica, o app iOS recebe a URL em Swift e deve passá-la ao navegador do RN.

### Opção 1 — Passar o deep link como propriedade inicial

Se a surface RN ainda não foi criada, inclua o deep link em `initialProperties`:

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any]) -> Bool {
    let rnVC = ReactNativeViewController()
    rnVC.moduleName = "DeepLinkHandler"
    rnVC.initialProperties = ["deepLinkUrl": url.absoluteString]
    window?.rootViewController?.present(rnVC, animated: true)
    return true
}
```

### Opção 2 — Enviar um evento para uma surface em execução

Se a surface RN já está montada, use `RCTEventEmitter` ou um evento TurboModule para entregar a URL:

```swift
// From Swift, after the surface is live
ReactNativeEventEmitter.shared.sendEvent(
    withName: "DeepLinkReceived",
    body: ["url": url.absoluteString]
)
```

```ts
// JS side
import { NativeEventEmitter, NativeModules } from 'react-native';

const emitter = new NativeEventEmitter(NativeModules.ReactNativeEventEmitter);

useEffect(() => {
  const subscription = emitter.addListener('DeepLinkReceived', ({ url }) => {
    router.navigate(url); // or Linking.openURL
  });
  return () => subscription.remove();
}, []);
```

No lado RN, o React Navigation e o Expo Router suportam o recebimento de deep links programaticamente através de sua configuração de linking.

## Gerenciamento de Memória: Um RCTHost por Processo

`RCTHost` inicializa a engine JS, inicia a conexão com o Metro (dev) ou carrega o bundle (prod), e possui o surface presenter compartilhado por todas as instâncias de `RCTFabricSurface`.

Regras:

- Crie exatamente um `RCTHost` para o tempo de vida do processo. Armazene-o no `AppDelegate` ou em um singleton dedicado. Criar múltiplos hosts desperdiça memória e pode causar comportamento indefinido no JSI.
- Cada tela RN obtém sua própria `RCTFabricSurface`. As surfaces são leves em relação ao host.
- Quando um `ReactNativeViewController` é dispensado, chame `surface?.stop()` e libere a referência. O host permanece ativo e pronto para a próxima surface.
- Não destrua o `RCTHost` a menos que o usuário tenha navegado completamente para fora de todas as surfaces RN e você tenha confirmado que nenhum trabalho assíncrono está pendente.

```swift
// In ReactNativeViewController
deinit {
    surface?.stop()
    surface = nil
}
```

## Metro Bundler em Desenvolvimento vs JS Empacotado em Produção

Em desenvolvimento, `RCTBundleURLProvider` resolve para `http://localhost:8081/index.bundle`. O Metro monitora o sistema de arquivos e serve bundles com hot update pela rede local. O dispositivo ou simulador deve alcançar seu Mac na porta 8081.

Em produção, o bundle é compilado offline e embutido no app:

```bash
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios/assets
```

Adicione `main.jsbundle` e a pasta `assets/` ao target do projeto Xcode. O `RCTBundleURLProvider` automaticamente recorre ao bundle embutido quando o servidor Metro não é alcançável em uma build de release.

O código de inicialização do `RCTHost` mostrado anteriormente trata isso automaticamente através de `RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")` — em builds de debug ele contata o Metro; em builds de release ele lê do bundle.

## Problemas Comuns de Integração

**Símbolos duplicados no momento da linkagem.** Geralmente causado pela mistura de frameworks estáticos e dinâmicos. Certifique-se de que `use_frameworks! :linkage => :static` está presente e que nenhum outro pod o sobrescreve.

**Tela preta no primeiro lançamento.** O bundle JS pode não ter terminado de carregar. Adicione um indicador de carregamento ao `ReactNativeViewController` e observe a propriedade stage do `RCTFabricSurface` para detectar quando a surface se torna `stageMounted`.

**O teclado não empurra o conteúdo para cima.** O React Native gerencia o desvio do teclado de forma independente. Use `KeyboardAvoidingView` com `behavior="padding"` no iOS e defina `keyboardShouldPersistTaps="handled"` nas scroll views.

**Conflitos de safe area.** Se o view controller host usa `edgesForExtendedLayout`, a surface RN pode sobrepor a navigation bar. Restrinja a surface view abaixo dos guides de safe area ou deixe o `react-native-safe-area-context` tratar isso passando os insets de safe area como propriedades iniciais.

**TurboModule não encontrado em runtime.** Verifique se o nome do módulo em `TurboModuleRegistry.getEnforcing` corresponde exatamente ao nome da classe `@objc`, e confirme que a classe aparece no seu `AppTurboModuleManagerDelegate`.
