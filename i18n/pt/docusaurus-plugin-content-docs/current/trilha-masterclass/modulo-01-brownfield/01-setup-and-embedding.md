---
title: Setup e Embedding
---

## 1. O que é Brownfield vs. Greenfield

**Greenfield** significa começar o aplicativo inteiro em React Native desde o primeiro dia. O ponto de entrada é o `index.js`, não há código nativo que você não tenha escrito, e o toolchain do RN controla o sistema de build.

**Brownfield** significa o oposto: um aplicativo nativo já existe, possui usuários e tem uma base de código nativa que não pode ser descartada. O React Native é embutido como uma dependência — um convidado na casa de outra pessoa.

A distinção importa porque:

| Dimensão | Greenfield | Brownfield |
|---|---|---|
| Ponto de entrada do app | `index.js` | `Activity` / `UIViewController` nativo |
| Dono do sistema de build | Metro / plugin Gradle | Seu projeto Gradle / Xcode existente |
| Raiz da navegação | `NavigationContainer` | Stack de navegação nativo |
| Dono do lifecycle | Runtime do RN | Host nativo |
| Caminho de atualização | `npx react-native upgrade` | Manual — seu Gradle/Podfile determina a versão |
| Modelo de equipe | JS em primeiro lugar | Equipes nativo + JS em paralelo |

A maioria dos aplicativos corporativos que adota o RN se enquadra no brownfield: uma fintech que possui um app nativo desde 2016, um super-app em que três equipes controlam superfícies diferentes, uma startup que quer adicionar telas RN sem reescrever um fluxo de checkout estável.

A virada conceitual é a inversão de controle. No greenfield, o RN controla o processo. No brownfield, **o código nativo controla o processo e o RN é uma biblioteca**.

---

## 2. Embutindo o RN em um App Nativo Existente

### Como funciona arquiteturalmente

Em ambas as plataformas, o runtime do RN vive dentro de um **objeto host** que você cria uma única vez e reutiliza:

| Plataforma | Arquitetura Legada | Nova Arquitetura (0.76+) |
|---|---|---|
| Android | `ReactInstanceManager` | `ReactHost` |
| iOS | `RCTBridge` | `RCTHost` |

O host carrega o bundle JS, inicia o engine JS (Hermes), conecta o registro de TurboModules e cria **surfaces** — árvores RN individuais renderizadas em views nativas.

> A partir do RN 0.76, a Nova Arquitetura está ativada por padrão. A bridge antiga ainda funciona via camada de interoperabilidade, mas todo código brownfield novo deve usar `ReactHost` / `RCTHost`.

---

### Setup no Android (Nova Arquitetura — ReactHost)

**1. Adicionar o RN ao `build.gradle`**

```kotlin
// android/app/build.gradle
android {
    defaultConfig {
        minSdk = 24
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
    implementation("com.facebook.react:hermes-android")
}
```

```kotlin
// android/build.gradle (nível do projeto)
buildscript {
    repositories {
        google()
        mavenCentral()
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url = "https://jitpack.io" }
        maven { url = "https://packages.react-native.com" }
    }
}
```

**2. Criar o singleton ReactHost**

```kotlin
// BrownfieldApp.kt
import android.app.Application
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.defaults.DefaultReactHost
import com.facebook.react.PackageList

class BrownfieldApp : Application() {

    val reactHost: ReactHost by lazy {
        DefaultReactHost.getDefaultReactHost(
            applicationContext = this,
            reactNativeHost = object : DefaultReactNativeHost(this) {
                override fun getPackages() = PackageList(this).packages
                override fun getJSMainModuleName() = "index"
                override fun getUseDeveloperSupport() = BuildConfig.DEBUG
                override val isNewArchEnabled = true
                override val isHermesEnabled = true
            }
        )
    }

    override fun onCreate() {
        super.onCreate()
        // Init antecipado: aquece o Hermes antes do usuário navegar para qualquer tela RN
        reactHost.start()
    }
}
```

> Chamar `reactHost.start()` no `Application.onCreate()` antecipa a inicialização do engine JS. Em um Pixel 7 Pro, isso tipicamente economiza 300-600ms do tempo de inicialização percebido da primeira tela RN.

**3. Hospedar uma surface RN dentro de um Fragment**

Usando `ReactFragment` (a abordagem preferida para navegação baseada em Fragment):

```kotlin
// CheckoutRNFragment.kt
import com.facebook.react.ReactFragment
import android.os.Bundle

class CheckoutRNFragment : ReactFragment() {

    override val componentName: String = "CheckoutScreen"

    override val launchOptions: Bundle
        get() = Bundle().apply {
            putString("orderId", requireArguments().getString("orderId"))
            putBoolean("isGuest", requireArguments().getBoolean("isGuest", false))
        }
}
```

Iniciando a partir de qualquer Fragment nativo:

```kotlin
// NativeCheckoutActivity.kt
fun openRNCheckout(orderId: String) {
    val fragment = CheckoutRNFragment().apply {
        arguments = Bundle().apply {
            putString("orderId", orderId)
            putBoolean("isGuest", false)
        }
    }

    supportFragmentManager
        .beginTransaction()
        .replace(R.id.container, fragment)
        .addToBackStack("rn_checkout")
        .commit()
}
```

> **Bug no ReactFragment (corrigido no 0.76):** Antes do RN 0.76, o `ReactFragment` crashava com `NullPointerException` em `ReactHost.createSurface()` ao usar a Nova Arquitetura. Se você usa 0.75 ou anterior, use `ReactActivityDelegate` diretamente ou fixe na Arquitetura Legada.
> Referência: [discussão reactwg #182](https://github.com/reactwg/react-native-new-architecture/discussions/182)

---

### Setup no iOS (Nova Arquitetura — RCTHost)

**1. Adicionar o RN via CocoaPods**

```ruby
# Podfile
require_relative '../node_modules/react-native/scripts/react_native_pods'

platform :ios, '15.1'

target 'MyExistingApp' do
  use_react_native!(
    path: '../node_modules/react-native',
    hermes_enabled: true,
    fabric_enabled: true,
    new_arch_enabled: true
  )
end
```

**2. Criar o singleton RCTHost**

```swift
// ReactNativeHost.swift
import React
import React_RCTAppDelegate

final class ReactNativeHost {
    static let shared = ReactNativeHost()

    let host: RCTHost

    private init() {
        let bundleURL = Bundle.main.url(
            forResource: "main",
            withExtension: "jsbundle"
        ) ?? RCTBundleURLProvider.sharedSettings().jsBundleURL(
            forBundleRoot: "index"
        )

        host = RCTHost(
            bundleURLProvider: { bundleURL },
            hostDelegate: nil,
            turboModuleManagerDelegate: AppTurboModuleManagerDelegate(),
            jsEngineProvider: { RCTHermesInstance() }
        )
    }

    func start() {
        host.start()
    }
}
```

Chamar no `AppDelegate`:

```swift
// AppDelegate.swift
func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?
) -> Bool {
    ReactNativeHost.shared.start()
    return true
}
```

**3. Embutir uma surface RN em qualquer UIViewController**

```swift
// CheckoutRNViewController.swift
import UIKit
import React

final class CheckoutRNViewController: UIViewController {
    private var rnView: RCTSurfaceHostingView?

    var orderId: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()

        let surface = RCTFabricSurface(
            surfacePresenter: ReactNativeHost.shared.host.surfacePresenter,
            moduleName: "CheckoutScreen",
            initialProperties: ["orderId": orderId]
        )

        let hostingView = RCTSurfaceHostingView(
            surface: surface,
            sizeMeasureMode: [.widthExact, .heightExact]
        )
        hostingView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hostingView)

        NSLayoutConstraint.activate([
            hostingView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            hostingView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            hostingView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        rnView = hostingView
    }
}
```

Fazer push a partir da navegação nativa:

```swift
// A partir de qualquer UIViewController
func openRNCheckout(orderId: String) {
    let vc = CheckoutRNViewController()
    vc.orderId = orderId
    navigationController?.pushViewController(vc, animated: true)
}
```

---

### No lado JS: registrando surfaces

Todo nome de componente passado como `moduleName` / `componentName` deve ser registrado no `index.js`:

```js
// index.js
import { AppRegistry } from 'react-native';
import CheckoutScreen from './src/screens/CheckoutScreen';
import FeedScreen from './src/screens/FeedScreen';

// Cada nome corresponde ao moduleName usado no nativo
AppRegistry.registerComponent('CheckoutScreen', () => CheckoutScreen);
AppRegistry.registerComponent('FeedScreen', () => FeedScreen);
```

As `initialProperties` passadas do nativo chegam como `props` no componente React:

```tsx
// src/screens/CheckoutScreen.tsx
interface CheckoutProps {
  orderId: string;
  isGuest: boolean;
}

export default function CheckoutScreen({ orderId, isGuest }: CheckoutProps) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text>Pedido: {orderId}</Text>
      {isGuest && <GuestBanner />}
    </SafeAreaView>
  );
}
```

---

## 3. RN dentro de Activities / ViewControllers

Diferentes níveis de integração dependendo de quanto da UI nativa precisa ser mantida.

### Opção A: Tela cheia (Activity / UIViewController ocupa a tela inteira)

A tela inteira é uma surface RN. A `Activity` / `UIViewController` nativa atua apenas como shell que hospeda a view RN e repassa eventos de lifecycle.

Este é o modelo mais simples e o que `ReactFragment` / `CheckoutRNViewController` acima implementam.

### Opção B: Tela parcial (RN embutido dentro de um layout nativo)

Uma tela nativa com header, barra inferior ou outra UI nativa — com uma surface RN no meio.

```kotlin
// NativeDetailActivity.kt (Android)
class NativeDetailActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_detail)

        // A toolbar nativa e a barra inferior estão no layout XML.
        // O container central recebe uma surface RN.
        if (savedInstanceState == null) {
            val rnFragment = ProductDetailRNFragment().apply {
                arguments = Bundle().apply { putString("productId", intent.getStringExtra("productId")) }
            }
            supportFragmentManager
                .beginTransaction()
                .add(R.id.rn_container, rnFragment)
                .commit()
        }
    }
}
```

```swift
// NativeDetailViewController.swift (iOS)
class NativeDetailViewController: UIViewController {
    private let headerView = NativeHeaderView()   // UIView nativa
    private let footerView = NativeFooterView()   // UIView nativa

    override func viewDidLoad() {
        super.viewDidLoad()

        // Header nativo
        view.addSubview(headerView)

        // Surface RN no meio
        let rnVC = ProductDetailRNViewController()
        rnVC.productId = productId
        addChild(rnVC)
        view.addSubview(rnVC.view)
        rnVC.didMove(toParent: self)

        // Footer nativo
        view.addSubview(footerView)

        // ... constraints ...
    }
}
```

### Opção C: Componente RN dentro de uma lista/scroll view nativa

Não recomendado por questões de performance — misturar scroll views do RN dentro de scroll views nativas quebra o momentum scrolling e a detecção de aninhamento. Se precisar disso, envolva a árvore RN em uma surface sem scroll e gerencie o scroll no nativo.

### Repasse de lifecycle (Android)

O runtime do RN precisa conhecer os eventos de lifecycle da `Activity` para encerrar corretamente. O `ReactFragment` lida com isso automaticamente. Se você hospedar o RN diretamente em uma `Activity`:

```kotlin
// Necessário apenas se você NÃO estiver usando ReactFragment
class MyRNActivity : AppCompatActivity() {
    private val reactDelegate by lazy {
        ReactActivityDelegate(this, "MyComponent")
    }

    override fun onPause() { super.onPause(); reactDelegate.onPause() }
    override fun onResume() { super.onResume(); reactDelegate.onResume() }
    override fun onDestroy() { super.onDestroy(); reactDelegate.onDestroy() }
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        reactDelegate.onActivityResult(requestCode, resultCode, data, true)
    }
}
```

---
