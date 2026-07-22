---
title: "Fabric — Renderer & Shadow Tree"
---

# Fabric — Novo Renderer

> **Modulo 03 — React Native Masterclass**
> Publico-alvo: engenheiros senior que precisam entender como o RN 0.76+ renderiza componentes — de `setState` ate os pixels.
> React Native 0.76+ — New Architecture (Fabric, Concurrent Rendering, Bridgeless).

---

## 1. Por que um Novo Renderer

O renderer antigo (o renderer "paper") tinha um problema estrutural: era escrito em Objective-C e Java, o que significava que o nucleo C++ nao podia raciocinar sobre views sem atravessar uma fronteira de linguagem. Cada evento de layout envolvia:

1. Thread JS chama layout (via bridge)
2. Thread de shadow calcula o layout Yoga em C++
3. Resultado serializado de volta para Obj-C/Java
4. Obj-C/Java cria/atualiza views nativas

As informacoes de layout existiam como uma copia em quatro lugares simultaneamente. A mutacao dessa copia exigia locks, e os locks significavam que a thread de UI podia bloquear a thread JS e vice-versa.

O Fabric resolve isso movendo **toda a descricao de view para C++**. As views nativas tornam-se facades finas. O modelo de dados real vive em C++ e e acessivel diretamente da thread JS via JSI — sem serializacao.

O resultado: o layout e sincrono, mutacoes de view sao atomicas, e o renderer pode participar do modelo de concurrent rendering do React (que exige a capacidade de interromper e retomar trabalho sem deixar a arvore de views em estado inconsistente).

---

## 2. Shadow Tree e Reconciliacao

### O que e uma Shadow Tree

A Shadow Tree e a representacao C++ da arvore de componentes React. Cada `<View>`, `<Text>` e `<Image>` que voce escreve em JSX tem um **Shadow Node** correspondente em C++ que:
- Armazena as props do componente como uma struct C++ tipada
- Armazena o no Yoga de layout
- Armazena as metricas de layout calculadas (posicao, tamanho)

Shadow Nodes sao **imutaveis apos o commit**. Voce nunca muta um no commitado — voce o clona, aplica as mudancas e commita a nova arvore. Essa e a mesma filosofia do virtual DOM do React — mas implementada em C++.

```
Arvore React (JS)              Shadow Tree (C++)            Arvore Montada (Nativa)
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

`ViewProps` e uma struct C++ que o Codegen produz a partir da spec TypeScript do componente. Cada prop tem um campo tipado — sem lookups em `NSDictionary` / `ReadableMap` em tempo de execucao.

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

### Reconciliacao: tres arvores em flight

O Fabric mantem tres arvores simultaneamente:

| Arvore | Descricao |
|---|---|
| **Current** | A arvore commitada atualmente na tela |
| **Work-in-progress** | A proxima arvore sendo construida a partir do novo estado React |
| **Rendering** | A arvore sendo transferida para views nativas (pode diferir das duas acima no modo concorrente) |

O reconciliador recebe uma nova arvore de elementos React do reconciliador JS (o differ de virtual DOM do React), cria uma nova Shadow Tree a partir dela, calcula o layout Yoga e commita — tudo em C++.

### O pipeline de commit

```
React (JS) chama setState
        │
        ▼
Reconciliador React produz nova arvore de elementos
        │
        ▼
Fabric C++ recebe a arvore de elementos via JSI
        │
        ▼
ShadowTreeCommitter::commit()
  ├─ Clona ShadowNodes alterados (imutavel — nunca muta in place)
  ├─ Aplica novas props
  ├─ Executa o passo de layout Yoga (calculateLayout)
  └─ Produz LayoutMetrics para cada no
        │
        ▼
MountingCoordinator agenda mutacoes
        │
        ▼
Thread de UI aplica mutacoes nas views nativas
  ├─ Cria novas views
  ├─ Atualiza views existentes (props, layout)
  └─ Deleta views removidas
```

### Engine de layout Yoga

O Yoga e a implementacao C++ de flexbox que alimenta o layout tanto no Fabric quanto no renderer antigo. Sua interface publica e direta:

```cpp
#include <yoga/Yoga.h>

// Cria um no para cada componente
YGNodeRef root = YGNodeNew();
YGNodeStyleSetFlexDirection(root, YGFlexDirectionColumn);
YGNodeStyleSetWidth(root, 375);
YGNodeStyleSetHeight(root, 812);

YGNodeRef child = YGNodeNew();
YGNodeStyleSetFlex(child, 1);
YGNodeInsertChild(root, child, 0);

// Calcula o layout (chamar uma vez por commit)
YGNodeCalculateLayout(root, YGUndefined, YGUndefined, YGDirectionLTR);

// Le os resultados — esses sao os valores em pixels para as views nativas
float childLeft   = YGNodeLayoutGetLeft(child);   // ex.: 0
float childTop    = YGNodeLayoutGetTop(child);    // ex.: 0
float childWidth  = YGNodeLayoutGetWidth(child);  // ex.: 375
float childHeight = YGNodeLayoutGetHeight(child); // ex.: 812

YGNodeFreeRecursive(root);
```

No Fabric, nos Yoga sao embutidos dentro de ShadowNodes. Voce nao chama Yoga diretamente — a ShadowTree o gerencia. Mas entender o Yoga e essencial porque cada prop `style` em um componente React Native mapeia para uma chamada `YGNodeStyle*`.

**Playground de flexbox para o modelo mental do Yoga:** https://yogalayout.dev/playground

---

## 3. Concurrent Rendering

### O que o Modo Concorrente significa para o Fabric

As funcionalidades concorrentes do React 18 (Suspense, `useTransition`, `useDeferredValue`, batching automatico) exigem que o renderer seja interrompivel. O Fabric antigo (RN 0.68–0.71) comecou a base concorrente; o RN 0.76 vem com concurrent rendering completo habilitado por padrao.

O que "interrompivel" significa na pratica:

```typescript
// Com useTransition, o React pode despriorizar esta atualizacao
const [isPending, startTransition] = useTransition();

function handleSearch(query: string) {
  // Esta atualizacao pode ser interrompida se uma atualizacao de maior prioridade chegar
  startTransition(() => {
    setSearchQuery(query);
  });
}
```

Quando `startTransition` esta ativo e o usuario dispara outro evento (scroll, tap), o React pode **descartar o render em andamento** dos resultados de busca e priorizar a interacao do usuario. Sem concurrent rendering, o render era sincrono e nao podia ser interrompido — causando queda de frames.

Para o Fabric, isso significa que a Shadow Tree work-in-progress pode ser descartada antes do commit. O design imutavel de nos do Fabric torna isso seguro: nada foi mutado, entao nada precisa ser "desfeito".

### Prioridades de atualizacao React no Fabric

O Fabric mapeia as prioridades de atualizacao do React (de `react-reconciler`) para prioridades de commit do Fabric:

| Prioridade React | Prioridade Fabric | Caso de uso |
|---|---|---|
| `DiscreteEventPriority` | Sincrono | Tap, press — nao pode atrasar |
| `ContinuousEventPriority` | Sincrono | Scroll, drag |
| `DefaultEventPriority` | Assincrono | Atualizacoes de estado por fetch de dados |
| `IdlePriority` | Diferido | Renderizacao offscreen |

No RN 0.76, eventos discretos (taps) ainda commitam de forma sincrona — se voce toca em um botao e o handler chama `setState`, o novo estado reflete no mesmo frame. Mas uma atualizacao com `startTransition` pode ser dividida entre frames.

### `useTransition` — exemplo pratico

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
      // baixa prioridade — pode ser interrompido se o usuario digitar novamente
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

Aqui, `setQuery` sempre commita de forma sincrona — o valor do `TextInput` nunca atrasa. O `setFiltered` dentro de `startTransition` e interrompivel — se voce digitar o proximo caractere antes do filtro terminar, o React descarta o render anterior em andamento.

---

## 4. Modelo de Threads do Fabric

### As tres threads

```
┌─────────────────────────────────────────────────────────────────┐
│  Thread JS                                                       │
│  - Executa a VM Hermes                                           │
│  - Executa o reconciliador React                                 │
│  - Constroi arvores de elementos React                           │
│  - Chama o Fabric via JSI (sem fila, sem serializacao)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ JSI (chamada C++ direta)
┌──────────────────────────────▼──────────────────────────────────┐
│  Thread de Background (Fabric Commit Thread)                     │
│  - Clona ShadowNodes                                             │
│  - Executa o calculo de layout Yoga                              │
│  - Produz MountingTransactions (listas de mutacoes de view)      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ MountingTransaction (lote atomico)
┌──────────────────────────────▼──────────────────────────────────┐
│  Thread de UI (Main Thread)                                      │
│  - Cria / atualiza / deleta views nativas                        │
│  - Executa animacoes da plataforma                               │
│  - Processa eventos de toque                                     │
└─────────────────────────────────────────────────────────────────┘
```

### O que mudou em relacao a arquitetura antiga

A Shadow Thread antiga fazia o layout mas nao conseguia se comunicar com a thread JS sem passar pela bridge. O Fabric elimina a bridge:

- A thread JS chama o renderer C++ do Fabric **diretamente via JSI** — sem serializacao, sem fila
- A thread de commit e uma thread de background que o Fabric gerencia internamente
- A thread de UI aplica mutacoes entregues como uma `MountingTransaction` — uma lista atomica de instrucoes `Create`, `Update`, `Delete`, `LayoutUpdate`

### Commits sincronos na thread de UI (Synchronous Rendering)

Quando um evento e `DiscreteEventPriority` (um tap), o Fabric pode executar todo o pipeline de forma sincrona na thread de UI:

```
Thread de UI recebe tap
  └─► despacha evento para JS
        └─► React re-renderiza de forma sincrona
              └─► Fabric commita de forma sincrona na thread de UI
                    └─► Views nativas atualizadas no mesmo frame
```

E por isso que pressionar um `<Pressable>` no RN 0.76 parece instantaneo — nao ha troca de thread. Toda a atualizacao e completada na mesma thread que recebeu o evento de toque.

### Seguranca de threads em componentes Fabric

Se voce escreve um componente Fabric nativo, seus metodos C++ sao chamados de threads diferentes:

```cpp
class MyFabricComponentShadowNode final
    : public ConcreteViewShadowNode<...> {
public:
  // Chamado na thread de commit/background do Fabric
  void layout(LayoutContext layoutContext) override {
    // Seguro: apenas le props, nunca toca em views nativas
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

A fronteira de thread e aplicada pelo framework: metodos de ShadowNode rodam na thread de background, metodos de View rodam na thread de UI. Nao cruze essa fronteira.

---
