---
title: "Diagnóstico de Falhas (RN Doctor)"
---

# Diagnóstico de Falhas (RN Doctor)

> `react-native doctor` é sua primeira ferramenta após uma falha de build ou configuração de ambiente. Ele não corrige problemas de upgrade, mas rapidamente identifica as configurações incorretas de ambiente mais comuns antes que você passe uma hora lendo logs de build.

---

## O Que é o RN Doctor

`react-native doctor` foi introduzido no RN 0.62 como uma ferramenta de diagnóstico. Ele verifica seu ambiente de desenvolvimento contra os requisitos conhecidos para a versão do RN instalada e reporta aprovação/falha/aviso por dependência.

Ele faz parte do `@react-native-community/cli` — o mesmo CLI que alimenta `react-native init`, `react-native start` e `react-native run-android`.

```bash
# Executar o doctor (sem instalação necessária)
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

## Executando o Doctor Após um Upgrade

```bash
# Verificar o ambiente após atualizar a versão do RN
npx react-native doctor

# Com propostas de correção (o doctor oferece corrigir alguns problemas automaticamente)
# Quando solicitado "Do you want to fix [issue]?" → pressione Y
```

Os itens vermelhos (`✗`) mais importantes a corrigir antes de compilar:

| Verificação | Se Vermelho | Correção |
|---|---|---|
| `ANDROID_HOME` | O build não consegue encontrar o Android SDK | Defina a variável de ambiente: `export ANDROID_HOME=~/Library/Android/sdk` |
| `Android NDK` | A compilação C++ da Nova Arquitetura falhará | `sdkmanager "ndk;27.1.12297006"` |
| `JAVA_HOME` | O Gradle usa o JDK errado | `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` |
| `JDK` | O Gradle falha com versão de classe não suportada | Instale o JDK 17 |
| `Xcode` | O build iOS falha | Instale a versão correta do Xcode pela App Store |
| `CocoaPods` | `pod install` falha | `sudo gem install cocoapods` ou `bundle install` |

---

## Estendendo o Doctor com Verificações Customizadas

Para equipes com requisitos de ambiente customizados (certificados internos, versões específicas de NDK, configurações de proxy corporativo), você pode adicionar healthchecks próprios:

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

## Além do Doctor: Diagnosticando Falhas de Build

O Doctor verifica apenas o ambiente. Uma vez que o ambiente está verde, as falhas de build precisam de ferramentas diferentes.

### Android: lendo a saída do Gradle

```bash
# Obter saída detalhada com o motivo da falha
cd android && ./gradlew assembleDebug --stacktrace 2>&1 | tail -80

# As linhas úteis ficam após "FAILURE:" e antes do stack trace
# Procure por: "Caused by:" — esta é a causa raiz real
```

Padrões comuns:

```
# Namespace ausente
Caused by: com.android.tools.build.bundletool.model.exceptions.InvalidBundleException:
  Namespace not specified in build file

# Correção: adicionar namespace ao android/app/build.gradle
android {
    namespace = "com.myapp"
}

# Artefatos do Codegen ausentes
Caused by: java.io.FileNotFoundException: .../jni/NativeMyModuleSpec.h (No such file or directory)

# Correção:
cd android && ./gradlew generateCodegenArtifactsFromSchema && cd ..
```

### iOS: lendo a saída do xcodebuild

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

# Se o Metro falhar ao iniciar com módulo não encontrado:
watchman watch-del-all   # limpar estado do Watchman
rm -rf node_modules/.cache
npm install
```

### O erro "Haste module map"

Após um upgrade, se o Metro lançar:

```
Error: Haste module map has multiple entries for name
```

Isso significa que dois arquivos em `node_modules` exportam o mesmo nome de módulo — geralmente causado por versões duplicadas de um pacote instalado por dependências diferentes.

```bash
# Encontrar o duplicado
npx react-native config 2>&1 | grep "Haste"

# Correção: adicionar o caminho duplicado à blocklist do resolver
# metro.config.js
const config = getDefaultConfig(__dirname);
config.resolver.blocklist = [
  /node_modules\/duplicate-package\/.*\.(js|ts|tsx)$/,
];
```

### Diagnóstico específico da Nova Arquitetura

```bash
# Verificar se a Nova Arquitetura está realmente ativa em tempo de execução
# Adicione isso a um componente que carrega na inicialização:
if (__DEV__) {
  const { isFabricEnabled } = require('react-native/Libraries/Utilities/ReactNativeTestTools');
  console.log('Fabric enabled:', isFabricEnabled());
}
```

Ou, no log do Metro, procure por:
```
Running "MyApp" with {"fabric":true,"initialProps":{},"rootTag":11}
```

O `"fabric":true` confirma que o Fabric (renderer da Nova Arquitetura) está ativo.

---

## Referência de Comandos de Diagnóstico Úteis

```bash
# Verificação completa do ambiente
npx react-native doctor

# Informações de versão de todas as deps relacionadas ao RN
npx react-native info

# Detectar e corrigir problemas comuns no projeto
npx react-native-clean-project

# Android: verificar configuração do projeto Gradle
cd android && ./gradlew projects

# Android: listar todas as tasks relacionadas ao Codegen
cd android && ./gradlew tasks | grep -i codegen

# iOS: verificar instalação do CocoaPods
pod env
pod repo list

# Metro: análise do bundle (o que está no seu bundle)
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/bundle.js \
  --assets-dest /tmp/assets/
wc -l /tmp/bundle.js   # verificar tamanho do bundle
```

---

## Fluxograma de Diagnóstico de Upgrade

```
Build falha após upgrade
│
├── Execute `npx react-native doctor`
│   ├── Item vermelho encontrado? Corrija → recompile
│   └── Tudo verde? → verifique logs de build
│
├── Build Android falha?
│   ├── "Namespace not specified" → adicionar `namespace` ao build.gradle
│   ├── "Codegen artifact not found" → executar generateCodegenArtifactsFromSchema
│   ├── "Could not resolve gradle plugin" → verificar versão do plugin gradle vs wrapper
│   └── Outro → ./gradlew assembleDebug --stacktrace → ler "Caused by:"
│
├── Build iOS falha?
│   ├── "file not found" header → pod deintegrate && pod install
│   ├── Erro de override Swift → atualizar AppDelegate para RCTAppDelegate (0.76)
│   ├── Conflito do CocoaPods → verificar Podfile.lock, atualizar pod conflitante
│   └── Outro → xcodebuild ... 2>&1 | grep "error:" | head -20
│
└── App executa mas crasha na inicialização?
    ├── "TurboModuleRegistry.getEnforcing: X not found" → registro de módulo ausente
    ├── Tela branca no iOS → verificar configuração do RCTAppDelegate
    ├── Layout edge-to-edge quebrado → adicionar react-native-edge-to-edge, useSafeAreaInsets
    └── Crash no Hermes → verificar incompatibilidades de tipo JSI em módulos nativos customizados
```

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [Meet Doctor — RN Blog](https://reactnative.dev/blog/2019/11/18/react-native-doctor) | Anúncio original, o que ele verifica e por que |
| [react-native-community/cli — GitHub](https://github.com/react-native-community/cli) | Código-fonte do CLI — o comando doctor fica em `packages/cli-doctor` |
| [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) | Guia oficial com pré-requisitos de ambiente |
| [react-native info — docs](https://reactnative.dev/docs/environment-setup) | `npx react-native info` — relatório completo de versão de dependências |
| [react-native-clean-project](https://github.com/pmadruga/react-native-clean-project) | Limpa todos os caches de build, node_modules e Pods em um único comando |
| [xcpretty — GitHub](https://github.com/xcpretty/xcpretty) | Formata a saída do xcodebuild para ser legível por humanos |

---

<div className="mc-feedback">
  <div className="mc-feedback-icon">
    <img src="/trilha-react-native/img/react-native-masterclass-icon-v2.png" alt="" width="48" height="48" />
  </div>
  <p className="mc-feedback-title">Você concluiu a React Native Masterclass</p>
  <p className="mc-feedback-sub">Sua opinião ajuda a melhorar o conteúdo. Leva menos de 2 minutos.</p>
  <a
    href="https://forms.gle/75pKeXQxkSZogzxv5"
    target="_blank"
    rel="noopener noreferrer"
    className="mc-feedback-btn"
  >
    Deixar feedback
  </a>
</div>
