---
title: Brownfield Bundle Split
---

# Lab 01-B — Brownfield Bundle Split

**Pré-requisito:** [Lab 01 — Brownfield Bootstrap](/rn-advanced-lab/brownfield-bootstrap).
**Opcional:** sim — é uma abordagem alternativa para a "encanação" do Lab 01, não um passo
obrigatório para o Lab 02.
**Template:** o mesmo do Lab 01 —
[`ciandt-championships-android-template`](https://github.com/gbonin-ciandt/ciandt-championships-android-template),
partindo de uma cópia nova do template base, não da sua branch do Lab 01.

## Contexto

O Lab 01 resolveu o problema de encanação com a arquitetura mais simples e correta: um
único bundle JS, uma única surface via `AppRegistry.registerComponent`. Esse é o padrão
certo para um app pequeno — veja
[Estratégia de Bundles](/trilha-masterclass/modulo-01-brownfield/bundle-strategy) para
entender o porquê.

Mas quando um app tem muitas surfaces RN pertencendo a times diferentes, ou o bundle JS já
cresceu o suficiente para prejudicar o cold start em Android de gama baixa, os times
dividem ele em um bundle de **core compartilhado** mais **N bundles de serviço**,
conectados via Module Federation em vez de um único bundle Metro. Este lab reconstrói o
mesmo resultado visível do Lab 01 nessa arquitetura, para você comparar as duas
diretamente.

## Objetivo

Reproduzir o comportamento do Lab 01 — tocar num card de torneio abre uma tela RN
placeholder com o badge roxo e o nome do torneio — mas construído como:

1. Um bundle de **core compartilhado** carregando a conexão do runtime RN e um componente
   no estilo `OriginBadge` compartilhado,
2. Um **bundle de serviço tournament-detail** separado, que é o remote consumido pelo core
   compartilhado,
3. Conectado via [Re.Pack](https://re-pack.dev/) com Module Federation, com `react` e
   `react-native` configurados como singletons compartilhados.

## Critérios de conclusão

- [ ] O Re.Pack substitui o Metro como bundler do projeto
- [ ] Existem dois bundles de saída distintos depois do build: um bundle de
      core-compartilhado/host e um bundle remote tournament-detail — confirme isso
      inspecionando a saída do build, não apenas confiando na configuração
- [ ] `react` e `react-native` estão configurados como singletons compartilhados na
      configuração de Module Federation dos dois lados — confirme em tempo de execução que
      existe apenas uma instância de React (sem avisos de instância duplicada, sem
      context quebrado)
- [ ] O bundle remote tournament-detail é buscado/avaliado de forma preguiçosa — só depois
      do primeiro toque, não durante o cold start (o mesmo princípio de lazy loading que o
      Lab 01 exigia, agora aplicado também no nível do bundle)
- [ ] O comportamento funcional é idêntico ao Lab 01: badge roxo
      `"REACT NATIVE SCREEN"`, nome do torneio recebido via initial props, navegação de
      volta limpa
- [ ] Você consegue recompilar o bundle remote tournament-detail sozinho, sem recompilar
      ou relançar o bundle de core compartilhado
- [ ] Você compara o tamanho de saída de cada bundle contra o bundle único do Lab 01 e
      anota o que observou — "nenhuma diferença relevante no tamanho deste app" é um
      resultado válido e esperado aqui (veja a armadilha abaixo)

## Como abordar

1. Comece de uma cópia nova do template — não reaproveite sua branch do Lab 01, já que a
   conexão de dependências do RN muda de forma (Re.Pack no lugar do Metro).
2. Instale e configure o Re.Pack no lugar do Metro; monte duas configs Rspack — uma para o
   core-compartilhado/host, outra para o remote tournament-detail.
3. Marque `react` e `react-native` como `shared: { singleton: true, eager: true }` nas
   duas configs. Essa é a peça que evita que duas instâncias separadas de React sejam
   carregadas.
4. Mova o componente do badge roxo para o bundle de core compartilhado, exporte ele, e
   consuma a partir do `TournamentDetailScreen` do remote.
5. Conecte o lado nativo da mesma forma que o Lab 01 (`ReactHost`/`RCTHost` + uma
   surface), mas aponte o carregador de bundle primeiro para o bundle host, e resolva o
   container remote sob demanda quando a surface for criada.
6. Compile os dois bundles e inspecione os manifests/tamanhos de saída para confirmar que
   o split de fato aconteceu — uma dependência compartilhada que vazou para os dois
   bundles é uma falha silenciosa, não um erro de build.

## Armadilhas comuns

:::warning Esperar um ganho dramático de performance neste app
O app Championships é pequeno — três a cinco telas. Dividir ele em múltiplos bundles
muito provavelmente **não** vai produzir uma melhora mensurável de startup ou memória
aqui; o ponto deste lab é a mecânica (conexão de Module Federation, config de singleton
compartilhado, builds independentes), não um ganho de benchmark. Se você quiser realmente
observar a diferença de performance, tente inflar artificialmente o core compartilhado ou
o bundle de serviço com algumas libs de terceiros pesadas primeiro, e então compare o
tempo de cold start antes e depois — isso é opcional e está fora dos critérios de
conclusão deste lab.
:::

:::warning Instâncias duplicadas de React
Se `react`/`react-native` não estiverem marcados como `singleton: true` tanto no host
quanto no remote, você pode acabar com duas cópias separadas de React carregadas em tempo
de execução. Isso normalmente aparece como erros de "Invalid hook call" ou context
quebrado silenciosamente, não como um crash limpo. Se algo na árvore de componentes do
remote se comportar de forma estranha, confira a config compartilhada primeiro.
:::

:::note Ainda não existe branch de solução
Diferente dos outros labs, o `ciandt-championships-android-template` ainda não tem uma
branch de referência `lab-01b-solution` — este é um lab mais novo e opcional. Compare sua
abordagem com colegas ou com um instrutor.
:::

## Aprofunde-se

- [Estratégia de Bundles](/trilha-masterclass/modulo-01-brownfield/bundle-strategy) — a
  tabela de trade-offs e a orientação de decisão por trás deste lab
- [Documentação do Re.Pack](https://re-pack.dev/) — setup de Module Federation para React
  Native
- [Setup and Embedding](/trilha-masterclass/modulo-01-brownfield/setup-and-embedding) — a
  conexão de `ReactHost`/`RCTHost`, inalterada por este lab

## Confira sua solução

Ainda não existe uma branch de referência `lab-01b-solution` no repositório do template.
Compare sua abordagem com colegas ou com um instrutor.

## Próximo lab

Este é um desvio opcional, não uma dependência do que vem a seguir. Siga para o
[Lab 02 — Brownfield Navigation](/rn-advanced-lab/brownfield-navigation), que constrói
em cima da encanação do Lab 01 — qualquer uma das duas versões funciona, já que o
comportamento visível para o usuário é idêntico.
