---
title: Push and Local Notifications
---

# Push and Local Notifications

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/rec_07_push-notifications.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/rec_07_push-notifications_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

iOS notifications live under `UserNotifications` framework (`UNUserNotificationCenter`), which handles both remote push notifications delivered via APNs and local notifications scheduled on-device. `expo-notifications` wraps the entire `UNUserNotificationCenter` surface — permission requests, foreground presentation, notification categories, local scheduling, and device token retrieval — through a unified JavaScript API.

```bash
npx expo install expo-notifications expo-device
```

---

## Permission model: UNUserNotificationCenter.requestAuthorization

Both push and local notifications share a single permission prompt in iOS, driven by `UNUserNotificationCenter.requestAuthorization(options:completionHandler:)`. You must request permission before scheduling or receiving any notification.

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

On iOS, this dialog appears once per app install. If the user denies it, subsequent `requestPermissionsAsync` calls return `denied` immediately — you must guide them to Settings manually.

---

## Foreground notification presentation

By default, iOS suppresses notifications when the app is in the foreground — same behavior as native. `setNotificationHandler` maps to `UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:withCompletionHandler:)`:

```typescript
// Call this once at app startup, before any notification can arrive
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,   // iOS 14+ banner style
    shouldShowList: true,     // appears in Notification Center
  }),
});
```

---

## Push notifications via APNs

### Entitlements and background modes

APNs delivery requires the push notification entitlement and, for silent/background pushes, the `remote-notification` background mode — equivalent to enabling **Background Modes > Remote notifications** in Xcode.

In `app.json`:

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

### Registering and retrieving the device token

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications require a physical device — simulators don't register with APNs
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  // Analogous to UIApplication.shared.registerForRemoteNotifications()
  // Returns an Expo push token that routes through Expo's infrastructure to APNs
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data; // "ExponentPushToken[xxxxxx]"
}
```

### APNs device token vs Expo push token

`getExpoPushTokenAsync` returns an Expo push token (`ExponentPushToken[...]`) — a wrapper that routes through Expo's push service before reaching APNs. If your backend sends directly to APNs, retrieve the raw device token instead:

```typescript
// Analogous to application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
const deviceToken = await Notifications.getDevicePushTokenAsync();
console.log(deviceToken.data); // hex string — the raw APNs token bytes
```

| | Expo push token | APNs device token |
|---|---|---|
| Format | `ExponentPushToken[...]` | hex string |
| Routes through | Expo push service | Your backend → APNs directly |
| Use when | Using Expo's push API | Self-managed APNs delivery |

---

## Local notifications

Local notifications are scheduled entirely on-device — no server, no APNs. They map to `UNNotificationRequest` with a `UNNotificationTrigger`. This is the same API your SwiftUI or UIKit code uses to schedule reminders, alarms, or geofence alerts.

### Time interval trigger

```typescript
// Analogous to UNTimeIntervalNotificationTrigger(timeInterval: 60, repeats: false)
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Time is up!',
    body: 'Your 1-minute timer has finished.',
    sound: true,
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 60,
    repeats: false,
  },
});
```

### Calendar trigger

```typescript
// Analogous to UNCalendarNotificationTrigger with DateComponents
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Good morning',
    body: 'Time for your daily review.',
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    hour: 9,
    minute: 0,
    repeats: true, // fires every day at 09:00
  },
});
```

### Cancelling scheduled notifications

```typescript
// Cancel a specific notification by identifier
await Notifications.cancelScheduledNotificationAsync(notificationId);

// Cancel all pending — analogous to UNUserNotificationCenter.removeAllPendingNotificationRequests()
await Notifications.cancelAllScheduledNotificationsAsync();

// List all pending — analogous to UNUserNotificationCenter.getPendingNotificationRequests()
const pending = await Notifications.getAllScheduledNotificationsAsync();
```

---

## Notification categories (UNNotificationCategory)

Notification categories add actionable buttons to both push and local notifications. They map to `UNNotificationCategory` + `UNNotificationAction`, and must be registered before the notification is delivered:

```typescript
await Notifications.setNotificationCategoryAsync('message', [
  {
    identifier: 'reply',
    buttonTitle: 'Reply',
    options: {
      isDestructive: false,
      isAuthenticationRequired: false,
      opensAppToForeground: false,
    },
    textInput: {
      submitButtonTitle: 'Send',
      placeholder: 'Type a reply...',
    },
  },
  {
    identifier: 'dismiss',
    buttonTitle: 'Dismiss',
    options: {
      isDestructive: true,
      isAuthenticationRequired: false,
      opensAppToForeground: false,
    },
  },
]);
```

Attach the category to a notification via `content.categoryIdentifier`:

```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'New message from Ana',
    body: 'Are you free tonight?',
    categoryIdentifier: 'message',
  },
  trigger: { seconds: 1, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
});
```

---

## Handling incoming notifications and user responses

```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Subscription } from 'expo-modules-core';

function useNotificationHandlers() {
  const foregroundListener = useRef<Subscription>();
  const responseListener = useRef<Subscription>();

  useEffect(() => {
    // Fires when a notification is received while the app is in the foreground
    // Analogous to UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:)
    foregroundListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Received:', notification.request.content.title);
      }
    );

    // Fires when the user taps the notification or one of its action buttons
    // Analogous to UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { actionIdentifier, notification } = response;

        if (actionIdentifier === 'reply') {
          const text = response.userText; // from textInput action
          console.log('User replied:', text);
        } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          // User tapped the notification body itself
          console.log('Notification tapped:', notification.request.content.data);
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

### Handling cold-start launches from a notification tap

When the user taps a notification while the app is closed, the app launches directly to that context. Read the initial response at startup:

```typescript
// In your root component or app initializer
const lastResponse = await Notifications.getLastNotificationResponseAsync();

if (lastResponse) {
  const { data } = lastResponse.notification.request.content;
  // Navigate to the relevant screen using data
}
```

This is equivalent to reading `launchOptions[UIApplication.LaunchOptionsKey.remoteNotification]` in `AppDelegate.application(_:didFinishLaunchingWithOptions:)`.

---

## Badge management

```typescript
// Set the app icon badge count — analogous to UIApplication.shared.applicationIconBadgeNumber
await Notifications.setBadgeCountAsync(5);

// Read current badge count
const count = await Notifications.getBadgeCountAsync();

// Clear the badge
await Notifications.setBadgeCountAsync(0);
```

---

## Summary

| UNUserNotificationCenter API | expo-notifications equivalent |
|---|---|
| `requestAuthorization(options:)` | `requestPermissionsAsync()` |
| `UNUserNotificationCenterDelegate.willPresent` | `setNotificationHandler` |
| `UIApplication.registerForRemoteNotifications()` | `getExpoPushTokenAsync()` |
| `didRegisterForRemoteNotificationsWithDeviceToken` | `getDevicePushTokenAsync()` |
| `UNTimeIntervalNotificationTrigger` | `TIME_INTERVAL` trigger |
| `UNCalendarNotificationTrigger` | `CALENDAR` trigger |
| `UNNotificationCategory` + `UNNotificationAction` | `setNotificationCategoryAsync` |
| `UNUserNotificationCenterDelegate.didReceive` | `addNotificationResponseReceivedListener` |
| `getPendingNotificationRequests` | `getAllScheduledNotificationsAsync` |
| `removeAllPendingNotificationRequests` | `cancelAllScheduledNotificationsAsync` |
| `applicationIconBadgeNumber` | `setBadgeCountAsync` |
| `launchOptions[.remoteNotification]` | `getLastNotificationResponseAsync` |
