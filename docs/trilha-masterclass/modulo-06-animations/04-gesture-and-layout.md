---
title: "Gesture Handler + Layout Animations"
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/anim_04_gesture_and_layout.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/anim_04_gesture_and_layout_en.vtt" srclang="en" label="English" default>
  Your browser does not support the video tag.
</video>

# Gesture Handler + Layout Animations

> Gesture-driven animations and layout transitions represent the most complex animation work in a React Native app. This document covers Gesture Handler 2 with Reanimated integration, and Reanimated 3's layout animation system under Fabric.

---

## Gesture Handler 2 — architecture

React Native Gesture Handler (RNGH) 2 runs all gesture recognition on the UI thread natively. Combined with Reanimated, gesture callbacks execute as worklets, creating a pipeline where touch → gesture recognition → animation update never touches the JS thread:

```
Touch event (OS)
       │
       ▼
 RNGH (UI thread)
 Gesture recognizer
       │
       ▼
 Gesture callback (worklet, UI thread)
       │  withSpring / withTiming
       ▼
 Shared value update
       │
       ▼
 useAnimatedStyle recomputes
       │
       ▼
 Fabric commits view mutation
       │
       ▼
 Frame on screen
```

The JS thread is never in this path for the animation update. It only gets involved when you explicitly call `runOnJS`.

---

## Installation

```bash
npm install react-native-gesture-handler
```

Wrap the entire app in `GestureHandlerRootView`:

```typescript
// App.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
```

`GestureHandlerRootView` must be as high as possible in the tree. Gestures outside it are not recognized. A common mistake is placing it inside a Navigator, which excludes gesture detection on navigation chrome.

---

## Core gesture types

```typescript
import { Gesture } from 'react-native-gesture-handler';

Gesture.Tap()           // single and multi-tap
Gesture.LongPress()     // held press
Gesture.Pan()           // drag in any direction
Gesture.Pinch()         // two-finger zoom
Gesture.Rotation()      // two-finger rotate
Gesture.Fling()         // fast swipe in a direction
Gesture.ForceTouch()    // iOS 3D Touch / force press
Gesture.Native()        // delegate to native gesture recognizer
Gesture.Manual()        // fully manual state machine
```

---

## Pan gesture with spring return

A draggable card that returns to center on release:

```typescript
import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface DraggableProps {
  onDismiss?: () => void;
}

export function DraggableCard({ onDismiss }: DraggableProps) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Save position at drag start
      startX.value = offsetX.value;
      startY.value = offsetY.value;
      scale.value = withSpring(1.04);
    })
    .onUpdate((event) => {
      offsetX.value = startX.value + event.translationX;
      offsetY.value = startY.value + event.translationY;
    })
    .onEnd((event) => {
      const shouldDismiss = Math.abs(event.translationY) > 150;

      if (shouldDismiss) {
        const direction = event.translationY > 0 ? 600 : -600;
        offsetY.value = withSpring(direction, { velocity: event.velocityY });
        if (onDismiss) runOnJS(onDismiss)();
      } else {
        // Spring back to origin
        offsetX.value = withSpring(0, { velocity: event.velocityX });
        offsetY.value = withSpring(0, { velocity: event.velocityY });
        scale.value = withSpring(1);
      }
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle]} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    height: 380,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
  },
});
```

### Velocity hand-off

Passing `velocity` from the gesture to the spring creates a physically accurate transfer where the animation's initial velocity matches the user's finger speed at release:

```typescript
.onEnd((event) => {
  offsetX.value = withSpring(0, {
    velocity: event.velocityX,  // hand off finger velocity to spring
    damping: 20,
    stiffness: 200,
  });
});
```

Without velocity hand-off, the spring always starts at zero velocity — it feels like the item teleports to a different speed after release.

---

## Pinch + rotation combination

Two-finger gesture composing pinch and rotation simultaneously:

```typescript
export function PhotoViewer({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  // Simultaneous allows both to recognize at the same time
  const composed = Gesture.Simultaneous(pinchGesture, rotationGesture);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${(rotation.value * 180) / Math.PI}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.Image source={{ uri }} style={[styles.image, imageStyle]} />
    </GestureDetector>
  );
}
```

---

## Gesture composition

### `Gesture.Simultaneous`

Both gestures recognize at the same time. Use for pinch + rotate, pan + rotate:

```typescript
const composed = Gesture.Simultaneous(panGesture, pinchGesture);
```

### `Gesture.Exclusive`

The first gesture to activate blocks the others. Use for swipe vs tap disambiguation:

```typescript
const composed = Gesture.Exclusive(swipeGesture, tapGesture);
// If swipe activates, tap is cancelled
```

### `Gesture.Race`

First gesture to activate wins; all others are cancelled immediately:

```typescript
const composed = Gesture.Race(longPressGesture, tapGesture);
```

### `requireExternalGestureToFail`

Useful for nested scroll views — the inner scroll should not activate until the outer swipe gesture fails:

```typescript
const innerPan = Gesture.Pan().requireExternalGestureToFail(outerSwipe);
```

---

## Disabling Reanimated for simple gestures

When a gesture only needs to update React state (no animation on the UI thread), `runOnJS(true)` skips worklet execution entirely:

```typescript
const tapGesture = Gesture.Tap()
  .runOnJS(true)
  .onEnd(() => {
    // Runs on JS thread directly — no worklet overhead
    setCount(c => c + 1);
  });
```

---

## Layout animations with Reanimated 3

Layout animations animate changes in component position/size and component mount/unmount. They are driven by Fabric's native view lifecycle, not by React re-renders.

### Entering and exiting animations

```typescript
import Animated, { FadeIn, FadeOut, SlideInRight, BounceOut } from 'react-native-reanimated';

function NotificationBanner({ visible }: { visible: boolean }) {
  return visible ? (
    <Animated.View
      entering={SlideInRight.duration(350).easing(Easing.out(Easing.cubic))}
      exiting={FadeOut.duration(200)}
      style={styles.banner}
    >
      <Text>New message</Text>
    </Animated.View>
  ) : null;
}
```

**Available preset families:**

| Family | Variants |
|---|---|
| `Fade` | `FadeIn`, `FadeOut`, `FadeInUp`, `FadeInDown`, `FadeInLeft`, `FadeInRight` |
| `Slide` | `SlideInUp`, `SlideInDown`, `SlideInLeft`, `SlideInRight` (+ Out variants) |
| `Zoom` | `ZoomIn`, `ZoomOut`, `ZoomInEasyUp`, `ZoomInRotate` |
| `Bounce` | `BounceIn`, `BounceOut`, `BounceInUp`, `BounceInDown` |
| `Flip` | `FlipInYLeft`, `FlipInXUp`, `FlipOutYRight` |
| `Stretch` | `StretchInX`, `StretchInY`, `StretchOutX` |
| `Roll` | `RollInLeft`, `RollOutRight` |

Modifier chaining:

```typescript
FadeInDown
  .duration(500)
  .delay(100)
  .easing(Easing.out(Easing.back(1.5)))
  .springify()        // convert to spring physics
  .damping(12)
  .stiffness(100)
  .withCallback((finished) => {
    'worklet';
    if (finished) runOnJS(onEntryDone)();
  });
```

### Staggered list entrance

```typescript
function AnimatedList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <Animated.View
          key={item}
          entering={FadeInDown.delay(index * 60).duration(400)}
        >
          <ListItem label={item} />
        </Animated.View>
      ))}
    </View>
  );
}
```

**Performance note:** Instantiate animation presets outside the component or in `useMemo` — creating builder objects inside a map runs on every render:

```typescript
// Better: memoize builders per index
const enteringAnimation = useMemo(
  () => FadeInDown.delay(index * 60).duration(400),
  [index]
);
```

### Layout transitions

Animate items when their layout changes (reorder, resize) within a container:

```typescript
import Animated, { LinearTransition, SequencedTransition } from 'react-native-reanimated';

function ReorderableList({ items }: { items: Item[] }) {
  return (
    <View>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          layout={LinearTransition.duration(300)}
        >
          <ListItem item={item} />
        </Animated.View>
      ))}
    </View>
  );
}
```

**Available layout transitions:**

- `LinearTransition` — uniform movement with configurable easing/spring
- `SequencedTransition` — width first, then height (useful for grid reorders)
- `FadingTransition` — fade out at old position, fade in at new
- `JumpingTransition` — arc/jump movement
- `CurvedTransition` — independent easing per axis (X, Y, width, height)
- `EntryExitTransition` — uses entering/exiting presets for position changes

Springified layout transition:

```typescript
layout={LinearTransition.springify().damping(14).stiffness(120)}
```

### `LayoutAnimationConfig`

Disables layout animations for a subtree without modifying the animated components. Useful for the initial render of a list where you don't want all items to play their entering animation simultaneously:

```typescript
import { LayoutAnimationConfig } from 'react-native-reanimated';

function FirstRenderSuppressed({ items }: { items: Item[] }) {
  const [isFirstRender, setIsFirstRender] = React.useState(true);

  useEffect(() => {
    setIsFirstRender(false);
  }, []);

  return (
    <LayoutAnimationConfig skipEntering={isFirstRender}>
      {items.map((item) => (
        <Animated.View key={item.id} entering={FadeInDown}>
          <ListItem item={item} />
        </Animated.View>
      ))}
    </LayoutAnimationConfig>
  );
}
```

---

## Fabric-specific gotchas for layout animations

### View flattening on Android

Android optimizes the view hierarchy by removing intermediate views with no visual effect (view flattening). This can prevent exiting animations from playing — the native view is removed before Reanimated can intercept.

Fix: set `collapsable={false}` on any `Animated.View` with an `exiting` animation:

```typescript
<Animated.View
  collapsable={false}   // prevents Android from flattening this view
  exiting={FadeOut.duration(300)}
>
  {content}
</Animated.View>
```

### Parent unmount interrupts children's exiting animations

When a non-animated parent unmounts, its children's `exiting` animations trigger — but the parent does not wait for them. The parent view disappears immediately, taking its children with it regardless of animation state.

Workaround: animate the parent itself (not just the children), or use a portal to render the exiting element outside the unmounting parent tree.

### `nativeID` conflict

Reanimated uses `nativeID` internally to track animated views for entering animations. If a parent component sets `nativeID`, entering animations on descendant `Animated.View`s are disabled.

Fix: wrap animated children in an undecorated `View`:

```typescript
// Wrong: parent nativeID interferes
<View nativeID="my-container">
  <Animated.View entering={FadeIn} />  // entering animation disabled
</View>

// Correct: isolation layer
<View nativeID="my-container">
  <View>
    <Animated.View entering={FadeIn} />  // works
  </View>
</View>
```

---

## Complete example: bottom sheet with gesture dismiss

```typescript
import React, { useCallback } from 'react';
import { StyleSheet, Text, Pressable, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_VELOCITY = 800;
const DISMISS_DISTANCE = 200;

interface BottomSheetProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ onClose, children }: BottomSheetProps) {
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow downward drag
      translateY.value = Math.max(0, context.value.y + event.translationY);
    })
    .onEnd((event) => {
      const shouldClose =
        translateY.value > DISMISS_DISTANCE ||
        event.velocityY > DISMISS_VELOCITY;

      if (shouldClose) {
        translateY.value = withTiming(
          SCREEN_HEIGHT,
          { duration: 250 },
          () => runOnJS(onClose)()
        );
      } else {
        translateY.value = withSpring(0, { velocity: event.velocityY });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.sheet, sheetStyle]}
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(250)}
      collapsable={false}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.handle} />
      </GestureDetector>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.6,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#48484a',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
```
