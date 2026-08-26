---
title: "EAS Build"
sidebar_label: "EAS Build"
sidebar_position: 3
---

## Visão Geral em Vídeo

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/cicd_03_eas-build.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/cicd_03_eas-build.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## O que é o EAS Build

EAS (Expo Application Services) Build é um serviço de build em nuvem para React Native — a Expo gerencia as máquinas, o Android SDK, o Gradle e a assinatura. Você envia o código e recebe um APK ou AAB.

---

## Instalação e Configuração

```bash
npm install --global eas-cli
eas login
eas build:configure
```

---

## eas.json — Perfis de Build

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

## Executando Builds

```bash
# Build de desenvolvimento
eas build --platform android --profile development

# Build de preview (APK para testes internos)
eas build --platform android --profile preview

# AAB de produção
eas build --platform android --profile production

# Build + envio ao Play Store em um comando
eas build --platform android --profile production --auto-submit
```

---

## EAS Build no GitHub Actions

```yaml
- name: Build com EAS
  run: eas build --platform android --profile production --non-interactive
  env:
    EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## Materiais de Estudo

- [EAS Build — Android](https://docs.expo.dev/build/introduction/)
- [EAS Submit — Play Store](https://docs.expo.dev/submit/android/)

---

## Próximo Passo

➡ [Assinatura de Código e Keystore](./04-code-signing-keystore)
