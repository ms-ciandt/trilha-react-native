---
title: "Error Handling & Monitoring"
sidebar_label: "Error Handling"
sidebar_position: 4
---

## Video Overview

> Video for this topic coming soon.

## The Same Problem, Different Layer

Android apps use Firebase Crashlytics, Sentry, or Datadog for crash reporting. React Native apps use the same services — but errors can originate from the JS layer, the native layer, or both. Your monitoring setup must capture all of them.

---

## Sentry for React Native

```bash
npx expo install @sentry/react-native
npx sentry-wizard -i reactNative -p android
```

### Initialisation

```typescript
// app/_layout.tsx or App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://your-dsn@sentry.io/project-id',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,   // 20% of transactions in production
  enabled: !__DEV__,                         // disable in dev to reduce noise
  attachStacktrace: true,
  integrations: [
    Sentry.reactNativeTracingIntegration(),
  ],
});

export default Sentry.wrap(App); // wraps the root component
```

### Capturing Errors Manually

```typescript
// JS errors — Sentry auto-captures uncaught exceptions
// For handled errors you want to report:

async function loadUserProfile(id: string) {
  try {
    return await userApi.getById(id);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'profile', userId: id },
      extra: { endpoint: `/users/${id}` },
    });
    return null;
  }
}

// Add breadcrumbs — like Android's Timber logs that appear in crash reports
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'Navigated to ProductDetail',
  data: { productId: '123' },
  level: 'info',
});
```

### User Context — like Firebase setUserId()

```typescript
// Set after login
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// Clear on logout
Sentry.setUser(null);
```

---

## Structured Error Types

```typescript
// utils/errors.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'No internet connection') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  constructor(message = 'Session expired') {
    super(message);
    this.name = 'AuthError';
  }
}

// API client — throws typed errors
api.interceptors.response.use(
  response => response,
  error => {
    if (!error.response) throw new NetworkError();
    if (error.response.status === 401) throw new AuthError();
    throw new ApiError(
      error.response.data?.message ?? 'Request failed',
      error.response.status,
      error.config.url,
    );
  }
);
```

---

## Global Error Handler

```typescript
// Handle unhandled promise rejections (equivalent of Thread.setDefaultUncaughtExceptionHandler)
import { ErrorUtils } from 'react-native';

const originalHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error, isFatal) => {
  Sentry.captureException(error, {
    tags: { fatal: String(isFatal) },
  });

  if (isFatal) {
    // Show a user-friendly crash screen instead of the red box
    // Navigation is gone at this point — show a static native view
  }

  originalHandler?.(error, isFatal);
});
```

---

## Study Materials

- [Sentry — React Native](https://docs.sentry.io/platforms/react-native/)
- [React Native — Error Handling](https://reactnative.dev/docs/error-handling)

---

## What's Next

Error handling in place. Final topic: accessibility — building inclusive apps from an Android developer's perspective.

➡ [Accessibility](./05-accessibility)
