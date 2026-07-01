# Tópico 6 — Recursos Nativos (Trilha 2: Devs Web/React)

> **Perfil:** Devs com background React web. Já usaram browser APIs como `navigator.geolocation`, `navigator.mediaDevices` e `Notification`. O foco é entender por que essas APIs não existem no mobile, como é o modelo de permissões nativo e como acessar esses recursos através das libs do ecossistema RN/Expo.

---

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Entender o modelo de permissões mobile (muito mais restritivo que o browser)
- Solicitar, verificar e tratar permissões bloqueadas
- Capturar fotos com expo-camera
- Acessar geolocalização
- Usar storage local
- Enviar e receber notificações push
- Saber quando e como pesquisar libs no ecossistema Expo

---

## O que NÃO existe no mobile (mas existe no browser)

| API Browser | Por que não existe no RN | Alternativa |
|-------------|-------------------------|-------------|
| `navigator.geolocation` | Sem `window`/`navigator` | `expo-location` |
| `navigator.mediaDevices.getUserMedia()` | Sem WebRTC / DOM | `expo-camera` / `react-native-vision-camera` |
| `Notification API` | Sem Service Workers | `expo-notifications` |
| `localStorage` | Sem DOM Storage | MMKV / AsyncStorage |
| `File API` | Sem FileSystem web | `expo-file-system` / `react-native-fs` |
| `Clipboard API` | Parcialmente diferente | `expo-clipboard` |
| `fetch` | ✅ Existe! | Funciona igual |
| `WebSocket` | ✅ Existe! | Funciona igual |

---

## O modelo de permissões no mobile

No browser, você pede permissão e o usuário aceita ou nega. No mobile, é mais complexo:

```
Permissão não verificada
        ↓
    check()  ←─── sempre verifique antes de pedir
        ↓
┌──────────────────┐
│ DENIED (padrão)  │ → request() → dialog para o usuário
│ GRANTED          │ → pode usar o recurso
│ BLOCKED          │ → usuário negou e "nunca perguntar novamente"
│ LIMITED (iOS)    │ → acesso parcial (ex: fotos selecionadas)
│ UNAVAILABLE      │ → recurso não existe no dispositivo
└──────────────────┘
```

> **Estado BLOCKED é irreversível pelo app** — você só pode redirecionar o usuário para as Configurações do sistema. É o equivalente a "permissão permanentemente negada" e requer atenção especial no UX.

---

## 1. Permissões com react-native-permissions

```bash
npm install react-native-permissions
cd ios && pod install
```

**Podfile (iOS)** — descomentar o que for usar:
```ruby
setup_permissions(['Camera', 'LocationWhenInUse', 'PhotoLibrary'])
```

**Info.plist (iOS):**
```xml
<key>NSCameraUsageDescription</key>
<string>Usamos a câmera para você tirar fotos do produto.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Usamos sua localização para mostrar lojas próximas.</string>
```

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### Hook reutilizável de permissão

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
      `Permissão para ${featureName} bloqueada`,
      `Você bloqueou o acesso. Habilite nas configurações do dispositivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Configurações', onPress: openSettings },
      ]
    );
    return false;
  }

  const result = await request(permission);
  return result === RESULTS.GRANTED;
}

// Uso
const granted = await requestPermission(
  PERMISSIONS.IOS.CAMERA,
  PERMISSIONS.ANDROID.CAMERA,
  'câmera'
);
```

---

## 2. Câmera com expo-camera

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

  // Tela de permissão — similar ao `getUserMedia` no browser
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Button title="Permitir acesso à câmera" onPress={requestPermission} />
      </View>
    );
  }

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.8,
      base64: false, // URI local, não base64
    });
    setPhotoUri(photo?.uri ?? null);
  }

  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />
        <Button title="Tirar outra" onPress={() => setPhotoUri(null)} />
      </View>
    );
  }

  return (
    <CameraView ref={cameraRef} style={styles.camera} facing="back">
      <View style={styles.buttonContainer}>
        <Button title="Fotografar" onPress={takePicture} />
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

## 3. Geolocalização com expo-location

```bash
npx expo install expo-location
```

```tsx
import * as Location from 'expo-location';

// Equivalente ao navigator.geolocation.getCurrentPosition()
async function getLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    alert('Permissão de localização negada');
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

// Monitoramento contínuo (equivalente ao watchPosition)
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

## 4. Notificações Push com expo-notifications

```bash
npx expo install expo-notifications expo-device
```

```tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';

// Configuração global do comportamento ao receber notificação
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Notificações push não funcionam no simulador');
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
  return token.data; // envie este token para o seu backend
}

// Hook para gerenciar notificações na tela
export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    registerForPushNotifications();

    // Listener para notificações recebidas com o app aberto
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notificação recebida:', notification);
      }
    );

    return () => {
      notificationListener.current?.remove();
    };
  }, []);
}
```

---

## Como encontrar libs no ecossistema Expo

Quando você precisa de um recurso nativo, siga essa ordem:

1. **[docs.expo.dev](https://docs.expo.dev)** — Se existe uma lib `expo-*`, use ela
2. **[reactnative.directory](https://reactnative.directory)** — Diretório de libs da comunidade com filtros por plataforma e manutenção
3. **npm** com filtro `react-native-*`

> **Dica:** prefira libs do ecossistema Expo quando possível — elas são testadas com as versões mais recentes do RN e têm suporte ao Expo Go para desenvolvimento rápido.

---

## Diferenças que pegam o dev web de surpresa

| Expectativa (web) | Realidade (mobile) |
|------------------|-------------------|
| Permissão é simples: aceitar ou negar | 5 estados possíveis: GRANTED, DENIED, BLOCKED, LIMITED, UNAVAILABLE |
| Câmera via `getUserMedia` | Componente React (`<CameraView>`) com ref para tirar foto |
| `navigator.geolocation.getCurrentPosition` | Async function com permissão explícita |
| `new Notification(...)` | Sistema complexo com tokens, servidores push (APNs/FCM) |
| `localStorage.setItem` | `storage.set(key, value)` síncrono (MMKV) |

---

## Exercício prático

1. Crie uma tela que solicita permissão de câmera com UX para o estado `BLOCKED`
2. Implemente captura de foto e exiba a preview
3. Salve a URI da foto no MMKV para persistir entre sessões
4. Mostre a localização atual do usuário em um `Text`
5. Configure notificações push e exiba o token gerado

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
- [Expo Permissions Guide — Documentação oficial](https://docs.expo.dev/guides/permissions/)
- [Expo Camera — Documentação oficial](https://docs.expo.dev/versions/latest/sdk/camera/)
- [VisionCamera — Getting Started](https://react-native-vision-camera.com/docs/guides)
- [Master React Native Permissions — CoderCrafter](https://codercrafter.in/blogs/react-native/master-react-native-permissions-a-no-bs-guide-to-camera-location-access)
- [Comprehensive Guide to Permissions in React Native 2025](https://www.iamrajklwr.com/blogs/a-comprehensive-guide-to-managing-permissions-in-react-native-2025)
- [How to Handle Platform-Specific Permissions — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-permissions/view)
- [react-native-permissions — GitHub](https://github.com/zoontek/react-native-permissions)
- [Implementing Camera Functionality in React Native — LogRocket (Dez 2024)](https://blog.logrocket.com/implementing-camera-functionality-react-native/)
- [PermissionsAndroid — Documentação oficial React Native](https://reactnative.dev/docs/permissionsandroid)
