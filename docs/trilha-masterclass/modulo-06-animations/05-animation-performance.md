---
title: "Animation Performance & Profiling"
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/anim_05_animation_performance.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/anim_05_animation_performance_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

# Animation Performance & Profiling

> Smooth animation at 60/120 FPS is a constraint, not a goal. This document covers the exact failure modes that produce frame drops in animated React Native apps, and the profiling workflow to diagnose and fix them in production-grade builds.

---

## The frame budget

| Display | Refresh rate | Frame budget |
|---|---|---|
| Standard mobile | 60 Hz | 16.67 ms |
| ProMotion iOS (iPhone 15 Pro) | 120 Hz | 8.33 ms |
| High-refresh Android | 90–144 Hz | 6.94–11.11 ms |

Both the JS thread and the UI thread must complete their work within the frame budget for the frame to be committed on time. A miss on either thread drops the frame.

```
Vsync signal arrives
        │
  ┌─────▼─────────────────────────────────────────────────────┐
  │  UI Thread budget (16.67ms)                               │
  │                                                           │
  │  ├── Reanimated worklets run (~1ms per worklet)           │
  │  ├── Process pending Fabric mutations from JS             │
  │  ├── Yoga layout pass (only if layout changed)            │
  │  └── Record draw commands → GPU                           │
  └───────────────────────────────────────────────────────────┘
        │
  ┌─────▼─────────────────────────────────────────────────────┐
  │  JS Thread budget (parallel, also 16.67ms)                │
  │                                                           │
  │  ├── React reconciler                                     │
  │  ├── State updates                                        │
  │  ├── Animated value recalculation (if no native driver)   │
  │  └── Schedule next Fabric mutation batch                  │
  └───────────────────────────────────────────────────────────┘
```

The two threads work in parallel. A 30ms JS render does not block the UI thread's worklets — but it delays the next Fabric mutation batch, which may drop frames if the UI content also needs to change.

---

## Root causes of animation frame drops

### 1. Animated without native driver

Every `Animated.timing`/`Animated.spring` call without `useNativeDriver: true` recalculates the animated value on the JS thread each frame and sends it to native. If the JS thread is busy with anything — a state update, a network callback, a Redux selector — the animation value is late and the frame drops.

**Diagnosis:** JS thread consistently near or above 16ms during the animation in the profiler, while the UI thread is idle.

**Fix:** Always use `useNativeDriver: true` for `transform` and `opacity`. For layout properties, migrate to Reanimated worklets.

### 2. Animating layout properties

`width`, `height`, `margin`, `padding`, and `flex` trigger a Yoga layout pass on every frame. This runs on the UI thread but is expensive because it traverses the layout tree from the animated element upward.

**Diagnosis:** UI thread `traversals` slices consistently wide in the Android Profiler, Yoga/layout in Instruments.

**Fix:** Use `transform: [{ scale }]` instead of `width`/`height` when possible. For genuine layout changes, `LayoutAnimation` (deprecated) or Reanimated layout transitions batch the change to a single pass.

### 3. Creating views during animation

Mounting new native views during an animation causes a spike on the UI thread (view creation) and JS thread (reconciliation). This is the "jank on navigate" pattern.

```typescript
// Pattern that causes jank:
function Screen() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    navigation.navigate('Detail'); // triggers transition animation
    setShowContent(true);          // mounts a large component tree mid-animation
  }, []);
}

// Fixed pattern:
function Screen() {
  useEffect(() => {
    navigation.navigate('Detail');
    InteractionManager.runAfterInteractions(() => {
      setShowContent(true); // deferred until transition completes
    });
  }, []);
}
```

### 4. `console.log` in animation hot paths

Every `console.log` call serializes its arguments and writes to the Hermes debug channel. In a 60 FPS animation loop, this is 60 serializations per second. In development this is visible; in production with a debug build, it still costs cycles.

**Fix:** Remove all `console.log` calls from production builds. Configure Babel to strip them:

```javascript
// babel.config.js
module.exports = {
  plugins: [
    ...(process.env.NODE_ENV === 'production' ? ['transform-remove-console'] : []),
  ],
};
```

### 5. Heavy `useAnimatedStyle` callbacks

The `useAnimatedStyle` callback runs on the UI thread on every frame where a dependency changes. Complex computations inside it consume UI thread time.

```typescript
// Slow: computing expensive interpolation per frame
const style = useAnimatedStyle(() => {
  const progress = offset.value / MAX_OFFSET;
  const easedProgress = Easing.bezier(0.33, 1, 0.68, 1)(progress); // expensive
  return { transform: [{ translateX: easedProgress * TARGET }] };
});

// Fast: precompute interpolation as a derived value
const easedOffset = useDerivedValue(() => {
  const progress = offset.value / MAX_OFFSET;
  return progress * TARGET; // linear — Reanimated handles easing in withTiming
});

const style = useAnimatedStyle(() => ({
  transform: [{ translateX: easedOffset.value }],
}));
```

### 6. Large image resizing during animation

Animating `width`/`height` of an `Image` on iOS re-crops the source image from the original resolution on every frame — this is GPU-expensive.

**Fix:** Use `transform: [{ scale }]` instead. The GPU scales the already-decoded texture, which is free compared to decoding.

```typescript
// Slow: re-decodes image each frame on iOS
const style = useAnimatedStyle(() => ({
  width: baseWidth + offset.value,
  height: baseHeight + offset.value,
}));

// Fast: GPU scale, no re-decoding
const style = useAnimatedStyle(() => ({
  transform: [{ scale: 1 + offset.value / baseWidth }],
}));
```

### 7. `needsOffscreenAlphaCompositing` (Android)

On Android, animating opacity on a view that contains overlapping children with transparent areas forces per-frame off-screen alpha compositing — a GPU-expensive operation that renders the entire subtree to an off-screen buffer each frame.

Symptoms: UI thread `DrawFrame` slices are wide, GPU utilization is high.

**Fix:** Restructure the component to avoid overlapping transparent children, or accept the cost for visually complex elements and profile to confirm it is the bottleneck.

---

## Profiling workflow

### Step 1: Profile in release mode

Development mode enables prop validation, extra logging, and Hermes debug instrumentation. JS thread throughput in dev mode is 3–5× slower than production. Frame rate readings from the Metro bundler are not representative.

```bash
# Android release build
npx react-native run-android --mode release

# iOS release build (Xcode)
# Product → Scheme → Edit Scheme → Run → Release
```

### Step 2: Android — Android Studio Profiler + Perfetto

1. Connect the device in profileable mode (release build or `<profileable android:shell="true" />` in `AndroidManifest.xml`).
2. Open Android Studio → App Inspection → Profiler.
3. Select "Capture System Activities" (System Trace).
4. Reproduce the animation.
5. Stop recording.

**Key threads to inspect:**

| Thread name | What to look for |
|---|---|
| `<app package>` (UI thread) | `Choreographer#doFrame`, `traversals` — should finish in < 8ms |
| `mqt_js` | JS thread — continuous execution past 16ms = JS bottleneck |
| `RenderThread` | `DrawFrame` — long slices = GPU overdraw |
| `mqt_native_modules` | Spikes during animation = unnecessary native module calls |

Enable **VSync Highlighting** in the trace viewer: the 16ms boundary lines make overruns immediately visible.

**Export to Perfetto for advanced analysis:**

Perfetto UI (`https://ui.perfetto.dev`) offers cross-thread critical path analysis, flame charts per thread, and slice annotation:

1. Android Studio → Save trace file.
2. Open Perfetto → drag the `.perfetto-trace` or `.json` file.
3. Use "Critical Path" analysis to find the chain of slices that caused a frame drop.

**Reading a flame chart:**

```
Frame N (16ms boundary)
───────────────────────────────────────────────────────────────────────
UI Thread: [Choreographer doFrame 3ms][traversal 2ms][DrawFrame 4ms]
                                                                  ← under budget
JS Thread: [React reconciler: 28ms ████████████████████████████]
                                         ← over budget → frame N+1 mutation delayed
```

### Step 3: iOS — Instruments (Time Profiler + Core Animation)

1. Xcode → Instruments (⌘ + I from the device menu).
2. Select "Core Animation" template (captures FPS, GPU usage, and CPU per-frame).
3. Start recording, reproduce the animation, stop.

**Key instruments:**

- **FPS counter**: should stay at 60 or 120. Dips below 50 are user-visible.
- **CPU usage per thread**: identify the thread consuming excessive CPU per frame.
- **Core Animation**: shows committed layer transactions, GPU fill rate, offscreen rendering.
- **Allocations**: spikes during animation = new objects created per frame (potential GC pressure on Hermes).

**Offscreen rendering on iOS:**

The Core Animation instrument shows "Offscreen Rendered" in red. Offscreen rendering is triggered by:
- `shouldRasterizeIOS: true` (intentional — caches complex subtrees)
- Clipped views with `clipsToBounds` and complex layers
- `renderToHardwareTextureAndroid` equivalent on iOS

Use `shouldRasterizeIOS: true` only for complex, **static** subtrees that animate as a unit (not for content that changes every frame).

### Step 4: React DevTools Profiler

For JS-thread bottlenecks driven by React renders, use React DevTools Profiler:

1. Open Metro bundler → DevMenu → "Open DevTools".
2. Switch to Profiler tab.
3. Check "Record why each component rendered".
4. Start profiling, interact, stop.

Look for:
- Components re-rendering every frame during animation (they should not be)
- Components with expensive render functions in the flame chart
- Components whose re-render is triggered by animation-derived state that should be a shared value instead

---

## Performance rules summary

| Rule | Why |
|---|---|
| `useNativeDriver: true` on all `transform`/`opacity` animations | Removes JS from the animation loop |
| Use Reanimated worklets for gesture-driven animations | UI thread execution, never blocked by JS work |
| Keep `useAnimatedStyle` callbacks lightweight — no math, no allocations | Runs on UI thread every frame |
| Use `InteractionManager.runAfterInteractions` for post-animation work | Prevents JS contention during transitions |
| Mark background/decorative animations with `isInteraction: false` | Doesn't hold the `runAfterInteractions` queue |
| Never animate `width`/`height` — use `transform: [{ scale }]` | Layout props trigger Yoga on every frame |
| Add `collapsable={false}` to exiting `Animated.View`s on Android | Prevents view flattening from killing exit animations |
| Profile in **release** build with Android Studio + Perfetto / Instruments | Dev mode numbers are not representative |
| Remove all `console.log` from production builds | Each call serializes and blocks the JS thread |
| Instantiate Reanimated builders outside render or with `useMemo` | Avoids object allocation per render |
| Do not create new views during an animation | Triggers reconciliation + view traversal spike |
| Use `renderToHardwareTextureAndroid`/`shouldRasterizeIOS` only on static complex subtrees | Reduces per-frame rasterization cost for stable content |

---

## Measuring: `PerformanceObserver` in Hermes

Hermes exposes the Web Performance API. Use it to measure animation frame durations from JS:

```typescript
import { PerformanceObserver } from 'react-native';

const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.duration > 16) {
      console.warn(`Long frame: ${entry.name} took ${entry.duration.toFixed(1)}ms`);
    }
  });
});

observer.observe({ entryTypes: ['measure'] });

// Mark animation boundaries
performance.mark('animation-start');
// ... trigger animation ...
performance.mark('animation-end');
performance.measure('animation', 'animation-start', 'animation-end');
```

This runs on the JS thread and measures JS-side duration only — it does not capture UI thread or GPU time. Use it to detect JS-side work occurring during animations (state updates, memoization misses).
