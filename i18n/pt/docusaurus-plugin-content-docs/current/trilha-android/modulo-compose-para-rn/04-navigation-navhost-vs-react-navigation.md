---
title: "Navegação: NavHost vs React Navigation"
sidebar_label: "Navegação"
sidebar_position: 4
---

## Video Overview

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/compose_04_navigation_navhost_vs_react_navigation.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/compose_04_navigation_navhost_vs_react_navigation.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## O que Você Já Conhece

O Navigation Compose fornece um `NavController`, um `NavHost` com um grafo composable, rotas tipadas (ou rotas em string) e gerenciamento de back-stack. O React Navigation 7 cobre a mesma superfície: um container de navegação, definições de rotas tipadas, uma stack, abas, gavetas e navegação programática via hook.

A filosofia é a mesma. A superfície da API difere consideravelmente — especialmente em como as rotas são tipadas e como o estado do back-stack é modelado.

---

## Instalação

O React Navigation não faz parte do core do React Native. Instale-o junto com suas dependências:

```bash
npm install @react-navigation/native
npm install @react-navigation/native-stack
npm install @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
```

No Android, o `react-native-screens` exige mais um passo no `MainActivity.kt` (a New Architecture do React Native cuida disso automaticamente com o Fabric — pule esta etapa no fluxo Expo managed):

```kotlin
// MainActivity.kt
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.RNScreensPackage  // se estiver usando o fluxo bare

class MainActivity : ReactActivity() { ... }
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

### Compose — navegação type-safe com rotas de objeto (RN 2.7+)

```kotlin
@Serializable
object Home

@Serializable
data class Detalhe(val id: String)

NavHost(navController, startDestination = Home) {
    composable<Home> { TelaHome(navController) }
    composable<Detalhe> { backStackEntry ->
        val detalhe: Detalhe = backStackEntry.toRoute()
        TelaDetalhe(detalhe.id)
    }
}
```

### React Navigation 7 — tipos TypeScript de params

```tsx
// Definido uma vez em um arquivo de tipos
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

### NavController.navigate / popBackStack

```kotlin
// Navega para frente
navController.navigate(Detalhe(id = "42"))

// Navega e limpa o back stack (equivalente a popUpTo(Home, inclusive = false) + launchSingleTop)
navController.navigate(Home) {
    popUpTo<Home> { inclusive = false }
    launchSingleTop = true
}

// Volta
navController.popBackStack()
```

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

Operações de navegação equivalentes:

| Compose NavController                 | React Navigation                                    |
|----------------------------------------|-----------------------------------------------------|
| `navController.navigate(rota)`         | `navigation.navigate('Tela', params)`              |
| `navController.popBackStack()`         | `navigation.goBack()`                              |
| `navController.navigateUp()`           | `navigation.goBack()`                              |
| `popUpTo(...) { inclusive = true }`    | `navigation.reset(...)` ou `navigation.popToTop()` |
| `popBackStack(rota, inclusive)`        | `navigation.popToTop()` ou `navigation.dispatch(StackActions.popToTop())` |
| `navController.currentBackStackEntry`  | `navigation.getState()` ou `useRoute()`            |

---

## Lendo Parâmetros de Rota

### Dentro de um componente de tela

```tsx
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from './types';

function TelaDetalhe() {
  const route = useRoute<RouteProp<RootStackParamList, 'Detalhe'>>();
  const { id } = route.params;
  return <Text>Item {id}</Text>;
}
```

Ou use `route` diretamente quando a tela estiver registrada no navegador:

```tsx
// Baseado em props — corresponde a como o Navigation Compose expõe o backStackEntry
function TelaDetalhe({ route }: NativeStackScreenProps<RootStackParamList, 'Detalhe'>) {
  const { id } = route.params;
  return <Text>Item {id}</Text>;
}
```

---

## Abas Inferiores: BottomNavigation → Tab.Navigator

### Compose — NavigationBar + NavHost

```kotlin
val items = listOf(Screen.Home, Screen.Buscar, Screen.Perfil)

Scaffold(
    bottomBar = {
        NavigationBar {
            items.forEach { tela ->
                NavigationBarItem(
                    selected = currentDestination?.hierarchy?.any { it.hasRoute(tela::class) } == true,
                    onClick = { navController.navigate(tela) { launchSingleTop = true } },
                    icon = { Icon(tela.icone, tela.label) },
                    label = { Text(tela.label) }
                )
            }
        }
    }
) { innerPadding ->
    NavHost(navController, startDestination = Screen.Home, modifier = Modifier.padding(innerPadding)) {
        composable<Screen.Home> { TelaHome() }
        composable<Screen.Buscar> { TelaBuscar() }
        composable<Screen.Perfil> { TelaPerfil() }
    }
}
```

### React Navigation — Tab.Navigator

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

type TabParamList = {
  Home: undefined;
  Buscar: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function AbasPrincipais() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icones: Record<string, string> = {
            Home: '🏠',
            Buscar: '🔍',
            Perfil: '👤',
          };
          return <Text style={{ fontSize: size, color }}>{icones[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home" component={TelaHome} />
      <Tab.Screen name="Buscar" component={TelaBuscar} />
      <Tab.Screen name="Perfil" component={TelaPerfil} />
    </Tab.Navigator>
  );
}
```

---

## Navegadores Aninhados

Assim como o Compose permite árvores de `NavHost` aninhadas, o React Navigation suporta navegadores aninhados. Um padrão comum: abas na raiz, uma stack dentro de uma aba.

```tsx
// Raiz: abas
// Dentro da aba "Home": uma stack (lista → detalhe)

type HomeStackParamList = {
  Lista: undefined;
  Detalhe: { id: string };
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function NavegadorHome() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="Lista" component={TelaLista} />
      <HomeStack.Screen name="Detalhe" component={TelaDetalhe} />
    </HomeStack.Navigator>
  );
}

// Depois registre NavegadorHome como o componente da aba Home
<Tab.Screen name="Home" component={NavegadorHome} />
```

---

## Deep Linking

O deep linking do React Navigation mapeia para os intent filters do Android e os URL schemes do iOS.

```tsx
const linking = {
  prefixes: ['meuapp://', 'https://meuapp.com.br'],
  config: {
    screens: {
      Home: 'home',
      Detalhe: 'item/:id',
      Perfil: {
        path: 'user/:userId',
        parse: { userId: (id: string) => `usuario-${id}` },
      },
    },
  },
};

<NavigationContainer linking={linking}>
  {/* ... */}
</NavigationContainer>
```

No Android, registre o intent filter no `AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="meuapp.com.br" />
</intent-filter>
```

---

## Fluxo de Autenticação

O padrão do Compose de navegar para um grafo de login quando não autenticado tem um equivalente direto no React Navigation usando renderização condicional de navegadores:

```tsx
function NavegadorRaiz() {
  const { estaAutenticado } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {estaAutenticado ? (
        <Stack.Screen name="Principal" component={AbasPrincipais} />
      ) : (
        <Stack.Screen name="Auth" component={NavegadorAuth} />
      )}
    </Stack.Navigator>
  );
}
```

Quando `estaAutenticado` muda, o React Navigation automaticamente substitui o navegador — sem chamadas manuais a `popBackStack`. Isso é equivalente ao padrão do Compose `if (isLoggedIn) { composable<MainGraph> { ... } } else { composable<AuthGraph> { ... } }`.

---

## Playground Interativo

[![Abrir no Expo Snack](https://img.shields.io/badge/Abrir%20no-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-navigation/react-navigation-example)

---

## Materiais de Estudo

### Documentação Oficial

- [React Navigation 7 — Primeiros Passos](https://reactnavigation.org/docs/getting-started)
- [React Navigation 7 — TypeScript](https://reactnavigation.org/docs/typescript)
- [React Navigation 7 — Navigation Container](https://reactnavigation.org/docs/navigation-container)
- [React Navigation 7 — Native Stack Navigator](https://reactnavigation.org/docs/native-stack-navigator)
- [React Navigation 7 — Bottom Tabs](https://reactnavigation.org/docs/bottom-tab-navigator)
- [React Navigation 7 — Deep Linking](https://reactnavigation.org/docs/deep-linking)
- [Compose — Navigation Compose](https://developer.android.com/develop/ui/compose/navigation)
- [Compose — Navegação type-safe](https://developer.android.com/develop/ui/compose/navigation#nav-type-safe)

### Interativo

- [React Navigation — Playground Snack](https://snack.expo.dev/@react-navigation/react-navigation-example)

### Vídeos

- [Galaxies.dev — Curso Completo React Navigation v7](https://www.youtube.com/watch?v=FmFfXGC6WI8)
- [Google — Navegação no Jetpack Compose](https://www.youtube.com/watch?v=glyqjzkc4fk)

---

## Próximo Passo

Navegação coberta. Último tópico do módulo: como o tema Material3 (`MaterialTheme`) mapeia para os padrões de theming do React Native.

➡ [Theming: Material3 vs React Native](./05-theming-material3-vs-rn)
