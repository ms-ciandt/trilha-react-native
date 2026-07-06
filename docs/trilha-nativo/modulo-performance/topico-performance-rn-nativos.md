---
title: Performance React Native
---

# Tópico — Performance React Native (Trilha 1: Devs Nativos)

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Entender o modelo de threads do RN (JS, UI e threads nativas auxiliares)
- Identificar gargalos comuns em apps RN (listas grandes, re-render excessivo, bridges pesados)
- Otimizar listas (`FlatList`, `SectionList`) para cenários de alto volume
- Minimizar re-renders desnecessários usando memoização e separação de responsabilidades
- Usar ferramentas como Flipper e o perf monitor do RN
- Relacionar sintomas de performance em RN com seus equivalentes em Android/iOS

---

## Mapeamento: Android/iOS → React Native

| Nativo                          | React Native                       | Observação |
|---------------------------------|------------------------------------|------------|
| Main/UI Thread                  | UI Thread RN                       | Renderização, layout, animações |
| Worker Threads / background     | Threads internas de módulos nativos| I/O, operações pesadas |
| Lógica de apresentação (Presenter/ViewModel)| JS Thread (React)         | Render, estado, lógica de UI |
| RecyclerView com ViewHolder     | `FlatList` / `SectionList`         | Virtualização de listas |
| Animações nativas (Animator, Core Animation) | `react-native-reanimated`, Gesture Handler | Animações baseadas em nativo |

---

## Modelo de threads

- **JS Thread**: executa o código JavaScript/TypeScript (React, lógica de estado, efeitos).
- **UI Thread**: responsável por desenhar a UI, coletar eventos de toque, executar animações nativas.
- **Threads auxiliares**: usadas internamente por módulos nativos para I/O, rede, etc.

Boas práticas:
- Evitar operações síncronas pesadas na JS thread (loops grandes, parsing complexo).
- Mover tarefas intensivas para módulos nativos ou para jobs assíncronos.
- Garantir que animações críticas sejam dirigidas pela UI thread quando possível.

---

## Listas grandes com `FlatList`

Assim como um `RecyclerView` mal configurado causa jank, uma `FlatList` sem otimização pode travar o scroll.

Exemplo de lista performática:

```tsx
import React, { useCallback } from 'react';
import { FlatList } from 'react-native';
import { ProductRow } from './ProductRow';

const ROW_HEIGHT = 72;

export type Product = {
  id: string;
  name: string;
  price: number;
};

export function ProductList({ products }: { products: Product[] }) {
  const renderItem = useCallback(
    ({ item }: { item: Product }) => <ProductRow product={item} />, 
    [],
  );

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      initialNumToRender={10}
      windowSize={5}
      removeClippedSubviews
      getItemLayout={(_, index) => ({
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
        index,
      })}
    />
  );
}
```

Pontos-chave:
- `keyExtractor` estável e único (evita trabalho extra de reconciliação).
- `getItemLayout` reduz cálculos de layout durante o scroll.
- `windowSize` controla quantas telas de dados ficam montadas simultaneamente.
- `removeClippedSubviews` ajuda em listas longas em Android.

---

## Minimizar re-renders

### Memoização de itens

```tsx
// ProductRow.tsx
import React from 'react';
import { View, Text } from 'react-native';
import type { Product } from './ProductList';

interface Props {
  product: Product;
}

export const ProductRow = React.memo(function ProductRow({ product }: Props) {
  return (
    <View>
      <Text>{product.name}</Text>
      <Text>{product.price}</Text>
    </View>
  );
});
```

Boas práticas:
- Evitar passar objetos e funções inline como props para itens.
- Extrair lógica de filtro/ordenação para hooks, não para o componente de lista.
- Usar `useCallback` e `useMemo` para funções e dados derivados usados em render.

---

## Bridges pesados e frequentes

Comunicação intensa entre JS e nativo (ex.: dezenas de eventos por segundo) pode causar gargalo.

Mitigações:
- Agrupar eventos (batching) quando possível.
- Mover parte da lógica de controle para o lado nativo.
- Usar libs que fazem animações *worklet-based* (`react-native-reanimated`) para evitar trafegar todos os frames pelo bridge.

---

## Ferramentas de profiling

- **Perf Monitor do RN**: mostra FPS na JS UI, útil para detectar jank.
- **Flipper + plugin React Native**: inspeção de performance, logs, rede.
- **Ferramentas nativas**:
  - Android Profiler para CPU/Memória em código nativo.
  - Instruments para detectar problemas em módulos nativos iOS.

---

## Exercício prático

Monte um cenário de lista grande e otimize:

1. Crie uma tela `BigProductListScreen` com 5.000 itens mockados.
2. Implemente uma versão inicial sem otimizações (sem `memo`, sem `getItemLayout`).
3. Use o perf monitor para medir:
   - FPS médio durante scroll.
   - Tempo de render inicial.
4. Aplique otimizações:
   - `React.memo` em `ProductRow`.
   - `useCallback` em `renderItem`.
   - `getItemLayout`, `initialNumToRender`, `windowSize`, `removeClippedSubviews`.
5. Compare antes/depois e documente os ganhos em um `PERFORMANCE.md`.

---

## Materiais de estudo

### Documentação oficial
- [Optimizing Performance](https://reactnative.dev/docs/optimizing-performance)

### Artigos
- *Improving FlatList Performance in React Native* — boas práticas para listas.
- *React Native Performance Tuning for Production Apps* — visão mais ampla (bridge, animações, memória).

### Vídeos

#### React Native Performance in Real Apps (35 min)

<details>
<summary>Descrição do conteúdo</summary>

O vídeo aborda problemas reais de performance em aplicações RN em produção, mostrando sintomas como scroll travado, interações com atraso e animações engasgando. A partir de exemplos concretos, mapeia cada sintoma para uma causa provável (JS thread ocupada, lista não virtualizada, animação no lado errado do bridge).

Tópicos:
- Diferença entre o custo de render no JS e custo de desenho na UI thread.
- Como medir FPS e capturar traces úteis.
- Estratégias de otimização específicas para listas e animações.
- Comparação com abordagens nativas (RecyclerView vs FlatList, Core Animation vs Reanimated).

</details>
