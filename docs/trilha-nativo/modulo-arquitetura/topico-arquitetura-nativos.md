---
title: Architecture
---

# Architecture

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/trilha_nativo/arq_01_arquitetura.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Patterns You Already Know

MVVM and Clean Architecture translate directly to React Native. The vocabulary changes — `Activity` becomes a screen component, `ViewModel` becomes a hook backed by a store — but the separation of concerns is identical. If you've enforced a layered architecture in an Android or iOS codebase, the instincts carry over.

The main difference is that RN apps tend to organize by **feature** rather than by **layer**. Instead of a top-level `viewmodels/` folder sitting next to `repositories/`, each feature owns its own screens, hooks, and API modules. Shared infrastructure — navigation, global stores, config — lives in an `app/` layer that sits above the features.

---

## Mapping: MVVM/Clean → React Native

| Native concept | React Native | Note |
|---|---|---|
| View (Activity / ViewController) | Screen components | UI layer — renders, no logic |
| ViewModel | Hooks + stores (Zustand / Redux) | Presentation logic and state |
| Use Case / Interactor | Functions in a domain or services layer | Orchestrate business rules |
| Repository | API adapters / local storage adapters | Data access implementation |

---

## Suggested Project Structure

```
src/
  app/
    navigation/
      RootNavigator.tsx
      AppDrawer.tsx
      AppTabs.tsx
    store/
      authStore.ts
    config/
      env.ts
  features/
    auth/
      screens/
        LoginScreen.tsx
        RegisterScreen.tsx
      components/
      hooks/
      api/
    feed/
    profile/
  shared/
    components/
    hooks/
    styles/
  native/
    modules/
    ui/
```

- `app/` — infrastructure: navigation tree, global stores, environment config. Nothing here knows about individual features.
- `features/` — one folder per product domain. Each is self-contained: its own screens, hooks, API calls, and local components.
- `shared/` — genuinely reusable pieces that more than one feature needs. Keep the bar high; prefer duplication over premature abstraction.
- `native/` — the bridge boundary: your native modules and native UI components. Isolating them here makes the JS↔native surface explicit and easy to audit.

---

## Global State with Zustand

Zustand is a minimal state library — a store is just a function that returns state and actions. It avoids the boilerplate of Redux while remaining predictable enough for large teams.

```ts
// src/app/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: undefined,
  login: (token) => set({ isAuthenticated: true, token }),
  logout: () => set({ isAuthenticated: false, token: undefined }),
}));
```

Consuming it in a screen:

```tsx
// src/features/profile/screens/ProfileScreen.tsx
import React from 'react';
import { View, Button, Text } from 'react-native';
import { useAuthStore } from '../../../app/store/authStore';

export function ProfileScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  return (
    <View>
      <Text>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```

The selector `(s) => s.isAuthenticated` is important — it means the component only re-renders when `isAuthenticated` changes, not on every store update. This is the Zustand equivalent of a ViewModel exposing a `StateFlow` with `distinctUntilChanged`.

---

## Navigation as Infrastructure

Navigation belongs in `app/navigation`, not inside a feature. A feature that owns its own navigator quickly becomes impossible to reuse or reorganize — every entry point is buried inside a product module.

```tsx
// src/app/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { AppTabs } from './AppTabs';

const Drawer = createDrawerNavigator();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator>
        <Drawer.Screen name="Main" component={AppTabs} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
```

Features navigate by calling `navigation.navigate('ScreenName')` — they know screen names but not how the navigator is assembled. This is the same boundary you'd draw between a `Fragment` and the `Activity` that hosts it.

---

## Resources

| Resource | Type | Link |
|---|---|---|
| React Navigation | Official Docs | [reactnavigation.org](https://reactnavigation.org) |
| Zustand | Official Docs | [docs.pmnd.rs/zustand](https://docs.pmnd.rs/zustand/getting-started/introduction) |
| React Native Directory | Community | [reactnative.directory](https://reactnative.directory) |

---

## Feedback

You've reached the end of the Native Dev Trail. Fill out the form to share your thoughts:

[Give Feedback](https://forms.gle/75pKeXQxkSZogzxv5)
