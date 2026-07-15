---
title: CI/CD Pipeline
---

# CI/CD Pipeline

> **Module 04 — React Native Masterclass**
> Target: senior engineers building automated release pipelines for React Native apps.
> Tools: GitHub Actions, Fastlane, Gradle, Xcode CLI. React Native 0.76+.

---

## 1. Build and Bundle Pipeline

### The complete pipeline

A production-grade RN CI pipeline has seven gates. Every gate must pass before the next runs:

```
┌─────────────────────────────────────────────────────────────────┐
│ Gate 1: Static Analysis                                          │
│  TypeScript compilation (tsc --noEmit)                           │
│  ESLint                                                          │
│  Dependency audit (npm audit)                                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ pass
┌──────────────────────────────▼──────────────────────────────────┐
│ Gate 2: Unit & Integration Tests                                  │
│  Jest (--ci --coverage)                                          │
│  Coverage threshold gate (fail if < 70%)                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ pass
┌──────────────────────────────▼──────────────────────────────────┐
│ Gate 3: JS Bundle Build                                          │
│  Metro bundle (Android + iOS)                                    │
│  Bundle size gate (fail if > configured threshold)               │
│  Source map upload (Sentry / Bugsnag)                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ pass
┌──────────────────────────────▼──────────────────────────────────┐
│ Gate 4: Native Build                                             │
│  Android: ./gradlew bundleRelease (AAB)                          │
│  iOS: xcodebuild archive + xcodebuild -exportArchive             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ pass
┌──────────────────────────────▼──────────────────────────────────┐
│ Gate 5: Pre-publication Checks (Preflight)                       │
│  Version uniqueness check                                        │
│  APK/IPA binary validation (aapt2, lipo)                         │
│  Permissions diff (new permissions require review)               │
│  Signing certificate validity                                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ pass
┌──────────────────────────────▼──────────────────────────────────┐
│ Gate 6: Internal Distribution                                    │
│  Android → Firebase App Distribution / Internal track            │
│  iOS → TestFlight                                                │
└──────────────────────────────┬──────────────────────────────────┘
                               │ QA sign-off
┌──────────────────────────────▼──────────────────────────────────┐
│ Gate 7: Production Release                                        │
│  Android → Play Store (staged rollout: 10% → 50% → 100%)        │
│  iOS → App Store Connect (phased release)                        │
└─────────────────────────────────────────────────────────────────┘
```

### GitHub Actions — full workflow

This is a complete, production-ready workflow. It uses Fastlane for native distribution and runs Android and iOS builds in parallel:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'   # v1.2.3, v10.0.1

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: true          # cancel in-flight releases if a new tag is pushed

env:
  NODE_VERSION: '20'
  JAVA_VERSION: '17'
  RUBY_VERSION: '3.3'

jobs:
  # ── Gate 1 & 2: Lint + Tests ──────────────────────────────────────────
  quality:
    name: Quality Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: TypeScript
        run: npx tsc --noEmit

      - name: ESLint
        run: npx eslint src --ext .ts,.tsx --max-warnings 0

      - name: Tests
        run: npx jest --ci --coverage --coverageThreshold='{"global":{"lines":70}}'

      - name: Dependency audit
        run: npm audit --audit-level=high

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ── Gate 3: JS Bundle ─────────────────────────────────────────────────
  bundle:
    name: JS Bundle
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci

      - name: Build Android bundle
        run: |
          npx react-native bundle \
            --platform android \
            --dev false \
            --entry-file index.js \
            --bundle-output /tmp/android.bundle \
            --sourcemap-output /tmp/android.bundle.map \
            --minify true

      - name: Build iOS bundle
        run: |
          npx react-native bundle \
            --platform ios \
            --dev false \
            --entry-file index.js \
            --bundle-output /tmp/ios.bundle \
            --sourcemap-output /tmp/ios.bundle.map \
            --minify true

      - name: Bundle size gate
        run: |
          ANDROID_SIZE=$(wc -c < /tmp/android.bundle)
          IOS_SIZE=$(wc -c < /tmp/ios.bundle)
          MAX_SIZE=$((5 * 1024 * 1024))   # 5 MB limit — adjust for your app
          echo "Android bundle: $(( ANDROID_SIZE / 1024 )) KB"
          echo "iOS bundle:     $(( IOS_SIZE / 1024 )) KB"
          if [ $ANDROID_SIZE -gt $MAX_SIZE ] || [ $IOS_SIZE -gt $MAX_SIZE ]; then
            echo "FAIL: bundle exceeds size limit"
            exit 1
          fi

      - name: Upload source maps to Sentry
        run: |
          npx sentry-cli releases new "${{ github.ref_name }}"
          npx sentry-cli releases files "${{ github.ref_name }}" upload-sourcemaps \
            --dist "${{ github.run_number }}" \
            /tmp/android.bundle /tmp/android.bundle.map \
            /tmp/ios.bundle /tmp/ios.bundle.map
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}

  # ── Gate 4+: Android Native Build ────────────────────────────────────
  android:
    name: Android Release
    runs-on: ubuntu-latest
    needs: bundle
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: ${{ env.RUBY_VERSION }}
          bundler-cache: true

      - run: npm ci

      - name: Setup Gradle cache
        uses: gradle/actions/setup-gradle@v3
        with:
          cache-read-only: ${{ github.ref != 'refs/heads/main' }}

      - name: Decode keystore
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/release.jks

      - name: Run Fastlane (build + distribute)
        run: bundle exec fastlane android release
        env:
          ANDROID_KEYSTORE_PATH: release.jks
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          FIREBASE_APP_ID: ${{ secrets.FIREBASE_ANDROID_APP_ID }}
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

  # ── Gate 4+: iOS Native Build ─────────────────────────────────────────
  ios:
    name: iOS Release
    runs-on: macos-14              # Apple Silicon runner
    needs: bundle
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: ${{ env.RUBY_VERSION }}
          bundler-cache: true

      - run: npm ci

      - name: Install CocoaPods
        run: cd ios && pod install --repo-update
        env:
          COCOAPODS_DISABLE_STATS: true

      - name: Run Fastlane (build + TestFlight)
        run: bundle exec fastlane ios release
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.ASC_API_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY: ${{ secrets.ASC_API_KEY }}
```

---

## 2. Versioning and Release

### Semantic versioning for native apps

Mobile apps have two version numbers that mean different things:

| Number | Android | iOS | Purpose |
|---|---|---|---|
| **Version name / CFBundleShortVersionString** | `1.3.0` | `1.3.0` | Human-readable, displayed in stores |
| **Version code / CFBundleVersion** | `230` (integer) | `230` (build number) | Unique per upload, used for binary tracking |

Never reuse a version code/build number. Even after a failed upload, increment before retrying.

### Automated versioning in CI

```bash
# CI script: version.sh
# Source of truth: git tag (v1.3.0)
# Build number: sequential from CI run number

TAG="${GITHUB_REF_NAME}"              # e.g. v1.3.0
VERSION="${TAG#v}"                     # strip leading 'v' → 1.3.0
BUILD_NUMBER="${GITHUB_RUN_NUMBER}"   # sequential integer from GitHub Actions

echo "Version: $VERSION, Build: $BUILD_NUMBER"
```

```ruby
# fastlane/Fastfile — update Android version
lane :set_android_version do
  version = ENV['VERSION']
  build   = ENV['BUILD_NUMBER'].to_i

  # Directly edits android/app/build.gradle
  android_set_version_name(version_name: version)
  android_set_version_code(version_code: build)
end

# fastlane/Fastfile — update iOS version
lane :set_ios_version do
  version = ENV['VERSION']
  build   = ENV['BUILD_NUMBER']

  increment_version_number(version_number: version, xcodeproj: 'ios/YourApp.xcodeproj')
  increment_build_number(build_number: build, xcodeproj: 'ios/YourApp.xcodeproj')
end
```

### `package.json` version as the single source of truth

For teams that prefer to drive versions from `package.json`:

```javascript
// version-sync.js — run in CI before native builds
const fs = require('fs');
const { execSync } = require('child_process');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const version = packageJson.version;   // e.g. "1.3.0"
const build = process.env.GITHUB_RUN_NUMBER ?? '0';

// Android — patch build.gradle
let gradle = fs.readFileSync('android/app/build.gradle', 'utf-8');
gradle = gradle
  .replace(/versionName ".+"/, `versionName "${version}"`)
  .replace(/versionCode \d+/, `versionCode ${build}`);
fs.writeFileSync('android/app/build.gradle', gradle);

// iOS — use PlistBuddy
execSync(`/usr/libexec/PlistBuddy -c "Set CFBundleShortVersionString ${version}" ios/YourApp/Info.plist`);
execSync(`/usr/libexec/PlistBuddy -c "Set CFBundleVersion ${build}" ios/YourApp/Info.plist`);

console.log(`Set version ${version} build ${build}`);
```

### Fastlane for release automation

Fastlane is the standard automation layer for mobile CI. It abstracts `xcodebuild`, `gradlew`, App Store Connect API, and Play Developer API into composable Ruby DSL lanes.

```ruby
# fastlane/Fastfile
default_platform(:ios)

# ── Shared setup ──────────────────────────────────────────────────────────
before_all do
  ensure_bundle_exec
end

# ── Android ───────────────────────────────────────────────────────────────
platform :android do

  desc "Build a signed AAB and distribute to Firebase App Distribution"
  lane :release do
    # 1. Set version numbers from CI environment
    android_set_version_name(version_name: ENV['VERSION'])
    android_set_version_code(version_code: ENV['BUILD_NUMBER'].to_i)

    # 2. Build signed AAB
    gradle(
      task: "bundle",
      build_type: "Release",
      project_dir: "android/",
      properties: {
        "android.injected.signing.store.file" => ENV['ANDROID_KEYSTORE_PATH'],
        "android.injected.signing.store.password" => ENV['ANDROID_KEYSTORE_PASSWORD'],
        "android.injected.signing.key.alias" => ENV['ANDROID_KEY_ALIAS'],
        "android.injected.signing.key.password" => ENV['ANDROID_KEY_PASSWORD'],
      }
    )

    # 3. Preflight checks (see Section 4)
    run_preflight_checks(platform: :android)

    # 4. Distribute to internal testers via Firebase
    firebase_app_distribution(
      app: ENV['FIREBASE_APP_ID'],
      groups: "internal-qa",
      release_notes: changelog_from_git_commits(
        merge_commit_filtering: "exclude_merges",
        commits_count: 10
      ),
      firebase_cli_token: ENV['FIREBASE_TOKEN']
    )

    # 5. Upload to Play Store internal track
    upload_to_play_store(
      track: "internal",
      aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true,
    )

    # 6. Tag the release in git
    add_git_tag(tag: "android/#{ENV['VERSION']}/#{ENV['BUILD_NUMBER']}")
  end

  desc "Promote internal track to production with staged rollout"
  lane :promote_to_production do
    upload_to_play_store(
      track: 'internal',
      track_promote_to: 'production',
      rollout: '0.1',   # 10% initial rollout
    )
  end
end

# ── iOS ───────────────────────────────────────────────────────────────────
platform :ios do

  desc "Build a signed IPA and upload to TestFlight"
  lane :release do
    # 1. Set version numbers
    increment_version_number(
      version_number: ENV['VERSION'],
      xcodeproj: "ios/YourApp.xcodeproj"
    )
    increment_build_number(
      build_number: ENV['BUILD_NUMBER'],
      xcodeproj: "ios/YourApp.xcodeproj"
    )

    # 2. Sync code signing certificates via Match
    app_store_connect_api_key(
      key_id: ENV['APP_STORE_CONNECT_API_KEY_ID'],
      issuer_id: ENV['APP_STORE_CONNECT_API_ISSUER_ID'],
      key_content: ENV['APP_STORE_CONNECT_API_KEY'],
      in_house: false
    )
    match(
      type: "appstore",
      readonly: true,
      app_identifier: "com.yourcompany.yourapp"
    )

    # 3. Build archive
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
      include_symbols: true,
      include_bitcode: false
    )

    # 4. Preflight checks
    run_preflight_checks(platform: :ios)

    # 5. Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      groups: ["Internal QA"],
      changelog: changelog_from_git_commits(commits_count: 10)
    )
  end
end

# ── Shared helpers ────────────────────────────────────────────────────────
def run_preflight_checks(platform:)
  # Implemented in Section 4
  sh("node scripts/preflight.js --platform #{platform}")
end
```

### Code signing — Fastlane Match

Managing certificates manually across a team is error-prone. `match` stores all certificates and provisioning profiles in a private Git repository (encrypted), and every developer and CI runner syncs from it:

```bash
# Initialise match (run once)
bundle exec fastlane match init

# Add App Store certificate + profile
bundle exec fastlane match appstore

# Add Ad-hoc certificate + profile (for distribution to testers)
bundle exec fastlane match adhoc
```

In CI, set `MATCH_GIT_BASIC_AUTHORIZATION` to a base64-encoded `username:token` with read access to the private certificates repo. No human interaction required.

---

## 3. Deploy in Native Projects

### Deploying OTA bundles to self-hosted infrastructure

For teams running their own OTA infrastructure (rather than using a third-party service):

```bash
# deploy-bundle.sh — called after Gate 3
set -euo pipefail

PLATFORM="${1:?pass android or ios}"
VERSION="${VERSION:?}"
GIT_SHA="${GITHUB_SHA:?}"
BUILD_NUMBER="${GITHUB_RUN_NUMBER:?}"
S3_BUCKET="s3://bundles.mycompany.com/rn-bundles"
BUNDLE_ID="${VERSION}-${BUILD_NUMBER}-${GIT_SHA:0:8}"

# Build the bundle
npx react-native bundle \
  --platform "$PLATFORM" \
  --dev false \
  --entry-file index.js \
  --bundle-output "/tmp/${PLATFORM}.bundle" \
  --sourcemap-output "/tmp/${PLATFORM}.bundle.map" \
  --minify true

# Generate checksum
CHECKSUM=$(sha256sum "/tmp/${PLATFORM}.bundle" | awk '{print $1}')

# Metadata sidecar
cat > "/tmp/bundle.meta.json" << EOF
{
  "bundleId": "${BUNDLE_ID}",
  "platform": "${PLATFORM}",
  "version": "${VERSION}",
  "buildNumber": "${BUILD_NUMBER}",
  "gitSha": "${GIT_SHA}",
  "checksum": "${CHECKSUM}",
  "minNativeVersion": "${MIN_NATIVE_VERSION:-1.0.0}",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Upload to S3 with immutable cache headers
aws s3 cp "/tmp/${PLATFORM}.bundle" \
  "${S3_BUCKET}/${BUNDLE_ID}/${PLATFORM}.bundle" \
  --cache-control "public, max-age=31536000, immutable"

aws s3 cp "/tmp/bundle.meta.json" \
  "${S3_BUCKET}/${BUNDLE_ID}/bundle.meta.json"

# Update the 'stable' pointer (latest bundle that passed QA)
aws s3 cp "/tmp/bundle.meta.json" \
  "${S3_BUCKET}/stable/${PLATFORM}/bundle.meta.json"

echo "Deployed: ${S3_BUCKET}/${BUNDLE_ID}/"
```

### Deploying native binaries to internal distribution

```ruby
# fastlane — Android internal deployment
lane :deploy_internal_android do
  # Already built AAB from the release lane
  supply(
    track: 'internal',
    aab: 'android/app/build/outputs/bundle/release/app-release.aab',
    json_key: ENV['PLAY_STORE_JSON_KEY'],
    package_name: 'com.yourcompany.yourapp',
  )
end

# fastlane — staged production rollout
lane :rollout_android do |options|
  percentage = options[:percentage] || 10

  supply(
    track: 'production',
    rollout: (percentage / 100.0).to_s,
    skip_upload_apk: true,
    skip_upload_aab: true,
    json_key: ENV['PLAY_STORE_JSON_KEY'],
  )
end
```

Invoke rollout progression from CI:

```bash
# Trigger 10% rollout
bundle exec fastlane android rollout_android percentage:10

# After monitoring (1 day) — promote to 50%
bundle exec fastlane android rollout_android percentage:50

# Full rollout
bundle exec fastlane android rollout_android percentage:100
```

### Rollback strategy

```bash
# Android — halt rollout (stops new installs but does not remove from existing devices)
# Via Play Console API:
curl -X PATCH \
  "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.yourapp/edits/{editId}/tracks/production" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"releases": [{"status": "halted"}]}'

# iOS — remove from TestFlight (cannot remove from production after approval)
# Via App Store Connect API: set build status to DEVELOPER_REMOVED_FROM_SALE

# OTA rollback — revert the 'stable' pointer to the previous version
PREVIOUS_BUNDLE_ID=$(cat previous-bundle-id.txt)
aws s3 cp \
  "s3://bundles.mycompany.com/rn-bundles/${PREVIOUS_BUNDLE_ID}/bundle.meta.json" \
  "s3://bundles.mycompany.com/rn-bundles/stable/android/bundle.meta.json"
```

---

## 4. Pre-publication Checks (Preflight)

Pre-publication checks run after the native binary is built but before it is submitted to any distribution channel. They catch issues that automated tests miss.

### Preflight script

```javascript
// scripts/preflight.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

const platform = process.argv[2] === '--platform'
  ? process.argv[3]
  : 'android';

const checks = platform === 'android' ? androidChecks() : iosChecks();
runChecks(checks);

// ── Android checks ────────────────────────────────────────────────────────
function androidChecks() {
  const AAB_PATH = 'android/app/build/outputs/bundle/release/app-release.aab';

  return [
    {
      name: 'AAB exists',
      check: () => fs.existsSync(AAB_PATH),
      message: 'Build artifact missing — did the Gradle task run?',
    },
    {
      name: 'AAB minimum size',
      check: () => {
        const size = fs.statSync(AAB_PATH).size;
        return size > 1024 * 1024;    // must be > 1 MB (sanity check — empty bundle would be tiny)
      },
      message: 'AAB is suspiciously small — bundle may be empty or corrupted',
    },
    {
      name: 'AAB maximum size',
      check: () => {
        const size = fs.statSync(AAB_PATH).size;
        const limit = parseInt(process.env.MAX_AAB_SIZE_MB ?? '150', 10) * 1024 * 1024;
        return size < limit;
      },
      message: `AAB exceeds size limit (MAX_AAB_SIZE_MB=${process.env.MAX_AAB_SIZE_MB ?? '150'})`,
    },
    {
      name: 'Version code is unique',
      check: () => {
        const versionCode = getAndroidVersionCode(AAB_PATH);
        const publishedCodes = getPublishedVersionCodes(); // calls Play Developer API
        return !publishedCodes.includes(versionCode);
      },
      message: 'Version code already exists in Play Store — increment before re-uploading',
    },
    {
      name: 'No new dangerous permissions',
      check: () => {
        const currentPerms = getAndroidPermissions(AAB_PATH);
        const baselinePerms = JSON.parse(
          fs.readFileSync('scripts/permissions-baseline.android.json', 'utf-8')
        );
        const newDangerous = currentPerms.dangerous.filter(
          p => !baselinePerms.dangerous.includes(p)
        );
        if (newDangerous.length > 0) {
          console.error('New dangerous permissions:', newDangerous);
          return false;
        }
        return true;
      },
      message: 'New dangerous permissions detected — update baseline after review',
    },
    {
      name: 'Keystore signed (not debug keystore)',
      check: () => {
        const output = execSync(
          `keytool -printcert -jarfile ${AAB_PATH} 2>&1 || true`
        ).toString();
        return !output.includes('CN=Android Debug');
      },
      message: 'AAB is signed with the debug keystore — will be rejected by Play Store',
    },
  ];
}

// ── iOS checks ────────────────────────────────────────────────────────────
function iosChecks() {
  const IPA_PATH = execSync(
    "find /tmp/ios-build -name '*.ipa' | head -1"
  ).toString().trim();

  return [
    {
      name: 'IPA exists',
      check: () => IPA_PATH && fs.existsSync(IPA_PATH),
      message: 'IPA not found — did xcodebuild -exportArchive succeed?',
    },
    {
      name: 'IPA minimum size',
      check: () => {
        const size = fs.statSync(IPA_PATH).size;
        return size > 5 * 1024 * 1024;   // must be > 5 MB
      },
      message: 'IPA is suspiciously small',
    },
    {
      name: 'Bundle ID matches',
      check: () => {
        const info = execSync(
          `unzip -p "${IPA_PATH}" "Payload/*.app/Info.plist" | plutil -convert json -o - -`
        ).toString();
        const plist = JSON.parse(info);
        return plist.CFBundleIdentifier === process.env.BUNDLE_ID_IOS;
      },
      message: 'Bundle ID in IPA does not match expected value — wrong scheme may have built',
    },
    {
      name: 'Valid distribution provisioning profile',
      check: () => {
        const profile = execSync(
          `unzip -p "${IPA_PATH}" "Payload/*.app/embedded.mobileprovision" | \
          security cms -D -i /dev/stdin 2>/dev/null | \
          plutil -convert json -o - -`
        ).toString();
        const parsed = JSON.parse(profile);
        return parsed.ProvisionsAllDevices === undefined;  // true = distribution, not ad-hoc/enterprise
      },
      message: 'IPA uses an ad-hoc provisioning profile — cannot submit to App Store',
    },
    {
      name: 'No debug symbols leaking',
      check: () => {
        // .dSYM should be a separate artifact, not embedded in the IPA
        const output = execSync(`unzip -l "${IPA_PATH}" | grep -c '.dSYM' || true`).toString();
        return parseInt(output.trim(), 10) === 0;
      },
      message: '.dSYM symbols embedded in IPA — increases binary size and may expose source paths',
    },
    {
      name: 'Build number is unique',
      check: () => {
        const buildNumber = getBuildNumber(IPA_PATH);
        const existingBuilds = getTestFlightBuilds(); // calls App Store Connect API
        return !existingBuilds.includes(buildNumber);
      },
      message: 'Build number already uploaded to TestFlight — increment CFBundleVersion',
    },
  ];
}

// ── Runner ────────────────────────────────────────────────────────────────
function runChecks(checks) {
  let failed = 0;

  for (const { name, check, message } of checks) {
    process.stdout.write(`[Preflight] ${name} ... `);
    try {
      const passed = check();
      if (passed) {
        console.log('PASS');
      } else {
        console.log(`FAIL — ${message}`);
        failed++;
      }
    } catch (err) {
      console.log(`ERROR — ${err.message}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} preflight check(s) failed. Aborting.`);
    process.exit(1);
  }

  console.log('\nAll preflight checks passed.');
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getAndroidVersionCode(aabPath) {
  const output = execSync(
    `aapt2 dump badging ${aabPath} 2>/dev/null | grep versionCode || \
    bundletool get-device-spec 2>/dev/null || echo "versionCode='0'"`
  ).toString();
  const match = output.match(/versionCode='(\d+)'/);
  return match ? parseInt(match[1], 10) : 0;
}

function getAndroidPermissions(aabPath) {
  const output = execSync(
    `aapt2 dump badging ${aabPath} | grep permission`
  ).toString();
  const all = output.match(/name='([^']+)'/g)
    ?.map(m => m.replace(/name='|'/g, '')) ?? [];
  const dangerous = all.filter(p => DANGEROUS_PERMISSIONS.includes(p));
  return { all, dangerous };
}

const DANGEROUS_PERMISSIONS = [
  'android.permission.CAMERA',
  'android.permission.READ_CONTACTS',
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.READ_EXTERNAL_STORAGE',
  // ... extend with your security policy
];
```

Run in Fastlane:

```ruby
# fastlane/Fastfile
private_lane :preflight do |options|
  platform = options[:platform].to_s
  
  UI.message "Running preflight checks for #{platform}..."
  sh("node scripts/preflight.js --platform #{platform}")
  UI.success "Preflight passed!"
end
```

### Permissions baseline — preventing permission creep

The permissions baseline file is checked in and updated manually after review:

```json
// scripts/permissions-baseline.android.json
{
  "dangerous": [
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO"
  ],
  "normal": [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.VIBRATE"
  ],
  "lastReviewedAt": "2026-07-14",
  "reviewedBy": "platform-team"
}
```

If the preflight detects a new dangerous permission, the CI fails and a human must review the permission, update the baseline, and commit it. This prevents accidental permission additions from a library update slipping through to production.

### Changelog automation

Auto-generate a release changelog from git commits:

```bash
# scripts/generate-changelog.sh
PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")
CURRENT_TAG="${GITHUB_REF_NAME}"

if [ -z "$PREVIOUS_TAG" ]; then
  RANGE="HEAD"
else
  RANGE="${PREVIOUS_TAG}..HEAD"
fi

echo "## ${CURRENT_TAG} — $(date +'%Y-%m-%d')"
echo ""

# Group by conventional commit type
echo "### Features"
git log "$RANGE" --oneline --no-merges \
  | grep "^[a-f0-9]* feat" \
  | sed 's/^[a-f0-9]* /- /'

echo ""
echo "### Bug Fixes"
git log "$RANGE" --oneline --no-merges \
  | grep "^[a-f0-9]* fix" \
  | sed 's/^[a-f0-9]* /- /'

echo ""
echo "### Performance"
git log "$RANGE" --oneline --no-merges \
  | grep "^[a-f0-9]* perf" \
  | sed 's/^[a-f0-9]* /- /'
```

### Slack / notification on release

```yaml
# .github/workflows/release.yml (excerpt)
  notify:
    name: Notify
    runs-on: ubuntu-latest
    needs: [android, ios]
    if: always()   # run even if android/ios failed
    steps:
      - name: Slack notification
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "${{ needs.android.result == 'success' && needs.ios.result == 'success' && ':white_check_mark:' || ':x:' }} Release ${{ github.ref_name }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Release ${{ github.ref_name }}*\nAndroid: ${{ needs.android.result }}\niOS: ${{ needs.ios.result }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_RELEASE_WEBHOOK }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

---

## Study Materials

### Official Documentation

| Resource | Description |
|---|---|
| [Fastlane documentation](https://docs.fastlane.tools/) | Full reference for all actions, plugins, and platform integrations |
| [Fastlane Match](https://docs.fastlane.tools/actions/match/) | Code signing certificates via private git repo |
| [GitHub Actions — secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) | Storing and using keystores, API keys, tokens in CI |
| [Play Developer API](https://developers.google.com/android-publisher) | Programmatic access to staged rollout, track management |
| [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi) | TestFlight, version management, phased release |
| [Sentry source maps](https://docs.sentry.io/platforms/react-native/sourcemaps/) | Uploading RN source maps for crash symbolication |

### Deep Dives

| Resource | Author | What you will learn |
|---|---|---|
| [React Native CI/CD — the practical guide](https://www.callstack.com/blog/react-native-ci-cd) | Callstack | GitHub Actions + Fastlane setup, signing, distribution |
| [Automating iOS code signing](https://codesigning.guide/) | Felix Krause (Fastlane author) | The definitive guide to Match and certificate management |
| [Android staged rollouts](https://support.google.com/googleplay/android-developer/answer/6346149) | Google | Rollout mechanics, halt, resume, full release |
| [Preflight checks for mobile](https://thoughtbot.com/blog/preflight-checklist-mobile-releases) | Thoughtbot | Comprehensive checklist — permissions, signing, size, version |
| [RN release automation](https://blog.swmansion.com/react-native-release-automation-e6b3a7e3b3e2) | Software Mansion | End-to-end pipeline: test → bundle → sign → distribute |

### Video Tutorials

| Resource | Duration | What you will learn |
|---|---|---|
| [React Native CI/CD with GitHub Actions](https://www.youtube.com/watch?v=5R1EFQF-q9A) | 45 min | Full pipeline: lint → test → build → distribute |
| [Fastlane for React Native](https://www.youtube.com/watch?v=QqUXVRRFbgA) | 35 min | Match, gym, pilot, supply — all Fastlane actions explained |
| [Android staged rollout](https://www.youtube.com/watch?v=4Nz_dkM2p2E) | 15 min | Play Console walkthrough — track management, halt, promote |
| [iOS phased release](https://www.youtube.com/watch?v=Gk2Pz3JnJPo) | 12 min | TestFlight → App Store, phased release configuration |
| [Sentry for RN — crash reporting](https://www.youtube.com/watch?v=GM0BrNxiTrc) | 20 min | Setup, source maps, performance monitoring |

### Interactive

| Resource | What to do |
|---|---|
| [Fastlane action catalogue](https://docs.fastlane.tools/actions/) | Browse all available actions — search by keyword |
| [GitHub Actions marketplace](https://github.com/marketplace?type=actions&query=react+native) | Community actions for RN CI |
| [semver.org](https://semver.org/) | Authoritative semver specification — read before writing your versioning rules |
| [aapt2 reference](https://developer.android.com/tools/aapt2) | Android Asset Packaging Tool — used in preflight to inspect AAB contents |
| [Play Console staged rollouts](https://play.google.com/console) | Practice rollout management in your own project |

---

← [Bundle & Distribution](./02-bundle-distribution.md) | Module 04 complete
