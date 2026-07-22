---
title: "Camera: CameraX → React Native"
sidebar_label: "Camera"
sidebar_position: 2
---

## Video Overview

> Video for this topic coming soon.

## CameraX vs React Native Camera Libraries

As an Android developer you know CameraX: `ProcessCameraProvider`, `Preview`, `ImageCapture`, `ImageAnalysis`, `CameraSelector`. React Native camera libraries are built on top of CameraX (on Android) and AVFoundation (on iOS).

| CameraX concept | React Native Vision Camera equivalent |
|-----------------|--------------------------------------|
| `ProcessCameraProvider` | Managed internally by the library |
| `Preview` use case | `<Camera>` component display |
| `ImageCapture` use case | `camera.takePhoto()` |
| `ImageAnalysis` use case | `useFrameProcessor()` |
| `CameraSelector.DEFAULT_BACK_CAMERA` | `device` from `useCameraDevice('back')` |
| `CameraSelector.DEFAULT_FRONT_CAMERA` | `useCameraDevice('front')` |
| `CameraCharacteristics` | `CameraDevice` object properties |

---

## The Two Options: expo-camera vs Vision Camera

| | `expo-camera` | `react-native-vision-camera` |
|--|--------------|------------------------------|
| Setup | Simple, managed | Requires native setup |
| Performance | Good | Excellent — direct CameraX/AVFoundation |
| Frame processing | Not available | Full `useFrameProcessor` with JSI |
| Barcode scanning | Basic | Full ML Kit integration |
| Video recording | Basic | Full control — codecs, bitrate, stabilisation |
| Best for | Simple photo/video capture | Advanced camera apps |

---

## expo-camera — Quick Start

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
        <Text>Camera permission required.</Text>
        <Pressable onPress={requestPermission} style={styles.button}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  async function takePhoto() {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.8,           // 0-1
      base64: false,
      skipProcessing: false,  // Android: skip EXIF processing for speed
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
            <Text style={styles.btnText}>Flip</Text>
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

## react-native-vision-camera — Production Grade

```bash
npm install react-native-vision-camera
npx expo install react-native-vision-camera  # for Expo
```

### Setup

```kotlin
// android/app/build.gradle
android {
  defaultConfig {
    minSdkVersion 26  // Vision Camera requires API 26+
  }
}
```

### Basic Camera View

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
    // photo.path — absolute file path on device
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

## Frame Processing — ImageAnalysis Equivalent

`useFrameProcessor` is the Vision Camera equivalent of CameraX's `ImageAnalysis` use case. It runs a worklet on every camera frame — a JavaScript function executed on a separate thread via JSI, not on the main JS thread.

```tsx
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useSharedValue } from 'react-native-reanimated';

// Barcode scanning with ML Kit
import { scanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';

export function BarcodeScannerScreen() {
  const device = useCameraDevice('back');
  const lastBarcode = useSharedValue('');

  // This function runs on EVERY frame — keep it fast
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'; // executes on the frame processor thread, not JS thread

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
      frameProcessorFps={5} // process 5 frames/second — not every frame
    />
  );
}
```

> **Performance note**: Frame processors run at the camera frame rate by default (30-60fps). Set `frameProcessorFps` to limit processing. Each frame is a JSI object — no serialisation, direct memory access. This is the equivalent of CameraX's `ImageAnalysis.Analyzer` running on the `Dispatchers.Default` thread.

---

## Video Recording

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

## Saving to Media Library

After capture, save to the Android gallery (Photos app):

```tsx
import * as MediaLibrary from 'expo-media-library';

async function saveToGallery(uri: string) {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') return;

  const asset = await MediaLibrary.createAssetAsync(uri);

  // Optional: add to a specific album
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

## QR Code / Barcode Scanning with expo-camera

For simple QR scanning without full Vision Camera:

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';

function QRScanner({ onScan }: { onScan: (data: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission?.granted) {
    return <Pressable onPress={requestPermission}><Text>Allow Camera</Text></Pressable>;
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

## Study Materials

### Official Documentation

- [expo-camera — Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [react-native-vision-camera — Documentation](https://react-native-vision-camera.com/)
- [react-native-vision-camera — Frame Processors](https://react-native-vision-camera.com/docs/guides/frame-processors)
- [Android — CameraX Overview](https://developer.android.com/media/camera/camerax)

### Packages

- [expo-camera](https://github.com/expo/expo/tree/main/packages/expo-camera)
- [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera)
- [expo-media-library](https://docs.expo.dev/versions/latest/sdk/media-library/)

### Videos

- [Simon Grimm — React Native Camera with Vision Camera v4](https://www.youtube.com/watch?v=D3Z3_tHqXlw)
- [William Candillon — Frame Processors](https://www.youtube.com/watch?v=MpL4eFkFI1s)

---

## What's Next

Camera done. Next: file system and local storage — reading and writing files, SQLite, and document picking, all mapped from Android's File API.

➡ [Storage & File System](./03-storage)
