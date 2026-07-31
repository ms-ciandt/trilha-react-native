---
title: "Animated API — New Architecture"
---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/anim_02_animated_api.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# Animated API — New Architecture

> A API `Animated` faz parte do core do React Native e cobre a maioria das transições de UI sem dependências adicionais. Este documento aborda seus internos na New Architecture, onde a bridge foi substituída e o JSI torna o setup síncrono.

---

## Conceitos fundamentais

### `Animated.Value` e `Animated.ValueXY`

`Animated.Value` armazena um número mutável que o runtime de animação rastreia. Nunca crie um `Animated.Value` durante o render — use sempre `useRef`:

```typescript
import { useRef } from 'react';
import { Animated } from 'react-native';

function Card() {
  const opacity = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // ...
}
```

`useRef` garante que a instância de `Animated.Value` persista entre renders. `.current` desempacota a ref para acesso direto. Não desestruture valores animados — `const { x, y } = pan` quebra o proxy interno que rastreia dependências.

### `useNativeDriver: true`

No React Native 0.76+, `useNativeDriver` é um campo **obrigatório**. Omiti-lo gera um warning; numa versão futura, lançará um erro.

```typescript
Animated.timing(opacity, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,  // obrigatório — sem exceções
}).start();
```

**O que controla:** se o loop de animação roda na thread UI (nativo) ou na thread JS.

- `true` — a descrição da animação é passada de forma síncrona ao nativo via JSI. O driver de animação nativo executa o loop de frames, interpolando o valor e atualizando a prop da view a cada frame sem tocar a thread JS.
- `false` — o JS recalcula o valor a cada frame e o despacha para o nativo. Contenção na thread JS causa frames perdidos.

**O que `useNativeDriver: true` suporta:**

| Propriedade | Suportado |
|---|---|
| `transform` (todas as variantes) | Sim |
| `opacity` | Sim |
| `width`, `height` | Não — aciona layout pass |
| `margin`, `padding` | Não — aciona layout pass |
| `backgroundColor`, `color` | Não — interpolação de cor roda no JS |
| `borderRadius` | Não |

A restrição é arquitetural: propriedades de layout exigem que o Yoga recalcule a árvore de layout a cada frame, o que não pode ser delegado ao driver de animação nativo.

---

## Construtores de animação

### `Animated.timing`

Interpolação linear baseada em duração com easing configurável:

```typescript
import { Animated, Easing } from 'react-native';

Animated.timing(value, {
  toValue: 1,
  duration: 400,
  easing: Easing.out(Easing.cubic),
  delay: 100,
  useNativeDriver: true,
}).start(({ finished }) => {
  if (finished) {
    // Animação concluída (não interrompida)
    console.log('feito');
  }
});
```

Padrões de easing comuns:

```typescript
Easing.linear                 // velocidade constante
Easing.ease                   // equivalente ao CSS ease
Easing.out(Easing.quad)       // desacelera — bom para entradas
Easing.in(Easing.quad)        // acelera — bom para saídas
Easing.inOut(Easing.cubic)    // acelera e depois desacelera
Easing.back(1.5)              // ultrapassa antes de mover para frente
Easing.elastic(1)             // ultrapassa como mola
Easing.bounce                 // quica no final
Easing.bezier(0.25, 0.1, 0.25, 1.0)  // bezier cúbico customizado
```

### `Animated.spring`

Simulação de mola física. Não tem duração fixa — roda até o valor se estabilizar dentro de um limiar:

```typescript
Animated.spring(value, {
  toValue: 1,
  friction: 7,       // amortecimento — maior = menos oscilação
  tension: 40,       // rigidez — maior = mola mais rápida
  useNativeDriver: true,
}).start();
```

Parâmetros físicos alternativos (escolha um conjunto, não ambos):

```typescript
Animated.spring(value, {
  toValue: 1,
  stiffness: 180,
  damping: 20,
  mass: 1,
  velocity: 0,                      // velocidade inicial (corresponde à velocidade do gesto)
  overshootClamping: false,          // true = sem ultrapassagem
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
  useNativeDriver: true,
});
```

### `Animated.decay`

Começa com uma velocidade dada e desacelera até parar. Ideal para interações de solta com momentum:

```typescript
Animated.decay(pan, {
  velocity: { x: gestureState.vx, y: gestureState.vy },
  deceleration: 0.997,   // 0–1, maior = para mais devagar
  useNativeDriver: true,
}).start();
```

---

## Interpolação

`interpolate()` mapeia um intervalo de entrada para um intervalo de saída. A entrada é qualquer `Animated.Value`; a saída pode ser números, strings (incluindo unidades) ou cores:

```typescript
const rotation = scrollY.interpolate({
  inputRange: [0, 300],
  outputRange: ['0deg', '360deg'],
  extrapolate: 'clamp',  // clamp | extend | identity
});

const scale = scrollY.interpolate({
  inputRange: [0, 100, 200],
  outputRange: [1, 1.2, 0.8],
  extrapolate: 'clamp',
});

const backgroundColor = progress.interpolate({
  inputRange: [0, 1],
  outputRange: ['rgb(255, 255, 255)', 'rgb(0, 122, 255)'],
});
```

Interpolação multi-segmento (linear por partes):

```typescript
const headerOpacity = scrollY.interpolate({
  inputRange: [0, 50, 100, 150],
  outputRange: [0, 0, 1, 1],
  extrapolate: 'clamp',
});
```

Cada segmento entre valores de entrada consecutivos é interpolado independentemente com o easing configurado.

---

## Composição

### `Animated.sequence`

Executa animações uma após a outra. Cada animação aguarda a anterior terminar:

```typescript
Animated.sequence([
  Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
  Animated.spring(scale, { toValue: 1.05, useNativeDriver: true }),
  Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
]).start();
```

### `Animated.parallel`

Executa todas as animações simultaneamente:

```typescript
Animated.parallel([
  Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
  Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
], { stopTogether: true }).start();
```

`stopTogether: true` (padrão) para todas as animações quando qualquer uma é interrompida. Use `false` para ciclos de vida independentes.

### `Animated.stagger`

Como `parallel`, mas cada animação começa após um delay cumulativo:

```typescript
const items = [card1Opacity, card2Opacity, card3Opacity];

Animated.stagger(
  80,
  items.map(anim =>
    Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true })
  )
).start();
```

### `Animated.loop`

Repete uma animação indefinidamente ou um número fixo de vezes:

```typescript
const pulse = Animated.loop(
  Animated.sequence([
    Animated.timing(scale, { toValue: 1.1, duration: 800, useNativeDriver: true }),
    Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
  ]),
  { iterations: -1, resetBeforeIteration: false }
);

pulse.start();
pulse.stop(); // parar quando necessário
```

---

## Rastreamento de scroll

`Animated.event` mapeia o valor aninhado de um evento nativo diretamente para um `Animated.Value`. Com `useNativeDriver: true`, o mapeamento roda na thread UI — a thread JS não está envolvida em cada evento de scroll:

```typescript
const scrollY = useRef(new Animated.Value(0)).current;

<Animated.ScrollView
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  )}
  scrollEventThrottle={16}
/>
```

`scrollEventThrottle={16}` limita eventos de scroll a um por ~16ms (um por frame). Valores maiores reduzem eventos JS mas podem introduzir lag em derivações controladas por JS.

Derivando um header fixo a partir da posição de scroll:

```typescript
const headerTranslate = scrollY.interpolate({
  inputRange: [0, HEADER_HEIGHT],
  outputRange: [0, -HEADER_HEIGHT],
  extrapolate: 'clamp',
});

const headerOpacity = scrollY.interpolate({
  inputRange: [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
  outputRange: [1, 1, 0],
  extrapolate: 'clamp',
});
```

---

## Componentes animáveis

Somente componentes construídos com `Animated.createAnimatedComponent` aceitam valores animados como props:

```typescript
// Embutidos
Animated.View
Animated.Text
Animated.Image
Animated.ScrollView
Animated.FlatList

// Customizados
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedCustomCard = Animated.createAnimatedComponent(CustomCard);
```

O componente encapsulado deve encaminhar seu `ref` para a view nativa subjacente. Componentes funcionais precisam de `forwardRef`:

```typescript
const AnimatedIcon = Animated.createAnimatedComponent(
  React.forwardRef<View, IconProps>((props, ref) => (
    <View ref={ref} {...props} />
  ))
);
```

---

## Armadilhas e problemas comuns

**Esquecer de chamar `.start()`**

```typescript
// Errado — cria a animação mas não a executa
Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true });

// Correto
Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true }).start();
```

**Misturar native e não-native drivers num `parallel`**

Todas as animações dentro de um `parallel` devem usar o mesmo valor de `useNativeDriver`. Misturar causa um erro em runtime no RN 0.76+.

```typescript
// Erro: drivers nativos mistos
Animated.parallel([
  Animated.timing(opacity, { toValue: 1, useNativeDriver: true }),
  Animated.timing(width, { toValue: 200, useNativeDriver: false }), // falha
]);

// Correto: executar separadamente
Animated.timing(opacity, { toValue: 1, useNativeDriver: true }).start();
Animated.timing(width, { toValue: 200, useNativeDriver: false }).start();
```

**Não resetar antes de fazer loop**

Quando uma animação faz loop e o `toValue` inicial é igual ao valor de repouso final, use `setValue` para resetar:

```typescript
Animated.loop(
  Animated.sequence([
    Animated.timing(rotate, { toValue: 1, duration: 500, useNativeDriver: true }),
    Animated.timing(rotate, { toValue: 0, duration: 0, useNativeDriver: true }),
  ])
).start();
```
