---
title: GitHub Actions para Builds iOS
---

# GitHub Actions para Builds iOS

Configurar um pipeline de CI/CD para iOS no GitHub Actions exige atenção a alguns pontos que diferem do Android: o Xcode só existe em runners macOS, o code signing é feito por certificados provisionados pela Apple e o CocoaPods adiciona uma camada de dependências nativas que precisa de cache dedicado.

## Por que macOS é obrigatório

O Xcode e todas as ferramentas de build iOS (`xcodebuild`, `xcrun`, `simctl`) são exclusivos do macOS. Runners Linux ou Windows não conseguem compilar um `.ipa`. Para especificar o runner correto:

```yaml
jobs:
  build-ios:
    runs-on: macos-latest
```

O `macos-latest` aponta para a versão de macOS mais recente suportada pelo GitHub Actions e inclui múltiplas versões do Xcode pré-instaladas. Para fixar uma versão específica:

```yaml
    runs-on: macos-15
    steps:
      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_16.3.app
```

Fixar a versão do Xcode evita que atualizações automáticas do runner quebrem builds por mudanças de API ou comportamento do compilador.

## Estratégias de cache

Runners macOS são significativamente mais caros em minutos de CI do que Linux. Cache bem configurado reduz o tempo de build de 20-30 minutos para 8-12 minutos nas execuções subsequentes.

### Cache de node_modules

```yaml
      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
```

A chave usa o hash do `package-lock.json` para invalidar o cache quando as dependências mudam.

### Cache de CocoaPods

O diretório `ios/Pods` contém as dependências nativas e pode ocupar 500 MB ou mais em projetos maiores. A chave deve considerar o `Podfile.lock`, que registra as versões exatas de cada pod resolvido:

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

Usar `~/.cocoapods` no path inclui o repositório de specs do CocoaPods, evitando o download do índice completo a cada run.

### Cache de binários Hermes pré-compilados

O React Native 0.76+ usa Hermes como engine padrão. Os binários do Hermes são baixados como artefatos durante o `pod install` e podem ser cacheados separadamente:

```yaml
      - name: Cache Hermes prebuilt binaries
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Caches/hermes
            ios/build/hermes
          key: ${{ runner.os }}-hermes-${{ hashFiles('node_modules/react-native/sdks/.hermesversion') }}
```

O arquivo `.hermesversion` dentro do pacote `react-native` determina qual binário do Hermes será utilizado, tornando-o a chave de invalidação correta.

## Code signing em CI

Code signing é a parte mais complexa do CI/CD para iOS. Existem duas abordagens principais: Fastlane Match (recomendado para times) e importação manual de certificados.

### Fastlane Match

O Match gerencia certificados e provisioning profiles em um repositório Git privado (ou bucket S3), criptografado com senha. Em CI, ele baixa e instala automaticamente os assets de signing:

Secrets necessários no GitHub:
- `MATCH_PASSWORD`: senha de criptografia do repositório Match
- `MATCH_GIT_URL`: URL do repositório Git privado com os certificados
- `MATCH_GIT_BASIC_AUTHORIZATION`: token de acesso em Base64 para o repositório Match
- `APP_STORE_CONNECT_API_KEY_KEY_ID`: ID da chave da API App Store Connect
- `APP_STORE_CONNECT_API_KEY_ISSUER_ID`: Issuer ID da API
- `APP_STORE_CONNECT_API_KEY_KEY`: conteúdo da chave privada `.p8`

`Fastfile` com lanes para TestFlight e App Store:

```ruby
default_platform(:ios)

platform :ios do
  desc "Build e upload para TestFlight"
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

  desc "Build e upload para App Store (release)"
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

### Importação manual de certificados

Para projetos que não usam Match, é possível importar certificados e profiles diretamente via secrets:

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

## Workflow completo

### Trigger: push para main vai para TestFlight; tag vai para App Store

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
    name: Build e Deploy iOS
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

      - name: Setup Ruby e Fastlane
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true
          working-directory: ios

      - name: Run Fastlane Match e Build para TestFlight
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

      - name: Run Fastlane Match e Build para App Store
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

      - name: Upload IPA como artefato
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ios-build
          path: ios/build/*.ipa
          retention-days: 7
```

## Jobs paralelos: iOS e Android

Quando o repositório mantém apps iOS e Android no mesmo monorepo, é possível executar os builds em paralelo, reduzindo o tempo total de CI:

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

Os dois jobs rodam simultaneamente. O GitHub Actions aloca runners independentes para cada job, e o iOS job não precisa aguardar o Android terminar.

## GitHub Actions vs Xcode Cloud

| Critério | GitHub Actions | Xcode Cloud |
|---|---|---|
| Integração com repositório | Qualquer host Git | GitHub, Bitbucket, GitLab |
| Custo | Pago por minuto de runner macOS (~10x Linux) | Incluído no plano Apple Developer (25h/mês grátis) |
| Configuração | YAML no repositório | Interface gráfica no Xcode / App Store Connect |
| Controle de ambiente | Total (escolha de SO, Xcode, ferramentas) | Limitado às versões suportadas pela Apple |
| Suporte Android | Sim (runners Linux) | Nao (apenas Apple platforms) |
| Secrets e variáveis | GitHub Secrets nativo | Variáveis de ambiente no App Store Connect |
| Notificações | GitHub Checks, Slack, email | App Store Connect, TestFlight |
| Fastlane | Compatível e amplamente usado | Parcialmente suportado (sem `gym`; usa `xcodebuild` internamente) |
| Artefatos de build | `actions/upload-artifact` | Armazenamento gerenciado pela Apple |

Para times que desenvolvem apenas para plataformas Apple e usam Xcode como IDE principal, o Xcode Cloud simplifica a configuração e elimina o gerenciamento de runners. Para times cross-platform com Android + iOS no mesmo repositório, o GitHub Actions oferece um pipeline unificado com maior flexibilidade.

## Solução de problemas comuns

**Code signing falha com "No signing certificate found"**

Verificar se o Match foi executado com `readonly: false` ao menos uma vez para criar os certificados no repositório de destino. Em CI, usar sempre `readonly: true`.

**Pod install falha com "CDN: trunk Repo update failed"**

Adicionar `--repo-update` ao comando `pod install` ou forçar o uso do repositório de specs local via `source 'https://cdn.cocoapods.org/'` no `Podfile`.

**Build demora mais de 30 minutos mesmo com cache**

Verificar se o cache de CocoaPods está sendo restaurado corretamente. Se o `Podfile.lock` mudar frequentemente, considerar separar o cache de `~/.cocoapods` (specs do repositório) do cache de `ios/Pods` (dependências compiladas), pois o repositório de specs muda com muito menos frequência.

**Xcode Cloud não encontra o scheme**

O scheme precisa estar marcado como "Shared" no Xcode (`Product > Scheme > Manage Schemes > Shared`). Schemes não compartilhados existem apenas na máquina local e não são commitados no repositório.
