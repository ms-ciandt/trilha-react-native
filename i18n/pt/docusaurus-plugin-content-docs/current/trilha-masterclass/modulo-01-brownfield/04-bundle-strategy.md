---
title: Estratégia de Bundles
---

## 9. Estratégia de Bundles: Bundle Único vs. Multi-Bundle

Todos os exemplos deste módulo até aqui assumem um único bundle JS por trás de cada
surface — a Seção 4 disse explicitamente "qualquer número de surfaces a partir do mesmo
bundle JS". Esse padrão é o correto para a maioria dos apps brownfield. Esta seção cobre
quando ele deixa de ser correto, e como fica a alternativa.

### O padrão de bundle único (recapitulando)

Um único `index.js` registra todas as surfaces RN do app via `AppRegistry.registerComponent`.
O `ReactHost` / `RCTHost` carrega esse bundle uma vez, e cada surface — Checkout, Feed,
Perfil, o que for — é uma árvore de componentes definida dentro dele. Simples de montar
(Metro pronto de fábrica), simples de raciocinar, simples de versionar: um bundle, um
release.

### Onde isso quebra em escala

O bundle único cresce de forma monotônica conforme features são adicionadas. Toda surface
paga o custo de parse, compilação e memória do bundle **inteiro**, tenha o usuário aberto
a maioria dessas features ou não:

- **Custo de cold start.** O Hermes precisa carregar e inicializar o bytecode do bundle
  inteiro antes que a primeira surface consiga renderizar, mesmo que essa surface use só
  uma fração dele. Em um Android de gama baixa ou média, um bundle que já cresceu para a
  faixa de vários MB adiciona latência mensurável à primeira surface.
- **Footprint de memória sustentado.** Tudo que está registrado no bundle fica residente
  no mesmo heap JS pela vida inteira do `ReactHost`, independente de quais surfaces estão
  de fato montadas.
- **Custo organizacional.** Se três times possuem cada um uma surface RN diferente, todos
  eles entregam dentro do mesmo artefato. A mudança de um time significa recompilar e
  relançar o código de todo mundo.

Nada disso importa em um app pequeno com um único time e poucas surfaces — o bundle
simplesmente nunca cresce o suficiente pra ser notado. Passa a importar quando o app
chega em escala de super-app: muitos times, muitas surfaces, um bundle que já cresceu
além do que um device fraco processa com conforto.

### Mecanismo 2: bundles de serviço + core compartilhado

A alternativa divide o bundle único em:

- **Um bundle de core compartilhado** — a conexão do runtime RN, componentes do design
  system e utilitários comuns que toda surface precisa. Carregado uma única vez.
- **N bundles de serviço** — um por feature ou time (Checkout, Feed, Perfil...), cada um
  compilado e versionado de forma independente, cada um referenciando o core
  compartilhado em vez de duplicá-lo.

É o mesmo problema que o Module Federation resolve na web: um **host** expõe um escopo
compartilhado de dependências, e **remotes** consomem essas dependências em vez de
empacotar suas próprias cópias. O Metro não suporta isso nativamente — não existe um
mecanismo embutido de dedupe de módulos entre bundles compilados de forma independente.
O [Re.Pack](https://re-pack.dev/) (bundler da Callstack baseado em Rspack para React
Native) é a ferramenta que traz Module Federation para o RN, substituindo o Metro em vez
de rodar em cima dele.

Uma configuração mínima de Module Federation no Re.Pack marca as dependências
compartilhadas como singletons, para que todo remote resolva para a **mesma** instância
de React/React Native já carregada pelo host, em vez de empacotar a sua própria:

```js
// rspack.config.mjs (core compartilhado / host)
import { Repack } from '@callstack/repack';
import { ModuleFederationPlugin } from '@callstack/repack/webpack';

export default {
  plugins: [
    new Repack.RepackPlugin(),
    new ModuleFederationPlugin({
      name: 'host',
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: true },
      },
    }),
  ],
};
```

```js
// rspack.config.mjs (bundle de serviço tournament-detail / remote)
import { Repack } from '@callstack/repack';
import { ModuleFederationPlugin } from '@callstack/repack/webpack';

export default {
  plugins: [
    new Repack.RepackPlugin(),
    new ModuleFederationPlugin({
      name: 'tournamentDetail',
      exposes: {
        './TournamentDetailScreen': './src/screens/TournamentDetailScreen',
      },
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: true },
      },
    }),
  ],
};
```

O bundle de serviço só é buscado e avaliado quando sua surface é de fato criada — então
um cold start paga pelo core compartilhado mais o único serviço que o usuário abrir
primeiro, não por todas as features do app.

### Comparação

| Dimensão | Bundle único (padrão) | Multi-bundle (serviço + core compartilhado) |
|---|---|---|
| Complexidade de setup | Baixa — Metro de fábrica | Maior — Re.Pack/Rspack substitui o Metro |
| Custo de cold start | Paga pelo JS do app inteiro | Paga pelo core compartilhado + a feature aberta |
| Footprint de memória | Cresce com o total de features enviadas | Cresce com as features de fato abertas |
| Independência de deploy por time | Um único trem de release para todas as surfaces RN | Cada bundle de serviço lança/versiona por conta própria |
| Debug | Um source map, uma call stack | Múltiplos source maps, stack traces entre bundles |
| Maturidade da ferramenta | Testado em batalha, caminho padrão do RN | Mais novo, comunidade menor, mais conexão manual |
| Onde compensa | App pequeno-médio, um único time | Muitos times, ou um bundle que já prejudica o cold start em devices fracos |

### Orientação para decidir

O padrão é o bundle único. Fazer o split tem um custo — ferramental extra de build, um
contrato de escopo compartilhado que precisa se manter correto em todo remote, debug mais
difícil — que só se paga com evidência real: uma regressão medida de cold start ou memória
nos seus devices de gama baixa reais, ou uma necessidade organizacional genuína de times
lançarem suas surfaces RN de forma independente uns dos outros. Dividir o bundle de um app
pequeno "por performance" sem nenhuma dessas duas evidências geralmente só adiciona
complexidade de ferramental sem ganho observável.

### Coloque em prática

O [Lab 01-B — Brownfield Bundle Split](/rn-advanced-lab/brownfield-bundle-split)
reconstrói o mesmo resultado do Lab 01 nessa arquitetura, para você comparar as duas
diretamente.

### Leitura complementar

| Recurso | O que cobre |
|---|---|
| [Documentação do Re.Pack](https://re-pack.dev/) | Setup de Module Federation para React Native, configuração de escopo compartilhado |
| [Re.Pack no GitHub](https://github.com/callstack/repack) | Código-fonte, exemplos, notas de migração a partir do Metro |
| [Webpack: conceitos de Module Federation](https://webpack.js.org/concepts/module-federation/) | O modelo host/remote/escopo-compartilhado que o Re.Pack implementa para o RN |
