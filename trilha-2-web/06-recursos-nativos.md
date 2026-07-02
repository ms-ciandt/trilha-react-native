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
| `navigator.geolocation.getCurrentPosition` | Função assíncrona com permissão explícita |
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
<summary>Descrição do conteúdo</summary>

Este tutorial apresenta o desenvolvimento passo a passo de uma aplicação de câmera para React Native usando `react-native-vision-camera`. Uma interface inspirada no Obscura serve como design de referência, e as seguintes funcionalidades são desenvolvidas de forma incremental: gerenciamento de permissões, renderização da câmera, captura de fotos, persistência na galeria, controle de lanterna e flash, inversão de câmera, controles de zoom animados e ajuste de exposição diferenciado por plataforma.

> **Nota brownfield:** o tutorial utiliza o workflow gerenciado do Expo com `expo prebuild` para gerar os diretórios nativos do projeto. Em um projeto brownfield, os diretórios nativos (`android/` e `ios/`) já existem e são gerenciados pela equipe nativa. As etapas que substituem o `expo prebuild` em projetos brownfield são: (1) instalar o pacote npm, (2) executar `pod install` no iOS, (3) configurar manualmente o `AndroidManifest.xml` e o `Info.plist` conforme descrito abaixo. Plugins do Expo (configuração de plugin no `app.json`) não têm efeito em projetos brownfield e não devem ser utilizados — toda configuração nativa deve ser aplicada diretamente nos arquivos nativos.

**Conceitos Fundamentais**

- **`device` do Vision Camera**: objeto descritor de hardware retornado por `useCameraDevice('back' | 'front')`, que enumera todas as capacidades da câmera (intervalo de zoom, FPS máximo, disponibilidade de flash, etc.) para a posição selecionada.
- **Modelo de permissões no mobile**: cada recurso sensível exige permissão explicitamente concedida pelo usuário. Diferente da web, as permissões no mobile possuem cinco estados possíveis: `not-determined`, `granted`, `denied`, `restricted` e `limited`. Permissões que transitam para `denied` só podem ser reativadas nas Configurações do dispositivo — o app não pode solicitar novamente.
- **Torch vs. Flash**: `torch` é uma luz contínua controlada por uma prop da câmera (on/off), funcionando como lanterna durante o preview. `flash` é uma luz de disparo único passada como opção para `takePhoto()`, acionada apenas no momento da captura.
- **Animações de entrada com Reanimated**: `react-native-reanimated` fornece modificadores de animação de entrada (ex: `BounceIn`) aplicados a `Animated.View`. Um modificador `.delay(ms)` escalona a animação por item, produzindo efeitos de aparecimento sequencial sem timeouts manuais.

**Instalação — Procedimento Brownfield**

```bash
npm install react-native-vision-camera react-native-nitro-modules
npm install expo-media-library

# iOS — dentro do projeto nativo existente
cd ios && pod install
```

**Configuração Nativa — Brownfield (substitui o expo prebuild)**

No **iOS**, as seguintes chaves são adicionadas diretamente ao `Info.plist`:

```xml
<!-- ios/YourApp/Info.plist -->
<key>NSCameraUsageDescription</key>
<string>This app requires camera access to take photos.</string>
<key>NSMicrophoneUsageDescription</key>
<string>This app requires microphone access to record video.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app requires photo library access to save photos.</string>
```

No **Android**, as seguintes permissões são declaradas no `AndroidManifest.xml`:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />
```

React Native >= 0.73 é necessário. Testes em dispositivo físico são obrigatórios — simuladores não expõem hardware de câmera.

**Tela de Permissões**

Uma tela dedicada é construída para solicitar todas as permissões necessárias antes de exibir a câmera. Cada permissão é modelada como um `Switch` cujo `value` reflete o estado `granted`. A função `requestPermission` é invocada via `onValueChange`. Um botão "Continuar" encaminha o usuário apenas quando todas as permissões são concedidas:

```tsx
import { useCameraPermissions } from 'react-native-vision-camera';
import * as MediaLibrary from 'expo-media-library';

const [cameraPermission, requestCameraPermission] = useCameraPermissions();
const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

<Switch
  value={cameraPermission?.status === 'granted'}
  onValueChange={requestCameraPermission}
  trackColor={{ true: 'orange' }}
/>

function handleContinue() {
  if (
    cameraPermission?.status === 'granted' &&
    mediaPermission?.status === 'granted'
  ) {
    router.replace('/');
  } else {
    Alert.alert('Please enable all permissions in Settings.');
  }
}
```

> Em projetos brownfield, as permissões podem já ter sido solicitadas pelo app nativo. Recomenda-se verificar o status atual da permissão com `check()` antes de chamar `request()`, para evitar que um diálogo redundante do sistema seja exibido ao usuário.

**Tela da Câmera — Renderizando a Câmera**

O componente `Camera` requer três props obrigatórias: `device`, `isActive` e `ref`. Variáveis de estado para zoom, exposição, lanterna, flash e posição da câmera são declaradas no nível do componente:

```tsx
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useRef, useState } from 'react';

const [cameraPosition, setCameraPosition] = useState<'back'|'front'>('back');
const [torch, setTorch]       = useState<'on'|'off'>('off');
const [flash, setFlash]       = useState<'on'|'off'>('off');
const [zoom, setZoom]         = useState(device?.neutralZoom ?? 1);
const [exposure, setExposure] = useState(0);

const device = useCameraDevice(cameraPosition);
const cameraRef = useRef<Camera>(null);

<Camera
  ref={cameraRef}
  style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}
  device={device}
  isActive={true}
  zoom={zoom}
  exposure={exposure}
  torch={torch}
  resizeMode="cover"
/>
```

O layout destina 2/3 da tela para a câmera (`flex: 2`) e 1/3 para os controles (`flex: 1`).

**Captura de Foto e Persistência na Galeria**

`takePhoto()` é chamado na ref da câmera e aceita uma opção `flash`. O objeto de foto retornado contém uma propriedade `path` — uma URI de arquivo local. O caminho é passado para uma tela de mídia via parâmetros de navegação, e `MediaLibrary.saveToLibraryAsync()` persiste a foto na galeria do dispositivo:

```tsx
async function takePicture() {
  if (!cameraRef.current) return;
  const photo = await cameraRef.current.takePhoto({ flash });
  navigation.navigate('Media', { mediaPath: photo.path, type: 'photo' });
}

// Na tela de mídia
await MediaLibrary.saveToLibraryAsync(route.params.mediaPath);
```

> Em projetos brownfield, `navigation.navigate` refere-se à stack do React Navigation. Se a tela de mídia for uma tela nativa fora do limite do RN, uma chamada a um módulo nativo deve ser utilizada.

**Lanterna, Flash e Inversão de Câmera**

Todos os controles seguem o mesmo padrão de alternância:

```tsx
setTorch(prev => prev === 'off' ? 'on' : 'off');
setFlash(prev => prev === 'off' ? 'on' : 'off');
setCameraPosition(prev => prev === 'back' ? 'front' : 'back');
```

**Controles Animados de Zoom e Exposição**

Os controles são distribuídos ao longo de um arco circular. As posições são calculadas por funções trigonométricas. O `BounceIn` do Reanimated com delay por índice produz uma entrada escalonada:

```tsx
import Animated, { BounceIn } from 'react-native-reanimated';

const ZOOM_OPTIONS = [0.5, 1, 2, 3, 5];
const radius = Math.min(width, height - 100) * 0.35;

ZOOM_OPTIONS.map((option, index) => {
  const angle = (index / ZOOM_OPTIONS.length) * (2 * Math.PI) - Math.PI / 2;
  const x = Math.cos(angle) * radius + 40;
  const y = Math.sin(angle) * radius + height / 4;

  return (
    <Animated.View
      key={index}
      entering={BounceIn.delay(index * 100)}
      style={{ position: 'absolute', left: x, top: y }}
    >
      <TouchableOpacity onPress={() => setZoom(option)}>
        <Text>{option}x</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});
```

Os intervalos de exposição diferem por plataforma devido às divergências nas APIs de hardware:

```tsx
const EXPOSURE_OPTIONS = Platform.OS === 'ios'
  ? [-2, -1, 0, 1, 2]      // iOS EVBias
  : [-10, -5, 0, 5, 10];   // Android exposure compensation
```

A aplicação finalizada é validada em dispositivos físicos iOS e Android. Em um contexto brownfield, todas as etapas de configuração nativa descritas acima substituem a abordagem com `expo prebuild` e plugin no `app.json` mostrada no tutorial.

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
