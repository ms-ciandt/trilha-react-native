C:\Users\gbonin\desktop\trilha-react-native\docs\trilha-ios\modulo-recursos-nativos\05-turbomodule-swift.md

The file covers all eight required points:

1. Why Swift cannot directly implement TurboModules (JSI requires C++/ObjC++ interop)
2. The `.mm` file requirement with explanation of ObjC++ as the glue layer
3. Swift-to-ObjC bridging header setup in Xcode, including the auto-generated `MyApp-Swift.h`
4. Full end-to-end `NativeStorageModule` example with TypeScript spec, `package.json` Codegen config, the Swift helper class (`@objcMembers`, thread-safe concurrent queue), and the ObjC++ `.mm` with `RCT_EXPORT_MODULE` and `getTurboModule:`
5. `AppDelegate` changes covering both `RCTAppSetupUtils` (recommended) and manual `RCTTurboModuleManagerDelegate` implementation
6. CocoaPods podspec with `source_files` glob, `React-Core`, `React-RCTFabric`, and `ReactCommon/turbomodule/core` dependencies
7. Comparison table of when to use `RCTAppSetupUtils` defaults vs manual `AppDelegate` overrides
8. Four common errors with root causes and fixes: missing Codegen run, protocol conformance mismatch, linker symbol not found, and non-modular header issues
