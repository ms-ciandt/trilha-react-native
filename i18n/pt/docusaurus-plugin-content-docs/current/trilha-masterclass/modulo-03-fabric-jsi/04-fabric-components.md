---
title: "Fabric — Native Components"
---

## 5. Componentes Nativos (Fabric Components)

Um Fabric Component e uma view nativa exposta ao React. No RN 0.76, todas as views nativas sao Fabric components — a abordagem antiga baseada em UIManager foi removida.

### Os quatro arquivos necessarios

Escrever um Fabric Component envolve quatro artefatos, dois dos quais sao gerados automaticamente:

```
MySlider/
  ├── NativeMySlider.ts          ← spec TypeScript (voce escreve)
  ├── MySliderNativeComponent.js ← re-exportacao JS (voce escreve)
  ├── generated/                 ← saida do Codegen (gerado automaticamente)
  │   ├── RCTMySliderComponentDescriptor.h
  │   ├── Props.h
  │   ├── EventEmitters.h
  │   └── ShadowNode.h
  ├── ios/
  │   └── RCTMySliderComponentView.mm  ← view nativa iOS (voce escreve)
  └── android/
      └── MySliderView.kt              ← view nativa Android (voce escreve)
```

### Passo 1: spec TypeScript

```typescript
// NativeMySlider.ts
import type {
  ViewProps,
  Float,
  BubblingEventHandler,
  DirectEventHandler,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export type SliderChangeEvent = Readonly<{
  value: Float;
  fromUser: boolean;
}>;

export type NativeProps = ViewProps & {
  // Props
  value?: Float;
  minimumValue?: Float;
  maximumValue?: Float;
  step?: Float;
  disabled?: boolean;
  // Eventos
  onChange?: BubblingEventHandler<SliderChangeEvent>;
  onSlidingComplete?: DirectEventHandler<SliderChangeEvent>;
};

export default codegenNativeComponent<NativeProps>('MySlider');
```

### Passo 2: view nativa iOS

```objc
// ios/RCTMySliderComponentView.mm
#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>
#import "generated/RCTMySliderComponentDescriptor.h"

using namespace facebook::react;

@implementation RCTMySliderComponentView {
  UISlider* _slider;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<MySliderComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _slider = [[UISlider alloc] init];
    [_slider addTarget:self action:@selector(onChange:) 
      forControlEvents:UIControlEventValueChanged];
    [_slider addTarget:self action:@selector(onSlidingComplete:) 
      forControlEvents:UIControlEventTouchUpInside | UIControlEventTouchUpOutside];
    [self addSubview:_slider];
    _slider.translatesAutoresizingMaskIntoConstraints = NO;
    // restricoes...
  }
  return self;
}

// Chamado pelo Fabric na thread de UI quando as props mudam
- (void)updateProps:(Props::Shared const&)props
           oldProps:(Props::Shared const&)oldProps {
  const auto& concreteProps = *std::static_pointer_cast<MySliderProps const>(props);
  
  _slider.value = concreteProps.value;
  _slider.minimumValue = concreteProps.minimumValue;
  _slider.maximumValue = concreteProps.maximumValue;
  _slider.enabled = !concreteProps.disabled;
  
  [super updateProps:props oldProps:oldProps];
}

- (void)onChange:(UISlider*)slider {
  if (!_eventEmitter) return;
  
  // Despacha evento para o JS via sistema de eventos do Fabric (sem bridge)
  auto& eventEmitter = *std::static_pointer_cast<MySliderEventEmitter const>(_eventEmitter);
  MySliderEventEmitter::OnChange event{
    .value = slider.value,
    .fromUser = true,
  };
  eventEmitter.onChange(event);
}

- (void)onSlidingComplete:(UISlider*)slider {
  if (!_eventEmitter) return;
  auto& eventEmitter = *std::static_pointer_cast<MySliderEventEmitter const>(_eventEmitter);
  MySliderEventEmitter::OnSlidingComplete event{.value = slider.value, .fromUser = true};
  eventEmitter.onSlidingComplete(event);
}

@end
```

### Passo 3: view nativa Android

```kotlin
// android/MySliderView.kt
class MySliderView(context: Context) : SeekBar(context) {

    var eventDispatcher: EventDispatcher? = null
    var surfaceId: Int = -1
    var reactTag: Int = -1
    
    init {
        setOnSeekBarChangeListener(object : OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar, progress: Int, fromUser: Boolean) {
                eventDispatcher?.dispatchEvent(
                    SliderChangeEvent(surfaceId, reactTag, progress / 100f, fromUser)
                )
            }
            override fun onStartTrackingTouch(seekBar: SeekBar) {}
            override fun onStopTrackingTouch(seekBar: SeekBar) {
                eventDispatcher?.dispatchEvent(
                    SliderCompleteEvent(surfaceId, reactTag, progress / 100f)
                )
            }
        })
    }
}

// Configuracao do ViewManager
class MySliderManager : SimpleViewManager<MySliderView>() {
    override fun getName() = "MySlider"
    
    override fun createViewInstance(context: ThemedReactContext) = MySliderView(context)
    
    @ReactProp(name = "value")
    fun setValue(view: MySliderView, value: Float) {
        view.progress = (value * 100).toInt()
    }
    
    @ReactProp(name = "minimumValue")
    fun setMinimumValue(view: MySliderView, min: Float) {
        view.min = (min * 100).toInt()
    }
    
    @ReactProp(name = "maximumValue")
    fun setMaximumValue(view: MySliderView, max: Float) {
        view.max = (max * 100).toInt()
    }
    
    @ReactProp(name = "disabled")
    fun setDisabled(view: MySliderView, disabled: Boolean) {
        view.isEnabled = !disabled
    }
}
```

### Uso no React

```typescript
// MySlider.tsx — encapsula o componente nativo
import NativeMySlider from './NativeMySlider';

export function MySlider({
  value,
  min = 0,
  max = 1,
  step = 0,
  onChange,
}: SliderProps) {
  return (
    <NativeMySlider
      value={value}
      minimumValue={min}
      maximumValue={max}
      step={step}
      onChange={(event) => onChange?.(event.nativeEvent.value)}
      style={{ width: '100%', height: 40 }}
    />
  );
}
```

### Expo Snack — observar eventos Fabric

Este snack demonstra o fluxo de eventos de um Fabric Component ate o JS. No Expo Go, componentes nativos passam pela bridge do Fabric:

https://snack.expo.dev/@react-native-community/slider-example

Abra o React DevTools (shake no dispositivo → "Open Debugger") e observe as props chegando ao Shadow Node.

---

## 6. Camada de Interoperabilidade: Fabric + Componentes Antigos

O RN 0.76 inclui uma **camada de interoperabilidade** que permite que componentes paper antigos rodem dentro do Fabric sem precisar reescreve-los. Essa camada envolve a criacao de views legadas baseadas em `UIManager` em uma casca compativel com Fabric.

```
JS chama <LegacyComponent />
         │
         ▼
Camada de Interoperabilidade Fabric
  ├─ Cria um ShadowNode Fabric que delega para o UIManager
  ├─ Traduz eventos Fabric para o despacho legado de eventos
  └─ Faz proxy de comandos de view (scrollTo, setNativeProps)
         │
         ▼
UIManager antigo cria a view nativa real (UIView / View)
```

A camada de interoperabilidade e transparente para o JavaScript — nenhum import precisa ser alterado. No RN 0.76, ela esta habilitada por padrao e cobre ~95% das bibliotecas da comunidade.

Para os 5% restantes (bibliotecas que fazem uso intenso de `setNativeProps` ou dependem de internos do UIManager), e necessaria a migracao para um Fabric Component completo.

---

## Materiais de Estudo

### Codigo-fonte Oficial

| Recurso | O que voce encontrara |
|---|---|
| [`ShadowTree.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/renderer/core/ShadowTree.cpp) | O pipeline de commit — clone, layout, commit |
| [`MountingCoordinator.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/renderer/mounting/MountingCoordinator.cpp) | Como MountingTransactions chegam a thread de UI |
| [`ShadowNode.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/renderer/core/ShadowNode.h) | ShadowNode base — semantica de clone, props, filhos |
| [`RCTViewComponentView.mm`](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/AppDelegate/RCTAppDelegate.mm) | View iOS Fabric de referencia |

### Documentacao Oficial

| Recurso | Descricao |
|---|---|
| [Fabric Architecture Overview](https://reactnative.dev/architecture/fabric-renderer) | Descricao oficial do Shadow Tree, commit e threading |
| [Yoga playground](https://yogalayout.dev/playground) | Flexbox interativo — teste regras de layout contra a saida C++ do Yoga |
| [New Architecture Migration](https://reactnative.dev/docs/new-architecture-intro) | Passo a passo: habilitando o Fabric, migrando componentes legados |
| [Codegen](https://reactnative.dev/docs/the-new-architecture/what-is-codegen) | Como specs TypeScript geram bindings C++ para o Fabric |

### Aprofundamentos

| Recurso | Autor | O que voce vai aprender |
|---|---|---|
| [Fabric — React Native's New Rendering System](https://blog.swmansion.com/fabric-react-natives-new-rendering-system-7ee03823d73a) | Software Mansion | Walkthrough detalhado do pipeline de commit e threading |
| [A deep dive into React Native's new architecture](https://engineering.fb.com/2023/06/13/android/react-native-new-architecture/) | Meta Eng | Descricao da propria Meta sobre o motivo do redesign de cada parte |
| [Writing Fabric Components](https://reactnative.dev/docs/fabric-native-components-introduction) | RN Docs | Tutorial oficial: spec → Codegen → views iOS + Android |
| [Concurrent features in RN](https://www.youtube.com/watch?v=hujiYMBpWHY) | React Conf 2022 | Como `useTransition` e Suspense se integram ao Fabric |

### Video Tutoriais

| Recurso | Duracao | O que voce vai aprender |
|---|---|---|
| [Inside React Native's Fabric Renderer](https://www.youtube.com/watch?v=UcqRXTriUVI) | 25 min | Pipeline de commit visual com codigo-fonte C++ |
| [React Native New Arch: Fabric Deep Dive](https://www.youtube.com/watch?v=2bvV3zJhMxs) | 40 min | Palestra de conferencia — shadow tree, layout, mutations |
| [React Conf 2024 — Concurrent RN](https://www.youtube.com/watch?v=Ck0N9FsKAhI) | 30 min | Estado atual da renderizacao concorrente no RN |

---

Proximo → [Runtime — New Architecture](./03-runtime-new-architecture.md)
