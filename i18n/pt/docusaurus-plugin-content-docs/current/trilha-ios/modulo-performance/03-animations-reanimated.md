---
title: Animations with Reanimated v3
---

# Animações com Reanimated v3

## O Modelo de Animação do iOS que Você Já Conhece

No iOS, você tem dois sistemas de animação principais. `UIView.animate` lida com transições simples de propriedades na thread principal, enquanto `Core Animation` (CAAnimation, CABasicAnimation, CASpringAnimation) roda diretamente no render server — um processo separado que anima propriedades de layer independentemente da thread principal. Isso significa que, mesmo que sua thread principal esteja ocupada processando dados, o Core Animation continua animando suavemente.

A história de animações do React Native mapeia diretamente para essa divisão.

## API Animated: O Equivalente ao UIView.animate

A API `Animated` embutida é o ponto de partida. Sem `useNativeDriver`, as animações rodam na thread JS — análogo a modificar `frame` ou `transform` diretamente em um loop `DispatchQueue.main.async`. Funciona, mas é lento e vai perder frames sob qualquer pressão na thread JS.

```javascript
import { Animated, Easing } from 'react-native';
import { useRef, useEffect } from 'react';

function FadeInView({ children }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity }}>
      {children}
    </Animated.View>
  );
}
```

`useNativeDriver: true` é o flag crítico. Com ele, a animação é serializada e entregue para o lado nativo antes do primeiro frame, onde roda na thread de UI sem nenhum envolvimento adicional do JS. Isso é conceitualmente equivalente a `CABasicAnimation` — você descreve a animação de forma declarativa, entrega ao render server, e o JS não está mais no ciclo.

A limitação: apenas propriedades independentes de layout são suportadas com `useNativeDriver`. `opacity`, `transform` (translate, scale, rotate) — sim. `width`, `height`, `backgroundColor` — não, pois essas requerem passagens de layout.

## Reanimated v3: Worklets Rodando na Thread de UI

O React Native Reanimated v3 vai além do `useNativeDriver`. Em vez de serializar uma descrição de animação fixa, o Reanimated compila funções JavaScript — chamadas de worklets — para rodar diretamente na thread de UI. Isso é mais próximo de ter um callback de `CADisplayLink` que executa sua lógica Swift a 60fps no lado do render, sem salto de thread.

A mudança de modelo mental: no Reanimated, sua lógica de animação *é* código nativo em tempo de execução, mesmo que você a escreva em JavaScript.

Instale o Reanimated v3 junto com o plugin Babel:

```bash
npm install react-native-reanimated
```

No `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```

## useSharedValue: @State na Thread de UI

`useSharedValue` é o equivalente Reanimated de uma propriedade `@State` que vive na thread de UI. Leituras e escritas da thread de UI (dentro de worklets) são síncronas. Leituras da thread JS também são possíveis, mas de natureza assíncrona.

```javascript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

function ScaleButton() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.box, animatedStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      />
    </Animated.View>
  );
}
```

A função passada para `useAnimatedStyle` é um worklet. O Reanimated detecta isso automaticamente graças ao plugin Babel, que a reescreve para rodar na thread de UI. Quando `scale.value` muda, o estilo é recalculado na thread de UI e a view é atualizada — sem round-trip no JS.

## withTiming e withSpring: Equivalentes às Animações do UIView

`withTiming` mapeia para `UIView.animate(withDuration:)`. Ele conduz um valor do seu estado atual para um alvo em uma duração fixa com uma curva de easing.

```javascript
import { withTiming, Easing } from 'react-native-reanimated';

// Equivalente a UIView.animate(withDuration: 0.3, options: .curveEaseInOut)
scale.value = withTiming(1.2, {
  duration: 300,
  easing: Easing.inOut(Easing.ease),
});
```

`withSpring` mapeia para `CASpringAnimation` ou `UIView.animate(withDuration:delay:usingSpringWithDamping:)`. Em vez de uma duração fixa, você descreve as características físicas da mola:

```javascript
import { withSpring } from 'react-native-reanimated';

// damping e stiffness mapeiam diretamente para as propriedades de CASpringAnimation
scale.value = withSpring(1, {
  damping: 15,
  stiffness: 200,
  mass: 1,
});
```

Os parâmetros mapeiam quase 1:1 com `CASpringAnimation`:
- `stiffness` — rigidez da mola
- `damping` — coeficiente de amortecimento
- `mass` — massa do objeto simulado
- `velocity` — velocidade inicial (útil ao encadear a partir da velocidade de um gesto)

## Sequenciando e Combinando Animações

O Reanimated fornece `withSequence`, `withDelay` e `withRepeat` para compor animações — equivalente a encadear `CAAnimationGroup` ou usar handlers de `completion`.

```javascript
import {
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
} from 'react-native-reanimated';

// Animação de shake — equivalente a um CAKeyframeAnimation em position.x
translateX.value = withSequence(
  withTiming(-10, { duration: 50 }),
  withRepeat(withTiming(10, { duration: 100 }), 3, true),
  withTiming(0, { duration: 50 })
);

// Entrada com delay
opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
```

## Handlers de Gesto: Equivalente ao UIGestureRecognizer

`react-native-gesture-handler` fornece o equivalente às subclasses de `UIGestureRecognizer`. Ele processa gestos de forma nativa, na thread de UI, e integra diretamente com o Reanimated para que atualizações de estado de gesto conduzam animações sem nenhum envolvimento do JS.

```bash
npm install react-native-gesture-handler
```

Envolva a raiz do seu app em `GestureHandlerRootView`:

```javascript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Navigation />
    </GestureHandlerRootView>
  );
}
```

Um card arrastável — equivalente a um `UIPanGestureRecognizer` atualizando o `center` de uma view:

```javascript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

function DraggableCard() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0, { velocity: 0 });
      translateY.value = withSpring(0, { velocity: 0 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]} />
    </GestureDetector>
  );
}
```

Os callbacks `onBegin`, `onUpdate` e `onEnd` são worklets. O delta do gesto atualiza shared values de forma síncrona na thread de UI, e `useAnimatedStyle` recalcula o transform — tudo sem tocar no JS. Este é o equivalente Reanimated de conduzir um `CGAffineTransform` diretamente de um handler de `UIPanGestureRecognizer`.

A composição de gestos com `Gesture.Simultaneous` e `Gesture.Exclusive` mapeia para `gestureRecognizer(_:shouldRecognizeSimultaneouslyWith:)` em `UIGestureRecognizerDelegate`.

## Desenho Customizado com React Native Skia

`react-native-skia` fornece uma API de desenho 2D suportada pela biblioteca gráfica Skia, que roda em Metal no iOS. O modelo mental é similar a desenhar em uma subclasse de `CALayer` via `draw(in ctx: CGContext)`, exceto que o Skia roda na thread de UI e integra com shared values do Reanimated para desenho animado.

```bash
npm install @shopify/react-native-skia
```

```javascript
import { Canvas, Circle, Fill } from '@shopify/react-native-skia';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function PulseCircle() {
  const radius = useSharedValue(50);

  const tap = Gesture.Tap().onEnd(() => {
    radius.value = withSpring(80, {}, () => {
      radius.value = withSpring(50);
    });
  });

  return (
    <GestureDetector gesture={tap}>
      <Canvas style={{ flex: 1 }}>
        <Fill color="white" />
        <Circle cx={200} cy={200} r={radius} color="#007AFF" />
      </Canvas>
    </GestureDetector>
  );
}
```

O `Canvas` do Skia renderiza via Metal, frame a frame, lendo shared values de forma síncrona da thread de UI. Paths complexos, gradientes, efeitos de blur e composição de imagens estão disponíveis — equivalente ao que você pode fazer com `CGContext` e `Core Image` em um `CALayer`.

## ProMotion e 120fps

Em dispositivos ProMotion (iPhone 13 Pro em diante), o display roda a até 120Hz. O renderer do React Native e o Reanimated ambos suportam 120fps através do agendador de frames nativo.

Com a New Architecture (Fabric), o loop de render usa `CADisplayLink` internamente e se adapta à taxa de atualização real do display. Nenhuma configuração explícita é necessária — animações conduzidas por worklets do Reanimated rodarão automaticamente a 120fps em hardware ProMotion, já que executam na thread de UI em sincronia com os callbacks do `CADisplayLink`.

Verifique a taxa de frames durante o desenvolvimento com o monitor de performance do menu de desenvolvimento in-app, ou anexando o Instruments com o template Core Animation. O ProMotion só ativa quando o sistema determina que o conteúdo justifica uma taxa de atualização mais alta — animação contínua de um worklet Reanimated ou um canvas Skia se qualifica.

Para projetos Expo gerenciados, o suporte a ProMotion está habilitado por padrão no SDK 56 com New Architecture.

## Depuração de Performance

A questão-chave é sempre: onde a animação está rodando? Se estiver na thread JS, qualquer trabalho JS causará perda de frames. Ferramentas para verificar:

- **Flipper + Hermes Profiler** — mostra a atividade da thread JS durante a animação. Uma animação saudável com Reanimated deve mostrar nenhuma atividade JS após o gesto ou gatilho ser iniciado.
- **Instruments, template Core Animation** — mostra atividade de GPU e render server. Uma animação Reanimated conduzida por worklets aparece aqui como atualizações de layer nativas, idênticas a `CAAnimation`.
- **React Native DevTools** — a aba Performance mostra cronogramas de frames das threads JS e UI. Worklets rodando na thread de UI aparecem como trabalho da thread de UI, não da thread JS.

Um erro comum ao migrar da API `Animated` básica: esquecer `useNativeDriver: true` e ficar se perguntando por que a animação trava durante a navegação. O Reanimated evita isso completamente — worklets sempre rodam na thread de UI por design.

## Resumo

| Conceito iOS | Equivalente React Native |
|---|---|
| `UIView.animate` | `Animated.timing` com `useNativeDriver: true` |
| `CASpringAnimation` | `withSpring` no Reanimated |
| Carga de trabalho `CADisplayLink` | Worklet Reanimated na thread de UI |
| `@State` conduzindo UI | `useSharedValue` |
| `UIPanGestureRecognizer` | `Gesture.Pan()` do gesture-handler |
| Desenho com `CALayer` / `CGContext` | Canvas React Native Skia |
| ProMotion 120Hz | Automático com Fabric + Reanimated |

A mudança mental do iOS para animações React Native é menor do que parece. As partes difíceis — manter a lógica de animação fora da thread principal, usar física de molas, compor gestos — mapeiam diretamente. O Reanimated v3 e o react-native-gesture-handler juntos oferecem o mesmo controle sobre performance de animação que o Core Animation oferece no lado nativo.
