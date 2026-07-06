---
id: navegacao-nativo
title: "Navegação"
sidebar_label: "Navegação"
sidebar_position: 10
---

# Navegação

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo_10_navegacao_en.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

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

O Stack Navigator é o equivalente direto ao Back Stack do Android e ao `UINavigationController` do iOS. Ele gerencia uma pilha de telas: `navigate` empilha uma nova tela (como `startActivity` ou `pushViewController`), e `goBack` remove a tela do topo, voltando para a anterior.

A diferença mais importante em relação ao nativo é que telas anteriores na pilha **não são destruídas** — elas ficam montadas em memória no estado em que estavam. Não existe equivalente exato ao `onResume`/`viewWillAppear` no ciclo de vida padrão do React; para esse comportamento, você precisa usar `useFocusEffect`.

O `RootStackParamList` com TypeScript é o equivalente tipado ao bundle de Intent ou ao dicionário de parâmetros de segue — a diferença é que aqui o tipo é verificado em tempo de compilação.

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

O Tab Navigator é o equivalente ao `BottomNavigationView` do Android Material ou ao `UITabBarController` do iOS. Cada aba mantém seu próprio estado de navegação independente — se o usuário entrou fundo em um stack dentro da aba A e depois foi para a aba B, ao voltar para a aba A o stack estará onde foi deixado.

A opção `lazy: true` controla se as telas das abas são renderizadas na inicialização ou apenas quando a aba é visitada pela primeira vez. No desenvolvimento com muitas abas, deixar como `lazy` reduz o custo de inicialização.

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

O Drawer Navigator implementa o menu lateral deslizante — equivalente ao `DrawerLayout` do Android. O gesto de swipe para abrir/fechar é tratado automaticamente pelo `react-native-gesture-handler`, sem necessidade de configuração adicional. O Drawer é tipicamente usado como camada mais externa da hierarquia, envolvendo os demais navigators.

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

Navigators são apenas componentes React — qualquer `Screen` pode receber outro Navigator como seu `component`. Isso permite criar hierarquias de navegação compostas que refletem a estrutura do app.

A hierarquia Drawer > Tab > Stack é a mais comum em apps de produção porque reflete níveis distintos de organização: o Drawer acessa seções do app, as Tabs organizam as telas principais de cada seção, e o Stack gerencia profundidade dentro de cada aba. Cada nível de navegação é isolado — o back stack de uma aba não interfere com outra.

No desenvolvimento nativo, essa composição seria implementada com múltiplos controllers aninhados manualmente; aqui ela é declarativa e cada navigator cuida do seu próprio estado.

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

No desenvolvimento nativo, alternar entre o fluxo de autenticação e o app principal normalmente envolve trocar a `rootViewController` (iOS) ou iniciar uma nova Activity como root (Android). No React Navigation, o padrão é declarativo: você simplesmente não declara as screens autenticadas enquanto o usuário não está logado.

Quando `isAuthenticated` muda, o React Navigation detecta que o conjunto de screens disponíveis mudou e faz a transição automaticamente — sem chamadas imperativas de navegação. O estado de autenticação direciona a navegação, não o contrário.

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

Deep linking no React Navigation equivale à combinação de **App Links** (Android) e **Universal Links** (iOS) que você configuraria no projeto nativo — com a diferença de que o mapeamento de URL para tela é feito no JavaScript, não no manifest ou Info.plist.

O prefixo `myapp://` usa custom schemes, que funcionam apenas se o app estiver instalado. O prefixo `https://myapp.com` usa universal/app links — requer configuração adicional no servidor (arquivo `.well-known/assetlinks.json` no Android, `apple-app-site-association` no iOS), mas oferece fallback para o browser quando o app não está instalado.

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

O React Navigation, por padrão, gerencia as telas em memória de forma mais agressiva do que o nativo — todas as telas do stack ficam montadas. Algumas opções mitigam isso:

- `lazy={true}` nos Tab navigators — evita renderizar telas que nunca foram acessadas; equivalente ao comportamento padrão de `ViewPager` com off-screen page limit = 0
- `detachInactiveScreens={true}` no Stack — remove telas inativas do layout (mas mantém o estado React), liberando memória de renderização; comportamento próximo ao `onStop` no Android
- `react-native-screens` já ativo por padrão nas versões recentes — essa biblioteca faz com que cada Screen seja renderizada como um `UIViewController` (iOS) ou `Fragment` (Android) real, em vez de uma View comum; isso é o que permite que as animações de transição sejam nativas e que o sistema operacional gerencie a memória de forma mais eficiente

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

### Artigos e Docs
- [Documentação oficial — Drawer Navigator](https://reactnavigation.org/docs/drawer-navigator/)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Native Navigation Demystified: A 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)
- [Mastering Navigation in React Native — Djamware](https://www.djamware.com/post/682e9c920b36e34005ad0878/mastering-navigation-in-react-native-stack-tabs-and-more)

---

Next → **[Estado & APIs](./estado-e-apis-nativo)**
