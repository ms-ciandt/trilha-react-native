---
title: O que são TurboModules
---

# O que são TurboModules

> Antes da Nova Arquitetura, toda chamada a um módulo nativo cruzava a **bridge assíncrona**. Os TurboModules eliminam a bridge completamente — substituindo-a pelo JSI, um canal C++ direto entre o JavaScript e o código nativo.

---

## O Problema da Bridge

```
JS Thread ──serializa para JSON──► Fila da Bridge ──desserializa──► Native Thread
                                                                          │
Native Thread ──serializa resultado──► Fila da Bridge ──desserializa──► JS Thread
```

Cada argumento e valor de retorno era serializado em JSON a cada chamada. Não havia type safety na fronteira — o lado nativo recebia um `ReadableMap` e extraía valores por chave de string em tempo de execução. Todos os módulos eram carregados de forma antecipada na inicialização, mesmo que o usuário nunca acionasse o recurso que precisava deles.

| Bridge Antiga | TurboModules |
|---|---|
| JSON sobre uma fila assíncrona | JSI — chamadas C++ diretas, síncronas ou assíncronas |
| Sem type safety na fronteira | Codegen gera interfaces nativas tipadas a partir de uma spec TypeScript |
| Todos os módulos carregados na inicialização | Inicialização preguiçosa — instanciado no primeiro acesso |
| `NativeModules.Foo.method()` — sem tipagem | `TurboModuleRegistry.getEnforcing<Spec>()` — tipado |

---

## O que é um TurboModule

Um TurboModule é um módulo nativo que satisfaz quatro propriedades:

1. **Possui um arquivo de spec TypeScript** — o contrato entre JS e nativo, lido pelo Codegen
2. **Usa o Codegen** — a spec é compilada em tempo de build em interfaces C++/Java/ObjC++ tipadas
3. **Comunica-se via JSI** — JavaScript Interface, uma API C++ que permite ao JS manter referências diretas a objetos C++ sem serialização
4. **É preguiçoso por padrão** — instanciado somente quando o JS chama `TurboModuleRegistry.get()` ou `getEnforcing()` pela primeira vez

---

## JSI: O Motor por Baixo

O JSI é uma abstração C++ sobre o engine JavaScript (Hermes). Ele expõe duas primitivas fundamentais:

- **HostObject** — uma classe C++ que o JS trata como um objeto JS normal. Métodos nela são lambdas C++ chamados de forma síncrona a partir do JS.
- **HostFunction** — uma única função C++ callable exposta ao JS.

Um TurboModule é um `HostObject`. Quando o JS chama `NativeCalculator.add(1, 2)`, não há serialização — o runtime JSI chama um lambda C++ diretamente na thread JS (ou o agenda como uma tarefa assíncrona).

```
JS: NativeCalculator.add(1, 2)
          │
          ▼  JSI — sem JSON, sem fila
   C++ TurboModule::add(jsi::Runtime& rt, double a, double b)
          │
          ▼  retorna via JSI
   JS recebe o resultado (ou a Promise resolve)
```

É por isso que os TurboModules podem expor **métodos síncronos** — algo impossível com a bridge antiga, que era sempre assíncrona.

---

## Carregamento Preguiçoso na Prática

Com a bridge antiga, `getPackages()` no `MainApplication` instanciava todos os módulos na inicialização. Com os TurboModules, o registry mantém uma factory — o objeto do módulo é criado somente quando o JS acessa pela primeira vez.

```kotlin
// Android: registra uma factory, não uma instância
override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
        NativeAnalyticsModule.NAME to ReactModuleInfo(
            name = NativeAnalyticsModule.NAME,
            className = NativeAnalyticsModule.NAME,
            canOverrideExistingModule = false,
            needsEagerInit = false,   // ← preguiçoso
            isCxxModule = false,
            isTurboModule = true      // ← marca como TurboModule
        )
    )
}
```

`needsEagerInit = false` é o padrão. O módulo de analytics não é construído até que algo no JS chame `TurboModuleRegistry.get('NativeAnalytics')`.

---

## Camada de Interoperabilidade (Compatibilidade com Versões Anteriores)

O RN 0.76+ vem com uma **Camada de Interoperabilidade de TurboModules** que permite que módulos legados baseados em `NativeModules` continuem funcionando sem alterações. A camada de interoperabilidade os envolve automaticamente em uma fachada de TurboModule.

Isso significa que apps brownfield ou apps com bibliotecas de terceiros não migradas não quebram ao habilitar a Nova Arquitetura — mas os benefícios (JSI, type safety, inicialização preguiçosa) só se aplicam a módulos devidamente convertidos.

| Tipo de módulo | JSI | Preguiçoso | Tipado |
|---|---|---|---|
| Legado (bridge antiga) | Não | Não | Não |
| Legado + camada de interop | Parcial | Não | Não |
| TurboModule nativo | Sim | Sim | Sim |

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Guia oficial passo a passo |
| [reactwg — TurboModules doc](https://github.com/reactwg/react-native-new-architecture/blob/main/docs/turbo-modules.md) | Referência do grupo de trabalho |
| [JSI source — facebook/hermes](https://github.com/facebook/hermes/tree/main/API/jsi) | Headers C++ do JSI — `jsi::HostObject`, `jsi::Runtime` |
| [New Architecture overview](https://reactnative.dev/docs/the-new-architecture/landing-page) | Contexto completo: JSI + Fabric + TurboModules juntos |

---

Próximo → [SPECS em TypeScript](./specs-typescript)
