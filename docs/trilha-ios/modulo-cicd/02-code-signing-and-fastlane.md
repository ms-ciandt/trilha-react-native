---
title: Code Signing and Fastlane for React Native iOS
---

# Code Signing and Fastlane for React Native iOS

As an iOS developer, you already understand code signing at a conceptual level. Certificates, provisioning profiles, and the Apple Developer Portal are not new. What is new is doing all of it repeatably across a team and a CI machine without a human clicking through Xcode every time. This document maps your existing knowledge to the React Native context and shows how Fastlane solves the automation problem.

## Code Signing Concepts — What You Already Know

### Certificates

Apple issues two types of signing certificates:

**Development certificate** — used when building to a physical device during local development. Xcode signs the binary with this certificate, and the device accepts it because the certificate chain traces back to Apple. Your personal development certificate is tied to your Apple ID.

**Distribution certificate** — used when building a binary for TestFlight or App Store submission. The private key for this certificate must be accessible on any machine that builds a release IPA. This is where teams run into trouble: the private key lives in the Keychain of whoever generated the certificate, not in the repository, and not automatically on a CI machine.

### Provisioning Profiles

A provisioning profile is a signed envelope that ties together three things:

- **App ID** — the bundle identifier (`com.yourcompany.yourapp`), optionally with capabilities (Push Notifications, Sign in with Apple, App Groups)
- **Devices** — for development and ad-hoc profiles, an explicit list of UDIDs allowed to run the app; for App Store profiles, all devices implicitly
- **Certificate** — the signing certificate whose public key the profile embeds

Four profile types map to four distribution scenarios:

| Profile type | Use case |
|---|---|
| Development | Local device testing, debug builds |
| Ad Hoc | Distribution to a fixed list of test devices |
| App Store | TestFlight and App Store submission |
| Enterprise | In-house distribution (requires Enterprise account) |

The profile is a file with a `.mobileprovision` extension. Xcode embeds it into the app bundle as `embedded.mobileprovision`. At launch, iOS verifies that the certificate used to sign the binary matches the one in the embedded profile, and that the device is on the allowed list (for development/ad-hoc).

### Apple Developer Portal

The Developer Portal at developer.apple.com is where you:

- Create and revoke certificates
- Register device UDIDs
- Create App IDs and configure capabilities
- Create and download provisioning profiles

Changes to capabilities (adding Push Notifications, for example) invalidate existing provisioning profiles. You must regenerate and re-download the profile, then update Xcode's reference to it. This regeneration cycle is what makes manual signing fragile across a team.

## Automatic vs Manual Signing in Xcode

### Automatic Signing

In Xcode's project settings under the "Signing and Capabilities" tab, enabling "Automatically manage signing" delegates all certificate and profile management to Xcode. Xcode creates certificates on your behalf, creates profiles that match your bundle ID and selected team, and resolves conflicts automatically.

Automatic signing works well for a single developer building to their own device. For React Native specifically, it is the default after `npx react-native init` and fine for development builds.

It breaks down in CI because:

- CI machines have no Keychain with signing credentials pre-populated
- Automatic signing calls Apple APIs at build time, requiring an authenticated Apple ID session
- Interactive Apple ID sessions cannot be scripted without 2FA workarounds

### Manual Signing

Manual signing means you explicitly specify which certificate and provisioning profile Xcode should use for each configuration. In `ios/YourApp.xcodeproj`, open the target settings and set:

- `CODE_SIGN_STYLE = Manual`
- `PROVISIONING_PROFILE_SPECIFIER = <profile name or UUID>`
- `CODE_SIGN_IDENTITY = "Apple Distribution"` (for release builds)

When building from the command line via `xcodebuild`, pass these as build settings:

```bash
xcodebuild archive \
  -workspace ios/YourApp.xcworkspace \
  -scheme YourApp \
  -configuration Release \
  -archivePath /tmp/YourApp.xcarchive \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="match AppStore com.yourcompany.yourapp" \
  DEVELOPMENT_TEAM=YOURTEAMID
```

Manual signing requires that the certificate and profile are installed before the build runs. In CI this means installing the certificate into a temporary Keychain and copying the profile into `~/Library/MobileDevice/Provisioning Profiles/`. Fastlane Match handles both automatically.

## Fastlane Match

Match is the Fastlane tool that solves the "certificate roulette" problem. The problem: when a team member generates a new distribution certificate, the old one is revoked by Apple (which limits the number of active certificates per account), breaking the Keychain of every other team member and every CI machine that had the previous certificate installed.

Match's approach: store all certificates and provisioning profiles in a single private Git repository, encrypted with a passphrase. Every developer and every CI runner syncs from this repository instead of managing their own credentials. The private Git repo becomes the source of truth for signing identity.

### Initializing Match

Run this once, from a machine that has access to your Apple Developer Portal account:

```bash
bundle exec fastlane match init
```

Match asks for:

- The URL of the private Git repository (create an empty private repo first)
- Your Apple Developer team ID

This writes a `Matchfile` into `fastlane/`:

```ruby
# fastlane/Matchfile
git_url("https://github.com/yourorg/yourapp-certificates")

storage_mode("git")

type("appstore")   # default type to sync

app_identifier(["com.yourcompany.yourapp"])
username("ci@yourcompany.com")  # Apple ID used to access Developer Portal
```

### Generating Certificates and Profiles

Generate and store an App Store certificate and provisioning profile:

```bash
bundle exec fastlane match appstore
```

Generate for development:

```bash
bundle exec fastlane match development
```

Match creates the certificate in the Developer Portal if it does not exist, downloads it, encrypts it, and pushes it to the Git repository. Existing certificates are reused as long as they are valid — Match does not revoke and recreate unless you explicitly pass `--force`.

### Syncing in CI

In CI, use `readonly: true` to prevent Match from attempting to create or modify credentials. It only downloads and installs:

```bash
bundle exec fastlane match appstore --readonly
```

Match installs the certificate into a temporary Keychain and copies the provisioning profile to `~/Library/MobileDevice/Provisioning Profiles/`. After this step, `xcodebuild` can find both by name.

Provide the Git repository credentials and the Match encryption passphrase as CI secrets:

```bash
MATCH_PASSWORD=<encryption passphrase>
MATCH_GIT_BASIC_AUTHORIZATION=<base64 username:token>
```

`MATCH_GIT_BASIC_AUTHORIZATION` is the base64 encoding of `username:personal-access-token` for the private certificates repository.

## Fastlane Gym

Gym is the Fastlane action that wraps the two-step iOS build process: `xcodebuild archive` followed by `xcodebuild -exportArchive`. The output is an `.ipa` file ready for distribution.

Without gym, the equivalent shell commands are:

```bash
# Step 1 — produce an .xcarchive
xcodebuild archive \
  -workspace ios/YourApp.xcworkspace \
  -scheme YourApp \
  -configuration Release \
  -archivePath /tmp/YourApp.xcarchive

# Step 2 — export an .ipa from the archive
xcodebuild -exportArchive \
  -archivePath /tmp/YourApp.xcarchive \
  -exportPath /tmp/YourApp-ipa \
  -exportOptionsPlist ios/ExportOptions.plist
```

The `ExportOptions.plist` specifies the export method, provisioning profile, and signing identity. Gym generates this file for you based on its parameters.

Using gym in a Fastfile lane:

```ruby
build_app(
  workspace: "ios/YourApp.xcworkspace",
  scheme: "YourApp",
  configuration: "Release",
  export_method: "app-store",
  export_options: {
    provisioningProfiles: {
      "com.yourcompany.yourapp" => "match AppStore com.yourcompany.yourapp"
    }
  },
  output_directory: "/tmp/ios-build",
  output_name: "YourApp.ipa",
  include_symbols: true,
  include_bitcode: false
)
```

`build_app` is the modern alias for `gym`. The two names are interchangeable.

The archive step compiles the app and its dependencies into a `.xcarchive` — a directory containing the compiled binary, dSYM symbol files, and metadata. The export step extracts the `.ipa` from the archive and signs it with the certificate matching the specified provisioning profile.

## Fastlane Pilot

Pilot uploads a built `.ipa` to TestFlight. It wraps the App Store Connect API and handles the authentication, binary upload, and optional group assignment.

```ruby
upload_to_testflight(
  ipa: "/tmp/ios-build/YourApp.ipa",
  skip_waiting_for_build_processing: true,
  groups: ["Internal QA", "Beta Testers"],
  changelog: "Release #{ENV['VERSION']} — see git log for details"
)
```

`upload_to_testflight` is the modern alias for `pilot`.

`skip_waiting_for_build_processing: true` returns immediately after upload rather than polling until Apple's processing completes (which can take 10–30 minutes). For CI pipelines, skipping this wait keeps the job duration reasonable. The build becomes available in TestFlight once Apple's automated review of the binary completes.

If you need the build to be immediately available to testers before the CI job ends, remove `skip_waiting_for_build_processing` or set it to `false`:

```ruby
upload_to_testflight(
  skip_waiting_for_build_processing: false,
  wait_processing_timeout_duration: 1800  # max seconds to wait (30 min)
)
```

## Fastlane Deliver

Deliver submits a completed TestFlight build to App Store review and uploads metadata: app description, keywords, screenshots, and release notes. It wraps the App Store Connect API.

```ruby
deliver(
  app_identifier: "com.yourcompany.yourapp",
  submit_for_review: true,
  force: true,   # skip interactive confirmation
  metadata_path: "./fastlane/metadata",
  screenshots_path: "./fastlane/screenshots",
  phased_release: true,
  automatic_release: false,   # manual release after Apple approval
  submission_information: {
    add_id_info_uses_idfa: false,
    export_compliance_uses_encryption: false,
    content_rights_has_rights: true,
    content_rights_contains_third_party_content: false
  }
)
```

`upload_to_app_store` is the modern alias for `deliver`.

The `metadata_path` directory follows a specific structure that Fastlane manages. After running `fastlane deliver init`, Fastlane downloads your current metadata from App Store Connect and creates the folder structure:

```
fastlane/metadata/
  en-US/
    description.txt
    keywords.txt
    release_notes.txt
    name.txt
    subtitle.txt
  pt-BR/
    description.txt
    ...
```

Edit these files, then `deliver` uploads them. This keeps App Store metadata in version control alongside the code.

## Appfile and Fastfile Anatomy

### Appfile

The Appfile stores app-level configuration that most lanes share, so you do not repeat it in every action call:

```ruby
# fastlane/Appfile
app_identifier("com.yourcompany.yourapp")
apple_id("ci@yourcompany.com")
team_id("YOURTEAMID")  # 10-character Apple Developer team ID
itc_team_id("YOURITUNESID")  # numeric iTunes Connect team ID (if different from team_id)
```

Actions like `match`, `pilot`, and `deliver` read these values automatically. You only need to override them in a specific lane when working with multiple targets or multiple Apple accounts.

### Fastfile

The Fastfile is a Ruby DSL file that defines lanes. Each lane is a named sequence of actions:

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do

  before_all do
    # Runs before every lane on this platform
    ensure_bundle_exec  # enforces `bundle exec fastlane` rather than bare `fastlane`
  end

  desc "Sync code signing credentials from the Match git repo"
  lane :sync_signing do
    app_store_connect_api_key(
      key_id: ENV['ASC_KEY_ID'],
      issuer_id: ENV['ASC_ISSUER_ID'],
      key_content: ENV['ASC_API_KEY'],
      in_house: false
    )
    match(type: "appstore", readonly: true)
  end

  desc "Build a signed IPA"
  lane :build do
    sync_signing
    build_app(
      workspace: "ios/YourApp.xcworkspace",
      scheme: "YourApp",
      configuration: "Release",
      export_method: "app-store",
      export_options: {
        provisioningProfiles: {
          "com.yourcompany.yourapp" => "match AppStore com.yourcompany.yourapp"
        }
      },
      output_directory: "/tmp/ios-build"
    )
  end

  desc "Upload to TestFlight"
  lane :beta do
    build
    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      groups: ["Internal QA"]
    )
  end

  desc "Submit to App Store"
  lane :release do
    build
    upload_to_app_store(
      submit_for_review: true,
      phased_release: true,
      automatic_release: false
    )
  end

  after_all do |lane|
    # Runs after every successful lane
    # Useful for Slack notifications, git tagging, etc.
  end

  error do |lane, exception|
    # Runs if any lane fails
    UI.error("Lane #{lane} failed: #{exception.message}")
  end

end
```

### Lane Composition

Lanes can call other lanes, enabling reuse without duplication. In the example above, `beta` calls `build`, and `build` calls `sync_signing`. This is lane composition.

For a React Native project with multiple targets (for example, a main app and a notification service extension), you can pass parameters:

```ruby
lane :sync_signing do |options|
  type = options[:type] || "appstore"
  identifiers = options[:identifiers] || ["com.yourcompany.yourapp"]

  match(
    type: type,
    app_identifier: identifiers,
    readonly: true
  )
end

lane :release do
  # Sync credentials for both targets in one call
  sync_signing(
    type: "appstore",
    identifiers: [
      "com.yourcompany.yourapp",
      "com.yourcompany.yourapp.NotificationService"
    ]
  )

  build_app(
    workspace: "ios/YourApp.xcworkspace",
    scheme: "YourApp",
    export_method: "app-store",
    export_options: {
      provisioningProfiles: {
        "com.yourcompany.yourapp" => "match AppStore com.yourcompany.yourapp",
        "com.yourcompany.yourapp.NotificationService" =>
          "match AppStore com.yourcompany.yourapp.NotificationService"
      }
    }
  )

  upload_to_testflight(skip_waiting_for_build_processing: true)
end
```

## App Store Connect API Key

Interactive Apple ID sessions (email + password + 2FA) cannot be automated in CI. Apple provides an alternative: API keys with no interactive authentication step.

In App Store Connect, go to Users and Access > Integrations > App Store Connect API. Generate a key with "App Manager" or "Developer" role. Download the `.p8` file once — Apple does not let you download it again.

Pass the key to Fastlane via environment variables:

```bash
ASC_KEY_ID=<10-char key ID>
ASC_ISSUER_ID=<UUID from the API Keys page>
ASC_API_KEY=<contents of the .p8 file, single line or multiline>
```

In the Fastfile, call `app_store_connect_api_key` at the start of any lane that talks to App Store Connect (Match, Pilot, Deliver):

```ruby
lane :release do
  app_store_connect_api_key(
    key_id: ENV['ASC_KEY_ID'],
    issuer_id: ENV['ASC_ISSUER_ID'],
    key_content: ENV['ASC_API_KEY'],
    in_house: false
  )

  match(type: "appstore", readonly: true)
  build_app(...)
  upload_to_testflight(...)
end
```

The API key session is stored in a shared context and reused by subsequent actions in the same lane run. You do not need to pass it to each action individually.

## Running Locally vs in CI

From a developer machine:

```bash
# Install Ruby dependencies
bundle install

# Sync signing for local builds
bundle exec fastlane ios sync_signing

# Build and upload to TestFlight
bundle exec fastlane ios beta
```

In CI (GitHub Actions excerpt):

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.3'
    bundler-cache: true

- name: Install Node dependencies
  run: npm ci

- name: Install CocoaPods
  run: cd ios && pod install --repo-update
  env:
    COCOAPODS_DISABLE_STATS: true

- name: Build and distribute
  run: bundle exec fastlane ios release
  env:
    MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
    MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_AUTH }}
    ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
    ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
    ASC_API_KEY: ${{ secrets.ASC_API_KEY }}
```

The CI runner needs no pre-installed certificates or Apple accounts. Match installs everything from the private Git repository using the passphrase and the Git token from secrets.

## Summary

Your iOS code signing knowledge transfers directly: certificates identify who signed the binary, provisioning profiles tie a certificate to an App ID and a set of devices, and the Apple Developer Portal is the authority that issues both. The difference in a React Native team context is scale — manual management breaks when more than one person or machine needs to build a release binary.

Fastlane Match solves the distribution problem by keeping all signing credentials in a single encrypted Git repository. Gym wraps the two-step `xcodebuild archive` and `xcodebuild -exportArchive` process into a single parameterized call. Pilot uploads to TestFlight, and Deliver handles App Store submission with metadata. The Fastfile composes these into named lanes that CI can invoke without interactive sessions, using App Store Connect API keys instead of Apple ID passwords.
