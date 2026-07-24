---
title: Bundle Size and Startup Optimization
---

# Otimizacao de Tamanho de Bundle e Inicializacao

Apps React Native no iOS enfrentam um desafio unico de inicializacao: antes que qualquer codigo Swift ou Objective-C execute sua logica de negocio, o runtime precisa inicializar o motor JavaScript, carregar o bundle JS do disco, avalia-lo e conduzir o primeiro render. Para desenvolvedores iOS acostumados com Swift compilado AOT, esse pipeline parece desconhecido. Este artigo explica cada etapa, mostra onde o tempo e gasto e fornece tecnicas concretas para reduzir o tempo de inicializacao e o peso do bundle.

## Detalhamento do Cold Start

Um cold start do React Native no iOS tem cinco fases sequenciais. Entender a fronteira entre cada fase indica onde aplicar esforco.

### Fase 1: Inicializacao Nativa

O processo iOS e iniciado. UIApplicationMain executa, AppDelegate roda, e RCTReactNativeFactory (ou RCTAppDelegate em configuracoes mais antigas) cria o RCTBridge ou o novo host Bridgeless. O runtime JSI e alocado. Em builds com New Architecture, isso tambem inicializa o renderer Fabric e o registro de TurboModules. Essa fase e puro Objective-C/Swift e e medida em milissegundos de um digito em dispositivos modernos.

### Fase 2: Inicializacao do Hermes

A instancia do motor Hermes e criada. Na New Architecture (React Native 0.76+), Hermes e o unico motor suportado. O motor inicializa seu heap, registra intrinsicos e prepara o runtime para execucao. Essa etapa e rapida — tipicamente abaixo de 5 ms — porque Hermes e projetado como um motor embarcado com footprint minimo de inicializacao.

### Fase 3: Carregamento do Bundle JS

O arquivo de bundle e lido de `main.jsbundle` (incorporado no app bundle sob `Frameworks/` ou diretamente no IPA dependendo da sua configuracao do Xcode). Dois cenarios existem:

- **Bundle de bytecode Hermes (.hbc)**: o arquivo contem bytecode pre-compilado. Hermes pula completamente o parsing e a construcao de AST, indo direto para execucao. Tempos tipicos de carregamento para um app de tamanho medio: 80–150 ms.
- **Bundle JS em codigo-fonte**: Hermes precisa fazer parsing, compilar para IR e depois executar. Adicione 200–400 ms dependendo do tamanho do bundle.

### Fase 4: Avaliacao do JS (Execucao do Modulo Raiz)

O modulo de entrada (`index.js`) executa. Todas as chamadas `require()` que nao sao lazy executam seus modulos. `AppRegistry.registerComponent` roda. Listeners de eventos sao adicionados. A inicializacao do store acontece. Essa e a fase mais controlavel.

### Fase 5: Primeiro Render

O React reconcilia a arvore de componentes inicial. Fabric produz shadow nodes e efetua o commit do layout. O primeiro frame aparece. O tempo-ate-interacao depende da complexidade dos componentes, carregamento de imagens e quaisquer operacoes sincronas no `useEffect` com `[]`.

## Pre-Compilacao de Bytecode Hermes

O Hermes compila JavaScript para bytecode em tempo de build usando o compilador `hermesc` empacotado com o CocoaPod `hermes-engine`. A compilacao acontece durante o `xcodebuild` como um script de build phase injetado pela infraestrutura de CocoaPods do React Native.

Quando voce executa `pod install`, o script do Podfile configura uma build phase `Bundle React Native code and images` no seu projeto Xcode. Essa fase chama `react-native bundle` para produzir um bundle JS e, em seguida, o passa pelo `hermesc` para produzir um arquivo `.hbc`. O arquivo `.hbc` e o que vai dentro do IPA.

O formato `.hbc` e uma imagem de bytecode mapeavel em memoria. Hermes usa `mmap` para mape-lo diretamente — as paginas sao carregadas sob demanda pelo SO, nao lidas sequencialmente. Isso significa que bundles grandes nao incorrem no custo total de leitura antecipadamente; apenas os caminhos de codigo executados causam page faults.

Para verificar se a compilacao de bytecode esta ativa, inspecione o log de build no Xcode e confirme que a fase inclui `--emit-binary`. Voce tambem pode checar o arquivo de saida:

```bash
file ios/build/main.jsbundle
# Expected: LLVM IR bitcode  (this is the Hermes bytecode magic header)
```

Se o arquivo for reportado como texto ASCII, a compilacao de bytecode nao esta sendo executada e a inicializacao sera mais lenta.

## Hermes vs JSC: Numeros de Inicializacao Medidos

O React Native 0.68 lançou Hermes como opt-in. A partir do 0.70 tornou-se padrao. A partir do 0.76 o suporte ao JSC foi removido do pacote principal. Esses numeros de benchmarks da comunidade e das proprias medicoes da Meta fornecem orientacao:

| Cenario | JSC (legado) | Hermes (bytecode) | Delta |
|---|---|---|---|
| Tempo ate o primeiro frame, app pequeno | ~900 ms | ~520 ms | -42% |
| Tempo ate o primeiro frame, app grande | ~2200 ms | ~980 ms | -55% |
| Memoria na inicializacao | ~90 MB | ~60 MB | -33% |
| Tempo de parsing do bundle, fonte de 3 MB | ~380 ms | ~0 ms (bytecode) | -100% |

A vantagem do Hermes vem de tres fontes: sem fase de parsing, um formato de bytecode compacto com um working set menor, e compilacao lazy de funcoes dentro do motor (funcoes nao chamadas no caminho frio sao compiladas na primeira chamada, nao antecipadamente).

## Tree-Shaking do Metro Bundler

O Metro nao realiza eliminacao de codigo morto da mesma forma que o Webpack faz para web. O Metro usa semantica CommonJS `require()`, que sao dinamicas por padrao e resistem a analise estatica. No entanto, varias tecnicas reduzem o tamanho do bundle:

**Use imports nomeados de modulos ES** quando a biblioteca os suportar. O `transformer` do Metro pode lidar com ESM e fazer tree-shake de re-exports se o pacote fornecer um campo `"exports"` com a condicao `"import"`. Verifique o `package.json` nas suas dependencias para isso.

**Habilite `optimizeForSize` na config do Metro.** Esse flag habilita passes adicionais de minificacao:

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  transformer: {
    minifierConfig: {
      compress: {
        reduce_funcs: false,  // keep Hermes compatible
      },
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

**Audite imports com `source-map-explorer`** (coberto em detalhes abaixo) antes de se comprometer com qualquer investimento em tree-shaking.

## Imports Lazy com React.lazy e Suspense

Telas que nao sao visiveis no caminho frio nao devem ser executadas na inicializacao. React.lazy adia o `require()` de um modulo ate que o componente seja renderizado pela primeira vez.

```tsx
import React, { Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

// The SettingsScreen module is NOT loaded until the user navigates to it
const SettingsScreen = React.lazy(() => import('./screens/SettingsScreen'));

function AppNavigator() {
  return (
    <Suspense fallback={<ActivityIndicator />}>
      <SettingsScreen />
    </Suspense>
  );
}
```

A New Architecture do React Native suporta `React.lazy` nativamente. O fallback do Suspense renderiza sincronamente enquanto o chunk lazy carrega de forma assincrona.

Combine imports lazy com a opcao lazy do React Navigation:

```tsx
<Stack.Screen
  name="Settings"
  getComponent={() => require('./screens/SettingsScreen').default}
  options={{ lazy: true }}
/>
```

Isso adia tanto o `require()` quanto a criacao da shadow tree do Fabric ate que a navegacao ocorra.

## Inline Requires para Modulos Pesados

Inline requires movem uma chamada `require()` do momento de avaliacao do modulo para o momento do primeiro uso. O Metro bundler pode automatizar isso com `inlineRequires`:

```js
// metro.config.js
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
```

Com `inlineRequires: true`, o Metro reescreve imports de nivel superior como:

```js
import { format } from 'date-fns';
```

em requires no local de uso:

```js
// Inside the function body where format is used
const { format } = require('date-fns');
```

Isso significa que `date-fns` so carrega quando a funcao que o usa e executada pela primeira vez, nao no momento de avaliacao do bundle.

Tenha cuidado com modulos que tem efeitos colaterais no momento do require (SDKs de analytics, polyfills). Envolver esses em inline requires pode fazer com que eles inicializem tarde demais. Teste cuidadosamente com o Xcode Instruments apos habilitar essa opcao.

## RAM Bundles vs Hermes Indexed Bundle

RAM bundles eram a solucao pre-Hermes para o tempo de inicializacao. Um RAM bundle divide os modulos em segmentos individualmente carregaveis para que o runtime pudesse buscar apenas os modulos executados sob demanda. O Metro suportava dois formatos de RAM bundle: file system (cada modulo um arquivo separado) e indexed (um unico arquivo com uma tabela de offset de modulos).

Com Hermes e o formato de bytecode `.hbc`, os RAM bundles sao obsoletos. Hermes alcanca o mesmo objetivo — carregar apenas o codigo executado — atraves de sua propria compilacao lazy de funcoes e do demand paging em nivel de SO do arquivo `.hbc` mapeado em memoria. Habilitar RAM bundles junto com Hermes nao fornece beneficio algum e pode conflitar com a compilacao de bytecode.

Se voce esta migrando de React Native abaixo de 0.70 e ve `bundleType: 'ram'` na sua config do Metro ou em scripts de build, remova-o. O Hermes indexed bundle o substitui completamente.

## Medindo a Inicializacao com Xcode Instruments os_signpost

`os_signpost` e a ferramenta correta para medir as fases de inicializacao do React Native no iOS. Ela se integra com o instrumento os_signpost do Xcode Instruments e fornece intervalos nomeados na linha do tempo do Instruments.

O React Native emite signposts automaticamente para varias fases de inicializacao quando compilado em configuracao de release. Para visualiza-los:

1. Abra o Xcode, selecione seu scheme e escolha `Product > Profile` (Command+I).
2. Selecione o template do instrumento `os_signpost` ou adicione-o a um template personalizado.
3. Execute o app pelo Instruments.
4. Na linha do tempo, expanda as lanes de signpost para seu processo.

Voce vera intervalos para `RCTBridge init`, `loadBundleAtURL` e `runApplication`. Esses correspondem diretamente as fases 1–5 descritas acima.

Para adicionar seus proprios signposts em torno de logica de negocio:

```swift
// AppDelegate.swift
import os

private let log = OSLog(subsystem: "com.yourapp", category: "startup")

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
  os_signpost(.begin, log: log, name: "NativeInit")
  // setup code
  os_signpost(.end, log: log, name: "NativeInit")
  return true
}
```

No lado JavaScript, voce pode emitir signposts via um TurboModule que encapsula `OSLog` — ou usar `react-native-performance` que encapsula `PerformanceMark` e faz bridge para tracing nativo automaticamente.

Para uma medicao rapida sem o Instruments, `console.time` / `console.timeEnd` e legivel no log do Metro durante o desenvolvimento, mas builds de release silenciam o console. Use Instruments para medicoes em configuracao de release.

## Otimizacao de Imagens

Imagens frequentemente sao as maiores contribuintes para o tempo de inicializacao percebido apos o bundle JS. Duas estrategias importam:

### Formato WebP

WebP fornece tamanhos de arquivo 25–35% menores que PNG com qualidade visual equivalente. O componente Image do React Native suporta WebP nativamente no iOS e Android. Converta seus assets estaticos durante o pipeline de build usando `cwebp`:

```bash
cwebp -q 85 assets/hero.png -o assets/hero.webp
```

Referencie-os identicamente no JSX:

```tsx
<Image source={require('./assets/hero.webp')} />
```

iOS 14+ decodifica WebP nativamente. Para suporte ao iOS 13, voce precisa do pod `libwebp`.

### Asset Catalog @2x / @3x vs require() Dinamico

A resolucao `require('./img.png')` do React Native escolhe automaticamente `img@2x.png` ou `img@3x.png` em tempo de execucao com base na densidade de pixels do dispositivo. Essas imagens sao empacotadas no IPA sob `assets/`.

Para imagens usadas no caminho de lancamento (splash screen, hero da primeira tela), considere registra-las no Asset Catalog do Xcode (`Assets.xcassets`). Imagens do Asset Catalog sao decodificadas pelo cache de imagens do SO e estao disponiveis antes do runtime JS iniciar. Acesse-as via um modulo nativo:

```swift
// In a TurboModule
@objc func getHeroImage() -> UIImage? {
  return UIImage(named: "HeroImage")  // Loaded from Asset Catalog
}
```

Para imagens carregadas apenas apos interacao, `require('./img.png')` e adequado. A distincao importa apenas para assets que aparecem no primeiro frame.

### Prefetching

Para imagens necessarias imediatamente apos o primeiro render mas nao nele:

```tsx
import { Image } from 'react-native';

// Called once at app start, before the screen that needs these images
Image.prefetch('https://cdn.example.com/avatar.webp');
```

Isso aquece o cache de imagens para que o render subsequente de `<Image>` seja concluido sem um round-trip de rede.

## Reduzindo o Tamanho do Bundle com source-map-explorer

`source-map-explorer` le o bundle JS e seu source map e produz um treemap mostrando quais modulos contribuem com quantos bytes. Instale-o como dependencia de desenvolvimento:

```bash
npm install --save-dev source-map-explorer
```

Gere um bundle com source maps:

```bash
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/main.jsbundle \
  --sourcemap-output /tmp/main.jsbundle.map
```

Execute o explorer:

```bash
npx source-map-explorer /tmp/main.jsbundle /tmp/main.jsbundle.map
```

Uma janela de navegador abre com um treemap interativo. Descobertas comuns:

- **Dados de locale do moment.js**: o moment inclui todos os locales por padrao. Substitua o moment por `date-fns` (com suporte a tree-shaking) ou use o equivalente do `moment-locales-webpack-plugin` para Metro.
- **lodash**: importar `import _ from 'lodash'` empacota a biblioteca inteira. Use `import debounce from 'lodash/debounce'` para funcoes individuais, ou substitua por equivalentes nativos.
- **Polyfills redundantes**: o React Native 0.76 tem como alvo motores JS modernos. Polyfills para `Promise`, `Map`, `Set` e `fetch` ja sao fornecidos pelo runtime. Pacotes de terceiros que fazem polyfill novamente adicionam peso morto.
- **Conjuntos de icones nao utilizados**: bibliotecas como `react-native-vector-icons` podem incluir multiplas fontes de icones. Configure o resolver do Metro para incluir apenas os conjuntos que voce usa.

Execute `source-map-explorer` apos cada adicao de dependencia como parte da revisao de codigo. Uma adicao de 10 KB em uma dependencia pode se tornar 200 KB no bundle se ela trouxer uma dependencia transitiva grande.

## Combinando Tecnicas: Uma Lista de Verificacao Pratica

Ao diagnosticar uma inicializacao lenta, aplique mudancas nesta ordem — maior impacto primeiro, com o menor risco de introduzir regressoes:

1. Confirme que a compilacao de bytecode Hermes esta ativa no log de build do Xcode.
2. Execute `source-map-explorer` e elimine os maiores modulos inesperados.
3. Habilite `inlineRequires: true` na config do Metro e teste por regressoes de efeitos colaterais.
4. Envolva telas que nao estao no caminho de lancamento em `React.lazy`.
5. Converta assets PNG usados no primeiro frame para WebP.
6. Mova imagens do primeiro frame para o Asset Catalog do Xcode.
7. Perfile com o Xcode Instruments os_signpost para confirmar o efeito de cada mudanca no tempo de inicializacao medido.

Cada etapa e verificavel de forma independente. Meça antes e depois de cada mudanca em um build de release em um dispositivo fisico — o iOS Simulator usa a CPU do Mac host e nao reflete o tempo de inicializacao real.
