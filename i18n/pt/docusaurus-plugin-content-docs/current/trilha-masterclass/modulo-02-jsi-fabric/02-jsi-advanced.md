---
title: "JSI — Padrões Avançados"
---

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc03_02_jsi-advanced.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc03_02_jsi-advanced.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## 5. Chamadas Síncronas e Assíncronas

O JSI permite ambas. A escolha é sua; o JSI não impõe assincronicidade.

### Síncrono (mesma thread)

```cpp
// C++ — host function síncrona
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
// JS — bloqueia a thread JS até o C++ retornar
const hash: number = (global as any).hashSync("hello world");
```

Quando o síncrono é apropriado: ler um valor pequeno em cache, realizar um cálculo barato, acessar memória compartilhada que o C++ já mantém. **Nunca chame I/O bloqueante de forma síncrona na thread JS.**

### Assíncrono (via Promise)

Quando o trabalho é I/O-bound ou precisa rodar em uma thread diferente, você retorna uma `Promise` construindo-a a partir do construtor global `Promise` do JS.

```cpp
// C++ — constrói uma Promise JS, resolve em thread de background
Value asyncFetch(Runtime& rt, const Value& thisVal, const Value* args, size_t count) {
  std::string url = args[0].getString(rt).utf8(rt);
  
  // Obtém o construtor Promise do JS
  auto promiseCtor = rt.global()
      .getPropertyAsFunction(rt, "Promise");
  
  // Captura as funções resolve/reject que o executor nos fornece
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
  
  // Constrói a Promise de fato — chama o executor imediatamente
  Value promise = promiseCtor.callAsConstructor(rt, executor);
  
  // Agenda trabalho em background
  threadPool_.submit([url, resolve, reject, &rt]() {
    auto result = http::get(url);   // I/O bloqueante em thread de background
    
    // Precisa retornar para a thread JS (o runtime não é thread-safe)
    jsCallInvoker_->invokeAsync([resolve, result, &rt]() {
      resolve->call(rt, String::createFromUtf8(rt, result.body));
    });
  });
  
  return promise;
}
```

A regra crítica: **o `Runtime` não é thread-safe**. Todas as operações com `jsi::Value` devem acontecer na thread que possui o runtime (a thread JS). `jsCallInvoker_->invokeAsync` é o hook que agenda trabalho de volta para a thread JS.

---

## 6. Interoperabilidade com Hermes

Hermes é o engine JS padrão do React Native desde a versão 0.64 e o único engine com suporte oficial para a New Architecture (embora o JSC ainda funcione via interface JSI).

### Por que Hermes?

| Propriedade | Hermes | JavaScriptCore |
|---|---|---|
| Compilação | Bytecode ahead-of-time | JIT em tempo de execução |
| Tempo de inicialização | Mais rápido (bytecode já compilado) | Mais lento (parse + warmup do JIT) |
| Uso de RAM | Menor (sem compilador JIT residente) | Maior |
| Protocolo de depuração | CDP (Chrome DevTools Protocol) | CDP |
| Tamanho do engine | Binário menor | Binário maior |
| Implementação JSI | `HermesRuntime` | `JSCRuntime` |

### Bytecode Hermes

O Hermes compila `.js` para `.hbc` (Hermes Bytecode) em tempo de build via CLI `hermes`:

```bash
# Durante o bundle do Metro — Hermes compila automaticamente quando hermesEnabled = true
# O bundle resultante ja e bytecode, nao JS textual

# Inspecionar bytecode manualmente:
./hermes -dump-bytecode output.hbc
```

O formato `.hbc` é um conjunto de instruções de VM baseado em registradores e compacto. Por ser pré-compilado:
- Nenhum parser executa na inicialização do app
- Nenhuma AST é construída
- Sem warmup de JIT — a execução começa a partir do bytecode imediatamente

É por isso que o Hermes economiza 200–800ms nos tempos de cold-start em dispositivos reais (o número exato depende muito do tamanho do bundle e da velocidade da CPU do dispositivo).

### HermesRuntime e JSI

`HermesRuntime` é a implementação Hermes de `jsi::Runtime`:

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

### Padrão Decorator do JSI no Hermes

O Hermes fornece `DecoratedRuntime` — um wrapper que permite adicionar instrumentação, profiling por amostragem ou extensões de BigInt/Intl sem modificar o engine central:

```cpp
// Runtime de profiling do Hermes (usado pelo Flipper)
auto hermesRuntime = makeHermesRuntime(config);
auto profiledRuntime = std::make_unique<HermesDecoratedRuntime>(
    std::move(hermesRuntime),
    ProfilerDecorator{}  // intercepta createFunctionFromHostFunction, call, etc.
);
```

É assim que o profiler por amostragem do Hermes funciona — ele encapsula o runtime e intercepta `call` para registrar timestamps.

### BigInt e Hermes

Hermes 0.12+ (incluído no RN 0.71+) suporta `BigInt`. Da perspectiva do JSI, `jsi::BigInt` é um tipo separado:

```cpp
// Verificando BigInt a partir do C++
if (value.isBigInt()) {
  int64_t n = value.getBigInt(rt).truncate(rt);  // com perda — use apenas se souber que cabe
  // ou converta para string para transferencia segura
  std::string str = value.getBigInt(rt).toString(rt).utf8(rt);
}
```

---

## 7. Host Functions: Padrões do Mundo Real

### Padrão 1: API de Medição (síncrona, sem alocação)

Este é o padrão que o Fabric usa internamente para `measure()` e consultas de layout.

```cpp
// Medição de layout síncrona via JSI
auto measureHost = Function::createFromHostFunction(
    rt,
    PropNameID::forAscii(rt, "measure"),
    1,  // recebe uma tag de no
    [uiManager](Runtime& rt, const Value&, const Value* args, size_t count) -> Value {
      int tag = static_cast<int>(args[0].getNumber());
      
      // UIManager é thread-safe para leituras
      LayoutMetrics metrics = uiManager->getLayoutMetrics(tag);
      
      // Retorna um objeto JS simples — sem JSON, sem serialização
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

Na bridge antiga, `measure()` era assíncrono por causa da fila. Com JSI, é síncrono — sem necessidade de `useEffect` + callback.

### Padrão 2: ArrayBuffer Compartilhado (dados binários sem cópia)

Quando você precisa passar dados binários (pixels de imagem, amostras de áudio) entre C++ e JS sem copiar, use `ArrayBuffer`:

```cpp
// C++ — expõe um buffer nativo diretamente para o JS
auto getFrameBuffer = Function::createFromHostFunction(
    rt,
    PropNameID::forAscii(rt, "getFrameBuffer"),
    0,
    [&cameraDriver](Runtime& rt, const Value&, const Value* args, size_t) -> Value {
      // Obtém ponteiro para o frame buffer nativo (já em memória)
      uint8_t* pixels = cameraDriver.lockCurrentFrame();
      size_t byteSize = cameraDriver.frameByteSize();
      
      // MutableBuffer é um tipo JSI que encapsula um ponteiro nativo
      // A lambda é o destrutor — chamado pelo GC quando o JS libera o buffer
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
// pixels[0..3] é o RGBA do primeiro pixel — nenhuma cópia foi feita
```

---

## 8. Depuração com JSI

### Identificando erros JSI

Erros JSI surgem como `JSIException` em C++ e aparecem no error boundary do JS como objetos `Error` padrão. O stack trace apontará para o `HostFunction` ou `HostObject.get` que lançou a exceção.

```cpp
// Lançando um erro tipado a partir do C++
throw JSError(rt, "NativeSensor: device not calibrated");

// Isso se torna no JS:
// Error: NativeSensor: device not calibrated
//   at NativeSensor.lastReading (<anonymous>)
//   at MyComponent (MyComponent.tsx:24)
```

### Chrome DevTools + Hermes

Com RN 0.73+, o Hermes é depurado via CDP (Chrome DevTools Protocol) diretamente — sem necessidade do Flipper:

1. Na saída do Metro você verá: `Inspector proxy: ws://localhost:8081/inspector`
2. Abra `chrome://inspect` no Chrome
3. Clique em "Inspect" no dispositivo listado

Você pode definir breakpoints dentro dos callbacks de `Function.createFromHostFunction` se fizer um build de debug com source maps. Em builds de release, use `console.log` direcionado para o log nativo:

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

Cada chamada de `HostFunction` aparece como uma fatia `JSI::HostFunction::<nome>`. Se você ver fatias inesperadamente longas, a host function está fazendo trabalho demais de forma síncrona na thread JS.

---

## Materiais de Estudo

### Código-Fonte Oficial

| Recurso | O que você vai encontrar |
|---|---|
| [`jsi/jsi.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi.h) | Definições completas dos tipos JSI — Runtime, Value, HostObject, HostFunction |
| [`jsi/jsi-inl.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi-inl.h) | Implementações inline dos construtores de Value |
| [`ReactCommon/callinvoker`](https://github.com/facebook/react-native/tree/main/packages/react-native/ReactCommon/callinvoker) | `CallInvoker` — a forma correta de agendar trabalho C++ de volta para a thread JS |
| [`hermes/API/hermes/hermes.h`](https://github.com/facebook/hermes/blob/main/API/hermes/hermes.h) | API pública do `HermesRuntime` |

### Documentação Oficial

| Recurso | Descrição |
|---|---|
| [JSI Reference](https://reactnative.dev/docs/the-new-architecture/landing-page) | Página inicial da New Architecture com contexto sobre JSI |
| [TurboModules com JSI](https://reactnative.dev/docs/turbo-native-modules-introduction) | Como o Codegen gera bindings JSI a partir de specs TypeScript |
| [Documentação do Hermes](https://hermesengine.dev/) | Site oficial do Hermes: formato de bytecode, depuração, configuração |

### Aprofundamentos

| Recurso | Autor | O que você vai aprender |
|---|---|---|
| [JSI: A new infrastructure for React Native](https://formidable.com/blog/2019/jsi-jsc-part-2/) | Formidable | Análise original dos objetivos de design do JSI vs bridge antiga |
| [Deep dive into React Native's New Architecture](https://medium.com/engineering-housing/deep-dive-into-react-natives-new-architecture-fb67ae615ccd) | Housing.com Eng | Arquitetura end-to-end: JSI → Fabric → TurboModules |
| [Writing a JSI module from scratch](https://ospfranco.com/post/2021/02/24/how-to-create-a-jsi-module/) | Oscar Franco | Guia completo: HostObject C++, CMakeLists, wiring iOS e Android |
| [react-native-mmkv internals](https://github.com/mrousavy/react-native-mmkv/blob/main/ios/MmkvHostObject.cpp) | Marc Rousavy | Implementação de HostObject em produção — leia o código-fonte real |
| [op-sqlite JSI source](https://github.com/OP-Engineering/op-sqlite/tree/main/cpp) | Oscar Franco | SQLite síncrono via JSI — dados binários e tratamento de threads no mundo real |

### Tutoriais em Vídeo

| Recurso | Duração | O que você vai aprender |
|---|---|---|
| [JSI in React Native — Explained](https://www.youtube.com/watch?v=wKwJ9VBovDc) | 18 min | Guia visual do JSI substituindo a bridge |
| [How Hermes Works](https://www.youtube.com/watch?v=oSHBQheFm48) | 22 min | Pipeline de bytecode, GC, profiling |
| [React Native EU 2022 — JSI Internals](https://www.youtube.com/watch?v=yVhZnGl2C5M) | 30 min | Talk de conferência: decisões de design do JSI, casos extremos, modelo de threads |

### Interativo

| Recurso | O que fazer |
|---|---|
| [Expo Snack — JSI via MMKV](https://snack.expo.dev/@mrousavy/react-native-mmkv) | Execute MMKV no browser — observe leituras síncronas em ação |
| [react-native-jsi-example](https://github.com/ospfranco/react-native-jsi-template) | Template mínimo: um HostObject, CMakeLists, iOS + Android — faça fork e compile |

---

Próximo → [Fabric — New Renderer](./02-fabric-renderer.md)
