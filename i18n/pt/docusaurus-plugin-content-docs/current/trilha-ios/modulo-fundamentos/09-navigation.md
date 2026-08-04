---
title: Navigation
---

# Navigation

O `NavigationStack` do SwiftUI e o React Navigation compartilham a mesma filosofia declarativa: você descreve a estrutura da sua árvore de navegação e o framework gerencia as transições. Essa é uma diferença fundamental em relação ao modelo imperativo do UIKit — e significa que o modelo mental transfere quase diretamente do SwiftUI para o React Navigation.

## NavigationStack → Stack Navigator

No SwiftUI, um `NavigationStack` envolve o conteúdo e gerencia o stack de push/pop:

```swift
struct RootView: View {
    var body: some View {
        NavigationStack {
            HomeView()
        }
    }
}
```

O stack navigator nativo do React Navigation é o equivalente direto. Instale as dependências:

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

A API estática (recomendada no React Navigation 7) usa `createStaticNavigation`:

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

---

## NavigationLink / navigationDestination → navigate / goBack

No SwiftUI, você dispara a navegação declarativamente com `NavigationLink` ou programaticamente via `NavigationPath`:

```swift
// Declarativo
NavigationLink("Abrir Detalhe", value: product)

// Programático
path.append(product)
path.removeLast()
```

No React Navigation, toda navegação é programática via o objeto `navigation`:

| SwiftUI | React Navigation |
|---|---|
| `path.append(product)` | `navigation.navigate('Detail', { productId: product.id })` |
| `path.removeLast()` | `navigation.goBack()` |
| `path.removeLast(path.count)` | `navigation.popToTop()` |
| `path = NavigationPath()` (reset) | `navigation.reset({ index: 0, routes: [{ name: 'Home' }] })` |

---

## navigationDestination(for:) → route.params

O `navigationDestination(for:)` do SwiftUI vincula uma view de destino a um tipo de dado:

```swift
NavigationStack {
    ProductListView()
        .navigationDestination(for: Product.self) { product in
            ProductDetailView(product: product)
        }
}
```

O React Navigation passa dados através de `route.params`. A tela receptora lê de `route.params` da mesma forma que sua view de destino SwiftUI lê do valor vinculado:

```tsx
// Tela de origem
navigation.navigate('Detail', {
  productId: '42',
  productName: 'Tênis de Corrida',
});

// Tela receptora
function DetailScreen({ route }) {
  const { productId, productName } = route.params;

  return <Text>{productName}</Text>;
}
```

Passar dados de volta não tem equivalente a protocolo de delegate. Use um param de callback:

```tsx
// Tela de lista
navigation.navigate('Filter', {
  onApply: (filters) => setActiveFilters(filters),
});

// Tela de filtro
function FilterScreen({ route }) {
  const { onApply } = route.params;

  return (
    <Button
      title="Aplicar"
      onPress={() => {
        onApply({ category: 'sports', priceMax: 200 });
        navigation.goBack();
      }}
    />
  );
}
```

---

## Navegação com type safety

O `navigationDestination(for:)` do SwiftUI é type-safe por design — o compilador garante que o destino corresponde ao tipo do valor. O React Navigation 7 oferece a mesma garantia via TypeScript.

Defina sua lista de params:

```tsx
type RootStackParamList = {
  Home: undefined;
  Detail: { productId: string; productName: string };
  Filter: { onApply: (filters: Filters) => void };
};
```

Depois, type o hook de navegação:

```tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <Button
      title="Ir para Detalhe"
      onPress={() => navigation.navigate('Detail', { productId: '1', productName: 'Tênis' })}
    />
  );
}
```

O TypeScript vai errar se você omitir params obrigatórios ou passar o tipo errado — a mesma garantia que o SwiftUI dá em tempo de compilação.

---

## TabView → Tab Navigator

O `TabView` do SwiftUI mapeia diretamente para `createBottomTabNavigator`:

```swift
TabView {
    FeedView()
        .tabItem { Label("Feed", systemImage: "house") }
    SearchView()
        .tabItem { Label("Buscar", systemImage: "magnifyingglass") }
    ProfileView()
        .tabItem { Label("Perfil", systemImage: "person") }
}
```

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const TabNavigator = createBottomTabNavigator({
  screens: {
    Feed: {
      screen: FeedScreen,
      options: {
        tabBarLabel: 'Feed',
        tabBarIcon: ({ color, size }) => (
          <Icon name="house" color={color} size={size} />
        ),
      },
    },
    Search: {
      screen: SearchScreen,
      options: {
        tabBarLabel: 'Buscar',
        tabBarIcon: ({ color, size }) => (
          <Icon name="magnifyingglass" color={color} size={size} />
        ),
      },
    },
    Profile: {
      screen: ProfileScreen,
      options: {
        tabBarLabel: 'Perfil',
        tabBarIcon: ({ color, size }) => (
          <Icon name="person" color={color} size={size} />
        ),
      },
    },
  },
});
```

---

## .sheet / .fullScreenCover → Apresentações modais

Os modificadores de sheet e full-screen cover do SwiftUI têm equivalentes diretos na opção `presentation` do native stack:

```swift
.sheet(isPresented: $showFilter) { FilterView() }
.fullScreenCover(isPresented: $showCreate) { CreatePostView() }
```

```tsx
const RootStack = createNativeStackNavigator({
  screens: {
    Main: MainScreen,
    // Equivalente a .fullScreenCover
    CreatePost: {
      screen: CreatePostScreen,
      options: { presentation: 'fullScreenModal' },
    },
    // Equivalente a .sheet / .pageSheet
    FilterSheet: {
      screen: FilterSheetScreen,
      options: { presentation: 'formSheet' },
    },
  },
});
```

`formSheet` renderiza o sheet nativo do iOS com swipe-to-dismiss, idêntico ao `.sheet` do SwiftUI. Para bottom sheets customizados com snap points e detents (equivalente a `UISheetPresentationController` com detents customizados), use `@gorhom/bottom-sheet`.

---

## .navigationTitle / .toolbar → screenOptions e navigation.setOptions

O SwiftUI define o título e os itens da barra de navegação via modificadores de view:

```swift
ProductDetailView()
    .navigationTitle("Detalhe do Produto")
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
            Button("Compartilhar") { handleShare() }
        }
    }
```

O React Navigation usa `screenOptions` para padrões de nível do navigator e `navigation.setOptions` para configuração dinâmica por tela:

```tsx
// Padrões de nível do navigator
const RootStack = createNativeStackNavigator({
  screenOptions: {
    headerStyle: { backgroundColor: '#1C1C1E' },
    headerTintColor: '#FFFFFF',
    headerLargeTitle: true,  // Equivalente a .navigationBarTitleDisplayMode(.large)
  },
  screens: {
    Home: HomeScreen,
    Detail: DetailScreen,
  },
});

// Opções dinâmicas por tela — equivalente a .navigationTitle + .toolbar
function DetailScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({
      title: 'Detalhe do Produto',
      headerRight: () => (
        <Button title="Compartilhar" onPress={handleShare} />
      ),
    });
  }, [navigation]);

  return <View />;
}
```

---

## Navegação programática de ViewModels

No SwiftUI, você conduz a navegação a partir de um ViewModel publicando um path ou um binding:

```swift
@Observable
final class CheckoutViewModel {
    var path = NavigationPath()

    func processPayment(cart: Cart) async {
        let result = await paymentService.charge(cart)
        if result.success {
            path.append(ConfirmationRoute(orderId: result.orderId))
        }
    }
}
```

No React Native, o hook `useNavigation` dá a qualquer componente — ou hook customizado — acesso ao objeto de navegação sem prop drilling:

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

Para navegação fora da árvore de componentes — handlers de push notification, tasks em background — use uma navigation ref:

```tsx
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Em App.tsx
<NavigationContainer ref={navigationRef}>

// Em qualquer outro lugar
navigationRef.navigate('Notification', { id: notifId });
```

---

## Fluxo de autenticação — navigator condicional

O SwiftUI lida com o estado de auth renderizando condicionalmente diferentes views raiz:

```swift
@main
struct MyApp: App {
    @State private var authState = AuthState()

    var body: some Scene {
        WindowGroup {
            if authState.isAuthenticated {
                AppRootView()
            } else {
                LoginView()
            }
        }
    }
}
```

O React Navigation espelha esse padrão exatamente com renderização condicional de navigators:

```tsx
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;

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

Quando `isAuthenticated` muda, o React Navigation troca o navigator automaticamente — sem necessidade de substituição manual da view raiz.

---

## Deep Linking → Linking config

O SwiftUI lida com deep links através de `.onOpenURL` e manipulação de `NavigationPath`. O React Navigation oferece uma config `linking` que mapeia URLs para telas de forma declarativa:

```tsx
import { LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'myapp://',
    'https://myapp.com',
  ],
  config: {
    screens: {
      Home: '',
      Detail: 'product/:productId',
      Profile: {
        path: 'user/:username',
        parse: {
          username: (username) => username.toLowerCase(),
        },
      },
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

O React Navigation lê automaticamente `Linking.getInitialURL()` para cold starts e assina eventos de URL para aberturas em primeiro plano. Universal Links ainda requerem o arquivo `apple-app-site-association` no seu domínio e o entitlement de associated domains no Xcode — o React Navigation lida apenas com o roteamento no lado JavaScript.

---

## Aninhando navigators

A estrutura típica de apps iOS — tab bar com stacks de navegação independentes por tab — mapeia diretamente para navigators aninhados. Isso espelha o padrão SwiftUI de embutir `NavigationStack` dentro de cada tab do `TabView`:

```swift
TabView {
    NavigationStack { FeedListView() }
        .tabItem { Label("Feed", systemImage: "house") }
    NavigationStack { SearchHomeView() }
        .tabItem { Label("Buscar", systemImage: "magnifyingglass") }
}
```

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

Navegar para outra tab a partir de dentro de um stack aninhado usa `navigation.navigate('Search')` — o React Navigation resolve a tab de destino automaticamente.

---

## API estática vs API dinâmica

O React Navigation 7 introduziu a API estática como abordagem recomendada. A API dinâmica mais antiga ainda funciona e é útil quando a lista de telas é condicional ou orientada por dados em tempo de execução:

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

Use a API estática para conjuntos fixos de telas — melhor inferência TypeScript e performance. Use a API dinâmica quando telas são adicionadas ou removidas com base em condições de runtime.

---

## Resumo

| SwiftUI | React Navigation |
|---|---|
| `NavigationStack` | `createNativeStackNavigator` |
| `NavigationLink(value:)` | `navigation.navigate('Screen', params)` |
| `path.removeLast()` | `navigation.goBack()` |
| `navigationDestination(for:)` | `route.params` na tela receptora |
| `TabView` | `createBottomTabNavigator` |
| `.sheet` | `presentation: 'formSheet'` |
| `.fullScreenCover` | `presentation: 'fullScreenModal'` |
| `.navigationTitle` | `title` em `screenOptions` / `setOptions` |
| `.toolbar` | `headerRight` / `headerLeft` nas options |
| View raiz condicional (auth) | Renderização condicional de navigator |
| `.onOpenURL` | config `linking` no `NavigationContainer` |
| `NavigationPath` no ViewModel | hook `useNavigation` em hook customizado |
