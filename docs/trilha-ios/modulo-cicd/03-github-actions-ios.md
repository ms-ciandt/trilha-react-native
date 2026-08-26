---
title: GitHub Actions for iOS Builds
---

# GitHub Actions for iOS Builds

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/cicd_03_github_actions_ios.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/cicd_03_github_actions_ios_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

Setting up a CI/CD pipeline for iOS on GitHub Actions requires attention to a few points that differ from Android: Xcode only exists on macOS runners, code signing is handled by Apple-provisioned certificates, and CocoaPods adds a layer of native dependencies that needs dedicated caching.

## Why macOS is mandatory

Xcode and all iOS build tools (`xcodebuild`, `xcrun`, `simctl`) are exclusive to macOS. Linux or Windows runners cannot compile an `.ipa`. To specify the correct runner:

```yaml
jobs:
  build-ios:
    runs-on: macos-latest
```

`macos-latest` points to the most recent macOS version supported by GitHub Actions and includes multiple pre-installed Xcode versions. To pin a specific version:

```yaml
    runs-on: macos-15
    steps:
      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_16.3.app
```

Pinning the Xcode version prevents automatic runner updates from breaking builds due to API or compiler behavior changes.

## Caching strategies

macOS runners are significantly more expensive in CI minutes than Linux. Well-configured caching reduces build time from 20–30 minutes to 8–12 minutes on subsequent runs.

### Cache node_modules

```yaml
      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
```

The key uses the hash of `package-lock.json` to invalidate the cache when dependencies change.

### Cache CocoaPods

The `ios/Pods` directory contains native dependencies and can occupy 500 MB or more in larger projects. The key should account for `Podfile.lock`, which records the exact versions of each resolved pod:

```yaml
      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: |
            ios/Pods
            ~/.cocoapods
          key: ${{ runner.os }}-pods-${{ hashFiles('ios/Podfile.lock') }}
          restore-keys: |
            ${{ runner.os }}-pods-
```

Including `~/.cocoapods` in the path caches the CocoaPods spec repository, avoiding downloading the full index on every run.

### Cache pre-built Hermes binaries

React Native 0.76+ uses Hermes as the default engine. Hermes binaries are downloaded as artifacts during `pod install` and can be cached separately:

```yaml
      - name: Cache Hermes prebuilt binaries
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Caches/hermes
            ios/build/hermes
          key: ${{ runner.os }}-hermes-${{ hashFiles('node_modules/react-native/sdks/.hermesversion') }}
```

The `.hermesversion` file inside the `react-native` package determines which Hermes binary will be used, making it the correct invalidation key.

## Code signing in CI

Code signing is the most complex part of iOS CI/CD. There are two main approaches: Fastlane Match (recommended for teams) and manual certificate import.

### Fastlane Match

Match manages certificates and provisioning profiles in a private Git repository (or S3 bucket), encrypted with a password. In CI, it automatically downloads and installs the signing assets:

Required secrets in GitHub:
- `MATCH_PASSWORD`: encryption password for the Match repository
- `MATCH_GIT_URL`: URL of the private Git repository with certificates
- `MATCH_GIT_BASIC_AUTHORIZATION`: Base64-encoded access token for the Match repository
- `APP_STORE_CONNECT_API_KEY_KEY_ID`: App Store Connect API key ID
- `APP_STORE_CONNECT_API_KEY_ISSUER_ID`: API Issuer ID
- `APP_STORE_CONNECT_API_KEY_KEY`: contents of the `.p8` private key

`Fastfile` with lanes for TestFlight and App Store:

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    api_key = app_store_connect_api_key(
      key_id: ENV["APP_STORE_CONNECT_API_KEY_KEY_ID"],
      issuer_id: ENV["APP_STORE_CONNECT_API_KEY_ISSUER_ID"],
      key_content: ENV["APP_STORE_CONNECT_API_KEY_KEY"],
    )

    match(
      type: "appstore",
      readonly: true,
      api_key: api_key
    )

    gym(
      workspace: "ios/MyApp.xcworkspace",
      scheme: "MyApp",
      configuration: "Release",
      export_method: "app-store",
      output_directory: "ios/build",
      output_name: "MyApp.ipa"
    )

    pilot(
      api_key: api_key,
      ipa: "ios/build/MyApp.ipa",
      skip_waiting_for_build_processing: true
    )
  end

  desc "Build and upload to App Store (release)"
  lane :release do
    api_key = app_store_connect_api_key(
      key_id: ENV["APP_STORE_CONNECT_API_KEY_KEY_ID"],
      issuer_id: ENV["APP_STORE_CONNECT_API_KEY_ISSUER_ID"],
      key_content: ENV["APP_STORE_CONNECT_API_KEY_KEY"],
    )

    match(
      type: "appstore",
      readonly: true,
      api_key: api_key
    )

    gym(
      workspace: "ios/MyApp.xcworkspace",
      scheme: "MyApp",
      configuration: "Release",
      export_method: "app-store",
      output_directory: "ios/build",
      output_name: "MyApp.ipa"
    )

    deliver(
      api_key: api_key,
      ipa: "ios/build/MyApp.ipa",
      submit_for_review: false,
      automatic_release: false
    )
  end
end
```

### Manual certificate import

For projects that do not use Match, it is possible to import certificates and profiles directly via secrets:

```yaml
      - name: Install Apple certificate
        env:
          BUILD_CERTIFICATE_BASE64: ${{ secrets.BUILD_CERTIFICATE_BASE64 }}
          P12_PASSWORD: ${{ secrets.P12_PASSWORD }}
          BUILD_PROVISION_PROFILE_BASE64: ${{ secrets.BUILD_PROVISION_PROFILE_BASE64 }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          CERTIFICATE_PATH=$RUNNER_TEMP/build_certificate.p12
          PP_PATH=$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

          echo -n "$BUILD_CERTIFICATE_BASE64" | base64 --decode -o $CERTIFICATE_PATH
          echo -n "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o $PP_PATH

          security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

          security import $CERTIFICATE_PATH \
            -P "$P12_PASSWORD" \
            -A -t cert -f pkcs12 \
            -k $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH

          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          cp $PP_PATH ~/Library/MobileDevice/Provisioning\ Profiles
```

## Complete workflow

### Trigger: push to main goes to TestFlight; tag goes to App Store

```yaml
name: iOS CI/CD

on:
  push:
    branches:
      - main
    tags:
      - 'v*.*.*'
  pull_request:
    branches:
      - main

jobs:
  build-ios:
    name: Build and Deploy iOS
    runs-on: macos-15
    if: github.event_name == 'push'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_16.3.app

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: |
            ios/Pods
            ~/.cocoapods
          key: ${{ runner.os }}-pods-${{ hashFiles('ios/Podfile.lock') }}
          restore-keys: |
            ${{ runner.os }}-pods-

      - name: Cache Hermes prebuilt binaries
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Caches/hermes
            ios/build/hermes
          key: ${{ runner.os }}-hermes-${{ hashFiles('node_modules/react-native/sdks/.hermesversion') }}

      - name: Install Node dependencies
        run: npm ci

      - name: Install CocoaPods dependencies
        working-directory: ios
        run: pod install --repo-update

      - name: Setup Ruby and Fastlane
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true
          working-directory: ios

      - name: Run Fastlane Match and Build for TestFlight
        if: github.ref == 'refs/heads/main'
        working-directory: ios
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
          APP_STORE_CONNECT_API_KEY_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_KEY_ID }}
          APP_STORE_CONNECT_API_KEY_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY_KEY }}
        run: bundle exec fastlane beta

      - name: Run Fastlane Match and Build for App Store
        if: startsWith(github.ref, 'refs/tags/v')
        working-directory: ios
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
          APP_STORE_CONNECT_API_KEY_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_KEY_ID }}
          APP_STORE_CONNECT_API_KEY_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY_KEY }}
        run: bundle exec fastlane release

      - name: Upload IPA as artifact
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ios-build
          path: ios/build/*.ipa
          retention-days: 7
```

## Parallel jobs: iOS and Android

When the repository maintains iOS and Android apps in the same monorepo, it is possible to run builds in parallel, reducing total CI time:

```yaml
name: Mobile CI/CD

on:
  push:
    branches:
      - main
    tags:
      - 'v*.*.*'

jobs:
  build-ios:
    name: iOS Build
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: ios/Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('ios/Podfile.lock') }}
      - run: npm ci
      - run: pod install
        working-directory: ios
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true
          working-directory: ios
      - run: bundle exec fastlane beta
        working-directory: ios
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
          APP_STORE_CONNECT_API_KEY_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_KEY_ID }}
          APP_STORE_CONNECT_API_KEY_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY_KEY }}

  build-android:
    name: Android Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
      - run: npm ci
      - name: Build AAB
        working-directory: android
        run: ./gradlew bundleRelease
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          ANDROID_STORE_PASSWORD: ${{ secrets.ANDROID_STORE_PASSWORD }}
```

Both jobs run simultaneously. GitHub Actions allocates independent runners for each job, and the iOS job does not need to wait for Android to finish.

## GitHub Actions vs Xcode Cloud

| Criterion | GitHub Actions | Xcode Cloud |
|---|---|---|
| Repository integration | Any Git host | GitHub, Bitbucket, GitLab |
| Cost | Paid per macOS runner minute (~10x Linux) | Included in Apple Developer plan (25h/month free) |
| Configuration | YAML in repository | Graphical interface in Xcode / App Store Connect |
| Environment control | Full (choose OS, Xcode, tools) | Limited to Apple-supported versions |
| Android support | Yes (Linux runners) | No (Apple platforms only) |
| Secrets and variables | GitHub Secrets native | Environment variables in App Store Connect |
| Notifications | GitHub Checks, Slack, email | App Store Connect, TestFlight |
| Fastlane | Compatible and widely used | Partially supported (no `gym`; uses `xcodebuild` internally) |
| Build artifacts | `actions/upload-artifact` | Apple-managed storage |

For teams developing exclusively for Apple platforms and using Xcode as the primary IDE, Xcode Cloud simplifies configuration and eliminates runner management. For cross-platform teams with Android + iOS in the same repository, GitHub Actions offers a unified pipeline with greater flexibility.

## Common troubleshooting

**Code signing fails with "No signing certificate found"**

Check that Match was run with `readonly: false` at least once to create the certificates in the target repository. In CI, always use `readonly: true`.

**Pod install fails with "CDN: trunk Repo update failed"**

Add `--repo-update` to the `pod install` command or force the use of the local specs repository via `source 'https://cdn.cocoapods.org/'` in the `Podfile`.

**Build takes more than 30 minutes even with cache**

Check that the CocoaPods cache is being restored correctly. If `Podfile.lock` changes frequently, consider separating the cache for `~/.cocoapods` (specs repository) from `ios/Pods` (compiled dependencies), since the specs repository changes much less frequently.

**Xcode Cloud cannot find the scheme**

The scheme needs to be marked as "Shared" in Xcode (`Product > Scheme > Manage Schemes > Shared`). Non-shared schemes only exist on the local machine and are not committed to the repository.
