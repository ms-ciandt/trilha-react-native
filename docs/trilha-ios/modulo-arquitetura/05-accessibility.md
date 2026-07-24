---
title: Accessibility
---

# Accessibility

iOS developers are already familiar with UIAccessibility — the framework that powers VoiceOver, Dynamic Type, and Reduce Motion on Apple platforms. React Native exposes equivalent concepts through its own accessibility API, mapping closely to what you know from UIKit. This document walks through each concept side by side so you can transfer your existing mental model without having to rediscover the fundamentals.

## UIAccessibility traits → accessibilityRole

In UIKit, you assign traits to a view using the `accessibilityTraits` property:

```swift
// Swift
button.accessibilityTraits = [.button, .selected]
label.accessibilityTraits = .header
```

React Native replaces this with the `accessibilityRole` prop, which accepts a single string value:

```tsx
// React Native
<Pressable accessibilityRole="button">
  <Text>Submit</Text>
</Pressable>

<Text accessibilityRole="header">Section Title</Text>
```

The mapping between UIAccessibility traits and React Native roles is mostly one-to-one:

| UIAccessibilityTraits         | accessibilityRole     |
|-------------------------------|-----------------------|
| `.button`                     | `"button"`            |
| `.link`                       | `"link"`              |
| `.header`                     | `"header"`            |
| `.image`                      | `"image"`             |
| `.selected`                   | via `accessibilityState={{ selected: true }}` |
| `.adjustable`                 | `"adjustable"`        |
| `.searchField`                | `"search"`            |
| `.staticText`                 | `"text"`              |
| `.none`                       | `"none"`              |

When a role has no direct equivalent, use `"none"` and combine it with `accessibilityLabel` to provide context. The `accessibilityState` prop handles dynamic traits such as `disabled`, `selected`, `checked`, and `expanded`:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled: isLoading, busy: isLoading }}
  onPress={handleSubmit}
>
  <Text>Submit</Text>
</Pressable>
```

## accessibilityLabel vs UIAccessibility.label

In UIKit, the label that VoiceOver reads aloud is set via the `accessibilityLabel` property on any `UIView`:

```swift
imageView.accessibilityLabel = "Profile photo of Maria Costa"
```

React Native uses the identical prop name:

```tsx
<Image
  source={{ uri: profilePhotoUrl }}
  accessibilityLabel="Profile photo of Maria Costa"
  accessibilityRole="image"
/>
```

The rules carry over directly. A label should be concise, avoid redundancy with the role announcement (VoiceOver appends the role automatically), and describe the purpose rather than the appearance. Decorative images that carry no information should be hidden entirely using `accessible={false}`.

## accessibilityHint vs UIAccessibility.hint

UIKit separates the label from a longer hint that describes what happens when the user interacts with the element:

```swift
button.accessibilityLabel = "Delete"
button.accessibilityHint = "Removes this message from your inbox"
```

React Native exposes the same separation:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Delete"
  accessibilityHint="Removes this message from your inbox"
  onPress={handleDelete}
>
  <Text>Delete</Text>
</Pressable>
```

Users can disable hints in the iOS Accessibility settings. Treat hints as supplemental information, never as the only way to understand what a control does. Keep them in the imperative form ("Removes this message") rather than describing the gesture ("Double tap to remove").

## accessibilityValue

The `accessibilityValue` prop communicates the current value of adjustable controls — the equivalent of `accessibilityValue` on a `UISlider` or custom `UIAccessibilityElement`:

```swift
// Swift
slider.accessibilityValue = "\(Int(slider.value)) percent"
```

React Native accepts an object with `min`, `max`, `now`, and `text` fields:

```tsx
<Slider
  accessibilityRole="adjustable"
  accessibilityLabel="Volume"
  accessibilityValue={{ min: 0, max: 100, now: volume, text: `${volume} percent` }}
  value={volume}
  onValueChange={setVolume}
/>
```

Use `text` when a numeric value alone is not meaningful. For a progress bar, `now` combined with `min` and `max` is sufficient because VoiceOver will announce the percentage automatically.

## isAccessibilityElement → accessible

In UIKit, setting `isAccessibilityElement = false` removes a view from the accessibility tree. The default depends on the view type — `UILabel` and `UIButton` default to `true`, while `UIView` defaults to `false`.

React Native inverts the default for container views. The `accessible` prop, when set to `true` on a `View`, causes that view and all its children to be treated as a single focusable element by VoiceOver:

```tsx
// This entire card becomes one focusable unit
<View
  accessible={true}
  accessibilityLabel="Product: Running Shoes, price: R$ 299"
  accessibilityRole="button"
  onTouchEnd={handleCardPress}
>
  <Image source={shoesImage} />
  <Text>Running Shoes</Text>
  <Text>R$ 299</Text>
</View>
```

To explicitly remove a decorative element from the accessibility tree, use `importantForAccessibility="no-hide-descendants"` — the equivalent of setting `isAccessibilityElement = false` on a container and having that cascade to its children:

```tsx
<View importantForAccessibility="no-hide-descendants">
  <Image source={decorativeBackground} />
</View>
```

The values `"yes"`, `"no"`, and `"no-hide-descendants"` mirror the `UIAccessibility` `isAccessibilityElement` logic from UIKit.

## UIAccessibility.post(.screenChanged) → AccessibilityInfo.announceForAccessibility

When a view update happens outside of a navigation transition — a toast message appears, a validation error surfaces, a section of the screen reloads — UIKit uses the notification system to tell VoiceOver where to redirect focus or what to read aloud:

```swift
UIAccessibility.post(notification: .screenChanged, argument: errorMessageLabel)
UIAccessibility.post(notification: .announcement, argument: "3 items added to cart")
```

React Native provides `AccessibilityInfo` for the announcement equivalent:

```tsx
import { AccessibilityInfo } from 'react-native';

function CartButton({ count }: { count: number }) {
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current) {
      AccessibilityInfo.announceForAccessibility(
        `${count} items in cart`
      );
      prevCount.current = count;
    }
  }, [count]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Cart, ${count} items`}>
      <Text>{count}</Text>
    </Pressable>
  );
}
```

To redirect VoiceOver focus after a screen update — equivalent to passing a `UIView` as the argument to `.screenChanged` — use a ref and `AccessibilityInfo.setAccessibilityFocus`:

```tsx
import { findNodeHandle, AccessibilityInfo } from 'react-native';

const headingRef = useRef<Text>(null);

useEffect(() => {
  if (screenReady && headingRef.current) {
    const node = findNodeHandle(headingRef.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }
}, [screenReady]);

return <Text ref={headingRef} accessibilityRole="header">Results</Text>;
```

## Dynamic Type: UIFont.preferredFont(forTextStyle:) → allowFontScaling

UIKit respects the user's preferred text size by using `UIFont.preferredFont(forTextStyle:)` and observing `UIContentSizeCategory.didChangeNotification`:

```swift
label.font = UIFont.preferredFont(forTextStyle: .body)
label.adjustsFontForContentSizeCategory = true
```

React Native's `Text` component scales with Dynamic Type by default through the `allowFontScaling` prop, which defaults to `true`. You rarely need to set it explicitly unless you are intentionally opting out:

```tsx
// Scales with Dynamic Type — default behavior
<Text style={{ fontSize: 16 }}>Body content</Text>

// Fixed size, ignores user preferences — use sparingly
<Text allowFontScaling={false} style={{ fontSize: 11 }}>Legal footnote</Text>
```

For layouts that need to adapt to larger text sizes — equivalent to using `UIContentSizeCategory.isAccessibilityCategory` to switch to a vertical stack — use `useWindowDimensions` combined with `PixelRatio.getFontScale`:

```tsx
import { useWindowDimensions, PixelRatio } from 'react-native';

function AdaptiveRow() {
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  const isLargeText = fontScale > 1.3;

  return (
    <View style={{ flexDirection: isLargeText ? 'column' : 'row' }}>
      <Text style={{ fontSize: 16 }}>Label</Text>
      <TextInput style={{ flex: 1 }} />
    </View>
  );
}
```

`PixelRatio.getFontScale()` returns the multiplier the system applies to font sizes — equivalent to reading `UIApplication.shared.preferredContentSizeCategory` and mapping it to a scale factor.

## Reduce Motion: UIAccessibility.isReduceMotionEnabled → useAnimatedStyle

On iOS, you check the Reduce Motion accessibility setting before running animations:

```swift
if UIAccessibility.isReduceMotionEnabled {
  view.alpha = 1
} else {
  UIView.animate(withDuration: 0.3) { view.alpha = 1 }
}
```

In React Native with Reanimated 3, use the `useReducedMotion` hook and branch your animation logic accordingly:

```tsx
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

function FadeInCard({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
    } else {
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
```

For cases where you also need to respond to the setting changing at runtime — equivalent to observing `UIAccessibility.reduceMotionStatusDidChangeNotification` — use `AccessibilityInfo.addEventListener`:

```tsx
useEffect(() => {
  const subscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    (isEnabled) => {
      setReduceMotion(isEnabled);
    }
  );
  return () => subscription.remove();
}, []);
```

## accessibilityViewIsModal for Modals

UIKit marks a view as a modal container using the `accessibilityViewIsModal` property, which tells VoiceOver to ignore everything outside that view:

```swift
modalView.accessibilityViewIsModal = true
```

React Native's `Modal` component applies this automatically when `visible` is `true`. If you are building a custom bottom sheet or overlay without using the built-in `Modal`, apply the equivalent prop directly:

```tsx
<View
  accessibilityViewIsModal={true}
  style={styles.bottomSheet}
>
  <Text accessibilityRole="header">Filter options</Text>
  {/* sheet content */}
</View>
```

Without this prop on a custom overlay, VoiceOver will continue to read content behind the sheet, which creates a confusing experience identical to setting `accessibilityViewIsModal = false` in UIKit when a custom modal is presented.

## Grouping Elements with accessibilityRole="none"

A common pattern in UIKit is grouping related labels into a single accessible element so VoiceOver reads them together instead of pausing on each child:

```swift
let container = UIView()
container.isAccessibilityElement = true
container.accessibilityLabel = "3 unread messages, last from Maria, 2 minutes ago"
```

In React Native, set `accessible={true}` on the container and optionally use `accessibilityRole="none"` when the container itself has no semantic role but should still be a single focus point:

```tsx
<View
  accessible={true}
  accessibilityRole="none"
  accessibilityLabel="3 unread messages, last from Maria, 2 minutes ago"
>
  <Text>3 unread</Text>
  <Text>Last from Maria</Text>
  <Text>2 minutes ago</Text>
</View>
```

Use this pattern for list row cells that contain multiple text elements, status indicators alongside labels, and metadata rows where the individual fragments are not useful in isolation. Avoid it for containers whose children are independently actionable — in those cases each interactive element should remain its own focus target.

## VoiceOver Testing: Simulator vs Physical Device

iOS Simulator supports VoiceOver — enable it in Simulator Settings under Accessibility — but it has significant limitations compared to a physical device:

- Swipe gestures are not available; you must use the Accessibility Inspector in Xcode to navigate the accessibility tree
- Audio output for VoiceOver speech is routed to the Mac's speakers and may behave differently from a real device
- Haptic feedback from system interactions is absent
- Some timing behaviours around focus changes differ

Use the Simulator with Xcode's Accessibility Inspector for rapid iteration on the accessibility tree structure — verifying labels, roles, and hints without needing a device nearby. For final validation, always test on a physical iPhone with VoiceOver enabled via Settings > Accessibility > VoiceOver or the triple-click Accessibility Shortcut.

On a physical device, test these scenarios specifically:

- Swipe right through every interactive element on a screen to confirm the reading order matches the visual order
- Double-tap each button to confirm the action fires correctly
- For adjustable controls, swipe up and down to confirm value changes are announced
- Navigate into and out of modals to confirm focus is trapped correctly inside and restored on dismiss
- Change Dynamic Type to the largest accessibility size and verify layouts do not overlap or truncate
- Enable Reduce Motion and verify no animations play that would cause discomfort

The Accessibility Inspector in Xcode (Xcode > Open Developer Tool > Accessibility Inspector) connects to both the Simulator and a physical device over USB, making it the most efficient tool for inspecting the React Native accessibility tree during development.
