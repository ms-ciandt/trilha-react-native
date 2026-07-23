---
title: "Assinatura de Código e Keystore"
sidebar_label: "Assinatura de Código"
sidebar_position: 4
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## A Mesma Keystore que Você Já Conhece

Apps React Native no Android são assinados com o mesmo Java Keystore (.jks) que você usa em qualquer app Android. O processo é idêntico — a única diferença é onde você configura a assinatura no build Gradle.

---

## Gerando uma Keystore

```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias meuapp \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Armazene este arquivo com segurança — perdê-lo significa que você nunca mais poderá atualizar seu app no Play Store.

---

## Configurando a Assinatura no Gradle

### Opção 1: Variáveis de ambiente (recomendado para CI)

```groovy
// android/app/build.gradle
android {
  signingConfigs {
    release {
      storeFile file(System.getenv("KEYSTORE_PATH") ?: "debug.keystore")
      storePassword System.getenv("KEYSTORE_PASSWORD") ?: "android"
      keyAlias System.getenv("KEY_ALIAS") ?: "androiddebugkey"
      keyPassword System.getenv("KEY_PASSWORD") ?: "android"
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
```

---

## Play App Signing

O serviço Play App Signing do Google mantém sua chave de upload (com a qual você assina) e a chave de assinatura do app (o que os usuários baixam). Isso protege você caso sua chave de upload seja comprometida.

Ative no Play Console:
**Release → Configuração → Integridade do app → Assinatura do app**

---

## Armazenando a Keystore no CI

```bash
# Codificar em base64
base64 -i release.keystore | pbcopy

# Adicionar como secret no GitHub: KEYSTORE_BASE64

# No workflow CI — decodificar antes de buildar
echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore
```

---

## ProGuard / R8 para React Native

```
# android/app/proguard-rules.pro

-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.seuapp.NativeDeviceInfoModule { *; }
```

---

## Materiais de Estudo

- [React Native — Publicando na Play Store](https://reactnative.dev/docs/signed-apk-android)
- [Android — Assinar seu app](https://developer.android.com/studio/publish/app-signing)

---

## Próximo Passo

➡ [Atualizações OTA com EAS Update](./05-ota-updates)
