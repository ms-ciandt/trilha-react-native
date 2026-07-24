---
title: Debugging React Native on iOS
---

# Debugging React Native no iOS

Depurar um aplicativo React Native como desenvolvedor Swift exige transitar entre dois mundos: o runtime do JavaScript e a camada nativa do iOS. Você já sabe usar Xcode, lldb e Instruments. Este módulo mapeia essas habilidades para a stack de debugging do React Native e adiciona as ferramentas do lado JS que você precisa para rastrear problemas em ambas as camadas.

## React Native DevTools

O React Native 0.76 vem com um novo debugger oficial que substitui o debugger JS baseado no Flipper e o antigo redirecionamento para o Chrome DevTools. Ele funciona sobre o Chrome DevTools Protocol (CDP) e se integra diretamente com o bundler Metro.

Para abri-lo, balance o dispositivo ou pressione `Cmd+D` no iOS Simulator, depois toque em **Open DevTools**. Alternativamente, pressione `j` no terminal do Metro.

A janela do DevTools oferece:

- Uma aba **Console** com toda a saída de log JS, incluindo avisos do LogBox via `console.warn` e erros de tela vermelha via `console.error`
- Uma aba **Sources** onde você pode definir breakpoints nos seus arquivos TypeScript/JavaScript (o Metro serve os source maps automaticamente)
- Uma aba **Memory** para snapshots de heap ao executar com Hermes
- Uma aba **Profiler** que grava flame graphs do JS

Como o RN 0.76 usa Hermes e a New Architecture por padrão, o DevTools se conecta via o endpoint CDP do Hermes que o Metro expõe na porta 8081. Nenhuma configuração adicional é necessária para um projeto Expo padrão ou bare RN.

### Breakpoints em código TypeScript

Quando você define um breakpoint na aba Sources, verá seus arquivos `.ts`/`.tsx` originais, não a saída empacotada. O Metro incorpora source maps por padrão em builds de desenvolvimento. No Simulator, o debugger pausa a execução e mostra o call stack, as variáveis locais e permite avaliar expressões no console — o mesmo fluxo que você usa no Safari Web Inspector para projetos web.

## Debugger Hermes via Chrome DevTools Protocol

O Hermes expõe um servidor CDP ao qual qualquer cliente compatível com CDP pode se conectar. O React Native DevTools é o cliente recomendado, mas você também pode conectar o Chrome diretamente.

Com o Metro em execução, abra `chrome://inspect` no Chrome, clique em **Configure** e adicione `localhost:8081`. O target do Hermes aparece em **Remote Target**. Clique em **Inspect** para abrir uma sessão completa do Chrome DevTools conectada ao runtime JS.

Essa abordagem é útil quando você quer usar recursos específicos do Chrome DevTools, como os flame charts detalhados do painel Performance ou o waterfall de requisições do painel Network. Observe que o painel Network exibe apenas chamadas `fetch` e `XMLHttpRequest` que o Hermes intercepta; chamadas de rede nativas feitas em Swift (por exemplo, chamadas `URLSession` de um TurboModule) não aparecerão aqui.

## Flipper no macOS

O Flipper é um app desktop Electron que se conecta a um app RN em execução por meio de um socket local. Embora o React Native DevTools agora cubra o caso de uso de debugging JS, o Flipper ainda oferece plugins exclusivos do lado nativo que não têm equivalente na nova toolchain.

Instale o Flipper em `https://fbflipper.com`. O app se conecta automaticamente quando você executa um build de debug que inclui o cliente Flipper (projetos bare React Native o incluem por padrão; projetos Expo requerem o plugin `expo-community-flipper`).

### Plugin Network

O plugin Network intercepta todas as requisições HTTP e HTTPS feitas pelo app, incluindo aquelas de SDKs nativos de terceiros, e as exibe em uma tabela com headers de requisição, headers de resposta, body e timing. Esta é a forma mais fácil de inspecionar o tráfego de módulos nativos que não passam pela camada JS.

Para inspeção HTTPS, o Flipper instala um certificado personalizado no simulador. Em um dispositivo físico, você deve confiar manualmente no certificado do Flipper em **Configurações > Geral > Sobre > Ajustes de Confiança de Certificado**.

### Layout Inspector

O Layout Inspector renderiza uma árvore visual ao vivo de todos os componentes React Native. Você pode tocar em qualquer elemento no simulador e o Layout Inspector o destaca, mostrando suas props, estilo e layout calculado (o frame calculado pelo Yoga). Isso é equivalente ao debugger de hierarquia de views do Xcode, mas para a árvore de componentes React.

Quando um layout está errado, compare o frame calculado pelo Yoga no Flipper com o frame da view nativa no debugger de hierarquia de views do Xcode para determinar se o bug está na lógica de layout JS ou em uma view nativa que não está respeitando suas constraints.

### Debugger Hermes no Flipper

O Flipper inclui um plugin Hermes Debugger que é anterior ao React Native DevTools. Ele oferece o mesmo debugging JS baseado em CDP que o novo DevTools, mas dentro da interface do Flipper. Com o RN 0.76, o caminho recomendado é o React Native DevTools independente, mas o plugin do Flipper continua funcional se você preferir manter o debugging em uma única janela junto com os plugins Network e Layout.

## Overlay de Erros do Metro Bundler

Quando o Metro encontra um erro de sintaxe ou um módulo ausente, ele envia um erro ao app, que exibe um overlay em tela cheia com o nome do arquivo, número da linha e um stack trace. O overlay tem um botão **Dismiss** que o oculta sem reiniciar o app.

Situações comuns em que o overlay aparece:

- Erros de compilação TypeScript (o Metro usa Babel por padrão; mude para o transformer TypeScript para mensagens de erro com reconhecimento de tipos)
- Imports ausentes ou com capitalização incorreta em um sistema de arquivos case-sensitive (o sistema de arquivos do Mac é case-insensitive por padrão, então erros que aparecem apenas no CI Linux podem ser difíceis de reproduzir localmente)
- Avisos de dependência circular que escalam para erros

O stack trace do overlay linka para o arquivo fonte. Clicar em um frame abre o arquivo na linha correta no seu editor, se você tiver a variável de ambiente `REACT_EDITOR` definida (por exemplo, `export REACT_EDITOR=code` para o VS Code).

## LogBox

O LogBox é o sistema de exibição de avisos e erros dentro do app que substituiu os sistemas anteriores YellowBox e RedBox. Ele aparece como uma notificação flutuante para avisos e como um modal em tela cheia para erros JS não capturados.

Os avisos são recolhidos por padrão. Toque em um aviso para expandir o component stack completo, que mostra a cadeia de componentes React que gerou o aviso. Esse component stack é distinto do call stack JS e vem do rastreamento de proprietário do React.

Para erros não capturados, o LogBox mostra:

- A mensagem de erro
- O call stack JS com nomes de arquivos e números de linha mapeados pelo source map
- Um component stack se o erro foi lançado durante o render

Em builds de produção, o LogBox é removido. Erros JS não capturados em produção farão o app fechar silenciosamente ou acionar o crash reporter nativo, dependendo de como seu error boundary está configurado.

### Ignorando avisos

Durante o desenvolvimento, você pode suprimir avisos conhecidos de terceiros:

```js
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Warning: ...']);
```

Evite usar `LogBox.ignoreAllLogs()`, exceto em ambientes de teste — ele oculta avisos legítimos.

## Xcode Instruments para Frames Nativos

O Instruments é a ferramenta certa quando você precisa ver tanto a thread JS quanto as threads nativas juntas. O instrumento **Time Profiler** registra amostras de CPU em todas as threads e pode ser simbolizado para mostrar tanto frames nativos Swift/ObjC quanto, com source maps do Hermes, frames JS.

Para realizar o profiling:

1. Abra o Xcode, selecione **Product > Profile** (`Cmd+I`) para fazer um build semelhante ao de release com símbolos de debug.
2. Escolha **Time Profiler** no seletor de templates do Instruments.
3. Clique em **Record** e reproduza a interação lenta.
4. Pare a gravação e examine a **Call Tree**.

Você verá threads nomeadas conforme sua finalidade: a thread principal (onde o UIKit e o renderer Fabric rodam), a thread JS (onde sua lógica React roda), a fila serial em background usada pelos TurboModules e quaisquer threads que seu código nativo cria.

Trabalho JS pesado aparece como tempo gasto em `JSContext::evaluateScript` ou frames do runtime Hermes. Trabalho nativo pesado aparece nos seus frames Swift ou ObjC. Interações que bloqueiam a thread principal causam quedas de frames visíveis.

### Lendo a thread JS do Hermes no Instruments

Código compilado pelo JIT do Hermes aparece no Instruments como frames `hbc_<número>` ou `JSRuntime`. Para obter nomes de funções JS legíveis, você precisa pós-processar o trace com `hermes-profile-transformer` (veja a seção de simbolização de crashes abaixo). Para uma visualização rápida sem simbolização, a saída do profiler de sampling do Hermes no React Native DevTools é mais fácil de ler.

## lldb para Crashes Nativos

Quando um crash nativo ocorre em um app React Native, ele frequentemente se origina em um TurboModule, um componente Fabric ou um SDK nativo de terceiros. O stack JS desaparece nesse ponto; você está depurando código nativo.

Anexe o lldb a um app em execução:

```
(lldb) process attach --name YourApp
```

Ou defina um breakpoint simbólico no Xcode em `__RCTFatal` para capturar o handler de erros nativos do React Native antes que ele termine o processo:

```
breakpoint set --name __RCTFatal
```

Quando o breakpoint disparar, o call stack mostra os frames nativos que levaram ao crash. Você pode imprimir a mensagem de erro:

```
(lldb) po [NSThread callStackSymbols]
(lldb) expr NSString *msg = (NSString *)error.localizedDescription; NSLog(@"%@", msg);
```

Para crashes EXC_BAD_ACCESS, habilite o **Malloc Stack Logging** na aba Diagnostics do scheme. O Xcode capturará o stack de alocação da memória liberada, que aparece no **Memory Graph Debugger**.

### RCTFatal e exceções JS que surgem como crashes nativos

O React Native encapsula exceções JS não capturadas e chama `RCTFatal`, que por padrão chama `abort()`. Em builds de debug, isso mostra um overlay do LogBox. Em builds de release, o processo termina e gera um relatório de crash nativo. O relatório de crash nativo terá `RCTFatal` no topo do stack e a mensagem de erro JS original no campo de motivo da exceção.

## Source Maps e Simbolização de Crashes do Hermes

Em produção, seu bundle JS é minificado e o bytecode Hermes é compilado a partir dele. Relatórios de crash mostram offsets de bytecode Hermes em vez de nomes de funções JS legíveis. Para recuperar frames de stack legíveis, você precisa do source map e das ferramentas do Hermes.

### Gerando source maps

Para um app bare React Native:

```sh
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --sourcemap-output ios/main.jsbundle.map
```

Armazene tanto o `.jsbundle` quanto o `.jsbundle.map` junto com seus artefatos de release. Associe-os a um crash pelo número de build ou commit SHA.

### hermes-profile-transformer

Instale-o a partir do pacote Hermes no seu projeto:

```sh
npx hermes-profile-transformer \
  --source-map ios/main.jsbundle.map \
  --input crash-report.json \
  --output symbolicated.json
```

A saída é um arquivo no formato Chrome Trace Event que você pode carregar em `chrome://tracing` ou na aba Performance do React Native DevTools.

### Arquivos dSYM para simbolização nativa

Para os frames nativos no mesmo relatório de crash, você precisa do bundle `.dSYM` gerado durante o passo de archive do Xcode. Os archives do Xcode armazenam arquivos `.dSYM` automaticamente. Faça o upload deles para seu serviço de relatório de crashes ou use `atos` localmente:

```sh
atos -arch arm64 -o YourApp.app.dSYM/Contents/Resources/DWARF/YourApp \
  -l 0x<load_address> 0x<crash_address>
```

O organizador **Crashes** do Xcode (`Window > Organizer > Crashes`) re-simboliza relatórios de crash automaticamente quando o `.dSYM` correspondente está disponível no archive.

## Integração com Crash Reporters: Sentry e Firebase Crashlytics

Para monitoramento em produção, um crash reporter oferece dados de crash agregados com simbolização automática.

### Sentry iOS SDK

Adicione o SDK Sentry para React Native:

```sh
npx expo install @sentry/react-native
npx sentry-wizard -i reactNative
```

O wizard configura as build phases do iOS para fazer upload dos arquivos `.dSYM` e source maps para o Sentry automaticamente em cada build de release. No seu `AppDelegate.swift`, o SDK é inicializado via o arquivo `sentry.properties` gerado.

O Sentry captura tanto erros JS (do handler de erros do RN) quanto crashes nativos (do crash reporter do iOS). No dashboard do Sentry, um crash de um TurboModule mostra frames Swift nativos simbolizados via `.dSYM` e, no mesmo problema, os breadcrumbs JS que levaram ao crash.

### Firebase Crashlytics

Adicione `@react-native-firebase/crashlytics` e configure a build phase do Crashlytics no Xcode:

1. Adicione uma **New Run Script Phase** após a fase de compilação de fontes.
2. Defina o script para chamar o binário `upload-symbols` do Firebase SDK.

O Crashlytics captura crashes nativos automaticamente. Para erros JS, chame:

```ts
import crashlytics from '@react-native-firebase/crashlytics';

crashlytics().recordError(error);
```

O Crashlytics agrupa crashes por similaridade de stack trace. No iOS, ele usa o `.dSYM` que você faz upload para simbolizar frames nativos. Frames JS requerem o passo de upload do source map, que o Firebase CLI gerencia:

```sh
firebase crashlytics:symbols:upload --app=<APP_ID> ios/main.jsbundle.map
```

## Safari Web Inspector para JSC (Referencia Legada)

Antes do Hermes se tornar a engine padrão, o React Native no iOS usava o JavaScriptCore (JSC), a mesma engine do Safari. Ao trabalhar com um build JSC, o Safari Web Inspector podia se anexar diretamente ao contexto JS.

Para usá-lo: abra o Safari, habilite o menu **Develop** nas preferências, conecte um dispositivo ou abra o Simulator e selecione o contexto JSC do app no menu **Develop**.

Com o RN 0.76 e o Hermes como padrão, o Safari Web Inspector não se anexa mais ao runtime JS. Se você está mantendo um projeto que desabilitou explicitamente o Hermes (`hermes_enabled = false` no Podfile), o Safari Web Inspector continua sendo o debugger JS correto. Para todos os novos projetos, use o React Native DevTools.

## Estrategia de Debugging por Sintoma

**Tela branca no lançamento sem overlay do LogBox**: o bundle JS falhou ao carregar antes de o React Native conseguir inicializar o LogBox. Verifique o terminal do Metro em busca de erros de bundle, ou em um build de release verifique o log de crash nativo na janela Devices and Simulators do Xcode (`Cmd+Shift+2`).

**Crash em um TurboModule**: defina um breakpoint em `__RCTFatal` no Xcode, reproduza o crash e inspecione o call stack nativo no debugger. O dashboard do Sentry ou Crashlytics mostrará o mesmo stack em produção.

**Animacao lenta ou quedas de frames**: use o Time Profiler do Instruments para identificar qual thread está saturada. Se for a thread JS, faça o profiling com o React Native DevTools e mova o processamento pesado para um worklet ou um módulo nativo. Se for a thread principal, procure por chamadas nativas síncronas sendo feitas a partir do `layoutSubviews` de um componente Fabric.

**Requisicao de rede falhando silenciosamente**: use o plugin Network do Flipper para ver a requisição e a resposta, incluindo redirecionamentos e erros TLS que o `fetch` absorve em um erro genérico de rede.

**Crash apenas em producao, nao em desenvolvimento**: a causa mais comum é a minificação removendo uma variável global que estava implicitamente disponível, ou a compilação AOT do Hermes rejeitando código que o modo interpretado do Hermes aceitava. Faça um build do scheme de release localmente (`Cmd+Shift+I` no Xcode) e anexe o debugger ao build de release para reproduzi-lo com símbolos.
