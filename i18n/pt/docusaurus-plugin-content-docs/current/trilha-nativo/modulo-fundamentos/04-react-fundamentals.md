---
title: "Módulo 2: Fundamentos do React para Devs Nativos"
---

# Módulo 2: Fundamentos do React para Devs Nativos

> O React é uma biblioteca de UI com uma ideia central: **sua interface é uma função do seu estado**. Se você já trabalhou com Android moderno (Jetpack Compose) ou iOS (SwiftUI), isso vai fazer sentido imediatamente.

## O Paradigma Declarativo

**Imperativo (sistema de Views do Android / UIKit):**
```kotlin
// Você diz ao sistema COMO mudar a UI passo a passo
val button = findViewById<Button>(R.id.myButton)
button.text = "Carregando..."
button.isEnabled = false
spinner.visibility = View.VISIBLE
```

```swift
// UIKit
button.setTitle("Carregando...", for: .normal)
button.isEnabled = false
spinner.startAnimating()
```

**Declarativo (Compose / SwiftUI / React):**
```kotlin
// Compose — UI é uma função do estado
@Composable
fun MyButton(isLoading: Boolean) {
    if (isLoading) {
        CircularProgressIndicator()
    } else {
        Button(onClick = {}) { Text("Enviar") }
    }
}
```

```tsx
// React — mesma ideia, sintaxe diferente
function MyButton({ isLoading }: { isLoading: boolean }) {
    if (isLoading) {
        return <ActivityIndicator />;
    }
    return <Button onPress={() => {}} title="Enviar" />;
}
```

O modelo mental: **descreva como a UI deve parecer para um dado estado, não como transicionar para ele.** O React calcula o diff e atualiza apenas o que mudou — exatamente como a recomposição do Compose ou o diffing de views do SwiftUI.

---

## Componentes: O Bloco de Construção

Um componente React é uma função que recebe **props** e retorna **JSX**:

```tsx
// O componente mais simples possível
function Greeting() {
    return <Text>Olá!</Text>;
}

// Com props tipadas
interface GreetingProps {
    name: string;
    age?: number;
}

function Greeting({ name, age }: GreetingProps) {
    return (
        <View>
            <Text>Olá, {name}!</Text>
            {age !== undefined && <Text>Idade: {age}</Text>}
        </View>
    );
}

// Uso
<Greeting name="Alice" age={30} />
<Greeting name="Bob" />
```

**Comparação com Compose:**
```kotlin
@Composable
fun Greeting(name: String, age: Int? = null) {
    Column {
        Text("Olá, $name!")
        age?.let { Text("Idade: $it") }
    }
}
```

Componentes podem ser aninhados, compostos e reutilizados — assim como Composables.

---

## JSX — Não é HTML, Não é XML

JSX parece HTML/XML mas é **açúcar sintático do JavaScript** que compila para chamadas de função:

```tsx
// JSX (o que você escreve)
const element = <Text style={{ color: 'red' }}>Olá</Text>;

// O que compila (o que você NÃO escreve)
const element = React.createElement(Text, { style: { color: 'red' } }, "Olá");
```

### Regras do JSX

```tsx
// 1. Deve retornar UM elemento raiz (envolva em View ou fragments <>)
function BadComponent() {
    // return <Text>Primeiro</Text><Text>Segundo</Text>; // ERRO
}

function GoodComponent() {
    return (
        <>
            <Text>Primeiro</Text>
            <Text>Segundo</Text>
        </>
    );
}

// 2. Todas as tags devem ser fechadas
// <View>   — RUIM
// <View /> — BOM (auto-fechamento)

// 3. className → style (no RN) / class → className (no React web)
// <Text className="title">  — React web
// <Text style={styles.title}> — React Native

// 4. Expressões JavaScript vão em { }
const name = "Alice";
<Text>Olá, {name}!</Text>
<Text>2 + 2 = {2 + 2}</Text>

// 5. Renderização condicional
{isLoggedIn && <ProfileScreen />}
{isLoggedIn ? <ProfileScreen /> : <LoginScreen />}
```

---

## Props: Entradas do Componente

Props são a interface do componente — como parâmetros do construtor em um `@Composable` do Compose ou uma `View` do SwiftUI.

```tsx
interface CardProps {
    title: string;
    subtitle?: string;         // opcional
    onPress: () => void;        // callback (como um lambda/closure)
    children?: React.ReactNode; // conteúdo aninhado (como o slot `content: @Composable` do Compose)
}

function Card({ title, subtitle, onPress, children }: CardProps) {
    return (
        <Pressable onPress={onPress} style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {children}
        </Pressable>
    );
}

// Uso com children
<Card title="Meu Card" onPress={() => console.log('pressionado')}>
    <Text>Este é o conteúdo filho</Text>
</Card>
```

**Props são somente leitura.** Um componente nunca pode modificar suas próprias props — somente o pai pode mudar o que passa para baixo.

---

## Estado com `useState`

Estado é dado que, quando alterado, causa a re-renderização do componente. Pense como `mutableStateOf` no Compose ou `@State` no SwiftUI.

```tsx
import { useState } from 'react';

function Counter() {
    // [valorAtual, funçãoSetter] = useState(valorInicial)
    const [count, setCount] = useState(0);
    const [name, setName] = useState('Alice');

    return (
        <View>
            <Text>Contagem: {count}</Text>
            <Button title="Incrementar" onPress={() => setCount(count + 1)} />
            <Button title="Resetar" onPress={() => setCount(0)} />
        </View>
    );
}
```

**Comparação com Compose:**
```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }

    Column {
        Text("Contagem: $count")
        Button(onClick = { count++ }) { Text("Incrementar") }
        Button(onClick = { count = 0 }) { Text("Resetar") }
    }
}
```

**Comparação com SwiftUI:**
```swift
struct Counter: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Contagem: \(count)")
            Button("Incrementar") { count += 1 }
            Button("Resetar") { count = 0 }
        }
    }
}
```

O modelo mental é idêntico nas três — um valor reativo que aciona re-renderização ao mudar.

### Atualizando Estado Corretamente

```tsx
// ERRADO — mutando o estado diretamente (não aciona re-renderização)
const [items, setItems] = useState(['a', 'b', 'c']);
items.push('d'); // RUIM — o React não vai re-renderizar

// CORRETO — sempre crie novos valores
setItems([...items, 'd']);           // Adicionar item
setItems(items.filter(i => i !== 'b')); // Remover item
setItems(items.map(i => i === 'a' ? 'A' : i)); // Atualizar item

// Para objetos
const [user, setUser] = useState({ name: 'Alice', age: 30 });
setUser({ ...user, age: 31 }); // Atualiza um campo — spread cria novo objeto
```

Esse padrão de atualização imutável é fundamental para a detecção de mudanças do React.

---

## `useEffect` — Efeitos Colaterais e Ciclo de Vida

`useEffect` lida com efeitos colaterais — como `LaunchedEffect` no Compose, `onAppear` no SwiftUI, ou `onCreate`/`viewDidLoad` no nativo tradicional.

```tsx
import { useState, useEffect } from 'react';

function UserProfile({ userId }: { userId: string }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Executa após cada renderização em que userId mudou
    useEffect(() => {
        let cancelled = false;

        async function loadUser() {
            setLoading(true);
            const data = await fetchUser(userId);
            if (!cancelled) {  // proteção contra atualizações obsoletas
                setUser(data);
                setLoading(false);
            }
        }

        loadUser();

        // Função de limpeza — executa antes do próximo efeito ou desmontagem
        return () => { cancelled = true; };
    }, [userId]); // array de dependências — re-executa quando userId muda

    if (loading) return <ActivityIndicator />;
    if (!user) return <Text>Nenhum usuário encontrado</Text>;
    return <Text>{user.name}</Text>;
}
```

### Array de Dependências do `useEffect`

```tsx
useEffect(() => { /* executa após CADA renderização */ });
useEffect(() => { /* executa UMA VEZ na montagem */ }, []);
useEffect(() => { /* executa quando dep1 ou dep2 muda */ }, [dep1, dep2]);
```

| Equivalente Nativo | Padrão useEffect |
|-------------------|-------------------|
| `onCreate` / `viewDidLoad` | `useEffect(() => {}, [])` |
| `onDestroy` / `deinit` | retorna limpeza do `useEffect` |
| `onResume` / `viewWillAppear` | Use `useFocusEffect` do React Navigation |
| Observar mudança de valor | `useEffect(() => {}, [oValor])` |

---

## O Ciclo de Vida do Componente em Resumo

```
Montagem:    renderizar → pintar na tela → useEffect([], executa uma vez)
Atualização: mudança de estado/prop → re-renderizar → pintar → useEffect([deps], se deps mudou)
Desmontagem: limpeza do useEffect → componente removido
```

:::info useEffect executa após a pintura
Ao contrário do `viewDidLoad` (iOS) ou `onCreate` (Android) que executam antes da view ser visível, o `useEffect` dispara **depois** que a tela já foi pintada. Isso é geralmente o que você quer (busca de dados, subscriptions). Para medições de layout que devem acontecer sincronamente antes da pintura, use `useLayoutEffect` — o equivalente React Native do `viewDidLayoutSubviews`.
:::

---

## Lifting State Up (Elevando o Estado)

Quando dois componentes irmãos precisam compartilhar estado, mova-o para o pai comum:

```tsx
// O pai possui o estado
function App() {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <View>
            <UserList onSelect={setSelectedId} />
            <UserDetail userId={selectedId} />
        </View>
    );
}
```

Isso é análogo a um ViewModel no Android MVVM que tanto uma Activity quanto um Fragment observam, ou a um publisher Combine que múltiplas views SwiftUI assinam.

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| react.dev — Quick Start | Docs Oficiais | [react.dev/learn](https://react.dev/learn) |
| react.dev — Thinking in React | Docs Oficiais | [react.dev/learn/thinking-in-react](https://react.dev/learn/thinking-in-react) |
| react-tutorial.app | Interativo | [react-tutorial.app](https://react-tutorial.app/) |
| Scrimba — Learn React | Curso Interativo | [scrimba.com/learn/learnreact](https://scrimba.com/learn/learnreact) |
| react.gg | Exercícios Práticos | [react.gg](https://react.gg/) |

---

Próximo → **[Componentes & Props em Profundidade](./components-and-props)**
