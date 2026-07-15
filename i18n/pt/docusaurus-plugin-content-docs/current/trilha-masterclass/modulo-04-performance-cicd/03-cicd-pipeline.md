---
title: Pipeline de CI/CD
---

# Pipeline de CI/CD

> **Modulo 04 — React Native Masterclass**
> Publico-alvo: engenheiros senior que constroem pipelines de release automatizados para apps React Native.
> Ferramentas: GitHub Actions, Fastlane, Gradle, Xcode CLI. React Native 0.76+.

---

## 1. Pipeline de Build e Bundle

### O pipeline completo

Um pipeline de CI RN de nivel de producao tem sete portas. Cada porta deve passar antes que a proxima execute:

```
┌─────────────────────────────────────────────────────────────────┐
│ Porta 1: Analise Estatica                                        │
│  Compilacao TypeScript (tsc --noEmit)                            │
│  ESLint                                                          │
│  Auditoria de dependencias (npm audit)                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ passou
┌──────────────────────────────▼──────────────────────────────────┐
│ Porta 2: Testes Unitarios e de Integracao                        │
│  Jest (--ci --coverage)                                          │
│  Porta de threshold de cobertura (falha se < 70%)                │
└──────────────────────────────┬──────────────────────────────────┘
                               │ passou
┌──────────────────────────────▼──────────────────────────────────┐
│ Porta 3: Build do Bundle JS                                      │
│  Metro bundle (Android + iOS)                                    │
│  Porta de tamanho do bundle (falha se > threshold configurado)   │
│  Upload de source map (Sentry / Bugsnag)                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ passou
┌──────────────────────────────▼──────────────────────────────────┐
│ Porta 4: Build Nativo                                            │
│  Android: ./gradlew bundleRelease (AAB)                          │
│  iOS: xcodebuild archive + xcodebuild -exportArchive             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ passou
┌──────────────────────────────▼──────────────────────────────────┐
│ Porta 5: Verificacoes Pre-publicacao (Preflight)                 │
│  Verificacao de unicidade de versao                              │
│  Validacao do binario APK/IPA (aapt2, lipo)                     │
│  Diff de permissoes (novas permissoes exigem revisao)            │
│  Validade do certificado de assinatura                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ passou
┌──────────────────────────────▼──────────────────────────────────┐
│ Porta 6: Distribuicao Interna                                    │
│  Android → Firebase App Distribution / track interno             │
│  iOS → TestFlight                                                │
└──────────────────────────────┬──────────────────────────────────┘
                               │ aprovacao do QA
┌──────────────────────────────▼──────────────────────────────────┐
│ Porta 7: Release de Producao                                     │
│  Android → Play Store (rollout escalonado: 10% → 50% → 100%)   │
│  iOS → App Store Connect (phased release)                        │
└─────────────────────────────────────────────────────────────────┘
```

### GitHub Actions — workflow completo

Este e um workflow completo e pronto para producao. Ele usa Fastlane para distribuicao nativa e executa os builds Android e iOS em paralelo:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'   # v1.2.3, v10.0.1

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: true          # cancela releases em andamento se uma nova tag for enviada

env:
  NODE_VERSION: '20'
  JAVA_VERSION: '17'
  RUBY_VERSION: '3.3'

jobs:
  # ── Porta 1 & 2: Lint + Testes ───────────────────────────────────────
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

  # ── Porta 3: Bundle JS ────────────────────────────────────────────────
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
          MAX_SIZE=$((5 * 1024 * 1024))   # limite de 5 MB — ajuste para o seu app
          echo "Android bundle: $(( ANDROID_SIZE / 1024 )) KB"
          echo "iOS bundle:     $(( IOS_SIZE / 1024 )) KB"
          if [ $ANDROID_SIZE -gt $MAX_SIZE ] || [ $IOS_SIZE -gt $MAX_SIZE ]; then
            echo "FAIL: bundle excede o limite de tamanho"
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

  # ── Porta 4+: Build Nativo Android ───────────────────────────────────
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

  # ── Porta 4+: Build Nativo iOS ────────────────────────────────────────
  ios:
    name: iOS Release
    runs-on: macos-14              # runner Apple Silicon
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

## 2. Versionamento e Release

### Semantic versioning para apps nativos

Apps moveis tem dois numeros de versao com significados distintos:

| Numero | Android | iOS | Proposito |
|---|---|---|---|
| **Version name / CFBundleShortVersionString** | `1.3.0` | `1.3.0` | Legivel por humanos, exibido nas lojas |
| **Version code / CFBundleVersion** | `230` (inteiro) | `230` (numero de build) | Unico por upload, usado para rastreamento do binario |

Nunca reutilize um version code/build number. Mesmo apos um upload com falha, incremente antes de tentar novamente.

### Versionamento automatizado no CI

```bash
# Script de CI: version.sh
# Fonte de verdade: tag git (v1.3.0)
# Build number: sequencial a partir do numero de execucao do CI

TAG="${GITHUB_REF_NAME}"              # ex: v1.3.0
VERSION="${TAG#v}"                     # remove o 'v' inicial → 1.3.0
BUILD_NUMBER="${GITHUB_RUN_NUMBER}"   # inteiro sequencial do GitHub Actions

echo "Version: $VERSION, Build: $BUILD_NUMBER"
```

```ruby
# fastlane/Fastfile — atualiza versao Android
lane :set_android_version do
  version = ENV['VERSION']
  build   = ENV['BUILD_NUMBER'].to_i

  # Edita diretamente android/app/build.gradle
  android_set_version_name(version_name: version)
  android_set_version_code(version_code: build)
end

# fastlane/Fastfile — atualiza versao iOS
lane :set_ios_version do
  version = ENV['VERSION']
  build   = ENV['BUILD_NUMBER']

  increment_version_number(version_number: version, xcodeproj: 'ios/YourApp.xcodeproj')
  increment_build_number(build_number: build, xcodeproj: 'ios/YourApp.xcodeproj')
end
```

### `package.json` como unica fonte de verdade de versao

Para equipes que preferem conduzir versoes a partir do `package.json`:

```javascript
// version-sync.js — execute no CI antes dos builds nativos
const fs = require('fs');
const { execSync } = require('child_process');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const version = packageJson.version;   // ex: "1.3.0"
const build = process.env.GITHUB_RUN_NUMBER ?? '0';

// Android — atualiza build.gradle
let gradle = fs.readFileSync('android/app/build.gradle', 'utf-8');
gradle = gradle
  .replace(/versionName ".+"/, `versionName "${version}"`)
  .replace(/versionCode \d+/, `versionCode ${build}`);
fs.writeFileSync('android/app/build.gradle', gradle);

// iOS — usa PlistBuddy
execSync(`/usr/libexec/PlistBuddy -c "Set CFBundleShortVersionString ${version}" ios/YourApp/Info.plist`);
execSync(`/usr/libexec/PlistBuddy -c "Set CFBundleVersion ${build}" ios/YourApp/Info.plist`);

console.log(`Set version ${version} build ${build}`);
```

### Fastlane para automacao de release

Fastlane e a camada padrao de automacao para CI mobile. Ele abstrai `xcodebuild`, `gradlew`, App Store Connect API e Play Developer API em lanes compostos com DSL Ruby.

```ruby
# fastlane/Fastfile
default_platform(:ios)

# ── Setup compartilhado ───────────────────────────────────────────────────
before_all do
  ensure_bundle_exec
end

# ── Android ───────────────────────────────────────────────────────────────
platform :android do

  desc "Build um AAB assinado e distribui via Firebase App Distribution"
  lane :release do
    # 1. Define numeros de versao a partir do ambiente de CI
    android_set_version_name(version_name: ENV['VERSION'])
    android_set_version_code(version_code: ENV['BUILD_NUMBER'].to_i)

    # 2. Build do AAB assinado
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

    # 3. Verificacoes preflight (ver Secao 4)
    run_preflight_checks(platform: :android)

    # 4. Distribui para testadores internos via Firebase
    firebase_app_distribution(
      app: ENV['FIREBASE_APP_ID'],
      groups: "internal-qa",
      release_notes: changelog_from_git_commits(
        merge_commit_filtering: "exclude_merges",
        commits_count: 10
      ),
      firebase_cli_token: ENV['FIREBASE_TOKEN']
    )

    # 5. Upload para o track interno da Play Store
    upload_to_play_store(
      track: "internal",
      aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true,
    )

    # 6. Cria tag de release no git
    add_git_tag(tag: "android/#{ENV['VERSION']}/#{ENV['BUILD_NUMBER']}")
  end

  desc "Promove o track interno para producao com rollout escalonado"
  lane :promote_to_production do
    upload_to_play_store(
      track: 'internal',
      track_promote_to: 'production',
      rollout: '0.1',   # rollout inicial de 10%
    )
  end
end

# ── iOS ───────────────────────────────────────────────────────────────────
platform :ios do

  desc "Build um IPA assinado e faz upload para o TestFlight"
  lane :release do
    # 1. Define numeros de versao
    increment_version_number(
      version_number: ENV['VERSION'],
      xcodeproj: "ios/YourApp.xcodeproj"
    )
    increment_build_number(
      build_number: ENV['BUILD_NUMBER'],
      xcodeproj: "ios/YourApp.xcodeproj"
    )

    # 2. Sincroniza certificados de code signing via Match
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

    # 3. Build do archive
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

    # 4. Verificacoes preflight
    run_preflight_checks(platform: :ios)

    # 5. Upload para o TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      groups: ["Internal QA"],
      changelog: changelog_from_git_commits(commits_count: 10)
    )
  end
end

# ── Helpers compartilhados ────────────────────────────────────────────────
def run_preflight_checks(platform:)
  # Implementado na Secao 4
  sh("node scripts/preflight.js --platform #{platform}")
end
```

### Code signing — Fastlane Match

Gerenciar certificados manualmente em uma equipe e suscetivel a erros. O `match` armazena todos os certificados e provisioning profiles em um repositorio Git privado (criptografado), e cada desenvolvedor e runner de CI sincroniza a partir dele:

```bash
# Inicializa o match (execute uma vez)
bundle exec fastlane match init

# Adiciona certificado + perfil da App Store
bundle exec fastlane match appstore

# Adiciona certificado + perfil Ad-hoc (para distribuicao a testadores)
bundle exec fastlane match adhoc
```

No CI, defina `MATCH_GIT_BASIC_AUTHORIZATION` como um `username:token` codificado em base64 com acesso de leitura ao repositorio privado de certificados. Nenhuma interacao humana necessaria.

---

## 3. Deploy em Projetos Nativos

### Implantando bundles OTA em infraestrutura propria

Para equipes que operam sua propria infraestrutura OTA (em vez de usar um servico de terceiros):

```bash
# deploy-bundle.sh — chamado apos a Porta 3
set -euo pipefail

PLATFORM="${1:?informe android ou ios}"
VERSION="${VERSION:?}"
GIT_SHA="${GITHUB_SHA:?}"
BUILD_NUMBER="${GITHUB_RUN_NUMBER:?}"
S3_BUCKET="s3://bundles.mycompany.com/rn-bundles"
BUNDLE_ID="${VERSION}-${BUILD_NUMBER}-${GIT_SHA:0:8}"

# Gera o bundle
npx react-native bundle \
  --platform "$PLATFORM" \
  --dev false \
  --entry-file index.js \
  --bundle-output "/tmp/${PLATFORM}.bundle" \
  --sourcemap-output "/tmp/${PLATFORM}.bundle.map" \
  --minify true

# Gera checksum
CHECKSUM=$(sha256sum "/tmp/${PLATFORM}.bundle" | awk '{print $1}')

# Sidecar de metadados
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

# Upload para S3 com headers de cache imutavel
aws s3 cp "/tmp/${PLATFORM}.bundle" \
  "${S3_BUCKET}/${BUNDLE_ID}/${PLATFORM}.bundle" \
  --cache-control "public, max-age=31536000, immutable"

aws s3 cp "/tmp/bundle.meta.json" \
  "${S3_BUCKET}/${BUNDLE_ID}/bundle.meta.json"

# Atualiza o ponteiro 'stable' (ultimo bundle que passou pelo QA)
aws s3 cp "/tmp/bundle.meta.json" \
  "${S3_BUCKET}/stable/${PLATFORM}/bundle.meta.json"

echo "Deployed: ${S3_BUCKET}/${BUNDLE_ID}/"
```

### Implantando binarios nativos para distribuicao interna

```ruby
# fastlane — implantacao interna Android
lane :deploy_internal_android do
  # AAB ja construido pelo lane de release
  supply(
    track: 'internal',
    aab: 'android/app/build/outputs/bundle/release/app-release.aab',
    json_key: ENV['PLAY_STORE_JSON_KEY'],
    package_name: 'com.yourcompany.yourapp',
  )
end

# fastlane — rollout de producao escalonado
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

Invoque a progressao de rollout a partir do CI:

```bash
# Dispara rollout de 10%
bundle exec fastlane android rollout_android percentage:10

# Apos monitoramento (1 dia) — promove para 50%
bundle exec fastlane android rollout_android percentage:50

# Rollout completo
bundle exec fastlane android rollout_android percentage:100
```

### Estrategia de rollback

```bash
# Android — interrompe o rollout (impede novas instalacoes mas nao remove de dispositivos existentes)
# Via Play Console API:
curl -X PATCH \
  "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.yourapp/edits/{editId}/tracks/production" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"releases": [{"status": "halted"}]}'

# iOS — remove do TestFlight (nao e possivel remover da producao apos aprovacao)
# Via App Store Connect API: define o status do build como DEVELOPER_REMOVED_FROM_SALE

# Rollback OTA — reverte o ponteiro 'stable' para a versao anterior
PREVIOUS_BUNDLE_ID=$(cat previous-bundle-id.txt)
aws s3 cp \
  "s3://bundles.mycompany.com/rn-bundles/${PREVIOUS_BUNDLE_ID}/bundle.meta.json" \
  "s3://bundles.mycompany.com/rn-bundles/stable/android/bundle.meta.json"
```

---

## 4. Verificacoes Pre-publicacao (Preflight)

As verificacoes pre-publicacao rodam apos o binario nativo ser construido, mas antes de ser submetido a qualquer canal de distribuicao. Elas detectam problemas que os testes automatizados nao capturam.

### Script de preflight

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

// ── Verificacoes Android ──────────────────────────────────────────────────
function androidChecks() {
  const AAB_PATH = 'android/app/build/outputs/bundle/release/app-release.aab';

  return [
    {
      name: 'AAB exists',
      check: () => fs.existsSync(AAB_PATH),
      message: 'Artefato de build ausente — a task Gradle foi executada?',
    },
    {
      name: 'AAB minimum size',
      check: () => {
        const size = fs.statSync(AAB_PATH).size;
        return size > 1024 * 1024;    // deve ser > 1 MB (verificacao de sanidade — bundle vazio seria minusculo)
      },
      message: 'AAB esta suspeitamente pequeno — bundle pode estar vazio ou corrompido',
    },
    {
      name: 'AAB maximum size',
      check: () => {
        const size = fs.statSync(AAB_PATH).size;
        const limit = parseInt(process.env.MAX_AAB_SIZE_MB ?? '150', 10) * 1024 * 1024;
        return size < limit;
      },
      message: `AAB excede o limite de tamanho (MAX_AAB_SIZE_MB=${process.env.MAX_AAB_SIZE_MB ?? '150'})`,
    },
    {
      name: 'Version code is unique',
      check: () => {
        const versionCode = getAndroidVersionCode(AAB_PATH);
        const publishedCodes = getPublishedVersionCodes(); // chama a Play Developer API
        return !publishedCodes.includes(versionCode);
      },
      message: 'Version code ja existe na Play Store — incremente antes de re-fazer upload',
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
          console.error('Novas permissoes perigosas:', newDangerous);
          return false;
        }
        return true;
      },
      message: 'Novas permissoes perigosas detectadas — atualize a baseline apos revisao',
    },
    {
      name: 'Keystore signed (not debug keystore)',
      check: () => {
        const output = execSync(
          `keytool -printcert -jarfile ${AAB_PATH} 2>&1 || true`
        ).toString();
        return !output.includes('CN=Android Debug');
      },
      message: 'AAB esta assinado com o keystore de debug — sera rejeitado pela Play Store',
    },
  ];
}

// ── Verificacoes iOS ──────────────────────────────────────────────────────
function iosChecks() {
  const IPA_PATH = execSync(
    "find /tmp/ios-build -name '*.ipa' | head -1"
  ).toString().trim();

  return [
    {
      name: 'IPA exists',
      check: () => IPA_PATH && fs.existsSync(IPA_PATH),
      message: 'IPA nao encontrado — o xcodebuild -exportArchive foi bem-sucedido?',
    },
    {
      name: 'IPA minimum size',
      check: () => {
        const size = fs.statSync(IPA_PATH).size;
        return size > 5 * 1024 * 1024;   // deve ser > 5 MB
      },
      message: 'IPA esta suspeitamente pequeno',
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
      message: 'Bundle ID no IPA nao corresponde ao valor esperado — o scheme errado pode ter sido compilado',
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
        return parsed.ProvisionsAllDevices === undefined;  // true = distribuicao, nao ad-hoc/enterprise
      },
      message: 'IPA usa provisioning profile ad-hoc — nao pode ser submetido a App Store',
    },
    {
      name: 'No debug symbols leaking',
      check: () => {
        // .dSYM deve ser um artefato separado, nao embutido no IPA
        const output = execSync(`unzip -l "${IPA_PATH}" | grep -c '.dSYM' || true`).toString();
        return parseInt(output.trim(), 10) === 0;
      },
      message: 'Simbolos .dSYM embutidos no IPA — aumenta o tamanho do binario e pode expor caminhos de fonte',
    },
    {
      name: 'Build number is unique',
      check: () => {
        const buildNumber = getBuildNumber(IPA_PATH);
        const existingBuilds = getTestFlightBuilds(); // chama a App Store Connect API
        return !existingBuilds.includes(buildNumber);
      },
      message: 'Build number ja foi enviado para o TestFlight — incremente CFBundleVersion',
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
    console.error(`\n${failed} verificacao(oes) preflight com falha. Abortando.`);
    process.exit(1);
  }

  console.log('\nTodas as verificacoes preflight passaram.');
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
  // ... expanda com sua politica de seguranca
];
```

Execute no Fastlane:

```ruby
# fastlane/Fastfile
private_lane :preflight do |options|
  platform = options[:platform].to_s
  
  UI.message "Executando verificacoes preflight para #{platform}..."
  sh("node scripts/preflight.js --platform #{platform}")
  UI.success "Preflight passou!"
end
```

### Baseline de permissoes — prevenindo acumulo de permissoes

O arquivo de baseline de permissoes e versionado e atualizado manualmente apos revisao:

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

Se o preflight detectar uma nova permissao perigosa, o CI falha e um humano deve revisar a permissao, atualizar a baseline e commita-la. Isso impede que adicoes acidentais de permissoes provenientes de uma atualizacao de biblioteca passem despercebidas para producao.

### Automacao de changelog

Gera automaticamente um changelog de release a partir dos commits git:

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

# Agrupa por tipo de conventional commit
echo "### Funcionalidades"
git log "$RANGE" --oneline --no-merges \
  | grep "^[a-f0-9]* feat" \
  | sed 's/^[a-f0-9]* /- /'

echo ""
echo "### Correcoes de Bug"
git log "$RANGE" --oneline --no-merges \
  | grep "^[a-f0-9]* fix" \
  | sed 's/^[a-f0-9]* /- /'

echo ""
echo "### Performance"
git log "$RANGE" --oneline --no-merges \
  | grep "^[a-f0-9]* perf" \
  | sed 's/^[a-f0-9]* /- /'
```

### Notificacao no Slack ao fazer release

```yaml
# .github/workflows/release.yml (trecho)
  notify:
    name: Notify
    runs-on: ubuntu-latest
    needs: [android, ios]
    if: always()   # executa mesmo se android/ios falharam
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

## Materiais de Estudo

### Documentacao Oficial

| Recurso | Descricao |
|---|---|
| [Fastlane documentation](https://docs.fastlane.tools/) | Referencia completa de todas as actions, plugins e integracoes de plataforma |
| [Fastlane Match](https://docs.fastlane.tools/actions/match/) | Certificados de code signing via repositorio git privado |
| [GitHub Actions — secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) | Armazenamento e uso de keystores, chaves de API e tokens no CI |
| [Play Developer API](https://developers.google.com/android-publisher) | Acesso programatico ao rollout escalonado e gerenciamento de tracks |
| [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi) | TestFlight, gerenciamento de versao, phased release |
| [Sentry source maps](https://docs.sentry.io/platforms/react-native/sourcemaps/) | Upload de source maps RN para simbolizacao de crashes |

### Aprofundamentos

| Recurso | Autor | O que voce aprendera |
|---|---|---|
| [React Native CI/CD — the practical guide](https://www.callstack.com/blog/react-native-ci-cd) | Callstack | Configuracao GitHub Actions + Fastlane, assinatura, distribuicao |
| [Automating iOS code signing](https://codesigning.guide/) | Felix Krause (autor do Fastlane) | O guia definitivo do Match e gerenciamento de certificados |
| [Android staged rollouts](https://support.google.com/googleplay/android-developer/answer/6346149) | Google | Mecanica de rollout, interrupcao, retomada, release completo |
| [Preflight checks for mobile](https://thoughtbot.com/blog/preflight-checklist-mobile-releases) | Thoughtbot | Checklist abrangente — permissoes, assinatura, tamanho, versao |
| [RN release automation](https://blog.swmansion.com/react-native-release-automation-e6b3a7e3b3e2) | Software Mansion | Pipeline de ponta a ponta: test → bundle → sign → distribute |

### Tutoriais em Video

| Recurso | Duracao | O que voce aprendera |
|---|---|---|
| [React Native CI/CD with GitHub Actions](https://www.youtube.com/watch?v=5R1EFQF-q9A) | 45 min | Pipeline completo: lint → test → build → distribute |
| [Fastlane for React Native](https://www.youtube.com/watch?v=QqUXVRRFbgA) | 35 min | Match, gym, pilot, supply — todas as actions do Fastlane explicadas |
| [Android staged rollout](https://www.youtube.com/watch?v=4Nz_dkM2p2E) | 15 min | Walkthrough do Play Console — gerenciamento de tracks, interrupcao, promocao |
| [iOS phased release](https://www.youtube.com/watch?v=Gk2Pz3JnJPo) | 12 min | TestFlight → App Store, configuracao de phased release |
| [Sentry for RN — crash reporting](https://www.youtube.com/watch?v=GM0BrNxiTrc) | 20 min | Configuracao, source maps, monitoramento de performance |

### Interativo

| Recurso | O que fazer |
|---|---|
| [Fastlane action catalogue](https://docs.fastlane.tools/actions/) | Explore todas as actions disponíveis — pesquise por palavra-chave |
| [GitHub Actions marketplace](https://github.com/marketplace?type=actions&query=react+native) | Actions da comunidade para CI com RN |
| [semver.org](https://semver.org/) | Especificacao autoritativa do semver — leia antes de escrever suas regras de versionamento |
| [aapt2 reference](https://developer.android.com/tools/aapt2) | Android Asset Packaging Tool — usado no preflight para inspecionar conteudo do AAB |
| [Play Console staged rollouts](https://play.google.com/console) | Pratique gerenciamento de rollout no seu proprio projeto |

---

← [Bundle e Distribuicao](./02-bundle-distribution.md) | Modulo 04 concluido
