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
<summary>Descrição do conteúdo</summary>

Este vídeo apresenta uma introdução abrangente à navegação em aplicações React Native usando a biblioteca React Navigation. A navegação em aplicações mobile é conceitualmente distinta do roteamento web: em vez de resolver caminhos de URL, um navigator gerencia uma pilha de instâncias de telas mantidas em memória, cada uma com seu próprio ciclo de vida. React Navigation abstrai três padrões fundamentais — stack, drawer e tab — por meio de uma API unificada construída sobre primitivas nativas de plataforma via `react-native-screens`.

> **Nota brownfield:** em um projeto brownfield, o React Native está embutido dentro de uma aplicação nativa existente. O `NavigationContainer` deve, portanto, ser limitado apenas à porção React Native do app — ele não pode e não deve tentar gerenciar a navegação do shell nativo ao redor. A comunicação entre o stack de navegação nativo e o stack do React Navigation requer bridging explícito via eventos ou módulos nativos, abordado no Tópico 7.

**Conceito central: NavigationContainer**

O `NavigationContainer` é o elemento raiz responsável por gerenciar a árvore de navegação e vinculá-la ao comportamento de voltar nativo do dispositivo. Nenhum navigator pode funcionar fora dele. Em um projeto brownfield, ele é declarado na raiz da árvore de componentes RN registrada com `AppRegistry`, não na raiz de toda a aplicação:

```tsx
// index.js — ponto de entrada RN registrado com AppRegistry
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

A prop `independent={true}` é obrigatória em cenários brownfield para evitar que o React Navigation entre em conflito com o ambiente de navegação nativo do host.

**Dependências e Instalação**

As dependências são instaladas via npm/yarn sem qualquer envolvimento do Expo CLI. Em projetos brownfield, o linking nativo é feito manualmente ou via autolinking (React Native ≥ 0.60):

```bash
npm install @react-navigation/native
npm install react-native-screens react-native-safe-area-context
npm install @react-navigation/stack
npm install react-native-gesture-handler react-native-reanimated
npm install @react-navigation/bottom-tabs
npm install @react-navigation/drawer

# iOS — executar no projeto nativo existente
cd ios && pod install
```

Para brownfield no Android, `react-native-screens` deve ser habilitado explicitamente dentro do `MainActivity.kt` existente:

```kotlin
// android/app/src/main/java/.../MainActivity.kt
import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null) // deve passar null, não savedInstanceState
  }
}
```

Esse override evita um crash quando o sistema Android tenta restaurar o estado de navegação de uma instância salva — cenário que ocorre especificamente em brownfield porque o ciclo de vida da Activity é gerenciado pelo app nativo.

Dois arquivos adicionais são criados na raiz do projeto para impedir que `react-native-gesture-handler` seja importado em ambientes não-mobile:

```js
// gesture-handler.native.js
import 'react-native-gesture-handler';

// gesture-handler.js (intencionalmente vazio)
```

**Stack Navigator — Conceito e Implementação Brownfield**

O Stack Navigator modela a navegação como uma pilha de push-and-pop, conceitualmente idêntica ao back-stack no Android (`FragmentManager.addToBackStack`) e ao stack do `UINavigationController` no iOS. Cada chamada a `navigation.navigate()` empilha uma nova tela; `navigation.goBack()` a desempilha.

Em brownfield, um padrão comum é iniciar o stack de telas RN a partir de um ponto de entrada nativo (ex: um botão em uma Activity/ViewController nativa). O stack RN gerencia sua própria navegação interna de forma independente:

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
// Navegando para frente
<TouchableOpacity onPress={() => navigation.navigate('Profile')}>
  <Text>Go to Profile</Text>
</TouchableOpacity>

// Voltando — em brownfield, se esta for a primeira tela do stack RN,
// goBack() deve emitir um evento nativo para fechar a view RN em vez disso
<TouchableOpacity onPress={() => navigation.goBack()}>
  <Text>Back</Text>
</TouchableOpacity>
```

**Drawer Navigator — Conceito e Implementação Brownfield**

O Drawer Navigator fornece um painel que desliza pela lateral, tipicamente usado para navegação em nível de aplicação. Em brownfield, a decisão de o drawer pertencer ao shell nativo ou à camada RN deve ser tomada explicitamente — um drawer gerenciado pelo RN não pode interagir com telas nativas fora do seu `NavigationContainer`:

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

**Bottom Tab Navigator — Conceito e Implementação Brownfield**

O Bottom Tab Navigator renderiza uma barra de tabs persistente na parte inferior da tela. Em projetos brownfield onde o app nativo já possui uma tab bar (ex: um `UITabBarController` no iOS ou um `BottomNavigationView` no Android), embutir uma tab bar RN dentro de uma das tabs nativas pode causar conflitos visuais e comportamentais. Nesses casos, recomenda-se que cada tab nativa renderize uma view RN independente, em vez de aninhar a tab bar RN dentro de uma nativa existente:

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

O padrão de aninhamento — Drawer > Tab > Stack — constitui a arquitetura fundamental para a porção RN de uma aplicação brownfield, com cada camada totalmente delimitada pela fronteira do `NavigationContainer`.

</details>

#### React Native Navigation: Stack + Tab + Drawer in One App (Guia 2025)
[Assistir no YouTube](https://www.youtube.com/watch?v=C6UTib0dMJE)

<details>
<summary>Descrição do conteúdo</summary>

Este tutorial demonstra a integração simultânea de navigators Stack, Bottom Tab e Drawer dentro de um único projeto React Native. O conceito central explorado é o **aninhamento de navigators**: cada tipo de navigator opera em um escopo diferente da hierarquia da aplicação, e eles são compostos em uma estrutura em camadas em vez de usados isoladamente.

> **Nota brownfield:** a estrutura de projeto e a composição de navegação mostradas neste tutorial se aplicam diretamente à porção React Native de um app brownfield. O `NavigationContainer` deve ser limitado apenas à árvore de componentes RN, declarado com `independent={true}` para evitar conflitos com a navegação nativa do host. Telas nativas fora da fronteira RN são invisíveis para o React Navigation e devem ser acessadas por meio de chamadas a módulos nativos, não via `navigation.navigate()`.

**Conceito Arquitetural: Drawer > Tab > Stack**

Os três tipos de navigator atendem a escopos distintos de responsabilidade de navegação:
- O **Drawer Navigator** gerencia a navegação em nível de módulo (ex: alternância entre Main e Settings dentro do conjunto de funcionalidades RN).
- O **Tab Navigator** gerencia a navegação em nível de seção dentro do módulo principal.
- O **Stack Navigator** gerencia o fluxo de avançar/voltar em nível de tela dentro de cada tab.

Cada navigator é definido em um arquivo dedicado para garantir separação de responsabilidades, o que também facilita a adoção incremental em projetos brownfield — navigators individuais podem ser introduzidos um de cada vez à medida que novas telas RN substituem as nativas.

**Estrutura do Projeto**

```
src/
├── navigation/
│   ├── RootNavigator.tsx      ← registrado com AppRegistry
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

O Stack Navigator é a camada mais interna, gerenciando o fluxo de avançar/voltar dentro da tab Home. Em brownfield, `headerShown: false` é frequentemente configurado porque o host nativo pode já fornecer uma barra de navegação:

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

O Tab Navigator engloba o Home Stack junto com outras telas de nível superior. Como cada entrada de tab pode conter um Stack Navigator, a Tab renderiza o componente navigator completo — não telas individuais:

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

O Drawer Navigator é a camada mais externa dentro da fronteira RN. Ele é posicionado como filho direto do `NavigationContainer`:

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

**Raiz da Aplicação — Ponto de Entrada Brownfield**

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

A arquitetura resultante valida o padrão completo de três camadas aninhadas — Drawer > Tab > Stack — totalmente delimitado dentro da fronteira RN. Cada camada é independentemente responsável pelo seu escopo de navegação, permitindo o crescimento incremental da superfície RN dentro da aplicação nativa existente.

</details>

### Artigos e Docs
- [React Navigation 7 vs Expo Router: Complete Comparison Guide 2025 — Viewlytics](https://viewlytics.ai/blog/react-navigation-7-vs-expo-router)
- [Expo Router vs React Navigation: Which to Use in 2026? — DEV Community](https://dev.to/satyasootar/expo-router-vs-react-navigation-which-one-should-you-use-in-2026-40mm)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Navigation Official Docs — Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [Mastering Expo Router — Protected Routes, Deep Linking & Theming](https://www.welcomedeveloper.com/posts/navigation-expo-router-part-3/)
- [React Native Navigation Made Easy: 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)
