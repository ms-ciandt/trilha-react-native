---
title: "Fastlane para Android"
sidebar_label: "Fastlane"
sidebar_position: 1
---

## Visão Geral em Vídeo

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/cicd_01_fastlane.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/cicd_01_fastlane.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## O que o Fastlane Faz

Você já conhece as tasks do Gradle, o `bundletool` e o fluxo de upload para o Play Store. O Fastlane transforma esses passos em `lanes` repetíveis — workflows automatizados que rodam localmente ou no CI. Para React Native, o Fastlane cuida do lado Android do build e deploy; o lado JS fica a cargo do Metro e do EAS (visto a seguir).

---

## Instalação

```bash
# Instalar o Fastlane
gem install fastlane

# No diretório android/, inicializar
cd android && fastlane init
```

Isso cria `android/fastlane/Appfile` e `android/fastlane/Fastfile`.

---

## Appfile

```ruby
# android/fastlane/Appfile
json_key_file("fastlane/google-play-key.json") # Chave da conta de serviço
package_name("com.seuapp")
```

---

## Fastfile — Lanes

```ruby
# android/fastlane/Fastfile
default_platform(:android)

platform :android do

  # Rodar os testes
  lane :test do
    gradle(task: "test")
  end

  # Build de um APK debug
  lane :build_debug do
    gradle(
      task: "assemble",
      build_type: "Debug"
    )
  end

  # Build de AAB release e upload para o Play Store (track interno)
  lane :deploy_internal do
    # Incrementa o version code automaticamente
    increment_version_code(gradle_file_path: "app/build.gradle")

    gradle(
      task: "bundle",
      build_type: "Release",
      properties: {
        "android.injected.signing.store.file"     => ENV["KEYSTORE_PATH"],
        "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
        "android.injected.signing.key.alias"      => ENV["KEY_ALIAS"],
        "android.injected.signing.key.password"   => ENV["KEY_PASSWORD"],
      }
    )

    upload_to_play_store(
      track: "internal",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      skip_upload_apk: true,
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true,
    )
  end

  # Promove interno → produção
  lane :promote_to_production do
    upload_to_play_store(
      track: "internal",
      track_promote_to: "production",
      rollout: "0.1", # 10% de rollout
      skip_upload_apk: true,
      skip_upload_aab: true,
    )
  end
end
```

---

## Executando Localmente

```bash
cd android

fastlane test           # roda os testes unitários
fastlane build_debug    # build do APK debug
fastlane deploy_internal # build + upload para o track interno do Play
```

---

## Materiais de Estudo

- [Fastlane — Documentação Android](https://docs.fastlane.tools/getting-started/android/setup/)
- [Fastlane — upload_to_play_store](https://docs.fastlane.tools/actions/upload_to_play_store/)
- [Google Play — Contas de Serviço](https://docs.fastlane.tools/actions/supply/#setup)

---

## Próximo Passo

Fastlane configurado. A seguir: GitHub Actions — automatizando builds e deploys a cada push.

➡ [GitHub Actions](./02-github-actions)
