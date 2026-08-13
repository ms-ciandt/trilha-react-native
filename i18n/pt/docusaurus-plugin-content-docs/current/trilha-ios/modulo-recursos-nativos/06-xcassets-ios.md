---
id: xcassets-ios
title: "Assets e xcassets no React Native"
---

# Assets e xcassets no React Native

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/rec_06_xcassets.mp4" type="video/mp4">
  Seu navegador não suporta o elemento de vídeo.
</video>

## De xcassets para `require()`

Desenvolvedores iOS estão acostumados a gerenciar imagens pelo `.xcassets` — um catálogo do Xcode onde cada asset possui variantes 1x, 2x e 3x que o SO escolhe automaticamente conforme a densidade da tela do dispositivo. O React Native substitui esse mecanismo por um sistema de resolução no lado JavaScript que atinge o mesmo objetivo.

Quando você escreve `require('./images/logo.png')`, o Metro (o bundler JavaScript) escaneia o projeto em busca de `logo@2x.png` e `logo@3x.png` ao lado do arquivo base. Em tempo de execução, o componente `<Image>` consulta `PixelRatio.get()` e escolhe a variante correta automaticamente — o mesmo comportamento de density-aware que você obtém do xcassets, sem precisar do Xcode.

| Conceito xcassets | Equivalente no React Native |
|---|---|
| `AppIcon.appiconset` | `expo-app-icon` / configuração Expo managed |
| Variantes `1x / 2x / 3x` | `logo.png`, `logo@2x.png`, `logo@3x.png` lado a lado |
| `LaunchScreen.storyboard` / `LaunchImage` | `expo-splash-screen` |
| `Color Set` (cor semântica) | `useColorScheme` + tokens de tema |
| `Data Set` (binário arbitrário) | `require('./data/model.tflite')` no Metro |
| Named colors (`AccentColor`) | Constantes de design system, sem equivalente direto no Metro |

---

## 1. Imagens Estáticas via `require()`

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

O Metro resolve isso em tempo de bundle. Forneça os três arquivos lado a lado:

```
assets/images/
  logo.png       ← 1x (base, obrigatório)
  logo@2x.png    ← 2x retina
  logo@3x.png    ← 3x Super Retina
```

Se apenas `logo.png` existir, o Metro o usa em todas as densidades — a imagem ficará borrada em telas de alta densidade, exatamente como em xcassets com apenas o slot 1x preenchido.

### Diferença em relação ao xcassets

No xcassets, slots de densidade faltantes geram um aviso de build. No Metro, são aceitos silenciosamente — você não receberá um erro de build, apenas degradação visual em tempo de execução. Certifique-se de que as três variantes existem antes de publicar.

---

## 2. Imagens Dinâmicas via URI

Quando a fonte da imagem é determinada em tempo de execução (URL remota, avatar do usuário, conteúdo server-driven), use o formato `uri` ao invés de `require`:

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

Você deve fornecer `width` e `height` explícitos — ao contrário do `require()`, o Metro não consegue inferir dimensões de uma URI remota.

Para imagens que exigem headers de autenticação:

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

## 3. Ícone do App — equivalente ao `AppIcon.appiconset`

Em um projeto React Native bare, o ícone do app fica em `android/app/src/main/res/` (Android) e `ios/<AppName>/Images.xcassets/AppIcon.appiconset/` (iOS). Você edita esses arquivos diretamente.

Com Expo (Managed ou Bare), declare o ícone uma vez em `app.json`:

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

O processo de build do Expo gera todos os tamanhos de xcassets necessários para iOS (20pt–1024pt em todos os slots `@1x`/`@2x`/`@3x`) a partir do único arquivo fonte de 1024×1024. Sem edição manual do Xcode.

---

## 4. Splash Screen — equivalente ao `LaunchImage` / `LaunchScreen.storyboard`

Em iOS nativo, a tela de launch é uma `.storyboard` ou um conjunto `LaunchImage` dentro do xcassets. No React Native com Expo:

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

Controlando a visibilidade via JS:

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

A splash permanece visível até que `hideAsync()` seja chamado — equivalente a dispensar uma `LaunchScreen` storyboard nativa após seu `AppDelegate` terminar o setup.

---

## 5. Fontes

No xcassets, fontes customizadas são adicionadas via `Info.plist` (chave `UIAppFonts`) e "Copy Bundle Resources" do Xcode. No React Native:

**Com Expo:**

`app.json`:
```json
{
  "expo": {
    "fonts": ["./assets/fonts/Roboto-Regular.ttf"]
  }
}
```

Ou carregue programaticamente:

```tsx
import { useFonts } from 'expo-font';

export function App() {
  const [loaded] = useFonts({
    'Roboto-Regular': require('./assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Bold': require('./assets/fonts/Roboto-Bold.ttf'),
  });

  if (!loaded) return null;

  return (
    <Text style={{ fontFamily: 'Roboto-Regular' }}>Olá</Text>
  );
}
```

**Sem Expo (bare React Native):**

```bash
npx react-native-asset
```

Configure `react-native.config.js`:

```js
module.exports = {
  assets: ['./assets/fonts/'],
};
```

Executar `npx react-native-asset` copia as fontes para os projetos nativos e atualiza o `Info.plist` no iOS e `assets/` no Android.

---

## 6. Assets SVG

Projetos Xcode frequentemente usam imagens vetoriais baseadas em PDF no xcassets. O React Native não tem um renderizador nativo de PDF/vetor; o equivalente padrão é SVG via `react-native-svg`:

```bash
npm install react-native-svg
npx expo install react-native-svg  # Expo
```

**Opção A: Componente SVG inline**

```tsx
import Svg, { Path, Circle } from 'react-native-svg';

export function CheckIcon({ size = 24, color = '#000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
```

**Opção B: Importar arquivos `.svg` como componentes via `react-native-svg-transformer`**

`metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
```

Uso:
```tsx
import Logo from './assets/icons/logo.svg';

export function Header() {
  return <Logo width={120} height={40} />;
}
```

Este é o equivalente direto de usar um conjunto vetorial PDF no xcassets — o ícone escala sem rasterização em qualquer densidade.

---

## 7. Assets Binários Arbitrários (Data Sets)

O xcassets suporta Data Sets para arquivos binários arbitrários (modelos Core ML, imagens de referência AR). No React Native, o Metro trata esses arquivos via a configuração `assetExts` do resolver:

`metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('tflite', 'bin', 'model');

module.exports = config;
```

Em seguida, faça o bundle e referencie como qualquer asset:

```tsx
const modelAsset = require('./assets/models/classifier.tflite');
```

A URI do asset resolvido é acessível via `Asset.fromModule(modelAsset).uri` do `expo-asset` — você passa essa URI para frameworks nativos de ML como o TensorFlow Lite.

---

## Resumo Comparativo

| Tarefa | xcassets / Xcode | React Native |
|---|---|---|
| Imagens density-aware | Slots 1x/2x/3x no xcassets | `img.png`, `img@2x.png`, `img@3x.png` + `require()` |
| Ícone do app | `AppIcon.appiconset` | Campo `icon` no `app.json` (Expo) ou edição direta do xcassets |
| Launch screen | `LaunchScreen.storyboard` | `expo-splash-screen` + `splash` no `app.json` |
| Fontes customizadas | `Info.plist` UIAppFonts + bundle resource | `expo-font` ou `react-native-asset` |
| Ícones vetoriais | PDF no xcassets | `react-native-svg` ou transformer `.svg` |
| Cores semânticas | Color Sets + `UIColor.label` | `useColorScheme` + tokens de tema |
| Assets binários | Data Sets | `assetExts` no `metro.config.js` + `expo-asset` |

---

## Exercício Prático

1. Adicione um `logo.png` com variantes `@2x` e `@3x` e renderize com `<Image source={require()} />`
2. Configure o ícone do app usando `app.json` com ícones diferentes para iOS e Android
3. Implemente uma splash screen que some apenas após um carregamento assíncrono de dados
4. Substitua um ícone PNG por um equivalente SVG usando `react-native-svg-transformer`

---

## Materiais de Estudo

- [Images — React Native Official Docs](https://reactnative.dev/docs/images)
- [expo-splash-screen — Expo Docs](https://docs.expo.dev/versions/latest/sdk/splash-screen/)
- [expo-font — Expo Docs](https://docs.expo.dev/versions/latest/sdk/font/)
- [react-native-svg — GitHub](https://github.com/software-mansion/react-native-svg)
- [react-native-svg-transformer — GitHub](https://github.com/kristerkari/react-native-svg-transformer)
- [App icons — Expo Docs](https://docs.expo.dev/develop/app-icon/)
