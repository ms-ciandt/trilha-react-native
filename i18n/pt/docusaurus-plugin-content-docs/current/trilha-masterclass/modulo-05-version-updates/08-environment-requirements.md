---
title: "Requisitos de Ambiente (Node, Xcode, SDKs)"
---

# Requisitos de Ambiente (Node, Xcode, SDKs)

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc05_08_environment-requirements.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc05_08_environment-requirements.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> Uma versão incorreta do ambiente causa as falhas de build mais crípticas — erros que não têm nada a ver com o seu código. Corrija o ambiente primeiro, antes de tocar no `package.json`.

---

## A Matriz de Compatibilidade (Fonte Oficial)

Fonte: [reactwg/react-native-releases — support.md](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md)

| Versão RN | Node (min) | JDK | Xcode (min) | CocoaPods | Android SDK (min API) | Plugin Gradle |
|---|---|---|---|---|---|---|
| 0.72 | 16 | 11 | 15.1 | 1.13.x | API 21 (5.0) | 7.4.x |
| 0.73 | 18 | 17 | 15.1 | 1.13.x | API 21 (5.0) | 8.0.x |
| 0.74 | 18 | 17 | 15.1 | 1.13.x | API 23 (6.0) | 8.3.x |
| 0.75 | 18 | 17 | 15.1 | 1.13.x | API 24 (7.0) | 8.6.x |
| 0.76 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.7.x |
| 0.77 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.8.x |
| 0.78 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.9.x |
| 0.79 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.10.x |
| 0.80 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.11.x |
| 0.81 | 20 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.12.x |
| 0.84+ | 22 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) | 8.13.x |

**Transições principais que quebram o CI sem aviso:**

- `0.72 → 0.73`: JDK 11 → **JDK 17** — a quebra de CI mais comum
- `0.80 → 0.81`: Node 18 → **Node 20**
- `0.83 → 0.84`: Node 20 → **Node 22**
- `0.80 → 0.81`: Xcode 15.1 → **Xcode 16.1** (macOS 15 obrigatório para o agente de CI)

---

## Verificando Seu Ambiente Atual

Execute isso antes de qualquer upgrade — estabeleça uma linha de base do seu ambiente:

```bash
# Node
node --version       # deve atender ao mínimo para sua versão alvo do RN

# npm / Yarn
npm --version
yarn --version

# Java / JDK
java -version        # deve ser JDK 17 para RN 0.73+

# Ruby + Bundler (iOS)
ruby --version       # >= 2.7 para CocoaPods
bundle --version

# CocoaPods
pod --version        # verifique contra a matriz acima

# Xcode
xcodebuild -version  # deve atender ao mínimo para sua versão alvo do RN

# Android SDK
echo $ANDROID_HOME   # deve estar definido
$ANDROID_HOME/tools/bin/sdkmanager --list | grep "platforms;android-"

# Watchman (necessário para o Metro)
watchman --version
```

---

## Gerenciamento de Versão do Node

Nunca instale o Node globalmente com um gerenciador de pacotes do sistema (`apt`, `brew install node`). Use um gerenciador de versões para poder alternar por projeto.

### Com `nvm` (mais comum)

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Instalar e usar uma versão específica do Node
nvm install 20
nvm use 20

# Definir padrão por projeto via .nvmrc
echo "20" > .nvmrc
nvm use  # lê o .nvmrc
```

### Com `fnm` (alternativa mais rápida)

```bash
# Instalar fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Instalar e usar
fnm install 20
fnm use 20

# .nvmrc também é lido pelo fnm
```

**Exemplo de `.nvmrc` no projeto:**

```
# .nvmrc — versionado no git
20.19.4
```

Cada desenvolvedor e cada agente de CI lê esse arquivo. Não há mais "funciona na minha máquina, falha no CI" por incompatibilidade de versão do Node.

---

## Gerenciamento do JDK (Android)

### macOS — com SDKMAN

```bash
# Instalar SDKMAN
curl -s "https://get.sdkman.io" | bash

# Listar distribuições disponíveis do JDK 17
sdk list java | grep 17

# Instalar Temurin 17 (Eclipse OpenJDK — gratuito, sem problemas de licença)
sdk install java 17.0.12-tem
sdk use java 17.0.12-tem

# Verificar
java -version
# openjdk version "17.0.12" 2024-07-16
```

### Definindo `JAVA_HOME` para o Gradle

O Gradle lê `JAVA_HOME`. Se estiver apontando para o JDK 11 enquanto `java -version` mostra 17, o Gradle ainda falhará.

```bash
# Adicione ao ~/.zshrc ou ~/.bash_profile
export JAVA_HOME="$(sdk home java current)"
# ou, com JDK via homebrew:
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"

# Verificar
echo $JAVA_HOME
# Deve retornar um caminho apontando para o JDK 17
```

No CI (GitHub Actions):

```yaml
- uses: actions/setup-java@v4
  with:
    java-version: '17'
    distribution: 'temurin'
```

---

## Gerenciamento de Versão do Xcode

As versões do Xcode estão vinculadas às versões do macOS. Você não pode executar o Xcode 16.1 no macOS 13 Ventura.

| Xcode | Requer macOS | Necessário para RN |
|---|---|---|
| 15.1 | macOS 14 Sonoma | 0.73 – 0.80 |
| 16.1 | macOS 15 Sequoia | 0.81+ |

```bash
# Verificar versão do Xcode
xcode-select --print-path
xcodebuild -version

# Alternar entre versões do Xcode (se múltiplas instaladas)
sudo xcode-select -s /Applications/Xcode_16.1.app
```

No CI (GitHub Actions), fixe a versão do macOS explicitamente:

```yaml
jobs:
  ios-build:
    runs-on: macos-15          # macOS 15 Sequoia — Xcode 16.1
    # ou
    runs-on: macos-14          # macOS 14 Sonoma — Xcode 15.1
```

---

## Gerenciamento de Versão do CocoaPods

```bash
# Verificar versão atual
pod --version

# Instalar uma versão específica
sudo gem install cocoapods -v 1.15.2

# Usar Bundler para versão de CocoaPods por projeto (recomendado)
# Gemfile:
source "https://rubygems.org"
gem "cocoapods", "~> 1.15"

# Instalar via bundler
bundle install
bundle exec pod install  # sempre use `bundle exec` para usar a versão do Gemfile
```

O `Gemfile.lock` fixa a versão exata do CocoaPods. Esta é a única maneira confiável de garantir que cada desenvolvedor e agente de CI use a mesma versão.

---

## Requisitos do Android SDK

```bash
# Instalar componentes de SDK necessários
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
  "platforms;android-35" \
  "build-tools;35.0.0" \
  "platform-tools" \
  "ndk;27.1.12297006"

# Verificar
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --list_installed
```

Defina isso no `android/app/build.gradle` para corresponder:

```kotlin
android {
    compileSdk = 35
    buildToolsVersion = "35.0.0"

    defaultConfig {
        minSdk = 24
        targetSdk = 35
    }
}
```

**O NDK** é necessário para a Nova Arquitetura (compilação C++). O RN 0.76+ requer NDK r27+.

```bash
# Verificar NDK
ls $ANDROID_HOME/ndk/
# Deve mostrar 27.x.xxxxxxx
```

---

## Validação do Ambiente Antes do Upgrade

Execute este script para verificar todos os requisitos antes de iniciar o upgrade:

```bash
#!/bin/bash
# check-env.sh

echo "=== Node ===" && node --version
echo "=== JDK ===" && java -version 2>&1 | head -1
echo "=== Xcode ===" && xcodebuild -version 2>/dev/null || echo "Não é macOS ou Xcode não instalado"
echo "=== CocoaPods ===" && (bundle exec pod --version 2>/dev/null || pod --version)
echo "=== Android SDK ===" && echo $ANDROID_HOME
echo "=== NDK ===" && ls $ANDROID_HOME/ndk/ 2>/dev/null || echo "NDK não encontrado"
echo "=== Ruby ===" && ruby --version
echo "=== Bundler ===" && bundle --version
echo "=== Watchman ===" && watchman --version
```

Compare a saída com a matriz de compatibilidade. Corrija cada incompatibilidade **antes** de iniciar o upgrade.

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [react-native-releases — support.md](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md) | Matriz de compatibilidade oficial — a fonte primária |
| [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) | Guia de configuração oficial, mantido em sincronia com a versão estável atual |
| [nvm — GitHub](https://github.com/nvm-sh/nvm) | Gerenciador de versão do Node |
| [fnm — GitHub](https://github.com/Schniz/fnm) | Gerenciador de versão do Node mais rápido, lê `.nvmrc` |
| [SDKMAN](https://sdkman.io/) | Gerenciador de versão do JDK para macOS/Linux |
| [sdkmanager — Android docs](https://developer.android.com/tools/sdkmanager) | Gerenciando componentes do Android SDK pela CLI |

---

Próximo → [Mudanças em Configurações Nativas (Edge-to-Edge)](./native-settings)
