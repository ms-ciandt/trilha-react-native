---
title: Modelo de Entrega Mobile — Lojas, Rollout e Atualizações
---

# Modelo de Entrega Mobile — Lojas, Rollout e Atualizações

> Na web, o deploy é atômico e universal: sobe para o CDN, todo usuário recebe a versão nova no próximo reload. No mobile, o modelo de entrega é fundamentalmente diferente — e isso muda como você pensa sobre releases.

## Web vs Mobile na Entrega

| Web | Mobile |
|---|---|
| Deploy é instantâneo | Revisão pela App Store / Play Store (horas a dias) |
| Uma versão em produção | Múltiplas versões coexistem simultaneamente |
| Usuários sempre na versão mais recente | Usuários decidem quando (ou se) atualizam |
| Rollback revertendo o CDN | Sem rollback — você envia a correção como nova versão |
| Feature flags são opcionais | Feature flags são frequentemente essenciais |

---

## Revisão das Lojas

Entre o "merge no main" e o "usuário recebe a atualização" existe uma revisão das lojas. Apple e Google revisam cada submissão para conformidade de política, privacidade e conteúdo. Para a maioria das atualizações isso leva horas a dois dias — para uma correção crítica de segurança, você não pode publicar um patch imediato como faria na web.

Isso muda a resposta a incidentes: hotfixes precisam ser enfileirados, não deployados instantaneamente. Planeje isso nos seus runbooks.

---

## Rollout Gradual

Ambas as lojas suportam lançar para uma porcentagem de usuários:

- **Google Play** — Staged rollout: lançamento para 1% → 10% → 50% → 100%, monitorando crash rate em cada etapa. Você pode pausar ou interromper antes de atingir todos.
- **App Store** — Phased release: a Apple expande automaticamente ao longo de 7 dias (dias 1-7: 1%, 2%, 5%, 10%, 20%, 50%, 100%). Você pode pausar em qualquer fase.

É o equivalente mobile de um canary deployment. Monitorar crash rate por versão durante o rollout é prática padrão — não opcional.

---

## Fragmentação de Versões

Os usuários decidem quando atualizar. Na prática, várias versões do seu app rodam em produção simultaneamente. A consequência direta para o backend: **a API precisa continuar compatível com clientes antigos**.

Padrões comuns:
- **Versionamento de API** — caminhos `/v1/`, `/v2/` ou headers `Accept-Version`
- **Campos opcionais** — novos campos são aditivos; remover um campo de uma resposta quebra clientes antigos
- **Endpoint de versão mínima suportada** — um `/version-check` que retorna a versão mínima do app; clientes abaixo disso recebem uma tela de "atualize para continuar"
- **Nunca quebrar um contrato de uma vez** — deprecar, adicionar o novo formato ao lado do antigo, depois remover após adoção

---

## Atualização Forçada

Quando uma versão antiga precisa parar de funcionar — problema de segurança, sunset de uma API depreciada — o padrão é:

1. Um endpoint no backend retorna a versão mínima suportada
2. No launch do app, compare a versão rodando com a mínima
3. Se estiver abaixo do mínimo, exiba uma tela de "Atualização obrigatória" que bloqueia o app até o usuário atualizar

```typescript
// No launch do app
const { minVersion } = await fetch('/api/version-check').then(r => r.json());
const appVersion = Application.nativeApplicationVersion; // expo-application

if (semverLessThan(appVersion, minVersion)) {
  // Bloqueia o app e mostra tela de atualização
  navigation.replace('ForceUpdate');
}
```

Esse conceito simplesmente não existe na web — é um padrão exclusivo do mobile.

---

## OTA Updates — O Meio-Termo

**EAS Update** (Expo) e ferramentas similares permitem atualizar o **bundle JS** sem passar pelas lojas — quase um "deploy web" para a camada JS. Útil para correções de bugs que não tocam código nativo.

Limites importantes:
- Não atualiza código nativo (Kotlin/Swift, módulos nativos ou qualquer mudança que exija um novo binário)
- Sujeito às políticas das lojas: as diretrizes da Apple exigem que o conteúdo OTA seja "consistente com o propósito original do app"
- Não substitui uma release completa; pense como uma via rápida para correções JS

---

## Feature Flags e Kill Switches

Como você não pode "tirar do ar" uma versão instalada do app, feature flags são uma ferramenta de primeira classe no mobile:

- **Desativar uma feature com bug remotamente** sem uma nova release
- **Rollout gradual** de features independente da release do app
- **Kill switches** para features que interagem com um backend que você controla

Ferramentas: LaunchDarkly, Statsig, Firebase Remote Config ou um simples endpoint de configuração.

---

## Monitoramento de Crash Rate por Versão

Durante e após o rollout, monitore a crash rate segmentada por versão do app. Um aumento de crashes na nova versão é o sinal para pausar o rollout antes de atingir 100%.

Ferramentas padrão: Firebase Crashlytics, Sentry, Datadog — todas suportam filtro por versão.

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| EAS Update | Oficial | [docs.expo.dev/eas-update/introduction](https://docs.expo.dev/eas-update/introduction/) |
| Staged rollouts no Play Store | Guia | [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer/answer/6346149) |
| Phased release na App Store | Guia | [developer.apple.com/help/app-store-connect](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/) |
| expo-application | Oficial | [docs.expo.dev/versions/latest/sdk/application](https://docs.expo.dev/versions/latest/sdk/application/) |
