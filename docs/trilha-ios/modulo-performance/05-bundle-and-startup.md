---
title: Bundle Size and Startup Optimization
---

# Bundle Size and Startup Optimization

React Native apps on iOS face a unique startup challenge: before any Swift or Objective-C code runs your business logic, the runtime must initialize the JavaScript engine, load the JS bundle from disk, evaluate it, and drive the first render. For iOS developers accustomed to AOT-compiled Swift, this pipeline feels unfamiliar. This article explains every stage, shows where time is spent, and provides concrete techniques to reduce startup time and bundle weight.

## Cold Start Breakdown

A React Native cold start on iOS has five sequential phases. Understanding the boundary between each phase tells you where to apply effort.

### Phase 1: Native Initialization

The iOS process launches. UIApplicationMain runs, AppDelegate executes, and RCTReactNativeFactory (or RCTAppDelegate in older setups) creates the RCTBridge or the new Bridgeless host. The JSI runtime is allocated. On New Architecture builds this also initializes the Fabric renderer and the TurboModule registry. This phase is pure Objective-C/Swift and is measured in single-digit milliseconds on modern devices.

### Phase 2: Hermes Initialization

The Hermes engine instance is created. On New Architecture (React Native 0.76+), Hermes is the only supported engine. The engine initializes its heap, registers intrinsics, and prepares the runtime for execution. This step is fast — typically under 5 ms — because Hermes is designed as an embedded engine with a minimal startup footprint.

### Phase 3: JS Bundle Load

The bundle file is read from `main.jsbundle` (embedded in the app bundle under `Frameworks/` or directly in the IPA depending on your Xcode configuration). Two scenarios exist:

- **Hermes bytecode bundle (.hbc)**: the file contains pre-compiled bytecode. Hermes skips parsing and AST construction entirely, jumping straight to execution. Typical load times for a medium-sized app: 80–150 ms.
- **Source JS bundle**: Hermes must parse, compile to IR, then execute. Add 200–400 ms depending on bundle size.

### Phase 4: JS Evaluation (Root Module Execution)

The entry module (`index.js`) runs. All `require()` calls that are not lazy execute their modules. `AppRegistry.registerComponent` runs. Event listeners attach. Store initialization happens. This is the most controllable phase.

### Phase 5: First Render

React reconciles the initial component tree. Fabric produces shadow nodes and commits layout. The first frame appears. Time-to-interactive depends on component complexity, image loading, and any synchronous operations in `useEffect` with `[]`.

## Hermes Bytecode Pre-Compilation

Hermes compiles JavaScript to bytecode at build time using the `hermesc` compiler bundled with the `hermes-engine` CocoaPod. The compilation happens during `xcodebuild` as a build phase script injected by the React Native CocoaPods infrastructure.

When you run `pod install`, the Podfile script configures a `Bundle React Native code and images` build phase in your Xcode project. This phase calls `react-native bundle` to produce a JS bundle, then immediately pipes it through `hermesc` to produce an `.hbc` file. The `.hbc` file is what ships inside the IPA.

The `.hbc` format is a memory-mappable bytecode image. Hermes uses `mmap` to map it directly — pages are loaded on demand by the OS, not read sequentially. This means large bundles do not incur the full read cost upfront; only executed code paths cause page faults.

To verify bytecode compilation is active, inspect the build log in Xcode and confirm the phase includes `--emit-binary`. You can also check the output file:

```bash
file ios/build/main.jsbundle
# Expected: LLVM IR bitcode  (this is the Hermes bytecode magic header)
```

If the file reports as ASCII text, bytecode compilation is not running and startup will be slower.

## Hermes vs JSC: Measured Startup Numbers

React Native 0.68 shipped Hermes as opt-in. From 0.70 it became default. From 0.76 JSC support was removed from the core package. These numbers from community benchmarks and Meta's own measurements give orientation:

| Scenario | JSC (legacy) | Hermes (bytecode) | Delta |
|---|---|---|---|
| Time to first frame, small app | ~900 ms | ~520 ms | -42% |
| Time to first frame, large app | ~2200 ms | ~980 ms | -55% |
| Memory at startup | ~90 MB | ~60 MB | -33% |
| Bundle parse time, 3 MB source | ~380 ms | ~0 ms (bytecode) | -100% |

Hermes's advantage comes from three sources: no parse phase, a compact bytecode format with a smaller working set, and lazy function compilation inside the engine (functions not called on the cold path are compiled on first call, not upfront).

## Metro Bundler Tree-Shaking

Metro does not perform dead-code elimination in the same way Webpack does for web. Metro uses CommonJS `require()` semantics, which are dynamic by default and resist static analysis. However, several techniques reduce bundle size:

**Use named ES module imports** when the library supports them. Metro's `transformer` can handle ESM and tree-shake re-exports if the package provides an `"exports"` field with `"import"` condition. Check `package.json` in your dependencies for this.

**Enable `optimizeForSize` in Metro config.** This flag enables additional minification passes:

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  transformer: {
    minifierConfig: {
      compress: {
        reduce_funcs: false,  // keep Hermes compatible
      },
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

**Audit imports with `source-map-explorer`** (covered in detail below) before committing to any tree-shaking investment.

## Lazy Imports with React.lazy and Suspense

Screens that are not visible on the cold path should not execute on startup. React.lazy defers the `require()` of a module until the component is first rendered.

```tsx
import React, { Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

// The SettingsScreen module is NOT loaded until the user navigates to it
const SettingsScreen = React.lazy(() => import('./screens/SettingsScreen'));

function AppNavigator() {
  return (
    <Suspense fallback={<ActivityIndicator />}>
      <SettingsScreen />
    </Suspense>
  );
}
```

React Native's New Architecture supports `React.lazy` natively. The Suspense fallback renders synchronously while the lazy chunk loads asynchronously.

Combine lazy imports with React Navigation's lazy option:

```tsx
<Stack.Screen
  name="Settings"
  getComponent={() => require('./screens/SettingsScreen').default}
  options={{ lazy: true }}
/>
```

This delays both the `require()` and the Fabric shadow tree creation until navigation occurs.

## Inline Requires for Heavy Modules

Inline requires move a `require()` call from module evaluation time to first-use time. The Metro bundler can automate this with `inlineRequires`:

```js
// metro.config.js
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
```

With `inlineRequires: true`, Metro rewrites top-level imports like:

```js
import { format } from 'date-fns';
```

into call-site requires:

```js
// Inside the function body where format is used
const { format } = require('date-fns');
```

This means `date-fns` only loads when the function that uses it first executes, not at bundle evaluation time.

Be careful with modules that have side effects at require time (analytics SDKs, polyfills). Wrapping those in inline requires can cause them to initialize too late. Test thoroughly with Xcode Instruments after enabling this option.

## RAM Bundles vs Hermes Indexed Bundle

RAM bundles were the pre-Hermes solution to startup time. A RAM bundle splits modules into individually-loadable segments so the runtime could fetch only executed modules on demand. Metro supported two RAM bundle formats: file system (each module a separate file) and indexed (a single file with a module offset table).

With Hermes and the `.hbc` bytecode format, RAM bundles are obsolete. Hermes achieves the same goal — loading only executed code — through its own lazy function compilation and the OS-level demand paging of the memory-mapped `.hbc` file. Enabling RAM bundles alongside Hermes provides no benefit and may conflict with bytecode compilation.

If you are migrating from React Native below 0.70 and see `bundleType: 'ram'` in your Metro config or build scripts, remove it. The Hermes indexed bundle replaces it entirely.

## Measuring Startup with Xcode Instruments os_signpost

`os_signpost` is the correct tool for measuring React Native startup phases on iOS. It integrates with Xcode Instruments' os_signpost instrument and gives you named intervals in the Instruments timeline.

React Native emits signposts automatically for several startup phases when built in release configuration. To view them:

1. Open Xcode, select your scheme, and choose `Product > Profile` (Command+I).
2. Select the `os_signpost` instrument template or add it to a custom template.
3. Run the app from Instruments.
4. In the timeline, expand the signpost lanes for your process.

You will see intervals for `RCTBridge init`, `loadBundleAtURL`, and `runApplication`. These correspond directly to phases 1–5 described above.

To add your own signposts around business logic:

```swift
// AppDelegate.swift
import os

private let log = OSLog(subsystem: "com.yourapp", category: "startup")

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
  os_signpost(.begin, log: log, name: "NativeInit")
  // setup code
  os_signpost(.end, log: log, name: "NativeInit")
  return true
}
```

On the JavaScript side, you can emit signposts via a TurboModule that wraps `OSLog` — or use `react-native-performance` which wraps `PerformanceMark` and bridges to native tracing automatically.

For a quick measurement without Instruments, `console.time` / `console.timeEnd` is readable in the Metro log during development, but release builds silence the console. Use Instruments for release-configuration measurements.

## Image Optimization

Images are often the largest contributor to perceived startup time after the JS bundle. Two strategies matter:

### WebP Format

WebP provides 25–35% smaller file sizes than PNG at equivalent visual quality. React Native's Image component supports WebP natively on both iOS and Android. Convert your static assets during the build pipeline using `cwebp`:

```bash
cwebp -q 85 assets/hero.png -o assets/hero.webp
```

Reference them identically in JSX:

```tsx
<Image source={require('./assets/hero.webp')} />
```

iOS 14+ decodes WebP natively. For iOS 13 support, you need the `libwebp` pod.

### @2x / @3x Asset Catalog vs Dynamic require()

React Native's `require('./img.png')` resolution automatically picks `img@2x.png` or `img@3x.png` at runtime based on the device's pixel density. These images are bundled in the IPA under `assets/`.

For images used on the launch path (splash screen, first-screen hero), consider registering them in Xcode's Asset Catalog (`Assets.xcassets`) instead. Asset Catalog images are decoded by the OS image cache and are available before the JS runtime starts. Access them via a native module:

```swift
// In a TurboModule
@objc func getHeroImage() -> UIImage? {
  return UIImage(named: "HeroImage")  // Loaded from Asset Catalog
}
```

For images loaded only after interaction, `require('./img.png')` is fine. The distinction matters only for assets that appear in the first frame.

### Prefetching

For images required immediately after the first render but not in it:

```tsx
import { Image } from 'react-native';

// Called once at app start, before the screen that needs these images
Image.prefetch('https://cdn.example.com/avatar.webp');
```

This warms the image cache so the subsequent `<Image>` render completes without a network round-trip.

## Reducing Bundle Size with source-map-explorer

`source-map-explorer` reads the JS bundle and its source map and produces a treemap showing which modules contribute how many bytes. Install it as a dev dependency:

```bash
npm install --save-dev source-map-explorer
```

Generate a bundle with source maps:

```bash
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/main.jsbundle \
  --sourcemap-output /tmp/main.jsbundle.map
```

Run the explorer:

```bash
npx source-map-explorer /tmp/main.jsbundle /tmp/main.jsbundle.map
```

A browser window opens with an interactive treemap. Common findings:

- **moment.js locale data**: moment includes all locales by default. Replace moment with `date-fns` (tree-shakeable) or use `moment-locales-webpack-plugin` equivalent for Metro.
- **lodash**: importing `import _ from 'lodash'` bundles the entire library. Use `import debounce from 'lodash/debounce'` for individual functions, or replace with native equivalents.
- **Redundant polyfills**: React Native 0.76 targets modern JS engines. Polyfills for `Promise`, `Map`, `Set`, and `fetch` are already provided by the runtime. Third-party packages that polyfill these again add dead weight.
- **Unused icon sets**: libraries like `react-native-vector-icons` may include multiple icon fonts. Configure the Metro resolver to include only the sets you use.

Run `source-map-explorer` after every dependency addition as part of code review. A 10 KB addition to a dependency can become 200 KB in the bundle if it pulls a large transitive dependency.

## Combining Techniques: A Practical Checklist

When diagnosing a slow startup, apply changes in this order — highest impact first, with the least risk of introducing regressions:

1. Confirm Hermes bytecode compilation is active in the Xcode build log.
2. Run `source-map-explorer` and eliminate the largest unexpected modules.
3. Enable `inlineRequires: true` in Metro config and test for side-effect regressions.
4. Wrap non-launch-path screens in `React.lazy`.
5. Convert PNG assets used in the first frame to WebP.
6. Move first-frame images to the Xcode Asset Catalog.
7. Profile with Xcode Instruments os_signpost to confirm each change's effect on measured startup time.

Each step is independently verifiable. Measure before and after each change against a release build on a physical device — the iOS Simulator uses the host Mac's CPU and does not reflect real startup timing.
