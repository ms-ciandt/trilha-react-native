---
title: "Navegação: NavHost vs React Navigation"
sidebar_label: "Navegação"
sidebar_position: 4
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## O que Você Já Conhece

O Navigation Compose fornece um `NavController`, um `NavHost` com um grafo composable, rotas tipadas e gerenciamento de back-stack. O React Navigation 7 cobre a mesma superfície: um container de navegação, definições de rotas tipadas, uma stack, abas, gavetas e navegação programática via hook.

---

## Instalação

```bash
npm install @react-navigation/native
npm install @react-navigation/native-stack
npm install @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
```

Para Expo managed:

```bash
npx expo install react-native-screens react-native-safe-area-context
```

---

## Stack Básica: NavHost → NavigationContainer + Stack.Navigator

### Navigation Compose

```kotlin
@Composable
fun NavegacaoApp() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "home") {
        composable("home") { TelaHome(navController) }
        composable("detalhe/{id}") { backStackEntry ->
            val id = backStackEntry.arguments?.getString("id") ?: return@composable
            TelaDetalhe(navController, id)
        }
    }
}
```

### React Navigation 7 — Native Stack

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Detalhe: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function NavegacaoApp() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={TelaHome} />
        <Stack.Screen name="Detalhe" component={TelaDetalhe} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

`NavigationContainer` = `NavHost` + provedor do controller.
`Stack.Navigator` = escopo do grafo composable.
`Stack.Screen` = `composable("rota")`.

---

## Rotas Tipadas

### React Navigation 7 — tipos TypeScript de params

```tsx
export type RootStackParamList = {
  Home: undefined;
  Detalhe: { id: string };
  Perfil: { userId: string; aba?: 'posts' | 'curtidas' };
};
```

Os componentes de tela usam `NativeStackScreenProps` para acessar params tipados:

```tsx
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Detalhe'>;

function TelaDetalhe({ route }: Props) {
  const { id } = route.params; // totalmente tipado — TypeScript sabe que id: string
  return <Text>Item {id}</Text>;
}
```

---

## Navegação Programática

### Hook useNavigation

```tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function TelaHome() {
  const navigation = useNavigation<NavProp>();

  return (
    <Pressable onPress={() => navigation.navigate('Detalhe', { id: '42' })}>
      <Text>Ir para Detalhe</Text>
    </Pressable>
  );
}
```

| Compose NavController             | React Navigation                                    |
|-----------------------------------|-----------------------------------------------------|
| `navController.navigate(rota)`    | `navigation.navigate('Tela', params)`              |
| `navController.popBackStack()`    | `navigation.goBack()`                              |
| `navController.navigateUp()`      | `navigation.goBack()`                              |

---

## Abas Inferiores: BottomNavigation → Tab.Navigator

### Compose

```kotlin
Scaffold(
    bottomBar = {
        NavigationBar {
            items.forEach { tela ->
                NavigationBarItem(
                    selected = /* ... */,
                    onClick = { navController.navigate(tela) },
                    icon = { Icon(tela.icone, tela.label) },
                    label = { Text(tela.label) }
                )
            }
        }
    }
) { /* NavHost aqui */ }
```

### React Navigation

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

type TabParamList = {
  Home: undefined;
  Buscar: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function AbatePrincipais() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={TelaHome} />
      <Tab.Screen name="Buscar" component={TelaBuscar} />
      <Tab.Screen name="Perfil" component={TelaPerfil} />
    </Tab.Navigator>
  );
}
```

---

## Navegadores Aninhados

```tsx
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function NavegadorHome() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="Lista" component={TelaLista} />
      <HomeStack.Screen name="Detalhe" component={TelaDetalhe} />
    </HomeStack.Navigator>
  );
}

<Tab.Screen name="Home" component={NavegadorHome} />
```

---

## Deep Linking

```tsx
const linking = {
  prefixes: ['meuapp://', 'https://meuapp.com.br'],
  config: {
    screens: {
      Home: 'home',
      Detalhe: 'item/:id',
    },
  },
};

<NavigationContainer linking={linking}>
  {/* ... */}
</NavigationContainer>
```

---

## Fluxo de Autenticação

```tsx
function NavegadorRaiz() {
  const { estaAutenticado } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {estaAutenticado ? (
        <Stack.Screen name="Principal" component={AbatePrincipais} />
      ) : (
        <Stack.Screen name="Auth" component={NavegadorAuth} />
      )}
    </Stack.Navigator>
  );
}
```

Quando `estaAutenticado` muda, o React Navigation automaticamente substitui o navegador — sem chamadas manuais a `popBackStack`.

---

## Playground Interativo

[![Abrir no Expo Snack](https://img.shields.io/badge/Abrir%20no-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-navigation/react-navigation-example)

---

## Materiais de Estudo

### Documentação Oficial

- [React Navigation 7 — Primeiros Passos](https://reactnavigation.org/docs/getting-started)
- [React Navigation 7 — TypeScript](https://reactnavigation.org/docs/typescript)
- [React Navigation 7 — Deep Linking](https://reactnavigation.org/docs/deep-linking)
- [Compose — Navigation Compose](https://developer.android.com/develop/ui/compose/navigation)

### Vídeos

- [Galaxies.dev — Curso Completo React Navigation v7](https://www.youtube.com/watch?v=FmFfXGC6WI8)
- [Google — Navegação no Jetpack Compose](https://www.youtube.com/watch?v=glyqjzkc4fk)

---

## Próximo Passo

Navegação coberta. Último tópico do módulo: como o tema Material3 (`MaterialTheme`) mapeia para os padrões de theming do React Native.

➡ [Theming: Material3 vs React Native](./05-theming-material3-vs-rn)
