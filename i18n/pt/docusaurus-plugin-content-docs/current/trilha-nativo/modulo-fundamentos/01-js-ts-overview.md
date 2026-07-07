---
title: "Módulo 1: JS/TS para Devs Nativos"
---

# Módulo 1: JS/TS para Devs Nativos


## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_nativo_fundamentos-01_js_ts_overview.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> Você já sabe escrever software. Este módulo mapeia JavaScript e TypeScript para o seu modelo mental existente — da perspectiva de Kotlin ou Swift.

## O Que Este Módulo Cobre

| Aula | O Que Você Vai Aprender |
|------|------------------------|
| [Fundamentos JS](./js-fundamentals) | Variáveis, funções, closures, async/await, módulos — com paralelos Kotlin/Swift |
| [TypeScript para Devs Nativos](./typescript) | Sistema de tipos, interfaces, generics — mapeados a partir dos tipos Kotlin/Swift |

## A Mudança Mental

Vindo de Kotlin ou Swift, o JavaScript vai parecer familiar em alguns aspectos e estranho em outros.

### O Que Se Transfere Diretamente

| Conceito Kotlin / Swift | Equivalente JavaScript |
|-------------------------|----------------------|
| `val` / `let` (imutável) | `const` |
| `var` (mutável) | `let` |
| Lambdas / closures | Arrow functions `() => {}` |
| String interpolation | Template literals `` `Hello ${name}` `` |
| Parâmetros nomeados (Swift) | Destructuring `{ name, age }` |
| Null safety (`?.`, `!!`) | Optional chaining `?.`, nullish coalescing `??` |
| `suspend fun` / `async` | `async/await` |
| Coroutines / Combine | Promises + async/await (coberto em Fundamentos JS) |
| List comprehension | `.map()`, `.filter()`, `.reduce()` |
| Sealed classes | Union types discriminados do TypeScript |
| Data classes | Interfaces / type aliases do TypeScript |

### O Que É Diferente

| Android/iOS | JavaScript |
|-------------|------------|
| Tipagem estática | Tipagem dinâmica (TypeScript adiciona tipos estáticos em cima) |
| Compilado para bytecode nativo | Interpretado (ou compilado AOT pelo Hermes) |
| Null safety estrita em tempo de compilação | Null em tempo de execução por padrão (TypeScript torna estrito) |
| Classes com OOP adequado | Baseado em protótipos; classes são açúcar sintático |
| Gerenciador de pacotes (Gradle/SPM) | npm / yarn / pnpm |
| Ponto de entrada único (main/AppDelegate) | Sistema de módulos — cada arquivo pode ser importado |

:::info TypeScript é seu amigo
Se o sistema de tipos do Kotlin atrai você (o que deveria — é excelente), você vai apreciar o TypeScript. Ative o **strict mode** (`"strict": true` no `tsconfig.json`) e o TypeScript torna-se genuinamente comparável à segurança de tipos do Kotlin.
:::

## Prévia Rápida de Sintaxe

Uma rápida visão das três linguagens lado a lado:

**Definindo uma função:**

```kotlin
// Kotlin
fun greet(name: String): String {
    return "Hello, $name!"
}
```

```swift
// Swift
func greet(name: String) -> String {
    return "Hello, \(name)!"
}
```

```typescript
// TypeScript
function greet(name: string): string {
    return `Hello, ${name}!`;
}
// ou como arrow function:
const greet = (name: string): string => `Hello, ${name}!`;
```

---

**Próximo:** [Fundamentos JS →](./js-fundamentals)
