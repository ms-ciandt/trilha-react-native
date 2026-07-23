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
| npm library (JS SDK) | TurboModule | Implementation in Kotlin/Swift, exposed as typed JS functions via JSI |
| React component | Fabric Native Component | Props/events API is React; rendering is native |
| DOM events | Typed EventEmitter spec | Generated in native, received in JS via subscription |
| `localStorage` / Web Storage | Platform APIs (Android/iOS) | Accessed via TurboModules or libs that wrap native code |
| webpack / Vite build | Metro + Android/iOS build | JS bundle + native binary (APK/IPA) |

---

## Consuming a TurboModule

A **TurboModule** is a native module accessed via JSI — synchronous, typed, and lazy-loaded. The native team writes the Kotlin/Swift implementation and provides a TypeScript spec. You import the registered module directly; no runtime dictionary lookup.

```ts
// src/native/NativeAppEnv.ts  (TypeScript spec — shared with Codegen)
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  getEnvironment(): Promise<string>;
  getBuildNumber(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AppEnv');
```

```ts
// src/native/appEnv.ts  (thin typed wrapper consumed by the rest of the app)
import NativeAppEnv from './NativeAppEnv';

type Environment = 'dev' | 'staging' | 'prod';

export function getEnvironment(): Promise<Environment> {
  return NativeAppEnv.getEnvironment() as Promise<Environment>;
}

export function getBuildNumber(): Promise<string> {
  return NativeAppEnv.getBuildNumber();
}
```

`getEnforcing` throws at module load time if the native side is absent — you get a clear error pointing to the missing registration, not a silent `undefined` at call time.

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

## Consuming a Fabric Native Component

A **Fabric Native Component** is a React component whose rendering is handled entirely by native code (via the Fabric renderer). The native team provides a TypeScript spec; Codegen generates the glue. You use it in JSX like any other component.

```tsx
// src/native/NativeMyChart.ts  (TypeScript spec — drives Codegen)
import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type NativeProps = ViewProps & {
  data: ReadonlyArray<number>;
  color?: string;
};

export default codegenNativeComponent<NativeProps>('MyChart') as HostComponent<NativeProps>;
```

```tsx
// src/native/MyNativeChart.tsx  (typed wrapper for use in screens)
import NativeMyChart from './NativeMyChart';
export { NativeMyChart };
```

```tsx
// Usage in a screen
import { NativeMyChart } from '../native/MyNativeChart';

export function SalesScreen() {
  return <NativeMyChart data={[10, 20, 30]} color="#3366FF" style={{ height: 200 }} />;
}
```

The available props are defined by the TypeScript spec the native team maintains. If the chart isn't rendering correctly or a prop isn't working as expected, the issue is almost certainly in the native implementation, not in your JSX.

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
| TurboModules Introduction | Official Docs | [reactnative.dev/docs/turbo-native-modules-introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) |
| Fabric Native Components | Official Docs | [reactnative.dev/docs/fabric-native-components-introduction](https://reactnative.dev/docs/fabric-native-components-introduction) |

---