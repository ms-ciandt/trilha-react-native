---
title: Brownfield Bootstrap
---

# Lab 01 — Brownfield Bootstrap

**Pré-requisito:** nenhum — este é o primeiro lab.
**Opcional:** não.
**Template:** [`ciandt-championships-android-template`](https://github.com/gbonin-ciandt/ciandt-championships-android-template) (template iOS chega em breve).

## Contexto

O app CI&T Championships (veja a [visão geral dos Labs](/lab)) já existe como um app
Android nativo. Ele tem uma tela funcionando: uma lista de torneios internos (futebol de
salão, sinuca, Mortal Kombat, FIFA), cada um renderizado como um card pelo
`TournamentListScreen.kt`. Duas outras telas nativas já existem também — **Histórico** e
**Ranking Global** — acessíveis por botões de texto na lista de torneios, conectadas por
um grafo do Jetpack Navigation Compose em `MainActivity.kt`.

Essa é a premissa brownfield de toda a trilha de labs: o app nativo já está em produção,
e o React Native vai sendo adicionado feature por feature, tela por tela — não o
contrário. O Lab 01 é onde essa adição acontece pela primeira vez.

Agora mesmo, tocar em um card de torneio não faz nada. Sua tarefa é fazer isso abrir uma
tela React Native.

## Objetivo

Embutir o React Native no projeto Android nativo existente, e fazer com que tocar em um
card de torneio na lista nativa abra uma nova tela React Native que:

1. recebe os dados do torneio tocado,
2. se identifica visualmente como uma tela React Native,
3. consegue navegar de volta para a lista nativa sem deixar o app em um estado quebrado.

Este lab é sobre provar que a "encanação" funciona de ponta a ponta — **não** é sobre
construir a UI real do Tournament Detail (isso é o Lab 02). Uma tela que apenas imprime o
nome do torneio é um Lab 01 completo e correto.

## Critérios de conclusão

- [ ] O React Native está embutido no projeto Android existente (não é um
      `npx react-native init` novo do lado do projeto original — o `TournamentListScreen`,
      `HistoryScreen` e `RankingScreen` nativos precisam continuar funcionando exatamente
      como antes)
- [ ] O app continua rodando na **New Architecture** (Fabric + JSI + Hermes) — sem bridge
      legada, sem `requireNativeComponent`, sem `NativeModules` para nada que você
      adicionar aqui
- [ ] Tocar em um `TournamentCard` na lista nativa abre uma tela React Native
- [ ] Essa tela RN recebe o `Tournament` tocado (no mínimo `id` e `name`) via **initial
      props**, não via chamada de rede ou valor fixo no código
- [ ] A tela RN renderiza um banner no topo, no mesmo espírito do `OriginBadge` nativo —
      mesma cor roxa (`#4C1D95`), mesmo estilo em caixa alta, label
      `"REACT NATIVE SCREEN"` — para que durante o debug fique óbvio em qual tela você
      está
- [ ] A tela RN exibe o nome do torneio recebido, provando que o dado realmente chegou
      (não apenas que a tela abriu)
- [ ] Existe um caminho de volta para a lista de torneios nativa (gesto/botão voltar do
      Android, e idealmente uma ação explícita de fechar) que não trava, não duplica a
      tela nativa, e não deixa uma superfície em branco/congelada para trás
- [ ] Ao dar cold start no app, a lista de torneios nativa ainda aparece primeiro — o RN
      só é carregado quando um card é tocado, não de forma antecipada no launch do app (um
      `ReactHost` preguiçoso é esperado e correto)

## Como abordar

Trabalhe mais ou menos nesta ordem:

1. **Adicione a camada de dependências do RN** ao projeto Gradle existente — `package.json`,
   config do Metro, o plugin Gradle do RN, e a conexão Kotlin de
   `ReactHost`/`ReactActivityDelegate` para a New Architecture. Não mexa em
   `TournamentListViewModel`, `TournamentRepository`, nem nos internos das telas Compose
   existentes — este lab é puramente aditivo.
2. **Registre uma superfície RN** (uma única chamada `AppRegistry.registerComponent` já
   basta) para a tela placeholder de detalhe.
3. **Decida como o toque vira a abertura da tela RN.** A opção mais simples e correta: uma
   `Activity` dedicada (ou Fragment, se preferir empilhar no `NavHost` existente) que
   hospeda uma `ReactRootView`/`ReactFragment` e recebe o torneio como extra de `Bundle`,
   que vira o `initialProperties` da superfície RN.
4. **Renderize o banner roxo + nome do torneio** na tela RN — `View`/`Text` simples, ainda
   não precisa de biblioteca de componentes.
5. **Conecte o caminho de volta** — seja o botão voltar da plataforma fechando a
   Activity/Fragment naturalmente, seja um botão explícito "Voltar para a lista nativa"
   chamando um pequeno módulo nativo/evento que finaliza a superfície RN.

## Armadilhas comuns

:::warning Não inicie o runtime JS de forma antecipada
Se você inicializar o `ReactHost` no `Application.onCreate()` e nunca desligá-lo, você vai
pagar o custo de inicialização do RN em todo launch do app, mesmo quando o usuário nunca
toca em um card. Prefira criá-lo de forma preguiçosa, no primeiro toque, a menos que você
tenha um motivo específico para aquecê-lo antes.
:::

:::note Passando o formato errado de dado
Passar apenas o `id` do torneio e reconstruir o resto dentro do RN a partir de uma lista
duplicada em memória funciona, mas perde o ponto deste lab — o critério é especificamente
que o **dado já carregado no nativo** atravesse a bridge como initial props. Passe o
`Tournament` inteiro (ou pelo menos `id`, `name`, `modality`, `format`, `status`).
:::

:::warning Pop duplo na navegação de volta
Um bug comum: implementar tanto "o botão voltar do hardware finaliza a Activity" QUANTO
um botão de voltar customizado que também chama `finish()`, resultando em navegar de
volta duas vezes (pulando a lista de torneios) quando o usuário toca no botão do RN.
Escolha um mecanismo, ou garanta que os dois passem pelo mesmo caminho de código.
:::

## Aprofunde-se

Este lab é uma aplicação direta e prática do módulo de brownfield da Masterclass. Se
algo acima ficou pouco claro, essas seções cobrem exatamente a mecânica:

- [Setup and Embedding](/trilha-masterclass/modulo-01-brownfield/setup-and-embedding) —
  setup Android para a New Architecture (`ReactHost`), e as três formas de hospedar RN
  dentro de uma tela nativa (tela cheia, parcial, ou dentro de uma lista nativa)
- [Surfaces and Lifecycle](/trilha-masterclass/modulo-01-brownfield/surfaces-and-lifecycle) —
  ciclo de vida do `ReactHost`, estratégia de warm-start, múltiplas superfícies no mesmo
  app
- [Communication and Navigation](/trilha-masterclass/modulo-01-brownfield/communication-and-navigation) —
  o Canal 1 (initial props) é exatamente o que este lab exercita; dê uma olhada no
  Canal 5 (chamando métodos do RN a partir do nativo) se quiser que a tela RN exponha uma
  ação explícita de fechar

Se você ainda não passou pela Masterclass, vale a pena fazer pelo menos o módulo de
Brownfield antes deste lab — veja a [nota de pré-requisitos na página de Labs](/lab).

## Confira sua solução

O repositório original do template mantém uma branch `lab-01-solution` como gabarito de
referência. Ela não é copiada para a sua própria cópia via "Use this template" — confira
no repositório de origem se quiser comparar sua abordagem depois de terminar.

## Próximo lab

Depois que sua tela RN fizer o round-trip corretamente, siga para o
[Lab 02 — Brownfield Navigation](/rn-advanced-lab/brownfield-navigation), onde esse
placeholder vira a tela real de Tournament Detail e passa a conversar com as telas
nativas de Histórico e Ranking.
