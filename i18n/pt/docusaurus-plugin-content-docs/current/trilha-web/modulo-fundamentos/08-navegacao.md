---
id: navegacao-web
title: "Navegação"
sidebar_label: "Navegação"
sidebar_position: 8
---

# Navegação

---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_web_08_navegacao_en.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

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

O Stack Navigator funciona como uma pilha de cartas: cada nova tela é colocada no topo, e voltar remove a tela do topo. A diferença crítica em relação ao browser history é que as telas anteriores **ficam montadas na memória** — elas não são destruídas nem recriadas como numa SPA. Isso tem consequências diretas: `useEffect` com `[]` não re-executa quando você navega de volta para uma tela já montada.

O `NavigationContainer` é o ponto de controle central da navegação. Deve existir apenas um no app, na raiz, e mantém todo o estado de navegação em memória. Sem ele, nenhum navigator funciona.

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

No React Router não existe um componente equivalente ao Tab Navigator — abas no mobile têm comportamento diferente de abas no browser. No mobile, as abas são persistentes e cada uma mantém seu próprio estado de navegação independente. Quando você muda de aba e volta, a aba anterior está exatamente onde você a deixou, incluindo seu histórico de stack interno.

O `createBottomTabNavigator` já tem `lazy: true` por padrão — abas não visitadas não são renderizadas até o usuário navegar até elas. Nenhuma configuração é necessária para esse comportamento; é o `createMaterialTopTabNavigator` que tem `lazy: false` por padrão.

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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

O Drawer Navigator implementa o menu lateral deslizante — aquele que abre com um swipe da esquerda ou ao tocar no ícone de hambúrguer. No contexto web, o mais próximo seria um componente de sidebar, mas no mobile o Drawer tem comportamento nativo esperado pelos usuários: responde a gestos, tem animação de deslizamento e fecha ao tocar fora da área.

Diferente do Stack e do Tab, o Drawer é mais frequentemente usado como camada externa da hierarquia de navegação, envolvendo os demais navigators.

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

Navigators podem ser aninhados porque cada Navigator é simplesmente um componente React — qualquer `Screen` pode ter como `component` um outro Navigator. Esse padrão é a estrutura de navegação mais comum em apps de produção.

A hierarquia Drawer > Tab > Stack segue a lógica de "amplitude primeiro, profundidade depois": o Drawer oferece acesso a seções distintas do app, as Tabs organizam as telas principais de cada seção, e o Stack gerencia a navegação em profundidade dentro de cada aba. Cada nível é independente — o stack de uma aba não interfere com o stack de outra.

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

No React Router, você usaria `<PrivateRoute>`. No React Navigation, o padrão é diferente: em vez de interceptar a rota, você simplesmente não declara as screens autenticadas quando o usuário não está logado.

O mecanismo funciona porque o React Navigation monitora as mudanças na árvore de Screens. Quando `isAuthenticated` muda de `false` para `true`, o navigator percebe que o conjunto de screens declaradas mudou e faz a transição automaticamente para o novo estado. Você não precisa chamar `navigate` em nenhum lugar — o estado de autenticação direciona a navegação de forma declarativa, igual ao React Router, mas sem `<PrivateRoute>`.

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

Deep linking é o mecanismo que permite que uma URL externa abra uma tela específica do app — equivalente ao que uma URL faz no browser. No mobile existem dois contextos: **custom schemes** (`myapp://`) funcionam apenas em apps instalados, enquanto **universal links** (`https://myapp.com`) permitem que o mesmo link abra o app se estiver instalado ou o site no browser caso contrário.

O objeto de configuração `linking` mapeia URLs para screens da mesma forma que rotas de URL são mapeadas para componentes no React Router. O React Navigation intercepta os links antes do app inicializar e navega diretamente para a screen correspondente.

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

Expo Router é uma camada sobre o React Navigation que adota a convenção de file-based routing popularizada pelo Next.js: a estrutura de pastas define as rotas, sem necessidade de configuração explícita. Cada arquivo dentro de `app/` vira uma rota automaticamente.

A convenção de pastas entre parênteses `(tabs)` cria grupos de rotas sem adicionar segmentos à URL — o mesmo conceito dos Route Groups do Next.js. Arquivos com `[id]` definem parâmetros dinâmicos.

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

### Artigos e Docs
- [React Navigation 7 vs Expo Router: Complete Comparison Guide 2025 — Viewlytics](https://viewlytics.ai/blog/react-navigation-7-vs-expo-router)
- [Expo Router vs React Navigation: Which to Use in 2026? — DEV Community](https://dev.to/satyasootar/expo-router-vs-react-navigation-which-one-should-you-use-in-2026-40mm)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Navigation Official Docs — Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [Mastering Expo Router — Protected Routes, Deep Linking & Theming](https://www.welcomedeveloper.com/posts/navigation-expo-router-part-3/)
- [React Native Navigation Made Easy: 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)

---

Next → **[Estado Global & APIs](./estado-e-apis-web)**
