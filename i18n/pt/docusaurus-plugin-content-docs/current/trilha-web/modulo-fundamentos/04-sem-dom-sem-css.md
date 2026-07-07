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
- **`display: 'none'` funciona** — mas se comporta diferente da renderização condicional:

  ```tsx
  // display: 'none' — componente permanece montado (estado preservado), mas oculto e sem ocupar espaço
  <MyComponent style={{ display: isVisible ? 'flex' : 'none' }} />

  // Renderização condicional — componente é completamente desmontado (estado perdido, memória liberada)
  {isVisible && <MyComponent />}
  ```
  Use `display: 'none'` quando precisar preservar o estado ao ocultar (ex.: telas de tabs). Use renderização condicional quando quiser uma desmontagem limpa.

---

## Propriedades de Layout que Não Existem no RN

| Propriedade CSS | Alternativa React Native |
|---|---|
| `display: grid` | Use Flexbox aninhado |
| `display: inline-flex` | Use `flexDirection: 'row'` |
| `float: left/right` | Use `flexDirection: 'row'` |
| `overflow: scroll` | Use `ScrollView` ou `FlatList` |
| `overflow: hidden` | `overflow: 'hidden'` funciona |
| `z-index` | `zIndex` funciona |
| `clip-path` | Não suportado (use `overflow: 'hidden'` com `borderRadius`) |
| `grid-template-columns` | Use `FlatList` com prop `numColumns` |
| CSS `transition` | Use Reanimated ou `Animated.spring/timing` |
| CSS `animation` | Use worklets do Reanimated |
| Unidades `vh`, `vw` | Use `Dimensions.get('window').height/width` |
| `calc()` | Faça o cálculo em JavaScript |
| Unidades `em`, `rem` | Use números brutos (pixels independentes de dispositivo) |

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
| `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` | **Apenas iOS** — ignorado silenciosamente no Android |
| `elevation` | Sombra **apenas Android** — cinza, não customizável |
| `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`, `textAlign`, `textDecorationLine` | Apenas em `<Text>`, não em `<View>` |

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| Referência de Propriedades de Estilo RN | Oficial | [reactnative.dev/docs/view-style-props](https://reactnative.dev/docs/view-style-props) |
| Motor de Layout Yoga | Referência | [yogalayout.dev](https://yogalayout.dev/) |

---

Próximo → **[Componentes Nativos para Devs Web](./componentes-nativos)**
