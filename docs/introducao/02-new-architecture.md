---
title: New Architecture Deep Dive
---

# New Architecture Deep Dive

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/intro_02-new-arch.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> React Native 0.76+ — New Architecture is **on by default**. This is what runs your app.

## JSI — JavaScript Interface

The old Bridge serialized every JS↔Native call to JSON. That meant:

```
JS: I need the height of this view
→ Serialize to JSON string
→ Post message across the bridge (async)
→ Native receives, deserializes JSON
→ Measures view
→ Serialize result to JSON
→ Post message back (async)
→ JS receives, deserializes JSON
→ Now JS has the height (but render already happened)
```

With **JSI**, JavaScript holds a **direct C++ reference** to native objects:

```
JS: I need the height of this view
→ Call C++ method directly via JSI reference (synchronous)
→ Return value immediately
```

This is how **Reanimated 3** achieves 60/120fps animations — the animation code runs on the UI thread via a JSI worklet, with zero round-trips to the JS thread.

### What JSI Enables
- Synchronous native calls
- Shared memory between JS and native
- Multiple JS engines (Hermes is default; V8 and JSC are possible)
- The foundation for TurboModules and Fabric

---

## Fabric — The New Renderer

Fabric rewrites the UI rendering pipeline in shared C++ (works on iOS, Android, and eventually Windows/macOS).

### Key Benefits

**1. Synchronous layout**
The old renderer could only do async layout passes. Fabric can measure and commit layouts synchronously, which means:
- No layout flicker
- Accurate measurements before paint
- `onLayout` events fire synchronously

**2. Concurrent React support**
Fabric integrates with React's Concurrent renderer. Your RN app can now use:
- `useTransition` — mark state updates as non-urgent
- `Suspense` for data fetching
- `startTransition` for keeping the UI responsive

**3. View flattening**
Fabric automatically flattens redundant nested views — a performance optimization that was previously manual.

---

## TurboModules — Lazy Native Modules

Old native modules were all **eagerly initialized** at startup — even if you never used them. TurboModules are:

- **Lazy**: initialized only on first access
- **Type-safe**: backed by a code-generated TypeScript interface via **Codegen**
- **Synchronous-capable**: can be called synchronously via JSI when needed

### Codegen
TurboModules use a code generation step. You define your native module's interface in TypeScript:

```typescript
// NativeCalculator.ts — the spec file
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  add(a: number, b: number): Promise<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCalculator');
```

Codegen reads this spec and generates the C++ glue code automatically. No more manually writing JNI (Android) or Objective-C bridges (iOS).

---

## Hermes — The JavaScript Engine

[Hermes](https://hermesengine.dev/) is Meta's JavaScript engine, optimized for React Native:

| Feature | V8 / JSC | Hermes |
|---------|----------|--------|
| Compilation | JIT (at runtime) | AOT bytecode (at build time) |
| TTI (Time to Interactive) | Slower | Faster |
| Memory footprint | Higher | Lower |
| Debugging | Chrome DevTools | Chrome DevTools + React DevTools |

Hermes compiles your JS to bytecode **at build time**, so the app starts faster — no JIT warm-up on the user's device.

**Hermes has been the default engine since RN 0.70** and is deeply integrated with the New Architecture.

---

## Summary: What Changed

| Concern | Old Architecture | New Architecture |
|---------|-----------------|------------------|
| JS↔Native communication | Async JSON bridge | Direct JSI C++ references |
| UI rendering | Async, platform-specific | Shared C++ Fabric renderer |
| Native modules | Eagerly loaded, untyped | Lazy TurboModules, typed via Codegen |
| Concurrent React | Not supported | Fully supported |
| Animation perf | Bridge bottleneck | UI-thread worklets (Reanimated 3) |
| Startup time | All modules initialized | Lazy init + Hermes AOT |

---

## Resources

| Resource | Type | Link |
|---|---|---|
| New Architecture overview | Official Docs | [reactnative.dev/architecture/landing-page](https://reactnative.dev/architecture/landing-page) |
| JSI explained | Official Docs | [reactnative.dev/architecture/runtime-execution-environments](https://reactnative.dev/architecture/runtime-execution-environments) |
| Hermes engine | Official | [hermesengine.dev](https://hermesengine.dev) |
| Codegen docs | Official | [reactnative.dev/docs/the-new-architecture/pillars-codegen](https://reactnative.dev/docs/the-new-architecture/pillars-codegen) |
| BolderApps — JSI & Fabric deep dive (2026) | Tutorial | [bolderapps.com blog](https://www.bolderapps.com/blog-posts/react-natives-2026-new-architecture-how-jsi-and-fabric-finally-killed-the-performance-bridge) |

Next → **[Choose Your Track](./choose-your-track)**
