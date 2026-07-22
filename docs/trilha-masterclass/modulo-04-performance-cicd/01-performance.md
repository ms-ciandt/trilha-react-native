---
title: "Performance — Startup & Hermes"
---

# Performance

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc04_01_performance.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> **Module 04 — React Native Masterclass**
> Target: senior engineers shipping RN 0.76+ apps who need measurable, production-grade performance improvements — not tips, but a systematic methodology.

---

## 1. Startup Time

Startup time is the single metric users notice most. On React Native 0.76+, cold start touches four sequential phases. Optimising the wrong phase wastes effort.

### The four phases of cold start

```
App launch (OS creates process)
        │
        ├─ Phase 1: Native initialisation
        │     ReactHost.start() / RCTHost.start()
        │     Hermes VM creation, GC init, JNI bridge setup
        │     Typical: 50–150 ms (Android low-end), 30–80 ms (iOS)
        │
        ├─ Phase 2: Bundle load
        │     mmap .hbc from disk (release) or HTTP from Metro (debug)
        │     Hermes evaluates top-level requires
        │     Typical: 100–500 ms depending on bundle size
        │
        ├─ Phase 3: JS module initialisation
        │     AppRegistry.registerComponent, Redux store creation,
        │     I18n init, analytics init, etc.
        │     Typical: 50–400 ms (highly app-specific)
        │
        └─ Phase 4: First render
              React reconciler, Fabric Shadow Tree, Yoga layout,
              first MountingTransaction → pixels on screen
              Typical: 30–100 ms
```

**Time to Interactive (TTI)** = Phase 1 + 2 + 3 + 4. On a mid-range Android device, 800 ms TTI is attainable; 500 ms is excellent.

### Measuring startup correctly

Never measure startup with `console.log` timestamps — they are on the JS thread, which starts after Phase 1 completes. Use platform tracing tools to capture the full picture.

**Android — Perfetto**

```bash
# Capture a cold start trace (kill app first)
adb shell am force-stop com.yourapp
adb shell am start -S -W com.yourapp/.MainActivity \
  --ez "react_native_jsi_tracing" true

# In Android Studio: Profiler → CPU → System Trace → Record
# Or via CLI:
python3 $ANDROID_HOME/platform-tools/systrace/systrace.py \
  -t 8 \
  -o cold_start.html \
  gfx view dalvik react_native_new_arch
```

Open `cold_start.html` in Perfetto UI (`ui.perfetto.dev`). Look for:

| Slice | Measures |
|---|---|
| `ReactHost::start` | Phase 1 |
| `HermesExecutor::loadBundle` | Phase 2 mmap |
| `Runtime::callFunction` (AppRegistry.runApplication) | Phase 3 |
| `Fabric::commit` (first commit) | Phase 4 |

**iOS — Instruments**

Open Instruments → App Launch template → Profile your app. The "Time Profiler" lane shows JS thread work; "React Native" lane (enabled via `RCTPROFILE=1` environment variable) shows RN-specific slices.

```swift
// Add to AppDelegate for custom timing
import os.signpost
let log = OSLog(subsystem: "com.yourapp", category: .pointsOfInterest)
os_signpost(.begin, log: log, name: "BundleLoad")
// ... bundle loads ...
os_signpost(.end, log: log, name: "BundleLoad")
```

These `os_signpost` markers appear as named intervals in Instruments, letting you pinpoint exactly where time is spent.

### Phase 1 optimisation: eager ReactHost warmup

```kotlin
// Android — warm up before user arrives at RN screen
class MyApplication : Application() {
    val reactHost: ReactHost by lazy { buildReactHost() }

    override fun onCreate() {
        super.onCreate()
        // Start eagerly — Hermes init happens in background thread
        // Cost: ~10 MB extra RAM always. Benefit: ~200 ms off first RN screen
        reactHost.start()
    }
}
```

```swift
// iOS — same pattern
func application(_ application: UIApplication,
    didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Hermes starts asynchronously; by the time user taps into RN, it is ready
    ReactNativeHost.shared.start()
    return true
}
```

**Trade-off:** always costs RAM even if the user never opens an RN screen. Use conditional warmup if your user funnel shows only 30–40% of users ever reach an RN surface:

```kotlin
// Warm up only after the user authenticates (higher intent signal)
loginViewModel.onLoginSuccess.observe(this) {
    reactHost.start()
}
```

### Phase 2 optimisation: inline requires

Inline requires defer `require()` evaluation until the first call site executes. Without inline requires, every module's top-level code runs as the bundle is evaluated:

```javascript
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,   // defer all requires to first use
        experimentalImportSupport: false,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

With `inlineRequires: true`, this:

```javascript
// Before transform (your source)
import { HeavyCalendar } from 'heavy-calendar-lib';  // 200 KB parsed at load
export function ScheduleScreen() { return <HeavyCalendar />; }
```

Becomes at evaluation time:

```javascript
// After Metro transform (in the bundle)
export function ScheduleScreen() {
  const { HeavyCalendar } = require('heavy-calendar-lib'); // deferred until screen renders
  return React.createElement(HeavyCalendar, null);
}
```

**Measuring the gain:** run `npx react-native bundle --profile` before and after. Look at `"Total load time"` in the output.

### Phase 3 optimisation: defer non-critical init

Move everything that is not required for the first frame out of the top-level bundle execution:

```typescript
// BAD — all init runs before first render
import Analytics from './Analytics';       // loads SDK
import CrashReporter from './Crash';       // loads SDK
import I18n from './I18n';               // reads 500 KB JSON
import { store } from './store';          // runs all reducers

AppRegistry.registerComponent('App', () => App);
```

```typescript
// GOOD — split across interaction scheduler
import { InteractionManager } from 'react-native';

AppRegistry.registerComponent('App', () => App);

// These run after the first frame is painted
InteractionManager.runAfterInteractions(async () => {
  const { initAnalytics } = await import('./Analytics');
  const { initCrash }     = await import('./Crash');
  await Promise.all([initAnalytics(), initCrash()]);
});
```

`InteractionManager.runAfterInteractions` queues work until all touch animations are complete and at least one frame has been committed. This alone can cut Phase 3 from 300 ms to 80 ms on the perceived startup path.

### Phase 4 optimisation: avoid work on the first render path

Every component that renders during the first frame has a cost. Common traps:

```typescript
// BAD — synchronous heavy computation during first render
function HomeScreen() {
  // This runs synchronously on the JS thread before any frame is painted
  const recommended = products.sort(heavyComparator).slice(0, 20);
  return <ProductList items={recommended} />;
}

// GOOD — defer sorting, show skeleton first
function HomeScreen() {
  const [recommended, setRecommended] = useState<Product[]>([]);

  useEffect(() => {
    // Runs after first frame is committed
    setRecommended(products.sort(heavyComparator).slice(0, 20));
  }, []);

  if (recommended.length === 0) return <ProductListSkeleton />;
  return <ProductList items={recommended} />;
}
```

```typescript
// BAD — deep component tree with many layout passes
<ScrollView>
  {Array.from({ length: 200 }).map(i => <ExpensiveRow key={i} />)}
</ScrollView>

// GOOD — virtualised list, only renders visible rows
<FlashList
  data={items}
  estimatedItemSize={80}
  renderItem={({ item }) => <Row item={item} />}
/>
```

---

## 2. Optimisation with Hermes

### Understanding Hermes' performance model

Hermes does not JIT-compile JavaScript. This is a deliberate design choice: JIT compilation increases RAM and introduces unpredictable pauses (JIT warmup, deoptimisation). Hermes trades peak throughput for consistent, predictable latency — the right trade-off for mobile UIs.

The practical consequence: code that relies on JIT optimisation (tight numeric loops, WASM) is slower in Hermes than JSC. Code that benefits from a smaller GC footprint and faster startup (React rendering, API calls, navigation) is faster.

### Hermes GC configuration

Hermes uses a generational GC with two main heaps:

| Heap | Contains | GC trigger |
|---|---|---|
| Young generation | Recently allocated objects | Minor GC when full (~2–5 ms pause) |
| Old generation | Long-lived objects | Major GC on pressure (~10–50 ms pause) |

Tune GC parameters based on your app's allocation profile:

```kotlin
// Android — HermesExecutorFactory config
HermesExecutorFactory(
    RuntimeConfig.Builder()
        .withGCConfig(
            GCConfig.Builder()
                // Increase young gen for apps with heavy React rendering
                .withInitHeapSize(8 * 1024 * 1024)     // 8 MB initial
                .withMaxHeapSize(256 * 1024 * 1024)    // 256 MB max
                // Occupancy ratio: trigger major GC when heap is 75% full
                .withOccupancyTarget(0.75f)
                .build()
        )
        .build()
)
```

```swift
// iOS — RCTHermesInstance
var config = HermesRuntimeConfig()
config.gcConfig.initHeapSize = 8 * 1024 * 1024
config.gcConfig.maxHeapSize = 256 * 1024 * 1024
config.gcConfig.occupancyTarget = 0.75
```

**Diagnosing GC pressure:** in Perfetto, GC pauses appear as `GC` slices on the JS thread. If you see major GCs running during UI animations, you have an allocation problem — use the Hermes memory profiler.

### Hermes memory profiler (heap snapshot)

```typescript
// In dev build only — record a heap snapshot
import { HermesProfiling } from 'react-native';

async function captureHeapSnapshot() {
  // Snapshot before action
  await HermesProfiling.captureHeapProfile();
  
  // Perform action you suspect allocates heavily
  navigateTo('HeavyScreen');
  
  // Snapshot after action
  const profile = await HermesProfiling.captureHeapProfile();
  // Saved to device: /data/data/com.yourapp/files/hermes-*.heaptimeline
}
```

Load the `.heaptimeline` file in Chrome DevTools → Memory tab → Load profile. The timeline view shows object allocations over time; the summary view shows retained size by constructor.

### Hermes sampling profiler (CPU)

```typescript
import { HermesProfiling } from 'react-native';

async function profileAction() {
  HermesProfiling.startSamplingProfiler();
  
  // Action to profile (e.g., navigate + render heavy list)
  await performAction();
  
  const cpuProfile = await HermesProfiling.stopSamplingProfiler();
  // cpuProfile is a JSON string in Chrome CPU profile format
  // Download from device and open in: chrome://inspect → Profiler → Load
}
```

The CPU flame chart shows time distribution across your JS functions. Functions listed at the top of the flame (widest bars) are where the engine spends most time. Common findings:

- Wide bars in `performSelectorOnMainThread` → excessive sync calls to native
- Wide bars in `Object.keys` / `JSON.parse` → unnecessary serialization
- Wide bars in a `filter` / `reduce` → computing derived state on every render instead of memoising

### Worklets (react-native-reanimated)

For animations and gestures that must not involve the JS thread at all, Reanimated 3 introduces **worklets** — functions that run on the UI thread inside a secondary Hermes runtime:

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

// SharedValue lives in the UI thread's Hermes runtime
const offset = useSharedValue(0);

// useAnimatedStyle callback is a worklet — runs on UI thread
const animatedStyle = useAnimatedStyle(() => {
  'worklet';  // marks this as a worklet — compiled separately
  return {
    transform: [{ translateX: offset.value }],
  };
});

// Gesture handler — runs on UI thread, never blocks JS
const gesture = Gesture.Pan()
  .onUpdate((e) => {
    'worklet';
    offset.value = e.translationX;
  })
  .onEnd(() => {
    'worklet';
    offset.value = withSpring(0);  // spring back — runs on UI thread
  });
```

Without worklets, every `onPanResponderMove` would post a message to the JS thread, which would then call `setNativeProps` — adding 1–2 frame latency. With worklets, the animation runs entirely on the UI thread at 120 fps even if the JS thread is busy.

The `'worklet'` directive tells the Reanimated Babel plugin to extract the function and compile it for the UI runtime. Functions marked as worklets cannot use JS closures that reference the main Hermes runtime — they can only use `SharedValue`s and other worklet-compatible values.

---
