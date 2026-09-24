---
title: Análise de Breaking Changes
---

# Análise de Breaking Changes

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc05_03_breaking-changes.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc05_03_breaking-changes.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> Breaking changes no React Native ocorrem em três camadas de forma independente: a superfície da API JavaScript, o sistema de build nativo do Android e o sistema de build nativo do iOS. Uma mudança pode quebrar o iOS sem tocar no Android. Ler apenas o changelog de JS não é suficiente.

---

## Onde Encontrar Breaking Changes

### Fonte 1: O CHANGELOG.md oficial

```
https://github.com/facebook/react-native/blob/main/CHANGELOG.md
```

A fonte autoritativa. Cada versão tem uma subseção `Breaking Changes`. Leia-a primeiro — antes do diff do Upgrade Helper, antes dos posts de blog.

Formato:

```
## v0.76.0

### Breaking Changes
- **Android**: SDK mínimo elevado de 23 para 24 (#46252) — dispositivos abaixo do Android 7.0 não são mais suportados
- **Android**: `StatusBar.setBackgroundColor` descontinuado — obrigatoriedade de edge-to-edge com targetSdk=35
- **iOS**: `AppDelegate` deve estender `RCTAppDelegate` — configuração manual do `RCTRootViewFactory` removida
- **JS**: `Animated.event` com `useNativeDriver` agora lança erro se o handler estiver ausente (#45123)
```

### Fonte 2: Discussões do reactwg/react-native-releases

```
https://github.com/reactwg/react-native-releases/discussions
```

O Releases Working Group publica uma thread "Road to 0.7x" para cada release futuro. Membros da comunidade relatam problemas com o RC — aqui é onde você encontra breaking changes que ainda não entraram no changelog oficial, ou onde o caminho de migração é explicado em detalhe.

### Fonte 3: GitHub Release Notes (por tag)

```
https://github.com/facebook/react-native/releases/tag/v0.76.0
```

Mais curto que o CHANGELOG completo, mas focado por release. Bom para uma verificação rápida.

### Fonte 4: Meta Engineering / Blog do time de RN

```
https://reactnative.dev/blog
```

Versões maiores (0.73, 0.74, 0.76) ganham um post de blog dedicado explicando as maiores mudanças, etapas de migração e a intenção por trás das decisões. São os resumos mais legíveis.

---

## Breaking Changes de Alto Impacto por Versão (0.72 → 0.76)

### 0.73 — Hermes como único motor bundled

**O que mudou:** O JSC (JavaScriptCore) não é mais bundled com o RN. O Hermes é o único motor.

**Impacto:** Se você definiu explicitamente `hermes_enabled: false` no Podfile ou `enableHermes = false` no `android/app/build.gradle`, o app falhará ao compilar — não há JSC para usar.

**Correção:**
```ruby
# ios/Podfile — remova ou mude para true
use_react_native!(
  :hermes_enabled => true,  # este agora é o único valor válido
)
```

```kotlin
// android/app/build.gradle — remova a flag
// o bloco abaixo deve ser deletado:
// project.ext.react = [enableHermes: false]
```

### 0.74 — Suporte ao campo `exports` do `package.json` no Metro ativado por padrão

**O que mudou:** O Metro agora respeita o campo `exports` no `package.json`, o que muda a resolução de módulos para alguns pacotes.

**Impacto:** Bibliotecas que usam diferentes `exports` para Node vs browser vs RN podem agora resolver para um entry point diferente do anterior. Visivelmente, algumas bibliotecas que funcionavam antes passam a lançar `Module not found` ou importam uma versão errada de um arquivo.

**Correção:**

```javascript
// metro.config.js — se uma biblioteca quebrar, adicione-a a unstable_enablePackageExports
const { getDefaultConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;  // agora padrão
// Se uma biblioteca quebrar, adicione-a à blocklist:
config.resolver.unstable_packageExportsResolveMode = 'browser';

module.exports = config;
```

### 0.74 — `minSdkVersion` elevado para 23

Dispositivos abaixo do Android 6.0 (API 23) não são mais suportados. Isso equivale a aproximadamente 0,5% dos dispositivos em 2025 — verifique seus dados de analytics.

### 0.75 — Swift AppDelegate obrigatório (iOS)

**O que mudou:** O template passou a usar Swift (`AppDelegate.swift`) como linguagem principal do AppDelegate. O AppDelegate em Objective-C (`AppDelegate.mm`) ainda funciona, mas não é mais o padrão.

**Impacto:** Nenhuma mudança de código necessária se você permanecer no `.mm`. Mas se você tem uma mistura de Swift e ObjC++ no seu projeto iOS, o bridging header pode precisar de atualização ao adicionar novos códigos nativos.

### 0.76 — Nova Arquitetura ativada por padrão

**O que mudou:** `newArchEnabled=true` está definido no `gradle.properties` e no Podfile por padrão. A bridge (`RCTBridge`) é substituída pelo `ReactHost` (Android) e `RCTHost` (iOS).

**Impacto:** Qualquer biblioteca que não migrou para TurboModules/Fabric usará a camada de interop (na maioria dos casos — transparente) ou quebrará se tiver integrações nativas profundas.

**Verifique suas bibliotecas antes de fazer o upgrade:**

```bash
npx react-native-check-new-archi
```

Exemplo de saída:

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

### 0.76 — ReactActivity expõe ReactHost (Android)

`getReactHost()` agora é um método público em `ReactActivity`. Se você estava acessando o host via reflection ou subclassificando `ReactHostDelegate`, migre para a API pública.

```kotlin
// Antes (workaround)
val host = (application as BrownfieldApp).reactHost

// Depois de 0.76 (API limpa)
val host = reactActivity.getReactHost()
```

### 0.76 — Edge-to-Edge no Android (targetSdk 35)

Abordado em detalhe no tópico de [Configurações Nativas](./native-settings), mas a breaking change principal aqui é:

```
StatusBar.setBackgroundColor() → no-op no Android 15
StatusBar.translucent prop → no-op no Android 15
```

Apps que definem `targetSdkVersion = 35` e usam qualquer um desses irão parar de funcionar silenciosamente.

---

## Matriz de Impacto de Breaking Changes

Para cada mudança, avalie o impacto no seu codebase antes de aplicar:

| Mudança | Padrão de Código Afetado | Esforço de Migração |
|---|---|---|
| Somente Hermes (0.73) | `enableHermes: false` nos arquivos de build | Baixo — deletar uma linha |
| Metro `exports` (0.74) | Bibliotecas com `exports` no `package.json` | Baixo a Médio — geralmente uma flag de config |
| `minSdkVersion 24` (0.76) | Qualquer código usando APIs exclusivas do Android API 23 | Baixo se não usado; Médio se você tem fallbacks explícitos para API 23 |
| Nova Arquitetura por padrão (0.76) | Módulos nativos customizados sem spec de TurboModule | Alto — requer migração para TurboModule |
| RCTAppDelegate (0.76 iOS) | Configuração customizada do `AppDelegate` | Médio — reescrever método de inicialização, testar lifecycle |
| Edge-to-edge (0.76 + targetSdk 35) | `StatusBar.setBackgroundColor`, padding fixo | Médio — auditoria tela a tela necessária |
| Modo strict do Metro (contínuo) | Tipos re-exportados, dependências circulares | Baixo por arquivo, médio no agregado |

---

## Automatizando a Análise: `@rnx-kit/align-deps`

Após atualizar a versão do RN, execute o alinhador de dependências da Microsoft para identificar versões de pacotes incompatíveis em toda a sua árvore de dependências:

```bash
npx @rnx-kit/align-deps --requirements react-native@0.76 --write
```

Saída:

```
✗ react-native-reanimated@2.17.0
  Expected: ^3.0.0 for react-native@0.76
  Run: yarn add react-native-reanimated@3.x

✗ @react-native-async-storage/async-storage@1.19.0
  Expected: ^2.0.0 for react-native@0.76
  Run: yarn add @react-native-async-storage/async-storage@2.x

✓ react-native-screens@3.34.0 — OK
```

`--write` atualiza seu `package.json` automaticamente. Revise as mudanças antes de commitar.

---

## Verificando o Suporte à Nova Arquitetura de uma Biblioteca Específica

```bash
# Verificação interativa
open https://reactnative.directory

# Verificação via CLI (todas as dependências do seu package.json)
npx react-native-check-new-archi

# Verificação em lote via web
open https://react-native-package-checker.vercel.app
```

O Directory tem um filtro: `Libraries > New Architecture > Supported`. Use-o antes de adicionar qualquer nova biblioteca a um projeto com Nova Arquitetura.

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [CHANGELOG.md — facebook/react-native](https://github.com/facebook/react-native/blob/main/CHANGELOG.md) | Changelog autoritativo com Breaking Changes por versão |
| [reactwg/react-native-releases](https://github.com/reactwg/react-native-releases) | Grupo de trabalho — discussões de RC, problemas conhecidos pré-release |
| [GitHub Releases](https://github.com/facebook/react-native/releases) | Notas de release por versão |
| [New Architecture is Here (0.76)](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here) | Post do blog da Meta: cada breaking change na 0.76 explicada |
| [react-native-check-new-archi](https://github.com/arochedy/react-native-check-new-archi) | CLI para verificar compatibilidade com Nova Arquitetura no package.json |
| [@rnx-kit/align-deps](https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps) | Alinha todas as peer dependencies após um bump de versão |
| [React Native Directory](https://reactnative.directory/) | Registro de bibliotecas com filtro de Nova Arquitetura |
| [Suporte de bibliotecas — reactwg #167](https://github.com/reactwg/react-native-new-architecture/discussions/167) | Tracker de status de 2024 da adoção de bibliotecas para a Nova Arquitetura |

---

Próximo → [Roadmap e Caminho de Upgrade Recomendado](./upgrade-roadmap)
