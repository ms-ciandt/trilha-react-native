---
title: Advanced Native Integration
---

# Topic — Advanced Native Integration (Track 1: Native Devs)

## Topic Goal

By the end, you should be able to:
- Understand the **Native Modules** and **Native UI Components** model in React Native
- Create and register a simple Native Module on Android and/or iOS
- Expose a native view as a React component via `requireNativeComponent`
- Emit events from native to JavaScript (event bridge)
- Integrate existing native SDKs into a brownfield project with RN
- Compare this model with what you already do today on Android/iOS

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Advanced_Native_Integration_-_nativo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Mapping: Android/iOS → React Native

| Native                           | React Native                          | Note |
|----------------------------------|----------------------------------------|------------|
| Activity / ViewController        | Host of the RN tree                   | RN runs inside an existing Activity/VC in brownfield |
| Service / native SDK             | **Native Module**                     | Methods exposed via `NativeModules` |
| View / custom UIView             | **Native UI Component**               | Used in JSX: `<MyNativeView />` |
| Callbacks / Delegates            | Event Emitter (`DeviceEventEmitter`)  | Events from native → JS |
| Threads / background tasks       | Internal threads of the native module | Avoid heavy work on the main/UI thread |
| Gradle / Xcodeproj / Pods        | Autolinking / manual linking          | RN discovers modules via autolinking or explicit registration |

---

## Core concept: Native Modules

A **Native Module** is a native class registered in RN that exposes functions callable from JS. Conceptually it is an *internal SDK* accessible from the RN layer.

### Android — example (Kotlin)


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


Usage in TypeScript:


```tsx
// src/native/MyDeviceInfo.ts
import { NativeModules } from 'react-native';

const { MyDeviceInfo } = NativeModules;

export async function getDeviceName(): Promise<string> {
  return MyDeviceInfo.getDeviceName();
}
```



```tsx
// Example of consumption in an RN screen
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


### iOS — example (Swift + Obj-C)


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



```objc
// ios/MyDeviceInfoModule.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MyDeviceInfo, NSObject)
RCT_EXTERN_METHOD(getDeviceName:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
```


The consumption in TS is identical to Android.

---

## Core concept: Native UI Components

A **Native UI Component** exposes a custom `View`/`UIView` to be used as a React component.

### Android — custom View exposed in JSX


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


Registration in `ReactPackage` and usage in TS:


```tsx
// src/native/MyColoredView.tsx
import { requireNativeComponent } from 'react-native';

export type MyColoredViewProps = {
  color: string;
  style?: any;
};

export const MyColoredView = requireNativeComponent<MyColoredViewProps>('MyColoredView');
```



```tsx
// Example of usage in a screen
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

## Event bridge: native → JS

Simplified example of a battery event on Android.


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
        val event = Arguments.createMap().apply {
          putInt("level", level)
        }

        context
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("BatteryLevelChanged", event)
      }
    }

    val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
    context.registerReceiver(receiver, filter)
  }
}
```


Consumption in RN:


```tsx
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

    return () => {
      sub.remove();
    };
  }, []);

  return level;
}
```


---

## Brownfield integration

In brownfield apps, RN is hosted inside an existing Activity/VC. The `NavigationContainer` and the RN tree manage only the RN section — the Activity/VC lifecycle remains native.

Best practices:
- Keep bridge code (modules, managers) in a clear namespace (`com.myapp.rnbridge`).
- Document which native modules are exposed to RN and which RN screens exist.
- Avoid directly exposing all native SDKs; create a dedicated service layer for RN.

---

## Practical exercise

Build an RN feature that consumes native code:

1. Create a Native Module on Android and iOS with:
   - `getAppVersion()`
   - `getBatteryLevel()` (Android; on iOS return `"N/A"`).
2. Expose the functions to JS and type them in TypeScript.
3. Create an RN screen `SystemInfoScreen` that:
   - Shows the app version.
   - Shows the battery level and updates in real time via event.
4. Document in a `README`:
   - Where the native module is located.
   - How it is registered in RN.
   - How it is consumed by the JS layer.

---

## Study Materials

### Official Documentation
- [Native Modules — Android](https://reactnative.dev/docs/native-modules-android)
- [Native Modules — iOS](https://reactnative.dev/docs/native-modules-ios)
- [Native UI Components — Android](https://reactnative.dev/docs/native-components-android)
- [Native UI Components — iOS](https://reactnative.dev/docs/native-components-ios)

### Articles
- *React Native Bridge Architecture Explained* — overview of how JS communicates with native code.
- *Building Custom Native Modules in React Native (2025)* — step-by-step guide for Android and iOS.

---

Next → **[React Native Performance](../modulo-performance/topico-performance-rn-nativos)**