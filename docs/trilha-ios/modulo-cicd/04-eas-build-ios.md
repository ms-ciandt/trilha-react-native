---
title: EAS Build for iOS
---

# EAS Build for iOS

EAS Build is Expo's hosted build service. Instead of maintaining a macOS machine or a self-hosted macOS runner on GitHub Actions, you submit your source code to Expo's infrastructure, and the build runs on an Expo-managed macOS machine with Xcode pre-installed. The resulting IPA is stored on Expo's CDN and can be downloaded or forwarded directly to App Store Connect.

As an iOS developer, the mental model is straightforward: everything you would do locally with `xcodebuild archive && xcodebuild -exportArchive` plus certificate management is automated by EAS. You keep your React Native project on GitHub, configure `eas.json`, and let the service handle the macOS side.

## Why EAS Build Instead of a Self-Hosted macOS Runner

Maintaining a self-hosted macOS runner for iOS CI is expensive in two dimensions: hardware cost (Mac Mini or Mac Studio) and maintenance cost (Xcode updates, certificate renewals, disk space for DerivedData and Simulator runtimes). Every major Xcode release risks breaking your builds in ways that require manual intervention.

EAS Build eliminates that entirely. The service keeps its macOS fleet updated with supported Xcode versions. You declare which Xcode version your project needs in `eas.json` and the scheduler picks a machine with that version installed. Your team never needs a physical Mac in the CI loop.

## Installing and Configuring EAS CLI

```bash
npm install -g eas-cli
eas login
```

Initialize EAS in your React Native or Expo project:

```bash
eas build:configure
```

This command creates `eas.json` at the project root. For an Expo SDK 56 project, also ensure `expo-updates` is installed if you intend to use OTA updates:

```bash
npx expo install expo-updates
```

## eas.json Profiles for iOS

`eas.json` is the single configuration file that defines how each build profile behaves. A standard iOS setup uses three profiles:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "credentialsSource": "remote"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890"
      }
    }
  }
}
```

### development profile — Simulator Build

`"simulator": true` instructs EAS to produce an `.app` bundle for the iOS Simulator instead of a signed IPA. Simulator builds do not require a provisioning profile or a paid Apple Developer account. The output is a zip containing the `.app` that you install with:

```bash
xcrun simctl install booted path/to/YourApp.app
```

`"developmentClient": true` means the build includes the `expo-dev-client` package, which gives you a development menu and fast refresh against a Metro server running on your machine. This replaces Expo Go for projects with custom native code.

### preview profile — Internal Distribution

`"distribution": "internal"` builds a signed IPA using an Ad-Hoc provisioning profile and distributes it via a QR code or direct download link. Testers install it without TestFlight — they just open the link on their device. The device UDID must be registered in your Apple Developer account. EAS can register UDIDs automatically when a tester scans the QR code (it opens a profile installation flow).

This profile is equivalent to what Fastlane `match adhoc` + Firebase App Distribution gives you, without the ceremony.

### production profile — App Store Build

`"credentialsSource": "remote"` tells EAS to use the credentials it manages in the cloud (see the next section). The build produces a signed IPA with an App Store distribution provisioning profile. The output is ready for `eas submit` to upload to App Store Connect.

## Running a Build

```bash
# Development: simulator build
eas build --platform ios --profile development

# Preview: signed IPA for internal testers
eas build --platform ios --profile preview

# Production: App Store IPA
eas build --platform ios --profile production
```

EAS prints a build URL where you can watch logs in real time. The build queue time depends on your Expo plan. On the free tier, builds are queued behind other users. On paid plans, you get priority and concurrent build slots.

To build locally (using your own machine) while still using EAS credentials:

```bash
eas build --platform ios --profile production --local
```

The `--local` flag runs the Xcode build on your Mac but pulls credentials from EAS. This is useful when you need to debug a build failure without waiting in the remote queue.

## EAS Credential Management

iOS code signing is the most common source of friction in iOS CI. EAS removes most of it by talking directly to the Apple Developer API on your behalf.

When you run `eas build` for the first time on a production profile, EAS prompts:

```
? How would you like to manage your iOS credentials?
  > Expo Go Managed (recommended)
    Locally
```

Choosing "Expo Go Managed" authorizes EAS to create and manage:

- A distribution certificate (valid 1 year)
- An App Store provisioning profile tied to your bundle ID

EAS stores the private key for the distribution certificate in its credential storage, encrypted with your account credentials. The provisioning profile is regenerated automatically before each build if it has expired or if new devices were added.

You can inspect what EAS has stored:

```bash
eas credentials
```

To rotate a certificate (for example, after a security incident):

```bash
eas credentials --platform ios
# Select the certificate and choose "Remove"
# The next build will generate a new one automatically
```

If your team already has a distribution certificate managed manually or via Fastlane Match, you can import it:

```bash
eas credentials --platform ios
# Select "Add existing certificate"
# Upload the .p12 and passphrase
```

Once imported, EAS manages renewal reminders and provisioning profile synchronization from that certificate.

## EAS Submit — App Store Connect Upload

After a successful production build, submit it to App Store Connect:

```bash
eas submit --platform ios --latest
```

`--latest` picks the most recent successful production build. You can also pass a specific build ID:

```bash
eas submit --platform ios --id <build-id>
```

EAS Submit uses the App Store Connect API (not the legacy Transporter tool). You authenticate with an API key:

```bash
eas credentials --platform ios
# Select "App Store Connect API Key"
# Paste Key ID, Issuer ID, and the .p8 private key
```

The submit step uploads the IPA to App Store Connect and places it in TestFlight processing. From there, the standard App Store review workflow applies: submit a new version for review from App Store Connect or using `xcrun altool` / the web UI.

Automated submit in CI after a successful build:

```bash
eas build --platform ios --profile production --auto-submit
```

`--auto-submit` chains the submit step to the build, using the `submit.production.ios` configuration from `eas.json`.

## EAS Update — Over-the-Air JS Updates

EAS Update sends Hermes bytecode bundles directly to users without going through the App Store review process. The mechanism is the `expo-updates` library, which checks for a new bundle on app launch (and optionally in the background) and installs it before the next launch.

### What OTA Updates Can and Cannot Change

Apple's App Store Review Guidelines allow JavaScript-only changes delivered over the air. What "JavaScript-only" means in practice for a React Native app:

- Any change to your TypeScript/JavaScript source code
- Changes to assets (images, fonts) that are bundled with the JS layer
- Adding or changing screens, business logic, API calls, styling

What requires a new binary build and a new App Store submission:

- Changes to native code (Swift, Objective-C, C++)
- Adding or removing a native module (because this changes the compiled binary)
- Changes to `Info.plist` permissions
- Changes to Podfile dependencies
- Any change that modifies the compiled `.xcarchive`

Pushing a native code change as an OTA update violates Apple's guidelines and risks app removal. EAS Fingerprint (described below) helps prevent this mistake.

### Publishing an Update

```bash
eas update --branch production --message "Fix checkout flow crash"
```

`--branch` maps to a runtime channel. Users running the production binary receive the update. Development and preview binaries are on separate branches and receive only updates published to those branches.

By default, `expo-updates` checks for an update on every app launch and applies it before showing the first screen (if the download completes within a timeout). The default timeout is 300ms — if the update has not finished downloading by then, the existing bundle runs and the new one is applied on the next launch.

You can configure this behavior in `app.json`:

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 3000
    }
  }
}
```

`fallbackToCacheTimeout: 3000` gives the update check up to 3 seconds before falling back to the cached bundle. Increase this if your users are on slow connections and you prefer to always show the latest code.

### Rollback

To roll back to a previous update:

```bash
eas update:rollback --branch production
```

This points the branch back to the previously active update. Users on the rolled-back branch receive the older bundle on their next launch. You can also target a specific update ID:

```bash
eas update:rollback --branch production --update-id <previous-update-id>
```

For emergency rollbacks, the channel can be pointed directly at a known-good binary build (bypassing updates entirely):

```bash
eas channel:edit production --rollout-percentage 0
```

Setting rollout to 0% means no users receive the update — everyone falls back to the binary bundle that shipped with the store version.

## Fingerprint — When EAS Detects a Native Change

EAS Fingerprint is a hash of the native surface of your project: native modules, CocoaPods, Xcode build settings, `Info.plist` entries, and any other files that affect the compiled binary. EAS calculates a fingerprint on each build and stores it with the build artifact.

When you run `eas update`, EAS compares the fingerprint of the current JS bundle against the fingerprint of the binaries currently in production. If they do not match, EAS warns you:

```
Warning: The fingerprint of this update does not match the fingerprint of any active builds.
Updates are only compatible with builds that have the same native fingerprint.
Publishing this update may cause crashes on devices running incompatible builds.
```

This warning fires when:

- You added a new native module (`npm install some-library` where that library has a Podspec)
- You changed a CocoaPods dependency version
- You modified `Info.plist` in a way that affects behavior
- You ran `pod install` with different results than the last build

The fingerprint system does not block you from publishing — it warns. But if you publish a bundle that uses a TurboModule not present in the binary, the app will crash at the call site of that module.

The correct workflow when fingerprint changes:

1. Run `eas build --platform ios --profile production` to produce a new binary
2. Submit the new binary to the App Store
3. After the update has propagated, publish OTA updates normally

You can inspect the fingerprint of your current project:

```bash
npx expo-updates fingerprint:generate --platform ios
```

And compare it to a previous build:

```bash
npx expo-updates fingerprint:compare --platform ios --build-id <build-id>
```

## Expo Config Plugins — Avoiding Manual Native Code Edits

In a standard React Native project, adding a library with native code requires editing `ios/` files: `Info.plist`, `AppDelegate.mm`, `Podfile`, or Xcode build settings. EAS-managed projects use Config Plugins as an alternative.

A Config Plugin is a JavaScript function that receives the Expo config and returns a modified version, including modifications to native files. At build time (`eas build`), Expo runs all configured plugins to generate the `ios/` directory from scratch (or patch it). This means the `ios/` directory can be regenerated deterministically from your `app.json` and your JavaScript code.

Example: adding camera permission via a plugin instead of editing `Info.plist` manually:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "This app uses the camera to scan QR codes."
        }
      ]
    ]
  }
}
```

The `expo-camera` plugin's implementation adds `NSCameraUsageDescription` to `Info.plist` automatically during the build. You never touch the `ios/` directory for this.

For a custom native library that does not ship a plugin, you write one:

```javascript
// plugins/withCustomFramework.js
const { withXcodeProject } = require('@expo/config-plugins');

const withCustomFramework = (config) => {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    project.addFramework('CustomSDK.framework', {
      customFramework: true,
      embed: true,
    });
    return config;
  });
};

module.exports = withCustomFramework;
```

Register it in `app.json`:

```json
{
  "expo": {
    "plugins": [
      "./plugins/withCustomFramework"
    ]
  }
}
```

Config Plugins are the standard way to configure native behavior in Expo SDK 56 projects. They keep the `ios/` directory reproducible, which is a prerequisite for EAS Build's managed workflow. If you commit the `ios/` directory (bare workflow), plugins still run but the output is written to your committed files — the distinction is whether Expo owns the directory or you do.

## Summary

EAS Build replaces the macOS CI runner with hosted macOS builders managed by Expo. The three `eas.json` profiles handle the full iOS build lifecycle: simulator builds for development, Ad-Hoc signed IPAs for internal QA distribution, and App Store signed IPAs for production. Credential management (provisioning profiles, distribution certificates) is automated via the Apple Developer API. EAS Submit forwards the signed IPA to App Store Connect without manual Transporter steps. EAS Update delivers Hermes bytecode bundles over the air for JS-only changes within Apple's allowed scope, with rollback pointing the update channel back to a previous bundle or to zero rollout. Fingerprint detects when your native surface has changed and a new binary build is required before publishing an update. Config Plugins replace manual `ios/` edits with declarative configuration that survives a clean rebuild.
