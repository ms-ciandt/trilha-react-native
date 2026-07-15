---
title: "Performance — Profiling & Renders"
---

## 3. Profiling e Deteccao de Gargalos

### O ciclo de medicao

Nao otimize o que voce nao mediu. O ciclo e:

```
1. Estabeleca um cenario reproduzivel
2. Meca (escolha UMA metrica)
3. Identifique o componente mais lento
4. Mude UMA coisa
5. Meca novamente
6. Aceite ou reverta
```

### Matriz de selecao de ferramentas

| O que voce suspeita | Ferramenta | Saida |
|---|---|---|
| Inicializacao lenta | Perfetto (Android), Instruments App Launch (iOS) | Timeline de todas as threads |
| Renderizacao JS muito lenta | React DevTools Profiler | Tempo de renderizacao por componente |
| Hotspot de CPU JS | Hermes CPU sampling profiler | Flame chart |
| Memoria excessiva | Hermes heap snapshot | Tamanho retido por construtor |
| Frames descartados durante scroll | Pista `Choreographer` no Perfetto | Timing de frames |
| Criacao lenta de views nativas | `Fabric::commit` no Perfetto | Tempo de commit da Shadow Tree |
| Gargalo de rede | Plugin Network do Flipper | Waterfall de requisicoes/respostas |
| Gargalo em chamadas JS <-> nativo | Categoria `JSI` no Perfetto | Duracoes de chamadas de HostFunction |

### React DevTools Profiler — encontrando causas de re-renderizacao

O flame chart do Profiler mostra quais componentes renderizaram em cada commit. Mas a informacao de **"por que este componente renderizou?"** e igualmente importante:

```bash
# Instala o React DevTools standalone
npm install -g react-devtools@latest
react-devtools
```

Na aba Profiler, habilite "Record why each component rendered" (o icone de engrenagem). Apos gravar, clique em qualquer barra de componente — o painel mostra exatamente qual prop ou state mudou.

Problemas comuns e suas solucoes:

```typescript
// PROBLEMA: object literal cria nova referencia a cada renderizacao
<MyList config={{ pageSize: 20, sorted: true }} />

// SOLUCAO: useMemo ou mover a constante para fora do componente
const LIST_CONFIG = { pageSize: 20, sorted: true };
<MyList config={LIST_CONFIG} />
```

```typescript
// PROBLEMA: arrow function inline cria nova referencia
<Button onPress={() => handlePress(item.id)} />

// SOLUCAO: useCallback
const handlePressItem = useCallback(
  () => handlePress(item.id),
  [item.id]
);
<Button onPress={handlePressItem} />
```

```typescript
// PROBLEMA: valor de contexto e um novo objeto a cada renderizacao
const ThemeContext = createContext({ color: 'blue', fontSize: 16 });

function ThemeProvider({ children }) {
  // NOVO OBJETO A CADA RENDERIZACAO — todos os consumidores re-renderizam
  return (
    <ThemeContext.Provider value={{ color, fontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

// SOLUCAO: memoizar o valor do contexto
function ThemeProvider({ children }) {
  const value = useMemo(() => ({ color, fontSize }), [color, fontSize]);
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### FlashList — a ferramenta correta para listas grandes

`FlatList` renderiza todos os itens de forma ansiosa quando entram no pool de reciclagem. `FlashList` da Shopify pre-aloca um pool fixo e recicla objetos de view — sem mount/unmount por item:

```typescript
import { FlashList } from '@shopify/flash-list';

// Meca antes de trocar — obtenha o FPS de referencia no Perfetto
// Depois troque:
<FlashList
  data={items}
  keyExtractor={(item) => item.id}
  estimatedItemSize={84}           // critico: deve corresponder a altura media renderizada
  renderItem={({ item }) => <OrderRow order={item} />}
  // Evite callback onLayout — ele re-mede e causa renderizacoes extras
  overrideItemLayout={(layout, item) => {
    layout.size = item.isExpanded ? 168 : 84;
  }}
/>
```

`estimatedItemSize` e a prop mais importante — se estiver incorreta, o FlashList calcula mal a posicao de scroll e causa saltos. Meca a altura real do seu item:

```typescript
// Mede a altura real do item em desenvolvimento
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

No Redux Toolkit, toda chamada a `useSelector` e re-executada a cada dispatch do store. Se um selector e custoso ou retorna uma nova referencia, o componente re-renderiza desnecessariamente:

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
  // resultado em cache — novo array apenas quando items muda
);

const pendingOrders = useSelector(selectPendingOrders);
```

### Flipper — painel integrado de performance

```bash
# Instala o Flipper
brew install --cask flipper  # macOS

# No seu app (apenas debug):
# O Flipper e incluido automaticamente na config de debug do React Native 0.76
```

Plugins do Flipper uteis para performance:

| Plugin | O que mostra |
|---|---|
| React DevTools | Arvore de componentes, props, state, profiler |
| Network | Todas as requisicoes fetch/axios com timing |
| Databases | Conteudo de SQLite / MMKV / AsyncStorage |
| Layout | Hierarquia de views, limites medidos |
| Crash Reporter | Simbolizacao de crashes nativos |

### Systrace — analise no nivel de frame

Para investigar frames descartados, o Systrace fornece a verdade absoluta:

```bash
# Captura durante uma interacao de scroll
python3 systrace.py -t 10 -o scroll.html \
  gfx view dalvik react_native_new_arch input

# Pontos principais a observar na UI do Perfetto:
# - Choreographer#doFrame maior que 16,7ms = frame descartado
# - Fabric::commit cruzando o limite do VSync
# - Pausas longas de GC coincidindo com frames travados
```

---

## 4. Re-renderizacoes e Caching

### O contrato de renderizacao

O React re-renderiza um componente quando:
1. Seu proprio state muda (`useState`, `useReducer`)
2. Seu componente pai re-renderiza e ele nao esta envolto em `React.memo`
3. Um contexto que ele consome muda
4. Um hook que ele usa retorna uma nova referencia

Entender isso com precisao permite projetar componentes que optam por sair de renderizacoes desnecessarias.

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
// Pai re-renderiza → nova referencia de onPress → comparacao do memo falha → re-renderiza mesmo assim
<ProductCard product={p} onPress={(id) => handlePress(id)} />

// CORRETO — referencia estavel
const handlePress = useCallback((id: string) => {
  navigate('Product', { id });
}, [navigate]);
<ProductCard product={p} onPress={handlePress} />
```

### `useMemo` — quando compensa

`useMemo` tem um custo: a comparacao de dependencias a cada renderizacao. So compensa quando a computacao memoizada e significativamente mais cara que a comparacao.

```typescript
// NAO vale memoizar — adicao e mais barata que comparacao + consulta ao cache
const total = useMemo(() => a + b, [a, b]);  // pior que: const total = a + b;

// VALE memoizar — ordenar 10000 itens e custoso
const sortedItems = useMemo(
  () => [...rawItems].sort(priceComparator),
  [rawItems]  // re-ordena apenas quando a referencia de rawItems muda
);

// VALE memoizar — formatacao custosa
const formattedData = useMemo(
  () => rawData.map(transformToChartPoint),  // transformacao complexa
  [rawData]
);
```

### Zustand — subscricoes granulares

O Zustand e mais performatico que o Redux para a maioria dos apps React Native porque as subscricoes sao por seletor, nao por dispatch:

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

// Este componente APENAS re-renderiza quando totalPrice muda
// Ele NAO re-renderiza quando um novo item e adicionado sem mudar o preco
function CartBadge() {
  const totalPrice = useCartStore((state) => state.totalPrice);
  return <Text>{totalPrice.toFixed(2)}</Text>;
}

// Este componente APENAS re-renderiza quando items.length muda
function CartIcon() {
  const count = useCartStore((state) => state.items.length);
  return <Badge count={count} />;
}
```

### Caching de imagens — FastImage vs Expo Image

Imagens sem cache sao baixadas e decodificadas novamente a cada renderizacao. Tanto `react-native-fast-image` quanto `expo-image` oferecem cache em disco e em memoria:

```typescript
import { Image } from 'expo-image';

// Expo Image — cache em disco por padrao, placeholder com blurhash
<Image
  source={{ uri: 'https://cdn.example.com/product/123.jpg' }}
  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}  // exibido enquanto carrega
  contentFit="cover"
  cachePolicy="disk"   // 'none' | 'memory' | 'disk' | 'memory-disk'
  transition={200}     // duracao do fade-in em ms
  style={{ width: 200, height: 200 }}
/>
```

Para conteudo que muda raramente (imagens de produto, avatares), defina `cachePolicy="disk"` e use uma URL endereçada por conteudo (a propria URL serve como chave de cache). Quando o servidor atualizar a imagem, mude a URL.

### Caching de queries — TanStack Query

Respostas de rede devem ser armazenadas em cache e nunca buscadas novamente enquanto estiverem frescas. O TanStack Query (React Query) gerencia isso com um modelo stale-while-revalidate:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';

function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id),
    staleTime: 5 * 60 * 1000,     // 5 minutos: nao busca novamente se os dados estao frescos
    gcTime: 30 * 60 * 1000,       // 30 minutos: mante no cache mesmo sem subscriber
    refetchOnWindowFocus: false,   // nao busca novamente quando o app vai para primeiro plano
  });
}

// Pre-busca ao passar/se aproximar — dados prontos antes da navegacao
const queryClient = useQueryClient();
function prefetchProduct(id: string) {
  queryClient.prefetchQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id),
    staleTime: 5 * 60 * 1000,
  });
}
```

Com a configuracao correta de `staleTime`, navegar de volta para uma tela ja visitada retorna dados instantaneamente do cache — sem spinner de carregamento.

---

## Materiais de Estudo

### Documentacao Oficial

| Recurso | Descricao |
|---|---|
| [Performance Overview](https://reactnative.dev/docs/performance) | Guia oficial de performance do RN — frame rate JS, frame rate nativo |
| [Hermes guide](https://reactnative.dev/docs/hermes) | Habilitando o Hermes, profiling, config de release |
| [React DevTools Profiler](https://reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html) | Introducao original do Profiler — os conceitos se aplicam diretamente ao RN |
| [FlashList documentation](https://shopify.github.io/flash-list/) | Lista virtualizada da Shopify — guia de migracao e benchmarks de performance |
| [Reanimated worklets](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/#worklet) | Referencia oficial de worklets |

### Aprofundamentos

| Recurso | Autor | O que voce vai aprender |
|---|---|---|
| [React Native Performance — the ultimate guide](https://www.callstack.com/blog/the-ultimate-guide-to-react-native-optimization) | Callstack | Mergulho profundo em 12 secoes: startup, memoria, listas, imagens, animacoes |
| [React Native startup time](https://blog.swmansion.com/react-native-startup-time-how-to-measure-and-how-to-improve-it-e3fd7c00d695) | Software Mansion | Instrumentacao, metodologia de benchmark, analise fase a fase |
| [Hermes GC explained](https://hermesengine.dev/docs/gc/) | Hermes team | GC geracional, layout do heap, parametros de ajuste |
| [Profiling RN apps — Systrace](https://reactnative.dev/docs/profiling) | RN Docs | Configuracao do Systrace, leitura da saida, padroes comuns |
| [Re-renders — a visual guide](https://www.developerway.com/posts/react-re-renders-guide) | Developer Way | Context, memo, useCallback — ilustrado com React |

### Video Tutoriais

| Recurso | Duracao | O que voce vai aprender |
|---|---|---|
| [React Native Performance Workshop](https://www.youtube.com/watch?v=83ffAY-CmL4) | 55 min | Sessao de profiling ao vivo — startup, listas, animacoes |
| [Hermes internals](https://www.youtube.com/watch?v=oSHBQheFm48) | 22 min | Bytecode, GC, ferramentas de profiling |
| [FlashList: 10x better lists](https://www.youtube.com/watch?v=ZkRWHxZuVJw) | 20 min | Time da Shopify explica o pool de reciclagem e benchmarks |
| [Reanimated 3 worklets](https://www.youtube.com/watch?v=I-WZMBsgWJw) | 30 min | Compilacao de worklets, thread de UI, SharedValue |
| [React Conf 2024 — RN performance](https://www.youtube.com/watch?v=Ck0N9FsKAhI) | 30 min | Renderizacao concorrente, Suspense e performance no 0.76 |

### Interativo

| Recurso | O que fazer |
|---|---|
| [Perfetto UI](https://ui.perfetto.dev/) | Carregue um arquivo HTML do Systrace — explore flame charts online |
| [Expo Snack — Reanimated worklet](https://snack.expo.dev/@reanimated/worklet-demo) | Execute uma animacao com worklet e observe 60 fps mesmo com JS bloqueado |
| [Yoga playground](https://yogalayout.dev/playground) | Depure performance de layout — veja quais propriedades flexbox disparam re-layout |
| [TanStack Query DevTools](https://tanstack.com/query/latest/docs/framework/react/devtools) | Inspecione o cache de queries, stale times, re-busca em segundo plano |

---

Proximo → [Bundle & Distribution](./bundle-distribution)
