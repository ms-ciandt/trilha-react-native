---
title: Push and Local Notifications
---

# Push e Notificações Locais

As notificações iOS vivem sob o framework `UserNotifications` (`UNUserNotificationCenter`), que gerencia tanto notificações push remotas entregues via APNs quanto notificações locais agendadas no dispositivo. `expo-notifications` encapsula toda a superfície do `UNUserNotificationCenter` — solicitação de permissão, apresentação em primeiro plano, categorias, agendamento local e obtenção do device token — por meio de uma API JavaScript unificada.

```bash
npx expo install expo-notifications expo-device
```

---

## Modelo de permissão: UNUserNotificationCenter.requestAuthorization

Notificações push e locais compartilham um único prompt de permissão no iOS, acionado por `UNUserNotificationCenter.requestAuthorization(options:completionHandler:)`. A permissão deve ser solicitada antes de agendar ou receber qualquer notificação.

```typescript
import * as Notifications from 'expo-notifications';

async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();

  if (existing === 'granted') return true;

  // Analogous to UNUserNotificationCenter.requestAuthorization(options: [.alert, .sound, .badge])
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowAnnouncements: true,
    },
  });

  return status === 'granted';
}
```

No iOS, esse diálogo aparece uma única vez por instalação. Se o usuário negar, chamadas subsequentes a `requestPermissionsAsync` retornam `denied` imediatamente — você precisa guiá-lo manualmente até as Configurações.

---

## Apresentação de notificações em primeiro plano

Por padrão, o iOS suprime notificações quando o app está em primeiro plano — mesmo comportamento do nativo. `setNotificationHandler` mapeia para `UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:withCompletionHandler:)`:

```typescript
// Chame isso uma vez na inicialização do app, antes de qualquer notificação poder chegar
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,   // estilo banner iOS 14+
    shouldShowList: true,     // aparece na Central de Notificações
  }),
});
```

---

## Notificações push via APNs

### Entitlements e modos de segundo plano

A entrega via APNs requer o entitlement de push notification e, para pushes silenciosos/em segundo plano, o background mode `remote-notification` — equivalente a habilitar **Background Modes > Remote notifications** no Xcode.

No `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.example.myapp",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

### Registrando e obtendo o device token

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

async function registerForPushNotifications(): Promise<string | null> {
  // Notificações push requerem dispositivo físico — simuladores não registram no APNs
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  // Analogous to UIApplication.shared.registerForRemoteNotifications()
  // Retorna um token Expo que é roteado pela infraestrutura do Expo até o APNs
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data; // "ExponentPushToken[xxxxxx]"
}
```

### Token APNs vs token push do Expo

`getExpoPushTokenAsync` retorna um token push do Expo (`ExponentPushToken[...]`) — um wrapper que roteia pelo serviço de push do Expo antes de chegar ao APNs. Se o seu backend enviar diretamente ao APNs, use o token bruto do dispositivo:

```typescript
// Analogous to application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
const deviceToken = await Notifications.getDevicePushTokenAsync();
console.log(deviceToken.data); // string hex — os bytes brutos do token APNs
```

| | Token push do Expo | Token APNs do dispositivo |
|---|---|---|
| Formato | `ExponentPushToken[...]` | string hex |
| Roteia por | Serviço de push do Expo | Seu backend → APNs diretamente |
| Use quando | Usando a API de push do Expo | Entrega direta via APNs |

---

## Notificações locais

Notificações locais são agendadas inteiramente no dispositivo — sem servidor, sem APNs. Elas mapeiam para `UNNotificationRequest` com um `UNNotificationTrigger`. É a mesma API que seu código SwiftUI ou UIKit usa para agendar lembretes, alarmes ou alertas de geofence.

### Trigger por intervalo de tempo

```typescript
// Analogous to UNTimeIntervalNotificationTrigger(timeInterval: 60, repeats: false)
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Tempo esgotado!',
    body: 'Seu timer de 1 minuto terminou.',
    sound: true,
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 60,
    repeats: false,
  },
});
```

### Trigger por calendário

```typescript
// Analogous to UNCalendarNotificationTrigger com DateComponents
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Bom dia',
    body: 'Hora da sua revisão diária.',
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    hour: 9,
    minute: 0,
    repeats: true, // dispara todo dia às 09:00
  },
});
```

### Cancelando notificações agendadas

```typescript
// Cancela uma notificação específica pelo identificador
await Notifications.cancelScheduledNotificationAsync(notificationId);

// Cancela todas as pendentes — analogous to UNUserNotificationCenter.removeAllPendingNotificationRequests()
await Notifications.cancelAllScheduledNotificationsAsync();

// Lista todas as pendentes — analogous to UNUserNotificationCenter.getPendingNotificationRequests()
const pending = await Notifications.getAllScheduledNotificationsAsync();
```

---

## Categorias de notificação (UNNotificationCategory)

Categorias de notificação adicionam botões de ação tanto em notificações push quanto locais. Elas mapeiam para `UNNotificationCategory` + `UNNotificationAction`, e devem ser registradas antes da notificação ser entregue:

```typescript
await Notifications.setNotificationCategoryAsync('message', [
  {
    identifier: 'reply',
    buttonTitle: 'Responder',
    options: {
      isDestructive: false,
      isAuthenticationRequired: false,
      opensAppToForeground: false,
    },
    textInput: {
      submitButtonTitle: 'Enviar',
      placeholder: 'Digite uma resposta...',
    },
  },
  {
    identifier: 'dismiss',
    buttonTitle: 'Dispensar',
    options: {
      isDestructive: true,
      isAuthenticationRequired: false,
      opensAppToForeground: false,
    },
  },
]);
```

Anexe a categoria a uma notificação via `content.categoryIdentifier`:

```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Nova mensagem de Ana',
    body: 'Você está livre hoje à noite?',
    categoryIdentifier: 'message',
  },
  trigger: { seconds: 1, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
});
```

---

## Tratando notificações recebidas e respostas do usuário

```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Subscription } from 'expo-modules-core';

function useNotificationHandlers() {
  const foregroundListener = useRef<Subscription>();
  const responseListener = useRef<Subscription>();

  useEffect(() => {
    // Dispara quando uma notificação é recebida com o app em primeiro plano
    // Analogous to UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:)
    foregroundListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Recebida:', notification.request.content.title);
      }
    );

    // Dispara quando o usuário toca na notificação ou em um dos botões de ação
    // Analogous to UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { actionIdentifier, notification } = response;

        if (actionIdentifier === 'reply') {
          const text = response.userText; // da ação textInput
          console.log('Usuário respondeu:', text);
        } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          // Usuário tocou no corpo da notificação
          console.log('Notificação tocada:', notification.request.content.data);
        }
      }
    );

    return () => {
      foregroundListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
```

### Tratando cold-start via toque em notificação

Quando o usuário toca em uma notificação com o app fechado, o app é lançado diretamente naquele contexto. Leia a resposta inicial na inicialização:

```typescript
// No componente raiz ou no inicializador do app
const lastResponse = await Notifications.getLastNotificationResponseAsync();

if (lastResponse) {
  const { data } = lastResponse.notification.request.content;
  // Navegue para a tela relevante usando data
}
```

Isso é equivalente a ler `launchOptions[UIApplication.LaunchOptionsKey.remoteNotification]` em `AppDelegate.application(_:didFinishLaunchingWithOptions:)`.

---

## Gerenciamento de badge

```typescript
// Define o número no ícone do app — analogous to UIApplication.shared.applicationIconBadgeNumber
await Notifications.setBadgeCountAsync(5);

// Lê o badge atual
const count = await Notifications.getBadgeCountAsync();

// Limpa o badge
await Notifications.setBadgeCountAsync(0);
```

---

## Resumo

| API UNUserNotificationCenter | Equivalente em expo-notifications |
|---|---|
| `requestAuthorization(options:)` | `requestPermissionsAsync()` |
| `UNUserNotificationCenterDelegate.willPresent` | `setNotificationHandler` |
| `UIApplication.registerForRemoteNotifications()` | `getExpoPushTokenAsync()` |
| `didRegisterForRemoteNotificationsWithDeviceToken` | `getDevicePushTokenAsync()` |
| `UNTimeIntervalNotificationTrigger` | trigger `TIME_INTERVAL` |
| `UNCalendarNotificationTrigger` | trigger `CALENDAR` |
| `UNNotificationCategory` + `UNNotificationAction` | `setNotificationCategoryAsync` |
| `UNUserNotificationCenterDelegate.didReceive` | `addNotificationResponseReceivedListener` |
| `getPendingNotificationRequests` | `getAllScheduledNotificationsAsync` |
| `removeAllPendingNotificationRequests` | `cancelAllScheduledNotificationsAsync` |
| `applicationIconBadgeNumber` | `setBadgeCountAsync` |
| `launchOptions[.remoteNotification]` | `getLastNotificationResponseAsync` |
