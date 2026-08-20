---
title: Navigation
---

# Navigation

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/fund_09_navigation.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

SwiftUI's `NavigationStack` and React Navigation share the same declarative philosophy: you describe the structure of your navigation tree, and the framework manages the transitions. This is a fundamental difference from UIKit's imperative `pushViewController` model — and it means the mental model transfers almost directly from SwiftUI to React Navigation.

## NavigationStack → Stack Navigator

In SwiftUI, a `NavigationStack` wraps your content and manages the push/pop stack:

```swift
struct RootView: View {
    var body: some View {
        NavigationStack {
            HomeView()
        }
    }
}
```

React Navigation's native stack navigator is the direct equivalent. Install the dependencies:

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

The static API (recommended in React Navigation 7) uses `createStaticNavigation`:

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

In SwiftUI, you trigger navigation declaratively with `NavigationLink` or programmatically via a `NavigationPath`:

```swift
// Declarative
NavigationLink("Open Detail", value: product)

// Programmatic
path.append(product)
path.removeLast()
```

In React Navigation, all navigation is programmatic via the `navigation` object:

| SwiftUI | React Navigation |
|---|---|
| `path.append(product)` | `navigation.navigate('Detail', { productId: product.id })` |
| `path.removeLast()` | `navigation.goBack()` |
| `path.removeLast(path.count)` | `navigation.popToTop()` |
| `path = NavigationPath()` (reset) | `navigation.reset({ index: 0, routes: [{ name: 'Home' }] })` |

---

## navigationDestination(for:) → route.params

SwiftUI's `navigationDestination(for:)` binds a destination view to a data type:

```swift
NavigationStack {
    ProductListView()
        .navigationDestination(for: Product.self) { product in
            ProductDetailView(product: product)
        }
}
```

React Navigation passes data through `route.params`. The receiving screen reads from `route.params` the same way your SwiftUI destination reads from the bound value:

```tsx
// Navigating screen
navigation.navigate('Detail', {
  productId: '42',
  productName: 'Running Shoes',
});

// Receiving screen
function DetailScreen({ route }) {
  const { productId, productName } = route.params;

  return <Text>{productName}</Text>;
}
```

Passing data back has no delegate protocol equivalent. Use a callback param instead:

```tsx
// List screen
navigation.navigate('Filter', {
  onApply: (filters) => setActiveFilters(filters),
});

// Filter screen
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

---

## Type-safe navigation

SwiftUI's `navigationDestination(for:)` is type-safe by design — the compiler ensures the destination matches the value type. React Navigation 7 provides the same guarantee through TypeScript.

Define your param list:

```tsx
type RootStackParamList = {
  Home: undefined;
  Detail: { productId: string; productName: string };
  Filter: { onApply: (filters: Filters) => void };
};
```

Then type the navigation hook:

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

TypeScript will error if you omit required params or pass the wrong type — the same guarantee SwiftUI gives at compile time.

---

## TabView → Tab Navigator

SwiftUI's `TabView` maps directly to `createBottomTabNavigator`:

```swift
TabView {
    FeedView()
        .tabItem { Label("Feed", systemImage: "house") }
    SearchView()
        .tabItem { Label("Search", systemImage: "magnifyingglass") }
    ProfileView()
        .tabItem { Label("Profile", systemImage: "person") }
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
        tabBarLabel: 'Search',
        tabBarIcon: ({ color, size }) => (
          <Icon name="magnifyingglass" color={color} size={size} />
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

---

## .sheet / .fullScreenCover → Modal presentations

SwiftUI's sheet and full-screen cover modifiers have direct equivalents in the native stack's `presentation` option:

```swift
.sheet(isPresented: $showFilter) { FilterView() }
.fullScreenCover(isPresented: $showCreate) { CreatePostView() }
```

```tsx
const RootStack = createNativeStackNavigator({
  screens: {
    Main: MainScreen,
    // Equivalent to .fullScreenCover
    CreatePost: {
      screen: CreatePostScreen,
      options: { presentation: 'fullScreenModal' },
    },
    // Equivalent to .sheet / .pageSheet
    FilterSheet: {
      screen: FilterSheetScreen,
      options: { presentation: 'formSheet' },
    },
  },
});
```

`formSheet` renders the native iOS sheet with swipe-to-dismiss, identical to SwiftUI's `.sheet`. For custom bottom sheets with snap points and detents (equivalent to `UISheetPresentationController` with custom detents), use `@gorhom/bottom-sheet`.

---

## .navigationTitle / .toolbar → screenOptions and navigation.setOptions

SwiftUI sets the navigation bar title and toolbar items via view modifiers:

```swift
ProductDetailView()
    .navigationTitle("Product Detail")
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
            Button("Share") { handleShare() }
        }
    }
```

React Navigation uses `screenOptions` for navigator-level defaults and `navigation.setOptions` for per-screen dynamic configuration:

```tsx
// Navigator-level defaults
const RootStack = createNativeStackNavigator({
  screenOptions: {
    headerStyle: { backgroundColor: '#1C1C1E' },
    headerTintColor: '#FFFFFF',
    headerLargeTitle: true,  // Equivalent to .navigationBarTitleDisplayMode(.large)
  },
  screens: {
    Home: HomeScreen,
    Detail: DetailScreen,
  },
});

// Per-screen dynamic options — equivalent to .navigationTitle + .toolbar
function DetailScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({
      title: 'Product Detail',
      headerRight: () => (
        <Button title="Share" onPress={handleShare} />
      ),
    });
  }, [navigation]);

  return <View />;
}
```

---

## Programmatic navigation from ViewModels

In SwiftUI, you drive navigation from a ViewModel by publishing a path or a binding:

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

In React Native, the `useNavigation` hook gives any component — or custom hook — access to the navigation object without prop drilling:

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

For navigation outside the component tree — push notification handlers, background tasks — use a navigation ref:

```tsx
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// In App.tsx
<NavigationContainer ref={navigationRef}>

// Anywhere else
navigationRef.navigate('Notification', { id: notifId });
```

---

## Authentication flow — conditional navigator

SwiftUI handles auth state by conditionally rendering different root views:

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

React Navigation mirrors this pattern exactly with conditional navigator rendering:

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

When `isAuthenticated` changes, React Navigation swaps the navigator — no manual root replacement needed.

---

## Deep Linking → Linking config

SwiftUI handles deep links through `.onOpenURL` and `NavigationPath` manipulation. React Navigation provides a `linking` config that maps URLs to screens declaratively:

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

React Navigation automatically reads `Linking.getInitialURL()` for cold starts and subscribes to URL events for foreground opens. Universal Links still require the `apple-app-site-association` file on your domain and the associated domains entitlement in Xcode — React Navigation handles only the JavaScript-side routing.

---

## Nesting navigators

The typical iOS app structure — tab bar with independent navigation stacks per tab — maps directly to nested navigators. This mirrors the SwiftUI pattern of embedding `NavigationStack` inside each `TabView` tab:

```swift
TabView {
    NavigationStack { FeedListView() }
        .tabItem { Label("Feed", systemImage: "house") }
    NavigationStack { SearchHomeView() }
        .tabItem { Label("Search", systemImage: "magnifyingglass") }
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

Navigating to another tab from inside a nested stack uses `navigation.navigate('Search')` — React Navigation resolves the target tab automatically.

---

## Static API vs Dynamic API

React Navigation 7 introduced the static API as the recommended approach. The older dynamic API still works and is useful when your screen list is conditional or data-driven at runtime:

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

Use the static API for fixed screen sets — better TypeScript inference and performance. Use the dynamic API when screens are added or removed based on runtime conditions.

---

## Summary

| SwiftUI | React Navigation |
|---|---|
| `NavigationStack` | `createNativeStackNavigator` |
| `NavigationLink(value:)` | `navigation.navigate('Screen', params)` |
| `path.removeLast()` | `navigation.goBack()` |
| `navigationDestination(for:)` | `route.params` on receiving screen |
| `TabView` | `createBottomTabNavigator` |
| `.sheet` | `presentation: 'formSheet'` |
| `.fullScreenCover` | `presentation: 'fullScreenModal'` |
| `.navigationTitle` | `title` in `screenOptions` / `setOptions` |
| `.toolbar` | `headerRight` / `headerLeft` in options |
| Conditional root view (auth) | Conditional navigator rendering |
| `.onOpenURL` | `linking` config on `NavigationContainer` |
| `NavigationPath` in ViewModel | `useNavigation` hook in custom hook |
