---
title: "TypeScript para Desenvolvedores Kotlin"
sidebar_label: "TypeScript"
sidebar_position: 2
---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_android/fund_02_typescript.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Video Overview

> Video para este tópico em breve.

## TypeScript é JavaScript com o Sistema de Tipos do Kotlin

Se você amou o sistema de tipos do Kotlin — data classes, sealed classes, tipos anuláveis, generics — você vai se sentir em casa no TypeScript. A filosofia é idêntica: capturar bugs em tempo de compilação, não em tempo de execução.

TypeScript é um superset de JavaScript: todo JS válido é TS válido. Você adiciona tipos progressivamente. No React Native, TypeScript é o padrão e fortemente recomendado.

---

## Configuração: tsconfig.json

Tanto o React Native CLI quanto o Expo geram um `tsconfig.json`. A configuração mais importante:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "esnext",
    "lib": ["esnext"],
    "allowJs": true,
    "jsx": "react-native",
    "moduleResolution": "bundler",
    "baseUrl": "."
  }
}
```

`"strict": true` habilita:
- `strictNullChecks` — `null` e `undefined` não são atribuíveis a outros tipos (como o sistema de nuláveis do Kotlin)
- `noImplicitAny` — variáveis sem anotação de tipo recebem `any` apenas se inferível, caso contrário gera erro
- `strictFunctionTypes` — os tipos dos parâmetros de funções são verificados de forma covariante

---

## Tipos Primitivos

```typescript
const name: string = "Guilherme";
const age: number = 30;
const active: boolean = true;
const nothing: null = null;
const missing: undefined = undefined;
```

TypeScript infere tipos — raramente você precisa anotar primitivos:

```typescript
const name = "Guilherme"; // TypeScript infere: string
const age = 30;           // inferido: number
```

---

## Tipos Anuláveis

O Kotlin distingue `String` de `String?`. O TypeScript usa um tipo union com `null` ou `undefined`:

| Kotlin        | TypeScript                          |
|---------------|-------------------------------------|
| `String`      | `string`                            |
| `String?`     | `string \| null`                    |
| `String?`     | `string \| null \| undefined`       |
| `?.`          | `?.`                                |
| `?:`          | `??`                                |
| `!!`          | `!` (asserção de não-nulo — evite)  |

```typescript
function greet(name: string | null): string {
  return `Hello, ${name ?? "stranger"}`;
}

// Com strictNullChecks, isso é um erro de compilação:
const upper = name.toUpperCase(); // Error: 'name' is possibly null

// Seguro:
const upper = name?.toUpperCase() ?? "";
```

---

## Interfaces e Types

O Kotlin tem `data class` e `interface`. O TypeScript tem `interface` e `type`. Eles são amplamente intercambiáveis — `type` é mais flexível, `interface` é mais extensível.

### Kotlin data class → TypeScript interface

```kotlin
data class User(
    val id: String,
    val name: String,
    val email: String,
    val role: String = "viewer",
)
```

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role?: string; // optional — equivalent to default value
}

// Or with type alias
type User = {
  id: string;
  name: string;
  email: string;
  role?: string;
};
```

### Estendendo interfaces

```kotlin
interface Animal { val name: String }
interface Pet : Animal { val owner: String }
```

```typescript
interface Animal { name: string; }
interface Pet extends Animal { owner: string; }

// type alias intersection
type Pet = Animal & { owner: string };
```

---

## Unions Discriminadas: Sealed Classes

Este é um dos recursos mais poderosos do TypeScript — idêntico em propósito às sealed classes do Kotlin.

### Sealed class no Kotlin

```kotlin
sealed class UiState {
    object Loading : UiState()
    data class Success(val data: List<User>) : UiState()
    data class Error(val message: String) : UiState()
}

fun render(state: UiState) = when (state) {
    is UiState.Loading -> showSpinner()
    is UiState.Success -> showList(state.data)
    is UiState.Error -> showError(state.message)
}
```

### Union discriminada no TypeScript

```typescript
type UiState =
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; message: string };

function render(state: UiState) {
  switch (state.status) {
    case 'loading':  return <ActivityIndicator />;
    case 'success':  return <UserList data={state.data} />;
    case 'error':    return <ErrorMessage message={state.message} />;
  }
}
```

O campo discriminante (`status`) indica ao TypeScript em qual branch você está — dentro de `case 'success'`, o TypeScript sabe que `state.data` existe. Isso é verificação de exaustividade em tempo de compilação, exatamente como o `when` do Kotlin em sealed classes.

---

## Generics

```kotlin
data class ApiResponse<T>(
    val data: T,
    val error: String? = null,
)

fun <T> fetchData(url: String): ApiResponse<T> { ... }
```

```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const res = await fetch(url);
  const data: T = await res.json();
  return { data };
}

// Usage — TypeScript infers the return type
const response = await fetchData<User[]>('/api/users');
// response.data is User[]
```

### Restrições em Generics

```kotlin
fun <T : Comparable<T>> max(a: T, b: T): T = if (a > b) a else b
```

```typescript
function max<T extends { valueOf(): number }>(a: T, b: T): T {
  return a.valueOf() > b.valueOf() ? a : b;
}
```

---

## Utility Types

O TypeScript vem com utility types nativos que correspondem a padrões comuns do Kotlin:

| TypeScript Utility   | Equivalente Kotlin                         | Descrição |
|----------------------|--------------------------------------------|-----------|
| `Partial<T>`         | Todos os campos opcionais (sem equivalente direto) | Torna todos os campos `?` |
| `Required<T>`        | Remove `?` de todos os campos              | Oposto de Partial |
| `Readonly<T>`        | `val` para todos os campos                 | Todos os campos somente leitura |
| `Pick<T, K>`         | Sem equivalente direto                     | Seleciona subconjunto de campos |
| `Omit<T, K>`         | Sem equivalente direto                     | Exclui subconjunto de campos |
| `Record<K, V>`       | `Map<K, V>` (aproximado)                   | Objeto com chaves e valores tipados |
| `NonNullable<T>`     | Tipo não-nulável                           | Remove `null`/`undefined` |
| `ReturnType<F>`      | Tipo de retorno inferido                   | Extrai o tipo de retorno de uma função |

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// For an update form — all fields optional
type UserUpdatePayload = Partial<Omit<User, 'id'>>;
// { name?: string; email?: string; password?: string }

// For display — never expose the password
type PublicUser = Omit<User, 'password'>;
// { id: string; name: string; email: string }

// For a lookup map
type UserMap = Record<string, User>;
// { [userId: string]: User }
```

---

## Enums vs Union Types

O Kotlin usa `enum class`. O TypeScript tem duas abordagens:

### enum no TypeScript (evite na maioria dos casos)

```typescript
enum Direction { Up, Down, Left, Right }
```

### String union type (preferido no React Native)

```typescript
type Direction = 'up' | 'down' | 'left' | 'right';

function move(dir: Direction) { ... }
move('up');    // valid
move('north'); // Error: not assignable to type Direction
```

```kotlin
enum class Direction { UP, DOWN, LEFT, RIGHT }
```

Prefira union types a `enum` no TypeScript — eles produzem saída JavaScript mais limpa e funcionam melhor com unions discriminadas.

---

## Asserções de Tipo e Type Guards

### Asserção de Tipo (equivalente ao `as` do Kotlin)

```kotlin
val view = activity.findViewById(R.id.btn) as Button
```

```typescript
const input = document.getElementById('name') as HTMLInputElement;
// or (older syntax, don't use in JSX files)
const input = <HTMLInputElement>document.getElementById('name');
```

### Type Guard (equivalente ao `is` do Kotlin)

```kotlin
if (shape is Circle) { /* shape is smart-cast to Circle */ }
```

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}

if (isUser(response)) {
  console.log(response.name); // TypeScript knows it's a User here
}
```

---

## Tipando Componentes React Native

Este é o TypeScript mais prático que você vai escrever:

```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';

// Props interface — the equivalent of a Kotlin @Composable function signature
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, styles[variant], disabled && styles.disabled]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
  primary: { backgroundColor: '#6750A4' },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#6750A4' },
  disabled: { opacity: 0.4 },
  label: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
```

---

## Tipando Funções Assíncronas e Promises

```kotlin
suspend fun fetchUser(id: String): User
```

```typescript
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<User>;
}

// Error handling
async function loadUser(id: string): Promise<User | null> {
  try {
    return await fetchUser(id);
  } catch (err) {
    console.error(err);
    return null;
  }
}
```

---

## Materiais de Estudo

### Documentação Oficial

- [TypeScript — Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) — referência completa da linguagem
- [TypeScript — TypeScript for Java/C# Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html) — mapeia conceitos OOP (muito relevante para devs Kotlin)
- [TypeScript — Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [React Native — TypeScript](https://reactnative.dev/docs/typescript)

### Interativo

- [TypeScript Playground](https://www.typescriptlang.org/play) — editor TypeScript ao vivo no navegador
- [Total TypeScript — Beginner's Tutorial](https://www.totaltypescript.com/tutorials/beginners-typescript) — exercícios interativos gratuitos

### Videos

- [Fireship — TypeScript in 100 Seconds](https://www.youtube.com/watch?v=zQnBQ4tB3ZA)
- [Matt Pocock — TypeScript for React Developers](https://www.youtube.com/watch?v=37PafxU_uzQ)

---

## Próximos Passos

TypeScript concluído. A seguir: os blocos de construção fundamentais das UIs React Native — o que substitui `TextView`, `ImageView`, `RecyclerView` e todas as outras views Android que você conhece.

➡ [Componentes Core do React Native](./03-rn-core-components)
