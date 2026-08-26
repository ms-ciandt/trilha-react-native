---
title: Permissions and Info.plist
---

# Permissions and Info.plist

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/rec_01_permissions-info-plist.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/rec_01_permissions-info-plist_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

If you come from native iOS development with Swift, you know that permissions are managed in two places: `Info.plist` (a static declaration of intent) and runtime APIs like `AVCaptureDevice.requestAccess` or `CLLocationManager.requestWhenInUseAuthorization`. In React Native, the model is identical — you still need the `Info.plist` and you still call runtime APIs — but the JavaScript layer abstracts part of the process. This document covers everything you need to know.

---

## Info.plist: NSUsageDescription keys

The iOS system requires every app to declare, in `Info.plist`, a purpose string (`NSUsageDescription`) for each category of protected resource the app accesses. The absence of any of these strings causes a runtime crash with the message `This app has crashed because it attempted to access privacy-sensitive data without a usage description`. App Store Connect also rejects binaries without appropriate strings.

Below are the relevant keys for a typical React Native app:

### Camera

```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to let you scan QR codes and capture photos for your profile.</string>
```

Triggered when any code (JS or native module) attempts to initialize an `AVCaptureSession`. In RN, this occurs when using `expo-camera`, `react-native-camera`, or any library that accesses `AVCaptureDevice`.

### Microphone

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app uses the microphone to record audio messages.</string>
```

Required even when the camera is the primary focus — if the capture session includes audio (the default configuration of `expo-camera`), both strings are mandatory.

### Photo library (reading)

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>This app reads your photo library to let you choose a profile picture.</string>
```

Triggered when the app reads existing images via `PHPhotoLibrary` (for example, when using `expo-image-picker` with `mediaTypes: ImagePicker.MediaTypeOptions.Images`).

### Photo library (writing)

```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>This app saves photos to your library after you capture them.</string>
```

Separate from the read key since iOS 11. Required only when the app writes to the library — saving photos or videos. If the app only reads, this key is unnecessary.

### Location when in use

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to show nearby places.</string>
```

The minimum key for any location access. Covers use while the app is in the foreground.

### Location always (background)

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app tracks your location in the background to log your running routes.</string>
```

Required when the app requests `Always` authorization. iOS requires `NSLocationWhenInUseUsageDescription` to also be present — both coexist.

> Note: `NSLocationAlwaysUsageDescription` (without "AndWhenInUse") was deprecated in iOS 11 and ignored from iOS 13 onwards. Use only the combined key.

### Contacts

```xml
<key>NSContactsUsageDescription</key>
<string>This app accesses your contacts to help you find friends already using the app.</string>
```

Any access to the `Contacts` framework — including read-only.

### Calendar and reminders

```xml
<key>NSCalendarsUsageDescription</key>
<string>This app adds events to your calendar when you schedule a meeting.</string>
```

```xml
<key>NSRemindersUsageDescription</key>
<string>This app creates reminders for your upcoming tasks.</string>
```

These are separate keys — accessing `EKEntityTypeEvent` requires the first, `EKEntityTypeReminder` requires the second.

### Bluetooth

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to connect to your fitness device.</string>
```

Mandatory since iOS 13 for any use of `CoreBluetooth`, even in the foreground. The old `NSBluetoothPeripheralUsageDescription` key still exists but is considered legacy.

### Motion and pedometer

```xml
<key>NSMotionUsageDescription</key>
<string>This app uses motion data to count your steps.</string>
```

Required for access to `CMMotionActivityManager` or `CMPedometer` via `CoreMotion`.

### Face ID

```xml
<key>NSFaceIDUsageDescription</key>
<string>This app uses Face ID to authenticate securely without a password.</string>
```

Required to call `LAContext.evaluatePolicy`. Unlike the others — the absence does not cause an immediate crash, but the system refuses authentication and returns the `LAErrorBiometryNotAvailable` error.

---

## Expo Config Plugins: automatic Info.plist injection

In Expo projects using Managed Workflow or Bare Workflow with `expo-prebuild`, you do not edit `Info.plist` manually. Instead, libraries provide Config Plugins that automatically inject the keys during `npx expo prebuild`.

### How the `withInfoPlist` pattern works

A Config Plugin is a function that receives the Expo configuration and returns the modified configuration. The `withInfoPlist` modifier reads and writes the `Info.plist`:

```js
// plugin/withCameraPermission.js
const { withInfoPlist } = require('@expo/config-plugins');

const withCameraPermission = (config, { cameraPermission, microphonePermission }) => {
  return withInfoPlist(config, (config) => {
    config.modResults['NSCameraUsageDescription'] =
      cameraPermission ?? 'Allow $(PRODUCT_NAME) to access the camera.';
    config.modResults['NSMicrophoneUsageDescription'] =
      microphonePermission ?? 'Allow $(PRODUCT_NAME) to access the microphone.';
    return config;
  });
};

module.exports = withCameraPermission;
```

### Configuration via app.json / app.config.js

Most Expo libraries accept the strings directly in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "This app uses the camera to scan QR codes.",
          "microphonePermission": "This app records audio during video capture.",
          "recordAudioAndroid": true
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "This app accesses your photos to set a profile picture."
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "This app tracks your location to log routes.",
          "locationWhenInUsePermission": "This app shows your position on the map."
        }
      ]
    ]
  }
}
```

After changing the strings, run `npx expo prebuild --clean` to regenerate the native files. The `Info.plist` at `ios/<AppName>/Info.plist` will reflect the changes.

> Never manually edit the generated `Info.plist` in projects that use prebuild — your changes will be overwritten on the next run.

---

## Bare Workflow: manual Info.plist editing

In Bare Workflow projects without Config Plugins (or when adding a library that does not provide a plugin), you edit the `Info.plist` directly.

### File location

```
ios/
  <AppName>/
    Info.plist    ← edit here
  <AppName>.xcworkspace
```

### Via Xcode (recommended)

1. Open `<AppName>.xcworkspace` in Xcode.
2. In the Project Navigator, select `<AppName>/Info.plist`.
3. Click `+` on any row to add a new key.
4. Type the key name — Xcode autocompletes and displays the human-readable name ("Privacy - Camera Usage Description").
5. In the "Value" column, enter the purpose string.

Editing via Xcode reduces the risk of typos in key names.

### Via text editor (direct XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- ... other app keys ... -->

  <key>NSCameraUsageDescription</key>
  <string>This app uses the camera to capture photos.</string>

  <key>NSPhotoLibraryUsageDescription</key>
  <string>This app reads photos to set your profile picture.</string>

  <key>NSPhotoLibraryAddUsageDescription</key>
  <string>This app saves captured photos to your library.</string>

</dict>
</plist>
```

### Common errors that cause App Store rejection

- **Incorrect key name**: `NSCameraPermission` instead of `NSCameraUsageDescription` — the wrong key is silently ignored by the system; the app passes internal tests but is rejected during review.
- **Empty or generic string**: `"This app needs access."` — Apple requires the string to explain the specific use. Vague strings are rejected under guideline 5.1.1 (Data Collection and Storage).
- **Key present but resource not declared in PrivacyInfo**: from iOS 17, the absence of `PrivacyInfo.xcprivacy` for APIs that require it can cause automated rejection.

---

## Runtime permission flow: iOS vs Android model

### iOS's one-shot model

On iOS, the system displays the permission dialog exactly once. If the user denies, the app can never request again — the dialog does not reappear. To use the feature, the user must manually go to Settings > Privacy and grant access. This is fundamentally different from Android, where the app can request again (using `shouldShowRequestPermissionRationale` as a guide).

**UX implication**: on iOS, you have a single chance to present context before the system dialog appears. The recommended strategy is to display a custom "pre-authorization" screen explaining the value of the feature, and only then trigger `requestPermissionsAsync`. This significantly increases the grant rate.

### Comparison: native Swift vs React Native

**Swift (UIKit):**

```swift
import AVFoundation

func requestCameraAccess() {
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    switch status {
    case .notDetermined:
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                if granted {
                    self.openCamera()
                } else {
                    self.showSettingsAlert()
                }
            }
        }
    case .authorized:
        openCamera()
    case .denied, .restricted:
        showSettingsAlert()
    @unknown default:
        break
    }
}
```

**React Native (expo-camera):**

```tsx
import { useCameraPermissions } from 'expo-camera';

export function CameraButton() {
  const [permission, requestPermission] = useCameraPermissions();

  const handlePress = async () => {
    if (!permission) return;

    if (permission.status === 'undetermined') {
      const result = await requestPermission();
      if (result.granted) {
        openCamera();
      } else {
        showSettingsPrompt();
      }
      return;
    }

    if (permission.granted) {
      openCamera();
    } else {
      showSettingsPrompt();
    }
  };

  return <Button title="Open Camera" onPress={handlePress} />;
}
```

The pattern is equivalent to Swift: check status, request if `undetermined`, redirect to Settings if `denied`.

---

## expo-modules-core: requestPermissionsAsync pattern

For libraries based on `expo-modules-core`, the permissions API follows a consistent pattern:

```tsx
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import { Linking } from 'react-native';

async function requestLocationPermission() {
  // Check current status without requesting
  const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  if (existingStatus === 'denied') {
    // iOS: the only option is to redirect to Settings
    await Linking.openSettings();
    return false;
  }

  // existingStatus === 'undetermined' — request
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

async function requestContactsPermission() {
  const { status } = await Contacts.requestPermissionsAsync();
  return status === 'granted';
}
```

### Permission state machine

```
undetermined
    │
    │  requestPermissionsAsync()
    │
    ├──── (user accepts) ──── granted
    │
    └──── (user denies) ──── denied
                                 │
                                 │  Linking.openSettings()
                                 │
                            [user goes to Settings
                             and grants manually]
                                 │
                                 ▼
                              granted
                       (check on return to app)
```

To detect when the user returns from Settings and may have changed the permission, use the `AppState` event:

```tsx
import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import * as Camera from 'expo-camera';

function usePermissionRefresh(onForeground: () => void) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        onForeground();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [onForeground]);
}

// Usage:
usePermissionRefresh(async () => {
  const { granted } = await Camera.getCameraPermissionsAsync();
  setHasPermission(granted);
});
```

---

## PrivacyInfo.xcprivacy (iOS 17+)

From iOS 17 and mandatory for App Store submissions since May 2024, Apple requires apps and third-party SDKs to declare the use of "Required Reason APIs" in a `PrivacyInfo.xcprivacy` file.

### What are Required Reason APIs

These are API categories that can be used for device fingerprinting. Apple maintains the list at: [developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api)

Relevant examples for RN apps:
- `NSFileSystemFreeSize` / `NSFileSystemSize` — used internally by Hermes and some libs
- `UserDefaults` — used by `@react-native-async-storage/async-storage`
- `NSUserDefaults` — `expo-constants` and other modules
- File system timestamps (`NSURLContentModificationDateKey`)

### What Expo SDK 56 / RN 0.76 manages automatically

Expo SDK 56 includes `PrivacyInfo.xcprivacy` in the modules it integrates (expo-file-system, expo-constants, etc.). React Native 0.76 also includes the manifest for the core framework. You do not need to declare APIs used by these libraries — each package declares its own manifest.

### What you must add manually

If your app directly calls any Required Reason API (not through a library that already declares it), or if it uses a third-party library without a privacy manifest, you need to add or supplement the `PrivacyInfo.xcprivacy`.

**File location:**

```
ios/
  <AppName>/
    PrivacyInfo.xcprivacy    ← create here if it doesn't exist
```

**File structure:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <!-- CA92.1: app stores user preferences -->
        <string>CA92.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <!-- C617.1: show file timestamps to the user -->
        <string>C617.1</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyTracking</key>
  <false/>
</dict>
</plist>
```

The reason codes (such as `CA92.1`) come from Apple's official documentation for each API category. Using an incorrect or missing code results in automated rejection by App Store Connect.

---

## App Store Review: avoiding rejections

### Guideline 5.1.1 — Data Collection and Storage

Apple rejects apps when:

1. **NSUsageDescription is missing**: the binary uses a protected API but has not declared the corresponding string. The automated review system detects the use of private frameworks in the binary and cross-references with `Info.plist`.

2. **Generic or misleading string**: strings like `"Required for app functionality"` are rejected. The string must specify the data collected and the reason — preferably mentioning the concrete feature that the user will recognize.

3. **Permission requested without corresponding use**: requesting camera access in an app that has no camera feature visible to the user results in rejection for unnecessary data collection.

### Best practices for permission strings

| Key | Bad example | Good example |
|---|---|---|
| NSCameraUsageDescription | "App needs camera" | "Scan product barcodes and capture photos for your order" |
| NSLocationWhenInUseUsageDescription | "Location access required" | "Show your current position on the delivery map" |
| NSContactsUsageDescription | "Access to contacts" | "Find friends already using the app by matching phone numbers" |

### Checklist before submitting

- Every `NSUsageDescription` key is present for each API used (check all third-party libraries)
- No string is empty or generic
- `PrivacyInfo.xcprivacy` is present and declares the Required Reason APIs used
- Background location permissions (`NSLocationAlwaysAndWhenInUseUsageDescription`) are only present if the app actually uses background location
- The pre-authorization flow explains the value of the feature before triggering the system dialog
- The app correctly redirects to Settings when permission is denied, without locking the user

---

## Quick reference: library → required key(s)

| Library | Required keys |
|---|---|
| expo-camera (photo) | NSCameraUsageDescription |
| expo-camera (video) | NSCameraUsageDescription, NSMicrophoneUsageDescription |
| expo-image-picker (read) | NSPhotoLibraryUsageDescription |
| expo-image-picker (save) | NSPhotoLibraryAddUsageDescription |
| expo-location (foreground) | NSLocationWhenInUseUsageDescription |
| expo-location (background) | NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription |
| expo-contacts | NSContactsUsageDescription |
| expo-local-authentication | NSFaceIDUsageDescription |
| react-native-bluetooth-classic | NSBluetoothAlwaysUsageDescription |
| expo-sensors (pedometer) | NSMotionUsageDescription |
| expo-calendar | NSCalendarsUsageDescription |

---

The next file in this trail covers native modules with TurboModules and how to expose Swift APIs directly to JavaScript.
