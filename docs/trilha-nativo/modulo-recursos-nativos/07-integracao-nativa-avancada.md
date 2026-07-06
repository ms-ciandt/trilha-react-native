---
title: Integração Nativa Avançada
---

# Tópico — Integração Nativa Avançada (Trilha 1: Devs Nativos)

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Entender o modelo de **Native Modules** e **Native UI Components** no React Native
- Criar e registrar um Native Module simples em Android e/ou iOS
- Expor uma view nativa como componente React via `requireNativeComponent`
- Emitir eventos do nativo para o JavaScript (bridge de eventos)
- Integrar SDKs nativos existentes em um projeto brownfield com RN
- Comparar esse modelo com o que já faz hoje em Android/iOS

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Advanced_Native_Integration_-_nativo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Mapeamento: Android/iOS → React Native

| Nativo                           | React Native                          | Observação |
|----------------------------------|----------------------------------------|------------|
| Activity / ViewController        | Host da árvore RN                     | RN roda dentro de uma Activity/VC existente em brownfield |
| Service / SDK nativo             | **Native Module**                     | Métodos expostos via `NativeModules` |
| View / UIView custom             | **Native UI Component**               | Usado em JSX: `<MyNativeView />` |
| Callbacks / Delegates            | Event Emitter (`DeviceEventEmitter`)  | Eventos do nativo → JS |
| Threads / background tasks       | Threads internas do módulo nativo     | Evitar trabalho pesado na main/UI thread |
| Gradle / Xcodeproj / Pods        | Autolinking / manual linking          | RN descobre módulos via autolinking ou registro explícito |

---

## Conceito central: Native Modules

Um **Native Module** é uma classe nativa registrada no RN que expõe funções chamáveis pelo JS. Conceitualmente é um *SDK interno* acessível pela camada RN.

### Android — exemplo (Kotlin)

{% raw %}
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
{% endraw %}

{% raw %}
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
{% endraw %}

Registro no `MainApplication`:

{% raw %}
```kotlin
override fun getPackages(): MutableList<ReactPackage> {
  return mutableListOf(
    MainReactPackage(),
    MyDeviceInfoPackage(),
  )
}
```
{% endraw %}

Uso em TypeScript:

{% raw %}
```tsx
// src/native/MyDeviceInfo.ts
import { NativeModules } from 'react-native';

const { MyDeviceInfo } = NativeModules;

export async function getDeviceName(): Promise<string> {
  return MyDeviceInfo.getDeviceName();
}
```
{% endraw %}

{% raw %}
```tsx
// Exemplo de consumo em uma tela RN
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
{% endraw %}

### iOS — exemplo (Swift + Obj-C)

{% raw %}
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
{% endraw %}

{% raw %}
```objc
// ios/MyDeviceInfoModule.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MyDeviceInfo, NSObject)
RCT_EXTERN_METHOD(getDeviceName:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
```
{% endraw %}

O consumo em TS é idêntico ao Android.

---

## Conceito central: Native UI Components

Um **Native UI Component** expõe uma `View`/`UIView` customizada para ser usada como componente React.

### Android — View custom exposta em JSX

{% raw %}
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
{% endraw %}

{% raw %}
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
{% endraw %}

Registro no `ReactPackage` e uso em TS:

{% raw %}
```tsx
// src/native/MyColoredView.tsx
import { requireNativeComponent } from 'react-native';

export type MyColoredViewProps = {
  color: string;
  style?: any;
};

export const MyColoredView = requireNativeComponent<MyColoredViewProps>('MyColoredView');
```
{% endraw %}

{% raw %}
```tsx
// Exemplo de uso em uma tela
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
{% endraw %}

---

## Bridge de eventos: nativo → JS

Exemplo simplificado de evento de bateria no Android.

{% raw %}
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
{% endraw %}

Consumo em RN:

{% raw %}
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
{% endraw %}

---

## Integração brownfield

Em apps brownfield, o RN é hospedado dentro de uma Activity/VC existente. O `NavigationContainer` e a árvore RN gerenciam apenas o trecho em RN — o ciclo de vida da Activity/VC continua nativo.

Boas práticas:
- Manter o código de bridge (modules, managers) em um namespace claro (`com.myapp.rnbridge`).
- Documentar quais módulos nativos estão expostos ao RN e quais telas RN existem.
- Evitar expor diretamente todos os SDKs nativos; criar uma camada de serviço específica para RN.

---

## Exercício prático

Construa uma feature RN que consuma código nativo:

1. Crie um Native Module em Android e iOS com:
   - `getAppVersion()`
   - `getBatteryLevel()` (Android; em iOS retorne `"N/A"`).
2. Exponha as funções para o JS e tipa-as em TypeScript.
3. Crie uma tela RN `SystemInfoScreen` que:
   - Mostra a versão do app.
   - Mostra o nível de bateria e atualiza em tempo real via evento.
4. Documente em um `README`:
   - Onde está o módulo nativo.
   - Como ele é registrado no RN.
   - Como é consumido pela camada JS.

---

## Materiais de estudo

### Documentação oficial
- [Native Modules — Android](https://reactnative.dev/docs/native-modules-android)
- [Native Modules — iOS](https://reactnative.dev/docs/native-modules-ios)
- [Native UI Components — Android](https://reactnative.dev/docs/native-components-android)
- [Native UI Components — iOS](https://reactnative.dev/docs/native-components-ios)

### Artigos
- *React Native Bridge Architecture Explained* — overview de como o JS conversa com código nativo.
- *Building Custom Native Modules in React Native (2025)* — guia passo a passo para Android e iOS.

### Vídeos

#### React Native Native Modules — Android & iOS (30 min)

<details>
<summary>Descrição do conteúdo</summary>

O vídeo apresenta o conceito de Native Modules passo a passo, começando por uma visão geral da arquitetura do RN (JS thread, bridge e camada nativa) e, em seguida, mostrando como criar um módulo simples em Android (Kotlin) e iOS (Swift). O foco é exatamente o cenário de devs nativos que querem expor funcionalidades já existentes para a camada RN sem reescrever tudo em JavaScript.

São abordados:
- Estrutura mínima de um módulo (`getName`, métodos anotados com `@ReactMethod` / `@objc`).
- Registro do módulo via `ReactPackage` (Android) e via macros Obj-C (iOS).
- Uso de `Promise` para operações assíncronas.
- Boas práticas de namespacing e organização dos arquivos.
- Integração em um app brownfield com uma Activity/VC já existente.

</details>

#### React Native Native UI Components — Expondo Views Nativas para JSX (25 min)

<details>
<summary>Descrição do conteúdo</summary>

Este vídeo demonstra como transformar uma `View`/`UIView` custom, usada hoje apenas em telas nativas, em um componente React reutilizável dentro da parte RN do app. A abordagem é análoga à criação de views custom em Android e iOS, mas com uma camada adicional de *bridge* que permite controlar props e eventos a partir do JavaScript.

Tópicos abordados:
- Criação de `ViewManager` (Android) com propriedades (`@ReactProp`).
- Registro do manager no `ReactPackage`.
- Exposição via `requireNativeComponent` em JS.
- Estratégias de versionamento quando a API da view nativa muda.
- Considerações de performance (ciclos de layout, drawing e animações).

</details>
