---
title: "JS Thread vs UI Thread"
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/anim_01_threading_model.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# JS Thread vs UI Thread

> **Module 06 — Animations**
> Target: senior engineers who need to understand exactly *where* their animation code runs and *why* that determines whether they get 120 FPS or dropped frames.

---

## The two threads that matter for animations

Every React Native app has several threads, but two dominate animation work.

**JS Thread** runs the Hermes VM. It executes all JavaScript: React renders, state updates, business logic, network callbacks. There is exactly one JS thread per app. Blocking it for more than 16 ms causes a dropped frame anywhere on screen.

**UI Thread** (Main Thread on iOS, Main Thread on Android) is the thread the OS uses to dispatch touch events, run the layout engine, and commit draw commands to the GPU. Anything that creates, mutates, or measures a native view must do so on the UI thread. The UI thread also runs Reanimated worklets.

```
┌─────────────────────────────────────────────────────────────────┐
│  PROCESS                                                        │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │    JS Thread (Hermes) │    │         UI Thread            │  │
│  │                      │    │                              │  │
│  │  React render tree   │    │  Native layout (Yoga/Fabric)  │  │
│  │  State management    │    │  Touch event dispatch        │  │
│  │  Network/IO          │    │  Reanimated worklets         │  │
│  │  Business logic      │    │  Native view mutations       │  │
│  │                      │    │                              │  │
│  └──────────┬───────────┘    └──────────────────────────────┘  │
│             │  JSI (synchronous C++ bindings)                   │
│             └────────────────────────────────────────────────►  │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  Background Threads  │    │   Render Thread (Android)    │  │
│  │  (network, storage)  │    │   GPU command recording      │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## What changed with the New Architecture

### Old Architecture: the async bridge

In the legacy architecture, JS and native communicated through a JSON-serialized message queue — the Bridge. Every native call was asynchronous:

```
JS Thread                Bridge               UI Thread
    │                      │                      │
    │──── serialize ──────►│                      │
    │                      │──── deserialize ────►│
    │                      │                      │──── execute
    │                      │◄─── serialize ────────│
    │◄─── deserialize ─────│                      │
```

An `Animated.Value` without `useNativeDriver: true` had to cross this bridge on every frame to update native view props. At 60 FPS that means 60 round-trips per second — each adding serialization latency, each competing with state updates and renders flowing through the same queue.

Even `useNativeDriver: true` was limited: the animation description was sent over the bridge once (serialized as a JSON payload), and native executed the loop. This worked, but setup latency was measurable and the API surface was constrained to whatever could be described declaratively upfront.

### New Architecture: JSI direct bindings

JSI (JavaScript Interface) replaces the bridge with direct C++ method bindings accessible from the Hermes VM. There is no serialization, no queue, no async round-trip:

```typescript
// Old bridge: async, serialized
NativeModules.MyModule.doSomething(arg, callback);

// JSI: synchronous, direct C++ call
const result = global.myJSIModule.doSomethingSync(arg);
```

For animations, JSI enables three things that were impossible before:

1. **Reanimated worklets**: A second Hermes runtime runs on the UI thread. Worklet functions execute there via JSI, reading and writing shared values synchronously within a single frame.

2. **Synchronous layout reads**: `ref.current?.measure()` can now return a value synchronously instead of via callback, enabling layout-driven animations without async chains.

3. **Fabric concurrent rendering**: The renderer can interrupt low-priority work (list updates) to process urgent gestures, preventing gesture-driven animations from competing with background renders.

---

## Thread assignment: what runs where

| Code | Thread | Reason |
|---|---|---|
| `useState`, `useEffect`, React renders | JS | Hermes VM |
| `Animated.Value` without `useNativeDriver` | JS | Each frame recalculated in JS |
| `Animated.Value` with `useNativeDriver: true` | UI | Native loop, no JS per frame |
| `useSharedValue`, `useAnimatedStyle` callbacks | UI | Reanimated worklet runtime |
| `runOnJS(fn)` inside a worklet | JS (scheduled) | Dispatches to JS event loop |
| Gesture Handler 2 callbacks (with Reanimated) | UI | RNGH runs on UI thread |
| `InteractionManager.runAfterInteractions` | JS | Deferred to next JS idle slot |
| `setTimeout`, `requestAnimationFrame` | JS | Part of Hermes runtime |

---

## The 16 ms budget

At 60 FPS the display refreshes every 16.67 ms. At 120 Hz (ProMotion iOS, high-refresh Android) every 8.33 ms. Both threads contribute to getting pixels on screen:

```
Frame N
  │
  ├─ UI Thread: receive vsync signal
  ├─ UI Thread: run Reanimated worklets → update shared values
  ├─ UI Thread: Fabric commits pending mutations from JS
  ├─ UI Thread: Yoga layout pass (if layout changed)
  ├─ UI Thread: Record draw commands → GPU
  │
  └─ JS Thread: run React reconciler for next frame
               compute state updates
               schedule Fabric mutations
```

If the JS thread takes 30 ms for a render, the next frame's Fabric mutations are not ready — the UI thread has nothing to commit and the frame is dropped. Crucially, **worklets on the UI thread are not affected**: they continue executing at full frame rate even when the JS thread is busy.

This is the core reason to move animation logic from JS to the UI thread via Reanimated.

---

## Frame drop anatomy

### Scenario A: Animated without native driver

```
Frame  │ JS Thread                         │ UI Thread
──────────────────────────────────────────────────────
N      │ recalc value → send to native (5ms)│ receive value, set prop
N+1    │ recalc value → send to native (5ms)│ receive value, set prop
N+2    │ [state update: 30ms] ─────────────►│ no new value → STALE FRAME
N+3    │ recalc value → send (5ms)          │ receive, set prop
```

Frame N+2 is dropped because the JS thread was busy with a state update and could not recalculate the animation value in time.

### Scenario B: Reanimated worklet

```
Frame  │ JS Thread                         │ UI Thread
──────────────────────────────────────────────────────
N      │ (React render: 10ms)              │ worklet runs, updates transform
N+1    │ (state update: 30ms) ─────────────│ worklet runs, updates transform
N+2    │ (state update continues) ──────────│ worklet runs, updates transform
N+3    │ render complete                   │ worklet runs, updates transform
```

The animation runs at full FPS regardless of JS thread load. The worklet on the UI thread is never blocked by JS work.

---

## `InteractionManager`: deferring work past animations

`InteractionManager` tracks active animations and touch interactions. Tasks registered with `runAfterInteractions` are held in a queue until all animations complete:

```typescript
import { InteractionManager } from 'react-native';

function navigateToDetailScreen() {
  // Start the transition animation
  navigation.navigate('Detail');

  // Defer heavy work until the animation finishes
  InteractionManager.runAfterInteractions(() => {
    fetchDetailData();     // heavy network + parse
    initializeChart();     // complex computation
  });
}
```

Animations that should not block this queue (decorative, looping background effects) can opt out:

```typescript
Animated.loop(
  Animated.timing(pulseOpacity, {
    toValue: 0.3,
    duration: 1200,
    useNativeDriver: true,
    isInteraction: false,  // does not hold the runAfterInteractions queue
  })
).start();
```

Manual interaction handles for custom animation systems:

```typescript
const handle = InteractionManager.createInteractionHandle();

startMyCustomAnimation({
  onComplete: () => {
    InteractionManager.clearInteractionHandle(handle);
    // runAfterInteractions tasks now drain
  },
});
```

---

## Thread communication patterns

### From worklet to JS thread

Never call React state setters directly from a worklet — they run on the UI thread and React is not thread-safe. Use `runOnJS`:

```typescript
import { runOnJS } from 'react-native-reanimated';

const dragGesture = Gesture.Pan()
  .onEnd((event) => {
    // This callback runs on the UI thread
    if (event.translationY > 200) {
      runOnJS(setBottomSheetOpen)(false); // schedules on JS event loop
    }
  });
```

### From JS thread to worklet

Use `runOnUI` to schedule a worklet call from the JS thread:

```typescript
import { runOnUI } from 'react-native-reanimated';

function triggerHapticFeedback() {
  runOnUI(() => {
    'worklet';
    // runs on UI thread
    Haptics.impactAsync();
  })();
}
```

### Shared values as the data channel

Shared values are the primary mechanism for passing data between threads without explicit synchronization code:

```typescript
const progress = useSharedValue(0); // lives in UI-thread runtime

// JS thread: write is async (synced before next frame)
progress.value = 0.5;

// Worklet (UI thread): read/write is synchronous
useAnimatedStyle(() => ({
  width: `${progress.value * 100}%`,
}));
```

---

## Checklist: thread hygiene for animations

- Animations targeting `transform` or `opacity` always use `useNativeDriver: true` (Animated API) or Reanimated worklets
- Never call `setState` inside an `Animated` listener that fires per-frame — use `runOnJS` from a Reanimated reaction instead
- Defer expensive post-animation work with `InteractionManager.runAfterInteractions`
- Mark decorative/looping animations as `isInteraction: false`
- Profile in release build — dev mode JS overhead is not representative
