---
title: "Performance e Profiling de Animações"
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/anim_05_animation_performance.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

# Performance e Profiling de Animações

> Animação suave a 60/120 FPS é uma restrição, não um objetivo. Este documento cobre os modos de falha exatos que produzem frames perdidos em apps React Native com animações, e o fluxo de profiling para diagnosticar e corrigir esses problemas em builds de produção.

---

## O orçamento de frame

| Display | Taxa de atualização | Orçamento de frame |
|---|---|---|
| Mobile padrão | 60 Hz | 16,67 ms |
| ProMotion iOS (iPhone 15 Pro) | 120 Hz | 8,33 ms |
| Android alta taxa | 90–144 Hz | 6,94–11,11 ms |

Tanto a thread JS quanto a thread UI precisam concluir seu trabalho dentro do orçamento de frame para que o frame seja enviado à tela no prazo. Uma falha em qualquer das threads perde o frame.

```
Sinal Vsync chega
        │
  ┌─────▼─────────────────────────────────────────────────────┐
  │  Orçamento Thread UI (16,67ms)                            │
  │                                                           │
  │  ├── Worklets Reanimated executam (~1ms por worklet)      │
  │  ├── Processa mutações Fabric pendentes do JS             │
  │  ├── Layout pass Yoga (somente se o layout mudou)         │
  │  └── Grava comandos de desenho → GPU                      │
  └───────────────────────────────────────────────────────────┘
        │
  ┌─────▼─────────────────────────────────────────────────────┐
  │  Orçamento Thread JS (paralelo, também 16,67ms)           │
  │                                                           │
  │  ├── Reconciliador React                                  │
  │  ├── Atualizações de estado                               │
  │  ├── Recálculo de Animated (sem native driver)            │
  │  └── Agendar próximo lote de mutações Fabric              │
  └───────────────────────────────────────────────────────────┘
```

As duas threads trabalham em paralelo. Um render de 30ms na thread JS não bloqueia os worklets da thread UI — mas atrasa o próximo lote de mutações Fabric, o que pode perder frames se o conteúdo da UI também precisar mudar.

---

## Causas raiz de frames perdidos em animações

### 1. Animated sem native driver

Toda chamada `Animated.timing`/`Animated.spring` sem `useNativeDriver: true` recalcula o valor animado na thread JS a cada frame e o envia para o nativo. Se a thread JS estiver ocupada com qualquer coisa — uma atualização de estado, um callback de rede, um selector do Redux — o valor de animação chega atrasado e o frame é perdido.

**Diagnóstico:** thread JS consistentemente próxima ou acima de 16ms durante a animação no profiler, enquanto a thread UI está ociosa.

**Solução:** sempre use `useNativeDriver: true` para `transform` e `opacity`. Para propriedades de layout, migre para worklets Reanimated.

### 2. Animando propriedades de layout

`width`, `height`, `margin`, `padding` e `flex` acionam um layout pass do Yoga a cada frame. Isso roda na thread UI, mas é caro porque percorre a árvore de layout a partir do elemento animado para cima.

**Diagnóstico:** slices de `traversals` da thread UI consistentemente largos no Android Profiler, Yoga/layout no Instruments.

**Solução:** use `transform: [{ scale }]` em vez de `width`/`height` quando possível. Para mudanças de layout genuínas, as transições de layout do Reanimated agrupam a mudança em um único pass.

### 3. Criando views durante animação

Montar novas views nativas durante uma animação causa um spike na thread UI (criação de view) e na thread JS (reconciliação). É o padrão "jank ao navegar".

```typescript
// Padrão que causa jank:
function Tela() {
  const [mostrarConteudo, setMostrarConteudo] = useState(false);

  useEffect(() => {
    navigation.navigate('Detalhe'); // dispara animação de transição
    setMostrarConteudo(true);       // monta árvore de componentes grande no meio da animação
  }, []);
}

// Padrão correto:
function Tela() {
  useEffect(() => {
    navigation.navigate('Detalhe');
    InteractionManager.runAfterInteractions(() => {
      setMostrarConteudo(true); // adiado até a transição terminar
    });
  }, []);
}
```

### 4. `console.log` em hot paths de animação

Cada chamada `console.log` serializa seus argumentos e escreve no canal de debug do Hermes. Em um loop de animação a 60 FPS, isso é 60 serializações por segundo. Em produção com build de debug, ainda tem custo.

**Solução:** remova todos os `console.log` de builds de produção. Configure o Babel para removê-los:

```javascript
// babel.config.js
module.exports = {
  plugins: [
    ...(process.env.NODE_ENV === 'production' ? ['transform-remove-console'] : []),
  ],
};
```

### 5. Callbacks pesados em `useAnimatedStyle`

O callback `useAnimatedStyle` roda na thread UI a cada frame onde uma dependência muda. Computações complexas dentro dele consomem tempo da thread UI.

```typescript
// Lento: computando interpolação cara por frame
const style = useAnimatedStyle(() => {
  const progress = offset.value / MAX_OFFSET;
  const easedProgress = Easing.bezier(0.33, 1, 0.68, 1)(progress); // caro
  return { transform: [{ translateX: easedProgress * TARGET }] };
});

// Rápido: pré-calcular interpolação como valor derivado
const easedOffset = useDerivedValue(() => {
  const progress = offset.value / MAX_OFFSET;
  return progress * TARGET; // linear — Reanimated cuida do easing no withTiming
});

const style = useAnimatedStyle(() => ({
  transform: [{ translateX: easedOffset.value }],
}));
```

### 6. Redimensionamento de imagem grande durante animação

Animar `width`/`height` de uma `Image` no iOS recorta a imagem da resolução original a cada frame — operação cara para a GPU.

**Solução:** use `transform: [{ scale }]`. A GPU escala a textura já decodificada, o que é gratuito comparado a decodificar novamente.

```typescript
// Lento: re-decodifica imagem a cada frame no iOS
const style = useAnimatedStyle(() => ({
  width: baseWidth + offset.value,
  height: baseHeight + offset.value,
}));

// Rápido: scale na GPU, sem re-decodificação
const style = useAnimatedStyle(() => ({
  transform: [{ scale: 1 + offset.value / baseWidth }],
}));
```

### 7. `needsOffscreenAlphaCompositing` (Android)

No Android, animar opacidade em uma view com filhos sobrepostos transparentes força composição alfa off-screen por frame — uma operação cara para a GPU que renderiza toda a subárvore em um buffer off-screen a cada frame.

Sintomas: slices de `DrawFrame` da thread UI largos, utilização da GPU alta.

**Solução:** reestruture o componente para evitar filhos transparentes sobrepostos.

---

## Fluxo de profiling

### Passo 1: Perfilar em build de release

O modo de desenvolvimento habilita validação de props, logging extra e instrumentação de debug do Hermes. O throughput da thread JS em modo dev é 3–5× mais lento que em produção. As leituras de FPS do bundler Metro não são representativas.

```bash
# Build de release Android
npx react-native run-android --mode release

# Build de release iOS (Xcode)
# Product → Scheme → Edit Scheme → Run → Release
```

### Passo 2: Android — Android Studio Profiler + Perfetto

1. Conecte o dispositivo em modo profileable (build de release ou `<profileable android:shell="true" />` no `AndroidManifest.xml`).
2. Abra Android Studio → App Inspection → Profiler.
3. Selecione "Capture System Activities" (System Trace).
4. Reproduza a animação.
5. Pare a gravação.

**Threads principais para inspecionar:**

| Nome da thread | O que observar |
|---|---|
| `<package do app>` (thread UI) | `Choreographer#doFrame`, `traversals` — deve terminar em < 8ms |
| `mqt_js` | Thread JS — execução contínua acima de 16ms = gargalo JS |
| `RenderThread` | `DrawFrame` — slices longos = overdraw na GPU |
| `mqt_native_modules` | Spikes durante animação = chamadas desnecessárias a módulos nativos |

Habilite **VSync Highlighting** no visualizador de trace: as linhas de limite de 16ms tornam os overruns imediatamente visíveis.

**Exportar para Perfetto para análise avançada:**

Perfetto UI (`https://ui.perfetto.dev`) oferece análise de caminho crítico entre threads, flame charts por thread e anotação de slices:

1. Android Studio → Save trace file.
2. Abra Perfetto → arraste o arquivo `.perfetto-trace` ou `.json`.
3. Use a análise "Critical Path" para encontrar a cadeia de slices que causou um frame perdido.

**Lendo um flame chart:**

```
Frame N (limite 16ms)
───────────────────────────────────────────────────────────────────────
Thread UI: [Choreographer doFrame 3ms][traversal 2ms][DrawFrame 4ms]
                                                                  ← dentro do orçamento
Thread JS: [reconciliador React: 28ms ████████████████████████████]
                                         ← acima do orçamento → mutação frame N+1 atrasada
```

### Passo 3: iOS — Instruments (Time Profiler + Core Animation)

1. Xcode → Instruments (⌘ + I no menu do dispositivo).
2. Selecione o template "Core Animation" (captura FPS, uso de GPU e CPU por frame).
3. Inicie a gravação, reproduza a animação, pare.

**Instrumentos principais:**

- **Contador de FPS**: deve permanecer em 60 ou 120. Quedas abaixo de 50 são visíveis ao usuário.
- **Uso de CPU por thread**: identifique a thread consumindo CPU excessiva por frame.
- **Core Animation**: mostra transações de camadas commitadas, fill rate da GPU, renderização off-screen.
- **Allocations**: spikes durante animação = novos objetos criados por frame (pressão potencial no GC do Hermes).

**Renderização off-screen no iOS:**

O instrumento Core Animation mostra "Offscreen Rendered" em vermelho. É acionada por:
- `shouldRasterizeIOS: true` (intencional — cacheia subárvores complexas)
- Views clipadas com `clipsToBounds` e camadas complexas

Use `shouldRasterizeIOS: true` apenas para subárvores complexas e **estáticas** que animam como uma unidade — nunca para conteúdo que muda a cada frame.

### Passo 4: React DevTools Profiler

Para gargalos na thread JS causados por renders React, use o React DevTools Profiler:

1. Abra o Metro bundler → DevMenu → "Open DevTools".
2. Vá para a aba Profiler.
3. Marque "Record why each component rendered".
4. Inicie o profiling, interaja, pare.

Procure por:
- Componentes re-renderizando a cada frame durante animação (não deveriam)
- Componentes com funções de render caras no flame chart
- Componentes cujo re-render é disparado por estado derivado de animação que deveria ser um shared value

---

## Resumo das regras de performance

| Regra | Motivo |
|---|---|
| `useNativeDriver: true` em todas as animações de `transform`/`opacity` | Remove o JS do loop de animação |
| Use worklets Reanimated para animações baseadas em gestos | Execução na thread UI, nunca bloqueada pelo trabalho do JS |
| Mantenha callbacks `useAnimatedStyle` leves — sem cálculos pesados, sem alocações | Roda na thread UI a cada frame |
| Use `InteractionManager.runAfterInteractions` para trabalho pós-animação | Evita contenção no JS durante transições |
| Marque animações de fundo/decorativas com `isInteraction: false` | Não bloqueia a fila do `runAfterInteractions` |
| Nunca anime `width`/`height` — use `transform: [{ scale }]` | Propriedades de layout acionam Yoga a cada frame |
| Adicione `collapsable={false}` em `Animated.View`s com saída no Android | Evita que o achatamento de views mate animações de saída |
| Perfile em build de **release** com Android Studio + Perfetto / Instruments | Números do modo dev não são representativos |
| Remova todos os `console.log` de builds de produção | Cada chamada serializa e bloqueia a thread JS |
| Instancie builders do Reanimated fora do render ou com `useMemo` | Evita alocação de objetos por render |
| Não crie novas views durante uma animação | Aciona reconciliação + spike de traversal de view |
| Use `renderToHardwareTextureAndroid`/`shouldRasterizeIOS` apenas em subárvores complexas e estáticas | Reduz o custo de rasterização por frame para conteúdo estável |

---

## Medindo: `PerformanceObserver` no Hermes

O Hermes expõe a Web Performance API. Use-a para medir durações de frames de animação a partir do JS:

```typescript
import { PerformanceObserver } from 'react-native';

const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.duration > 16) {
      console.warn(`Frame longo: ${entry.name} levou ${entry.duration.toFixed(1)}ms`);
    }
  });
});

observer.observe({ entryTypes: ['measure'] });

// Marcar limites da animação
performance.mark('animacao-inicio');
// ... disparar animação ...
performance.mark('animacao-fim');
performance.measure('animacao', 'animacao-inicio', 'animacao-fim');
```

Isso roda na thread JS e mede apenas a duração do lado JS — não captura tempo da thread UI ou da GPU. Use para detectar trabalho JS ocorrendo durante animações (atualizações de estado, misses de memoização).
