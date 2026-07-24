---
title: Hermes on iOS
---

# Hermes no iOS

Por anos, o React Native no iOS executava JavaScript usando o mesmo mecanismo que alimenta o Safari: o JavaScriptCore (JSC). Isso mudou no React Native 0.70, quando a Meta introduziu o Hermes como mecanismo opcional para iOS, e ele se tornou o padrão no React Native 0.74. Se voce ja construiu aplicativos iOS com WKWebView ou usou JSContext no seu codigo Swift, ja trabalhou com o JSC indiretamente — o Hermes e um runtime completamente diferente, criado especificamente para o React Native.

## JavaScriptCore: A Conexao com o Safari

O JavaScriptCore e o mecanismo JavaScript da Apple, embutido em todos os sistemas operacionais Apple e exposto aos desenvolvedores por meio do `JavaScriptCore.framework`. Quando voce escreve codigo Swift como:

```swift
import JavaScriptCore

let context = JSContext()
context?.evaluateScript("1 + 1")
```

voce esta usando o mesmo mecanismo que o React Native historicamente usava para executar seu bundle JavaScript na inicializacao do aplicativo.

O JSC era um padrao razoavel — ja estava no dispositivo, nao exigia tamanho binario adicional, e e altamente otimizado para os tipos de padroes JavaScript dinamicos encontrados em navegadores web. No entanto, essas otimizacoes visam uma carga de trabalho que o React Native nao possui: sessoes de longa duracao com tempo de aquecimento do JIT, otimizacao especulativa de loops quentes e frequentes interacoes com o DOM. Um aplicativo React Native inicia, executa um bundle relativamente fixo, navega entre telas e ocasionalmente faz requisicoes de rede. O compilador JIT do JSC gasta energia otimizando caminhos de codigo que podem nunca se tornar suficientemente quentes para justificar o custo.

A Apple tambem restringe a compilacao JIT no iOS para processos de terceiros (nao apenas para o React Native — esta e uma restricao geral da plataforma). O JSC no iOS funciona sem o nivel JIT completo que usa no macOS ou no Safari, o que anula parcialmente sua maior vantagem.

## O que e o Hermes

O Hermes e um mecanismo JavaScript de codigo aberto construido pela Meta, projetado especificamente para a carga de trabalho do React Native. A decisao arquitetural fundamental e que o Hermes nao usa um compilador JIT. Em vez disso, ele compila JavaScript para bytecode em tempo de build — antes que o aplicativo seja instalado em um dispositivo.

Esta e uma troca que faz sentido para dispositivos moveis nativos: voce nao esta executando JavaScript arbitrario da internet, esta executando um bundle que voce mesmo construiu e empacotou. Voce pode fazer o trabalho custoso durante seu pipeline de CI/CD em vez de no dispositivo do usuario.

Da perspectiva de um desenvolvedor Swift, o modelo mental e familiar: seu codigo Swift e compilado para codigo de maquina durante o build, nao interpretado em tempo de execucao. O Hermes aplica a mesma ideia ao JavaScript. O bundle `.js` em seu archive e transformado em `.hbc` (Hermes Bytecode) antes de ser embutido no `.ipa`.

## Hermes vs JSC: Comparacao Lado a Lado

| Caracteristica | JavaScriptCore (legado) | Hermes |
|---|---|---|
| Modelo de execucao JS | Interpretacao + JIT (JIT desativado no iOS) | Bytecode pre-compilado, apenas interpretador |
| Etapa de compilacao | Tempo de execucao (no dispositivo) | Tempo de build (CI/CD) |
| TTI (Time to Interactive) | Mais lento — bundle analisado e compilado na primeira inicializacao | Mais rapido — bytecode carregado diretamente |
| Impacto no tamanho binario | Zero (framework ja esta no dispositivo) | +2–3 MB (CocoaPod hermes-engine adicionado ao .ipa) |
| Uso de memoria | Maior — estruturas JIT, AST completa na memoria | Menor — sem JIT, representacao compacta de bytecode |
| Coletor de lixo | Mark-and-sweep | GC geracional (Hades) |
| Source maps | Padrao | Padrao (hbc-source-map produzido junto) |
| Suporte ao depurador | Depurador remoto do JSC | Protocolo Chrome DevTools do Hermes |
| Restricao JIT do iOS | Ja limitado pela Apple | Nao afetado (sem JIT para restringir) |
| Tempo de inicializacao (app RN tipico) | 600–900 ms cold start | 300–500 ms cold start |

Os numeros de tempo de inicializacao acima sao valores representativos de benchmarks da comunidade em dispositivos intermediarios. Seus resultados reais vao variar com base no tamanho do bundle e na geracao do dispositivo, mas a melhoria relativa e consistente.

## Pre-Compilacao para Bytecode: A Etapa em Tempo de Build

Quando voce executa um build de producao com o Hermes habilitado, o Metro (o bundler do React Native) chama o binario do compilador `hermesc` para transformar a saida JavaScript em bytecode `.hbc`. Esse processo acontece automaticamente como parte da fase de build do Xcode adicionada pelo CocoaPod `hermes-engine`.

A fase de build e chamada "Bundle React Native code and images" e voce pode inspeciona-la no Xcode na aba Build Phases do seu target. O script shell que ela executa chama `react-native bundle`, que por sua vez invoca o `hermesc` na saida do bundle antes de coloca-lo no diretorio de recursos do aplicativo.

O formato de arquivo `.hbc` e uma representacao binaria compacta do conjunto de instrucoes do Hermes. Nao e codigo de maquina — e um bytecode para a maquina virtual do Hermes — mas pula todas as etapas de lexing, parsing e compilacao que de outra forma aconteceriam no dispositivo do usuario em tempo de execucao.

Uma consequencia pratica para seu pipeline de CI/CD: a compilacao do Hermes adiciona tempo ao seu build. Em um projeto React Native tipico com um bundle de 2–4 MB, sao 5–15 segundos de tempo de build adicional. Em um bundle grande de monorepo, pode ser mais. O beneficio e que cada usuario obtem uma primeira inicializacao mais rapida.

## Como o Hermes e Empacotado no .ipa

Quando voce arquiva um aplicativo iOS que usa Hermes, o `.ipa` contem:

1. `main.jsbundle` — este e na verdade o arquivo de bytecode `.hbc` compilado, renomeado para corresponder ao que o carregador do React Native espera.
2. O binario do framework `hermes-engine`, embutido em `Frameworks/hermes.framework` (ou como uma biblioteca estatica, dependendo da sua configuracao e versao do React Native).
3. Source maps para simbolizacao: `main.jsbundle.map`.

Da perspectiva da App Store, o framework do Hermes e apenas mais um framework no seu aplicativo. Ele passa pelo processamento de bitcode (em toolchains mais antigas do Xcode) e pelo app thinning da mesma forma que qualquer outro framework embutido.

A adicao do framework `hermes-engine` aumenta o tamanho do seu `.ipa` em aproximadamente 2–3 MB antes da compressao da App Store. Apos as otimizacoes de download da Apple (compressao LZFSE, app thinning para dispositivos especificos), o aumento no download para o usuario e menor — tipicamente 1–1,5 MB. Para a maioria dos aplicativos, esta troca vale a pena dada a melhoria no TTI.

## GC do Hermes vs ARC do Swift

O Swift usa Contagem Automatica de Referencias (ARC): a memoria e liberada quando a ultima referencia forte a um objeto e liberada. Isso acontece de forma deterministica no ponto de desalocacao — sem pausas, sem varredura.

O Hermes usa o coletor de lixo Hades, que e um GC geracional e concorrente. Entender a diferenca importa quando voce esta diagnosticando problemas de memoria ou jank em uma tela do React Native:

**Coleta geracional**: o Hermes divide o heap JavaScript em uma geracao jovem (objetos alocados recentemente, coletados frequentemente com pausas curtas) e uma geracao antiga (objetos que sobreviveram a varias coletas da geracao jovem, coletados com menos frequencia). A maioria dos objetos JavaScript em um aplicativo React Native tem vida curta — estado de componente durante uma renderizacao, objetos de evento, valores intermediarios — entao a geracao jovem e coletada frequentemente, de forma barata e rapida.

**Coleta concorrente**: o Hades executa a coleta da geracao antiga de forma concorrente com a thread JS, usando uma barreira de escrita snapshot-at-the-beginning (SATB). Isso significa que um ciclo de GC principal nao para a thread JavaScript pela duracao completa da coleta. A thread JS e pausada apenas brevemente no inicio (para capturar um snapshot das raizes) e no final (para processar o conjunto de referencias). E por isso que as pausas de GC do Hermes em producao sao tipicamente inferiores a 1 ms para coletas de geracao jovem e inferiores a 5 ms mesmo para coletas principais.

**ARC e Hermes coexistem**: seus objetos Swift e seus objetos JavaScript tem tempos de vida completamente separados gerenciados por mecanismos completamente separados. Quando um componente React Native mantem uma referencia a um modulo nativo, o tempo de vida e gerenciado por uma combinacao de ARC (no lado Swift) e GC do Hermes (no lado JS). A infraestrutura do TurboModule coordena esses tempos de vida por meio de chamadas JSI hold/release, entao geralmente voce nao gerencia isso manualmente.

O comportamento do GC torna-se relevante quando voce ve jank periodico no seu aplicativo que nao se correlaciona com nenhum trabalho visivel. Um ciclo de GC principal coletando um heap de geracao antiga grande pode produzir um pequeno congelamento. Reduzir a retencao de objetos JS de longa vida — por exemplo, sendo cuidadoso com closures que capturam grandes estruturas de dados — melhora o throughput do GC do Hermes.

## Perfilando o Hermes no Xcode Instruments

O Xcode Instruments e sua ferramenta primaria de perfilamento para iOS, e funciona com aplicativos React Native alimentados pelo Hermes. O instrumento Time Profiler captura stack traces de todas as threads no seu processo, incluindo a thread JS do Hermes.

Para perfilar um aplicativo React Native com Hermes no Instruments:

1. Compile para perfilamento (Product > Profile, ou `⌘I`), o que compila uma configuracao semelhante a release com simbolos de depuracao intactos.
2. Escolha o template Time Profiler.
3. Inicie a gravacao, exercite o cenario que voce quer perfilar (navegue ate a tela, acione a animacao, envie o formulario), depois pare.

Na arvore de chamadas, voce vera uma thread chamada algo como `com.facebook.react.JavaScript` ou `hermes.js`. Expandir a arvore de chamadas sob essa thread mostra os internos da VM do Hermes na parte inferior (JsInterpreter, Hermes::Runtime::run) e, acima disso, os nomes das suas funcoes JavaScript se voce tiver source maps configurados.

Para perfilamento no nivel JavaScript com funcoes nomeadas, o profiler de amostragem do Hermes e mais util que o Instruments sozinho. Voce pode habilitá-lo via React Native DevTools ou chamando `Hermes.enableSamplingProfiler()` e `Hermes.dumpSampledTraceToFile()` em um build de depuracao. A saida e um trace JSON que voce pode carregar no visualizador `chrome://tracing` do Chrome, onde os nomes das funcoes JavaScript sao resolvidos a partir do source map.

Quando voce ve tempo gasto nos internos do Hermes no Instruments mas nao consegue resolve-lo para nomes de funcoes, a causa mais comum e que o source map de producao nao foi disponibilizado para a etapa de simbolizacao. Certifique-se de que seu build copia `main.jsbundle.map` para um local conhecido e que voce esta apontando sua ferramenta de simbolizacao para ele.

## Configurando o Hermes no Podfile

O Hermes esta habilitado por padrao no React Native 0.74+. Voce nao precisa adicionar nenhuma configuracao para ativa-lo. No entanto, voce pode personalizar as flags do compilador Hermes para seu build de release usando a opcao `hermesFlagsRelease` no seu `Podfile`.

```ruby
use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => true,
  :hermes_flags_release => ["-O", "-output-source-map"],
  :fabric_enabled => fabricEnabled
)
```

Flags comuns:

| Flag | Efeito |
|---|---|
| `-O` | Habilitar todas as otimizacoes (padrao em release) |
| `-output-source-map` | Emitir um source map `.hbc.map` junto com o bytecode |
| `-max-diagnostic-width=80` | Limitar a largura das mensagens de erro durante o build |
| `-Wno-undefined-variable` | Suprimir avisos para referencias a variaveis indefinidas |

A flag `-output-source-map` e importante para simbolizacao de producao de stack traces JavaScript em relatorios de crash. Sem o source map, os offsets de bytecode do Hermes nos logs de crash nao podem ser resolvidos de volta para as linhas de origem originais. Se voce usa um servico de relatorio de crashes como Firebase Crashlytics ou Sentry, configure-o para fazer upload do arquivo `.hbc.map` como parte do seu processo de release.

Para desabilitar o Hermes completamente (nao recomendado para novos projetos, mas relevante ao integrar o React Native em um aplicativo existente que requer o JSC por razoes de compatibilidade):

```ruby
use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => false
)
```

Apos alterar essa flag, execute `bundle exec pod install` e faca um build limpo.

## O CocoaPod hermes-engine

O pod `hermes-engine` e uma distribuicao binaria pre-compilada do mecanismo Hermes. E uma dependencia de `React-hermes`, que por sua vez e uma dependencia de `React-Core` quando o Hermes esta habilitado. Voce nao o adiciona ao seu `Podfile` diretamente — o `use_react_native!` gerencia o grafo de dependencias.

Quando voce executa `bundle exec pod install`, o CocoaPods baixa o artefato de release do `hermes-engine` correspondente a sua versao do React Native a partir das releases do GitHub do repositorio `facebook/hermes`. O versionamento e gerenciado pela gem do React Native (`/node_modules/react-native/sdks/.hermesversion`), que contem o SHA exato de release do Hermes a ser usado.

Se voce trabalha em um ambiente sem acesso a internet (comum em desenvolvimento iOS corporativo com um cache local do CocoaPods), precisa garantir que o pod `hermes-engine` esteja disponivel no seu repositorio local de specs ou no cache de pods vendorizados. O artefato do pod e um `.tar.gz` contendo `hermes.framework` e `hermes_executor.framework` para as arquiteturas relevantes (arm64 para dispositivos, x86_64/arm64 para simuladores, pre-combinados como XCFramework).

Para verificar que o Hermes esta ativo em tempo de execucao (util em testes de integracao ao embutir React Native em um aplicativo Swift existente):

```swift
// In a debug build, the HermesInternal global is available from JavaScript
// You can evaluate this via a bridge or TurboModule call:
// HermesInternal.getRuntimeProperties()['OSS Release Version']
```

Do lado Objective-C/Swift, voce pode verificar se o RCTBridge atual (ou o runtime do Hermes via JSI) esta usando o Hermes examinando as propriedades de runtime expostas por `HermesInternal` a partir do JavaScript, ou verificando se o `hermes.framework` esta carregado na imagem do processo em tempo de execucao usando `dlopen`/`dladdr`.

## Resumo

O Hermes substitui o JavaScriptCore como runtime JavaScript em aplicativos React Native iOS. A diferenca fundamental e a estrategia de compilacao: o JSC analisa e compila o JavaScript em tempo de execucao no dispositivo, enquanto o Hermes compila o JavaScript para bytecode em tempo de build como parte do seu pipeline Xcode/CI. Esta e a mesma mudanca filosofica que o Swift representa em relacao a scripts interpretados do Objective-C — fazer o trabalho custoso mais cedo, em tempo de build, para que os usuarios vejam uma inicializacao mais rapida.

Para um desenvolvedor Swift integrando ou otimizando um aplicativo React Native iOS:

- O Hermes esta ativado por padrao no React Native 0.74+ — nenhuma acao e necessaria para habilitá-lo.
- O CocoaPod `hermes-engine` adiciona o binario do mecanismo ao seu `.ipa`; isso e gerenciado automaticamente pelo `use_react_native!`.
- A melhoria no tempo de inicializacao e o beneficio mais visivel para o usuario; espere aproximadamente 30–50% de TTI mais rapido no cold launch.
- O perfilamento usa o Xcode Instruments padrao (Time Profiler) com source maps para resolucao de nomes de funcoes JavaScript.
- O GC Hades e concorrente e geracional; jank causado pelo GC e raro, mas rastreavel no Instruments quando ocorre.
- Configure `hermesFlagsRelease` no seu `Podfile` para controlar o nivel de otimizacao e a saida do source map para seus builds de release.
