---
title: "Fabric Native Component com Jetpack Compose"
sidebar_label: "Fabric + Compose"
sidebar_position: 4
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/na_04_fabric.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/na_04_fabric.vtt" srclang="pt" label="Português" default>
  Seu navegador não suporta o elemento de vídeo.
</video>

## O que é um Fabric Native Component

Um **Fabric Native Component** é uma view nativa Android que você expõe ao JSX do React Native. A diferença em relação à arquitetura antiga: o Fabric renderiza nativamente via C++ (sem passar pela bridge JS), e a definição do componente é gerada pelo Codegen a partir de uma spec TypeScript.

A parte mais interessante para desenvolvedores Android: a view subjacente pode ser **qualquer view Android** — incluindo um composable completo do Jetpack Compose. Você escreve sua UI em Compose, envolve em um `AbstractComposeView`, e o Fabric a trata como uma view nativa.

---

## A Arquitetura

```
JSX no React Native
  <RatingBar value={4} onChange={setRating} />
        │
        │ Fabric (renderer C++)
        ▼
Binding C++ do ViewManager gerado pelo Codegen
        │
        │ JNI
        ▼
RatingBarManager.kt (ViewManager)
        │
        │ Cria e gerencia
        ▼
RatingBarComposeView.kt (AbstractComposeView)
        │
        │ Renderiza
        ▼
@Composable RatingBar(value, onValueChange)  ← sua UI em Compose
```

---

## O Exemplo Completo: Uma Barra de Avaliação

Vamos construir um componente `<RatingBar>` — uma barra de 5 estrelas implementada no Jetpack Compose e exposta ao JSX do React Native.

### Passo 1: Spec TypeScript

```typescript
// src/specs/NativeRatingBarComponent.ts
import type { ViewProps } from 'react-native';
import type { Float, Int32, DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

interface NativeProps extends ViewProps {
  // Props passadas do JS para o nativo
  value: Float;           // avaliação atual (0.0 a 5.0)
  maxValue?: Int32;       // máximo de estrelas — padrão 5
  activeColor?: string;   // cor das estrelas preenchidas
  inactiveColor?: string; // cor das estrelas vazias
  stepSize?: Float;       // 0.5 para meia estrela, 1.0 para estrela inteira

  // Eventos do nativo para o JS
  onChange: DirectEventHandler<{ value: Float }>;
}

export default codegenNativeComponent<NativeProps>('RatingBar');
```

### Passo 2: Executar o Codegen

```bash
cd android && ./gradlew generateCodegenArtifactsFromSchema
```

Gera:
- `RatingBarManagerInterface.java` — a interface que seu ViewManager deve implementar
- `RatingBarManagerDelegate.java` — lida com a definição de props a partir do C++

---

### Passo 3: A View Compose

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

    // Propriedades definidas pelo Fabric ViewManager
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
                            // lógica de meia estrela omitida por brevidade
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

### Passo 4: O ViewManager

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
import com.yourapp.RatingBarManagerDelegate  // Gerado pelo Codegen

class RatingBarViewManager(
    private val reactContext: ReactApplicationContext
) : SimpleViewManager<RatingBarComposeView>() {

    private val delegate = RatingBarManagerDelegate(this)

    override fun getName() = "RatingBar"

    override fun createViewInstance(context: ThemedReactContext): RatingBarComposeView {
        val view = RatingBarComposeView(context)

        // Conecta o callback do Compose a um evento do React Native
        view.onChangeCallback = { newValue ->
            val event = androidx.core.os.bundleOf("value" to newValue)
            reactContext
                .getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                .receiveEvent(view.id, "onChange", com.facebook.react.bridge.Arguments.fromBundle(event))
        }

        return view
    }

    // Props — chamadas pelo Fabric quando o JS as atualiza
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

### Passo 5: Registrar o ViewManager

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

Registrar no `MainApplication.kt`:

```kotlin
override fun getPackages() = PackageList(this).packages.apply {
    add(RatingBarPackage())
}
```

---

### Passo 6: O Wrapper JavaScript/TypeScript

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

// Uso
function ProductScreen() {
  const [rating, setRating] = useState(0);

  return (
    <View>
      <RatingBar value={rating} onChange={setRating} />
      <Text>Você avaliou: {rating} estrelas</Text>
    </View>
  );
}
```

---

## Atualização de Props: Como o Fabric Faz o Diff e Aplica

Quando uma prop muda no React (por exemplo, `value` passa de 3 para 4), o Fabric:

1. Calcula o diff em C++ — quais props mudaram
2. Chama o setter `@ReactProp` correspondente no ViewManager
3. O setter atualiza o campo `mutableStateOf` no `AbstractComposeView`
4. O Compose observa a mudança de estado e recompõe apenas a parte afetada

Isso é **diff direto de props sem round-trip JSON** — a camada C++ compara os valores e chama os setters Kotlin diretamente. É equivalente a como o `RecyclerView.Adapter.notifyItemChanged()` atualiza apenas a view específica que mudou.

---

## Tratamento de Layout: Medindo uma View Compose

O Fabric precisa saber o tamanho do seu componente nativo para incluí-lo na passagem de layout do Yoga:

```kotlin
override fun createViewInstance(context: ThemedReactContext): RatingBarComposeView {
    val view = RatingBarComposeView(context)

    // Informa ao Fabric para medir o conteúdo desta view
    view.layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.WRAP_CONTENT,
        FrameLayout.LayoutParams.WRAP_CONTENT
    )

    return view
}
```

Para tamanhos fixos, sobrescreva `measure` no seu `AbstractComposeView` e chame `setMeasuredDimension()`.

---

## Temas do Compose dentro do React Native

Sua view Compose pode usar seu próprio tema Material3 — ela executa em um contexto Compose isolado da árvore de renderização do React Native:

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

## Aprofunde-se — React Native Masterclass

Este tópico mostrou como construir um componente Fabric com Jetpack Compose como base. A Masterclass cobre o Fabric no nível do renderer — como as shadow trees C++ funcionam, o ciclo de vida completo do componente e padrões avançados como medição e despacho de eventos:

- [Fabric Renderer](/trilha-masterclass/modulo-02-jsi-fabric/fabric-renderer) — como o Fabric substitui o UIManager antigo, diff de shadow tree, layout Yoga
- [Fabric Components](/trilha-masterclass/modulo-02-jsi-fabric/fabric-components) — spec completa do componente, props, eventos, comandos e o ciclo de vida do ViewManager
- [Runtime Debugging](/trilha-masterclass/modulo-02-jsi-fabric/runtime-debugging) — depuração de layout e problemas de eventos em componentes Fabric

---

## Materiais de Estudo

### Documentacao Oficial

- [React Native — Fabric Native Components](https://reactnative.dev/docs/the-new-architecture/pillars-fabric-components)
- [React Native — Fabric Components Android](https://reactnative.dev/docs/fabric-native-components-android)
- [Jetpack Compose — AbstractComposeView](https://developer.android.com/reference/kotlin/androidx/compose/ui/platform/AbstractComposeView)
- [Compose — Interoperabilidade com Views](https://developer.android.com/develop/ui/compose/migrate/interoperability-apis/views-in-compose)

### Implementacoes de Referencia

- [react-native-maps](https://github.com/react-native-maps/react-native-maps) — componente Fabric complexo
- [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera) — componente Fabric de alta performance com JSI

### Videos

- [Nicola Corti — Fabric Components deep dive](https://www.youtube.com/watch?v=B3BUnhMtXQQ)

---

## Proximos Passos

Voce ja sabe criar TurboModules e Fabric Components. Topico final: ferramentas de depuracao para a New Architecture — Flipper, React DevTools, Systrace e Android Studio Profiler.

➡ [Depurando a New Architecture](./05-debugging-new-architecture)
