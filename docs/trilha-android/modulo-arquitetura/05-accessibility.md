---
title: "Accessibility"
sidebar_label: "Accessibility"
sidebar_position: 5
---

## Video Overview

> Video for this topic coming soon.

## Android Accessibility → React Native

You know Android's accessibility model: `contentDescription`, `ImportantForAccessibility`, `AccessibilityNodeInfo`, and TalkBack. React Native maps these to a consistent cross-platform API.

| Android | React Native |
|---------|-------------|
| `contentDescription` | `accessibilityLabel` |
| `importantForAccessibility="no"` | `importantForAccessibility="no"` |
| `accessibilityRole` (e.g. ROLE_BUTTON) | `accessibilityRole="button"` |
| `AccessibilityNodeInfo.ACTION_CLICK` | `accessibilityActions` |
| `setAccessibilityLiveRegion(POLITE)` | `accessibilityLiveRegion="polite"` |
| TalkBack | TalkBack (Android) / VoiceOver (iOS) |

---

## Core Props

```tsx
function AccessibleButton({ onPress, label, hint }: {
  onPress: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"          // maps to ROLE_BUTTON for TalkBack
      accessibilityLabel={label}          // what TalkBack reads
      accessibilityHint={hint}            // additional context ("double tap to activate")
      accessibilityState={{ disabled: false }}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}
```

---

## Accessibility Roles

```tsx
accessibilityRole="button"       // Pressable, Pressable-like
accessibilityRole="link"         // navigates somewhere
accessibilityRole="image"        // Image
accessibilityRole="header"       // section heading
accessibilityRole="search"       // search input
accessibilityRole="checkbox"     // toggle
accessibilityRole="switch"       // Switch component
accessibilityRole="tab"          // tab in a TabBar
accessibilityRole="text"         // plain text (default for Text)
accessibilityRole="none"         // removes role from the tree
```

---

## Accessible Forms

```tsx
function AccessibleForm() {
  const [email, setEmail] = useState('');

  return (
    <View>
      {/* Label + input linked by nativeID */}
      <Text nativeID="email-label">Email address</Text>
      <TextInput
        accessibilityLabelledBy="email-label"  // links to the label
        accessibilityLabel="Email address"     // fallback
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Submit form"
        accessibilityState={{ disabled: !email }}
        disabled={!email}
        onPress={handleSubmit}
      >
        <Text>Submit</Text>
      </Pressable>
    </View>
  );
}
```

---

## Hiding Decorative Elements

```tsx
// Icon next to a labelled button — redundant for TalkBack
<Pressable accessibilityLabel="Delete item" accessibilityRole="button">
  <Image
    source={require('./trash-icon.png')}
    accessible={false}               // hidden from TalkBack
    importantForAccessibility="no"   // Android-specific
  />
  <Text>Delete</Text>
</Pressable>
```

---

## Live Regions — Announcing Dynamic Changes

```tsx
function LoadingStatus({ isLoading, resultCount }: {
  isLoading: boolean;
  resultCount: number;
}) {
  return (
    <Text
      accessibilityLiveRegion="polite"   // TalkBack announces changes politely
      accessibilityLabel={
        isLoading ? 'Loading results' : `${resultCount} results found`
      }
    >
      {isLoading ? 'Loading...' : `${resultCount} results`}
    </Text>
  );
}
```

---

## Testing Accessibility

```tsx
// With React Native Testing Library
test('delete button is accessible', () => {
  render(<DeleteButton onDelete={jest.fn()} />);

  const btn = screen.getByRole('button', { name: 'Delete item' });
  expect(btn).toBeTruthy();
});
```

Enable TalkBack on your emulator:

```bash
adb shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
```

---

## Study Materials

- [React Native — Accessibility](https://reactnative.dev/docs/accessibility)
- [Android — Accessibility](https://developer.android.com/guide/topics/ui/accessibility)
- [WCAG 2.1 — Mobile Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/)

---

## Trail Summary

You have completed the Android Native Trail. Here is the full curriculum:

| Module | Topics |
|--------|--------|
| Fundamentals | JavaScript, TypeScript, Core Components, Styling, State & APIs |
| Native Resources | Permissions, Camera, Storage, Sensors, Notifications |
| Performance | Threads, FlatList, Reanimated, memo, Bundle |
| New Architecture | Hermes, JSI, TurboModules, Fabric+Compose, Debugging |
| Compose → RN | @Composable, State, Layout, Navigation, Theming |
| Testing | Jest, RNTL, Mocking, Integration, Detox |
| CI/CD | Fastlane, GitHub Actions, EAS Build, Signing, OTA |
| Architecture | Patterns, Monorepo, State at Scale, Error Handling, Accessibility |

For advanced topics — TurboModule internals, Fabric renderer, upgrade strategy — continue to the **[React Native MasterClass](/trilha-masterclass/modulo-00-overview/course-overview)**.
