# Tópico 4 — Navegação (Trilha 2: Devs Web/React)

> **Perfil:** Devs com background React web. Já usam React Router — o maior gap aqui é entender que não existe URL no mobile, que o modelo de histórico é diferente e que há comportamentos nativos (swipe-back, hardware back button) que precisam ser considerados.

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

<details>
<summary>Transcrição completa</summary>

hey everyone welcome back to code with o stream where we simplify coding in today's video I'm going to show you how to implement react navigation navigation is an important aspect for any kind of application whether it is a simple one or a complex one because whatever kind of application we have we get the times when we need to navigate from one page to another and so here we are with the react navigation which is a standard way of integrating navigation in any kind of react native project firstly we need to create a react native project we have already this project set up in our vs code if you don't know how to set up react native and create a project I have already created a video covering all those steps so you can follow along the link will be populating on the right corner of your screens so let's first talk about the folder structure that we have so we have a standard app.js file which displays a text welcome to react Native Expo and inside of the SRC directory we have a screens directory and here we are having two screens one is the about screen and another one is profile screen so we will be implementing the react navigation to navigate between these two screens this video is going to be an exciting one and we are covering almost all The Navigators that come with this react navigation package so be with us till the end so that you will miss nothing.

So firstly we will go to the docs and read the proper documentation for installing this thing. Here we get minimum requirements we need to have react native 0.72.0 if we are using react navigation version 7 this is the latest one and we need to have Expo version that is greater than or equal to 52 and if we are using typescript then it should be greater than or equal to 5.0.0. So here we get the steps: firstly we need to install react navigation native. The command is npm install @react-navigation/native. You can also use yarn or pnpm to download the package.

After the installation of react navigation native is complete then we will add these two additional repositories: react-native-screens and react-native-safe-area-context. These two packages are also installed. If we are using bare React Native since this is an expo powered project so we don't need to do this in our main activity kotlin class but if we are using react native CLI version then we just need to copy this code snippet and paste it in the main activity file.

The first navigator that we are going to cover is the stack navigator. In this stack Navigator what it does is it places the screens as stack one above the other and the navigation is processed by the route names. For its working we need to install this stack Navigator into our project and after that we need to install react native gesture handler to handle the gestures of swiping. We will also need to install react native reanimated.

Now the setup is complete and now we will bounce to the implementation of this stack Navigator in our application. Every Navigator that we will be going to use whether stack Navigator or Drawer Navigator or bottom tab Navigator these Navigators have to be placed inside of their parent navigation container which has to be imported from the react navigation native. Without this navigation container none of these Navigators could be used. This is the root element for all types of Navigators.

The other thing we will use is the hook createStackNavigator which we import from @react-navigation/stack. This hook will be responsible for creating the stack Navigator in our application. Inside of the navigation container we will be calling our stack Navigator. The Stack.Navigator is the parent for the screens. Inside of this Stack.Navigator component we will be defining our screens. We import the screens — About and Profile — and define them as Stack.Screen components with name and component props. We set initialRouteName to define the starting point.

We navigate between screens using navigation.navigate('Profile') called from a TouchableOpacity. The navigation prop is automatically available to all screens inside the NavigationContainer. On the profile screen, navigation.goBack() takes the user back to the previous screen.

Next we cover the Drawer Navigator. For its working we need to install @react-navigation/drawer. We also need react-native-reanimated which is responsible for handling the animations that are used during the opening or closing of the drawer. We create the navigator using createDrawerNavigator() and replace Stack.Navigator with Drawer.Navigator and Stack.Screen with Drawer.Screen. When we save this we can see a hamburger icon on the left side of our screen to pop out this Drawer Navigator. You can also nest navigators — a Drawer Navigator inside of a Stack Navigator — so some screens are handled by a Stack Navigator and some of them are implemented by a Drawer Navigator.

Now we will be implementing bottom tab Navigator. Sometimes in our application what we need is a bottom tab Navigator — the icons that are presented in a bottom tab view. This is also the most common Navigator used. We install @react-navigation/bottom-tabs and create it with createBottomTabNavigator(). The tab bar icons can be configured using the options prop with tabBarIcon property. We install expo-vector-icons and add icons like MaterialIcons for home and profile. To configure them we set the options prop on each Tab.Screen with a tabBarIcon function that renders the appropriate icon component.

So this was the basic overview of The Navigators. You have implemented all three types — stack Navigator, drawer Navigator, and bottom tabs Navigator. You can check along the documentation of The Navigators and customize these Navigators any way you want. Possibilities are endless. If you found this tutorial helpful just give it a thumbs up and subscribe to the channel. Thanks for watching and I'll see you in the next video. Happy coding.

</details>

#### React Native Navigation: Stack + Tab + Drawer in One App (2025 Guide)
[Assistir no YouTube](https://www.youtube.com/watch?v=C6UTib0dMJE)

<details>
<summary>Transcrição completa</summary>

Hi coach. In this video, I'm going to show you how to create a React native app with three types of navigation: Stack, Tab, and Drawer. Now if you learn this work don't forget to subscribe to coding tutorials. First let's create a new project using Expo. Here I'll set up the directory to navigation. Install the navigation libraries including @react-navigation/native, @react-navigation/stack, @react-navigation/bottom-tabs, and @react-navigation/drawer. I put all these links in the description of this video.

Then open the project in VS Code. In this folder I create two folders: navigation and screens. In navigation I will create DrawerNavigator, StackNavigator, and TabNavigator files. In screens I simply put some screens: Home, Profile, Settings, and Detail.

In App.tsx I will wrap everything in NavigationContainer. Then in DrawerNavigator I will set up the Drawer Navigator with the screens. The Drawer Navigator wraps the Tab Navigator. For the Stack Navigator I copy from the Drawer Navigator structure and add it as a child for the home flow. Home is defined in the Home component. We add a button in Home with a navigation property to navigate to different screens — for example navigation.navigate('Detail').

For the Tab Navigator we set up the bottom tabs with Home, Profile, and Settings. The result is an app with three types of navigation working together: a working drawer menu with top tabs and stack navigation nested inside. You can switch and open a drawer menu and then navigate to screens and it works smoothly. Thank you for watching. Keep giving it a thumbs up and subscribe for more tutorials. Any questions? Comment — I'd love to help you out.

</details>

### Artigos e Docs
- [React Navigation 7 vs Expo Router: Complete Comparison Guide 2025 — Viewlytics](https://viewlytics.ai/blog/react-navigation-7-vs-expo-router)
- [Expo Router vs React Navigation: Which to Use in 2026? — DEV Community](https://dev.to/satyasootar/expo-router-vs-react-navigation-which-one-should-you-use-in-2026-40mm)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Navigation Official Docs — Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [Mastering Expo Router — Protected Routes, Deep Linking & Theming](https://www.welcomedeveloper.com/posts/navigation-expo-router-part-3/)
- [React Native Navigation Made Easy: 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)
