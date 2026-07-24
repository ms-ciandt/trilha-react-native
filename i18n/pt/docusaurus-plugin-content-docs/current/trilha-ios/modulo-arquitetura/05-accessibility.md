---
title: Accessibility
---

# Acessibilidade

Desenvolvedores iOS já estão familiarizados com UIAccessibility — o framework que alimenta VoiceOver, Dynamic Type e Reduce Motion nas plataformas Apple. O React Native expõe conceitos equivalentes por meio de sua própria API de acessibilidade, mapeando de forma próxima o que você conhece do UIKit. Este documento percorre cada conceito lado a lado para que você possa transferir seu modelo mental existente sem precisar redescobrir os fundamentos.

## UIAccessibility traits → accessibilityRole

No UIKit, você atribui traits a uma view usando a propriedade `accessibilityTraits`:

```swift
// Swift
button.accessibilityTraits = [.button, .selected]
label.accessibilityTraits = .header
```

O React Native substitui isso pela prop `accessibilityRole`, que aceita um único valor string:

```tsx
// React Native
<Pressable accessibilityRole="button">
  <Text>Submit</Text>
</Pressable>

<Text accessibilityRole="header">Section Title</Text>
```

O mapeamento entre as traits do UIAccessibility e os roles do React Native é quase um-para-um:

| UIAccessibilityTraits         | accessibilityRole     |
|-------------------------------|-----------------------|
| `.button`                     | `"button"`            |
| `.link`                       | `"link"`              |
| `.header`                     | `"header"`            |
| `.image`                      | `"image"`             |
| `.selected`                   | via `accessibilityState={{ selected: true }}` |
| `.adjustable`                 | `"adjustable"`        |
| `.searchField`                | `"search"`            |
| `.staticText`                 | `"text"`              |
| `.none`                       | `"none"`              |

Quando um role não tem equivalente direto, use `"none"` e combine com `accessibilityLabel` para fornecer contexto. A prop `accessibilityState` lida com traits dinâmicas como `disabled`, `selected`, `checked` e `expanded`:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled: isLoading, busy: isLoading }}
  onPress={handleSubmit}
>
  <Text>Submit</Text>
</Pressable>
```

## accessibilityLabel vs UIAccessibility.label

No UIKit, o rótulo que o VoiceOver lê em voz alta é definido por meio da propriedade `accessibilityLabel` em qualquer `UIView`:

```swift
imageView.accessibilityLabel = "Profile photo of Maria Costa"
```

O React Native usa o mesmo nome de prop:

```tsx
<Image
  source={{ uri: profilePhotoUrl }}
  accessibilityLabel="Profile photo of Maria Costa"
  accessibilityRole="image"
/>
```

As regras se transferem diretamente. Um rótulo deve ser conciso, evitar redundância com o anúncio do role (o VoiceOver acrescenta o role automaticamente) e descrever o propósito em vez da aparência. Imagens decorativas que não carregam informação devem ser completamente ocultadas usando `accessible={false}`.

## accessibilityHint vs UIAccessibility.hint

O UIKit separa o rótulo de uma dica mais longa que descreve o que acontece quando o usuário interage com o elemento:

```swift
button.accessibilityLabel = "Delete"
button.accessibilityHint = "Removes this message from your inbox"
```

O React Native expõe a mesma separação:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Delete"
  accessibilityHint="Removes this message from your inbox"
  onPress={handleDelete}
>
  <Text>Delete</Text>
</Pressable>
```

Os usuários podem desativar as dicas nas configurações de Acessibilidade do iOS. Trate as dicas como informações complementares, nunca como a única forma de entender o que um controle faz. Mantenha-as no modo imperativo ("Removes this message") em vez de descrever o gesto ("Double tap to remove").

## accessibilityValue

A prop `accessibilityValue` comunica o valor atual de controles ajustáveis — o equivalente de `accessibilityValue` em um `UISlider` ou `UIAccessibilityElement` personalizado:

```swift
// Swift
slider.accessibilityValue = "\(Int(slider.value)) percent"
```

O React Native aceita um objeto com os campos `min`, `max`, `now` e `text`:

```tsx
<Slider
  accessibilityRole="adjustable"
  accessibilityLabel="Volume"
  accessibilityValue={{ min: 0, max: 100, now: volume, text: `${volume} percent` }}
  value={volume}
  onValueChange={setVolume}
/>
```

Use `text` quando um valor numérico isolado não é significativo. Para uma barra de progresso, `now` combinado com `min` e `max` é suficiente, pois o VoiceOver anunciará o percentual automaticamente.

## isAccessibilityElement → accessible

No UIKit, definir `isAccessibilityElement = false` remove uma view da árvore de acessibilidade. O padrão depende do tipo de view — `UILabel` e `UIButton` assumem `true` por padrão, enquanto `UIView` assume `false`.

O React Native inverte o padrão para views de container. A prop `accessible`, quando definida como `true` em uma `View`, faz com que essa view e todos os seus filhos sejam tratados como um único elemento focalizável pelo VoiceOver:

```tsx
// Este card inteiro se torna uma unidade focalizável
<View
  accessible={true}
  accessibilityLabel="Product: Running Shoes, price: R$ 299"
  accessibilityRole="button"
  onTouchEnd={handleCardPress}
>
  <Image source={shoesImage} />
  <Text>Running Shoes</Text>
  <Text>R$ 299</Text>
</View>
```

Para remover explicitamente um elemento decorativo da árvore de acessibilidade, use `importantForAccessibility="no-hide-descendants"` — o equivalente a definir `isAccessibilityElement = false` em um container e fazer isso cascatear para seus filhos:

```tsx
<View importantForAccessibility="no-hide-descendants">
  <Image source={decorativeBackground} />
</View>
```

Os valores `"yes"`, `"no"` e `"no-hide-descendants"` espelham a lógica de `isAccessibilityElement` do `UIAccessibility` no UIKit.

## UIAccessibility.post(.screenChanged) → AccessibilityInfo.announceForAccessibility

Quando uma atualização de view acontece fora de uma transição de navegação — uma mensagem toast aparece, um erro de validação surge, uma seção da tela recarrega — o UIKit usa o sistema de notificações para avisar ao VoiceOver onde redirecionar o foco ou o que ler em voz alta:

```swift
UIAccessibility.post(notification: .screenChanged, argument: errorMessageLabel)
UIAccessibility.post(notification: .announcement, argument: "3 items added to cart")
```

O React Native fornece `AccessibilityInfo` para o equivalente de anúncios:

```tsx
import { AccessibilityInfo } from 'react-native';

function CartButton({ count }: { count: number }) {
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current) {
      AccessibilityInfo.announceForAccessibility(
        `${count} items in cart`
      );
      prevCount.current = count;
    }
  }, [count]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Cart, ${count} items`}>
      <Text>{count}</Text>
    </Pressable>
  );
}
```

Para redirecionar o foco do VoiceOver após uma atualização de tela — equivalente a passar uma `UIView` como argumento para `.screenChanged` — use uma ref e `AccessibilityInfo.setAccessibilityFocus`:

```tsx
import { findNodeHandle, AccessibilityInfo } from 'react-native';

const headingRef = useRef<Text>(null);

useEffect(() => {
  if (screenReady && headingRef.current) {
    const node = findNodeHandle(headingRef.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }
}, [screenReady]);

return <Text ref={headingRef} accessibilityRole="header">Results</Text>;
```

## Dynamic Type: UIFont.preferredFont(forTextStyle:) → allowFontScaling

O UIKit respeita o tamanho de texto preferido do usuário usando `UIFont.preferredFont(forTextStyle:)` e observando `UIContentSizeCategory.didChangeNotification`:

```swift
label.font = UIFont.preferredFont(forTextStyle: .body)
label.adjustsFontForContentSizeCategory = true
```

O componente `Text` do React Native escala com o Dynamic Type por padrão por meio da prop `allowFontScaling`, que assume `true`. Raramente é necessário defini-la explicitamente, a menos que você esteja intencionalmente optando por sair desse comportamento:

```tsx
// Escala com Dynamic Type — comportamento padrão
<Text style={{ fontSize: 16 }}>Body content</Text>

// Tamanho fixo, ignora preferências do usuário — use com moderação
<Text allowFontScaling={false} style={{ fontSize: 11 }}>Legal footnote</Text>
```

Para layouts que precisam se adaptar a tamanhos de texto maiores — equivalente a usar `UIContentSizeCategory.isAccessibilityCategory` para alternar para uma pilha vertical — use `useWindowDimensions` combinado com `PixelRatio.getFontScale`:

```tsx
import { useWindowDimensions, PixelRatio } from 'react-native';

function AdaptiveRow() {
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  const isLargeText = fontScale > 1.3;

  return (
    <View style={{ flexDirection: isLargeText ? 'column' : 'row' }}>
      <Text style={{ fontSize: 16 }}>Label</Text>
      <TextInput style={{ flex: 1 }} />
    </View>
  );
}
```

`PixelRatio.getFontScale()` retorna o multiplicador que o sistema aplica aos tamanhos de fonte — equivalente a ler `UIApplication.shared.preferredContentSizeCategory` e mapeá-lo para um fator de escala.

## Reduce Motion: UIAccessibility.isReduceMotionEnabled → useAnimatedStyle

No iOS, você verifica a configuração de acessibilidade Reduce Motion antes de executar animações:

```swift
if UIAccessibility.isReduceMotionEnabled {
  view.alpha = 1
} else {
  UIView.animate(withDuration: 0.3) { view.alpha = 1 }
}
```

No React Native com Reanimated 3, use o hook `useReducedMotion` e ramifique sua lógica de animação adequadamente:

```tsx
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

function FadeInCard({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
    } else {
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
```

Para casos em que você também precisa responder à mudança da configuração em tempo de execução — equivalente a observar `UIAccessibility.reduceMotionStatusDidChangeNotification` — use `AccessibilityInfo.addEventListener`:

```tsx
useEffect(() => {
  const subscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    (isEnabled) => {
      setReduceMotion(isEnabled);
    }
  );
  return () => subscription.remove();
}, []);
```

## accessibilityViewIsModal para Modais

O UIKit marca uma view como container modal usando a propriedade `accessibilityViewIsModal`, que informa ao VoiceOver para ignorar tudo fora dessa view:

```swift
modalView.accessibilityViewIsModal = true
```

O componente `Modal` do React Native aplica isso automaticamente quando `visible` é `true`. Se você estiver construindo uma bottom sheet ou overlay personalizado sem usar o `Modal` nativo, aplique a prop equivalente diretamente:

```tsx
<View
  accessibilityViewIsModal={true}
  style={styles.bottomSheet}
>
  <Text accessibilityRole="header">Filter options</Text>
  {/* sheet content */}
</View>
```

Sem essa prop em um overlay personalizado, o VoiceOver continuará lendo o conteúdo por trás da sheet, criando uma experiência confusa idêntica a definir `accessibilityViewIsModal = false` no UIKit quando um modal personalizado é apresentado.

## Agrupando Elementos com accessibilityRole="none"

Um padrão comum no UIKit é agrupar rótulos relacionados em um único elemento acessível para que o VoiceOver os leia juntos em vez de pausar em cada filho:

```swift
let container = UIView()
container.isAccessibilityElement = true
container.accessibilityLabel = "3 unread messages, last from Maria, 2 minutes ago"
```

No React Native, defina `accessible={true}` no container e, opcionalmente, use `accessibilityRole="none"` quando o container em si não tem um role semântico, mas ainda deve ser um único ponto de foco:

```tsx
<View
  accessible={true}
  accessibilityRole="none"
  accessibilityLabel="3 unread messages, last from Maria, 2 minutes ago"
>
  <Text>3 unread</Text>
  <Text>Last from Maria</Text>
  <Text>2 minutes ago</Text>
</View>
```

Use esse padrão para células de linha de lista que contêm múltiplos elementos de texto, indicadores de status ao lado de rótulos e linhas de metadados onde os fragmentos individuais não são úteis de forma isolada. Evite-o para containers cujos filhos são individualmente acionáveis — nesses casos, cada elemento interativo deve permanecer seu próprio alvo de foco.

## Testando com VoiceOver: Simulador vs Dispositivo Físico

O Simulador iOS suporta VoiceOver — ative-o nas Configurações do Simulador em Acessibilidade — mas tem limitações significativas em comparação com um dispositivo físico:

- Gestos de deslize não estão disponíveis; você deve usar o Accessibility Inspector no Xcode para navegar pela árvore de acessibilidade
- A saída de áudio para a fala do VoiceOver é roteada para os alto-falantes do Mac e pode se comportar de forma diferente de um dispositivo real
- O feedback háptico das interações do sistema está ausente
- Alguns comportamentos de temporização em torno de mudanças de foco são diferentes

Use o Simulador com o Accessibility Inspector do Xcode para iteração rápida na estrutura da árvore de acessibilidade — verificando rótulos, roles e dicas sem precisar de um dispositivo por perto. Para validação final, sempre teste em um iPhone físico com VoiceOver habilitado via Configurações > Acessibilidade > VoiceOver ou o Atalho de Acessibilidade de triplo clique.

Em um dispositivo físico, teste especificamente os seguintes cenários:

- Deslize para a direita por cada elemento interativo em uma tela para confirmar que a ordem de leitura corresponde à ordem visual
- Dê duplo toque em cada botão para confirmar que a ação é executada corretamente
- Para controles ajustáveis, deslize para cima e para baixo para confirmar que as mudanças de valor são anunciadas
- Navegue para dentro e fora de modais para confirmar que o foco fica corretamente preso dentro e é restaurado ao fechar
- Altere o Dynamic Type para o maior tamanho de acessibilidade e verifique se os layouts não se sobrepõem ou truncam
- Ative o Reduce Motion e verifique se nenhuma animação que cause desconforto é reproduzida

O Accessibility Inspector no Xcode (Xcode > Open Developer Tool > Accessibility Inspector) conecta-se tanto ao Simulador quanto a um dispositivo físico via USB, tornando-o a ferramenta mais eficiente para inspecionar a árvore de acessibilidade do React Native durante o desenvolvimento.
