---
id: utilizando-recursos-nativos
title: "Utilizando Recursos Nativos"
---

# Tópico 1 — Utilizando Recursos Nativos (Trilha 1: Devs Nativos)

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativa_01_utilizando_recursos_nativos_en.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

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

### Como funciona por baixo

iOS e Android têm modelos de permissão estruturalmente diferentes. No iOS, o sistema exibe o diálogo uma única vez — se o usuário negar, o OS nunca mais mostra. O app só pode redirecionar para as Configurações. No Android, o modelo evoluiu: a partir do Android 11, o sistema rastreia quantas vezes a permissão foi solicitada e pode negar automaticamente solicitações repetidas, além de resetar permissões de apps não utilizados.

`react-native-permissions` unifica esses dois modelos em uma única API com cinco estados:

- `GRANTED` — permissão ativa, pode usar o recurso
- `DENIED` — ainda não solicitada ou negada (pode pedir novamente via `request()`)
- `BLOCKED` — negada definitivamente; `request()` não abrirá o diálogo; apenas Settings resolve
- `LIMITED` — acesso parcial, exclusivo do iOS 14+ para biblioteca de fotos
- `UNAVAILABLE` — o hardware ou recurso não existe no dispositivo

O padrão `check` antes de `request` existe por uma razão precisa: chamar `request()` quando o status já é `BLOCKED` não faz nada — o diálogo simplesmente não aparece e nenhum erro é lançado. Sem o `check`, você pode dar ao usuário a impressão de que o botão está quebrado.

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

### Como funciona por baixo

No Android nativo, você usaria `Camera2` ou `CameraX` para controlar o hardware diretamente — `CameraManager`, `CaptureRequest`, `ImageReader` e uma `SurfaceView` para o preview. No iOS, o equivalente é `AVFoundation`: `AVCaptureSession`, `AVCaptureDeviceInput`, `AVCapturePhotoOutput`. São APIs de baixo nível com curva de aprendizado considerável.

As libs JavaScript encapsulam tudo isso. `expo-camera` usa implementações nativas simplificadas para os casos mais comuns — tirar foto, gravar vídeo, controlar flash e câmera frontal/traseira. `react-native-vision-camera` expõe o hardware com muito mais granularidade: controle manual de ISO, shutter speed, zoom óptico, e principalmente **frame processors** — funções JavaScript (compiladas para C++ via JSI) que rodam em cada frame da câmera em tempo real, permitindo ML, detecção de QR code e AR sem sair do JavaScript.

A escolha entre as duas depende do caso de uso, não da preferência. Se o app só precisa capturar fotos ou vídeos, `expo-camera` resolve com muito menos complexidade de setup. Se precisa processar o que a câmera vê em tempo real, `react-native-vision-camera` é o caminho.

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

### Como funciona por baixo

No Android, geolocalização é fornecida pelo `FusedLocationProviderClient` — uma API do Google Play Services que combina GPS, rede Wi-Fi e torres de celular para entregar a localização mais precisa com o menor consumo de bateria possível. No iOS, o equivalente é o `CLLocationManager`, que segue uma política similar de fusão de fontes.

O parâmetro `accuracy` em `expo-location` mapeia diretamente para os `LocationRequest.Priority` do Android e os `CLLocationAccuracy` do iOS. `High` ativa o GPS real; `Balanced` usa fusão de fontes com menor consumo; `Low` e `Lowest` dependem majoritariamente de rede.

A distinção entre **foreground** e **background** permissions é crítica: `requestForegroundPermissionsAsync()` permite localização apenas enquanto o app está visível. Para rastrear quando o app está em segundo plano (apps de delivery, fitness), você precisa de `requestBackgroundPermissionsAsync()` — que no iOS exige justificativa explícita na App Store review e no Android requer uma permissão separada (`ACCESS_BACKGROUND_LOCATION`). Nunca solicite background se o app não precisar — as stores rejeitam ou penalizam isso.

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

### Como funciona por baixo

`SharedPreferences` (Android) e `UserDefaults` (iOS) são o armazenamento chave-valor nativo do sistema operacional — simples, rápidos, e persistidos entre sessões. O `AsyncStorage` original do React Native usava uma implementação JavaScript sobre SQLite, o que tornava todas as operações assíncronas e relativamente lentas para leituras frequentes.

`react-native-mmkv` usa uma implementação diferente: a biblioteca MMKV do WeChat, que armazena dados em arquivos mapeados em memória (memory-mapped files). Isso torna as operações síncronas — não há callbacks ou Promises — porque a leitura acontece diretamente da memória, não de I/O de disco. O impacto é visível em lists grandes: com `AsyncStorage`, cada leitura no `useEffect` adiciona um tick assíncrono; com MMKV, é acesso direto.

A opção `encryptionKey` ativa criptografia AES-128 dos dados em disco — equivalente a usar `EncryptedSharedPreferences` no Android ou o Keychain do iOS para dados sensíveis.

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

### Como funciona por baixo

Notificações push nunca chegam diretamente do seu servidor ao dispositivo. O fluxo real é:

```
Seu backend → FCM (Firebase, Android) → SO Android → app
Seu backend → APNs (Apple) → SO iOS → app
```

O dispositivo se registra no FCM ou APNs e recebe um token único. Esse token identifica o par app + dispositivo. Você envia esse token para seu backend, que o armazena. Quando quer mandar uma notificação, seu backend faz um request autenticado para o FCM/APNs com o token e o payload. O Google ou Apple entregam ao dispositivo.

`expo-notifications` adiciona uma camada sobre isso: o Expo tem seus próprios servidores que intermediam o envio para FCM e APNs, simplificando o backend — você manda para `https://exp.host/--/api/v2/push/send` com o `expoPushToken` em vez de configurar credenciais FCM e APNs separadamente. Em produção com volume alto, muitas equipes migram para envio direto ao FCM/APNs para ter mais controle e reduzir latência.

`setNotificationHandler` controla o comportamento quando o app está em **foreground** — sem ele, notificações recebidas com o app aberto são silenciosas por padrão. O comportamento quando o app está em **background** ou fechado é controlado pelo sistema operacional, não pelo app.

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

A maioria dos recursos de hardware — câmera, localização, storage, sensores, contatos, biometria básica — já tem libs JavaScript maduras no ecossistema. Escrever código nativo é necessário em situações específicas:

**Use libs JavaScript quando:**
- O recurso está disponível via `expo-*` ou uma lib amplamente mantida na comunidade
- O caso de uso é padrão (tirar foto, obter coordenadas, armazenar preferências)

**Considere Native Module quando:**
- O fornecedor do SDK só disponibiliza um SDK nativo sem wrapper JavaScript (comum em SDKs bancários, de pagamento, ou de biometria proprietária)
- A performance é crítica em loops contínuos: processamento de áudio sample a sample, pipelines de imagem em alta frequência — o custo de cruzar a bridge JavaScript/nativo em cada frame pode ser proibitivo
- Você precisa integrar código nativo Kotlin/Swift já existente no time, que não vale reescrever

A regra prática: pesquise no [React Native Directory](https://reactnative.directory) antes de escrever código nativo. Se existir uma lib com manutenção ativa, use-a. Se não existir ou não atender, esse é o sinal para descer ao nativo.

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
