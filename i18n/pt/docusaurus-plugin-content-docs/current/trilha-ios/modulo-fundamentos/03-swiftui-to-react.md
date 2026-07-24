---
title: SwiftUI para React — Mapeamento de Conceitos
---

Se você já desenvolve com SwiftUI, os conceitos do React vão soar familiares: ambos são declarativos, orientados a componentes e reagem a mudanças de estado automaticamente. A diferença está na linguagem e nas convenções — não no paradigma.

Este documento mapeia cada padrão SwiftUI para o equivalente em React/React Native, com exemplos lado a lado.

---

## View struct → Function Component

No SwiftUI, uma `View` é uma struct que implementa o protocolo `View` e expõe a propriedade computada `body`. No React, o equivalente é uma função que retorna JSX.

**SwiftUI**

```swift
struct GreetingView: View {
    var name: String

    var body: some View {
        Text("Hello, \(name)!")
            .font(.title)
            .foregroundColor(.blue)
    }
}
```

**React Native (TSX)**

```tsx
import { Text } from 'react-native';

type GreetingProps = {
  name: string;
};

export function GreetingView({ name }: GreetingProps) {
  return (
    <Text style={{ fontSize: 24, color: 'blue' }}>
      Hello, {name}!
    </Text>
  );
}
```

:::info body property → return JSX
A propriedade `body` do SwiftUI é equivalente ao bloco `return` de um componente React. Ambos descrevem a árvore de UI que o framework deve renderizar. Você nunca monta a tela de forma imperativa — você descreve o que ela deve exibir dado o estado atual.
:::

---

## @State → useState

`@State` no SwiftUI é uma fonte de verdade local para a view. Quando muda, a view rerenderiza. O equivalente direto no React é o hook `useState`.

**SwiftUI**

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") {
                count += 1
            }
        }
    }
}
```

**React Native (TSX)**

```tsx
import { useState } from 'react';
import { View, Text, Button } from 'react-native';

export function CounterView() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
    </View>
  );
}
```

:::info Imutabilidade no React
Diferente do SwiftUI onde você pode atribuir diretamente ao `@State` (`count += 1`), no React você nunca muta o estado diretamente. Sempre use o setter retornado pelo `useState`. Isso permite ao React detectar a mudança e agendar a rerenderização.
:::

---

## @Binding → props + callback

`@Binding` cria um vínculo bidirecional entre a view pai e a filha — a filha pode ler e modificar o estado do pai. No React, esse padrão é implementado passando o valor e uma função de atualização como props separadas.

**SwiftUI**

```swift
struct ToggleView: View {
    @Binding var isOn: Bool

    var body: some View {
        Toggle("Enabled", isOn: $isOn)
    }
}

struct ParentView: View {
    @State private var enabled = false

    var body: some View {
        ToggleView(isOn: $enabled)
    }
}
```

**React Native (TSX)**

```tsx
import { Switch, View, Text } from 'react-native';

type ToggleViewProps = {
  isOn: boolean;
  onToggle: (value: boolean) => void;
};

function ToggleView({ isOn, onToggle }: ToggleViewProps) {
  return (
    <View>
      <Text>Enabled</Text>
      <Switch value={isOn} onValueChange={onToggle} />
    </View>
  );
}

export function ParentView() {
  const [enabled, setEnabled] = useState(false);

  return <ToggleView isOn={enabled} onToggle={setEnabled} />;
}
```

:::info Fluxo unidirecional de dados
No SwiftUI, `@Binding` mascara o fato de que os dados fluem do pai. No React esse fluxo é explícito: o pai passa `value` e `onChange`, a filha chama `onChange` quando quer atualizar. Esse padrão é chamado de "controlled component" e é central no React.
:::

---

## @ObservableObject → Zustand (ou useContext)

`@ObservableObject` com `@Published` encapsula estado compartilhado em uma classe observável. No React Native, o equivalente mais próximo para estado global simples é o Zustand; para estado de escopo médio, `useContext` com `useReducer`.

**SwiftUI**

```swift
class CartStore: ObservableObject {
    @Published var items: [String] = []

    func add(_ item: String) {
        items.append(item)
    }
}

struct CartView: View {
    @ObservedObject var cart: CartStore

    var body: some View {
        List(cart.items, id: \.self) { item in
            Text(item)
        }
    }
}
```

**React Native com Zustand (TSX)**

```tsx
import { create } from 'zustand';
import { FlatList, Text } from 'react-native';

type CartState = {
  items: string[];
  add: (item: string) => void;
};

const useCartStore = create<CartState>((set) => ({
  items: [],
  add: (item) => set((state) => ({ items: [...state.items, item] })),
}));

export function CartView() {
  const items = useCartStore((state) => state.items);

  return (
    <FlatList
      data={items}
      keyExtractor={(item, index) => String(index)}
      renderItem={({ item }) => <Text>{item}</Text>}
    />
  );
}
```

:::info Por que Zustand?
`@ObservableObject` é uma classe com identidade — você a instancia e passa para as views. O Zustand segue a mesma ideia: uma store centralizada com estado e ações. A diferença é que o Zustand é baseado em closures e hooks, sem a necessidade de classes ou decorators.
:::

---

## @EnvironmentObject → React Context

`@EnvironmentObject` injeta um objeto compartilhado na hierarquia de views sem passá-lo explicitamente por cada nível. O equivalente no React é o `Context`.

**SwiftUI**

```swift
class ThemeStore: ObservableObject {
    @Published var isDark = false
}

struct RootView: View {
    @StateObject var theme = ThemeStore()

    var body: some View {
        ContentView()
            .environmentObject(theme)
    }
}

struct ContentView: View {
    @EnvironmentObject var theme: ThemeStore

    var body: some View {
        Text("Dark mode: \(theme.isDark ? "on" : "off")")
    }
}
```

**React Native (TSX)**

```tsx
import { createContext, useContext, useState } from 'react';
import { Text, View } from 'react-native';

type ThemeContextType = {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  setIsDark: () => {},
});

export function RootView() {
  const [isDark, setIsDark] = useState(false);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <ContentView />
    </ThemeContext.Provider>
  );
}

function ContentView() {
  const { isDark } = useContext(ThemeContext);

  return <Text>Dark mode: {isDark ? 'on' : 'off'}</Text>;
}
```

---

## ViewModifier → StyleSheet ou Styled Components

No SwiftUI, `ViewModifier` encapsula um conjunto de modificações visuais reutilizáveis. No React Native, o equivalente é um objeto de estilo no `StyleSheet.create` ou uma função que retorna estilos compostos.

**SwiftUI**

```swift
struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(Color.white)
            .cornerRadius(12)
            .shadow(radius: 4)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardModifier())
    }
}

struct MyCard: View {
    var body: some View {
        Text("Hello")
            .cardStyle()
    }
}
```

**React Native (TSX)**

```tsx
import { View, Text, StyleSheet } from 'react-native';

const cardStyle = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

function Card({ children }: { children: React.ReactNode }) {
  return <View style={cardStyle.container}>{children}</View>;
}

export function MyCard() {
  return (
    <Card>
      <Text>Hello</Text>
    </Card>
  );
}
```

---

## Renderização Condicional

O SwiftUI usa `if/else` dentro do `body`. O React usa operadores JavaScript diretamente no JSX.

**SwiftUI**

```swift
struct StatusView: View {
    var isLoggedIn: Bool

    var body: some View {
        VStack {
            if isLoggedIn {
                Text("Welcome back!")
            } else {
                Text("Please sign in.")
            }
        }
    }
}
```

**React Native (TSX)**

```tsx
type StatusViewProps = { isLoggedIn: boolean };

export function StatusView({ isLoggedIn }: StatusViewProps) {
  return (
    <View>
      {isLoggedIn ? (
        <Text>Welcome back!</Text>
      ) : (
        <Text>Please sign in.</Text>
      )}
    </View>
  );
}
```

Para renderizar algo apenas quando uma condição é verdadeira, use `&&`:

```tsx
{isLoggedIn && <Text>Welcome back!</Text>}
```

---

## ForEach → Array.map()

O SwiftUI tem `ForEach` para iterar sobre coleções dentro do `body`. No React, você usa `.map()` nativo do JavaScript.

**SwiftUI**

```swift
struct FruitList: View {
    let fruits = ["Apple", "Banana", "Cherry"]

    var body: some View {
        List {
            ForEach(fruits, id: \.self) { fruit in
                Text(fruit)
            }
        }
    }
}
```

**React Native (TSX)**

```tsx
const fruits = ['Apple', 'Banana', 'Cherry'];

export function FruitList() {
  return (
    <View>
      {fruits.map((fruit) => (
        <Text key={fruit}>{fruit}</Text>
      ))}
    </View>
  );
}
```

:::info A prop key
Assim como o parâmetro `id` no `ForEach` do SwiftUI identifica cada item para o framework, a prop `key` no React serve ao mesmo propósito: permite ao reconciliador identificar quais itens mudaram, foram adicionados ou removidos sem recriar toda a lista.
:::

Para listas longas, prefira `FlatList` no React Native, que virtualiza os itens e economiza memória — análogo ao `LazyVStack` com `ForEach`:

```tsx
import { FlatList, Text } from 'react-native';

export function FruitList() {
  return (
    <FlatList
      data={fruits}
      keyExtractor={(item) => item}
      renderItem={({ item }) => <Text>{item}</Text>}
    />
  );
}
```

---

## onChange → useEffect com array de dependências

O modificador `.onChange(of:)` do SwiftUI executa uma ação quando um valor específico muda. O `useEffect` com array de dependências faz o mesmo no React.

**SwiftUI**

```swift
struct SearchView: View {
    @State private var query = ""
    @State private var results: [String] = []

    var body: some View {
        TextField("Search", text: $query)
            .onChange(of: query) { newValue in
                fetchResults(for: newValue)
            }
    }

    func fetchResults(for query: String) {
        // busca assíncrona
    }
}
```

**React Native (TSX)**

```tsx
import { useState, useEffect } from 'react';
import { TextInput, View } from 'react-native';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (query.length === 0) return;

    fetchResults(query).then(setResults);
  }, [query]);

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search"
      />
    </View>
  );
}

async function fetchResults(query: string): Promise<string[]> {
  // busca assíncrona
  return [];
}
```

:::info Limpeza de efeito
Se `.onChange` no SwiftUI disparar uma operação assíncrona que precisa ser cancelada quando o valor mudar novamente, o `useEffect` suporta isso por meio de uma função de limpeza. Retorne uma função do `useEffect` para cancelar tarefas pendentes — equivalente a usar `Task` e chamar `task.cancel()` no Swift.
:::

```tsx
useEffect(() => {
  let cancelled = false;

  fetchResults(query).then((data) => {
    if (!cancelled) setResults(data);
  });

  return () => {
    cancelled = true;
  };
}, [query]);
```

---

## Propriedades Computadas para Subviews → Componentes Auxiliares

No SwiftUI, é comum extrair partes da `body` em propriedades computadas para organizar o código. No React, o equivalente é extrair em funções ou componentes auxiliares.

**SwiftUI**

```swift
struct ProfileView: View {
    var username: String
    var bio: String

    var header: some View {
        VStack(alignment: .leading) {
            Text(username).font(.largeTitle)
            Text(bio).foregroundColor(.secondary)
        }
    }

    var body: some View {
        ScrollView {
            header
            // restante do conteúdo
        }
    }
}
```

**React Native (TSX)**

```tsx
type ProfileViewProps = {
  username: string;
  bio: string;
};

function ProfileHeader({ username, bio }: ProfileViewProps) {
  return (
    <View>
      <Text style={{ fontSize: 32 }}>{username}</Text>
      <Text style={{ color: '#888' }}>{bio}</Text>
    </View>
  );
}

export function ProfileView({ username, bio }: ProfileViewProps) {
  return (
    <ScrollView>
      <ProfileHeader username={username} bio={bio} />
      {/* restante do conteúdo */}
    </ScrollView>
  );
}
```

:::info Componente vs propriedade computada
No SwiftUI, propriedades computadas que retornam `some View` são avaliadas inline e não têm estado próprio. No React, componentes separados têm seu próprio ciclo de vida e podem ter `useState` independente. Se o helper não precisa de estado, pode também ser uma função regular chamada dentro do `return` — mas a convenção do React é preferir componentes separados para facilitar testes e reuso.
:::

---

## Previews → React DevTools

O SwiftUI tem `#Preview` para visualizar componentes em tempo real no Xcode. No React Native, o equivalente é o React DevTools combinado com hot reload no Expo Go ou Metro.

**SwiftUI**

```swift
#Preview {
    CounterView()
}
```

**React Native — Expo**

```bash
npx expo start
```

Abra o Expo Go no dispositivo ou emulador. Toda mudança salva é refletida instantaneamente via Fast Refresh — o estado do componente é preservado quando possível, assim como os previews do SwiftUI mantêm o estado entre compilações.

Para isolar componentes visualmente, ferramentas como **Storybook for React Native** oferecem uma experiência próxima aos previews do Xcode:

```bash
npx storybook@latest init
```

---

## Resumo do Mapeamento

| SwiftUI | React Native |
|---|---|
| `struct MyView: View` | `function MyView()` |
| `body: some View` | `return (<JSX />)` |
| `@State` | `useState` |
| `@Binding` | prop + callback `onChange` |
| `@ObservableObject` | Zustand store |
| `@EnvironmentObject` | `useContext` |
| `ViewModifier` | `StyleSheet` ou componente wrapper |
| `ForEach` | `Array.map()` ou `FlatList` |
| `.onChange(of:)` | `useEffect([dep])` |
| Propriedade computada de view | Componente auxiliar ou função |
| `if/else` no body | Ternário `? :` ou `&&` |
| `#Preview` | React DevTools + Fast Refresh |

O paradigma declarativo é o mesmo. A principal adaptação é pensar em termos de JavaScript e hooks em vez de structs e property wrappers — mas a lógica de composição e reatividade que você já domina no SwiftUI transfere diretamente.
