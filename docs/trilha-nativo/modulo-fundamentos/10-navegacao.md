---
id: navegacao-nativo
title: "Navigation"
sidebar_label: "Navigation"
sidebar_position: 10
---

# Navigation

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo_10_navegacao_en.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Topic Goal

By the end, you should be able to:
- Create and configure Stack, Tab, and Drawer Navigators
- Nest navigators (Drawer > Tab > Stack)
- Implement a conditional authentication flow
- Navigate with typed parameter passing (TypeScript)
- Configure deep linking
- Compare the model with what you already know in Android/iOS

---

## Mapping: Android/iOS → React Navigation

| Native | React Navigation | Note |
|--------|-----------------|------|
| Back Stack (Android) | `Stack.Navigator` | `navigation.goBack()` ≈ `popBackStack()` |
| NavigationController (iOS) | `Stack.Navigator` | Native swipe-back is supported by default |
| BottomNavigationView | `Tab.Navigator` | Lazy rendering with `lazy={true}` |
| NavigationDrawer | `Drawer.Navigator` | Swipe gesture same as native |
| Intent with extras | `navigation.navigate('Screen', { id: 1 })` | `route.params` retrieves the data |
| Deep link / App Links | `linking` prop on `NavigationContainer` | Universal Links (iOS) and App Links (Android) |

---

## Installation

```bash
npm install @react-navigation/native react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated

# Specific navigators
npm install @react-navigation/stack
npm install @react-navigation/bottom-tabs
npm install @react-navigation/drawer

cd ios && pod install
```

> **Attention:** Add `import 'react-native-gesture-handler'` as the **first line** of `index.js`.

---

## Stack Navigator

The Stack Navigator is the direct equivalent of Android's Back Stack and iOS's `UINavigationController`. It manages a stack of screens: `navigate` pushes a new screen (like `startActivity` or `pushViewController`), and `goBack` removes the top screen, returning to the previous one.

The most important difference from native is that previous screens in the stack **are not destroyed** — they stay mounted in memory in the state they were in. There is no exact equivalent to `onResume`/`viewWillAppear` in the standard React lifecycle; for that behavior, you need to use `useFocusEffect`.

The `RootStackParamList` with TypeScript is the typed equivalent of an Intent bundle or a segue parameter dictionary — the difference is that here the type is checked at compile time.

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
        options={{ title: 'Details' }}
      />
    </Stack.Navigator>
  );
}
```


```tsx
// Navigating with parameters
navigation.navigate('Details', { productId: '42' });

// Receiving
const { productId } = route.params;
```

---

## Tab Navigator

The Tab Navigator is the equivalent of Android Material's `BottomNavigationView` or iOS's `UITabBarController`. Each tab maintains its own independent navigation state — if the user went deep into a stack within tab A and then switched to tab B, when returning to tab A the stack will be where it was left.

The `lazy: true` option controls whether tab screens are rendered at startup or only when the tab is visited for the first time. In development with many tabs, keeping it as `lazy` reduces the startup cost.

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

The Drawer Navigator implements the sliding side menu — equivalent to Android's `DrawerLayout`. The swipe gesture to open/close is handled automatically by `react-native-gesture-handler`, with no additional configuration needed. The Drawer is typically used as the outermost layer of the hierarchy, wrapping the other navigators.

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

## Nesting: Drawer > Tab > Stack (most common pattern in apps)

Navigators are just React components — any `Screen` can receive another Navigator as its `component`. This allows you to create composite navigation hierarchies that reflect the app's structure.

The Drawer > Tab > Stack hierarchy is the most common in production apps because it reflects distinct levels of organization: the Drawer accesses sections of the app, the Tabs organize the main screens of each section, and the Stack manages depth within each tab. Each navigation level is isolated — the back stack of one tab does not interfere with another.

In native development, this composition would be implemented with multiple manually nested controllers; here it is declarative and each navigator manages its own state.

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

## Conditional Authentication Flow

In native development, switching between the authentication flow and the main app normally involves swapping the `rootViewController` (iOS) or starting a new Activity as root (Android). In React Navigation, the pattern is declarative: you simply do not declare the authenticated screens while the user is not logged in.

When `isAuthenticated` changes, React Navigation detects that the set of available screens has changed and performs the transition automatically — without imperative navigation calls. The authentication state drives navigation, not the other way around.

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


> React Navigation automatically unmounts the screens from the previous flow when the state changes — the behavior is equivalent to swapping the root Activity on Android.

---

## Deep Linking

Deep linking in React Navigation is equivalent to the combination of **App Links** (Android) and **Universal Links** (iOS) that you would configure in a native project — with the difference that the URL-to-screen mapping is done in JavaScript, not in the manifest or Info.plist.

The `myapp://` prefix uses custom schemes, which only work if the app is installed. The `https://myapp.com` prefix uses universal/app links — it requires additional server-side configuration (`.well-known/assetlinks.json` file on Android, `apple-app-site-association` on iOS), but provides a browser fallback when the app is not installed.

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

> For Android: configure `intent-filter` in `AndroidManifest.xml`.  
> For iOS: configure `Associated Domains` and `URL Types` in Xcode.

---

## Screen lifecycle: useFocusEffect

In native development, a screen's lifecycle is tied to the Activity/Fragment (`onResume`, `onPause`) or ViewController (`viewWillAppear`, `viewWillDisappear`). In React Navigation, screens are **not destroyed** when you leave them — they stay mounted in memory — so the React component lifecycle does not map directly to "screen became visible again".

The `useFocusEffect` hook solves this: it runs when the screen gains focus and, optionally, executes a cleanup when it loses focus. It is the direct replacement for `onResume`/`viewWillAppear`.

```tsx
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

function OrdersScreen() {
  useFocusEffect(
    useCallback(() => {
      // Equivalent to onResume (Android) or viewWillAppear (iOS)
      // Runs every time the screen gains focus
      fetchOrders();

      return () => {
        // Equivalent to onPause (Android) or viewWillDisappear (iOS)
        // Runs when the screen loses focus
        cancelPendingRequests();
      };
    }, [])
  );
}
```

The `useCallback` with an empty array is required: without it, the effect re-registers on every render, causing duplicate calls.

| Native | useFocusEffect |
|--------|---------------|
| `onResume` / `viewWillAppear` | callback body |
| `onPause` / `viewWillDisappear` | returned cleanup function |
| `onCreate` / `viewDidLoad` | `useEffect` with empty array (runs once) |

---

## Navigating from nested components: useNavigation

In native development, you access the navigation controller via a direct reference (`self.navigationController`, `findNavController()`). In React Navigation, the `useNavigation` hook provides the navigation object to any component in the tree — without needing to pass `navigation` as a prop.

```tsx
import { useNavigation } from '@react-navigation/native';

// Generic component, not a Screen — does not receive navigation as a prop
function ProductCard({ product }: { product: Product }) {
  const navigation = useNavigation();

  return (
    <Pressable onPress={() => navigation.navigate('Details', { productId: product.id })}>
      <Text>{product.name}</Text>
    </Pressable>
  );
}
```

This is equivalent to calling `findNavController()` from any View inside a Fragment on Android — without requiring the Fragment to manually pass the reference down through the view hierarchy.

---

## Performance Tips

React Navigation, by default, manages screens in memory more aggressively than native — all screens in the stack stay mounted. Some options mitigate this:

- `lazy={true}` on Tab navigators — avoids rendering screens that have never been accessed; equivalent to the default behavior of `ViewPager` with off-screen page limit = 0
- `detachInactiveScreens={true}` on Stack — removes inactive screens from the layout (but keeps the React state), freeing rendering memory; behavior close to `onStop` on Android
- `react-native-screens` already active by default in recent versions — this library causes each Screen to be rendered as a real `UIViewController` (iOS) or `Fragment` (Android), instead of a common View; this is what allows transition animations to be native and the operating system to manage memory more efficiently

---

## Practical Exercise

Build an app with:
1. Login flow (conditional Stack Navigator)
2. Drawer with 2 options: "Feed" and "Settings"
3. Feed with Tab Navigator (Home / Favorites)
4. Each tab with its own Stack for internal navigation
5. Deep link `myapp://product/123` opening the details screen

---

## Study Materials

### Articles & Docs
- [Official Documentation — Drawer Navigator](https://reactnavigation.org/docs/drawer-navigator/)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Native Navigation Demystified: A 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)
- [Mastering Navigation in React Native — Djamware](https://www.djamware.com/post/682e9c920b36e34005ad0878/mastering-navigation-in-react-native-stack-tabs-and-more)

---

Next → **[State & APIs](./estado-e-apis-nativo)**