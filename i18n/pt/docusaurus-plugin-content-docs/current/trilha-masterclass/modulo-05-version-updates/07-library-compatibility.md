---
title: Compatibilidade de Bibliotecas de Terceiros
---

# Compatibilidade de Bibliotecas de Terceiros

> A maior fonte de atrito em upgrades sao bibliotecas de terceiros que nao migraram para a Nova Arquitetura. Antes de se comprometer com um cronograma de upgrade, faca o inventario das suas dependencias primeiro.

---

## Os Dois Problemas de Compatibilidade

### Problema 1: Suporte a Nova Arquitetura (o principal para 0.76+)

Bibliotecas que usam a bridge antiga (`NativeModules`, `NativeEventEmitter`, `requireNativeComponent`) funcionam na Nova Arquitetura via a **Camada de Interop** — mas com ressalvas:

- A maioria das bibliotecas funciona de forma transparente pela camada de interop
- Bibliotecas com integracoes nativas profundas (JSI, C++, componentes Fabric customizados) podem quebrar
- Bibliotecas ativamente mantidas geralmente ja migraram; as abandonadas nao migraram

### Problema 2: Incompatibilidade de versao de peer dependency

Uma biblioteca pode ser compativel com a Nova Arquitetura mas declarar uma peer dependency em `react-native@^0.74.x` que o seu gerenciador de pacotes rejeita na 0.76. Esse e um problema de metadados, nao funcional — voce geralmente pode usar `--legacy-peer-deps` ou `overrides` para contornar, mas verifique se a biblioteca de fato funciona na nova versao.

---

## Antes do Upgrade: Inventario de Bibliotecas

```bash
# Gerar uma lista de todas as dependencias relacionadas ao RN
cat package.json | jq '.dependencies, .devDependencies' | grep -E '"react-native|@react-native|expo'
```

Para cada biblioteca, verifique:

1. **React Native Directory** — ela tem o badge "New Architecture"?
2. **Releases do GitHub da biblioteca** — ha um release recente mencionando 0.76 ou Nova Arquitetura?
3. **Issues do GitHub da biblioteca** — pesquise "new architecture" ou "0.76" — ha problemas conhecidos?

---

## Ferramentas para Verificacao de Compatibilidade em Lote

### Ferramenta 1: `react-native-check-new-archi` (CLI)

```bash
# Instale globalmente ou use com npx
npx react-native-check-new-archi

# Exemplo de saida:
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

Mostra a ultima atualizacao da biblioteca, status de manutencao, downloads semanais e flags de compatibilidade. O sinal mais confiavel — os dados do Directory vem dos proprios mantenedores, que os reportam por conta propria.

### Ferramenta 3: React Native Package Checker (web — em lote)

```
https://react-native-package-checker.vercel.app
```

Cole o bloco de dependencias do seu `package.json`. Retorna uma tabela: nome da biblioteca, ultima versao, suporte a Nova Arquitetura, ultima atualizacao.

### Ferramenta 4: `@rnx-kit/align-deps` (alinhamento de dependencias)

```bash
npx @rnx-kit/align-deps --requirements react-native@0.76

# Saida:
✗ react-native-camera@1.13.0
  Expected: No compatible version found for react-native@0.76
  Suggestion: Consider an alternative — see react-native.directory
```

---

## Os Tres Cenarios e o Que Fazer

### Cenario A: Biblioteca compativel com a Nova Arquitetura (ideal)

A maioria das bibliotecas ativamente mantidas. Apenas atualize e prossiga.

```bash
yarn add react-native-reanimated@latest
# Verifique: cat node_modules/react-native-reanimated/package.json | grep '"react-native"'
# Deve mostrar um range de peer dep que inclui sua versao do RN
```

### Cenario B: Biblioteca funciona via Camada de Interop (comum)

A biblioteca usa a bridge antiga, mas a Camada de Interop faz com que funcione de forma transparente na Nova Arquitetura. Voce pode ver um aviso de deprecacao nos logs do Metro, mas a biblioteca funciona.

```
WARN RCTBridge required for some APIs is deprecated. Use RCTHost instead.
```

Se voce ve esse aviso e o recurso funciona: esta tudo bem por enquanto. Abra uma issue ou PR na biblioteca para migrar para TurboModules. Nao desative a Nova Arquitetura em panico por causa disso.

Para verificar se uma biblioteca especifica funciona pela camada de interop:

```bash
# Ative a Nova Arquitetura e execute o recurso
# Verifique Metro / Logcat por erros, nao apenas avisos
```

### Cenario C: Biblioteca incompativel ou abandonada

```bash
# Etapa 1: Procure por forks com suporte a Nova Arquitetura
# Pesquise no GitHub: "react-native-camera new architecture fork 2024"

# Etapa 2: Verifique se ha uma alternativa bem mantida
open https://reactnative.directory/
# Pesquise pela mesma funcionalidade com o filtro "New Architecture"

# Etapa 3: Se nao houver alternativa, considere encapsular com um TurboModule customizado
# Este e o cenario do Modulo 02 (TurboModules) — escreva uma spec fina sobre a API nativa
```

### Alternativas comuns para bibliotecas nao migradas

| Biblioteca abandonada | Alternativa com Nova Arquitetura |
|---|---|
| `react-native-camera` | `react-native-vision-camera` (mrousavy) |
| `react-native-firebase` (antiga) | `@react-native-firebase/*` v21+ |
| `react-native-maps` | `react-native-maps` 1.10+ (ativamente mantida) |
| `react-native-svg` | `react-native-svg` 15+ (compativel com NA) |
| `react-native-linear-gradient` | `react-native-linear-gradient` 2.8+ |
| `react-native-video` | `react-native-video` 6.4+ |

---

## Padroes de Migracao por Biblioteca

### react-native-reanimated (dependencia critica)

O Reanimated tem uma fronteira de versao major na v3. A v2.x nao suporta Nova Arquitetura.

```bash
yarn add react-native-reanimated@3.x

# iOS: pod install
# Android: nenhuma etapa adicional — o Reanimated configura automaticamente seu turbo module JSI
```

Verifique se suas animacoes ainda funcionam — a v3 tem pequenas mudancas de API para `useSharedValue` e configuracoes padrao do `withSpring`.

### react-native-screens

Qualquer versao abaixo de 3.29 tem problemas conhecidos com a Nova Arquitetura. Atualize para a mais recente:

```bash
yarn add react-native-screens@latest
```

### @react-navigation/*

A Navigation v7 e compativel com a Nova Arquitetura. A Navigation v6 funciona via interop na 0.76, mas voce vera avisos. Planeje atualizar para a v7 ao fazer upgrade para 0.76.

```bash
yarn add @react-navigation/native@7.x
yarn add @react-navigation/stack@7.x   # ou os navigators que voce usa
```

### react-native-gesture-handler

A versao 2.21+ e totalmente compativel com a Nova Arquitetura. Versoes mais antigas usavam o sistema de eventos antigo e podem se comportar de forma diferente no Fabric.

```bash
yarn add react-native-gesture-handler@latest
```

---

## Se Voce Precisar Desativar a Nova Arquitetura Temporariamente

Quando uma biblioteca incompativel esta bloqueando todo o seu upgrade, desative a Nova Arquitetura para esse release e planeje um followup:

```properties
# android/gradle.properties
newArchEnabled=false
```

```ruby
# ios/Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

Isso mantem voce na 0.76 (obtendo todas as melhorias do RN) mas com a Legacy Architecture enquanto resolve o problema da biblioteca. Defina um prazo — esse nao e um estado permanente.

---

## New Architecture Working Group: Tracker de Status de Bibliotecas

O reactwg publica um tracker de bibliotecas populares e seu status de suporte a Nova Arquitetura:

```
https://github.com/reactwg/react-native-new-architecture/discussions/167
```

Em 2024, mais de 61% das 400 bibliotecas RN mais instaladas suportam a Nova Arquitetura. O numero cresce a cada mes.

---

## Materiais de Estudo

| Recurso | Descricao |
|---|---|
| [React Native Directory](https://reactnative.directory/) | Registro pesquisavel com filtro de Nova Arquitetura |
| [react-native-check-new-archi](https://github.com/arochedy/react-native-check-new-archi) | CLI para verificar compatibilidade de todas as deps do package.json |
| [React Native Package Checker](https://react-native-package-checker.vercel.app/) | Ferramenta web para relatorio de compatibilidade em lote |
| [@rnx-kit/align-deps](https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps) | Alinha versoes de peer deps apos um upgrade do RN |
| [Tracker de suporte de bibliotecas — reactwg #167](https://github.com/reactwg/react-native-new-architecture/discussions/167) | Tracker oficial de status de 2024 de compatibilidade de bibliotecas populares |
| [New Architecture is Here](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here) | Quais bibliotecas sao compativeis no lancamento da 0.76 |

---

Proximo → [Requisitos de Ambiente (Node, Xcode, SDKs)](./environment-requirements)
