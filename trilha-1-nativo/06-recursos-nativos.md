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
<summary>Descrição do conteúdo</summary>

Este tutorial apresenta o desenvolvimento passo a passo de um aplicativo de câmera para React Native utilizando `react-native-vision-camera`. Uma interface inspirada no Obscura serve como design de referência, e as seguintes funcionalidades são desenvolvidas de forma incremental: gerenciamento de permissões, renderização da câmera, captura de fotos, persistência na galeria, controle de lanterna e flash, inversão de câmera, controles de zoom animados e ajuste de exposição diferenciado por plataforma.

> **Nota brownfield:** o tutorial utiliza o workflow Expo managed com `expo prebuild` para gerar os diretórios do projeto nativo. Em um projeto brownfield, os diretórios nativos (`android/` e `ios/`) já existem e são gerenciados pelo time nativo. Os passos que substituem o `expo prebuild` em projetos brownfield são: (1) instalar o pacote npm, (2) executar `pod install` no iOS, (3) configurar manualmente o `AndroidManifest.xml` e o `Info.plist` conforme descrito abaixo. Plugins Expo (configuração de plugins no `app.json`) não têm efeito em projetos brownfield e não devem ser utilizados — toda configuração nativa deve ser aplicada diretamente nos arquivos nativos.

**Conceitos principais**

- **`device` do Vision Camera**: um objeto descritor de hardware retornado por `useCameraDevice('back' | 'front')`, que enumera todas as capacidades da câmera (intervalo de zoom, FPS máximo, disponibilidade de flash, etc.) para a posição selecionada.
- **Modelo de permissões no mobile**: cada recurso sensível requer permissão concedida explicitamente pelo usuário. Diferentemente da web, permissões mobile possuem cinco estados possíveis: `not-determined`, `granted`, `denied`, `restricted` e `limited`. Permissões que transitam para `denied` só podem ser reativadas pelo aplicativo de Configurações do dispositivo — o app não pode solicitar novamente.
- **Torch vs. Flash**: `torch` é uma luz contínua controlada por uma prop da câmera (ligado/desligado), funcionando como lanterna durante o preview. `flash` é uma luz de disparo único passada como opção para `takePhoto()`, acionada apenas no momento da captura.
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

React Native ≥ 0.73 é necessário. Testes em dispositivo físico são obrigatórios — simuladores não expõem o hardware de câmera.

**Tela de Permissões**

Uma tela dedicada é construída para solicitar todas as permissões necessárias antes de exibir a câmera. Cada permissão é modelada como um `Switch` cujo `value` reflete o estado `granted`. A função `requestPermission` é invocada via `onValueChange`. Um botão "Continuar" avança o usuário apenas quando todas as permissões estão concedidas:

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

> Em projetos brownfield, as permissões podem já ter sido solicitadas pelo app nativo. Recomenda-se verificar o estado atual da permissão com `check()` antes de chamar `request()`, para evitar que uma caixa de diálogo do sistema redundante seja exibida ao usuário.

**Tela de Câmera — Renderizando a Câmera**

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

O layout aloca 2/3 da tela para a câmera (`flex: 2`) e 1/3 para os controles (`flex: 1`).

**Captura de Foto e Persistência na Galeria**

`takePhoto()` é chamado na ref da câmera e aceita uma opção `flash`. O objeto de foto retornado contém uma propriedade `path` — uma URI de arquivo local. O caminho é encaminhado para uma tela de mídia via parâmetros de navegação, e `MediaLibrary.saveToLibraryAsync()` o persiste na galeria do dispositivo:

```tsx
async function takePicture() {
  if (!cameraRef.current) return;
  const photo = await cameraRef.current.takePhoto({ flash });
  navigation.navigate('Media', { mediaPath: photo.path, type: 'photo' });
}

// Na tela de mídia
await MediaLibrary.saveToLibraryAsync(route.params.mediaPath);
```

> Em projetos brownfield, `navigation.navigate` refere-se à pilha do React Navigation. Se a tela de mídia for uma tela nativa fora do limite do RN, uma chamada a um native module deve ser utilizada no lugar.

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

O aplicativo finalizado é validado em dispositivos físicos iOS e Android. Em um contexto brownfield, todas as etapas de configuração nativa descritas acima substituem a abordagem com `expo prebuild` e plugins no `app.json` apresentada no tutorial.

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
