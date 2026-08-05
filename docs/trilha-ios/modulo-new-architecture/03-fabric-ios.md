---
title: Fabric on iOS — Shadow Tree, CALayer and Custom Components
---

# Fabric on iOS — Shadow Tree, CALayer and Custom Components

As a Swift/UIKit developer, you already know that every view on iOS is backed by a `CALayer`. Fabric, React Native's renderer in the New Architecture, was designed with that model in mind: it manages a shadow tree in C++ that translates directly to the `UIView`/`CALayer` hierarchy you know, without the async hops of the old renderer.

---

## The old renderer: threads, bridge, and async layout

In the legacy renderer, the rendering pipeline crossed three separate territories:

1. **JavaScript thread** — produced a description of the component tree.
2. **Shadow thread** (Yoga, in C++) — calculated layout and generated a set of view mutation operations.
3. **Main thread** — received those operations via the serialized bridge (JSON), created or updated `UIView`s, and committed layout changes in a `CATransaction`.

Every boundary was asynchronous. A state update in JS fired a series of serialized messages; the main thread only learned the result after all of that traversed the queue. For you as an iOS developer, this meant:

- There was no way to guarantee that an animation frame and a React Native view update would be committed in the same `CATransaction`.
- Touches could arrive at the main thread while the view tree still reflected a previous state.
- Coordinating native animations with React Native transitions required hacks with `InteractionManager` or `Animated.event` with `useNativeDriver`.

---

## Fabric: synchronous C++ shadow tree

Fabric eliminates the serialized bridge between the shadow thread and the main thread. The shadow tree now lives in C++ shared between the JS runtime (via JSI) and the main thread, with synchronous access from both sides.

The pipeline with Fabric:

1. **JS thread** calls React reconciliation (Concurrent Mode). The result is a new React element tree.
2. **C++ Fabric renderer** traverses that tree and builds or updates shadow tree nodes — strongly-typed `ShadowNode` objects in C++.
3. **Yoga (embedded in Fabric)** calculates layout directly on `ShadowNode`s, still in C++.
4. **Synchronous commit on the main thread** — the `UIManager` applies mutations to the `UIView`/`CALayer` hierarchy within a single `CATransaction`, guaranteeing visual consistency per frame.

The absence of JSON serialization means a state update initiated from Swift (via a native module) can complete the JS → shadow tree → UIView cycle within the same run-loop tick — something impossible with the legacy bridge.

---

## Shadow nodes and the UIView/CALayer hierarchy

Every React Native component mapped by Fabric has a corresponding `ShadowNode` in C++. This node carries:

- **Props**: typed values from JS (color, size, text, callbacks).
- **State**: data that the native side can update and that JS observes (e.g. measured size of a scroll view).
- **Layout result**: position and dimensions calculated by Yoga.

At commit time, Fabric iterates the `ShadowNode` tree and produces a list of mutations (`Create`, `Insert`, `Update`, `Delete`). The `MountingCoordinator` on iOS processes these mutations by creating or updating `UIView`s.

From UIKit's perspective, each `ShadowNode` representing a visible view ends up as a concrete `UIView`. That `UIView` has, like every UIKit view, a `CALayer` underneath. Fabric respects Core Animation's compositing model: properties like `opacity`, `transform`, and `backgroundColor` are applied to the layer, and the commit happens within a `CATransaction` controlled by the `RCTSurfacePresenter`.

---

## RCTFabricSurface and RCTSurfacePresenter

### Replacing RCTRootView

In the legacy renderer, you added an `RCTRootView` to your app's hierarchy to host React Native. With Fabric, the equivalent is `RCTFabricSurface` (or `RCTSurface` in apps using the unified surface API).

```swift
// AppDelegate.swift — initialization with Fabric
import React
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        self.moduleName = "MyApp"
        self.dependencyProvider = RCTAppDependencyProvider()
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }
}
```

`RCTAppDelegate` already configures the `RCTSurfacePresenter` internally when the New Architecture is enabled. If you need to host React Native in a specific `UIViewController`, use `RCTFabricSurface` directly:

```swift
import React

class ReactViewController: UIViewController {
    private var surface: RCTFabricSurface?

    func loadReactSurface(bridge: RCTBridge) {
        let surface = RCTFabricSurface(
            surfacePresenter: bridge.surfacePresenter,
            moduleName: "MyFeature",
            initialProperties: ["userId": "abc123"]
        )
        self.surface = surface

        let surfaceView = surface.view
        view.addSubview(surfaceView)
        surfaceView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            surfaceView.topAnchor.constraint(equalTo: view.topAnchor),
            surfaceView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            surfaceView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            surfaceView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        surface.start()
    }
}
```

### RCTSurfacePresenter and CALayer transactions

`RCTSurfacePresenter` is Fabric's central coordinator on iOS. It:

- Receives the set of mutations from `MountingCoordinator` after each commit.
- Groups all view creations and updates in a single `CATransaction`.
- Guarantees that no view is presented partially updated — the native equivalent of an atomic UI operation.

From a performance perspective, this solves a classic problem in legacy React Native apps: frames where some views reflected the new state while others still showed the old state (UI "tearing").

---

## RCTViewComponentView — the base for custom Fabric components

In the legacy renderer, you created native components by implementing `RCTViewManager` (ObjC) and exporting props via `RCT_EXPORT_VIEW_PROPERTY` macros. With Fabric, the unit of work is `RCTViewComponentView`.

`RCTViewComponentView` is a subclass of `UIView` that implements the `RCTComponentViewProtocol` protocol. It is responsible for:

- Receiving prop updates coming from the shadow tree (`updateProps`).
- Receiving state updates (`updateState`).
- Firing events back to JS via `EventEmitter`.
- Participating in Fabric's mount/unmount lifecycle.

The UIKit analogy: if `UIView` is the visual building block, `RCTViewComponentView` is the building block of a native React Native component in Fabric.

---

## Writing a custom Fabric component in ObjC++

A complete Fabric component involves four pieces in C++/ObjC++ and one UIKit view.

### 1. Props specification in C++

```cpp
// RNSignaturePadProps.h
#pragma once
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>

namespace facebook::react {

class RNSignaturePadProps final : public ViewProps {
public:
    RNSignaturePadProps() = default;
    RNSignaturePadProps(
        const PropsParserContext& context,
        const RNSignaturePadProps& sourceProps,
        const RawProps& rawProps
    );

    Float strokeWidth{2.0};
    SharedColor strokeColor{};
};

} // namespace facebook::react
```

### 2. ComponentDescriptor

```cpp
// RNSignaturePadComponentDescriptor.h
#pragma once
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include "RNSignaturePadShadowNode.h"

namespace facebook::react {

using RNSignaturePadComponentDescriptor =
    ConcreteComponentDescriptor<RNSignaturePadShadowNode>;

} // namespace facebook::react
```

### 3. ShadowNode with EventEmitter

```cpp
// RNSignaturePadShadowNode.h
#pragma once
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include "RNSignaturePadProps.h"
#include "RNSignaturePadEventEmitter.h"

namespace facebook::react {

extern const char RNSignaturePadComponentName[];

using RNSignaturePadShadowNode = ConcreteViewShadowNode<
    RNSignaturePadComponentName,
    RNSignaturePadProps,
    RNSignaturePadEventEmitter,
    ViewShadowNode::ConcreteStateData
>;

} // namespace facebook::react
```

### 4. RCTViewComponentView in ObjC++

```objc
// RNSignaturePadComponentView.mm
#import "RNSignaturePadComponentView.h"
#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import <react/renderer/components/RNSignaturePad/ComponentDescriptors.h>
#import <react/renderer/components/RNSignaturePad/EventEmitters.h>
#import <react/renderer/components/RNSignaturePad/Props.h>
#import "RNSignaturePadView.h" // Swift custom UIView

using namespace facebook::react;

@interface RNSignaturePadComponentView () <RCTComponentViewProtocol>
@end

@implementation RNSignaturePadComponentView {
    RNSignaturePadView *_signaturePadView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
    return concreteComponentDescriptorProvider<RNSignaturePadComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
    if (self = [super initWithFrame:frame]) {
        _signaturePadView = [[RNSignaturePadView alloc] initWithFrame:self.bounds];
        _signaturePadView.autoresizingMask =
            UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [self addSubview:_signaturePadView];

        __weak __typeof(self) weakSelf = self;
        _signaturePadView.onStrokeEnd = ^(NSData *imageData) {
            [weakSelf emitStrokeEndEvent:imageData];
        };
    }
    return self;
}

- (void)updateProps:(const Props::Shared &)props
           oldProps:(const Props::Shared &)oldProps {
    const auto &newProps =
        static_cast<const RNSignaturePadProps &>(*props);

    _signaturePadView.strokeWidth = newProps.strokeWidth;
    if (newProps.strokeColor) {
        _signaturePadView.strokeColor =
            RCTUIColorFromSharedColor(newProps.strokeColor);
    }
    [super updateProps:props oldProps:oldProps];
}

- (void)emitStrokeEndEvent:(NSData *)imageData {
    if (!_eventEmitter) return;
    const auto &emitter =
        static_cast<const RNSignaturePadEventEmitter &>(*_eventEmitter);
    RNSignaturePadEventEmitter::OnStrokeEnd event{};
    // fill event fields according to the spec
    emitter.onStrokeEnd(event);
}

Class<RCTComponentViewProtocol> RNSignaturePadCls(void) {
    return RNSignaturePadComponentView.class;
}
@end
```

---

## Custom UIView in Swift — the helper pattern

Drawing and gesture logic lives in a pure Swift `UIView`. The ObjC++ `RCTViewComponentView` delegates to it. This pattern keeps your Swift code clean and independently testable from any Fabric detail.

```swift
// RNSignaturePadView.swift
import UIKit

@objc public class RNSignaturePadView: UIView {

    @objc public var strokeWidth: CGFloat = 2.0 {
        didSet { currentPath.lineWidth = strokeWidth }
    }

    @objc public var strokeColor: UIColor = .black {
        didSet { setNeedsDisplay() }
    }

    @objc public var onStrokeEnd: ((Data) -> Void)?

    private var currentPath = UIBezierPath()
    private var completedPaths: [UIBezierPath] = []

    public override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let point = touches.first?.location(in: self) else { return }
        currentPath = UIBezierPath()
        currentPath.lineWidth = strokeWidth
        currentPath.lineCapStyle = .round
        currentPath.lineJoinStyle = .round
        currentPath.move(to: point)
    }

    public override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let point = touches.first?.location(in: self) else { return }
        currentPath.addLine(to: point)
        setNeedsDisplay()
    }

    public override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        completedPaths.append(currentPath)
        setNeedsDisplay()
        exportImage()
    }

    public override func draw(_ rect: CGRect) {
        strokeColor.setStroke()
        for path in completedPaths { path.stroke() }
        currentPath.stroke()
    }

    private func exportImage() {
        let renderer = UIGraphicsImageRenderer(bounds: bounds)
        let image = renderer.image { _ in
            drawHierarchy(in: bounds, afterScreenUpdates: true)
        }
        if let data = image.pngData() {
            onStrokeEnd?(data)
        }
    }
}
```

The separation of responsibilities here mirrors what you would do in any reusable UIKit component: the Swift view handles drawing and gestures; the ObjC++ `RCTViewComponentView` handles Fabric integration (props, state, events).

---

## Layout on the main thread and CALayer transactions

As mentioned, Fabric processes the mutation commit on the main thread within an explicit `CATransaction`. For your Swift `UIView` component, this means:

- You can apply Core Animation animations directly in `updateProps` without needing `dispatch_async` to the main thread — Fabric already guarantees that `updateProps` is called on the main queue.
- If you need a layer animation to coincide with a React Native transition, use `CATransaction.begin()` / `CATransaction.commit()` inside `updateProps` with the desired animation duration.
- Avoid `DispatchQueue.main.async` inside `updateProps` — this defers the update to after Fabric's commit, breaking atomicity.

```swift
// Inside updateProps (called by the ObjC++ wrapper):
func applyAnimatedColor(_ color: UIColor) {
    CATransaction.begin()
    CATransaction.setAnimationDuration(0.25)
    layer.backgroundColor = color.cgColor
    CATransaction.commit()
}
```

---

## Component registration

For Fabric to find your component, register it via `RCTFabricComponentsPlugins`:

```objc
// RNSignaturePadComponentView.mm (at the end of the file)
Class<RCTComponentViewProtocol> RNSignaturePadCls(void) {
    return RNSignaturePadComponentView.class;
}
```

And in the app's registration file:

```objc
// RCTFabricComponentsPlugins.mm (generated or maintained manually)
#import <React/RCTFabricComponentsPlugins.h>

Class<RCTComponentViewProtocol> RNSignaturePadCls(void);

void RCTRegisterFabricComponentsPlugins(RCTFabricComponentsPluginsRegistry registry) {
    registry(@"RNSignaturePad", RNSignaturePadCls);
}
```

In Expo projects with native modules via `expo-modules-core`, registration is done via `ExpoFabricView` and `modules.json`, which automates this boilerplate.

---

## Key differences from the legacy renderer

| Aspect | Legacy renderer | Fabric |
|---|---|---|
| Layout calculation | Async shadow thread | Synchronous C++ in shadow tree |
| Applying mutations | Via JSON bridge on main thread | Direct commit on main thread |
| Custom component base | `RCTViewManager` + `RCTView` | `RCTViewComponentView` |
| Props access | `RCT_EXPORT_VIEW_PROPERTY` macros | Strongly-typed C++ structs |
| Events to JS | `RCTBubblingEventBlock` | Typed C++ `EventEmitter` |
| Animation coordination | Explicit `useNativeDriver` required | `CATransaction` in synchronous commit |

---

## Go deeper

The topics covered here — C++ shadow tree, `ComponentDescriptor`, typed `EventEmitter`, and `RCTSurfacePresenter` integration — are the core of Fabric on iOS. The Masterclass trail deepens each of these layers:

- **Module 03 — Fabric and JSI**: complete implementation of `ShadowNode` with state, custom measurement (Yoga measure function), and Swift/C++ interoperability via `@_silgen_name`.
- **Module 02 — TurboModules**: the module (not view) side of the same synchronous architecture, with codegen and TypeScript specs generating ObjC++/Swift automatically.
- **Module 04 — Performance and CI/CD**: how to measure Fabric's impact with Instruments, identify slow commits, and configure pipelines that validate performance on every PR.
