---
id: utilizando-recursos-nativos
title: "Using Native Resources"
sidebar_label: "Using Native Resources"
sidebar_position: 1
---

# Topic 1 — Using Native Resources (Web Dev Trail)

---

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_web/rec_01_utilizando_recursos_nativos.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Topic Goal

By the end, you should be able to:
- Understand the mobile permissions model (far more restrictive than the browser)
- Request, verify, and handle blocked permissions
- Capture photos with expo-camera
- Access geolocation
- Use local storage
- Send and receive push notifications
- Know when and how to search for libs in the Expo ecosystem

---

## What does NOT exist on mobile (but exists in the browser)

| Browser API | Why it doesn't exist in RN | Alternative |
|-------------|---------------------------|-------------|
| `navigator.geolocation` | No `window`/`navigator` | `expo-location` |
| `navigator.mediaDevices.getUserMedia()` | No WebRTC / DOM | `expo-camera` / `react-native-vision-camera` |
| `Notification API` | No Service Workers | `expo-notifications` |
| `localStorage` | No DOM Storage | MMKV / AsyncStorage |
| `File API` | No web FileSystem | `expo-file-system` / `react-native-fs` |
| `Clipboard API` | Partially different | `expo-clipboard` |
| `fetch` | Available! | Works the same |
| `WebSocket` | Available! | Works the same |

---

## The permissions model on mobile

In the browser, the model is binary: the user accepts or rejects in the browser dialog, and you react to that. On mobile, the model is more restrictive and has additional states that change app behavior.

The most important difference is the `BLOCKED` state: on iOS, the system shows the permission dialog **only once** — if the user denies it, the OS never shows that dialog again. The app cannot force a new prompt; it can only redirect to System Settings. On Android, behavior varied across versions: starting with Android 11, the system can also automatically block permissions if the app hasn't been used for a while.

Another state with no browser equivalent is `LIMITED`, introduced in iOS 14 for the photo library: the user can choose which specific photos the app can access, instead of granting full access to the camera roll. Your app needs to handle this state differently from `GRANTED`.

```
Permission not checked
        ↓
    check()  ←─── always check before requesting
        ↓
┌──────────────────┐
│ DENIED (default) │ → request() → dialog for the user
│ GRANTED          │ → can use the resource
│ BLOCKED          │ → user denied and "never ask again"
│ LIMITED (iOS)    │ → partial access (e.g. selected photos)
│ UNAVAILABLE      │ → resource doesn't exist on the device
└──────────────────┘
```

The reason to always call `check()` before `request()` is precise: if the status is already `BLOCKED`, calling `request()` does nothing — no dialog appears, no error is thrown. Without the check, your UI button appears broken to the user.

> **The BLOCKED state is irreversible by the app** — you can only redirect the user to System Settings. It is the equivalent of "permanently denied permission" and requires special attention in UX.

---

## 1. Permissions with react-native-permissions

```bash
npm install react-native-permissions
cd ios && pod install
```

**Podfile (iOS)** — uncomment what you need:
```ruby
setup_permissions(['Camera', 'LocationWhenInUse', 'PhotoLibrary'])
```

**Info.plist (iOS):**
```xml
<key>NSCameraUsageDescription</key>
<string>We use the camera so you can take product photos.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>We use your location to show nearby stores.</string>
```

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### Reusable permission hook

```tsx
import { check, request, PERMISSIONS, RESULTS, openSettings, Permission } from 'react-native-permissions';
import { Platform, Alert } from 'react-native';

export async function requestPermission(
  iosPermission: Permission,
  androidPermission: Permission,
  featureName: string
): Promise<boolean> {
  const permission = Platform.select({
    ios: iosPermission,
    android: androidPermission,
  })!;

  const currentStatus = await check(permission);

  if (currentStatus === RESULTS.GRANTED) return true;

  if (currentStatus === RESULTS.BLOCKED) {
    Alert.alert(
      `${featureName} permission blocked`,
      `You blocked this access. Enable it in your device settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openSettings },
      ]
    );
    return false;
  }

  const result = await request(permission);
  return result === RESULTS.GRANTED;
}

// Usage
const granted = await requestPermission(
  PERMISSIONS.IOS.CAMERA,
  PERMISSIONS.ANDROID.CAMERA,
  'camera'
);
```

---

## 2. Camera with expo-camera

### Why it doesn't work like the browser

In the browser, `getUserMedia()` returns a `MediaStream` that you connect to a `<video>` element in the DOM. Everything is a web API, there is no direct hardware access.

On mobile, there is no DOM. The camera is hardware accessed via low-level native APIs: `Camera2`/`CameraX` on Android and `AVFoundation` on iOS. `expo-camera` wraps that native access in a React component — `<CameraView>` — which renders the camera preview as a native View on screen, not an HTML element.

The ref works as an imperative access tool to the camera: `cameraRef.current?.takePictureAsync()` fires the shutter on the hardware and returns an object with the URI of the file saved locally. That URI is a path on the device's filesystem (e.g. `file:///var/mobile/...`), not a network URL.

```bash
npx expo install expo-camera
```

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { View, Button, Image, StyleSheet } from 'react-native';

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Permission screen — similar to `getUserMedia` in the browser
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Button title="Allow camera access" onPress={requestPermission} />
      </View>
    );
  }

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.8,
      base64: false, // local URI, not base64
    });
    setPhotoUri(photo?.uri ?? null);
  }

  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />
        <Button title="Take another" onPress={() => setPhotoUri(null)} />
      </View>
    );
  }

  return (
    <CameraView ref={cameraRef} style={styles.camera} facing="back">
      <View style={styles.buttonContainer}>
        <Button title="Take photo" onPress={takePicture} />
      </View>
    </CameraView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  buttonContainer: { position: 'absolute', bottom: 40, alignSelf: 'center' },
  preview: { width: '100%', height: '80%', resizeMode: 'contain' },
});
```

---

## 3. Geolocation with expo-location

### Why it doesn't work like the browser

`navigator.geolocation.getCurrentPosition()` exists in the browser and works via the Web API — the browser abstracts the location source (GPS, Wi-Fi, IP). In React Native, there is no `window.navigator` — the runtime is Hermes (JS engine), not a browser.

Mobile location is more powerful than in the browser and therefore more regulated. In the browser, the user accepts or denies at the tab level. On mobile, there is a distinction between **foreground** (location while the app is visible) and **background** (location when the app is in the background or closed). Background location requires a separate permission on both platforms, justification for the stores, and has a direct impact on battery — you should only request it if the app genuinely needs it (delivery, fitness, tracking apps).

The `accuracy` parameter determines which hardware source is used. `High` activates GPS, which is precise but consumes battery. `Balanced` uses the fusion of GPS + Wi-Fi + cellular network (FusedLocationProvider on Android), which balances precision and power consumption. For apps that only need to know the user's city or neighborhood, `Low` is sufficient and much more efficient.

```bash
npx expo install expo-location
```

```tsx
import * as Location from 'expo-location';

// Equivalent to navigator.geolocation.getCurrentPosition()
async function getLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    alert('Location permission denied');
    return;
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };
}

// Continuous monitoring (equivalent to watchPosition)
async function watchLocation(onUpdate: (coords: { lat: number; lng: number }) => void) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;

  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 3000 },
    (location) => {
      onUpdate({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    }
  );

  return () => subscription.remove(); // cleanup
}
```

---

## 4. Push Notifications with expo-notifications

### Why it's so different from the browser

The Web Notification API uses Service Workers — scripts that the browser keeps running in the background to receive messages via the Push API. On mobile, this concept doesn't exist: it is the **operating system**, not the app, that maintains the open connection and delivers notifications.

The real flow of a push notification on mobile is:

```
Your backend → FCM (Android) / APNs (iOS) → OS → app
```

The device opens a persistent connection with Google's (FCM) or Apple's (APNs) servers. When your backend wants to notify the user, it doesn't send directly to the device — it makes an authenticated request to FCM or APNs, which delivers it to the device via the already open connection. This means the app can be closed: the notification arrives via the OS, not via JavaScript.

The `expoPushToken` returned by `getExpoPushTokenAsync()` is an identifier that Expo uses as an intermediary. Expo has its own servers that receive your request and forward it to the correct FCM or APNs, avoiding the need to configure separate credentials for iOS and Android. In production with high volume, teams often migrate to direct FCM/APNs delivery for full control.

`setNotificationHandler` controls what happens when a notification arrives while the app is in the **foreground**. Without it, notifications received while the app is open are silent. Background behavior and behavior when the app is closed is controlled by the operating system.

```bash
npx expo install expo-notifications expo-device
```

```tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';

// Global configuration for notification handling behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications do not work on the simulator');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data; // send this token to your backend
}

// Hook to manage notifications on screen
export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    registerForPushNotifications();

    // Listener for notifications received while the app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    return () => {
      notificationListener.current?.remove();
    };
  }, []);
}
```

---

## How to find libs in the Expo ecosystem

In the browser, you run `npm install <package>` and the package generally works. In React Native, many libs have native code (Java/Kotlin for Android, Objective-C/Swift for iOS) that needs to be compiled together with the app. This changes the dynamic of choosing a dependency.

When you need a native resource, follow this order:

1. **[docs.expo.dev](https://docs.expo.dev)** — If an `expo-*` lib exists, it is the first choice. Expo libs are tested together with the Expo SDK version you are using, have guaranteed maintenance by the Expo team, and work with Expo Go during development without needing a native build.
2. **[reactnative.directory](https://reactnative.directory)** — Community directory with filters by platform, New Architecture support, and last update date. Prefer libs marked as compatible with New Architecture.
3. **npm** with the `react-native-*` filter as a last resort.

Compatibility with **New Architecture** (JSI + TurboModules) is an important criterion: libs that still use the old bridge model may have performance issues or future deprecation. The React Native Directory indicates this explicitly.

> Always check the date of the last commit and the number of open issues before adopting a third-party lib in production.

---

## Differences that catch the web developer off guard

| Expectation (web) | Reality (mobile) |
|-------------------|-----------------|
| Permission is simple: accept or deny | 5 possible states: GRANTED, DENIED, BLOCKED, LIMITED, UNAVAILABLE |
| Camera via `getUserMedia` | React component (`<CameraView>`) with ref to take photo |
| `navigator.geolocation.getCurrentPosition` | Async function with explicit permission |
| `new Notification(...)` | Complex system with tokens, push servers (APNs/FCM) |
| `localStorage.setItem` | `storage.set(key, value)` synchronous (MMKV) |

---

## Practical Exercise

1. Create a screen that requests camera permission with UX for the `BLOCKED` state
2. Implement photo capture and display the preview
3. Save the photo URI in MMKV to persist between sessions
4. Show the user's current location in a `Text`
5. Configure push notifications and display the generated token

---

## Study Materials

### Articles & Docs
- [Expo Permissions Guide — Official Documentation](https://docs.expo.dev/guides/permissions/)
- [Expo Camera — Official Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [VisionCamera — Getting Started](https://react-native-vision-camera.com/docs/guides)
- [Master React Native Permissions — CoderCrafter](https://codercrafter.in/blogs/react-native/master-react-native-permissions-a-no-bs-guide-to-camera-location-access)
- [Comprehensive Guide to Permissions in React Native 2025](https://www.iamrajklwr.com/blogs/a-comprehensive-guide-to-managing-permissions-in-react-native-2025)
- [How to Handle Platform-Specific Permissions — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-permissions/view)
- [react-native-permissions — GitHub](https://github.com/zoontek/react-native-permissions)
- [Implementing Camera Functionality in React Native — LogRocket (Dec 2024)](https://blog.logrocket.com/implementing-camera-functionality-react-native/)
- [PermissionsAndroid — Official React Native Documentation](https://reactnative.dev/docs/permissionsandroid)

---

Next → **[Native Integration](./topico-integracao-nativa-web)**