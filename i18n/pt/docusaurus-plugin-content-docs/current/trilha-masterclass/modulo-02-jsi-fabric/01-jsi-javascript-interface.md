---
title: "JSI — JavaScript Interface"
---

# JSI — JavaScript Interface

> **Modulo 03 — React Native Masterclass**
> Publico-alvo: engenheiros senior que querem entender como o JavaScript chama C++ sem uma fila de mensagens.
> React Native 0.76+ — New Architecture (Bridgeless, JSI-first, Hermes).

---

## 1. O Problema que o JSI Resolve

Para entender o JSI, e preciso primeiro entender o que ele substituiu e exatamente onde a bridge antiga era lenta.

### A bridge antiga — serializacao como gargalo

A arquitetura antiga conectava o engine JS (JavaScriptCore) e o nativo por meio de uma fila de mensagens assincrona unidirecional. Cada chamada entre as camadas seguia este caminho:

```
Thread JS
  └─► serializar valor JS para string JSON (malloc + JSON.stringify)
        └─► enfileirar mensagem na fila C++
              └─► desenfileirar na thread nativa
                    └─► parsear JSON de volta para tipos nativos (alloc + JSON decode)
                          └─► executar codigo nativo
                                └─► re-serializar resultado para JSON
                                      └─► callback assincrono para thread JS
```

Isso tinha tres custos fixos:

| Custo | O que acontece | Impacto tipico |
|---|---|---|
| Serializacao | Cada numero, string e array vira uma string JSON | 0,1–5 ms por chamada grande |
| Pressao de memoria | Copia da string existe em ambos os heaps simultaneamente | 2x o tamanho do payload alocado |
| Assincronicidade | Nenhuma chamada pode bloquear e esperar | Todos os padroes exigem callbacks/promises |

A maior consequencia da restricao de apenas assincrono era que algumas APIs que **devem ser sincronas no nativo** (listeners de scroll, medicao de layout, drivers de animacao) precisavam contornar a bridge com gambiarras complexas — `InteractionManager`, `setNativeProps`, o driver antigo do Animated. Todos esses existem porque a bridge nao conseguia retornar um valor de forma sincrona.

### O que e o JSI

JSI significa **JavaScript Interface**. E uma biblioteca C++ fina, apenas de headers, que da a qualquer objeto C++ acesso direto ao heap JavaScript — sem serializacao, sem fila de mensagens, sem assincronicidade como restricao obrigatoria.

O arquivo principal: [`jsi/jsi.h`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/jsi.h)

O JSI define tres abstracoes fundamentais:
- `jsi::Runtime` — o proprio engine JS (Hermes, JSC, V8)
- `jsi::Value` — uma union com tag que armazena qualquer valor JS (undefined, null, bool, number, string, object, symbol, bigint) **sem copia-lo**
- `jsi::HostObject` / `jsi::HostFunction` — objetos C++ que voce pode passar para o codigo JS

O JSI e agnóstico em relacao ao engine. Ele nao e especifico do Hermes. Hermes, JavaScriptCore e V8 todos implementam a interface `jsi::Runtime`. Trocar de engine significa trocar a implementacao de `Runtime` — o codigo JSI acima dela nao muda.

---

## 2. JSI vs Bridge Antiga — Comparacao Direta

```
Bridge Antiga                       JSI

JS ──[JSON]──► Fila ──[JSON]──►   JS ──[ponteiro]──► objeto C++
                                                         │
Nativo ◄──[JSON]── Fila ◄──[JSON]── (sem fila, chamada direta)
```

| Dimensao | Bridge Antiga | JSI |
|---|---|---|
| Direcao da chamada | Apenas assincrono (fila) | Sincrono ou assincrono, o chamador decide |
| Transferencia de dados | Serializacao JSON | Ponteiro compartilhado para valor JS |
| Memoria | Copia em ambos os heaps | Zero-copy (GC do JS gerencia o ciclo de vida) |
| Modelo de thread | Thread JS → thread nativa | Mesma thread (sincrono) ou qualquer thread (assincrono) |
| Superficie C++ | RCTBridge (Obj-C++) | `jsi::Runtime` (C++ puro) |
| Acoplamento com engine | Apenas JavaScriptCore | Qualquer engine que implemente `jsi::Runtime` |

---

## 3. Tipos Principais do JSI

### `jsi::Runtime`

O runtime e o seu ponto de entrada. Voce o obtem do engine; nao o cria voce mesmo. No React Native, `ReactInstance` mantem o runtime e passa referencias para TurboModules, Fabric e bindings gerados pelo Codegen.

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

Uma union com tag que pode armazenar qualquer valor JS. E **move-only** — a copia e intencionalmente desabilitada para forcar propriedade explicita.

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

  // Extratores (lancam JSIException se o tipo for errado)
  bool getBool() const;
  double getNumber() const;
  std::string getString(Runtime& rt) const;
  Object getObject(Runtime& rt) &&;    // semantica de move: voce assume a propriedade
};
```

O design move-only e intencional: `jsi::Value` e uma **referencia** ao heap JS. Copiar exigiria duplicar o objeto no heap (custoso) ou criar uma segunda referencia sem o GC saber (ponteiro pendente). O move transfere a propriedade de forma limpa.

### `jsi::HostObject`

Uma classe C++ que voce expoe como um objeto JavaScript. Quando JS le uma propriedade, `get` e chamado. Quando JS escreve uma propriedade, `set` e chamado.

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

Uma lambda ou funcao C++ exposta como uma funcao JavaScript. O objeto `this` e todos os argumentos chegam como referencias `jsi::Value`.

```cpp
// Assinatura de uma host function
using HostFunctionType = std::function<
    Value(Runtime& rt, const Value& thisVal, const Value* args, size_t count)
>;
```

---

## 4. Escrevendo um HostObject do Zero

O exemplo a seguir mostra um HostObject completo e minimal que encapsula um sensor de hardware nativo. Sem Codegen, sem scaffolding de TurboModule — JSI puro.

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
      // Retorna o valor atual do sensor de forma sincrona — sem async, sem JSON
      double reading = driver_->readSync();
      return Value(reading);
    }
    
    if (propName == "subscribe") {
      // Retorna uma funcao JS que instala um callback
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
  
  // Expoe no escopo global: global.__sensorBridge
  rt.global().setProperty(rt, "__sensorBridge", std::move(jsObj));
}
```

### Consumo em JavaScript

```typescript
// Lado JS — sem NativeModules, sem require(), sem Codegen
const sensor = (global as any).__sensorBridge;

// Leitura sincrona — retorna imediatamente
const reading: number = sensor.lastReading;
console.log(reading); // ex.: 9.81

// Assinatura de callback assincrono
sensor.subscribe((value: number) => {
  console.log('Nova leitura:', value);
});
```

Observacoes principais:
- `sensor.lastReading` executa C++ de forma sincrona na thread JS — sem await, sem Promise
- `sensor.subscribe()` instala um callback C++ — quando o sensor dispara, `callback->call(rt, ...)` executa a funcao JS
- Nao ha JSON, nenhuma fila, nenhum overhead de serializacao

---
