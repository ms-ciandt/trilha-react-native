---
title: Surfaces & Lifecycle
---

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc01_02_surfaces-and-lifecycle.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## 4. Multiple Surfaces from RN in the Same App

A **surface** is one `AppRegistry.registerComponent()` entry rendered into one native view. You can have any number of surfaces from the same JS bundle, each with its own component tree, props, and React state.

**Key rule:** all surfaces share the same JS thread and the same module registry. They are not isolated runtimes — they are independent React roots running on the same engine.

```js
// index.js — register all surfaces up front
AppRegistry.registerComponent('HomeTab', () => HomeTabScreen);
AppRegistry.registerComponent('CheckoutFlow', () => CheckoutNavigator);
AppRegistry.registerComponent('ProfileMini', () => ProfileMiniWidget);
AppRegistry.registerComponent('SearchOverlay', () => SearchOverlayScreen);
```

On Android, each surface is its own `Fragment`/`View` with its own `ReactSurface`:

```kotlin
// Creating two surfaces simultaneously
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

### Super-app isolation: `react-native-sandbox`

When surfaces must be truly isolated (different JS bundles, separate module registries, no shared state), use [react-native-sandbox](https://github.com/callstackincubator/react-native-sandbox):

```kotlin
// Each sandbox is a separate JS runtime
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

Inter-sandbox communication uses postMessage-style API:

```kotlin
checkoutSandbox.sendMessage("cartUpdated", mapOf("itemCount" to 3))
```

```js
// Inside the feed bundle
SandboxBridge.addEventListener('cartUpdated', (payload) => {
  updateCartBadge(payload.itemCount);
});
```

> Use sandbox isolation when: different teams own different bundles, you need separate dependency versions, or security requires hard module boundaries (e.g., a payment surface that must not share memory with advertising code).

---

## 5. Life Cycle and Native Host

### The mental model

```
Application
└── ReactHost (singleton, lives for the app lifetime)
    ├── JS Engine (Hermes) — one JS thread
    ├── TurboModule Registry
    └── Surfaces (0..N, created/destroyed as needed)
        ├── Surface A — "HomeTab"  (has a React root, mounted in Fragment A)
        └── Surface B — "Checkout" (has a React root, mounted in Fragment B)
```

### ReactHost lifecycle (Android, New Architecture)

```kotlin
class BrownfieldApp : Application() {

    val reactHost: ReactHost by lazy { buildReactHost() }

    override fun onCreate() {
        super.onCreate()
        // start() warms up Hermes and loads the bundle
        // It is idempotent — safe to call multiple times
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

Surface lifecycle methods you should understand:

```kotlin
// When native screen appears
val surface = reactHost.createSurface(activity, "MyComponent", Bundle())
surface.start()             // mounts the React tree

// When native screen is backgrounded (keep state but pause)
surface.stop()              // pauses the React tree, frees Fabric resources

// When native screen is destroyed
surface.destroy()           // unmounts, releases all JS references
```

### RCTHost lifecycle (iOS, New Architecture)

```swift
// AppDelegate.swift — full lifecycle
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
        didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        ReactNativeHost.shared.start()  // async: loads bundle, warms Hermes
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // RCTHost auto-pauses Fabric rendering — nothing needed here
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Surfaces are destroyed by ARC/dealloc — no manual cleanup needed
        // But if you hold strong references to surfaces, release them here
    }
}
```

Surface lifecycle in a UIViewController:

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
        // mount + layout happen via RCTSurfaceHostingView
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

### Warm-start strategy

The first time an RN surface appears, Hermes must load and parse the JS bundle. On low-end devices this can take 1-2 seconds. Strategies:

| Strategy | How | Trade-off |
|---|---|---|
| Eager host start | Call `reactHost.start()` in `Application.onCreate()` | Always warm, uses ~10 MB RAM even if user never opens RN screens |
| Conditional warm start | Start host on login or after the main native screen loads | Slightly delayed first open, only pays cost when user is active |
| Pre-built surface | Call `surface.start()` before the user taps the button | Surface is rendering (invisible) before the screen transition |
| RAM bundle + inline requires | Metro config: `bundleCommand: 'ram-bundle'` | Reduces initial parse time; JS modules load lazily |

---
