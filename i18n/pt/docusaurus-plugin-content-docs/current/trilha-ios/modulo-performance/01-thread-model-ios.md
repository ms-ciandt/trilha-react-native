---
title: Thread Model — iOS Perspective
---

# Thread Model — Perspectiva iOS

Se você já publicou aplicativos UIKit ou SwiftUI, carrega consigo um modelo mental sólido sobre threads: a thread principal é dona da UI, o Grand Central Dispatch move trabalho para fora dela, e violar esse contrato causa queda de frames ou crashes em tempo de execução. O modelo de threads do React Native se mapeia diretamente sobre essas mesmas primitivas. Entender esse mapeamento permite diagnosticar problemas de performance com ferramentas que você já conhece e aplicar soluções que parecem familiares.

## Como as Threads do iOS se Mapeiam nas Threads do React Native

Uma aplicação React Native em execução mantém três threads principais. Cada uma tem um análogo direto no mundo GCD que você já conhece.

### Thread Principal (UI Thread)

Esta é a mesma thread principal em que o UIKit roda. O React Native renderiza views nativas — `UIView`, `UIScrollView`, `UILabel` — através do mesmo run loop do `UIApplication` com o qual você já está familiarizado. Qualquer mutação de propriedade de `UIView`, callback de gesture recogniser ou atualização de animação de `CALayer` acontece aqui.

Em Swift você acessa essa thread com `DispatchQueue.main.async { }`. No código interno do React Native ela é chamada de **UI thread** ou **main thread** de forma intercambiável, porque o conceito é idêntico: uma única fila serializada, conduzida pelo run loop, onde todas as mutações de views nativas precisam chegar.

### Thread JS

O React Native executa seu JavaScript dentro do Hermes, o motor JavaScript que acompanha o RN 0.76+. O Hermes executa em uma thread de background dedicada — não na thread principal. É nessa thread que rodam suas funções de render de componentes, event handlers, corpos de `useEffect` e toda a lógica de negócio escrita em JavaScript.

Pense nela como uma `DispatchQueue(label: "com.rn.js", qos: .userInteractive)` gerenciada inteiramente pelo motor. Você não a cria nem a configura. Não é possível agendar trabalho nela diretamente a partir do Swift. A fronteira entre essa thread e o lado nativo é a JSI (JavaScript Interface), uma camada em C++ que permite chamadas síncronas em ambas as direções sem serialização de mensagens.

### Shadow Thread (Thread de Layout do Fabric)

O Fabric, o sistema de renderização que se tornou o padrão no RN 0.76, introduziu uma thread dedicada para computação de layout. Quando a árvore de componentes muda, o Fabric recalcula o layout Yoga (o motor de flexbox) nessa shadow thread e então confirma as mutações de view resultantes na thread principal em uma única transação atômica.

Em termos de UIKit, isso é comparável a uma `DispatchQueue` de background que calcula os frames `CGRect` de cada view na hierarquia e então entrega o lote completo para `DispatchQueue.main.async` como uma única atualização coerente. A shadow thread é interna ao React Native; você interage com ela apenas indiretamente através do mecanismo de commit do Fabric.

## O que o Fabric Mudou no Timing de Layout

Antes do Fabric, o React Native usava a **Bridge** — um canal de serialização JSON assíncrono entre JavaScript e código nativo. Um passo de layout funcionava aproximadamente assim:

1. A thread JS serializa uma descrição da árvore de views para JSON.
2. O JSON é enfileirado e enviado de forma assíncrona pela bridge.
3. O lado nativo desserializa, executa o layout Yoga na thread principal e muta as views.

A natureza assíncrona significava que o layout estava sempre pelo menos um frame atrás dos eventos. Gestos pareciam levemente desconectados. A rolagem de listas podia expor células em branco antes que o conteúdo chegasse.

O Fabric elimina esse ciclo de ida e volta. A computação de layout agora acontece de forma síncrona na shadow thread usando C++ Yoga diretamente. O commit para a thread principal é uma chamada nativa síncrona através da JSI, não uma fila de mensagens serializada. Da sua perspectiva iOS, essa é a mesma melhoria que você obtém quando troca notificações cross-thread via `NotificationCenter` por chamadas de método diretas: a latência desaparece porque a indireção desaparece.

A consequência prática é que componentes Fabric podem responder à posição de scroll, estado de gestos e valores animados sem esperar por um ciclo de ida e volta pela bridge. É isso que torna o `react-native-reanimated` capaz de animações a 60fps e 120fps conduzidas por valores que nunca saem do lado nativo.

## DispatchQueue.main.async → runOnUI() e useNativeDriver

No UIKit, se você quer atualizar uma propriedade de view a partir de uma fila de background, escreve:

```swift
DispatchQueue.main.async {
    self.myLabel.alpha = 0.5
}
```

O React Native Reanimated expõe o padrão equivalente como `runOnUI()`:

```javascript
import { runOnUI } from 'react-native-reanimated';

runOnUI(() => {
  'worklet';
  mySharedValue.value = 0.5;
})();
```

A diretiva `worklet` diz ao compilador do Reanimated para copiar essa função para o runtime JavaScript da UI thread (uma instância separada do Hermes que roda na thread principal). A chamada acontece de forma síncrona na UI thread, assim como `DispatchQueue.main.async` agenda um bloco no run loop principal.

Para animações que não requerem worklets, `useNativeDriver: true` move a interpolação inteiramente para a thread principal, ignorando a thread JS em cada frame de animação. Isso é equivalente a usar `CABasicAnimation` ou `UIViewPropertyAnimator` diretamente, em vez de atualizar uma propriedade em um loop `DispatchQueue.global().async`: o motor de animação roda de forma nativa sem cruzar fronteiras de thread a cada tick.

```javascript
Animated.timing(opacity, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true, // interpolação roda na thread principal, não na thread JS
}).start();
```

Quando `useNativeDriver` é `false` (o padrão para propriedades de layout como `width` e `height`), cada frame requer um ciclo de ida e volta pela thread JS. A 60fps isso é 16ms por frame. A 120fps ProMotion são 8ms. Qualquer trabalho na thread JS que leve mais tempo que o orçamento de frame causa queda de frames, mesmo que a thread principal esteja ociosa.

## Bloqueando a Thread Principal — Mesmos Sintomas que no UIKit

Todo desenvolvedor iOS conhece as consequências de bloquear a thread principal: a UI congela, eventos de toque ficam enfileirados sem resposta, e o watchdog do sistema eventualmente encerra o processo se o bloqueio persistir por alguns segundos. A thread principal do React Native é a mesma thread com as mesmas consequências.

Padrões comuns do React Native que bloqueiam a thread principal:

**Chamadas síncronas a módulos nativos.** Um método de TurboModule anotado sem `async` em sua especificação TypeScript executa de forma síncrona na thread chamadora. Se essa chamada realiza I/O, acesso a banco de dados ou computação pesada, e é invocada a partir de código rodando na thread principal, o run loop trava.

**Medição de layout com `measure()`.** A API `measure()` em uma ref lê o frame atual de uma view. Dependendo da implementação, pode precisar sincronizar com o commit da shadow thread, o que pode introduzir uma breve pausa na thread principal.

**Worklets síncronos longos.** Um worklet que roda na UI thread e realiza computação pesada vai travar a thread principal exatamente como um `viewDidLoad` do UIKit que bloqueia em dados de rede. Mantenha os worklets curtos.

Em displays ProMotion (iPad Pro, iPhone 15 Pro e posteriores), o orçamento de frame cai para 8ms a 120fps. O sistema Core Animation irá promover para 120fps automaticamente quando o conteúdo estiver rolando ou animando. Uma thread JS que consistentemente leva 10–12ms por frame vai produzir jank visível a 120fps que era invisível a 60fps, porque o prazo do frame agora chega antes que o trabalho JS termine.

O instrumento **Core Animation** do Instruments é a ferramenta certa para confirmar regressões em ProMotion. A thread `com.apple.main-thread` no trace do Time Profiler vai mostrar mutações de views nativas e trabalho de commit do Core Animation, separado do trabalho da thread JS.

## InteractionManager.runAfterInteractions()

Desenvolvedores UIKit frequentemente usam `DispatchQueue.main.asyncAfter(deadline: .now() + 0.3)` para adiar trabalho pesado até após uma animação de transição ser concluída, evitando quedas de frame durante um push de navegação ou apresentação de modal.

O React Native fornece `InteractionManager.runAfterInteractions()` para o mesmo propósito:

```javascript
import { InteractionManager } from 'react-native';

useEffect(() => {
  const handle = InteractionManager.runAfterInteractions(() => {
    // Computação pesada, parsing de dados ou busca de dados secundários.
    // Roda apenas após todas as animações e interações em andamento serem concluídas.
    loadSecondaryContent();
  });

  return () => handle.cancel();
}, []);
```

O `InteractionManager` mantém um registro de interações ativas (animações, transições de navegação). Trabalho submetido via `runAfterInteractions` é enfileirado na fila de tarefas da thread JS e despachado apenas quando o registro de interações está vazio. Isso é semanticamente equivalente a `DispatchQueue.main.asyncAfter` com um prazo que se adapta à duração real da animação em vez de um offset de tempo fixo.

Um padrão comum de migração iOS: qualquer trabalho que você teria colocado em `viewDidAppear` após um breve delay de `asyncAfter` pertence ao `runAfterInteractions` no React Native. Pré-carregamento de imagens, carregamento de dados não críticos e chamadas de analytics são bons candidatos.

## Garbage Collection do Hermes vs ARC do Swift

O Swift usa Automatic Reference Counting: a memória é recuperada imediatamente quando a última referência a um objeto cai para zero. Não há pausas de GC, não há fases stop-the-world. O overhead é distribuído — um par retain/release em cada atribuição de referência — mas é determinístico e sem pausas.

O Hermes usa um **garbage collector geracional** com uma fase de marcação concorrente e uma fase de compactação stop-the-world. Durante a fase de compactação, a thread JS é pausada enquanto objetos vivos são relocados. Na maioria das telas, essa pausa é curta o suficiente para ser invisível (sub-milissegundo para heaps típicos). Em telas que acumulam grandes grafos de objetos — stores Redux extensas, caches ilimitados, grandes descritores de imagem mantidos em JS — a fase de compactação pode levar vários milissegundos, produzindo uma queda de frame que aparece como um pico na thread JS no Time Profiler.

Estratégias de mitigação que se parecem com o gerenciamento de memória iOS:

| Padrão Swift / iOS | Equivalente React Native |
|---|---|
| `weak var` para quebrar retain cycles | Evitar closures que capturam grandes grafos de objetos indefinidamente |
| `autoreleasepool { }` em loops intensos | Processar dados de lista em lotes com `InteractionManager` |
| Instrumento Allocations do Instruments | Snapshot de heap do Hermes via aba de memória do Chrome DevTools |
| Reduzir heap de pico para evitar jetsam | Paginar dados de lista, cancelar inscrição de stores não utilizadas |

A diferença principal é a previsibilidade: o ARC fornece desalocação determinística sobre a qual você pode raciocinar no ponto de chamada. O GC do Hermes introduz pausas não determinísticas que se correlacionam com o tamanho do heap e a taxa de alocação. Se uma tela tem quedas de frame intermitentes que não se correlacionam com nenhum trabalho visível, uma pausa do GC do Hermes é um candidato provável.

## Lendo a Thread JS no Instruments Time Profiler

O Instruments Time Profiler é a ferramenta correta para perfilar a performance do React Native em um dispositivo real. Quando você perfila um app React Native, a thread JS aparece como uma thread estrangeira — ela não está listada sob o rótulo familiar `com.apple.main-thread`.

Procure por uma thread chamada `com.facebook.react.JavaScript` ou simplesmente `JavaScript` na lista de threads. No Hermes, essa thread roda dentro do espaço de processo do motor Hermes, embutido no seu app, mas sua call stack usa simbolização diferente do seu código Swift.

Configuração útil:

1. Compile o app em **modo release** com o scheme `Profile` para que o bytecode do Hermes seja otimizado e a taxa de frames corresponda à produção.
2. Ative **source maps** definindo `HERMES_ENABLE_DEBUGGER=1` e gerando um source map durante o passo de compilação do Hermes. Com um source map carregado, o Instruments pode resolver frames JS de volta às linhas originais do fonte TypeScript.
3. No Time Profiler, filtre pela thread JS para isolar o trabalho JavaScript da atividade das threads nativas.

Um perfil saudável da thread JS mostra breves rajadas de atividade (ciclos de render, event handlers) seguidas de tempo ocioso bem dentro do prazo de frame. Um perfil problemático mostra a thread JS ocupando a maior parte do orçamento de frame continuamente, ou exibindo uma única stack alta durante o que deveria ser um período ocioso (uma pausa de GC ou uma chamada síncrona de módulo).

A shadow thread, quando visível, aparece como `com.facebook.react.ShadowQueue` ou similar. Em um app Fabric, você deve ver commits de layout nessa thread como rajadas curtas e pouco frequentes — não como atividade contínua. Atividade contínua na shadow thread indica que sua árvore de componentes está re-renderizando e recomputando layout em uma taxa maior que o necessário, o que aponta para falta de memoização ou atualizações de estado excessivas.

## Resumo

| Conceito iOS | Equivalente React Native |
|---|---|
| `DispatchQueue.main` | Thread principal / UI (mutações de views nativas) |
| `DispatchQueue` de background | Thread JS (Hermes, seu código JavaScript) |
| Passo de layout antes do `drawRect:` | Commit de layout Yoga na shadow thread do Fabric |
| `DispatchQueue.main.async { }` | `runOnUI()` no Reanimated |
| `CABasicAnimation` na thread principal | `useNativeDriver: true` no Animated |
| `asyncAfter` para adiar trabalho pós-transição | `InteractionManager.runAfterInteractions()` |
| Desalocação determinística do ARC | GC do Hermes com pausas de compactação ocasionais |
| Instruments Time Profiler | Mesma ferramenta — encontre a thread JS como thread estrangeira |

O contrato de threading no React Native é o mesmo contrato que o UIKit aplica: mantenha a thread principal livre, empurre trabalho para threads de background e confirme resultados na UI em lotes atômicos. O Fabric e a JSI tornam esse contrato mais eficiente ao eliminar o overhead de serialização. As ferramentas de depuração — Instruments, o instrumento Core Animation, o Time Profiler — são as mesmas ferramentas que você já usa; apenas os nomes das threads mudam.
