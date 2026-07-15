---
title: Roadmap e Caminho de Upgrade Recomendado
---

# Roadmap e Caminho de Upgrade Recomendado

> A meta-pergunta antes de qualquer upgrade: *para onde estamos indo e por que agora?* Upgrades feitos de forma reativa ("a biblioteca que precisamos exige a 0.76") sao mais dificeis do que upgrades feitos proativamente como parte de um roadmap planejado.

---

## A Janela de Suporte

O React Native segue uma janela de suporte progressiva — apenas as **duas versoes minor mais recentes** recebem backports de patches de seguranca e correcoes de bugs criticos. Versoes anteriores sao mantidas pela comunidade (ou nao sao mantidas de forma alguma).

```
Em julho de 2026:
  0.86  ← estavel atual (recebe patches de seguranca)
  0.85  ← estavel anterior (recebe correcoes criticas)
  0.84  ← fora de suporte
  ...
```

Qualquer versao mais antiga que os dois minors mais recentes nao recebe correcoes oficiais. Um bug de seguranca grave encontrado na camada de rede do RN nao sera corrigido na 0.73. Esse deve ser o seu SLA de baseline para o roadmap de upgrades.

**Regra pratica:** fique a no maximo dois minors da versao estavel atual. Se voce estiver tres ou mais versoes atras, comece a planejar um sprint de upgrade imediatamente.

---

## Decidindo Entre Incremental e Comeco do Zero

| Cenario | Recomendacao |
|---|---|
| Ate 2 versoes minor da mais recente | Incremental — aplique diffs minor a minor |
| 3 a 5 versoes minor atrasado | Incremental — planeje 2 a 3 sprints de upgrade |
| 6+ versoes minor atrasado (ex.: ainda na 0.69) | Considere um novo projeto, migre telas progressivamente |
| Bridge legada, sem TurboModules ainda | Incremental + trilha paralela de migracao para Nova Arquitetura |

A opcao de "novo projeto" e valida quando a divida acumulada de config nativa (build.gradle customizado, padroes antigos de Podfile, modulos nao migrados) torna os upgrades incrementais mais lentos do que uma reescrita seria. Conte os arquivos nativos que precisariam ser alterados — se forem mais de 20 arquivos customizados, o calculo muda.

---

## Caminho de Upgrade Recomendado (2025–2026)

### Tier 1: De 0.72 para 0.76 (a migracao para Nova Arquitetura)

Este e o upgrade de maior impacto para a maioria das equipes. O caminho e:

```
0.72 ──► 0.73 ──► 0.74 ──► 0.75 ──► 0.76
```

**0.72 → 0.73:** Hermes se torna o unico motor. JSC removido. Normalmente e o passo de menor atrito.

**0.73 → 0.74:** A Camada de Interop do TurboModule se torna estavel. Suporte ao campo `exports` do Metro ativado por padrao. Aqui e onde voce descobre quais bibliotecas de terceiros tem problemas. Corrija antes de prosseguir.

**0.74 → 0.75:** `minSdkVersion 24`, Xcode 15.1 obrigatorio. Verifique se o agente de CI tem a versao correta do Xcode. O template do AppDelegate do iOS muda para Swift.

**0.75 → 0.76:** Nova Arquitetura ativada por padrao. O passo mais significativo. Reserve um sprint dedicado. Veja o topico de [Breaking Changes](./breaking-changes) para a lista completa.

**Estimativa de tempo:** 1 a 2 dias por minor para um app de medio porte com poucos modulos nativos customizados. Adicione 1 semana para 0.75 → 0.76 se voce tiver codigo nativo significativo.

### Tier 2: De 0.76 para a versao estavel atual (mantendo-se atualizado)

Uma vez na 0.76+, cada minor subsequente tem um atrito significativamente menor porque a Nova Arquitetura e o baseline. A maioria das mudancas e aditiva.

```
0.76 ──► 0.77 ──► 0.78 ──► ... ──► atual
```

**Cadencia alvo:** um minor por ciclo de release (~6 semanas), atualizado no sprint imediatamente apos o release estavel. Isso mantem o diff pequeno e o trabalho rotineiro.

### Tier 3: Alinhamento com o Expo SDK

Se voce usa Expo:

```
SDK 51 (RN 0.74) ──► SDK 52 (RN 0.76) ──► SDK 53 (RN 0.79) ──► SDK 56 (RN atual)
```

O comando `npx expo upgrade` do Expo gerencia o lado JS. O lado nativo requer executar novamente o `prebuild` ou usar o [guia de upgrade bare do Expo](https://docs.expo.dev/bare/upgrade/).

**Nunca pule mais de um Expo SDK de uma vez** — as proprias bibliotecas do Expo (expo-camera, expo-location, etc.) tem dependencias inter-SDK que quebram quando sao puladas.

---

## Matriz de Compatibilidade (Oficial)

Fonte: [reactwg/react-native-releases/blob/main/docs/support.md](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md)

| Versao RN | Node (min) | JDK | Xcode (min) | CocoaPods | Android SDK (min API) |
|---|---|---|---|---|---|
| 0.72 | 16 | 11 | 15.1 | 1.13.x | API 21 (5.0) |
| 0.73 | 18 | 17 | 15.1 | 1.13.x | API 21 (5.0) |
| 0.74 | 18 | 17 | 15.1 | 1.13.x | API 23 (6.0) |
| 0.75 | 18 | 17 | 15.1 | 1.13.x | API 24 (7.0) |
| 0.76 | 18 | 17 | 15.1 | 1.13.x | API 24 (7.0) |
| 0.77 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.78 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.79 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.80 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.81 | 20 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.82 | 20 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.83 | 20 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.84 | 22 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.85 | 22 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.86 | 22 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |

**Transicoes principais a observar:**
- `0.72 → 0.73`: JDK 11 → 17 obrigatorio (impacto relevante no CI)
- `0.74 → 0.75`: `minSdk` 23 → 24 (mudanca no suporte a dispositivos)
- `0.80 → 0.81`: Node 18 → 20 (atualizacao do agente de CI necessaria)
- `0.83 → 0.84`: Node 20 → 22 (atualizacao do agente de CI necessaria)

---

## Template de Roadmap de Upgrade

Use isso como ponto de partida para planejar um sprint de upgrade:

```markdown
## React Native Upgrade: 0.74 → 0.76

### Pre-trabalho (Semana 1)
- [ ] Ler CHANGELOG para 0.75 e 0.76
- [ ] Executar `npx react-native-check-new-archi` — documentar bibliotecas incompativeis
- [ ] Verificar agente de CI: versao do Xcode, versao do JDK, versao do Node
- [ ] Identificar todos os modulos nativos customizados (migracao para TurboModule necessaria para 0.76?)
- [ ] Identificar todos os patches em patches/ — algum precisara ser recriado?

### 0.74 → 0.75 (Semana 2)
- [ ] Aplicar diffs do Upgrade Helper
- [ ] Atualizar Xcode do agente de CI se necessario (15.1+)
- [ ] Build completo nas duas plataformas (limpo)
- [ ] Executar suite de testes
- [ ] Smoke test no dispositivo (Android + iOS)

### 0.75 → 0.76 (Semana 3)
- [ ] Aplicar diffs do Upgrade Helper (AppDelegate, Podfile, mudancas no gradle)
- [ ] Verificar Nova Arquitetura: `newArchEnabled=true`
- [ ] Resolver bibliotecas incompativeis (desativar Nova Arquitetura temporariamente se necessario)
- [ ] Corrigir problemas de StatusBar com edge-to-edge (se targetSdk=35)
- [ ] Recriar patches que tocam arquivos atualizados
- [ ] Build completo nas duas plataformas (limpo)
- [ ] Executar suite de testes
- [ ] Smoke test estendido no dispositivo

### Release (Semana 4)
- [ ] Release beta para testadores internos
- [ ] Monitorar taxa de crashes (Sentry / Firebase)
- [ ] Rollout gradual: 5% → 25% → 100%
```

---

## Mapeamento Expo SDK ↔ Versao do React Native

| Expo SDK | React Native | Recursos Principais |
|---|---|---|
| 51 | 0.74 | Expo Router v3, Expo Camera v14 |
| 52 | 0.76 | Nova Arquitetura por padrao, todos os modulos SDK 52 prontos para Nova Arquitetura |
| 53 | 0.79 | Preparacao para Android 16, expo-updates v2 |
| 54 | 0.81 | — |
| 55 | 0.83 | — |
| 56 | Atual | Veja [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56) |

---

## Materiais de Estudo

| Recurso | Descricao |
|---|---|
| [reactwg/react-native-releases — support.md](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md) | Matriz de compatibilidade oficial — fonte primaria para requisitos de ambiente |
| [React Native Versions](https://reactnative.dev/versions) | Snapshot de docs por versao — util para consultas de API em uma versao especifica |
| [Expo SDK Upgrade Walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) | Passo a passo oficial para Expo managed e bare workflow |
| [Expo Changelog](https://expo.dev/changelog) | Notas de release completas do SDK; cada entrada linka para a versao correspondente do RN |
| [App.js Conf 2024](https://appjs.swmansion.com/editions/2024) | Palestras incluindo estrategias de adocao da Nova Arquitetura e historias de upgrade |
| [App.js Conf 2025](https://appjs.swmansion.com/editions/2025) | Roadmap pos-0.76, plano de descontinuacao da Legacy Architecture |

---

Proximo → [Validacao com Build nas Duas Plataformas](./build-validation)
