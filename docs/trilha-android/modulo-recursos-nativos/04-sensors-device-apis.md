---
title: "Sensors & Device APIs"
sidebar_label: "Sensors & Device APIs"
sidebar_position: 4
---

## Video Overview

> Video for this topic coming soon.

## Android Sensor Framework → Expo Sensors

You know Android's `SensorManager`, `SensorEventListener`, and `LocationManager`. In React Native + Expo, each sensor is a module with a subscription API — no `registerListener` / `unregisterListener` boilerplate, no `onSensorChanged` override.

| Android API | Expo equivalent |
|-------------|----------------|
| `SensorManager.SENSOR_ACCELEROMETER` | `Accelerometer` from `expo-sensors` |
| `SensorManager.SENSOR_GYROSCOPE` | `Gyroscope` from `expo-sensors` |
| `SensorManager.SENSOR_MAGNETIC_FIELD` | `Magnetometer` from `expo-sensors` |
| `SensorManager.SENSOR_ROTATION_VECTOR` | `DeviceMotion` from `expo-sensors` |
| `SensorManager.SENSOR_LIGHT` | Not available in RN (OS doesn't expose) |
| `LocationManager` / `FusedLocationProvider` | `expo-location` |
| `Vibrator` / `VibrationEffect` | `Vibration` from `react-native` |
| `PowerManager` (screen wake lock) | `expo-keep-awake` |
| `BrightnessManager` | `expo-brightness` |

---

## expo-sensors — Accelerometer, Gyroscope, Magnetometer

```bash
npx expo install expo-sensors
```

### Accelerometer

```tsx
import { Accelerometer } from 'expo-sensors';
import { useState, useEffect } from 'react';
import { Text, View } from 'react-native';

interface AccelData { x: number; y: number; z: number; }

function AccelerometerScreen() {
  const [data, setData] = useState<AccelData>({ x: 0, y: 0, z: 0 });
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    Accelerometer.isAvailableAsync().then(setAvailable);

    // Set update interval — like SensorManager.SENSOR_DELAY_UI (100ms)
    Accelerometer.setUpdateInterval(100);

    // Subscribe — like registerListener
    const subscription = Accelerometer.addListener(setData);

    // Unsubscribe on unmount — like unregisterListener
    return () => subscription.remove();
  }, []);

  if (!available) return <Text>Accelerometer not available.</Text>;

  return (
    <View>
      <Text>X: {data.x.toFixed(3)}</Text>
      <Text>Y: {data.y.toFixed(3)}</Text>
      <Text>Z: {data.z.toFixed(3)}</Text>
    </View>
  );
}
```

### Gyroscope

```tsx
import { Gyroscope } from 'expo-sensors';
import { useEffect, useState } from 'react';

function useGyroscope(intervalMs = 100) {
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    Gyroscope.setUpdateInterval(intervalMs);
    const sub = Gyroscope.addListener(setRotation);
    return () => sub.remove();
  }, [intervalMs]);

  return rotation;
}
```

### DeviceMotion — Rotation Vector / Orientation

`DeviceMotion` combines accelerometer + gyroscope data into orientation angles — equivalent to Android's `TYPE_ROTATION_VECTOR` sensor:

```tsx
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useState } from 'react';

interface Orientation {
  alpha: number; // rotation around Z (azimuth) — like SensorManager.getOrientation[0]
  beta: number;  // rotation around X (pitch)   — getOrientation[1]
  gamma: number; // rotation around Y (roll)     — getOrientation[2]
}

function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<Orientation>({ alpha: 0, beta: 0, gamma: 0 });

  useEffect(() => {
    DeviceMotion.setUpdateInterval(50); // 20fps
    const sub = DeviceMotion.addListener((motion) => {
      if (motion.rotation) {
        setOrientation({
          alpha: motion.rotation.alpha,
          beta: motion.rotation.beta,
          gamma: motion.rotation.gamma,
        });
      }
    });
    return () => sub.remove();
  }, []);

  return orientation;
}
```

---

## expo-location — FusedLocationProviderClient

`expo-location` wraps the Android FusedLocationProvider (via Google Play Services) and falls back to the platform LocationManager.

```bash
npx expo install expo-location
```

### One-shot location

```tsx
import * as Location from 'expo-location';

async function getCurrentPosition() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission denied');

  // Equivalent of FusedLocationProviderClient.getCurrentLocation()
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High, // Balanced | High | BestForNavigation
  });

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy,   // metres
    altitude: location.coords.altitude,
    speed: location.coords.speed,         // m/s
    heading: location.coords.heading,     // degrees from north
    timestamp: location.timestamp,
  };
}
```

### Location updates — LocationCallback equivalent

```tsx
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

function useLocationTracking() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    async function startTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission denied');
        return;
      }

      // Equivalent of FusedLocationProviderClient.requestLocationUpdates()
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,   // update every 10 metres
          timeInterval: 5000,     // or every 5 seconds
        },
        setLocation
      );
    }

    startTracking();

    // Cleanup — equivalent of removeLocationUpdates()
    return () => subscription?.remove();
  }, []);

  return { location, error };
}
```

### Geocoding — reverse and forward

```tsx
// Reverse geocoding — coordinates → address (like Geocoder.getFromLocation())
async function reverseGeocode(lat: number, lng: number) {
  const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
  const place = results[0];
  return `${place.street}, ${place.city}, ${place.country}`;
}

// Forward geocoding — address → coordinates (like Geocoder.getFromLocationName())
async function forwardGeocode(address: string) {
  const results = await Location.geocodeAsync(address);
  return results[0]; // { latitude, longitude, altitude, accuracy }
}
```

### Background location — foreground service equivalent

Background location requires an extra permission and Expo Task Manager:

```bash
npx expo install expo-task-manager
```

```tsx
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK = 'background-location-task';

// Define the task (must be at module root — not inside a component)
TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) { console.error(error); return; }
  const { locations } = data as any;
  // Process locations here — store to DB, send to server
  console.log('Background location:', locations);
});

// Request background permission and start task
async function startBackgroundTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 50,
    // Shows a persistent notification (required by Android)
    foregroundService: {
      notificationTitle: 'Tracking your route',
      notificationBody: 'Location is being tracked in the background.',
      notificationColor: '#6750A4',
    },
  });
}

async function stopBackgroundTracking() {
  await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
```

> Background location on Android requires `ACCESS_BACKGROUND_LOCATION` in `AndroidManifest.xml` and displays a persistent foreground service notification — exactly like a native Android app.

---

## Vibration — Vibrator / VibrationEffect

Built into React Native core — no install needed:

```tsx
import { Vibration } from 'react-native';

// Single vibration — Vibrator.vibrate(200)
Vibration.vibrate(200); // 200ms

// Pattern — like VibrationEffect.createWaveform()
// [wait, vibrate, wait, vibrate, ...]
Vibration.vibrate([0, 200, 100, 400]);

// Repeat pattern (index to repeat from, -1 = no repeat)
Vibration.vibrate([0, 200, 100, 200], true); // loops

// Stop
Vibration.cancel();
```

For Haptic Feedback (tactile patterns — like `VibrationEffect.EFFECT_CLICK`):

```bash
npx expo install expo-haptics
```

```tsx
import * as Haptics from 'expo-haptics';

// Selection feedback — subtle
await Haptics.selectionAsync();

// Impact — three intensities
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Notification feedback
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

---

## Screen Brightness and Keep Awake

```bash
npx expo install expo-brightness expo-keep-awake
```

```tsx
import * as Brightness from 'expo-brightness';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

// Screen brightness (0.0 - 1.0)
async function setMaxBrightness() {
  const { status } = await Brightness.requestPermissionsAsync();
  if (status !== 'granted') return;
  await Brightness.setSystemBrightnessAsync(1.0);
}

// Keep screen on — like PowerManager.SCREEN_BRIGHT_WAKE_LOCK
function VideoPlayerScreen() {
  useEffect(() => {
    activateKeepAwake(); // screen stays on
    return () => deactivateKeepAwake(); // release on unmount
  }, []);

  return <VideoPlayer />;
}
```

---

## Study Materials

### Official Documentation

- [expo-sensors — Documentation](https://docs.expo.dev/versions/latest/sdk/sensors/)
- [expo-location — Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [expo-haptics — Documentation](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [React Native — Vibration](https://reactnative.dev/docs/vibration)
- [Android — Sensors Overview](https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview)
- [Android — Location Strategies](https://developer.android.com/develop/sensors-and-location/location/strategies)

### Videos

- [Expo — Location and Maps](https://www.youtube.com/watch?v=NgtKDLqYVSA)

---

## What's Next

Sensors and device APIs covered. Final topic: push notifications — Firebase Cloud Messaging (FCM) in React Native, local notifications, and notification channels, all mapped from what you know on Android.

➡ [Push Notifications](./05-notifications)
