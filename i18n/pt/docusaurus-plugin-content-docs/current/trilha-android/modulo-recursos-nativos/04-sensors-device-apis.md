---
title: "Sensores e APIs do Dispositivo"
sidebar_label: "Sensores e APIs do Dispositivo"
sidebar_position: 4
---

## Video Overview

> Video para este tópico em breve.

## Android Sensor Framework → Expo Sensors

Você conhece o `SensorManager`, `SensorEventListener` e `LocationManager` do Android. No React Native + Expo, cada sensor é um módulo com uma API de subscription — sem o boilerplate de `registerListener` / `unregisterListener`, sem precisar sobrescrever `onSensorChanged`.

| API Android | Equivalente Expo |
|-------------|----------------|
| `SensorManager.SENSOR_ACCELEROMETER` | `Accelerometer` de `expo-sensors` |
| `SensorManager.SENSOR_GYROSCOPE` | `Gyroscope` de `expo-sensors` |
| `SensorManager.SENSOR_MAGNETIC_FIELD` | `Magnetometer` de `expo-sensors` |
| `SensorManager.SENSOR_ROTATION_VECTOR` | `DeviceMotion` de `expo-sensors` |
| `SensorManager.SENSOR_LIGHT` | Não disponível no RN (o SO não expõe) |
| `LocationManager` / `FusedLocationProvider` | `expo-location` |
| `Vibrator` / `VibrationEffect` | `Vibration` do `react-native` |
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

    // Define o intervalo de atualização — como SensorManager.SENSOR_DELAY_UI (100ms)
    Accelerometer.setUpdateInterval(100);

    // Subscreve — como registerListener
    const subscription = Accelerometer.addListener(setData);

    // Remove a subscription ao desmontar — como unregisterListener
    return () => subscription.remove();
  }, []);

  if (!available) return <Text>Accelerometer não disponível.</Text>;

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

### DeviceMotion — Vetor de Rotação / Orientação

`DeviceMotion` combina dados do acelerômetro e do giroscópio em ângulos de orientação — equivalente ao sensor `TYPE_ROTATION_VECTOR` do Android:

```tsx
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useState } from 'react';

interface Orientation {
  alpha: number; // rotação ao redor do eixo Z (azimute) — como SensorManager.getOrientation[0]
  beta: number;  // rotação ao redor do eixo X (pitch)   — getOrientation[1]
  gamma: number; // rotação ao redor do eixo Y (roll)    — getOrientation[2]
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

`expo-location` encapsula o FusedLocationProvider do Android (via Google Play Services) e usa o LocationManager da plataforma como fallback.

```bash
npx expo install expo-location
```

### Localização pontual

```tsx
import * as Location from 'expo-location';

async function getCurrentPosition() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Permissão de localização negada');

  // Equivalente a FusedLocationProviderClient.getCurrentLocation()
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High, // Balanced | High | BestForNavigation
  });

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy,   // metros
    altitude: location.coords.altitude,
    speed: location.coords.speed,         // m/s
    heading: location.coords.heading,     // graus a partir do norte
    timestamp: location.timestamp,
  };
}
```

### Atualizações de localização — equivalente ao LocationCallback

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
        setError('Permissão negada');
        return;
      }

      // Equivalente a FusedLocationProviderClient.requestLocationUpdates()
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,   // atualiza a cada 10 metros
          timeInterval: 5000,     // ou a cada 5 segundos
        },
        setLocation
      );
    }

    startTracking();

    // Limpeza — equivalente a removeLocationUpdates()
    return () => subscription?.remove();
  }, []);

  return { location, error };
}
```

### Geocodificação — reversa e direta

```tsx
// Geocodificação reversa — coordenadas → endereço (como Geocoder.getFromLocation())
async function reverseGeocode(lat: number, lng: number) {
  const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
  const place = results[0];
  return `${place.street}, ${place.city}, ${place.country}`;
}

// Geocodificação direta — endereço → coordenadas (como Geocoder.getFromLocationName())
async function forwardGeocode(address: string) {
  const results = await Location.geocodeAsync(address);
  return results[0]; // { latitude, longitude, altitude, accuracy }
}
```

### Localização em background — equivalente ao foreground service

Localização em background exige uma permissão adicional e o Expo Task Manager:

```bash
npx expo install expo-task-manager
```

```tsx
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK = 'background-location-task';

// Define a task (deve estar na raiz do módulo — não dentro de um componente)
TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) { console.error(error); return; }
  const { locations } = data as any;
  // Processa as localizações aqui — salva no BD, envia ao servidor
  console.log('Localização em background:', locations);
});

// Solicita permissão em background e inicia a task
async function startBackgroundTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 50,
    // Exibe uma notificação persistente (obrigatório no Android)
    foregroundService: {
      notificationTitle: 'Rastreando sua rota',
      notificationBody: 'A localização está sendo rastreada em segundo plano.',
      notificationColor: '#6750A4',
    },
  });
}

async function stopBackgroundTracking() {
  await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
```

> Localização em background no Android exige `ACCESS_BACKGROUND_LOCATION` no `AndroidManifest.xml` e exibe uma notificação de foreground service persistente — exatamente como um app Android nativo.

---

## Vibração — Vibrator / VibrationEffect

Integrado ao core do React Native — sem necessidade de instalação:

```tsx
import { Vibration } from 'react-native';

// Vibração simples — Vibrator.vibrate(200)
Vibration.vibrate(200); // 200ms

// Padrão — como VibrationEffect.createWaveform()
// [aguardar, vibrar, aguardar, vibrar, ...]
Vibration.vibrate([0, 200, 100, 400]);

// Repetir padrão (índice a partir do qual repetir, -1 = sem repetição)
Vibration.vibrate([0, 200, 100, 200], true); // em loop

// Parar
Vibration.cancel();
```

Para Haptic Feedback (padrões táteis — como `VibrationEffect.EFFECT_CLICK`):

```bash
npx expo install expo-haptics
```

```tsx
import * as Haptics from 'expo-haptics';

// Feedback de seleção — sutil
await Haptics.selectionAsync();

// Impacto — três intensidades
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Feedback de notificação
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

---

## Brilho da Tela e Keep Awake

```bash
npx expo install expo-brightness expo-keep-awake
```

```tsx
import * as Brightness from 'expo-brightness';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

// Brilho da tela (0.0 - 1.0)
async function setMaxBrightness() {
  const { status } = await Brightness.requestPermissionsAsync();
  if (status !== 'granted') return;
  await Brightness.setSystemBrightnessAsync(1.0);
}

// Manter tela acesa — como PowerManager.SCREEN_BRIGHT_WAKE_LOCK
function VideoPlayerScreen() {
  useEffect(() => {
    activateKeepAwake(); // tela permanece acesa
    return () => deactivateKeepAwake(); // libera ao desmontar
  }, []);

  return <VideoPlayer />;
}
```

---

## Materiais de Estudo

### Documentação Oficial

- [expo-sensors — Documentação](https://docs.expo.dev/versions/latest/sdk/sensors/)
- [expo-location — Documentação](https://docs.expo.dev/versions/latest/sdk/location/)
- [expo-haptics — Documentação](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [React Native — Vibration](https://reactnative.dev/docs/vibration)
- [Android — Visão Geral de Sensores](https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview)
- [Android — Estratégias de Localização](https://developer.android.com/develop/sensors-and-location/location/strategies)

### Videos

- [Expo — Location and Maps](https://www.youtube.com/watch?v=NgtKDLqYVSA)

---

## O que vem a seguir

Sensores e APIs do dispositivo concluídos. Próximo e último tópico: notificações push — Firebase Cloud Messaging (FCM) no React Native, notificações locais e canais de notificação, tudo mapeado a partir do que você já conhece no Android.

➡ [Notificações Push](./05-notifications)
