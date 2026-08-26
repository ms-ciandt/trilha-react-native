---
title: "Reanimated: Animações na Thread de UI"
sidebar_label: "Reanimated"
sidebar_position: 3
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/perf_03_reanimated.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/perf_03_reanimated.vtt" srclang="pt" label="Português" default>
  Seu navegador nao suporta o elemento de video.
</video>

## Por Que a API Animated Não É Suficiente

A API `Animated` nativa do React Native consegue executar animações simples na thread de UI com `useNativeDriver: true`. Mas ela tem uma limitação importante: só funciona com `transform` e `opacity`. Qualquer animação que altere o layout (`width`, `height`, `padding`, `top`) precisa ser executada pela thread de JS — o que significa quedas de frames sempre que a thread de JS estiver ocupada.

O `react-native-reanimated` v3 remove essa limitação completamente. Toda a lógica de animação é executada como **worklets JSI** na thread de UI — a mesma thread do `Choreographer` do Android. A thread de JS nunca é envolvida durante a animação.

| API Animated | Reanimated v3 |
|-------------|---------------|
| `useNativeDriver: true` obrigatório | Sempre na thread de UI — sem flag necessária |
| Apenas `transform` + `opacity` nativas | Todas as propriedades de estilo |
| Animações de layout: apenas thread JS | Animações de layout: thread de UI via Fabric |
| Sem integração com gestos | Integração profunda com `react-native-gesture-handler` |
| Sem valores compartilhados entre gesto + animação | `useSharedValue` — compartilhado entre threads |

---

## Instalação

```bash
npm install react-native-reanimated
npx expo install react-native-reanimated  # for Expo
```

Adicione o plugin Babel (`babel.config.js`):

```js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['react-native-reanimated/plugin'], // must be last
};
```

---

## Conceitos Fundamentais

### useSharedValue — equivalente ao Animated.Value

Um `useSharedValue` existe em **ambas** as threads: JS e UI. Quando você o atualiza a partir do JS, a thread de UI recebe a mudança de forma síncrona via JSI e repinta no mesmo frame — sem troca de mensagens assíncronas.

```tsx
import { useSharedValue, withTiming, withSpring } from 'react-native-reanimated';

function Component() {
  // Valor inicial: 0. Legível e gravável em ambas as threads.
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  function fadeIn() {
    // withTiming: animação linear ou com easing
    opacity.value = withTiming(1, { duration: 300 });
  }

  function bounce() {
    // withSpring: animação física baseada em mola
    scale.value = withSpring(1.2, { damping: 10, stiffness: 200 });
  }
}
```

### useAnimatedStyle — conecta estilos a valores compartilhados

```tsx
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

function AnimatedCard() {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  // Esta função é executada na thread de UI — NÃO na thread de JS
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  function handlePress() {
    scale.value = withSpring(0.95, {}, () => {
      // Callback também é executado na thread de UI
      scale.value = withSpring(1);
    });
  }

  return (
    // Animated.View — entende animatedStyle
    <Animated.View style={[styles.card, animatedStyle]}>
      <Pressable onPress={handlePress}>
        <Text>Press me</Text>
      </Pressable>
    </Animated.View>
  );
}
```

---

## Primitivos de Animação

### withTiming — animação linear ou com easing

```tsx
import { withTiming, Easing } from 'react-native-reanimated';

// Linear
opacity.value = withTiming(1, { duration: 200 });

// Easing personalizado
translateX.value = withTiming(100, {
  duration: 400,
  easing: Easing.out(Easing.cubic),
});

// Callback ao concluir (thread de UI)
opacity.value = withTiming(0, { duration: 300 }, (finished) => {
  if (finished) runOnJS(onHidden)(); // chama de volta para a thread de JS
});
```

### withSpring — baseado em física

```tsx
import { withSpring } from 'react-native-reanimated';

// Mola padrão
scale.value = withSpring(1.1);

// Mola ajustada
scale.value = withSpring(1.1, {
  damping: 15,     // maior = menos oscilação (como o damping de spring animation do Android)
  stiffness: 300,  // maior = mais rápido
  mass: 1,
});
```

### withSequence e withDelay

```tsx
import { withSequence, withDelay, withTiming } from 'react-native-reanimated';

// Animação de tremor — sequência de translações
translateX.value = withSequence(
  withTiming(-10, { duration: 50 }),
  withTiming(10, { duration: 50 }),
  withTiming(-10, { duration: 50 }),
  withTiming(0, { duration: 50 }),
);

// Atraso antes de iniciar
opacity.value = withDelay(500, withTiming(1, { duration: 300 }));
```

### withRepeat — animação em loop

```tsx
import { withRepeat, withTiming } from 'react-native-reanimated';

// Animação de pulso — loop infinito, inverte a cada iteração
scale.value = withRepeat(
  withTiming(1.05, { duration: 800 }),
  -1,    // -1 = infinito
  true,  // inverte a cada iteração
);
```

---

## Integração com Gestos — react-native-gesture-handler

O padrão mais poderoso do Reanimated: gestos controlando animações inteiramente na thread de UI — sem envolvimento do JS durante o gesto.

```bash
npm install react-native-gesture-handler
npx expo install react-native-gesture-handler
```

### Card Arrastável

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

function DraggableCard({ onDismiss }: { onDismiss: () => void }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Executado na thread de UI — 60fps sem envolvimento do JS
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd((event) => {
      const shouldDismiss = Math.abs(event.translationX) > 150;
      if (shouldDismiss) {
        const direction = event.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * 500, { duration: 300 }, () => {
          runOnJS(onDismiss)(); // de volta à thread de JS para atualizar o estado React
        });
      } else {
        // Retorna ao lugar
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, style]}>
        <Text>Drag me</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

> **`runOnJS(fn)()`** — a ponte entre o worklet na thread de UI e a thread de JS. Use-o para chamar setters de estado React ou callbacks de dentro de um worklet. Qualquer função que atualize o estado React deve passar por `runOnJS`.

---

## Layout Animations — Substituto do LayoutAnimation

As animações de `Layout` do Reanimated animam itens ao entrar, sair ou mudar de posição no layout — equivalente ao `LayoutAnimation`, mas executado na thread de UI.

```tsx
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Layout,
} from 'react-native-reanimated';

function AnimatedList({ items }: { items: Item[] }) {
  return (
    <View>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          entering={FadeIn.duration(200)}        // aparece com fade
          exiting={SlideOutLeft.duration(200)}   // desaparece deslizando para a esquerda
          layout={Layout.springify()}            // outros itens animam para preencher o espaço
        >
          <ItemRow item={item} />
        </Animated.View>
      ))}
    </View>
  );
}
```

---

## Interpolação — animação baseada na posição de scroll

```tsx
import { useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

function CollapsibleHeader() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, 100],          // intervalo de entrada
      [200, 60],         // intervalo de saída (200px de altura → 60px de altura)
      Extrapolate.CLAMP  // não vai abaixo de 60 nem acima de 200
    ),
    opacity: interpolate(scrollY.value, [0, 100], [1, 0], Extrapolate.CLAMP),
  }));

  return (
    <>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text style={styles.headerTitle}>My App</Text>
      </Animated.View>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
        {/* content */}
      </Animated.ScrollView>
    </>
  );
}
```

---

## Materiais de Estudo

### Documentação Oficial

- [Reanimated v3 — Documentação](https://docs.swmansion.com/react-native-reanimated/)
- [Reanimated — Worklets](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/worklets)
- [react-native-gesture-handler — Documentação](https://docs.swmansion.com/react-native-gesture-handler/)

### Exemplos Interativos

- [Reanimated Playground](https://docs.swmansion.com/react-native-reanimated/examples/)

### Videos

- [William Candillon — Curso Completo Reanimated v3](https://www.youtube.com/watch?v=yz9E10Dq1fY)
- [Catalin Miron — Cards com Swipe usando Reanimated](https://www.youtube.com/watch?v=ubbMRCEJORk)

---

## Próximo Passo

Animações concluídas. A seguir: controle de memoização e re-renders — `memo`, `useMemo`, `useCallback` e as regras de quando usar cada um.

➡ [Otimização de Re-renders: memo, useMemo, useCallback](./04-memo-usememo-usecallback)
