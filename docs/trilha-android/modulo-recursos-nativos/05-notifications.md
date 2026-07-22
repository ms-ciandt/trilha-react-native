---
title: "Push Notifications"
sidebar_label: "Notifications"
sidebar_position: 5
---

## Video Overview

> Video for this topic coming soon.

## The Same Stack — Different Entry Point

Push notifications on Android use the same infrastructure you already know: FCM (Firebase Cloud Messaging) delivers the message, Android shows the notification, the app handles the tap. In React Native you configure the same `google-services.json`, the same notification channels, the same FCM token — just through JavaScript APIs instead of Kotlin.

| Android / Kotlin | React Native (Expo) |
|-----------------|---------------------|
| `FirebaseMessaging.getInstance().token` | `Notifications.getExpoPushTokenAsync()` or `getDevicePushTokenAsync()` |
| `NotificationCompat.Builder` | Handled by `expo-notifications` |
| `NotificationChannel` | `Notifications.setNotificationChannelAsync()` |
| `NotificationManager.notify()` | `Notifications.scheduleNotificationAsync()` |
| `FirebaseMessagingService.onMessageReceived()` | `Notifications.addNotificationReceivedListener()` |
| `onNotificationOpenedApp()` | `Notifications.addNotificationResponseReceivedListener()` |
| `Intent` extras on tap | `notification.request.content.data` |

---

## expo-notifications — Setup

```bash
npx expo install expo-notifications expo-device
```

In `app.json`:

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

## Notification Channels — Android 8+ Required

Notification channels are mandatory on Android 8.0+. Create them before sending any notification:

```tsx
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  // Default channel
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6750A4',
    sound: 'default',
  });

  // High priority — like IMPORTANCE_HIGH (heads-up notifications)
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

  // Silent channel — like IMPORTANCE_MIN
  await Notifications.setNotificationChannelAsync('silent', {
    name: 'Background Updates',
    importance: Notifications.AndroidImportance.MIN,
    vibrationPattern: [],
    sound: undefined,
  });
}
```

---

## Requesting Permission and Getting the FCM Token

```tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications don't work on emulators (no Google Play Services in most)
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Request permission — Android 13+ requires this
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

  // Setup channels before getting token
  await setupNotificationChannels();

  // Get Expo push token (wraps FCM token for use with Expo Push Service)
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id', // from app.json expo.extra.eas.projectId
  });

  // Or get the raw FCM token directly
  const fcmToken = await Notifications.getDevicePushTokenAsync();

  // Send token to your backend
  await api.post('/devices', { token: token.data, platform: 'android' });

  return token.data;
}
```

---

## Handling Incoming Notifications

```tsx
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // show banner even when app is open
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function useNotifications() {
  const navigation = useNavigation();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Foreground notification received
    // Equivalent of FirebaseMessagingService.onMessageReceived() when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        const { title, body, data } = notification.request.content;
        console.log('Notification received:', title, body, data);
      }
    );

    // User tapped the notification — app was in background or killed
    // Equivalent of getInitialNotification() + onNotificationOpenedApp()
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data;

        // Navigate based on notification data — like handling Intent extras
        if (data.screen === 'chat') {
          navigation.navigate('Chat', { chatId: data.chatId });
        } else if (data.screen === 'order') {
          navigation.navigate('OrderDetail', { orderId: data.orderId });
        }
      }
    );

    // Handle notification that launched the app from killed state
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const data = response.notification.request.content.data;
      // Handle initial notification
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
```

---

## Local Notifications — NotificationManager.notify() Equivalent

Schedule notifications without a server:

```tsx
import * as Notifications from 'expo-notifications';

// Immediate local notification
async function showLocalNotification(title: string, body: string, data?: object) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: 'default',
      badge: 1,
      // Android-specific
      androidChannelId: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      sticky: false,
    },
    trigger: null, // null = show immediately
  });
}

// Scheduled notification — like AlarmManager
async function scheduleReminder(title: string, date: Date) {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: "Don't forget!",
      androidChannelId: 'default',
    },
    trigger: {
      date, // exact date/time
    },
  });
  return id; // save to cancel later
}

// Recurring notification — like AlarmManager.setRepeating()
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
      repeats: true, // fires every day at this time
    },
  });
}

// Cancel a scheduled notification
async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// Cancel all
async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
```

---

## Rich Notifications — BigTextStyle / BigPictureStyle

```tsx
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'New Order #1234',
    body: 'Your order has been confirmed.',
    data: { orderId: '1234' },
    androidChannelId: 'default',

    // Large icon (shown in notification panel)
    // Equivalent of NotificationCompat.Builder.setLargeIcon()
    // Pass a local URI or remote URL
    // attachments: [{ uri: 'https://example.com/product.jpg' }],  // iOS
    // On Android use a data payload with image URL and handle it in a background task

    // Expandable notification on Android
    // expo-notifications handles BigTextStyle automatically for long body text
  },
  trigger: null,
});
```

---

## FCM Data-Only Messages — Handling in Background

For silent data messages (background sync, like FCM data payload with no notification key):

```tsx
// expo-task-manager handles background FCM data messages
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  ({ data, error, executionInfo }) => {
    if (error) return;
    const notification = data.notification as Notifications.Notification;
    const payload = notification.request.content.data;

    // Handle background data — sync local DB, update cache
    console.log('Background notification data:', payload);
  }
);

// Register the task
Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
```

---

## Badge Count

```tsx
// Set badge number on app icon
await Notifications.setBadgeCountAsync(5);

// Clear badge
await Notifications.setBadgeCountAsync(0);

// Read current badge
const count = await Notifications.getBadgeCountAsync();
```

---

## Notification Badge in AndroidManifest.xml

For Expo managed workflow, the manifest is handled automatically. For bare workflow, ensure these are set:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />

<application ...>
  <!-- FCM service — added automatically by expo-notifications -->
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

## Study Materials

### Official Documentation

- [expo-notifications — Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo — Push Notifications Overview](https://docs.expo.dev/push-notifications/overview/)
- [Expo — FCM Setup (Android)](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Android — Notifications Overview](https://developer.android.com/develop/ui/views/notifications)
- [Android — Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
- [Firebase — FCM Android Setup](https://firebase.google.com/docs/cloud-messaging/android/client)

### Videos

- [Simon Grimm — Expo Push Notifications Full Guide](https://www.youtube.com/watch?v=25M_mBFOh3M)
- [notifee — Advanced Android Notifications](https://www.youtube.com/watch?v=TRMiKLBSTOA)

### Packages

- [expo-notifications](https://github.com/expo/expo/tree/main/packages/expo-notifications)
- [notifee](https://notifee.app/) — advanced notifications (custom layouts, actions, groups)

---

## Module Summary

You have completed the Native Resources module. Here is the full map:

| Topic | What you covered |
|-------|-----------------|
| Permissions | `PermissionsAndroid`, rationale flow, `react-native-permissions` |
| Camera | `expo-camera`, Vision Camera, frame processors, video recording |
| Storage | `expo-file-system`, `expo-sqlite`, `expo-document-picker`, `expo-secure-store` |
| Sensors | Accelerometer, gyroscope, `expo-location`, haptics, keep-awake |
| Notifications | FCM token, notification channels, local notifications, background tasks |

The next module covers performance — profiling renders, optimising FlatList, Reanimated, and Hermes-specific tuning.
