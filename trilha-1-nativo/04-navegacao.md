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
<summary>Descrição do conteúdo</summary>

Este vídeo apresenta uma introdução abrangente à navegação em aplicações React Native utilizando a biblioteca React Navigation. A navegação em aplicações móveis é conceitualmente diferente do roteamento web: em vez de resolver caminhos de URL, um navigator gerencia uma pilha de instâncias de tela mantidas em memória, cada uma com seu próprio ciclo de vida. O React Navigation abstrai três padrões fundamentais — stack, drawer e tab — por meio de uma API unificada construída sobre primitivos nativos da plataforma via `react-native-screens`.

> **Nota brownfield:** em um projeto brownfield, o React Native é embutido dentro de uma aplicação nativa existente. O `NavigationContainer` deve, portanto, ter seu escopo limitado apenas à parte React Native do app — ele não pode e não deve tentar gerenciar a navegação do shell nativo ao redor. A comunicação entre a pilha de navegação nativa e a pilha do React Navigation requer bridging explícito via eventos ou módulos nativos, abordado no Tópico 7.

**Conceito central: NavigationContainer**

O `NavigationContainer` é o elemento raiz responsável por gerenciar a árvore de navegação e vinculá-la ao comportamento de voltar nativo do dispositivo. Nenhum navigator pode funcionar fora dele. Em um projeto brownfield, ele é declarado na raiz da árvore de componentes RN registrada com `AppRegistry`, e não na raiz de toda a aplicação:

```tsx
// index.js — RN entry point registered with AppRegistry
import { AppRegistry } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';

function ReactNativeApp() {
  return (
    <NavigationContainer independent={true}>
      <RootNavigator />
    </NavigationContainer>
  );
}

AppRegistry.registerComponent('MyRNFeature', () => ReactNativeApp);
```

A prop `independent={true}` é obrigatória em cenários brownfield para evitar que o React Navigation conflite com o ambiente de navegação nativo do host.

**Dependências e instalação**

As dependências são instaladas via npm/yarn sem qualquer envolvimento do Expo CLI. Em projetos brownfield, o linking nativo é feito manualmente ou via autolinking (React Native ≥ 0.60):

```bash
npm install @react-navigation/native
npm install react-native-screens react-native-safe-area-context
npm install @react-navigation/stack
npm install react-native-gesture-handler react-native-reanimated
npm install @react-navigation/bottom-tabs
npm install @react-navigation/drawer

# iOS — run in the existing native project
cd ios && pod install
```

Para Android brownfield, o `react-native-screens` deve ser habilitado explicitamente dentro do `MainActivity.kt` existente:

```kotlin
// android/app/src/main/java/.../MainActivity.kt
import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null) // must pass null, not savedInstanceState
  }
}
```

Esse override evita um crash quando o sistema Android tenta restaurar o estado de navegação a partir de uma instância salva — cenário que ocorre especificamente em brownfield porque o ciclo de vida da Activity é gerenciado pelo app nativo.

Dois arquivos adicionais são criados na raiz do projeto para evitar que o `react-native-gesture-handler` seja importado em ambientes não móveis:

```js
// gesture-handler.native.js
import 'react-native-gesture-handler';

// gesture-handler.js (intentionally empty)
```

**Stack Navigator — Conceito e implementação brownfield**

O Stack Navigator modela a navegação como uma pilha de push-and-pop, conceitualmente idêntica ao back-stack no Android (`FragmentManager.addToBackStack`) e à pilha do `UINavigationController` no iOS. Cada chamada a `navigation.navigate()` empurra uma nova tela; `navigation.goBack()` a remove.

Em brownfield, um padrão comum é iniciar a pilha de telas RN a partir de um ponto de entrada nativo (ex.: um botão em uma Activity/ViewController nativa). A pilha RN gerencia sua própria navegação interna de forma independente:

```tsx
// src/navigation/RootNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="About">
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

A prop `navigation` é injetada automaticamente em cada tela registrada:

```tsx
// Navigating forward
<TouchableOpacity onPress={() => navigation.navigate('Profile')}>
  <Text>Go to Profile</Text>
</TouchableOpacity>

// Going back — in brownfield, if this is the first screen in the RN stack,
// goBack() should emit a native event to close the RN view instead
<TouchableOpacity onPress={() => navigation.goBack()}>
  <Text>Back</Text>
</TouchableOpacity>
```

**Drawer Navigator — Conceito e implementação brownfield**

O Drawer Navigator fornece um painel que desliza a partir da lateral, geralmente utilizado para navegação em nível de aplicação. Em brownfield, a decisão sobre se o drawer pertence ao shell nativo ou à camada RN deve ser tomada explicitamente — um drawer gerenciado pelo RN não pode interagir com telas nativas fora do seu `NavigationContainer`:

```tsx
import { createDrawerNavigator } from '@react-navigation/drawer';
const Drawer = createDrawerNavigator();

export function RootNavigator() {
  return (
    <Drawer.Navigator initialRouteName="About">
      <Drawer.Screen name="About" component={AboutScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
```

**Bottom Tab Navigator — Conceito e implementação brownfield**

O Bottom Tab Navigator renderiza uma barra de abas persistente na parte inferior da tela. Em projetos brownfield onde o app nativo já possui uma barra de abas (ex.: um `UITabBarController` no iOS ou um `BottomNavigationView` no Android), embutir uma barra de abas RN dentro de uma das abas nativas pode causar conflitos visuais e comportamentais. Nesses casos, recomenda-se que cada aba nativa renderize uma view RN independente, em vez de aninhar a barra de abas RN dentro de uma nativa existente:

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
```

O padrão de aninhamento — Drawer > Tab > Stack — constitui a arquitetura fundamental para a parte RN de uma aplicação brownfield, com cada camada com escopo inteiramente dentro do limite do `NavigationContainer`.

</details>

#### React Native Navigation: Stack + Tab + Drawer in One App (2025 Guide)
[Assistir no YouTube](https://www.youtube.com/watch?v=C6UTib0dMJE)

<details>
<summary>Descrição do conteúdo</summary>

Este tutorial demonstra a integração simultânea de navigators Stack, Bottom Tab e Drawer dentro de um único projeto React Native. O conceito central explorado é o **aninhamento de navigators**: cada tipo de navigator opera em um escopo diferente da hierarquia da aplicação, e eles são compostos em uma estrutura em camadas em vez de usados isoladamente.

> **Nota brownfield:** a estrutura do projeto e a composição de navegação mostradas neste tutorial se aplicam diretamente à parte React Native de um app brownfield. O `NavigationContainer` deve ter seu escopo limitado apenas à árvore de componentes RN, declarado com `independent={true}` para evitar conflitos com a navegação nativa do host. Telas nativas fora do limite RN são invisíveis para o React Navigation e devem ser acessadas por meio de chamadas a módulos nativos, e não via `navigation.navigate()`.

**Conceito arquitetural: Drawer > Tab > Stack**

Os três tipos de navigator endereçam escopos distintos de responsabilidade de navegação:
- O **Drawer Navigator** gerencia a navegação em nível de módulo (ex.: alternar entre Main e Settings dentro do conjunto de funcionalidades RN).
- O **Tab Navigator** gerencia a navegação em nível de seção dentro do módulo principal.
- O **Stack Navigator** gerencia o fluxo de avançar/voltar em nível de tela dentro de cada aba.

Cada navigator é definido em um arquivo dedicado para garantir a separação de responsabilidades, o que também facilita a adoção incremental em projetos brownfield — navigators individuais podem ser introduzidos um por vez à medida que novas telas RN substituem as nativas.

**Estrutura do projeto**

```
src/
├── navigation/
│   ├── RootNavigator.tsx      ← registered with AppRegistry
│   ├── DrawerNavigator.tsx
│   ├── TabNavigator.tsx
│   └── StackNavigator.tsx
└── screens/
    ├── HomeScreen.tsx
    ├── ProfileScreen.tsx
    ├── SettingsScreen.tsx
    └── DetailScreen.tsx
```

**Stack Navigator**

O Stack Navigator é a camada mais interna, gerenciando o fluxo de avançar/voltar dentro da aba Home. Em brownfield, `headerShown: false` é frequentemente configurado porque o host nativo pode já fornecer uma barra de navegação:

```tsx
import { createStackNavigator } from '@react-navigation/stack';
const Stack = createStackNavigator();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Detail" component={DetailScreen} />
    </Stack.Navigator>
  );
}
```

```tsx
// HomeScreen.tsx
<Button title="Go to Detail" onPress={() => navigation.navigate('Detail')} />
```

**Tab Navigator**

O Tab Navigator envolve o Home Stack junto com outras telas de nível superior. Como cada entrada de aba pode conter um Stack Navigator, o Tab renderiza o componente navigator completo — não telas individuais:

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
const Tab = createBottomTabNavigator();

export function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
```

**Drawer Navigator**

O Drawer Navigator é a camada mais externa dentro do limite RN. Ele é posicionado como filho direto do `NavigationContainer`:

```tsx
import { createDrawerNavigator } from '@react-navigation/drawer';
const Drawer = createDrawerNavigator();

export function DrawerNavigator() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="Main" component={TabNavigator} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
```

**Raiz da aplicação — ponto de entrada brownfield**

Em um projeto brownfield, o `NavigationContainer` não é colocado em um `App.tsx` standalone, mas no componente registrado com `AppRegistry`. A prop `independent={true}` evita que o React Navigation interfira no ambiente de navegação nativo:

```tsx
// index.js
import { AppRegistry } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { DrawerNavigator } from './src/navigation/DrawerNavigator';

function RNFeature() {
  return (
    <NavigationContainer independent={true}>
      <DrawerNavigator />
    </NavigationContainer>
  );
}

AppRegistry.registerComponent('RNFeature', () => RNFeature);
```

A arquitetura resultante valida o padrão completo de três camadas aninhadas — Drawer > Tab > Stack — com escopo inteiramente dentro do limite RN. Cada camada é independentemente responsável pelo seu escopo de navegação, permitindo o crescimento incremental da superfície RN dentro da aplicação nativa existente.

</details>

### Artigos e Docs
- [Documentação oficial — Drawer Navigator](https://reactnavigation.org/docs/drawer-navigator/)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Native Navigation Demystified: A 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)
- [Mastering Navigation in React Native — Djamware](https://www.djamware.com/post/682e9c920b36e34005ad0878/mastering-navigation-in-react-native-stack-tabs-and-more)
