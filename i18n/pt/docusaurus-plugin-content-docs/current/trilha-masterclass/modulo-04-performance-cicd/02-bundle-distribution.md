---
title: Bundle e Distribuicao
---

# Bundle e Distribuicao

> **Modulo 04 — React Native Masterclass**
> Publico-alvo: engenheiros senior responsaveis pelo pipeline completo de release — da configuracao do Metro ate a publicacao de artefatos no Artifactory.
> React Native 0.76+ — New Architecture, Hermes, Gradle 8, Xcode 16.

---

## 1. Metro e Geracao de Build

### O que o Metro faz

Metro e o bundler JavaScript do React Native. Ele nao e Webpack, Vite ou esbuild — foi construido especificamente para mobile, com tres responsabilidades:

1. **Resolucao** — segue caminhos de `import`/`require`, respeitando `package.json#main`, o campo `react-native` e sufixos especificos de plataforma (`.android.ts`, `.ios.ts`)
2. **Transformacao** — transpila JS/TS/JSX via Babel (as transformacoes sao cacheadas por hash de arquivo)
3. **Serializacao** — concatena todos os modulos em um unico arquivo de bundle (ou multiplos chunks para bundles divididos)

No release, o Metro e invocado pelo Gradle / Xcode. No debug, o Metro roda como servidor HTTP e serve o bundle em tempo real.

### Explorando a configuracao do Metro

```javascript
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/** @type {import('@react-native/metro-config').MetroConfig} */
const customConfig = {
  // ── Resolver ──────────────────────────────────────────────────────────
  resolver: {
    // Suporte a extensoes de arquivo adicionais
    sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json', 'svg'],
    assetExts: ['png', 'jpg', 'gif', 'webp', 'mp4', 'otf', 'ttf', 'woff2'],

    // Resolucao por alias — util para monorepos
    extraNodeModules: {
      '@app': `${__dirname}/src`,
    },

    // Precedencia de extensoes especificas de plataforma
    // .android.ts e tentado antes de .ts no Android
    platforms: ['android', 'ios', 'native', 'web'],
  },

  // ── Transformer ───────────────────────────────────────────────────────
  transformer: {
    // Habilita inline requires — adia a avaliacao de modulos (ver Performance)
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,
      },
    }),

    // Plugin de assets — executa transformacoes customizadas em assets de imagem
    assetPlugins: ['@react-native/assets-plugin'],

    // Flag instavel — habilita o novo worker de transformacao Babel (mais rapido)
    unstable_allowRequireContext: true,
  },

  // ── Serialiser ────────────────────────────────────────────────────────
  serializer: {
    // Entry-point customizado — util para configuracoes de multi-bundle
    // createModuleIdFactory: ...

    // Adiciona metadados ao bundle (ver Secao 3 — metadados e patches)
    customSerializer: buildCustomSerializer(),
  },

  // ── Server ────────────────────────────────────────────────────────────
  server: {
    port: 8081,
    enhanceMiddleware: (middleware) => {
      // Injeta middleware customizado — util para autenticacao em ambientes de CI
      return (req, res, next) => {
        if (req.url.startsWith('/custom')) return handleCustomRoute(req, res);
        return middleware(req, res, next);
      };
    },
  },

  // ── Cache ─────────────────────────────────────────────────────────────
  cacheVersion: '1',           // incremente para invalidar todos os caches do Metro
  resetCache: false,           // defina como true via CLI: metro --reset-cache
};

module.exports = mergeConfig(getDefaultConfig(__dirname), customConfig);
```

### Geracao de bundle: o comando CLI

```bash
# Bundle de release Android
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res \
  --sourcemap-output android/app/src/main/assets/index.android.bundle.map \
  --minify true \
  --verbose

# Bundle de release iOS
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios \
  --sourcemap-output ios/main.jsbundle.map \
  --minify true
```

Flags que importam:

| Flag | Efeito |
|---|---|
| `--dev false` | Desativa `__DEV__`, remove avisos de desenvolvimento, habilita minificacao |
| `--minify` | Executa o Terser na saida — reduz o bundle em ~30–40% |
| `--sourcemap-output` | Gera source map para simbolizacao de crashes |
| `--profile` | Gera dados de timing por modulo — use para encontrar transformacoes lentas |

### Analise do bundle

Identifique o que esta tornando seu bundle grande antes de otimizar:

```bash
# Instale o visualizador de bundle
npm install --save-dev react-native-bundle-visualizer

# Gere um treemap interativo
npx react-native-bundle-visualizer

# Ou use source-map-explorer
npm install --save-dev source-map-explorer

npx react-native bundle \
  --platform android --dev false \
  --bundle-output /tmp/bundle.js \
  --sourcemap-output /tmp/bundle.js.map

npx source-map-explorer /tmp/bundle.js /tmp/bundle.js.map
```

O treemap mostra a contribuicao de cada modulo para o tamanho final do bundle. Descobertas comuns:

| Descoberta | Correcao |
|---|---|
| `moment` em 300 KB | Substitua por `date-fns` ou `dayjs` |
| `lodash` em 200 KB | Use imports nomeados: `import debounce from 'lodash/debounce'` |
| `@sentry/react-native` > 500 KB | Ja esperado; configure `uploadSourceMaps` apenas no CI |
| Arquivos de fonte grandes | Use apenas os pesos necessarios, considere fonte do sistema |
| Dependencias duplicadas | Use `npm dedupe` ou `yarn-deduplicate` |

### Pre-compilacao Hermes no build Gradle

Quando `hermesEnabled = true` na sua config Gradle, a task `bundleReleaseJsAndAssets` executa:

```
Bundle Metro  →  bundle .js  →  compilacao hermes  →  bytecode .hbc
```

O passo de compilacao do Hermes e controlado pelo `android/app/build.gradle`:

```groovy
// android/app/build.gradle (Groovy DSL)
react {
    bundleConfig = "metro.config.js"
    bundleAssetName = "index.android.bundle"
    entryFile = "index.js"
    hermesCommand = "../node_modules/react-native/sdks/hermesc/%OS-BIN%/hermesc"
    enableHermes = true     // compila JS para bytecode Hermes no release
    extraPackagerArgs = []
}
```

```kotlin
// android/app/build.gradle.kts (Kotlin DSL)
react {
    bundleConfig.set("metro.config.js")
    bundleAssetName.set("index.android.bundle")
    entryFile.set("index.js")
    enableHermes.set(true)
}
```

**Flags de compilacao do Hermes** que voce pode adicionar via `extraPackagerArgs`:

```groovy
extraPackagerArgs = [
    "--lazy-compilation",   // compila funcoes de forma lazy (experimental, pode reduzir startup)
]
```

### Bundle iOS nas fases de build do Xcode

No iOS, o bundle e gerado pelo Run Script `Bundle React Native code and images` no Xcode:

```bash
# O script (gerado automaticamente pelo react-native init, nao edite manualmente):
set -e
WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
REACT_NATIVE_XCODE="../node_modules/react-native/scripts/react-native-xcode.sh"
/bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"
```

Para customizar o comando de bundle do iOS, adicione variaveis de ambiente ao scheme do Xcode:

```
BUNDLE_COMMAND=bundle
BUNDLE_CONFIG=metro.config.js
ENTRY_FILE=index.js
HERMES_CLI_PATH=../node_modules/react-native/sdks/hermesc/osx-bin/hermesc
```

---

## 2. Bundles de Producao Android e iOS

### Pipeline de build de producao Android

```
index.js (entry)
    │
    ▼ Metro (task Gradle bundleReleaseJsAndAssets)
index.android.bundle.js   +   res/drawable-* (imagens)
    │
    ▼ hermesc (passo de compilacao HermesExecutor)
index.android.bundle     ← agora e bytecode Hermes (.hbc)
    │
    ▼ incluido no APK / AAB como asset
app-release.aab
    └── base/assets/index.android.bundle   ← comprimido no AAB
```

Comandos de build de release:

```bash
# Android App Bundle (preferido para a Play Store)
cd android && ./gradlew bundleRelease

# APK (para distribuicao direta / sideloading)
cd android && ./gradlew assembleRelease

# Bundle assinado (requer keystore configurado em gradle.properties)
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=/path/to/keystore.jks \
  -Pandroid.injected.signing.store.password=*** \
  -Pandroid.injected.signing.key.alias=my-key \
  -Pandroid.injected.signing.key.password=***
```

Configuracao do keystore em `android/gradle.properties` (nunca commite este arquivo):

```properties
# android/gradle.properties (ignorado pelo git)
MYAPP_UPLOAD_STORE_FILE=my-release-key.jks
MYAPP_UPLOAD_STORE_PASSWORD=supersecret
MYAPP_UPLOAD_KEY_ALIAS=my-key
MYAPP_UPLOAD_KEY_PASSWORD=supersecret
```

```groovy
// android/app/build.gradle — le das properties
android {
    signingConfigs {
        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true          // R8 code shrinking (apenas codigo nativo; JS e minificado pelo Metro)
            shrinkResources true        // remove recursos nativos nao utilizados
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Pipeline de build de producao iOS

```
index.js (entry)
    │
    ▼ react-native-xcode.sh (fase de build Run Script)
main.jsbundle + assets *.png
    │
    ▼ hermesc (se HERMES_ENABLED=true)
main.jsbundle.hbc
    │
    ▼ fase Copy Bundle Resources copia .jsbundle para .app
YourApp.app/main.jsbundle   ← comprimido dentro do .ipa
```

Arquivo de release a partir da CLI:

```bash
# Gerar archive
xcodebuild archive \
  -workspace ios/YourApp.xcworkspace \
  -scheme YourApp \
  -configuration Release \
  -archivePath /tmp/YourApp.xcarchive \
  -destination "generic/platform=iOS" \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="YourApp Release Profile"

# Exportar IPA a partir do archive
xcodebuild -exportArchive \
  -archivePath /tmp/YourApp.xcarchive \
  -exportPath /tmp/YourApp-ipa \
  -exportOptionsPlist ExportOptions.plist
```

`ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>    <!-- ou 'ad-hoc', 'enterprise' -->
  <key>signingStyle</key>
  <string>manual</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>com.yourcompany.yourapp</key>
    <string>YourApp Release Profile</string>
  </dict>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
```

### ProGuard e R8 — o que preservar

R8 (o sucessor do ProGuard) reduz o codigo nativo Java/Kotlin em builds de release. O React Native requer regras de keep especificas:

```proguard
# android/app/proguard-rules.pro

# Nucleo do React Native — nunca remova
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Seus TurboModules — preserve todas as classes geradas pela spec
-keep class com.yourapp.NativeModules.** { *; }

# Preserve metodos nativos (entry points JNI)
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Se usar Crashlytics/Sentry — preserve informacoes de stack trace
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
```

---

## 3. Empacotamento com Metadados e Patches

### Metadados do bundle

Incorporar metadados no bundle permite rastrear exatamente qual codigo esta rodando em producao — critico para implantacoes OTA onde as versoes JS e nativa podem divergir.

#### Injetando metadados no momento do bundle

```javascript
// metro.config.js — serializador customizado que injeta metadados
const { buildBundleFromModules } = require('@react-native/metro-config');

function buildCustomSerializer() {
  // Retorna undefined para usar o serializador padrao
  if (!process.env.CI) return undefined;

  return async (entryPoint, preModules, graph, options) => {
    const metadata = {
      bundleId: process.env.BUNDLE_ID ?? 'local',
      gitSha: process.env.GIT_SHA ?? 'unknown',
      buildNumber: process.env.BUILD_NUMBER ?? '0',
      builtAt: new Date().toISOString(),
      platform: options.platform,
    };

    // Saida do serializador padrao
    const defaultBundle = await buildBundleFromModules(
      entryPoint, preModules, graph, options
    );

    // Prepend dos metadados como expressao JS auto-executavel
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

Lendo metadados em tempo de execucao:

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

#### Anexando metadados como sidecar JSON separado

Para sistemas de atualizacao OTA que verificam a identidade do bundle:

```bash
# Script de CI: gera bundle + sidecar
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

O campo `minNativeVersion` permite que o cliente de atualizacao OTA rejeite bundles que exigem uma atualizacao de binario nativo que o usuario ainda nao instalou.

### Bundles de hot-patch (atualizacoes OTA)

Atualizacoes OTA funcionam substituindo o bundle JS no dispositivo sem passar pela App Store. O React Native suporta isso nativamente — o bundle JS e apenas um arquivo, e voce pode atualiza-lo em tempo de execucao.

**A restricao legal:** as diretrizes de revisao da App Store exigem que atualizacoes OTA nao possam mudar o proposito fundamental do app ou adicionar funcionalidades que nao foram revisadas. Correcoes de bugs que preservam o comportamento sao universalmente aceitas.

#### Loader OTA customizado

```typescript
// src/ota/OTAClient.ts
import RNFS from 'react-native-fs';
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

interface AppInfoSpec extends TurboModule { version: string }
const AppInfo = TurboModuleRegistry.getEnforcing<AppInfoSpec>('AppInfo');

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

  // Baixa para caminho temporario primeiro — valide antes de substituir o bundle ativo
  const tempPath = `${BUNDLE_DIR}/index.bundle.tmp`;
  await RNFS.downloadFile({ fromUrl: bundleUrl, toFile: tempPath }).promise;

  // Verifica checksum
  const serverMeta: BundleMeta = await fetch(`${serverUrl}/bundle.meta.json`)
    .then(r => r.json());
  const localChecksum = await RNFS.hash(tempPath, 'sha256');

  if (localChecksum !== serverMeta.checksum) {
    await RNFS.unlink(tempPath);
    throw new Error('Bundle checksum mismatch — download pode estar corrompido');
  }

  // Substitui atomicamente o bundle ativo
  if (await RNFS.exists(ACTIVE_BUNDLE_PATH)) {
    await RNFS.unlink(ACTIVE_BUNDLE_PATH);
  }
  await RNFS.moveFile(tempPath, ACTIVE_BUNDLE_PATH);

  // Persiste os novos metadados
  await RNFS.writeFile(METADATA_PATH, JSON.stringify(serverMeta), 'utf8');
}

function isNativeVersionCompatible(minVersion: string): boolean {
  const appVersion: string = AppInfo.version;
  return semverCompare(appVersion, minVersion) >= 0;
}
```

Carregando o bundle OTA no startup:

```kotlin
// Android — override do ReactNativeHost
override fun getJSBundleFile(): String? {
    val otaBundle = File(filesDir, "ota/index.bundle")
    return if (otaBundle.exists()) otaBundle.absolutePath else null
    // null faz fallback para assets/index.android.bundle embutido
}
```

```swift
// iOS — override do RCTBridgeDelegate
func sourceURL(for bridge: RCTBridge!) -> URL! {
    let otaURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        .first?.appendingPathComponent("ota/index.bundle")
    
    if let url = otaURL, FileManager.default.fileExists(atPath: url.path) {
        return url
    }
    
    // Fallback para o .jsbundle embutido
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
}
```

---

## 4. Publicacao e Consumo via Artifactory

Publicar uma biblioteca React Native ou SDK interno em um registry npm privado (JFrog Artifactory, GitHub Packages, Nexus) segue um padrao consistente independentemente do fornecedor do registry.

### Publicando no Artifactory

#### 1. Configure o registry

```bash
# .npmrc (raiz do projeto — commite este arquivo)
@mycompany:registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/
//artifactory.mycompany.com/artifactory/api/npm/npm-local/:always-auth=true

# Autentique (execute uma vez por desenvolvedor / ambiente de CI)
npm login --registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/ \
  --scope=@mycompany
```

Para CI, use um token de acesso com escopo armazenado em um gerenciador de segredos:

```bash
# No CI — injete o token sem login interativo
npm config set \
  //artifactory.mycompany.com/artifactory/api/npm/npm-local/:_authToken="${ARTIFACTORY_TOKEN}"
```

#### 2. Estrutura do pacote para uma biblioteca RN

```
react-native-my-sdk/
├── package.json
├── src/
│   ├── index.ts            ← entry point principal JS/TS
│   └── NativeMySDK.ts      ← spec do TurboModule
├── ios/
│   ├── RNMySDK.h
│   ├── RNMySDK.mm
│   └── react-native-my-sdk.podspec
├── android/
│   ├── build.gradle
│   └── src/main/java/com/mycompany/mySdk/MySDKModule.kt
├── codegen/                ← saida do Codegen (gerado, nao commitado)
└── .npmignore              ← exclui fonte, inclui apenas dist
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

#### 3. Build e publicacao

```bash
# Build do distribuivel JS (usa bob — React Native Builder Bob)
yarn build

# Verifique o que sera publicado
npm pack --dry-run

# Publique no Artifactory
npm publish --registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/
```

#### 4. Automatizando a publicacao no CI

```yaml
# .github/workflows/publish-sdk.yml
name: Publish SDK

on:
  push:
    tags:
      - 'v*'           # dispara apenas em tags de versao: v1.2.3

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

### Consumindo o SDK em um app React Native

```bash
# .npmrc do app
@mycompany:registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/

# Instale
npm install @mycompany/react-native-my-sdk

# pod install para iOS
cd ios && pod install
```

O `.podspec` do CocoaPods incluido na biblioteca e detectado automaticamente pelo `pod install`:

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

  # New Architecture: config do Codegen
  install_modules_dependencies(s)

  s.dependency "React-Core"
end
```

### Estrategia de versionamento

Use Semantic Versioning (`semver`) de forma rigorosa para bibliotecas consumidas por multiplos apps:

| Tipo de mudanca | Incremento de versao | Exemplo |
|---|---|---|
| API nativa adicionada (novo metodo TurboModule) | Minor: `1.2.0 → 1.3.0` | Adicionado `fetchAsync` |
| API nativa removida / assinatura alterada | Major: `1.x.x → 2.0.0` | Renomeado `getData` |
| Correcao de bug apenas JS | Patch: `1.2.0 → 1.2.1` | Corrigida verificacao de null |
| Novo binario nativo necessario | Major | Novo TurboModule, nova dependencia pod |

Publique versoes pre-release para testes antes de promover:

```bash
# Tag pre-release: 2.0.0-beta.1
npm version 2.0.0-beta.1 --no-git-tag-version
npm publish --tag beta

# Consumidores optam por usar:
npm install @mycompany/react-native-my-sdk@beta

# Promova para estavel apos verificacao:
npm dist-tag add @mycompany/react-native-my-sdk@2.0.0-beta.1 latest
```

---

## Materiais de Estudo

### Documentacao Oficial

| Recurso | Descricao |
|---|---|
| [Metro documentation](https://metrobundler.dev/) | Referencia completa de config do Metro — resolver, transformer, serialiser |
| [React Native Gradle Plugin](https://reactnative.dev/docs/new-architecture-library-intro) | Bloco `react {}`, tasks de bundle, integracao com Hermes |
| [Publishing libraries](https://reactnative.dev/docs/new-architecture-library-intro) | Codegen, podspec, versionamento para New Architecture |
| [React Native Builder Bob](https://github.com/callstack/react-native-builder-bob) | Ferramenta de build padrao para bibliotecas RN |

### Aprofundamentos

| Recurso | Autor | O que voce aprendera |
|---|---|---|
| [Metro deep dive — resolution, transforms, cache](https://www.callstack.com/blog/metro-bundler-deep-dive) | Callstack | Algoritmo de resolucao, pipeline de transformacao, invalidacao de cache |
| [React Native OTA updates — the complete guide](https://blog.swmansion.com/react-native-ota-updates-a-practical-guide-ad4536ffe4c2) | Software Mansion | Mecanica de hot-patch, rollback, versionamento com gate |
| [Publishing RN libraries to Artifactory](https://jfrog.com/blog/publishing-react-native-packages-to-jfrog-artifactory/) | JFrog | Config de escopo npm, gerenciamento de tokens no CI, fixacao de versao |
| [Bundle size analysis](https://www.callstack.com/blog/bundle-size-analysis-for-react-native) | Callstack | source-map-explorer, visualizador de bundle, tree shaking |
| [Code signing automation](https://fastlane.tools/codesigning/) | Fastlane | Match, certificados, provisioning profiles no CI |

### Tutoriais em Video

| Recurso | Duracao | O que voce aprendera |
|---|---|---|
| [Metro bundler internals](https://www.youtube.com/watch?v=jGT0JZp1e_E) | 25 min | Resolucao, transformacoes, por que os IDs de modulo importam |
| [React Native library development](https://www.youtube.com/watch?v=qPaFMeGRqTE) | 45 min | Configuracao completa de biblioteca com Builder Bob, Codegen, publicacao |
| [OTA updates in RN](https://www.youtube.com/watch?v=U3SjJMz8YVQ) | 30 min | Carregamento de bundle, versionamento com gate, estrategia de rollback |
| [ProGuard R8 for RN](https://www.youtube.com/watch?v=R3o8nIfmgqU) | 20 min | Keep rules, depuracao de stack traces ofuscados |

### Interativo

| Recurso | O que fazer |
|---|---|
| [source-map-explorer](https://github.com/danvk/source-map-explorer) | Execute localmente no seu bundle — encontre os maiores modulos |
| [Bundlephobia](https://bundlephobia.com/) | Verifique o tamanho de qualquer pacote npm antes de adicioná-lo como dependencia |
| [Semver calculator](https://semver.npmjs.com/) | Teste ranges de semver — entenda o que `^1.2.3` realmente resolve |

---

Proximo → [Pipeline de CI/CD](./03-cicd-pipeline.md)
