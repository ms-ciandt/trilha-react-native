---
title: Performance
---

# Performance

> **Modulo 04 — React Native Masterclass**
> Publico-alvo: engenheiros senior que publicam apps RN 0.76+ e precisam de melhorias de performance mensuráveis e prontas para produção — nao dicas isoladas, mas uma metodologia sistematica.

---

## 1. Tempo de Inicializacao

O tempo de inicializacao e a metrica que os usuarios percebem mais. No React Native 0.76+, o cold start percorre quatro fases sequenciais. Otimizar a fase errada desperdiça esforco.

### As quatro fases do cold start

```
Lancamento do app (SO cria o processo)
        │
        ├─ Fase 1: Inicializacao nativa
        │     ReactHost.start() / RCTHost.start()
        │     Criacao da VM Hermes, init do GC, configuracao da bridge JNI
        │     Tipico: 50–150 ms (Android entrada), 30–80 ms (iOS)
        │
        ├─ Fase 2: Carregamento do bundle
        │     mmap .hbc do disco (release) ou HTTP do Metro (debug)
        │     Hermes avalia os requires de nivel superior
        │     Tipico: 100–500 ms dependendo do tamanho do bundle
        │
        ├─ Fase 3: Inicializacao dos modulos JS
        │     AppRegistry.registerComponent, criacao da store Redux,
        │     init de I18n, init de analytics, etc.
        │     Tipico: 50–400 ms (muito especifico ao app)
        │
        └─ Fase 4: Primeiro render
              Reconciliador React, Fabric Shadow Tree, layout Yoga,
              primeira MountingTransaction → pixels na tela
              Tipico: 30–100 ms
```

**Time to Interactive (TTI)** = Fase 1 + 2 + 3 + 4. Em um dispositivo Android intermediario, 800 ms de TTI e alcancavel; 500 ms e excelente.

### Medindo o tempo de inicializacao corretamente

Nunca meça o startup com timestamps de `console.log` — eles estao na thread JS, que so inicia apos a conclusao da Fase 1. Use ferramentas de rastreamento da plataforma para capturar o quadro completo.

**Android — Perfetto**

```bash
# Capture um trace de cold start (encerre o app primeiro)
adb shell am force-stop com.yourapp
adb shell am start -S -W com.yourapp/.MainActivity \
  --ez "react_native_jsi_tracing" true

# No Android Studio: Profiler → CPU → System Trace → Record
# Ou via CLI:
python3 $ANDROID_HOME/platform-tools/systrace/systrace.py \
  -t 8 \
  -o cold_start.html \
  gfx view dalvik react_native_new_arch
```

Abra `cold_start.html` no Perfetto UI (`ui.perfetto.dev`). Procure por:

| Slice | Mede |
|---|---|
| `ReactHost::start` | Fase 1 |
| `HermesExecutor::loadBundle` | mmap da Fase 2 |
| `Runtime::callFunction` (AppRegistry.runApplication) | Fase 3 |
| `Fabric::commit` (primeiro commit) | Fase 4 |

**iOS — Instruments**

Abra Instruments → template App Launch → Profile seu app. A faixa "Time Profiler" mostra o trabalho da thread JS; a faixa "React Native" (ativada via variavel de ambiente `RCTPROFILE=1`) exibe slices especificos do RN.

```swift
// Adicione ao AppDelegate para medicao customizada
import os.signpost
let log = OSLog(subsystem: "com.yourapp", category: .pointsOfInterest)
os_signpost(.begin, log: log, name: "BundleLoad")
// ... carregamento do bundle ...
os_signpost(.end, log: log, name: "BundleLoad")
```

Esses marcadores `os_signpost` aparecem como intervalos nomeados no Instruments, permitindo identificar exatamente onde o tempo e gasto.

### Otimizacao da Fase 1: aquecimento antecipado do ReactHost

```kotlin
// Android — aqueca antes do usuario chegar na tela RN
class MyApplication : Application() {
    val reactHost: ReactHost by lazy { buildReactHost() }

    override fun onCreate() {
        super.onCreate()
        // Inicie antecipadamente — o init do Hermes acontece em thread em segundo plano
        // Custo: ~10 MB de RAM extra sempre. Beneficio: ~200 ms a menos na primeira tela RN
        reactHost.start()
    }
}
```

```swift
// iOS — mesmo padrao
func application(_ application: UIApplication,
    didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Hermes inicia de forma assincrona; quando o usuario navega para o RN, ele ja esta pronto
    ReactNativeHost.shared.start()
    return true
}
```

**Contrapartida:** sempre consome RAM mesmo que o usuario nunca abra uma tela RN. Use aquecimento condicional se seu funil mostrar que apenas 30–40% dos usuarios chegam a uma superficie RN:

```kotlin
// Aqueça so apos o usuario autenticar (sinal de maior intencao)
loginViewModel.onLoginSuccess.observe(this) {
    reactHost.start()
}
```

### Otimizacao da Fase 2: inline requires

Inline requires adiam a avaliacao de `require()` ate a primeira execucao do ponto de uso. Sem inline requires, o codigo de nivel superior de cada modulo executa durante a avaliacao do bundle:

```javascript
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,   // adia todos os requires para o primeiro uso
        experimentalImportSupport: false,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

Com `inlineRequires: true`, isto:

```javascript
// Antes da transformacao (seu codigo-fonte)
import { HeavyCalendar } from 'heavy-calendar-lib';  // 200 KB parseados no carregamento
export function ScheduleScreen() { return <HeavyCalendar />; }
```

Torna-se em tempo de avaliacao:

```javascript
// Apos a transformacao do Metro (no bundle)
export function ScheduleScreen() {
  const { HeavyCalendar } = require('heavy-calendar-lib'); // adiado ate a tela renderizar
  return React.createElement(HeavyCalendar, null);
}
```

**Medindo o ganho:** execute `npx react-native bundle --profile` antes e depois. Observe `"Total load time"` na saida.

### Otimizacao da Fase 3: adiar init nao critica

Mova tudo que nao e necessario para o primeiro frame para fora da execucao do bundle de nivel superior:

```typescript
// RUIM — todo o init roda antes do primeiro render
import Analytics from './Analytics';       // carrega SDK
import CrashReporter from './Crash';       // carrega SDK
import I18n from './I18n';               // le 500 KB de JSON
import { store } from './store';          // executa todos os reducers

AppRegistry.registerComponent('App', () => App);
```

```typescript
// BOM — distribuido pelo interaction scheduler
import { InteractionManager } from 'react-native';

AppRegistry.registerComponent('App', () => App);

// Estes rodam apos o primeiro frame ser pintado
InteractionManager.runAfterInteractions(async () => {
  const { initAnalytics } = await import('./Analytics');
  const { initCrash }     = await import('./Crash');
  await Promise.all([initAnalytics(), initCrash()]);
});
```

`InteractionManager.runAfterInteractions` enfileira trabalho ate que todas as animacoes de toque estejam completas e ao menos um frame tenha sido commitado. Isso sozinho pode reduzir a Fase 3 de 300 ms para 80 ms no caminho percebido de inicializacao.

### Otimizacao da Fase 4: evitar trabalho no caminho do primeiro render

Cada componente que renderiza durante o primeiro frame tem um custo. Armadilhas comuns:

```typescript
// RUIM — computacao pesada sincrona durante o primeiro render
function HomeScreen() {
  // Isso roda sincronamente na thread JS antes de qualquer frame ser pintado
  const recommended = products.sort(heavyComparator).slice(0, 20);
  return <ProductList items={recommended} />;
}

// BOM — adia a ordenacao, mostra skeleton primeiro
function HomeScreen() {
  const [recommended, setRecommended] = useState<Product[]>([]);

  useEffect(() => {
    // Roda apos o primeiro frame ser commitado
    setRecommended(products.sort(heavyComparator).slice(0, 20));
  }, []);

  if (recommended.length === 0) return <ProductListSkeleton />;
  return <ProductList items={recommended} />;
}
```

```typescript
// RUIM — arvore de componentes profunda com muitas passagens de layout
<ScrollView>
  {Array.from({ length: 200 }).map(i => <ExpensiveRow key={i} />)}
</ScrollView>

// BOM — lista virtualizada, renderiza apenas as linhas visiveis
<FlashList
  data={items}
  estimatedItemSize={80}
  renderItem={({ item }) => <Row item={item} />}
/>
```

---

## 2. Otimizacao com Hermes

### Entendendo o modelo de performance do Hermes

O Hermes nao compila JavaScript com JIT. Essa e uma escolha de design deliberada: a compilacao JIT aumenta a RAM e introduz pausas imprevisíveis (aquecimento JIT, desotimizacao). O Hermes troca throughput de pico por latencia consistente e previsivel — a escolha certa para UIs moveis.

A consequencia pratica: codigo que depende de otimizacao JIT (loops numericos apertados, WASM) e mais lento no Hermes do que no JSC. Codigo que se beneficia de um menor footprint de GC e startup mais rapido (renderizacao React, chamadas de API, navegacao) e mais rapido.

### Configuracao do GC do Hermes

O Hermes usa um GC geracional com dois heaps principais:

| Heap | Contem | Gatilho do GC |
|---|---|---|
| Geracao jovem | Objetos alocados recentemente | GC menor quando cheio (~2–5 ms de pausa) |
| Geracao antiga | Objetos de longa duracao | GC maior sob pressao (~10–50 ms de pausa) |

Ajuste os parametros do GC com base no perfil de alocacao do seu app:

```kotlin
// Android — config HermesExecutorFactory
HermesExecutorFactory(
    RuntimeConfig.Builder()
        .withGCConfig(
            GCConfig.Builder()
                // Aumente a geracao jovem para apps com renderizacao React pesada
                .withInitHeapSize(8 * 1024 * 1024)     // 8 MB inicial
                .withMaxHeapSize(256 * 1024 * 1024)    // 256 MB maximo
                // Ratio de ocupacao: dispara GC maior quando o heap estiver 75% cheio
                .withOccupancyTarget(0.75f)
                .build()
        )
        .build()
)
```

```swift
// iOS — RCTHermesInstance
var config = HermesRuntimeConfig()
config.gcConfig.initHeapSize = 8 * 1024 * 1024
config.gcConfig.maxHeapSize = 256 * 1024 * 1024
config.gcConfig.occupancyTarget = 0.75
```

**Diagnosticando pressao de GC:** no Perfetto, pausas de GC aparecem como slices `GC` na thread JS. Se voce ver GCs maiores durante animacoes de UI, voce tem um problema de alocacao — use o profiler de memoria do Hermes.

### Profiler de memoria do Hermes (heap snapshot)

```typescript
// Apenas em build de desenvolvimento — grave um heap snapshot
import { HermesProfiling } from 'react-native';

async function captureHeapSnapshot() {
  // Snapshot antes da acao
  await HermesProfiling.captureHeapProfile();
  
  // Execute a acao que voce suspeita alocar muito
  navigateTo('HeavyScreen');
  
  // Snapshot apos a acao
  const profile = await HermesProfiling.captureHeapProfile();
  // Salvo no dispositivo: /data/data/com.yourapp/files/hermes-*.heaptimeline
}
```

Carregue o arquivo `.heaptimeline` no Chrome DevTools → aba Memory → Load profile. A visao de timeline mostra alocacoes de objetos ao longo do tempo; a visao de resumo mostra o tamanho retido por construtor.

### Profiler de amostragem do Hermes (CPU)

```typescript
import { HermesProfiling } from 'react-native';

async function profileAction() {
  HermesProfiling.startSamplingProfiler();
  
  // Acao a ser perfilada (ex.: navegar e renderizar lista pesada)
  await performAction();
  
  const cpuProfile = await HermesProfiling.stopSamplingProfiler();
  // cpuProfile e uma string JSON no formato de CPU profile do Chrome
  // Baixe do dispositivo e abra em: chrome://inspect → Profiler → Load
}
```

O flame chart de CPU mostra a distribuicao de tempo entre suas funcoes JS. Funcoes no topo da chama (barras mais largas) sao onde o engine passa mais tempo. Descobertas comuns:

- Barras largas em `performSelectorOnMainThread` → chamadas sincronas excessivas ao nativo
- Barras largas em `Object.keys` / `JSON.parse` → serializacao desnecessaria
- Barras largas em `filter` / `reduce` → estado derivado computado a cada render em vez de memoizado

### Worklets (react-native-reanimated)

Para animacoes e gestos que nao podem envolver a thread JS de forma alguma, o Reanimated 3 introduz **worklets** — funcoes que rodam na thread de UI dentro de um runtime secundario do Hermes:

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

// SharedValue vive no runtime Hermes da thread de UI
const offset = useSharedValue(0);

// O callback useAnimatedStyle e um worklet — roda na thread de UI
const animatedStyle = useAnimatedStyle(() => {
  'worklet';  // marca como worklet — compilado separadamente
  return {
    transform: [{ translateX: offset.value }],
  };
});

// Handler de gesto — roda na thread de UI, nunca bloqueia o JS
const gesture = Gesture.Pan()
  .onUpdate((e) => {
    'worklet';
    offset.value = e.translationX;
  })
  .onEnd(() => {
    'worklet';
    offset.value = withSpring(0);  // volta com spring — roda na thread de UI
  });
```

Sem worklets, cada `onPanResponderMove` postaria uma mensagem para a thread JS, que entao chamaria `setNativeProps` — adicionando latencia de 1–2 frames. Com worklets, a animacao roda inteiramente na thread de UI a 120 fps mesmo que a thread JS esteja ocupada.

A diretiva `'worklet'` instrui o plugin Babel do Reanimated a extrair a funcao e compila-la para o runtime de UI. Funcoes marcadas como worklets nao podem usar closures JS que referenciem o runtime principal do Hermes — elas so podem usar `SharedValue`s e outros valores compatíveis com worklet.

---

## 3. Profiling e Deteccao de Gargalos

### O ciclo de medicao

Nao otimize o que voce nao mediu. O ciclo:

```
1. Estabeleca um cenario reproduzivel
2. Meça (escolha UMA metrica)
3. Identifique o componente mais lento
4. Mude UMA coisa
5. Meça novamente
6. Aceite ou reverta
```

### Matriz de selecao de ferramentas

| O que voce suspeita | Ferramenta | Saida |
|---|---|---|
| Inicializacao lenta | Perfetto (Android), Instruments App Launch (iOS) | Timeline de todas as threads |
| Renderizacao JS lenta | React DevTools Profiler | Tempo de render por componente |
| Hotspot de CPU JS | Profiler de amostragem do Hermes | Flame chart |
| Memoria excessiva | Heap snapshot do Hermes | Tamanho retido por construtor |
| Frames descartados durante scroll | Faixa `Choreographer` do Perfetto | Timing de frames |
| Criacao lenta de views nativas | `Fabric::commit` do Perfetto | Tempo de commit da Shadow Tree |
| Gargalo de rede | Plugin Network do Flipper | Waterfall de requisicao/resposta |
| Gargalo de chamadas JS <-> nativo | Categoria `JSI` do Perfetto | Duracoes de chamadas HostFunction |

### React DevTools Profiler — encontrando causas de re-render

O flame chart do Profiler mostra quais componentes renderizaram em cada commit. Mas as informacoes de **"por que isso renderizou?"** sao igualmente importantes:

```bash
# Instale o React DevTools standalone
npm install -g react-devtools@latest
react-devtools
```

Na aba Profiler, habilite "Record why each component rendered" (o icone de engrenagem). Apos gravar, clique em qualquer barra de componente — o painel mostra exatamente qual prop ou estado mudou.

Descobertas comuns e suas correcoes:

```typescript
// PROBLEMA: literal de objeto cria nova referencia a cada render
<MyList config={{ pageSize: 20, sorted: true }} />

// CORRECAO: useMemo ou mova a constante para fora do componente
const LIST_CONFIG = { pageSize: 20, sorted: true };
<MyList config={LIST_CONFIG} />
```

```typescript
// PROBLEMA: arrow function inline cria nova referencia
<Button onPress={() => handlePress(item.id)} />

// CORRECAO: useCallback
const handlePressItem = useCallback(
  () => handlePress(item.id),
  [item.id]
);
<Button onPress={handlePressItem} />
```

```typescript
// PROBLEMA: valor de context e um novo objeto a cada render
const ThemeContext = createContext({ color: 'blue', fontSize: 16 });

function ThemeProvider({ children }) {
  // NOVO OBJETO A CADA RENDER — todos os consumidores re-renderizam
  return (
    <ThemeContext.Provider value={{ color, fontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

// CORRECAO: memoize o valor do context
function ThemeProvider({ children }) {
  const value = useMemo(() => ({ color, fontSize }), [color, fontSize]);
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### FlashList — a ferramenta certa para listas grandes

`FlatList` renderiza todos os itens antecipadamente ao entrar no pool de reciclagem. `FlashList` da Shopify pre-aloca um pool fixo e recicla objetos de view — sem mount/unmount por item:

```typescript
import { FlashList } from '@shopify/flash-list';

// Meça antes de trocar — obtenha FPS de referencia no Perfetto
// Entao troque:
<FlashList
  data={items}
  keyExtractor={(item) => item.id}
  estimatedItemSize={84}           // critico: deve corresponder a altura media renderizada
  renderItem={({ item }) => <OrderRow order={item} />}
  // Evite callback onLayout — ele re-mede e causa renders extras
  overrideItemLayout={(layout, item) => {
    layout.size = item.isExpanded ? 168 : 84;
  }}
/>
```

`estimatedItemSize` e a prop mais importante — se estiver errada, o FlashList calcula incorretamente a posicao de scroll e causa saltos. Meça a altura real do seu item:

```typescript
// Meça a altura real do item em desenvolvimento
function OrderRow({ order }: { order: Order }) {
  return (
    <View onLayout={(e) => {
      if (__DEV__) console.log('OrderRow height:', e.nativeEvent.layout.height);
    }}>
      {/* ... */}
    </View>
  );
}
```

### Evitando a armadilha de performance do `useSelector`

No Redux Toolkit, cada chamada `useSelector` re-executa a cada dispatch da store. Se um selector for custoso ou retornar uma nova referencia, o componente re-renderiza desnecessariamente:

```typescript
// RUIM — nova referencia de array a cada dispatch
const expensiveItems = useSelector((state) =>
  state.orders.items.filter(o => o.status === 'pending')
);

// BOM — selector memoizado com reselect
import { createSelector } from '@reduxjs/toolkit';

const selectPendingOrders = createSelector(
  [(state: RootState) => state.orders.items],
  (items) => items.filter(o => o.status === 'pending')
  // resultado em cache — novo array so quando items muda
);

const pendingOrders = useSelector(selectPendingOrders);
```

### Flipper — painel de performance integrado

```bash
# Instale o Flipper
brew install --cask flipper  # macOS

# No seu app (somente debug):
# Flipper e incluido automaticamente via config de debug do React Native 0.76
```

Plugins do Flipper uteis para performance:

| Plugin | O que mostra |
|---|---|
| React DevTools | Arvore de componentes, props, estado, profiler |
| Network | Todas as requisicoes fetch/axios com timing |
| Databases | Conteudo do SQLite / MMKV / AsyncStorage |
| Layout | Hierarquia de views, limites medidos |
| Crash Reporter | Simbolizacao de crashes nativos |

### Systrace — analise no nivel de frame

Para investigacoes de frames descartados, o Systrace fornece a verdade absoluta:

```bash
# Capture durante uma interacao de scroll
python3 systrace.py -t 10 -o scroll.html \
  gfx view dalvik react_native_new_arch input

# Principais coisas a observar no Perfetto UI:
# - Choreographer#doFrame maior que 16.7ms = frame descartado
# - Fabric::commit cruzando o limite de VSync
# - Longas pausas de GC coincidindo com frames com jank
```

---

## 4. Re-renders e Caching

### O contrato de renderizacao

O React re-renderiza um componente quando:
1. Seu proprio estado muda (`useState`, `useReducer`)
2. Seu pai re-renderiza e ele nao esta envolto em `React.memo`
3. Um context que ele consome muda
4. Um hook que ele usa retorna uma nova referencia

Entender isso com precisao permite projetar componentes que optam por nao participar de renders desnecessarios.

### `React.memo` — uso correto e incorreto

```typescript
// CORRETO — componente puro com props estaveis
const ProductCard = React.memo(function ProductCard({ product, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(product.id)}>
      <Text>{product.name}</Text>
    </Pressable>
  );
}, (prev, next) => {
  // Comparador customizado — re-renderiza apenas quando o preco muda
  return prev.product.price === next.product.price
      && prev.product.name === next.product.name;
});

// INCORRETO — memo e inutil aqui porque onPress e uma funcao inline
// Pai re-renderiza → nova referencia de onPress → comparacao do memo falha → re-renderiza de qualquer forma
<ProductCard product={p} onPress={(id) => handlePress(id)} />

// CORRETO — referencia estavel
const handlePress = useCallback((id: string) => {
  navigate('Product', { id });
}, [navigate]);
<ProductCard product={p} onPress={handlePress} />
```

### `useMemo` — quando vale a pena

`useMemo` tem um custo: a comparacao de dependencias a cada render. So vale quando a computacao memoizada e significativamente mais cara que a comparacao.

```typescript
// NAO vale memoizar — adicao e mais barata que comparacao + cache lookup
const total = useMemo(() => a + b, [a, b]);  // pior que: const total = a + b;

// VALE memoizar — ordenar 10000 itens e custoso
const sortedItems = useMemo(
  () => [...rawItems].sort(priceComparator),
  [rawItems]  // so re-ordena quando a referencia de rawItems muda
);

// VALE memoizar — formatacao custosa
const formattedData = useMemo(
  () => rawData.map(transformToChartPoint),  // transformacao complexa
  [rawData]
);
```

### Zustand — subscricoes de granularidade fina

Zustand e mais performatico que Redux para a maioria dos apps React Native porque as subscricoes sao por selector, nao por dispatch:

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface CartStore {
  items: CartItem[];
  totalPrice: number;
  addItem: (item: CartItem) => void;
}

const useCartStore = create<CartStore>()(
  subscribeWithSelector((set) => ({
    items: [],
    totalPrice: 0,
    addItem: (item) =>
      set((state) => ({
        items: [...state.items, item],
        totalPrice: state.totalPrice + item.price,
      })),
  }))
);

// Este componente so re-renderiza quando totalPrice muda
// Ele NAO re-renderiza quando um novo item e adicionado sem mudanca de preco
function CartBadge() {
  const totalPrice = useCartStore((state) => state.totalPrice);
  return <Text>{totalPrice.toFixed(2)}</Text>;
}

// Este componente so re-renderiza quando items.length muda
function CartIcon() {
  const count = useCartStore((state) => state.items.length);
  return <Badge count={count} />;
}
```

### Cache de imagens — FastImage vs Expo Image

Imagens sem cache sao re-baixadas e re-decodificadas a cada render. Tanto `react-native-fast-image` quanto `expo-image` fornecem cache em disco e memoria:

```typescript
import { Image } from 'expo-image';

// Expo Image — cache em disco por padrao, placeholder blurhash
<Image
  source={{ uri: 'https://cdn.example.com/product/123.jpg' }}
  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}  // exibido durante carregamento
  contentFit="cover"
  cachePolicy="disk"   // 'none' | 'memory' | 'disk' | 'memory-disk'
  transition={200}     // duracao do fade-in em ms
  style={{ width: 200, height: 200 }}
/>
```

Para conteudo que muda com pouca frequencia (imagens de produto, avatares), defina `cachePolicy="disk"` e use uma URL enderecada por conteudo (a propria URL age como chave de cache). Quando o servidor atualizar a imagem, mude a URL.

### Cache de queries — TanStack Query

Respostas de rede devem ser cacheadas e nunca re-buscadas enquanto estiverem frescas. TanStack Query (React Query) lida com isso por meio de um modelo stale-while-revalidate:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';

function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id),
    staleTime: 5 * 60 * 1000,     // 5 minutos: nao re-busca se os dados estao frescos
    gcTime: 30 * 60 * 1000,       // 30 minutos: mantém no cache mesmo sem subscriber
    refetchOnWindowFocus: false,   // nao re-busca quando o app volta ao primeiro plano
  });
}

// Pre-busca no hover/aproximacao — dados prontos antes da navegacao
const queryClient = useQueryClient();
function prefetchProduct(id: string) {
  queryClient.prefetchQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id),
    staleTime: 5 * 60 * 1000,
  });
}
```

Com configuracao adequada de `staleTime`, navegar de volta para uma tela ja visitada retorna dados instantaneamente do cache — sem spinner de carregamento.

---

## Materiais de Estudo

### Documentacao Oficial

| Recurso | Descricao |
|---|---|
| [Performance Overview](https://reactnative.dev/docs/performance) | Guia oficial de performance do RN — frame rate JS, frame rate nativo |
| [Hermes guide](https://reactnative.dev/docs/hermes) | Habilitando Hermes, profiling, config de release |
| [React DevTools Profiler](https://reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html) | Introducao original ao Profiler — conceitos se aplicam diretamente ao RN |
| [FlashList documentation](https://shopify.github.io/flash-list/) | Lista virtualizada da Shopify — guia de migracao e benchmarks de performance |
| [Reanimated worklets](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/#worklet) | Referencia oficial de worklets |

### Aprofundamentos

| Recurso | Autor | O que voce aprendera |
|---|---|---|
| [React Native Performance — the ultimate guide](https://www.callstack.com/blog/the-ultimate-guide-to-react-native-optimization) | Callstack | Mergulho profundo em 12 secoes: startup, memoria, listas, imagens, animacoes |
| [React Native startup time](https://blog.swmansion.com/react-native-startup-time-how-to-measure-and-how-to-improve-it-e3fd7c00d695) | Software Mansion | Instrumentacao, metodologia de benchmark, analise fase a fase |
| [Hermes GC explained](https://hermesengine.dev/docs/gc/) | Equipe Hermes | GC geracional, layout do heap, parametros de ajuste |
| [Profiling RN apps — Systrace](https://reactnative.dev/docs/profiling) | RN Docs | Configuracao do Systrace, leitura da saida, padroes comuns |
| [Re-renders — a visual guide](https://www.developerway.com/posts/react-re-renders-guide) | Developer Way | Context, memo, useCallback — ilustrado com React |

### Tutoriais em Video

| Recurso | Duracao | O que voce aprendera |
|---|---|---|
| [React Native Performance Workshop](https://www.youtube.com/watch?v=83ffAY-CmL4) | 55 min | Sessao de profiling ao vivo — startup, listas, animacoes |
| [Hermes internals](https://www.youtube.com/watch?v=oSHBQheFm48) | 22 min | Bytecode, GC, ferramentas de profiling |
| [FlashList: 10× better lists](https://www.youtube.com/watch?v=ZkRWHxZuVJw) | 20 min | Equipe da Shopify explica o pool de reciclagem e benchmarks |
| [Reanimated 3 worklets](https://www.youtube.com/watch?v=I-WZMBsgWJw) | 30 min | Compilacao de worklets, thread de UI, SharedValue |
| [React Conf 2024 — RN performance](https://www.youtube.com/watch?v=Ck0N9FsKAhI) | 30 min | Renderizacao concorrente, Suspense e performance no 0.76 |

### Interativo

| Recurso | O que fazer |
|---|---|
| [Perfetto UI](https://ui.perfetto.dev/) | Carregue um arquivo HTML do Systrace — explore flame charts online |
| [Expo Snack — Reanimated worklet](https://snack.expo.dev/@reanimated/worklet-demo) | Execute uma animacao com worklet e observe 60 fps mesmo com o JS bloqueado |
| [Yoga playground](https://yogalayout.dev/playground) | Depure performance de layout — veja quais propriedades flexbox disparam re-layout |
| [TanStack Query DevTools](https://tanstack.com/query/latest/docs/framework/react/devtools) | Inspecione cache de queries, stale times, re-fetch em segundo plano |

---

Proximo → [Bundle e Distribuicao](./02-bundle-distribution.md)
