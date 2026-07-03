---
id: navegacao-nativo
title: "Navegação"
sidebar_label: "Navegação"
sidebar_position: 10
---

# Navegação

---

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Criar e configurar Stack, Tab e Drawer Navigators
- Aninhar navigators (Drawer > Tab > Stack)
- Implementar fluxo de autenticação condicional
- Navegar com passagem de parâmetros tipados (TypeScript)
- Configurar deep linking
- Comparar o modelo com o que já conhece no Android/iOS

---

## Mapeamento: Android/iOS → React Navigation

| Nativo | React Navigation | Observação |
|--------|-----------------|------------|
| Back Stack (Android) | `Stack.Navigator` | `navigation.goBack()` ≈ `popBackStack()` |
| NavigationController (iOS) | `Stack.Navigator` | Swipe-back nativo é suportado por padrão |
| BottomNavigationView | `Tab.Navigator` | Renderização lazy com `lazy={true}` |
| NavigationDrawer | `Drawer.Navigator` | Gesture de swipe igual ao nativo |
| Intent com extras | `navigation.navigate('Screen', { id: 1 })` | `route.params` recupera os dados |
| Deep link / App Links | `linking` prop no `NavigationContainer` | Universal Links (iOS) e App Links (Android) |

---

## Instalação

```bash
npm install @react-navigation/native react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated

# Navigators específicos
npm install @react-navigation/stack
npm install @react-navigation/bottom-tabs
npm install @react-navigation/drawer

cd ios && pod install
```

> **Atenção:** Adicione `import 'react-native-gesture-handler'` como **primeira linha** do `index.js`.

---

## Stack Navigator

{% raw %}
```tsx
import { createStackNavigator } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  Details: { productId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

function AppStack() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Details"
        component={DetailsScreen}
        options={{ title: 'Detalhes' }}
      />
    </Stack.Navigator>
  );
}
```
{% endraw %}

```tsx
// Navegando com parâmetros
navigation.navigate('Details', { productId: '42' });

// Recebendo
const { productId } = route.params;
```

---

## Tab Navigator

{% raw %}
```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ lazy: true }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```
{% endraw %}

---

## Drawer Navigator

```tsx
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function AppDrawer() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="Main" component={AppTabs} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
```

---

## Aninhamento: Drawer > Tab > Stack (padrão mais comum em apps)

```tsx
function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator>
        <Drawer.Screen name="Main" component={MainTabs} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );
}
```

---

## Fluxo de autenticação condicional

{% raw %}
```tsx
function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="App" component={AppDrawer} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```
{% endraw %}

> React Navigation desmonta automaticamente as telas do fluxo anterior quando o estado muda — o comportamento é equivalente a trocar a root Activity no Android.

---

## Deep Linking

```tsx
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: 'home',
      Details: 'product/:productId',
      Profile: 'user/:userId',
    },
  },
};

<NavigationContainer linking={linking}>
  {/* ... */}
</NavigationContainer>
```

> Para Android: configure `intent-filter` no `AndroidManifest.xml`.  
> Para iOS: configure `Associated Domains` e `URL Types` no Xcode.

---

## Dicas de performance

- `lazy={true}` nos Tab navigators — evita renderizar telas que nunca foram acessadas
- `detachInactiveScreens={true}` no Stack — libera memória de telas inativas (comportamento próximo ao Android)
- `react-native-screens` já ativo por padrão nas versões recentes — usa `UIViewController`/`Fragment` nativo

---

## Exercício prático

Construa um app com:
1. Fluxo de login (Stack Navigator condicional)
2. Drawer com 2 opções: "Feed" e "Configurações"
3. Feed com Tab Navigator (Início / Favoritos)
4. Cada aba com seu próprio Stack para navegação interna
5. Deep link `myapp://product/123` abrindo a tela de detalhes

---

## Materiais de estudo

### Vídeos

#### Navigation in React Native — Stack, Drawer & Bottom Tab (20 min)
[Assistir no YouTube](https://www.youtube.com/watch?v=pyWIzdYB2Xk)

#### React Native Navigation: Stack + Tab + Drawer in One App (2025 Guide)
[Assistir no YouTube](https://www.youtube.com/watch?v=C6UTib0dMJE)

### Artigos e Docs
- [Documentação oficial — Drawer Navigator](https://reactnavigation.org/docs/drawer-navigator/)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Native Navigation Demystified: A 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)
- [Mastering Navigation in React Native — Djamware](https://www.djamware.com/post/682e9c920b36e34005ad0878/mastering-navigation-in-react-native-stack-tabs-and-more)
