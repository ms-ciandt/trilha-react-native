---
title: List Performance — iOS
---

# List Performance — Trilha iOS Developer

Como desenvolvedor iOS, você já entendeu por que `dequeueReusableCell(withReuseIdentifier:for:)` existe. A resposta é simples: alocar e calcular o layout de uma nova célula para cada linha em um conjunto de dados grande destrói a taxa de quadros. UITableView resolve isso mantendo um pool de células fora da tela e reutilizando-as. O FlatList do React Native aplica o mesmo princípio por meio de virtualização controlada pelo JavaScript, e o FlashList leva essa ideia adiante implementando-a nativamente via Fabric.

Entender o paralelo entre as duas abordagens permite tomar decisões informadas sobre qual API utilizar e como configurá-la corretamente.

---

## Virtualização: o conceito

O UITableView nunca mantém todas as linhas de dados na memória como views ativas simultaneamente. Ele solicita células ao data source apenas quando as linhas se aproximam da região visível, e recicla as células que saem da tela.

O FlatList faz o mesmo em JavaScript. O componente mantém uma janela de renderização — uma região maior que o viewport visível — e só monta a saída de `renderItem` para as linhas dentro dessa janela. Linhas fora da janela são desmontadas e sua memória é liberada. Conforme o usuário rola, a janela se move e novos itens são montados na borda de entrada enquanto os itens traseiros são desmontados.

A janela é medida em unidades de altura de viewport. Um `windowSize` de 5 significa que a região renderizada tem 5 alturas de viewport: 2 acima da área visível, a área visível em si e 2 abaixo. No valor padrão de 21, você troca memória por rolagem antecipada mais suave.

```tsx
<FlatList
  data={items}
  renderItem={renderItem}
  windowSize={5}        // tighter window, lower memory usage
  initialNumToRender={10}
  maxToRenderPerBatch={5}
/>
```

Esse não é um parâmetro livre para ajustar às cegas. Uma janela menor significa ciclos de montagem/desmontagem mais frequentes, o que consome tempo da thread JS. Uma janela maior mantém mais componentes ativos na memória. O valor correto depende da complexidade dos itens e do dispositivo alvo.

---

## removeClippedSubviews

No Android, essa prop faz com que itens fora da tela sejam desconectados da hierarquia de views nativas enquanto permanecem montados na árvore JS. No iOS o efeito é menos dramático porque o UIKit lida com a reciclagem de views de forma diferente no nível do sistema operacional, mas a prop ainda é relevante: ela sinaliza ao sistema de layout do React Native que views recortadas podem ser excluídas de certos percursos.

Para listas longas no iOS, ative junto com um `windowSize` ajustado:

```tsx
<FlatList
  data={items}
  renderItem={renderItem}
  removeClippedSubviews={true}
  windowSize={7}
/>
```

Não combine um `windowSize` muito pequeno com `removeClippedSubviews` sem testar em um dispositivo real. A interação pode causar flashes em branco ao rolar mais rápido do que a thread JS consegue montar novos itens.

---

## keyExtractor — o equivalente ao reuseIdentifier

No UITableView você registra uma classe de célula com uma string identificadora e a table view usa essa string para buscar células reutilizáveis do tipo correto. O `keyExtractor` do FlatList cumpre o mesmo papel estrutural: produz uma chave string estável para cada item de dados, para que o reconciliador do React possa associar instâncias de componentes existentes a posições de dados atualizadas.

Sem uma chave estável, o React não consegue determinar se um item reordenado deve atualizar um componente existente ou montar um novo. O resultado são diffs incorretos, atualizações perdidas ou re-renders desnecessários.

```tsx
// Correct: stable, unique, based on data identity
keyExtractor={(item) => item.id.toString()}

// Wrong: index-based keys break when items are inserted or removed
keyExtractor={(item, index) => index.toString()}
```

O paralelo com `reuseIdentifier` vai além: assim como você registra identificadores diferentes para células com layouts diferentes, se sua lista renderiza tipos de itens heterogêneos, você deve codificar o tipo na chave para evitar que o componente errado seja reutilizado para uma forma de dados incompatível.

---

## getItemLayout — eliminando a medição de layout

O UITableView tem `estimatedRowHeight` e `rowHeight(at:)`. Quando você retorna um valor fixo de `rowHeight(at:)`, a table view ignora completamente o passo de medição e pode pular diretamente para qualquer linha usando aritmética — `offset = index * rowHeight`.

O `getItemLayout` do FlatList faz o mesmo. Sem ele, o FlatList precisa montar e medir cada item do topo da lista antes de rolar para um índice específico. Com ele, a navegação para qualquer linha é O(1).

```tsx
const ITEM_HEIGHT = 72;
const SEPARATOR_HEIGHT = 1;

<FlatList
  data={items}
  renderItem={renderItem}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index,
    index,
  })}
/>
```

`getItemLayout` só é correto quando as alturas dos itens são conhecidas e fixas. Se os itens têm conteúdo dinâmico — texto fornecido pelo usuário, imagens com proporções desconhecidas — você não pode usá-lo de forma confiável. Tentar retornar valores incorretos faz o FlatList rolar para posições erradas.

Quando as alturas variam, mas você ainda quer suportar `scrollToIndex`, meça os itens em `onLayout` e armazene os resultados em cache. Isso é mais custoso, mas evita os erros de posição que valores incorretos em `getItemLayout` produzem.

---

## Funções anônimas inline no renderItem

Este é um análogo direto de um erro comum em Swift. Em `cellForRow(at:)` você não deve criar novas closures dentro do corpo do método e atribuí-las como alvos de botão sem cuidado, porque cada chamada produz uma nova alocação e pode interferir na reutilização de células. No FlatList o mesmo padrão tem o mesmo custo.

```tsx
// Wrong: creates a new function reference on every render of the parent
<FlatList
  data={items}
  renderItem={({ item }) => (
    <ItemRow item={item} onPress={() => handlePress(item.id)} />
  )}
/>
```

Quando o componente pai re-renderiza, a arrow function inline é uma nova referência. O React interpreta como uma prop `renderItem` alterada e re-renderiza a lista inteira. Para listas com dezenas de itens, isso produz trabalho desnecessário.

A solução é definir `renderItem` fora do corpo do componente ou memoizá-lo:

```tsx
const renderItem = useCallback(
  ({ item }: { item: Item }) => (
    <ItemRow item={item} onPress={handlePress} />
  ),
  [handlePress]
);

// ItemRow receives onPress and uses item.id internally
const handlePress = useCallback((id: string) => {
  // handle press
}, []);
```

A referência de função estável permite que o React ignore o re-render de itens da lista que não mudaram, desde que `ItemRow` esteja envolto em `React.memo`.

```tsx
const ItemRow = React.memo(({ item, onPress }: ItemRowProps) => {
  return (
    <Pressable onPress={() => onPress(item.id)}>
      <Text>{item.title}</Text>
    </Pressable>
  );
});
```

---

## Referencia de props de performance do FlatList

| Prop | Padrão | Efeito |
|---|---|---|
| `windowSize` | 21 | Janela renderizada em multiplos de altura de viewport. Menor = menos memória, mais montagem/desmontagem. |
| `initialNumToRender` | 10 | Itens renderizados no primeiro passo. Defina como o número visível sem rolar. |
| `maxToRenderPerBatch` | 10 | Itens adicionados por lote de renderização incremental. Menor reduz picos na thread JS. |
| `updateCellsBatchingPeriod` | 50 | Milissegundos entre renderizações em lote. Aumente para reduzir a frequência de renderização. |
| `removeClippedSubviews` | false | Desconecta views nativas fora da tela. Util no Android; marginal no iOS. |
| `getItemLayout` | undefined | Forneça para linhas de altura fixa para ignorar medicao e habilitar `scrollToIndex` rapido. |
| `keyExtractor` | obrigatório | Chave string estavel por item. Use identidade de dados, nunca indice. |
| `onEndReachedThreshold` | 0.5 | Fracao da lista restante quando `onEndReached` e disparado. |

---

## SectionList vs secoes do UITableView

As secoes do UITableView mapeiam naturalmente para o SectionList. O componente aceita um array de objetos de secao, cada um com um cabecalho e um array de itens de dados. Ele suporta cabecalhos de secao fixos que ficam presos ao topo da area visivel durante a rolagem, correspondendo ao comportamento padrao de cabecalhos de secao fixos do UITableView.

```tsx
type Section = {
  title: string;
  data: Item[];
};

<SectionList
  sections={sections}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemRow item={item} />}
  renderSectionHeader={({ section }) => (
    <View style={styles.header}>
      <Text style={styles.headerText}>{section.title}</Text>
    </View>
  )}
  stickySectionHeadersEnabled={true}
/>
```

O SectionList herda todo o comportamento de virtualização do FlatList. As mesmas considerações sobre `windowSize`, `getItemLayout` e `keyExtractor` se aplicam. Para `getItemLayout` com secoes, voce precisa considerar as alturas dos cabecalhos de secao no calculo do offset, o que exige conhecer tanto a altura do item quanto a do cabecalho em cada posicao. Bibliotecas como `react-native-section-list-get-item-layout` automatizam esse calculo.

---

## FlashList — o substituto recomendado

O FlashList e desenvolvido pela Shopify e e o substituto pratico do FlatList em telas sensiveis a performance. Ele e fornecido como um componente nativo Fabric, o que significa que executa a logica de reciclagem no lado nativo em vez de em JavaScript. O resultado e uma carga mensuravelmente menor na thread JS e taxas de quadros mais suaves em listas complexas.

A diferenca de performance e mais visivel em dispositivos Android de categoria intermediaria, mas o iOS tambem se beneficia, especialmente em listas com muitos itens ou layouts de celula complexos.

A API do FlashList e intencionalmente compativel com o FlatList. A migracao geralmente se resume a renomear props e adicionar `estimatedItemSize`:

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  estimatedItemSize={72}
/>
```

`estimatedItemSize` e o equivalente de `estimatedRowHeight` no UITableView. Nao precisa ser exato, mas um valor proximo a altura real reduz os recalculos de layout na primeira renderizacao. O FlashList o utiliza para estimar a altura total da lista para o dimensionamento do indicador de rolagem.

O FlashList implementa reciclagem nativa de celulas. Quando um item sai da tela, o FlashList reutiliza a view nativa para o proximo item que entra, em vez de desmontar e remontar um componente React. Isso e arquiteturalmente identico ao pool `dequeueReusableCell` do UITableView. O componente JS montado na view reciclada recebe props atualizadas, e o React reconcilia apenas os valores alterados.

A implicacao e a mesma do UIKit: seu componente de item deve lidar com mudancas de props corretamente e nao deve manter estado local que deveria ser redefinido quando o item representa um registro de dados diferente. No UITableView voce chama `prepareForReuse()` para limpar o estado da celula. No FlashList voce garante que todo o estado visual deriva de props, nao de `useState` interno que persiste entre reciclagens.

```tsx
// Wrong: local state survives recycling and shows stale values
const ItemRow = ({ item }: { item: Item }) => {
  const [expanded, setExpanded] = useState(false); // persists across reuse
  return ...;
};

// Correct: controlled state, or reset via key if truly item-local
const ItemRow = ({ item, isExpanded, onToggle }: ItemRowProps) => {
  return ...;
};
```

Instale o FlashList com Expo:

```bash
npx expo install @shopify/flash-list
```

Nenhuma configuracao nativa adicional e necessaria ao usar o Expo SDK 50 ou posterior. O FlashList e automaticamente vinculado via Expo Modules.

---

## Escolhendo entre FlatList e FlashList

O FlatList faz parte do nucleo do React Native e nao requer dependencia adicional. E adequado para listas curtas (menos de 100 itens), listas onde os itens mudam com pouca frequencia e casos em que adicionar uma dependencia nao e justificado.

O FlashList e adequado para listas que sao a UI principal de uma tela, contem muitos itens, atualizam com frequencia ou foram identificadas como gargalos de taxa de quadros no profiling. O custo de migracao e baixo e o teto de performance e significativamente maior.

O SectionList ainda nao tem um equivalente no FlashList com paridade completa de recursos. Se voce precisa de secoes e alta performance, uma opcao e nivelar os dados seccionados em um unico array e renderizar os cabecalhos de secao como itens distinguidos por um campo de tipo, passando esse array para o FlashList com um `renderItem` que ramifica com base no tipo.

---

## Fazendo profiling de performance de listas

O Xcode Instruments e o React DevTools Profiler sao ambos uteis aqui.

No React DevTools Profiler, renderize a lista e role-a. Observe o flame chart do seu componente de item. Se ele aparecer em cada quadro, seu `renderItem` nao esta memoizado ou seu `keyExtractor` e instavel.

No Xcode Instruments com Time Profiler, observe a atividade da thread JS correlacionada com eventos de rolagem. Alta carga na thread JS durante uma rolagem aparentemente suave indica que seu `windowSize` esta causando remontagens frequentes. Reduza-o e meça novamente.

O FlashList inclui um aviso de performance integrado no modo de desenvolvimento. Se seu `estimatedItemSize` estiver significativamente errado, ele registra um valor corrigido. Atualize a prop para corresponder e meca novamente.

Para listas que precisam rolar para posicoes arbitrarias via codigo — por exemplo, restaurar a posicao de rolagem apos navegacao — garanta que `getItemLayout` (FlatList) ou `estimatedItemSize` mais alturas de item homogeneas (FlashList) estejam configurados. Sem conhecimento de layout, `scrollToIndex` dispara um passo de medicao completo do topo da lista.
