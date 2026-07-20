---
title: JavaScript para Desenvolvedores Nativos
---

# JavaScript para Desenvolvedores Nativos

## Visão Geral em Vídeo

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_nativo/fund_01_javascript.mp4" type="video/mp4">
  Seu navegador não suporta o elemento de vídeo.
</video>

> Você já sabe escrever software. Este módulo mapeia o JavaScript para o seu modelo mental existente — da perspectiva de quem vem do Kotlin ou Swift.

## A Mudança de Mentalidade

Vindo do Kotlin ou Swift, o JavaScript vai parecer familiar em alguns aspectos e estranho em outros.

### O Que se Transfere Diretamente

| Conceito Kotlin / Swift | Equivalente JavaScript |
|------------------------|----------------------|
| `val` / `let` (imutável) | `const` |
| `var` (mutável) | `let` |
| Lambdas / closures | Arrow functions `() => {}` |
| String interpolation | Template literals `` `Olá ${nome}` `` |
| Parâmetros nomeados (Swift) | Desestruturação `{ nome, idade }` |
| Null safety (`?.`, `!!`) | Optional chaining `?.`, nullish coalescing `??` |
| `suspend fun` / `async` | `async/await` |
| Coroutines / Combine | Promises + async/await |
| List comprehension | `.map()`, `.filter()`, `.reduce()` |
| Sealed classes | Discriminated unions do TypeScript |
| Data classes | Interfaces / type aliases do TypeScript |

### O Que é Diferente

| Android/iOS | JavaScript |
|-------------|------------|
| Tipagem estática | Tipagem dinâmica (TypeScript adiciona tipos estáticos por cima) |
| Compilado para bytecode nativo | Interpretado (ou compilado AOT pelo Hermes) |
| Null safety estrito em tempo de compilação | Null em runtime por padrão (TypeScript torna isso estrito) |
| Classes com OOP real | Baseado em protótipos; classes são açúcar sintático |
| Gerenciador de pacotes (Gradle/SPM) | npm / yarn / pnpm |
| Ponto de entrada único (main/AppDelegate) | Sistema de módulos — qualquer arquivo pode ser importado |

:::info TypeScript é seu aliado
Se o sistema de tipos do Kotlin te agrada, você vai apreciar o TypeScript. Ative o **modo estrito** (`"strict": true` no `tsconfig.json`) e o TypeScript se torna genuinamente comparável à segurança de tipos do Kotlin.
:::

---

## Variáveis: `const`, `let`, nunca `var`

```typescript
const nome = "Alice";      // Kotlin: val nome = "Alice"  — ligação imutável
let contador = 0;          // Kotlin: var contador = 0    — ligação mutável
contador = 1;              // OK
// nome = "Bob";           // Erro — const não pode ser reatribuído
```

:::caution Sempre use const por padrão
Use `const` para tudo. Mude para `let` apenas quando precisar reatribuir. Nunca use `var` — ele tem hoisting de escopo de função que causa bugs sutis.
:::

---

## Tipos: Dinâmico por Padrão, Estático com TypeScript

JavaScript tem tipagem dinâmica. TypeScript adiciona uma camada de tipos em tempo de compilação:

```typescript
// JS puro — sem verificação de tipos
let x = 5;
x = "olá"; // JS válido, mas normalmente um bug

// TypeScript — inferência de tipos
let y = 5;       // TypeScript infere: number
// y = "olá"; // Erro: Type 'string' is not assignable to type 'number'

// TypeScript — anotação explícita
let z: number = 5;
```

**Comparação Kotlin/Swift:**

```kotlin
// Kotlin
var x: Int = 5
// x = "olá" // erro de compilação
```

```swift
// Swift
var x: Int = 5
// x = "olá" // erro de compilação
```

TypeScript com `strict: true` é comparavelmente seguro.

---

## Funções: Três Formas

```typescript
// 1. Declaração de função (hoisted — disponível antes da sua linha)
function somar(a: number, b: number): number {
    return a + b;
}

// 2. Expressão de função
const multiplicar = function(a: number, b: number): number {
    return a * b;
};

// 3. Arrow function (mais comum em React/RN)
const dividir = (a: number, b: number): number => a / b;

// Arrow function multilinhas
const saudar = (nome: string): string => {
    const mensagem = `Olá, ${nome}!`;
    return mensagem;
};
```

**Comparação Kotlin:**
```kotlin
// Função normal
fun somar(a: Int, b: Int): Int = a + b

// Lambda
val multiplicar: (Int, Int) -> Int = { a, b -> a * b }
```

**Comparação Swift:**
```swift
// Função normal
func somar(a: Int, b: Int) -> Int { a + b }

// Closure
let multiplicar: (Int, Int) -> Int = { a, b in a * b }
```

---

## Desestruturação — Os Parâmetros Nomeados do JavaScript

Swift tem parâmetros nomeados de verdade. Kotlin tem desestruturação de data class. JavaScript/TypeScript tem **desestruturação**:

```typescript
// Desestruturação de objeto
const usuario = { nome: "Alice", idade: 30, cidade: "SP" };
const { nome, idade } = usuario;
console.log(nome); // "Alice"

// Com renomeação
const { nome: nomeUsuario } = usuario;
console.log(nomeUsuario); // "Alice"

// Com valor padrão
const { cidade, pais = "Brasil" } = usuario;
console.log(pais); // "Brasil"

// Parâmetros de função — como parâmetros nomeados do Swift
function criarUsuario({ nome, idade }: { nome: string; idade: number }) {
    return `${nome} tem ${idade} anos`;
}
criarUsuario({ nome: "Bob", idade: 25 });

// Desestruturação de array
const [primeiro, segundo, ...resto] = [1, 2, 3, 4, 5];
console.log(primeiro);  // 1
console.log(resto);     // [3, 4, 5]
```

**Comparação Swift:**
```swift
// Parâmetros nomeados
func criarUsuario(nome: String, idade: Int) -> String {
    return "\(nome) tem \(idade) anos"
}
criarUsuario(nome: "Bob", idade: 25)
```

---

## Operador Spread e Rest Parameters

```typescript
// Spread: expande um array ou objeto
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combinado = [...arr1, ...arr2]; // [1, 2, 3, 4, 5, 6]

// Spread de objetos (padrão de atualização imutável — usado em todo React)
const usuario = { nome: "Alice", idade: 30 };
const usuarioAtualizado = { ...usuario, idade: 31 }; // { nome: "Alice", idade: 31 }

// Rest parameters (como varargs no Kotlin)
function somar(...numeros: number[]): number {
    return numeros.reduce((acc, n) => acc + n, 0);
}
somar(1, 2, 3, 4); // 10
```

---

## Arrays: map, filter, reduce

Esses são os cavalos de batalha da renderização em React. Você os usará constantemente.

```typescript
const numeros = [1, 2, 3, 4, 5];

// map — transforma cada elemento (como o map do Kotlin)
const dobrados = numeros.map(n => n * 2);        // [2, 4, 6, 8, 10]

// filter — mantém os elementos correspondentes (como o filter do Kotlin)
const pares = numeros.filter(n => n % 2 === 0);  // [2, 4]

// reduce — agrega (como o fold do Kotlin)
const total = numeros.reduce((soma, n) => soma + n, 0); // 15

// Encadeamento (muito comum em React)
const resultado = numeros
    .filter(n => n > 2)
    .map(n => n * 10);  // [30, 40, 50]
```

**Comparação Kotlin:**
```kotlin
val numeros = listOf(1, 2, 3, 4, 5)
val dobrados = numeros.map { it * 2 }
val pares = numeros.filter { it % 2 == 0 }
val total = numeros.fold(0) { acc, n -> acc + n }
```

---

## Promises — A Base do JS Assíncrono

Antes do `async/await` existiam as Promises. Você as verá constantemente em código de bibliotecas e APIs do RN, então precisa reconhecê-las mesmo preferindo `async/await`.

```typescript
// Uma Promise representa um valor que chegará no futuro
const promise: Promise<User> = buscarUsuario('123');

// .then/.catch — a API explícita de Promise
buscarUsuario('123')
    .then(usuario => {
        console.log(usuario.nome);
        return usuario.email; // retornar de .then encadeia o próximo .then
    })
    .then(email => console.log(email))
    .catch(erro => console.error('Falhou:', erro))
    .finally(() => setCarregando(false)); // sempre executa

// Promise.all — aguarda múltiplas em paralelo (como async/await + structured concurrency)
const [usuario, posts] = await Promise.all([
    buscarUsuario('123'),
    buscarPosts('123'),
]);

// Criando sua própria Promise (encapsulando uma API baseada em callback)
function esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
await esperar(1000); // aguarda 1 segundo
```

`async/await` é açúcar sintático sobre Promises — os dois são intercambiáveis. A maior parte do código moderno usa `async/await`, mas você precisa reconhecer as cadeias `.then()` em código fonte e documentação de bibliotecas.

---

## Async/Await — O Equivalente JS das Coroutines do Kotlin

```typescript
// Uma função que retorna uma Promise (como suspend fun no Kotlin)
async function buscarUsuario(id: string): Promise<User> {
    const resposta = await fetch(`https://api.example.com/users/${id}`);
    const dados = await resposta.json();
    return dados as User;
}

// Chamando ela
async function carregarPerfil() {
    try {
        const usuario = await buscarUsuario("123");
        console.log(usuario.nome);
    } catch (erro) {
        console.error("Falha ao buscar usuário:", erro);
    }
}
```

**Comparação com coroutines Kotlin:**
```kotlin
// Kotlin
suspend fun buscarUsuario(id: String): User {
    val resposta = httpClient.get("https://api.example.com/users/$id")
    return resposta.body<User>()
}

suspend fun carregarPerfil() {
    try {
        val usuario = buscarUsuario("123")
        println(usuario.nome)
    } catch (e: Exception) {
        println("Falhou: ${e.message}")
    }
}
```

O modelo mental é idêntico — `async/await` em JS é diretamente análogo ao `suspend fun` no Kotlin.

---

## O Modelo de Thread do JavaScript — Crítico para Devs Mobile

Esta é a maior mudança de modelo mental vinda do desenvolvimento nativo:

**O JavaScript no React Native roda em uma única thread.** Não existe `Dispatchers.IO`, nem `DispatchQueue.global()`, nem pool de threads em background que você possa iniciar a partir do JS.

```typescript
// Isso bloqueia a thread JS — animações travam, toques se perdem
function processarDatasetGrande(dados: number[]) {
    // 10.000 operações síncronas — JS não consegue fazer mais nada enquanto isso roda
    return dados.map(n => computacaoPesada(n));
}

// Melhor — dividir o trabalho em múltiplos ticks do event loop
async function processarEmPedacos(dados: number[]) {
    const PEDACO = 100;
    const resultados: number[] = [];
    for (let i = 0; i < dados.length; i += PEDACO) {
        const pedaco = dados.slice(i, i + PEDACO);
        resultados.push(...pedaco.map(n => computacaoPesada(n)));
        await esperar(0); // cede para o event loop entre os pedaços
    }
    return resultados;
}
```

| Nativo | React Native JS |
|--------|----------------|
| `Dispatchers.IO` / `DispatchQueue.global()` | Não existe — async/await ainda é single-threaded |
| `Dispatchers.Main` / `DispatchQueue.main` | A thread JS (única thread) |
| `Thread.sleep()` | `await esperar(ms)` (não bloqueante) |
| Trabalho pesado em background | Worklets (Reanimated), módulos nativos ou `runOnJS` |

:::info Por que async/await não é multi-threaded
`await` suspende a função atual e deixa outro código rodar — ele não move o trabalho para outra thread. `fetch()` é não-bloqueante porque o I/O de rede real acontece em uma thread nativa; o JS apenas aguarda o resultado. Trabalho pesado de CPU ainda bloqueia.
:::

---

## Módulos: import/export

Diferente do sistema de classpath do Android ou do sistema de módulos do Swift, o JavaScript usa **ES modules**:

```typescript
// math.ts — exports nomeados
export const PI = 3.14159;
export function somar(a: number, b: number) { return a + b; }
export function multiplicar(a: number, b: number) { return a * b; }

// Export padrão (um por arquivo)
export default function subtrair(a: number, b: number) { return a - b; }
```

```typescript
// app.ts — importando
import subtrair from './math';              // import padrão
import { somar, PI } from './math';         // imports nomeados
import { multiplicar as mult } from './math'; // renomear no import
import * as MathUtils from './math';        // importar tudo como namespace
```

---

## Closures — O Conceito-Chave do JavaScript

Closures são funções que "lembram" as variáveis do escopo onde foram criadas. Isso é fundamental para os hooks do React.

```typescript
function criarContador(inicio: number) {
    let contador = inicio; // essa variável está "fechada" na closure

    return {
        incrementar: () => ++contador,
        decrementar: () => --contador,
        valor: () => contador,
    };
}

const contador = criarContador(10);
contador.incrementar(); // 11
contador.incrementar(); // 12
contador.decrementar(); // 11
contador.valor();       // 11
```

No React Native, você verá closures em event handlers constantemente:

```tsx
function MeuBotao() {
    const [contagem, setContagem] = useState(0);

    // Essa função fecha sobre `contagem` e `setContagem`
    const aoPresionar = () => {
        setContagem(contagem + 1); // `contagem` vem do escopo envolvente
    };

    return <Button onPress={aoPresionar} title={`Pressionado ${contagem} vezes`} />;
}
```

---

## Exercícios

1. **Converta este Kotlin para TypeScript:**
   ```kotlin
   data class Produto(val nome: String, val preco: Double, val emEstoque: Boolean)
   fun filtrarAcessiveis(produtos: List<Produto>, precoMax: Double) =
       produtos.filter { it.preco <= precoMax && it.emEstoque }
   ```

2. **Escreva uma função async** que busca dados de `https://jsonplaceholder.typicode.com/todos/1`, extrai o campo `title` e o retorna como string.

3. **Use desestruturação** para extrair `street`, `city` e `zip` deste objeto aninhado:
   ```typescript
   const pessoa = { nome: "Alice", endereco: { street: "Rua Principal 123", city: "SP", zip: "01310-100" } };
   ```

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| javascript.info | Tutorial Interativo | [javascript.info](https://javascript.info) |
| MDN JavaScript Reference | Documentação Oficial | [developer.mozilla.org/pt-BR/docs/Web/JavaScript](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript) |
| Scrimba — Learn JavaScript | Curso Interativo | [scrimba.com/learn/learnjavascript](https://scrimba.com/learn/learnjavascript) |
| TypeScript Playground | Interativo | [typescriptlang.org/play](https://www.typescriptlang.org/play/) |

---

Próximo → **[TypeScript para Desenvolvedores Nativos](./typescript)**
