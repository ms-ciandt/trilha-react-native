---
title: iOS Project Setup — CocoaPods, Xcode Workspace, and SPM
---

# iOS Project Setup — CocoaPods, Xcode Workspace, and SPM

Read this before running the app for the first time. React Native's iOS layer is a full Xcode project wired through CocoaPods — the same tooling you already know, but with conventions that differ from a pure Swift app. Getting these right on day one prevents a category of build errors that are easy to hit and confusing to diagnose.

## Why React Native Still Uses CocoaPods

If you are coming from a modern Swift project, your first instinct may be to use Swift Package Manager. SPM is excellent for pure Swift dependencies, but React Native's core is written in C++ and Objective-C++. The JSI runtime, Fabric renderer, and TurboModule infrastructure are distributed as CocoaPods because:

- They require `pod_target_xcconfig` to set C++ standard library flags (`c++17`, Boost headers) that SPM has no equivalent for.
- The `use_react_native!` Podfile macro patches build settings across all pod targets after resolution — a post-install hook system SPM does not support.
- Many community libraries ship `.podspec` files and have no SPM package manifest. Auto-linking via `use_native_modules!` depends on CocoaPods.

React Native 0.76 ships experimental SPM support for a subset of core packages, but the full stack — TurboModules, Fabric, Hermes — still requires CocoaPods. Treat CocoaPods as a first-class tool, not a legacy workaround.

## The ios/ Folder

Running `npx react-native init MyApp` or `npx create-expo-app` generates an `ios/` directory:

```
ios/
  MyApp/
    AppDelegate.mm          ← entry point (Objective-C++, not Swift)
    AppDelegate.h
    Info.plist              ← bundle ID, permissions, display name
    Images.xcassets/        ← icons and launch images
    LaunchScreen.storyboard
    main.m
  MyApp.xcodeproj/          ← raw Xcode project — do NOT open this directly
  MyApp.xcworkspace/        ← workspace that includes Pods — always open this
  Podfile                   ← dependency manifest — you edit this
  Podfile.lock              ← lockfile — commit this to git
  Pods/                     ← generated directory — do NOT commit this
```

The `.xcworkspace` / `.xcodeproj` distinction is identical to any other CocoaPods project. Opening `.xcodeproj` directly means Xcode cannot find the `Pods` targets — the build fails immediately with "No such module 'React'" errors. Always open `.xcworkspace`.

## AppDelegate.mm — Why Not Swift

The `AppDelegate` is Objective-C++ (`.mm`) because the React Native C++ runtime (JSI, Fabric, TurboModules) is exposed through C++ headers. A `.swift` file cannot import those headers directly. This is not a limitation to work around — it is a deliberate boundary:

- Your feature code stays in Swift.
- Your view controllers stay in Swift.
- The RN initialization entry point stays in `.mm`.

If you need Swift in `AppDelegate`, you can add a Swift helper and import it via `MyApp-Swift.h`, but the file itself must remain `.mm` for as long as the app bootstraps the React Native runtime.

## Podfile Anatomy

A React Native 0.76 Podfile:

```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, min_ios_version_supported  # resolves to 14.0 in RN 0.76
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

| Entry | What it does |
|-------|-------------|
| `min_ios_version_supported` | Resolves to `14.0` — do not lower it; Fabric and JSI require Metal APIs from iOS 14 |
| `use_native_modules!` | Scans `node_modules` for every package with a `.podspec` and auto-links them |
| `use_react_native!` | Adds all core pods: `React-Core`, `React-Fabric`, `React-jsi`, `hermes-engine` |
| `react_native_post_install` | Patches C++ flags and deployment targets on all pod targets — removing this breaks the build |

### Adding a Dependency

Install an npm package that has native iOS code:

```bash
npx expo install react-native-mmkv   # or: npm install react-native-mmkv
cd ios && bundle exec pod install
```

`use_native_modules!` detects the new `.podspec` automatically. You do not add a `pod 'MMKV'` line manually. Re-open Xcode after `pod install` completes.

For packages that are not auto-linked (uncommon), add the pod line manually before `use_react_native!`:

```ruby
target 'MyApp' do
  config = use_native_modules!
  pod 'SomeManualPod', '~> 2.0'
  use_react_native!( ... )
end
```

## pod install vs pod update

| Command | When to run |
|---------|-------------|
| `pod install` | After cloning, after `npm install`, after any Podfile change |
| `pod update PodName` | When you deliberately want a newer version of a specific pod |
| `pod update` (bare) | When upgrading `react-native` itself — resolves all pods to latest compatible versions |

`pod install` pins every pod to the version recorded in `Podfile.lock`. This is intentional — it guarantees that your machine, your colleague's machine, and CI all build with the exact same native code.

**Always commit `Podfile.lock`.** It is the iOS equivalent of `yarn.lock`. Not committing it means two developers running `pod install` on the same branch can silently get different pod versions, causing hard-to-diagnose "works on my machine" build failures.

**Never commit `Pods/`.** Add it to `.gitignore`. The directory is hundreds of megabytes and fully reproducible with `pod install`.

## CocoaPods vs Swift Package Manager — Practical Comparison

| Capability | CocoaPods | Swift Package Manager |
|------------|-----------|----------------------|
| C++ dependencies | Yes — `pod_target_xcconfig` sets compiler flags | Limited — no `xcconfig` equivalent |
| Post-install hooks | Yes — `react_native_post_install` | No |
| Auto-linking npm packages | Yes — `use_native_modules!` | No |
| Pure Swift libraries | Yes | Yes (preferred for pure Swift) |
| Xcode project integration | Workspace-based | Native Xcode integration |
| React Native full stack support | Full | Experimental (RN 0.76+, partial) |

In practice: use CocoaPods for everything React Native-related. If you add a pure Swift utility library that has an SPM package (e.g. `swift-algorithms`), you can add it through Xcode's SPM integration alongside CocoaPods — the two coexist in the same project without conflict.

## bundle exec pod install vs pod install

If you have CocoaPods installed globally (`gem install cocoapods`) and also have a `Gemfile` in the project root, always prefer:

```bash
bundle exec pod install
```

`bundle exec` runs the CocoaPods version pinned in `Gemfile.lock`, not whatever global version is on your system. This is critical in CI — a global version mismatch between developer machines and CI is a common source of "pod install works locally but fails in Actions" bugs.

If there is no `Gemfile`, bare `pod install` is fine. Check whether the project has a `Gemfile` before choosing.

## Common First-Run Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `No such module 'React'` | Opened `.xcodeproj` instead of `.xcworkspace` | Close Xcode, open `.xcworkspace` |
| `The sandbox is not in sync with the Podfile.lock` | `pod install` not run after `npm install` | `cd ios && pod install` |
| `Unable to find a specification for 'React-Core'` | Running `pod install` before `npm install` | Run `npm install` first, then `pod install` |
| `error: include of non-modular header` | Missing C++ standard flag | Ensure `react_native_post_install` is in `post_install` block |
| `Undefined symbols for architecture arm64` | Pod not in `Podfile`, or `pod install` not re-run after adding package | Add pod or re-run `pod install` |

## What Comes Next

Once `pod install` succeeds and the app runs, CocoaPods is largely invisible day-to-day. You will revisit it when:

- Adding a new npm package with native code — re-run `pod install`
- Upgrading React Native — run `pod update` and then `pod install`
- Setting up CI — see the [Xcode and CocoaPods CI/CD setup](../modulo-cicd/xcode-cocoapods-setup) for caching strategies and `bundle exec` configuration

The rest of this module covers JavaScript and React concepts — the iOS-specific build tooling is now out of the way.
