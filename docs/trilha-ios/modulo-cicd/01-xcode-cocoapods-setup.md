File written at `C:\Users\gbonin\desktop\trilha-react-native\.claude\worktrees\ios-trail\docs\trilha-ios\modulo-cicd\01-xcode-cocoapods-setup.md` — 341 lines.

Coverage:

1. `ios/` folder structure: `.xcworkspace` vs `.xcodeproj` rule, `AppDelegate.mm` extension rationale, `Podfile.lock` vs `Pods/` commit strategy.
2. CocoaPods role: how `react-native` ships as pods, how npm packages ship `.podspec`, how `use_native_modules!` auto-links them.
3. Podfile anatomy: `platform :ios, min_ios_version_supported` (14.0), `use_native_modules!`, `use_react_native!` with `:hermes_enabled`, `:fabric_enabled`, `:flipper_configuration`, and `post_install` hook.
4. `pod install` vs `pod update`: when to use each, full rationale for committing `Podfile.lock` and gitignoring `Pods/`.
5. `AppDelegate.mm` for New Architecture: `RCTAppDelegate`, how compiler flags flow from Podfile, when to manually override, brownfield callout.
6. xcconfig and environment variables: custom `.xcconfig` per scheme that includes the Pods one, `Info.plist` variable substitution, Swift runtime access.
7. Schemes and configurations: adding Staging, CocoaPods project mapping, CI flag passing.
8. Build phases: "Bundle React Native code and images" script, Debug vs Release behavior, Metro serving.
9. SPM vs CocoaPods: current state (CocoaPods only for RN core), hybrid approach for pure-Swift libs, roadmap note.
10. Common errors: `Undefined symbol: RCTBridge`, `No podspec found`, New Architecture flag changes requiring DerivedData clear, deployment target warnings, Metro bundle phase failures.
