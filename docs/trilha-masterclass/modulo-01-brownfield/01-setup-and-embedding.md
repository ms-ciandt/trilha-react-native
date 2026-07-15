---
title: Setup & Embedding
---

## 1. What Is Brownfield vs. Greenfield

**Greenfield** means you start the entire app from React Native on day one. The entry point is `index.js`, there is no native code you did not write, and the RN toolchain owns the build system.

**Brownfield** means the opposite: a native app already exists, has users, and has a native codebase you cannot throw away. React Native is embedded as a dependency — a guest in someone else's house.

The distinction matters because:

| Dimension | Greenfield | Brownfield |
|---|---|---|
| App entry point | `index.js` | Native `Activity` / `UIViewController` |
| Build system owner | Metro / Gradle plugin | Your existing Gradle / Xcode project |
| Navigation root | `NavigationContainer` | Native navigation stack |
| Lifecycle owner | RN runtime | Native host |
| Upgrade path | `npx react-native upgrade` | Manual — your Gradle/Podfile drive the version |
| Team model | JS-first | Native + JS teams in parallel |

Most enterprise apps that adopt RN fall into brownfield: a fintech that has a native app since 2016, a super-app where three teams own different surfaces, a startup that wants to add RN screens without rewriting a stable checkout flow.

The conceptual jump is inversion of control. In greenfield, RN owns the process. In brownfield, **your native code owns the process and RN is a library**.

---

## 2. Embedding RN into an Existing Native App

### How it works architecturally

On both platforms, the RN runtime lives inside a **host object** that you create once and reuse:

| Platform | Legacy Architecture | New Architecture (0.76+) |
|---|---|---|
| Android | `ReactInstanceManager` | `ReactHost` |
| iOS | `RCTBridge` | `RCTHost` |

The host loads the JS bundle, starts the JS engine (Hermes), wires up the TurboModule registry, and creates **surfaces** — individual RN trees rendered into native views.

> Starting with RN 0.76, New Architecture is on by default. The old bridge still works via the interop layer, but all new brownfield code should target `ReactHost` / `RCTHost`.

---

### Android Setup (New Architecture — ReactHost)

**1. Add RN to `build.gradle`**

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
// android/build.gradle (project level)
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

**2. Create the ReactHost singleton**

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
        // Eager init: warm up Hermes before the user navigates to any RN screen
        reactHost.start()
    }
}
```

> Calling `reactHost.start()` in `Application.onCreate()` front-loads JS engine initialization. On a Pixel 7 Pro, this typically saves 300-600ms from the first RN screen's perceived startup time.

**3. Host an RN surface inside a Fragment**

Using `ReactFragment` (the preferred approach for Fragment-based navigation):

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

Launching it from any native Fragment:

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

> **ReactFragment bug (fixed in 0.76):** Before RN 0.76, `ReactFragment` crashed with a `NullPointerException` in `ReactHost.createSurface()` when using New Architecture. If you target 0.75 or earlier, use `ReactActivityDelegate` directly or pin to Legacy Architecture.
> Reference: [reactwg discussion #182](https://github.com/reactwg/react-native-new-architecture/discussions/182)

---

### iOS Setup (New Architecture — RCTHost)

**1. Add RN via CocoaPods**

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

**2. Create the RCTHost singleton**

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

Call in `AppDelegate`:

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

**3. Embed an RN surface into any UIViewController**

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

Push it from your native navigation:

```swift
// From any UIViewController
func openRNCheckout(orderId: String) {
    let vc = CheckoutRNViewController()
    vc.orderId = orderId
    navigationController?.pushViewController(vc, animated: true)
}
```

---

### On the JS side: registering surfaces

Every component name passed as `moduleName` / `componentName` must be registered in `index.js`:

```js
// index.js
import { AppRegistry } from 'react-native';
import CheckoutScreen from './src/screens/CheckoutScreen';
import FeedScreen from './src/screens/FeedScreen';

// Each name matches the moduleName used in native
AppRegistry.registerComponent('CheckoutScreen', () => CheckoutScreen);
AppRegistry.registerComponent('FeedScreen', () => FeedScreen);
```

The `initialProperties` passed from native arrive as `props` in the React component:

```tsx
// src/screens/CheckoutScreen.tsx
interface CheckoutProps {
  orderId: string;
  isGuest: boolean;
}

export default function CheckoutScreen({ orderId, isGuest }: CheckoutProps) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text>Order: {orderId}</Text>
      {isGuest && <GuestBanner />}
    </SafeAreaView>
  );
}
```

---

## 3. RN within Activities / ViewControllers

Different integration levels depending on how much native UI you need to keep.

### Option A: Full-screen (Activity / UIViewController owns the entire screen)

The entire screen is an RN surface. The native `Activity` / `UIViewController` acts only as a shell that hosts the RN view and forwards lifecycle events.

This is the simplest model and what `ReactFragment` / `CheckoutRNViewController` above implement.

### Option B: Partial screen (RN embedded inside a native layout)

A native screen that has a header, bottom bar, or other native UI — with an RN surface in the middle.

```kotlin
// NativeDetailActivity.kt (Android)
class NativeDetailActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_detail)

        // The native toolbar and bottom bar are in the XML layout.
        // The center container gets an RN surface.
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
    private let headerView = NativeHeaderView()   // native UIView
    private let footerView = NativeFooterView()   // native UIView

    override func viewDidLoad() {
        super.viewDidLoad()

        // Native header
        view.addSubview(headerView)

        // RN surface in the middle
        let rnVC = ProductDetailRNViewController()
        rnVC.productId = productId
        addChild(rnVC)
        view.addSubview(rnVC.view)
        rnVC.didMove(toParent: self)

        // Native footer
        view.addSubview(footerView)

        // ... constraints ...
    }
}
```

### Option C: RN component in a native list/scroll view

Not recommended for performance reasons — mixing RN scroll views inside native scroll views breaks momentum scrolling and nesting detection. If you need this, wrap the RN tree in a non-scrollable surface and manage scroll in native.

### Lifecycle forwarding (Android)

The RN runtime needs to know about `Activity` lifecycle events to tear down properly. `ReactFragment` handles this automatically. If you host RN directly in an `Activity`:

```kotlin
// Only needed if you are NOT using ReactFragment
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
