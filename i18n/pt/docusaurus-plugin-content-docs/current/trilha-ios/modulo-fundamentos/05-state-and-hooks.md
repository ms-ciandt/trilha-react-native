---
title: State and Hooks
---

# State e Hooks

No SwiftUI, o estado conduz a UI. Quando uma propriedade `@State` muda, o SwiftUI recalcula o body. O React funciona da mesma forma: o estado é a fonte da verdade e, quando ele muda, o componente é re-renderizado. Hooks são o mecanismo que o React oferece para gerenciar estado e efeitos colaterais dentro de componentes funcionais — o equivalente aos property wrappers e modificadores de ciclo de vida do SwiftUI.

---

## @State → useState (estado local)

No SwiftUI, `@State` serve para valores mutáveis simples, locais à view:

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        Button("Count: \(count)") {
            count += 1
        }
    }
}
```

No React, `useState` é o equivalente direto:

```tsx
import React, { useState } from 'react';
import { Button, Text, View } from 'react-native';

function CounterView() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
    </View>
  );
}
```

Diferenças fundamentais para internalizar:

- No SwiftUI você muta `count` diretamente. No React você sempre chama o setter (`setCount`). Nunca mute o estado diretamente.
- `useState` retorna uma tupla: `[valorAtual, setter]`. O setter dispara uma re-renderização.
- Você pode chamar `useState` várias vezes em um único componente, um por pedaço de estado.
- Para atualizar com base no valor anterior, passe uma função para o setter: `setCount(prev => prev + 1)`.

---

## @ObservableObject / @Published → useRef e hooks customizados

No SwiftUI, quando o estado vive fora de uma única view, você recorre a `ObservableObject` com propriedades `@Published`:

```swift
class TimerViewModel: ObservableObject {
    @Published var elapsed: Int = 0
    private var timer: Timer?

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            self.elapsed += 1
        }
    }

    func stop() {
        timer?.invalidate()
    }
}
```

O React separa essa responsabilidade em dois primitivos: `useRef` para valores mutáveis que não disparam re-renderizações, e hooks customizados para lógica stateful reutilizável.

`useRef` mantém um container mutável cuja propriedade `.current` sobrevive entre renders sem provocar novos. Pense nele como uma variável de instância invisível ao ciclo de renderização:

```tsx
import React, { useRef } from 'react';

function TimerView() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    intervalRef.current = setInterval(() => {
      console.log('tick');
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
  };

  return null; // simplified
}
```

Use `useRef` quando precisar armazenar um valor entre renders sem que o componente reaja às mudanças nele — IDs de timer, valores anteriores, referências a nós DOM/nativos.

---

## Hooks customizados como ViewModels

O equivalente mais próximo a um ViewModel com `ObservableObject` no React é um **hook customizado**. Hooks customizados são funções simples cujos nomes começam com `use`. Eles podem chamar outros hooks internamente:

```tsx
import { useState, useRef, useEffect } from 'react';

function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (intervalRef.current !== null) return;
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  return { elapsed, start, stop };
}
```

Consumindo-o em um componente:

```tsx
function TimerScreen() {
  const { elapsed, start, stop } = useTimer();

  return (
    <View>
      <Text>{elapsed}s</Text>
      <Button title="Start" onPress={start} />
      <Button title="Stop" onPress={stop} />
    </View>
  );
}
```

Esse padrão substitui completamente o padrão `@StateObject` / `@ObservedObject` + ViewModel. O hook é o ViewModel; ele possui o estado e a lógica de negócio; o componente é puramente apresentacional.

---

## useEffect vs .onAppear / .onDisappear / .onChange

O SwiftUI tem modificadores de ciclo de vida anexados às views:

```swift
Text("Hello")
    .onAppear { fetchData() }
    .onDisappear { cancelTasks() }
    .onChange(of: searchText) { fetchResults(for: $0) }
```

O React consolida todos esses casos em `useEffect`. O comportamento depende do array de dependências:

| Modificador SwiftUI | Equivalente useEffect |
|---|---|
| `.onAppear` | `useEffect(() => { ... }, [])` — array vazio, executa uma vez ao montar |
| `.onDisappear` | função de limpeza dentro do `useEffect` |
| `.onChange(of: value)` | `useEffect(() => { ... }, [value])` — executa quando `value` muda |

```tsx
import { useEffect, useState } from 'react';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);

  // Equivalente a .onAppear
  useEffect(() => {
    console.log('Screen mounted');
  }, []);

  // Equivalente a .onChange(of: query)
  useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      return;
    }
    fetchResults(query).then(setResults);
  }, [query]);

  return null; // simplified
}

async function fetchResults(q: string): Promise<string[]> {
  return [];
}
```

---

## Limpeza do useEffect → deinit / cancellables

Em Swift, você libera recursos no `deinit` ou cancelando assinaturas Combine armazenadas em `Set<AnyCancellable>`:

```swift
class LocationViewModel: ObservableObject {
    private var cancellables = Set<AnyCancellable>()

    init() {
        locationPublisher
            .sink { self.location = $0 }
            .store(in: &cancellables)
    }

    deinit {
        cancellables.removeAll()
    }
}
```

No React, `useEffect` aceita uma função de limpeza retornada pelo seu corpo. O React a chama quando o componente é desmontado ou antes do efeito ser re-executado por mudança de dependência:

```tsx
useEffect(() => {
  const subscription = eventEmitter.addListener('locationUpdate', handleUpdate);

  // Limpeza: equivalente a deinit / cancellables.removeAll()
  return () => {
    subscription.remove();
  };
}, []);
```

Sempre retorne uma função de limpeza quando seu efeito assinar algo, iniciar um timer ou abrir uma conexão. Esquecer a limpeza é o equivalente React de um vazamento de memória por cancellables não liberados.

---

## Modificador .task do SwiftUI → useEffect com async

O modificador `.task` do SwiftUI executa uma função assíncrona vinculada ao tempo de vida da view e a cancela ao desaparecer:

```swift
Text("Loading…")
    .task {
        await loadData()
    }
```

`useEffect` não aceita uma função assíncrona diretamente, mas você pode definir e invocar imediatamente uma dentro dele:

```tsx
useEffect(() => {
  let cancelled = false;

  async function loadData() {
    const data = await fetchSomething();
    if (!cancelled) {
      setData(data);
    }
  }

  loadData();

  return () => {
    cancelled = true; // evita atualizações de estado obsoletas após a desmontagem
  };
}, []);
```

A flag `cancelled` espelha como a concorrência estruturada do Swift verifica cooperativamente o cancelamento. Esse padrão previne o aviso "Can't perform a React state update on an unmounted component".

---

## useCallback → referências estáveis de funções

No SwiftUI, funções passadas como closures são criadas do zero a cada render. No React isso importa porque passar uma nova referência de função para um componente filho o força a re-renderizar mesmo que nada tenha mudado.

`useCallback` memoiza uma função para que sua referência permaneça estável entre renders enquanto suas dependências não mudarem:

```tsx
import { useCallback, useState } from 'react';

function ParentScreen() {
  const [count, setCount] = useState(0);

  const handlePress = useCallback(() => {
    setCount(prev => prev + 1);
  }, []); // referência estável — sem deps

  return <ChildButton onPress={handlePress} />;
}
```

Sem `useCallback`, cada render de `ParentScreen` cria uma nova função `handlePress`, o que forçaria `ChildButton` a re-renderizar mesmo que `count` não tenha mudado. Pense em `useCallback` como `lazy var` para closures — calculado uma vez, reutilizado.

---

## useMemo → propriedades computadas

No SwiftUI, `var` com um bloco `get` é uma propriedade computada — recalculada toda vez que é acessada. Para cálculos custosos, você recorre a estratégias de cache ou a propriedades `@Published` atualizadas somente quando as entradas mudam.

O `useMemo` do React é o equivalente: ele recomputa um valor apenas quando suas dependências mudam, armazenando o resultado em cache entre renders:

```tsx
import { useMemo } from 'react';

type Product = { name: string; price: number };

function ProductList({ products }: { products: Product[] }) {
  const expensiveProducts = useMemo(
    () => products.filter(p => p.price > 100).sort((a, b) => b.price - a.price),
    [products] // recomputa apenas quando o array products muda
  );

  return (
    <View>
      {expensiveProducts.map(p => (
        <Text key={p.name}>{p.name}</Text>
      ))}
    </View>
  );
}
```

Reserve `useMemo` para computações genuinamente custosas. Usá-lo em excesso adiciona overhead sem benefício — o mesmo erro de adicionar `lazy var` a toda propriedade em Swift.

---

## Streams reativos: Combine → padrões com useEffect

O Combine em Swift permite reagir declarativamente a sequências de valores ao longo do tempo. O equivalente no React não é uma biblioteca embutida no framework — é o padrão `useEffect` + `useState` aplicado a streams de eventos.

Por exemplo, reagir a um publisher de status de rede em Swift:

```swift
NWPathMonitor().publisher
    .map { $0.status == .satisfied }
    .assign(to: &$isOnline)
```

No React Native com o pacote `@react-native-community/netinfo`:

```tsx
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return unsubscribe; // limpeza = cancelar assinatura
  }, []);

  return isOnline;
}
```

O padrão se encaixa bem: assinar no corpo do efeito, armazenar o valor atual no estado, cancelar a assinatura na limpeza. O array de dependências `[]` significa assinar uma vez ao montar, o que corresponde a como as assinaturas Combine são armazenadas em `cancellables` durante o `init`.

---

## Regras dos hooks

O React impõe duas regras que não têm paralelo direto no Swift, mas são fáceis de seguir:

**Regra 1 — Chame hooks apenas no nível superior.** Nunca chame hooks dentro de condicionais, loops ou funções aninhadas. Isso garante que o React veja os mesmos hooks na mesma ordem a cada render.

```tsx
// Errado
function BadComponent({ show }: { show: boolean }) {
  if (show) {
    const [value, setValue] = useState(''); // chamado condicionalmente — viola as regras
  }
}

// Correto
function GoodComponent({ show }: { show: boolean }) {
  const [value, setValue] = useState(''); // sempre chamado
  if (!show) return null;
  return <Text>{value}</Text>;
}
```

**Regra 2 — Chame hooks apenas de componentes funcionais React ou de hooks customizados.** Não de funções utilitárias simples, métodos de classe ou event handlers.

---

## Armadilhas do array de dependências

O array de dependências de `useEffect`, `useCallback` e `useMemo` deve incluir todo valor do escopo do componente que o efeito lê. Omitir dependências causa closures obsoletas — o efeito enxerga valores antigos de um render anterior, analogamente a capturar uma referência fraca que já foi desalocada.

```tsx
function StaleExample() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // Bug: count é capturado como 0 e nunca atualiza
      console.log(count);
    }, 1000);
    return () => clearInterval(id);
  }, []); // count ausente nas deps

  return <Button title="+" onPress={() => setCount(c => c + 1)} />;
}
```

Correção: adicione `count` ao array de dependências (o efeito re-executa cada vez que `count` muda) ou use a forma funcional do updater para evitar ler `count` completamente:

```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(prev => prev + 1); // lê prev do React, não da closure
  }, 1000);
  return () => clearInterval(id);
}, []); // seguro — nenhum valor externo é lido
```

O plugin ESLint `eslint-plugin-react-hooks` impõe arrays de dependências corretos automaticamente. Ative-o — é o equivalente ao compilador Swift capturando variáveis não inicializadas.

---

## Resumo

| Swift / SwiftUI | Hook React |
|---|---|
| `@State` | `useState` |
| `@State` em valor que não re-renderiza | `useRef` |
| `ObservableObject` / ViewModel | hook customizado |
| `.onAppear` | `useEffect(() => {}, [])` |
| `.onDisappear` | retorno de limpeza do `useEffect` |
| `.onChange(of:)` | `useEffect(() => {}, [value])` |
| `.task` | `useEffect` com IIFE async interna |
| `deinit` / `cancellables` | retorno de limpeza do `useEffect` |
| `lazy var` / cache de computado | `useMemo` |
| referência estável de closure | `useCallback` |
| assinatura Combine | padrão subscribe/unsubscribe com `useEffect` |

Hooks são toda a história de estado e ciclo de vida no React. Não existe alternativa baseada em classes no React Native moderno — todo padrão de ViewModel que você construiu com `ObservableObject` se encaixa perfeitamente em um hook customizado. Assim que esse modelo mental se consolida, o restante do modelo de componentes do React se torna natural.
