---
title: Validação com Build nas Duas Plataformas
---

# Validação com Build nas Duas Plataformas

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc05_05_build-validation.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc05_05_build-validation.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> Um `yarn install` bem-sucedido e um `pod install` verde não são validação. Validação significa um build limpo nas duas plataformas, testes passando e um smoke test em um dispositivo físico. Nessa ordem.

---

## Por que "Funciona na Minha Máquina" Não é Suficiente

Após um upgrade, três modos de falha existem e só se manifestam em uma plataforma ou dispositivo específico:

1. **Falhas em tempo de build** — versão errada do plugin Gradle, configuração ausente no Xcode, conflito de resolução do CocoaPods
2. **Crashes em tempo de execução** — módulo nativo não encontrado, incompatibilidade de tipo JSI, overflow de layout com edge-to-edge
3. **Regressões de comportamento** — uma tela que renderiza mas faz scroll incorretamente, um gesto de navegação que mudou

Você precisa verificar os três nas duas plataformas antes de publicar.

---

## Etapa 1: Limpar os Caches de Build

Artefatos cacheados da versão anterior causarão falhas não-determinísticas — você pode obter um build verde pelo motivo errado ou um build vermelho sem motivo aparente.

```bash
# JavaScript / cache do Metro
npx react-native start --reset-cache &

# Android — limpar caches do Gradle
cd android
./gradlew clean
cd ..

# iOS — limpar DerivedData e Pods
cd ios
rm -rf build/
rm -rf ~/Library/Developer/Xcode/DerivedData/*
pod deintegrate
pod install
cd ..
```

> `pod deintegrate` remove todas as referências injetadas pelos pods do projeto Xcode e então `pod install` reconstrói a partir do Podfile atual. Esta é a única maneira segura de verificar o build do iOS após uma mudança no Podfile.

---

## Etapa 2: Build nas Duas Plataformas a Partir do Código-Fonte

### Build de Release no Android

```bash
cd android

# Confirmar a versão do Gradle wrapper
cat gradle/wrapper/gradle-wrapper.properties | grep distributionUrl

# Build de APK de release (ou AAB para a loja)
./gradlew bundleRelease

# Se bundleRelease falhar, execute com --info para ver o erro exato
./gradlew bundleRelease --info 2>&1 | tail -50
```

Falhas comuns no Android após um upgrade:

| Erro | Causa | Correção |
|---|---|---|
| `Could not resolve com.android.tools.build:gradle:X.X` | Versão do plugin Gradle incompatível com o wrapper | Alinhe as duas usando o diff do Upgrade Helper |
| `Namespace not specified` | `android.namespace` ausente no `build.gradle` | Adicione `namespace "com.yourapp"` ao bloco `android {}` |
| `minSdk < 24` ao usar Nova Arquitetura | RN 0.76+ exige `minSdkVersion = 24` | Atualize `minSdk` no `build.gradle` |
| `TurboModuleRegistry.getEnforcing: 'YourModule' not found` | Módulo registrado com nome errado ou ausente em `getPackages()` | Verifique a string de nome + registro do pacote |
| Falha de build CMake / JNI após Codegen | Arquivos de saída do Codegen ausentes ou desatualizados | Execute `./gradlew generateCodegenArtifactsFromSchema` e recompile |

### Build de Release no iOS

```bash
cd ios

# Build de arquivo de release via xcodebuild
xcodebuild \
  -workspace MyApp.xcworkspace \
  -scheme MyApp \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath build/ \
  clean build \
  CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO

# Se falhar, procure pela última linha "error:"
xcodebuild ... 2>&1 | grep -E "^.*error:|Build FAILED"
```

Falhas comuns no iOS após um upgrade:

| Erro | Causa | Correção |
|---|---|---|
| `'RCTAppDelegate.h' file not found` | Pod `React_RCTAppDelegate` não importado | Adicione `import React_RCTAppDelegate` no AppDelegate |
| `No such module 'React'` | Pod install após upgrade usou cache desatualizado | `pod deintegrate && pod install` |
| `Multiple commands produce 'Info.plist'` | Arquivo de projeto Xcode tem fases de build duplicadas | Abra o Xcode, target → Build Phases, remova o duplicado |
| Conflito de versão do CocoaPods | Sua versão local do CocoaPods é mais antiga do que o RN requer | `sudo gem install cocoapods -v 1.15.2` |
| `Swift Compiler Error: cannot override ... from superclass` | Mudança no AppDelegate (0.76+) — sua assinatura de override não mais corresponde | Atualize assinaturas de métodos para corresponder ao `RCTAppDelegate` |

---

## Etapa 3: Executar a Suite de Testes

```bash
# Testes unitários e de integração
yarn test --watchAll=false

# Com cobertura (execute antes e depois do upgrade para detectar regressões)
yarn test --coverage --watchAll=false
```

Testes que falham especificamente após um upgrade geralmente indicam um dos seguintes:

1. Um módulo nativo mockado tem um novo método que o mock não implementa — atualize o mock
2. Um teste de snapshot capturou um comportamento antigo — atualize o snapshot após verificar que o novo comportamento está correto (`yarn test -u`)
3. Uma suposição de timing que mudou (raro — comportamento do GC do Hermes)

---

## Etapa 4: Smoke Test em Dispositivos Físicos

**Simuladores e emuladores não detectam:**
- Problemas de edge-to-edge no Android 15 (comportamento da barra de navegação por gestos)
- Regressões de performance (simuladores têm CPU/GPU diferentes do hardware real)
- Câmera, biometria, notificações push
- Pressão de memória real e comportamento do GC
- Latência de rede real (simuladores usam a rede do host)

### Matriz de dispositivos para smoke test no Android

| Tier do dispositivo | Por que |
|---|---|
| Baixo custo (ex.: Samsung Galaxy A14, 3GB RAM) | Expõe regressões de memória e tempo de inicialização |
| Mid-range (Pixel 6a) | Representativo do dispositivo mediano alvo |
| Android 15 (qualquer dispositivo) | Necessário se `targetSdk = 35` — edge-to-edge |
| Android 7.0 (API 24) | Seu novo mínimo — verifique se o app realmente executa |

### Matriz de dispositivos para smoke test no iOS

| Dispositivo | Por que |
|---|---|
| iPhone atual (iOS 18) | APIs mais recentes, Dynamic Island |
| iPhone mais antigo (iOS 15 ou 16) | Seu deployment target — verifique que nada usa APIs mais novas |
| iPad (se você suporta) | O layout pode quebrar de forma diferente |

### Checklist de smoke test

```
Lifecycle do app
[ ] App inicia do zero (sem estado prévio)
[ ] App vai para background e retorna (hooks de lifecycle disparam corretamente)
[ ] App recebe uma notificação push em foreground e background

Navegação
[ ] Navegar para cada tela principal (sem telas em branco, sem crashes)
[ ] Gesto de voltar / botão hardware de voltar funciona corretamente
[ ] Deep link abre a tela correta

Dados e rede
[ ] Fluxo de autenticação conclui (login ou restauração de sessão)
[ ] Dados carregam na tela principal / lista
[ ] Um erro de API é tratado graciosamente (sem crash por promise rejection não tratada)

Recursos nativos (se usados)
[ ] Câmera abre e captura
[ ] Autenticação biométrica funciona
[ ] Prompt de permissão de localização aparece
[ ] Fluxo de compra no app inicia

Layout
[ ] Nenhum conteúdo oculto sob a status bar ou barra de navegação (edge-to-edge)
[ ] Teclado não sobrepõe campos de entrada
[ ] SafeArea funciona em dispositivos com notch e punch-hole
```

---

## Etapa 5: Integração com Pipeline de CI Automatizado

Integre a validação de upgrade ao seu pipeline de CI para que todo upgrade futuro seja validado da mesma forma:

```yaml
# .github/workflows/build.yml
name: Build Validation

on:
  pull_request:
    paths:
      - 'package.json'
      - 'android/**'
      - 'ios/**'

jobs:
  android-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - uses: gradle/actions/setup-gradle@v3
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      - name: Build Android Release
        run: cd android && ./gradlew bundleRelease

  ios-build:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
      - name: Install pods
        run: cd ios && bundle exec pod install
      - name: Build iOS Release
        run: |
          xcodebuild \
            -workspace ios/MyApp.xcworkspace \
            -scheme MyApp \
            -configuration Release \
            -sdk iphonesimulator \
            -destination 'platform=iOS Simulator,name=iPhone 16' \
            clean build \
            CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO
```

---

## Monitoramento Após o Release

Um build limpo nas duas plataformas não é o fim. Monitore a taxa de crashes por 48 horas após o primeiro release em produção na nova versão:

```bash
# Firebase Crashlytics — verificar taxa de usuários sem crash
# Meta: dentro de ±0,5% do baseline pré-upgrade

# Sentry — verificar contagem de novos problemas nas primeiras 2 horas
# Filtro: platform=android OU platform=ios, version=nova

# Monitoramento de performance
# Verifique: tempo de carregamento do bundle JS, tempo de renderização de tela, uso de memória
```

Se a taxa de crashes aumentar: rollback via CodePush (crashes na camada JS) ou release de hotfix imediato (crashes nativos).

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [react-native-clean-project](https://github.com/pmadruga/react-native-clean-project) | Um comando para limpar todos os caches de build do RN nas duas plataformas |
| [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) | Guia oficial de pré-requisitos de build por plataforma |
| [Running on Android Device](https://reactnative.dev/docs/running-on-device) | Guia oficial de configuração de dispositivo |
| [Running on iOS Device](https://reactnative.dev/docs/running-on-simulator-ios) | Instruções de build para simulador e dispositivo |

---

Próximo → [Recriação de Patches (patch-package)](./patches-recreation)
