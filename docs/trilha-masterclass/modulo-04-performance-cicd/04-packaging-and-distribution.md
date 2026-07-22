---
title: "Bundle — Packaging & Distribution"
---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc04_04_packaging-and-distribution.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## 3. Packaging with Metadata and Patches

### Bundle metadata

Embedding metadata into the bundle lets you track exactly which code is running in production — critical for OTA deployments where JS and native versions may diverge.

#### Injecting metadata at bundle time

```javascript
// metro.config.js — custom serializer that injects metadata
const { buildBundleFromModules } = require('@react-native/metro-config');

function buildCustomSerializer() {
  // Return undefined to use default serializer
  if (!process.env.CI) return undefined;

  return async (entryPoint, preModules, graph, options) => {
    const metadata = {
      bundleId: process.env.BUNDLE_ID ?? 'local',
      gitSha: process.env.GIT_SHA ?? 'unknown',
      buildNumber: process.env.BUILD_NUMBER ?? '0',
      builtAt: new Date().toISOString(),
      platform: options.platform,
    };

    // Default serializer output
    const defaultBundle = await buildBundleFromModules(
      entryPoint, preModules, graph, options
    );

    // Prepend metadata as a self-executing JS expression
    const metadataHeader = `
var __BUNDLE_METADATA__ = ${JSON.stringify(metadata)};
// --- bundle start ---
`;

    return {
      ...defaultBundle,
      code: metadataHeader + defaultBundle.code,
    };
  };
}
```

Read metadata at runtime:

```typescript
// src/utils/bundleMetadata.ts
declare const __BUNDLE_METADATA__: {
  bundleId: string;
  gitSha: string;
  buildNumber: string;
  builtAt: string;
  platform: string;
} | undefined;

export const bundleMetadata = typeof __BUNDLE_METADATA__ !== 'undefined'
  ? __BUNDLE_METADATA__
  : { bundleId: 'dev', gitSha: 'local', buildNumber: '0', builtAt: '', platform: 'unknown' };
```

#### Attaching metadata as a separate JSON sidecar

For OTA update systems that verify bundle identity:

```bash
# CI script: generate bundle + sidecar
BUNDLE_ID="${GIT_SHA}-${BUILD_NUMBER}"

npx react-native bundle \
  --platform android \
  --dev false \
  --bundle-output dist/index.android.bundle \
  --sourcemap-output dist/index.android.bundle.map

cat > dist/bundle.meta.json << EOF
{
  "bundleId": "${BUNDLE_ID}",
  "platform": "android",
  "gitSha": "${GIT_SHA}",
  "buildNumber": "${BUILD_NUMBER}",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "minNativeVersion": "1.2.0",
  "checksum": "$(sha256sum dist/index.android.bundle | awk '{print $1}')"
}
EOF
```

The `minNativeVersion` field allows the OTA update client to reject bundles that require a native binary update the user has not yet installed.

### Hot-patch bundles (OTA updates)

OTA updates work by replacing the JS bundle on the device without going through the App Store. React Native supports this natively — the JS bundle is just a file, and you can update it at runtime.

**The legal constraint:** App Store review guidelines require that OTA updates cannot change the app's fundamental purpose or add features that were not reviewed. Behaviour-preserving bug fixes are universally accepted.

#### Custom OTA loader

```typescript
// src/ota/OTAClient.ts
import RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';

const BUNDLE_DIR = `${RNFS.DocumentDirectoryPath}/ota`;
const ACTIVE_BUNDLE_PATH = `${BUNDLE_DIR}/index.bundle`;
const METADATA_PATH = `${BUNDLE_DIR}/bundle.meta.json`;

interface BundleMeta {
  bundleId: string;
  checksum: string;
  minNativeVersion: string;
}

export async function checkForUpdate(serverUrl: string): Promise<boolean> {
  const currentMeta: BundleMeta = await fetchCurrentMeta();
  const serverMeta: BundleMeta = await fetch(`${serverUrl}/bundle.meta.json`)
    .then(r => r.json());

  if (serverMeta.bundleId === currentMeta.bundleId) return false;
  if (!isNativeVersionCompatible(serverMeta.minNativeVersion)) return false;

  return true;
}

export async function downloadAndApply(serverUrl: string): Promise<void> {
  const bundleUrl = `${serverUrl}/index.bundle`;

  // Download to temp path first — validate before replacing active bundle
  const tempPath = `${BUNDLE_DIR}/index.bundle.tmp`;
  await RNFS.downloadFile({ fromUrl: bundleUrl, toFile: tempPath }).promise;

  // Verify checksum
  const serverMeta: BundleMeta = await fetch(`${serverUrl}/bundle.meta.json`)
    .then(r => r.json());
  const localChecksum = await RNFS.hash(tempPath, 'sha256');

  if (localChecksum !== serverMeta.checksum) {
    await RNFS.unlink(tempPath);
    throw new Error('Bundle checksum mismatch — download may be corrupted');
  }

  // Atomically replace active bundle
  if (await RNFS.exists(ACTIVE_BUNDLE_PATH)) {
    await RNFS.unlink(ACTIVE_BUNDLE_PATH);
  }
  await RNFS.moveFile(tempPath, ACTIVE_BUNDLE_PATH);

  // Persist new metadata
  await RNFS.writeFile(METADATA_PATH, JSON.stringify(serverMeta), 'utf8');
}

function isNativeVersionCompatible(minVersion: string): boolean {
  const appVersion: string = NativeModules.AppInfo.version;
  return semverCompare(appVersion, minVersion) >= 0;
}
```

Loading the OTA bundle at startup:

```kotlin
// Android — ReactNativeHost override
override fun getJSBundleFile(): String? {
    val otaBundle = File(filesDir, "ota/index.bundle")
    return if (otaBundle.exists()) otaBundle.absolutePath else null
    // null falls back to the bundled assets/index.android.bundle
}
```

```swift
// iOS — RCTBridgeDelegate override
func sourceURL(for bridge: RCTBridge!) -> URL! {
    let otaURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        .first?.appendingPathComponent("ota/index.bundle")
    
    if let url = otaURL, FileManager.default.fileExists(atPath: url.path) {
        return url
    }
    
    // Fall back to bundled .jsbundle
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
}
```

---

## 4. Publishing and Consumption via Artifactory

Publishing a React Native library or internal SDK to a private npm registry (JFrog Artifactory, GitHub Packages, Nexus) follows a consistent pattern regardless of the registry vendor.

### Publishing to Artifactory

#### 1. Configure the registry

```bash
# .npmrc (project root — commit this)
@mycompany:registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/
//artifactory.mycompany.com/artifactory/api/npm/npm-local/:always-auth=true

# Authenticate (run once per developer / CI environment)
npm login --registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/ \
  --scope=@mycompany
```

For CI, use a scoped access token stored in a secret manager:

```bash
# In CI — inject token without interactive login
npm config set \
  //artifactory.mycompany.com/artifactory/api/npm/npm-local/:_authToken="${ARTIFACTORY_TOKEN}"
```

#### 2. Package structure for an RN library

```
react-native-my-sdk/
├── package.json
├── src/
│   ├── index.ts            ← main JS/TS entry point
│   └── NativeMySDK.ts      ← TurboModule spec
├── ios/
│   ├── RNMySDK.h
│   ├── RNMySDK.mm
│   └── react-native-my-sdk.podspec
├── android/
│   ├── build.gradle
│   └── src/main/java/com/mycompany/mySdk/MySDKModule.kt
├── codegen/                ← Codegen output (generated, not committed)
└── .npmignore              ← exclude source, include only dist
```

```json
// package.json
{
  "name": "@mycompany/react-native-my-sdk",
  "version": "2.3.1",
  "main": "lib/commonjs/index.js",
  "module": "lib/module/index.js",
  "types": "lib/typescript/index.d.ts",
  "react-native": "src/index.ts",
  "source": "src/index.ts",
  "files": [
    "lib/",
    "android/",
    "ios/",
    "src/",
    "react-native-my-sdk.podspec",
    "!**/__tests__",
    "!**/__fixtures__"
  ],
  "publishConfig": {
    "registry": "https://artifactory.mycompany.com/artifactory/api/npm/npm-local/",
    "access": "restricted"
  },
  "codegenConfig": {
    "name": "RNMySDKSpec",
    "type": "modules",
    "jsSrcsDir": "src"
  }
}
```

#### 3. Build and publish

```bash
# Build JS distributable (uses bob — React Native Builder Bob)
yarn build

# Verify what will be published
npm pack --dry-run

# Publish to Artifactory
npm publish --registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/
```

#### 4. Automating publication in CI

```yaml
# .github/workflows/publish-sdk.yml
name: Publish SDK

on:
  push:
    tags:
      - 'v*'           # only trigger on version tags: v1.2.3

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build distributable
        run: npm run build

      - name: Verify types
        run: npx tsc --noEmit

      - name: Publish to Artifactory
        run: npm publish
        env:
          NPM_TOKEN: ${{ secrets.ARTIFACTORY_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.ARTIFACTORY_TOKEN }}
```

### Consuming the SDK in a React Native app

```bash
# app's .npmrc
@mycompany:registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/

# Install
npm install @mycompany/react-native-my-sdk

# iOS pod install
cd ios && pod install
```

The CocoaPods `.podspec` included in the library is picked up by `pod install` automatically:

```ruby
# react-native-my-sdk.podspec
require "json"
package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-my-sdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]
  s.platforms    = { :ios => "15.1" }

  s.source       = { :git => package["repository"]["url"], :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"

  # New Architecture: Codegen config
  install_modules_dependencies(s)

  s.dependency "React-Core"
end
```

### Versioning strategy

Use Semantic Versioning (`semver`) strictly for libraries consumed by multiple apps:

| Change type | Version bump | Example |
|---|---|---|
| Native API added (new TurboModule method) | Minor: `1.2.0 → 1.3.0` | Added `fetchAsync` |
| Native API removed / signature changed | Major: `1.x.x → 2.0.0` | Renamed `getData` |
| JS-only bug fix | Patch: `1.2.0 → 1.2.1` | Fixed null check |
| New native binary required | Major | New TurboModule, new pod dependency |

Publish pre-release versions for testing before promoting:

```bash
# Pre-release tag: 2.0.0-beta.1
npm version 2.0.0-beta.1 --no-git-tag-version
npm publish --tag beta

# Consumers opt in:
npm install @mycompany/react-native-my-sdk@beta

# Promote to stable once verified:
npm dist-tag add @mycompany/react-native-my-sdk@2.0.0-beta.1 latest
```

---

## Study Materials

### Official Documentation

| Resource | Description |
|---|---|
| [Metro documentation](https://metrobundler.dev/) | Full Metro config reference — resolver, transformer, serialiser |
| [React Native Gradle Plugin](https://reactnative.dev/docs/new-architecture-library-intro) | `react {}` block, bundle tasks, Hermes integration |
| [Publishing libraries](https://reactnative.dev/docs/new-architecture-library-intro) | Codegen, podspec, versioning for New Architecture |
| [React Native Builder Bob](https://github.com/callstack/react-native-builder-bob) | Standard build tool for RN libraries |

### Deep Dives

| Resource | Author | What you will learn |
|---|---|---|
| [Metro deep dive — resolution, transforms, cache](https://www.callstack.com/blog/metro-bundler-deep-dive) | Callstack | Resolver algorithm, transform pipeline, cache invalidation |
| [React Native OTA updates — the complete guide](https://blog.swmansion.com/react-native-ota-updates-a-practical-guide-ad4536ffe4c2) | Software Mansion | Hot-patch mechanics, rollback, version gating |
| [Publishing RN libraries to Artifactory](https://jfrog.com/blog/publishing-react-native-packages-to-jfrog-artifactory/) | JFrog | npm scope config, CI token management, version pinning |
| [Bundle size analysis](https://www.callstack.com/blog/bundle-size-analysis-for-react-native) | Callstack | source-map-explorer, bundle visualiser, tree shaking |
| [Code signing automation](https://fastlane.tools/codesigning/) | Fastlane | Match, certificates, provisioning profiles in CI |

### Video Tutorials

| Resource | Duration | What you will learn |
|---|---|---|
| [Metro bundler internals](https://www.youtube.com/watch?v=jGT0JZp1e_E) | 25 min | Resolution, transforms, why module IDs matter |
| [React Native library development](https://www.youtube.com/watch?v=qPaFMeGRqTE) | 45 min | Full library setup with Builder Bob, Codegen, publishing |
| [OTA updates in RN](https://www.youtube.com/watch?v=U3SjJMz8YVQ) | 30 min | Bundle loading, version gating, rollback strategy |
| [ProGuard R8 for RN](https://www.youtube.com/watch?v=R3o8nIfmgqU) | 20 min | Keep rules, debugging obfuscated stack traces |

### Interactive

| Resource | What to do |
|---|---|
| [source-map-explorer](https://github.com/danvk/source-map-explorer) | Run locally against your bundle — find the largest modules |
| [Bundlephobia](https://bundlephobia.com/) | Check any npm package's size before adding it as a dependency |
| [Semver calculator](https://semver.npmjs.com/) | Test semver ranges — understand what `^1.2.3` actually resolves to |

---

Next → [CI/CD Pipeline](./cicd-pipeline)
