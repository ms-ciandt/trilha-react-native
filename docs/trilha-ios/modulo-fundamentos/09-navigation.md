---
title: Navigation
---

# Navigation

iOS navigation is one of the most mature paradigms in mobile development. UIKit's `UINavigationController`, `UITabBarController`, and modal presentation system have years of convention behind them. React Navigation 7 maps closely to these patterns — once you see the correspondence, the mental model transfers quickly.

## UINavigationController → Stack Navigator

In UIKit, you push and pop view controllers onto a navigation stack managed by `UINavigationController`. React Navigation's Stack Navigator is the direct equivalent.

Install the dependencies:

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

This is the Swift equivalent of defining your storyboard's initial navigation controller with a root view controller and segues to child controllers.

## push/pop → navigate/goBack

| UIKit | React Navigation |
|---|---|
| `navigationController?.pushViewController(vc, animated: true)` | `navigation.navigate('Detail')` |
| `navigationController?.popViewController(animated: true)` | `navigation.goBack()` |
| `navigationController?.popToRootViewController(animated: true)` | `navigation.popToTop()` |
| `navigationController?.setViewControllers([vc], animated: true)` | `navigation.reset({ index: 0, routes: [{ name: 'Home' }] })` |

## Segue Parameters → route.params

In UIKit, you pass data forward using `prepare(for:sender:)` and backward using delegation or closures. React Navigation passes parameters through the route object.

Passing parameters forward:

```tsx
// Departing screen
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

This replaces the `prepare(for segue: UIStoryboardSegue, sender: Any?)` pattern where you cast `segue.destination` to the target type and set its properties.

Passing data back is handled differently — there is no delegate protocol. Instead, use navigation params on the previous route:

```tsx
// List screen sets a callback param
navigation.navigate('Filter', {
  onApply: (filters) => {
    setActiveFilters(filters);
  },
});

// Filter screen calls it
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

## Typed Routes (SwiftUI NavigationStack Pattern)

SwiftUI's `NavigationStack` with `navigationDestination(for:)` introduced type-safe navigation. React Navigation 7's static API offers a similar guarantee through TypeScript path param inference.

Define your param list:

```tsx
type RootStackParamList = {
  Home: undefined;
  Detail: { productId: string; productName: string };
  Filter: { onApply: (filters: Filters) => void };
};
```

With the static API, TypeScript infers param types from your screen definitions when you use `useNavigation` with a typed navigator hook:

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

TypeScript will error if you omit required params or pass the wrong type — the same safety guarantee as SwiftUI's `navigationDestination(for:)`.

## UITabBarController → Tab Navigator

`UITabBarController` maps directly to `createBottomTabNavigator`:

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

Tab navigators are typically nested inside a stack navigator at the root, mirroring how UIKit apps embed `UITabBarController` as the root and push additional view controllers on top of it.

## UIModalPresentationStyle → Modal Stack and Bottom Sheets

UIKit's `.sheet`, `.fullScreen`, and `.pageSheet` have equivalents in React Navigation through presentation modes on the native stack:

```tsx
const RootStack = createNativeStackNavigator({
  screens: {
    Main: MainScreen,
    // Full screen modal — equivalent to .fullScreen
    CreatePost: {
      screen: CreatePostScreen,
      options: {
        presentation: 'fullScreenModal',
      },
    },
    // Sheet — equivalent to .pageSheet / .sheet
    FilterSheet: {
      screen: FilterSheetScreen,
      options: {
        presentation: 'formSheet',
      },
    },
  },
});
```

The `formSheet` presentation on iOS renders the native sheet interaction with swipe-to-dismiss, identical to `UIModalPresentationStyle.pageSheet`.

For custom bottom sheets with snap points and gesture control, use `@gorhom/bottom-sheet` — it provides behavior similar to `UISheetPresentationController` detents.

## UINavigationBar Customization → screenOptions headerStyle

In UIKit, you customize the navigation bar via `navigationController?.navigationBar.standardAppearance`. In React Navigation, this is done through `screenOptions` at the navigator level or `options` at the screen level.

Navigator-level defaults (equivalent to setting appearance on the `UINavigationController`):

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
    headerLargeTitle: true, // Equivalent to prefersLargeTitles = true
  },
  screens: {
    Home: HomeScreen,
    Detail: DetailScreen,
  },
});
```

Per-screen overrides (equivalent to modifying `navigationItem` inside a `UIViewController`):

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

`headerLargeTitle` activates iOS's large title behavior, collapsing to the standard inline title on scroll — the same as `prefersLargeTitles` on `UINavigationController`.

## Programmatic Navigation from ViewModels → useNavigation Hook

iOS developers using MVVM often trigger navigation from a ViewModel or Coordinator by calling methods on a delegate or using closures. In React Native, the `useNavigation` hook gives any component access to the navigation object without prop drilling.

This is the equivalent of injecting a coordinator or using `NotificationCenter` to trigger navigation from a non-view layer:

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

`useNavigation` can only be called inside a component or a custom hook called from a component inside the navigation tree. For navigation outside the tree (background tasks, push notification handlers), use a navigation ref:

```tsx
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// In App.tsx
<NavigationContainer ref={navigationRef}>

// Anywhere else
navigationRef.navigate('Notification', { id: notifId });
```

This is the equivalent of keeping a weak reference to the root `UINavigationController` in your AppDelegate or SceneDelegate.

## Authentication Flow — Root Switch Pattern

A common iOS pattern uses different root view controllers depending on auth state, swapping the window's `rootViewController`. React Navigation handles this with conditional navigator rendering:

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

When `isAuthenticated` changes, React Navigation smoothly swaps the navigator — no manual root controller replacement needed.

## Deep Linking: Universal Links → Linking Config

iOS Universal Links are configured in `apple-app-site-association` files and handled in `AppDelegate`. React Navigation provides a `linking` config that replaces this with declarative URL-to-screen mapping.

```tsx
import { LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'myapp://',                         // Custom URL scheme
    'https://myapp.com',                // Universal Links domain
  ],
  config: {
    screens: {
      Home: '',                          // myapp:// or https://myapp.com/
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

React Navigation automatically reads `Linking.getInitialURL()` for cold starts and subscribes to `Linking.addEventListener` for foreground opens — the same events you handle in `AppDelegate.application(_:open:options:)` and `AppDelegate.application(_:continue:restorationHandler:)`.

For Universal Links to work, you still need the `apple-app-site-association` file hosted on your domain and the associated domains entitlement in Xcode. React Navigation handles only the JavaScript-side routing; the system-level link interception is unchanged.

## navigationOptions vs screenOptions

Early React Navigation versions used `static navigationOptions` on screen components. This API was removed. The current approach:

- `screenOptions` on the navigator — applies to all screens (navigator-level defaults)
- `options` on a screen definition — applies to one screen (static, known at mount time)
- `navigation.setOptions()` inside a screen — applies to the current screen dynamically

```tsx
// Static options on the navigator
const Stack = createNativeStackNavigator({
  screenOptions: {
    animation: 'slide_from_right',  // Default iOS push animation
  },
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        title: 'Home',              // Static title
        headerLargeTitle: true,
      },
    },
    Detail: {
      screen: DetailScreen,
      options: ({ route }) => ({
        title: route.params.productName,  // Derived from params
      }),
    },
  },
});
```

## Static API vs Dynamic API

React Navigation 7 introduced the static API as the recommended approach. The older dynamic API (using hooks like `createNativeStackNavigator()` and JSX navigator composition) still works but the static API is preferred for new projects.

Dynamic API (still valid, useful for conditional screens):

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

Use the dynamic API when your screen list is conditional or data-driven at runtime. Use the static API for fixed screen sets — it offers better TypeScript inference and performance.

## Nesting Navigators

The typical iOS app structure — tab bar with stacks inside each tab — maps directly to nested navigators:

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

Navigating between tabs from inside a nested stack uses `navigation.navigate('Search')` — React Navigation resolves the target tab automatically, mirroring `tabBarController?.selectedIndex = 1` in UIKit.
