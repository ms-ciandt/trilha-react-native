---
title: Debugging React Native on iOS
---

# Debugging React Native on iOS

Debugging a React Native app as a Swift developer requires shifting between two worlds: the JavaScript runtime and the native iOS layer. You already know how to use Xcode, lldb, and Instruments. This module maps those skills to the React Native debugging stack and adds the JS-side tools you need to trace issues across both layers.

## React Native DevTools

React Native 0.76 ships with a new first-party debugger that replaces the legacy Flipper-based JS debugger and the old Chrome DevTools redirect. It runs on top of the Chrome DevTools Protocol (CDP) and integrates directly with the Metro bundler.

To open it, shake the device or press `Cmd+D` in the iOS Simulator, then tap **Open DevTools**. Alternatively, press `j` in the Metro terminal.

The DevTools window gives you:

- A **Console** tab with full JS log output, including `console.warn` LogBox warnings and `console.error` red-screen errors
- A **Sources** tab where you can set breakpoints in your TypeScript/JavaScript source files (Metro serves source maps automatically)
- A **Memory** tab for heap snapshots when running under Hermes
- A **Profiler** tab that records JS flame graphs

Because RN 0.76 defaults to Hermes and the New Architecture, the DevTools connects via the Hermes CDP endpoint that Metro exposes on port 8081. No additional setup is needed for a standard Expo or bare RN project.

### Breakpoints in TypeScript source

When you set a breakpoint in the Sources tab you will see your original `.ts`/`.tsx` files, not the bundled output. Metro inlines source maps by default in development builds. In the Simulator the debugger pauses execution and shows the call stack, local variables, and lets you evaluate expressions in the console — the same workflow you use in Safari Web Inspector for web projects.

## Hermes Debugger via Chrome DevTools Protocol

Hermes exposes a CDP server that any CDP-compatible client can connect to. React Native DevTools is the recommended client, but you can also connect Chrome directly.

With Metro running, open `chrome://inspect` in Chrome, click **Configure**, and add `localhost:8081`. The Hermes target appears under **Remote Target**. Click **Inspect** to open a full Chrome DevTools session attached to the JS runtime.

This approach is useful when you want to use Chrome's specific DevTools features, such as the Performance panel's detailed flame charts or the Network panel's request waterfall. Note that the Network panel only shows `fetch` and `XMLHttpRequest` calls that Hermes intercepts; native networking done in Swift (e.g., `URLSession` calls from a TurboModule) will not appear here.

## Flipper on macOS

Flipper is an Electron desktop app that connects to a running RN app over a local socket. While React Native DevTools now covers the JS debugging use case, Flipper still provides unique native-side plugins that have no equivalent in the new toolchain.

Install Flipper from `https://fbflipper.com`. The app connects automatically when you run a debug build that includes the Flipper client (bare React Native projects include it by default; Expo projects require the `expo-community-flipper` plugin).

### Network plugin

The Network plugin intercepts all HTTP and HTTPS requests made by the app, including those from third-party native SDKs, and displays them in a table with request headers, response headers, body, and timing. This is the easiest way to inspect traffic from native modules that do not go through the JS layer.

For HTTPS inspection Flipper installs a custom certificate on the simulator. On a physical device you must manually trust the Flipper certificate in **Settings > General > About > Certificate Trust Settings**.

### Layout Inspector

The Layout inspector renders a live visual tree of all React Native components. You can tap any element in the simulator and the Layout inspector highlights it and shows its props, style, and computed layout (the Yoga-calculated frame). This is equivalent to Xcode's view hierarchy debugger but for the React component tree.

When a layout is wrong, compare the Yoga-computed frame in Flipper with the native view frame in the Xcode view hierarchy debugger to determine whether the bug is in the JS layout logic or in a native view that is not respecting its constraints.

### Hermes Debugger in Flipper

Flipper includes a Hermes Debugger plugin that predates React Native DevTools. It offers the same CDP-based JS debugging as the new DevTools but inside the Flipper UI. With RN 0.76 the recommended path is the standalone React Native DevTools, but the Flipper plugin remains functional if you prefer to keep debugging in one window alongside the Network and Layout plugins.

## Metro Bundler Error Overlay

When Metro encounters a syntax error or a missing module, it sends an error to the app which displays a full-screen overlay with the file name, line number, and a stack trace. The overlay has a **Dismiss** button that hides it without restarting the app.

Common situations where the overlay appears:

- TypeScript compile errors (Metro uses Babel by default; switch to the TypeScript transformer for type-aware error messages)
- Missing or mis-cased imports on a case-sensitive file system (the Mac file system is case-insensitive by default, so errors that appear only on Linux CI can be hard to reproduce locally)
- Circular dependency warnings that escalate to errors

The overlay stack trace links to the source file. Clicking a frame opens the file at the correct line in your editor if you have the `REACT_EDITOR` environment variable set (e.g., `export REACT_EDITOR=code` for VS Code).

## LogBox

LogBox is the in-app warning and error display that replaced the previous YellowBox and RedBox systems. It appears as a floating notification for warnings and as a full-screen modal for uncaught JS errors.

Warnings are collapsed by default. Tap a warning to expand the full component stack, which shows the chain of React components that triggered the warning. This component stack is distinct from the JS call stack and comes from React's owner tracking.

For uncaught errors, LogBox shows:

- The error message
- The JS call stack with source-mapped file names and line numbers
- A component stack if the error was thrown during render

In production builds LogBox is stripped. Uncaught JS errors in production will crash the app silently or trigger the native crash reporter depending on how your error boundary is set up.

### Ignoring warnings

During development you can suppress known third-party warnings:

```js
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Warning: ...']);
```

Avoid using `LogBox.ignoreAllLogs()` except in test environments — it hides legitimate warnings.

## Xcode Instruments for Native Frames

Instruments is the right tool when you need to see both the JS thread and the native threads together. The **Time Profiler** instrument records CPU samples across all threads and can be symbolicated to show both native Swift/ObjC frames and, with Hermes source maps, JS frames.

To profile:

1. Open Xcode, select **Product > Profile** (`Cmd+I`) to build a release-like build with debug symbols.
2. Choose **Time Profiler** in the Instruments template picker.
3. Click **Record** and reproduce the slow interaction.
4. Stop recording and examine the **Call Tree**.

You will see threads named after their purpose: the main thread (where UIKit and the Fabric renderer run), the JS thread (where your React logic runs), the background serial queue used by TurboModules, and any threads your native code creates.

Heavy JS work appears as time spent in `JSContext::evaluateScript` or Hermes runtime frames. Heavy native work appears in your Swift or ObjC frames. Interactions that block the main thread cause visible frame drops.

### Reading the Hermes JS thread in Instruments

Hermes JIT-compiled code appears in Instruments as `hbc_<number>` or `JSRuntime` frames. To get readable JS function names, you need to post-process the trace with `hermes-profile-transformer` (see the crash symbolication section below). For a quick look without symbolication, the Hermes sampling profiler output from React Native DevTools is easier to read.

## lldb for Native Crashes

When a native crash occurs in a React Native app, the crash often originates in a TurboModule, a Fabric component, or a third-party native SDK. The JS stack is gone at this point; you are debugging native code.

Attach lldb to a running app:

```
(lldb) process attach --name YourApp
```

Or set a symbolic breakpoint in Xcode at `__RCTFatal` to catch React Native's native error handler before it terminates the process:

```
breakpoint set --name __RCTFatal
```

When the breakpoint fires, the call stack shows the native frames leading to the crash. You can print the error message:

```
(lldb) po [NSThread callStackSymbols]
(lldb) expr NSString *msg = (NSString *)error.localizedDescription; NSLog(@"%@", msg);
```

For EXC_BAD_ACCESS crashes, enable **Malloc Stack Logging** in the scheme's Diagnostics tab. Xcode will capture the allocation stack of the freed memory, which appears in the **Memory Graph Debugger**.

### RCTFatal and JS exceptions surfacing as native crashes

React Native wraps uncaught JS exceptions and calls `RCTFatal`, which by default calls `abort()`. In debug builds this shows a LogBox overlay instead. In release builds the process terminates and generates a native crash report. The native crash report will have `RCTFatal` at the top of the stack and the original JS error message in the exception reason field.

## Source Maps and Hermes Crash Symbolication

In production, your JS bundle is minified and the Hermes bytecode is compiled from it. Crash reports show Hermes bytecode offsets instead of readable JS function names. To recover readable stack frames you need the source map and the Hermes tools.

### Generating source maps

For a bare React Native app:

```sh
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --sourcemap-output ios/main.jsbundle.map
```

Store both the `.jsbundle` and the `.jsbundle.map` alongside your release artifacts. Match them to a crash by build number or commit SHA.

### hermes-profile-transformer

Install it from the Hermes package in your project:

```sh
npx hermes-profile-transformer \
  --source-map ios/main.jsbundle.map \
  --input crash-report.json \
  --output symbolicated.json
```

The output is a Chrome Trace Event format file that you can load in `chrome://tracing` or the React Native DevTools Performance tab.

### dSYM files for native symbolication

For the native frames in the same crash report, you need the `.dSYM` bundle generated during the Xcode archive step. Xcode archives store `.dSYM` files automatically. Upload them to your crash reporting service or use `atos` locally:

```sh
atos -arch arm64 -o YourApp.app.dSYM/Contents/Resources/DWARF/YourApp \
  -l 0x<load_address> 0x<crash_address>
```

Xcode's **Crashes** organizer (`Window > Organizer > Crashes`) re-symbolicates crash reports automatically when the matching `.dSYM` is available in the archive.

## Crash Reporter Integration: Sentry and Firebase Crashlytics

For production monitoring, a crash reporter gives you aggregated crash data with automatic symbolication.

### Sentry iOS SDK

Add the Sentry React Native SDK:

```sh
npx expo install @sentry/react-native
npx sentry-wizard -i reactNative
```

The wizard configures the iOS build phases to upload `.dSYM` files and source maps to Sentry automatically on each release build. In your `AppDelegate.swift`, the SDK is initialized via the generated `sentry.properties` file.

Sentry captures both JS errors (from the RN error handler) and native crashes (from the iOS crash reporter). In the Sentry dashboard, a crash from a TurboModule shows native Swift frames symbolicated via `.dSYM` and, in the same issue, the JS breadcrumbs that led up to the crash.

### Firebase Crashlytics

Add `@react-native-firebase/crashlytics` and configure the Crashlytics build phase in Xcode:

1. Add a **New Run Script Phase** after the compile sources phase.
2. Set the script to call the `upload-symbols` binary from the Firebase SDK.

Crashlytics captures native crashes automatically. For JS errors, call:

```ts
import crashlytics from '@react-native-firebase/crashlytics';

crashlytics().recordError(error);
```

Crashlytics groups crashes by stack trace similarity. On iOS it uses the `.dSYM` you upload to symbolicate native frames. JS frames require the source map upload step, which the Firebase CLI handles:

```sh
firebase crashlytics:symbols:upload --app=<APP_ID> ios/main.jsbundle.map
```

## Safari Web Inspector for JSC (Legacy Reference)

Before Hermes became the default engine, React Native on iOS used JavaScriptCore (JSC), the same engine as Safari. When targeting a JSC build, Safari Web Inspector could attach directly to the JS context.

To use it: open Safari, enable **Develop** menu in preferences, connect a device or open the Simulator, and select the app's JSC context from the **Develop** menu.

With RN 0.76 and Hermes as the default, Safari Web Inspector no longer attaches to the JS runtime. If you are maintaining a project that has explicitly disabled Hermes (`hermes_enabled = false` in the Podfile), Safari Web Inspector remains the correct JS debugger. For all new projects, use React Native DevTools.

## Debugging Strategy by Symptom

**White screen on launch with no LogBox overlay**: the JS bundle failed to load before React Native could initialize LogBox. Check the Metro terminal for bundle errors, or in a release build check the native crash log in Xcode's Devices and Simulators window (`Cmd+Shift+2`).

**Crash in a TurboModule**: set a breakpoint on `__RCTFatal` in Xcode, reproduce the crash, and inspect the native call stack in the debugger. The Sentry or Crashlytics dashboard will show the same stack in production.

**Slow animation or dropped frames**: use Instruments Time Profiler to identify which thread is saturated. If it is the JS thread, profile with React Native DevTools and move the heavy computation to a worklet or a native module. If it is the main thread, look for synchronous native calls being made from a Fabric component's `layoutSubviews`.

**Network request failing silently**: use Flipper's Network plugin to see the request and response, including redirects and TLS errors that `fetch` swallows into a generic network error.

**Crash only in production, not in development**: the most common cause is minification removing a global that was implicitly available, or Hermes AOT compilation rejecting code that Hermes interpreted mode accepted. Build a release scheme locally (`Cmd+Shift+I` in Xcode) and attach the debugger to the release build to reproduce it with symbols.
