---
title: "Push Notifications"
sidebar_label: "Notifications"
sidebar_position: 5
---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_android/rec_05_notifications.mp4" type="video/mp4">
  Seu navegador não suporta o elemento de vídeo.
</video>

## A Mesma Stack — Ponto de Entrada Diferente

Push notifications no Android usam a mesma infraestrutura que você já conhece: o FCM (Firebase Cloud Messaging) entrega a mensagem, o Android exibe a notificação e o app trata o toque. No React Native você configura o mesmo `google-services.json`, os mesmos canais de notificação, o mesmo token FCM — apenas por meio de APIs JavaScript em vez de Kotlin.

| Android / Kotlin | React Native (Expo) |
|-----------------|---------------------|
| `FirebaseMessaging.getInstance().token` | `Notifications.getExpoPushTokenAsync()` ou `getDevicePushTokenAsync()` |
| `NotificationCompat.Builder` | Gerenciado pelo `expo-notifications` |
| `NotificationChannel` | `Notifications.setNotificationChannelAsync()` |
| `NotificationManager.notify()` | `Notifications.scheduleNotificationAsync()` |
| `FirebaseMessagingService.onMessageReceived()` | `Notifications.addNotificationReceivedListener()` |
| `onNotificationOpenedApp()` | `Notifications.addNotificationResponseReceivedListener()` |
| Extras de `Intent` ao toque | `notification.request.content.data` |

---

## expo-notifications — Configuração

```bash
npx expo install expo-notifications expo-device
```

No `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6750A4",
          "sounds": ["./assets/notification.wav"],
          "androidMode": "default",
          "androidCollapsedTitle": "#{unread_notifications} new messages"
        }
      ]
    ]
  }
}
```

---

## Canais de Notificação — Obrigatórios no Android 8+

Os canais de notificação são obrigatórios a partir do Android 8.0. Crie-os antes de enviar qualquer notificação:

```tsx
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  // Canal padrão
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6750A4',
    sound: 'default',
  });

  // Alta prioridade — equivalente a IMPORTANCE_HIGH (notificações heads-up)
  await Notifications.setNotificationChannelAsync('urgent', {
    name: 'Urgent Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500],
    lightColor: '#FF0000',
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });

  // Canal silencioso — equivalente a IMPORTANCE_MIN
  await Notifications.setNotificationChannelAsync('silent', {
    name: 'Background Updates',
    importance: Notifications.AndroidImportance.MIN,
    vibrationPattern: [],
    sound: undefined,
  });
}
```

---

## Solicitando Permissão e Obtendo o Token FCM

```tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications não funcionam em emuladores (sem Google Play Services na maioria)
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Solicitar permissão — Android 13+ exige isso
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  // Configurar canais antes de obter o token
  await setupNotificationChannels();

  // Obter o Expo push token (encapsula o token FCM para uso com o Expo Push Service)
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id', // de app.json expo.extra.eas.projectId
  });

  // Ou obter o token FCM bruto diretamente
  const fcmToken = await Notifications.getDevicePushTokenAsync();

  // Enviar o token para o seu backend
  await api.post('/devices', { token: token.data, platform: 'android' });

  return token.data;
}
```

---

## Tratando Notificações Recebidas

```tsx
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

// Configurar como as notificações aparecem com o app em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // exibe o banner mesmo com o app aberto
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function useNotifications() {
  const navigation = useNavigation();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Notificação recebida em foreground
    // Equivalente a FirebaseMessagingService.onMessageReceived() com o app em foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        const { title, body, data } = notification.request.content;
        console.log('Notification received:', title, body, data);
      }
    );

    // Usuário tocou na notificação — app estava em background ou encerrado
    // Equivalente a getInitialNotification() + onNotificationOpenedApp()
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data;

        // Navegar com base nos dados da notificação — como tratar extras de Intent
        if (data.screen === 'chat') {
          navigation.navigate('Chat', { chatId: data.chatId });
        } else if (data.screen === 'order') {
          navigation.navigate('OrderDetail', { orderId: data.orderId });
        }
      }
    );

    // Tratar a notificação que abriu o app a partir do estado encerrado
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const data = response.notification.request.content.data;
      // Tratar notificação inicial
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
```

---

## Notificações Locais — Equivalente a NotificationManager.notify()

Agende notificações sem precisar de um servidor:

```tsx
import * as Notifications from 'expo-notifications';

// Notificação local imediata
async function showLocalNotification(title: string, body: string, data?: object) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: 'default',
      badge: 1,
      // Específico do Android
      androidChannelId: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      sticky: false,
    },
    trigger: null, // null = exibir imediatamente
  });
}

// Notificação agendada — como AlarmManager
async function scheduleReminder(title: string, date: Date) {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: "Don't forget!",
      androidChannelId: 'default',
    },
    trigger: {
      date, // data/hora exata
    },
  });
  return id; // salvar para cancelar depois
}

// Notificação recorrente — como AlarmManager.setRepeating()
async function scheduleDailyReminder(hour: number, minute: number) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Check-in',
      body: 'Time for your daily update!',
      androidChannelId: 'default',
    },
    trigger: {
      hour,
      minute,
      repeats: true, // dispara todos os dias neste horário
    },
  });
}

// Cancelar uma notificação agendada
async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// Cancelar todas
async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
```

---

## Notificações Ricas — BigTextStyle / BigPictureStyle

```tsx
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'New Order #1234',
    body: 'Your order has been confirmed.',
    data: { orderId: '1234' },
    androidChannelId: 'default',

    // Ícone grande (exibido no painel de notificações)
    // Equivalente a NotificationCompat.Builder.setLargeIcon()
    // Passe uma URI local ou URL remota
    // attachments: [{ uri: 'https://example.com/product.jpg' }],  // iOS
    // No Android use um payload de dados com a URL da imagem e trate em uma tarefa em background

    // Notificação expansível no Android
    // expo-notifications trata o BigTextStyle automaticamente para textos longos
  },
  trigger: null,
});
```

---

## Mensagens FCM Data-Only — Tratamento em Background

Para mensagens de dados silenciosas (sincronização em background, como payload FCM sem a chave notification):

```tsx
// expo-task-manager trata mensagens FCM de dados em background
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  ({ data, error, executionInfo }) => {
    if (error) return;
    const notification = data.notification as Notifications.Notification;
    const payload = notification.request.content.data;

    // Tratar dados em background — sincronizar banco local, atualizar cache
    console.log('Background notification data:', payload);
  }
);

// Registrar a tarefa
Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
```

---

## Contagem de Badge

```tsx
// Definir número do badge no ícone do app
await Notifications.setBadgeCountAsync(5);

// Limpar badge
await Notifications.setBadgeCountAsync(0);

// Ler o badge atual
const count = await Notifications.getBadgeCountAsync();
```

---

## Badge de Notificação no AndroidManifest.xml

No fluxo gerenciado do Expo, o manifesto é tratado automaticamente. Para o bare workflow, verifique se estas permissões estão configuradas:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />

<application ...>
  <!-- FCM service — adicionado automaticamente pelo expo-notifications -->
  <service
    android:name=".ExpoFCMMessagingService"
    android:exported="false">
    <intent-filter>
      <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
  </service>
</application>
```

---

## Materiais de Estudo

### Documentacao Oficial

- [expo-notifications — Documentacao](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo — Visao Geral de Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo — Configuracao FCM (Android)](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Android — Visao Geral de Notificacoes](https://developer.android.com/develop/ui/views/notifications)
- [Android — Canais de Notificacao](https://developer.android.com/develop/ui/views/notifications/channels)
- [Firebase — Configuracao FCM no Android](https://firebase.google.com/docs/cloud-messaging/android/client)

### Videos

- [Simon Grimm — Expo Push Notifications Full Guide](https://www.youtube.com/watch?v=25M_mBFOh3M)
- [notifee — Advanced Android Notifications](https://www.youtube.com/watch?v=TRMiKLBSTOA)

### Pacotes

- [expo-notifications](https://github.com/expo/expo/tree/main/packages/expo-notifications)
- [notifee](https://notifee.app/) — notificacoes avancadas (layouts customizados, acoes, grupos)

---

## Resumo do Modulo

Voce concluiu o modulo de Recursos Nativos. Veja o mapa completo:

| Topico | O que foi abordado |
|-------|-----------------|
| Permissoes | `PermissionsAndroid`, fluxo de rationale, `react-native-permissions` |
| Camera | `expo-camera`, Vision Camera, frame processors, gravacao de video |
| Armazenamento | `expo-file-system`, `expo-sqlite`, `expo-document-picker`, `expo-secure-store` |
| Sensores | Acelerometro, giroscopio, `expo-location`, haptics, keep-awake |
| Notificacoes | Token FCM, canais de notificacao, notificacoes locais, tarefas em background |

O proximo modulo aborda performance — profiling de renders, otimizacao de FlatList, Reanimated e ajustes especificos do Hermes.
