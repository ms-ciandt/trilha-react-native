---
title: Hermes on iOS
---

# Hermes on iOS

For years, React Native on iOS ran JavaScript through the same engine that powers Safari: JavaScriptCore (JSC). That changed in React Native 0.70, when Meta introduced Hermes as an optional engine for iOS, and it became the default in React Native 0.74. If you have built iOS apps with WKWebView or used JSContext in your Swift code, you have already worked with JSC indirectly — Hermes is a completely different runtime, purpose-built for React Native.

## JavaScriptCore: The Safari Connection

JavaScriptCore is Apple's JavaScript engine, embedded in every Apple operating system and exposed to developers through the `JavaScriptCore.framework`. When you write Swift code like:

```swift
import JavaScriptCore

let context = JSContext()
context?.evaluateScript("1 + 1")
```

you are using the same engine that React Native historically used to execute your JavaScript bundle at app startup.

JSC was a reasonable default — it was already on the device, required no additional binary size, and it is heavily optimized for the kinds of dynamic JavaScript patterns found in web browsers. However, those optimizations target a workload that React Native does not have: long-running sessions with JIT warm-up time, speculative optimization of hot loops, and frequent DOM interactions. A React Native app starts, runs a relatively fixed bundle, navigates between screens, and occasionally performs network requests. The JIT compiler in JSC spends energy optimizing code paths that may never become hot enough to justify the cost.

Apple also restricts JIT compilation on iOS for third-party processes (not just for React Native — this is a general platform constraint). JSC on iOS runs without the full JIT tier that it uses on macOS or in Safari, which partially negates its biggest advantage.

## What Hermes Is

Hermes is an open-source JavaScript engine built by Meta, designed specifically for the React Native workload. The key architectural decision is that Hermes does not use a JIT compiler at all. Instead, it compiles JavaScript to bytecode at build time — before the app is ever installed on a device.

This is a trade-off that makes sense for native mobile: you are not running arbitrary JavaScript from the internet, you are running a bundle that you built and packaged yourself. You can afford to do the expensive work during your CI/CD pipeline rather than on the user's device.

From a Swift developer perspective, the mental model is familiar: your Swift code is compiled to machine code during the build, not interpreted at runtime. Hermes applies the same idea to JavaScript. The `.js` bundle in your archive is transformed into `.hbc` (Hermes Bytecode) before it is embedded in the `.ipa`.

## Hermes vs JSC: Side-by-Side Comparison

| Characteristic | JavaScriptCore (legacy) | Hermes |
|---|---|---|
| JS execution model | Interpret + JIT (JIT disabled on iOS) | Pre-compiled bytecode, interpreter only |
| Compilation stage | Runtime (on-device) | Build time (CI/CD) |
| TTI (Time to Interactive) | Slower — bundle parsed and compiled on first launch | Faster — bytecode loaded directly |
| Binary size impact | Zero (framework already on device) | +2–3 MB (hermes-engine CocoaPod added to .ipa) |
| Memory usage | Higher — JIT structures, full AST in memory | Lower — no JIT, compact bytecode representation |
| Garbage collector | Mark-and-sweep | Generational GC (Hades) |
| Source maps | Standard | Standard (hbc-source-map produced alongside) |
| Debugger support | JSC remote debugger | Hermes Chrome DevTools protocol |
| iOS JIT restriction | Already limited by Apple | Not affected (no JIT to restrict) |
| Startup time (typical RN app) | 600–900 ms cold start | 300–500 ms cold start |

The startup time numbers above are representative figures from community benchmarks on mid-range devices. Your actual results will vary based on bundle size and device generation, but the relative improvement is consistent.

## Bytecode Pre-Compilation: The Build-Time Step

When you run a production build with Hermes enabled, Metro (the React Native bundler) calls the `hermesc` compiler binary to transform the JavaScript output into `.hbc` bytecode. This process happens automatically as part of the Xcode build phase added by the `hermes-engine` CocoaPod.

The build phase is named "Bundle React Native code and images" and you can inspect it in Xcode under your target's Build Phases tab. The shell script it runs calls `react-native bundle`, which in turn invokes `hermesc` on the output bundle before placing it in the app's resources directory.

The `.hbc` file format is a compact binary representation of Hermes's instruction set. It is not machine code — it is a bytecode for Hermes's virtual machine — but it skips all the lexing, parsing, and compilation steps that would otherwise happen on the user's device at runtime.

A practical consequence for your CI/CD pipeline: Hermes compilation adds time to your build. On a typical React Native project with a 2–4 MB bundle, this is 5–15 seconds of additional build time. On a large monorepo bundle, it can be more. The payoff is that every user gets a faster first launch.

## How Hermes Ships Inside the .ipa

When you archive an iOS app that uses Hermes, the `.ipa` contains:

1. `main.jsbundle` — this is actually the compiled `.hbc` bytecode file, renamed to match what the React Native loader expects.
2. The `hermes-engine` framework binary, embedded under `Frameworks/hermes.framework` (or as a static library, depending on your configuration and React Native version).
3. Source maps for symbolication: `main.jsbundle.map`.

From the App Store's perspective, the Hermes framework is just another framework in your app. It goes through bitcode processing (on older Xcode toolchains) and app thinning the same way any other embedded framework does.

The addition of the `hermes-engine` framework increases your `.ipa` size by roughly 2–3 MB before App Store compression. After Apple's download optimizations (LZFSE compression, app thinning for specific devices), the user-facing download increase is smaller — typically 1–1.5 MB. For most apps, this trade-off is worthwhile given the TTI improvement.

## Hermes GC vs Swift ARC

Swift uses Automatic Reference Counting (ARC): memory is freed when the last strong reference to an object is released. This happens deterministically at the point of deallocation — no pauses, no scanning.

Hermes uses the Hades garbage collector, which is a generational, concurrent GC. Understanding the difference matters when you are diagnosing memory or jank issues in a React Native screen:

**Generational collection**: Hermes divides the JavaScript heap into a young generation (recently allocated objects, collected frequently with short pauses) and an old generation (objects that survived several young-generation collections, collected less frequently). Most JavaScript objects in a React Native app are short-lived — component state during a render, event objects, intermediate values — so the young generation is collected often, cheaply, and quickly.

**Concurrent collection**: Hades runs the old-generation collection concurrently with the JS thread, using a snapshot-at-the-beginning (SATB) write barrier. This means that a major GC cycle does not stop the JavaScript thread for the full duration of collection. The JS thread is paused only briefly at the start (to take a root snapshot) and at the end (to process the remembered set). This is why Hermes GC pauses in production are typically under 1 ms for young-generation collections and under 5 ms even for major collections.

**ARC and Hermes coexist**: Your Swift objects and your JavaScript objects have completely separate lifetimes managed by completely separate mechanisms. When a React Native component holds a reference to a native module, the lifetime is managed by a combination of ARC (on the Swift side) and Hermes's GC (on the JS side). The TurboModule infrastructure coordinates these lifetimes through JSI hold/release calls, so you generally do not manage this manually.

The GC behavior becomes relevant when you see periodic jank in your app that does not correlate with any visible work. A major GC cycle collecting a large old-generation heap can produce a small freeze. Reducing long-lived JS object retention — for example, being careful about closures that capture large data structures — improves Hermes GC throughput.

## Profiling Hermes in Xcode Instruments

Xcode Instruments is your primary profiling tool for iOS, and it works with Hermes-powered React Native apps. The Time Profiler instrument captures stack traces from all threads in your process, including the Hermes JS thread.

To profile a Hermes React Native app in Instruments:

1. Build for profiling (Product > Profile, or `⌘I`), which builds a release-like configuration with debug symbols intact.
2. Choose the Time Profiler template.
3. Start recording, exercise the scenario you want to profile (navigate to the screen, trigger the animation, submit the form), then stop.

In the call tree, you will see a thread named something like `com.facebook.react.JavaScript` or `hermes.js`. Expanding the call tree under this thread shows Hermes VM internals at the bottom (JsInterpreter, Hermes::Runtime::run) and, above that, your JavaScript function names if you have source maps configured.

For JavaScript-level profiling with named functions, the Hermes sampling profiler is more useful than Instruments alone. You can enable it via React Native DevTools or by calling `Hermes.enableSamplingProfiler()` and `Hermes.dumpSampledTraceToFile()` from a debug build. The output is a JSON trace that you can load into Chrome's `chrome://tracing` viewer, where JavaScript function names are resolved from the source map.

When you see time spent in Hermes internals in Instruments but cannot resolve it to function names, the most common cause is that the production source map was not made available to the symbolication step. Ensure your build copies `main.jsbundle.map` to a known location and that you are pointing your symbolication tool at it.

## Configuring Hermes in the Podfile

Hermes is enabled by default in React Native 0.74+. You do not need to add any configuration to turn it on. However, you can customize Hermes compiler flags for your release build using the `hermesFlagsRelease` option in your `Podfile`.

```ruby
use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => true,
  :hermes_flags_release => ["-O", "-output-source-map"],
  :fabric_enabled => fabricEnabled
)
```

Common flags:

| Flag | Effect |
|---|---|
| `-O` | Enable all optimizations (default in release) |
| `-output-source-map` | Emit a `.hbc.map` source map alongside the bytecode |
| `-max-diagnostic-width=80` | Limit error message width during build |
| `-Wno-undefined-variable` | Suppress warnings for undefined variable references |

The `-output-source-map` flag is important for production symbolication of JavaScript stack traces in crash reports. Without the source map, Hermes bytecode offsets in crash logs cannot be resolved back to original source lines. If you use a crash reporting service such as Firebase Crashlytics or Sentry, configure it to upload the `.hbc.map` file as part of your release process.

To disable Hermes entirely (not recommended for new projects, but relevant when integrating React Native into an existing app that requires JSC for compatibility reasons):

```ruby
use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => false
)
```

After changing this flag, run `bundle exec pod install` and perform a clean build.

## The hermes-engine CocoaPod

The `hermes-engine` pod is a pre-built binary distribution of the Hermes engine. It is a dependency of `React-hermes`, which is itself a dependency of `React-Core` when Hermes is enabled. You do not add it to your `Podfile` directly — `use_react_native!` handles the dependency graph.

When you run `bundle exec pod install`, CocoaPods downloads the `hermes-engine` release artifact matching your React Native version from the GitHub releases of the `facebook/hermes` repository. The version pinning is handled by the React Native gem (`/node_modules/react-native/sdks/.hermesversion`), which contains the exact Hermes release SHA to use.

If you work in an environment without internet access (common in enterprise iOS development with a local CocoaPods cache), you need to ensure that the `hermes-engine` pod is available in your local spec repo or vendored pod cache. The pod artifact is a `.tar.gz` containing `hermes.framework` and `hermes_executor.framework` for the relevant architectures (arm64 for devices, x86_64/arm64 for simulators, pre-combined as an XCFramework).

To verify that Hermes is active at runtime (useful in integration testing when embedding React Native in an existing Swift app):

```swift
// In a debug build, the HermesInternal global is available from JavaScript
// You can evaluate this via a bridge or TurboModule call:
// HermesInternal.getRuntimeProperties()['OSS Release Version']
```

From the Objective-C/Swift side, you can check whether the current RCTBridge (or the Hermes runtime via JSI) is using Hermes by examining the runtime properties exposed through `HermesInternal` from JavaScript, or by checking that the `hermes.framework` is loaded in the process image at runtime using `dlopen`/`dladdr`.

## Summary

Hermes replaces JavaScriptCore as the JavaScript runtime in React Native iOS apps. The fundamental difference is compilation strategy: JSC parses and compiles JavaScript at runtime on the device, while Hermes compiles JavaScript to bytecode at build time as part of your Xcode/CI pipeline. This is the same philosophical shift Swift represents relative to Objective-C interpreted scripts — doing expensive work earlier, at build time, so that users see faster startup.

For a Swift developer integrating or optimizing a React Native iOS app:

- Hermes is on by default in React Native 0.74+ — no action required to enable it.
- The `hermes-engine` CocoaPod adds the engine binary to your `.ipa`; this is managed automatically by `use_react_native!`.
- Startup time improvement is the most user-visible benefit; expect roughly 30–50% faster TTI on cold launch.
- Profiling uses standard Xcode Instruments (Time Profiler) with source maps for JavaScript function name resolution.
- The Hades GC is concurrent and generational; jank from GC is rare but traceable in Instruments when it occurs.
- Configure `hermesFlagsRelease` in your `Podfile` to control optimization level and source map output for your release builds.
