---
title: "Fastlane para Android"
sidebar_label: "Fastlane"
sidebar_position: 1
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## O que o Fastlane Faz

O Fastlane transforma em `lanes` automatizadas os passos manuais que você já conhece — Gradle, `bundletool`, upload para o Play Store. Para React Native, o Fastlane cuida do lado Android do build e deploy.

---

## Instalação

```bash
gem install fastlane
cd android && fastlane init
```

---

## Appfile

```ruby
# android/fastlane/Appfile
json_key_file("fastlane/google-play-key.json")
package_name("com.seuapp")
```

---

## Fastfile — Lanes

```ruby
# android/fastlane/Fastfile
default_platform(:android)

platform :android do

  lane :test do
    gradle(task: "test")
  end

  lane :build_debug do
    gradle(task: "assemble", build_type: "Debug")
  end

  lane :deploy_internal do
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
    )
  end

  lane :promote_to_production do
    upload_to_play_store(
      track: "internal",
      track_promote_to: "production",
      rollout: "0.1",
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
fastlane test
fastlane build_debug
fastlane deploy_internal
```

---

## Materiais de Estudo

- [Fastlane — Documentação Android](https://docs.fastlane.tools/getting-started/android/setup/)
- [Fastlane — upload_to_play_store](https://docs.fastlane.tools/actions/upload_to_play_store/)

---

## Próximo Passo

➡ [GitHub Actions](./02-github-actions)
