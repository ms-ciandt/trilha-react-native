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

Para times usando o workflow gerenciado ou bare da Expo, o EAS Build elimina a necessidade de manter máquinas de build localmente ou no CI para a etapa de compilação nativa.

---

## Instalação e Configuração

```bash
npm install --global eas-cli
eas login
eas build:configure
```

Isso cria o `eas.json` na raiz do seu projeto.

---

## eas.json — Perfis de Build

```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
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

Obtenha seu `EXPO_TOKEN`:

```bash
eas login
eas whoami
# Depois gere um token em expo.dev/accounts/[username]/settings/access-tokens
```

---

## Gerenciamento de Credenciais

O EAS gerencia as keystores Android para você — sem comandos manuais de `keytool`:

```bash
# O EAS gera e armazena a keystore com segurança no cofre de credenciais da Expo
eas credentials

# Ou use sua própria keystore
eas credentials --platform android
# Escolha: "Use a local keystore"
```

---

## Materiais de Estudo

- [EAS Build — Android](https://docs.expo.dev/build/introduction/)
- [EAS Submit — Play Store](https://docs.expo.dev/submit/android/)
- [EAS — CI/CD](https://docs.expo.dev/build/building-on-ci/)

---

## Próximo Passo

EAS Build configurado. A seguir: assinatura de código e gerenciamento de keystore no Android.

➡ [Assinatura de Código e Keystore](./04-code-signing-keystore)
