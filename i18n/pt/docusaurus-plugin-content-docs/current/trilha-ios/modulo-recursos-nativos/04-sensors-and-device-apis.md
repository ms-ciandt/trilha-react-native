---
title: Sensors and Device APIs in React Native
---

# Sensores e APIs de Dispositivo no React Native

O iOS oferece um conjunto rico de APIs de hardware do dispositivo por meio de frameworks como `CoreLocation`, `CoreMotion`, `CoreBluetooth`, `LocalAuthentication`, `MapKit` e `UIKit`. Cada um deles possui um equivalente direto em React Native que encapsula o mesmo framework de plataforma, o que significa que o modelo mental que você já tem se transfere diretamente para a camada JavaScript.

---

## CoreLocation / CLLocationManager → expo-location

`CLLocationManager` é a porta de entrada para GPS, triangulação Wi-Fi e geofencing no iOS. `expo-location` o encapsula no iOS e expõe o mesmo modelo de permissão e atualização baseado em delegate por meio de funções JavaScript assíncronas.

```bash
npx expo install expo-location
```

### NSLocationWhenInUseUsageDescription

A chave do Info.plist é obrigatória. Em um fluxo gerenciado pelo Expo, adicione-a ao `app.json`:

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

A chave `NSLocationAlwaysAndWhenInUseUsageDescription` é necessária apenas quando você solicita localização em segundo plano. Sem ela, o diálogo de permissão não aparecerá e a solicitação falhará silenciosamente.

### Localização em primeiro plano

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

### Atualizações contínuas (watchPosition)

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

### Localização em segundo plano

A localização em segundo plano requer o entitlement de modo de segundo plano `location`. No `app.json`:

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

Em seguida, solicite a permissão de segundo plano separadamente — a Apple exige um fluxo de permissão em duas etapas:

```typescript
const { status } = await Location.requestBackgroundPermissionsAsync();
```

As tarefas de localização em segundo plano são executadas via `expo-task-manager` e continuam mesmo quando o aplicativo está suspenso, correspondendo ao comportamento de `allowsBackgroundLocationUpdates = true` no `CLLocationManager`.

---

## CoreMotion / CMMotionManager → expo-sensors

`CMMotionManager` é o ponto de entrada para dados do acelerômetro, giroscópio, barômetro e pedômetro. `expo-sensors` encapsula cada sensor como um módulo independente com uma API baseada em assinatura, análoga à família de métodos `startAccelerometerUpdates(to:withHandler:)`.

```bash
npx expo install expo-sensors
```

### Acelerômetro

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

### Giroscópio

```typescript
import { Gyroscope } from 'expo-sensors';

const subscription = Gyroscope.addListener((data) => {
  // data.x, data.y, data.z in radians/second — same as CMGyroData
  console.log(data);
});

Gyroscope.setUpdateInterval(16); // ~60 fps
subscription.remove();
```

### Barômetro

```typescript
import { Barometer } from 'expo-sensors';

const subscription = Barometer.addListener((data) => {
  // data.pressure in hectopascals — same as CMAltimeter pressure
  // data.relativeAltitude on iOS — same as CMAltitudeData.relativeAltitude
  console.log(data.pressure, data.relativeAltitude);
});

subscription.remove();
```

### Pedômetro

`CMPedometer` requer a chave `NSMotionUsageDescription`. No `app.json`:

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

`CBCentralManager` e `CBPeripheralManager` gerenciam a varredura e a conexão Bluetooth Low Energy. `react-native-ble-plx` encapsula `CoreBluetooth` no iOS e expõe o mesmo fluxo de varredura do central manager por meio de uma API JavaScript.

```bash
npx expo install react-native-ble-plx
```

A chave `NSBluetoothAlwaysUsageDescription` é obrigatória no Info.plist no iOS 13+:

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

### Varredura de periféricos

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

### Conexão e leitura de uma característica

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

Destrua o manager quando o componente for desmontado para liberar os recursos do `CBCentralManager`:

```typescript
useEffect(() => {
  return () => manager.destroy();
}, []);
```

---

## LocalAuthentication / Face ID / Touch ID → expo-local-authentication

`LAContext` controla a autenticação biométrica no iOS. `expo-local-authentication` encapsula `LAContext.evaluatePolicy(_:localizedReason:reply:)` e expõe os tipos de biometria disponíveis por meio de uma API assíncrona simples.

```bash
npx expo install expo-local-authentication
```

A chave `NSFaceIDUsageDescription` é obrigatória quando o Face ID pode ser acionado:

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

### Verificando a capacidade do hardware

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

### Autenticando o usuário

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

| Código LAError | result.error em expo-local-authentication |
|---|---|
| `userCancel` | `"user_cancel"` |
| `userFallback` | `"user_fallback"` |
| `biometryNotAvailable` | `"not_available"` |
| `biometryLockout` | `"lockout"` |
| `authenticationFailed` | `"authentication_failed"` |

---

## MapKit / MKMapView → react-native-maps (provedor Apple Maps)

`MKMapView` é o componente de mapa do UIKit. `react-native-maps` o encapsula no iOS por meio do provedor `PROVIDER_DEFAULT` (Apple Maps), expondo `MKAnnotation`, `MKOverlay` e animação de região por meio de props e callbacks.

```bash
npx expo install react-native-maps
```

### Exibindo um mapa com Apple Maps

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

### Animando para uma região

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

### Tipos de mapa

| MKMapType | prop mapType em react-native-maps |
|---|---|
| `.standard` | `"standard"` (padrão) |
| `.satellite` | `"satellite"` |
| `.hybrid` | `"hybrid"` |
| `.satelliteFlyover` | `"satelliteFlyover"` |
| `.hybridFlyover` | `"hybridFlyover"` |

---

## UIFeedbackGenerator haptics → expo-haptics

`UIImpactFeedbackGenerator`, `UINotificationFeedbackGenerator` e `UISelectionFeedbackGenerator` são os três geradores de haptics do UIKit. `expo-haptics` encapsula os três e os mapeia para chamadas JavaScript nomeadas.

```bash
npx expo install expo-haptics
```

### Feedback de impacto

```typescript
import * as Haptics from 'expo-haptics';

// UIImpactFeedbackGenerator(style: .light)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// UIImpactFeedbackGenerator(style: .medium)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// UIImpactFeedbackGenerator(style: .heavy)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
```

### Feedback de notificação

```typescript
// UINotificationFeedbackGenerator().notificationOccurred(.success)
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// UINotificationFeedbackGenerator().notificationOccurred(.warning)
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

// UINotificationFeedbackGenerator().notificationOccurred(.error)
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

### Feedback de seleção

```typescript
// UISelectionFeedbackGenerator().selectionChanged()
await Haptics.selectionAsync();
```

Os haptics são automaticamente uma operação sem efeito em dispositivos Android que não suportam o motor de haptics equivalente, portanto a mesma chamada pode ser usada com segurança em multiplataforma.

---

## Notificações Push via APNs → expo-notifications

A entrega de push via APNs em um aplicativo iOS nativo requer o registro para notificações remotas, o recebimento de um device token de `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)` e a configuração de entitlements. `expo-notifications` gerencia todo o fluxo, incluindo o registro no APNs, a interceptação de notificações em primeiro plano e o tratamento de notificações em segundo plano.

```bash
npx expo install expo-notifications expo-device
```

### Entitlements e modos de segundo plano obrigatórios

No `app.json`:

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

O modo de segundo plano `remote-notification` é necessário para notificações push silenciosas e atualização em segundo plano — análogo a habilitar `Background Modes > Remote notifications` no Xcode.

### Registrando para notificações push e obtendo o device token

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

### Categorias de notificação (UNNotificationCategory)

As categorias de notificação permitem botões de ação em notificações push. Elas se mapeiam diretamente para `UNNotificationCategory` e `UNNotificationAction`:

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

### Tratando notificações recebidas

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

### Token APNs vs token push do Expo

`expo-notifications` emite um token push do Expo (`ExponentPushToken[...]`) que é roteado pela infraestrutura de push do Expo até o APNs. Se o seu backend precisar do token APNs bruto do dispositivo (para entrega direta via APNs), use `getDevicePushTokenAsync`:

```typescript
// Raw APNs token — use when your backend talks directly to APNs
const deviceToken = await Notifications.getDevicePushTokenAsync();
console.log(deviceToken.data); // hex string matching the APNs token bytes
```

---

## Resumo do mapeamento de APIs

| Framework / API do iOS | Equivalente em React Native |
|---|---|
| `CLLocationManager` / `CLLocationDelegate` | `expo-location` |
| Acelerômetro do `CMMotionManager` | `Accelerometer` de `expo-sensors` |
| Giroscópio do `CMMotionManager` | `Gyroscope` de `expo-sensors` |
| Barômetro do `CMAltimeter` | `Barometer` de `expo-sensors` |
| `CMPedometer` | `Pedometer` de `expo-sensors` |
| `CBCentralManager` / `CBPeripheral` | `react-native-ble-plx` |
| `LAContext.evaluatePolicy` | `expo-local-authentication` |
| `MKMapView` | `react-native-maps` com `PROVIDER_DEFAULT` |
| `UIImpactFeedbackGenerator` | `Haptics.impactAsync` de `expo-haptics` |
| `UINotificationFeedbackGenerator` | `Haptics.notificationAsync` de `expo-haptics` |
| `UISelectionFeedbackGenerator` | `Haptics.selectionAsync` de `expo-haptics` |
| APNs / `UNUserNotificationCenter` | `expo-notifications` |

Os frameworks de plataforma subjacentes são os mesmos que o seu código Swift já utiliza. Cada biblioteca desta lista é um wrapper fino que traduz os padrões nativos de delegate e completion handler em promises JavaScript e assinaturas de eventos.
