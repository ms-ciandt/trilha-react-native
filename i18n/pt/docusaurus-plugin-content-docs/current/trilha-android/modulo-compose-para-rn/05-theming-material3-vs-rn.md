---
title: "Theming: Material3 vs React Native"
sidebar_label: "Theming"
sidebar_position: 5
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## O Problema que Ambos Resolvem

O Material3 do Jetpack Compose fornece um sistema de design estruturado baseado em tokens: papéis de cor (primary, surface, onSurface...), escala tipográfica, tokens de forma e suporte a dark mode integrado ao `MaterialTheme`. Todos os componentes leem esses tokens automaticamente.

O React Native não tem um sistema de design embutido. O ecossistema tem duas abordagens dominantes:

1. **Tema customizado via React Context** — criar seu próprio sistema de tokens com `useColorScheme` + `createContext`
2. **React Native Paper** — implementação do Material Design 3 para React Native, o equivalente mais próximo do `MaterialTheme` do Compose

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
  displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: '400' as const },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '400' as const },
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '400' as const },
  bodyLarge: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5, fontWeight: '400' as const },
  labelSmall: { fontSize: 11, lineHeight: 16, letterSpacing: 0.5, fontWeight: '500' as const },
} as const;

export type Tema = {
  cores: typeof cores;
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

---

## React Native Paper — Material3 para React Native

```bash
npm install react-native-paper react-native-vector-icons
```

### Configuração

```tsx
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
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
import { Button, Text, Card } from 'react-native-paper';

function CartaoPerfil() {
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

---

## Tokens de Forma

| Token de forma Compose | borderRadius típico no RN |
|------------------------|---------------------------|
| `shapes.extraSmall`    | `4`                       |
| `shapes.small`         | `8`                       |
| `shapes.medium`        | `12`                      |
| `shapes.large`         | `16`                      |
| `shapes.extraLarge`    | `28`                      |
| `shapes.full`          | `1000` (pílula)           |

---

## Cor Dinâmica / Material You

```tsx
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

  return <PaperProvider theme={temaPaper}><NavegadorPrincipal /></PaperProvider>;
}
```

Equivalente ao Compose:

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

## Exemplo Interativo

[![Abrir no Expo Snack](https://img.shields.io/badge/Abrir%20no-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@callstack/react-native-paper-example)

---

## Materiais de Estudo

### Documentação Oficial

- [React Native Paper — Primeiros Passos](https://callstack.github.io/react-native-paper/docs/guides/getting-started)
- [React Native Paper — Theming](https://callstack.github.io/react-native-paper/docs/guides/theming)
- [React Native — useColorScheme](https://reactnative.dev/docs/usecolorscheme)
- [Material Theme Builder](https://m3.material.io/theme-builder)
- [Compose — Material Theming](https://developer.android.com/develop/ui/compose/designsystems/material3)

### Pacotes

- [react-native-paper](https://github.com/callstack/react-native-paper)
- [@pchmn/expo-material3-theme](https://github.com/pchmn/expo-material3-theme)

### Vídeos

- [Callstack — React Native Paper v5](https://www.youtube.com/watch?v=K0LKBx4_EKk)
- [Google — Material You no Android](https://www.youtube.com/watch?v=lyH5MFxPKjQ)

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
| `isSystemInDarkTheme()`          | `useColorScheme()`                             |

O próximo módulo cobre a Nova Arquitetura: como Hermes, JSI, TurboModules e Fabric funcionam no Android — e como escrever um TurboModule real em Kotlin com Codegen.
