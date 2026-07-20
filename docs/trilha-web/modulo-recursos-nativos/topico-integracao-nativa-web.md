---
title: Native Integration
---

# Native Integration

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_web/rec_02_integracao_nativa.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## The Layer You Don't Write

As a web developer, you're used to the entire stack being JavaScript. npm install a library, import it, done. In React Native, some capabilities — platform sensors, proprietary SDKs, system APIs — live below the JavaScript layer, implemented in Kotlin or Swift by native developers.

Your job is not to write that native code. Your job is to consume it correctly from JS, communicate clearly with the native team about what you need, and recognize when a bug is yours versus theirs.

---

## Mapping: Web → React Native / Native

| Web concept | React Native / Native | Note |
|---|---|---|
| npm library (JS SDK) | Native SDK + bridge | Implementation in Kotlin/Swift, exposed as JS functions |
| React component | Native UI Component | Props/events API is React; rendering is native |
| DOM events | Events via bridge | Generated in native, received in JS |
| `localStorage` / Web Storage | Platform APIs (Android/iOS) | Accessed via native modules or libs that wrap native code |
| webpack / Vite build | Metro + Android/iOS build | JS bundle + native binary (APK/IPA) |

---

## Consuming a Native Module

A **Native Module** appears in JavaScript as an object on `NativeModules`. The native team writes the Kotlin/Swift implementation and tells you the module name and available methods. You write the JS wrapper.

```ts
// src/native/appEnv.ts
import { NativeModules } from 'react-native';

const { AppEnv } = NativeModules;

type Environment = 'dev' | 'staging' | 'prod';

export async function getEnvironment(): Promise<Environment> {
  if (!AppEnv) {
    throw new Error('AppEnv module not available');
  }
  return AppEnv.getEnvironment();
}

export async function getBuildNumber(): Promise<string> {
  if (!AppEnv) {
    throw new Error('AppEnv module not available');
  }
  return AppEnv.getBuildNumber();
}
```

The null check on `AppEnv` matters — if the native module isn't registered (wrong build, wrong platform), `NativeModules.AppEnv` is `undefined`. Without the guard, you get an unhelpful `TypeError: undefined is not an object` instead of a clear message about the missing module.

Consuming it in a hook:

```ts
// src/native/useAppEnv.ts
import { useEffect, useState } from 'react';
import { getEnvironment, getBuildNumber } from './appEnv';

type AppEnvState = {
  env: 'dev' | 'staging' | 'prod' | null;
  buildNumber: string | null;
  error: string | null;
};

export function useAppEnv(): AppEnvState {
  const [state, setState] = useState<AppEnvState>({
    env: null,
    buildNumber: null,
    error: null,
  });

  useEffect(() => {
    Promise.all([getEnvironment(), getBuildNumber()])
      .then(([env, buildNumber]) => setState({ env, buildNumber, error: null }))
      .catch((e) => setState((s) => ({ ...s, error: e.message })));
  }, []);

  return state;
}
```

---

## Consuming a Native UI Component

A **Native UI Component** is a React component whose rendering is handled entirely by native code. You use it in JSX like any other component — you just don't control what's inside.

```tsx
// src/native/MyNativeChart.tsx
import { requireNativeComponent } from 'react-native';

type MyNativeChartProps = {
  data: number[];
  color?: string;
  style?: object;
};

export const MyNativeChart = requireNativeComponent<MyNativeChartProps>('MyNativeChart');
```

```tsx
// Usage in a screen
import { MyNativeChart } from '../native/MyNativeChart';

export function SalesScreen() {
  return <MyNativeChart data={[10, 20, 30]} color="#3366FF" style={{ height: 200 }} />;
}
```

The available props and events are defined by the native team. If the chart isn't rendering correctly or a prop isn't doing what you expect, the issue is almost certainly in the native implementation, not in your JSX.

---

## Reading Native Errors

When something goes wrong in the native layer, the error surfaces in the RN red screen or in the device logs. Learning to tell a JS error from a native one saves you from debugging the wrong layer.

- **JS errors** — stack trace points to `.js` or `.tsx` files. These are yours.
- **Android native errors** — stack trace contains `java.lang.*`, `com.facebook.react.*`, or your package name in Kotlin. Pass these to the Android developer with the full Logcat output.
- **iOS native errors** — stack trace contains Objective-C selectors (`-[UIView ...]`) or Swift types. Pass these to the iOS developer with the full Xcode console output.

Your job in a native error: identify which screen and flow triggered it, capture the full stack trace from Logcat or Xcode, and hand it off with clear reproduction steps.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Native Modules Overview | Official Docs | [reactnative.dev/docs/native-modules-intro](https://reactnative.dev/docs/native-modules-intro) |
| Native UI Components | Official Docs | [reactnative.dev/docs/native-components-android](https://reactnative.dev/docs/native-components-android) |

---

Next → **[Mobile Performance](../modulo-performance/topico-performance-mobile-web)**
