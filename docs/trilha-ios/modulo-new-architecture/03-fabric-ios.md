---
title: Fabric no iOS — Shadow Tree, CALayer e Componentes Customizados
---

# Fabric no iOS — Shadow Tree, CALayer e Componentes Customizados

Como desenvolvedor Swift/UIKit, você já sabe que toda view no iOS é respaldada por uma `CALayer`. O Fabric, renderer do React Native na New Architecture, foi projetado com esse modelo em mente: ele gerencia uma shadow tree em C++ que se traduz diretamente para a hierarquia de `UIView`/`CALayer` que você conhece, sem os saltos assíncronos do renderer antigo.

---

## O renderer antigo: threads, bridge e layout assíncrono

No renderer legado, o pipeline de renderização atravessava três territórios separados:

1. **JavaScript thread** — produzia uma descrição da árvore de componentes.
2. **Shadow thread** (Yoga, em C++) — calculava o layout e gerava um conjunto de operações de mutação de view.
3. **Main thread** — recebia essas operações via bridge serializada (JSON), criava ou atualizava `UIView`s e confirmava as mudanças de layout em um `CATransaction`.

Cada fronteira era assíncrona. Uma atualização de estado no JS disparava uma série de mensagens serializadas; o main thread só sabia do resultado depois que tudo isso percorria a fila. Para você, como desenvolvedor iOS, isso significava que:

- Não havia como garantir que um frame de animação e uma atualização de view do React Native fossem confirmados no mesmo `CATransaction`.
- Toques podiam chegar ao main thread enquanto a árvore de views ainda refletia um estado anterior.
- Coordenar animações nativas com transições React Native exigia hacks com `InteractionManager` ou `Animated.event` com `useNativeDriver`.

---

## Fabric: shadow tree síncrona em C++

O Fabric elimina a bridge serializada entre o shadow thread e o main thread. A shadow tree agora vive em C++ compartilhado entre o runtime JS (via JSI) e o main thread, com acesso síncrono de ambos os lados.

O pipeline com Fabric:

1. **JS thread** chama a reconciliação React (Concurrent Mode). O resultado é uma nova árvore de elementos React.
2. **C++ Fabric renderer** percorre essa árvore e constrói ou atualiza nós da shadow tree — objetos `ShadowNode` fortemente tipados em C++.
3. **Yoga (embutido no Fabric)** calcula o layout diretamente nos `ShadowNode`s, ainda em C++.
4. **Commit síncrono no main thread** — o `UIManager` aplica as mutações à hierarquia de `UIView`/`CALayer` dentro de um único `CATransaction`, garantindo consistência visual por frame.

A ausência de serialização JSON significa que uma atualização de estado iniciada do Swift (via um módulo nativo) pode completar o ciclo JS → shadow tree → UIView dentro do mesmo run-loop tick — algo impossível com a bridge legada.

---

## Shadow nodes e a hierarquia UIView/CALayer

Cada componente React Native mapeado pelo Fabric possui um `ShadowNode` correspondente em C++. Esse nó carrega:

- **Props**: valores tipados vindos do JS (cor, tamanho, texto, callbacks).
- **State**: dados que o lado nativo pode atualizar e que o JS observa (por exemplo, tamanho medido de um scroll view).
- **Layout result**: posição e dimensões calculadas pelo Yoga.

No momento do commit, o Fabric itera a árvore de `ShadowNode`s e produz uma lista de mutações (`Create`, `Insert`, `Update`, `Delete`). O `MountingCoordinator` no iOS processa essas mutações criando ou atualizando `UIView`s.

Do ponto de vista do UIKit, cada `ShadowNode` que representa uma view visível termina em uma `UIView` concreta. Essa `UIView` tem, como toda view UIKit, uma `CALayer` por baixo. O Fabric respeita o modelo de compositing do Core Animation: propriedades como `opacity`, `transform` e `backgroundColor` são aplicadas à layer, e o commit acontece dentro de um `CATransaction` controlado pelo `RCTSurfacePresenter`.

---

## RCTFabricSurface e RCTSurfacePresenter

### Substituindo RCTRootView

No renderer legado, você adicionava um `RCTRootView` à hierarquia do seu app para hospedar o React Native. Com Fabric, o equivalente é `RCTFabricSurface` (ou `RCTSurface` em apps que usam a surface API unificada).

```swift
// AppDelegate.swift — inicialização com Fabric
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

O `RCTAppDelegate` já configura o `RCTSurfacePresenter` internamente quando a New Architecture está ativada. Se você precisar hospedar React Native em um `UIViewController` específico, use `RCTFabricSurface` diretamente:

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

### RCTSurfacePresenter e CALayer transactions

O `RCTSurfacePresenter` é o coordenador central do Fabric no iOS. Ele:

- Recebe o conjunto de mutações do `MountingCoordinator` após cada commit.
- Agrupa todas as criações e atualizações de view em um único `CATransaction`.
- Garante que nenhuma view seja apresentada parcialmente atualizada — o equivalente nativo de uma operação atômica de UI.

Do ponto de vista de performance, isso resolve um problema clássico de apps React Native legados: frames onde algumas views refletiam o estado novo e outras ainda mostravam o estado antigo (o "tearing" de UI).

---

## RCTViewComponentView — a base dos componentes Fabric customizados

No renderer legado, você criava componentes nativos implementando `RCTViewManager` (ObjC) e exportando props via macros `RCT_EXPORT_VIEW_PROPERTY`. Com Fabric, a unidade de trabalho é a `RCTViewComponentView`.

`RCTViewComponentView` é uma subclasse de `UIView` que implementa o protocolo `RCTComponentViewProtocol`. Ela é responsável por:

- Receber atualizações de props vindas da shadow tree (`updateProps`).
- Receber atualizações de estado (`updateState`).
- Disparar eventos de volta para o JS via `EventEmitter`.
- Participar do ciclo de montagem/desmontagem do Fabric.

A analogia com UIKit: se `UIView` é o building block visual, `RCTViewComponentView` é o building block de um componente React Native nativo no Fabric.

---

## Escrevendo um componente Fabric customizado em ObjC++

Um componente Fabric completo envolve quatro peças em C++/ObjC++ e uma view UIKit.

### 1. Especificação de props em C++

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

### 3. ShadowNode com EventEmitter

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

### 4. RCTViewComponentView em ObjC++

```objc
// RNSignaturePadComponentView.mm
#import "RNSignaturePadComponentView.h"
#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import <react/renderer/components/RNSignaturePad/ComponentDescriptors.h>
#import <react/renderer/components/RNSignaturePad/EventEmitters.h>
#import <react/renderer/components/RNSignaturePad/Props.h>
#import "RNSignaturePadView.h" // UIView customizada em Swift

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
    // preencher campos do evento conforme a spec
    emitter.onStrokeEnd(event);
}

Class<RCTComponentViewProtocol> RNSignaturePadCls(void) {
    return RNSignaturePadComponentView.class;
}
@end
```

---

## UIView customizada em Swift — o padrão helper

A lógica de desenho e gesto fica em uma `UIView` Swift pura. O `RCTViewComponentView` em ObjC++ delega para ela. Esse padrão mantém seu código Swift limpo e testável isoladamente de qualquer detalhe do Fabric.

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

A separação de responsabilidades aqui espelha o que você faria em qualquer componente UIKit reutilizável: a view Swift cuida do desenho e dos gestos; o `RCTViewComponentView` em ObjC++ cuida da integração com o Fabric (props, estado, eventos).

---

## Layout no main thread e CALayer transactions

Como mencionado, o Fabric processa o commit de mutações no main thread dentro de um `CATransaction` explícito. Para o seu componente `UIView` Swift, isso significa:

- Você pode aplicar animações Core Animation diretamente no `updateProps` sem precisar de `dispatch_async` para o main thread — o Fabric já garante que `updateProps` é chamado na main queue.
- Se você precisar que uma animação de layer coincida com uma transição React Native, use `CATransaction.begin()` / `CATransaction.commit()` dentro do `updateProps` com a duração de animação desejada.
- Evite `DispatchQueue.main.async` dentro de `updateProps` — isso adia a atualização para depois do commit do Fabric, quebrando a atomicidade.

```swift
// Dentro de updateProps (chamado pelo ObjC++ wrapper):
func applyAnimatedColor(_ color: UIColor) {
    CATransaction.begin()
    CATransaction.setAnimationDuration(0.25)
    layer.backgroundColor = color.cgColor
    CATransaction.commit()
}
```

---

## Registro do componente

Para que o Fabric encontre seu componente, registre-o via `RCTFabricComponentsPlugins`:

```objc
// RNSignaturePadComponentView.mm (ao final do arquivo)
Class<RCTComponentViewProtocol> RNSignaturePadCls(void) {
    return RNSignaturePadComponentView.class;
}
```

E no arquivo de registro do app:

```objc
// RCTFabricComponentsPlugins.mm (gerado ou mantido manualmente)
#import <React/RCTFabricComponentsPlugins.h>

Class<RCTComponentViewProtocol> RNSignaturePadCls(void);

void RCTRegisterFabricComponentsPlugins(RCTFabricComponentsPluginsRegistry registry) {
    registry(@"RNSignaturePad", RNSignaturePadCls);
}
```

Em projetos Expo com módulos nativos via `expo-modules-core`, o registro é feito via `ExpoFabricView` e `modules.json`, que automatiza esse boilerplate.

---

## Diferenças-chave em relação ao renderer legado

| Aspecto | Renderer legado | Fabric |
|---|---|---|
| Cálculo de layout | Shadow thread assíncrono | C++ síncrono na shadow tree |
| Aplicação de mutations | Via bridge JSON no main thread | Commit direto no main thread |
| Base de componente customizado | `RCTViewManager` + `RCTView` | `RCTViewComponentView` |
| Acesso a props | Macros `RCT_EXPORT_VIEW_PROPERTY` | Structs C++ fortemente tipadas |
| Eventos para JS | `RCTBubblingEventBlock` | `EventEmitter` C++ tipado |
| Coordenação de animação | Necessário `useNativeDriver` explícito | `CATransaction` no commit síncrono |

---

## Ir mais fundo

Os tópicos abordados aqui — shadow tree em C++, `ComponentDescriptor`, `EventEmitter` tipado e integração com `RCTSurfacePresenter` — são o núcleo do Fabric no iOS. A Trilha Masterclass aprofunda cada uma dessas camadas:

- **Modulo 03 — Fabric e JSI**: implementação completa de `ShadowNode` com state, medição customizada (Yoga measure function) e interoperabilidade Swift/C++ via `@_silgen_name`.
- **Modulo 02 — TurboModules**: o lado de módulos (não views) da mesma arquitetura síncrona, com codegen e specs TypeScript gerando o ObjC++/Swift automaticamente.
- **Modulo 04 — Performance e CI/CD**: como medir o impacto do Fabric com Instruments, identificar commits lentos e configurar pipelines que validam performance em cada PR.
