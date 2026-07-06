---
id: navegacao-web
title: "Navegação"
sidebar_label: "Navegação"
sidebar_position: 8
---

# Navegação

---

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Entender as diferenças fundamentais entre React Router e React Navigation
- Criar Stack, Tab e Drawer Navigators
- Aninhar navigators de forma idiomática
- Implementar fluxo de autenticação condicional
- Navegar com parâmetros tipados
- Configurar deep linking (equivalente às rotas da web)

---

## Quebrando o paradigma: React Router vs React Navigation

| Conceito web | Equivalente mobile | Diferença importante |
|-------------|-------------------|---------------------|
| URL (`/products/42`) | Parâmetros de rota (`route.params`) | Não existe barra de endereço |
| `<Link to="/home">` | `navigation.navigate('Home')` | Navegação é imperativa |
| `history.push` / `history.back` | `navigation.push` / `navigation.goBack()` | Stack físico, não histórico de URL |
| Rota ativa no browser | Stack de screens montadas | Screens anteriores permanecem **montadas** no Stack |
| Sem "back físico" | Hardware back (Android) + Swipe-back (iOS) | Tratado automaticamente pelo Stack Navigator |
| `useParams()` | `route.params` | Tipagem explícita necessária |
| `<Routes>` no root | `NavigationContainer` no root | Único ponto de controle de navegação |
| `<BrowserRouter>` | — | Não existe equivalente — não há DOM |

> **Insight chave:** no mobile, telas empilhadas continuam **montadas e vivas** na memória. Isso afeta performance e o ciclo de vida dos hooks — `useEffect` com `[]` roda uma vez por montagem, não a cada "visita".

---

## Instalação

```bash
npm install @react-navigation/native react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated

npm install @react-navigation/stack
npm install @react-navigation/bottom-tabs
npm install @react-navigation/drawer

cd ios && pod install
```

> **Atenção:** adicione `import 'react-native-gesture-handler'` como **primeira linha** do `index.js`.

---

## Stack Navigator (equivalente ao histórico de navegação)

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Tipagem de parâmetros (substitui os params da URL)
type RootStackParamList = {
  Home: undefined;
  ProductDetails: { productId: string; productName: string };
};

const Stack = createStackNavigator<RootStackParamList>();

function AppStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="ProductDetails"
          component={ProductDetailsScreen}
          options={({ route }) => ({ title: route.params.productName })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

```tsx
// Navegando (equivalente ao navigate() do React Router)
navigation.navigate('ProductDetails', { productId: '42', productName: 'Tênis' });

// Recebendo parâmetros (equivalente ao useParams())
const { productId, productName } = route.params;
```

---

## Tab Navigator (sem equivalente direto no React Router)

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        lazy: true, // não renderiza tabs não visitadas
        tabBarIcon: ({ focused, color }) => {
          const icon = route.name === 'Home' ? '🏠' : '👤';
          return <Text>{icon}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

---

## Drawer Navigator (menu lateral)

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

## Aninhamento: padrão mais comum (Drawer > Tab > Stack)

```tsx
// App.tsx
export default function App() {
  return (
    <NavigationContainer>
      <DrawerNavigator />
    </NavigationContainer>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="Main" component={TabNavigator} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}


function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );
}
```


---

## Fluxo de autenticação (equivalente a rotas protegidas)

No React Router, você usaria `<PrivateRoute>`. No React Navigation, o padrão é condicional:


```tsx
// Sem wrappers — apenas renderização condicional de screens
function RootNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="App" component={AppDrawer} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
```


> Quando `isAuthenticated` muda, React Navigation automaticamente substitui o stack — sem redirecionamentos manuais.

---

## Deep Linking (equivalente às rotas da URL)

```tsx
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      App: {
        screens: {
          Main: {
            screens: {
              Home: {
                screens: {
                  Home: 'home',
                  Details: 'product/:productId',
                },
              },
            },
          },
        },
      },
      Auth: 'login',
    },
  },
};

<NavigationContainer linking={linking}>
  <RootNavigator />
</NavigationContainer>
```

---

## Expo Router: alternativa file-based (para quem vem do Next.js)

Se o time usa Expo e tem familiaridade com Next.js/file-based routing:

```
app/
├── index.tsx          → rota "/"
├── (tabs)/
│   ├── home.tsx       → /home
│   └── profile.tsx    → /profile
└── product/
    └── [id].tsx       → /product/:id
```

> Expo Router é construído sobre React Navigation — aprenda React Navigation primeiro para entender o que acontece "embaixo".

---

## Diferenças que pegam o dev web de surpresa

1. **Telas ficam montadas** — `useEffect(() => {}, [])` não roda quando você volta para a tela. Use `useFocusEffect` do React Navigation para isso.
2. **Sem URL na barra** — debugar navegação é diferente; use React Navigation DevTools.
3. **Hardware back (Android)** — o Stack Navigator trata automaticamente; personalize com `BackHandler` quando necessário.
4. **Sem `history.replace` direto** — use `navigation.replace('Screen')` para substituir sem empilhar.

```tsx
// Detectar foco da tela (equivalente ao useEffect na montagem de rota no Router)
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    fetchData(); // roda toda vez que a tela recebe foco
  }, [])
);
```

---

## Exercício prático

1. Recrie a estrutura de navegação de um app que você já conhece (ex: Instagram) com Drawer + Tab + Stack
2. Implemente um fluxo de autenticação com proteção condicional
3. Configure deep linking para abrir uma tela de detalhes diretamente
4. Use `useFocusEffect` para refazer uma busca ao voltar para a tela

---

## Materiais de estudo

### Vídeos

#### Navigation in React Native — Stack, Drawer & Bottom Tab (20 min)
[Assistir no YouTube](https://www.youtube.com/watch?v=pyWIzdYB2Xk)

#### React Native Navigation: Stack + Tab + Drawer in One App (Guia 2025)
[Assistir no YouTube](https://www.youtube.com/watch?v=C6UTib0dMJE)

### Artigos e Docs
- [React Navigation 7 vs Expo Router: Complete Comparison Guide 2025 — Viewlytics](https://viewlytics.ai/blog/react-navigation-7-vs-expo-router)
- [Expo Router vs React Navigation: Which to Use in 2026? — DEV Community](https://dev.to/satyasootar/expo-router-vs-react-navigation-which-one-should-you-use-in-2026-40mm)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Navigation Official Docs — Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [Mastering Expo Router — Protected Routes, Deep Linking & Theming](https://www.welcomedeveloper.com/posts/navigation-expo-router-part-3/)
- [React Native Navigation Made Easy: 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)
