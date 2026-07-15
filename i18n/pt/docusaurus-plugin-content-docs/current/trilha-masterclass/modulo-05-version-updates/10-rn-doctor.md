---
title: "Diagnostico de Falhas (RN Doctor)"
---

# Diagnostico de Falhas (RN Doctor)

> `react-native doctor` e sua primeira ferramenta apos uma falha de build ou configuracao de ambiente. Ele nao corrige problemas de upgrade, mas rapidamente identifica as configuracoes incorretas de ambiente mais comuns antes que voce passe uma hora lendo logs de build.

---

## O Que e o RN Doctor

`react-native doctor` foi introduzido no RN 0.62 como uma ferramenta de diagnostico. Ele verifica seu ambiente de desenvolvimento contra os requisitos conhecidos para a versao do RN instalada e reporta aprovacao/falha/aviso por dependencia.

Ele faz parte do `@react-native-community/cli` — o mesmo CLI que alimenta `react-native init`, `react-native start` e `react-native run-android`.

```bash
# Executar o doctor (sem instalacao necessaria)
npx react-native doctor
```

---

## O Que Ele Verifica

```
Common
  ✓ Node.js (18.20.4) — required >= 18.0.0
  ✗ Watchman — not found (recommended for better performance)
  ✓ react-native@0.76.7 — version OK

Android
  ✓ ANDROID_HOME — /Users/yourname/Library/Android/sdk
  ✓ Android SDK — Android 15 (API 35) installed
  ✓ Android build tools — 35.0.0 installed
  ✗ Android NDK — not found (required for New Architecture, version >= 26)
  ✓ JAVA_HOME — /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
  ✓ JDK — OpenJDK 17.0.12

iOS
  ✓ Xcode — 16.1 (path: /Applications/Xcode.app/Contents/Developer)
  ✓ CocoaPods — 1.15.2
  ✗ ios-deploy — not found (optional, needed for physical device install without Xcode)
```

---

## Executando o Doctor Apos um Upgrade

```bash
# Verificar o ambiente apos atualizar a versao do RN
npx react-native doctor

# Com propostas de correcao (o doctor oferece corrigir alguns problemas automaticamente)
# Quando solicitado "Do you want to fix [issue]?" → pressione Y
```

Os itens vermelhos (`✗`) mais importantes a corrigir antes de compilar:

| Verificacao | Se Vermelho | Correcao |
|---|---|---|
| `ANDROID_HOME` | O build nao consegue encontrar o Android SDK | Defina a variavel de ambiente: `export ANDROID_HOME=~/Library/Android/sdk` |
| `Android NDK` | A compilacao C++ da Nova Arquitetura falhara | `sdkmanager "ndk;27.1.12297006"` |
| `JAVA_HOME` | O Gradle usa o JDK errado | `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` |
| `JDK` | O Gradle falha com versao de classe nao suportada | Instale o JDK 17 |
| `Xcode` | O build iOS falha | Instale a versao correta do Xcode pela App Store |
| `CocoaPods` | `pod install` falha | `sudo gem install cocoapods` ou `bundle install` |

---

## Estendendo o Doctor com Verificacoes Customizadas

Para equipes com requisitos de ambiente customizados (certificados internos, versoes especificas de NDK, configuracoes de proxy corporativo), voce pode adicionar healthchecks proprios:

```javascript
// react-native.config.js
module.exports = {
  healthChecks: [
    {
      label: 'Company Proxy Certificate',
      getDiagnostics: async () => {
        const { execSync } = require('child_process');
        try {
          execSync('security find-certificate -c "CompanyCert" ~/Library/Keychains/login.keychain');
          return { isRequired: true, version: 'installed', versionRange: 'installed' };
        } catch {
          return { isRequired: true, version: null };
        }
      },
      runAutomaticFix: async ({ loader, logManualInstallation }) => {
        loader.fail();
        logManualInstallation({
          message: 'Install the company certificate from https://internal.company.com/certs',
        });
      },
    },
  ],
};
```

---

## Alem do Doctor: Diagnosticando Falhas de Build

O Doctor verifica apenas o ambiente. Uma vez que o ambiente esta verde, as falhas de build precisam de ferramentas diferentes.

### Android: lendo a saida do Gradle

```bash
# Obter saida detalhada com o motivo da falha
cd android && ./gradlew assembleDebug --stacktrace 2>&1 | tail -80

# As linhas uteis ficam apos "FAILURE:" e antes do stack trace
# Procure por: "Caused by:" — esta e a causa raiz real
```

Padroes comuns:

```
# Namespace ausente
Caused by: com.android.tools.build.bundletool.model.exceptions.InvalidBundleException:
  Namespace not specified in build file

# Correcao: adicionar namespace ao android/app/build.gradle
android {
    namespace = "com.myapp"
}

# Artefatos do Codegen ausentes
Caused by: java.io.FileNotFoundException: .../jni/NativeMyModuleSpec.h (No such file or directory)

# Correcao:
cd android && ./gradlew generateCodegenArtifactsFromSchema && cd ..
```

### iOS: lendo a saida do xcodebuild

```bash
# Filtrar apenas os erros
xcodebuild -workspace ios/MyApp.xcworkspace \
           -scheme MyApp \
           -configuration Debug \
           -sdk iphonesimulator \
           -destination 'platform=iOS Simulator,name=iPhone 16' \
           build 2>&1 | xcpretty

# Ou sem xcpretty:
... build 2>&1 | grep -E "error:|warning:" | head -30
```

### Problemas no bundler Metro

```bash
# Resetar todos os caches do Metro
npx react-native start --reset-cache

# Se o Metro falhar ao iniciar com modulo nao encontrado:
watchman watch-del-all   # limpar estado do Watchman
rm -rf node_modules/.cache
npm install
```

### O erro "Haste module map"

Apos um upgrade, se o Metro lancar:

```
Error: Haste module map has multiple entries for name
```

Isso significa que dois arquivos em `node_modules` exportam o mesmo nome de modulo — geralmente causado por versoes duplicadas de um pacote instalado por dependencias diferentes.

```bash
# Encontrar o duplicado
npx react-native config 2>&1 | grep "Haste"

# Correcao: adicionar o caminho duplicado a blocklist do resolver
# metro.config.js
const config = getDefaultConfig(__dirname);
config.resolver.blocklist = [
  /node_modules\/duplicate-package\/.*\.(js|ts|tsx)$/,
];
```

### Diagnostico especifico da Nova Arquitetura

```bash
# Verificar se a Nova Arquitetura esta realmente ativa em tempo de execucao
# Adicione isso a um componente que carrega na inicializacao:
if (__DEV__) {
  const { isFabricEnabled } = require('react-native/Libraries/Utilities/ReactNativeTestTools');
  console.log('Fabric enabled:', isFabricEnabled());
}
```

Ou, no log do Metro, procure por:
```
Running "MyApp" with {"fabric":true,"initialProps":{},"rootTag":11}
```

O `"fabric":true` confirma que o Fabric (renderer da Nova Arquitetura) esta ativo.

---

## Referencia de Comandos de Diagnostico Uteis

```bash
# Verificacao completa do ambiente
npx react-native doctor

# Informacoes de versao de todas as deps relacionadas ao RN
npx react-native info

# Detectar e corrigir problemas comuns no projeto
npx react-native-clean-project

# Android: verificar configuracao do projeto Gradle
cd android && ./gradlew projects

# Android: listar todas as tasks relacionadas ao Codegen
cd android && ./gradlew tasks | grep -i codegen

# iOS: verificar instalacao do CocoaPods
pod env
pod repo list

# Metro: analise do bundle (o que esta no seu bundle)
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/bundle.js \
  --assets-dest /tmp/assets/
wc -l /tmp/bundle.js   # verificar tamanho do bundle
```

---

## Fluxograma de Diagnostico de Upgrade

```
Build falha apos upgrade
│
├── Execute `npx react-native doctor`
│   ├── Item vermelho encontrado? Corrija → recompile
│   └── Tudo verde? → verifique logs de build
│
├── Build Android falha?
│   ├── "Namespace not specified" → adicionar `namespace` ao build.gradle
│   ├── "Codegen artifact not found" → executar generateCodegenArtifactsFromSchema
│   ├── "Could not resolve gradle plugin" → verificar versao do plugin gradle vs wrapper
│   └── Outro → ./gradlew assembleDebug --stacktrace → ler "Caused by:"
│
├── Build iOS falha?
│   ├── "file not found" header → pod deintegrate && pod install
│   ├── Erro de override Swift → atualizar AppDelegate para RCTAppDelegate (0.76)
│   ├── Conflito do CocoaPods → verificar Podfile.lock, atualizar pod conflitante
│   └── Outro → xcodebuild ... 2>&1 | grep "error:" | head -20
│
└── App executa mas crasha na inicializacao?
    ├── "TurboModuleRegistry.getEnforcing: X not found" → registro de modulo ausente
    ├── Tela branca no iOS → verificar configuracao do RCTAppDelegate
    ├── Layout edge-to-edge quebrado → adicionar react-native-edge-to-edge, useSafeAreaInsets
    └── Crash no Hermes → verificar incompatibilidades de tipo JSI em modulos nativos customizados
```

---

## Materiais de Estudo

| Recurso | Descricao |
|---|---|
| [Meet Doctor — RN Blog](https://reactnative.dev/blog/2019/11/18/react-native-doctor) | Anuncio original, o que ele verifica e por que |
| [react-native-community/cli — GitHub](https://github.com/react-native-community/cli) | Codigo-fonte do CLI — o comando doctor fica em `packages/cli-doctor` |
| [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) | Guia oficial com prerequisitos de ambiente |
| [react-native info — docs](https://reactnative.dev/docs/environment-setup) | `npx react-native info` — relatorio completo de versao de dependencias |
| [react-native-clean-project](https://github.com/pmadruga/react-native-clean-project) | Limpa todos os caches de build, node_modules e Pods em um unico comando |
| [xcpretty — GitHub](https://github.com/xcpretty/xcpretty) | Formata a saida do xcodebuild para ser legivel por humanos |
