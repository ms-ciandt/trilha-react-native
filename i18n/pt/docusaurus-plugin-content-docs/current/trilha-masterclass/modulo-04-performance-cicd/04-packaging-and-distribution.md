---
title: "Bundle — Packaging & Distribution"
---

## 3. Empacotamento com Metadados e Patches

### Metadados do bundle

Incorporar metadados ao bundle permite rastrear exatamente qual codigo esta rodando em producao — critico para deployments OTA onde as versoes JS e nativa podem divergir.

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

    // Prepende metadados como uma expressao JS auto-executavel
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

#### Anexando metadados como um arquivo JSON sidecar separado

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

As atualizacoes OTA funcionam substituindo o bundle JS no dispositivo sem passar pela App Store. O React Native suporta isso nativamente — o bundle JS e apenas um arquivo e pode ser atualizado em tempo de execucao.

**A restricao legal:** As diretrizes de revisao da App Store exigem que as atualizacoes OTA nao alterem o proposito fundamental do app nem adicionem funcionalidades que nao foram revisadas. Correccoes de bugs que preservam o comportamento sao universalmente aceitas.

#### Carregador OTA customizado

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

  // Baixa para um caminho temporario primeiro — valida antes de substituir o bundle ativo
  const tempPath = `${BUNDLE_DIR}/index.bundle.tmp`;
  await RNFS.downloadFile({ fromUrl: bundleUrl, toFile: tempPath }).promise;

  // Verifica o checksum
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

Carregando o bundle OTA na inicializacao:

```kotlin
// Android — override de ReactNativeHost
override fun getJSBundleFile(): String? {
    val otaBundle = File(filesDir, "ota/index.bundle")
    return if (otaBundle.exists()) otaBundle.absolutePath else null
    // null faz fallback para assets/index.android.bundle incluido no app
}
```

```swift
// iOS — override de RCTBridgeDelegate
func sourceURL(for bridge: RCTBridge!) -> URL! {
    let otaURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        .first?.appendingPathComponent("ota/index.bundle")
    
    if let url = otaURL, FileManager.default.fileExists(atPath: url.path) {
        return url
    }
    
    // Faz fallback para o .jsbundle incluido no app
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
}
```

---

## 4. Publicacao e Consumo via Artifactory

Publicar uma biblioteca React Native ou SDK interno em um registro npm privado (JFrog Artifactory, GitHub Packages, Nexus) segue um padrao consistente independentemente do fornecedor do registro.

### Publicando no Artifactory

#### 1. Configurar o registro

```bash
# .npmrc (raiz do projeto — commite este arquivo)
@mycompany:registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/
//artifactory.mycompany.com/artifactory/api/npm/npm-local/:always-auth=true

# Autenticar (execute uma vez por desenvolvedor / ambiente de CI)
npm login --registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/ \
  --scope=@mycompany
```

Para CI, use um token de acesso com escopo armazenado em um gerenciador de segredos:

```bash
# Em CI — injeta o token sem login interativo
npm config set \
  //artifactory.mycompany.com/artifactory/api/npm/npm-local/:_authToken="${ARTIFACTORY_TOKEN}"
```

#### 2. Estrutura de pacote para uma biblioteca RN

```
react-native-my-sdk/
├── package.json
├── src/
│   ├── index.ts            ← ponto de entrada principal JS/TS
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
# Gera o distributavel JS (usa bob — React Native Builder Bob)
yarn build

# Verifica o que sera publicado
npm pack --dry-run

# Publica no Artifactory
npm publish --registry=https://artifactory.mycompany.com/artifactory/api/npm/npm-local/
```

#### 4. Automatizando a publicacao em CI

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

# Instalacao
npm install @mycompany/react-native-my-sdk

# Pod install para iOS
cd ios && pod install
```

O `.podspec` do CocoaPods incluido na biblioteca e encontrado automaticamente pelo `pod install`:

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

  # Nova Arquitetura: config do Codegen
  install_modules_dependencies(s)

  s.dependency "React-Core"
end
```

### Estrategia de versionamento

Use Semantic Versioning (`semver`) de forma rigorosa para bibliotecas consumidas por varios apps:

| Tipo de mudanca | Bump de versao | Exemplo |
|---|---|---|
| API nativa adicionada (novo metodo de TurboModule) | Minor: `1.2.0 → 1.3.0` | Adicionado `fetchAsync` |
| API nativa removida / assinatura alterada | Major: `1.x.x → 2.0.0` | `getData` renomeado |
| Correcao de bug apenas em JS | Patch: `1.2.0 → 1.2.1` | Verificacao de null corrigida |
| Novo binario nativo necessario | Major | Novo TurboModule, nova dependencia de pod |

Publique versoes pre-release para testes antes de promover:

```bash
# Tag de pre-release: 2.0.0-beta.1
npm version 2.0.0-beta.1 --no-git-tag-version
npm publish --tag beta

# Consumidores optam pela versao beta:
npm install @mycompany/react-native-my-sdk@beta

# Promova para estavel apos verificacao:
npm dist-tag add @mycompany/react-native-my-sdk@2.0.0-beta.1 latest
```

---

## Materiais de Estudo

### Documentacao Oficial

| Recurso | Descricao |
|---|---|
| [Metro documentation](https://metrobundler.dev/) | Referencia completa de configuracao do Metro — resolver, transformer, serializador |
| [React Native Gradle Plugin](https://reactnative.dev/docs/new-architecture-library-intro) | Bloco `react {}`, tarefas de bundle, integracao com Hermes |
| [Publishing libraries](https://reactnative.dev/docs/new-architecture-library-intro) | Codegen, podspec, versionamento para a Nova Arquitetura |
| [React Native Builder Bob](https://github.com/callstack/react-native-builder-bob) | Ferramenta de build padrao para bibliotecas RN |

### Aprofundamentos

| Recurso | Autor | O que voce vai aprender |
|---|---|---|
| [Metro deep dive — resolution, transforms, cache](https://www.callstack.com/blog/metro-bundler-deep-dive) | Callstack | Algoritmo de resolucao, pipeline de transform, invalidacao de cache |
| [React Native OTA updates — the complete guide](https://blog.swmansion.com/react-native-ota-updates-a-practical-guide-ad4536ffe4c2) | Software Mansion | Mecanica de hot-patch, rollback, controle de versao |
| [Publishing RN libraries to Artifactory](https://jfrog.com/blog/publishing-react-native-packages-to-jfrog-artifactory/) | JFrog | Configuracao de escopo npm, gerenciamento de tokens em CI, pinagem de versao |
| [Bundle size analysis](https://www.callstack.com/blog/bundle-size-analysis-for-react-native) | Callstack | source-map-explorer, visualizador de bundle, tree shaking |
| [Code signing automation](https://fastlane.tools/codesigning/) | Fastlane | Match, certificados, perfis de provisionamento em CI |

### Video Tutoriais

| Recurso | Duracao | O que voce vai aprender |
|---|---|---|
| [Metro bundler internals](https://www.youtube.com/watch?v=jGT0JZp1e_E) | 25 min | Resolucao, transforms, por que IDs de modulo importam |
| [React Native library development](https://www.youtube.com/watch?v=qPaFMeGRqTE) | 45 min | Configuracao completa de biblioteca com Builder Bob, Codegen, publicacao |
| [OTA updates in RN](https://www.youtube.com/watch?v=U3SjJMz8YVQ) | 30 min | Carregamento de bundle, controle de versao, estrategia de rollback |
| [ProGuard R8 for RN](https://www.youtube.com/watch?v=R3o8nIfmgqU) | 20 min | Regras de keep, depurando stack traces ofuscados |

### Interativo

| Recurso | O que fazer |
|---|---|
| [source-map-explorer](https://github.com/danvk/source-map-explorer) | Execute localmente contra seu bundle — encontre os modulos maiores |
| [Bundlephobia](https://bundlephobia.com/) | Verifique o tamanho de qualquer pacote npm antes de adicioná-lo como dependencia |
| [Semver calculator](https://semver.npmjs.com/) | Teste ranges de semver — entenda o que `^1.2.3` realmente resolve |

---

Proximo → [CI/CD Pipeline](./cicd-pipeline)
