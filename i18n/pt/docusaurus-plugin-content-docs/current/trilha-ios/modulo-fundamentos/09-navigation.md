---
title: Navigation
---

# Navegacao

A navegacao no iOS e um dos paradigmas mais maduros do desenvolvimento mobile. O `UINavigationController`, o `UITabBarController` e o sistema de apresentacao modal do UIKit carregam anos de convencao. O React Navigation 7 mapeia de perto esses padroes — assim que voce enxerga a correspondencia, o modelo mental se transfere rapidamente.

## UINavigationController → Stack Navigator

No UIKit, voce empilha e desempilha view controllers em uma pilha de navegacao gerenciada pelo `UINavigationController`. O Stack Navigator do React Navigation e o equivalente direto.

Instale as dependencias:

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

A API estatica (recomendada no React Navigation 7) usa `createStaticNavigation`:

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStaticNavigation } from '@react-navigation/native';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Detail: DetailScreen,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

Isso e o equivalente em Swift de definir o navigation controller inicial do seu storyboard com um root view controller e segues para os controllers filhos.

## push/pop → navigate/goBack

| UIKit | React Navigation |
|---|---|
| `navigationController?.pushViewController(vc, animated: true)` | `navigation.navigate('Detail')` |
| `navigationController?.popViewController(animated: true)` | `navigation.goBack()` |
| `navigationController?.popToRootViewController(animated: true)` | `navigation.popToTop()` |
| `navigationController?.setViewControllers([vc], animated: true)` | `navigation.reset({ index: 0, routes: [{ name: 'Home' }] })` |

## Parametros de Segue → route.params

No UIKit, voce passa dados para frente usando `prepare(for:sender:)` e para tras usando delegation ou closures. O React Navigation passa parametros pelo objeto de rota.

Passando parametros para frente:

```tsx
// Tela de origem
navigation.navigate('Detail', {
  productId: '42',
  productName: 'Running Shoes',
});

// Tela de destino
function DetailScreen({ route }) {
  const { productId, productName } = route.params;

  return <Text>{productName}</Text>;
}
```

Isso substitui o padrao `prepare(for segue: UIStoryboardSegue, sender: Any?)`, onde voce faz o cast de `segue.destination` para o tipo alvo e define suas propriedades.

Passar dados de volta e tratado de forma diferente — nao existe protocolo delegate. Em vez disso, use params de navegacao na rota anterior:

```tsx
// Tela de lista define um param de callback
navigation.navigate('Filter', {
  onApply: (filters) => {
    setActiveFilters(filters);
  },
});

// Tela de filtro o chama
function FilterScreen({ route }) {
  const { onApply } = route.params;

  return (
    <Button
      title="Apply"
      onPress={() => {
        onApply({ category: 'sports', priceMax: 200 });
        navigation.goBack();
      }}
    />
  );
}
```

## Rotas Tipadas (Padrao NavigationStack do SwiftUI)

O `NavigationStack` do SwiftUI com `navigationDestination(for:)` introduziu navegacao type-safe. A API estatica do React Navigation 7 oferece uma garantia similar por meio de inferencia de tipos de parametros de rota com TypeScript.

Defina sua lista de parametros:

```tsx
type RootStackParamList = {
  Home: undefined;
  Detail: { productId: string; productName: string };
  Filter: { onApply: (filters: Filters) => void };
};
```

Com a API estatica, o TypeScript infere os tipos de parametros a partir das definicoes de tela quando voce usa `useNavigation` com um hook de navigator tipado:

```tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <Button
      title="Go to Detail"
      onPress={() => navigation.navigate('Detail', { productId: '1', productName: 'Shoes' })}
    />
  );
}
```

O TypeScript retornara um erro se voce omitir parametros obrigatorios ou passar o tipo errado — a mesma garantia de seguranca do `navigationDestination(for:)` do SwiftUI.

## UITabBarController → Tab Navigator

O `UITabBarController` mapeia diretamente para o `createBottomTabNavigator`:

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const TabNavigator = createBottomTabNavigator({
  screens: {
    Feed: {
      screen: FeedScreen,
      options: {
        tabBarLabel: 'Feed',
        tabBarIcon: ({ color, size }) => (
          <Icon name="home" color={color} size={size} />
        ),
      },
    },
    Search: {
      screen: SearchScreen,
      options: {
        tabBarLabel: 'Search',
        tabBarIcon: ({ color, size }) => (
          <Icon name="search" color={color} size={size} />
        ),
      },
    },
    Profile: {
      screen: ProfileScreen,
      options: {
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color, size }) => (
          <Icon name="person" color={color} size={size} />
        ),
      },
    },
  },
});
```

Tab navigators sao tipicamente aninhados dentro de um stack navigator na raiz, espelhando como aplicativos UIKit embtem o `UITabBarController` como root e empilham view controllers adicionais sobre ele.

## UIModalPresentationStyle → Modal Stack e Bottom Sheets

Os estilos `.sheet`, `.fullScreen` e `.pageSheet` do UIKit possuem equivalentes no React Navigation por meio dos modos de apresentacao no native stack:

```tsx
const RootStack = createNativeStackNavigator({
  screens: {
    Main: MainScreen,
    // Modal em tela cheia — equivalente a .fullScreen
    CreatePost: {
      screen: CreatePostScreen,
      options: {
        presentation: 'fullScreenModal',
      },
    },
    // Sheet — equivalente a .pageSheet / .sheet
    FilterSheet: {
      screen: FilterSheetScreen,
      options: {
        presentation: 'formSheet',
      },
    },
  },
});
```

A apresentacao `formSheet` no iOS renderiza a interacao nativa de sheet com swipe-to-dismiss, identica ao `UIModalPresentationStyle.pageSheet`.

Para bottom sheets customizados com snap points e controle de gestos, use `@gorhom/bottom-sheet` — ele fornece comportamento similar ao `UISheetPresentationController` com detents.

## Customizacao do UINavigationBar → screenOptions headerStyle

No UIKit, voce customiza a navigation bar via `navigationController?.navigationBar.standardAppearance`. No React Navigation, isso e feito por meio de `screenOptions` no nivel do navigator ou `options` no nivel da tela.

Defaults no nivel do navigator (equivalente a definir aparencia no `UINavigationController`):

```tsx
const RootStack = createNativeStackNavigator({
  screenOptions: {
    headerStyle: {
      backgroundColor: '#1C1C1E',
    },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 17,
    },
    headerLargeTitle: true, // Equivalente a prefersLargeTitles = true
  },
  screens: {
    Home: HomeScreen,
    Detail: DetailScreen,
  },
});
```

Sobrescrita por tela (equivalente a modificar `navigationItem` dentro de um `UIViewController`):

```tsx
function DetailScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({
      title: 'Product Detail',
      headerRight: () => (
        <Button title="Share" onPress={handleShare} />
      ),
      headerBackTitle: 'Back',
    });
  }, [navigation]);

  return <View />;
}
```

`headerLargeTitle` ativa o comportamento de large title do iOS, recolhendo para o titulo inline padrao ao rolar — o mesmo que `prefersLargeTitles` no `UINavigationController`.

## Navegacao Programatica de ViewModels → Hook useNavigation

Desenvolvedores iOS que usam MVVM frequentemente disparam navegacao a partir de um ViewModel ou Coordinator chamando metodos em um delegate ou usando closures. No React Native, o hook `useNavigation` da a qualquer componente acesso ao objeto de navegacao sem prop drilling.

Isso e o equivalente de injetar um coordinator ou usar `NotificationCenter` para disparar navegacao a partir de uma camada que nao e de view:

```tsx
import { useNavigation } from '@react-navigation/native';

function useCheckout() {
  const navigation = useNavigation();

  async function processPayment(cart: Cart) {
    const result = await paymentService.charge(cart);

    if (result.success) {
      navigation.navigate('Confirmation', { orderId: result.orderId });
    } else {
      navigation.navigate('PaymentError', { reason: result.error });
    }
  }

  return { processPayment };
}
```

`useNavigation` so pode ser chamado dentro de um componente ou de um custom hook chamado por um componente dentro da arvore de navegacao. Para navegacao fora da arvore (tarefas em background, handlers de push notification), use uma navigation ref:

```tsx
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Em App.tsx
<NavigationContainer ref={navigationRef}>

// Em qualquer outro lugar
navigationRef.navigate('Notification', { id: notifId });
```

Isso e o equivalente de manter uma weak reference ao `UINavigationController` raiz no seu AppDelegate ou SceneDelegate.

## Fluxo de Autenticacao — Padrao de Troca de Root

Um padrao comum no iOS usa diferentes root view controllers dependendo do estado de autenticacao, trocando o `rootViewController` da window. O React Navigation trata isso com renderizacao condicional de navigators:

```tsx
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}

const AuthStack = createNativeStackNavigator({
  screenOptions: { headerShown: false },
  screens: {
    Login: LoginScreen,
    Register: RegisterScreen,
    ForgotPassword: ForgotPasswordScreen,
  },
});

const AppTabs = createBottomTabNavigator({
  screens: {
    Feed: FeedScreen,
    Search: SearchScreen,
    Profile: ProfileScreen,
  },
});
```

Quando `isAuthenticated` muda, o React Navigation troca o navigator suavemente — sem necessidade de substituicao manual do root controller.

## Deep Linking: Universal Links → Linking Config

Os Universal Links do iOS sao configurados em arquivos `apple-app-site-association` e tratados no `AppDelegate`. O React Navigation fornece uma config `linking` que substitui isso com mapeamento declarativo de URL para tela.

```tsx
import { LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'myapp://',                         // Scheme de URL customizado
    'https://myapp.com',                // Dominio dos Universal Links
  ],
  config: {
    screens: {
      Home: '',                          // myapp:// ou https://myapp.com/
      Detail: 'product/:productId',      // myapp://product/42
      Profile: {
        path: 'user/:username',
        parse: {
          username: (username) => username.toLowerCase(),
        },
      },
      Settings: 'settings',
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking} fallback={<LoadingScreen />}>
      <RootNavigator />
    </NavigationContainer>
  );
}
```

O React Navigation le automaticamente `Linking.getInitialURL()` para cold starts e assina `Linking.addEventListener` para aberturas em foreground — os mesmos eventos que voce trata em `AppDelegate.application(_:open:options:)` e `AppDelegate.application(_:continue:restorationHandler:)`.

Para que os Universal Links funcionem, voce ainda precisa do arquivo `apple-app-site-association` hospedado no seu dominio e do associated domains entitlement no Xcode. O React Navigation cuida apenas do roteamento no lado JavaScript; a interceptacao de links no nivel do sistema permanece inalterada.

## navigationOptions vs screenOptions

Versoes antigas do React Navigation usavam `static navigationOptions` nos componentes de tela. Essa API foi removida. A abordagem atual:

- `screenOptions` no navigator — aplica a todas as telas (defaults no nivel do navigator)
- `options` na definicao de uma tela — aplica a uma unica tela (estatico, conhecido no momento da montagem)
- `navigation.setOptions()` dentro de uma tela — aplica a tela atual de forma dinamica

```tsx
// Options estaticas no navigator
const Stack = createNativeStackNavigator({
  screenOptions: {
    animation: 'slide_from_right',  // Animacao de push padrao do iOS
  },
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        title: 'Home',              // Titulo estatico
        headerLargeTitle: true,
      },
    },
    Detail: {
      screen: DetailScreen,
      options: ({ route }) => ({
        title: route.params.productName,  // Derivado dos params
      }),
    },
  },
});
```

## API Estatica vs API Dinamica

O React Navigation 7 introduziu a API estatica como abordagem recomendada. A API dinamica mais antiga (usando hooks como `createNativeStackNavigator()` e composicao de navigators com JSX) ainda funciona, mas a API estatica e preferida para novos projetos.

API dinamica (ainda valida, util para telas condicionais):

```tsx
const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.primary } }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Detail" component={DetailScreen} />
    </Stack.Navigator>
  );
}
```

Use a API dinamica quando sua lista de telas e condicional ou orientada a dados em tempo de execucao. Use a API estatica para conjuntos fixos de telas — ela oferece melhor inferencia de TypeScript e desempenho.

## Aninhando Navigators

A estrutura tipica de aplicativo iOS — tab bar com stacks dentro de cada tab — mapeia diretamente para navigators aninhados:

```tsx
const FeedStack = createNativeStackNavigator({
  screens: {
    FeedList: FeedListScreen,
    PostDetail: PostDetailScreen,
  },
});

const SearchStack = createNativeStackNavigator({
  screens: {
    SearchHome: SearchHomeScreen,
    SearchResults: SearchResultsScreen,
  },
});

const RootTabs = createBottomTabNavigator({
  screens: {
    Feed: FeedStack,
    Search: SearchStack,
    Profile: ProfileScreen,
  },
});
```

Navegar entre tabs a partir de dentro de um stack aninhado usa `navigation.navigate('Search')` — o React Navigation resolve a tab de destino automaticamente, espelhando `tabBarController?.selectedIndex = 1` no UIKit.
