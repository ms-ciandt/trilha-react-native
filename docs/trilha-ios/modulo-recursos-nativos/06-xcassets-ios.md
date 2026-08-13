---
id: xcassets-ios
title: "Assets and xcassets in React Native"
---

# Assets and xcassets in React Native

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/rec_06_xcassets.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## From xcassets to `require()`

iOS developers are accustomed to managing images through `.xcassets` — an Xcode catalog where each asset has 1x, 2x, and 3x variants that the OS picks automatically based on the device's screen density. React Native replaces this mechanism with a JavaScript-side resolution system that achieves the same goal.

When you write `require('./images/logo.png')`, Metro (the JavaScript bundler) scans the project for `logo@2x.png` and `logo@3x.png` alongside the base file. At runtime, the `<Image>` component queries `PixelRatio.get()` and picks the correct variant automatically — the same density-aware behavior you get from xcassets, without Xcode.

| xcassets concept | React Native equivalent |
|---|---|
| `AppIcon.appiconset` | `expo-app-icon` / Expo managed config |
| `1x / 2x / 3x` image variants | `logo.png`, `logo@2x.png`, `logo@3x.png` alongside each other |
| `LaunchScreen.storyboard` / `LaunchImage` | `expo-splash-screen` |
| `Color Set` (semantic color) | `useColorScheme` + custom theme tokens |
| `Data Set` (arbitrary binary) | `require('./data/model.tflite')` in Metro |
| Named colors (`AccentColor`) | Design system constants, not a direct Metro equivalent |

---

## 1. Static Images via `require()`

```tsx
import { Image, StyleSheet } from 'react-native';

export function Logo() {
  return (
    <Image
      source={require('../assets/images/logo.png')}
      style={styles.logo}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: { width: 120, height: 40 },
});
```

Metro resolves this at bundle time. Provide all three files side-by-side:

```
assets/images/
  logo.png       ← 1x (baseline, required)
  logo@2x.png    ← 2x retina
  logo@3x.png    ← 3x Super Retina
```

If only `logo.png` exists, Metro uses it at every density — the image will be blurry on high-density screens, exactly as it would be in xcassets with only a 1x slot filled.

### Difference from xcassets

In xcassets, missing density slots are a build warning. In Metro, they are silently accepted — you will not get a build error, only runtime visual degradation. Make sure the three variants exist before shipping.

---

## 2. Dynamic Images via URI

When the image source is determined at runtime (remote URL, user avatar, server-driven content), use the `uri` format instead of `require`:

```tsx
import { Image } from 'react-native';

export function Avatar({ url }: { url: string }) {
  return (
    <Image
      source={{ uri: url }}
      style={{ width: 48, height: 48, borderRadius: 24 }}
    />
  );
}
```

You must provide explicit width and height — unlike `require()`, Metro cannot infer dimensions from a remote URI.

For images requiring authentication headers:

```tsx
<Image
  source={{
    uri: 'https://api.example.com/protected/photo.jpg',
    headers: { Authorization: `Bearer ${token}` },
  }}
  style={{ width: 200, height: 200 }}
/>
```

---

## 3. App Icon — equivalent to `AppIcon.appiconset`

In a bare React Native project, the app icon lives in `android/app/src/main/res/` (Android) and `ios/<AppName>/Images.xcassets/AppIcon.appiconset/` (iOS). You edit those files directly.

With Expo (Managed or Bare), declare the icon once in `app.json`:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "ios": {
      "icon": "./assets/icon-ios.png"
    },
    "android": {
      "icon": "./assets/icon-android.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      }
    }
  }
}
```

Expo's build process generates all required xcassets sizes for iOS (20pt–1024pt across all `@1x`/`@2x`/`@3x` slots) from the single 1024×1024 source. No manual Xcode editing needed.

---

## 4. Splash Screen — equivalent to `LaunchImage` / `LaunchScreen.storyboard`

In native iOS, the launch screen is a `.storyboard` or a `LaunchImage` set inside xcassets. In React Native with Expo:

```bash
npx expo install expo-splash-screen
```

`app.json`:
```json
{
  "expo": {
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "splash": {
        "image": "./assets/splash-ios.png",
        "resizeMode": "cover",
        "backgroundColor": "#000000"
      }
    }
  }
}
```

Controlling visibility from JS:

```tsx
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

SplashScreen.preventAutoHideAsync();

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      await loadFonts();
      await prefetchData();
      setReady(true);
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  if (!ready) return null;
  return <MainNavigator />;
}
```

The splash stays visible until `hideAsync()` is called — equivalent to dismissing a native `LaunchScreen` storyboard after your `AppDelegate` finishes setup.

---

## 5. Fonts

In xcassets, custom fonts are added via `Info.plist` (`UIAppFonts` key) and Xcode's "Copy Bundle Resources". In React Native:

**With Expo:**

`app.json`:
```json
{
  "expo": {
    "fonts": ["./assets/fonts/Roboto-Regular.ttf"]
  }
}
```

Or load programmatically:

```tsx
import { useFonts } from 'expo-font';

export function App() {
  const [loaded] = useFonts({
    'Roboto-Regular': require('./assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Bold': require('./assets/fonts/Roboto-Bold.ttf'),
  });

  if (!loaded) return null;

  return (
    <Text style={{ fontFamily: 'Roboto-Regular' }}>Hello</Text>
  );
}
```

**Without Expo (bare React Native):**

```bash
npx react-native-asset
```

Configure `react-native.config.js`:

```js
module.exports = {
  assets: ['./assets/fonts/'],
};
```

Running `npx react-native-asset` copies fonts into the native projects and updates `Info.plist` on iOS and `assets/` on Android.

---

## 6. SVG Assets

Xcode projects often use PDF-based vector images in xcassets. React Native has no built-in PDF/vector renderer; the standard equivalent is SVG via `react-native-svg`:

```bash
npm install react-native-svg
npx expo install react-native-svg  # Expo
```

**Option A: Inline SVG component**

```tsx
import Svg, { Path } from 'react-native-svg';

export function CheckIcon({ size = 24, color = '#000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
```

**Option B: Import `.svg` files as components via `react-native-svg-transformer`**

`metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
```

Usage:
```tsx
import Logo from './assets/icons/logo.svg';

export function Header() {
  return <Logo width={120} height={40} />;
}
```

This is the direct equivalent of using a PDF vector set in xcassets — the icon scales without rasterization at any density.

---

## 7. Arbitrary Binary Assets (Data Sets)

xcassets supports Data Sets for arbitrary binary files (Core ML models, AR reference images). In React Native, Metro handles these via the `assetExts` resolver config:

`metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('tflite', 'bin', 'model');

module.exports = config;
```

Then bundle and reference them like any asset:

```tsx
const modelAsset = require('./assets/models/classifier.tflite');
```

The URI of the resolved asset is accessible via `Asset.fromModule(modelAsset).uri` from `expo-asset` — you pass this URI to native ML frameworks like TensorFlow Lite.

---

## Comparison Summary

| Task | xcassets / Xcode | React Native |
|---|---|---|
| Density-aware images | 1x/2x/3x slots in xcassets | `img.png`, `img@2x.png`, `img@3x.png` + `require()` |
| App icon | `AppIcon.appiconset` | `app.json` `icon` field (Expo) or direct xcassets edit |
| Launch screen | `LaunchScreen.storyboard` | `expo-splash-screen` + `app.json` `splash` |
| Custom fonts | `Info.plist` UIAppFonts + bundle resource | `expo-font` or `react-native-asset` |
| Vector icons | PDF in xcassets | `react-native-svg` or `.svg` transformer |
| Semantic colors | Color Sets + `UIColor.label` | `useColorScheme` + theme tokens |
| Binary assets | Data Sets | `assetExts` in `metro.config.js` + `expo-asset` |

---

## Practical Exercise

1. Add a `logo.png` with `@2x` and `@3x` variants and render it with `<Image source={require()} />`
2. Configure the app icon using `app.json` with different icons for iOS and Android
3. Implement a splash screen that hides only after an async data load completes
4. Replace a PNG icon with an SVG equivalent using `react-native-svg-transformer`

---

## Study Materials

- [Images — React Native Official Docs](https://reactnative.dev/docs/images)
- [expo-splash-screen — Expo Docs](https://docs.expo.dev/versions/latest/sdk/splash-screen/)
- [expo-font — Expo Docs](https://docs.expo.dev/versions/latest/sdk/font/)
- [react-native-svg — GitHub](https://github.com/software-mansion/react-native-svg)
- [react-native-svg-transformer — GitHub](https://github.com/kristerkari/react-native-svg-transformer)
- [App icons — Expo Docs](https://docs.expo.dev/develop/app-icon/)
