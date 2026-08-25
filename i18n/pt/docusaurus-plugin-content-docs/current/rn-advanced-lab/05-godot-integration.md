---
title: Godot Integration
---

# Lab 05 — Godot Integration (opcional)

**Pré-requisito:** [Lab 04 — UI Thread vs JS Thread](/rn-advanced-lab/ui-thread-vs-js-thread).
**Opcional:** sim — a trilha principal (01–04) está completa sem este lab.

## Contexto

Até o Lab 04, o app consegue criar torneios, jogar partidas e acompanhar classificação e
ranking de ponta a ponta, tudo através de telas nativas e React Native conversando entre
si. Este lab adiciona algo diferente: um mini-jogo de celebração, construído em
**Godot**, que é lançado quando a partida final de um torneio é decidida.

Godot não é React Native e não faz parte do kit de ferramentas usual do Android SDK —
embuti-lo significa tratá-lo da mesma forma que você trataria qualquer superfície nativa
de terceiros: algo que o app hospeda, para o qual entrega dados, e do qual recebe um
resultado de volta, usando os mesmos instintos de comunicação brownfield dos Labs 01–02,
só que com um runtime nativo diferente do outro lado da bridge, em vez de Kotlin puro.

Este lab é opcional especificamente porque introduz um toolchain novo (Godot,
GDScript ou seus bindings em C#, o template de exportação Android do Godot) em cima de
tudo o mais — faça se você quiser a profundidade extra, pule se interop RN ↔ nativo é o
que você veio buscar aqui.

## Objetivo

Quando a partida final de um torneio é enviada (a partir da tela de Lançamento de Placar
do Lab 04), lançar uma view Godot embutida mostrando um mini-jogo curto de celebração de
vitória, deixar o usuário interagir com ele, e devolver um resultado ao app quando
terminar.

## Critérios de conclusão

- [ ] Um projeto Godot (mesmo que mínimo — uma cena de pódio, confete, uma interação de
      "toque para continuar") está embutido no app Android como uma view/superfície
      nativa
- [ ] Enviar a partida final de um torneio (eliminação simples ou suíço) na tela de
      Lançamento de Placar do Lab 04 dispara essa view Godot para abrir, passando pelo
      menos o nome do vencedor para o Godot
- [ ] O nome do vencedor (ou outro dado da partida) é visivelmente usado dentro da cena
      Godot — não fixo no código — provando que o dado realmente atravessou para o
      runtime Godot
- [ ] O usuário consegue interagir com o mini-jogo (um toque, um botão, um gatilho de
      animação simples) em vez de só assistir a uma tela estática
- [ ] Quando o mini-jogo termina (o usuário dispensa, ou ele termina sozinho), o
      controle volta para o app RN/nativo em um estado limpo — sem processo Godot órfão,
      sem impossibilidade de navegar depois
- [ ] Pelo menos uma informação flui de volta do Godot para o app (ex.: "usuário
      terminou de assistir," ou um placar/resultado de interação do mini-jogo),
      demonstrando comunicação em mão dupla, não só um lançamento em uma direção só

## Como abordar

1. Coloque uma exportação Android Godot pura rodando de forma independente primeiro,
   fora do app, para confirmar que seu toolchain (versão do Godot, template de exportação
   Android, requisitos de NDK) funciona antes de integrar qualquer coisa.
2. Embuta a biblioteca Android exportada do Godot no projeto nativo existente da mesma
   forma que você embutiria qualquer biblioteca Android nativa — como uma
   view/Activity/Fragment que o app hospeda.
3. Decida o contrato de dados para "app → Godot": a opção mais simples é passar o nome
   do vencedor como argumento de lançamento/extra de Bundle, parecido com como o Lab 01
   passou dados de torneio para o RN.
4. Decida o contrato de dados para "Godot → app" no caminho de volta — o mecanismo de
   plugin/singleton Android do Godot consegue chamar de volta código JVM, que então pode
   avisar o RN da mesma forma que a ponte de navegação do Lab 02 fez.
5. Mantenha o mini-jogo em si intencionalmente pequeno — um pódio, um label com o nome,
   um elemento interativo. A interoperabilidade é o ponto deste lab, não o design do
   jogo.

## Armadilhas comuns

:::warning Tratar o Godot como "só mais um WebView"
A integração Android do Godot tem seu próprio ciclo de vida e modelo de threads — não é
um `WebView` plug-and-play. Reserve tempo de verdade para acertar o template de
exportação e a integração antes de se preocupar com o conteúdo da celebração em si.
:::

:::note Reaproveite o que você já sabe sobre comunicação entre runtimes
O formato deste problema (nativo passa dado via bundle/props, recebe resultado de volta
via callback/módulo nativo) é o mesmo formato dos Labs 01 e 02 — se você se pegar
inventando um padrão de comunicação totalmente novo, vale a pena primeiro checar se a
abordagem de comunicação brownfield que você já usou em outro lugar deste app também se
aplica aqui.
:::

## Aprofunde-se

Não existe um módulo dedicado a Godot na trilha Masterclass — este lab intencionalmente
vai além do conteúdo principal de RN do curso. O paralelo conceitual mais próximo é:

- [Setup and Embedding](/trilha-masterclass/modulo-01-brownfield/setup-and-embedding) —
  o padrão geral de embutir um runtime estrangeiro dentro de um app Android nativo, que
  é exatamente o que você está fazendo aqui com Godot em vez de RN
- [Communication and Navigation](/trilha-masterclass/modulo-01-brownfield/communication-and-navigation) —
  o modelo de fluxo de dados em mão dupla para adaptar para a perna Godot ↔ nativo deste
  lab

Para as partes específicas do Godot (templates de exportação, APIs de plugin
GDScript/Android), a documentação oficial do Godot é a referência certa — este curso não
a duplica.

## Confira sua solução

Existe uma branch de referência `lab-05-solution` no repositório de origem para
comparação, embora, dada a natureza aberta deste lab, exista mais de uma forma válida de
estruturar a integração com o Godot — trate como um exemplo, não a única resposta
correta.

## Encerrando

Este é o último lab da trilha. Se você completou os Labs 01–04 (Lab 05 opcional), você
tem experiência prática com todo padrão brownfield essencial que este curso cobre:
embutir RN em um app nativo já existente, navegação bidirecional nativo ↔ RN, construir
um TurboModule de verdade, e diagnosticar um problema de performance na thread JS com
evidência em vez de chute. Volte para a [visão geral dos Labs](/lab) para revisar seu
progresso.
