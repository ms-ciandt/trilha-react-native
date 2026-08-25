---
title: Native Library Bridge
---

# Lab 03 — Native Library Bridge

**Pré-requisito:** [Lab 02 — Brownfield Navigation](/rn-advanced-lab/brownfield-navigation).
**Opcional:** não.

## Contexto

Até agora o app só lê torneios já existentes — ninguém consegue criar um a partir do
lado RN. Criar um torneio também não é só "salvar um formulário numa lista": uma vez que
você sabe os participantes e o formato (eliminação simples, todos-contra-todos, ou
suíço), você precisa gerar de fato o chaveamento ou o calendário de pareamentos,
incluindo os casos de borda de número ímpar de participantes (byes na eliminação
simples, uma rodada extra de "descanso" no todos-contra-todos).

Essa lógica de geração é exatamente o tipo de coisa que vale a pena escrever uma vez, de
forma nativa, e reaproveitar — é computação pura, não tem UI, e se beneficia de
tipagem forte dos dois lados da bridge. Este lab é onde TurboModules deixam de ser algo
que você só leu a respeito e passam a ser algo que você constrói.

## Objetivo

Construir uma tela React Native de **Criar Torneio**, apoiada por um TurboModule nativo
que recebe uma lista de participantes e um formato e devolve um chaveamento/calendário
gerado — computado nativamente, não em JavaScript.

## Critérios de conclusão

- [ ] Uma nova tela RN (Criar Torneio) coleta: nome do torneio, modalidade, formato
      (eliminação simples / todos-contra-todos / suíço), e uma lista de nomes de
      participantes (adicionar/remover entradas, no mínimo 2 obrigatórios)
- [ ] Um TurboModule (com `.spec.ts` de verdade e codegen — sem `NativeModules` legado) é
      implementado no lado Android que expõe um método recebendo a lista de participantes
      e o formato, devolvendo a estrutura de chaveamento gerada
- [ ] O módulo nativo trata corretamente **eliminação simples** com número de
      participantes que não é potência de 2 (byes são atribuídos, não deixados como erro
      ou crash)
- [ ] O módulo nativo trata corretamente **todos-contra-todos** (cada participante joga
      contra todos os outros exatamente uma vez; número ímpar gera um "descanso" por
      rodada, não um crash)
- [ ] O módulo nativo trata corretamente o pareamento **suíço** da rodada 1 (o
      pareamento das rodadas seguintes depende de resultados, que ainda não existem no
      momento da criação — apenas a rodada 1 já basta para este lab)
- [ ] O chaveamento gerado é exibido de volta na tela RN antes/depois do envio
      (reaproveitar a abordagem de renderização da tela de Tournament Detail do Lab 02 é
      encorajado, não obrigatório)
- [ ] Enviar o formulário cria um torneio real que aparece na lista do
      `TournamentListScreen` nativo (persistido através do que quer que o
      `TournamentRepository` existente já use — em memória está ótimo se for isso que o
      repositório já faz)
- [ ] A chamada ao TurboModule é exercitada com uma entrada malformada ou de tipo
      incompatível pelo menos uma vez durante o desenvolvimento (ex.: uma lista de
      participantes vazia) e falha de forma previsível (um erro lançado/rejeitado que o
      lado RN consegue capturar), não com um crash nativo

## Como abordar

1. Escreva o `.spec.ts` primeiro. Decida o formato do valor de retorno (uma estrutura
   aninhada de rodadas → partidas → pares de participantes funciona para os três
   formatos) antes de escrever qualquer Kotlin — isso mantém o codegen honesto sobre o
   que os dois lados concordam ser o contrato.
2. Implemente os três algoritmos de geração em Kotlin como funções simples primeiro
   (testáveis sem o RN no meio do caminho), depois embrulhe-as na classe do
   TurboModule.
3. Conecte o módulo ao pacote de módulos nativos/registro que a integração RN do Lab 01
   já configurou.
4. Construa o formulário de Criar Torneio em RN, chame o módulo, renderize o resultado.
5. Persista o torneio criado através do mesmo repositório que a tela de lista nativa lê,
   para que ele apareça sem um mecanismo manual de refresh.

## Armadilhas comuns

:::warning Gerar chaveamentos em JavaScript "por enquanto"
É tentador prototipar o algoritmo de chaveamento em JS primeiro por ser mais rápido de
iterar, e nunca chegar a portar de verdade. O critério é especificamente que a
*geração* aconteça de forma nativa — se você acabar com lógica JS funcionando, trate-a
como sua especificação para o port em Kotlin, não como a implementação final.
:::

:::note Tipos suportados em TurboModules
Arrays aninhados de objetos (rodadas → partidas → pares) são suportados pelo codegen, mas
o formato exato precisa ser expresso corretamente no `.spec.ts` (objetos tipados, não
`any`). Confira a referência de tipos suportados linkada abaixo antes de desenhar um
formato de retorno criativo demais.
:::

:::warning Número ímpar de participantes não é um caso de borda que dá pra pular
Cada um dos três formatos tem um cenário real e comum de número ímpar (5 pessoas se
inscrevendo em um chaveamento de eliminação simples é completamente normal em um torneio
de escritório). Teste com número ímpar em todos os formatos antes de considerar este lab
concluído, não só o caminho feliz com número par.
:::

## Aprofunde-se

- [What Is a TurboModule](/trilha-masterclass/modulo-03-turbomodules/what-is-turbomodules) —
  o modelo mental do que você está construindo neste lab
- [Specs in TypeScript](/trilha-masterclass/modulo-03-turbomodules/specs-typescript) — como
  escrever o `.spec.ts` que este lab precisa primeiro
- [Codegen](/trilha-masterclass/modulo-03-turbomodules/codegen) — o que de fato acontece
  entre escrever a spec e ter um método nativo chamável
- [Supported Types](/trilha-masterclass/modulo-03-turbomodules/supported-types) — leia
  antes de fechar o formato de retorno do seu chaveamento
- [Tests and Mocks](/trilha-masterclass/modulo-03-turbomodules/tests-mocks) — útil se você
  quiser testar o lado RN sem rodar o módulo nativo de verdade toda vez

## Confira sua solução

A branch de referência `lab-03-solution` no repositório de origem inclui uma
implementação resolvida dos três formatos — útil para comparar o tratamento de casos de
borda, especialmente para o pareamento suíço da rodada 1, que tem mais de uma abordagem
defensável.

## Próximo lab

Continue para o
[Lab 04 — UI Thread vs JS Thread](/rn-advanced-lab/ui-thread-vs-js-thread), onde você vai
construir uma tela de Lançamento de Placar reaproveitando a tela de detalhe do Lab 02 e
diagnosticar um problema real de performance na thread JS.
