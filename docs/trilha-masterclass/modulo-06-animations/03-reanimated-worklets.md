---
title: "Reanimated 3 — Worklets & Shared Values"
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/anim_03_reanimated_worklets.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/anim_03_reanimated_worklets_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

# Reanimated 3 — Worklets & Shared Values

> Reanimated 3 is the production standard for gesture-driven and 120 FPS animations in React Native 0.76+. Its model is architecturally different from the `Animated` API: instead of describing animations declaratively and handing them to native, worklets run actual JavaScript on the UI thread via a second Hermes runtime.

---

## How worklets work

Reanimated's Babel plugin transforms marked functions (worklets) at build time. It serializes the function's source and closure references, and installs them into a second Hermes VM that runs on the UI thread. At runtime, calling a worklet invokes it in that UI-thread VM via JSI — synchronously, within the current frame, without touching the JS thread.

```
Build time:
  ┌─────────────────────────────────────────────┐
  │  Source code                                │
  │                                             │
  │  function animate() {                       │
  │    'worklet';         ◄── directive         │
  │    offset.value = withSpring(200);          │
  │  }                                          │
  │                      │                      │
  │          Babel plugin extracts + serializes │
  └──────────────────────┼──────────────────────┘
                         │
Runtime:                 ▼
  ┌──────────────────────────────────────────────┐
  │  UI Thread Hermes VM                         │
  │                                              │
  │  animate() → installed C function → runs     │
  │  synchronously on UI thread per frame        │
  └──────────────────────────────────────────────┘
```

The `'worklet'` directive is required for any function you write explicitly. Functions passed inline to Reanimated hooks (`useAnimatedStyle`, gesture callbacks) are auto-workletized by the Babel plugin without the directive.

---

## Installation

```bash
npm install react-native-reanimated
```

Add the Babel plugin to `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // must be last plugin
  ],
};
```

The plugin being last is required — it needs to process the final output after all other transforms.

In React Native 0.76+, Reanimated 3 uses the New Architecture by default. No `react-native.config.js` changes or interop flags needed.

---

## `useSharedValue`

The fundamental data primitive. A shared value lives in the UI-thread runtime but is readable and writable from both threads:

```typescript
import { useSharedValue } from 'react-native-reanimated';

function Component() {
  const offset = useSharedValue(0);
  const scale = useSharedValue(1);
  const color = useSharedValue('#3498db');

  // From JS thread — async (synced before next frame)
  const handlePress = () => {
    offset.value = 100;
  };
}
```

**Thread synchronization semantics:**

- **UI thread reads/writes**: synchronous and immediate. The worklet sees the updated value on the same frame.
- **JS thread writes**: the write is async — the UI-thread runtime receives it before the next frame. Reading `.value` on the JS thread immediately after writing returns the old value.
- **JS thread reads**: blocks the JS thread until the UI thread delivers the current value. Avoid reading `.value` frequently on the JS thread.

**Supported value types:** numbers, strings (angle, percentage), objects, arrays, colors (hex, RGB, HSL, named CSS colors).

**Pitfalls:**

```typescript
// Wrong: destructuring breaks the proxy
const { value } = useSharedValue(0);

// Wrong: mutating object properties in-place
obj.value.x = 10;  // UI thread does not see this change

// Correct: assign a new object
obj.value = { ...obj.value, x: 10 };

// Correct for arrays: use .modify() to avoid a full copy
arr.modify(a => {
  a.push(newItem);
  return a;
});

// Wrong: read/write during render
function Bad() {
  const sv = useSharedValue(0);
  sv.value = 1;  // mutating during render — undefined behavior
}
```

---

## `useDerivedValue`

Creates a computed read-only shared value that reacts to other shared values. The callback runs on the UI thread:

```typescript
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';

const rotation = useSharedValue(0);

// Derived string for CSS rotation
const rotationDeg = useDerivedValue(() => `${rotation.value}deg`);

// Derived clamped position
const clampedX = useDerivedValue(() =>
  Math.min(Math.max(offset.value, 0), maxWidth)
);
```

Use `useDerivedValue` for pure transformations. For side effects (calling `runOnJS`, comparing current vs previous), use `useAnimatedReaction`.

---

## `useAnimatedReaction`

Watches a derived value and runs a worklet when it changes. Receives both current and previous values:

```typescript
import { useAnimatedReaction, useSharedValue, runOnJS } from 'react-native-reanimated';

const scrollY = useSharedValue(0);
const [activeSection, setActiveSection] = React.useState(0);

useAnimatedReaction(
  // prepare: runs on UI thread, returns memoized derivation
  () => Math.floor(scrollY.value / SECTION_HEIGHT),
  // react: runs on UI thread when prepare result changes
  (currentSection, previousSection) => {
    if (currentSection !== previousSection) {
      runOnJS(setActiveSection)(currentSection);
    }
  }
);
```

**Critical pitfall:** Never write to the same shared value that `prepare` reads from. This creates an infinite loop — the value changes, `prepare` runs, the side effect updates the value, `prepare` runs again.

---

## `useAnimatedStyle`

Creates a style object computed on the UI thread. Apply to `Animated.View` (from Reanimated) components:

```typescript
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';

function DraggableCard() {
  const offset = useSharedValue({ x: 0, y: 0 });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offset.value.x },
      { translateY: offset.value.y },
    ],
  }));

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <Text>Drag me</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    height: 120,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
});
```

**Rules:**

- Never mutate shared values inside the callback: `sv.value = withTiming(1)` inside `useAnimatedStyle` creates an infinite loop.
- Keep only dynamic parts in `useAnimatedStyle`. Static styles (`colors`, `borders`, `padding`) go in `StyleSheet.create()` — they don't need per-frame evaluation.
- Animated styles take precedence over static styles regardless of array ordering.
- Unmounting does not reset animated props. Explicitly cancel or reset if needed.

---

## Animation builders

### `withTiming`

Duration-based tween:

```typescript
import { withTiming, Easing } from 'react-native-reanimated';

offset.value = withTiming(200, {
  duration: 400,
  easing: Easing.out(Easing.cubic),
});
```

### `withSpring`

Physics spring. Two configuration models — choose one:

```typescript
// Physics model
offset.value = withSpring(200, {
  stiffness: 900,
  damping: 120,
  mass: 4,
  velocity: gestureVelocity,  // hand off from gesture for smooth transfer
  overshootClamping: false,
});

// Duration model (predictable timing)
offset.value = withSpring(200, {
  duration: 550,
  dampingRatio: 0.8,  // < 1 = bouncy, 1 = critically damped, > 1 = overdamped
});
```

Spring supports all value types: numbers, `'90deg'`, `'50%'`, hex colors, objects, arrays.

### `withDecay`

Momentum deceleration from a velocity:

```typescript
import { withDecay } from 'react-native-reanimated';

offset.value = withDecay({
  velocity: gestureVelocityX,   // px/s from gesture release
  deceleration: 0.998,           // closer to 1 = slides farther
  clamp: [0, maxOffset],         // optional hard boundaries
  rubberBandEffect: true,        // elastic rebound at clamp edges
  rubberBandFactor: 0.6,
});
```

### Sequencing builders

```typescript
import { withSequence, withDelay, withRepeat, withTiming, withSpring } from 'react-native-reanimated';

// Shake animation
offset.value = withSequence(
  withTiming(-12, { duration: 50 }),
  withRepeat(withTiming(12, { duration: 50 }), 6, true),
  withTiming(0, { duration: 50 })
);

// Delayed entrance
opacity.value = withDelay(150, withTiming(1, { duration: 300 }));

// Infinite pulse
scale.value = withRepeat(
  withTiming(1.15, { duration: 700 }),
  -1,    // -1 = infinite
  true   // reverse = ping-pong
);
```

### Completion callbacks

Every builder accepts a callback as the last argument. The callback is auto-workletized:

```typescript
offset.value = withTiming(200, { duration: 300 }, (finished) => {
  if (finished) {
    // Chain next animation
    scale.value = withSpring(1.1);
  }
});
```

`finished` is `false` if the animation was interrupted by another assignment to the shared value before it completed.

---

## `useAnimatedScrollHandler`

Tracks scroll events on the UI thread, eliminating the JS thread from the scroll-to-animation path:

```typescript
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

function ParallaxScreen() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onBeginDrag: () => {
      isScrolling.value = true;
    },
    onMomentumEnd: () => {
      isScrolling.value = false;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * -0.4 }],
    opacity: 1 - scrollY.value / 300,
  }));

  return (
    <View>
      <Animated.Image source={heroImage} style={[styles.hero, headerStyle]} />
      <Animated.ScrollView onScroll={scrollHandler}>
        {/* content */}
      </Animated.ScrollView>
    </View>
  );
}
```

Supported events: `onScroll`, `onBeginDrag`, `onEndDrag`, `onMomentumBegin`, `onMomentumEnd`.

---

## Thread communication

### `runOnJS`

Dispatch to the JS thread from a worklet. The call is asynchronous — the worklet continues executing; the JS function runs when the JS event loop processes the scheduled message:

```typescript
import { runOnJS } from 'react-native-reanimated';

const panGesture = Gesture.Pan()
  .onEnd((event) => {
    // UI thread — cannot call React setState directly
    if (event.translationY > DISMISS_THRESHOLD) {
      runOnJS(onDismiss)();        // schedules on JS thread
      runOnJS(setVisible)(false);  // React state update
    }
  });
```

### `runOnUI`

Schedule a worklet execution from the JS thread:

```typescript
import { runOnUI } from 'react-native-reanimated';

// From JS thread, schedule work on UI thread
function resetAnimation() {
  runOnUI(() => {
    'worklet';
    offset.value = withSpring(0);
    scale.value = withSpring(1);
  })();  // note: double call — runOnUI returns a function
}
```

---

## Writing helper worklets

Extract repeated UI-thread logic into standalone worklets with the `'worklet'` directive:

```typescript
function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

// Used inside useAnimatedStyle or gesture callbacks
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: clamp(offset.value, -200, 200) }],
}));
```

Functions without the `'worklet'` directive cannot be called from a worklet — the UI-thread VM has no reference to them.

---

## Checking which thread you are on

Useful for debugging and assertions:

```typescript
function myWorklet() {
  'worklet';
  if (!global._WORKLET) {
    throw new Error('Must run on UI thread');
  }
  // ... UI thread logic
}
```

`global._WORKLET` is `true` only inside the Reanimated UI-thread runtime.

---

## Common pitfalls

**Calling `setState` inside a worklet**

```typescript
// Wrong — crashes or produces undefined behavior
useAnimatedStyle(() => {
  setCount(offset.value); // React is not thread-safe from UI thread
  return { transform: [{ translateX: offset.value }] };
});

// Correct
useAnimatedStyle(() => {
  return { transform: [{ translateX: offset.value }] };
});

useAnimatedReaction(
  () => Math.round(offset.value),
  (current, previous) => {
    if (current !== previous) runOnJS(setCount)(current);
  }
);
```

**Capturing stale closures in worklets**

Worklets capture their closure at build time. Variables that change between renders are not automatically updated in the worklet. Use shared values as the live data channel:

```typescript
// Wrong — stale closure: threshold captured once, never updates
const threshold = someState.threshold;
const panGesture = Gesture.Pan().onEnd(() => {
  if (offset.value > threshold) { ... } // stale!
});

// Correct — shared value is always current
const thresholdSV = useSharedValue(someState.threshold);
useEffect(() => { thresholdSV.value = someState.threshold; }, [someState.threshold]);

const panGesture = Gesture.Pan().onEnd(() => {
  if (offset.value > thresholdSV.value) { ... }
});
```

**Forgetting `useCallback` wrap breaks auto-workletization**

Callbacks defined with `useCallback` lose their worklet marker. Add `'worklet'` explicitly:

```typescript
// Wrong — useCallback breaks auto-workletization
const onUpdate = useCallback((event) => {
  offset.value = event.translationX; // runs on JS thread
}, []);

// Correct
const onUpdate = useCallback((event) => {
  'worklet';
  offset.value = event.translationX;
}, []);
```
