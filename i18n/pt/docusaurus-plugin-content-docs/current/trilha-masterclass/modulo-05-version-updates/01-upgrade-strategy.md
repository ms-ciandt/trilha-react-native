---
title: "Processo: Estrategia de Upgrade"
---

# Processo: Estrategia de Upgrade

> Atualizar o React Native nao e um unico comando. E uma migracao estruturada: diff, aplicar, validar, repetir. Os desenvolvedores que fazem isso corretamente tratam o processo como um refactor planejado — nao como uma simples atualizacao de dependencia.

---

## Por que Upgrades Incrementais Vencem

O React Native lanca uma nova versao minor a cada 6 semanas, aproximadamente. Cada minor traz mudancas em tres camadas simultaneamente: as APIs em JS, o sistema de build nativo do Android (plugin Gradle, CMake) e a configuracao nativa do iOS (Podfile, AppDelegate, configuracoes do projeto Xcode).

Pular varios minors de uma vez torna impossivel isolar qual mudanca causou qual problema. A estrategia correta e **um minor por vez**, com uma validacao completa de build entre cada etapa.

```
0.73 ──valida──► 0.74 ──valida──► 0.75 ──valida──► 0.76
```

Nao:

```
0.73 ──────────────────────────────────────────────────► 0.76  ← 3x mais dificil de debugar
```

Para upgrades de patch (`0.76.0 → 0.76.5`), e seguro pular todos os patches de uma vez — patches sao correcoes de bugs e de seguranca sem breaking changes intencionais.

---

## O Processo de Upgrade em Quatro Fases

```
Fase 1: Analisar    → ler o changelog, verificar compatibilidade de bibliotecas
Fase 2: Diff        → obter diffs nativos do Upgrade Helper
Fase 3: Aplicar     → atualizar pacotes, aplicar diffs nativos, recriar patches
Fase 4: Validar     → build nas duas plataformas, executar testes, smoke test no dispositivo
```

Nao pule a Fase 1. Os erros mais custosos vem de aplicar diffs sem entender o que mudou semanticamente.

---

## Fase 1: Leia o Changelog Antes de Tocar no Codigo

```bash
# Abra o changelog oficial para o intervalo de versoes alvo
open https://github.com/facebook/react-native/blob/main/CHANGELOG.md
```

Procure especificamente por:
- Secao **Breaking Changes** — qualquer coisa que exija alteracoes no codigo
- **Deprecated** — APIs que serao removidas na proxima versao
- Subsecoes **Android** / **iOS** — mudancas exclusivamente nativas que nao aparecem nos diffs de JS
- Qualquer mencao aos seus proprios modulos nativos ou bibliotecas de terceiros muito utilizadas

Leia tambem a discussao do reactwg/react-native-releases para a versao alvo — ela traz problemas conhecidos encontrados durante o ciclo de RC antes que as notas de release finais sejam escritas.

```bash
# Exemplo: thread de discussao para 0.76
open https://github.com/reactwg/react-native-releases/discussions
```

---

## Fase 2: RN Upgrade Helper e Diffs Nativos

O **Upgrade Helper** gera um diff limpo entre quaisquer duas versoes do RN executando `react-native init` nas duas versoes e fazendo o diff do resultado.

**URL:** [react-native-community.github.io/upgrade-helper](https://react-native-community.github.io/upgrade-helper/)

Como usar:

1. Defina "From" para sua versao atual (ex.: `0.75.4`)
2. Defina "To" para sua versao alvo (ex.: `0.76.7`)
3. Clique em "Show me how to upgrade"
4. Percorra o diff **arquivo por arquivo**, de cima para baixo

### Os arquivos que mais importam

| Arquivo | O que muda | Nivel de risco |
|---|---|---|
| `package.json` | versao do RN, versao do React, peer deps | Baixo — bumps de versao diretos |
| `android/build.gradle` | versao do plugin Gradle, classpath, repositorios | Medio — versao errada = falha no build |
| `android/app/build.gradle` | compileSdk, targetSdk, minSdk, build tools | Alto — mudancas de SDK afetam o comportamento |
| `android/gradle/wrapper/gradle-wrapper.properties` | versao do Gradle wrapper | Medio — deve ser compativel com o plugin |
| `android/app/src/main/AndroidManifest.xml` | permissoes, flags de activity, temas | Alto — flags ausentes = crash em tempo de execucao |
| `ios/Podfile` | versao da plataforma, opcoes de `use_react_native!`, flags | Alto — opcoes erradas = falhas de linkagem |
| `ios/AppDelegate.swift` / `.mm` | configuracao de RCTHost, metodos de lifecycle | Alto — delegate errado = app nao inicializa |
| `ios/Podfile.lock` | Regenerado pelo pod install | Baixo — nao editar manualmente |

### Lendo o diff para mudancas especificas ao nativo

O Upgrade Helper mostra exatamente quais linhas mudaram em cada arquivo. Para um diff de `build.gradle` como:

```diff
- compileSdkVersion = 33
+ compileSdkVersion = 35

- targetSdkVersion = 33
+ targetSdkVersion = 35

- minSdkVersion = 21
+ minSdkVersion = 24
```

Isso nao e apenas um bump de numero — `targetSdkVersion = 35` ativa a obrigatoriedade de edge-to-edge do Android 15 (veja o topico de Configuracoes Nativas). `minSdkVersion = 24` encerra o suporte para dispositivos com Android 7.0.

### Usando o diff em um app brownfield

Em um app brownfield, seu `AppDelegate`, `MainApplication` e arquivos Gradle nao sao gerados a partir de um template — eles foram escritos manualmente. O diff do Upgrade Helper mostra mudancas no template; voce deve **mapear** essas mudancas para seus arquivos customizados.

```bash
# Recomendado: mantenha um terminal lado a lado
# Painel esquerdo: Upgrade Helper mostrando o diff
# Painel direito: seu AppDelegate.swift / build.gradle real
```

Para o Gradle, aplique mudancas no nivel de propriedade — nao copie e cole o arquivo gerado inteiro sobre seu arquivo brownfield. Uma sobrescrita errada apaga configuracoes customizadas que podem nao estar documentadas.

---

## Fase 3: Aplicando o Upgrade

```bash
# 1. Atualizar pacotes JS
npm install react-native@0.76.7 react@18.3.1

# Ou com Yarn
yarn add react-native@0.76.7 react@18.3.1

# 2. Executar o atualizador automatico de arquivos (bare workflow)
npx react-native upgrade

# Este comando usa rn-diff-purge internamente e tenta
# aplicar as mudancas nos arquivos nativos automaticamente.
# Ele marcara conflitos (<<<< HEAD) onde nao conseguir fazer o merge.
```

> `npx react-native upgrade` e uma ferramenta de melhor esforco — funciona bem em projetos padrao baseados em template, mas frequentemente deixa conflitos em projetos brownfield ou muito customizados. Nesses casos, aplique as mudancas manualmente usando o diff do Upgrade Helper como guia.

Apos aplicar as mudancas de JS:

```bash
# iOS: reinstalar pods com as novas versoes
cd ios && bundle exec pod install && cd ..

# Android: limpar caches do Gradle (faca isso em todo upgrade)
cd android && ./gradlew clean && cd ..
```

---

## Fase 4: Checklist de Analise de Breaking Changes

Antes de compilar, audite contra o changelog:

```
[ ] Mudancas na API JS aplicadas (props descontinuadas, APIs renomeadas)
[ ] Interfaces dos modulos nativos conferem com as novas specs geradas (se voce tem TurboModules customizados)
[ ] Mudancas no AndroidManifest aplicadas
[ ] Mudancas no AppDelegate / SceneDelegate aplicadas (iOS)
[ ] Opcoes do Podfile atualizadas (novas flags como new_arch_enabled, fabric_enabled)
[ ] Versao do plugin Gradle compativel com a versao do wrapper
[ ] Implicacoes do targetSdk revisadas (edge-to-edge se 35)
[ ] Compatibilidade de bibliotecas de terceiros verificada (react-native.directory)
[ ] Diretorio patches/ revisado — algum patch toca arquivos que foram atualizados?
[ ] Testes ainda passam: yarn test
```

---

## Caminho de Upgrade Recomendado para 0.76+ (Nova Arquitetura por Padrao)

Se voce ainda esta na 0.72 ou anterior, esta e a sequencia recomendada:

```
0.72 → 0.73   (JSC → Hermes como padrao; Gradle plugin v8)
0.73 → 0.74   (Bridgeless preview; minSdk 23; Kotlin 1.9)
0.74 → 0.75   (minSdk 24; Xcode 15.1 obrigatorio; Swift AppDelegate)
0.75 → 0.76   (Nova Arquitetura ativada por padrao; ReactHost; preparacao edge-to-edge)
0.76 → 0.77+  (cada minor: estavel sob a nova arquitetura)
```

Razao principal para nao pular a 0.74: ela introduziu a **Camada de Interop do TurboModule** de forma estavel. Sem passar pela 0.74, voce pode encontrar problemas de interop ao chegar na 0.76 com a Nova Arquitetura ativada.

---

## Validacao: Build nas Duas Plataformas

**Sempre compile a partir de um estado limpo apos um upgrade.** Artefatos de build cacheados da versao anterior causam falhas nao-determinísticas.

```bash
# Build limpo completo — Android
cd android
./gradlew clean
./gradlew assembleRelease

# Build limpo completo — iOS
cd ios
rm -rf build/
pod install
xcodebuild -workspace MyApp.xcworkspace \
           -scheme MyApp \
           -configuration Release \
           -sdk iphoneos \
           clean build
```

**Checklist de smoke test no dispositivo (nao no simulador):**

```
[ ] App inicia ate a tela principal
[ ] Navegacao entre as telas principais funciona
[ ] Chamadas de rede funcionam (autenticacao, busca de dados)
[ ] Qualquer modulo nativo customizado: chamada basica funciona
[ ] Camera / biometria / notificacoes push (se usados) continuam funcionando
[ ] Sem excecoes JS nos logs do Metro na inicializacao
[ ] Performance: sem jank obvio em telas com scroll intenso
```

Execute em um **dispositivo de baixo custo** para o smoke test no Android — a maioria das regressoes de performance introduzidas em upgrades e invisivel em hardware de ponta.

---

## Materiais de Estudo

| Recurso | Descricao |
|---|---|
| [Upgrading React Native — Oficial](https://reactnative.dev/docs/upgrading) | Guia oficial de upgrade com etapas para Expo e bare workflow |
| [RN Upgrade Helper](https://react-native-community.github.io/upgrade-helper/) | Ferramenta web — gera diffs de arquivos nativos entre quaisquer duas versoes |
| [rn-diff-purge — GitHub](https://github.com/react-native-community/rn-diff-purge) | Os dados de diff subjacentes que alimentam o Upgrade Helper |
| [CHANGELOG.md — facebook/react-native](https://github.com/facebook/react-native/blob/main/CHANGELOG.md) | Changelog autoritativo por versao com breaking changes |
| [react-native-releases — reactwg](https://github.com/reactwg/react-native-releases) | Grupo de trabalho de releases — discussoes de RC, problemas conhecidos antes do release final |
| [GitHub Releases — facebook/react-native](https://github.com/facebook/react-native/releases) | Notas de release por versao (mais curtas que o CHANGELOG completo) |
| [Upgrade RN em Brownfield — Callstack](https://www.callstack.com/blog/how-to-upgrade-react-native-in-a-brownfield-application) | Upgrade end-to-end de 0.71→0.76 em um app brownfield |
| [New Architecture is Here — Meta Blog](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here) | Anuncio oficial da 0.76: o que mudou, camada de interop, caminho de migracao |

---

Proximo → [Dependencias: Patches e Ambiente](./patches-recreation)
