---
title: Swift to JavaScript — Core Language Concepts
---

# Swift to JavaScript — Conceitos Fundamentais da Linguagem

Se você escreve Swift para iOS, já pensa em termos de segurança de tipos, semântica de valor e tratamento estruturado de erros. JavaScript compartilha muitos desses mesmos conceitos, mas os expressa de forma diferente — e o TypeScript traz de volta as garantias de tipo nas quais você confia no Swift. Este módulo mapeia diretamente o seu conhecimento de Swift para JavaScript, para que você possa ler e escrever código React Native com confiança desde o primeiro dia.

---

## Variáveis: `let` e `var` (e `const`)

Swift usa `let` para constantes e `var` para variáveis mutáveis. JavaScript tem três palavras-chave: `const`, `let` e `var`. Trate `var` como legado — o JavaScript moderno (ES2015+) e todo código React Native usa exclusivamente `const` e `let`.

| Swift | JavaScript | Significado |
|---|---|---|
| `let` | `const` | Vínculo imutável |
| `var` | `let` | Vínculo mutável |

```swift
// Swift
let appName = "MyApp"
var counter = 0
counter += 1
```

```js
// JavaScript
const appName = "MyApp";
let counter = 0;
counter += 1;
```

:::info const não significa imutabilidade profunda
Em JavaScript, `const` impede a reatribuição do vínculo da variável, mas não congela o objeto para o qual ela aponta. Um array ou objeto declarado com `const` ainda pode ter seu conteúdo mutado. Isso é diferente do `let` do Swift em uma struct, que torna todas as propriedades imutáveis.
:::

---

## Inferência de Tipos

Tanto Swift quanto JavaScript inferem tipos a partir do valor atribuído. A diferença é que Swift aplica o tipo inferido em tempo de compilação, enquanto JavaScript é tipado dinamicamente em tempo de execução.

```swift
// Swift — o compilador infere String, Int, Double
let name = "Alice"     // String
let age = 30           // Int
let score = 98.6       // Double
```

```js
// JavaScript — a engine infere em tempo de execução, o tipo pode mudar
let name = "Alice";    // string
let age = 30;          // number (sem Int/Double separados)
let score = 98.6;      // number
```

:::tip Use TypeScript em projetos React Native
Projetos React Native criados com Expo ou o React Native CLI usam TypeScript por padrão. Com TypeScript você obtém as garantias em tempo de compilação que desenvolvedores Swift esperam: `const name: string = "Alice"` vai capturar incompatibilidades de tipo antes que o app execute.
:::

---

## Opcionais vs `null` e `undefined`

O sistema de opcionais do Swift (`T?`) é uma de suas características mais distintas. JavaScript tem dois primitivos de "ausência de valor": `null` (ausência explícita) e `undefined` (valor que nunca foi definido). Não há desempacotamento de opcional forçado pelo compilador, mas a linguagem oferece operadores que se comportam como a sintaxe de opcionais do Swift.

```swift
// Swift
var username: String? = nil
username = "alice"

if let name = username {
    print("Hello, \(name)")
}
```

```js
// JavaScript
let username = null;
username = "alice";

if (username !== null && username !== undefined) {
    console.log(`Hello, ${username}`);
}
```

---

## Encadeamento Opcional (`?.`)

Swift usa `?.` para percorrer com segurança uma cadeia de opcionais. JavaScript tem o mesmo operador com sintaxe idêntica.

```swift
// Swift
let city = user?.address?.city
```

```js
// JavaScript
const city = user?.address?.city;
```

Se qualquer elo da cadeia for `null` ou `undefined`, a expressão é encerrada antecipadamente e retorna `undefined` em vez de lançar um erro em tempo de execução. O comportamento é funcionalmente idêntico ao do Swift.

---

## Nil Coalescing (`??`)

O operador `??` do Swift fornece um valor padrão quando um opcional é `nil`. O `??` do JavaScript (coalescência nula) faz exatamente a mesma coisa, retornando o lado direito quando o lado esquerdo é `null` ou `undefined`.

```swift
// Swift
let displayName = username ?? "Guest"
```

```js
// JavaScript
const displayName = username ?? "Guest";
```

:::tip ?? vs || em JavaScript
Desenvolvedores JavaScript às vezes usam `||` como operador de fallback, mas ele trata qualquer valor falsy (`0`, `""`, `false`) como ausente. Use `??` quando quiser usar o fallback apenas em `null` ou `undefined`, o que corresponde ao comportamento do nil-coalescing do Swift.
:::

---

## Guard Let → Retorno Antecipado

O `guard let` do Swift sai do escopo atual cedo se uma condição não for atendida, mantendo o caminho feliz sem indentação excessiva. JavaScript não tem a palavra-chave `guard`, mas o mesmo padrão é escrito como um `return` antecipado explícito.

```swift
// Swift
func processUser(_ user: User?) {
    guard let user = user else { return }
    guard user.isActive else { return }
    // caminho feliz — user é não-nulo e ativo
    render(user)
}
```

```js
// JavaScript
function processUser(user) {
    if (user == null) return;
    if (!user.isActive) return;
    // caminho feliz
    render(user);
}
```

O padrão é idêntico; apenas a sintaxe difere. Em React Native você usará retornos antecipados extensivamente dentro de manipuladores de eventos e funções de renderização de componentes.

---

## Interpolação de Strings → Template Literals

Swift usa `\()` dentro de um literal de string para interpolação. JavaScript usa strings com backtick e `${}`.

```swift
// Swift
let greeting = "Hello, \(name). You are \(age) years old."
```

```js
// JavaScript
const greeting = `Hello, ${name}. You are ${age} years old.`;
```

Qualquer expressão JavaScript — chamadas de função, ternários, operações aritméticas — pode aparecer dentro de `${}`.

```js
const label = `Items: ${cart.length > 0 ? cart.length : "none"}`;
```

---

## Closures → Arrow Functions

Closures do Swift e arrow functions do JavaScript servem ao mesmo propósito: valores de função anônimos e de primeira classe que capturam o escopo ao redor.

```swift
// Swift — sintaxe de trailing closure
let doubled = numbers.map { $0 * 2 }

let greet: (String) -> String = { name in
    return "Hello, \(name)"
}
```

```js
// JavaScript — arrow function
const doubled = numbers.map(n => n * 2);

const greet = (name) => {
    return `Hello, ${name}`;
};

// forma abreviada de expressão única (retorno implícito)
const greet = name => `Hello, ${name}`;
```

:::info Capturando `this` vs capturando `self`
Closures do Swift capturam `self` explicitamente quando necessário. Arrow functions do JavaScript capturam o `this` léxico do escopo em que estão inseridas, razão pela qual componentes React usam arrow functions para manipuladores de eventos — elas evitam os clássicos bugs de vinculação de `this` da sintaxe `function` mais antiga.
:::

---

## Métodos de Array e Coleções

O `Array` do Swift e os arrays JavaScript compartilham `map`, `filter` e `reduce` com assinaturas quase idênticas.

### map

```swift
// Swift
let names = ["alice", "bob"]
let uppercased = names.map { $0.uppercased() }
// ["ALICE", "BOB"]
```

```js
// JavaScript
const names = ["alice", "bob"];
const uppercased = names.map(n => n.toUpperCase());
// ["ALICE", "BOB"]
```

### filter

```swift
// Swift
let scores = [45, 80, 92, 60]
let passing = scores.filter { $0 >= 70 }
// [80, 92]
```

```js
// JavaScript
const scores = [45, 80, 92, 60];
const passing = scores.filter(s => s >= 70);
// [80, 92]
```

### reduce

```swift
// Swift
let total = scores.reduce(0) { $0 + $1 }
// 277
```

```js
// JavaScript
const total = scores.reduce((acc, s) => acc + s, 0);
// 277
```

JavaScript também expõe `find` (como o `first(where:)` do Swift), `some` (como o `contains(where:)` do Swift), `every` (como o `allSatisfy` do Swift) e `flatMap`.

---

## Dicionários → Objetos Simples e `Map`

O dicionário `[String: Any]` do Swift mapeia diretamente para um objeto simples JavaScript. Para coleções com chave, ordem de inserção garantida e chaves não-string, JavaScript também tem `Map`.

```swift
// Swift
var config: [String: Any] = [
    "theme": "dark",
    "fontSize": 16
]
let theme = config["theme"] as? String ?? "light"
```

```js
// JavaScript
const config = {
    theme: "dark",
    fontSize: 16,
};
const theme = config.theme ?? "light";
// ou: config["theme"] ?? "light"  — notação de colchetes também funciona
```

---

## Enums Swift → Objetos JavaScript (e Enums TypeScript)

Enums Swift são tipos de primeira classe com valores associados e métodos. JavaScript não tem um tipo enum nativo. O padrão convencional é um objeto congelado usado como namespace para constantes.

```swift
// Swift
enum Direction {
    case north, south, east, west
}

let heading = Direction.north
```

```js
// JavaScript — padrão de objeto como enum
const Direction = Object.freeze({
    NORTH: "north",
    SOUTH: "south",
    EAST: "east",
    WEST: "west",
});

const heading = Direction.NORTH;
```

TypeScript adiciona a palavra-chave nativa `enum` que se comporta de forma mais próxima ao Swift:

```ts
// TypeScript
enum Direction {
    North = "north",
    South = "south",
    East = "east",
    West = "west",
}

const heading: Direction = Direction.North;
```

:::tip Prefira enums de string no TypeScript
Enums TypeScript numéricos (o padrão) produzem valores como `0, 1, 2` que são difíceis de depurar. Enums de string (`Direction.North = "north"`) serializam de forma limpa e se comportam de maneira previsível entre fronteiras de API — a mesma troca que você consideraria com enums de valor bruto do Swift.
:::

---

## Tratamento de Erros: `do/catch/throws` → `try/catch`

Swift e JavaScript usam blocos `try/catch`. A diferença está no código assíncrono: Swift usa `async throws`, enquanto JavaScript usa `async/await` com rejeição de `Promise`.

### Síncrono

```swift
// Swift
enum ParseError: Error {
    case invalidData
}

func parseValue(_ raw: String) throws -> Int {
    guard let value = Int(raw) else {
        throw ParseError.invalidData
    }
    return value
}

do {
    let result = try parseValue("abc")
} catch ParseError.invalidData {
    print("Invalid input")
} catch {
    print("Unknown error: \(error)")
}
```

```js
// JavaScript
function parseValue(raw) {
    const value = parseInt(raw, 10);
    if (isNaN(value)) {
        throw new Error("Invalid input");
    }
    return value;
}

try {
    const result = parseValue("abc");
} catch (error) {
    console.error(error.message);
}
```

### Assíncrono

```swift
// Swift
func fetchUser(id: String) async throws -> User {
    let data = try await api.get("/users/\(id)")
    return try JSONDecoder().decode(User.self, from: data)
}

Task {
    do {
        let user = try await fetchUser(id: "42")
    } catch {
        print("Failed: \(error)")
    }
}
```

```js
// JavaScript
async function fetchUser(id) {
    const response = await fetch(`/users/${id}`);
    if (!response.ok) throw new Error("Request failed");
    return response.json();
}

async function load() {
    try {
        const user = await fetchUser("42");
    } catch (error) {
        console.error("Failed:", error.message);
    }
}
```

O padrão `async/await` tem uma leitura quase idêntica. A principal diferença é que JavaScript não tem cláusulas `catch` tipadas — você recebe um único valor `error` e deve inspecioná-lo em tempo de execução, semelhante a capturar `Error` no Swift e então fazer um cast com `as?` para um tipo específico.

---

## Codable → JSON.parse / JSON.stringify

O protocolo `Codable` do Swift lida com serialização para e de JSON automaticamente. JavaScript trabalha diretamente com JSON como objetos simples — nenhuma etapa de decodificação é necessária para dados que chegam pela rede, já que `fetch` retorna um objeto JavaScript analisado via `.json()`.

```swift
// Swift — struct Codable
struct User: Codable {
    let id: Int
    let name: String
}

let json = """
{"id": 1, "name": "Alice"}
"""
let data = json.data(using: .utf8)!
let user = try JSONDecoder().decode(User.self, from: data)

let encoded = try JSONEncoder().encode(user)
```

```js
// JavaScript — parsing direto
const json = '{"id": 1, "name": "Alice"}';
const user = JSON.parse(json);        // user.id, user.name — sem declaração de tipo necessária

const serialized = JSON.stringify(user);
```

No TypeScript você pode adicionar uma anotação de tipo para descrever a forma do objeto analisado sem escrever lógica de decodificação:

```ts
// TypeScript
interface User {
    id: number;
    name: string;
}

const user = JSON.parse(json) as User;
// user.id e user.name são tipados — mas sem validação em tempo de execução
```

:::info Validação em tempo de execução vs tipos em tempo de compilação
As anotações de tipo do TypeScript são apagadas em tempo de execução. Diferente do `Codable` do Swift, um cast `as User` no TypeScript não valida a estrutura do JSON em tempo de execução. Se uma API retornar dados inesperados, você não obterá um erro em tempo de compilação — você obterá um crash em tempo de execução ao tentar acessar uma propriedade ausente. Bibliotecas como `zod` fornecem validação de schema em tempo de execução semelhante ao que `Codable` faz no Swift.
:::

---

## Protocolos Swift → Interfaces TypeScript (Prévia)

Protocolos Swift definem um contrato que os tipos devem cumprir. Interfaces TypeScript servem ao mesmo papel. Você usará interfaces extensivamente em React Native para tipar props de componentes, respostas de API e contratos de serviço.

```swift
// Swift
protocol Displayable {
    var displayName: String { get }
    func formattedDescription() -> String
}

struct Product: Displayable {
    let displayName: String
    func formattedDescription() -> String {
        return "Product: \(displayName)"
    }
}
```

```ts
// TypeScript
interface Displayable {
    displayName: string;
    formattedDescription(): string;
}

const product: Displayable = {
    displayName: "Widget",
    formattedDescription() {
        return `Product: ${this.displayName}`;
    },
};
```

Interfaces TypeScript suportam extensão (`extends`), membros opcionais (`name?: string`) e index signatures — todos conceitos que se mapeiam naturalmente a partir de recursos de protocolos Swift. Um tratamento completo de TypeScript no contexto React Native é abordado no módulo de TypeScript.

---

## Resumo

| Conceito Swift | Equivalente JavaScript / TypeScript |
|---|---|
| `let` (constante) | `const` |
| `var` (mutável) | `let` |
| Opcional `T?` | `T \| null \| undefined` |
| `?.` encadeamento opcional | `?.` (sintaxe idêntica) |
| `??` nil coalescing | `??` (sintaxe idêntica) |
| `guard let … else { return }` | `if (x == null) return` antecipado |
| Interpolação `\(expression)` | Template literal `` `${expression}` `` |
| Closure `{ $0 * 2 }` | Arrow function `n => n * 2` |
| `Array.map / filter / reduce` | `Array.map / filter / reduce` (semântica idêntica) |
| Dicionário `[String: Any]` | Objeto simples `{}` |
| `enum` | `Object.freeze({})` ou `enum` TypeScript |
| `do { try } catch` | `try { } catch (e)` |
| `async throws` | `async` + `await` + `Error` lançado |
| `Codable` / `JSONDecoder` | `JSON.parse` / `JSON.stringify` |
| `protocol` | `interface` TypeScript |

Você vai perceber que a maioria das suas intuições de Swift se transfere de forma limpa. O maior ajuste é abraçar o sistema de tipos dinâmico do JavaScript em tempo de execução enquanto depende do TypeScript para segurança em tempo de compilação — uma combinação que oferece um ambiente de trabalho mais próximo do Swift do que o JavaScript puro sozinho.
