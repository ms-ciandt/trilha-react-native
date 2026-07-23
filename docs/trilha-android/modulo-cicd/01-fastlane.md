---
title: "Fastlane for Android"
sidebar_label: "Fastlane"
sidebar_position: 1
---

## Video Overview

> Video for this topic coming soon.

## What Fastlane Does

You already know Gradle tasks, `bundletool`, and the Play Store upload flow. Fastlane scripts those steps into repeatable `lanes` — automated workflows that run locally or in CI. For React Native, Fastlane handles the Android build and deploy side; the JS side is handled by Metro and EAS (covered next).

---

## Installation

```bash
# Install Fastlane
gem install fastlane

# In your android/ directory, initialise
cd android && fastlane init
```

This creates `android/fastlane/Appfile` and `android/fastlane/Fastfile`.

---

## Appfile

```ruby
# android/fastlane/Appfile
json_key_file("fastlane/google-play-key.json") # Service account key
package_name("com.yourapp")
```

---

## Fastfile — Lanes

```ruby
# android/fastlane/Fastfile
default_platform(:android)

platform :android do

  # Run tests
  lane :test do
    gradle(task: "test")
  end

  # Build a debug APK
  lane :build_debug do
    gradle(
      task: "assemble",
      build_type: "Debug"
    )
  end

  # Build release AAB and upload to Play Store (internal track)
  lane :deploy_internal do
    # Bump version code automatically
    increment_version_code(
      gradle_file_path: "app/build.gradle"
    )

    gradle(
      task: "bundle",
      build_type: "Release",
      properties: {
        "android.injected.signing.store.file" => ENV["KEYSTORE_PATH"],
        "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
        "android.injected.signing.key.alias" => ENV["KEY_ALIAS"],
        "android.injected.signing.key.password" => ENV["KEY_PASSWORD"],
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

  # Promote internal → production
  lane :promote_to_production do
    upload_to_play_store(
      track: "internal",
      track_promote_to: "production",
      rollout: "0.1", # 10% rollout
      skip_upload_apk: true,
      skip_upload_aab: true,
    )
  end
end
```

---

## Running Locally

```bash
cd android

fastlane test           # run unit tests
fastlane build_debug    # build debug APK
fastlane deploy_internal # build + upload to Play internal track
```

---

## Study Materials

- [Fastlane — Android Documentation](https://docs.fastlane.tools/getting-started/android/setup/)
- [Fastlane — upload_to_play_store](https://docs.fastlane.tools/actions/upload_to_play_store/)
- [Google Play — Service Accounts](https://docs.fastlane.tools/actions/supply/#setup)

---

## What's Next

Fastlane configured. Next: GitHub Actions — automating builds and deployments on every push.

➡ [GitHub Actions](./02-github-actions)
