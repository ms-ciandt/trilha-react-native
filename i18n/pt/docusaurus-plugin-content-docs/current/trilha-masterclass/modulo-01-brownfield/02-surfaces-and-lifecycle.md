---
title: Surfaces e Lifecycle
---

## 4. Múltiplas Surfaces do RN no Mesmo App

Uma **surface** é uma entrada de `AppRegistry.registerComponent()` renderizada em uma view nativa. Você pode ter qualquer número de surfaces a partir do mesmo bundle JS, cada uma com sua própria árvore de componentes, props e estado React.

**Regra fundamental:** todas as surfaces compartilham a mesma thread JS e o mesmo registro de módulos. Elas não são runtimes isolados — são raízes React independentes rodando no mesmo engine.

```js
// index.js — registrar todas as surfaces de antemão
AppRegistry.registerComponent('HomeTab', () => HomeTabScreen);
AppRegistry.registerComponent('CheckoutFlow', () => CheckoutNavigator);
AppRegistry.registerComponent('ProfileMini', () => ProfileMiniWidget);
AppRegistry.registerComponent('SearchOverlay', () => SearchOverlayScreen);
```

No Android, cada surface é seu próprio `Fragment`/`View` com seu próprio `ReactSurface`:

```kotlin
// Criando duas surfaces simultaneamente
val homeSurface = reactHost.createSurface(
    activity = this,
    moduleName = "HomeTab",
    initialProps = Bundle()
)

val profileSurface = reactHost.createSurface(
    activity = this,
    moduleName = "ProfileMini",
    initialProps = Bundle().apply { putString("userId", userId) }
)
```

### Isolamento em super-apps: `react-native-sandbox`

Quando as surfaces precisam estar verdadeiramente isoladas (bundles JS diferentes, registros de módulos separados, sem estado compartilhado), use o [react-native-sandbox](https://github.com/callstackincubator/react-native-sandbox):

```kotlin
// Cada sandbox é um runtime JS separado
val checkoutSandbox = ReactNativeSandbox.create(
    context = this,
    bundleUrl = "https://cdn.myapp.com/checkout.bundle.js",
    allowedModules = listOf("AsyncStorage", "FetchModule")
)

val feedSandbox = ReactNativeSandbox.create(
    context = this,
    bundleUrl = "https://cdn.myapp.com/feed.bundle.js",
    allowedModules = listOf("ImageModule", "VideoModule")
)
```

A comunicação entre sandboxes usa uma API no estilo postMessage:

```kotlin
checkoutSandbox.sendMessage("cartUpdated", mapOf("itemCount" to 3))
```

```js
// Dentro do bundle de feed
SandboxBridge.addEventListener('cartUpdated', (payload) => {
  updateCartBadge(payload.itemCount);
});
```

> Use isolamento via sandbox quando: equipes diferentes controlam bundles diferentes, você precisa de versões separadas de dependências, ou a segurança exige fronteiras rígidas de módulos (por exemplo, uma surface de pagamento que não deve compartilhar memória com código de publicidade).

---

## 5. Lifecycle e o Host Nativo

### O modelo mental

```
Application
└── ReactHost (singleton, vive pelo tempo de vida do app)
    ├── JS Engine (Hermes) — uma thread JS
    ├── TurboModule Registry
    └── Surfaces (0..N, criadas/destruídas conforme necessário)
        ├── Surface A — "HomeTab"  (tem uma raiz React, montada no Fragment A)
        └── Surface B — "Checkout" (tem uma raiz React, montada no Fragment B)
```

### Lifecycle do ReactHost (Android, Nova Arquitetura)

```kotlin
class BrownfieldApp : Application() {

    val reactHost: ReactHost by lazy { buildReactHost() }

    override fun onCreate() {
        super.onCreate()
        // start() aquece o Hermes e carrega o bundle
        // É idempotente — seguro chamar múltiplas vezes
        reactHost.start()
    }

    private fun buildReactHost(): ReactHost {
        return ReactHostFactory.createReactHost(
            application = this,
            reactNativeHost = MyReactNativeHost(this),
        )
    }
}
```

Métodos de lifecycle de surface que você deve conhecer:

```kotlin
// Quando a tela nativa aparece
val surface = reactHost.createSurface(activity, "MyComponent", Bundle())
surface.start()             // monta a árvore React

// Quando a tela nativa vai para o background (manter estado mas pausar)
surface.stop()              // pausa a árvore React, libera recursos do Fabric

// Quando a tela nativa é destruída
surface.destroy()           // desmonta, libera todas as referências JS
```

### Lifecycle do RCTHost (iOS, Nova Arquitetura)

```swift
// AppDelegate.swift — lifecycle completo
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
        didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        ReactNativeHost.shared.start()  // assíncrono: carrega o bundle, aquece o Hermes
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // RCTHost pausa automaticamente a renderização do Fabric — nada necessário aqui
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Surfaces são destruídas pelo ARC/dealloc — nenhuma limpeza manual necessária
        // Mas se você mantiver referências fortes para surfaces, libere-as aqui
    }
}
```

Lifecycle de surface em um UIViewController:

```swift
final class CheckoutRNViewController: UIViewController {

    private var surface: RCTFabricSurface?

    override func viewDidLoad() {
        super.viewDidLoad()
        surface = RCTFabricSurface(
            surfacePresenter: ReactNativeHost.shared.host.surfacePresenter,
            moduleName: "CheckoutScreen",
            initialProperties: [:]
        )
        // montagem e layout ocorrem via RCTSurfaceHostingView
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        surface?.start()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        surface?.stop()
    }

    deinit {
        surface?.destroy()
    }
}
```

### Estratégia de warm-start

Na primeira vez que uma surface RN aparece, o Hermes precisa carregar e parsear o bundle JS. Em dispositivos de baixo desempenho, isso pode levar de 1 a 2 segundos. Estratégias:

| Estratégia | Como | Trade-off |
|---|---|---|
| Início antecipado do host | Chamar `reactHost.start()` no `Application.onCreate()` | Sempre aquecido, usa ~10 MB de RAM mesmo que o usuário nunca abra telas RN |
| Warm start condicional | Iniciar o host no login ou após a tela nativa principal carregar | Primeiro acesso ligeiramente atrasado, só paga o custo quando o usuário está ativo |
| Surface pré-construída | Chamar `surface.start()` antes do usuário tocar no botão | A surface está renderizando (invisível) antes da transição de tela |
| RAM bundle + inline requires | Config do Metro: `bundleCommand: 'ram-bundle'` | Reduz o tempo de parse inicial; módulos JS carregam de forma lazy |

---
