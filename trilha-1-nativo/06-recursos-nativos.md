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

  return (
    <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
      <Button title="Fotografar" onPress={takePicture} />
    </CameraView>
  );
}
```

### Opção B: react-native-vision-camera (avançado, com frame processors)

```bash
npm install react-native-vision-camera react-native-nitro-modules
cd ios && pod install
```

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

<details>
<summary>Transcrição completa</summary>

hello everyone and welcome back to code with VTO in today's video we are going to learn how to build an obscura camera clone using Expo let's see the demo so here I have an iPhone 12 that I'm going to be using to demo this app um this is the iPhone 12 as you can see here but this iPhone 12 is recording an Android pixel as you can see here so this is going to be working for both Android and iOS as you might expect when we are using Expo um um we're going to be using react native vision camera some of you guys have been asking me to create a video using vision camera uh also if you want to use Expo camera which is a very popular Library I have a video in where we created a Snapchat clone if you want to check it out in the channel I'll we leave a link in the description as well if you are curious but yeah first of all guys I'm super excited for bringing this video it's a very interesting application that I really liked and I want to actually show you guys how this app looks in production so oops wrong app let me close this one this is actually the app on the App Store obscura and this application is very popular actually and it's very nice it has a really cool black screen UI um and this is what we are trying to achieve more or less we're not using the camera we're going to have as well these kind of controls for zoom and for the exposure of the camera and yeah so this is our Target this is our expectation and this is our reality this is the application that we're going to be building so we have a couple of functionalities here for example if I press on the uh plus down here you can see that we have this really cool animation using reanimated uh to present these uh buttons that can allow me to play around with the zoom and let's close that and let's play with the exposure so this looks really cool if I do this um and yeah so I can even put plus two and this is how it looks these values are going to be changing between IOS and Android and we will learn how to do that as well so let's close this so once you are happy with the let's say the zoom and also the um exposure we're also displaying as you can see here at the bottom right the exposure and the zoom that we're using um then let's take a picture once we take a picture we take the user to this screen with a nice animation this is actually a modal screen that is displaying the image that I just took um and you can see here the iPhone this is how it looks this is the iPhone 12 as I was mentioning before um I can save to gallery or delete and go back in this case I will delete and as you can see this library is very fast vision camera is a very cool Library honestly that it's very fast and it's really nice for using the camera and you know if you want if you need your application to be very responsive like this one now let's take a picture um of course this is the light I can turn it on and off let me put this back to zero and this back to one and let's see if I turn the flash on and let's take a picture so as you can see there it's pretty obvious that the the uh flash was on and I can also take a selfie as you can see here hello um and then we can let's just take a picture of the Mac for example here and this one I will save it so save to gallery and now I can navigate to the uh gallery and see my picture here one more thing that I almost forgot is that we're going to be building as well this beautiful screen for permissions as you can see here on the Android device I'm not going to be demoing that but we're going to be building this UI as well to uh ask the user for permissions to use the camera to use the library the microphone and cool things like that.

Before we start don't forget to subscribe and like this video. As always guys all the resources and the source code for this video is going to be available completely for free at codewithbeto.dev. When you go to codewith.dev make sure that you check our courses we have a course for react native react with typescript and nextjs and Master git and GitHub make sure to check those out.

The first thing that we're going to do is just create a new Expo project by running pnpm create expo app. Now once we have our project let's go ahead and install dependencies: vision camera, expo blur (optional, for displaying exposure and zoom nicely), and expo media library to save photos.

Once dependencies are installed we need to make some configurations in order to use vision camera. We need to add configuration in our app.json specifying the plugin options. This is totally optional if you are not going to be taking videos — you don't need to ask permissions for audio. Once we have this configuration in place we can go ahead and prebuild this application. If you are not familiar with prebuild basically it's a command that is going to allow me to create the native projects for iOS and Android that Expo provides.

For permissions: the first thing we need to do is create a permissions screen. We check camera permission status, microphone permission status, and media library permissions. The library uses a hook called use permissions from expo media library. We validate if camera and microphone permissions are granted, and if not we redirect the user to the permissions screen.

For the camera itself: we use the Camera component from react native vision camera. The camera component requires three key properties: style, device, and isActive. We get the device using useCameraDevice hook specifying 'back' or 'front'. We also need a ref (useRef) to call takePictureAsync later.

For taking a picture: we call camera.current.takePhoto() which takes options including flash. The result is a photo object with a path property. We navigate to a media screen passing this path and the type 'photo'. We use expo media library's saveToLibraryAsync to save to the device gallery.

For zoom and exposure controls: we use Reanimated's bounceIn animation to display the controls with a staggered animation effect (delay of index * 100ms). The zoom values are mapped to the camera's zoom property. Exposure values differ between iOS and Android — iOS uses -2 to 2 while Android uses different ranges. We position the buttons in a circular arc using Math.cos and Math.sin with a calculated radius.

For flash vs torch: torch works as a continuous flashlight (lamp), while flash is a variable passed to takePhoto options that only fires during the photo capture. We toggle both with a simple previous-state toggle pattern.

Key takeaways from this tutorial: always use a real device for camera testing (simulators don't have cameras), require react-native >= 0.73 for vision camera v4+, use Expo prebuild to generate the native iOS and Android folders, configure app.json plugin options for vision camera, handle all five permission states, and use Expo media library for saving to gallery.

</details>

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
