---
title: Fundamentos de JavaScript para Devs Nativos
---

# Fundamentos de JavaScript para Devs Nativos

> Um tour focado no JS — contado da perspectiva de quem já escreve Kotlin ou Swift.

## Variáveis: `const`, `let`, nunca `var`

```typescript
const name = "Alice";       // Kotlin: val name = "Alice"  — binding imutável
let count = 0;              // Kotlin: var count = 0        — binding mutável
count = 1;                  // OK
// name = "Bob";            // Erro — const não pode ser reatribuído
```

:::caution Sempre use const por padrão
Use `const` para tudo. Mude para `let` apenas quando precisar reatribuir. Nunca use `var` — ele tem hoisting com escopo de função que causa bugs sutis.
:::

---

## Tipos: Dinâmico por Padrão, Estático com TypeScript

JavaScript é tipado dinamicamente. TypeScript adiciona uma camada de tipo em tempo de compilação:

```typescript
// JS puro — sem verificação de tipos
let x = 5;
x = "hello"; // JS válido, mas geralmente um bug

// TypeScript — inferência de tipo
let y = 5;       // TypeScript infere: number
// y = "hello"; // Erro: Type 'string' is not assignable to type 'number'

// TypeScript — anotação explícita
let z: number = 5;
```

**Comparação Kotlin/Swift:**

```kotlin
// Kotlin
var x: Int = 5
// x = "hello" // erro de compilação
```

```swift
// Swift
var x: Int = 5
// x = "hello" // erro de compilação
```

TypeScript com `strict: true` é comparavelmente seguro.

---

## Funções: Três Formas

```typescript
// 1. Declaração de função (hoisted — disponível antes da sua linha)
function add(a: number, b: number): number {
    return a + b;
}

// 2. Expressão de função
const multiply = function(a: number, b: number): number {
    return a * b;
};

// 3. Arrow function (mais comum em React/RN)
const divide = (a: number, b: number): number => a / b;

// Arrow function multi-linha
const greet = (name: string): string => {
    const message = `Hello, ${name}!`;
    return message;
};
```

**Comparação Kotlin:**
```kotlin
// Função regular
fun add(a: Int, b: Int): Int = a + b

// Lambda
val multiply: (Int, Int) -> Int = { a, b -> a * b }
```

**Comparação Swift:**
```swift
// Função regular
func add(a: Int, b: Int) -> Int { a + b }

// Closure
let multiply: (Int, Int) -> Int = { a, b in a * b }
```

---

## Destructuring — Parâmetros Nomeados do JavaScript

Swift tem parâmetros nomeados adequados. Kotlin tem destructuring de data class. JavaScript/TypeScript tem **destructuring**:

```typescript
// Destructuring de objeto
const user = { name: "Alice", age: 30, city: "NYC" };
const { name, age } = user;
console.log(name); // "Alice"

// Com renomeação
const { name: userName } = user;
console.log(userName); // "Alice"

// Com valor padrão
const { city, country = "USA" } = user;
console.log(country); // "USA"

// Parâmetros de função — como parâmetros nomeados do Swift
function createUser({ name, age }: { name: string; age: number }) {
    return `${name} is ${age}`;
}
createUser({ name: "Bob", age: 25 });

// Destructuring de array
const [first, second, ...rest] = [1, 2, 3, 4, 5];
console.log(first);  // 1
console.log(rest);   // [3, 4, 5]
```

**Comparação Swift:**
```swift
// Parâmetros nomeados
func createUser(name: String, age: Int) -> String {
    return "\(name) is \(age)"
}
createUser(name: "Bob", age: 25)
```

---

## Operador Spread & Parâmetros Rest

```typescript
// Spread: expandir um array ou objeto
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2]; // [1, 2, 3, 4, 5, 6]

// Spread em objetos (padrão de atualização imutável — usado em todo lugar no React)
const user = { name: "Alice", age: 30 };
const updatedUser = { ...user, age: 31 }; // { name: "Alice", age: 31 }

// Parâmetros rest (como varargs no Kotlin)
function sum(...numbers: number[]): number {
    return numbers.reduce((acc, n) => acc + n, 0);
}
sum(1, 2, 3, 4); // 10
```

---

## Arrays: map, filter, reduce

São os cavalos de batalha da renderização React. Você os usará constantemente.

```typescript
const numbers = [1, 2, 3, 4, 5];

// map — transforma cada elemento (como o map do Kotlin)
const doubled = numbers.map(n => n * 2);       // [2, 4, 6, 8, 10]

// filter — mantém elementos que correspondem (como o filter do Kotlin)
const evens = numbers.filter(n => n % 2 === 0); // [2, 4]

// reduce — agrega (como o fold do Kotlin)
const total = numbers.reduce((sum, n) => sum + n, 0); // 15

// Encadeamento (muito comum em React)
const result = numbers
    .filter(n => n > 2)
    .map(n => n * 10);  // [30, 40, 50]
```

**Comparação Kotlin:**
```kotlin
val numbers = listOf(1, 2, 3, 4, 5)
val doubled = numbers.map { it * 2 }
val evens = numbers.filter { it % 2 == 0 }
val total = numbers.fold(0) { acc, n -> acc + n }
```

---

## Promises — A Base do JS Assíncrono

Antes do `async/await` existiam as Promises. Você as verá constantemente no código de bibliotecas e APIs RN, então precisa reconhecê-las mesmo preferindo `async/await`.

```typescript
// Uma Promise representa um valor que chegará no futuro
const promise: Promise<User> = fetchUser('123');

// .then/.catch — a API explícita de Promises
fetchUser('123')
    .then(user => {
        console.log(user.name);
        return user.email; // retornar de .then encadeia o próximo .then
    })
    .then(email => console.log(email))
    .catch(error => console.error('Falhou:', error))
    .finally(() => setLoading(false)); // sempre executa

// Promise.all — aguardar múltiplos em paralelo
const [user, posts] = await Promise.all([
    fetchUser('123'),
    fetchPosts('123'),
]);

// Criando sua própria Promise (encapsulando uma API baseada em callback)
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
await delay(1000); // aguarda 1 segundo
```

`async/await` é açúcar sintático sobre Promises — os dois são intercambiáveis. A maioria do código moderno usa `async/await`, mas você deve reconhecer cadeias `.then()` no código-fonte de bibliotecas e documentação.

---

## Async/Await — O Equivalente JS das Coroutines do Kotlin

```typescript
// Uma função que retorna uma Promise (como suspend fun do Kotlin)
async function fetchUser(id: string): Promise<User> {
    const response = await fetch(`https://api.example.com/users/${id}`);
    const data = await response.json();
    return data as User;
}

// Chamando ela
async function loadProfile() {
    try {
        const user = await fetchUser("123");
        console.log(user.name);
    } catch (error) {
        console.error("Falhou ao buscar usuário:", error);
    }
}
```

**Comparação com coroutines Kotlin:**
```kotlin
// Kotlin
suspend fun fetchUser(id: String): User {
    val response = httpClient.get("https://api.example.com/users/$id")
    return response.body<User>()
}

suspend fun loadProfile() {
    try {
        val user = fetchUser("123")
        println(user.name)
    } catch (e: Exception) {
        println("Falhou: ${e.message}")
    }
}
```

O modelo mental é idêntico — `async/await` em JS é diretamente análogo a `suspend fun` no Kotlin.

---

## O Modelo de Thread JavaScript — Crítico para Devs Mobile

Esta é a maior mudança de modelo mental em relação ao desenvolvimento nativo:

**JavaScript no React Native roda em uma única thread.** Não existe `Dispatchers.IO`, nem `DispatchQueue.global()`, nenhum pool de threads em background que você pode criar a partir do JS.

```typescript
// Isso bloqueia a thread JS — animações travam, toques são perdidos
function processLargeDataset(data: number[]) {
    // 10.000 operações síncronas — o JS não pode fazer mais nada enquanto isso roda
    return data.map(n => heavyComputation(n));
}

// Melhor — dividir o trabalho em múltiplos ticks do event loop
async function processInChunks(data: number[]) {
    const CHUNK = 100;
    const results: number[] = [];
    for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        results.push(...chunk.map(n => heavyComputation(n)));
        await delay(0); // cede para o event loop entre os chunks
    }
    return results;
}
```

| Nativo | JS React Native |
|--------|----------------|
| `Dispatchers.IO` / `DispatchQueue.global()` | Não existe — async/await ainda é single-threaded |
| `Dispatchers.Main` / `DispatchQueue.main` | A thread JS (única thread) |
| `Thread.sleep()` | `await delay(ms)` (non-blocking) |
| Trabalho pesado em background | Worklets (Reanimated), módulos nativos ou `runOnJS` |

:::info Por que async/await não é multi-threaded
`await` suspende a função atual e permite que outro código rode — não move o trabalho para outra thread. `fetch()` é non-blocking porque o I/O de rede real acontece em uma thread nativa; o JS apenas aguarda o resultado. Trabalho pesado de CPU ainda bloqueia.
:::

---

## Módulos: import/export

Diferente do sistema de caminho de classes do Android ou do sistema de módulos do Swift, JavaScript usa **ES modules**:

```typescript
// math.ts — exports nomeados
export const PI = 3.14159;
export function add(a: number, b: number) { return a + b; }
export function multiply(a: number, b: number) { return a * b; }

// Export padrão (um por arquivo)
export default function subtract(a: number, b: number) { return a - b; }
```

```typescript
// app.ts — importando
import subtract from './math';           // import padrão
import { add, PI } from './math';        // imports nomeados
import { multiply as mult } from './math'; // renomear no import
import * as MathUtils from './math';     // importar tudo como namespace
```

---

## Closures — O Conceito-Chave do JavaScript

Closures são funções que "lembram" as variáveis do escopo onde foram criadas. Isso é fundamental para os hooks do React.

```typescript
function makeCounter(start: number) {
    let count = start; // essa variável é "fechada"

    return {
        increment: () => ++count,
        decrement: () => --count,
        value: () => count,
    };
}

const counter = makeCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.decrement(); // 11
counter.value();     // 11
```

No React Native, você verá closures em event handlers constantemente:

```tsx
function MyButton() {
    const [count, setCount] = useState(0);

    // Essa função fecha sobre `count` e `setCount`
    const handlePress = () => {
        setCount(count + 1); // `count` do escopo envolvente
    };

    return <Button onPress={handlePress} title={`Pressionado ${count} vezes`} />;
}
```

---

## Exercícios

1. **Converta este Kotlin para TypeScript:**
   ```kotlin
   data class Product(val name: String, val price: Double, val inStock: Boolean)
   fun filterAffordable(products: List<Product>, maxPrice: Double) =
       products.filter { it.price <= maxPrice && it.inStock }
   ```

2. **Escreva uma função async** que busca dados de `https://jsonplaceholder.typicode.com/todos/1`, extrai o campo `title` e o retorna como string.

3. **Use destructuring** para extrair `street`, `city` e `zip` deste objeto aninhado:
   ```typescript
   const person = { name: "Alice", address: { street: "123 Main St", city: "NYC", zip: "10001" } };
   ```

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| javascript.info | Tutorial Interativo | [javascript.info](https://javascript.info) |
| MDN JavaScript Reference | Docs Oficiais | [developer.mozilla.org/pt-BR/docs/Web/JavaScript](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript) |
| Scrimba — Learn JavaScript | Curso Interativo | [scrimba.com/learn/learnjavascript](https://scrimba.com/learn/learnjavascript) |
| TypeScript Playground | Interativo | [typescriptlang.org/play](https://www.typescriptlang.org/play/) |

---

Próximo → **[TypeScript para Devs Nativos](./typescript)**
