---
title: Brownfield Navigation
---

# Lab 02 — Brownfield Navigation

**Pré-requisito:** [Lab 01 — Brownfield Bootstrap](/rn-advanced-lab/brownfield-bootstrap).
**Opcional:** não.

## Contexto

O Lab 01 provou a encanação: tocar em um card de torneio abre uma tela React Native que
recebe os dados do torneio e consegue navegar de volta. Essa tela hoje só imprime um
nome — ainda não é útil.

Enquanto isso, o app nativo já entrega duas telas a mais: **Histórico** (uma lista de
torneios finalizados, `HistoryScreen.kt`) e **Ranking Global** (`RankingScreen.kt`, uma
tabela de pontos entre todos os participantes). As duas já existem hoje, pré-construídas,
nativas, acessíveis pela barra superior da lista de torneios. Sob a premissa brownfield,
essas são "telas que já estavam em produção" — seu trabalho em RN precisa se encaixar
*dentro* desse app, incluindo navegar para frente até esses dois destinos nativos já
existentes.

Este lab transforma o placeholder do Lab 01 na tela real de Tournament Detail, e estende
o grafo do `NavHost` nativo para que o RN consiga empurrar navegação para frente em
território nativo — não só para trás, de onde veio.

## Objetivo

Substituir o placeholder do Lab 01 por uma tela real de **Tournament Detail** em React
Native, e tornar possível navegar dessa tela RN para as telas nativas de Histórico e
Ranking Global (RN → nativo, dessa vez, não nativo → RN).

## Critérios de conclusão

- [ ] A tela RN do Lab 01 é substituída por uma tela real de Tournament Detail, ainda
      aberta ao tocar em um `TournamentCard` e ainda recebendo o torneio como initial
      props
- [ ] A tela mostra, no mínimo: nome do torneio, modalidade, formato
      (eliminação simples / todos-contra-todos / suíço), status, e a lista de
      participantes
- [ ] Se o formato do torneio for eliminação simples ou suíço, a estrutura de
      chaveamento/pareamento é renderizada (mesmo uma lista aninhada simples de
      rodadas/partidas já vale — capricho visual não é o ponto deste lab)
- [ ] O banner roxo `"REACT NATIVE SCREEN"` do Lab 01 continua presente
- [ ] A tela tem um botão/ação que navega para a tela nativa de **Histórico** sem passar
      pela lista de torneios antes (ou seja, é um push para frente no `NavHost` nativo
      existente em `Routes.kt`, não um `finish()` + reabertura)
- [ ] A tela tem um segundo botão/ação que faz o mesmo para **Ranking Global**
- [ ] A partir de qualquer uma das telas nativas, o botão voltar da plataforma retorna
      para a tela RN de Tournament Detail (não até a lista de torneios nativa) — a pilha
      de navegação precisa ser uma pilha real, não um conjunto de telas independentes
- [ ] Nenhuma tela duplicada com `OriginBadge`/banner roxo é empilhada em cima de outra
      se o usuário martelar os botões de navegação repetidamente

## Como abordar

1. Olhe o `Routes.kt` e o composable `CiandtChampionshipsApp` do `MainActivity.kt` do
   Lab 01 (ou do template, se você ainda não mexeu na navegação) — o `NavHost` nativo já
   tem os destinos `TOURNAMENT_LIST`, `HISTORY` e `RANKING`.
2. A superfície RN que você construiu no Lab 01 vive fora desse `NavHost` (uma Activity
   separada ou um Fragment empilhado de outra forma). Decida como a navegação para frente
   a partir do RN chega em `HISTORY`/`RANKING`: a opção mais limpa é expor um pequeno
   módulo nativo (`NavigationBridge` ou similar) com dois métodos (`openHistory()`,
   `openRanking()`) que a tela RN chama, que por sua vez empilham na *mesma* instância de
   `NavHostController` que já comanda o grafo nativo.
3. Construa a lista de participantes e a renderização do chaveamento usando os dados de
   torneio que você já recebe como initial props — nenhum dado nativo novo é necessário
   para este lab, reaproveite o que o Lab 01 já conectou.
4. Teste o comportamento da pilha de volta explicitamente: RN detail → Histórico nativo →
   voltar → deve cair no RN detail, não na lista nativa.

## Armadilhas comuns

:::warning Dois sistemas de navegação, uma pilha mental
Como o RN não vive dentro do `NavHost` nativo, é fácil acabar com duas pilhas de volta
independentes que não concordam entre si. Antes de escrever código, desenhe no papel a
pilha de navegação que você quer: `Lista de Torneios → [RN] Detail → Histórico` deve se
comportar como uma única pilha linear do ponto de vista do usuário, mesmo que a
implementação esteja dividida entre dois sistemas de navegação.
:::

:::note A renderização do chaveamento pode ficar simples
Não gaste o tempo deste lab com o visual do chaveamento (linhas conectando partidas,
lógica de seeding, etc.) — uma lista aninhada simples de rodadas e pareamentos, legível,
já basta. Capricho visual está explicitamente fora de escopo; o critério é "a estrutura
está lá e correta."
:::

:::warning Um novo módulo nativo em mão dupla
Se o seu `NavigationBridge` também precisar avisar o RN de algo (ex.: "usuário voltou do
Histórico"), lembre que TurboModules na New Architecture usam codegen no estilo
`TurboModuleRegistry.getEnumerator` com um arquivo `.spec.ts` — não caia de volta para uma
implementação `NativeModules` legada só porque parece um pouco menos setup para uma
chamada de método pontual.
:::

## Aprofunde-se

- [Communication and Navigation](/trilha-masterclass/modulo-01-brownfield/communication-and-navigation) —
  cobre exatamente esse cenário (RN empurrando para destinos nativos) no "Canal 5:
  chamando métodos nativos a partir do RN," e os trade-offs mais amplos de pilhas de
  navegação divididas
- [JSI — The JavaScript Interface](/trilha-masterclass/modulo-02-jsi-fabric/jsi-javascript-interface) —
  contexto sobre por que uma chamada síncrona de módulo nativo (como `openHistory()`) é
  barata na New Architecture comparada com a bridge assíncrona antiga, se você tiver
  curiosidade sobre o "porquê" por trás da abordagem recomendada

## Confira sua solução

Compare o comportamento da sua pilha de navegação com a branch de referência
`lab-02-solution` no repositório de origem quando terminar.

## Próximo lab

Continue para o
[Lab 03 — Native Library Bridge](/rn-advanced-lab/native-library-bridge), onde você vai
construir um TurboModule do zero para gerar chaveamentos de torneio nativamente e chamá-lo
a partir de uma nova tela RN de Criar Torneio.
