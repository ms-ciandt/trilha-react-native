---
title: "Camera: CameraX → React Native"
sidebar_label: "Camera"
sidebar_position: 2
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/rec_02_camera.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/rec_02_camera.vtt" srclang="pt" label="Português" default>
  Seu navegador não suporta o elemento de vídeo.
</video>

## CameraX vs Bibliotecas de Camera no React Native

Como desenvolvedor Android, você conhece o CameraX: `ProcessCameraProvider`, `Preview`, `ImageCapture`, `ImageAnalysis`, `CameraSelector`. As bibliotecas de câmera do React Native são construídas sobre o CameraX (no Android) e o AVFoundation (no iOS).

| Conceito CameraX | Equivalente no React Native Vision Camera |
|-----------------|--------------------------------------|
| `ProcessCameraProvider` | Gerenciado internamente pela biblioteca |
| Caso de uso `Preview` | Exibição do componente `<Camera>` |
| Caso de uso `ImageCapture` | `camera.takePhoto()` |
| Caso de uso `ImageAnalysis` | `useFrameProcessor()` |
| `CameraSelector.DEFAULT_BACK_CAMERA` | `device` via `useCameraDevice('back')` |
| `CameraSelector.DEFAULT_FRONT_CAMERA` | `useCameraDevice('front')` |
| `CameraCharacteristics` | Propriedades do objeto `CameraDevice` |

---

## As Duas Opções: expo-camera vs Vision Camera

| | `expo-camera` | `react-native-vision-camera` |
|--|--------------|------------------------------|
| Configuração | Simples, gerenciada | Requer configuração nativa |
| Performance | Boa | Excelente — acesso direto ao CameraX/AVFoundation |
| Processamento de frames | Não disponível | `useFrameProcessor` completo com JSI |
| Leitura de código de barras | Básica | Integração completa com ML Kit |
| Gravação de vídeo | Básica | Controle total — codecs, bitrate, estabilização |
| Ideal para | Captura simples de foto/vídeo | Apps de câmera avançados |

---

## expo-camera — Início Rápido

```bash
npx expo install expo-camera
```

```tsx
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Permissão de câmera necessária.</Text>
        <Pressable onPress={requestPermission} style={styles.button}>
          <Text style={styles.btnText}>Conceder Permissão</Text>
        </Pressable>
      </View>
    );
  }

  async function takePhoto() {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.8,           // 0-1
      base64: false,
      skipProcessing: false,  // Android: ignora processamento EXIF para mais velocidade
    });
    console.log('Photo URI:', photo?.uri);
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash="auto"
      >
        <View style={styles.controls}>
          <Pressable
            style={styles.flipBtn}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <Text style={styles.btnText}>Virar</Text>
          </Pressable>
          <Pressable style={styles.captureBtn} onPress={takePhoto} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  camera:     { flex: 1 },
  controls:   { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 32, flexDirection: 'row' },
  flipBtn:    { padding: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, marginRight: 32 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  button:     { marginTop: 16, padding: 14, backgroundColor: '#6750A4', borderRadius: 8 },
  btnText:    { color: '#fff', fontWeight: '600' },
});
```

---

## react-native-vision-camera — Nível Produção

```bash
npm install react-native-vision-camera
npx expo install react-native-vision-camera  # para Expo
```

### Configuração

```kotlin
// android/app/build.gradle
android {
  defaultConfig {
    minSdkVersion 26  // Vision Camera requer API 26+
  }
}
```

### Visualização Básica da Câmera

```tsx
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

export function VisionCameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  if (!hasPermission) {
    return <Pressable onPress={requestPermission} />;
  }

  if (!device) return null;

  async function capture() {
    const photo = await camera.current?.takePhoto({
      flash: 'auto',
      enableShutterSound: true,
    });
    // photo.path — caminho absoluto do arquivo no dispositivo
    console.log(photo?.path);
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        video={false}
      />
      <Pressable style={styles.captureBtn} onPress={capture} />
    </View>
  );
}
```

---

## Processamento de Frames — Equivalente ao ImageAnalysis

`useFrameProcessor` é o equivalente Vision Camera ao caso de uso `ImageAnalysis` do CameraX. Ele executa um worklet em cada frame da câmera — uma função JavaScript executada em uma thread separada via JSI, não na thread JS principal.

```tsx
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useSharedValue } from 'react-native-reanimated';

// Leitura de código de barras com ML Kit
import { scanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';

export function BarcodeScannerScreen() {
  const device = useCameraDevice('back');
  const lastBarcode = useSharedValue('');

  // Esta função é executada em CADA frame — mantenha-a rápida
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'; // executa na thread do frame processor, não na thread JS

    const barcodes = scanBarcodes(frame, [BarcodeFormat.QR_CODE]);
    if (barcodes.length > 0) {
      lastBarcode.value = barcodes[0].displayValue ?? '';
    }
  }, []);

  if (!device) return null;

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
      frameProcessor={frameProcessor}
      frameProcessorFps={5} // processa 5 frames/segundo — não todos os frames
    />
  );
}
```

> **Nota de performance**: Frame processors rodam na taxa de frames da câmera por padrão (30-60fps). Defina `frameProcessorFps` para limitar o processamento. Cada frame é um objeto JSI — sem serialização, acesso direto à memória. Isso é equivalente ao `ImageAnalysis.Analyzer` do CameraX rodando na thread `Dispatchers.Default`.

---

## Gravação de Vídeo

```tsx
import { Camera, useCameraDevice, useMicrophonePermission } from 'react-native-vision-camera';
import { useRef, useState } from 'react';

function VideoRecorder() {
  const device = useCameraDevice('back');
  const { hasPermission: hasMic, requestPermission: requestMic } = useMicrophonePermission();
  const camera = useRef<Camera>(null);
  const [recording, setRecording] = useState(false);

  async function startRecording() {
    setRecording(true);
    camera.current?.startRecording({
      flash: 'off',
      onRecordingFinished: (video) => {
        console.log('Video path:', video.path);
        console.log('Duration:', video.duration);
        setRecording(false);
      },
      onRecordingError: (error) => {
        console.error(error);
        setRecording(false);
      },
    });
  }

  async function stopRecording() {
    await camera.current?.stopRecording();
  }

  if (!device) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        audio={hasMic}
      />
      <Pressable
        onPress={recording ? stopRecording : startRecording}
        style={[styles.recBtn, recording && styles.recBtnActive]}
      />
    </View>
  );
}
```

---

## Salvando na Biblioteca de Mídia

Após a captura, salve na galeria do Android (aplicativo Fotos):

```tsx
import * as MediaLibrary from 'expo-media-library';

async function saveToGallery(uri: string) {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') return;

  const asset = await MediaLibrary.createAssetAsync(uri);

  // Opcional: adicionar a um álbum específico
  const album = await MediaLibrary.getAlbumAsync('MyApp');
  if (album) {
    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
  } else {
    await MediaLibrary.createAlbumAsync('MyApp', asset, false);
  }

  return asset;
}
```

---

## Leitura de QR Code / Código de Barras com expo-camera

Para leitura simples de QR sem o Vision Camera completo:

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';

function QRScanner({ onScan }: { onScan: (data: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission?.granted) {
    return <Pressable onPress={requestPermission}><Text>Permitir Câmera</Text></Pressable>;
  }

  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'code128'] }}
      onBarcodeScanned={scanned ? undefined : ({ data }) => {
        setScanned(true);
        onScan(data);
      }}
    />
  );
}
```

---

## Materiais de Estudo

### Documentação Oficial

- [expo-camera — Documentação](https://docs.expo.dev/versions/latest/sdk/camera/)
- [react-native-vision-camera — Documentação](https://react-native-vision-camera.com/)
- [react-native-vision-camera — Frame Processors](https://react-native-vision-camera.com/docs/guides/frame-processors)
- [Android — Visão Geral do CameraX](https://developer.android.com/media/camera/camerax)

### Pacotes

- [expo-camera](https://github.com/expo/expo/tree/main/packages/expo-camera)
- [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera)
- [expo-media-library](https://docs.expo.dev/versions/latest/sdk/media-library/)

### Vídeos

- [Simon Grimm — React Native Camera with Vision Camera v4](https://www.youtube.com/watch?v=D3Z3_tHqXlw)
- [William Candillon — Frame Processors](https://www.youtube.com/watch?v=MpL4eFkFI1s)

---

## Próximos Passos

Câmera concluída. A seguir: sistema de arquivos e armazenamento local — leitura e escrita de arquivos, SQLite e seleção de documentos, tudo mapeado a partir da File API do Android.

➡ [Storage & File System](./03-storage)
