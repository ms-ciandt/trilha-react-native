---
title: "Animated API — New Architecture"
---

# Animated API — New Architecture

> The `Animated` API ships with React Native core and covers the majority of UI transitions without additional dependencies. This document covers its internals under New Architecture, where the bridge is gone and JSI makes the setup path synchronous.

---

## Core concepts

### `Animated.Value` and `Animated.ValueXY`

`Animated.Value` holds a single mutable number that the animation runtime tracks. Never create it during render — always use `useRef`:

```typescript
import { useRef } from 'react';
import { Animated } from 'react-native';

function Card() {
  const opacity = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // ...
}
```

`useRef` ensures the `Animated.Value` instance persists across renders. `.current` unwraps the ref so the value is accessed directly. Do not destructure animated values — `const { x, y } = pan` breaks the internal proxy that tracks dependencies.

### `useNativeDriver: true`

In React Native 0.76+, `useNativeDriver` is a **required field**. Omitting it throws a warning; in a future major it will throw an error.

```typescript
Animated.timing(opacity, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,  // required — no exceptions
}).start();
```

**What it controls:** whether the animation loop runs on the UI thread (native) or the JS thread.

- `true` — the animation description is passed synchronously to native via JSI. The native animation driver runs the frame loop, interpolating the value and updating the view prop every frame without touching the JS thread.
- `false` — JS recalculates the value on every frame and dispatches it to native. JS thread contention drops frames.

**What `useNativeDriver: true` supports:**

| Property | Supported |
|---|---|
| `transform` (all variants) | Yes |
| `opacity` | Yes |
| `width`, `height` | No — triggers layout pass |
| `margin`, `padding` | No — triggers layout pass |
| `backgroundColor`, `color` | No — color interpolation runs in JS |
| `borderRadius` | No |

The constraint is architectural: layout properties require Yoga to recalculate the layout tree on every frame, which cannot be offloaded to the native animation driver.

---

## Animation builders

### `Animated.timing`

Duration-based linear interpolation with configurable easing:

```typescript
import { Animated, Easing } from 'react-native';

Animated.timing(value, {
  toValue: 1,
  duration: 400,
  easing: Easing.out(Easing.cubic),
  delay: 100,
  useNativeDriver: true,
}).start(({ finished }) => {
  if (finished) {
    // Animation completed (not interrupted)
    console.log('done');
  }
});
```

Common easing patterns:

```typescript
Easing.linear                 // constant velocity
Easing.ease                   // CSS ease equivalent
Easing.out(Easing.quad)       // decelerates — good for entrances
Easing.in(Easing.quad)        // accelerates — good for exits
Easing.inOut(Easing.cubic)    // accelerate then decelerate
Easing.back(1.5)              // overshoot backwards before moving forward
Easing.elastic(1)             // spring-like overshoot
Easing.bounce                 // bounces at the end
Easing.bezier(0.25, 0.1, 0.25, 1.0)  // custom cubic bezier
```

### `Animated.spring`

Physics-based spring simulation. Does not have a fixed duration — it runs until the value settles within a threshold:

```typescript
Animated.spring(value, {
  toValue: 1,
  friction: 7,       // damping — higher = less oscillation
  tension: 40,       // stiffness — higher = faster spring
  useNativeDriver: true,
}).start();
```

Alternative physics parameters (choose one set, not both):

```typescript
Animated.spring(value, {
  toValue: 1,
  stiffness: 180,
  damping: 20,
  mass: 1,
  velocity: 0,          // initial velocity (matches gesture velocity)
  overshootClamping: false,  // true = no overshoot
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
  useNativeDriver: true,
});
```

### `Animated.decay`

Starts at a given velocity and decelerates to rest. Ideal for momentum-release interactions:

```typescript
Animated.decay(pan, {
  velocity: { x: gestureState.vx, y: gestureState.vy },
  deceleration: 0.997,   // 0–1, higher = slower stop
  useNativeDriver: true,
}).start();
```

---

## Interpolation

`interpolate()` maps an input range to an output range. The input is any `Animated.Value`; the output can be numbers, strings (including units), or colors:

```typescript
const rotation = scrollY.interpolate({
  inputRange: [0, 300],
  outputRange: ['0deg', '360deg'],
  extrapolate: 'clamp',  // clamp | extend | identity
});

const scale = scrollY.interpolate({
  inputRange: [0, 100, 200],
  outputRange: [1, 1.2, 0.8],
  extrapolate: 'clamp',
});

const backgroundColor = progress.interpolate({
  inputRange: [0, 1],
  outputRange: ['rgb(255, 255, 255)', 'rgb(0, 122, 255)'],
});
```

Multi-segment interpolation (piecewise linear):

```typescript
const headerOpacity = scrollY.interpolate({
  inputRange: [0, 50, 100, 150],
  outputRange: [0, 0, 1, 1],
  extrapolate: 'clamp',
});
```

Each segment between consecutive input values is interpolated independently with the configured easing.

---

## Composition

### `Animated.sequence`

Runs animations one after another. Each animation waits for the previous to complete:

```typescript
Animated.sequence([
  Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
  Animated.spring(scale, { toValue: 1.05, useNativeDriver: true }),
  Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
]).start();
```

### `Animated.parallel`

Runs all animations simultaneously:

```typescript
Animated.parallel([
  Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
  Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
], { stopTogether: true }).start();
```

`stopTogether: true` (default) stops all animations when any one is stopped. Set to `false` for independent lifetimes.

### `Animated.stagger`

Like `parallel` but each animation starts after a cumulative delay:

```typescript
const items = [card1Opacity, card2Opacity, card3Opacity];

Animated.stagger(
  80,   // stagger interval in ms
  items.map(anim =>
    Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true })
  )
).start();
```

### `Animated.loop`

Repeats an animation indefinitely or a fixed number of times:

```typescript
const pulse = Animated.loop(
  Animated.sequence([
    Animated.timing(scale, { toValue: 1.1, duration: 800, useNativeDriver: true }),
    Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
  ]),
  { iterations: -1, resetBeforeIteration: false }
);

pulse.start();

// Stop later
pulse.stop();
```

`resetBeforeIteration: false` makes each loop continuation start from where the previous left off rather than snapping back to the initial value.

---

## Scroll tracking

`Animated.event` maps a native event's nested value directly into an `Animated.Value`. When `useNativeDriver: true`, the mapping runs on the UI thread — the JS thread is not involved on each scroll event:

```typescript
const scrollY = useRef(new Animated.Value(0)).current;

<Animated.ScrollView
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  )}
  scrollEventThrottle={16}
/>
```

`scrollEventThrottle={16}` limits scroll events to one per ~16 ms (one per frame). Higher values reduce JS events but may introduce lag in JS-driven derivatives.

Deriving a sticky header from scroll position:

```typescript
const headerTranslate = scrollY.interpolate({
  inputRange: [0, HEADER_HEIGHT],
  outputRange: [0, -HEADER_HEIGHT],
  extrapolate: 'clamp',
});

const headerOpacity = scrollY.interpolate({
  inputRange: [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
  outputRange: [1, 1, 0],
  extrapolate: 'clamp',
});

<Animated.View style={{
  transform: [{ translateY: headerTranslate }],
  opacity: headerOpacity,
}}>
  <Header />
</Animated.View>
```

---

## Animatable components

Only components built with `Animated.createAnimatedComponent` accept animated values as props:

```typescript
// Built-in
Animated.View
Animated.Text
Animated.Image
Animated.ScrollView
Animated.FlatList

// Custom
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedCustomCard = Animated.createAnimatedComponent(CustomCard);
```

The wrapped component must forward its `ref` to the underlying native view. Functional components need `forwardRef`:

```typescript
const AnimatedIcon = Animated.createAnimatedComponent(
  React.forwardRef<View, IconProps>((props, ref) => (
    <View ref={ref} {...props} />
  ))
);
```

---

## Value listeners and `addListener`

Listen to animated value changes on the JS thread (for debugging or driving non-animatable properties):

```typescript
const id = opacity.addListener(({ value }) => {
  console.log('current opacity:', value);
});

// Remove when no longer needed (avoids memory leak)
opacity.removeListener(id);

// Or remove all listeners
opacity.removeAllListeners();
```

`addListener` callbacks run on the JS thread. Never use them per-frame for driving animations — that negates the native driver. Use them for one-shot events (animation crossing a threshold) with debouncing.

---

## Gotchas and pitfalls

**Forgetting to call `.start()`**

```typescript
// Wrong — creates animation but does not run it
Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true });

// Correct
Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true }).start();
```

**Mixing native and non-native drivers in a `parallel`**

All animations inside a `parallel` must use the same `useNativeDriver` value. Mixing throws a runtime error in RN 0.76+.

```typescript
// Error: mixed native drivers
Animated.parallel([
  Animated.timing(opacity, { toValue: 1, useNativeDriver: true }),
  Animated.timing(width, { toValue: 200, useNativeDriver: false }), // crashes
]);

// Correct: run separately
Animated.timing(opacity, { toValue: 1, useNativeDriver: true }).start();
Animated.timing(width, { toValue: 200, useNativeDriver: false }).start();
```

**Reading `.current` value during render**

```typescript
// Wrong — reads internal tracked value, unreliable
const currentValue = opacity._value;

// Correct — use addListener or useAnimatedStyle (Reanimated)
```

**Not resetting before looping**

When an animation loops and the initial `toValue` equals the final resting value, use `setValue` to reset:

```typescript
Animated.loop(
  Animated.sequence([
    Animated.timing(rotate, { toValue: 1, duration: 500, useNativeDriver: true }),
    Animated.timing(rotate, { toValue: 0, duration: 0, useNativeDriver: true }),
  ])
).start();
```
