---
title: Animations with Reanimated v3
---

# Animations with Reanimated v3

## The iOS Animation Model You Already Know

On iOS, you have two primary animation systems. `UIView.animate` handles simple property transitions on the main thread, while `Core Animation` (CAAnimation, CABasicAnimation, CASpringAnimation) runs directly on the render server — a separate process that animates layer properties independently of the main thread. This means even if your main thread is busy processing data, Core Animation keeps animating smoothly.

React Native's animation story maps directly to this split.

## Animated API: The UIView.animate Equivalent

The built-in `Animated` API is the starting point. Without `useNativeDriver`, animations run on the JS thread — analogous to modifying `frame` or `transform` directly in a `DispatchQueue.main.async` loop. It works, but it's slow and will drop frames under any JS thread pressure.

```javascript
import { Animated, Easing } from 'react-native';
import { useRef, useEffect } from 'react';

function FadeInView({ children }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity }}>
      {children}
    </Animated.View>
  );
}
```

`useNativeDriver: true` is the critical flag. With it, the animation is serialized and handed off to the native side before the first frame, where it runs on the UI thread without any further JS involvement. This is conceptually equivalent to `CABasicAnimation` — you describe the animation declaratively, hand it to the render server, and JS is no longer in the loop.

The limitation: only layout-independent properties are supported with `useNativeDriver`. `opacity`, `transform` (translate, scale, rotate) — yes. `width`, `height`, `backgroundColor` — no, because those require layout passes.

## Reanimated v3: Worklets Running on the UI Thread

React Native Reanimated v3 goes further than `useNativeDriver`. Rather than serializing a fixed animation description, Reanimated compiles JavaScript functions — called worklets — to run directly on the UI thread. This is closer to having a `CADisplayLink` callback that executes your Swift logic at 60fps on the render side, without a thread hop.

The mental model shift: in Reanimated, your animation logic *is* native code at runtime, even though you write it in JavaScript.

Install Reanimated v3 alongside the Babel plugin:

```bash
npm install react-native-reanimated
```

In `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```

## useSharedValue: @State on the UI Thread

`useSharedValue` is the Reanimated equivalent of a `@State` property that lives on the UI thread. Reads and writes from the UI thread (inside worklets) are synchronous. Reads from the JS thread are also possible but asynchronous in nature.

```javascript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

function ScaleButton() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.box, animatedStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      />
    </Animated.View>
  );
}
```

The function passed to `useAnimatedStyle` is a worklet. Reanimated detects this automatically due to the Babel plugin, which rewrites it to run on the UI thread. When `scale.value` changes, the style recomputes on the UI thread and the view updates — no JS round-trip.

## withTiming and withSpring: UIView Animation Equivalents

`withTiming` maps to `UIView.animate(withDuration:)`. It drives a value from its current state to a target over a fixed duration with an easing curve.

```javascript
import { withTiming, Easing } from 'react-native-reanimated';

// Equivalent to UIView.animate(withDuration: 0.3, options: .curveEaseInOut)
scale.value = withTiming(1.2, {
  duration: 300,
  easing: Easing.inOut(Easing.ease),
});
```

`withSpring` maps to `CASpringAnimation` or `UIView.animate(withDuration:delay:usingSpringWithDamping:)`. Instead of a fixed duration, you describe the physical characteristics of the spring:

```javascript
import { withSpring } from 'react-native-reanimated';

// damping and stiffness match CASpringAnimation properties directly
scale.value = withSpring(1, {
  damping: 15,
  stiffness: 200,
  mass: 1,
});
```

The parameters map almost 1:1 with `CASpringAnimation`:
- `stiffness` — spring stiffness
- `damping` — damping coefficient
- `mass` — mass of the simulated object
- `velocity` — initial velocity (useful when chaining from gesture velocity)

## Sequencing and Combining Animations

Reanimated provides `withSequence`, `withDelay`, and `withRepeat` for composing animations — equivalent to chaining `CAAnimationGroup` or using `completion` handlers.

```javascript
import {
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
} from 'react-native-reanimated';

// Shake animation — equivalent to a CAKeyframeAnimation on position.x
translateX.value = withSequence(
  withTiming(-10, { duration: 50 }),
  withRepeat(withTiming(10, { duration: 100 }), 3, true),
  withTiming(0, { duration: 50 })
);

// Entrance with delay
opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
```

## Gesture Handlers: UIGestureRecognizer Equivalent

`react-native-gesture-handler` provides the equivalent of `UIGestureRecognizer` subclasses. It processes gestures natively, on the UI thread, and integrates directly with Reanimated so that gesture state updates drive animations without any JS involvement.

```bash
npm install react-native-gesture-handler
```

Wrap your app root in `GestureHandlerRootView`:

```javascript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Navigation />
    </GestureHandlerRootView>
  );
}
```

A draggable card — the equivalent of a `UIPanGestureRecognizer` updating a view's `center`:

```javascript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

function DraggableCard() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0, { velocity: 0 });
      translateY.value = withSpring(0, { velocity: 0 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]} />
    </GestureDetector>
  );
}
```

The `onBegin`, `onUpdate`, and `onEnd` callbacks are worklets. The gesture delta updates shared values synchronously on the UI thread, and `useAnimatedStyle` recomputes the transform — all without touching JS. This is the Reanimated equivalent of driving a `CGAffineTransform` directly from a `UIPanGestureRecognizer` handler.

Gesture composition with `Gesture.Simultaneous` and `Gesture.Exclusive` maps to `gestureRecognizer(_:shouldRecognizeSimultaneouslyWith:)` in `UIGestureRecognizerDelegate`.

## Custom Drawing with React Native Skia

`react-native-skia` provides a 2D drawing API backed by the Skia graphics library, which runs on Metal on iOS. The mental model is similar to drawing in a `CALayer` subclass via `draw(in ctx: CGContext)`, except Skia runs on the UI thread and integrates with Reanimated shared values for animated drawing.

```bash
npm install @shopify/react-native-skia
```

```javascript
import { Canvas, Circle, Fill } from '@shopify/react-native-skia';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function PulseCircle() {
  const radius = useSharedValue(50);

  const tap = Gesture.Tap().onEnd(() => {
    radius.value = withSpring(80, {}, () => {
      radius.value = withSpring(50);
    });
  });

  return (
    <GestureDetector gesture={tap}>
      <Canvas style={{ flex: 1 }}>
        <Fill color="white" />
        <Circle cx={200} cy={200} r={radius} color="#007AFF" />
      </Canvas>
    </GestureDetector>
  );
}
```

Skia's `Canvas` renders via Metal, frame-by-frame, reading shared values synchronously from the UI thread. Complex paths, gradients, blur effects, and image compositing are available — equivalent to what you can do with `CGContext` and `Core Image` in a `CALayer`.

## ProMotion and 120fps

On ProMotion devices (iPhone 13 Pro and later), the display runs at up to 120Hz. React Native's renderer and Reanimated both support 120fps through the native frame scheduler.

With the New Architecture (Fabric), the render loop uses `CADisplayLink` internally and adapts to the display's actual refresh rate. No explicit configuration is needed — animations driven by Reanimated worklets will automatically run at 120fps on ProMotion hardware, since they execute on the UI thread in sync with `CADisplayLink` callbacks.

Verify the frame rate during development with the in-app dev menu performance monitor, or by attaching Instruments with the Core Animation template. ProMotion only activates when the system determines the content warrants a higher refresh rate — continuous animation from a Reanimated worklet or a Skia canvas qualifies.

For Expo managed projects, ProMotion support is enabled by default in SDK 56 with New Architecture.

## Performance Debugging

The key question is always: where is the animation running? If it's on the JS thread, any JS work will cause dropped frames. Tools to verify:

- **Flipper + Hermes Profiler** — shows JS thread activity during animation. A healthy animation with Reanimated should show no JS activity after the gesture or trigger is initiated.
- **Instruments, Core Animation template** — shows GPU and render server activity. A Reanimated animation driven by worklets appears here as native layer updates, identical to `CAAnimation`.
- **React Native DevTools** — the Performance tab shows JS and UI thread frame timelines. Worklets running on the UI thread appear as UI thread work, not JS thread work.

A common mistake when migrating from the basic `Animated` API: forgetting `useNativeDriver: true` and wondering why the animation stutters during navigation. Reanimated avoids this entirely — worklets always run on the UI thread by design.

## Summary

| iOS Concept | React Native Equivalent |
|---|---|
| `UIView.animate` | `Animated.timing` with `useNativeDriver: true` |
| `CASpringAnimation` | `withSpring` in Reanimated |
| `CADisplayLink` workload | Reanimated worklet on the UI thread |
| `@State` driving UI | `useSharedValue` |
| `UIPanGestureRecognizer` | `Gesture.Pan()` from gesture-handler |
| `CALayer` / `CGContext` drawing | React Native Skia canvas |
| ProMotion 120Hz | Automatic with Fabric + Reanimated |

The mental shift from iOS to React Native animations is smaller than it appears. The hard parts — keeping animation logic off the main thread, using spring physics, composing gestures — map directly. Reanimated v3 and react-native-gesture-handler together give you the same control over animation performance that Core Animation gives you on the native side.
