---
title: "JavaScript para Desenvolvedores Android"
sidebar_label: "JavaScript"
sidebar_position: 1
---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_android/fund_01_javascript.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Video Overview

> Video para este tópico em breve.

## Voce Ja Sabe Escrever Software

JavaScript vai parecer estranho no começo — não porque seja difícil, mas porque quebra suposições que você construiu ao longo de anos desenvolvendo em Kotlin. Este arquivo mapeia cada conceito central do JS para o que você já conhece do Kotlin, para que você pule a fase do "o que isso faz mesmo?" e vá direto para construir.

---

## Variáveis: val/var → const/let

```kotlin
val name = "Guilherme"   // imutável
var age = 30             // mutável
```

```js
const name = "Guilherme"; // referência imutável
let age = 30;             // mutável
```

> **Nunca use `var`** no JavaScript moderno. Ele tem escopo de função (não de bloco) e comportamento de hoisting que causa bugs sutis. `const` e `let` são sempre a escolha certa.

`const` **não** significa que o valor é profundamente imutável — significa que a ligação da variável não pode ser reatribuída. Objetos e arrays declarados com `const` ainda podem ser mutados:

```js
const user = { name: "Guilherme" };
user.name = "Gui"; // válido — a ligação não mudou, o objeto sim
user = {};         // TypeError — a ligação não pode ser reatribuída
```

Isso é similar ao `val` do Kotlin apontando para uma instância de data class mutável.

---

## Tipos: Dinâmico por Padrão

Kotlin é estaticamente tipado. JavaScript é dinamicamente tipado — o tipo de uma variável é determinado em tempo de execução, não em tempo de compilação. TypeScript (abordado no próximo tópico) adiciona tipos estáticos por cima.

```js
let x = 42;       // x é um número
x = "hello";      // agora x é uma string — JavaScript permite isso
x = true;         // agora x é um booleano — ainda permitido
```

### Os 8 Tipos Primitivos

| Tipo JavaScript | Equivalente Kotlin        | Observações |
|-----------------|---------------------------|-------------|
| `number`        | `Int`, `Long`, `Double`   | Todos os números são floats de 64 bits |
| `string`        | `String`                  | Imutável, template literals com backticks |
| `boolean`       | `Boolean`                 | `true` / `false` |
| `null`          | `null`                    | Ausência intencional de valor |
| `undefined`     | Sem equivalente           | Variável declarada mas não atribuída |
| `bigint`        | `Long` (aproximado)       | Inteiros maiores que 2^53 |
| `symbol`        | Sem equivalente           | Identificadores únicos |
| `object`        | `Any` (aproximado)        | Todo o resto (arrays, funções, objetos) |

> **`undefined` vs `null`**: Kotlin tem apenas `null`. JavaScript tem os dois. `undefined` significa "esta variável nunca recebeu um valor". `null` significa "isso foi explicitamente definido como nada". Na prática: use `null` intencionalmente, trate `undefined` como "algo deu errado".

---

## Funções: Três Sintaxes

### Declaração de Função (sofre hoisting)

```js
function add(a, b) {
  return a + b;
}
```

### Expressão de Função (não sofre hoisting)

```js
const add = function(a, b) {
  return a + b;
};
```

### Arrow Function (mais comum no React Native)

```js
const add = (a, b) => a + b;         // retorno implícito
const greet = (name) => {
  const msg = `Hello, ${name}`;
  return msg;                         // retorno explícito necessário com chaves
};
```

Arrow functions **não** têm seu próprio `this` — exatamente por isso são preferidas no React: um callback passado como prop usa o contexto do escopo ao redor, não o do receptor.

```kotlin
// Lambda Kotlin — mesma ideia
val add: (Int, Int) -> Int = { a, b -> a + b }
```

### Parâmetros Padrão

```js
function createUser(name, role = "viewer") {
  return { name, role };
}
createUser("Gui");           // { name: "Gui", role: "viewer" }
createUser("Gui", "admin");  // { name: "Gui", role: "admin" }
```

```kotlin
fun createUser(name: String, role: String = "viewer") = User(name, role)
```

---

## Template Literals

```js
const name = "Guilherme";
const msg = `Hello, ${name}! You have ${3 + 4} messages.`;
// "Hello, Guilherme! You have 7 messages."
```

```kotlin
val msg = "Hello, $name! You have ${3 + 4} messages."
```

Quase idêntico — backticks em vez de aspas duplas, `${}` sempre (sem o atalho `$name` simples).

---

## Desestruturação

Um dos padrões mais usados no código React Native.

### Desestruturação de Objetos

```js
const user = { name: "Gui", age: 30, role: "admin" };

// Sem desestruturação
const name = user.name;
const age = user.age;

// Com desestruturação
const { name, age } = user;

// Renomear ao desestruturar
const { name: userName } = user;

// Valores padrão
const { role = "viewer" } = user;
```

```kotlin
// Desestruturação de data class Kotlin
val (name, age) = user  // posicional, não por nome
```

A desestruturação em JS é **por nome** (pela chave da propriedade), não posicional como o `componentN()` do Kotlin.

### Desestruturação de Arrays

```js
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]
```

É assim que o `useState` funciona:

```js
const [count, setCount] = useState(0);
// useState retorna [valor, setter] — você os nomeia via desestruturação
```

### Desestruturação em Parâmetros de Função

```js
// Sem desestruturação
function greet(props) {
  return `Hello, ${props.name}`;
}

// Com desestruturação — o padrão React Native
function greet({ name, age = 0 }) {
  return `Hello, ${name}, age ${age}`;
}
```

---

## Operador Spread

```js
// Arrays
const a = [1, 2, 3];
const b = [...a, 4, 5]; // [1, 2, 3, 4, 5]

// Objetos — merge superficial
const base = { color: "blue", size: 16 };
const override = { ...base, color: "red" }; // { color: "red", size: 16 }
```

```kotlin
// Equivalente aproximado em Kotlin
val override = base.copy(color = "red")
```

O spread está em todo lugar no React Native — combinando estilos, atualizando objetos de estado, repassando props.

---

## Métodos de Array: O Núcleo Funcional

Você usa as funções de coleção do Kotlin todos os dias. Estes são os equivalentes exatos:

| Kotlin               | JavaScript               | O que faz                           |
|----------------------|--------------------------|-------------------------------------|
| `.map { }`           | `.map(x => ...)`         | Transforma cada elemento            |
| `.filter { }`        | `.filter(x => ...)`      | Mantém elementos que atendem ao predicado |
| `.find { }`          | `.find(x => ...)`        | Primeiro match ou `undefined`       |
| `.any { }`           | `.some(x => ...)`        | True se algum elemento corresponder |
| `.all { }`           | `.every(x => ...)`       | True se todos os elementos corresponderem |
| `.none { }`          | `!.some(x => ...)`       | True se nenhum elemento corresponder |
| `.reduce { acc, x }` | `.reduce((acc, x) => ...)` | Acumula em um único valor         |
| `.flatMap { }`       | `.flatMap(x => ...)`     | Mapeia e depois achata um nível     |
| `.forEach { }`       | `.forEach(x => ...)`     | Apenas efeitos colaterais, sem valor de retorno |

```js
const users = [
  { name: "Gui", active: true, score: 42 },
  { name: "Ana", active: false, score: 88 },
  { name: "Leo", active: true, score: 15 },
];

// Kotlin: users.filter { it.active }.map { it.name }
const activeNames = users
  .filter(u => u.active)
  .map(u => u.name);
// ["Gui", "Leo"]

// Kotlin: users.maxByOrNull { it.score }?.name
const topUser = users.reduce((best, u) => u.score > best.score ? u : best).name;
// "Ana"
```

---

## Objetos: Literais e Shorthand

```js
const name = "Gui";
const age = 30;

// Forma longa
const user = { name: name, age: age };

// Shorthand — quando o nome da variável coincide com a chave
const user = { name, age };

// Chaves de propriedade computadas
const key = "role";
const user = { name, [key]: "admin" }; // { name: "Gui", role: "admin" }

// Métodos
const greeter = {
  name: "Gui",
  greet() { return `Hi, I'm ${this.name}`; },
  greetArrow: () => `Hi`, // 'this' NÃO é o objeto aqui — cuidado
};
```

---

## Módulos: import / export

Os módulos JavaScript substituem o sistema de pacotes do Kotlin.

```js
// math.js — exports nomeados
export function add(a, b) { return a + b; }
export const PI = 3.14159;

// user.js — export padrão (um por arquivo)
export default class User { ... }

// main.js — importando
import { add, PI } from './math';       // nomeado
import User from './user';              // padrão
import * as MathUtils from './math';    // import de namespace
```

```kotlin
// Kotlin — sem export explícito, visibilidade em nível de pacote
import com.app.math.add
import com.app.math.PI
```

> React Native usa **CommonJS** (`require`/`module.exports`) em alguns arquivos de configuração e **ES Modules** (`import`/`export`) no código da aplicação. Você verá os dois. Prefira `import`/`export` nos seus próprios arquivos.

---

## Truthy e Falsy

JavaScript converte valores para booleano em condições. Isso é diferente do Kotlin, onde apenas `Boolean` é válido em um `if`.

**Valores falsy** (tratados como `false`): `false`, `0`, `""`, `null`, `undefined`, `NaN`

**Todo o resto** é truthy — incluindo arrays vazios `[]` e objetos vazios `{}`.

```js
if (user) { ... }          // seguro: null/undefined são falsy
if (items.length) { ... }  // true se o array não estiver vazio
if (!name) { ... }         // true se name for "", null ou undefined
```

Esse padrão aparece constantemente no JSX do React Native:

```jsx
{items.length > 0 && <List items={items} />}
// Não escreva: {items.length && <List />} — renderiza "0" quando vazio!
```

---

## Optional Chaining e Nullish Coalescing

```js
// Optional chaining — igual ao ?. do Kotlin
const city = user?.address?.city;    // undefined se algum passo for null/undefined

// Nullish coalescing — igual ao ?: do Kotlin
const name = user?.name ?? "Guest";  // "Guest" se null ou undefined

// Combinados
const zip = user?.address?.zip ?? "00000";
```

```kotlin
val city = user?.address?.city
val name = user?.name ?: "Guest"
```

Semântica idêntica. Uma diferença: `??` só curto-circuita em `null`/`undefined`, não em valores falsy como `0` ou `""`. O `?:` do Kotlin também só curto-circuita em `null`.

---

## Closures

Uma closure é uma função que "captura" variáveis do escopo ao redor. Esse é o mecanismo por trás dos hooks do React.

```js
function makeCounter(start) {
  let count = start; // esta variável é capturada

  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}

const counter = makeCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.value();     // 12
```

```kotlin
fun makeCounter(start: Int): Triple<() -> Int, () -> Int, () -> Int> {
    var count = start
    return Triple({ ++count }, { --count }, { count })
}
```

Quando você escreve `useEffect(() => { ... }, [count])`, o callback "captura" o valor atual de `count`. Se `count` mudar e você não redeclarar o effect com a nova dependência, o callback ainda enxerga o valor antigo — esse é o problema de stale closure.

---

## Materiais de Estudo

### Documentação Oficial

- [MDN — Guia JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) — a referência JS mais confiável
- [MDN — Desestruturação](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)
- [MDN — Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN — Métodos de Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [javascript.info](https://javascript.info/) — guia JS interativo e completo

### Interativo

- [freeCodeCamp — JavaScript Algorithms and Data Structures](https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/) — exercícios práticos
- [Exercism — JavaScript Track](https://exercism.org/tracks/javascript) — prática com mentoria

### Videos

- [Fireship — JavaScript in 100 Seconds](https://www.youtube.com/watch?v=DHjqpvDnNGE)
- [Traversy Media — JavaScript Crash Course](https://www.youtube.com/watch?v=hdI2bqOjy3c)

---

## Próximos Passos

Você entende os fundamentos do JavaScript. Próximo: TypeScript — como o sistema de tipos do Kotlin se mapeia para o TypeScript, e como escrever código React Native com tipagem segura.

➡ [TypeScript para Desenvolvedores Kotlin](./02-typescript-for-kotlin-devs)
