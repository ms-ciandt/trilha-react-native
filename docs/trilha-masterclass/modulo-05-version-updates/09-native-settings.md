---
title: "Changes to Native Settings (Edge-to-Edge)"
---

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc05_09_native-settings.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# Changes to Native Settings (Edge-to-Edge)

> Edge-to-edge is the most visually breaking change in recent RN history. Setting `targetSdk = 35` activates it on Android 15 — and suddenly content overflows under the status bar and gesture navigation bar on every screen.

---

## What Changed and Why

On **Android 15 (API 35)**, Google made edge-to-edge rendering mandatory for apps that target SDK 35. The content area no longer stops at the status bar and navigation bar — it expands to fill the entire screen, *behind* the system chrome.

This is intentional. Google wants modern apps to draw under the system bars and manage their own insets. Apps that set hardcoded `paddingTop: 24` or rely on `StatusBar.setBackgroundColor` are now broken on Android 15 when targeting SDK 35.

React Native 0.76 set `targetSdk = 35` in the Upgrade Helper template diff — making this a common breakage for apps upgrading from 0.75.

---

## What Breaks

| Old API | Status on Android 15 + targetSdk 35 | Fix |
|---|---|---|
| `StatusBar.setBackgroundColor('#fff')` | Silent no-op — status bar is always transparent | Remove; use View background behind content |
| `StatusBar.translucent` prop | Ignored — all status bars are now translucent by default | Remove |
| `StatusBar hidden` | Works, but uses immersive mode — behavior changed | Test manually |
| Hardcoded `paddingTop: 24` | Layout appears shifted or overlapping | Replace with `useSafeAreaInsets().top` |
| Hardcoded `paddingBottom` (navigation bar) | Content hidden under gesture bar | Replace with `useSafeAreaInsets().bottom` |
| `expo-status-bar` (old) | Same issues — wraps the broken API | Upgrade to `react-native-edge-to-edge` |

---

## Symptoms on Screen

```
Before (targetSdk 34):
┌──────────────────────┐
│  STATUS BAR (bg)     │  ← opaque, your background color
│──────────────────────│
│  YOUR HEADER         │
│  your content        │
│                      │
│──────────────────────│
│  NAV BAR (bg)        │  ← opaque, your background color
└──────────────────────┘

After (targetSdk 35, no fix):
┌──────────────────────┐
│  STATUS BAR          │
│  YOUR HEADER ← oops  │  ← header renders under status bar
│  your content        │
│  your content        │
│  your content ← oops │  ← bottom content under nav bar
│  NAV BAR             │
└──────────────────────┘
```

---

## The Fix: `react-native-edge-to-edge`

The recommended solution from the React Native core team and Expo is the `react-native-edge-to-edge` library by [Mathieu Actherberg (zoontek)](https://github.com/zoontek/react-native-edge-to-edge).

```bash
yarn add react-native-edge-to-edge
cd ios && bundle exec pod install
```

### 1. Enable in Gradle (Android)

```kotlin
// android/app/build.gradle
android {
    defaultConfig {
        // ...
    }
    buildFeatures {
        // Enable edge-to-edge — this calls WindowCompat.setDecorFitsSystemWindows(window, false)
        // automatically in the generated MainActivity code
    }
}
```

Or via Gradle property (cleaner):

```properties
# android/gradle.properties
edgeToEdgeEnabled=true
```

### 2. Replace `StatusBar` with `SystemBars`

```tsx
// Before — StatusBar from react-native
import { StatusBar } from 'react-native';

function App() {
  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"      // ← broken on Android 15
        translucent={false}            // ← broken on Android 15
      />
      <MainNavigator />
    </>
  );
}
```

```tsx
// After — SystemBars from react-native-edge-to-edge
import { SystemBars } from 'react-native-edge-to-edge';

function App() {
  return (
    <>
      <SystemBars style="dark" />      // ← controls icon tint only, no background
      <MainNavigator />
    </>
  );
}
```

### 3. Replace hardcoded insets with `useSafeAreaInsets`

```tsx
// Before — hardcoded padding
function Header() {
  return (
    <View style={{ paddingTop: 44, backgroundColor: '#0e7490' }}>
      <Text>My App</Text>
    </View>
  );
}
```

```tsx
// After — dynamic insets
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Header() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: '#0e7490' }}>
      <Text>My App</Text>
    </View>
  );
}
```

### 4. Handle floating elements and bottom sheets

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function FABButton() {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      style={{
        position: 'absolute',
        bottom: 16 + insets.bottom,   // ← above the gesture bar
        right: 16,
      }}
    >
      <Text>+</Text>
    </Pressable>
  );
}
```

---

## Expo Configuration (app.json)

```json
{
  "expo": {
    "android": {
      "edgeToEdgeEnabled": true
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 35,
            "targetSdkVersion": 35,
            "minSdkVersion": 24
          }
        }
      ]
    ]
  }
}
```

---

## If You Are Not Ready for Edge-to-Edge Yet

If migrating all screens at once is not feasible, you can temporarily keep `targetSdk = 34` while on RN 0.76:

```kotlin
// android/app/build.gradle
android {
    compileSdk = 35              // compileSdk can be 35
    defaultConfig {
        targetSdk = 34           // targetSdk stays at 34 — no forced edge-to-edge
    }
}
```

This buys time. You will need to do the migration eventually — Google Play requires new app releases to target the latest SDK within a year of its release.

---

## Audit Tool: Finding Hardcoded Insets in Your Codebase

```bash
# Find hardcoded paddingTop values that may need to be dynamic
grep -r "paddingTop: [0-9]" src/ --include="*.tsx" --include="*.ts"

# Find StatusBar usage
grep -r "StatusBar" src/ --include="*.tsx" --include="*.ts"

# Find expo-status-bar usage
grep -r "expo-status-bar" src/ --include="*.tsx" --include="*.ts"
```

Each result is a potential edge-to-edge migration candidate. In a large app, this list can be 50–100 locations. Build a checklist, migrate screen by screen, and test on a physical Android 15 device after each batch.

---

## Common Library Issues with Edge-to-Edge

| Library | Issue | Fix |
|---|---|---|
| `react-native-modal` | Doesn't account for insets in older versions | Upgrade to 13.x; wrap `Modal` content in `SafeAreaView` |
| `@gorhom/bottom-sheet` | Bottom inset missing | Pass `bottomInset={insets.bottom}` prop |
| `react-native-webview` | Web content ignores safe area | Inject CSS: `env(safe-area-inset-bottom)` via `injectedJavaScript` |
| `react-navigation` headers | Header overlaps status bar | Use `headerStatusBarHeight` option or upgrade to v7 |
| `react-native-camera-roll` | Picker UI broken | Upgrade to latest; most camera UI libraries handle this in 2025 |

---

## Other Impactful Native Setting Changes (Non Edge-to-Edge)

### New Architecture in `gradle.properties`

```properties
# android/gradle.properties
newArchEnabled=true       # default in RN 0.76+ templates
hermesEnabled=true        # Hermes is required with New Architecture
```

### CMakeLists.txt (New Architecture build)

RN 0.76 added CMakeLists.txt to the template for New Architecture's C++ compilation. If you are a brownfield app and don't have it, the New Architecture modules won't compile.

```bash
# Verify its presence
ls android/app/src/main/jni/CMakeLists.txt
```

### Namespace in `build.gradle` (required since Gradle 8.x)

```kotlin
// android/app/build.gradle — required for Gradle 8+
android {
    namespace = "com.myapp"   // ← must match applicationId
    // ...
}
```

Missing `namespace` causes: `Namespace not specified. Specify a namespace in the module's build file.`

---

## Study Materials

| Resource | Description |
|---|---|
| [react-native-edge-to-edge — GitHub](https://github.com/zoontek/react-native-edge-to-edge) | The recommended library — source, docs, API reference |
| [Edge-to-Edge — Android 15 Discussion](https://github.com/react-native-community/discussions-and-proposals/discussions/827) | Community thread explaining the change and migration path |
| [Android 15 Edge-to-Edge Fix — 72Technologies](https://www.72technologies.com/blog/android-15-edge-to-edge-react-native-expo) | Practical before/after code for Expo and bare workflow |
| [Edge-to-Edge issue — #50423](https://github.com/react/react-native/issues/50423) | Original GitHub issue tracking the breakage |
| [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context) | Library to manage safe area insets (`useSafeAreaInsets`) |
| [useSafeAreaInsets — docs](https://reactnavigation.org/docs/use-safe-area-insets/) | Hook reference and usage examples |

---

Next → [Fault Diagnosis (RN Doctor)](./rn-doctor)
