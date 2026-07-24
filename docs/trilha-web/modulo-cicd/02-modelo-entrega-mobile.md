---
title: Mobile Delivery Model — Stores, Rollout, and Updates
---

# Mobile Delivery Model — Stores, Rollout, and Updates

> On the web, deploy is atomic and universal: push to the CDN, every user gets the new version on the next reload. On mobile, the delivery model is fundamentally different — and it changes how you think about releases.

## Web vs Mobile Delivery

| Web | Mobile |
|---|---|
| Deploy is instantaneous | Review by App Store / Play Store (hours to days) |
| One version in production | Multiple versions coexist simultaneously |
| Users always on latest | Users decide when (or whether) to update |
| Rollback by reverting CDN | No rollback — you ship a fix as a new version |
| Feature flags are optional | Feature flags are often essential |

---

## Store Review

Between "merge to main" and "user receives update" sits a store review. Apple and Google review each submission for policy compliance, privacy, and content. For most updates this takes hours to a couple of days — for a critical security fix, you cannot push an out-of-band patch the way you would on the web.

This changes incident response: hotfixes need to be queued, not deployed instantly. Plan for this in your runbooks.

---

## Staged Rollout

Both stores support releasing to a percentage of users:

- **Google Play** — Staged rollout: release to 1% → 10% → 50% → 100%, monitoring crash rate at each step. You can pause or halt before reaching everyone.
- **App Store** — Phased release: Apple automatically expands over 7 days (days 1-7: 1%, 2%, 5%, 10%, 20%, 50%, 100%). You can pause at any phase.

This is the mobile equivalent of a canary deployment. Monitoring crash rate by version during rollout is standard practice — not optional.

---

## Version Fragmentation

Users decide when to update. In practice, several versions of your app run in production simultaneously. The direct consequence for the backend: **the API must remain compatible with older clients**.

Common patterns:
- **API versioning** — `/v1/`, `/v2/` paths, or `Accept-Version` headers
- **Optional fields** — new fields are additive; removing a field from a response breaks old clients
- **Minimum supported version endpoint** — a `/version-check` endpoint that returns the minimum app version; clients below that threshold get a forced-update screen
- **Never break a contract atomically** — deprecate, add the new shape alongside the old, then remove after adoption

---

## Forced Update

When an old version must stop working — security issue, sunset of a deprecated API — the pattern is:

1. A backend endpoint returns the minimum supported version
2. On app launch, compare the running version against the minimum
3. If below minimum, show an "Update required" screen that blocks the app until the user updates

```typescript
// On app launch
const { minVersion } = await fetch('/api/version-check').then(r => r.json());
const appVersion = Application.nativeApplicationVersion; // expo-application

if (semverLessThan(appVersion, minVersion)) {
  // Block the app and show update screen
  navigation.replace('ForceUpdate');
}
```

This concept simply does not exist on the web — it is a mobile-specific pattern.

---

## OTA Updates — The Middle Ground

**EAS Update** (Expo) and similar tools let you update the **JS bundle** without going through the stores — almost a "web deploy" for the JS layer. Useful for bug fixes that don't touch native code.

Limits to know:
- Cannot update native code (Kotlin/Swift, native modules, or any change that requires a new binary)
- Subject to store policies: Apple's guidelines require OTA content to be "consistent with the app's original purpose"
- Not a substitute for a full release; think of it as a fast lane for JS-only fixes

---

## Feature Flags and Kill Switches

Since you cannot "take down" an installed version of your app, feature flags are a first-class tool on mobile:

- **Disable a broken feature remotely** without a new release
- **Gradual rollout** of features independent of the app release itself
- **Kill switches** for features that interact with a backend you control

Tools: LaunchDarkly, Statsig, Firebase Remote Config, or a simple config endpoint.

---

## Crash Rate Monitoring Per Version

During and after rollout, monitor crash rate segmented by app version. A spike in crashes in the new version is your signal to pause the staged rollout before it reaches 100%.

Standard tools: Firebase Crashlytics, Sentry, Datadog — all support version-level filtering.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| EAS Update | Official | [docs.expo.dev/eas-update/introduction](https://docs.expo.dev/eas-update/introduction/) |
| Play Store staged rollouts | Guide | [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer/answer/6346149) |
| App Store phased release | Guide | [developer.apple.com/help/app-store-connect](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/) |
| expo-application | Official | [docs.expo.dev/versions/latest/sdk/application](https://docs.expo.dev/versions/latest/sdk/application/) |
