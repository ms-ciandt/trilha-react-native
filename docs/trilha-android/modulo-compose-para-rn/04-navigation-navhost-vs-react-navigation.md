---
title: "Navigation: NavHost vs React Navigation"
sidebar_label: "Navigation"
sidebar_position: 4
---

## Video Overview

> Video for this topic coming soon.

## What You Already Know

Navigation Compose gives you a `NavController`, a `NavHost` with a composable graph, typed routes (or string routes), and back-stack management. React Navigation 7 covers the same surface: a navigator container, typed route definitions, a stack, tabs, drawers, and programmatic navigation via a hook.

The philosophy is the same. The API surface differs considerably — especially in how routes are typed and how back-stack state is modelled.

---

## Installation

React Navigation is not part of React Native core. Install it and its dependencies:

```bash
npm install @react-navigation/native
npm install @react-navigation/native-stack
npm install @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
```

On Android, `react-native-screens` needs one more step in `MainActivity.kt` (React Native New Architecture handles this automatically with Fabric — skip for Expo managed workflow):

```kotlin
// MainActivity.kt
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.RNScreensPackage  // if using bare workflow

class MainActivity : ReactActivity() { ... }
```

For Expo managed:

```bash
npx expo install react-native-screens react-native-safe-area-context
```

---

## Basic Stack: NavHost → NavigationContainer + Stack.Navigator

### Navigation Compose

```kotlin
@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "home") {
        composable("home") { HomeScreen(navController) }
        composable("detail/{id}") { backStackEntry ->
            val id = backStackEntry.arguments?.getString("id") ?: return@composable
            DetailScreen(navController, id)
        }
    }
}
```

### React Navigation 7 — Native Stack

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 1. Define route param types
type RootStackParamList = {
  Home: undefined;
  Detail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

`NavigationContainer` = `NavHost` + the controller provider.  
`Stack.Navigator` = the composable graph scope.  
`Stack.Screen` = `composable("route")`.

---

## Typed Routes

### Compose — type-safe navigation with object routes (RN 2.7+)

```kotlin
@Serializable
object Home

@Serializable
data class Detail(val id: String)

NavHost(navController, startDestination = Home) {
    composable<Home> { HomeScreen(navController) }
    composable<Detail> { backStackEntry ->
        val detail: Detail = backStackEntry.toRoute()
        DetailScreen(detail.id)
    }
}
```

### React Navigation 7 — TypeScript param types

```tsx
// Defined once in a types file
export type RootStackParamList = {
  Home: undefined;
  Detail: { id: string };
  Profile: { userId: string; tab?: 'posts' | 'likes' };
};
```

Screen components use `NativeStackScreenProps` to access typed params:

```tsx
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

function DetailScreen({ route }: Props) {
  const { id } = route.params; // fully typed — TypeScript knows id: string
  return <Text>Item {id}</Text>;
}
```

---

## Programmatic Navigation

### NavController.navigate / popBackStack

```kotlin
// Navigate forward
navController.navigate(Detail(id = "42"))

// Navigate and clear back stack (equivalent to popUpTo(Home, inclusive = false) + launchSingleTop)
navController.navigate(Home) {
    popUpTo<Home> { inclusive = false }
    launchSingleTop = true
}

// Go back
navController.popBackStack()
```

### useNavigation hook

```tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function HomeScreen() {
  const navigation = useNavigation<NavProp>();

  return (
    <Pressable onPress={() => navigation.navigate('Detail', { id: '42' })}>
      <Text>Go to Detail</Text>
    </Pressable>
  );
}
```

Equivalent navigation operations:

| Compose NavController             | React Navigation                                    |
|-----------------------------------|-----------------------------------------------------|
| `navController.navigate(route)`   | `navigation.navigate('ScreenName', params)`        |
| `navController.popBackStack()`    | `navigation.goBack()`                              |
| `navController.navigateUp()`      | `navigation.goBack()`                              |
| `popUpTo(...) { inclusive = true }` | `navigation.reset(...)` or `navigation.popToTop()` |
| `popBackStack(route, inclusive)`  | `navigation.popToTop()` or `navigation.dispatch(StackActions.popToTop())` |
| `navController.currentBackStackEntry` | `navigation.getState()` or `useRoute()`          |

---

## Reading Route Params

### Inside a screen component

```tsx
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from './types';

function DetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Detail'>>();
  const { id } = route.params;
  return <Text>Item {id}</Text>;
}
```

Or use `route` directly when the screen is registered in the navigator:

```tsx
// Props-based — matches how Navigation Compose exposes the backStackEntry
function DetailScreen({ route }: NativeStackScreenProps<RootStackParamList, 'Detail'>) {
  const { id } = route.params;
  return <Text>Item {id}</Text>;
}
```

---

## Bottom Tabs: BottomNavigation → Tab.Navigator

### Compose — NavigationBar + NavHost

```kotlin
val items = listOf(Screen.Home, Screen.Search, Screen.Profile)

Scaffold(
    bottomBar = {
        NavigationBar {
            items.forEach { screen ->
                NavigationBarItem(
                    selected = currentDestination?.hierarchy?.any { it.hasRoute(screen::class) } == true,
                    onClick = { navController.navigate(screen) { launchSingleTop = true } },
                    icon = { Icon(screen.icon, screen.label) },
                    label = { Text(screen.label) }
                )
            }
        }
    }
) { innerPadding ->
    NavHost(navController, startDestination = Screen.Home, modifier = Modifier.padding(innerPadding)) {
        composable<Screen.Home> { HomeScreen() }
        composable<Screen.Search> { SearchScreen() }
        composable<Screen.Profile> { ProfileScreen() }
    }
}
```

### React Navigation — Tab.Navigator

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

type TabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: '🏠',
            Search: '🔍',
            Profile: '👤',
          };
          return <Text style={{ fontSize: size, color }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

---

## Nested Navigators

Just like Compose allows nested `NavHost` trees, React Navigation supports nested navigators. A common pattern: tabs at the root, a stack inside one tab.

```tsx
// Root: tabs
// Inside "Home" tab: a stack (list → detail)

type HomeStackParamList = {
  List: undefined;
  Detail: { id: string };
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="List" component={ListScreen} />
      <HomeStack.Screen name="Detail" component={DetailScreen} />
    </HomeStack.Navigator>
  );
}

// Then register HomeNavigator as the Home tab's component
<Tab.Screen name="Home" component={HomeNavigator} />
```

---

## Deep Linking

React Navigation's deep linking maps to Android's intent filters and iOS's URL schemes.

```tsx
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: 'home',
      Detail: 'item/:id',
      Profile: {
        path: 'user/:userId',
        parse: { userId: (id: string) => `user-${id}` },
      },
    },
  },
};

<NavigationContainer linking={linking}>
  {/* ... */}
</NavigationContainer>
```

On Android, register the intent filter in `AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="myapp.com" />
</intent-filter>
```

---

## Authentication Flow Pattern

The Compose pattern of navigating to a login graph when unauthenticated has a direct React Navigation equivalent using conditional rendering of navigators:

```tsx
function RootNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
```

When `isAuthenticated` flips, React Navigation automatically replaces the navigator — no manual `popBackStack` calls needed. This is equivalent to Compose's `if (isLoggedIn) { composable<MainGraph> { ... } } else { composable<AuthGraph> { ... } }` pattern.

---

## Interactive Playground

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-navigation/react-navigation-example)

---

## Study Materials

### Official Documentation

- [React Navigation 7 — Getting Started](https://reactnavigation.org/docs/getting-started)
- [React Navigation 7 — TypeScript](https://reactnavigation.org/docs/typescript)
- [React Navigation 7 — Navigation Container](https://reactnavigation.org/docs/navigation-container)
- [React Navigation 7 — Native Stack Navigator](https://reactnavigation.org/docs/native-stack-navigator)
- [React Navigation 7 — Bottom Tabs](https://reactnavigation.org/docs/bottom-tab-navigator)
- [React Navigation 7 — Deep Linking](https://reactnavigation.org/docs/deep-linking)
- [Compose — Navigation Compose](https://developer.android.com/develop/ui/compose/navigation)
- [Compose — Type-safe navigation](https://developer.android.com/develop/ui/compose/navigation#nav-type-safe)

### Interactive

- [React Navigation — Playground Snack](https://snack.expo.dev/@react-navigation/react-navigation-example)

### Videos

- [Galaxies.dev — React Navigation v7 Full Course](https://www.youtube.com/watch?v=FmFfXGC6WI8)
- [Google — Navigation in Jetpack Compose](https://www.youtube.com/watch?v=glyqjzkc4fk)

---

## What's Next

Navigation covered. Final topic in this module: how Material3 theming (`MaterialTheme`) maps to React Native's theming patterns with `useColorScheme` and styled design systems.

➡ [Theming: Material3 vs React Native Styling](./05-theming-material3-vs-rn)
