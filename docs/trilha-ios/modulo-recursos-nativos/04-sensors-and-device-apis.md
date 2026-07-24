---
title: Sensors and Device APIs in React Native
---

# Sensors and Device APIs in React Native

iOS gives you a rich set of device hardware APIs through frameworks like `CoreLocation`, `CoreMotion`, `CoreBluetooth`, `LocalAuthentication`, `MapKit`, and `UIKit`. Each of these has a direct React Native counterpart that wraps the same platform framework, meaning the mental model you already have transfers directly to the JavaScript layer.

---

## CoreLocation / CLLocationManager → expo-location

`CLLocationManager` is the gateway to GPS, Wi-Fi triangulation, and geofencing on iOS. `expo-location` wraps it on iOS and surfaces the same delegate-based permission and update model through async JavaScript functions.

```bash
npx expo install expo-location
```

### NSLocationWhenInUseUsageDescription

The Info.plist key is mandatory. In an Expo managed workflow, add it to `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs your location to show nearby points of interest.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app uses your location in the background to track your route."
      }
    }
  }
}
```

The `NSLocationAlwaysAndWhenInUseUsageDescription` key is required only when you request background location. Without it, the permission dialog will not appear and the request will fail silently.

### Foreground location

```typescript
import * as Location from 'expo-location';

// Analogous to CLLocationManager requestWhenInUseAuthorization()
const requestAndFetch = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Location permission denied');
    return;
  }

  // Analogous to CLLocationManager requestLocation()
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High, // kCLLocationAccuracyBest
  });

  console.log(position.coords.latitude, position.coords.longitude);
};
```

### Continuous updates (watchPosition)

```typescript
import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';

function useLocationUpdates() {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) return;

      // Analogous to CLLocationManager startUpdatingLocation()
      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10, // meters — analogous to CLLocationManager.distanceFilter
        },
        (location) => {
          console.log(location.coords);
        }
      );
    })();

    return () => {
      active = false;
      // Analogous to CLLocationManager stopUpdatingLocation()
      subscriptionRef.current?.remove();
    };
  }, []);
}
```

### Background location

Background location requires the `location` background mode entitlement. In `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["location"]
      }
    }
  }
}
```

Then request background permission separately — Apple requires a two-step permission flow:

```typescript
const { status } = await Location.requestBackgroundPermissionsAsync();
```

Background location tasks run via `expo-task-manager` and continue even when the app is suspended, matching the behavior of `allowsBackgroundLocationUpdates = true` on `CLLocationManager`.

---

## CoreMotion / CMMotionManager → expo-sensors

`CMMotionManager` is the entry point for accelerometer, gyroscope, barometer, and pedometer data. `expo-sensors` wraps each sensor as an independent module with a subscription-based API analogous to the `startAccelerometerUpdates(to:withHandler:)` family of methods.

```bash
npx expo install expo-sensors
```

### Accelerometer

```typescript
import { Accelerometer } from 'expo-sensors';

// Analogous to CMMotionManager.startAccelerometerUpdates(to:withHandler:)
const subscription = Accelerometer.addListener((data) => {
  // data.x, data.y, data.z in g-force units — same as CMAccelerometerData
  console.log(data);
});

// Set update interval — analogous to CMMotionManager.accelerometerUpdateInterval
Accelerometer.setUpdateInterval(100); // milliseconds

// Analogous to CMMotionManager.stopAccelerometerUpdates()
subscription.remove();
```

### Gyroscope

```typescript
import { Gyroscope } from 'expo-sensors';

const subscription = Gyroscope.addListener((data) => {
  // data.x, data.y, data.z in radians/second — same as CMGyroData
  console.log(data);
});

Gyroscope.setUpdateInterval(16); // ~60 fps
subscription.remove();
```

### Barometer

```typescript
import { Barometer } from 'expo-sensors';

const subscription = Barometer.addListener((data) => {
  // data.pressure in hectopascals — same as CMAltimeter pressure
  // data.relativeAltitude on iOS — same as CMAltitudeData.relativeAltitude
  console.log(data.pressure, data.relativeAltitude);
});

subscription.remove();
```

### Pedometer

`CMPedometer` requires the `NSMotionUsageDescription` key. In `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMotionUsageDescription": "This app counts your steps to display fitness data."
      }
    }
  }
}
```

```typescript
import { Pedometer } from 'expo-sensors';

// Check hardware availability — analogous to CMPedometer.isStepCountingAvailable()
const available = await Pedometer.isAvailableAsync();

if (available) {
  // Historical query — analogous to CMPedometer.queryPedometerData(from:to:withHandler:)
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const result = await Pedometer.getStepCountAsync(start, end);
  console.log(result?.steps);

  // Live updates — analogous to CMPedometer.startUpdates(from:withHandler:)
  const subscription = Pedometer.watchStepCount((result) => {
    console.log(result.steps);
  });

  subscription.remove();
}
```

---

## CoreBluetooth → react-native-ble-plx

`CBCentralManager` and `CBPeripheralManager` handle Bluetooth Low Energy scanning and connection. `react-native-ble-plx` wraps `CoreBluetooth` on iOS and exposes the same central-manager scanning flow through a JavaScript API.

```bash
npx expo install react-native-ble-plx
```

The `NSBluetoothAlwaysUsageDescription` key is mandatory in Info.plist on iOS 13+:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSBluetoothAlwaysUsageDescription": "This app uses Bluetooth to connect to nearby devices."
      }
    }
  }
}
```

### Scanning for peripherals

```typescript
import { BleManager, Device } from 'react-native-ble-plx';

// Analogous to CBCentralManager(delegate:queue:)
const manager = new BleManager();

// Analogous to CBCentralManager.scanForPeripherals(withServices:options:)
manager.startDeviceScan(
  null, // null = all services, or pass ['UUID'] to filter
  null,
  (error, device) => {
    if (error) {
      console.error(error);
      return;
    }
    if (device?.name === 'MyDevice') {
      manager.stopDeviceScan();
      connectToDevice(device);
    }
  }
);

// Analogous to CBCentralManager.stopScan()
const stopScan = () => manager.stopDeviceScan();
```

### Connecting and reading a characteristic

```typescript
const connectToDevice = async (device: Device) => {
  // Analogous to CBCentralManager.connect(_:options:)
  const connected = await manager.connectToDevice(device.id);

  // Analogous to CBPeripheral.discoverServices(_:)
  await connected.discoverAllServicesAndCharacteristics();

  // Analogous to CBPeripheral.readValue(for:)
  const characteristic = await connected.readCharacteristicForService(
    '180D', // Heart Rate service UUID
    '2A37'  // Heart Rate Measurement characteristic UUID
  );

  console.log(characteristic.value); // base64-encoded bytes
};
```

Destroy the manager when the component unmounts to release `CBCentralManager` resources:

```typescript
useEffect(() => {
  return () => manager.destroy();
}, []);
```

---

## LocalAuthentication / Face ID / Touch ID → expo-local-authentication

`LAContext` drives biometric authentication on iOS. `expo-local-authentication` wraps `LAContext.evaluatePolicy(_:localizedReason:reply:)` and exposes available biometry types through a simple async API.

```bash
npx expo install expo-local-authentication
```

The `NSFaceIDUsageDescription` key is required when Face ID may be invoked:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSFaceIDUsageDescription": "This app uses Face ID to verify your identity."
      }
    }
  }
}
```

### Checking hardware capability

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const checkBiometrics = async () => {
  // Analogous to LAContext.canEvaluatePolicy(_:error:)
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();

  // Returns an array: [FINGERPRINT, FACIAL_RECOGNITION, IRIS]
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  return { compatible, enrolled, types };
};
```

### Authenticating the user

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const authenticate = async () => {
  // Analogous to LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, ...)
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to continue',
    fallbackLabel: 'Use Passcode', // analogous to LAContext.localizedFallbackTitle
    cancelLabel: 'Cancel',
    disableDeviceFallback: false, // false = allow passcode fallback
  });

  if (result.success) {
    console.log('Authenticated');
  } else {
    // result.error mirrors LAError codes: userCancel, userFallback, biometryLockout
    console.warn(result.error);
  }
};
```

| LAError code | expo-local-authentication result.error |
|---|---|
| `userCancel` | `"user_cancel"` |
| `userFallback` | `"user_fallback"` |
| `biometryNotAvailable` | `"not_available"` |
| `biometryLockout` | `"lockout"` |
| `authenticationFailed` | `"authentication_failed"` |

---

## MapKit / MKMapView → react-native-maps (Apple Maps provider)

`MKMapView` is the UIKit map component. `react-native-maps` wraps it on iOS through the `PROVIDER_DEFAULT` (Apple Maps) provider, exposing `MKAnnotation`, `MKOverlay`, and region animation through props and callbacks.

```bash
npx expo install react-native-maps
```

### Displaying a map with Apple Maps

```typescript
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet } from 'react-native';

function AppleMap() {
  return (
    // PROVIDER_DEFAULT uses MKMapView on iOS
    <MapView
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude: -23.5505,
        longitude: -46.6333,
        latitudeDelta: 0.05,  // analogous to MKCoordinateSpan.latitudeDelta
        longitudeDelta: 0.05,
      }}
    >
      {/* Analogous to MKPointAnnotation */}
      <Marker
        coordinate={{ latitude: -23.5505, longitude: -46.6333 }}
        title="Sao Paulo"
        description="Brazil's largest city"
      />
    </MapView>
  );
}
```

### Animating to a region

```typescript
import { useRef } from 'react';
import MapView from 'react-native-maps';

function AnimatedMap() {
  const mapRef = useRef<MapView>(null);

  const flyToLocation = () => {
    // Analogous to MKMapView.setRegion(_:animated:)
    mapRef.current?.animateToRegion(
      {
        latitude: -15.7801,
        longitude: -47.9292,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      },
      1000 // animation duration in ms
    );
  };

  return <MapView ref={mapRef} style={{ flex: 1 }} />;
}
```

### Map types

| MKMapType | react-native-maps mapType prop |
|---|---|
| `.standard` | `"standard"` (default) |
| `.satellite` | `"satellite"` |
| `.hybrid` | `"hybrid"` |
| `.satelliteFlyover` | `"satelliteFlyover"` |
| `.hybridFlyover` | `"hybridFlyover"` |

---

## UIFeedbackGenerator haptics → expo-haptics

`UIImpactFeedbackGenerator`, `UINotificationFeedbackGenerator`, and `UISelectionFeedbackGenerator` are the three haptic generators in UIKit. `expo-haptics` wraps all three and maps them to named JavaScript calls.

```bash
npx expo install expo-haptics
```

### Impact feedback

```typescript
import * as Haptics from 'expo-haptics';

// UIImpactFeedbackGenerator(style: .light)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// UIImpactFeedbackGenerator(style: .medium)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// UIImpactFeedbackGenerator(style: .heavy)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
```

### Notification feedback

```typescript
// UINotificationFeedbackGenerator().notificationOccurred(.success)
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// UINotificationFeedbackGenerator().notificationOccurred(.warning)
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

// UINotificationFeedbackGenerator().notificationOccurred(.error)
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

### Selection feedback

```typescript
// UISelectionFeedbackGenerator().selectionChanged()
await Haptics.selectionAsync();
```

Haptics are automatically a no-op on Android devices that do not support the equivalent haptic engine, so the same call is safe to use cross-platform.

---

## Push Notifications via APNs → expo-notifications

APNs push delivery in a native iOS app requires registering for remote notifications, receiving a device token from `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`, and configuring entitlements. `expo-notifications` handles the entire flow, including APNs registration, foreground notification interception, and background notification handling.

```bash
npx expo install expo-notifications expo-device
```

### Required entitlements and background modes

In `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.example.myapp",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

The `remote-notification` background mode is required for silent push notifications and background refresh — analogous to enabling `Background Modes > Remote notifications` in Xcode.

### Registering for push notifications and retrieving the device token

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure how notifications appear when the app is in the foreground
// Analogous to UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Analogous to UNUserNotificationCenter.requestAuthorization(options:completionHandler:)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted');
    return null;
  }

  // Analogous to UIApplication.shared.registerForRemoteNotifications()
  // Returns an Expo push token wrapping the APNs device token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data;
}
```

### Notification categories (UNNotificationCategory)

Notification categories allow actionable buttons in push notifications. They map directly to `UNNotificationCategory` and `UNNotificationAction`:

```typescript
await Notifications.setNotificationCategoryAsync('message', [
  {
    identifier: 'reply',
    buttonTitle: 'Reply',
    options: {
      isDestructive: false,
      isAuthenticationRequired: false,
      opensAppToForeground: false,
    },
    textInput: {
      submitButtonTitle: 'Send',
      placeholder: 'Type a reply...',
    },
  },
  {
    identifier: 'dismiss',
    buttonTitle: 'Dismiss',
    options: {
      isDestructive: true,
      isAuthenticationRequired: false,
      opensAppToForeground: false,
    },
  },
]);
```

### Handling incoming notifications

```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Subscription } from 'expo-modules-core';

function useNotificationHandlers() {
  const foregroundListener = useRef<Subscription>();
  const responseListener = useRef<Subscription>();

  useEffect(() => {
    // Analogous to UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:)
    foregroundListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Foreground notification:', notification.request.content);
      }
    );

    // Analogous to UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const actionId = response.actionIdentifier;
        const notification = response.notification.request.content;
        console.log('User tapped action:', actionId, notification);
      });

    return () => {
      foregroundListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
```

### APNs vs Expo push token

`expo-notifications` issues an Expo push token (`ExponentPushToken[...]`) that routes through Expo's push infrastructure to APNs. If your backend needs the raw APNs device token (for direct APNs delivery), use `getDevicePushTokenAsync` instead:

```typescript
// Raw APNs token — use when your backend talks directly to APNs
const deviceToken = await Notifications.getDevicePushTokenAsync();
console.log(deviceToken.data); // hex string matching the APNs token bytes
```

---

## API Mapping Summary

| iOS Framework / API | React Native equivalent |
|---|---|
| `CLLocationManager` / `CLLocationDelegate` | `expo-location` |
| `CMMotionManager` accelerometer | `Accelerometer` from `expo-sensors` |
| `CMMotionManager` gyroscope | `Gyroscope` from `expo-sensors` |
| `CMAltimeter` barometer | `Barometer` from `expo-sensors` |
| `CMPedometer` | `Pedometer` from `expo-sensors` |
| `CBCentralManager` / `CBPeripheral` | `react-native-ble-plx` |
| `LAContext.evaluatePolicy` | `expo-local-authentication` |
| `MKMapView` | `react-native-maps` with `PROVIDER_DEFAULT` |
| `UIImpactFeedbackGenerator` | `Haptics.impactAsync` from `expo-haptics` |
| `UINotificationFeedbackGenerator` | `Haptics.notificationAsync` from `expo-haptics` |
| `UISelectionFeedbackGenerator` | `Haptics.selectionAsync` from `expo-haptics` |
| APNs / `UNUserNotificationCenter` | `expo-notifications` |

The underlying platform frameworks are the same ones your Swift code already uses. Each library in this list is a thin wrapper that translates the native delegate and completion-handler patterns into JavaScript promises and event subscriptions.
