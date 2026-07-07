---
title: Native Integration
---

# Topic — Introduction to Native Integration (Web Track)

### Topic Goal

By the end, you should be able to:

- Explain at a high level what a **Native Module** and a **Native UI Component** are
- Know in which cases you need to involve the native team (proprietary SDKs, system-specific APIs)
- Consume an existing native module via `NativeModules`
- Read and interpret errors coming from the native layer (stacktrace on Android/iOS)
- Have the vocabulary to discuss integrations with Android/iOS developers

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Native_Web_Integration_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Mapping: Web → React Native / Native

| Web Concept                   | React Native / Native               | Note                                                                       |
|-------------------------------|-------------------------------------|----------------------------------------------------------------------------|
| JS SDK (npm library)          | Native SDK + bridge                 | Implementation in Kotlin/Swift exposed as JS functions                    |
| React Components              | Native UI Components                | Props/events API is React; implementation and rendering are native        |
| DOM Events                    | Events via bridge                   | Events generated in the native layer and received in JS                   |
| Web build (webpack, vite)     | Metro + Android/iOS build           | JS bundle + native binaries (APK/IPA)                                    |
| Browser API (localStorage)    | Platform APIs (Android/iOS)         | RN accesses via native modules or libs that use native code internally    |

---

### Core Concepts

#### Native Modules (consumption from the Web perspective)

A **Native Module** is seen in JS as an object in `NativeModules`:

```tsx
import { NativeModules } from 'react-native';

const { AppEnv } = NativeModules;

// AppEnv was implemented in native code (Android/iOS).
// Here you only consume its JS methods.
```

Methods are asynchronous in most cases (Promise-based):

```tsx
type Environment = 'dev' | 'staging' | 'prod';

async function getEnvironment(): Promise<Environment> {
  if (!AppEnv) {
    throw new Error('AppEnv module not available');
  }

  return AppEnv.getEnvironment();
}
```

You do not need to know Kotlin/Swift for this — you just need:
- The module name (`AppEnv`).
- Available methods (`getEnvironment`, `getBuildNumber`, etc.).
- Expected return types (agreed upon with the native team).

---

#### Native UI Components (consumption from the Web perspective)

A **Native UI Component** is a React component whose implementation is native.

```tsx
import { requireNativeComponent } from 'react-native';

type MyNativeChartProps = {
  data: number[];
  color?: string;
};

const MyNativeChart = requireNativeComponent<MyNativeChartProps>('MyNativeChart');

export function SalesChart() {
  return <MyNativeChart data={[10, 20, 30]} color="#3366FF" />;
}
```

You use `<MyNativeChart />` like any other React component.  
The difference is:

- Who implements `MyNativeChart` is the native team (Android/iOS).
- Layout/performance issues may come from the native implementation.
- Available props and events are defined by the native team.

---

### Errors from Native (stacktrace)

In RN, stacktraces can come from the JS layer or the native layer:

- JS errors: generally point to `.js/.tsx` files in the stack.
- Native errors: may appear with Android messages (`java.lang...`) or iOS (`-[UIView ...]` etc.)

Your role as a web developer:

- Be able to identify when the error is **not** pure JS.
- Have the minimum information to pass on to the native team:
  - Screen/flow where it happened.
  - Steps to reproduce.
  - Full stacktrace (Android Logcat / Xcode console).

---

### Practical Exercise

Build a small integration module (from the JS perspective), assuming the native team has already created `NativeModules.AppEnv` with:

- `getEnvironment(): 'dev' | 'staging' | 'prod'`
- `getBuildNumber(): string`

1. Implement a JS service:

   ```tsx
   import { NativeModules } from 'react-native';

   const { AppEnv } = NativeModules;

   type Environment = 'dev' | 'staging' | 'prod';

   export async function loadAppEnv() {
     if (!AppEnv) {
       throw new Error('AppEnv module not available');
     }

     const env: Environment = await AppEnv.getEnvironment();
     const buildNumber: string = await AppEnv.getBuildNumber();

     return { env, buildNumber };
   }
   ```

2. Implement a `useAppEnv()` hook that:
   - Loads this information on mount.
   - Displays a different banner for `dev` vs `prod`.

3. Handle the error case (missing module or call failure) by displaying a default message in dev.

---

### Study Materials

- [Native Modules Overview — React Native Docs](https://reactnative.dev/docs/native-modules-intro)
- Article: *React Native for Web Developers — Understanding Native Integration*
- Video: *Native Modules for React Developers (Conceptual Overview)*

---

Next → **[Mobile Performance](../modulo-performance/topico-performance-mobile-web)**