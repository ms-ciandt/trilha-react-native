---
title: Compatibilidade de Bibliotecas de Terceiros
---

# Compatibilidade de Bibliotecas de Terceiros

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc05_07_library-compatibility.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc05_07_library-compatibility.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> A maior fonte de atrito em upgrades são bibliotecas de terceiros que não migraram para a Nova Arquitetura. Antes de se comprometer com um cronograma de upgrade, faça o inventário das suas dependências primeiro.

---

## Os Dois Problemas de Compatibilidade

### Problema 1: Suporte a Nova Arquitetura (o principal para 0.76+)

Bibliotecas que usam a bridge antiga (`NativeModules`, `NativeEventEmitter`, `requireNativeComponent`) funcionam na Nova Arquitetura via a **Camada de Interop** — mas com ressalvas:

- A maioria das bibliotecas funciona de forma transparente pela camada de interop
- Bibliotecas com integrações nativas profundas (JSI, C++, componentes Fabric customizados) podem quebrar
- Bibliotecas ativamente mantidas geralmente já migraram; as abandonadas não migraram

### Problema 2: Incompatibilidade de versão de peer dependency

Uma biblioteca pode ser compatível com a Nova Arquitetura mas declarar uma peer dependency em `react-native@^0.74.x` que o seu gerenciador de pacotes rejeita na 0.76. Esse é um problema de metadados, não funcional — você geralmente pode usar `--legacy-peer-deps` ou `overrides` para contornar, mas verifique se a biblioteca de fato funciona na nova versão.

---

## Antes do Upgrade: Inventário de Bibliotecas

```bash
# Gerar uma lista de todas as dependências relacionadas ao RN
cat package.json | jq '.dependencies, .devDependencies' | grep -E '"react-native|@react-native|expo'
```

Para cada biblioteca, verifique:

1. **React Native Directory** — ela tem o badge "New Architecture"?
2. **Releases do GitHub da biblioteca** — há um release recente mencionando 0.76 ou Nova Arquitetura?
3. **Issues do GitHub da biblioteca** — pesquise "new architecture" ou "0.76" — há problemas conhecidos?

---

## Ferramentas para Verificação de Compatibilidade em Lote

### Ferramenta 1: `react-native-check-new-archi` (CLI)

```bash
# Instale globalmente ou use com npx
npx react-native-check-new-archi

# Exemplo de saída:
Checking 47 packages...
✓ @react-navigation/native@6.1.18 — New Architecture supported
✓ react-native-reanimated@3.15.0 — New Architecture supported
✓ react-native-mmkv@3.1.0 — New Architecture supported
✗ react-native-camera@1.13.0 — NOT supported (archived)
⚠ react-native-pdf@6.7.3 — Unknown (not in directory)
```

Fonte: [github.com/arochedy/react-native-check-new-archi](https://github.com/arochedy/react-native-check-new-archi)

### Ferramenta 2: React Native Directory (web)

```
https://reactnative.directory/
```

Filtro: **New Architecture → Supported**

Mostra a última atualização da biblioteca, status de manutenção, downloads semanais e flags de compatibilidade. O sinal mais confiável — os dados do Directory vêm dos próprios mantenedores, que os reportam por conta própria.

### Ferramenta 3: React Native Package Checker (web — em lote)

```
https://react-native-package-checker.vercel.app
```

Cole o bloco de dependências do seu `package.json`. Retorna uma tabela: nome da biblioteca, última versão, suporte a Nova Arquitetura, última atualização.

### Ferramenta 4: `@rnx-kit/align-deps` (alinhamento de dependências)

```bash
npx @rnx-kit/align-deps --requirements react-native@0.76

# Saída:
✗ react-native-camera@1.13.0
  Expected: No compatible version found for react-native@0.76
  Suggestion: Consider an alternative — see react-native.directory
```

---

## Os Três Cenários e o Que Fazer

### Cenário A: Biblioteca compatível com a Nova Arquitetura (ideal)

A maioria das bibliotecas ativamente mantidas. Apenas atualize e prossiga.

```bash
yarn add react-native-reanimated@latest
# Verifique: cat node_modules/react-native-reanimated/package.json | grep '"react-native"'
# Deve mostrar um range de peer dep que inclui sua versão do RN
```

### Cenário B: Biblioteca funciona via Camada de Interop (comum)

A biblioteca usa a bridge antiga, mas a Camada de Interop faz com que funcione de forma transparente na Nova Arquitetura. Você pode ver um aviso de depreciação nos logs do Metro, mas a biblioteca funciona.

```
WARN RCTBridge required for some APIs is deprecated. Use RCTHost instead.
```

Se você vê esse aviso e o recurso funciona: está tudo bem por enquanto. Abra uma issue ou PR na biblioteca para migrar para TurboModules. Não desative a Nova Arquitetura em pânico por causa disso.

Para verificar se uma biblioteca específica funciona pela camada de interop:

```bash
# Ative a Nova Arquitetura e execute o recurso
# Verifique Metro / Logcat por erros, não apenas avisos
```

### Cenário C: Biblioteca incompatível ou abandonada

```bash
# Etapa 1: Procure por forks com suporte a Nova Arquitetura
# Pesquise no GitHub: "react-native-camera new architecture fork 2024"

# Etapa 2: Verifique se há uma alternativa bem mantida
open https://reactnative.directory/
# Pesquise pela mesma funcionalidade com o filtro "New Architecture"

# Etapa 3: Se não houver alternativa, considere encapsular com um TurboModule customizado
# Este é o cenário do Módulo 02 (TurboModules) — escreva uma spec fina sobre a API nativa
```

### Alternativas comuns para bibliotecas não migradas

| Biblioteca abandonada | Alternativa com Nova Arquitetura |
|---|---|
| `react-native-camera` | `react-native-vision-camera` (mrousavy) |
| `react-native-firebase` (antiga) | `@react-native-firebase/*` v21+ |
| `react-native-maps` | `react-native-maps` 1.10+ (ativamente mantida) |
| `react-native-svg` | `react-native-svg` 15+ (compatível com NA) |
| `react-native-linear-gradient` | `react-native-linear-gradient` 2.8+ |
| `react-native-video` | `react-native-video` 6.4+ |

---

## Padrões de Migração por Biblioteca

### react-native-reanimated (dependência crítica)

O Reanimated tem uma fronteira de versão major na v3. A v2.x não suporta Nova Arquitetura.

```bash
yarn add react-native-reanimated@3.x

# iOS: pod install
# Android: nenhuma etapa adicional — o Reanimated configura automaticamente seu turbo module JSI
```

Verifique se suas animações ainda funcionam — a v3 tem pequenas mudanças de API para `useSharedValue` e configurações padrão do `withSpring`.

### react-native-screens

Qualquer versão abaixo de 3.29 tem problemas conhecidos com a Nova Arquitetura. Atualize para a mais recente:

```bash
yarn add react-native-screens@latest
```

### @react-navigation/*

A Navigation v7 é compatível com a Nova Arquitetura. A Navigation v6 funciona via interop na 0.76, mas você verá avisos. Planeje atualizar para a v7 ao fazer upgrade para 0.76.

```bash
yarn add @react-navigation/native@7.x
yarn add @react-navigation/stack@7.x   # ou os navigators que você usa
```

### react-native-gesture-handler

A versão 2.21+ é totalmente compatível com a Nova Arquitetura. Versões mais antigas usavam o sistema de eventos antigo e podem se comportar de forma diferente no Fabric.

```bash
yarn add react-native-gesture-handler@latest
```

---

## Se Você Precisar Desativar a Nova Arquitetura Temporariamente

Quando uma biblioteca incompatível está bloqueando todo o seu upgrade, desative a Nova Arquitetura para esse release e planeje um followup:

```properties
# android/gradle.properties
newArchEnabled=false
```

```ruby
# ios/Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

Isso mantém você na 0.76 (obtendo todas as melhorias do RN) mas com a Legacy Architecture enquanto resolve o problema da biblioteca. Defina um prazo — esse não é um estado permanente.

---

## New Architecture Working Group: Tracker de Status de Bibliotecas

O reactwg publica um tracker de bibliotecas populares e seu status de suporte a Nova Arquitetura:

```
https://github.com/reactwg/react-native-new-architecture/discussions/167
```

Em 2024, mais de 61% das 400 bibliotecas RN mais instaladas suportam a Nova Arquitetura. O número cresce a cada mês.

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [React Native Directory](https://reactnative.directory/) | Registro pesquisável com filtro de Nova Arquitetura |
| [react-native-check-new-archi](https://github.com/arochedy/react-native-check-new-archi) | CLI para verificar compatibilidade de todas as deps do package.json |
| [React Native Package Checker](https://react-native-package-checker.vercel.app/) | Ferramenta web para relatório de compatibilidade em lote |
| [@rnx-kit/align-deps](https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps) | Alinha versões de peer deps após um upgrade do RN |
| [Tracker de suporte de bibliotecas — reactwg #167](https://github.com/reactwg/react-native-new-architecture/discussions/167) | Tracker oficial de status de 2024 de compatibilidade de bibliotecas populares |
| [New Architecture is Here](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here) | Quais bibliotecas são compatíveis no lançamento da 0.76 |

---

Próximo → [Requisitos de Ambiente (Node, Xcode, SDKs)](./environment-requirements)
