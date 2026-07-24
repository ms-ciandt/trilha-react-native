---
title: TypeScript for Swift Developers
---

# TypeScript para Desenvolvedores Swift

> Voce ja pensa em tipos. Swift te treinou para nunca confiar em um valor sem tipo, para tratar optionals de forma explicita e deixar o compilador capturar erros antes que cheguem ao usuario. JavaScript nao faz nada disso — TypeScript devolve essa seguranca.

## Por que o TypeScript Existe

JavaScript nao tem sistema de tipos. Qualquer variavel pode conter qualquer valor a qualquer momento, e nada impede que voce passe uma `string` onde um `number` era esperado. O erro aparece em tempo de execucao, muitas vezes em producao.

TypeScript e um superconjunto estrito de JavaScript: todo arquivo JavaScript valido e tambem TypeScript valido. O compilador TypeScript (`tsc`) verifica os tipos do seu codigo e depois apaga todas as anotacoes de tipo, produzindo JavaScript puro que roda em qualquer engine.

Para um desenvolvedor Swift, o modelo mental e: TypeScript e a camada de compilador que traz as garantias de seguranca nas quais voce ja confia.

:::info Paralelos com Swift
O papel do TypeScript em relacao ao JavaScript e aproximadamente o que o sistema de tipos do Swift faz em relacao aos padroes do Objective-C repletos de `id` e propensos a crashes em tempo de execucao. Os tipos existem apenas em tempo de compilacao e nao custam nada em tempo de execucao.
:::

---

## Modo Estrito — O tsconfig que Voce Deve Sempre Usar

Por padrao, o TypeScript e permissivo para facilitar a migracao do JavaScript. Voce quer o modo estrito, que o faz se comportar da maneira que o sistema de tipos do Swift ja faz.

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Projetos Expo e React Native geram um `tsconfig.json` estrito por padrao. Nunca rebaixe esse nivel.

| Flag strict do TypeScript | Equivalente no Swift |
|---|---|
| `noImplicitAny` | Swift proibe variaveis sem tipo completamente |
| `strictNullChecks` | Optionals do Swift — `nil` deve ser explicito |
| `strictFunctionTypes` | Variancia de parametros de funcao no Swift |
| `noUncheckedIndexedAccess` | Acessar um indice de array retorna `T?` no Swift |

---

## Tipos Primitivos

```typescript
const name: string = "Alice";
const age: number = 30;        // Swift tem Int/Double/Float — TS tem apenas `number`
const isActive: boolean = true;
const nothing: null = null;
const notSet: undefined = undefined;
```

| Swift | TypeScript |
|---|---|
| `String` | `string` |
| `Int`, `Double`, `Float` | `number` (todos os tipos numericos) |
| `Bool` | `boolean` |
| `nil` | `null` ou `undefined` |
| `Void` | `void` |
| `Never` | `never` |
| `Any` | `any` (evitar) / `unknown` (seguro) |

:::warning Evite `any`
`any` desativa a verificacao de tipos completamente. Use `unknown` quando voce genuinamente nao conhece o tipo — isso te forca a fazer o narrowing antes de usar, assim como `as? SomeType` no Swift.
:::

---

## Optional `T?` do Swift → `T | null | undefined` no TypeScript

O tipo optional `T?` do Swift e acucar sintatico para `Optional<T>`. O TypeScript divide isso em dois valores nulos distintos.

**Swift**
```swift
var name: String? = nil
let length = name?.count
let display = name ?? "Anonymous"
let forced = name!  // crash em tempo de execucao se nil — como force-unwrap
```

**TypeScript**
```typescript
let name: string | null = null;
const length = name?.length;           // optional chaining — mesma sintaxe ?.
const display = name ?? "Anonymous";   // nullish coalescing — mesma sintaxe ??
const forced = name!;                  // asserção de nao-nulo — mesmo ! (evitar)
```

Com `strictNullChecks` habilitado, o TypeScript se comporta de forma quase identica aos optionals do Swift. Sem ele, `null` e `undefined` passam silenciosamente por todos os tipos — e por isso o modo estrito e obrigatorio.

:::info `null` vs `undefined`
No TypeScript, `null` significa "intencionalmente ausente" e `undefined` significa "ainda nao definido". Na pratica, as APIs do React Native usam ambos. Declare props como `string | undefined` para props opcionais e `string | null` quando um campo do backend pode estar explicitamente ausente.
:::

---

## `struct` e `class` do Swift → `interface` e `type` no TypeScript

TypeScript nao tem structs de tipo valor. Tudo e baseado em referencia em tempo de execucao. As anotacoes de tipo, no entanto, mapeiam naturalmente.

**struct Swift**
```swift
struct User {
    let id: String
    let name: String
    let email: String
    var age: Int?
}
```

**interface TypeScript**
```typescript
interface User {
    id: string;
    name: string;
    email: string;
    age?: number;  // ? significa que o campo pode estar ausente (como optional property no Swift)
}
```

**Alias de type TypeScript**
```typescript
type UserId = string;
type AdminUser = User & { permissions: string[] };  // intersecao — como composicao de protocolos
```

Use `interface` para formatos que podem ser estendidos ou implementados. Use `type` para unions, intersecoes e aliases. Para formatos de dados simples (o caso mais comum no React Native), eles sao intercambiaveis.

---

## `enum` do Swift → Union Types e Objetos `const` no TypeScript

Enums do Swift sao tipos de primeira classe com valores associados. O `enum` nativo do TypeScript e um cidadao de segunda classe que gera codigo em tempo de execucao inesperado. O consenso da comunidade e evita-lo.

**enum simples no Swift**
```swift
enum Direction {
    case up, down, left, right
}
```

**Union de strings no TypeScript (preferido)**
```typescript
type Direction = 'up' | 'down' | 'left' | 'right';
```

Para casos onde voce precisa de uma referencia estavel (como `rawValue` no Swift), use um objeto `const` com `as const`:

**enum com rawValue no Swift**
```swift
enum Status: String {
    case active = "active"
    case inactive = "inactive"
    case pending = "pending"
}
```

**Padrao `as const` no TypeScript**
```typescript
const Status = {
    Active: 'active',
    Inactive: 'inactive',
    Pending: 'pending',
} as const;

type Status = typeof Status[keyof typeof Status];
// type Status = 'active' | 'inactive' | 'pending'
```

`as const` instrui o TypeScript a inferir os tipos literais mais estreitos (`'active'` em vez de `string`) e torna o objeto somente-leitura em todo o codigo.

---

## `enum` com Valores Associados no Swift → Discriminated Unions

Enums com valores associados no Swift tem um equivalente direto em TypeScript: discriminated unions. Esse padrao e o mais importante em codebases React Native.

**enum com valores associados no Swift**
```swift
enum NetworkState {
    case loading
    case success(user: User)
    case failure(message: String)
}

switch state {
case .loading:
    showSpinner()
case .success(let user):
    render(user)
case .failure(let message):
    showError(message)
}
```

**Discriminated union no TypeScript**
```typescript
type NetworkState =
    | { status: 'loading' }
    | { status: 'success'; user: User }
    | { status: 'failure'; message: string };

switch (state.status) {
    case 'loading':
        return showSpinner();
    case 'success':
        return render(state.user);    // TypeScript sabe que .user existe aqui
    case 'failure':
        return showError(state.message); // TypeScript sabe que .message existe aqui
}
```

O campo discriminante (`status` acima) faz o papel que o nome do case faz no Swift. O TypeScript estreita o tipo dentro de cada branch, dando as mesmas garantias de exaustividade que um `switch` no Swift — especialmente com `noImplicitReturns` habilitado.

---

## Generics `<T>` no Swift → Generics no TypeScript

A sintaxe e quase identica.

**Swift**
```swift
func first<T>(_ array: [T]) -> T? {
    return array.first
}

struct ApiResponse<T: Codable> {
    let data: T
    let status: Int
    let message: String
}
```

**TypeScript**
```typescript
function first<T>(array: T[]): T | undefined {
    return array[0];
}

interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

type UserResponse = ApiResponse<User>;
type UserListResponse = ApiResponse<User[]>;
```

Generics no TypeScript suportam restricoes com `extends`:

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}
// Equivalente no Swift: generic com restricao de protocolo <T: SomeProtocol>
```

---

## `Codable` do Swift → Validacao em Tempo de Execucao com Zod

O `Codable` do Swift te da decodificacao JSON garantida em tempo de compilacao. O sistema de tipos do TypeScript e apagado em tempo de execucao — uma resposta de rede tipada como `User` e apenas um objeto `unknown` em tempo de execucao. O TypeScript nao pode te proteger la.

**Swift**
```swift
struct User: Codable {
    let id: String
    let name: String
    let email: String
}

let user = try JSONDecoder().decode(User.self, from: data)
```

**TypeScript com Zod**
```typescript
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().optional(),
});

type User = z.infer<typeof UserSchema>; // deriva o tipo TypeScript automaticamente

// Validacao em tempo de execucao — lanca excecao se o formato nao corresponder
const user = UserSchema.parse(await response.json());

// Versao segura — retorna { success, data } ou { success, error }
const result = UserSchema.safeParse(await response.json());
if (result.success) {
    console.log(result.data.name);
}
```

:::info Zod e o `Codable` do TypeScript
Zod valida em tempo de execucao e deriva tipos estaticos a partir do schema. Esse e o equivalente mais proximo ao `Codable` do Swift — defina uma vez, obtenha tanto tipos em tempo de compilacao quanto seguranca em tempo de execucao.
:::

---

## Utility Types — Equivalentes no Swift

TypeScript inclui tipos genericos embutidos que transformam tipos existentes. O Swift alcanca resultados similares por meio de extensions e conformances de protocolo, mas o TypeScript os torna parte do proprio sistema de tipos.

```typescript
interface User {
    id: string;
    name: string;
    email: string;
    age: number;
}

// Partial — todos os campos opcionais (como um init memberwise do Swift com valores nil padrao)
type UserUpdate = Partial<User>;
// { id?: string; name?: string; email?: string; age?: number }

// Required — todos os campos obrigatorios (remove ? de cada campo)
type StrictUser = Required<UserUpdate>;

// Pick — seleciona campos especificos (como um struct Swift com um subconjunto de propriedades)
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string }

// Omit — exclui campos (complemento do Pick)
type NewUser = Omit<User, 'id'>;
// { name: string; email: string; age: number }

// Readonly — todos os campos imutaveis (como `let` do Swift para cada propriedade)
type ImmutableUser = Readonly<User>;

// Record — dicionario tipado (como [Key: Value] no Swift)
type UserMap = Record<string, User>;
```

---

## O Operador `satisfies`

`satisfies` valida que um valor corresponde a um tipo sem alargar o tipo inferido. E util quando voce quer que o compilador verifique seu trabalho, mas ainda mantenha tipos literais estreitos.

**Sem `satisfies` — tipo e alargado**
```typescript
const palette: Record<string, string> = {
    primary: '#6366f1',
    secondary: '#818cf8',
};
palette.primary; // tipo: string (literal perdido)
```

**Com `satisfies` — tipo e preservado**
```typescript
const palette = {
    primary: '#6366f1',
    secondary: '#818cf8',
} satisfies Record<string, string>;

palette.primary; // tipo: '#6366f1' (literal preservado)
```

No React Native, `satisfies` e util para entradas de `StyleSheet` onde voce quer verificacao de tipos mas tambem quer autocomplete no objeto de estilo especifico:

```typescript
import { StyleSheet, ViewStyle } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    } satisfies ViewStyle,
});
```

---

## `strictNullChecks` na Pratica

Sem `strictNullChecks`, todo tipo aceita silenciosamente `null` e `undefined`. Com ele habilitado (o que `strict: true` faz), voce deve trata-los explicitamente — exatamente como o Swift te forca a tratar optionals.

```typescript
// strictNullChecks: false (perigoso — nunca use isso)
function getLength(s: string): number {
    return s.length; // sem erro mesmo que s seja null em tempo de execucao
}

// strictNullChecks: true (correto)
function getLength(s: string | null): number {
    if (s === null) return 0;
    return s.length; // TypeScript sabe que s e string aqui
}

// Atalho com optional chaining
function getLength(s: string | null): number {
    return s?.length ?? 0;
}
```

Isso e isomorfico ao tratamento de optionals no Swift — o compilador te forca a fazer o unwrap antes de usar.

---

## Tipos do React Native na Pratica

```typescript
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

// Discriminated union para estado assincrono — substitui enum Swift com valores associados
type AsyncState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: Error };

// Params de navegacao tipados — substitui routing com enum Swift
type RootStackParams = {
    Home: undefined;
    Profile: { userId: string };
    Settings: { section?: string };
};
```

---

## Exercicios

1. Converta este enum Swift em uma discriminated union TypeScript:

    ```swift
    enum AuthState {
        case unauthenticated
        case authenticating(email: String)
        case authenticated(user: User, token: String)
        case locked(reason: String, retryAfter: Date)
    }
    ```

2. Escreva um schema Zod para a seguinte struct `Codable` do Swift e derive o tipo TypeScript a partir dele:

    ```swift
    struct Product: Codable {
        let id: String
        let name: String
        let priceInCents: Int
        let imageURL: URL?
        let tags: [String]
    }
    ```

3. Usando utility types, derive `ProductPreview` (apenas `id` e `name`) e `ProductUpdate` (todos os campos opcionais, sem `id`) a partir da sua interface `Product`.

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| TypeScript Handbook | Documentacao oficial | [typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html) |
| TypeScript Playground | Interativo | [typescriptlang.org/play](https://www.typescriptlang.org/play/) |
| Zod Documentation | Documentacao da biblioteca | [zod.dev](https://zod.dev/) |
| Total TypeScript | Tutoriais gratuitos | [totaltypescript.com/tutorials](https://www.totaltypescript.com/tutorials) |
