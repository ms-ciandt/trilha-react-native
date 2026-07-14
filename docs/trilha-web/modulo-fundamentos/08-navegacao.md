---
id: navegacao-web
title: "Navigation"
sidebar_label: "Navigation"
sidebar_position: 8
---

# Navigation

---

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_web/fund_08_navegacao.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Topic Goal

By the end, you should be able to:
- Understand the fundamental differences between React Router and React Navigation
- Create Stack, Tab, and Drawer Navigators
- Nest navigators in an idiomatic way
- Implement a conditional authentication flow
- Navigate with typed parameters
- Configure deep linking (equivalent to web routes)

---

## Breaking the paradigm: React Router vs React Navigation

| Web concept | Mobile equivalent | Key difference |
|-------------|-------------------|----------------|
| URL (`/products/42`) | Route parameters (`route.params`) | No address bar exists |
| `<Link to="/home">` | `navigation.navigate('Home')` | Navigation is imperative |
| `history.push` / `history.back` | `navigation.push` / `navigation.goBack()` | Physical stack, not URL history |
| Active route in browser | Stack of mounted screens | Previous screens remain **mounted** in the Stack |
| No "physical back" | Hardware back (Android) + Swipe-back (iOS) | Handled automatically by Stack Navigator |
| `useParams()` | `route.params` | Explicit typing required |
| `<Routes>` at root | `NavigationContainer` at root | Single navigation control point |
| `<BrowserRouter>` | — | No equivalent — there is no DOM |

> **Key insight:** on mobile, stacked screens remain **mounted and alive** in memory. This affects performance and the hook lifecycle — `useEffect` with `[]` runs once per mount, not on every "visit".

---

## Installation

```bash
npm install @react-navigation/native react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated

npm install @react-navigation/stack
npm install @react-navigation/bottom-tabs
npm install @react-navigation/drawer

cd ios && pod install
```

> **Warning:** add `import 'react-native-gesture-handler'` as the **first line** of `index.js`.

---

## Stack Navigator (equivalent to navigation history)

The Stack Navigator works like a deck of cards: each new screen is placed on top, and going back removes the top screen. The critical difference from browser history is that previous screens **remain mounted in memory** — they are not destroyed or recreated as in an SPA. This has direct consequences: `useEffect` with `[]` does not re-run when you navigate back to an already-mounted screen.

The `NavigationContainer` is the central control point for navigation. There should be only one in the app, at the root, and it holds all navigation state in memory. Without it, no navigator works.

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Parameter typing (replaces URL params)
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
// Navigating (equivalent to navigate() from React Router)
navigation.navigate('ProductDetails', { productId: '42', productName: 'Sneakers' });

// Receiving parameters (equivalent to useParams())
const { productId, productName } = route.params;
```

---

## Tab Navigator (no direct equivalent in React Router)

In React Router there is no component equivalent to the Tab Navigator — tabs on mobile behave differently from browser tabs. On mobile, tabs are persistent and each one maintains its own independent navigation state. When you switch tabs and come back, the previous tab is exactly where you left it, including its internal stack history.

The `lazy: true` option is important for apps with many tabs: without it, all screens are rendered on initialization, even if the user never visits them.

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        lazy: true, // does not render unvisited tabs
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

## Drawer Navigator (side menu)

The Drawer Navigator implements the sliding side menu — the one that opens with a swipe from the left or by tapping the hamburger icon. In the web context, the closest equivalent would be a sidebar component, but on mobile the Drawer has native behavior expected by users: it responds to gestures, has a sliding animation, and closes when tapping outside the area.

Unlike the Stack and the Tab, the Drawer is more often used as the outer layer of the navigation hierarchy, wrapping the other navigators.

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

## Nesting: most common pattern (Drawer > Tab > Stack)

Navigators can be nested because each Navigator is simply a React component — any `Screen` can have another Navigator as its `component`. This pattern is the most common navigation structure in production apps.

The Drawer > Tab > Stack hierarchy follows the "breadth first, depth later" logic: the Drawer provides access to distinct sections of the app, the Tabs organize the main screens of each section, and the Stack manages in-depth navigation within each tab. Each level is independent — the stack of one tab does not interfere with the stack of another.

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

## Authentication flow (equivalent to protected routes)

In React Router, you would use `<PrivateRoute>`. In React Navigation, the pattern is different: instead of intercepting the route, you simply do not declare the authenticated screens when the user is not logged in.

The mechanism works because React Navigation monitors changes in the Screens tree. When `isAuthenticated` changes from `false` to `true`, the navigator notices that the set of declared screens has changed and automatically transitions to the new state. You do not need to call `navigate` anywhere — the authentication state directs navigation declaratively, just like React Router, but without `<PrivateRoute>`.

```tsx
// No wrappers — just conditional screen rendering
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


> When `isAuthenticated` changes, React Navigation automatically replaces the stack — no manual redirects needed.

---

## Deep Linking (equivalent to URL routes)

Deep linking is the mechanism that allows an external URL to open a specific screen in the app — equivalent to what a URL does in the browser. On mobile there are two contexts: **custom schemes** (`myapp://`) only work in installed apps, while **universal links** (`https://myapp.com`) allow the same link to open the app if installed, or the website in the browser if not.

The `linking` configuration object maps URLs to screens in the same way that URL routes are mapped to components in React Router. React Navigation intercepts links before the app initializes and navigates directly to the corresponding screen.

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

## Expo Router: file-based alternative (for those coming from Next.js)

Expo Router is a layer on top of React Navigation that adopts the file-based routing convention popularized by Next.js: the folder structure defines the routes, with no explicit configuration needed. Each file inside `app/` automatically becomes a route.

The convention of folders in parentheses `(tabs)` creates route groups without adding segments to the URL — the same concept as Route Groups in Next.js. Files with `[id]` define dynamic parameters.

If the team uses Expo and is familiar with Next.js/file-based routing:

```
app/
├── index.tsx          → route "/"
├── (tabs)/
│   ├── home.tsx       → /home
│   └── profile.tsx    → /profile
└── product/
    └── [id].tsx       → /product/:id
```

> Expo Router is built on top of React Navigation — learn React Navigation first to understand what happens "under the hood".

---

## Differences that catch web developers off guard

1. **Screens remain mounted** — `useEffect(() => {}, [])` does not run when you go back to the screen. Use `useFocusEffect` from React Navigation for that.
2. **No URL in the address bar** — debugging navigation is different; use React Navigation DevTools.
3. **Hardware back (Android)** — the Stack Navigator handles it automatically; customize with `BackHandler` when needed.
4. **No direct `history.replace`** — use `navigation.replace('Screen')` to replace without stacking.

```tsx
// Detect screen focus (equivalent to useEffect on route mount in Router)
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    fetchData(); // runs every time the screen receives focus
  }, [])
);
```

---

## Practical exercise

1. Recreate the navigation structure of an app you already know (e.g., Instagram) with Drawer + Tab + Stack
2. Implement an authentication flow with conditional protection
3. Configure deep linking to open a details screen directly
4. Use `useFocusEffect` to redo a search when returning to the screen

---

## Study Materials

### Articles & Docs
- [React Navigation 7 vs Expo Router: Complete Comparison Guide 2025 — Viewlytics](https://viewlytics.ai/blog/react-navigation-7-vs-expo-router)
- [Expo Router vs React Navigation: Which to Use in 2026? — DEV Community](https://dev.to/satyasootar/expo-router-vs-react-navigation-which-one-should-you-use-in-2026-40mm)
- [Deep Links and Authentication in React Navigation 7 — Callstack Blog](https://www.callstack.com/blog/deep-links-with-authentication-in-react-navigation)
- [React Navigation Official Docs — Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [Mastering Expo Router — Protected Routes, Deep Linking & Theming](https://www.welcomedeveloper.com/posts/navigation-expo-router-part-3/)
- [React Native Navigation Made Easy: 2025 Guide — CoderCrafter](https://codercrafter.in/blogs/react-native/react-native-navigation-made-easy-a-2025-guide-to-stack-tab-drawer)
- [Your Complete Guide to React Native Navigation in 2025 — Peanut Square](https://www.peanutsquare.com/your-complete-guide-to-react-native-navigation-in-2025/)

---

Next → **[Global State & APIs](./estado-e-apis-web)**