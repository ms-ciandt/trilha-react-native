---
title: Error Handling and Monitoring
---

# Error Handling and Monitoring

Swift gives you strong compile-time guarantees around error propagation: `throws`, `Result<T, E>`, and typed errors catch problems before they reach production. React Native moves much of that discipline to runtime, but the patterns map closely once you understand the equivalents. This file covers the full stack — from typed error modeling in TypeScript to crash symbolication in production.

## Swift Result<T, E> to TypeScript

In Swift you model fallible operations with `Result`:

```swift
enum NetworkError: Error {
    case unauthorized
    case notFound(String)
    case serverError(Int)
}

func fetchUser(id: String) async -> Result<User, NetworkError> {
    // ...
}
```

TypeScript does not have sum types built in, but you can replicate the same pattern:

```typescript
type NetworkError =
  | { kind: 'unauthorized' }
  | { kind: 'notFound'; resource: string }
  | { kind: 'serverError'; code: number };

type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function fetchUser(id: string): Promise<Result<User, NetworkError>> {
  const response = await fetch(`/users/${id}`);

  if (response.status === 401) {
    return { ok: false, error: { kind: 'unauthorized' } };
  }
  if (response.status === 404) {
    return { ok: false, error: { kind: 'notFound', resource: id } };
  }
  if (!response.ok) {
    return { ok: false, error: { kind: 'serverError', code: response.status } };
  }

  const user: User = await response.json();
  return { ok: true, value: user };
}
```

Consuming the result is exhaustive when you use a switch with a discriminant:

```typescript
const result = await fetchUser(userId);

if (!result.ok) {
  switch (result.error.kind) {
    case 'unauthorized':
      navigateToLogin();
      break;
    case 'notFound':
      showNotFound(result.error.resource);
      break;
    case 'serverError':
      showRetryPrompt(result.error.code);
      break;
  }
  return;
}

renderUser(result.value);
```

This is the TypeScript equivalent of Swift's exhaustive `switch` on an enum — the compiler flags unhandled cases if you configure `noImplicitReturns` and keep the union closed.

## Error Boundaries

Swift has no component-tree-level error containment because UIKit and SwiftUI do not expose one. React Native inherits React's Error Boundary mechanism, which catches rendering errors thrown by any child component and lets you render a fallback UI instead of crashing the whole screen.

An error boundary is a class component that implements `componentDidCatch`:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
```

Wrap screens or feature modules at the boundary where an error should be contained:

```tsx
<ErrorBoundary
  fallback={<ScreenError message="Something went wrong" />}
  onError={(error, info) => Sentry.captureException(error, { extra: { componentStack: info.componentStack } })}
>
  <ProfileScreen />
</ErrorBoundary>
```

Error boundaries do not catch errors in event handlers, asynchronous code, or native modules — those require try/catch or the Result pattern above.

## Sentry React Native SDK

Sentry for React Native uses the same DSN as your iOS native Sentry integration. If your iOS app already reports to a Sentry project, you can route React Native crashes to the same project — the dashboard shows both native and JS events side by side.

Install:

```bash
npx expo install @sentry/react-native
```

Initialize in your app entry point, before any other code runs:

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://<key>@sentry.io/<project>',
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  tracesSampleRate: 0.2,
  profilesSampleRate: 0.1,
  attachScreenshot: true,
  enableNativeCrashHandling: true,
});
```

`enableNativeCrashHandling: true` hooks into the same native crash reporter that the Sentry Cocoa SDK uses. A single DSN covers both sides.

### Error Boundary plus Sentry

Combine the two so uncaught render errors are reported automatically:

```typescript
export class SentryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    Sentry.withScope((scope) => {
      scope.setExtra('componentStack', info.componentStack);
      scope.setTag('boundary', 'render');
      Sentry.captureException(error);
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <FullScreenError error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

For non-render errors (network, business logic), call `Sentry.captureException` directly:

```typescript
try {
  await submitOrder(cart);
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: 'checkout' },
    extra: { cartItemCount: cart.items.length },
  });
  showErrorToast('Order failed. Please try again.');
}
```

## Crashlytics Integration

If your project uses Firebase Crashlytics alongside or instead of Sentry:

```bash
npx expo install @react-native-firebase/app @react-native-firebase/crashlytics
```

Report non-fatal errors:

```typescript
import crashlytics from '@react-native-firebase/crashlytics';

function reportNonFatal(error: Error, context: Record<string, string> = {}): void {
  Object.entries(context).forEach(([key, value]) => {
    crashlytics().setAttribute(key, value);
  });
  crashlytics().recordError(error);
}
```

Mark a fatal boundary (will show as fatal in the Crashlytics dashboard):

```typescript
function reportFatal(error: Error): never {
  crashlytics().setAttribute('fatal', 'true');
  crashlytics().recordError(error);
  throw error; // re-throw to propagate normally
}
```

The distinction between fatal and non-fatal mirrors what you do with the Crashlytics iOS SDK: `Crashlytics.crashlytics().record(error:)` for non-fatal, letting the process actually crash for fatals.

## Hermes Crash Symbolication

Hermes compiles JavaScript to bytecode at build time. When a crash occurs in production, the stack trace references bytecode offsets — not your original TypeScript line numbers. Symbolication requires two artifacts:

- `.dSYM` bundle from the native iOS build (for the Hermes engine frames)
- Source map generated during the JS bundle build (for your own JS frames)

Upload both to Sentry with the `sentry-cli`:

```bash
# Build the JS bundle and source map
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --sourcemap-output ios/main.jsbundle.map

# Upload source map
sentry-cli releases files <release-version> upload-sourcemaps \
  --dist <build-number> \
  ios/main.jsbundle.map \
  --rewrite

# Upload dSYM (produced by Xcode archive)
sentry-cli upload-dif --org <org> --project <project> path/to/dSYMs/
```

In your CI pipeline (Fastlane or GitHub Actions), run these steps after every production build. The Sentry Xcode build phase script that the iOS SDK installs handles `.dSYM` upload automatically if you keep it enabled — the source map upload is the React Native addition.

## Network Error Retry Strategy with TanStack Query

`os_unfair_lock` and retry logic in URLSession require manual implementation in Swift. TanStack Query provides this declaratively:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    retry: (failureCount, error) => {
      // Do not retry on client errors
      if (error instanceof NetworkError && error.statusCode < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
  });
}
```

`retryDelay` with exponential backoff mirrors what you would implement manually with `DispatchQueue.asyncAfter` in Swift. The cap at 30 seconds prevents runaway retries on flaky connections.

For mutations (write operations), retry only idempotent requests:

```typescript
const submitOrder = useMutation({
  mutationFn: postOrder,
  retry: 0, // orders are not idempotent — never auto-retry
  onError: (error) => {
    Sentry.captureException(error, { tags: { operation: 'submitOrder' } });
    showErrorBanner('Order could not be submitted.');
  },
});
```

## Logging: os.log to console.log plus Remote Logging

In Swift, `os.log` writes structured logs to the unified logging system, visible in Console.app with subsystem and category filtering. React Native has no equivalent built-in system, but you can layer the same discipline on top of `console`:

```typescript
type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'fault';

interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warning(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  fault(message: string, error: Error, meta?: Record<string, unknown>): void;
}

function createLogger(subsystem: string, category: string): Logger {
  const prefix = `[${subsystem}/${category}]`;

  return {
    debug: (message, meta) => {
      if (__DEV__) console.debug(prefix, message, meta ?? '');
    },
    info: (message, meta) => {
      console.info(prefix, message, meta ?? '');
    },
    warning: (message, meta) => {
      console.warn(prefix, message, meta ?? '');
      Sentry.addBreadcrumb({ level: 'warning', message, data: meta, category });
    },
    error: (message, error, meta) => {
      console.error(prefix, message, error, meta ?? '');
      if (error) Sentry.captureException(error, { extra: meta });
    },
    fault: (message, error, meta) => {
      console.error(prefix, '[FATAL]', message, error, meta ?? '');
      Sentry.captureException(error, {
        level: 'fatal',
        tags: { fatal: 'true' },
        extra: meta,
      });
    },
  };
}

// Usage mirrors os.log subsystem/category convention
export const networkLogger = createLogger('com.myapp', 'network');
export const authLogger = createLogger('com.myapp', 'auth');
```

### Datadog RUM Integration

Datadog's React Native SDK integrates with RUM (Real User Monitoring) in the same way the Datadog iOS SDK does:

```typescript
import { DdSdkReactNative, DdSdkReactNativeConfiguration, DdLogs } from '@datadog/mobile-react-native';

const config = new DdSdkReactNativeConfiguration(
  '<client-token>',
  '<environment>',
  '<application-id>',
  true,  // track user interactions
  true,  // track resources
  true,  // track errors
);

await DdSdkReactNative.initialize(config);

// Log at various levels — routed to Datadog Log Management
DdLogs.info('User signed in', { userId });
DdLogs.error('Payment failed', { orderId, reason: error.message });
```

If your team already uses Datadog for iOS, the same service name and environment tags produce a unified view across native and React Native sessions.

## Fatal vs Non-Fatal Classification

The classification that matters in your monitoring dashboard:

| Category | Examples | Action |
|---|---|---|
| Non-fatal | Network timeout, validation error, 404 | Log, report to Sentry as non-fatal, show inline error |
| Fatal (JS) | Uncaught exception, render crash without boundary | Captured by Sentry's global handler, app may recover |
| Fatal (native) | Native module crash, OOM | `.dSYM` symbolication required, Crashlytics records it |

For non-fatal errors, always present recovery options to the user and log enough context to reproduce the issue. For fatal errors, let the global handlers capture the crash and focus your engineering effort on reducing their frequency through proactive error boundaries and typed Result patterns at the edges of your data layer.

The principle is the same as in Swift: push error handling to the boundary where you can actually respond to it, and let typed errors flow through the middle of your call stack without silent swallowing.
