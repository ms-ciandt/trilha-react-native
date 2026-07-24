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

## ProGuard / R8 para React Native — Deep Dive

Builds de release usam o R8 (substituto do ProGuard) quando `minifyEnabled true` está configurado. O R8 faz três coisas: reduz (remove código não usado), otimiza (inlining, reescrita) e ofusca (renomeia classes/métodos). Cada etapa pode quebrar o React Native se não for configurada corretamente.

### Por que o R8 é mais agressivo que o ProGuard

O R8 realiza análise completa do programa — rastreia cada grafo de chamadas a partir dos pontos de entrada e remove tudo que não for alcançável. Isso significa que código baseado em reflexão (TurboModules, classes geradas pelo Codegen, registros JNI, desserialização JSON) é invisível para o analisador e será removido a menos que você o preserve explicitamente.

### O proguard-rules.pro completo para React Native

```proguard
# android/app/proguard-rules.pro

# ── React Native Core ──────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.**   { *; }

# Fabric renderer — obrigatório para Nova Arquitetura
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.uimanager.** { *; }

# ── Hermes ─────────────────────────────────────────────────────────────────
# Hermes registra métodos nativos via JNI em tempo de execução
-keepclassmembers class com.facebook.hermes.reactexecutor.HermesExecutor {
    native <methods>;
}

# ── Seus TurboModules ──────────────────────────────────────────────────────
# O Codegen gera uma classe Spec; sua implementação a estende.
# O R8 deve manter ambas — a Spec é buscada por nome em tempo de execução.
-keep class com.seuapp.NativeDeviceInfoModule      { *; }
-keep class com.seuapp.NativeDeviceInfoModuleSpec  { *; }

# Regra de padrão — mantém todos os seus módulos nativos sem listá-los um a um
-keep class com.seuapp.Native*Module               { *; }
-keep class com.seuapp.Native*ModuleSpec           { *; }

# ── Fabric Native Components ───────────────────────────────────────────────
-keep class com.seuapp.*ViewManager               { *; }
-keep class com.seuapp.*ComposeView               { *; }

# ── JNI: métodos nativos ───────────────────────────────────────────────────
-keepclasseswithmembers class * {
    native <methods>;
}

# ── Kotlin ─────────────────────────────────────────────────────────────────
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-dontwarn kotlin.**

# Coroutines — máquinas de estado usam reflexão internamente
-keep class kotlinx.coroutines.** { *; }
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# Kotlin Serialization — classes @Serializable são lidas por reflexão
-keep @kotlinx.serialization.Serializable class * { *; }
-keep class kotlinx.serialization.** { *; }

# ── Bibliotecas comuns de terceiros ────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }

# Gson
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# ── Relatório de crashes ───────────────────────────────────────────────────
# Sentry — precisa dos nomes originais das classes para simbolizar crashes
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# Firebase Crashlytics
-keep class com.google.firebase.crashlytics.** { *; }
-keepattributes SourceFile, LineNumberTable

# ── Nomes de arquivos fonte ────────────────────────────────────────────────
-keepattributes SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile
```

### Depurando Problemas de Shrinking do R8

Quando um build de release crasha mas o debug funciona, o R8 removeu ou renomeou algo que não devia. Três ferramentas para diagnosticar:

**1. `-printusage` — veja o que o R8 removeu**

```proguard
-printusage build/outputs/mapping/release/usage.txt
```

**2. Arquivo de mapeamento — desobfuscar um stack trace de crash**

O R8 gera `build/outputs/mapping/release/mapping.txt`. Faça upload para o Sentry/Crashlytics para que crashes sejam desobfuscados automaticamente. Para desobfuscação manual:

```bash
java -jar $ANDROID_HOME/tools/proguard/lib/retrace.jar \
  build/outputs/mapping/release/mapping.txt \
  stacktrace.txt
```

**3. Verifique se uma classe sobreviveu ao shrinking**

```bash
# Após um build de release
unzip app-release.apk classes.dex -d /tmp/dex
$ANDROID_HOME/build-tools/34.0.0/dexdump /tmp/dex/classes.dex | grep NativeDeviceInfoModule
```

---

## ABI Splits e AAB — Otimizando o Tamanho do Binário

### O que são ABIs

Dispositivos Android rodam em diferentes arquiteturas de CPU. Seu código C++ (engine Hermes, bindings JSI gerados pelo Codegen, qualquer lib do CMakeLists.txt) deve ser compilado para cada arquitetura suportada:

| ABI | Dispositivos | Impacto no tamanho |
|-----|--------------|--------------------|
| `arm64-v8a` | Todos os celulares Android modernos (2015+) | ~15MB |
| `armeabi-v7a` | Dispositivos ARM 32-bit mais antigos | ~10MB |
| `x86_64` | Emuladores, alguns Chromebooks | ~15MB |
| `x86` | Emuladores antigos | ~10MB |

Um APK React Native padrão empacota todos os quatro — o usuário baixa todos mesmo que seu dispositivo use apenas um.

### AAB — A Solução para Produção

O Android App Bundle (AAB) é a solução correta para produção. O Google Play extrai apenas a ABI que o dispositivo do usuário precisa:

```bash
# Build do AAB
cd android && ./gradlew bundleRelease

# Saída: android/app/build/outputs/bundle/release/app-release.aab
```

Faça upload do `.aab` no Play Console. Nunca envie um APK gordo para produção.

### abiFilters — Builds de Desenvolvimento Mais Rápidos

Durante o desenvolvimento, você está rodando em um dispositivo ou emulador. Compilar todas as quatro ABIs é tempo desperdiçado. `abiFilters` restringe o build ao que você precisa:

```groovy
// android/app/build.gradle
android {
    flavorDimensions "env"
    productFlavors {
        dev {
            dimension "env"
            applicationIdSuffix ".dev"
            ndk {
                // Pixel 7/8/9: arm64-v8a
                // Emulador (AVD): x86_64
                abiFilters "arm64-v8a"
            }
        }
        prod {
            dimension "env"
            // Sem abiFilters — compila todas as ABIs para o AAB
        }
    }
}
```

Tempos de build com uma ABI vs todas as quatro:

| Configuração | Tempo de build limpo (Hermes + Codegen) |
|-------------|----------------------------------------|
| Todas as 4 ABIs (padrão) | ~4–6 minutos |
| Somente arm64-v8a | ~1,5–2 minutos |

### APK Splits — Se Você Precisar Distribuir APKs

Para F-Droid, distribuição enterprise ou sideload onde não pode usar AAB:

```groovy
android {
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a", "armeabi-v7a"
            universalApk false
        }
    }
}

// Códigos de versão únicos por ABI
ext.abiCodes = ['armeabi-v7a': 1, 'arm64-v8a': 2, 'x86': 3, 'x86_64': 4]

android.applicationVariants.all { variant ->
    variant.outputs.each { output ->
        def abi = output.getFilter(com.android.build.OutputFile.ABI)
        if (abi != null) {
            output.versionCodeOverride =
                ext.abiCodes.get(abi, 0) * 1000 + variant.versionCode
        }
    }
}
```

### Inspecionando o Conteúdo do Seu AAB

```bash
# Inspecionar o AAB
bundletool dump manifest --bundle=app-release.aab

# Simular o que o Play faz — instalar no dispositivo conectado
bundletool build-apks \
  --bundle=app-release.aab \
  --output=app.apks \
  --ks=release.keystore \
  --ks-pass=pass:suasenha \
  --ks-key-alias=meuapp \
  --key-pass=pass:suasenha

bundletool install-apks --apks=app.apks
```

---

## Materiais de Estudo

- [React Native — Publicando na Play Store](https://reactnative.dev/docs/signed-apk-android)
- [Android — Assinar seu app](https://developer.android.com/studio/publish/app-signing)

---

## Próximo Passo

➡ [Atualizações OTA com EAS Update](./05-ota-updates)
