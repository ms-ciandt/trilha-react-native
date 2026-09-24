---
title: "Fabric — Renderer & Shadow Tree"
---

# Fabric — Novo Renderer

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc03_03_fabric-renderer.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc03_03_fabric-renderer.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> **Módulo 03 — React Native Masterclass**
> Público-alvo: engenheiros sênior que precisam entender como o RN 0.76+ renderiza componentes — de `setState` até os pixels.
> React Native 0.76+ — New Architecture (Fabric, Concurrent Rendering, Bridgeless).

---

## 1. Por que um Novo Renderer

O renderer antigo (o renderer "paper") tinha um problema estrutural: era escrito em Objective-C e Java, o que significava que o núcleo C++ não podia raciocinar sobre views sem atravessar uma fronteira de linguagem. Cada evento de layout envolvia:

1. Thread JS chama layout (via bridge)
2. Thread de shadow calcula o layout Yoga em C++
3. Resultado serializado de volta para Obj-C/Java
4. Obj-C/Java cria/atualiza views nativas

As informações de layout existiam como uma cópia em quatro lugares simultaneamente. A mutação dessa cópia exigia locks, e os locks significavam que a thread de UI podia bloquear a thread JS e vice-versa.

O Fabric resolve isso movendo **toda a descrição de view para C++**. As views nativas tornam-se facades finas. O modelo de dados real vive em C++ e é acessível diretamente da thread JS via JSI — sem serialização.

O resultado: o layout é síncrono, mutações de view são atômicas, e o renderer pode participar do modelo de concurrent rendering do React (que exige a capacidade de interromper e retomar trabalho sem deixar a árvore de views em estado inconsistente).

---

## 2. Shadow Tree e Reconciliação

### O que é uma Shadow Tree

A Shadow Tree é a representação C++ da árvore de componentes React. Cada `<View>`, `<Text>` e `<Image>` que você escreve em JSX tem um **Shadow Node** correspondente em C++ que:
- Armazena as props do componente como uma struct C++ tipada
- Armazena o nó Yoga de layout
- Armazena as métricas de layout calculadas (posição, tamanho)

Shadow Nodes são **imutáveis após o commit**. Você nunca muta um nó commitado — você o clona, aplica as mudanças e commita a nova árvore. Essa é a mesma filosofia do virtual DOM do React — mas implementada em C++.

```
Árvore React (JS)              Shadow Tree (C++)            Árvore Montada (Nativa)
─────────────────              ──────────────────           ──────────────────────
<View style={{flex:1}}>   →   ViewShadowNode               UIView / android.view.View
  <Text>Hello</Text>       →     TextShadowNode             UITextView / TextView
  <Image src={...} />      →     ImageShadowNode            UIImageView / ImageView
</View>
```

### Estrutura do Shadow Node

```cpp
// react/renderer/components/view/ViewShadowNode.h (simplificado)
class ViewShadowNode final : public ConcreteViewShadowNode<
    ViewComponentName,    // "RCTView"
    ViewShadowNodeFragment,
    ViewEventEmitter,
    ViewProps            // struct C++ tipada derivada das props JS
> {
public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
};
```

`ViewProps` é uma struct C++ que o Codegen produz a partir da spec TypeScript do componente. Cada prop tem um campo tipado — sem lookups em `NSDictionary` / `ReadableMap` em tempo de execução.

```cpp
// ViewProps.h — gerado pelo Codegen
class ViewProps : public YogaStylableProps, public AccessibilityProps {
public:
  // Cada prop tem um campo C++ com seu valor padrao
  SharedColor backgroundColor{};
  Float opacity{1.0};
  EdgeInsets borderWidth{};
  BorderStyle borderStyle{BorderStyle::Solid};
  // ...
};
```

### Reconciliação: três árvores em flight

O Fabric mantém três árvores simultaneamente:

| Árvore | Descrição |
|---|---|
| **Current** | A árvore commitada atualmente na tela |
| **Work-in-progress** | A próxima árvore sendo construída a partir do novo estado React |
| **Rendering** | A árvore sendo transferida para views nativas (pode diferir das duas acima no modo concorrente) |

O reconciliador recebe uma nova árvore de elementos React do reconciliador JS (o differ de virtual DOM do React), cria uma nova Shadow Tree a partir dela, calcula o layout Yoga e commita — tudo em C++.

### O pipeline de commit

```
React (JS) chama setState
        │
        ▼
Reconciliador React produz nova árvore de elementos
        │
        ▼
Fabric C++ recebe a árvore de elementos via JSI
        │
        ▼
ShadowTreeCommitter::commit()
  ├─ Clona ShadowNodes alterados (imutável — nunca muta in place)
  ├─ Aplica novas props
  ├─ Executa o passo de layout Yoga (calculateLayout)
  └─ Produz LayoutMetrics para cada nó
        │
        ▼
MountingCoordinator agenda mutações
        │
        ▼
Thread de UI aplica mutações nas views nativas
  ├─ Cria novas views
  ├─ Atualiza views existentes (props, layout)
  └─ Deleta views removidas
```

### Engine de layout Yoga

O Yoga é a implementação C++ de flexbox que alimenta o layout tanto no Fabric quanto no renderer antigo. Sua interface pública é direta:

```cpp
#include <yoga/Yoga.h>

// Cria um nó para cada componente
YGNodeRef root = YGNodeNew();
YGNodeStyleSetFlexDirection(root, YGFlexDirectionColumn);
YGNodeStyleSetWidth(root, 375);
YGNodeStyleSetHeight(root, 812);

YGNodeRef child = YGNodeNew();
YGNodeStyleSetFlex(child, 1);
YGNodeInsertChild(root, child, 0);

// Calcula o layout (chamar uma vez por commit)
YGNodeCalculateLayout(root, YGUndefined, YGUndefined, YGDirectionLTR);

// Lê os resultados — esses são os valores em pixels para as views nativas
float childLeft   = YGNodeLayoutGetLeft(child);   // ex.: 0
float childTop    = YGNodeLayoutGetTop(child);    // ex.: 0
float childWidth  = YGNodeLayoutGetWidth(child);  // ex.: 375
float childHeight = YGNodeLayoutGetHeight(child); // ex.: 812

YGNodeFreeRecursive(root);
```

No Fabric, nós Yoga são embutidos dentro de ShadowNodes. Você não chama Yoga diretamente — a ShadowTree o gerencia. Mas entender o Yoga é essencial porque cada prop `style` em um componente React Native mapeia para uma chamada `YGNodeStyle*`.

**Playground de flexbox para o modelo mental do Yoga:** https://yogalayout.dev/playground

---

## 3. Concurrent Rendering

### O que o Modo Concorrente significa para o Fabric

As funcionalidades concorrentes do React 18 (Suspense, `useTransition`, `useDeferredValue`, batching automático) exigem que o renderer seja interrompível. O Fabric antigo (RN 0.68–0.71) começou a base concorrente; o RN 0.76 vem com concurrent rendering completo habilitado por padrão.

O que "interrompível" significa na prática:

```typescript
// Com useTransition, o React pode despriorizar esta atualização
const [isPending, startTransition] = useTransition();

function handleSearch(query: string) {
  // Esta atualização pode ser interrompida se uma atualização de maior prioridade chegar
  startTransition(() => {
    setSearchQuery(query);
  });
}
```

Quando `startTransition` está ativo e o usuário dispara outro evento (scroll, tap), o React pode **descartar o render em andamento** dos resultados de busca e priorizar a interação do usuário. Sem concurrent rendering, o render era síncrono e não podia ser interrompido — causando queda de frames.

Para o Fabric, isso significa que a Shadow Tree work-in-progress pode ser descartada antes do commit. O design imutável de nós do Fabric torna isso seguro: nada foi mutado, então nada precisa ser "desfeito".

### Prioridades de atualização React no Fabric

O Fabric mapeia as prioridades de atualização do React (de `react-reconciler`) para prioridades de commit do Fabric:

| Prioridade React | Prioridade Fabric | Caso de uso |
|---|---|---|
| `DiscreteEventPriority` | Síncrono | Tap, press — não pode atrasar |
| `ContinuousEventPriority` | Síncrono | Scroll, drag |
| `DefaultEventPriority` | Assíncrono | Atualizações de estado por fetch de dados |
| `IdlePriority` | Diferido | Renderização offscreen |

No RN 0.76, eventos discretos (taps) ainda commitam de forma síncrona — se você toca em um botão e o handler chama `setState`, o novo estado reflete no mesmo frame. Mas uma atualização com `startTransition` pode ser dividida entre frames.

### `useTransition` — exemplo prático

```typescript
import React, { useState, useTransition, Suspense } from 'react';
import { FlatList, TextInput, ActivityIndicator, View } from 'react-native';

// Um filtro intencionalmente custoso sobre uma lista grande
function filterProducts(query: string, products: Product[]): Product[] {
  return products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase())
  );
}

export function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState(products);
  const [isPending, startTransition] = useTransition();

  const handleChange = (text: string) => {
    setQuery(text);  // alta prioridade — TextInput permanece responsivo

    startTransition(() => {
      // baixa prioridade — pode ser interrompido se o usuário digitar novamente
      setFiltered(filterProducts(text, products));
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <TextInput value={query} onChangeText={handleChange} />
      {isPending && <ActivityIndicator />}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        renderItem={({ item }) => <ProductRow product={item} />}
      />
    </View>
  );
}
```

Aqui, `setQuery` sempre commita de forma síncrona — o valor do `TextInput` nunca atrasa. O `setFiltered` dentro de `startTransition` é interrompível — se você digitar o próximo caractere antes do filtro terminar, o React descarta o render anterior em andamento.

---

## 4. Modelo de Threads do Fabric

### As três threads

```
┌─────────────────────────────────────────────────────────────────┐
│  Thread JS                                                       │
│  - Executa a VM Hermes                                           │
│  - Executa o reconciliador React                                 │
│  - Constrói árvores de elementos React                           │
│  - Chama o Fabric via JSI (sem fila, sem serialização)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ JSI (chamada C++ direta)
┌──────────────────────────────▼──────────────────────────────────┐
│  Thread de Background (Fabric Commit Thread)                     │
│  - Clona ShadowNodes                                             │
│  - Executa o cálculo de layout Yoga                              │
│  - Produz MountingTransactions (listas de mutações de view)      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ MountingTransaction (lote atômico)
┌──────────────────────────────▼──────────────────────────────────┐
│  Thread de UI (Main Thread)                                      │
│  - Cria / atualiza / deleta views nativas                        │
│  - Executa animações da plataforma                               │
│  - Processa eventos de toque                                     │
└─────────────────────────────────────────────────────────────────┘
```

### O que mudou em relação à arquitetura antiga

A Shadow Thread antiga fazia o layout mas não conseguia se comunicar com a thread JS sem passar pela bridge. O Fabric elimina a bridge:

- A thread JS chama o renderer C++ do Fabric **diretamente via JSI** — sem serialização, sem fila
- A thread de commit é uma thread de background que o Fabric gerencia internamente
- A thread de UI aplica mutações entregues como uma `MountingTransaction` — uma lista atômica de instruções `Create`, `Update`, `Delete`, `LayoutUpdate`

### Commits síncronos na thread de UI (Synchronous Rendering)

Quando um evento é `DiscreteEventPriority` (um tap), o Fabric pode executar todo o pipeline de forma síncrona na thread de UI:

```
Thread de UI recebe tap
  └─► despacha evento para JS
        └─► React re-renderiza de forma síncrona
              └─► Fabric commita de forma síncrona na thread de UI
                    └─► Views nativas atualizadas no mesmo frame
```

É por isso que pressionar um `<Pressable>` no RN 0.76 parece instantâneo — não há troca de thread. Toda a atualização é completada na mesma thread que recebeu o evento de toque.

### Segurança de threads em componentes Fabric

Se você escreve um componente Fabric nativo, seus métodos C++ são chamados de threads diferentes:

```cpp
class MyFabricComponentShadowNode final
    : public ConcreteViewShadowNode<...> {
public:
  // Chamado na thread de commit/background do Fabric
  void layout(LayoutContext layoutContext) override {
    // Seguro: apenas lê props, nunca toca em views nativas
    auto size = getLayoutMetrics().frame.size;
  }
};

// Sua classe de view nativa
class MyFabricView : public RCTViewComponentView {  // iOS
public:
  // Chamado na thread de UI
  void updateProps(Props::Shared const& props, Props::Shared const& oldProps) override {
    // Seguro: roda na thread de UI, pode mutar views UIKit
    auto& concreteProps = *std::static_pointer_cast<MyFabricComponentProps const>(props);
    self.label.text = RCTNSStringFromString(concreteProps.title);
  }
};
```

A fronteira de thread é aplicada pelo framework: métodos de ShadowNode rodam na thread de background, métodos de View rodam na thread de UI. Não cruze essa fronteira.

---
