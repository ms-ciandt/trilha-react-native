---
title: "Debugging da New Architecture"
sidebar_label: "Debugging"
sidebar_position: 5
---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_android/na_05_debugging.mp4" type="video/mp4">
  Seu navegador não suporta o elemento de vídeo.
</video>

## A Stack de Debugging

A New Architecture muda quais ferramentas sao relevantes e como elas se conectam. Aqui esta o panorama completo:

| Ferramenta | O que mostra | Quando usar |
|------|--------------|-------------|
| **React Native DevTools** | Estado JS, arvore de componentes, rede, console | Desenvolvimento diario |
| **Chrome DevTools (CDP)** | Breakpoints JS, heap snapshots, perfis de CPU | Bugs JS, vazamentos de memoria |
| **Flipper** | Rede, Layout Inspector, logs de crash, plugins customizados | Fluxo integrado de desenvolvimento |
| **Android Studio Profiler** | CPU, memoria, energia, rede no nivel nativo | Problemas de performance nativos |
| **Systrace** | Timeline de frames, atividade de threads, chamadas Binder | Jank de UI, frames perdidos |
| **React DevTools Standalone** | Arvore de componentes, props, state, re-renders | Debugging especifico de React |

---

## React Native DevTools (Integrado, RN 0.76+)

O novo debugger oficial, que substitui o antigo Chrome remote debugger. Abre automaticamente ao pressionar `j` no terminal do Metro ou ao agitar o dispositivo e tocar em "Open DevTools".

```bash
npx react-native start
# Pressione 'j' para abrir o React Native DevTools
```

### O que voce tem

**Aba Sources** — Source maps de TypeScript funcionam sem configuracao extra. Defina breakpoints nos seus arquivos `.tsx`, percorra `async/await`, inspecione a call stack.

**Aba Console** — `console.log`, `console.warn`, `console.error`. Os logs incluem arquivo e numero de linha.

**Aba Components** (integracao com React DevTools) — inspecione a arvore de componentes React, veja props e state de qualquer componente, edite o state ao vivo.

**Aba Profiler** — grave um trace de renderizacao, veja quais componentes foram re-renderizados, por que foram re-renderizados e quanto tempo levaram.

```tsx
// Forca um componente a se destacar no re-render (somente builds de desenvolvimento)
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  // No React DevTools Profiler: este componente aparecera como "re-renderizado"
  // cada vez que count mudar — esperado
  // Se re-renderizar quando nao deveria, verifique a estabilidade das props com memo()
  return (
    <Pressable onPress={() => setCount(c => c + 1)}>
      <Text>{count}</Text>
    </Pressable>
  );
}
```

---

## Chrome DevTools via CDP

Para perfis de memoria e debugging avancado de JS, conecte o Chrome DevTools diretamente ao engine Hermes:

1. Inicie o app em modo debug
2. Abra `chrome://inspect` no Chrome
3. Clique em **Inspect** no seu dispositivo

### Heap Snapshot — Encontrando Vazamentos de Memoria

```tsx
// Um padrao comum de vazamento — event listener nao removido
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
1. Navegue ate a tela
2. Tire um snapshot (aba Memory → Take snapshot)
3. Navegue para fora
4. Tire outro snapshot
5. Compare — objetos que permanecem no segundo snapshot mas deveriam ter sido coletados pelo GC sao vazamentos

### CPU Profile — Performance do JS

1. Aba Performance → Record
2. Execute a acao que deseja perfilar (rolagem, animacao, interacao)
3. Pare a gravacao
4. Procure tarefas longas (blocos vermelhos com mais de 50ms na thread principal)

---

## Flipper

Flipper e a ferramenta extensivel de debugging desktop da Meta. Instale em [https://fbflipper.com/](https://fbflipper.com/).

### Configuracao (React Native 0.73+)

O Flipper nao e mais incluido por padrao. Adicione manualmente:

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
- Headers, corpo e tempo da requisicao
- Headers, corpo e status da resposta
- Visao de timeline mostrando todas as requisicoes em paralelo

```tsx
// Todas as requisicoes sao capturadas automaticamente — sem necessidade de alterar codigo
const response = await fetch('https://api.example.com/users');
// Aparece imediatamente na aba Network do Flipper
```

### Layout Inspector — Como o Layout Inspector do Android Studio

Navegue ate **UI Debugger** no Flipper. Clique em qualquer elemento no preview para ver:
- O nome do componente React
- Todas as props
- A hierarquia de views nativas por baixo
- Valores de margin, padding e tamanho do Yoga

### Plugin Hermes Debugger

O Hermes Debugger do Flipper fornece perfil de CPU com um clique:

1. Conecte o dispositivo no Flipper
2. Abra o plugin **Hermes Debugger**
3. Clique em **Enable Profiling**
4. Execute a acao a perfilar
5. Clique em **Disable Profiling**
6. O trace abre automaticamente na aba Performance

---

## Android Studio Profiler — Performance Nativa

Quando o problema esta no Kotlin (TurboModule, Fabric Component ou codigo nativo), use o profiler do Android Studio — o mesmo que voce usa para qualquer app Android.

### Anexar a um app React Native em execucao

```
Android Studio → View → Tool Windows → Profiler → + → seu dispositivo → processo do seu app
```

### CPU Profiler — Performance do TurboModule

Use o CPU Profiler para ver quanto tempo os metodos do seu TurboModule Kotlin levam:

1. Inicie uma gravacao **Sample Java/Kotlin Methods**
2. Acione a chamada do TurboModule a partir do JS
3. Pare a gravacao
4. Encontre os metodos do seu modulo no flame chart

```kotlin
// Adicione uma secao de trace para perfil detalhado
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

Se sua `AbstractComposeView` mantiver referencias que sobrevivem a view:

1. Abra o Memory Profiler
2. Navegue ate a tela com o Fabric component
3. Force o GC (icone de lixeira)
4. Navegue para fora
5. Force o GC novamente
6. Heap dump → filtre pelo nome da sua classe

Se sua `RatingBarComposeView` (ou similar) ainda aparecer apos navegar para fora e forcar o GC, voce tem um vazamento — geralmente um callback ou listener nao removido em `onDetachedFromWindow`.

```kotlin
override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    // Limpe referencias que poderiam vazar
    onChangeCallback = null
    disposeComposition()  // importante para AbstractComposeView
}
```

---

## Systrace — Timeline de Frames

O Systrace captura uma timeline detalhada de tudo que acontece no dispositivo durante uma janela de captura. E a ferramenta mais poderosa para diagnosticar frames perdidos.

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
- **RenderThread** — se estiver bloqueada, seu layout Fabric esta pesado demais.
- **JS** — a thread JavaScript. Secoes longas aqui significam que seu JS esta bloqueando.
- Seus marcadores `Trace.beginSection` — exatamente onde seu codigo Kotlin executa.

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
│       └── [sincronizacao da shadow tree]
└── Frame 4 [16ms] ✓ smooth
```

O pico de 22ms na thread JS e o culpado — `renderItem` esta fazendo trabalho demais de forma sincrona. Correcao: mova o calculo para `useMemo`, reduza a complexidade do componente ou use `getItemLayout` para pular a medicao.

---

## LogBox — Overlay de Erros Estruturado

O LogBox do React Native mostra erros e avisos de runtime como overlay. Como autor de TurboModule, lance erros com significado:

```kotlin
// Bom — codigos e mensagens de erro descritivos
promise.reject(
    "PERMISSION_DENIED",           // codigo — exibido no LogBox
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
      throw error; // relanca erros inesperados para o LogBox
    }
  }
}
```

---

## Avisos e a Bridge

Na New Architecture com `RN$Bridgeless = true`, qualquer chamada as antigas APIs de bridge vai gerar aviso ou exception. Fique atento ao LogBox:

```
WARN: NativeModule RCTXxx is not available in the new architecture.
```

Isso significa que uma biblioteca que voce depende ainda usa modulos nativos antigos. Solucoes:
1. Atualize a biblioteca para uma versao com suporte a New Architecture
2. Consulte [reactnative.directory](https://reactnative.directory/?newArchitecture=true) para alternativas compatveis com NA
3. Use a camada de interop (habilitada por padrao no RN 0.74+) — modulos antigos rodam em modo de compatibilidade

---

## Checklist de Debugging

Antes de registrar um bug report ou passar horas investigando, percorra esta lista:

```
Camada JS:
  □ console.log no ponto de chamada — a funcao esta sendo chamada?
  □ React DevTools — o componente esta re-renderizando quando esperado?
  □ TanStack Query DevTools — a query esta rodando, qual e a cache key?

Camada nativa:
  □ Logcat (adb logcat | grep ReactNative) — ha exceptions nativas?
  □ Mensagem de Promise.reject — qual codigo e mensagem de erro retornou?
  □ Android Studio Profiler — o metodo Kotlin esta completando rapidamente?

Bridge/interop:
  □ global.RN$Bridgeless — a New Architecture esta realmente habilitada?
  □ LogBox — ha avisos de "not available in new architecture"?
  □ Flipper Network — a chamada de API esta saindo? Qual e a resposta?
```

---

## Materiais de Estudo

### Documentacao Oficial

- [React Native — Debugging](https://reactnative.dev/docs/debugging)
- [React Native — React Native DevTools](https://reactnative.dev/docs/react-native-devtools)
- [Android — System Tracing](https://developer.android.com/topic/performance/tracing)
- [Android — Android Studio Profiler](https://developer.android.com/studio/profile)

### Ferramentas

- [Flipper](https://fbflipper.com/)
- [React DevTools](https://github.com/facebook/react/tree/main/packages/react-devtools)
- [Reactotron](https://github.com/infinitered/reactotron) — alternativa ao Flipper

### Videos

- [React Native EU — Debugging React Native in 2024](https://www.youtube.com/watch?v=Sy8a7oNfnkE)
- [Android Developers — Android Studio Profiler](https://www.youtube.com/watch?v=O5V9ZSL0BsM)

---

## Resumo do Modulo

Voce concluiu o modulo de New Architecture. Aqui esta o mapa completo:

| Topico | O que voce construiu / aprendeu |
|-------|--------------------------|
| Hermes | Pre-compilacao de bytecode, modelo de memoria, perfil |
| JSI | Substituicao da bridge C++, chamadas sincronas, memoria compartilhada |
| TurboModule | Spec TypeScript → Codegen → implementacao Kotlin |
| Fabric + Compose | View Jetpack Compose exposta via Fabric ViewManager |
| Debugging | React Native DevTools, Flipper, Systrace, Android Studio |

O proximo modulo cobre recursos nativos do dispositivo: Camera (CameraX), Permissions, Storage, Sensores — tudo pela perspectiva de um desenvolvedor Android.
