---
title: "Gesture Handler + Layout Animations"
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/anim_04_gesture_and_layout.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# Gesture Handler + Layout Animations

> Animações baseadas em gestos e transições de layout representam o trabalho de animação mais complexo em um app React Native. Este documento cobre o Gesture Handler 2 com integração Reanimated, e o sistema de layout animations do Reanimated 3 sobre o Fabric.

---

## Gesture Handler 2 — arquitetura

O React Native Gesture Handler (RNGH) 2 executa todo o reconhecimento de gestos nativamente na thread UI. Combinado com Reanimated, os callbacks de gesto são executados como worklets, criando um pipeline onde toque → reconhecimento de gesto → atualização de animação nunca toca a thread JS:

```
Evento de toque (SO)
       │
       ▼
 RNGH (thread UI)
 Reconhecedor de gesto
       │
       ▼
 Callback de gesto (worklet, thread UI)
       │  withSpring / withTiming
       ▼
 Atualização de shared value
       │
       ▼
 useAnimatedStyle recalcula
       │
       ▼
 Fabric aplica mutação na view
       │
       ▼
 Frame na tela
```

A thread JS nunca está nesse caminho para a atualização de animação. Só entra quando você chama explicitamente `runOnJS`.

---

## Instalação

```bash
npm install react-native-gesture-handler
```

Envolva todo o app com `GestureHandlerRootView`:

```typescript
// App.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
```

`GestureHandlerRootView` deve ficar o mais alto possível na árvore. Gestos fora dele não são reconhecidos. Um erro comum é colocá-lo dentro de um Navigator, excluindo a detecção de gestos no chrome de navegação.

---

## Tipos de gesto disponíveis

```typescript
import { Gesture } from 'react-native-gesture-handler';

Gesture.Tap()           // toque simples e multi-toque
Gesture.LongPress()     // pressão sustentada
Gesture.Pan()           // arrastar em qualquer direção
Gesture.Pinch()         // zoom com dois dedos
Gesture.Rotation()      // rotação com dois dedos
Gesture.Fling()         // deslize rápido em uma direção
Gesture.ForceTouch()    // iOS 3D Touch / pressão forçada
Gesture.Native()        // delegar para reconhecedor de gesto nativo
Gesture.Manual()        // máquina de estados totalmente manual
```

---

## Gesto de arrastar com retorno em mola

Um cartão arrastável que retorna ao centro ao ser solto:

```typescript
import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface ArrastavelProps {
  onFechar?: () => void;
}

export function CartaoArrastavel({ onFechar }: ArrastavelProps) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Salva posição no início do arraste
      startX.value = offsetX.value;
      startY.value = offsetY.value;
      scale.value = withSpring(1.04);
    })
    .onUpdate((event) => {
      offsetX.value = startX.value + event.translationX;
      offsetY.value = startY.value + event.translationY;
    })
    .onEnd((event) => {
      const deveFechar = Math.abs(event.translationY) > 150;

      if (deveFechar) {
        const direcao = event.translationY > 0 ? 600 : -600;
        offsetY.value = withSpring(direcao, { velocity: event.velocityY });
        if (onFechar) runOnJS(onFechar)();
      } else {
        // Retorna à origem com mola
        offsetX.value = withSpring(0, { velocity: event.velocityX });
        offsetY.value = withSpring(0, { velocity: event.velocityY });
        scale.value = withSpring(1);
      }
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
    });

  const estiloCartao = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.cartao, estiloCartao]} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  cartao: {
    width: 280,
    height: 380,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
  },
});
```

### Transferência de velocidade

Passar `velocity` do gesto para a mola cria uma transferência fisicamente precisa onde a velocidade inicial da animação corresponde à velocidade do dedo no momento da soltura:

```typescript
.onEnd((event) => {
  offsetX.value = withSpring(0, {
    velocity: event.velocityX,  // transfere velocidade do dedo para a mola
    damping: 20,
    stiffness: 200,
  });
});
```

Sem transferência de velocidade, a mola sempre começa com velocidade zero — parece que o item muda de velocidade abruptamente ao ser solto.

---

## Combinação de pinch + rotação

Gesto de dois dedos combinando pinch e rotação simultaneamente:

```typescript
export function VisualizadorFoto({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  // Simultâneo permite que ambos reconheçam ao mesmo tempo
  const composto = Gesture.Simultaneous(pinchGesture, rotationGesture);

  const estiloImagem = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${(rotation.value * 180) / Math.PI}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={composto}>
      <Animated.Image source={{ uri }} style={[styles.imagem, estiloImagem]} />
    </GestureDetector>
  );
}
```

---

## Composição de gestos

### `Gesture.Simultaneous`

Ambos os gestos reconhecem ao mesmo tempo. Use para pinch + rotação, pan + rotação:

```typescript
const composto = Gesture.Simultaneous(panGesture, pinchGesture);
```

### `Gesture.Exclusive`

O primeiro gesto a ativar bloqueia os outros. Use para desambiguação entre deslize e toque:

```typescript
const composto = Gesture.Exclusive(swipeGesture, tapGesture);
// Se o deslize ativar, o toque é cancelado
```

### `Gesture.Race`

O primeiro gesto a ativar vence; todos os outros são cancelados imediatamente:

```typescript
const composto = Gesture.Race(longPressGesture, tapGesture);
```

### `requireExternalGestureToFail`

Útil para scroll views aninhados — o scroll interno não deve ativar até que o gesto externo falhe:

```typescript
const innerPan = Gesture.Pan().requireExternalGestureToFail(outerSwipe);
```

---

## Desabilitando Reanimated para gestos simples

Quando um gesto só precisa atualizar estado React (sem animação na thread UI), `runOnJS(true)` pula a execução do worklet completamente:

```typescript
const tapGesture = Gesture.Tap()
  .runOnJS(true)
  .onEnd(() => {
    // Roda na thread JS diretamente — sem overhead de worklet
    setCount(c => c + 1);
  });
```

---

## Layout animations com Reanimated 3

Layout animations animam mudanças de posição/tamanho e montagem/desmontagem de componentes. São controladas pelo ciclo de vida nativo de views do Fabric, não por re-renders do React.

### Animações de entrada e saída

```typescript
import Animated, { FadeIn, FadeOut, SlideInRight, BounceOut } from 'react-native-reanimated';

function BannerNotificacao({ visible }: { visible: boolean }) {
  return visible ? (
    <Animated.View
      entering={SlideInRight.duration(350).easing(Easing.out(Easing.cubic))}
      exiting={FadeOut.duration(200)}
      style={styles.banner}
    >
      <Text>Nova mensagem</Text>
    </Animated.View>
  ) : null;
}
```

**Famílias de presets disponíveis:**

| Família | Variantes |
|---|---|
| `Fade` | `FadeIn`, `FadeOut`, `FadeInUp`, `FadeInDown`, `FadeInLeft`, `FadeInRight` |
| `Slide` | `SlideInUp`, `SlideInDown`, `SlideInLeft`, `SlideInRight` (+ variantes Out) |
| `Zoom` | `ZoomIn`, `ZoomOut`, `ZoomInEasyUp`, `ZoomInRotate` |
| `Bounce` | `BounceIn`, `BounceOut`, `BounceInUp`, `BounceInDown` |
| `Flip` | `FlipInYLeft`, `FlipInXUp`, `FlipOutYRight` |
| `Stretch` | `StretchInX`, `StretchInY`, `StretchOutX` |
| `Roll` | `RollInLeft`, `RollOutRight` |

Encadeamento de modificadores:

```typescript
FadeInDown
  .duration(500)
  .delay(100)
  .easing(Easing.out(Easing.back(1.5)))
  .springify()
  .damping(12)
  .stiffness(100)
  .withCallback((finished) => {
    'worklet';
    if (finished) runOnJS(onEntradaConcluida)();
  });
```

### Entrada em cascata numa lista

```typescript
function ListaAnimada({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <Animated.View
          key={item}
          entering={FadeInDown.delay(index * 60).duration(400)}
        >
          <ItemLista label={item} />
        </Animated.View>
      ))}
    </View>
  );
}
```

**Nota de performance:** Instancie presets de animação fora do componente ou em `useMemo` — criar objetos builder dentro de um map roda a cada render:

```typescript
// Melhor: memoizar builders por índice
const animacaoEntrada = useMemo(
  () => FadeInDown.delay(index * 60).duration(400),
  [index]
);
```

### Transições de layout

Anima itens quando seu layout muda (reordenação, redimensionamento) dentro de um container:

```typescript
import Animated, { LinearTransition, SequencedTransition } from 'react-native-reanimated';

function ListaReordenavel({ items }: { items: Item[] }) {
  return (
    <View>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          layout={LinearTransition.duration(300)}
        >
          <ItemLista item={item} />
        </Animated.View>
      ))}
    </View>
  );
}
```

**Transições disponíveis:**

- `LinearTransition` — movimento uniforme com easing/mola configurável
- `SequencedTransition` — largura primeiro, depois altura (útil para reordenação em grid)
- `FadingTransition` — fade out na posição antiga, fade in na nova
- `JumpingTransition` — movimento em arco
- `CurvedTransition` — easing independente por eixo (X, Y, width, height)
- `EntryExitTransition` — usa presets de entrada/saída para mudanças de posição

Transição de layout com mola:

```typescript
layout={LinearTransition.springify().damping(14).stiffness(120)}
```

### `LayoutAnimationConfig`

Desabilita layout animations para uma subárvore sem modificar os componentes animados. Útil para a renderização inicial de uma lista:

```typescript
import { LayoutAnimationConfig } from 'react-native-reanimated';

function ListaSemAnimacaoInicial({ items }: { items: Item[] }) {
  const [isPrimeiroRender, setIsPrimeiroRender] = React.useState(true);

  useEffect(() => {
    setIsPrimeiroRender(false);
  }, []);

  return (
    <LayoutAnimationConfig skipEntering={isPrimeiroRender}>
      {items.map((item) => (
        <Animated.View key={item.id} entering={FadeInDown}>
          <ItemLista item={item} />
        </Animated.View>
      ))}
    </LayoutAnimationConfig>
  );
}
```

---

## Problemas específicos do Fabric com layout animations

### Achatamento de views no Android

O Android otimiza a hierarquia de views removendo views intermediárias sem efeito visual (view flattening). Isso pode impedir que animações de saída sejam executadas — a view nativa é removida antes do Reanimated interceptar.

Solução: defina `collapsable={false}` em qualquer `Animated.View` com animação `exiting`:

```typescript
<Animated.View
  collapsable={false}   // impede o Android de achatar essa view
  exiting={FadeOut.duration(300)}
>
  {conteudo}
</Animated.View>
```

### Parent desmontado interrompe animações de saída dos filhos

Quando um parent não animado é desmontado, as animações `exiting` dos filhos disparam — mas o parent não espera por elas. A view pai desaparece imediatamente, levando os filhos junto independente do estado da animação.

Solução: anime o próprio pai (não apenas os filhos), ou use um portal para renderizar o elemento saindo fora da árvore que será desmontada.

### Conflito de `nativeID`

O Reanimated usa `nativeID` internamente para rastrear views animadas em animações de entrada. Se um componente pai define `nativeID`, animações de entrada em `Animated.View`s descendentes são desabilitadas.

Solução: envolva os filhos animados em uma `View` simples:

```typescript
// Errado: nativeID do pai interfere
<View nativeID="meu-container">
  <Animated.View entering={FadeIn} />  // animação de entrada desabilitada
</View>

// Correto: camada de isolamento
<View nativeID="meu-container">
  <View>
    <Animated.View entering={FadeIn} />  // funciona
  </View>
</View>
```

---

## Exemplo completo: bottom sheet com dismiss por gesto

```typescript
import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

const ALTURA_TELA = Dimensions.get('window').height;
const VELOCIDADE_FECHAR = 800;
const DISTANCIA_FECHAR = 200;

interface BottomSheetProps {
  onFechar: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ onFechar, children }: BottomSheetProps) {
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Apenas arrastar para baixo
      translateY.value = Math.max(0, context.value.y + event.translationY);
    })
    .onEnd((event) => {
      const deveFechar =
        translateY.value > DISTANCIA_FECHAR ||
        event.velocityY > VELOCIDADE_FECHAR;

      if (deveFechar) {
        translateY.value = withTiming(
          ALTURA_TELA,
          { duration: 250 },
          () => runOnJS(onFechar)()
        );
      } else {
        translateY.value = withSpring(0, { velocity: event.velocityY });
      }
    });

  const estiloSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.sheet, estiloSheet]}
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(250)}
      collapsable={false}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.handle} />
      </GestureDetector>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ALTURA_TELA * 0.6,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#48484a',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
```
