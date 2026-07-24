---
title: Camera and Media — iOS
---

# Camera e Mídia

Como desenvolvedor iOS, você trabalhou diretamente com `AVFoundation`, `PHPhotoLibrary` e `UIImagePickerController`. O React Native envolve esses mesmos frameworks de sistema por meio de bibliotecas bem mantidas que expõem uma API TypeScript, enquanto a camada nativa subjacente continua chamando exatamente as mesmas APIs AVFoundation e PhotoKit que você já conhece.

Esta página mapeia cada conceito nativo para seu equivalente em React Native e mostra como usar cada biblioteca em uma aplicação real.

---

## Permissões: strings do Info.plist e Expo Config Plugins

Em um projeto iOS puro, você adiciona as strings de descrição de uso ao `Info.plist` manualmente. Em um projeto Expo gerenciado, o sistema de config plugins as injeta automaticamente durante o `expo prebuild`, que gera o projeto nativo antes da build.

As strings necessárias para acesso à câmera e ao microfone são:

- `NSCameraUsageDescription` — obrigatória sempre que você acessar a câmera
- `NSMicrophoneUsageDescription` — obrigatória para gravação de vídeo ou captura de áudio
- `NSPhotoLibraryUsageDescription` — obrigatória para leitura da biblioteca de fotos
- `NSPhotoLibraryAddUsageDescription` — obrigatória para salvar fotos ou vídeos na biblioteca

No `app.json` (ou `app.config.js`), declare os plugins e suas strings de permissão:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "This app uses the camera to capture photos and videos.",
          "enableMicrophonePermission": true,
          "microphonePermissionText": "This app uses the microphone to record audio with video."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "This app accesses your photo library to let you choose images.",
          "cameraPermission": "This app uses the camera to take photos."
        }
      ],
      [
        "expo-media-library",
        {
          "photosPermission": "This app accesses your photos to save captured media.",
          "savePhotosPermission": "This app saves photos and videos to your library.",
          "isAccessMediaLocationEnabled": true
        }
      ]
    ]
  }
}
```

Após adicionar ou alterar um plugin, execute `npx expo prebuild --clean` para regenerar a pasta `ios/`. O `Info.plist` conterá as strings acima sem edição manual.

---

## AVFoundation → react-native-vision-camera

### Modelo mental

| Conceito AVFoundation | Equivalente no VisionCamera |
|---|---|
| `AVCaptureSession` | Componente `Camera` (Fabric) |
| `AVCaptureDeviceInput` | Prop `device` resolvida via `useCameraDevice` |
| `AVCapturePhotoOutput` | `camera.takePhoto()` |
| `AVCaptureMovieFileOutput` | `camera.startRecording()` / `camera.stopRecording()` |
| `AVCaptureVideoPreviewLayer` | A própria view `Camera` |
| `AVCaptureDevice.requestAccess` | `Camera.requestCameraPermission()` |

O VisionCamera v4 é construído sobre Fabric e se comunica via JSI. Não há round-trip assíncrono pela bridge para o preview nem para os frame processors — o preview da câmera é uma view Fabric nativa e os worklets de frame processor executam de forma síncrona na thread de captura via JSI, o mesmo modelo de execução dos TurboModules baseados em JSI.

### Instalação

```bash
npx expo install react-native-vision-camera
```

Adicione a entrada do plugin mostrada na seção de permissões acima e execute `npx expo prebuild`.

### Solicitando permissões

```typescript
import { Camera } from 'react-native-vision-camera';

async function requestPermissions(): Promise<boolean> {
  const cameraStatus = await Camera.requestCameraPermission();
  const micStatus = await Camera.requestMicrophonePermission();
  return cameraStatus === 'granted' && micStatus === 'granted';
}
```

Este é o equivalente em React Native de chamar `AVCaptureDevice.requestAccess(for: .video)` e `AVCaptureDevice.requestAccess(for: .audio)` em Swift.

### Selecionando um dispositivo

```typescript
import { useCameraDevice } from 'react-native-vision-camera';

// equivalent to querying AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
const device = useCameraDevice('back');
```

`useCameraDevice` aceita `'back'` ou `'front'`. Para maior controle sobre a câmera física (ultra-wide, telephoto, LiDAR), use `useCameraDevices()` e filtre por `device.physicalDevices`.

### Exibindo o preview e tirando uma foto

Em Swift, você anexa um `AVCaptureVideoPreviewLayer` a um `CALayer`. No React Native, o componente `Camera` gerencia a camada de preview internamente.

```typescript
import React, { useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

export function CameraScreen() {
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  async function handleTakePhoto() {
    const photo = await cameraRef.current?.takePhoto({
      flash: 'auto',
    });
    if (photo) {
      console.log('Photo saved at:', photo.path);
    }
  }

  if (!device) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        photo
      />
      <TouchableOpacity
        style={styles.shutter}
        onPress={handleTakePhoto}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shutter: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
  },
});
```

### Gravando vídeo

`startRecording` aceita um callback que dispara quando a gravação termina, equivalente ao `AVCaptureFileOutputRecordingDelegate.fileOutput(_:didFinishRecordingTo:from:error:)` em Swift.

```typescript
import { useRef } from 'react';
import { Camera } from 'react-native-vision-camera';

const cameraRef = useRef<Camera>(null);

function startRecording() {
  cameraRef.current?.startRecording({
    flash: 'off',
    onRecordingFinished: (video) => {
      console.log('Video path:', video.path);
      console.log('Duration (s):', video.duration);
    },
    onRecordingError: (error) => {
      console.error('Recording error:', error);
    },
  });
}

async function stopRecording() {
  await cameraRef.current?.stopRecording();
}
```

Habilite a captura de vídeo adicionando a prop `video` ao componente `Camera` e incluindo `NSMicrophoneUsageDescription` (já adicionada pelo plugin).

### Frame processors (worklets JSI)

Frame processors são funções que executam de forma síncrona em cada frame da câmera, diretamente na thread de captura via JSI — não há bridge, serialização nem re-render do React envolvido. Isso é conceitualmente próximo a um callback de `CMSampleBuffer` em um `AVCaptureVideoDataOutputSampleBufferDelegate`, exceto que ele executa em JavaScript (Hermes) via JSI em vez de código Swift nativo.

```typescript
import { useFrameProcessor } from 'react-native-vision-camera';
import { runAtTargetFps } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';

const onBarcodeDetected = Worklets.createRunOnJS((barcode: string) => {
  console.log('Barcode:', barcode);
});

const frameProcessor = useFrameProcessor((frame) => {
  'worklet';
  runAtTargetFps(10, () => {
    'worklet';
    // call a VisionCamera plugin here, e.g. scanBarcodes(frame)
    // results are passed back to the JS thread via Worklets.createRunOnJS
  });
}, [onBarcodeDetected]);
```

Plugins de frame processor são módulos nativos (escritos em Swift para iOS) registrados no registry de plugins do VisionCamera e chamados de forma síncrona a partir do worklet. Escrever um plugin de frame processor segue o mesmo padrão Swift → Codegen de um TurboModule, mas usa a própria macro de registro do VisionCamera em vez de `TM_EXPORT_MODULE`.

### AVCaptureSession vs API do VisionCamera — comparação

| Tarefa | AVCaptureSession (Swift) | VisionCamera (TypeScript) |
|---|---|---|
| Criar sessão | `AVCaptureSession()` | Montagem de `<Camera ... />` |
| Adicionar input | `session.addInput(deviceInput)` | Prop `device` |
| Adicionar saída de foto | `session.addOutput(photoOutput)` | Prop `photo` |
| Adicionar saída de vídeo | `session.addOutput(movieOutput)` | Prop `video` |
| Iniciar preview | `previewLayer.session = session; session.startRunning()` | `isActive={true}` |
| Parar preview | `session.stopRunning()` | `isActive={false}` |
| Tirar foto | `photoOutput.capturePhoto(with:, delegate:)` | `camera.takePhoto()` |
| Gravar vídeo | `movieOutput.startRecording(to:, recordingDelegate:)` | `camera.startRecording(...)` |
| Processar frames | `AVCaptureVideoDataOutputSampleBufferDelegate` | Worklet `useFrameProcessor` |
| Solicitar acesso | `AVCaptureDevice.requestAccess(for: .video)` | `Camera.requestCameraPermission()` |

---

## UIImagePickerController / PHPickerViewController → expo-image-picker

`PHPickerViewController` (iOS 14+) é o substituto moderno do `UIImagePickerController`. O `expo-image-picker` apresenta a folha do seletor de fotos do sistema, que no iOS 14+ usa `PHPickerViewController` internamente.

### Instalação

```bash
npx expo install expo-image-picker
```

O config plugin do Expo injeta `NSPhotoLibraryUsageDescription` e `NSCameraUsageDescription` automaticamente.

### Selecionando uma imagem ou vídeo da biblioteca

```typescript
import * as ImagePicker from 'expo-image-picker';

async function pickMedia() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsEditing: true,
    quality: 0.8,
    videoMaxDuration: 60,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    console.log('URI:', asset.uri);
    console.log('Type:', asset.type); // 'image' | 'video'
    console.log('Width:', asset.width);
    console.log('Height:', asset.height);
  }
}
```

### Tirando uma foto com a interface de câmera do sistema

```typescript
async function takePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== 'granted') return;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
  });

  if (!result.canceled) {
    console.log('Captured:', result.assets[0].uri);
  }
}
```

Use `expo-image-picker` quando quiser a interface de sistema padrão sem construir uma view de câmera customizada. Use VisionCamera quando precisar de uma experiência de câmera personalizada, processamento de frames em tempo real ou controle direto sobre os parâmetros de captura.

---

## PHPhotoLibrary → expo-media-library

`PHPhotoLibrary` em Swift lida com leitura e escrita de assets na biblioteca de fotos do usuário. O `expo-media-library` fornece a API equivalente.

### Instalação

```bash
npx expo install expo-media-library
```

### Salvando uma foto ou vídeo na biblioteca

```typescript
import * as MediaLibrary from 'expo-media-library';

async function saveToLibrary(fileUri: string): Promise<void> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') return;

  const asset = await MediaLibrary.createAssetAsync(fileUri);
  console.log('Asset id:', asset.id);
  console.log('Created at:', asset.creationTime);
}
```

Isso é equivalente a chamar `PHAssetChangeRequest.creationRequestForAsset(from:)` dentro de um bloco `PHPhotoLibrary.shared().performChanges`.

### Buscando assets da biblioteca

```typescript
import * as MediaLibrary from 'expo-media-library';

async function fetchRecentPhotos() {
  const { assets, hasNextPage } = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: MediaLibrary.SortBy.creationTime,
    first: 20,
  });

  assets.forEach((asset) => {
    console.log(asset.filename, asset.uri);
  });
}
```

`PHFetchOptions` em Swift mapeia para o objeto de opções passado a `getAssetsAsync`. `PHFetchResult` mapeia para o array `assets` retornado, com `hasNextPage` para paginação baseada em cursor.

---

## AVAudioSession → expo-av

`AVAudioSession` em Swift configura a categoria de áudio, a rota e o estado de ativação do seu app. O `expo-av` envolve `AVAudioSession` e `AVAudioPlayer`/`AVAudioRecorder` por meio de uma API JavaScript.

### Instalação

```bash
npx expo install expo-av
```

### Reproduzindo áudio

```typescript
import { Audio } from 'expo-av';

async function playSound(uri: string) {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true, // equivalent to AVAudioSession.Category.playback
    staysActiveInBackground: false,
  });

  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.playAsync();
}
```

`playsInSilentModeIOS: true` mapeia para definir `AVAudioSession.Category.playback`, o que permite que o áudio seja reproduzido mesmo quando o dispositivo está no modo silencioso — o mesmo comportamento que você configura em Swift com `try AVAudioSession.sharedInstance().setCategory(.playback)`.

### Gravando áudio

```typescript
import { Audio } from 'expo-av';

let recording: Audio.Recording | null = null;

async function startRecording() {
  const permission = await Audio.requestPermissionsAsync();
  if (permission.status !== 'granted') return;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recording = rec;
}

async function stopRecording(): Promise<string | undefined> {
  if (!recording) return;
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  recording = null;
  return uri ?? undefined;
}
```

`Audio.RecordingOptionsPresets.HIGH_QUALITY` define o codec, a taxa de amostragem e a taxa de bits com valores equivalentes a um `AVAudioRecorder` configurado com `AVFormatIDKey: kAudioFormatMPEG4AAC` e taxa de bits de 128 kbps.

---

## Escolhendo a biblioteca certa

| Caso de uso | API nativa iOS | Biblioteca recomendada |
|---|---|---|
| Interface de câmera customizada, processamento em tempo real | `AVCaptureSession` | `react-native-vision-camera` v4 |
| Seletor de foto/câmera do sistema | `PHPickerViewController` | `expo-image-picker` |
| Leitura/escrita na biblioteca de fotos | `PHPhotoLibrary` | `expo-media-library` |
| Reprodução e gravação de áudio | `AVAudioSession`, `AVAudioPlayer`, `AVAudioRecorder` | `expo-av` |
| Leitura de código de barras / QR | `AVCaptureMetadataOutput` | VisionCamera + plugin de frame processor |
| Detecção de rosto, AR | `Vision`, `ARKit` | Frame processor do VisionCamera + `vision-camera-face-detector` ou `@viro-media/viro-react` |

---

## Resumo

- As strings de permissão (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, etc.) são injetadas automaticamente pelos Expo config plugins — sem edição manual do `Info.plist`.
- O VisionCamera v4 usa Fabric e JSI, oferecendo uma experiência de câmera com qualidade nativa e uma API TypeScript que mapeia diretamente para os conceitos do `AVCaptureSession`.
- Os frame processors executam de forma síncrona na thread de captura via worklets JSI, o equivalente em React Native do `AVCaptureVideoDataOutputSampleBufferDelegate`.
- O `expo-image-picker` apresenta a folha do `PHPickerViewController` do sistema sem nenhum trabalho de interface de câmera customizada.
- O `expo-media-library` fornece acesso de leitura e escrita ao `PHPhotoLibrary` com uma API assíncrona direta.
- O `expo-av` envolve o `AVAudioSession` e permite configurar categoria de reprodução, comportamento no modo silencioso e gravação em poucas linhas de TypeScript.
