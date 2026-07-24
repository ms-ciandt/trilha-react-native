---
title: Brownfield Integration — Embedding React Native in an Existing iOS App
---

# Brownfield Integration — Embedding React Native in an Existing iOS App

Brownfield integration means you already have a working iOS application and want to add React Native screens without discarding existing code. This is a common path for teams that want to adopt RN incrementally, ship a new feature quickly in cross-platform JS, or migrate one screen at a time while keeping Swift and UIKit intact.

## When Brownfield Makes Sense

A full rewrite is expensive and risky. Brownfield lets you:

- Ship a new feature in React Native while the rest of the app stays in Swift.
- Pilot RN adoption with a single low-risk screen before committing the entire team.
- Gradually migrate legacy UIKit screens without a feature freeze.
- Share business logic with an Android counterpart from day one.

The constraint is that you now own two runtimes in one process. Every architectural decision must account for that boundary.

## Expo Is Not an Option Here

Expo managed workflow takes full control of the native project. A brownfield host app already has its own Xcode project, its own AppDelegate, and its own dependency graph. Expo cannot be layered on top of that.

You need either:

- **React Native CLI** (`npx react-native init`) — creates the JS workspace and React Native's native code, but you integrate it into your existing Xcode project manually.
- **Bare workflow** — if you started a project with `npx create-expo-app` and ran `expo prebuild`, you get a bare Xcode project you can merge, but this is effectively the same as CLI for integration purposes.

The rest of this guide assumes React Native CLI.

## CocoaPods Integration

Your existing app almost certainly uses CocoaPods. React Native distributes its iOS dependencies through CocoaPods, so the integration point is your `Podfile`.

### Minimum Podfile changes

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

Key points:

- `prepare_react_native_project!` sets compiler flags required by JSI and Fabric.
- `:fabric_enabled => true` enables the Fabric renderer (New Architecture). Without it you fall back to the deprecated Paper renderer.
- `:hermes_enabled => true` sets Hermes as the JS engine. Do not remove this — Hermes is the only officially supported engine for New Architecture.
- `use_frameworks! :linkage => :static` is required when Fabric is enabled. Dynamic frameworks cause duplicate symbol errors at link time.

After editing your Podfile:

```bash
cd ios
bundle exec pod install
```

Open the resulting `.xcworkspace`, not the `.xcodeproj`.

### Node modules location

Place your `package.json` and `node_modules` at the repository root (one level above the `ios/` folder) or adjust the `:path` in `use_native_modules!` accordingly. The pods resolution script needs to find `node_modules/react-native`.

## Presenting a React Native Screen from a UIViewController

### Legacy approach: RCTRootView

Before New Architecture, you created a view using `RCTRootView`:

```swift
// Legacy — do not use with New Architecture
let bridge = RCTBridge(delegate: self, launchOptions: nil)
let rootView = RCTRootView(bridge: bridge!, moduleName: "MyRNScreen", initialProperties: nil)
```

This relied on the asynchronous Bridge, which is deprecated in React Native 0.76+.

### New Architecture approach: RCTFabricSurface

With New Architecture enabled, the entry point is `RCTFabricSurface` coordinated by `RCTHost`.

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

Present it like any other view controller:

```swift
let rnVC = ReactNativeViewController()
rnVC.moduleName = "MyRNScreen"
rnVC.initialProperties = ["userId": currentUser.id, "theme": "dark"]
navigationController?.pushViewController(rnVC, animated: true)
```

## Passing Initial Properties from Swift to React Native

`initialProperties` is a `[String: Any]` dictionary that becomes the root component's `props` on the JS side. It is serialized through JSI synchronously before the surface renders its first frame.

Swift side:

```swift
rnVC.initialProperties = [
    "orderId": order.id,
    "customerName": order.customer.displayName,
    "returnRoute": "orders/detail"
]
```

JS side (the registered root component):

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

Initial properties are read-only at mount time. To send data after the surface is visible, use an event emitter or a TurboModule method.

## SwiftUI Integration via UIViewControllerRepresentable

If your app uses SwiftUI, wrap `ReactNativeViewController` in a `UIViewControllerRepresentable`:

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

Usage in a SwiftUI view:

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

The `.ignoresSafeArea()` modifier ensures React Native manages its own safe area insets, which it does through `react-native-safe-area-context`.

## Calling Swift Methods from React Native via TurboModule

When a React Native screen needs to trigger native behavior — opening a native camera, writing to Keychain, reading HealthKit — the correct path is a TurboModule.

### Swift implementation

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

### JS specification (Codegen)

```ts
// NativeAnalyticsModule.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  trackEvent(name: string, properties: Record<string, unknown>): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAnalyticsModule');
```

### Usage in JS

```tsx
import NativeAnalytics from './NativeAnalyticsModule';

function handlePurchase(itemId: string) {
  NativeAnalytics.trackEvent('purchase_completed', { itemId, source: 'rn_screen' });
}
```

Codegen generates the C++ glue code at build time from the TypeScript spec. The call crosses into Swift through JSI — no serialization overhead, no async round-trip.

## Navigation Handoff and Deep Link Data

When a push notification or universal link targets a specific React Native screen, the iOS app receives the URL in Swift and must hand it off to the RN navigator.

### Option 1 — Pass deep link as an initial property

If the RN surface has not been created yet, include the deep link in `initialProperties`:

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any]) -> Bool {
    let rnVC = ReactNativeViewController()
    rnVC.moduleName = "DeepLinkHandler"
    rnVC.initialProperties = ["deepLinkUrl": url.absoluteString]
    window?.rootViewController?.present(rnVC, animated: true)
    return true
}
```

### Option 2 — Send an event to a running surface

If the RN surface is already mounted, use `RCTEventEmitter` or a TurboModule event to deliver the URL:

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

On the RN side, React Navigation and Expo Router both support receiving deep links programmatically through their linking configuration.

## Memory Management: One RCTHost Per Process

`RCTHost` initializes the JS engine, starts the Metro connection (dev) or loads the bundle (prod), and owns the surface presenter that all `RCTFabricSurface` instances share.

Rules:

- Create exactly one `RCTHost` for the lifetime of the process. Store it on the `AppDelegate` or a dedicated singleton. Creating multiple hosts wastes memory and can cause undefined behavior in JSI.
- Each RN screen gets its own `RCTFabricSurface`. Surfaces are lightweight relative to the host.
- When a `ReactNativeViewController` is dismissed, call `surface?.stop()` and release the reference. The host remains alive and ready for the next surface.
- Do not tear down `RCTHost` unless the user has navigated completely away from all RN surfaces and you have confirmed no async work is pending.

```swift
// In ReactNativeViewController
deinit {
    surface?.stop()
    surface = nil
}
```

## Metro Bundler in Development vs Bundled JS in Production

In development, `RCTBundleURLProvider` resolves to `http://localhost:8081/index.bundle`. Metro watches the file system and serves hot-updated bundles over the local network. The device or simulator must reach your Mac on port 8081.

In production, the bundle is compiled offline and embedded in the app:

```bash
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios/assets
```

Add `main.jsbundle` and the `assets/` folder to the Xcode project target. `RCTBundleURLProvider` automatically falls back to the embedded bundle when the Metro server is unreachable in a release build.

The `RCTHost` initialization code shown earlier handles this automatically through `RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")` — in debug builds it contacts Metro; in release builds it reads from the bundle.

## Common Integration Issues

**Duplicate symbols at link time.** Usually caused by mixing static and dynamic frameworks. Ensure `use_frameworks! :linkage => :static` is present and that no other pod overrides it.

**Black screen on first launch.** The JS bundle may not have finished loading. Add a loading indicator to `ReactNativeViewController` and observe `RCTFabricSurface`'s stage property to detect when the surface becomes `stageMounted`.

**Keyboard does not push content up.** React Native manages keyboard avoidance independently. Use `KeyboardAvoidingView` with `behavior="padding"` on iOS and set `keyboardShouldPersistTaps="handled"` on scroll views.

**Safe area conflicts.** If the host view controller uses `edgesForExtendedLayout`, the RN surface may overlap the navigation bar. Either constrain the surface view below the safe area guides or let `react-native-safe-area-context` handle it by passing the safe area insets as initial properties.

**TurboModule not found at runtime.** Verify the module name in `TurboModuleRegistry.getEnforcing` matches the `@objc` class name exactly, and confirm the class appears in your `AppTurboModuleManagerDelegate`.
