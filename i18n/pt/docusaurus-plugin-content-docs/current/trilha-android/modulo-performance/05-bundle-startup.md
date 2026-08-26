---
title: "Bundle Size & Startup Performance"
sidebar_label: "Bundle & Startup"
sidebar_position: 5
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/perf_05_bundle.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/perf_05_bundle.vtt" srclang="pt" label="Português" default>
  Seu navegador nao suporta o elemento de video.
</video>

## Cold Start no Android: Onde o Tempo é Gasto

Você já conhece o cold start do Android: o ART carrega o DEX, `Application.onCreate()` é executado, a `Activity` principal infla o layout e o primeiro frame aparece. O React Native adiciona uma camada JS em cima dessa sequência.

```
Android cold start (seu app Kotlin):
  ART carrega DEX → Application.onCreate() → Activity.onCreate() → Primeiro frame
  ~200ms                ~50ms               ~100ms              = ~350ms total

React Native cold start (New Architecture + Hermes):
  ART carrega DEX → RN inicializa → Hermes carrega bytecode → JS executa → Primeiro frame
  ~200ms          ~150ms           ~50ms (pré-compilado!)   ~100ms       = ~500ms total
```

A etapa de bytecode do Hermes é rápida porque foi pré-compilada no momento do build (abordada no tópico sobre Hermes). As principais alavancas para melhorar o startup são:

1. **Reduzir o tamanho do bundle** — menos código para carregar no Hermes
2. **Lazy loading de módulos** — adiar código não crítico
3. **Otimizar `Application.onCreate()`** — o lado nativo ainda está sob seu controle
4. **Inline requires** — carregar módulos sob demanda, não no startup

---

## Medindo o Tamanho do Bundle

```bash
# Gera o bundle JS e mede seu tamanho
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/bundle.js \
  --assets-dest /tmp/assets

# Verificar tamanho descomprimido
wc -c /tmp/bundle.js
# Comprimido (o que o dispositivo realmente faz download)
gzip -k /tmp/bundle.js && wc -c /tmp/bundle.js.gz
```

Um bundle típico de app React Native:
- **Bom**: < 1MB descomprimido
- **Aceitável**: 1–3MB
- **Precisa de atenção**: > 3MB

---

## Analisador de Bundle: O Que Está Ocupando Espaço

```bash
npm install --dev react-native-bundle-visualizer
npx react-native-bundle-visualizer
```

Isso abre um treemap mostrando cada módulo do bundle por tamanho — o equivalente ao APK Analyser do Android Studio para a camada JS.

Culpados comuns:
- `moment.js` (240KB) → substituir por `date-fns` ou `dayjs` (10–20KB)
- `lodash` (biblioteca completa) → importar funções específicas: `import debounce from 'lodash/debounce'`
- Conjuntos de ícones grandes → usar `react-native-vector-icons` com apenas a família de ícones necessária
- Dependências duplicadas (duas versões da mesma biblioteca)

---

## Inline Requires — Carregamento Lazy de Módulos

Por padrão, todo `import` no topo de um arquivo é carregado quando o app inicia. Os **inline requires** movem a chamada de `require()` para o primeiro momento em que o módulo é efetivamente utilizado.

Habilite no `metro.config.js`:

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.inlineRequires = true;

module.exports = config;
```

Com inline requires, isto:

```tsx
// Carregado no startup — mesmo que esta tela nunca seja visitada
import HeavyChartLibrary from 'heavy-chart-library';
```

Torna-se efetivamente:

```tsx
// Carregado apenas quando este trecho de código for executado
function ChartsScreen() {
  const HeavyChartLibrary = require('heavy-chart-library');
  // ...
}
```

O Metro faz a transformação automaticamente — você continua escrevendo `import` no topo, e o Metro reescreve.

---

## React.lazy — Carregamento Dinâmico de Telas

Para telas raramente visitadas (configurações, onboarding, painéis administrativos), carregue-as de forma lazy:

```tsx
import React, { Suspense, lazy } from 'react';
import { ActivityIndicator } from 'react-native';

// NÃO carregado até que esta tela seja acessada pela primeira vez
const AdminPanel = lazy(() => import('./screens/AdminPanel'));
const OnboardingFlow = lazy(() => import('./screens/OnboardingFlow'));

function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Admin"
        component={() => (
          <Suspense fallback={<ActivityIndicator />}>
            <AdminPanel />
          </Suspense>
        )}
      />
    </Stack.Navigator>
  );
}
```

---

## Medindo o Startup: TTI (Time to Interactive)

### Usando Performance.now()

```tsx
// index.js — ponto de entrada
const appStart = global.performance.now();

// App.tsx — primeiro render significativo
function App() {
  useEffect(() => {
    const tti = global.performance.now() - appStart;
    console.log(`TTI: ${tti.toFixed(0)}ms`);
    // Enviar para analytics: analytics.track('app_startup', { tti })
  }, []);

  return <Navigator />;
}
```

### Usando Flipper — plugin de startup

O plugin **React Native Performance** do Flipper mostra um waterfall de eventos de startup:

- `nativeModulesSetupStart` / `End` — inicialização dos módulos nativos
- `bundleLoad` — Hermes carregando o bytecode
- `jsExecutionStart` / `End` — JavaScript em execução
- `contentAppeared` — primeiro frame significativo

---

## Reduzindo o Startup Nativo: Application.onCreate()

A camada JS do React Native não pode iniciar até que o lado nativo esteja pronto. Otimize o `MainApplication.kt`:

```kotlin
class MainApplication : Application(), ReactApplication {

  override fun onCreate() {
    super.onCreate()

    // Não faça trabalho pesado aqui — bloqueia o primeiro frame
    // RUIM: chamada de rede síncrona, migração pesada de DB, leitura de arquivo grande

    // BOM: adiar inicializações não críticas
    CoroutineScope(Dispatchers.IO).launch {
      analyticsLibrary.init(applicationContext)  // pode ser assíncrono
      crashReporter.init(applicationContext)
    }

    // Isso deve ser síncrono — o React Native precisa disso
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load()
    }
  }
}
```

---

## RAM Bundles — Carregamento de Bundle Pré-dividido

Para apps muito grandes (bundle > 5MB), os RAM Bundles dividem o bundle em módulos carregados sob demanda:

No `metro.config.js`:

```js
config.serializer.processModuleFilter = (module) => true;
```

No `android/app/build.gradle`:

```gradle
project.ext.react = [
    bundleInRelease: true,
    extraPackagerArgs: ["--indexed-ram-bundle"]
]
```

Os RAM Bundles carregam cada arquivo de módulo individualmente do sistema de arquivos — o app inicia mais rápido porque apenas o ponto de entrada e as dependências diretas são carregados no lançamento. Raramente necessário a menos que seu bundle ultrapasse 5MB.

---

## Otimização de Imagens

As imagens frequentemente são maiores que o bundle JS. Algumas regras:

```tsx
import { Image } from 'expo-image'; // use expo-image, não o Image nativo

// RUIM: carregando uma imagem de 2000x2000px em uma view de 100x100
<Image source={{ uri: 'https://cdn.example.com/original.jpg' }} style={{ width: 100, height: 100 }} />

// BOM: solicitar o tamanho certo ao servidor (se seu CDN suportar)
<Image
  source={{ uri: 'https://cdn.example.com/image.jpg?w=200&h=200' }}
  style={{ width: 100, height: 100 }}
  contentFit="cover"
  cachePolicy="memory-disk"  // expo-image: cache agressivo
/>
```

Para assets locais, use variantes `@2x` e `@3x`:

```
assets/
  logo.png       ← 1x (48x48px)
  logo@2x.png    ← 2x (96x96px)
  logo@3x.png    ← 3x (144x144px)
```

O Metro escolhe a resolução correta automaticamente com base em `PixelRatio.get()`.

---

## O Checklist de Performance

Antes de publicar um build de release, verifique estes itens:

```
Bundle:
  □ Analisador de bundle executado — nenhuma dependência grande inesperada
  □ inline requires habilitado no metro.config.js
  □ Hermes habilitado (padrão no RN 0.70+)
  □ dev: false no build de release

Listas:
  □ Todos os FlatLists possuem keyExtractor com IDs estáveis
  □ Componentes de linha envolvidos em memo()
  □ renderItem envolvido em useCallback
  □ getItemLayout definido para linhas de altura fixa (ou FlashList utilizado)

Re-renders:
  □ Profiler do React DevTools executado — nenhum re-render inesperado
  □ Computações custosas envolvidas em useMemo
  □ Callbacks para filhos de memo() envolvidos em useCallback

Startup:
  □ Application.onCreate() — sem trabalho bloqueante
  □ Telas raramente visitadas com lazy-load usando React.lazy
  □ Imagens dimensionadas ao tamanho de exibição (sem imagens grandes em views pequenas)

Animações:
  □ Todas as animações usam Reanimated (não Animated com useNativeDriver)
  □ Sem trabalho JS pesado durante animações ativas
```

---

## Materiais de Estudo

### Documentação Oficial

- [React Native — Performance Overview](https://reactnative.dev/docs/performance)
- [React Native — Profiling](https://reactnative.dev/docs/profiling)
- [Metro — Bundle Optimisation](https://metrobundler.dev/docs/configuration)
- [expo-image — Documentation](https://docs.expo.dev/versions/latest/sdk/image/)

### Ferramentas

- [react-native-bundle-visualizer](https://github.com/IjzerenHein/react-native-bundle-visualizer)
- [Flashlight](https://flashlight.dev/) — ferramenta de medição de performance mobile

### Videos

- [React Native EU — React Native Performance in 2024](https://www.youtube.com/watch?v=gvkqT_Uoahw)
- [Callstack — Optimising React Native](https://www.youtube.com/watch?v=5mBGpWNSMrM)

---

## Resumo do Módulo

Você concluiu o módulo de Performance. Aqui está o mapa completo:

| Tópico | O que foi abordado |
|-------|-----------------|
| Modelo de Threads | Thread JS vs thread UI, InteractionManager, startTransition |
| FlatList | keyExtractor, getItemLayout, windowSize, FlashList |
| Reanimated | useSharedValue, useAnimatedStyle, gestos na thread UI |
| Otimização de Re-renders | memo, useMemo, useCallback, Profiler do DevTools |
| Bundle & Startup | Analisador de bundle, inline requires, React.lazy, medição de TTI |

O próximo módulo aborda testes — Jest, React Native Testing Library e Detox, mapeados a partir de JUnit, Espresso e padrões de teste em Kotlin.
