---
title: EAS Build for iOS
---

# EAS Build para iOS

O EAS Build é o serviço de build hospedado da Expo. Em vez de manter uma máquina macOS ou um runner macOS auto-hospedado no GitHub Actions, você envia seu código-fonte para a infraestrutura da Expo, e o build é executado em uma máquina macOS gerenciada pela Expo com o Xcode pré-instalado. O IPA resultante é armazenado na CDN da Expo e pode ser baixado ou encaminhado diretamente para o App Store Connect.

Para um desenvolvedor iOS, o modelo mental é direto: tudo o que você faria localmente com `xcodebuild archive && xcodebuild -exportArchive` mais o gerenciamento de certificados é automatizado pelo EAS. Você mantém seu projeto React Native no GitHub, configura o `eas.json` e deixa o serviço cuidar do lado macOS.

## Por que EAS Build em vez de um Runner macOS Auto-Hospedado

Manter um runner macOS auto-hospedado para CI do iOS é caro em duas dimensões: custo de hardware (Mac Mini ou Mac Studio) e custo de manutenção (atualizações do Xcode, renovações de certificados, espaço em disco para DerivedData e runtimes do Simulador). Cada grande versão do Xcode arrisca quebrar seus builds de formas que exigem intervenção manual.

O EAS Build elimina tudo isso. O serviço mantém sua frota de macOS atualizada com as versões suportadas do Xcode. Você declara qual versão do Xcode seu projeto precisa no `eas.json` e o agendador escolhe uma máquina com essa versão instalada. Sua equipe nunca precisa de um Mac físico no ciclo de CI.

## Instalando e Configurando o EAS CLI

```bash
npm install -g eas-cli
eas login
```

Inicialize o EAS no seu projeto React Native ou Expo:

```bash
eas build:configure
```

Esse comando cria o `eas.json` na raiz do projeto. Para um projeto com Expo SDK 56, certifique-se também de que o `expo-updates` está instalado caso você pretenda usar atualizações OTA:

```bash
npx expo install expo-updates
```

## Perfis do eas.json para iOS

O `eas.json` é o arquivo de configuração único que define como cada perfil de build se comporta. Uma configuração padrão para iOS usa três perfis:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "credentialsSource": "remote"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890"
      }
    }
  }
}
```

### Perfil development — Build para Simulador

`"simulator": true` instrui o EAS a produzir um bundle `.app` para o iOS Simulator em vez de um IPA assinado. Builds para simulador não requerem perfil de provisionamento nem uma conta paga na Apple Developer. A saída é um zip contendo o `.app`, que você instala com:

```bash
xcrun simctl install booted path/to/YourApp.app
```

`"developmentClient": true` significa que o build inclui o pacote `expo-dev-client`, que oferece um menu de desenvolvimento e fast refresh contra um servidor Metro rodando na sua máquina. Isso substitui o Expo Go para projetos com código nativo customizado.

### Perfil preview — Distribuição Interna

`"distribution": "internal"` gera um IPA assinado usando um perfil de provisionamento Ad-Hoc e o distribui via QR code ou link de download direto. Os testadores instalam sem o TestFlight — basta abrir o link no dispositivo. O UDID do dispositivo deve estar registrado na sua conta Apple Developer. O EAS pode registrar UDIDs automaticamente quando um testador escaneia o QR code (ele abre um fluxo de instalação de perfil).

Esse perfil é equivalente ao que o `match adhoc` do Fastlane + Firebase App Distribution oferece, sem a cerimônia.

### Perfil production — Build para App Store

`"credentialsSource": "remote"` diz ao EAS para usar as credenciais que ele gerencia na nuvem (veja a próxima seção). O build produz um IPA assinado com um perfil de provisionamento de distribuição para a App Store. A saída está pronta para o `eas submit` enviar para o App Store Connect.

## Executando um Build

```bash
# Development: build para simulador
eas build --platform ios --profile development

# Preview: IPA assinado para testadores internos
eas build --platform ios --profile preview

# Production: IPA para a App Store
eas build --platform ios --profile production
```

O EAS imprime uma URL de build onde você pode acompanhar os logs em tempo real. O tempo de fila do build depende do seu plano Expo. No plano gratuito, os builds ficam na fila atrás de outros usuários. Nos planos pagos, você tem prioridade e slots de build concorrentes.

Para buildar localmente (usando sua própria máquina) ainda utilizando as credenciais do EAS:

```bash
eas build --platform ios --profile production --local
```

A flag `--local` executa o build do Xcode no seu Mac, mas puxa as credenciais do EAS. Isso é útil quando você precisa depurar uma falha de build sem esperar na fila remota.

## Gerenciamento de Credenciais do EAS

A assinatura de código iOS é a fonte mais comum de atrito no CI do iOS. O EAS elimina grande parte disso ao se comunicar diretamente com a API Apple Developer em seu nome.

Quando você executa `eas build` pela primeira vez em um perfil de produção, o EAS pergunta:

```
? How would you like to manage your iOS credentials?
  > Expo Go Managed (recommended)
    Locally
```

Escolher "Expo Go Managed" autoriza o EAS a criar e gerenciar:

- Um certificado de distribuição (válido por 1 ano)
- Um perfil de provisionamento para a App Store vinculado ao seu bundle ID

O EAS armazena a chave privada do certificado de distribuição em seu armazenamento de credenciais, criptografada com as credenciais da sua conta. O perfil de provisionamento é regenerado automaticamente antes de cada build se tiver expirado ou se novos dispositivos foram adicionados.

Você pode inspecionar o que o EAS armazenou:

```bash
eas credentials
```

Para rotacionar um certificado (por exemplo, após um incidente de segurança):

```bash
eas credentials --platform ios
# Selecione o certificado e escolha "Remove"
# O próximo build gerará um novo automaticamente
```

Se sua equipe já possui um certificado de distribuição gerenciado manualmente ou via Fastlane Match, você pode importá-lo:

```bash
eas credentials --platform ios
# Selecione "Add existing certificate"
# Faça upload do .p12 e da senha
```

Uma vez importado, o EAS gerencia os lembretes de renovação e a sincronização do perfil de provisionamento a partir desse certificado.

## EAS Submit — Upload para o App Store Connect

Após um build de produção bem-sucedido, envie-o para o App Store Connect:

```bash
eas submit --platform ios --latest
```

`--latest` seleciona o build de produção bem-sucedido mais recente. Você também pode passar um ID de build específico:

```bash
eas submit --platform ios --id <build-id>
```

O EAS Submit usa a API do App Store Connect (não a ferramenta Transporter legada). Você se autentica com uma chave de API:

```bash
eas credentials --platform ios
# Selecione "App Store Connect API Key"
# Cole o Key ID, Issuer ID e a chave privada .p8
```

A etapa de submit faz o upload do IPA para o App Store Connect e o coloca em processamento no TestFlight. A partir daí, o fluxo padrão de revisão da App Store se aplica: envie uma nova versão para revisão pelo App Store Connect ou usando `xcrun altool` / a interface web.

Submit automatizado no CI após um build bem-sucedido:

```bash
eas build --platform ios --profile production --auto-submit
```

`--auto-submit` encadeia a etapa de submit ao build, usando a configuração `submit.production.ios` do `eas.json`.

## EAS Update — Atualizações JS Over-the-Air

O EAS Update envia bundles de bytecode Hermes diretamente para os usuários sem passar pelo processo de revisão da App Store. O mecanismo é a biblioteca `expo-updates`, que verifica um novo bundle ao abrir o app (e opcionalmente em segundo plano) e o instala antes do próximo lançamento.

### O que as Atualizações OTA Podem e Não Podem Alterar

As Diretrizes de Revisão da App Store da Apple permitem alterações exclusivamente em JavaScript entregues over the air. O que "somente JavaScript" significa na prática para um app React Native:

- Qualquer alteração no seu código-fonte TypeScript/JavaScript
- Alterações em assets (imagens, fontes) empacotados com a camada JS
- Adição ou alteração de telas, lógica de negócio, chamadas de API, estilização

O que requer um novo build binário e uma nova submissão à App Store:

- Alterações no código nativo (Swift, Objective-C, C++)
- Adição ou remoção de um módulo nativo (pois isso muda o binário compilado)
- Alterações nas permissões do `Info.plist`
- Alterações nas dependências do Podfile
- Qualquer alteração que modifique o `.xcarchive` compilado

Publicar uma alteração de código nativo como atualização OTA viola as diretrizes da Apple e arrisca a remoção do app. O EAS Fingerprint (descrito abaixo) ajuda a prevenir esse erro.

### Publicando uma Atualização

```bash
eas update --branch production --message "Fix checkout flow crash"
```

`--branch` mapeia para um canal de runtime. Usuários executando o binário de produção recebem a atualização. Binários de development e preview estão em branches separados e recebem apenas atualizações publicadas nesses branches.

Por padrão, o `expo-updates` verifica uma atualização a cada abertura do app e a aplica antes de mostrar a primeira tela (se o download for concluído dentro de um timeout). O timeout padrão é de 300ms — se a atualização não terminar de baixar até então, o bundle existente é executado e o novo é aplicado na próxima abertura.

Você pode configurar esse comportamento no `app.json`:

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 3000
    }
  }
}
```

`fallbackToCacheTimeout: 3000` dá à verificação de atualização até 3 segundos antes de recorrer ao bundle em cache. Aumente esse valor se seus usuários estiverem em conexões lentas e você preferir sempre mostrar o código mais recente.

### Rollback

Para reverter para uma atualização anterior:

```bash
eas update:rollback --branch production
```

Isso aponta o branch de volta para a atualização anteriormente ativa. Usuários no branch revertido recebem o bundle mais antigo na próxima abertura. Você também pode direcionar para um ID de atualização específico:

```bash
eas update:rollback --branch production --update-id <previous-update-id>
```

Para rollbacks de emergência, o canal pode ser apontado diretamente para um build binário conhecido como estável (ignorando atualizações completamente):

```bash
eas channel:edit production --rollout-percentage 0
```

Definir o rollout como 0% significa que nenhum usuário recebe a atualização — todos recorrem ao bundle binário que veio com a versão da loja.

## Fingerprint — Quando o EAS Detecta uma Alteração Nativa

O EAS Fingerprint é um hash da superfície nativa do seu projeto: módulos nativos, CocoaPods, configurações de build do Xcode, entradas do `Info.plist` e quaisquer outros arquivos que afetam o binário compilado. O EAS calcula um fingerprint em cada build e o armazena com o artefato de build.

Quando você executa `eas update`, o EAS compara o fingerprint do bundle JS atual com o fingerprint dos binários atualmente em produção. Se eles não correspondem, o EAS avisa:

```
Warning: The fingerprint of this update does not match the fingerprint of any active builds.
Updates are only compatible with builds that have the same native fingerprint.
Publishing this update may cause crashes on devices running incompatible builds.
```

Esse aviso é acionado quando:

- Você adicionou um novo módulo nativo (`npm install some-library` onde essa biblioteca tem um Podspec)
- Você alterou uma versão de dependência do CocoaPods
- Você modificou o `Info.plist` de uma forma que afeta o comportamento
- Você executou `pod install` com resultados diferentes do último build

O sistema de fingerprint não bloqueia a publicação — ele avisa. Mas se você publicar um bundle que usa um TurboModule não presente no binário, o app vai travar no ponto de chamada desse módulo.

O fluxo correto quando o fingerprint muda:

1. Execute `eas build --platform ios --profile production` para produzir um novo binário
2. Envie o novo binário para a App Store
3. Após a atualização ter sido propagada, publique atualizações OTA normalmente

Você pode inspecionar o fingerprint do seu projeto atual:

```bash
npx expo-updates fingerprint:generate --platform ios
```

E compará-lo com um build anterior:

```bash
npx expo-updates fingerprint:compare --platform ios --build-id <build-id>
```

## Expo Config Plugins — Evitando Edições Manuais em Código Nativo

Em um projeto React Native padrão, adicionar uma biblioteca com código nativo requer editar arquivos em `ios/`: `Info.plist`, `AppDelegate.mm`, `Podfile` ou configurações de build do Xcode. Projetos gerenciados pelo EAS usam Config Plugins como alternativa.

Um Config Plugin é uma função JavaScript que recebe a configuração do Expo e retorna uma versão modificada, incluindo modificações nos arquivos nativos. No momento do build (`eas build`), o Expo executa todos os plugins configurados para gerar o diretório `ios/` do zero (ou aplicar patches nele). Isso significa que o diretório `ios/` pode ser regenerado de forma determinística a partir do seu `app.json` e do seu código JavaScript.

Exemplo: adicionando permissão de câmera via plugin em vez de editar o `Info.plist` manualmente:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "This app uses the camera to scan QR codes."
        }
      ]
    ]
  }
}
```

A implementação do plugin `expo-camera` adiciona `NSCameraUsageDescription` ao `Info.plist` automaticamente durante o build. Você nunca toca no diretório `ios/` para isso.

Para uma biblioteca nativa customizada que não vem com um plugin, você escreve um:

```javascript
// plugins/withCustomFramework.js
const { withXcodeProject } = require('@expo/config-plugins');

const withCustomFramework = (config) => {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    project.addFramework('CustomSDK.framework', {
      customFramework: true,
      embed: true,
    });
    return config;
  });
};

module.exports = withCustomFramework;
```

Registre-o no `app.json`:

```json
{
  "expo": {
    "plugins": [
      "./plugins/withCustomFramework"
    ]
  }
}
```

Config Plugins são a forma padrão de configurar comportamento nativo em projetos com Expo SDK 56. Eles mantêm o diretório `ios/` reproduzível, o que é um pré-requisito para o workflow gerenciado do EAS Build. Se você commitar o diretório `ios/` (bare workflow), os plugins ainda são executados, mas a saída é gravada nos seus arquivos commitados — a distinção é se o Expo é dono do diretório ou você é.

## Resumo

O EAS Build substitui o runner macOS de CI por builders macOS hospedados gerenciados pela Expo. Os três perfis do `eas.json` cobrem o ciclo de vida completo de build do iOS: builds para simulador no desenvolvimento, IPAs assinados via Ad-Hoc para distribuição interna de QA e IPAs assinados para a App Store em produção. O gerenciamento de credenciais (perfis de provisionamento, certificados de distribuição) é automatizado via API Apple Developer. O EAS Submit encaminha o IPA assinado para o App Store Connect sem etapas manuais do Transporter. O EAS Update entrega bundles de bytecode Hermes over the air para alterações exclusivamente em JS dentro do escopo permitido pela Apple, com rollback apontando o canal de atualização de volta para um bundle anterior ou para rollout zero. O Fingerprint detecta quando a superfície nativa mudou e um novo build binário é necessário antes de publicar uma atualização. Os Config Plugins substituem edições manuais em `ios/` por configuração declarativa que sobrevive a uma reconstrução limpa.
