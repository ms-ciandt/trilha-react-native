---
title: "JSI: O Fim da Bridge"
sidebar_label: "JSI"
sidebar_position: 2
---

## Video Overview

> Video para este tópico em breve.

## O Problema com a Bridge Antiga

Antes da New Architecture, o React Native usava uma **bridge de passagem de mensagens assíncrona** entre JavaScript e código nativo. Cada chamada de JS para nativo (e de volta) era:

1. Serializada para JSON
2. Enfileirada na bridge
3. Desserializada do outro lado
4. Executada de forma assíncrona

```
JS Thread ──[JSON serialize]──▶ Bridge Queue ──[JSON deserialize]──▶ Native Thread
                                  (async, batched)
```

Esse modelo tem três problemas fundamentais para desenvolvedores Android:

| Problema | Analogia Android | Impacto |
|---------|-----------------|--------|
| Sem chamadas síncronas | Como um `Looper` que só aceita `post()`, nunca `postSync()` | Não é possível bloquear o JS aguardando resultado nativo |
| Overhead de serialização JSON | Como serializar toda chamada de Binder IPC para JSON | Custo de CPU e memória por chamada |
| Sem memória compartilhada | Como dois processos sem mapa de memória compartilhado | Dados grandes (imagens, buffers) copiados integralmente |

---

## JSI: JavaScript Interface

JSI (JavaScript Interface) é uma **camada C++** que fornece ao motor JavaScript uma referência direta a objetos nativos — sem serialização, sem filas, sem round-trip assíncrono.

```
JS Thread ──[C++ function pointer]──▶ Native (C++/Kotlin via JNI) — synchronous
```

O motor JS (Hermes) mantém uma referência a um objeto C++. Quando o JS chama um método nesse objeto, é uma chamada de função C++ direta — o mesmo overhead de chamar uma função em qualquer programa C++.

### O insight principal para desenvolvedores Android

JSI é conceitualmente similar ao JNI (Java Native Interface) — é uma ponte entre dois ambientes de execução que fala C++. Enquanto o JNI faz a ponte Java/Kotlin ↔ C++, o JSI faz a ponte JavaScript ↔ C++. O lado nativo de um TurboModule é acessível por ambos.

```
JavaScript (Hermes)
      │
      │ JSI — chamada de função C++ (síncrona)
      ▼
C++ Host Object (HostObject)
      │
      │ JNI — bridge padrão Java/Kotlin ↔ C++
      ▼
Implementação Kotlin do TurboModule
```

---

## Host Objects: A Primitiva do JSI

Um `HostObject` é uma classe C++ que o JSI expõe ao JavaScript. O JS pode chamar métodos nele de forma síncrona como se fosse um objeto JavaScript comum.

```cpp
// C++ — HostObject simplificado
class NativeStorageModule : public facebook::jsi::HostObject {
public:
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& name) override {
    auto methodName = name.utf8(rt);

    if (methodName == "getString") {
      return jsi::Function::createFromHostFunction(rt, name, 1,
        [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t) {
          std::string key = args[0].getString(rt).utf8(rt);
          // Síncrono — retorna diretamente
          return jsi::String::createFromUtf8(rt, mmkv->getString(key));
        });
    }
    return jsi::Value::undefined();
  }
};
```

Do lado JavaScript, chamar isso parece completamente nativo:

```tsx
// Lado JS — chamada síncrona, sem await
const value = NativeStorage.getString('user.token'); // retorna imediatamente
```

É por isso que o MMKV (`react-native-mmkv`) é síncrono — ele usa JSI diretamente, contornando a bridge por completo.

---

## O que o JSI Habilita na Prática

### 1. Chamadas nativas síncronas

```tsx
// Bridge antiga — apenas assíncrono
NativeModules.Storage.getString('key', (value) => {
  // callback — não é possível usar o valor fora desta função
  console.log(value);
});

// JSI — síncrono
const value = storage.getString('key'); // retorno direto, sem callback
console.log(value); // disponível imediatamente
```

### 2. ArrayBuffer compartilhado — transferência de dados zero-copy

```tsx
// Passa um buffer de JS para nativo sem copiar
const buffer = new ArrayBuffer(1024 * 1024); // 1MB
const view = new Uint8Array(buffer);
view.fill(42);

// Com JSI: o nativo recebe um ponteiro para a mesma memória — sem cópia
NativeImageProcessor.processBuffer(buffer);
```

Isso é crítico para frames de câmera, buffers de áudio e qualquer dado de alta vazão — exatamente os casos de uso onde a bridge antiga era um gargalo.

### 3. Objetos JS diretamente no nativo

```tsx
// O código nativo pode manter uma referência a uma função JS e chamá-la
// a qualquer momento — usado para listeners de eventos, callbacks, streams

NativeEventEmitter.addListener('onFrame', (frame) => {
  // Este callback é uma função JS armazenada pelo JSI em C++
  // O nativo o chama diretamente quando um novo frame de câmera chega
  processFrame(frame);
});
```

---

## JSI e o Codegen

Raramente você escreverá código JSI C++ diretamente. O **Codegen** gera a cola JSI automaticamente a partir da sua spec TypeScript. Seu trabalho como desenvolvedor Kotlin é:

1. Escrever uma spec TypeScript (o contrato)
2. Escrever a implementação Kotlin
3. O Codegen gera a camada JSI em C++ entre eles

```
TypeScript Spec
      │
      │ npx react-native codegen
      ▼
Cola C++ JSI (gerada automaticamente — não editar)
      │
      │ JNI (gerado automaticamente pelo Codegen)
      ▼
Sua classe Kotlin (você escreve isso)
```

Isso é coberto em detalhes no tópico de TurboModules.

---

## JSI Runtime: Lendo e Escrevendo Valores JS em C++

Se você precisar escrever JSI C++ diretamente (para uma biblioteca de baixo nível), estes são os tipos de valores:

```cpp
jsi::Runtime& rt // sempre o primeiro argumento — a instância do motor JS

// Lendo do JS
std::string str  = args[0].getString(rt).utf8(rt);
double      num  = args[1].getNumber();
bool        flag = args[2].getBool();

// Lendo uma propriedade de objeto
jsi::Object obj  = args[0].getObject(rt);
double width     = obj.getProperty(rt, "width").getNumber();

// Escrevendo de volta para JS
return jsi::String::createFromUtf8(rt, "result");
return jsi::Value(42.0);
return jsi::Value::undefined();
return jsi::Value::null();

// Chamando uma função JS a partir de C++
jsi::Function callback = args[0].getObject(rt).asFunction(rt);
callback.call(rt, jsi::String::createFromUtf8(rt, "hello"));
```

---

## A Stack de Runtime da New Architecture

Com o JSI, a stack completa da New Architecture no Android fica assim:

```
┌─────────────────────────────────────────────┐
│  JavaScript (Hermes)                        │
│  Seus componentes React Native              │
├─────────────────────────────────────────────┤
│  Camada JSI (C++)                           │
│  TurboModuleRegistry / Fabric               │
├─────────────────────────────────────────────┤
│  Bindings C++ gerados pelo Codegen          │
│  (NativeXxxSpecJSI.cpp — gerado automaticamente) │
├─────────────────────────────────────────────┤
│  Bridge JNI (C++ ↔ Java/Kotlin)             │
│  (também gerado automaticamente pelo Codegen) │
├─────────────────────────────────────────────┤
│  Seu TurboModule / Fabric Component em Kotlin │
│  Roda na thread nativa Android              │
└─────────────────────────────────────────────┘
```

---

## Renderização Concorrente e JSI

Com a New Architecture, o React Native agora pode renderizar em múltiplas threads simultaneamente — similar à divisão `RenderThread` + `UIThread` do Android:

| Arquitetura Antiga | New Architecture |
|-----------------|-----------------|
| Thread JS + thread UI | Thread JS + thread UI + thread em background |
| Layout calculado na thread JS | Layout calculado nativamente (Fabric) |
| Todas as atualizações de estado bloqueiam a UI | Renderização concorrente — atualizações de baixa prioridade cedem |
| Sem equivalente a `startTransition` | `startTransition` funciona (concurrent features do React 18) |

---

## Inspecionando o JSI em um App em Execução

Usando o debugger Hermes CDP (Chrome DevTools conectado ao seu app):

1. Abra a aba **Console**
2. Digite `global.HermesInternal` — você pode inspecionar o global exposto pelo JSI
3. Digite `global.nativeFabricUIManager` — o binding JSI do Fabric (presente se a New Architecture estiver habilitada)
4. Digite `global.RN$Bridgeless` — `true` se a bridge estiver completamente desabilitada

```js
// No console do Chrome DevTools conectado ao seu app RN:
> global.RN$Bridgeless
true
> global.nativeFabricUIManager !== undefined
true
> typeof global.HermesInternal
"object"
```

---

## Aprofunde-se — React Native Masterclass

Este tópico forneceu o modelo mental de desenvolvedor Android para o JSI. A Masterclass cobre o mesmo assunto em um nível muito mais baixo — internals de HostObject em C++, padrões avançados de JSI e como o runtime se integra com o Fabric:

- [JSI: JavaScript Interface](/trilha-masterclass/modulo-02-jsi-fabric/jsi-javascript-interface) — referência da API C++ e ciclo de vida do HostObject
- [JSI Avançado](/trilha-masterclass/modulo-02-jsi-fabric/jsi-advanced) — chamadas nativas síncronas, ArrayBuffer compartilhado, JSI em bibliotecas
- [Runtime: New Architecture](/trilha-masterclass/modulo-02-jsi-fabric/runtime-new-architecture) — stack de runtime completa, modelo de threads, renderização concorrente

---

## Materiais de Estudo

### Documentação Oficial

- [React Native — New Architecture Introduction](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [React Native — JSI](https://reactnative.dev/docs/the-new-architecture/why)
- [Hermes — JSI Header](https://github.com/facebook/hermes/blob/main/API/jsi/jsi/jsi.h) — a interface C++

### Aprofundamentos

- [Lorenzo Sciandra — The New Architecture deep dive](https://www.youtube.com/watch?v=5ZBZPXaJgYI)
- [Nicola Corti — Under the hood of the New Architecture](https://www.youtube.com/watch?v=BxaCnA_lhns)

### Videos

- [React Native EU 2022 — New Architecture Overview](https://www.youtube.com/watch?v=BxaCnA_lhns)

---

## O que Vem a Seguir

Você entende o que o JSI faz. Agora a parte prática: escrever um TurboModule real em Kotlin — da spec TypeScript ao Codegen até o código Kotlin em execução — com zero overhead de bridge.

➡ [TurboModules em Kotlin](./03-turbomodule-kotlin)
