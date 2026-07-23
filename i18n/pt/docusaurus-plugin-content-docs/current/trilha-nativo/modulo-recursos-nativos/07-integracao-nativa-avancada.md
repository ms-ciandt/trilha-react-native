---
title: Integração Nativa Avançada
---

# Tópico — Integração Nativa Avançada (Trilha 1: Devs Nativos)

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Entender o modelo de **TurboModules** e **Fabric Native Components** no React Native
- Criar e registrar um TurboModule simples em Android e/ou iOS com spec TypeScript
- Expor uma view nativa como Fabric Component via `codegenNativeComponent`
- Emitir eventos tipados do nativo para o JavaScript via `EventEmitter` spec
- Integrar SDKs nativos existentes em um projeto brownfield com RN
- Comparar esse modelo com o que já faz hoje em Android/iOS

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://ms-ciandt.github.io/trilha-react-native/assets/videos/Advanced_Native_Integration_-_nativo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Mapeamento: Android/iOS → React Native

| Nativo                           | React Native                          | Observação |
|----------------------------------|----------------------------------------|------------|
| Activity / ViewController        | Host da árvore RN                     | RN roda dentro de uma Activity/VC existente em brownfield |
| Service / SDK nativo             | **TurboModule**                       | Métodos expostos via JSI — tipados e lazy-loaded |
| View / UIView custom             | **Fabric Native Component**           | Usado em JSX via spec Codegen: `<MyNativeView />` |
| Callbacks / Delegates            | EventEmitter tipado (spec)            | Eventos do nativo → JS via subscription |
| Threads / background tasks       | Threads internas do módulo nativo     | Evitar trabalho pesado na main/UI thread |
| Gradle / Xcodeproj / Pods        | Autolinking / manual linking          | RN descobre módulos via autolinking ou registro explícito |

---

## Conceito central: TurboModules

Um **TurboModule** é uma classe nativa registrada no RN que expõe funções chamáveis pelo JS via JSI — tipadas por uma spec TypeScript e geradas pelo Codegen. Sem serialização JSON no caminho.

### Spec TypeScript (compartilhada entre JS e Codegen)

```ts
// src/native/NativeMyDeviceInfo.ts
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  getDeviceName(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MyDeviceInfo');
```

### Android — exemplo (Kotlin)

```kotlin
// android/app/src/main/java/com/myapp/MyDeviceInfoModule.kt
package com.myapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Promise
import com.myapp.NativeMyDeviceInfoSpec  // gerado pelo Codegen

class MyDeviceInfoModule(reactContext: ReactApplicationContext) :
  NativeMyDeviceInfoSpec(reactContext) {

  override fun getName(): String = NAME

  override fun getDeviceName(promise: Promise) {
    promise.resolve(android.os.Build.MODEL ?: "Unknown")
  }

  companion object { const val NAME = "MyDeviceInfo" }
}
```

O registro usa o mesmo `ReactPackage` — em RN 0.76+ módulos Codegen auto-registram via `TurboReactPackage`.

Uso em TypeScript:

```tsx
// src/native/myDeviceInfo.ts  (wrapper fino)
import NativeMyDeviceInfo from './NativeMyDeviceInfo';

export function getDeviceName(): Promise<string> {
  return NativeMyDeviceInfo.getDeviceName();
}
```

```tsx
// Exemplo de consumo em uma tela RN
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getDeviceName } from '../native/myDeviceInfo';

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

### iOS — exemplo (Swift + spec gerada)

```swift
// ios/MyDeviceInfoModule.swift
import Foundation
import UIKit

// NativeMyDeviceInfoSpec é gerado pelo Codegen a partir da spec TS
@objc(MyDeviceInfo)
class MyDeviceInfoModule: NativeMyDeviceInfoSpec {

  override func getDeviceName(_ resolve: @escaping RCTPromiseResolveBlock,
                               reject: @escaping RCTPromiseRejectBlock) {
    resolve(UIDevice.current.name)
  }

  override static func moduleName() -> String { "MyDeviceInfo" }
}
```

O consumo em TS é idêntico ao Android.

---

## Conceito central: Fabric Native Components

Um **Fabric Native Component** expõe uma `View`/`UIView` customizada para ser usada como componente React. O Codegen lê a spec TypeScript e gera o glue C++; o `ViewManager` implementa a renderização nativa.

### Spec TypeScript

```tsx
// src/native/NativeMyColoredView.ts
import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type NativeProps = ViewProps & {
  color: string;
};

export default codegenNativeComponent<NativeProps>('MyColoredView') as HostComponent<NativeProps>;
```

### Android — View custom exposta em JSX

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

Uso em JSX:

```tsx
import NativeMyColoredView from '../native/NativeMyColoredView';
import { View } from 'react-native';

export function ColoredBoxScreen() {
  return (
    <View>
      <NativeMyColoredView style={{ width: 100, height: 100 }} color="#00FF00" />
    </View>
  );
}
```


---

## EventEmitter tipado: nativo → JS

Na New Architecture, eventos são declarados na spec TypeScript com o tipo `EventEmitter`. O Codegen gera o código de subscription tipado em ambas as plataformas.

### Spec TypeScript com eventos

```ts
// src/native/NativeBatteryModule.ts
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

type BatteryLevelChangedEvent = { level: number };

export interface Spec extends TurboModule {
  startListening(): void;
  readonly onBatteryLevelChanged: EventEmitter<BatteryLevelChangedEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('BatteryModule');
```

### Android — exemplo (Kotlin)

```kotlin
// android/app/src/main/java/com/myapp/BatteryModule.kt
package com.myapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Arguments
import com.myapp.NativeBatteryModuleSpec  // gerado pelo Codegen

class BatteryModule(private val context: ReactApplicationContext) :
  NativeBatteryModuleSpec(context) {

  override fun getName(): String = NAME

  private var receiver: BroadcastReceiver? = null

  override fun startListening() {
    if (receiver != null) return

    receiver = object : BroadcastReceiver() {
      override fun onReceive(c: Context?, intent: Intent?) {
        val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val event = Arguments.createMap().apply { putInt("level", level) }
        emitOnBatteryLevelChanged(event)  // método tipado gerado pelo Codegen
      }
    }

    context.registerReceiver(receiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
  }

  companion object { const val NAME = "BatteryModule" }
}
```

Consumo em RN:

```tsx
// src/hooks/useBatteryLevel.ts
import { useEffect, useState } from 'react';
import NativeBatteryModule from '../native/NativeBatteryModule';

export function useBatteryLevel() {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    NativeBatteryModule.startListening();

    const sub = NativeBatteryModule.onBatteryLevelChanged((event) => {
      setLevel(event.level);
    });

    return () => sub.remove();
  }, []);

  return level;
}
```


---

## Integração brownfield

Em apps brownfield, o RN é hospedado dentro de uma Activity/VC existente. O `NavigationContainer` e a árvore RN gerenciam apenas o trecho em RN — o ciclo de vida da Activity/VC continua nativo.

Boas práticas:
- Manter o código de TurboModules e Fabric Components em um namespace claro (`com.myapp.rn`).
- Documentar quais módulos nativos estão expostos ao RN e quais telas RN existem.
- Evitar expor diretamente todos os SDKs nativos; criar uma camada de serviço específica para RN.

---

## Exercício prático

Construa uma feature RN que consuma código nativo:

1. Crie um TurboModule em Android e iOS com spec TypeScript e:
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
- [TurboModules — Android](https://reactnative.dev/docs/turbo-native-modules-android)
- [TurboModules — iOS](https://reactnative.dev/docs/turbo-native-modules-ios)
- [Fabric Components — Android](https://reactnative.dev/docs/fabric-native-components-android)
- [Fabric Components — iOS](https://reactnative.dev/docs/fabric-native-components-ios)

### Artigos
- *React Native Bridge Architecture Explained* — overview de como o JS conversa com código nativo.
- *Building Custom Native Modules in React Native (2025)* — guia passo a passo para Android e iOS.

---

Next → **[Performance React Native](../modulo-performance/topico-performance-rn-nativos)**
