---
title: "Reanimated: Animations on the UI Thread"
sidebar_label: "Reanimated"
sidebar_position: 3
---

## Video Overview

> Video for this topic coming soon.

## Why the Animated API Is Not Enough

React Native's built-in `Animated` API can run simple animations on the UI thread with `useNativeDriver: true`. But it has a hard limit: it only handles `transform` and `opacity`. Any animation that changes layout (`width`, `height`, `padding`, `top`) must be driven from the JS thread — which means frame drops whenever the JS thread is busy.

`react-native-reanimated` v3 removes this limit entirely. All animation logic runs as **JSI worklets** on the UI thread — the same thread as the Android `Choreographer`. The JS thread is never involved during the animation.

| Animated API | Reanimated v3 |
|-------------|---------------|
| `useNativeDriver: true` required | Always on the UI thread — no flag needed |
| Only `transform` + `opacity` natively | All style properties |
| Layout-driven animations: JS thread only | Layout animations: UI thread via Fabric |
| No gesture integration | Deep `react-native-gesture-handler` integration |
| No shared values between gesture + animation | `useSharedValue` — shared across threads |

---

## Installation

```bash
npm install react-native-reanimated
npx expo install react-native-reanimated  # for Expo
```

Add the Babel plugin (`babel.config.js`):

```js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['react-native-reanimated/plugin'], // must be last
};
```

---

## Core Concepts

### useSharedValue — Animated.Value equivalent

A `useSharedValue` lives on **both** the JS thread and the UI thread. When you update it from JS, the UI thread receives it synchronously via JSI and repaints in the same frame — no async message passing.

```tsx
import { useSharedValue, withTiming, withSpring } from 'react-native-reanimated';

function Component() {
  // Initial value: 0. Readable and writable from both threads.
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  function fadeIn() {
    // withTiming: linear or eased animation
    opacity.value = withTiming(1, { duration: 300 });
  }

  function bounce() {
    // withSpring: physics-based spring animation
    scale.value = withSpring(1.2, { damping: 10, stiffness: 200 });
  }
}
```

### useAnimatedStyle — drives style from shared values

```tsx
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

function AnimatedCard() {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  // This function runs on the UI thread — NOT the JS thread
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  function handlePress() {
    scale.value = withSpring(0.95, {}, () => {
      // Callback also runs on UI thread
      scale.value = withSpring(1);
    });
  }

  return (
    // Animated.View — understands animatedStyle
    <Animated.View style={[styles.card, animatedStyle]}>
      <Pressable onPress={handlePress}>
        <Text>Press me</Text>
      </Pressable>
    </Animated.View>
  );
}
```

---

## Animation Primitives

### withTiming — linear / eased animation

```tsx
import { withTiming, Easing } from 'react-native-reanimated';

// Linear
opacity.value = withTiming(1, { duration: 200 });

// Custom easing
translateX.value = withTiming(100, {
  duration: 400,
  easing: Easing.out(Easing.cubic),
});

// Callback on completion (UI thread)
opacity.value = withTiming(0, { duration: 300 }, (finished) => {
  if (finished) runOnJS(onHidden)(); // call back to JS thread
});
```

### withSpring — physics-based

```tsx
import { withSpring } from 'react-native-reanimated';

// Default spring
scale.value = withSpring(1.1);

// Tuned spring
scale.value = withSpring(1.1, {
  damping: 15,     // higher = less oscillation (like Android's spring animation damping)
  stiffness: 300,  // higher = faster
  mass: 1,
});
```

### withSequence and withDelay

```tsx
import { withSequence, withDelay, withTiming } from 'react-native-reanimated';

// Shake animation — sequence of translations
translateX.value = withSequence(
  withTiming(-10, { duration: 50 }),
  withTiming(10, { duration: 50 }),
  withTiming(-10, { duration: 50 }),
  withTiming(0, { duration: 50 }),
);

// Delay before starting
opacity.value = withDelay(500, withTiming(1, { duration: 300 }));
```

### withRepeat — looping

```tsx
import { withRepeat, withTiming } from 'react-native-reanimated';

// Pulse animation — loops forever, reverses each iteration
scale.value = withRepeat(
  withTiming(1.05, { duration: 800 }),
  -1,    // -1 = infinite
  true,  // reverse each iteration
);
```

---

## Gesture Integration — react-native-gesture-handler

The most powerful Reanimated pattern: gestures driving animations entirely on the UI thread — no JS involvement during the gesture.

```bash
npm install react-native-gesture-handler
npx expo install react-native-gesture-handler
```

### Draggable Card

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

function DraggableCard({ onDismiss }: { onDismiss: () => void }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Runs on UI thread — 60fps with zero JS involvement
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd((event) => {
      const shouldDismiss = Math.abs(event.translationX) > 150;
      if (shouldDismiss) {
        const direction = event.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * 500, { duration: 300 }, () => {
          runOnJS(onDismiss)(); // back to JS thread to update React state
        });
      } else {
        // Snap back
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, style]}>
        <Text>Drag me</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

> **`runOnJS(fn)()`** — the bridge between the UI thread worklet and the JS thread. Use it to call React state setters or callbacks from inside a worklet. Any function that updates React state must go through `runOnJS`.

---

## Layout Animations — LayoutAnimation Replacement

Reanimated's `Layout` animations animate items entering, exiting, or changing layout — equivalent to `LayoutAnimation` but running on the UI thread.

```tsx
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Layout,
} from 'react-native-reanimated';

function AnimatedList({ items }: { items: Item[] }) {
  return (
    <View>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          entering={FadeIn.duration(200)}        // appears with fade
          exiting={SlideOutLeft.duration(200)}   // disappears sliding left
          layout={Layout.springify()}            // other items animate to fill the gap
        >
          <ItemRow item={item} />
        </Animated.View>
      ))}
    </View>
  );
}
```

---

## Interpolation — animate based on scroll position

```tsx
import { useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

function CollapsibleHeader() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, 100],          // input range
      [200, 60],         // output range (200px tall → 60px tall)
      Extrapolate.CLAMP  // don't go below 60 or above 200
    ),
    opacity: interpolate(scrollY.value, [0, 100], [1, 0], Extrapolate.CLAMP),
  }));

  return (
    <>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text style={styles.headerTitle}>My App</Text>
      </Animated.View>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
        {/* content */}
      </Animated.ScrollView>
    </>
  );
}
```

---

## Study Materials

### Official Documentation

- [Reanimated v3 — Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [Reanimated — Worklets](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/worklets)
- [react-native-gesture-handler — Documentation](https://docs.swmansion.com/react-native-gesture-handler/)

### Interactive Examples

- [Reanimated Playground](https://docs.swmansion.com/react-native-reanimated/examples/)

### Videos

- [William Candillon — Reanimated v3 Full Course](https://www.youtube.com/watch?v=yz9E10Dq1fY)
- [Catalin Miron — Swipeable Cards with Reanimated](https://www.youtube.com/watch?v=ubbMRCEJORk)

---

## What's Next

Animations covered. Next: memoisation and re-render control — `memo`, `useMemo`, `useCallback`, and the rules for when to use each.

➡ [Re-render Optimisation: memo, useMemo, useCallback](./04-memo-usememo-usecallback)
