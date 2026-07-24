---
title: "OTA Updates with EAS Update"
sidebar_label: "OTA Updates"
sidebar_position: 5
---

## Video Overview

> Video for this topic coming soon.

## What OTA Updates Are

Over-the-Air (OTA) updates push a new JavaScript bundle to users' devices without going through the Play Store review process. The native layer (Kotlin, Gradle, permissions) stays the same — only the JS changes.

This is one of React Native's most powerful production advantages: a critical bug fix can reach all users in minutes instead of days.

| Change type | Requires Play Store release | OTA possible |
|-------------|---------------------------|--------------|
| JS/TypeScript logic | No | Yes |
| Component UI changes | No | Yes |
| New screen (JS only) | No | Yes |
| New TurboModule (Kotlin) | Yes | No |
| New permission in Manifest | Yes | No |
| New native dependency | Yes | No |
| RN version upgrade | Yes | No |

---

## EAS Update Setup

```bash
npm install expo-updates
eas update:configure
```

In `app.json`:

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

## Publishing an Update

```bash
# Publish to the "production" channel
eas update --branch production --message "Fix checkout crash"

# Publish to a preview channel for testing
eas update --branch preview --message "New cart UI"
```

Users with the app installed receive the update on next launch (or background check). The update is applied on the following restart.

---

## Update Strategy in Code

```tsx
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert } from 'react-native';

function useOTAUpdates() {
  useEffect(() => {
    async function checkForUpdate() {
      if (__DEV__) return; // skip in development

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Update Available',
            'A new version is ready. Restart to apply?',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Restart', onPress: () => Updates.reloadAsync() },
            ]
          );
        }
      } catch (e) {
        // Update check failed — app continues normally
        console.warn('OTA check failed:', e);
      }
    }

    checkForUpdate();
  }, []);
}
```

---

## Channels and Branches

EAS Update uses **branches** (what you publish to) and **channels** (what build profiles subscribe to):

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
# Production users get updates from the "production" branch
eas update --branch production --message "Hotfix: cart total"

# Preview builds get updates from "preview"
eas update --branch preview --message "New onboarding flow"
```

---

## Rollback

```bash
# List recent updates on a branch
eas update:list --branch production

# Rollback to a previous update
eas update:republish --branch production --update-id <previous-update-id>
```

---

## Study Materials

- [EAS Update — Documentation](https://docs.expo.dev/eas-update/introduction/)
- [EAS Update — Deployment patterns](https://docs.expo.dev/eas-update/deployment-patterns/)
- [expo-updates — API](https://docs.expo.dev/versions/latest/sdk/updates/)

---

## Module Summary

| Topic | What you covered |
|-------|-----------------|
| Fastlane | Lanes for build, sign, upload to Play Store |
| GitHub Actions | PR checks, release builds, secrets management |
| EAS Build | Cloud builds, profiles, credentials |
| Code Signing | Keystore, Play App Signing, ProGuard |
| OTA Updates | EAS Update, channels, rollback |
