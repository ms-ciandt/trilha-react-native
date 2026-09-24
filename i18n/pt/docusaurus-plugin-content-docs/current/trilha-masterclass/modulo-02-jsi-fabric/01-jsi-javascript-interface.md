---
title: "JSI — JavaScript Interface"
---

# JSI — JavaScript Interface

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc03_01_jsi-javascript-interface.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc03_01_jsi-javascript-interface.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> **Módulo 03 — React Native Masterclass**
> Público-alvo: engenheiros sênior que querem entender como o JavaScript chama C++ sem uma fila de mensagens.
> React Native 0.76+ — New Architecture (Bridgeless, JSI-first, Hermes).

---

## 1. O Problema que o JSI Resolve

Para entender o JSI, é preciso primeiro entender o que ele substituiu e exatamente onde a bridge antiga era lenta.

### A bridge antiga — serialização como gargalo

A arquitetura antiga conectava o engine JS (JavaScriptCore) e o nativo por meio de uma fila de mensagens assíncrona unidirecional. Cada chamada entre as camadas seguia este caminho:

```
Thread JS
  └─► serializar valor JS para string JSON (malloc + JSON.stringify)
        └─► enfileirar mensagem na fila C++
              └─► desenfileirar na thread nativa
                    └─► parsear JSON de volta para tipos nativos (alloc + JSON decode)
                          └─► executar código nativo
                                └─► re-serializar resultado para JSON
                                      └─► callback assíncrono para thread JS
```

Isso tinha três custos fixos:

| Custo | O que acontece | Impacto típico |
|---|---|---|
| Serialização | Cada número, string e array vira uma string JSON | 0,1–5 ms por chamada grande |
| Pressão de memória | Cópia da string existe em ambos os heaps simultaneamente | 2x o tamanho do payload alocado |
| Assincronicidade | Nenhuma chamada pode bloquear e esperar | Todos os padrões exigem callbacks/promises |

A maior consequência da restrição de apenas assíncrono era que algumas APIs que **devem ser síncronas no nativo** (listeners de scroll, medição de layout, drivers de animação) precisavam contornar a bridge com gambiarras complexas — `InteractionManager`, `setNativeProps`, o driver antigo do Animated. Todos esses existem porque a bridge não conseguia retornar um valor de forma síncrona.

### O que é o JSI

JSI significa **JavaScript Interface**. É uma biblioteca C++ fina, apenas de headers, que dá a qualquer objeto C++ acesso direto ao heap JavaScript — sem serialização, sem fila de mensagens, sem assincronicidade como restrição obrigatória.

O arquivo principal: [`jsi/jsi.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi.h)

O JSI define três abstrações fundamentais:
- `jsi::Runtime` — o próprio engine JS (Hermes, JSC, V8)
- `jsi::Value` — uma union com tag que armazena qualquer valor JS (undefined, null, bool, number, string, object, symbol, bigint) **sem copiá-lo**
- `jsi::HostObject` / `jsi::HostFunction` — objetos C++ que você pode passar para o código JS

O JSI é agnóstico em relação ao engine. Ele não é específico do Hermes. Hermes, JavaScriptCore e V8 todos implementam a interface `jsi::Runtime`. Trocar de engine significa trocar a implementação de `Runtime` — o código JSI acima dela não muda.

---

## 2. JSI vs Bridge Antiga — Comparação Direta

```
Bridge Antiga                       JSI

JS ──[JSON]──► Fila ──[JSON]──►   JS ──[ponteiro]──► objeto C++
                                                         │
Nativo ◄──[JSON]── Fila ◄──[JSON]── (sem fila, chamada direta)
```

| Dimensão | Bridge Antiga | JSI |
|---|---|---|
| Direção da chamada | Apenas assíncrono (fila) | Síncrono ou assíncrono, o chamador decide |
| Transferência de dados | Serialização JSON | Ponteiro compartilhado para valor JS |
| Memória | Cópia em ambos os heaps | Zero-copy (GC do JS gerencia o ciclo de vida) |
| Modelo de thread | Thread JS → thread nativa | Mesma thread (síncrono) ou qualquer thread (assíncrono) |
| Superfície C++ | RCTBridge (Obj-C++) | `jsi::Runtime` (C++ puro) |
| Acoplamento com engine | Apenas JavaScriptCore | Qualquer engine que implemente `jsi::Runtime` |

---

## 3. Tipos Principais do JSI

### `jsi::Runtime`

O runtime é o seu ponto de entrada. Você o obtém do engine; não o cria você mesmo. No React Native, `ReactInstance` mantém o runtime e passa referências para TurboModules, Fabric e bindings gerados pelo Codegen.

```cpp
// jsi/jsi.h (simplificado)
class Runtime {
public:
  // Avaliar JS a partir de uma string de fonte
  virtual Value evaluateJavaScript(
      const std::shared_ptr<const Buffer>& buffer,
      const std::string& sourceURL) = 0;

  // Acessar o objeto global
  virtual Object global() = 0;

  // Criar valores no heap JS (vivem sob controle do GC)
  virtual Object createObject() = 0;
  virtual Object createObject(std::shared_ptr<HostObject> ho) = 0;
  virtual Function createFunctionFromHostFunction(
      const PropNameID& name,
      unsigned int paramCount,
      HostFunctionType func) = 0;

  // Internamento de strings
  virtual PropNameID createPropNameIDFromAscii(const char* str, size_t length) = 0;
};
```

### `jsi::Value`

Uma union com tag que pode armazenar qualquer valor JS. É **move-only** — a cópia é intencionalmente desabilitada para forçar propriedade explícita.

```cpp
class Value {
  // Tags
  enum class ValueKind : uint32_t {
    UndefinedKind,
    NullKind,
    BooleanKind,
    NumberKind,
    SymbolKind,
    BigIntKind,
    StringKind,
    ObjectKind,
  };
  
public:
  // Guardas de tipo
  bool isUndefined() const;
  bool isNull() const;
  bool isBool() const;
  bool isNumber() const;
  bool isString() const;
  bool isObject() const;
  bool isSymbol() const;
  bool isBigInt() const;

  // Extratores (lançam JSIException se o tipo for errado)
  bool getBool() const;
  double getNumber() const;
  std::string getString(Runtime& rt) const;
  Object getObject(Runtime& rt) &&;    // semântica de move: você assume a propriedade
};
```

O design move-only é intencional: `jsi::Value` é uma **referência** ao heap JS. Copiar exigiria duplicar o objeto no heap (custoso) ou criar uma segunda referência sem o GC saber (ponteiro pendente). O move transfere a propriedade de forma limpa.

### `jsi::HostObject`

Uma classe C++ que você expõe como um objeto JavaScript. Quando JS lê uma propriedade, `get` é chamado. Quando JS escreve uma propriedade, `set` é chamado.

```cpp
class HostObject {
public:
  virtual ~HostObject() {}
  
  // Chamado quando JS le: obj.someProperty
  virtual Value get(Runtime& rt, const PropNameID& name) = 0;
  
  // Chamado quando JS escreve: obj.someProperty = value
  virtual void set(Runtime& rt, const PropNameID& name, const Value& value) = 0;
  
  // Chamado quando JS faz: Object.keys(obj)
  virtual std::vector<PropNameID> getPropertyNames(Runtime& rt) = 0;
};
```

### `jsi::HostFunction`

Uma lambda ou função C++ exposta como uma função JavaScript. O objeto `this` e todos os argumentos chegam como referências `jsi::Value`.

```cpp
// Assinatura de uma host function
using HostFunctionType = std::function<
    Value(Runtime& rt, const Value& thisVal, const Value* args, size_t count)
>;
```

---

## 4. Escrevendo um HostObject do Zero

O exemplo a seguir mostra um HostObject completo e mínimo que encapsula um sensor de hardware nativo. Sem Codegen, sem scaffolding de TurboModule — JSI puro.

### Camada C++

```cpp
// SensorHostObject.h
#pragma once
#include <jsi/jsi.h>
#include <memory>

using namespace facebook::jsi;

class SensorHostObject : public HostObject {
public:
  explicit SensorHostObject(std::shared_ptr<ISensorDriver> driver)
      : driver_(std::move(driver)) {}

  Value get(Runtime& rt, const PropNameID& name) override {
    std::string propName = name.utf8(rt);
    
    if (propName == "lastReading") {
      // Retorna o valor atual do sensor de forma síncrona — sem async, sem JSON
      double reading = driver_->readSync();
      return Value(reading);
    }
    
    if (propName == "subscribe") {
      // Retorna uma função JS que instala um callback
      return Function::createFromHostFunction(
          rt,
          PropNameID::forAscii(rt, "subscribe"),
          1,  // aridade
          [weakDriver = std::weak_ptr<ISensorDriver>(driver_)]
          (Runtime& rt, const Value& thisVal, const Value* args, size_t count) -> Value {
            if (count < 1 || !args[0].isObject()) {
              throw JSError(rt, "subscribe() requires a callback function");
            }
            
            auto callback = std::make_shared<Function>(
                args[0].getObject(rt).asFunction(rt)
            );
            
            auto driver = weakDriver.lock();
            if (!driver) return Value::undefined();
            
            driver->onReading([callback, &rt](double value) {
              callback->call(rt, Value(value));
            });
            
            return Value::undefined();
          }
      );
    }
    
    return Value::undefined();
  }

  void set(Runtime& rt, const PropNameID& name, const Value& value) override {
    throw JSError(rt, "SensorObject is read-only");
  }

  std::vector<PropNameID> getPropertyNames(Runtime& rt) override {
    return {
      PropNameID::forAscii(rt, "lastReading"),
      PropNameID::forAscii(rt, "subscribe"),
    };
  }

private:
  std::shared_ptr<ISensorDriver> driver_;
};
```

### Instalando o HostObject no global do JS

```cpp
// JSIInstaller.cpp
void installSensorObject(Runtime& rt, std::shared_ptr<ISensorDriver> driver) {
  auto sensorObj = std::make_shared<SensorHostObject>(std::move(driver));
  
  // Encapsula em um Object JSI gerenciado pelo GC do JS
  auto jsObj = Object::createFromHostObject(rt, sensorObj);
  
  // Expõe no escopo global: global.__sensorBridge
  rt.global().setProperty(rt, "__sensorBridge", std::move(jsObj));
}
```

### Consumo em JavaScript

```typescript
// Lado JS — sem NativeModules, sem require(), sem Codegen
const sensor = (global as any).__sensorBridge;

// Leitura síncrona — retorna imediatamente
const reading: number = sensor.lastReading;
console.log(reading); // ex.: 9.81

// Assinatura de callback assíncrono
sensor.subscribe((value: number) => {
  console.log('Nova leitura:', value);
});
```

Observações principais:
- `sensor.lastReading` executa C++ de forma síncrona na thread JS — sem await, sem Promise
- `sensor.subscribe()` instala um callback C++ — quando o sensor dispara, `callback->call(rt, ...)` executa a função JS
- Não há JSON, nenhuma fila, nenhum overhead de serialização

---
