# Tópico 6 — Recursos Nativos (Trilha 1: Devs Nativos)

> **Perfil:** Devs com background Android/iOS. Já implementaram permissões e câmera no nativo — o desafio aqui é entender como acessar esses recursos a partir do JavaScript e quando usar a camada JS vs descer para o nativo.

---

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Solicitar e verificar permissões no modelo unificado (iOS + Android)
- Capturar fotos e vídeos com expo-camera e react-native-vision-camera
- Acessar geolocalização
- Ler e gravar arquivos com MMKV e react-native-fs
- Receber notificações push
- Entender quando uma lib JS resolve e quando é necessário descer ao nativo

---

## Mapeamento: Nativo → React Native

| Nativo | React Native | Lib |
|--------|-------------|-----|
| `ActivityCompat.requestPermissions` / `CLLocationManager` | `check` + `request` | `react-native-permissions` |
| `Camera2` / `AVCaptureSession` | `<Camera />` component | `react-native-vision-camera` / `expo-camera` |
| `FusedLocationProvider` / `CLLocationManager` | `getCurrentPosition` | `expo-location` / `react-native-geolocation-service` |
| `SharedPreferences` / `UserDefaults` | `MMKV` | `react-native-mmkv` |
| `FileProvider` / `FileManager` | `RNFS` | `react-native-fs` |
| `FCM` / `APNs` | Expo Notifications | `expo-notifications` |

---

## 1. Permissões

### Instalação

```bash
npm install react-native-permissions
cd ios && pod install
```

**Podfile (iOS)** — descomentar as permissões necessárias:
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
<string>Este app precisa de acesso à câmera para tirar fotos.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Este app usa sua localização para mostrar pontos próximos.</string>
```

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

### Padrão de uso: sempre check antes de request

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
      // Usuário marcou "nunca perguntar novamente" — redirecionar para Settings
      Alert.alert(
        'Permissão necessária',
        'Habilite o acesso à câmera nas configurações do dispositivo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configurações', onPress: openSettings },
        ]
      );
      return false;

    default:
      return false;
  }
}
```

> **Diferença importante:** no Android, `RESULTS.BLOCKED` ocorre após o usuário marcar "Nunca perguntar novamente" — equivalente ao `shouldShowRequestPermissionRationale()` retornando `false`.

---

## 2. Câmera

### Opção A: expo-camera (mais simples, Expo Managed/Bare)

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
    return <Button title="Permitir câmera" onPress={requestPermission} />;
  }

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    console.log(photo?.uri);
  }

{% raw %}
  return (
    <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
      <Button title="Fotografar" onPress={takePicture} />
    </CameraView>
  );
}
```
{% endraw %}

### Opção B: react-native-vision-camera (avançado, com frame processors)

```bash
npm install react-native-vision-camera react-native-nitro-modules
cd ios && pod install
```

{% raw %}
```tsx
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

export function VisionCameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  if (!hasPermission) return <Button title="Permitir" onPress={requestPermission} />;
  if (!device) return <Text>Câmera não disponível</Text>;

  return <Camera style={{ flex: 1 }} device={device} isActive={true} />;
}
```
{% endraw %}

> Vision Camera é a escolha para apps que precisam de processamento em tempo real (ML, QR code, AR). Para simplesmente tirar fotos, expo-camera resolve.

---

## 3. Geolocalização

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

// Localização em tempo real
async function watchLocation() {
  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 5000 },
    (location) => {
      console.log(location.coords);
    }
  );
  // Limpeza
  return () => subscription.remove();
}
```

---

## 4. Storage local

```tsx
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({
  id: 'user-storage',
  encryptionKey: 'minha-chave-secreta', // AES-128
});

// Operações síncronas
storage.set('userId', '12345');
storage.set('preferences', JSON.stringify({ theme: 'dark' }));

const userId = storage.getString('userId');
const prefs = JSON.parse(storage.getString('preferences') ?? '{}');
storage.delete('userId');
```

---

## 5. Notificações Push

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
  if (!Device.isDevice) return null; // simulador não suporta push

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

## Quando descer ao nativo (Native Modules)?

Use libs JS para:
- ✅ Câmera, localização, storage, contatos, sensores
- ✅ 90% dos casos de uso cobertos pelo ecossistema Expo/RN

Considere Native Module quando:
- Precisar de SDK nativo específico (ex: SDK bancário, biometria proprietária)
- Performance crítica em loops de processamento de imagem/áudio
- Integrar código nativo legado já existente no time

> Esse assunto é aprofundado no **Tópico 7 — Integração Nativa Avançada**.

---

## Exercício prático

1. Crie um fluxo completo de permissão de câmera com tratamento do estado `BLOCKED`
2. Implemente uma tela de câmera com expo-camera que salva a foto no storage
3. Exiba a localização atual do usuário em tempo real com `watchPositionAsync`
4. Registre o dispositivo para push notifications e exiba o token gerado

---

## Materiais de estudo

### Vídeos

#### Building a Camera App with React Native Vision Camera and Expo
[Assistir no YouTube](https://www.youtube.com/watch?v=xNaGYGDZ2JU)

### Artigos e Docs
- [Master React Native Permissions: Camera & Location — CoderCrafter](https://codercrafter.in/blogs/react-native/master-react-native-permissions-a-no-bs-guide-to-camera-location-access)
- [Comprehensive Guide to Managing Permissions in React Native (2025)](https://www.iamrajklwr.com/blogs/a-comprehensive-guide-to-managing-permissions-in-react-native-2025)
- [How to Handle Platform-Specific Permissions in React Native — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-permissions/view)
- [Expo Permissions Guide — Documentação oficial](https://docs.expo.dev/guides/permissions/)
- [VisionCamera — Getting Started](https://react-native-vision-camera.com/docs/guides)
- [Expo Camera — Documentação oficial](https://docs.expo.dev/versions/latest/sdk/camera/)
- [react-native-permissions — GitHub](https://github.com/zoontek/react-native-permissions)
- [PermissionsAndroid — Documentação oficial React Native](https://reactnative.dev/docs/permissionsandroid)
- [Implementing Camera Functionality in React Native — LogRocket (Dez 2024)](https://blog.logrocket.com/implementing-camera-functionality-react-native/)
