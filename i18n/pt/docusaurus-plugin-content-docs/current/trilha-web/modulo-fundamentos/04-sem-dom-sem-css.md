---
title: Sem DOM, Sem CSS — O Que Isso Significa na Prática
---

# Sem DOM, Sem CSS — O Que Isso Significa na Prática

> Esta é a mudança de mentalidade mais difícil para desenvolvedores web. Vamos tornar isso concreto.

## Sem `document`, Sem `window`

Esses globais do browser simplesmente não existem no React Native:

```typescript
//  Nada disso existe no React Native
document.getElementById('app');
document.querySelector('.button');
document.createElement('div');
window.scrollTo(0, 0);
window.innerWidth;
window.addEventListener('resize', handler);
window.location.href;
navigator.geolocation;    // ← removido do core do RN na 0.60 — use expo-location
navigator.clipboard;      // ← não disponível — use expo-clipboard
```

```typescript
//  Equivalentes no React Native
// Obter ref de elemento → useRef()
// Scroll → ref.current.scrollTo()
// Dimensões da tela → Dimensions.get('window') ou useWindowDimensions()
// Resize/orientação → o hook useWindowDimensions() atualiza automaticamente
// Navegação → React Navigation (ou Expo Router se usar Expo)
// Geolocalização → expo-location
// Clipboard → expo-clipboard
```

---

## Sem `innerHTML`, Sem Manipulação Direta do DOM

Você não pode modificar a árvore de views nativas imperativamente como faz com o DOM.

```typescript
//  Web — manipulação direta do DOM
document.getElementById('title').innerHTML = '<strong>Novo Título</strong>';
element.classList.add('active');
element.style.backgroundColor = 'red';

//  React Native — TODAS as mudanças passam pelo estado → re-renderização
const [title, setTitle] = useState('Título Antigo');
const [isActive, setIsActive] = useState(false);

<Text style={[styles.title, isActive && styles.active]}>
    {title}
</Text>
```

Esta é na verdade a mesma restrição que o próprio React impõe na web. Se você tem usado React corretamente (sem `document.querySelector` no useEffect), você já está acostumado com isso.

---

## Sem Seletores CSS, Sem Cascata

```css
/*  Nada disso funciona no React Native */
.card > .title { font-size: 18px; }
.card:hover { background-color: #f5f5f5; }
.button:focus { outline: 2px solid blue; }
@media (max-width: 768px) { .sidebar { display: none; } }
* { box-sizing: border-box; }
:root { --primary: #0064d2; }
```

```typescript
//  React Native — sem seletores, sem cascata, sem hover, sem media queries
// Você expressa tudo isso em JS

// Relação pai-filho → prop drilling ou composição
<Card titleStyle={{ fontSize: 18 }}>...</Card>

// Equivalente de hover → estado do Pressable
<Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>

// Focus → gerenciado internamente pelo React Native

// Media queries → hook useWindowDimensions()
const { width } = useWindowDimensions();
const isTablet = width >= 768;
<View style={[styles.container, isTablet && styles.containerTablet]} />

// Variáveis CSS → arquivo de constantes JS
import { colors } from './theme';
<View style={{ backgroundColor: colors.primary }} />
```

---

## Sem `box-sizing`, Sem `display: block` vs `inline`

O React Native tem um modelo de layout simplificado:

- **Todo componente é um flex container por padrão** — sem distinção de block vs inline vs inline-block
- **`box-sizing: border-box` é o padrão** — você não precisa definir isso
- **`display: 'none'` funciona** — e se comporta **igual à web**: o componente permanece montado (estado preservado), mas fica oculto e não ocupa espaço. Isso não é uma diferença do React Native — na web, `display: none` também mantém o componente React montado com seu estado intacto.

  ```tsx
  // display: 'none' — componente permanece montado (estado preservado), mas oculto e sem ocupar espaço
  // Comportamento idêntico à web
  <MyComponent style={{ display: isVisible ? 'flex' : 'none' }} />

  // Renderização condicional — componente é completamente desmontado (estado perdido, memória liberada)
  // Também idêntico à web
  {isVisible && <MyComponent />}
  ```
  Use `display: 'none'` quando precisar preservar o estado ao ocultar (ex.: telas de tabs, onde o usuário quer voltar de onde parou). Use renderização condicional quando quiser uma desmontagem limpa.

---

## Propriedades de Layout que Não Existem no RN

| Propriedade CSS | Status no RN |
|---|---|
| `display: grid` | ❌ — use Flexbox aninhado |
| `display: inline-flex` | ❌ — use `flexDirection: 'row'` |
| `display: contents` / `block` / `inline` | ❌ — `display` é efetivamente `flex` ou `none` |
| `float: left/right` | ❌ — use `flexDirection: 'row'` |
| `overflow: scroll` | ❌ — use `ScrollView` ou `FlatList` |
| `clip-path` | ❌ — use `overflow: 'hidden'` com `borderRadius` |
| `grid-template-columns` | ❌ — use `FlatList` com prop `numColumns` |
| CSS `transition` | ❌ — use Reanimated ou `Animated.spring/timing` |
| CSS `animation` | ❌ — use worklets do Reanimated |
| Unidades `vh`, `vw` | ❌ — use `Dimensions.get('window').height/width` |
| `calc()` | ❌ — faça o cálculo em JavaScript |
| Unidades `em`, `rem` | ❌ — use números brutos (pixels independentes de dispositivo) |
| `order` | ❌ — a ordem é determinada pela ordem no JSX |
| `place-items` / `place-content` / `place-self` | ❌ — atalhos não existem |
| `visibility` | ❌ — use `display: 'none'` ou `opacity: 0` |
| `overflow: hidden` | ✅ funciona |
| `z-index` | ✅ funciona como `zIndex` (ordena irmãos; não cria stacking context completo do CSS) |
| `gap` / `rowGap` / `columnGap` | ✅ desde o RN 0.71 |
| `position: 'static'` | ✅ desde o RN 0.74 (Yoga 3.0) — opt-in; elementos static são ignorados como containing block para filhos `absolute` |
| `alignContent: 'space-evenly'` | ✅ desde o RN 0.74 (Yoga 3.0) |
| `boxShadow` / `filter` | ✅ desde o RN 0.76 (New Architecture) |

---

## `position` — Como Difere do CSS

Vindo da web, há duas diferenças importantes:

- **O padrão é `relative`, não `static`.** Todo elemento começa como `relative` no RN. Diferente da web, um elemento `relative` no RN pode ser deslocado com `top`/`left`/etc. (movendo-o sem afetar irmãos).
- **`absolute` sempre ancora no pai direto (pré-0.74).** Na web, `position: absolute` encontra o ancestral *posicionado* mais próximo. Antes do RN 0.74, sempre ancorava no pai direto — não existia o conceito de "ancestral posicionado mais próximo".
- **`position: 'static'` foi adicionado no RN 0.74 (Yoga 3.0).** Elementos marcados como `static` não podem ser deslocados *e são ignorados* quando um filho `absolute` busca seu containing block — permitindo posicionar um elemento absolute em relação a um ancestral não-pai (comportamento web-like, mas opt-in).

```tsx
// Pré-0.74: absolute sempre ancora no pai
// 0.74+: marque nós intermediários como static para pulá-los
<View style={{ position: 'relative' }}>
  <View style={{ position: 'static' }}>   {/* ignorado como containing block */}
    <View style={{ position: 'absolute', top: 0, left: 0 }} />
    {/* ancora no View avô, não neste pai static */}
  </View>
</View>
```

`zIndex` funciona, mas não cria o stacking context completo do CSS — a ordem dos irmãos e as regras de overlay da plataforma também influenciam como os elementos se sobrepõem.

---

## Sem `position: sticky`

Na web, posicionamento sticky mantém um header visível durante o scroll. No RN, você lida com isso de forma diferente:

```tsx
// Web: CSS position: sticky
<div style={{ position: 'sticky', top: 0 }}>Header fixo</div>

// React Native: stickyHeaderIndices no FlatList
<FlatList
    data={items}
    renderItem={renderItem}
    stickyHeaderIndices={[0]}  // o primeiro item ficará fixo
    ListHeaderComponent={<StickyHeader />}
/>
```

---

## O Que Você Tem

O RN suporta um subconjunto útil de layout e estilo:

| Suportado | Notas |
|-----------|-------|
| Todas as propriedades Flexbox | Coluna por padrão |
| `borderRadius`, `borderWidth`, `borderColor` | Funciona idêntico ao CSS |
| `backgroundColor`, `opacity` | — |
| `overflow: 'hidden'` | Recorta filhos |
| `position: 'absolute'` / `'relative'` | Sem `fixed` ou `sticky` |
| `zIndex` | — |
| `transform` | Sintaxe de array: `[{ translateX: 10 }, { rotate: '45deg' }]` |
| `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` | Sombra iOS. No Android 9+ (API 28), `shadowColor` + `elevation` colore a sombra. Em Android mais antigo, `shadowColor` é ignorado silenciosamente. |
| `elevation` | Profundidade da sombra Android. Combine com `shadowColor` no Android 9+ para sombra colorida. |
| `boxShadow` | Cross-platform (New Architecture, RN 0.76+). Sintaxe compatível com CSS, suporta múltiplas sombras e `inset`. |
| `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`, `textAlign`, `textDecorationLine` | Apenas em `<Text>`, não em `<View>` |

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| Referência de Propriedades de Estilo RN | Oficial | [reactnative.dev/docs/view-style-props](https://reactnative.dev/docs/view-style-props) |
| Motor de Layout Yoga | Referência | [yogalayout.dev](https://yogalayout.dev/) |

---

Próximo → **[Componentes Nativos para Devs Web](./componentes-nativos)**
