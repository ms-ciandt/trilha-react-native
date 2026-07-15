---
title: TypeScript para Devs Nativos
---

# TypeScript para Devs Nativos

> TypeScript é JavaScript com um sistema de tipos adicionado. Se você gosta dos sistemas de tipos do Kotlin ou Swift, você vai se sentir em casa aqui — com algumas particularidades.

## Configuração: Strict Mode

Sempre ative o strict mode. Ele faz o TypeScript se comportar mais como Kotlin/Swift:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,          // ativa todas as verificações estritas
    "noImplicitAny": true,   // sem variáveis sem tipo
    "strictNullChecks": true // null/undefined devem ser explícitos
  }
}
```

Projetos Expo e React Native geram isso por padrão.

---

## Tipos Primitivos

```typescript
const name: string = "Alice";
const age: number = 30;          // sem divisão Int/Float/Double — todos são `number`
const isActive: boolean = true;
const nothing: null = null;
const notSet: undefined = undefined;
const id: bigint = 9007199254740991n;
const sym: symbol = Symbol("id");
```

**Comparação Kotlin:**

| Kotlin | TypeScript |
|--------|-----------|
| `String` | `string` |
| `Int`, `Long`, `Double` | `number` (todos) |
| `Boolean` | `boolean` |
| `null` | `null` |
| `Unit` | `void` |
| `Nothing` | `never` |
| `Any` | `any` (evite!) / `unknown` (seguro) |

---

## Interfaces e Type Aliases

TypeScript tem duas formas de definir formatos: `interface` e `type`. Use `interface` para objetos que podem ser estendidos; `type` para unions e tipos utilitários.

```typescript
// Interface — como uma interface Kotlin ou formato de data class
interface User {
    id: string;
    name: string;
    email: string;
    age?: number;  // opcional — como Int? do Kotlin
}

// Type alias
type UserId = string;
type Status = 'active' | 'inactive' | 'pending'; // union type — como enum do Kotlin

// Intersection — combinar tipos (como implementar múltiplas interfaces)
type AdminUser = User & {
    permissions: string[];
};
```

**Comparação com data class Kotlin:**
```kotlin
data class User(
    val id: String,
    val name: String,
    val email: String,
    val age: Int? = null    // opcional
)
```

**Comparação com struct Swift:**
```swift
struct User {
    let id: String
    let name: String
    let email: String
    var age: Int?
}
```

---

## Union Types — Sealed Classes do Kotlin / Enums com Valores do Swift

As **discriminated unions** do TypeScript são equivalentes às sealed classes do Kotlin ou enums com valores associados do Swift:

```typescript
// Union discriminada do TypeScript
type NetworkState =
    | { status: 'loading' }
    | { status: 'success'; data: User }
    | { status: 'error'; message: string };

function renderState(state: NetworkState) {
    switch (state.status) {
        case 'loading':
            return 'Carregando...';
        case 'success':
            return `Bem-vindo, ${state.data.name}`; // TypeScript sabe que .data existe aqui
        case 'error':
            return `Erro: ${state.message}`;        // TypeScript sabe que .message existe aqui
    }
}
```

**Comparação com sealed class Kotlin:**
```kotlin
sealed class NetworkState {
    object Loading : NetworkState()
    data class Success(val data: User) : NetworkState()
    data class Error(val message: String) : NetworkState()
}

fun renderState(state: NetworkState) = when (state) {
    is NetworkState.Loading -> "Carregando..."
    is NetworkState.Success -> "Bem-vindo, ${state.data.name}"
    is NetworkState.Error -> "Erro: ${state.message}"
}
```

Este padrão é usado constantemente no React Native para estados de carregamento, respostas de API e parâmetros de navegação.

---

## Generics

```typescript
// Função genérica — como generics <T> do Kotlin
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

const firstNumber = first([1, 2, 3]);   // TypeScript infere T = number
const firstString = first(["a", "b"]);  // TypeScript infere T = string

// Interface genérica
interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

type UserResponse = ApiResponse<User>;
type UserListResponse = ApiResponse<User[]>;
```

**Comparação Kotlin:**
```kotlin
fun <T> first(list: List<T>): T? = list.firstOrNull()

data class ApiResponse<T>(
    val data: T,
    val status: Int,
    val message: String
)
```

---

## Null Safety: `null`, `undefined`, `?.`, `??`

TypeScript com `strictNullChecks` exige que você trate null explicitamente — como os tipos nullable do Kotlin:

```typescript
// Sem strict: null e undefined são atribuíveis a qualquer tipo (perigoso)
// Com strict: você deve declarar a nullable

let name: string = "Alice";
// name = null; // Erro com strictNullChecks

let maybeName: string | null = null; // Explicitamente nullable — como String? do Kotlin
let optionalName: string | undefined = undefined;

// Optional chaining — como ?. do Kotlin
const user: User | null = getUser();
const email = user?.email;        // string | undefined
const city = user?.address?.city; // optional chaining aninhado

// Nullish coalescing — como ?: do Kotlin
const displayName = user?.name ?? "Anônimo";

// Non-null assertion — como !! do Kotlin (use com moderação!)
const forcedName = user!.name; // lança em tempo de execução se user for null
```

**Comparação Kotlin:**
```kotlin
var maybeName: String? = null
val email = user?.email
val displayName = user?.name ?: "Anônimo"
val forcedName = user!!.name  // lança KotlinNullPointerException se null
```

Os padrões são quase idênticos.

---

## Tipos Utilitários

TypeScript tem tipos utilitários embutidos que você usará constantemente no React Native:

```typescript
interface User {
    id: string;
    name: string;
    email: string;
    age: number;
}

// Partial — todos os campos opcionais (como um copy com parâmetros nomeados do Kotlin)
type UserUpdate = Partial<User>;
// { id?: string; name?: string; email?: string; age?: number }

// Required — todos os campos obrigatórios
type RequiredUser = Required<UserUpdate>;

// Pick — selecionar campos específicos
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string }

// Omit — excluir campos específicos
type UserWithoutId = Omit<User, 'id'>;
// { name: string; email: string; age: number }

// Readonly — versão imutável (como val para cada campo no Kotlin)
type ImmutableUser = Readonly<User>;

// Record — mapa chave-valor com chaves e valores tipados
type UserMap = Record<string, User>;
// { [key: string]: User }
```

---

## Type Guards (Narrowing de Tipo em Runtime)

```typescript
// typeof guard
function processInput(input: string | number) {
    if (typeof input === 'string') {
        return input.toUpperCase(); // TypeScript sabe que é string aqui
    }
    return input.toFixed(2); // TypeScript sabe que é number aqui
}

// instanceof guard
function handleError(error: unknown) {
    if (error instanceof Error) {
        console.log(error.message); // TypeScript sabe que tem .message
    }
}

// Type guard customizado
function isUser(obj: unknown): obj is User {
    return typeof obj === 'object' &&
           obj !== null &&
           'id' in obj &&
           'name' in obj;
}
```

---

## Enums vs Union Types

TypeScript tem `enum`, mas a comunidade prefere **union types** (são mais simples e não geram código extra em tempo de execução):

```typescript
// Evite: enum do TypeScript
enum Direction { Up, Down, Left, Right }

// Prefira: union type (sem overhead em tempo de execução)
type Direction = 'Up' | 'Down' | 'Left' | 'Right';

// Ou como objeto const (também dá a referência do valor)
const Direction = {
    Up: 'Up',
    Down: 'Down',
    Left: 'Left',
    Right: 'Right',
} as const;
type Direction = typeof Direction[keyof typeof Direction];
```

---

## Anotações de Tipo no React Native na Prática

```typescript
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Tipando props de componente
interface ButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    style?: ViewStyle;          // tipo de estilo RN para componentes View
    textStyle?: TextStyle;      // tipo de estilo RN para componentes Text
}

// Tipando estado
interface AppState {
    users: User[];
    isLoading: boolean;
    error: string | null;
}

// Tipando StyleSheet
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    } satisfies ViewStyle,   // `satisfies` verifica sem ampliar o tipo
});
```

---

## Exercícios

1. **Defina uma union discriminada** para um `AuthState` que pode ser:
   - `unauthenticated`
   - `authenticating` (com `email: string`)
   - `authenticated` (com `user: User` e `token: string`)
   - `error` (com `message: string`)

2. **Escreva um tipo genérico `useAsync<T>`** que representa loading, sucesso com dados `T` ou um erro.

3. **Converta esta data class Kotlin** para uma interface TypeScript com nullable adequado:
   ```kotlin
   data class Profile(
       val id: String,
       val displayName: String,
       val avatarUrl: String?,
       val bio: String?,
       val followerCount: Int = 0
   )
   ```

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| TypeScript Handbook | Docs Oficiais | [typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html) |
| TypeScript Playground | Interativo | [typescriptlang.org/play](https://www.typescriptlang.org/play/) |
| Total TypeScript (Matt Pocock) | Tutoriais gratuitos | [totaltypescript.com/tutorials](https://www.totaltypescript.com/tutorials) |
| TypeScript Cheat Sheets | Referência | [typescriptlang.org/cheatsheets](https://www.typescriptlang.org/cheatsheets) |

---

Próximo → **[Fundamentos do React](./react-fundamentals)**
