---
title: JSI e Interop ObjC++
---

# JSI e Interop ObjC++

React Native 0.76 eliminou a Bridge legada como caminho padrão. No lugar dela, toda comunicação entre JavaScript e código nativo acontece via **JSI** — JavaScript Interface. Para um desenvolvedor Swift, entender JSI significa entender por que existe uma camada C++ no meio, e por que `.mm` (ObjC++) é o elo necessário entre Swift e esse mundo C++.

---

## A Bridge legada: contexto histórico

Antes do JSI, React Native usava uma Bridge assíncrona baseada em troca de mensagens serializadas em JSON. O fluxo era:

1. JavaScript serializa um objeto para JSON.
2. A mensagem é colocada em uma fila.
3. A thread nativa desserializa o JSON.
4. A função nativa executa.
5. O resultado percorre o mesmo caminho de volta.

Cada chamada cruzava a fronteira processo-a-processo — não literalmente processos diferentes, mas threads isoladas sem memória compartilhada, comunicando-se via cópias de dados. O custo era duplo: serialização/desserialização de JSON em toda chamada, e a latência inerente de uma fila de mensagens assíncrona.

Para operações de UI de alta frequência — gestos a 60 fps, animações frame-a-frame, leitura de sensores — esse modelo impunha gargalos visíveis. Uma chamada nativa simples podia levar dezenas de milissegundos só de overhead de fila.

---

## JSI: memória compartilhada, chamadas síncronas

JSI reescreve essa relação. O ponto central é este: **JavaScript e código nativo rodam no mesmo processo e podem compartilhar a mesma memória**.

O runtime JavaScript (Hermes, no React Native moderno) expõe uma API C++ chamada `jsi::Runtime`. Através dela, código C++ pode:

- Criar e inspecionar valores JavaScript diretamente.
- Instalar funções e objetos no escopo global do JS.
- Invocar funções JS de forma síncrona.
- Receber chamadas JS de volta, também síncronas.

Não há JSON. Não há fila. Não há cópias obrigatórias de dados. Um ponteiro para um buffer nativo pode ser passado para o JS como um `ArrayBuffer` sem copiar um único byte.

---

## Os tipos fundamentais do JSI

### `jsi::Runtime`

Representa o ambiente de execução JavaScript. É o ponto de entrada para qualquer operação JSI. Você não cria um Runtime — ele é fornecido pelo host (React Native) e passado para as suas funções de instalação.

```cpp
// Assinatura típica de uma função de instalação de módulo
void installMyModule(jsi::Runtime& runtime);
```

O `Runtime` é thread-affine: você só pode usá-lo na thread JavaScript. Guardar uma referência e usar em outra thread é comportamento indefinido.

### `jsi::Value`

O tipo universal que representa qualquer valor JavaScript. Pode conter:

- `undefined`
- `null`
- `bool`
- `double` (todos os números JS são doubles)
- `string` (`jsi::String`)
- `object` (`jsi::Object`)
- `symbol` (`jsi::Symbol`)
- `bigint` (`jsi::BigInt`)

```cpp
jsi::Value myValue = jsi::Value(42.0);
jsi::Value strValue = jsi::String::createFromUtf8(runtime, "hello");
jsi::Value boolValue = jsi::Value(true);
```

`jsi::Value` é um tipo de valor com semântica de move. Copiar é explícito (`.asObject(runtime)` retorna uma cópia). Isso reflete que objetos JS são reference-counted dentro do runtime.

### `jsi::Object`

Subconjunto de `jsi::Value` para objetos JS. Permite leitura e escrita de propriedades:

```cpp
jsi::Object obj = jsi::Object(runtime);
obj.setProperty(runtime, "width", jsi::Value(320.0));
obj.setProperty(runtime, "height", jsi::Value(568.0));

// Lendo de volta
jsi::Value widthVal = obj.getProperty(runtime, "width");
double width = widthVal.asNumber(); // 320.0
```

### `jsi::Function`

Representa uma função JavaScript. Você pode criá-la a partir de uma lambda C++ ou de um `HostFunction`, e também invocar funções JS existentes:

```cpp
// Chamando uma função JS existente
jsi::Value result = myJsFunction.call(runtime, arg1, arg2);

// Criando uma função nativa callable de JS
auto nativeFunc = jsi::Function::createFromHostFunction(
    runtime,
    jsi::PropNameID::forAscii(runtime, "myNativeFunc"),
    1, // número de argumentos esperados
    [](jsi::Runtime& rt,
       const jsi::Value& thisVal,
       const jsi::Value* args,
       size_t count) -> jsi::Value {
        double input = args[0].asNumber();
        return jsi::Value(input * 2.0);
    }
);

runtime.global().setProperty(runtime, "myNativeFunc", std::move(nativeFunc));
```

Após isso, `myNativeFunc(21)` em JavaScript retorna `42` — sem fila, sem JSON, de forma síncrona.

---

## O padrão HostObject

Para expor um objeto nativo com estado para o JavaScript, JSI oferece o `jsi::HostObject`. É uma classe C++ com dois métodos virtuais:

```cpp
class jsi::HostObject {
public:
    virtual jsi::Value get(jsi::Runtime& runtime,
                           const jsi::PropNameID& name) = 0;
    virtual void set(jsi::Runtime& runtime,
                     const jsi::PropNameID& name,
                     const jsi::Value& value) = 0;
    virtual std::vector<jsi::PropNameID> getPropertyNames(
                     jsi::Runtime& runtime);
};
```

Você implementa essa interface em C++ e instala o objeto no escopo global:

```cpp
class SensorHostObject : public jsi::HostObject {
    double lastReading_ = 0.0;

public:
    jsi::Value get(jsi::Runtime& rt,
                   const jsi::PropNameID& name) override {
        std::string key = name.utf8(rt);
        if (key == "lastReading") {
            return jsi::Value(lastReading_);
        }
        if (key == "read") {
            return jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "read"),
                0,
                [this](jsi::Runtime& r,
                       const jsi::Value&,
                       const jsi::Value*,
                       size_t) -> jsi::Value {
                    // leitura direta de hardware, sem serialização
                    lastReading_ = readHardwareSensor();
                    return jsi::Value(lastReading_);
                }
            );
        }
        return jsi::Value::undefined();
    }

    void set(jsi::Runtime& rt,
             const jsi::PropNameID& name,
             const jsi::Value& value) override {
        // propriedades read-only neste exemplo
    }
};
```

Instalação no runtime:

```cpp
void installSensorModule(jsi::Runtime& runtime) {
    auto hostObj = std::make_shared<SensorHostObject>();
    auto jsObject = jsi::Object::createFromHostObject(runtime, hostObj);
    runtime.global().setProperty(runtime, "NativeSensor", std::move(jsObject));
}
```

No JavaScript:

```js
const reading = NativeSensor.read(); // síncrono, zero serialização
```

O `HostObject` vive enquanto o objeto JS correspondente tiver referências ativas. O garbage collector do Hermes gerencia o ciclo de vida via `shared_ptr`.

---

## Por que ObjC++ e não Swift direto

Aqui está a limitação central que todo desenvolvedor Swift encontra: **Swift não pode expor tipos C++ para ObjC, e ObjC++ é a única camada que pode fazer a ponte dos dois lados**.

O JSI é uma API C++. Seus tipos (`jsi::Runtime`, `jsi::Value`, `jsi::HostObject`) são classes C++ com templates, herança virtual e semântica de move. Swift possui interoperabilidade com C++ em evolução (Swift 5.9+), mas as restrições ainda são significativas para tipos complexos com herança virtual, que é exatamente o que `jsi::HostObject` usa.

ObjC++ (arquivos `.mm`) resolve isso porque:

1. O compilador Clang compila `.mm` como ObjC com acesso total ao C++.
2. Um arquivo `.mm` pode incluir headers JSI, instanciar `jsi::HostObject`, e usar toda a API C++.
3. Esse mesmo arquivo pode definir uma classe ObjC (`@interface`/`@implementation`) que expõe uma interface limpa para Swift.
4. Swift importa a classe ObjC via bridging header e chama seus métodos normalmente.

A cadeia fica assim:

```
Swift (.swift)
    |
    v  chama métodos ObjC
ObjC++ (.mm)
    |
    v  usa diretamente
JSI C++ (jsi::Runtime, jsi::HostObject, jsi::Function)
    |
    v  comunica com
Hermes / JavaScript
```

---

## Estrutura prática de um TurboModule iOS

Um TurboModule iOS mínimo com JSI segue esta estrutura de arquivos:

```
ios/
  MyModule/
    MyModule.h         ← interface ObjC (visível ao Swift)
    MyModule.mm        ← implementação ObjC++, usa JSI
    MyModuleSpec.h     ← protocolo gerado pelo Codegen
```

`MyModule.h` expõe apenas tipos ObjC-compatíveis:

```objc
// MyModule.h
#import <React/RCTBridgeModule.h>

@interface MyModule : NSObject <RCTBridgeModule>
@end
```

`MyModule.mm` implementa a lógica com acesso total ao C++ e JSI:

```objc
// MyModule.mm
#import "MyModule.h"
#import <jsi/jsi.h>
#import <ReactCommon/TurboModule.h>

using namespace facebook::jsi;

@implementation MyModule

RCT_EXPORT_MODULE(MyModule)

- (void)installJSIBindings:(Runtime&)runtime {
    auto hostObj = std::make_shared<SensorHostObject>();
    auto jsObject = Object::createFromHostObject(runtime, hostObj);
    runtime.global().setProperty(runtime, "NativeSensor", std::move(jsObject));
}

@end
```

Swift enxerga apenas `MyModule` como uma classe ObjC normal. A complexidade C++ fica totalmente encapsulada em `.mm`.

---

## Implicações de performance

A diferença entre Bridge legada e JSI não é apenas teórica:

| Aspecto | Bridge (legada) | JSI |
|---|---|---|
| Modelo de chamada | Assíncrono via fila | Síncrono in-process |
| Serialização | JSON completo | Nenhuma |
| Latência de ida/volta | Dezenas de ms | Microssegundos |
| Compartilhamento de memória | Impossível (cópias) | Direto via ponteiros |
| Uso em gestures 60fps | Impraticável | Viável |
| `ArrayBuffer` sem cópia | Não suportado | Suportado |

Para casos como processamento de imagem frame-a-frame, leitura de sensores de alta frequência, ou integração com Metal via buffers compartilhados, a diferença é a fronteira entre viável e inviável.

A desvantagem do modelo síncrono: uma operação lenta no lado nativo bloqueia a thread JavaScript. TurboModules bem implementados usam JSI de forma síncrona apenas para operações verdadeiramente rápidas — leitura de estado em memória, configuração de callbacks — e delegam trabalho pesado para threads nativas, notificando o JS via eventos ou Promises quando concluído.

---

## Go Deeper

A exploração completa de JSI, Fabric e a New Architecture como sistema integrado está na trilha avançada:

- **Masterclass — Modulo 03: Fabric e JSI** (`docs/trilha-masterclass/modulo-03-fabric-jsi/`) — implementação de componentes Fabric com JSI, HostObjects avançados, integração com Metal e CoreML via buffers compartilhados, e análise de performance com Instruments.

O módulo da Masterclass assume que você já tem o modelo mental de JSI coberto aqui e parte diretamente para implementações de produção com Codegen e a pipeline completa do Fabric renderer.
