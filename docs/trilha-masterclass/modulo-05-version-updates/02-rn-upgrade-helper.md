---
title: RN Upgrade Helper & Native Diffs
---

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc05_02_rn-upgrade-helper.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# RN Upgrade Helper & Native Diffs

> The Upgrade Helper is the most important tool in the RN upgrade workflow. Understanding exactly what it shows — and what it doesn't — is the difference between a smooth upgrade and three days of mysterious build failures.

---

## How the Upgrade Helper Works Internally

The tool is powered by **rn-diff-purge**, a repository that maintains one commit per RN release. For every release, the automation runs:

```bash
npx react-native@NEW_VERSION init RnDiffApp --skip-install
# removes old app, commits new app
# result: a clean git diff between any two versions
```

This means the diff is always between **pristine template projects** — there is no real app code. You are seeing exactly what `react-native init` generates at each version.

The consequence: the diff tells you what the template changed, but **your job is to map those changes onto your actual project**. The files you need to update are the same, but your versions may have additional lines, custom code, or entirely different structure.

---

## Reading the Diff: File Categories

### Category 1: Always Apply (mechanical)

These files change predictably with every minor version and must be updated exactly as shown:

- `android/gradle/wrapper/gradle-wrapper.properties` — Gradle wrapper version
- `android/build.gradle` — Gradle plugin classpath
- `package.json` — `react-native`, `react`, `@react-native/metro-config` versions
- `ios/Podfile` — `platform :ios` version, `use_react_native!` flags

```diff
# android/gradle/wrapper/gradle-wrapper.properties
- distributionUrl=https://services.gradle.org/distributions/gradle-8.6-all.zip
+ distributionUrl=https://services.gradle.org/distributions/gradle-8.10.2-all.zip
```

Apply this exactly — Gradle version mismatch between the wrapper and the plugin causes cryptic "Could not resolve com.android.tools.build:gradle" errors.

### Category 2: Merge Carefully (semantic)

These files have structural changes that need to be merged with your custom content:

- `android/app/build.gradle` — may add new `buildFeatures`, change `compileSdk`, add `namespace`
- `android/app/src/main/AndroidManifest.xml` — may add activity flags, permissions, styles
- `ios/AppDelegate.swift` (or `.mm`) — may change `RCTRootViewFactory` usage, add new methods
- `ios/MyApp.xcodeproj/project.pbxproj` — build settings, Swift version, deployment targets

For these, open your file side-by-side with the Upgrade Helper diff and apply the semantic change — never overwrite your file with the template version.

### Category 3: Review and Skip if Unchanged

- `__tests__/` — test template changes; apply only if you use the generated test
- `.flowconfig` / `.eslintrc.js` — tooling config; apply new rules, skip ones that conflict with your setup
- `metro.config.js` — apply structural changes; preserve your custom plugins and aliases

---

## A Real Diff: 0.75 → 0.76 Key Changes

### `android/app/build.gradle`

```diff
 android {
-    compileSdkVersion 34
+    compileSdkVersion 35

     defaultConfig {
-        targetSdkVersion 34
+        targetSdkVersion 35
-        minSdkVersion 23
+        minSdkVersion 24
     }
 }
```

**Impact of `targetSdkVersion 35`:** Android 15 edge-to-edge enforcement activates. StatusBar background colors stop working. See the Native Settings topic.

**Impact of `minSdkVersion 24`:** Drops Android 7.0 (API 23) support — approximately 0.3% of active devices as of 2025. Verify your analytics before applying this.

### `ios/Podfile`

```diff
 use_react_native!(
   :path => config[:reactNativePath],
   :hermes_enabled => true,
-  :fabric_enabled => true,
   :app_path => "#{Pod::Config.instance.installation_root}/.."
 )
```

`fabric_enabled` flag is removed in 0.76 because Fabric (the new renderer) is now always enabled when New Architecture is on. Keeping this flag in 0.76 causes a deprecation warning on `pod install`.

### `ios/AppDelegate.swift`

```diff
-class AppDelegate: UIResponder, UIApplicationDelegate {
+class AppDelegate: RCTAppDelegate {
   ...
-  var window: UIWindow?
-
-  func application(_ application: UIApplication,
-    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
-    let moduleName: String = "MyApp"
-    let initialProperties: [String: Any]? = nil
-    let rootViewFactory = RCTRootViewFactory(configuration: ...) { ... }
-    self.window = UIWindow(frame: UIScreen.main.bounds)
-    self.window?.rootViewController = UIViewController()
-    ...
+  override func application(_ application: UIApplication,
+    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
+    self.moduleName = "MyApp"
+    self.dependencyProvider = RCTAppDependencyProvider()
+    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
   }
 }
```

`RCTAppDelegate` is the new base class. It handles RCTHost initialization, surface mounting, and lifecycle — you no longer set up the window yourself. If your app has custom window/rootViewController logic, you override the `createRootViewController` method instead.

---

## Using the diff in a Brownfield App

In a brownfield app, your `AppDelegate` is not a template — it has custom initialization, deep link handling, push notification setup, etc. The Upgrade Helper shows the *template* change; you must derive the *semantic* change.

**Workflow:**

1. Open the Upgrade Helper diff for the relevant file (e.g., `AppDelegate.swift`)
2. Identify what the diff is *doing* semantically — not what it says literally:
   - "Adds `RCTAppDelegate` as base class" → adds `import React_RCTAppDelegate` + changes class declaration
   - "Removes manual window setup" → the base class now handles this
3. Find the equivalent location in your AppDelegate and make the same semantic change
4. Keep all your custom code (push notifications, analytics init, feature flags)

```swift
// Your brownfield AppDelegate after 0.76 migration
import UIKit
import React_RCTAppDelegate  // ← added
import React

class AppDelegate: RCTAppDelegate {  // ← changed from UIResponder

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // Your custom initialization — keep all of this
        Analytics.configure(key: Env.analyticsKey)
        PushNotifications.configure()
        FeatureFlags.load()

        // New Architecture host setup via super (0.76+)
        self.moduleName = "MyApp"
        self.dependencyProvider = RCTAppDependencyProvider()
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    // Override if you need a custom root view controller
    override func createRootViewController() -> UIViewController {
        let rootVC = super.createRootViewController()
        // apply custom appearance
        return rootVC
    }
}
```

---

## Verifying the Diff Applied Correctly

After applying all changes, run this sanity check before building:

```bash
# Check Gradle version alignment
cat android/gradle/wrapper/gradle-wrapper.properties | grep distributionUrl
cat android/build.gradle | grep "com.android.tools.build:gradle"
# The Gradle plugin version and wrapper version must be compatible

# Check pods are resolved
cat ios/Podfile.lock | grep "React-Core:"
# Should show the new RN version, not the old one

# Check package.json
node -e "const p = require('./package.json'); console.log(p.dependencies['react-native'])"
# Should output the new version string
```

---

## The rn-diff-purge CLI (Local Diffs)

For offline use or CI pipelines, generate the diff locally:

```bash
npx rn-diff-purge --from 0.75.4 --to 0.76.7 --output ./upgrade-diff.patch
```

This writes a `.patch` file you can inspect or apply with `git apply --3way`.

---

## Study Materials

| Resource | Description |
|---|---|
| [Upgrade Helper — web tool](https://react-native-community.github.io/upgrade-helper/) | Generate file-by-file diffs between any two RN versions |
| [rn-diff-purge — GitHub](https://github.com/react-native-community/rn-diff-purge) | The repo behind the Upgrade Helper — raw diffs per version |
| [upgrade-helper — GitHub](https://github.com/react-native-community/upgrade-helper) | Source of the web UI |
| [upgrade-helper.md — reactwg](https://github.com/reactwg/react-native-releases/blob/main/docs/upgrade-helper.md) | Official guide on how to use the tool |
| [Callstack — Brownfield Upgrade 0.71→0.76](https://www.callstack.com/blog/how-to-upgrade-react-native-in-a-brownfield-application) | Detailed native diff walkthrough in a real brownfield app |

---

Next → [Analysis of Breaking Changes](./breaking-changes)
