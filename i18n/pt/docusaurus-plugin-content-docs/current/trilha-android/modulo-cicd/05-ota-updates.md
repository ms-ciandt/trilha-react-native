---
title: "Atualizações OTA com EAS Update"
sidebar_label: "Atualizações OTA"
sidebar_position: 5
---

## Visão Geral em Vídeo

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/cicd_05_ota-updates.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/cicd_05_ota-updates.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## O que são Atualizações OTA

Atualizações Over-the-Air (OTA) enviam um novo bundle JavaScript para os dispositivos dos usuários sem passar pelo processo de revisão do Play Store. A camada nativa (Kotlin, Gradle, permissões) permanece a mesma — apenas o JS muda.

Essa é uma das vantagens de produção mais poderosas do React Native: uma correção crítica pode chegar a todos os usuários em minutos, em vez de dias.

| Tipo de mudança | Requer Play Store | OTA possível |
|----------------|-------------------|--------------|
| Lógica JS/TypeScript | Não | Sim |
| Mudanças de UI em componentes | Não | Sim |
| Nova tela (só JS) | Não | Sim |
| Novo TurboModule (Kotlin) | Sim | Não |
| Nova permissão no Manifest | Sim | Não |
| Nova dependência nativa | Sim | Não |
| Upgrade de versão do RN | Sim | Não |

---

## Configuração do EAS Update

```bash
npm install expo-updates
eas update:configure
```

No `app.json`:

```json
{
  "expo": {
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    }
  }
}
```

---

## Publicando uma Atualização

```bash
# Publicar para o canal "production"
eas update --branch production --message "Corrige crash no checkout"

# Publicar para canal preview para testes
eas update --branch preview --message "Nova UI do carrinho"
```

Usuários com o app instalado recebem a atualização na próxima abertura (ou verificação em background). A atualização é aplicada no reinício seguinte.

---

## Estratégia de Atualização no Código

```tsx
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert } from 'react-native';

function useOTAUpdates() {
  useEffect(() => {
    async function checkForUpdate() {
      if (__DEV__) return; // ignora em desenvolvimento

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
        // Verificação de atualização falhou — o app continua normalmente
        console.warn('Verificação OTA falhou:', e);
      }
    }

    checkForUpdate();
  }, []);
}
```

---

## Canais e Branches

O EAS Update usa **branches** (para onde você publica) e **channels** (o que os perfis de build assinam):

```json
// eas.json
{
  "build": {
    "production": {
      "channel": "production"
    },
    "preview": {
      "channel": "preview"
    }
  }
}
```

```bash
# Usuários de produção recebem atualizações da branch "production"
eas update --branch production --message "Hotfix: total do carrinho"

# Builds de preview recebem atualizações de "preview"
eas update --branch preview --message "Novo fluxo de onboarding"
```

---

## Rollback

```bash
# Listar atualizações recentes de uma branch
eas update:list --branch production

# Reverter para uma atualização anterior
eas update:republish --branch production --update-id <id-da-atualização-anterior>
```

---

## Materiais de Estudo

- [EAS Update — Documentação](https://docs.expo.dev/eas-update/introduction/)
- [EAS Update — Padrões de deployment](https://docs.expo.dev/eas-update/deployment-patterns/)
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
