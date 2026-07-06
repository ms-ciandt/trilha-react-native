---
title: Mergulho Profundo na Nova Arquitetura
---

# Mergulho Profundo na Nova Arquitetura

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/intro_02-new-arch.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> React Native 0.76+ — A Nova Arquitetura está **ativada por padrão**. É isso que roda seu app.

## JSI — JavaScript Interface

A antiga Bridge serializava cada chamada JS↔Native para JSON. Isso significava:

```
JS: Preciso da altura dessa view
→ Serializar para string JSON
→ Postar mensagem pela bridge (async)
→ Native recebe, deserializa o JSON
→ Mede a view
→ Serializar resultado para JSON
→ Postar mensagem de volta (async)
→ JS recebe, deserializa o JSON
→ Agora o JS tem a altura (mas a renderização já aconteceu)
```

Com **JSI**, o JavaScript possui uma **referência C++ direta** aos objetos nativos:

```
JS: Preciso da altura dessa view
→ Chama método C++ diretamente via referência JSI (síncrono)
→ Retorna o valor imediatamente
```

É assim que o **Reanimated 3** consegue animações a 60/120fps — o código de animação roda na thread de UI via um worklet JSI, sem round-trips para a thread JS.

### O Que o JSI Habilita
- Chamadas nativas síncronas
- Memória compartilhada entre JS e nativo
- Múltiplas engines JS (Hermes é padrão; V8 e JSC são possíveis)
- A base para TurboModules e Fabric

---

## Fabric — O Novo Renderer

O Fabric reescreve o pipeline de renderização de UI em C++ compartilhado (funciona em iOS, Android e eventualmente Windows/macOS).

### Principais Benefícios

**1. Layout síncrono**
O renderer antigo só conseguia fazer passes de layout assíncronos. O Fabric pode medir e confirmar layouts de forma síncrona, o que significa:
- Sem flickering de layout
- Medições precisas antes da pintura
- Eventos `onLayout` disparam de forma síncrona

**2. Suporte ao React Concorrente**
O Fabric integra-se com o renderer Concurrent do React. Seu app RN agora pode usar:
- `useTransition` — marcar atualizações de estado como não urgentes
- `Suspense` para busca de dados
- `startTransition` para manter a UI responsiva

**3. Achatamento de views**
O Fabric automaticamente achata views aninhadas redundantes — uma otimização de performance que antes era manual.

---

## TurboModules — Módulos Nativos Lazy

Os módulos nativos antigos eram todos **inicializados de forma eager** na inicialização — mesmo que você nunca os usasse. TurboModules são:

- **Lazy**: inicializados apenas no primeiro acesso
- **Type-safe**: apoiados por uma interface TypeScript gerada por código via **Codegen**
- **Capazes de ser síncronos**: podem ser chamados de forma síncrona via JSI quando necessário

### Codegen
TurboModules usam uma etapa de geração de código. Você define a interface do seu módulo nativo em TypeScript:

```typescript
// NativeCalculator.ts — o arquivo de spec
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  add(a: number, b: number): Promise<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCalculator');
```

O Codegen lê essa spec e gera o código C++ de cola automaticamente. Não é mais necessário escrever manualmente JNI (Android) ou bridges Objective-C (iOS).

---

## Hermes — A Engine JavaScript

[Hermes](https://hermesengine.dev/) é a engine JavaScript da Meta, otimizada para React Native:

| Feature | V8 / JSC | Hermes |
|---------|----------|--------|
| Compilação | JIT (em tempo de execução) | AOT bytecode (em tempo de build) |
| TTI (Time to Interactive) | Mais lento | Mais rápido |
| Uso de memória | Maior | Menor |
| Debugging | Chrome DevTools | Chrome DevTools + React DevTools |

O Hermes compila seu JS para bytecode **em tempo de build**, então o app inicia mais rápido — sem aquecimento JIT no dispositivo do usuário.

**O Hermes é a engine padrão desde o RN 0.70** e está profundamente integrado com a Nova Arquitetura.

---

## Resumo: O Que Mudou

| Aspecto | Arquitetura Antiga | Nova Arquitetura |
|---------|-------------------|------------------|
| Comunicação JS↔Native | Bridge JSON assíncrona | Referências C++ diretas via JSI |
| Renderização de UI | Async, específica por plataforma | Fabric renderer C++ compartilhado |
| Módulos nativos | Carregados de forma eager, sem tipos | TurboModules lazy, tipados via Codegen |
| React Concorrente | Não suportado | Totalmente suportado |
| Performance de animações | Gargalo da bridge | Worklets na thread de UI (Reanimated 3) |
| Tempo de inicialização | Todos os módulos inicializados | Init lazy + AOT Hermes |

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| Visão geral da Nova Arquitetura | Docs Oficiais | [reactnative.dev/architecture/landing-page](https://reactnative.dev/architecture/landing-page) |
| JSI explicado | Docs Oficiais | [reactnative.dev/architecture/runtime-execution-environments](https://reactnative.dev/architecture/runtime-execution-environments) |
| Hermes engine | Oficial | [hermesengine.dev](https://hermesengine.dev) |
| Docs do Codegen | Oficial | [reactnative.dev/docs/the-new-architecture/pillars-codegen](https://reactnative.dev/docs/the-new-architecture/pillars-codegen) |

Próximo → **[Escolha Sua Trilha](./choose-your-track)**
