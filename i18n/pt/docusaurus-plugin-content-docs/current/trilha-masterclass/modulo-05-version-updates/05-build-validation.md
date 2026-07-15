---
title: Validacao com Build nas Duas Plataformas
---

# Validacao com Build nas Duas Plataformas

> Um `yarn install` bem-sucedido e um `pod install` verde nao sao validacao. Validacao significa um build limpo nas duas plataformas, testes passando e um smoke test em um dispositivo fisico. Nessa ordem.

---

## Por que "Funciona na Minha Maquina" Nao e Suficiente

Apos um upgrade, tres modos de falha existem e so se manifestam em uma plataforma ou dispositivo especifico:

1. **Falhas em tempo de build** — versao errada do plugin Gradle, configuracao ausente no Xcode, conflito de resolucao do CocoaPods
2. **Crashes em tempo de execucao** — modulo nativo nao encontrado, incompatibilidade de tipo JSI, overflow de layout com edge-to-edge
3. **Regressoes de comportamento** — uma tela que renderiza mas faz scroll incorretamente, um gesto de navegacao que mudou

Voce precisa verificar os tres nas duas plataformas antes de publicar.

---

## Etapa 1: Limpar os Caches de Build

Artefatos cacheados da versao anterior causarao falhas nao-determinísticas — voce pode obter um build verde pelo motivo errado ou um build vermelho sem motivo aparente.

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

> `pod deintegrate` remove todas as referencias injetadas pelos pods do projeto Xcode e entao `pod install` reconstroi a partir do Podfile atual. Esta e a unica maneira segura de verificar o build do iOS apos uma mudanca no Podfile.

---

## Etapa 2: Build nas Duas Plataformas a Partir do Codigo-Fonte

### Build de Release no Android

```bash
cd android

# Confirmar a versao do Gradle wrapper
cat gradle/wrapper/gradle-wrapper.properties | grep distributionUrl

# Build de APK de release (ou AAB para a loja)
./gradlew bundleRelease

# Se bundleRelease falhar, execute com --info para ver o erro exato
./gradlew bundleRelease --info 2>&1 | tail -50
```

Falhas comuns no Android apos um upgrade:

| Erro | Causa | Correcao |
|---|---|---|
| `Could not resolve com.android.tools.build:gradle:X.X` | Versao do plugin Gradle incompativel com o wrapper | Alinhe as duas usando o diff do Upgrade Helper |
| `Namespace not specified` | `android.namespace` ausente no `build.gradle` | Adicione `namespace "com.yourapp"` ao bloco `android {}` |
| `minSdk < 24` ao usar Nova Arquitetura | RN 0.76+ exige `minSdkVersion = 24` | Atualize `minSdk` no `build.gradle` |
| `TurboModuleRegistry.getEnforcing: 'YourModule' not found` | Modulo registrado com nome errado ou ausente em `getPackages()` | Verifique a string de nome + registro do pacote |
| Falha de build CMake / JNI apos Codegen | Arquivos de saida do Codegen ausentes ou desatualizados | Execute `./gradlew generateCodegenArtifactsFromSchema` e recompile |

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

# Se falhar, procure pela ultima linha "error:"
xcodebuild ... 2>&1 | grep -E "^.*error:|Build FAILED"
```

Falhas comuns no iOS apos um upgrade:

| Erro | Causa | Correcao |
|---|---|---|
| `'RCTAppDelegate.h' file not found` | Pod `React_RCTAppDelegate` nao importado | Adicione `import React_RCTAppDelegate` no AppDelegate |
| `No such module 'React'` | Pod install apos upgrade usou cache desatualizado | `pod deintegrate && pod install` |
| `Multiple commands produce 'Info.plist'` | Arquivo de projeto Xcode tem fases de build duplicadas | Abra o Xcode, target → Build Phases, remova o duplicado |
| Conflito de versao do CocoaPods | Sua versao local do CocoaPods e mais antiga do que o RN requer | `sudo gem install cocoapods -v 1.15.2` |
| `Swift Compiler Error: cannot override ... from superclass` | Mudanca no AppDelegate (0.76+) — sua assinatura de override nao mais corresponde | Atualize assinaturas de metodos para corresponder ao `RCTAppDelegate` |

---

## Etapa 3: Executar a Suite de Testes

```bash
# Testes unitarios e de integracao
yarn test --watchAll=false

# Com cobertura (execute antes e depois do upgrade para detectar regressoes)
yarn test --coverage --watchAll=false
```

Testes que falham especificamente apos um upgrade geralmente indicam um dos seguintes:

1. Um modulo nativo mockado tem um novo metodo que o mock nao implementa — atualize o mock
2. Um teste de snapshot capturou um comportamento antigo — atualize o snapshot apos verificar que o novo comportamento esta correto (`yarn test -u`)
3. Uma suposicao de timing que mudou (raro — comportamento do GC do Hermes)

---

## Etapa 4: Smoke Test em Dispositivos Fisicos

**Simuladores e emuladores nao detectam:**
- Problemas de edge-to-edge no Android 15 (comportamento da barra de navegacao por gestos)
- Regressoes de performance (simuladores tem CPU/GPU diferentes do hardware real)
- Camera, biometria, notificacoes push
- Pressao de memoria real e comportamento do GC
- Latencia de rede real (simuladores usam a rede do host)

### Matriz de dispositivos para smoke test no Android

| Tier do dispositivo | Por que |
|---|---|
| Baixo custo (ex.: Samsung Galaxy A14, 3GB RAM) | Expoe regressoes de memoria e tempo de inicializacao |
| Mid-range (Pixel 6a) | Representativo do dispositivo mediano alvo |
| Android 15 (qualquer dispositivo) | Necessario se `targetSdk = 35` — edge-to-edge |
| Android 7.0 (API 24) | Seu novo minimo — verifique se o app realmente executa |

### Matriz de dispositivos para smoke test no iOS

| Dispositivo | Por que |
|---|---|
| iPhone atual (iOS 18) | APIs mais recentes, Dynamic Island |
| iPhone mais antigo (iOS 15 ou 16) | Seu deployment target — verifique que nada usa APIs mais novas |
| iPad (se voce suporta) | O layout pode quebrar de forma diferente |

### Checklist de smoke test

```
Lifecycle do app
[ ] App inicia do zero (sem estado previo)
[ ] App vai para background e retorna (hooks de lifecycle disparam corretamente)
[ ] App recebe uma notificacao push em foreground e background

Navegacao
[ ] Navegar para cada tela principal (sem telas em branco, sem crashes)
[ ] Gesto de voltar / botao hardware de voltar funciona corretamente
[ ] Deep link abre a tela correta

Dados e rede
[ ] Fluxo de autenticacao conclui (login ou restauracao de sessao)
[ ] Dados carregam na tela principal / lista
[ ] Um erro de API e tratado graciosamente (sem crash por promise rejection nao tratada)

Recursos nativos (se usados)
[ ] Camera abre e captura
[ ] Autenticacao biometrica funciona
[ ] Prompt de permissao de localizacao aparece
[ ] Fluxo de compra no app inicia

Layout
[ ] Nenhum conteudo oculto sob a status bar ou barra de navegacao (edge-to-edge)
[ ] Teclado nao sobrepoe campos de entrada
[ ] SafeArea funciona em dispositivos com notch e punch-hole
```

---

## Etapa 5: Integracao com Pipeline de CI Automatizado

Integre a validacao de upgrade ao seu pipeline de CI para que todo upgrade futuro seja validado da mesma forma:

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

## Monitoramento Apos o Release

Um build limpo nas duas plataformas nao e o fim. Monitore a taxa de crashes por 48 horas apos o primeiro release em producao na nova versao:

```bash
# Firebase Crashlytics — verificar taxa de usuarios sem crash
# Meta: dentro de ±0,5% do baseline pre-upgrade

# Sentry — verificar contagem de novos problemas nas primeiras 2 horas
# Filtro: platform=android OU platform=ios, version=nova

# Monitoramento de performance
# Verifique: tempo de carregamento do bundle JS, tempo de renderizacao de tela, uso de memoria
```

Se a taxa de crashes aumentar: rollback via CodePush (crashes na camada JS) ou release de hotfix imediato (crashes nativos).

---

## Materiais de Estudo

| Recurso | Descricao |
|---|---|
| [react-native-clean-project](https://github.com/pmadruga/react-native-clean-project) | Um comando para limpar todos os caches de build do RN nas duas plataformas |
| [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) | Guia oficial de prerequisitos de build por plataforma |
| [Running on Android Device](https://reactnative.dev/docs/running-on-device) | Guia oficial de configuracao de dispositivo |
| [Running on iOS Device](https://reactnative.dev/docs/running-on-simulator-ios) | Instrucoes de build para simulador e dispositivo |

---

Proximo → [Recreacao de Patches (patch-package)](./patches-recreation)
