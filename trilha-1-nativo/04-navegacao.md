# Tópico 4 — Navegação (Trilha 1: Devs Nativos)

> **Perfil:** Devs com background Android/iOS. Já entendem ciclo de vida de Activities/ViewControllers, back stack e NavigationController — o foco aqui é mapear esses conceitos para o ecossistema React Navigation.

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

```tsx
// Navegando com parâmetros
navigation.navigate('Details', { productId: '42' });

// Recebendo
const { productId } = route.params;
```

---

## Tab Navigator

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
- [Documentação oficial — Drawer Navigator](https://reactnavigation.org/docs/drawer-navigator/)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Native Navigation Demystified: A 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)
- [Mastering Navigation in React Native — Djamware](https://www.djamware.com/post/682e9c920b36e34005ad0878/mastering-navigation-in-react-native-stack-tabs-and-more)
