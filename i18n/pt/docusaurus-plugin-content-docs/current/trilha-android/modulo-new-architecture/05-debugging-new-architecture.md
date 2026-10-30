---
title: "Debugging da New Architecture"
sidebar_label: "Debugging"
sidebar_position: 5
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/na_05_debugging.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/na_05_debugging.vtt" srclang="pt" label="Português" default>
  Seu navegador não suporta o elemento de vídeo.
</video>

## A Stack de Debugging

A New Architecture muda quais ferramentas são relevantes e como elas se conectam. Aqui está o panorama completo:

| Ferramenta | O que mostra | Quando usar |
|------|--------------|-------------|
| **React Native DevTools** | Estado JS, árvore de componentes, rede, console | Desenvolvimento diário |
| **Chrome DevTools (CDP)** | Breakpoints JS, heap snapshots, perfis de CPU | Bugs JS, vazamentos de memória |
| **Flipper** | Rede, Layout Inspector, logs de crash, plugins customizados | Fluxo integrado de desenvolvimento |
| **Android Studio Profiler** | CPU, memória, energia, rede no nível nativo | Problemas de performance nativos |
| **Systrace** | Timeline de frames, atividade de threads, chamadas Binder | Jank de UI, frames perdidos |
| **React DevTools Standalone** | Árvore de componentes, props, state, re-renders | Debugging específico de React |

---

## React Native DevTools (Integrado, RN 0.76+)

O novo debugger oficial, que substitui o antigo Chrome remote debugger. Abre automaticamente ao pressionar `j` no terminal do Metro ou ao agitar o dispositivo e tocar em "Open DevTools".

```bash
npx react-native start
# Pressione 'j' para abrir o React Native DevTools
```

### O que você tem

**Aba Sources** — Source maps de TypeScript funcionam sem configuração extra. Defina breakpoints nos seus arquivos `.tsx`, percorra `async/await`, inspecione a call stack.

**Aba Console** — `console.log`, `console.warn`, `console.error`. Os logs incluem arquivo e número de linha.

**Aba Components** (integração com React DevTools) — inspecione a árvore de componentes React, veja props e state de qualquer componente, edite o state ao vivo.

**Aba Profiler** — grave um trace de renderização, veja quais componentes foram re-renderizados, por que foram re-renderizados e quanto tempo levaram.

```tsx
// Força um componente a se destacar no re-render (somente builds de desenvolvimento)
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  // No React DevTools Profiler: este componente aparecerá como "re-renderizado"
  // cada vez que count mudar — esperado
  // Se re-renderizar quando não deveria, verifique a estabilidade das props com memo()
  return (
    <Pressable onPress={() => setCount(c => c + 1)}>
      <Text>{count}</Text>
    </Pressable>
  );
}
```

---

## Chrome DevTools via CDP

Para perfis de memória e debugging avançado de JS, conecte o Chrome DevTools diretamente ao engine Hermes:

1. Inicie o app em modo debug
2. Abra `chrome://inspect` no Chrome
3. Clique em **Inspect** no seu dispositivo

### Heap Snapshot — Encontrando Vazamentos de Memória

```tsx
// Um padrão comum de vazamento — event listener não removido
function LeakyScreen() {
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onData', handleData);
    // BUG: sem cleanup de retorno — a subscription vaza quando o componente desmonta
  }, []);
}

// Corrigido
function FixedScreen() {
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onData', handleData);
    return () => subscription.remove(); // cleanup ao desmontar
  }, []);
}
```

Para encontrar vazamentos com heap snapshot:
1. Navegue até a tela
2. Tire um snapshot (aba Memory → Take snapshot)
3. Navegue para fora
4. Tire outro snapshot
5. Compare — objetos que permanecem no segundo snapshot mas deveriam ter sido coletados pelo GC são vazamentos

### CPU Profile — Performance do JS

1. Aba Performance → Record
2. Execute a ação que deseja perfilar (rolagem, animação, interação)
3. Pare a gravação
4. Procure tarefas longas (blocos vermelhos com mais de 50ms na thread principal)

---

## Flipper

Flipper é a ferramenta extensível de debugging desktop da Meta. Instale em [https://fbflipper.com/](https://fbflipper.com/).

### Configuração (React Native 0.73+)

O Flipper não é mais incluído por padrão. Adicione manualmente:

```bash
npm install --dev flipper-plugin-react-native-performance
```

Em `android/app/build.gradle`:

```gradle
dependencies {
  debugImplementation("com.facebook.flipper:flipper:${FLIPPER_VERSION}")
  debugImplementation("com.facebook.flipper:flipper-network-plugin:${FLIPPER_VERSION}")
  debugImplementation("com.facebook.flipper:flipper-fresco-plugin:${FLIPPER_VERSION}")
}
```

### Plugin de Rede — Como o Network Inspector do Android Studio

Toda chamada `fetch` e `XMLHttpRequest` aparece na aba Network do Flipper:
- Headers, corpo e tempo da requisição
- Headers, corpo e status da resposta
- Visão de timeline mostrando todas as requisições em paralelo

```tsx
// Todas as requisições são capturadas automaticamente — sem necessidade de alterar código
const response = await fetch('https://api.example.com/users');
// Aparece imediatamente na aba Network do Flipper
```

### Layout Inspector — Como o Layout Inspector do Android Studio

Navegue até **UI Debugger** no Flipper. Clique em qualquer elemento no preview para ver:
- O nome do componente React
- Todas as props
- A hierarquia de views nativas por baixo
- Valores de margin, padding e tamanho do Yoga

### Plugin Hermes Debugger

O Hermes Debugger do Flipper fornece perfil de CPU com um clique:

1. Conecte o dispositivo no Flipper
2. Abra o plugin **Hermes Debugger**
3. Clique em **Enable Profiling**
4. Execute a ação a perfilar
5. Clique em **Disable Profiling**
6. O trace abre automaticamente na aba Performance

---

## Android Studio Profiler — Performance Nativa

Quando o problema está no Kotlin (TurboModule, Fabric Component ou código nativo), use o profiler do Android Studio — o mesmo que você usa para qualquer app Android.

### Anexar a um app React Native em execução

```
Android Studio → View → Tool Windows → Profiler → + → seu dispositivo → processo do seu app
```

### CPU Profiler — Performance do TurboModule

Use o CPU Profiler para ver quanto tempo os métodos do seu TurboModule Kotlin levam:

1. Inicie uma gravação **Sample Java/Kotlin Methods**
2. Acione a chamada do TurboModule a partir do JS
3. Pare a gravação
4. Encontre os métodos do seu módulo no flame chart

```kotlin
// Adicione uma seção de trace para perfil detalhado
override fun getBatteryLevel(promise: Promise) {
    android.os.Trace.beginSection("NativeDeviceInfo.getBatteryLevel")
    try {
        val bm = reactApplicationContext
            .getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        promise.resolve(level.toDouble())
    } finally {
        android.os.Trace.endSection()
    }
}
```

As chamadas `Trace.beginSection/endSection` aparecem como blocos nomeados tanto no Android Studio Profiler quanto no Systrace.

### Memory Profiler — Vazamentos de Fabric Component

Se sua `AbstractComposeView` mantiver referências que sobrevivem à view:

1. Abra o Memory Profiler
2. Navegue até a tela com o Fabric component
3. Force o GC (ícone de lixeira)
4. Navegue para fora
5. Force o GC novamente
6. Heap dump → filtre pelo nome da sua classe

Se sua `RatingBarComposeView` (ou similar) ainda aparecer após navegar para fora e forçar o GC, você tem um vazamento — geralmente um callback ou listener não removido em `onDetachedFromWindow`.

```kotlin
override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    // Limpe referências que poderiam vazar
    onChangeCallback = null
    disposeComposition()  // importante para AbstractComposeView
}
```

---

## Systrace — Timeline de Frames

O Systrace captura uma timeline detalhada de tudo que acontece no dispositivo durante uma janela de captura. É a ferramenta mais poderosa para diagnosticar frames perdidos.

```bash
# Inicia captura (10 segundos)
python3 $ANDROID_HOME/platform-tools/systrace/systrace.py \
  --time=10 \
  -o trace.html \
  sched gfx view react

# Abre no Chrome
open trace.html
```

No trace, procure por:
- **Choreographer#doFrame** — um a cada 16ms (60fps). Uma lacuna significa frame perdido.
- **RenderThread** — se estiver bloqueada, seu layout Fabric está pesado demais.
- **JS** — a thread JavaScript. Seções longas aqui significam que seu JS está bloqueando.
- Seus marcadores `Trace.beginSection` — exatamente onde seu código Kotlin executa.

### Lendo um trace com jank

```
Timeline (1 frame = 16ms a 60fps)
│
├── Frame 1 [16ms] ✓ smooth
├── Frame 2 [16ms] ✓ smooth
├── Frame 3 [48ms] ✗ JANK — 3 frames perdidos
│   ├── Thread JS: 22ms  ← muito longo
│   │   └── [seu FlatList renderItem]
│   └── RenderThread: 26ms
│       └── [sincronização da shadow tree]
└── Frame 4 [16ms] ✓ smooth
```

O pico de 22ms na thread JS é o culpado — `renderItem` está fazendo trabalho demais de forma síncrona. Correção: mova o cálculo para `useMemo`, reduza a complexidade do componente ou use `getItemLayout` para pular a medição.

---

## LogBox — Overlay de Erros Estruturado

O LogBox do React Native mostra erros e avisos de runtime como overlay. Como autor de TurboModule, lance erros com significado:

```kotlin
// Bom — códigos e mensagens de erro descritivos
promise.reject(
    "PERMISSION_DENIED",           // código — exibido no LogBox
    "READ_EXTERNAL_STORAGE permission not granted. " +
    "Request it with PermissionsAndroid before calling readFile().",
    exception
)

// Ruim — opaco
promise.reject("ERROR", "Something went wrong")
```

No lado JS, capture e exiba:

```tsx
async function loadFile(path: string) {
  try {
    return await NativeDeviceInfo.readFile(path);
  } catch (error: any) {
    if (error.code === 'PERMISSION_DENIED') {
      Alert.alert('Permission Required', error.message);
    } else {
      throw error; // relança erros inesperados para o LogBox
    }
  }
}
```

---

## Avisos e a Bridge

Na New Architecture com `RN$Bridgeless = true`, qualquer chamada às antigas APIs de bridge vai gerar aviso ou exception. Fique atento ao LogBox:

```
WARN: NativeModule RCTXxx is not available in the new architecture.
```

Isso significa que uma biblioteca que você depende ainda usa módulos nativos antigos. Soluções:
1. Atualize a biblioteca para uma versão com suporte a New Architecture
2. Consulte [reactnative.directory](https://reactnative.directory/?newArchitecture=true) para alternativas compatíveis com NA
3. Use a camada de interop (habilitada por padrão no RN 0.74+) — módulos antigos rodam em modo de compatibilidade

---

## Checklist de Debugging

Antes de registrar um bug report ou passar horas investigando, percorra esta lista:

```
Camada JS:
  □ console.log no ponto de chamada — a função está sendo chamada?
  □ React DevTools — o componente está re-renderizando quando esperado?
  □ TanStack Query DevTools — a query está rodando, qual é a cache key?

Camada nativa:
  □ Logcat (adb logcat | grep ReactNative) — há exceptions nativas?
  □ Mensagem de Promise.reject — qual código e mensagem de erro retornou?
  □ Android Studio Profiler — o método Kotlin está completando rapidamente?

Bridge/interop:
  □ global.RN$Bridgeless — a New Architecture está realmente habilitada?
  □ LogBox — há avisos de "not available in new architecture"?
  □ Flipper Network — a chamada de API está saindo? Qual é a resposta?
```

---

## Materiais de Estudo

### Documentação Oficial

- [React Native — Debugging](https://reactnative.dev/docs/debugging)
- [React Native — React Native DevTools](https://reactnative.dev/docs/react-native-devtools)
- [Android — System Tracing](https://developer.android.com/topic/performance/tracing)
- [Android — Android Studio Profiler](https://developer.android.com/studio/profile)

### Ferramentas

- [Flipper](https://fbflipper.com/)
- [React DevTools](https://github.com/facebook/react/tree/main/packages/react-devtools)
- [Reactotron](https://github.com/infinitered/reactotron) — alternativa ao Flipper

### Vídeos

- [React Native EU — Debugging React Native in 2024](https://www.youtube.com/watch?v=Sy8a7oNfnkE)
- [Android Developers — Android Studio Profiler](https://www.youtube.com/watch?v=O5V9ZSL0BsM)

---

## Resumo do Módulo

Você concluiu o módulo de New Architecture. Aqui está o mapa completo:

| Tópico | O que você construiu / aprendeu |
|-------|--------------------------|
| Hermes | Pré-compilação de bytecode, modelo de memória, perfil |
| JSI | Substituição da bridge C++, chamadas síncronas, memória compartilhada |
| TurboModule | Spec TypeScript → Codegen → implementação Kotlin |
| Fabric + Compose | View Jetpack Compose exposta via Fabric ViewManager |
| Debugging | React Native DevTools, Flipper, Systrace, Android Studio |

O próximo módulo cobre recursos nativos do dispositivo: Camera (CameraX), Permissions, Storage, Sensores — tudo pela perspectiva de um desenvolvedor Android.
