---
title: "Thread JS vs Thread UI"
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/anim_01_threading_model.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# Thread JS vs Thread UI

> **Módulo 06 — Animações**
> Destinado a engenheiros sênior que precisam entender exatamente *onde* o código de animação é executado e *por que* isso determina se você terá 120 FPS ou frames perdidos.

---

## As duas threads que importam para animações

Todo app React Native possui várias threads, mas duas dominam o trabalho com animações.

**Thread JS** executa a VM Hermes. É onde todo o JavaScript roda: renders do React, atualizações de estado, lógica de negócio, callbacks de rede. Existe exatamente uma thread JS por app. Bloqueá-la por mais de 16ms causa um frame perdido em qualquer lugar da tela.

**Thread UI** (Main Thread no iOS, Main Thread no Android) é a thread que o SO usa para despachar eventos de toque, executar o motor de layout e enviar comandos de desenho para a GPU. Qualquer operação que crie, mute ou meça uma view nativa deve ocorrer na thread UI. A thread UI também executa os worklets do Reanimated.

```
┌─────────────────────────────────────────────────────────────────┐
│  PROCESSO                                                       │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │   Thread JS (Hermes) │    │          Thread UI           │  │
│  │                      │    │                              │  │
│  │  Árvore React        │    │  Layout nativo (Yoga/Fabric) │  │
│  │  Gerenciamento estado│    │  Despacho de eventos toque   │  │
│  │  Rede/IO             │    │  Worklets do Reanimated      │  │
│  │  Lógica de negócio   │    │  Mutações de views nativas   │  │
│  │                      │    │                              │  │
│  └──────────┬───────────┘    └──────────────────────────────┘  │
│             │  JSI (bindings C++ síncronos)                     │
│             └────────────────────────────────────────────────►  │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  Threads em segundo  │    │   Render Thread (Android)    │  │
│  │  plano (rede, disco) │    │   Gravação de comandos GPU   │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## O que mudou com a New Architecture

### Arquitetura Antiga: a Bridge assíncrona

Na arquitetura legada, JS e nativo se comunicavam por uma fila de mensagens serializada em JSON — a Bridge. Toda chamada nativa era assíncrona:

```
Thread JS              Bridge               Thread UI
    │                    │                      │
    │──── serializar ───►│                      │
    │                    │──── deserializar ───►│
    │                    │                      │──── executar
    │                    │◄─── serializar ───────│
    │◄─── deserializar ──│                      │
```

Um `Animated.Value` sem `useNativeDriver: true` tinha que cruzar essa bridge em cada frame para atualizar props de views nativas. A 60 FPS, isso significa 60 round-trips por segundo — cada um adicionando latência de serialização, cada um competindo com atualizações de estado e renders na mesma fila.

Mesmo o `useNativeDriver: true` era limitado: a descrição da animação era enviada pela bridge uma vez (serializada como JSON), e o nativo executava o loop. Funcionava, mas a latência de setup era mensurável.

### New Architecture: bindings diretos via JSI

JSI (JavaScript Interface) substitui a bridge por bindings C++ diretos acessíveis a partir da VM Hermes. Sem serialização, sem fila, sem round-trip assíncrono:

```typescript
// Bridge antiga: assíncrona, serializada
NativeModules.MyModule.doSomething(arg, callback);

// JSI: síncrono, chamada C++ direta
const result = global.myJSIModule.doSomethingSync(arg);
```

Para animações, o JSI habilita três coisas que antes eram impossíveis:

1. **Worklets do Reanimated**: um segundo runtime Hermes roda na thread UI. Funções worklet são executadas lá via JSI, lendo e escrevendo shared values de forma síncrona dentro de um único frame.

2. **Leituras de layout síncronas**: `ref.current?.measure()` agora retorna um valor de forma síncrona ao invés de via callback, viabilizando animações baseadas em layout sem cadeias assíncronas.

3. **Renderização concorrente do Fabric**: o renderer pode interromper trabalho de baixa prioridade (atualizações de lista) para processar gestos urgentes, evitando que animações baseadas em gestos compitam com renders em segundo plano.

---

## Atribuição de threads: o que roda onde

| Código | Thread | Motivo |
|---|---|---|
| `useState`, `useEffect`, renders React | JS | VM Hermes |
| `Animated.Value` sem `useNativeDriver` | JS | Recalculado em JS a cada frame |
| `Animated.Value` com `useNativeDriver: true` | UI | Loop nativo, sem JS por frame |
| Callbacks de `useSharedValue`, `useAnimatedStyle` | UI | Runtime de worklets Reanimated |
| `runOnJS(fn)` dentro de um worklet | JS (agendado) | Despacha para o event loop JS |
| Callbacks do Gesture Handler 2 (com Reanimated) | UI | RNGH roda na thread UI |
| `InteractionManager.runAfterInteractions` | JS | Adiado para próximo slot ocioso do JS |
| `setTimeout`, `requestAnimationFrame` | JS | Parte do runtime Hermes |

---

## O orçamento de 16ms

A 60 FPS o display atualiza a cada 16,67ms. A 120 Hz (ProMotion iOS, Android alta taxa) a cada 8,33ms. Ambas as threads contribuem para colocar pixels na tela:

```
Frame N
  │
  ├─ Thread UI: recebe sinal vsync
  ├─ Thread UI: executa worklets Reanimated → atualiza shared values
  ├─ Thread UI: Fabric aplica mutações pendentes do JS
  ├─ Thread UI: layout Yoga (somente se o layout mudou)
  ├─ Thread UI: grava comandos de desenho → GPU
  │
  └─ Thread JS: executa reconciliador React para próximo frame
               processa atualizações de estado
               agenda mutações Fabric
```

Se a thread JS gastar 30ms num render, as mutações Fabric do próximo frame não ficam prontas — a thread UI não tem nada para aplicar e o frame é perdido. Crucialmente, **os worklets na thread UI não são afetados**: continuam executando em FPS máximo mesmo quando a thread JS está ocupada.

Esse é o motivo central para mover lógica de animação do JS para a thread UI via Reanimated.

---

## Anatomia de um frame perdido

### Cenário A: Animated sem native driver

```
Frame  │ Thread JS                              │ Thread UI
──────────────────────────────────────────────────────────
N      │ recalcula valor → envia para nativo (5ms)│ recebe, aplica prop
N+1    │ recalcula valor → envia para nativo (5ms)│ recebe, aplica prop
N+2    │ [atualização de estado: 30ms] ─────────►│ sem novo valor → FRAME TRAVADO
N+3    │ recalcula valor → envia (5ms)           │ recebe, aplica prop
```

O frame N+2 é perdido porque a thread JS estava ocupada e não conseguiu recalcular o valor de animação a tempo.

### Cenário B: Worklet Reanimated

```
Frame  │ Thread JS                              │ Thread UI
──────────────────────────────────────────────────────────
N      │ (render React: 10ms)                  │ worklet roda, atualiza transform
N+1    │ (atualização estado: 30ms) ────────────│ worklet roda, atualiza transform
N+2    │ (atualização continua) ────────────────│ worklet roda, atualiza transform
N+3    │ render concluído                       │ worklet roda, atualiza transform
```

A animação roda em FPS máximo independente da carga na thread JS.

---

## `InteractionManager`: adiando trabalho pós-animação

`InteractionManager` rastreia animações e interações de toque ativas. Tarefas registradas com `runAfterInteractions` ficam em fila até que todas as animações terminem:

```typescript
import { InteractionManager } from 'react-native';

function navegarParaDetalhe() {
  navigation.navigate('Detail');

  // Adia trabalho pesado até a animação de transição terminar
  InteractionManager.runAfterInteractions(() => {
    fetchDetailData();   // requisição de rede + parse
    initializeChart();   // computação pesada
  });
}
```

Animações decorativas/em loop podem optar por não bloquear essa fila:

```typescript
Animated.loop(
  Animated.timing(pulseOpacity, {
    toValue: 0.3,
    duration: 1200,
    useNativeDriver: true,
    isInteraction: false,  // não bloqueia a fila do runAfterInteractions
  })
).start();
```

---

## Padrões de comunicação entre threads

### Do worklet para a thread JS

Nunca chame setters de estado React diretamente de um worklet — eles rodam na thread UI e o React não é thread-safe. Use `runOnJS`:

```typescript
import { runOnJS } from 'react-native-reanimated';

const dragGesture = Gesture.Pan()
  .onEnd((event) => {
    // Este callback roda na thread UI
    if (event.translationY > 200) {
      runOnJS(setBottomSheetOpen)(false); // agenda no event loop JS
    }
  });
```

### Da thread JS para o worklet

Use `runOnUI` para agendar uma chamada de worklet a partir da thread JS:

```typescript
import { runOnUI } from 'react-native-reanimated';

function dispararFeedbackHaptico() {
  runOnUI(() => {
    'worklet';
    // roda na thread UI
    Haptics.impactAsync();
  })();
}
```

### Shared values como canal de dados

Shared values são o mecanismo principal para passar dados entre threads sem código explícito de sincronização:

```typescript
const progress = useSharedValue(0); // vive no runtime da thread UI

// Thread JS: escrita é assíncrona (sincronizada antes do próximo frame)
progress.value = 0.5;

// Worklet (thread UI): leitura/escrita é síncrona
useAnimatedStyle(() => ({
  width: `${progress.value * 100}%`,
}));
```

---

## Checklist: higiene de threads para animações

- Animações em `transform` ou `opacity` sempre usam `useNativeDriver: true` (API Animated) ou worklets Reanimated
- Nunca chamar `setState` dentro de um listener `Animated` que dispara por frame — usar `runOnJS` de uma reação Reanimated
- Adiar trabalho pesado pós-animação com `InteractionManager.runAfterInteractions`
- Marcar animações decorativas/em loop com `isInteraction: false`
- Perfilar em build de release — o overhead do modo dev não é representativo da produção
