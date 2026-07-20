---
id: utilizando-recursos-nativos
title: "Using Native Resources"
---

# Topic 1 — Using Native Resources (Native Dev Trail)

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo/rec_01_utilizando_recursos_nativos.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Topic Goal

By the end, you should be able to:
- Request and verify permissions using the unified model (iOS + Android)
- Capture photos and videos with expo-camera and react-native-vision-camera
- Access geolocation
- Read and write files with MMKV and react-native-fs
- Receive push notifications
- Understand when a JS lib is sufficient and when you need to go down to native code

---

## Mapping: Native → React Native

| Native | React Native | Lib |
|--------|-------------|-----|
| `ActivityCompat.requestPermissions` / `CLLocationManager` | `check` + `request` | `react-native-permissions` |
| `Camera2` / `AVCaptureSession` | `<Camera />` component | `react-native-vision-camera` / `expo-camera` |
| `FusedLocationProvider` / `CLLocationManager` | `getCurrentPosition` | `expo-location` / `react-native-geolocation-service` |
| `SharedPreferences` / `UserDefaults` | `MMKV` | `react-native-mmkv` |
| `FileProvider` / `FileManager` | `RNFS` | `react-native-fs` |
| `FCM` / `APNs` | Expo Notifications | `expo-notifications` |

---

## 1. Permissions

### Installation

```bash
npm install react-native-permissions
cd ios && pod install
```

**Podfile (iOS)** — uncomment the required permissions:
```ruby
setup_permissions([
  'Camera',
  'LocationWhenInUse',
  'Microphone',
  'PhotoLibrary',
])
```

**Info.plist (iOS):**
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to show nearby points of interest.</string>
```

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

### How it works under the hood

iOS and Android have structurally different permission models. On iOS, the system shows the dialog only once — if the user denies, the OS never shows it again. The app can only redirect the user to Settings. On Android, the model has evolved: starting from Android 11, the system tracks how many times a permission was requested and can automatically deny repeated requests, as well as reset permissions for unused apps.

`react-native-permissions` unifies these two models into a single API with five states:

- `GRANTED` — permission active, you can use the resource
- `DENIED` — not yet requested or denied (can ask again via `request()`)
- `BLOCKED` — permanently denied; `request()` will not open the dialog; only Settings can resolve this
- `LIMITED` — partial access, exclusive to iOS 14+ for the photo library
- `UNAVAILABLE` — the hardware or resource does not exist on the device

The pattern of `check` before `request` exists for a precise reason: calling `request()` when the status is already `BLOCKED` does nothing — the dialog simply does not appear and no error is thrown. Without the `check`, you may give the user the impression that the button is broken.

### Usage pattern: always check before request

```tsx
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import { Platform, Alert } from 'react-native';

async function requestCameraPermission(): Promise<boolean> {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  })!;

  const status = await check(permission);

  switch (status) {
    case RESULTS.GRANTED:
      return true;

    case RESULTS.DENIED:
      const result = await request(permission);
      return result === RESULTS.GRANTED;

    case RESULTS.BLOCKED:
      // User selected "never ask again" — redirect to Settings
      Alert.alert(
        'Permission required',
        'Enable camera access in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSettings },
        ]
      );
      return false;

    default:
      return false;
  }
}
```

> **Important difference:** on Android, `RESULTS.BLOCKED` occurs after the user selects "Never ask again" — equivalent to `shouldShowRequestPermissionRationale()` returning `false`.

---

## 2. Camera

### How it works under the hood

On native Android, you would use `Camera2` or `CameraX` to control the hardware directly — `CameraManager`, `CaptureRequest`, `ImageReader`, and a `SurfaceView` for the preview. On iOS, the equivalent is `AVFoundation`: `AVCaptureSession`, `AVCaptureDeviceInput`, `AVCapturePhotoOutput`. These are low-level APIs with a considerable learning curve.

The JavaScript libraries encapsulate all of this. `expo-camera` uses simplified native implementations for the most common cases — taking photos, recording video, controlling flash and front/rear camera. `react-native-vision-camera` exposes the hardware with much more granularity: manual control of ISO, shutter speed, optical zoom, and most importantly **frame processors** — JavaScript functions (compiled to C++ via JSI) that run on every camera frame in real time, enabling ML, QR code detection, and AR without leaving JavaScript.

The choice between the two depends on the use case, not preference. If the app only needs to capture photos or videos, `expo-camera` handles it with much less setup complexity. If it needs to process what the camera sees in real time, `react-native-vision-camera` is the way to go.

### Option A: expo-camera (simpler, Expo Managed/Bare)

```bash
npx expo install expo-camera
```

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission?.granted) {
    return <Button title="Allow camera" onPress={requestPermission} />;
  }

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    console.log(photo?.uri);
  }

  return (
    <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
      <Button title="Take photo" onPress={takePicture} />
    </CameraView>
  );
}
```

### Option B: react-native-vision-camera (advanced, with frame processors)

```bash
npm install react-native-vision-camera react-native-nitro-modules
cd ios && pod install
```

```tsx
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

export function VisionCameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  if (!hasPermission) return <Button title="Allow" onPress={requestPermission} />;
  if (!device) return <Text>Camera not available</Text>;

  return <Camera style={{ flex: 1 }} device={device} isActive={true} />;
}
```

> Vision Camera is the choice for apps that need real-time processing (ML, QR code, AR). For simply taking photos, expo-camera is sufficient.

---

## 3. Geolocation

### How it works under the hood

On Android, geolocation is provided by the `FusedLocationProviderClient` — a Google Play Services API that combines GPS, Wi-Fi networks, and cell towers to deliver the most accurate location with the lowest possible battery consumption. On iOS, the equivalent is `CLLocationManager`, which follows a similar source-fusion policy.

The `accuracy` parameter in `expo-location` maps directly to Android's `LocationRequest.Priority` and iOS's `CLLocationAccuracy`. `High` activates real GPS; `Balanced` uses source fusion with lower consumption; `Low` and `Lowest` depend mostly on network.

The distinction between **foreground** and **background** permissions is critical: `requestForegroundPermissionsAsync()` allows location only while the app is visible. To track when the app is in the background (delivery or fitness apps), you need `requestBackgroundPermissionsAsync()` — which on iOS requires explicit justification in the App Store review and on Android requires a separate permission (`ACCESS_BACKGROUND_LOCATION`). Never request background if the app does not need it — the stores reject or penalize this.

```bash
npx expo install expo-location
```

```tsx
import * as Location from 'expo-location';

async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

// Real-time location
async function watchLocation() {
  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 5000 },
    (location) => {
      console.log(location.coords);
    }
  );
  // Cleanup
  return () => subscription.remove();
}
```

---

## 4. Local Storage

### How it works under the hood

`SharedPreferences` (Android) and `UserDefaults` (iOS) are the operating system's native key-value storage — simple, fast, and persisted between sessions. The original React Native `AsyncStorage` used a JavaScript implementation on top of SQLite, making all operations asynchronous and relatively slow for frequent reads.

`react-native-mmkv` uses a different implementation: WeChat's MMKV library, which stores data in memory-mapped files. This makes operations synchronous — no callbacks or Promises — because reading happens directly from memory, not from disk I/O. The impact is visible in large lists: with `AsyncStorage`, every read in `useEffect` adds an asynchronous tick; with MMKV, it is direct memory access.

The `encryptionKey` option enables AES-128 encryption of data on disk — equivalent to using `EncryptedSharedPreferences` on Android or the iOS Keychain for sensitive data.

```tsx
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({
  id: 'user-storage',
  encryptionKey: 'my-secret-key', // AES-128
});

// Synchronous operations
storage.set('userId', '12345');
storage.set('preferences', JSON.stringify({ theme: 'dark' }));

const userId = storage.getString('userId');
const prefs = JSON.parse(storage.getString('preferences') ?? '{}');
storage.delete('userId');
```

---

## 5. Push Notifications

### How it works under the hood

Push notifications never arrive directly from your server to the device. The actual flow is:

```
Your backend → FCM (Firebase, Android) → Android OS → app
Your backend → APNs (Apple) → iOS OS → app
```

The device registers with FCM or APNs and receives a unique token. This token identifies the app + device pair. You send this token to your backend, which stores it. When you want to send a notification, your backend makes an authenticated request to FCM/APNs with the token and payload. Google or Apple deliver it to the device.

`expo-notifications` adds a layer on top of this: Expo has its own servers that intermediate the delivery to FCM and APNs, simplifying the backend — you send to `https://exp.host/--/api/v2/push/send` with the `expoPushToken` instead of configuring FCM and APNs credentials separately. In production with high volume, many teams migrate to sending directly to FCM/APNs for more control and lower latency.

`setNotificationHandler` controls the behavior when the app is in the **foreground** — without it, notifications received while the app is open are silent by default. The behavior when the app is in the **background** or closed is controlled by the operating system, not the app.

```bash
npx expo install expo-notifications expo-device
```

```tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulator does not support push

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}
```

---

## When to go native (Native Modules)?

Most hardware resources — camera, location, storage, sensors, contacts, basic biometrics — already have mature JavaScript libs in the ecosystem. Writing native code is necessary in specific situations:

**Use JavaScript libs when:**
- The resource is available via `expo-*` or a widely maintained community lib
- The use case is standard (take a photo, get coordinates, store preferences)

**Consider a Native Module when:**
- The SDK vendor only provides a native SDK without a JavaScript wrapper (common in banking, payment, or proprietary biometric SDKs)
- Performance is critical in continuous loops: sample-by-sample audio processing, high-frequency image pipelines — the cost of crossing the JavaScript/native bridge on every frame can be prohibitive
- You need to integrate existing Kotlin/Swift native code from your team that is not worth rewriting

The practical rule: search [React Native Directory](https://reactnative.directory) before writing native code. If a lib with active maintenance exists, use it. If it does not exist or does not meet your needs, that is the signal to go native.

> This topic is covered in depth in **Topic 7 — Advanced Native Integration**.

---

## Practical Exercise

1. Create a complete camera permission flow with handling for the `BLOCKED` state
2. Implement a camera screen with expo-camera that saves the photo to storage
3. Display the user's current location in real time using `watchPositionAsync`
4. Register the device for push notifications and display the generated token

---

## Study Materials

### Articles & Docs
- [Master React Native Permissions: Camera & Location — CoderCrafter](https://codercrafter.in/blogs/react-native/master-react-native-permissions-a-no-bs-guide-to-camera-location-access)
- [Comprehensive Guide to Managing Permissions in React Native (2025)](https://www.iamrajklwr.com/blogs/a-comprehensive-guide-to-managing-permissions-in-react-native-2025)
- [How to Handle Platform-Specific Permissions in React Native — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-permissions/view)
- [Expo Permissions Guide — Official Documentation](https://docs.expo.dev/guides/permissions/)
- [VisionCamera — Getting Started](https://react-native-vision-camera.com/docs/guides)
- [Expo Camera — Official Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [react-native-permissions — GitHub](https://github.com/zoontek/react-native-permissions)
- [PermissionsAndroid — Official React Native Documentation](https://reactnative.dev/docs/permissionsandroid)
- [Implementing Camera Functionality in React Native — LogRocket (Dec 2024)](https://blog.logrocket.com/implementing-camera-functionality-react-native/)

---

Next → **[Advanced Native Integration](./integracao-nativa-avancada)**