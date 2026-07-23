---
title: Estilização & Flexbox para Desenvolvedores Web
---

# Estilização & Flexbox para Desenvolvedores Web

> Seu conhecimento de CSS se transfere diretamente para o Flexbox do React Native. As principais diferenças são os valores padrão e a ausência de propriedades exclusivas da web.

## O Que Muda em Relação ao CSS

### Nomes de Propriedades — camelCase

```css
/* CSS */
background-color: #fff;
font-size: 16px;
border-radius: 8px;
padding-horizontal: 16px;  /* não existe no CSS */
```

```typescript
// React Native StyleSheet
backgroundColor: '#fff',   // camelCase, sem hífens
fontSize: 16,              // sem unidade 'px' — números são pixels independentes de densidade
borderRadius: 8,
paddingHorizontal: 16,     // atalho do RN (= paddingLeft + paddingRight)
```

### Sem Unidades

```typescript
// Todos os valores são números sem unidade = pixels independentes de densidade
// Equivalente a px CSS em telas 1x; escala automaticamente em telas 2x/3x
fontSize: 16,       // NÃO '16px', NÃO '1rem'
padding: 16,        // NÃO '16px'
borderRadius: 8,    // NÃO '8px'
width: 200,         // largura fixa em dp
width: '100%',      // strings de porcentagem SÃO suportadas para algumas propriedades
```

### Flexbox tem Padrão Column

```typescript
// Padrão CSS Flexbox:    flexDirection: 'row'
// Padrão React Native:   flexDirection: 'column'

// Para obter uma linha horizontal no RN (como um flex div horizontal):
<View style={{ flexDirection: 'row' }}>
```

---

## Guia Rápido do Flexbox (Específico do RN)

```typescript
// Propriedades do contêiner
flexDirection: 'column' | 'row' | 'column-reverse' | 'row-reverse'
justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
alignContent: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around'
flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'
gap: 8               // RN 0.71+ — gap entre itens (como o CSS gap)
rowGap: 8
columnGap: 8

// Propriedades dos filhos
flex: 1              // veja a seção "O atalho flex" abaixo
flexGrow: 1          // quanto crescer
flexShrink: 1        // quanto encolher
flexBasis: 'auto' | 100  // tamanho inicial antes de crescer/encolher
alignSelf: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch'
```

---

## O Atalho `flex` é Diferente do CSS

No CSS, `flex` é um atalho de até três valores (`flex-grow flex-shrink flex-basis`). No React Native, `flex` aceita **apenas um número** — strings com múltiplos valores como `flex: 1 1 auto` não existem.

| Valor | Equivale a |
|---|---|
| `flex: N` (positivo) | `flexGrow: N, flexShrink: 1, flexBasis: 0` |
| `flex: 0` | `flexGrow: 0, flexShrink: 0, flexBasis: auto` (dimensionado por width/height) |
| `flex: -1` | `flexGrow: 0, flexShrink: 1, flexBasis: auto` |

Para combinações que o atalho não expressa, defina `flexGrow`, `flexShrink` e `flexBasis` individualmente.

---

## Os Dois Padrões Mais Comuns

### 1. Preencher a Tela

```tsx
// Faz um componente preencher todo o espaço disponível (como height: 100vh no CSS)
<View style={{ flex: 1 }}>
    {/* preenche a tela */}
</View>
```

### 2. Centralizar Conteúdo

```tsx
// Centraliza horizontal e verticalmente (como centralização flexbox no CSS)
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Centralizado!</Text>
</View>
```

---

## Prática Interativa

O mesmo modelo Flexbox que você já conhece do CSS web funciona no RN:

 **[Jogar Flexbox Froggy](https://flexboxfroggy.com/)** — 24 níveis interativos. Cada conceito que você aprender aqui se aplica diretamente no RN.

---

## Sombra e Elevação

O `box-shadow` do CSS se divide em dois no RN — e eles se comportam de forma diferente por plataforma:

```typescript
const styles = StyleSheet.create({
    card: {
        // Sombra iOS — todas as quatro propriedades são necessárias juntas
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,

        // Sombra Android — elevation define a forma da sombra.
        // No Android 9+ (API 28), shadowColor + elevation colore a sombra.
        // Em Android mais antigo, shadowColor é ignorado silenciosamente (sombra sempre cinza).
        elevation: 3,
        shadowColor: '#000', // colore a sombra no Android 9+
    },
});
```

### RN 0.76+: `boxShadow` (cross-platform, New Architecture)

O RN 0.76 introduziu `boxShadow` como propriedade de estilo cross-platform, com sintaxe compatível com CSS incluindo múltiplas sombras e `inset`:

```typescript
const styles = StyleSheet.create({
    card: {
        // Mesma sintaxe que o CSS box-shadow — funciona em iOS e Android
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        // Múltiplas sombras e inset também são suportados:
        // boxShadow: '0 1px 3px #0003, inset 0 1px 0 #fff2',
    },
});
```

:::note Legado vs New Architecture
`boxShadow` requer a New Architecture (padrão no RN 0.76+). Para apps ainda na arquitetura legada, use `shadowColor`/`elevation` conforme mostrado acima.
:::

---

## Transforms

Mesmo que as transforms do CSS, mas escritas como um array de objetos dentro da prop de estilo:

```tsx
// CSS: transform: translateX(10px) rotate(45deg) scale(1.2);

// React Native — array de objetos com chave única:
<View style={{
    transform: [
        { translateX: 10 },
        { rotate: '45deg' },
        { scale: 1.2 },
    ],
}} />
```

---

## Design Responsivo Sem Media Queries

```tsx
import { useWindowDimensions } from 'react-native';

function ResponsiveLayout() {
    const { width } = useWindowDimensions();

    // Breakpoints em JS
    const isTablet = width >= 768;
    const isLargeTablet = width >= 1024;

    return (
        <View style={[
            styles.container,
            isTablet && styles.containerTablet,
        ]}>
            <View style={{ width: isTablet ? width * 0.4 : '100%' }}>
                <Sidebar />
            </View>
            {isTablet && (
                <View style={{ flex: 1 }}>
                    <MainContent />
                </View>
            )}
        </View>
    );
}
```

---

## NativeWind — Tailwind no React Native

Se você vive no Tailwind na web, o **NativeWind** traz as mesmas classes utilitárias para o RN:

:::warning NativeWind v4 requer várias etapas de configuração
O comando de instalação sozinho não funciona — os estilos parecerão compilar mas nunca serão aplicados (falha silenciosa).
:::

**1. Instalar pacotes**
```bash
npx expo install nativewind tailwindcss
```

**2. Configurar `tailwind.config.js`**
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

**4. Criar `global.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**4. Atualizar `babel.config.js`**

O NativeWind v4 usa um Babel preset, não um plugin. A configuração abaixo é obrigatória — usar `plugins: ['nativewind/babel']` (o jeito do v2) compila sem erros mas os estilos nunca são aplicados.

```js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
            'nativewind/babel',
        ],
    };
};
```

:::warning NativeWind v4 requer Tailwind CSS 3.x
O NativeWind v4 **não é compatível com o Tailwind CSS v4**. Fixe o Tailwind na faixa v3: `npm install tailwindcss@^3`. Usar o Tailwind v4 causa falha silenciosa nos estilos.
:::

**5. Atualizar `metro.config.js`**
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

**6. Importar `global.css` no `_layout.tsx` raiz**
```tsx
import '../global.css';
```

Agora as classes Tailwind funcionam:

```tsx
<View className="flex-1 bg-white p-4">
    <Text className="text-lg font-bold text-gray-900">Título</Text>
    <Text className="text-sm text-gray-500 mt-1">Subtítulo</Text>
</View>
```

:::note NativeWind não é obrigatório
A abordagem oficial é `StyleSheet.create`. O NativeWind compila classes Tailwind para estilos RN em tempo de build. Docs completos de configuração: [nativewind.dev/getting-started/expo-router](https://www.nativewind.dev/getting-started/expo-router)
:::

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| Flexbox Froggy | Jogo Interativo | [flexboxfroggy.com](https://flexboxfroggy.com/) |
| Docs Flexbox RN | Oficial | [reactnative.dev/docs/flexbox](https://reactnative.dev/docs/flexbox) |
| NativeWind | Community | [nativewind.dev](https://www.nativewind.dev/) |
| Yoga Layout | Referência | [yogalayout.dev](https://yogalayout.dev/) |

---

Próximo → **[Listas & Navegação](./listas-navegacao)**
