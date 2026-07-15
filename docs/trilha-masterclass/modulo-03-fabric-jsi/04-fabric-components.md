---
title: "Fabric — Native Components"
---

## 5. Native Components (Fabric Components)

A Fabric Component is a native view exposed to React. In RN 0.76, all native views are Fabric components — the old UIManager-based approach is gone.

### The four required files

Writing a Fabric component involves four artifacts, two of which are auto-generated:

```
MySlider/
  ├── NativeMySlider.ts          ← TypeScript spec (you write)
  ├── MySliderNativeComponent.js ← JS re-export (you write)
  ├── generated/                 ← Codegen output (auto-generated)
  │   ├── RCTMySliderComponentDescriptor.h
  │   ├── Props.h
  │   ├── EventEmitters.h
  │   └── ShadowNode.h
  ├── ios/
  │   └── RCTMySliderComponentView.mm  ← native iOS view (you write)
  └── android/
      └── MySliderView.kt              ← native Android view (you write)
```

### Step 1: TypeScript spec

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
  // Events
  onChange?: BubblingEventHandler<SliderChangeEvent>;
  onSlidingComplete?: DirectEventHandler<SliderChangeEvent>;
};

export default codegenNativeComponent<NativeProps>('MySlider');
```

### Step 2: iOS native view

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
    // constraints...
  }
  return self;
}

// Called by Fabric on UI thread when props change
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
  
  // Dispatch event to JS via Fabric's event system (no bridge)
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

### Step 3: Android native view

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

// ViewManager wiring
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

### Usage in React

```typescript
// MySlider.tsx — wraps the native component
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

### Expo Snack — observe Fabric events

This snack demonstrates the event flow from a Fabric component to JS. On Expo Go, native components run through the Fabric bridge:

https://snack.expo.dev/@react-native-community/slider-example

Open React DevTools (shake device → "Open Debugger") and watch props arrive on the Shadow Node.

---

## 6. Interop Layer: Fabric + Old Components

RN 0.76 ships an **interop layer** that allows old paper components to run inside Fabric without rewriting them. The interop layer wraps the legacy `UIManager`-based view creation in a Fabric-compatible shell.

```
JS calls <LegacyComponent />
         │
         ▼
Fabric Interop Layer
  ├─ Creates a Fabric ShadowNode that delegates to UIManager
  ├─ Translates Fabric events to legacy event dispatch
  └─ Proxies view commands (scrollTo, setNativeProps)
         │
         ▼
Old UIManager creates actual native view (UIView / View)
```

The interop layer is transparent to JavaScript — you do not change any import. In RN 0.76, it is enabled by default and covers ~95% of community libraries.

For the remaining 5% (libraries that use `setNativeProps` heavily or rely on UIManager internals), migration to a full Fabric component is required.

---

## Study Materials

### Official Source Code

| Resource | What you will find |
|---|---|
| [`ShadowTree.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/renderer/core/ShadowTree.cpp) | The commit pipeline — clone, layout, commit |
| [`MountingCoordinator.cpp`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/renderer/mounting/MountingCoordinator.cpp) | How MountingTransactions reach the UI thread |
| [`ShadowNode.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/renderer/core/ShadowNode.h) | Base ShadowNode — clone semantics, props, children |
| [`RCTViewComponentView.mm`](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/AppDelegate/RCTAppDelegate.mm) | Reference Fabric iOS view |

### Official Documentation

| Resource | Description |
|---|---|
| [Fabric Architecture Overview](https://reactnative.dev/architecture/fabric-renderer) | Official description of Shadow Tree, commit, and threading |
| [Yoga playground](https://yogalayout.dev/playground) | Interactive Flexbox — test layout rules against Yoga's C++ output |
| [New Architecture Migration](https://reactnative.dev/docs/new-architecture-intro) | Step-by-step: enabling Fabric, migrating legacy components |
| [Codegen](https://reactnative.dev/docs/the-new-architecture/what-is-codegen) | How TypeScript specs generate C++ Fabric bindings |

### Deep Dives

| Resource | Author | What you will learn |
|---|---|---|
| [Fabric — React Native's New Rendering System](https://blog.swmansion.com/fabric-react-natives-new-rendering-system-7ee03823d73a) | Software Mansion | Thorough walkthrough of commit pipeline + threading |
| [A deep dive into React Native's new architecture](https://engineering.fb.com/2023/06/13/android/react-native-new-architecture/) | Meta Eng | Meta's own description of why each piece was redesigned |
| [Writing Fabric Components](https://reactnative.dev/docs/fabric-native-components-introduction) | RN Docs | Official tutorial: spec → Codegen → iOS + Android views |
| [Concurrent features in RN](https://www.youtube.com/watch?v=hujiYMBpWHY) | React Conf 2022 | How `useTransition` and Suspense compose with Fabric |

### Video Tutorials

| Resource | Duration | What you will learn |
|---|---|---|
| [Inside React Native's Fabric Renderer](https://www.youtube.com/watch?v=UcqRXTriUVI) | 25 min | Visual commit pipeline with C++ source code |
| [React Native New Arch: Fabric Deep Dive](https://www.youtube.com/watch?v=2bvV3zJhMxs) | 40 min | Conference talk — shadow tree, layout, mutations |
| [React Conf 2024 — Concurrent RN](https://www.youtube.com/watch?v=Ck0N9FsKAhI) | 30 min | Latest state of concurrent rendering in RN |

---

Next → [Runtime — New Architecture](./03-runtime-new-architecture.md)
