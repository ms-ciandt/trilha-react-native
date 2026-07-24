---
title: Camera and Media — iOS
---

# Camera and Media

As an iOS developer you have worked directly with `AVFoundation`, `PHPhotoLibrary`, and `UIImagePickerController`. React Native wraps those same system frameworks through well-maintained libraries that expose a TypeScript API while the underlying native layer continues to call the exact same AVFoundation and PhotoKit APIs you already know.

This page maps each native concept to its React Native equivalent and shows you how to use each library in a real application.

---

## Permissions: Info.plist strings and Expo Config Plugins

In a plain iOS project you add usage description strings to `Info.plist` by hand. In a managed Expo project the config plugin system injects them automatically during `expo prebuild`, which generates the native project before building.

The strings you need for camera and microphone access are:

- `NSCameraUsageDescription` — required whenever you access the camera
- `NSMicrophoneUsageDescription` — required for video recording or audio capture
- `NSPhotoLibraryUsageDescription` — required to read from the photo library
- `NSPhotoLibraryAddUsageDescription` — required to save photos or videos to the library

In `app.json` (or `app.config.js`) declare the plugins and their permission strings:

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

After adding or changing a plugin, run `npx expo prebuild --clean` to regenerate the `ios/` folder. The `Info.plist` will contain the strings above without manual editing.

---

## AVFoundation → react-native-vision-camera

### Mental model

| AVFoundation concept | VisionCamera equivalent |
|---|---|
| `AVCaptureSession` | `Camera` component (Fabric) |
| `AVCaptureDeviceInput` | `device` prop resolved via `useCameraDevice` |
| `AVCapturePhotoOutput` | `camera.takePhoto()` |
| `AVCaptureMovieFileOutput` | `camera.startRecording()` / `camera.stopRecording()` |
| `AVCaptureVideoPreviewLayer` | the `Camera` view itself |
| `AVCaptureDevice.requestAccess` | `Camera.requestCameraPermission()` |

VisionCamera v4 is built on Fabric and communicates through JSI. There is no asynchronous bridge round-trip for the preview or for frame processors — the camera preview is a native Fabric view and frame processor worklets run synchronously on the capture thread via JSI, the same execution model as JSI-based TurboModules.

### Installation

```bash
npx expo install react-native-vision-camera
```

Add the plugin entry shown in the permissions section above, then run `npx expo prebuild`.

### Requesting permissions

```typescript
import { Camera } from 'react-native-vision-camera';

async function requestPermissions(): Promise<boolean> {
  const cameraStatus = await Camera.requestCameraPermission();
  const micStatus = await Camera.requestMicrophonePermission();
  return cameraStatus === 'granted' && micStatus === 'granted';
}
```

This is the React Native equivalent of calling `AVCaptureDevice.requestAccess(for: .video)` and `AVCaptureDevice.requestAccess(for: .audio)` in Swift.

### Selecting a device

```typescript
import { useCameraDevice } from 'react-native-vision-camera';

// equivalent to querying AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
const device = useCameraDevice('back');
```

`useCameraDevice` accepts `'back'` or `'front'`. For more control over the physical camera (ultra-wide, telephoto, LiDAR) use `useCameraDevices()` and filter by `device.physicalDevices`.

### Displaying the preview and taking a photo

In Swift you attach an `AVCaptureVideoPreviewLayer` to a `CALayer`. In React Native the `Camera` component handles the preview layer internally.

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

### Recording video

`startRecording` accepts a callback that fires when the recording stops, equivalent to `AVCaptureFileOutputRecordingDelegate.fileOutput(_:didFinishRecordingTo:from:error:)` in Swift.

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

Enable video capture by adding the `video` prop to the `Camera` component and including `NSMicrophoneUsageDescription` (already added by the plugin).

### Frame processors (JSI worklets)

Frame processors are functions that run synchronously on every camera frame, directly on the capture thread via JSI — there is no bridge, no serialization, and no React re-render involved. This is conceptually close to a `CMSampleBuffer` callback in an `AVCaptureVideoDataOutputSampleBufferDelegate`, except it runs in JavaScript (Hermes) via JSI rather than in native Swift code.

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

Frame processor plugins are native modules (written in Swift for iOS) that are registered with the VisionCamera plugin registry and called synchronously from the worklet. Writing a frame processor plugin follows the same Swift → Codegen pattern as a TurboModule, but uses VisionCamera's own registration macro instead of `TM_EXPORT_MODULE`.

### AVCaptureSession vs VisionCamera API — comparison

| Task | AVCaptureSession (Swift) | VisionCamera (TypeScript) |
|---|---|---|
| Create session | `AVCaptureSession()` | `<Camera ... />` mount |
| Add input | `session.addInput(deviceInput)` | `device` prop |
| Add photo output | `session.addOutput(photoOutput)` | `photo` prop |
| Add video output | `session.addOutput(movieOutput)` | `video` prop |
| Start preview | `previewLayer.session = session; session.startRunning()` | `isActive={true}` |
| Stop preview | `session.stopRunning()` | `isActive={false}` |
| Take photo | `photoOutput.capturePhoto(with:, delegate:)` | `camera.takePhoto()` |
| Record video | `movieOutput.startRecording(to:, recordingDelegate:)` | `camera.startRecording(...)` |
| Process frames | `AVCaptureVideoDataOutputSampleBufferDelegate` | `useFrameProcessor` worklet |
| Request access | `AVCaptureDevice.requestAccess(for: .video)` | `Camera.requestCameraPermission()` |

---

## UIImagePickerController / PHPickerViewController → expo-image-picker

`PHPickerViewController` (iOS 14+) is the modern replacement for `UIImagePickerController`. `expo-image-picker` presents the system photo picker sheet, which on iOS 14+ uses `PHPickerViewController` internally.

### Installation

```bash
npx expo install expo-image-picker
```

The Expo config plugin injects `NSPhotoLibraryUsageDescription` and `NSCameraUsageDescription` automatically.

### Picking an image or video from the library

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

### Taking a photo with the system camera UI

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

Use `expo-image-picker` when you want the standard system UI without building a custom camera view. Use VisionCamera when you need a custom camera experience, real-time frame processing, or direct control over capture parameters.

---

## PHPhotoLibrary → expo-media-library

`PHPhotoLibrary` in Swift handles reading and writing assets to the user's photo library. `expo-media-library` provides the equivalent API.

### Installation

```bash
npx expo install expo-media-library
```

### Saving a photo or video to the library

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

This is equivalent to calling `PHAssetChangeRequest.creationRequestForAsset(from:)` inside a `PHPhotoLibrary.shared().performChanges` block.

### Fetching assets from the library

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

`PHFetchOptions` in Swift maps to the options object passed to `getAssetsAsync`. `PHFetchResult` maps to the returned `assets` array with `hasNextPage` for cursor-based pagination.

---

## AVAudioSession → expo-av

`AVAudioSession` in Swift configures the audio category, route, and activation state for your app. `expo-av` wraps `AVAudioSession` and `AVAudioPlayer`/`AVAudioRecorder` through a JavaScript API.

### Installation

```bash
npx expo install expo-av
```

### Playing audio

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

`playsInSilentModeIOS: true` maps to setting `AVAudioSession.Category.playback`, which allows audio to play even when the device is in silent mode — the same behavior you configure in Swift with `try AVAudioSession.sharedInstance().setCategory(.playback)`.

### Recording audio

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

`Audio.RecordingOptionsPresets.HIGH_QUALITY` sets the codec, sample rate, and bit rate to values equivalent to `AVAudioRecorder` configured with `AVFormatIDKey: kAudioFormatMPEG4AAC` and a 128 kbps bit rate.

---

## Choosing the right library

| Use case | iOS native API | Recommended library |
|---|---|---|
| Custom camera UI, real-time processing | `AVCaptureSession` | `react-native-vision-camera` v4 |
| System photo/camera picker | `PHPickerViewController` | `expo-image-picker` |
| Read/write photo library | `PHPhotoLibrary` | `expo-media-library` |
| Audio playback and recording | `AVAudioSession`, `AVAudioPlayer`, `AVAudioRecorder` | `expo-av` |
| Barcode / QR scanning | `AVCaptureMetadataOutput` | VisionCamera + frame processor plugin |
| Face detection, AR | `Vision`, `ARKit` | VisionCamera frame processor + `vision-camera-face-detector` or `@viro-media/viro-react` |

---

## Summary

- Permission strings (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, etc.) are injected automatically by Expo config plugins — no manual `Info.plist` editing.
- VisionCamera v4 uses Fabric and JSI, giving you a native-quality camera experience with a TypeScript API that maps directly to `AVCaptureSession` concepts.
- Frame processors run synchronously on the capture thread via JSI worklets, the React Native equivalent of `AVCaptureVideoDataOutputSampleBufferDelegate`.
- `expo-image-picker` presents the system `PHPickerViewController` sheet without any custom camera UI work.
- `expo-media-library` provides `PHPhotoLibrary` read/write access with a straightforward async API.
- `expo-av` wraps `AVAudioSession` and lets you configure playback category, silent-mode behavior, and recording in a few lines of TypeScript.
