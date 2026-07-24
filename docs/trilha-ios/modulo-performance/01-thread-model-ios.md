---
title: Thread Model — iOS Perspective
---

# Thread Model — iOS Perspective

If you have shipped UIKit or SwiftUI applications, you already carry a strong mental model of threading: the main thread owns the UI, Grand Central Dispatch moves work off it, and violating that contract causes either dropped frames or runtime crashes. React Native's threading model maps directly onto these same primitives. Understanding the mapping lets you diagnose performance problems with tools you already know and apply solutions that feel familiar.

## How iOS Threads Map to React Native Threads

A running React Native application maintains three primary threads. Each one has a direct analogue in the GCD world you already know.

### Main Thread (UI Thread)

This is the same main thread that UIKit runs on. React Native renders native views — `UIView`, `UIScrollView`, `UILabel` — through the same `UIApplication` run loop you are already familiar with. Any `UIView` property mutation, gesture recogniser callback, or `CALayer` animation update happens here.

In Swift you reach this thread with `DispatchQueue.main.async { }`. In React Native internal code you will see it called the **UI thread** or **main thread** interchangeably, because the concept is identical: one serialised queue, driven by the run loop, where all native view mutations must land.

### JS Thread

React Native runs your JavaScript inside Hermes, the JavaScript engine that ships with RN 0.76+. Hermes executes on a dedicated background thread — not the main thread. This is the thread that runs your component render functions, event handlers, `useEffect` bodies, and all business logic written in JavaScript.

Think of it as a `DispatchQueue(label: "com.rn.js", qos: .userInteractive)` that is managed entirely by the engine. You do not create or configure it. You cannot schedule work onto it directly from Swift. The boundary between this thread and the native side is JSI (JavaScript Interface), a C++ layer that allows synchronous calls in both directions without message serialisation.

### Shadow Thread (Fabric Layout Thread)

Fabric, the rendering system that became the default in RN 0.76, introduced a dedicated thread for layout computation. When your component tree changes, Fabric recomputes Yoga layout (the flexbox engine) on this shadow thread, then commits the resulting view mutations to the main thread in a single, atomic transaction.

In UIKit terms, this is comparable to a background `DispatchQueue` that calculates `CGRect` frames for every view in the hierarchy and then delivers the entire batch to `DispatchQueue.main.async` as one coherent update. The shadow thread is internal to React Native; you interact with it only indirectly through Fabric's commit mechanism.

## What Fabric Changed About Layout Timing

Before Fabric, React Native used the **Bridge** — an asynchronous JSON serialisation channel between JavaScript and native code. A layout pass worked roughly like this:

1. JS thread serialises a view tree description to JSON.
2. JSON is queued and sent across the bridge asynchronously.
3. Native side deserialises, runs Yoga layout on the main thread, mutates views.

The asynchronous nature meant that layout was always at least one frame behind events. Gestures felt slightly disconnected. List scrolling could expose blank cells before content arrived.

Fabric eliminates this round trip. Layout computation now happens synchronously on the shadow thread using C++ Yoga directly. The commit to the main thread is a synchronous native call through JSI, not a serialised message queue. From your iOS perspective, this is the same improvement you get when you move from `NotificationCenter` cross-thread notifications to direct method calls: the latency disappears because the indirection disappears.

The practical consequence is that Fabric components can respond to scroll position, gesture state, and animated values without waiting for a bridge round trip. This is what makes `react-native-reanimated` capable of 60fps and 120fps animations driven by values that never leave the native side.

## DispatchQueue.main.async → runOnUI() and useNativeDriver

In UIKit, if you want to update a view property from a background queue, you write:

```swift
DispatchQueue.main.async {
    self.myLabel.alpha = 0.5
}
```

React Native Reanimated exposes the equivalent pattern as `runOnUI()`:

```javascript
import { runOnUI } from 'react-native-reanimated';

runOnUI(() => {
  'worklet';
  mySharedValue.value = 0.5;
})();
```

The `worklet` directive tells the Reanimated compiler to copy this function to the UI thread's JavaScript runtime (a separate Hermes instance that runs on the main thread). The call happens synchronously on the UI thread, just as `DispatchQueue.main.async` schedules a block on the main run loop.

For animations that do not require worklets, `useNativeDriver: true` moves the interpolation entirely onto the main thread, bypassing the JS thread for every animation frame. This is the equivalent of using `CABasicAnimation` or `UIViewPropertyAnimator` directly instead of updating a property in a `DispatchQueue.global().async` loop: the animation engine runs natively without crossing thread boundaries on every tick.

```javascript
Animated.timing(opacity, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true, // interpolation runs on main thread, not JS thread
}).start();
```

When `useNativeDriver` is `false` (the default for layout properties like `width` and `height`), every frame requires a round trip through the JS thread. At 60fps that is 16ms per frame. At 120fps ProMotion it is 8ms. Any JS thread work that takes longer than the frame budget causes dropped frames, even if the main thread itself is idle.

## Blocking the Main Thread — Same Symptoms as UIKit

Every iOS developer knows the consequences of blocking the main thread: the UI freezes, touch events queue up unanswered, and the system watchdog eventually terminates the process if the block persists beyond a few seconds. React Native's main thread is the same thread with the same consequences.

Common React Native patterns that block the main thread:

**Synchronous native module calls.** A TurboModule method annotated without `async` in its TypeScript specification executes synchronously on the calling thread. If that call performs I/O, database access, or heavy computation, and it is invoked from code running on the main thread, the run loop stalls.

**Layout measurement with `measure()`.** The `measure()` API on a ref reads the current frame of a view. Depending on implementation, it may need to synchronise with the shadow thread commit, which can introduce a brief stall on the main thread.

**Long synchronous worklets.** A worklet that runs on the UI thread and performs heavy computation will stall the main thread exactly as a UIKit `viewDidLoad` that blocks on network data does. Keep worklets short.

On ProMotion displays (iPad Pro, iPhone 15 Pro and later) the frame budget drops to 8ms at 120fps. The Core Animation system will promote to 120fps automatically when content is scrolling or animating. A JS thread that consistently takes 10–12ms per frame will produce visible jank at 120fps that was invisible at 60fps, because the frame deadline now arrives before the JS work completes.

Instruments' **Core Animation** instrument is the right tool to confirm ProMotion regressions. The `com.apple.main-thread` thread in the Time Profiler trace will show native view mutations and Core Animation commit work, separate from the JS thread work.

## InteractionManager.runAfterInteractions()

UIKit developers frequently use `DispatchQueue.main.asyncAfter(deadline: .now() + 0.3)` to defer expensive work until after a transition animation completes, avoiding frame drops during navigation push or modal presentation.

React Native provides `InteractionManager.runAfterInteractions()` for the same purpose:

```javascript
import { InteractionManager } from 'react-native';

useEffect(() => {
  const handle = InteractionManager.runAfterInteractions(() => {
    // Heavy computation, data parsing, or secondary data fetching.
    // Runs only after all in-flight animations and interactions complete.
    loadSecondaryContent();
  });

  return () => handle.cancel();
}, []);
```

`InteractionManager` maintains a registry of active interactions (animations, navigation transitions). Work submitted via `runAfterInteractions` is queued in the JS thread's task queue and dispatched only when the interaction registry is empty. This is semantically equivalent to `DispatchQueue.main.asyncAfter` with a deadline that adapts to actual animation duration rather than a hard-coded time offset.

A common iOS migration pattern: any work you would have placed in `viewDidAppear` after a short `asyncAfter` delay belongs in `runAfterInteractions` in React Native. Prefetching images, loading non-critical data, and running analytics calls are good candidates.

## Hermes Garbage Collection vs Swift ARC

Swift uses Automatic Reference Counting: memory is reclaimed immediately when the last reference to an object drops to zero. There are no GC pauses, no stop-the-world phases. The overhead is distributed — a retain/release pair on every reference assignment — but it is deterministic and pause-free.

Hermes uses a **generational garbage collector** with a concurrent marking phase and a stop-the-world compact phase. During the compact phase, the JS thread is paused while live objects are relocated. On most screens this pause is short enough to be invisible (sub-millisecond for typical heaps). On screens that accumulate large object graphs — extensive Redux stores, unbounded caches, large image descriptors held in JS — the compact phase can take several milliseconds, producing a frame drop that shows up as a spike on the JS thread in the Time Profiler.

Mitigation strategies that parallel iOS memory management:

| Swift / iOS pattern | React Native equivalent |
|---|---|
| `weak var` to break retain cycles | Avoiding closures that capture large object graphs indefinitely |
| `autoreleasepool { }` in tight loops | Batching list data processing with `InteractionManager` |
| Instruments Allocations instrument | Hermes heap snapshot via Chrome DevTools memory tab |
| Reduce peak heap to avoid jetsam | Paginating list data, unsubscribing unused stores |

The key difference is predictability: ARC gives you deterministic deallocation you can reason about at the call site. Hermes GC introduces non-deterministic pauses that correlate with heap size and allocation rate. If a screen has intermittent frame drops that do not correlate with any visible work, a Hermes GC pause is a likely candidate.

## Reading the JS Thread in Instruments Time Profiler

Instruments Time Profiler is the correct tool for profiling React Native performance on a real device. When you profile a React Native app, the JS thread appears as a foreign thread — it is not listed under the familiar `com.apple.main-thread` label.

Look for a thread named `com.facebook.react.JavaScript` or simply `JavaScript` in the thread list. On Hermes this thread runs inside the Hermes engine process space, embedded in your app, but its call stack uses different symbolication than your Swift code.

Useful setup:

1. Build the app in **release mode** with the `Profile` scheme so that Hermes bytecode is optimised and the frame rate matches production.
2. Enable **source maps** by setting `HERMES_ENABLE_DEBUGGER=1` and generating a source map during the Hermes compile step. With a source map loaded, Instruments can resolve JS stack frames to their original TypeScript source lines.
3. In the Time Profiler, filter by the JS thread to isolate JavaScript work from native thread activity.

A healthy JS thread profile shows brief bursts of activity (render cycles, event handlers) followed by idle time well within the frame deadline. A problematic profile shows the JS thread occupying most of the frame budget continuously, or showing a single tall stack during what should be an idle period (a GC pause or a synchronous module call).

The shadow thread, when visible, appears as `com.facebook.react.ShadowQueue` or similar. In a Fabric app, you should see layout commits on this thread as short, infrequent bursts — not as continuous activity. Continuous shadow thread work indicates that your component tree is re-rendering and re-computing layout at a rate higher than necessary, which points to missing memoisation or excessive state updates.

## Summary

| iOS Concept | React Native Equivalent |
|---|---|
| `DispatchQueue.main` | Main / UI thread (native view mutations) |
| Background `DispatchQueue` | JS thread (Hermes, your JavaScript code) |
| Layout pass before `drawRect:` | Fabric shadow thread Yoga layout commit |
| `DispatchQueue.main.async { }` | `runOnUI()` in Reanimated |
| `CABasicAnimation` on main thread | `useNativeDriver: true` Animated |
| `asyncAfter` to defer post-transition work | `InteractionManager.runAfterInteractions()` |
| ARC deterministic deallocation | Hermes GC with occasional compact pauses |
| Instruments Time Profiler | Same tool — find JS thread as foreign thread |

The threading contract in React Native is the same contract UIKit enforces: keep the main thread free, push work to background threads, and commit results to the UI in atomic batches. Fabric and JSI make that contract more efficient by eliminating serialisation overhead. The debugging tools — Instruments, the Core Animation instrument, the Time Profiler — are the same tools you already use; only the thread names change.
