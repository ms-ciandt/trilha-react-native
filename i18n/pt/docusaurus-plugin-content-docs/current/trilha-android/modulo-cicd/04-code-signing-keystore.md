---
title: "Assinatura de Código e Keystore"
sidebar_label: "Assinatura de Código"
sidebar_position: 4
---

## Visão Geral em Vídeo

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/cicd_04_code-signing-keystore.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/cicd_04_code-signing-keystore.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

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

### Opção 2: gradle.properties (apenas desenvolvimento local — nunca commitar)

```properties
# android/gradle.properties (adicione ao .gitignore)
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=meuapp
MYAPP_RELEASE_STORE_PASSWORD=suasenha
MYAPP_RELEASE_KEY_PASSWORD=suasenha
```

```groovy
signingConfigs {
  release {
    storeFile file(MYAPP_RELEASE_STORE_FILE)
    storePassword MYAPP_RELEASE_STORE_PASSWORD
    keyAlias MYAPP_RELEASE_KEY_ALIAS
    keyPassword MYAPP_RELEASE_KEY_PASSWORD
  }
}
```

---

## Play App Signing

O serviço Play App Signing do Google mantém sua chave de upload (com a qual você assina) e a chave de assinatura do app (o que os usuários baixam). Isso protege você caso sua chave de upload seja comprometida.

Ative no Play Console:
**Release → Configuração → Integridade do app → Assinatura do app**

Com o Play App Signing ativado:
- Sua `release.keystore` é a **chave de upload** — usada apenas para autenticar os envios
- O Google reassina o APK/AAB final com a chave de assinatura do app
- Se você perder sua chave de upload, o Google pode substituí-la

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
# O runtime core do RN — nunca reduza estas classes
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
# Qualquer classe com métodos nativos — o registro JNI usa o nome completo de classe+método
-keepclasseswithmembers class * {
    native <methods>;
}

# ── Kotlin ─────────────────────────────────────────────────────────────────
# Metadados do Kotlin — necessários para reflexão, serialização e coroutines
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
-keepattributes *Annotation*
-keep @kotlinx.serialization.Serializable class * { *; }
-keep class kotlinx.serialization.** { *; }

# ── Bibliotecas comuns de terceiros ────────────────────────────────────────

# OkHttp (usado pelo Metro em debug, às vezes empacotado)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Retrofit (se usado no seu código Kotlin empacotado nativamente)
-keep class retrofit2.** { *; }
-keepattributes Exceptions

# Gson (serialização JSON — lê nomes de campos via reflexão)
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Moshi (alternativa ao Gson)
-keep class com.squareup.moshi.** { *; }
-keep @com.squareup.moshi.JsonClass class * { *; }

# ── Relatório de crashes ───────────────────────────────────────────────────
# Sentry — precisa dos nomes originais das classes para simbolizar crashes
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# Firebase Crashlytics
-keep class com.google.firebase.crashlytics.** { *; }
-keepattributes SourceFile, LineNumberTable

# ── Nomes de arquivos fonte ────────────────────────────────────────────────
# Preserva nomes de arquivos e números de linha em stack traces
# (enviados ao Sentry/Crashlytics para simbolicação)
-keepattributes SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile
```

### Depurando Problemas de Shrinking do R8

Quando um build de release crasha mas o debug funciona, o R8 removeu ou renomeou algo que não devia. Três ferramentas para diagnosticar:

**1. `-printusage` — veja o que o R8 removeu**

```proguard
# Adicione temporariamente e depois confira build/outputs/mapping/release/usage.txt
-printusage build/outputs/mapping/release/usage.txt
```

**2. `-printconfiguration` — veja a configuração final mesclada**

```proguard
-printconfiguration build/outputs/mapping/release/configuration.txt
```

**3. Arquivo de mapeamento — desobfuscar um stack trace de crash**

O R8 gera `build/outputs/mapping/release/mapping.txt`. Faça upload para o Sentry/Crashlytics para que crashes sejam desobfuscados automaticamente. Para desobfuscação manual:

```bash
# Ferramenta do Android SDK
java -jar $ANDROID_HOME/tools/proguard/lib/retrace.jar \
  build/outputs/mapping/release/mapping.txt \
  stacktrace.txt
```

**4. Verifique se uma classe sobreviveu ao shrinking**

```bash
# Após um build de release, inspecione o AAB/APK com bundletool
bundletool dump manifest --bundle=app-release.aab

# Ou descompacte e use o dexdump
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

O Android App Bundle (AAB) é a solução correta para produção. O Google Play extrai apenas a ABI que o dispositivo do usuário precisa, então o app instalado fica menor:

```groovy
// android/app/build.gradle

android {
    // Para produção — sempre gere um AAB, nunca um APK
    // Task do Gradle: bundleRelease → app-release.aab
}
```

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
    defaultConfig {
        // Padrão global — compila todas as ABIs
        // NÃO defina abiFilters aqui para produção
    }

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
            reset()                                // limpa as ABIs padrão
            include "arm64-v8a", "armeabi-v7a"    // apenas estas duas
            universalApk false                     // não gera um APK gordo
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

Saída:

```
app-arm64-v8a-release.apk      → para todos os celulares modernos (~25MB)
app-armeabi-v7a-release.apk    → para dispositivos mais antigos (~18MB)
```

vs um APK universal: `app-release.apk` (~55MB — inclui todas as ABIs).

### Inspecionando o Conteúdo do Seu AAB

```bash
# Instalar o bundletool
brew install bundletool  # macOS

# Inspecionar o conteúdo do AAB
bundletool dump manifest --bundle=app-release.aab
bundletool dump resources --bundle=app-release.aab

# Gerar APKs a partir do AAB (simula o que o Play faz)
bundletool build-apks \
  --bundle=app-release.aab \
  --output=app.apks \
  --ks=release.keystore \
  --ks-pass=pass:suasenha \
  --ks-key-alias=meuapp \
  --key-pass=pass:suasenha

# Instalar em um dispositivo conectado (estilo Play: apenas a ABI + idioma do dispositivo)
bundletool install-apks --apks=app.apks
```

---

## Materiais de Estudo

- [React Native — Publicando na Play Store](https://reactnative.dev/docs/signed-apk-android)
- [Android — Assinar seu app](https://developer.android.com/studio/publish/app-signing)
- [Google Play — Assinatura de app](https://support.google.com/googleplay/android-developer/answer/9842756)

---

## Próximo Passo

Assinatura configurada. Último tópico de CI/CD: atualizações OTA com EAS Update — enviando mudanças de JS sem um release completo na Play Store.

➡ [Atualizações OTA com EAS Update](./05-ota-updates)
