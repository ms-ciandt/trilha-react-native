---
title: UI Thread vs JS Thread
---

# Lab 04 — UI Thread vs JS Thread

**Pré-requisito:** [Lab 03 — Native Library Bridge](/rn-advanced-lab/native-library-bridge).
**Opcional:** não.

## Contexto

Toda partida de um torneio eventualmente precisa de um placar. Em vez de construir uma
tela totalmente nova do zero, este lab reaproveita a tela de Tournament Detail do Lab 02
como ponto de entrada para uma nova tela de **Lançamento de Placar** — tocar em uma
partida na lista de chaveamento/pareamento abre essa tela. Arquiteturalmente isso é o
mesmo padrão que você já conhece: uma tela RN navegando para outra tela RN com dados
como props, mais o padrão de navegação para frente do Lab 02 em direção às telas nativas,
que ainda se aplica depois que os placares são salvos (um torneio concluído deve
aparecer na tela nativa de Histórico).

A virada neste lab não é uma encanação nova — é performance. O lançamento de placar
envolve recálculo ao vivo (classificação corrente, status de eliminação, variação no
ranking) conforme o usuário digita, e no Fabric/JSI é muito fácil escrever código que
*parece* bem mas bloqueia a thread JS o suficiente para derrubar frames visivelmente.
Este lab planta esse problema de propósito e pede que você o encontre e conserte.

## Objetivo

Construir a tela de Lançamento de Placar, e diagnosticar + consertar um problema de
performance na thread JS que aparece assim que a interação real (digitar placares,
rolar uma lista longa de participantes/classificação) dispara trabalho síncrono caro em
cada tecla ou frame.

## Critérios de conclusão

- [ ] Tocar em uma partida na tela de Tournament Detail (do Lab 02) abre uma tela de
      Lançamento de Placar para aquela partida específica, recebendo dados de
      partida/participantes como props
- [ ] A tela permite ao usuário digitar um placar para cada lado e enviar
- [ ] Ao enviar, a classificação/ranking é recalculada e o resultado fica visível sem
      sair da tela (um pequeno preview de "classificação atual" ou "status de
      eliminação" já basta — não precisa ser a tela nativa completa de Ranking)
- [ ] Enviar a partida final de um chaveamento de eliminação reflete corretamente o
      status de concluído do torneio no lado nativo (visível depois na tela nativa de
      Histórico, reaproveitando a conexão de navegação para frente do Lab 02)
- [ ] Você consegue apontar para um trecho **específico** de código que estava bloqueando
      a thread JS (não um vago "estava lento") — ex.: um recálculo rodando a cada tecla em
      vez de no envio, um derive caro sem memoização rodando a cada re-render, ou um loop
      síncrono sobre toda a classificação em uma lista grande de participantes
- [ ] Você mediu o problema antes de consertar (Flipper/Perf Monitor com frames caindo,
      um trace de `console.time`/profiler, ou equivalente) — não consertou por instinto
- [ ] Depois do conserto, a mesma interação (digitar placares rapidamente, ou rolar uma
      lista de classificação durante um recálculo pendente) não derruba mais frames
      visivelmente
- [ ] O conserto é uma escolha arquitetural de verdade (debounce da entrada antes de
      recalcular, memoização da classificação derivada, mover o cálculo para fora do
      caminho de render, `startTransition` para atualizações não urgentes) — não um
      workaround que só esconde o sintoma (ex.: desabilitar uma interação enquanto
      computa)

## Como abordar

1. Construa a tela primeiro, de forma funcional, sem se preocupar com performance —
   deixe o lançamento de placar, o recálculo e o envio funcionando de ponta a ponta.
2. Deixe o recálculo "ingênuo" de propósito: rode-o de forma síncrona a cada tecla,
   contra todos os dados do torneio, sem memoização. É assim que a maioria das primeiras
   versões acaba de qualquer forma.
3. Faça o profiling. Use o Perf Monitor do app ou o profiler do React DevTools no
   Flipper enquanto digita rapidamente no campo de placar, especialmente com um torneio
   com uma quantidade razoável de participantes (10+).
4. Identifique exatamente qual função/render é o gargalo, e por que está rodando com
   mais frequência (ou fazendo mais trabalho) do que precisa.
5. Aplique o menor conserto que resolve a causa real — este é um bom lugar para usar
   `useMemo`/`useCallback` corretamente (não em todo lugar, só onde o profiler apontou),
   debounce, ou `startTransition` se o recálculo puder ser despriorizado em relação à
   resposta instantânea do campo de texto.
6. Refaça o profiling para confirmar que os frames pararam de cair — isso fecha o
   ciclo do mesmo jeito que você abriu.

## Armadilhas comuns

:::warning Consertar sem medir antes
É fácil chutar errado o que está lento. Um `useMemo` colocado na função errada não faz
nada para frames caindo por causa de um filho sem memoização re-renderizando. Faça o
profiling primeiro, forme uma hipótese específica, depois conserte — inverter essa ordem
desperdiça tempo, e o ponto inteiro deste lab é a etapa de diagnóstico.
:::

:::note A thread JS não é a única thread que pode ser bloqueada
Na New Architecture, a renderização do Fabric tem sua própria thread, e é possível criar
jank através de trabalho excessivo de host-view (layouts muito aninhados recalculando)
em vez de bloqueio específico da thread JS. Se o seu profiling mostrar a thread JS
ociosa mas os frames ainda caindo, olhe para a complexidade de layout/render, não só
para a lógica JS.
:::

:::warning Debounce em tudo por reflexo
Fazer debounce do recálculo é um conserto legítimo, mas fazer debounce do *próprio campo
de texto* faz a digitação parecer travada — a entrada precisa continuar instantaneamente
responsiva; só o trabalho derivado caro (classificação, checagem de eliminação) deve ser
atrasado ou postergado.
:::

## Aprofunde-se

- [Performance](/trilha-masterclass/modulo-04-performance-cicd/performance) — o
  vocabulário geral para este lab: o que "thread JS" significa na New Architecture, e o
  kit de ferramentas padrão (memoização, batching, `startTransition`) para mantê-la
  desbloqueada
- [Profiling and Renders](/trilha-masterclass/modulo-04-performance-cicd/profiling-and-renders) —
  como de fato ler um trace de profiler e distinguir um re-render desperdiçado de um
  genuinamente caro — leia antes de começar a chutar consertos

## Confira sua solução

A branch de referência `lab-04-solution` no repositório de origem inclui a versão
intencionalmente ingênua *e* a versão consertada como commits separados, para que você
possa comparar exatamente o que mudou e por quê, depois de fazer seu próprio diagnóstico
primeiro.

## Próximo lab

O [Lab 05 — Godot Integration](/rn-advanced-lab/godot-integration) é opcional — um
exercício de brownfield mais profundo, embutindo uma view de jogo Godot ao lado de telas
RN e nativas no mesmo app. Tudo o que é obrigatório na trilha principal termina aqui, no
Lab 04.
