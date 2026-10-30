---
title: "Theming: Material3 vs React Native"
sidebar_label: "Theming"
sidebar_position: 5
---

## Video Overview

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/compose_05_theming_material3_vs_rn.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/compose_05_theming_material3_vs_rn.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## O Problema que Ambos Resolvem

O Material3 do Jetpack Compose fornece um sistema de design estruturado baseado em tokens: papéis de cor (primary, surface, onSurface...), escala tipográfica, tokens de forma e suporte a dark mode integrado ao `MaterialTheme`. Todos os componentes leem esses tokens automaticamente.

O React Native não tem um sistema de design embutido. O ecossistema tem duas abordagens dominantes:

1. **Tema customizado via React Context** — criar seu próprio sistema de tokens com `useColorScheme` + `createContext`
2. **React Native Paper** — implementação do Material Design 3 para React Native, o equivalente mais próximo do `MaterialTheme` do Compose

Ambas são abordagens legítimas. Apps grandes em produção comumente usam um sistema customizado baseado em Context. Times migrando do Android e que querem paridade com o Material3 usam o Paper. Este arquivo cobre as duas.

---

## useColorScheme — Base do Dark Mode

### Compose

```kotlin
val darkTheme = isSystemInDarkTheme()
MaterialTheme(
    colorScheme = if (darkTheme) EsquemaEscuro else EsquemaClaro
) {
    App()
}
```

### React Native

```tsx
import { useColorScheme } from 'react-native';

function App() {
  const esquema = useColorScheme(); // 'light' | 'dark' | null
  const isDark = esquema === 'dark';

  return (
    <ProvedorTema value={isDark ? temaEscuro : temaClaro}>
      <NavegadorPrincipal />
    </ProvedorTema>
  );
}
```

`useColorScheme` lê a configuração do sistema operacional — o mesmo que `isSystemInDarkTheme()` no Compose.

---

## Sistema de Tema Customizado (Padrão de Produção)

### 1. Definir Tokens

```tsx
// tema/tokens.ts
export const cores = {
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  surface: '#FFFBFE',
  onSurface: '#1C1B1F',
  background: '#FFFBFE',
  error: '#B3261E',
  outline: '#79747E',
} as const;

export const coresEscuras: typeof cores = {
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  surface: '#1C1B1F',
  onSurface: '#E6E1E5',
  background: '#1C1B1F',
  error: '#F2B8B5',
  outline: '#938F99',
} as const;

export const espacamento = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
} as const;

export const tipografia = {
  displayLarge: { fontSize: 57, lineHeight: 64, letterSpacing: -0.25, fontWeight: '400' as const },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '400' as const },
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '400' as const },
  bodyLarge: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5, fontWeight: '400' as const },
  labelSmall: { fontSize: 11, lineHeight: 16, letterSpacing: 0.5, fontWeight: '500' as const },
} as const;

export type Cores = typeof cores;
export type Tema = {
  cores: Cores;
  espacamento: typeof espacamento;
  tipografia: typeof tipografia;
  isDark: boolean;
};
```

### 2. Criar Contexto

```tsx
// tema/ContextoTema.tsx
import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { cores, coresEscuras, espacamento, tipografia } from './tokens';
import type { Tema } from './tokens';

const ContextoTema = createContext<Tema>({
  cores, espacamento, tipografia, isDark: false,
});

export function ProvedorTema({ children }: { children: React.ReactNode }) {
  const esquema = useColorScheme();
  const isDark = esquema === 'dark';
  const tema: Tema = {
    cores: isDark ? coresEscuras : cores,
    espacamento, tipografia, isDark,
  };
  return <ContextoTema.Provider value={tema}>{children}</ContextoTema.Provider>;
}

export function useTema() {
  return useContext(ContextoTema);
}
```

### 3. Consumir nos Componentes

```tsx
import { useTema } from '../tema/ContextoTema';

function BotaoPrimario({ label, onPress }: { label: string; onPress: () => void }) {
  const { cores, tipografia, espacamento } = useTema();

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: cores.primary,
        paddingVertical: espacamento.sm,
        paddingHorizontal: espacamento.md,
        borderRadius: 100,
        alignItems: 'center',
      }}
    >
      <Text style={{ ...tipografia.labelSmall, color: cores.onPrimary }}>
        {label}
      </Text>
    </Pressable>
  );
}
```

Este é o equivalente direto de:

```kotlin
@Composable
fun BotaoPrimario(label: String, onClick: () -> Unit) {
    Button(onClick = onClick) {
        Text(label)
    }
}
// — onde cores/tipografia vêm de MaterialTheme.colorScheme e MaterialTheme.typography
```

---

## React Native Paper — Material3 para React Native

[React Native Paper](https://reactnativepaper.com/) é o equivalente da comunidade mais próximo do Material3 do Compose. Instale-o:

```bash
npm install react-native-paper react-native-vector-icons
```

### Configuração

```tsx
import { PaperProvider, MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';

function App() {
  const esquema = useColorScheme();
  const tema = esquema === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={tema}>
      <NavegadorPrincipal />
    </PaperProvider>
  );
}
```

### Usando Componentes Paper

```tsx
import { Button, Text, Card, TextInput, FAB, Chip } from 'react-native-paper';
import { useTheme } from 'react-native-paper';

function CartaoPerfil() {
  const theme = useTheme(); // MD3Theme — espelha o MaterialTheme

  return (
    <Card mode="elevated">
      <Card.Title title="Guilherme" subtitle="Engenheiro Android" />
      <Card.Content>
        <Text variant="bodyLarge">Construindo cross-platform com React Native</Text>
      </Card.Content>
      <Card.Actions>
        <Button mode="outlined">Cancelar</Button>
        <Button mode="contained">Salvar</Button>
      </Card.Actions>
    </Card>
  );
}
```

### Esquema de Cores Customizado com o Material Theme Builder

O Material Theme Builder gera um esquema de cores MD3 completo. Exporte como JSON e depois aplique:

```tsx
import { MD3LightTheme } from 'react-native-paper';

const temaCustomizado = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4',
    secondary: '#625B71',
    tertiary: '#7D5260',
    // ... todos os tokens gerados
  },
};
```

[Use o Material Theme Builder](https://m3.material.io/theme-builder)

---

## Escala Tipográfica: MaterialTheme.typography → Text variant

### Compose

```kotlin
Text("Display Large", style = MaterialTheme.typography.displayLarge)
Text("Body Large", style = MaterialTheme.typography.bodyLarge)
```

### React Native Paper

```tsx
<Text variant="displayLarge">Display Large</Text>
<Text variant="bodyLarge">Body Large</Text>
```

### Sistema customizado (sem Paper)

```tsx
const { tipografia } = useTema();
<Text style={tipografia.bodyLarge}>Body Large</Text>
```

---

## Tokens de Forma

O `MaterialTheme.shapes` do Compose (small, medium, large, extraLarge, full) mapeia para `borderRadius` no React Native.

| Token de forma Compose | borderRadius típico no RN |
|------------------------|----------------------------|
| `shapes.extraSmall`    | `4`                        |
| `shapes.small`         | `8`                        |
| `shapes.medium`        | `12`                       |
| `shapes.large`         | `16`                       |
| `shapes.extraLarge`    | `28`                       |
| `shapes.full`          | `borderRadius: 1000` (pílula) |

Adicione isso ao seu arquivo de tokens para consistência:

```tsx
export const forma = {
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 1000,
} as const;
```

---

## Cor Dinâmica / Material You

O Compose no Android 12+ pode extrair cores dinâmicas baseadas no papel de parede com `dynamicDarkColorScheme` / `dynamicLightColorScheme`. O React Native Paper também suporta isso via `@pchmn/expo-material3-theme` (Expo) ou lendo os tokens Material You através de um TurboModule (avançado).

```tsx
// Expo — cor dinâmica (Material You)
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';

function App() {
  const esquema = useColorScheme();
  const { theme } = useMaterial3Theme();

  const temaPaper =
    esquema === 'dark'
      ? { ...MD3DarkTheme, colors: theme.dark }
      : { ...MD3LightTheme, colors: theme.light };

  return (
    <PaperProvider theme={temaPaper}>
      <NavegadorPrincipal />
    </PaperProvider>
  );
}
```

Este é o equivalente em React Native de:

```kotlin
val corDinamica = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
val esquemaCores = when {
    corDinamica && temaEscuro -> dynamicDarkColorScheme(context)
    corDinamica && !temaEscuro -> dynamicLightColorScheme(context)
    temaEscuro -> EsquemaEscuro
    else -> EsquemaClaro
}
```

---

## Navegação + Paper: Combinando os Dois

Ao usar o React Navigation junto com o React Native Paper, sincronize os temas dos dois para evitar um background/surface incompatível nas telas:

```tsx
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { adaptNavigationTheme, PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';

const { LightTheme: NavClaro, DarkTheme: NavEscuro } = adaptNavigationTheme({
  reactNavigationLight: DefaultTheme,
  reactNavigationDark: DarkTheme,
});

function App() {
  const esquema = useColorScheme();
  const isDark = esquema === 'dark';
  const temaPaper = isDark ? MD3DarkTheme : MD3LightTheme;
  const temaNav = isDark ? NavEscuro : NavClaro;

  return (
    <PaperProvider theme={temaPaper}>
      <NavigationContainer theme={temaNav}>
        <NavegadorPrincipal />
      </NavigationContainer>
    </PaperProvider>
  );
}
```

---

## Exemplo Interativo

[![Abrir no Expo Snack](https://img.shields.io/badge/Abrir%20no-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@callstack/react-native-paper-example)

---

## Materiais de Estudo

### Documentação Oficial

- [React Native Paper — Primeiros Passos](https://callstack.github.io/react-native-paper/docs/guides/getting-started)
- [React Native Paper — Theming](https://callstack.github.io/react-native-paper/docs/guides/theming)
- [React Native — useColorScheme](https://reactnative.dev/docs/usecolorscheme)
- [React Native — Appearance](https://reactnative.dev/docs/appearance)
- [Material Theme Builder](https://m3.material.io/theme-builder)
- [Compose — Material Theming](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Compose — Dark Theme](https://developer.android.com/develop/ui/compose/designsystems/material3#dark-theme)

### Pacotes

- [react-native-paper](https://github.com/callstack/react-native-paper) — componentes Material Design 3
- [@pchmn/expo-material3-theme](https://github.com/pchmn/expo-material3-theme) — Dynamic Color / Material You para Expo

### Vídeos

- [Callstack — React Native Paper v5](https://www.youtube.com/watch?v=K0LKBx4_EKk)
- [Google — Material You no Android](https://www.youtube.com/watch?v=lyH5MFxPKjQ)
- [Theo (t3.gg) — Estilização no React Native](https://www.youtube.com/watch?v=1Ur4UMfBObs)

---

## Resumo do Módulo

Você completou o módulo Compose → React Native. Aqui está o que você mapeou:

| Compose                          | React Native                                   |
|----------------------------------|------------------------------------------------|
| Função `@Composable`             | Componente de função que retorna JSX           |
| `remember { mutableStateOf() }`  | `useState()`                                   |
| `remember { }`                   | `useRef()`                                     |
| `LaunchedEffect(key)`            | `useEffect(() => {}, [key])`                   |
| `derivedStateOf`                 | `useMemo()`                                    |
| `CompositionLocal`               | React Context + `useContext()`                 |
| `Column` / `Row` / `Box`         | `View` com Flexbox                             |
| `Modifier`                       | prop `style`                                   |
| `NavController` + `NavHost`      | `useNavigation()` + `NavigationContainer`      |
| `MaterialTheme.colorScheme`      | Theme Context ou React Native Paper            |
| `MaterialTheme.typography`       | Tipografia baseada em tokens do tema           |
| `isSystemInDarkTheme()`          | `useColorScheme()`                             |

O próximo módulo cobre a Nova Arquitetura: como Hermes, JSI, TurboModules e Fabric funcionam no Android — e como escrever um TurboModule real em Kotlin com Codegen.
