---
title: "JSI — Padroes Avancados"
---

## 5. Chamadas Sincronas e Assincronas

O JSI permite ambas. A escolha e sua; o JSI nao impos assincronicidade.

### Sincrono (mesma thread)

```cpp
// C++ — host function sincrona
auto syncHash = Function::createFromHostFunction(
    rt,
    PropNameID::forAscii(rt, "hashSync"),
    1,
    [](Runtime& rt, const Value&, const Value* args, size_t) -> Value {
      if (!args[0].isString()) throw JSError(rt, "hashSync requires string");
      std::string input = args[0].getString(rt).utf8(rt);
      uint32_t hash = fnv1a_hash(input);  // CPU-bound, executa na thread JS
      return Value(static_cast<double>(hash));
    }
);
rt.global().setProperty(rt, "hashSync", std::move(syncHash));
```

```typescript
// JS — bloqueia a thread JS ate o C++ retornar
const hash: number = (global as any).hashSync("hello world");
```

Quando o sincrono e apropriado: ler um valor pequeno em cache, realizar um calculo barato, acessar memoria compartilhada que o C++ ja mantem. **Nunca chame I/O bloqueante de forma sincrona na thread JS.**

### Assincrono (via Promise)

Quando o trabalho e I/O-bound ou precisa rodar em uma thread diferente, voce retorna uma `Promise` construindo-a a partir do construtor global `Promise` do JS.

```cpp
// C++ — constroi uma Promise JS, resolve em thread de background
Value asyncFetch(Runtime& rt, const Value& thisVal, const Value* args, size_t count) {
  std::string url = args[0].getString(rt).utf8(rt);
  
  // Obtem o construtor Promise do JS
  auto promiseCtor = rt.global()
      .getPropertyAsFunction(rt, "Promise");
  
  // Captura as funcoes resolve/reject que o executor nos fornece
  std::shared_ptr<Function> resolve, reject;
  
  auto executor = Function::createFromHostFunction(
      rt,
      PropNameID::forAscii(rt, "executor"),
      2,
      [&resolve, &reject](Runtime& rt, const Value&, const Value* args, size_t) -> Value {
        resolve = std::make_shared<Function>(args[0].getObject(rt).asFunction(rt));
        reject  = std::make_shared<Function>(args[1].getObject(rt).asFunction(rt));
        return Value::undefined();
      }
  );
  
  // Constroi a Promise de fato — chama o executor imediatamente
  Value promise = promiseCtor.callAsConstructor(rt, executor);
  
  // Agenda trabalho em background
  threadPool_.submit([url, resolve, reject, &rt]() {
    auto result = http::get(url);   // I/O bloqueante em thread de background
    
    // Precisa retornar para a thread JS (o runtime nao e thread-safe)
    jsCallInvoker_->invokeAsync([resolve, result, &rt]() {
      resolve->call(rt, String::createFromUtf8(rt, result.body));
    });
  });
  
  return promise;
}
```

A regra critica: **o `Runtime` nao e thread-safe**. Todas as operacoes com `jsi::Value` devem acontecer na thread que possui o runtime (a thread JS). `jsCallInvoker_->invokeAsync` e o hook que agenda trabalho de volta para a thread JS.

---

## 6. Interoperabilidade com Hermes

Hermes e o engine JS padrao do React Native desde a versao 0.64 e o unico engine com suporte oficial para a New Architecture (embora o JSC ainda funcione via interface JSI).

### Por que Hermes?

| Propriedade | Hermes | JavaScriptCore |
|---|---|---|
| Compilacao | Bytecode ahead-of-time | JIT em tempo de execucao |
| Tempo de inicializacao | Mais rapido (bytecode ja compilado) | Mais lento (parse + warmup do JIT) |
| Uso de RAM | Menor (sem compilador JIT residente) | Maior |
| Protocolo de depuracao | CDP (Chrome DevTools Protocol) | CDP |
| Tamanho do engine | Binario menor | Binario maior |
| Implementacao JSI | `HermesRuntime` | `JSCRuntime` |

### Bytecode Hermes

O Hermes compila `.js` para `.hbc` (Hermes Bytecode) em tempo de build via CLI `hermes`:

```bash
# Durante o bundle do Metro — Hermes compila automaticamente quando hermesEnabled = true
# O bundle resultante ja e bytecode, nao JS textual

# Inspecionar bytecode manualmente:
./hermes -dump-bytecode output.hbc
```

O formato `.hbc` e um conjunto de instrucoes de VM baseado em registradores e compacto. Por ser pre-compilado:
- Nenhum parser executa na inicializacao do app
- Nenhuma AST e construida
- Sem warmup de JIT — a execucao comeca a partir do bytecode imediatamente

E por isso que o Hermes economiza 200–800ms nos tempos de cold-start em dispositivos reais (o numero exato depende muito do tamanho do bundle e da velocidade da CPU do dispositivo).

### HermesRuntime e JSI

`HermesRuntime` e a implementacao Hermes de `jsi::Runtime`:

```cpp
// hermes/API/hermes/hermes.h
namespace facebook::hermes {
  std::unique_ptr<jsi::Runtime> makeHermesRuntime(
      const vm::RuntimeConfig& runtimeConfig = vm::RuntimeConfig()
  );
}
```

No React Native, `RCTHermesInstance` encapsula isso:

```objc
// iOS — RCTHermesInstance.mm
- (std::unique_ptr<facebook::jsi::Runtime>)createJSRuntimeWithConfig:
    (const facebook::react::RuntimeConfig&)config {
  return facebook::hermes::makeHermesRuntime(/* config */);
}
```

```kotlin
// Android — HermesExecutor.cpp
std::unique_ptr<JSRuntime> HermesExecutorFactory::createJSRuntime(...) {
  auto runtime = facebook::hermes::makeHermesRuntime(config);
  return std::make_unique<HermesExecutor>(std::move(runtime), ...);
}
```

### Padrao Decorator do JSI no Hermes

O Hermes fornece `DecoratedRuntime` — um wrapper que permite adicionar instrumentacao, profiling por amostragem ou extensoes de BigInt/Intl sem modificar o engine central:

```cpp
// Runtime de profiling do Hermes (usado pelo Flipper)
auto hermesRuntime = makeHermesRuntime(config);
auto profiledRuntime = std::make_unique<HermesDecoratedRuntime>(
    std::move(hermesRuntime),
    ProfilerDecorator{}  // intercepta createFunctionFromHostFunction, call, etc.
);
```

E assim que o profiler por amostragem do Hermes funciona — ele encapsula o runtime e intercepta `call` para registrar timestamps.

### BigInt e Hermes

Hermes 0.12+ (incluido no RN 0.71+) suporta `BigInt`. Da perspectiva do JSI, `jsi::BigInt` e um tipo separado:

```cpp
// Verificando BigInt a partir do C++
if (value.isBigInt()) {
  int64_t n = value.getBigInt(rt).truncate(rt);  // com perda — use apenas se souber que cabe
  // ou converta para string para transferencia segura
  std::string str = value.getBigInt(rt).toString(rt).utf8(rt);
}
```

---

## 7. Host Functions: Padroes do Mundo Real

### Padrao 1: API de Medicao (sincrona, sem alocacao)

Este e o padrao que o Fabric usa internamente para `measure()` e consultas de layout.

```cpp
// Medicao de layout sincrona via JSI
auto measureHost = Function::createFromHostFunction(
    rt,
    PropNameID::forAscii(rt, "measure"),
    1,  // recebe uma tag de no
    [uiManager](Runtime& rt, const Value&, const Value* args, size_t count) -> Value {
      int tag = static_cast<int>(args[0].getNumber());
      
      // UIManager e thread-safe para leituras
      LayoutMetrics metrics = uiManager->getLayoutMetrics(tag);
      
      // Retorna um objeto JS simples — sem JSON, sem serializacao
      auto result = Object(rt);
      result.setProperty(rt, "x",      Value(metrics.frame.origin.x));
      result.setProperty(rt, "y",      Value(metrics.frame.origin.y));
      result.setProperty(rt, "width",  Value(metrics.frame.size.width));
      result.setProperty(rt, "height", Value(metrics.frame.size.height));
      result.setProperty(rt, "pageX",  Value(metrics.pageOrigin.x));
      result.setProperty(rt, "pageY",  Value(metrics.pageOrigin.y));
      return result;
    }
);
```

Na bridge antiga, `measure()` era assincrono por causa da fila. Com JSI, e sincrono — sem necessidade de `useEffect` + callback.

### Padrao 2: ArrayBuffer Compartilhado (dados binarios sem copia)

Quando voce precisa passar dados binarios (pixels de imagem, amostras de audio) entre C++ e JS sem copiar, use `ArrayBuffer`:

```cpp
// C++ — expoe um buffer nativo diretamente para o JS
auto getFrameBuffer = Function::createFromHostFunction(
    rt,
    PropNameID::forAscii(rt, "getFrameBuffer"),
    0,
    [&cameraDriver](Runtime& rt, const Value&, const Value* args, size_t) -> Value {
      // Obtem ponteiro para o frame buffer nativo (ja em memoria)
      uint8_t* pixels = cameraDriver.lockCurrentFrame();
      size_t byteSize = cameraDriver.frameByteSize();
      
      // MutableBuffer e um tipo JSI que encapsula um ponteiro nativo
      // A lambda e o destrutor — chamado pelo GC quando o JS libera o buffer
      auto buffer = std::make_shared<jsi::MutableBuffer>(
          pixels,
          byteSize,
          [&cameraDriver](uint8_t*) {
            cameraDriver.unlockCurrentFrame();
          }
      );
      
      return ArrayBuffer(rt, std::move(buffer));
    }
);
```

```typescript
// JS — acesso zero-copy aos dados nativos do frame
const buffer: ArrayBuffer = (global as any).getFrameBuffer();
const pixels = new Uint8ClampedArray(buffer);
// pixels[0..3] e o RGBA do primeiro pixel — nenhuma copia foi feita
```

---

## 8. Depuracao com JSI

### Identificando erros JSI

Erros JSI surgem como `JSIException` em C++ e aparecem no error boundary do JS como objetos `Error` padrao. O stack trace apontara para o `HostFunction` ou `HostObject.get` que lancou a excecao.

```cpp
// Lancando um erro tipado a partir do C++
throw JSError(rt, "NativeSensor: device not calibrated");

// Isso se torna no JS:
// Error: NativeSensor: device not calibrated
//   at NativeSensor.lastReading (<anonymous>)
//   at MyComponent (MyComponent.tsx:24)
```

### Chrome DevTools + Hermes

Com RN 0.73+, o Hermes e depurado via CDP (Chrome DevTools Protocol) diretamente — sem necessidade do Flipper:

1. Na saida do Metro voce vera: `Inspector proxy: ws://localhost:8081/inspector`
2. Abra `chrome://inspect` no Chrome
3. Clique em "Inspect" no dispositivo listado

Voce pode definir breakpoints dentro dos callbacks de `Function.createFromHostFunction` se fizer um build de debug com source maps. Em builds de release, use `console.log` direcionado para o log nativo:

```cpp
// Logar do C++ para o console do Hermes
rt.global()
    .getPropertyAsObject(rt, "console")
    .getPropertyAsFunction(rt, "log")
    .call(rt, String::createFromUtf8(rt, "[Native] sensor initialized"));
```

### Perfilando overhead do JSI com Perfetto

No Android, chamadas JSI aparecem nos traces do Perfetto sob a categoria de trace `JSI`. Para habilitar:

```bash
adb shell am start -n com.yourapp/.MainActivity \
  --ez "react_native_jsi_tracing" true
```

Cada chamada de `HostFunction` aparece como uma fatia `JSI::HostFunction::<nome>`. Se voce ver fatias inesperadamente longas, a host function esta fazendo trabalho demais de forma sincrona na thread JS.

---

## Materiais de Estudo

### Codigo-Fonte Oficial

| Recurso | O que voce vai encontrar |
|---|---|
| [`jsi/jsi.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi.h) | Definicoes completas dos tipos JSI — Runtime, Value, HostObject, HostFunction |
| [`jsi/jsi-inl.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi-inl.h) | Implementacoes inline dos construtores de Value |
| [`ReactCommon/callinvoker`](https://github.com/facebook/react-native/tree/main/packages/react-native/ReactCommon/callinvoker) | `CallInvoker` — a forma correta de agendar trabalho C++ de volta para a thread JS |
| [`hermes/API/hermes/hermes.h`](https://github.com/facebook/hermes/blob/main/API/hermes/hermes.h) | API publica do `HermesRuntime` |

### Documentacao Oficial

| Recurso | Descricao |
|---|---|
| [JSI Reference](https://reactnative.dev/docs/the-new-architecture/landing-page) | Pagina inicial da New Architecture com contexto sobre JSI |
| [TurboModules com JSI](https://reactnative.dev/docs/turbo-native-modules-introduction) | Como o Codegen gera bindings JSI a partir de specs TypeScript |
| [Documentacao do Hermes](https://hermesengine.dev/) | Site oficial do Hermes: formato de bytecode, depuracao, configuracao |

### Aprofundamentos

| Recurso | Autor | O que voce vai aprender |
|---|---|---|
| [JSI: A new infrastructure for React Native](https://formidable.com/blog/2019/jsi-jsc-part-2/) | Formidable | Analise original dos objetivos de design do JSI vs bridge antiga |
| [Deep dive into React Native's New Architecture](https://medium.com/engineering-housing/deep-dive-into-react-natives-new-architecture-fb67ae615ccd) | Housing.com Eng | Arquitetura end-to-end: JSI → Fabric → TurboModules |
| [Writing a JSI module from scratch](https://ospfranco.com/post/2021/02/24/how-to-create-a-jsi-module/) | Oscar Franco | Guia completo: HostObject C++, CMakeLists, wiring iOS e Android |
| [react-native-mmkv internals](https://github.com/mrousavy/react-native-mmkv/blob/main/ios/MmkvHostObject.cpp) | Marc Rousavy | Implementacao de HostObject em producao — leia o codigo-fonte real |
| [op-sqlite JSI source](https://github.com/OP-Engineering/op-sqlite/tree/main/cpp) | Oscar Franco | SQLite sincrono via JSI — dados binarios e tratamento de threads no mundo real |

### Tutoriais em Video

| Recurso | Duracao | O que voce vai aprender |
|---|---|---|
| [JSI in React Native — Explained](https://www.youtube.com/watch?v=wKwJ9VBovDc) | 18 min | Guia visual do JSI substituindo a bridge |
| [How Hermes Works](https://www.youtube.com/watch?v=oSHBQheFm48) | 22 min | Pipeline de bytecode, GC, profiling |
| [React Native EU 2022 — JSI Internals](https://www.youtube.com/watch?v=yVhZnGl2C5M) | 30 min | Talk de conferencia: decisoes de design do JSI, casos extremos, modelo de threads |

### Interativo

| Recurso | O que fazer |
|---|---|
| [Expo Snack — JSI via MMKV](https://snack.expo.dev/@mrousavy/react-native-mmkv) | Execute MMKV no browser — observe leituras sincronas em acao |
| [react-native-jsi-example](https://github.com/ospfranco/react-native-jsi-template) | Template minimal: um HostObject, CMakeLists, iOS + Android — faca fork e compile |

---

Proximo → [Fabric — New Renderer](./02-fabric-renderer.md)
