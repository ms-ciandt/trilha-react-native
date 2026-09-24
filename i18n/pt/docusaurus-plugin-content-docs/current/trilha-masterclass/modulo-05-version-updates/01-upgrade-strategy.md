---
title: "Processo: Estratégia de Upgrade"
---

# Processo: Estratégia de Upgrade

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc05_01_upgrade-strategy.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc05_01_upgrade-strategy.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> Atualizar o React Native não é um único comando. É uma migração estruturada: diff, aplicar, validar, repetir. Os desenvolvedores que fazem isso corretamente tratam o processo como um refactor planejado — não como uma simples atualização de dependência.

---

## Por que Upgrades Incrementais Vencem

O React Native lança uma nova versão minor a cada 6 semanas, aproximadamente. Cada minor traz mudanças em três camadas simultaneamente: as APIs em JS, o sistema de build nativo do Android (plugin Gradle, CMake) e a configuração nativa do iOS (Podfile, AppDelegate, configurações do projeto Xcode).

Pular vários minors de uma vez torna impossível isolar qual mudança causou qual problema. A estratégia correta é **um minor por vez**, com uma validação completa de build entre cada etapa.

```
0.73 ──valida──► 0.74 ──valida──► 0.75 ──valida──► 0.76
```

Não:

```
0.73 ──────────────────────────────────────────────────► 0.76  ← 3x mais difícil de debugar
```

Para upgrades de patch (`0.76.0 → 0.76.5`), é seguro pular todos os patches de uma vez — patches são correções de bugs e de segurança sem breaking changes intencionais.

---

## O Processo de Upgrade em Quatro Fases

```
Fase 1: Analisar    → ler o changelog, verificar compatibilidade de bibliotecas
Fase 2: Diff        → obter diffs nativos do Upgrade Helper
Fase 3: Aplicar     → atualizar pacotes, aplicar diffs nativos, recriar patches
Fase 4: Validar     → build nas duas plataformas, executar testes, smoke test no dispositivo
```

Não pule a Fase 1. Os erros mais custosos vêm de aplicar diffs sem entender o que mudou semanticamente.

---

## Fase 1: Leia o Changelog Antes de Tocar no Código

```bash
# Abra o changelog oficial para o intervalo de versões alvo
open https://github.com/facebook/react-native/blob/main/CHANGELOG.md
```

Procure especificamente por:
- Seção **Breaking Changes** — qualquer coisa que exija alterações no código
- **Deprecated** — APIs que serão removidas na próxima versão
- Subseções **Android** / **iOS** — mudanças exclusivamente nativas que não aparecem nos diffs de JS
- Qualquer menção aos seus próprios módulos nativos ou bibliotecas de terceiros muito utilizadas

Leia também a discussão do reactwg/react-native-releases para a versão alvo — ela traz problemas conhecidos encontrados durante o ciclo de RC antes que as notas de release finais sejam escritas.

```bash
# Exemplo: thread de discussão para 0.76
open https://github.com/reactwg/react-native-releases/discussions
```

---

## Fase 2: RN Upgrade Helper e Diffs Nativos

O **Upgrade Helper** gera um diff limpo entre quaisquer duas versões do RN executando `react-native init` nas duas versões e fazendo o diff do resultado.

**URL:** [react-native-community.github.io/upgrade-helper](https://react-native-community.github.io/upgrade-helper/)

Como usar:

1. Defina "From" para sua versão atual (ex.: `0.75.4`)
2. Defina "To" para sua versão alvo (ex.: `0.76.7`)
3. Clique em "Show me how to upgrade"
4. Percorra o diff **arquivo por arquivo**, de cima para baixo

### Os arquivos que mais importam

| Arquivo | O que muda | Nível de risco |
|---|---|---|
| `package.json` | versão do RN, versão do React, peer deps | Baixo — bumps de versão diretos |
| `android/build.gradle` | versão do plugin Gradle, classpath, repositórios | Médio — versão errada = falha no build |
| `android/app/build.gradle` | compileSdk, targetSdk, minSdk, build tools | Alto — mudanças de SDK afetam o comportamento |
| `android/gradle/wrapper/gradle-wrapper.properties` | versão do Gradle wrapper | Médio — deve ser compatível com o plugin |
| `android/app/src/main/AndroidManifest.xml` | permissões, flags de activity, temas | Alto — flags ausentes = crash em tempo de execução |
| `ios/Podfile` | versão da plataforma, opções de `use_react_native!`, flags | Alto — opções erradas = falhas de linkagem |
| `ios/AppDelegate.swift` / `.mm` | configuração de RCTHost, métodos de lifecycle | Alto — delegate errado = app não inicializa |
| `ios/Podfile.lock` | Regenerado pelo pod install | Baixo — não editar manualmente |

### Lendo o diff para mudanças específicas ao nativo

O Upgrade Helper mostra exatamente quais linhas mudaram em cada arquivo. Para um diff de `build.gradle` como:

```diff
- compileSdkVersion = 33
+ compileSdkVersion = 35

- targetSdkVersion = 33
+ targetSdkVersion = 35

- minSdkVersion = 21
+ minSdkVersion = 24
```

Isso não é apenas um bump de número — `targetSdkVersion = 35` ativa a obrigatoriedade de edge-to-edge do Android 15 (veja o tópico de Configurações Nativas). `minSdkVersion = 24` encerra o suporte para dispositivos com Android 7.0.

### Usando o diff em um app brownfield

Em um app brownfield, seu `AppDelegate`, `MainApplication` e arquivos Gradle não são gerados a partir de um template — eles foram escritos manualmente. O diff do Upgrade Helper mostra mudanças no template; você deve **mapear** essas mudanças para seus arquivos customizados.

```bash
# Recomendado: mantenha um terminal lado a lado
# Painel esquerdo: Upgrade Helper mostrando o diff
# Painel direito: seu AppDelegate.swift / build.gradle real
```

Para o Gradle, aplique mudanças no nível de propriedade — não copie e cole o arquivo gerado inteiro sobre seu arquivo brownfield. Uma sobrescrita errada apaga configurações customizadas que podem não estar documentadas.

---

## Fase 3: Aplicando o Upgrade

```bash
# 1. Atualizar pacotes JS
npm install react-native@0.76.7 react@18.3.1

# Ou com Yarn
yarn add react-native@0.76.7 react@18.3.1

# 2. Executar o atualizador automático de arquivos (bare workflow)
npx react-native upgrade

# Este comando usa rn-diff-purge internamente e tenta
# aplicar as mudanças nos arquivos nativos automaticamente.
# Ele marcará conflitos (<<<< HEAD) onde não conseguir fazer o merge.
```

> `npx react-native upgrade` é uma ferramenta de melhor esforço — funciona bem em projetos padrão baseados em template, mas frequentemente deixa conflitos em projetos brownfield ou muito customizados. Nesses casos, aplique as mudanças manualmente usando o diff do Upgrade Helper como guia.

Após aplicar as mudanças de JS:

```bash
# iOS: reinstalar pods com as novas versões
cd ios && bundle exec pod install && cd ..

# Android: limpar caches do Gradle (faça isso em todo upgrade)
cd android && ./gradlew clean && cd ..
```

---

## Fase 4: Checklist de Análise de Breaking Changes

Antes de compilar, audite contra o changelog:

```
[ ] Mudanças na API JS aplicadas (props descontinuadas, APIs renomeadas)
[ ] Interfaces dos módulos nativos conferem com as novas specs geradas (se você tem TurboModules customizados)
[ ] Mudanças no AndroidManifest aplicadas
[ ] Mudanças no AppDelegate / SceneDelegate aplicadas (iOS)
[ ] Opções do Podfile atualizadas (novas flags como new_arch_enabled, fabric_enabled)
[ ] Versão do plugin Gradle compatível com a versão do wrapper
[ ] Implicações do targetSdk revisadas (edge-to-edge se 35)
[ ] Compatibilidade de bibliotecas de terceiros verificada (react-native.directory)
[ ] Diretório patches/ revisado — algum patch toca arquivos que foram atualizados?
[ ] Testes ainda passam: yarn test
```

---

## Caminho de Upgrade Recomendado para 0.76+ (Nova Arquitetura por Padrão)

Se você ainda está na 0.72 ou anterior, esta é a sequência recomendada:

```
0.72 → 0.73   (JSC → Hermes como padrão; Gradle plugin v8)
0.73 → 0.74   (Bridgeless preview; minSdk 23; Kotlin 1.9)
0.74 → 0.75   (minSdk 24; Xcode 15.1 obrigatório; Swift AppDelegate)
0.75 → 0.76   (Nova Arquitetura ativada por padrão; ReactHost; preparação edge-to-edge)
0.76 → 0.77+  (cada minor: estável sob a nova arquitetura)
```

Razão principal para não pular a 0.74: ela introduziu a **Camada de Interop do TurboModule** de forma estável. Sem passar pela 0.74, você pode encontrar problemas de interop ao chegar na 0.76 com a Nova Arquitetura ativada.

---

## Validação: Build nas Duas Plataformas

**Sempre compile a partir de um estado limpo após um upgrade.** Artefatos de build cacheados da versão anterior causam falhas não-determinísticas.

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

**Checklist de smoke test no dispositivo (não no simulador):**

```
[ ] App inicia até a tela principal
[ ] Navegação entre as telas principais funciona
[ ] Chamadas de rede funcionam (autenticação, busca de dados)
[ ] Qualquer módulo nativo customizado: chamada básica funciona
[ ] Câmera / biometria / notificações push (se usados) continuam funcionando
[ ] Sem exceções JS nos logs do Metro na inicialização
[ ] Performance: sem jank óbvio em telas com scroll intenso
```

Execute em um **dispositivo de baixo custo** para o smoke test no Android — a maioria das regressões de performance introduzidas em upgrades é invisível em hardware de ponta.

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [Upgrading React Native — Oficial](https://reactnative.dev/docs/upgrading) | Guia oficial de upgrade com etapas para Expo e bare workflow |
| [RN Upgrade Helper](https://react-native-community.github.io/upgrade-helper/) | Ferramenta web — gera diffs de arquivos nativos entre quaisquer duas versões |
| [rn-diff-purge — GitHub](https://github.com/react-native-community/rn-diff-purge) | Os dados de diff subjacentes que alimentam o Upgrade Helper |
| [CHANGELOG.md — facebook/react-native](https://github.com/facebook/react-native/blob/main/CHANGELOG.md) | Changelog autoritativo por versão com breaking changes |
| [react-native-releases — reactwg](https://github.com/reactwg/react-native-releases) | Grupo de trabalho de releases — discussões de RC, problemas conhecidos antes do release final |
| [GitHub Releases — facebook/react-native](https://github.com/facebook/react-native/releases) | Notas de release por versão (mais curtas que o CHANGELOG completo) |
| [Upgrade RN em Brownfield — Callstack](https://www.callstack.com/blog/how-to-upgrade-react-native-in-a-brownfield-application) | Upgrade end-to-end de 0.71→0.76 em um app brownfield |
| [New Architecture is Here — Meta Blog](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here) | Anúncio oficial da 0.76: o que mudou, camada de interop, caminho de migração |

---

Próximo → [Dependências: Patches e Ambiente](./patches-recreation)
