---
title: "Reanimated 3 — Worklets e Shared Values"
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/anim_03_reanimated_worklets.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# Reanimated 3 — Worklets e Shared Values

> Reanimated 3 é o padrão de produção para animações baseadas em gestos e a 120 FPS no React Native 0.76+. Seu modelo é arquiteturalmente diferente da API `Animated`: em vez de descrever animações declarativamente e entregá-las ao nativo, os worklets executam JavaScript real na thread UI via um segundo runtime Hermes.

---

## Como os worklets funcionam

O plugin Babel do Reanimated transforma funções marcadas (worklets) em tempo de build. Ele serializa o código-fonte da função e referências de closure, e os instala em uma segunda VM Hermes que roda na thread UI. Em runtime, chamar um worklet o invoca nessa VM via JSI — de forma síncrona, dentro do frame atual, sem tocar a thread JS.

```
Tempo de build:
  ┌─────────────────────────────────────────────┐
  │  Código-fonte                               │
  │                                             │
  │  function animate() {                       │
  │    'worklet';         ◄── diretiva          │
  │    offset.value = withSpring(200);          │
  │  }                                          │
  │                      │                      │
  │    Plugin Babel extrai e serializa          │
  └──────────────────────┼──────────────────────┘
                         │
Runtime:                 ▼
  ┌──────────────────────────────────────────────┐
  │  Thread UI — VM Hermes                       │
  │                                              │
  │  animate() → função C instalada → executa    │
  │  sincronamente na thread UI por frame        │
  └──────────────────────────────────────────────┘
```

A diretiva `'worklet'` é necessária para qualquer função que você escreva explicitamente. Funções passadas inline para hooks do Reanimated (`useAnimatedStyle`, callbacks de gestos) são auto-workletizadas pelo plugin Babel sem a diretiva.

---

## Instalação

```bash
npm install react-native-reanimated
```

Adicione o plugin Babel em `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // deve ser o último plugin
  ],
};
```

O plugin precisar ser o último — ele precisa processar a saída final após todas as outras transformações.

No React Native 0.76+, o Reanimated 3 usa a New Architecture por padrão. Não são necessárias alterações em `react-native.config.js` ou flags de interop.

---

## `useSharedValue`

O primitivo fundamental de dados. Um shared value vive no runtime da thread UI, mas é legível e gravável por ambas as threads:

```typescript
import { useSharedValue } from 'react-native-reanimated';

function Componente() {
  const offset = useSharedValue(0);
  const scale = useSharedValue(1);
  const color = useSharedValue('#3498db');

  // Da thread JS — assíncrono (sincronizado antes do próximo frame)
  const handlePress = () => {
    offset.value = 100;
  };
}
```

**Semântica de sincronização entre threads:**

- **Leituras/escritas na thread UI**: síncronas e imediatas. O worklet vê o valor atualizado no mesmo frame.
- **Escritas na thread JS**: a escrita é assíncrona — o runtime da thread UI a recebe antes do próximo frame. Ler `.value` na thread JS imediatamente após escrever retorna o valor antigo.
- **Leituras na thread JS**: bloqueia a thread JS até que a thread UI entregue o valor atual. Evite ler `.value` com frequência na thread JS.

**Tipos de valor suportados:** números, strings (ângulo, porcentagem), objetos, arrays, cores (hex, RGB, HSL, cores CSS nomeadas).

**Armadilhas:**

```typescript
// Errado: desestruturar quebra o proxy
const { value } = useSharedValue(0);

// Errado: mutar propriedades de objeto in-place
obj.value.x = 10;  // thread UI não detecta essa mudança

// Correto: atribuir um novo objeto
obj.value = { ...obj.value, x: 10 };

// Correto para arrays: usar .modify() para evitar cópia completa
arr.modify(a => {
  a.push(novoItem);
  return a;
});

// Errado: ler/escrever durante o render
function Ruim() {
  const sv = useSharedValue(0);
  sv.value = 1;  // mutar durante render — comportamento indefinido
}
```

---

## `useDerivedValue`

Cria um shared value derivado, somente leitura, que reage a outros shared values. O callback roda na thread UI:

```typescript
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';

const rotation = useSharedValue(0);

// String derivada para rotação CSS
const rotationDeg = useDerivedValue(() => `${rotation.value}deg`);

// Posição derivada com clamp
const clampedX = useDerivedValue(() =>
  Math.min(Math.max(offset.value, 0), maxWidth)
);
```

Use `useDerivedValue` para transformações puras. Para efeitos colaterais (chamar `runOnJS`, comparar valor atual com anterior), use `useAnimatedReaction`.

---

## `useAnimatedReaction`

Observa um valor derivado e executa um worklet quando ele muda. Recebe os valores atual e anterior:

```typescript
import { useAnimatedReaction, useSharedValue, runOnJS } from 'react-native-reanimated';

const scrollY = useSharedValue(0);
const [secaoAtiva, setSecaoAtiva] = React.useState(0);

useAnimatedReaction(
  // prepare: roda na thread UI, retorna derivação memoizada
  () => Math.floor(scrollY.value / ALTURA_SECAO),
  // react: roda na thread UI quando o resultado de prepare muda
  (secaoAtual, secaoAnterior) => {
    if (secaoAtual !== secaoAnterior) {
      runOnJS(setSecaoAtiva)(secaoAtual);
    }
  }
);
```

**Armadilha crítica:** nunca escreva no mesmo shared value que `prepare` lê. Isso cria um loop infinito — o valor muda, `prepare` roda, o efeito colateral atualiza o valor, `prepare` roda novamente.

---

## `useAnimatedStyle`

Cria um objeto de estilo calculado na thread UI. Aplique a componentes `Animated.View` (do Reanimated):

```typescript
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';

function CartaoArrastavel() {
  const offset = useSharedValue({ x: 0, y: 0 });

  const estiloCartao = useAnimatedStyle(() => ({
    transform: [
      { translateX: offset.value.x },
      { translateY: offset.value.y },
    ],
  }));

  return (
    <Animated.View style={[styles.cartao, estiloCartao]}>
      <Text>Arraste-me</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    width: 200,
    height: 120,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
});
```

**Regras:**

- Nunca mute shared values dentro do callback: `sv.value = withTiming(1)` dentro de `useAnimatedStyle` cria um loop infinito.
- Mantenha apenas partes dinâmicas no `useAnimatedStyle`. Estilos estáticos (`cores`, `bordas`, `padding`) vão em `StyleSheet.create()`.
- Estilos animados têm precedência sobre estilos estáticos independentemente da ordem no array.
- Desmontar o componente não reseta props animadas. Cancele ou resete explicitamente se necessário.

---

## Construtores de animação

### `withTiming`

Tween baseado em duração:

```typescript
import { withTiming, Easing } from 'react-native-reanimated';

offset.value = withTiming(200, {
  duration: 400,
  easing: Easing.out(Easing.cubic),
});
```

### `withSpring`

Mola física. Dois modelos de configuração — escolha um:

```typescript
// Modelo físico
offset.value = withSpring(200, {
  stiffness: 900,
  damping: 120,
  mass: 4,
  velocity: velocidadeGesto,  // transferência do gesto para animação suave
  overshootClamping: false,
});

// Modelo de duração (tempo previsível)
offset.value = withSpring(200, {
  duration: 550,
  dampingRatio: 0.8,  // < 1 = quica, 1 = criticamente amortecida, > 1 = sobreamortecida
});
```

### `withDecay`

Desaceleração por momentum a partir de uma velocidade:

```typescript
import { withDecay } from 'react-native-reanimated';

offset.value = withDecay({
  velocity: velocidadeGestoX,   // px/s do gesto solto
  deceleration: 0.998,           // mais próximo de 1 = desliza mais
  clamp: [0, maxOffset],         // limites opcionais
  rubberBandEffect: true,        // rebote elástico nas bordas
  rubberBandFactor: 0.6,
});
```

### Construtores de sequenciamento

```typescript
import { withSequence, withDelay, withRepeat, withTiming, withSpring } from 'react-native-reanimated';

// Animação de tremor
offset.value = withSequence(
  withTiming(-12, { duration: 50 }),
  withRepeat(withTiming(12, { duration: 50 }), 6, true),
  withTiming(0, { duration: 50 })
);

// Entrada com delay
opacity.value = withDelay(150, withTiming(1, { duration: 300 }));

// Pulso infinito
scale.value = withRepeat(
  withTiming(1.15, { duration: 700 }),
  -1,    // -1 = infinito
  true   // reverso = ping-pong
);
```

### Callbacks de conclusão

Cada construtor aceita um callback como último argumento. O callback é auto-workletizado:

```typescript
offset.value = withTiming(200, { duration: 300 }, (finished) => {
  if (finished) {
    // Encadear próxima animação
    scale.value = withSpring(1.1);
  }
});
```

`finished` é `false` se a animação foi interrompida por outra atribuição ao shared value antes de completar.

---

## `useAnimatedScrollHandler`

Rastreia eventos de scroll na thread UI, eliminando a thread JS do caminho scroll → animação:

```typescript
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

function TelaParallax() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onBeginDrag: () => {
      isScrolling.value = true;
    },
    onMomentumEnd: () => {
      isScrolling.value = false;
    },
  });

  const estiloHeader = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * -0.4 }],
    opacity: 1 - scrollY.value / 300,
  }));

  return (
    <View>
      <Animated.Image source={heroImage} style={[styles.hero, estiloHeader]} />
      <Animated.ScrollView onScroll={scrollHandler}>
        {/* conteúdo */}
      </Animated.ScrollView>
    </View>
  );
}
```

---

## Comunicação entre threads

### `runOnJS`

Despacha para a thread JS a partir de um worklet. A chamada é assíncrona — o worklet continua executando; a função JS roda quando o event loop JS processar a mensagem agendada:

```typescript
import { runOnJS } from 'react-native-reanimated';

const panGesture = Gesture.Pan()
  .onEnd((event) => {
    // Thread UI — não pode chamar setState do React diretamente
    if (event.translationY > LIMIAR_FECHAR) {
      runOnJS(onFechar)();
      runOnJS(setVisible)(false);
    }
  });
```

### `runOnUI`

Agenda a execução de um worklet a partir da thread JS:

```typescript
import { runOnUI } from 'react-native-reanimated';

function resetarAnimacao() {
  runOnUI(() => {
    'worklet';
    offset.value = withSpring(0);
    scale.value = withSpring(1);
  })();  // nota: chamada dupla — runOnUI retorna uma função
}
```

---

## Escrevendo worklets auxiliares

Extraia lógica repetida da thread UI para worklets independentes com a diretiva `'worklet'`:

```typescript
function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

// Usado dentro de useAnimatedStyle ou callbacks de gestos
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: clamp(offset.value, -200, 200) }],
}));
```

Funções sem a diretiva `'worklet'` não podem ser chamadas a partir de um worklet — a VM da thread UI não tem referência a elas.

---

## Armadilhas comuns

**Chamar `setState` dentro de um worklet**

```typescript
// Errado — causa crash ou comportamento indefinido
useAnimatedStyle(() => {
  setCount(offset.value); // React não é thread-safe a partir da thread UI
  return { transform: [{ translateX: offset.value }] };
});

// Correto
useAnimatedStyle(() => {
  return { transform: [{ translateX: offset.value }] };
});

useAnimatedReaction(
  () => Math.round(offset.value),
  (current, previous) => {
    if (current !== previous) runOnJS(setCount)(current);
  }
);
```

**Capturar closures desatualizados em worklets**

Worklets capturam seu closure no momento do build. Variáveis que mudam entre renders não são atualizadas automaticamente no worklet. Use shared values como canal de dados ao vivo:

```typescript
// Errado — closure desatualizado: threshold capturado uma vez, nunca atualiza
const threshold = someState.threshold;
const panGesture = Gesture.Pan().onEnd(() => {
  if (offset.value > threshold) { ... } // desatualizado!
});

// Correto — shared value sempre atual
const thresholdSV = useSharedValue(someState.threshold);
useEffect(() => { thresholdSV.value = someState.threshold; }, [someState.threshold]);

const panGesture = Gesture.Pan().onEnd(() => {
  if (offset.value > thresholdSV.value) { ... }
});
```

**`useCallback` quebra a auto-workletização**

Callbacks definidos com `useCallback` perdem o marcador de worklet. Adicione `'worklet'` explicitamente:

```typescript
// Errado — useCallback quebra a auto-workletização
const onUpdate = useCallback((event) => {
  offset.value = event.translationX; // roda na thread JS
}, []);

// Correto
const onUpdate = useCallback((event) => {
  'worklet';
  offset.value = event.translationX;
}, []);
```
