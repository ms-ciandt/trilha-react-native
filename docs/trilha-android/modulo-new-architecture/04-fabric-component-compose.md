---
title: "Fabric Native Component with Jetpack Compose"
sidebar_label: "Fabric + Compose"
sidebar_position: 4
---

## Video Overview

> Video for this topic coming soon.

## What a Fabric Native Component Is

A **Fabric Native Component** is a native Android view that you expose to React Native's JSX. The difference from the old architecture: Fabric renders natively via C++ (not through the JS bridge), and the component definition is driven by Codegen from a TypeScript spec.

The exciting part for Android developers: the underlying view can be **any Android view** — including a full Jetpack Compose composable. You write your UI in Compose, wrap it in a `AbstractComposeView`, and Fabric treats it as a native view.

---

## The Architecture

```
JSX in React Native
  <RatingBar value={4} onChange={setRating} />
        │
        │ Fabric (C++ renderer)
        ▼
Codegen-generated C++ ViewManager binding
        │
        │ JNI
        ▼
RatingBarManager.kt (ViewManager)
        │
        │ Creates and manages
        ▼
RatingBarComposeView.kt (AbstractComposeView)
        │
        │ Renders
        ▼
@Composable RatingBar(value, onValueChange)  ← your Compose UI
```

---

## The Full Example: A Rating Bar

We'll build a `<RatingBar>` component — a native 5-star rating bar implemented in Jetpack Compose, exposed to React Native JSX.

### Step 1: TypeScript Spec

```typescript
// src/specs/NativeRatingBarComponent.ts
import type { ViewProps } from 'react-native';
import type { Float, Int32, DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

interface NativeProps extends ViewProps {
  // Props passed from JS to native
  value: Float;           // current rating (0.0 to 5.0)
  maxValue?: Int32;       // max stars — default 5
  activeColor?: string;   // filled star colour
  inactiveColor?: string; // empty star colour
  stepSize?: Float;       // 0.5 for half-stars, 1.0 for whole stars

  // Events from native to JS
  onChange: DirectEventHandler<{ value: Float }>;
}

export default codegenNativeComponent<NativeProps>('RatingBar');
```

### Step 2: Run Codegen

```bash
cd android && ./gradlew generateCodegenArtifactsFromSchema
```

Generates:
- `RatingBarManagerInterface.java` — the interface your ViewManager must implement
- `RatingBarManagerDelegate.java` — handles prop setting from C++

---

### Step 3: The Compose View

```kotlin
// android/app/src/main/java/com/yourapp/RatingBarComposeView.kt
package com.yourapp

import android.content.Context
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material3.Icon
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.AbstractComposeView
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

class RatingBarComposeView(context: Context) : AbstractComposeView(context) {

    // Properties set by the Fabric ViewManager
    var value: Float by mutableStateOf(0f)
    var maxValue: Int by mutableStateOf(5)
    var activeColor: Color by mutableStateOf(Color(0xFFFFB300))
    var inactiveColor: Color by mutableStateOf(Color(0xFFE0E0E0))
    var stepSize: Float by mutableStateOf(1f)
    var onChangeCallback: ((Float) -> Unit)? = null

    @Composable
    override fun Content() {
        Row {
            (1..maxValue).forEach { star ->
                val filled = value >= star.toFloat()
                androidx.compose.foundation.clickable(
                    onClick = {
                        val newValue = if (stepSize < 1f) {
                            // half-star logic omitted for brevity
                            star.toFloat()
                        } else {
                            star.toFloat()
                        }
                        value = newValue
                        onChangeCallback?.invoke(newValue)
                    }
                )
                Icon(
                    imageVector = if (filled) Icons.Filled.Star else Icons.Outlined.StarOutline,
                    contentDescription = "Star $star",
                    tint = if (filled) activeColor else inactiveColor,
                    modifier = Modifier.size(32.dp)
                )
            }
        }
    }
}
```

---

### Step 4: The ViewManager

```kotlin
// android/app/src/main/java/com/yourapp/RatingBarViewManager.kt
package com.yourapp

import androidx.compose.ui.graphics.Color
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.yourapp.RatingBarManagerDelegate  // Codegen-generated

class RatingBarViewManager(
    private val reactContext: ReactApplicationContext
) : SimpleViewManager<RatingBarComposeView>() {

    private val delegate = RatingBarManagerDelegate(this)

    override fun getName() = "RatingBar"

    override fun createViewInstance(context: ThemedReactContext): RatingBarComposeView {
        val view = RatingBarComposeView(context)

        // Wire the Compose callback to a React Native event
        view.onChangeCallback = { newValue ->
            val event = androidx.core.os.bundleOf("value" to newValue)
            reactContext
                .getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                .receiveEvent(view.id, "onChange", com.facebook.react.bridge.Arguments.fromBundle(event))
        }

        return view
    }

    // Props — called by Fabric when JS updates them
    @ReactProp(name = "value", defaultFloat = 0f)
    override fun setValue(view: RatingBarComposeView, value: Float) {
        view.value = value
    }

    @ReactProp(name = "maxValue", defaultInt = 5)
    override fun setMaxValue(view: RatingBarComposeView, maxValue: Int) {
        view.maxValue = maxValue
    }

    @ReactProp(name = "activeColor")
    override fun setActiveColor(view: RatingBarComposeView, color: String?) {
        color?.let {
            view.activeColor = Color(android.graphics.Color.parseColor(it))
        }
    }

    @ReactProp(name = "inactiveColor")
    override fun setInactiveColor(view: RatingBarComposeView, color: String?) {
        color?.let {
            view.inactiveColor = Color(android.graphics.Color.parseColor(it))
        }
    }

    override fun getDelegate(): ViewManagerDelegate<RatingBarComposeView> = delegate

    override fun getExportedCustomDirectEventTypeConstants() = mapOf(
        "onChange" to mapOf("registrationName" to "onChange")
    )
}
```

---

### Step 5: Register the ViewManager

```kotlin
// RatingBarPackage.kt
package com.yourapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class RatingBarPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext) = emptyList<Nothing>()
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(RatingBarViewManager(context))
}
```

Register in `MainApplication.kt`:

```kotlin
override fun getPackages() = PackageList(this).packages.apply {
    add(RatingBarPackage())
}
```

---

### Step 6: The JavaScript/TypeScript Wrapper

```tsx
// components/RatingBar.tsx
import RatingBarSpec from '../specs/NativeRatingBarComponent';
import { StyleSheet } from 'react-native';

interface RatingBarProps {
  value: number;
  onChange: (value: number) => void;
  maxValue?: number;
  activeColor?: string;
  inactiveColor?: string;
  size?: number;
}

export function RatingBar({
  value,
  onChange,
  maxValue = 5,
  activeColor = '#FFB300',
  inactiveColor = '#E0E0E0',
  size = 32,
}: RatingBarProps) {
  return (
    <RatingBarSpec
      style={{ height: size, width: size * maxValue }}
      value={value}
      maxValue={maxValue}
      activeColor={activeColor}
      inactiveColor={inactiveColor}
      onChange={(event) => onChange(event.nativeEvent.value)}
    />
  );
}

// Usage
function ProductScreen() {
  const [rating, setRating] = useState(0);

  return (
    <View>
      <RatingBar value={rating} onChange={setRating} />
      <Text>You rated: {rating} stars</Text>
    </View>
  );
}
```

---

## Prop Updates: How Fabric Diffs and Applies

When a prop changes in React (e.g. `value` changes from 3 to 4), Fabric:

1. Calculates the diff in C++ — which props changed
2. Calls the corresponding `@ReactProp` setter on the ViewManager
3. The setter updates the `mutableStateOf` field on the `AbstractComposeView`
4. Compose observes the state change and recomposes only the affected part

This is **direct prop diffing without a JSON round-trip** — the C++ layer compares values and calls Kotlin setters directly. It's equivalent to how `RecyclerView.Adapter.notifyItemChanged()` only updates the specific view that changed.

---

## Handling Layout: Measuring a Compose View

Fabric needs to know the size of your native component to include it in the Yoga layout pass:

```kotlin
override fun createViewInstance(context: ThemedReactContext): RatingBarComposeView {
    val view = RatingBarComposeView(context)

    // Tell Fabric to measure this view's content
    view.layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.WRAP_CONTENT,
        FrameLayout.LayoutParams.WRAP_CONTENT
    )

    return view
}
```

For fixed sizes, override `measure` in your `AbstractComposeView` and call `setMeasuredDimension()`.

---

## Compose Themes Inside React Native

Your Compose view can use its own Material3 theme — it runs in a Compose context isolated from the React Native rendering tree:

```kotlin
@Composable
override fun Content() {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()
    ) {
        RatingBarContent(
            value = value,
            maxValue = maxValue,
            onValueChange = { onChangeCallback?.invoke(it) }
        )
    }
}
```

---

## Go Deeper — React Native Masterclass

This topic showed you how to build a Fabric component backed by Jetpack Compose. The Masterclass covers Fabric at the renderer level — how C++ shadow trees work, the full component lifecycle, and advanced patterns like measuring and event dispatch:

- [Fabric Renderer](/trilha-masterclass/modulo-02-jsi-fabric/fabric-renderer) — how Fabric replaces the old UIManager, shadow tree diffing, Yoga layout
- [Fabric Components](/trilha-masterclass/modulo-02-jsi-fabric/fabric-components) — full component spec, props, events, commands, and the ViewManager lifecycle
- [Runtime Debugging](/trilha-masterclass/modulo-02-jsi-fabric/runtime-debugging) — debugging Fabric component layout and event issues

---

## Study Materials

### Official Documentation

- [React Native — Fabric Native Components](https://reactnative.dev/docs/the-new-architecture/pillars-fabric-components)
- [React Native — Fabric Components Android](https://reactnative.dev/docs/fabric-native-components-android)
- [Jetpack Compose — AbstractComposeView](https://developer.android.com/reference/kotlin/androidx/compose/ui/platform/AbstractComposeView)
- [Compose — Interoperability with Views](https://developer.android.com/develop/ui/compose/migrate/interoperability-apis/views-in-compose)

### Reference Implementations

- [react-native-maps](https://github.com/react-native-maps/react-native-maps) — complex Fabric component
- [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera) — high-performance Fabric component with JSI

### Videos

- [Nicola Corti — Fabric Components deep dive](https://www.youtube.com/watch?v=B3BUnhMtXQQ)

---

## What's Next

You can write TurboModules and Fabric Components. Final topic: debugging tools for the New Architecture — Flipper, React DevTools, Systrace, and Android Studio Profiler.

➡ [Debugging the New Architecture](./05-debugging-new-architecture)
