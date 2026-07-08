---
title: Advanced Native Integration
---

# Advanced Native Integration

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/Native_integration_React_Native_s_-_native.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## The Bridge Between Two Worlds

React Native's power lies in being able to call native platform code directly from JavaScript. You already know how to write an Android `Service` or an iOS `Framework` — **Native Modules** let you expose that work to the RN layer as a regular async function call. **Native UI Components** do the same for custom views: your `View`/`UIView` subclass becomes a JSX element.

This is the boundary where your existing platform knowledge becomes a superpower.

---

## Mapping: Android/iOS → React Native

| Native | React Native | Note |
|---|---|---|
| Activity / ViewController | Host of the RN tree | RN runs inside an existing Activity/VC in brownfield apps |
| Service / native SDK | **Native Module** | Methods exposed via `NativeModules` |
| View / custom UIView | **Native UI Component** | Used in JSX: `<MyNativeView />` |
| Callbacks / Delegates | Event Emitter (`DeviceEventEmitter`) | Events from native → JS |
| Threads / background tasks | Internal threads of the native module | Keep heavy work off the main/UI thread |
| Gradle / Xcodeproj / Pods | Autolinking / manual linking | RN discovers modules via autolinking or explicit registration |

---

## Native Modules

A **Native Module** is a native class registered in RN that exposes functions callable from JavaScript. Think of it as an internal SDK: you write the implementation once in Kotlin or Swift, register it, and call it from TypeScript as a plain async function.

### Android (Kotlin)

The module itself:

```kotlin
// android/app/src/main/java/com/myapp/MyDeviceInfoModule.kt
package com.myapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class MyDeviceInfoModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MyDeviceInfo"

  @ReactMethod
  fun getDeviceName(promise: Promise) {
    val name = android.os.Build.MODEL ?: "Unknown"
    promise.resolve(name)
  }
}
```

The package that registers it:

```kotlin
// android/app/src/main/java/com/myapp/MyDeviceInfoPackage.kt
package com.myapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.bridge.ReactApplicationContext

class MyDeviceInfoPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(MyDeviceInfoModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
```

Registration in `MainApplication`:

```kotlin
override fun getPackages(): MutableList<ReactPackage> {
  return mutableListOf(
    MainReactPackage(),
    MyDeviceInfoPackage(),
  )
}
```

### iOS (Swift + Obj-C bridge)

The Swift implementation:

```swift
// ios/MyDeviceInfoModule.swift
import Foundation
import UIKit

@objc(MyDeviceInfo)
class MyDeviceInfo: NSObject {

  @objc
  func getDeviceName(_ resolve: RCTPromiseResolveBlock,
                     rejecter reject: RCTPromiseRejectBlock) {
    resolve(UIDevice.current.name)
  }
}
```

The Obj-C header that makes it visible to RN:

```objc
// ios/MyDeviceInfoModule.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MyDeviceInfo, NSObject)
RCT_EXTERN_METHOD(getDeviceName:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
```

### Consuming from TypeScript

The JS wrapper and screen consumption are identical for both platforms:

```ts
// src/native/MyDeviceInfo.ts
import { NativeModules } from 'react-native';

const { MyDeviceInfo } = NativeModules;

export async function getDeviceName(): Promise<string> {
  return MyDeviceInfo.getDeviceName();
}
```

```tsx
// Any RN screen
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getDeviceName } from '../native/MyDeviceInfo';

export function DeviceInfoScreen() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    getDeviceName().then(setName).catch(console.error);
  }, []);

  return (
    <View>
      <Text>Device: {name}</Text>
    </View>
  );
}
```

Notice the pattern: native code is hidden behind a typed TypeScript wrapper. The screen never touches `NativeModules` directly — it just calls `getDeviceName()` like any other async function.

---

## Native UI Components

A **Native UI Component** exposes a custom `View`/`UIView` to be used as a React component in JSX. The `ViewManager` (Android) or `RCTViewManager` (iOS) is the glue layer that maps React props to native view properties.

### Android (Kotlin)

The custom view:

```kotlin
// android/app/src/main/java/com/myapp/MyColoredView.kt
package com.myapp

import android.graphics.Canvas
import android.graphics.Color
import android.view.View
import com.facebook.react.uimanager.ThemedReactContext

class MyColoredView(context: ThemedReactContext) : View(context) {
  var color: Int = Color.RED

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    canvas.drawColor(color)
  }
}
```

The manager that registers it and maps props:

```kotlin
// android/app/src/main/java/com/myapp/MyColoredViewManager.kt
package com.myapp

import android.graphics.Color
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class MyColoredViewManager : SimpleViewManager<MyColoredView>() {

  override fun getName(): String = "MyColoredView"

  override fun createViewInstance(reactContext: ThemedReactContext): MyColoredView =
    MyColoredView(reactContext)

  @ReactProp(name = "color")
  fun setColor(view: MyColoredView, color: String) {
    view.color = Color.parseColor(color)
    view.invalidate()
  }
}
```

The TypeScript wrapper and usage:

```tsx
// src/native/MyColoredView.tsx
import { requireNativeComponent } from 'react-native';

export type MyColoredViewProps = {
  color: string;
  style?: object;
};

export const MyColoredView = requireNativeComponent<MyColoredViewProps>('MyColoredView');
```

```tsx
import { View } from 'react-native';
import { MyColoredView } from '../native/MyColoredView';

export function ColoredBoxScreen() {
  return (
    <View>
      <MyColoredView style={{ width: 100, height: 100 }} color="#00FF00" />
    </View>
  );
}
```

---

## Event Bridge: Native → JS

Modules can push events to JavaScript at any time — not just in response to a JS call. This is how you expose things like connectivity changes, sensor data, or background task completions.

```kotlin
// android/app/src/main/java/com/myapp/BatteryModule.kt
package com.myapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class BatteryModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  override fun getName(): String = "BatteryModule"

  private var receiver: BroadcastReceiver? = null

  @ReactMethod
  fun startListening() {
    if (receiver != null) return

    receiver = object : BroadcastReceiver() {
      override fun onReceive(c: Context?, intent: Intent?) {
        val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val event = Arguments.createMap().apply { putInt("level", level) }

        context
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("BatteryLevelChanged", event)
      }
    }

    context.registerReceiver(receiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
  }
}
```

Consuming the event stream in a custom hook:

```ts
// src/hooks/useBatteryLevel.ts
import { useEffect, useState } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';

const { BatteryModule } = NativeModules;
const emitter = new NativeEventEmitter(BatteryModule);

export function useBatteryLevel() {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    BatteryModule.startListening();

    const sub = emitter.addListener('BatteryLevelChanged', (event) => {
      setLevel(event.level);
    });

    return () => sub.remove();
  }, []);

  return level;
}
```

The cleanup in `return () => sub.remove()` is critical — leaking event subscriptions causes memory issues and ghost updates on unmounted components.

---

## Brownfield Integration

In a brownfield app, RN is hosted inside an existing Activity or ViewController. The native lifecycle owns the app; RN is a guest. A few rules of thumb:

- Keep all bridge code in a dedicated namespace (`com.myapp.rnbridge`) — it makes the boundary visible in code review.
- Document which native modules are exposed to RN. Without a registry, this knowledge lives only in people's heads.
- Don't expose native SDKs directly. Create a thin service layer that RN calls, so you can evolve the native side without breaking the JS contract.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| Native Modules — Android | Official Docs | [reactnative.dev/docs/native-modules-android](https://reactnative.dev/docs/native-modules-android) |
| Native Modules — iOS | Official Docs | [reactnative.dev/docs/native-modules-ios](https://reactnative.dev/docs/native-modules-ios) |
| Native UI Components — Android | Official Docs | [reactnative.dev/docs/native-components-android](https://reactnative.dev/docs/native-components-android) |
| Native UI Components — iOS | Official Docs | [reactnative.dev/docs/native-components-ios](https://reactnative.dev/docs/native-components-ios) |

---

Next → **[React Native Performance](../modulo-performance/topico-performance-rn-nativos)**
