---
title: Analise de Breaking Changes
---

# Analise de Breaking Changes

> Breaking changes no React Native ocorrem em tres camadas de forma independente: a superficie da API JavaScript, o sistema de build nativo do Android e o sistema de build nativo do iOS. Uma mudanca pode quebrar o iOS sem tocar no Android. Ler apenas o changelog de JS nao e suficiente.

---

## Onde Encontrar Breaking Changes

### Fonte 1: O CHANGELOG.md oficial

```
https://github.com/facebook/react-native/blob/main/CHANGELOG.md
```

A fonte autoritativa. Cada versao tem uma subsecao `Breaking Changes`. Leia-a primeiro — antes do diff do Upgrade Helper, antes dos posts de blog.

Formato:

```
## v0.76.0

### Breaking Changes
- **Android**: SDK minimo elevado de 23 para 24 (#46252) — dispositivos abaixo do Android 7.0 nao sao mais suportados
- **Android**: `StatusBar.setBackgroundColor` descontinuado — obrigatoriedade de edge-to-edge com targetSdk=35
- **iOS**: `AppDelegate` deve estender `RCTAppDelegate` — configuracao manual do `RCTRootViewFactory` removida
- **JS**: `Animated.event` com `useNativeDriver` agora lanca erro se o handler estiver ausente (#45123)
```

### Fonte 2: Discussoes do reactwg/react-native-releases

```
https://github.com/reactwg/react-native-releases/discussions
```

O Releases Working Group publica uma thread "Road to 0.7x" para cada release futuro. Membros da comunidade relatam problemas com o RC — aqui e onde voce encontra breaking changes que ainda nao entraram no changelog oficial, ou onde o caminho de migracao e explicado em detalhe.

### Fonte 3: GitHub Release Notes (por tag)

```
https://github.com/facebook/react-native/releases/tag/v0.76.0
```

Mais curto que o CHANGELOG completo, mas focado por release. Bom para uma verificacao rapida.

### Fonte 4: Meta Engineering / Blog do time de RN

```
https://reactnative.dev/blog
```

Versoes maiores (0.73, 0.74, 0.76) ganham um post de blog dedicado explicando as maiores mudancas, etapas de migracao e a intencao por tras das decisoes. Sao os resumos mais legiveis.

---

## Breaking Changes de Alto Impacto por Versao (0.72 → 0.76)

### 0.73 — Hermes como unico motor bundled

**O que mudou:** O JSC (JavaScriptCore) nao e mais bundled com o RN. O Hermes e o unico motor.

**Impacto:** Se voce definiu explicitamente `hermes_enabled: false` no Podfile ou `enableHermes = false` no `android/app/build.gradle`, o app falhara ao compilar — nao ha JSC para usar.

**Correcao:**
```ruby
# ios/Podfile — remova ou mude para true
use_react_native!(
  :hermes_enabled => true,  # este agora e o unico valor valido
)
```

```kotlin
// android/app/build.gradle — remova a flag
// o bloco abaixo deve ser deletado:
// project.ext.react = [enableHermes: false]
```

### 0.74 — Suporte ao campo `exports` do `package.json` no Metro ativado por padrao

**O que mudou:** O Metro agora respeita o campo `exports` no `package.json`, o que muda a resolucao de modulos para alguns pacotes.

**Impacto:** Bibliotecas que usam diferentes `exports` para Node vs browser vs RN podem agora resolver para um entry point diferente do anterior. Visivelmente, algumas bibliotecas que funcionavam antes passam a lancar `Module not found` ou importam uma versao errada de um arquivo.

**Correcao:**

```javascript
// metro.config.js — se uma biblioteca quebrar, adicione-a a unstable_enablePackageExports
const { getDefaultConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;  // agora padrao
// Se uma biblioteca quebrar, adicione-a a blocklist:
config.resolver.unstable_packageExportsResolveMode = 'browser';

module.exports = config;
```

### 0.74 — `minSdkVersion` elevado para 23

Dispositivos abaixo do Android 6.0 (API 23) nao sao mais suportados. Isso equivale a aproximadamente 0,5% dos dispositivos em 2025 — verifique seus dados de analytics.

### 0.75 — Swift AppDelegate obrigatorio (iOS)

**O que mudou:** O template passou a usar Swift (`AppDelegate.swift`) como linguagem principal do AppDelegate. O AppDelegate em Objective-C (`AppDelegate.mm`) ainda funciona, mas nao e mais o padrao.

**Impacto:** Nenhuma mudanca de codigo necessaria se voce permanecer no `.mm`. Mas se voce tem uma mistura de Swift e ObjC++ no seu projeto iOS, o bridging header pode precisar de atualizacao ao adicionar novos codigos nativos.

### 0.76 — Nova Arquitetura ativada por padrao

**O que mudou:** `newArchEnabled=true` esta definido no `gradle.properties` e no Podfile por padrao. A bridge (`RCTBridge`) e substituida pelo `ReactHost` (Android) e `RCTHost` (iOS).

**Impacto:** Qualquer biblioteca que nao migrou para TurboModules/Fabric usara a camada de interop (na maioria dos casos — transparente) ou quebrara se tiver integracoes nativas profundas.

**Verifique suas bibliotecas antes de fazer o upgrade:**

```bash
npx react-native-check-new-archi
```

Exemplo de saida:

```
Checking 47 packages...
✓ @react-navigation/native          — New Architecture compatible
✓ react-native-mmkv                 — New Architecture compatible
✗ react-native-camera               — NOT compatible (last checked 2024-01)
⚠ react-native-permissions          — Partial support (some methods missing)
```

**Para desativar temporariamente a Nova Arquitetura** enquanto migra bibliotecas:

```properties
# android/gradle.properties
newArchEnabled=false
```

```ruby
# ios/Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

### 0.76 — ReactActivity expoe ReactHost (Android)

`getReactHost()` agora e um metodo publico em `ReactActivity`. Se voce estava acessando o host via reflection ou subclassificando `ReactHostDelegate`, migre para a API publica.

```kotlin
// Antes (workaround)
val host = (application as BrownfieldApp).reactHost

// Depois de 0.76 (API limpa)
val host = reactActivity.getReactHost()
```

### 0.76 — Edge-to-Edge no Android (targetSdk 35)

Abordado em detalhe no topico de [Configuracoes Nativas](./native-settings), mas a breaking change principal aqui e:

```
StatusBar.setBackgroundColor() → no-op no Android 15
StatusBar.translucent prop → no-op no Android 15
```

Apps que definem `targetSdkVersion = 35` e usam qualquer um desses irao parar de funcionar silenciosamente.

---

## Matriz de Impacto de Breaking Changes

Para cada mudanca, avalie o impacto no seu codebase antes de aplicar:

| Mudanca | Padrao de Codigo Afetado | Esforco de Migracao |
|---|---|---|
| Somente Hermes (0.73) | `enableHermes: false` nos arquivos de build | Baixo — deletar uma linha |
| Metro `exports` (0.74) | Bibliotecas com `exports` no `package.json` | Baixo a Medio — geralmente uma flag de config |
| `minSdkVersion 24` (0.76) | Qualquer codigo usando APIs exclusivas do Android API 23 | Baixo se nao usado; Medio se voce tem fallbacks expliciticos para API 23 |
| Nova Arquitetura por padrao (0.76) | Modulos nativos customizados sem spec de TurboModule | Alto — requer migracao para TurboModule |
| RCTAppDelegate (0.76 iOS) | Configuracao customizada do `AppDelegate` | Medio — reescrever metodo de inicializacao, testar lifecycle |
| Edge-to-edge (0.76 + targetSdk 35) | `StatusBar.setBackgroundColor`, padding fixo | Medio — auditoria tela a tela necessaria |
| Modo strict do Metro (continuo) | Tipos re-exportados, dependencias circulares | Baixo por arquivo, medio no agregado |

---

## Automatizando a Analise: `@rnx-kit/align-deps`

Apos atualizar a versao do RN, execute o alinhador de dependencias da Microsoft para identificar versoes de pacotes incompativeis em toda a sua arvore de dependencias:

```bash
npx @rnx-kit/align-deps --requirements react-native@0.76 --write
```

Saida:

```
✗ react-native-reanimated@2.17.0
  Expected: ^3.0.0 for react-native@0.76
  Run: yarn add react-native-reanimated@3.x

✗ @react-native-async-storage/async-storage@1.19.0
  Expected: ^2.0.0 for react-native@0.76
  Run: yarn add @react-native-async-storage/async-storage@2.x

✓ react-native-screens@3.34.0 — OK
```

`--write` atualiza seu `package.json` automaticamente. Revise as mudancas antes de commitar.

---

## Verificando o Suporte a Nova Arquitetura de uma Biblioteca Especifica

```bash
# Verificacao interativa
open https://reactnative.directory

# Verificacao via CLI (todas as dependencias do seu package.json)
npx react-native-check-new-archi

# Verificacao em lote via web
open https://react-native-package-checker.vercel.app
```

O Directory tem um filtro: `Libraries > New Architecture > Supported`. Use-o antes de adicionar qualquer nova biblioteca a um projeto com Nova Arquitetura.

---

## Materiais de Estudo

| Recurso | Descricao |
|---|---|
| [CHANGELOG.md — facebook/react-native](https://github.com/facebook/react-native/blob/main/CHANGELOG.md) | Changelog autoritativo com Breaking Changes por versao |
| [reactwg/react-native-releases](https://github.com/reactwg/react-native-releases) | Grupo de trabalho — discussoes de RC, problemas conhecidos pre-release |
| [GitHub Releases](https://github.com/facebook/react-native/releases) | Notas de release por versao |
| [New Architecture is Here (0.76)](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here) | Post do blog da Meta: cada breaking change na 0.76 explicada |
| [react-native-check-new-archi](https://github.com/arochedy/react-native-check-new-archi) | CLI para verificar compatibilidade com Nova Arquitetura no package.json |
| [@rnx-kit/align-deps](https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps) | Alinha todas as peer dependencies apos um bump de versao |
| [React Native Directory](https://reactnative.directory/) | Registro de bibliotecas com filtro de Nova Arquitetura |
| [Suporte de bibliotecas — reactwg #167](https://github.com/reactwg/react-native-new-architecture/discussions/167) | Tracker de status de 2024 da adocao de bibliotecas para a Nova Arquitetura |

---

Proximo → [Roadmap e Caminho de Upgrade Recomendado](./upgrade-roadmap)
