---
title: "Atualizações OTA com EAS Update"
sidebar_label: "Atualizações OTA"
sidebar_position: 5
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## O que são Atualizações OTA

Atualizações Over-the-Air (OTA) enviam um novo bundle JavaScript para os dispositivos dos usuários sem passar pelo processo de revisão do Play Store. A camada nativa (Kotlin, Gradle, permissões) permanece a mesma — apenas o JS muda.

| Tipo de mudança | Requer Play Store | OTA possível |
|----------------|-------------------|--------------|
| Lógica JS/TypeScript | Não | Sim |
| Mudanças de UI em componentes | Não | Sim |
| Nova tela (só JS) | Não | Sim |
| Novo TurboModule (Kotlin) | Sim | Não |
| Nova permissão no Manifest | Sim | Não |
| Upgrade de versão do RN | Sim | Não |

---

## Configuração do EAS Update

```bash
npm install expo-updates
eas update:configure
```

---

## Publicando uma Atualização

```bash
# Publicar para o canal "production"
eas update --branch production --message "Corrige crash no checkout"

# Publicar para canal preview para testes
eas update --branch preview --message "Nova UI do carrinho"
```

---

## Estratégia de Atualização no Código

```tsx
import * as Updates from 'expo-updates';

function useOTAUpdates() {
  useEffect(() => {
    async function checkForUpdate() {
      if (__DEV__) return;

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Atualização Disponível',
            'Uma nova versão está pronta. Reiniciar para aplicar?',
            [
              { text: 'Agora Não', style: 'cancel' },
              { text: 'Reiniciar', onPress: () => Updates.reloadAsync() },
            ]
          );
        }
      } catch (e) {
        console.warn('Verificação OTA falhou:', e);
      }
    }

    checkForUpdate();
  }, []);
}
```

---

## Canais e Branches

```json
// eas.json
{
  "build": {
    "production": { "channel": "production" },
    "preview": { "channel": "preview" }
  }
}
```

```bash
eas update --branch production --message "Hotfix: total do carrinho"
eas update --branch preview --message "Novo fluxo de onboarding"
```

---

## Rollback

```bash
eas update:list --branch production
eas update:republish --branch production --update-id <id-da-atualização-anterior>
```

---

## Materiais de Estudo

- [EAS Update — Documentação](https://docs.expo.dev/eas-update/introduction/)
- [expo-updates — API](https://docs.expo.dev/versions/latest/sdk/updates/)

---

## Resumo do Módulo

| Tópico | O que você cobriu |
|--------|------------------|
| Fastlane | Lanes para build, assinar, upload ao Play Store |
| GitHub Actions | Checks de PR, builds de release, secrets |
| EAS Build | Builds em nuvem, perfis, credenciais |
| Assinatura de Código | Keystore, Play App Signing, ProGuard |
| Atualizações OTA | EAS Update, canais, rollback |
