---
title: "Permissions on Android"
sidebar_label: "Permissions"
sidebar_position: 1
---

## Video Overview

> Video for this topic coming soon.

## The Same Model, Different API

Android's permission system maps almost directly to React Native — runtime permissions, dangerous permissions, rationale dialogs, and the result callbacks all exist. The difference is the API surface: instead of `ActivityCompat.requestPermissions()` and `onRequestPermissionsResult()`, you use `PermissionsAndroid` (bare RN) or `expo-permissions` / `expo-modules` (Expo).

---

## Permission Categories: Identical to Android

| Android category | React Native behaviour |
|-----------------|----------------------|
| Normal permissions | Granted at install — no runtime request needed |
| Dangerous permissions | Must request at runtime — same list as Android |
| Signature permissions | Not applicable in RN apps |
| `PROTECTION_DANGEROUS` | The ones you'll use: CAMERA, LOCATION, STORAGE, CONTACTS, etc. |

---

## PermissionsAndroid — Bare React Native

```tsx
import { PermissionsAndroid, Platform } from 'react-native';

// Request a single permission
async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS uses Info.plist

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'This app needs access to your camera to take photos.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      }
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error(err);
    return false;
  }
}
```

### Result values — same as Android's PackageManager

| `PermissionsAndroid.RESULTS` | Android equivalent | Meaning |
|-----------------------------|--------------------|---------|
| `GRANTED` | `PERMISSION_GRANTED` | User allowed |
| `DENIED` | `PERMISSION_DENIED` | User denied, can ask again |
| `NEVER_ASK_AGAIN` | `shouldShowRequestPermissionRationale` = false | User denied permanently |

### Requesting multiple permissions

```tsx
async function requestMediaPermissions() {
  const permissions =
    Platform.Version >= 33
      ? [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ]
      : [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE];

  const results = await PermissionsAndroid.requestMultiple(permissions);

  const allGranted = Object.values(results).every(
    r => r === PermissionsAndroid.RESULTS.GRANTED
  );

  return allGranted;
}
```

> **Android 13+ (API 33) scoped media permissions**: `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO` replace `READ_EXTERNAL_STORAGE`. Always check `Platform.Version` and request the right permission.

---

## expo-permissions (Expo Managed / Bare)

For Expo projects, use the unified `expo-modules` permission pattern — each feature module (camera, location, etc.) exposes its own `requestPermissionsAsync()`:

```bash
npx expo install expo-camera expo-location expo-media-library
```

```tsx
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';

// Each module owns its permission
async function requestAllPermissions() {
  const [cameraStatus] = await Camera.requestCameraPermissionsAsync();
  const locationStatus = await Location.requestForegroundPermissionsAsync();
  const mediaStatus = await MediaLibrary.requestPermissionsAsync();

  return {
    camera: cameraStatus.status === 'granted',
    location: locationStatus.status === 'granted',
    media: mediaStatus.status === 'granted',
  };
}

// Check without requesting
async function checkPermissions() {
  const camera = await Camera.getCameraPermissionsAsync();
  // camera.status: 'granted' | 'denied' | 'undetermined'
  // camera.canAskAgain: boolean — false when permanently denied
}
```

---

## The Permission Flow: A Complete Pattern

This pattern handles all cases — first request, rationale, and permanent denial:

```tsx
import { PermissionsAndroid, Linking, Alert } from 'react-native';

async function ensureCameraPermission(): Promise<boolean> {
  // 1. Check current status first
  const current = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.CAMERA
  );
  if (current) return true;

  // 2. Should we show a rationale? (user denied once but can ask again)
  const shouldShowRationale = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.CAMERA
  );

  if (!shouldShowRationale) {
    // 3. User denied permanently — send to system settings
    Alert.alert(
      'Camera Permission Required',
      'Camera access was permanently denied. Please enable it in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // 4. Request permission
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Camera Permission',
      message: 'Needed to take photos.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    }
  );

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    Alert.alert(
      'Permission Denied',
      'Enable Camera permission in app Settings.',
      [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
    );
    return false;
  }

  return result === PermissionsAndroid.RESULTS.GRANTED;
}
```

---

## AndroidManifest.xml — Still Required

Even with runtime requests, you must declare permissions in `AndroidManifest.xml`:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<!-- Legacy — Android 12 and below -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />
```

For Expo managed workflow, add to `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "READ_MEDIA_IMAGES"
      ]
    }
  }
}
```

---

## react-native-permissions — Unified Cross-Platform

For apps targeting both Android and iOS, `react-native-permissions` unifies the API:

```bash
npm install react-native-permissions
```

```tsx
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';

async function requestCamera() {
  const permission = Platform.OS === 'android'
    ? PERMISSIONS.ANDROID.CAMERA
    : PERMISSIONS.IOS.CAMERA;

  const status = await check(permission);

  switch (status) {
    case RESULTS.UNAVAILABLE:
      console.log('Feature not available on this device');
      break;
    case RESULTS.DENIED:
      const result = await request(permission);
      return result === RESULTS.GRANTED;
    case RESULTS.GRANTED:
      return true;
    case RESULTS.BLOCKED:
      // Permanently denied — open settings
      await openSettings();
      return false;
  }
}
```

---

## A Hook for Permission Management

```tsx
// hooks/usePermission.ts
import { useState, useCallback } from 'react';
import { PermissionsAndroid, Linking, Alert, Platform } from 'react-native';

type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'blocked';

export function usePermission(permission: string) {
  const [status, setStatus] = useState<PermissionStatus>('unknown');

  const request = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setStatus('granted');
      return true;
    }

    const result = await PermissionsAndroid.request(permission as any);

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      setStatus('granted');
      return true;
    }
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      setStatus('blocked');
      return false;
    }
    setStatus('denied');
    return false;
  }, [permission]);

  const openAppSettings = useCallback(() => Linking.openSettings(), []);

  return { status, request, openAppSettings };
}

// Usage
function CameraScreen() {
  const { status, request, openAppSettings } = usePermission(
    PermissionsAndroid.PERMISSIONS.CAMERA
  );

  if (status === 'blocked') {
    return (
      <View>
        <Text>Camera permission blocked.</Text>
        <Pressable onPress={openAppSettings}>
          <Text>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  return <Pressable onPress={request}><Text>Grant Camera</Text></Pressable>;
}
```

---

## Study Materials

### Official Documentation

- [React Native — PermissionsAndroid](https://reactnative.dev/docs/permissionsandroid)
- [Expo — Permissions](https://docs.expo.dev/guides/permissions/)
- [Android — Request runtime permissions](https://developer.android.com/training/permissions/requesting)
- [Android — Permissions on Android 13](https://developer.android.com/about/versions/13/behavior-changes-13#granular-media-permissions)

### Packages

- [react-native-permissions](https://github.com/zoontek/react-native-permissions) — unified Android + iOS permission API

### Videos

- [William Candillon — Permissions in React Native](https://www.youtube.com/watch?v=6ZCZmonbMpk)

---

## What's Next

Permissions in hand. Next: accessing the camera — CameraX concepts mapped to `expo-camera` and `react-native-vision-camera`.

➡ [Camera: CameraX → React Native](./02-camera)
