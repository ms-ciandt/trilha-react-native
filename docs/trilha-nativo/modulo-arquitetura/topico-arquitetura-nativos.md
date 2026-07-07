---
title: Architecture
---

# Topic — Architecture (Track 1: Native Devs)

## Topic Goal

By the end, you should be able to:
- Define a base architecture for medium/large RN apps
- Organize folders by feature and by layer
- Clearly separate:
  - Navigation
  - Global state
  - API services
  - Native modules
- Map concepts like MVVM/Clean to RN (View, ViewModel, Use Cases, Repositories)


---

### Video Demonstration

You can watch a demonstration of the architecture in action here:

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Architecting_React_Native_for_Scale.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Mapping: MVVM/Clean → React Native

| Native Concept        | React Native                              | Note |
|-----------------------|-------------------------------------------|------|
| View (Activity/VC)    | RN Screen Components                      | UI layer |
| ViewModel             | Hooks + stores (Zustand/Redux)            | Presentation logic, state |
| Use Case / Interactor | Functions in domain/services layer        | Orchestrate business rules |
| Repository            | Adapters for remote APIs / local storage  | Data implementation |

---

## Suggested project structure

```txt
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

- `app/`: infrastructure (navigation, global stores, config).
- `features/`: business modules (auth, feed, profile, etc.).
- `shared/`: reusable components and hooks across features.
- `native/`: native integration code (modules, UI components).

---

## Global state (example with Zustand)

```tsx
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

Usage in a screen:

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
}
```

---

## Navigation as infrastructure

Navigation (Stack/Tab/Drawer) should live in `app/navigation`, outside specific features, to avoid excessive coupling.

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
}
```

---

## Practical exercise

1. Take the RN app created in previous topics (login + drawer + tabs).
2. Reorganize the project to follow the proposed structure (`app/`, `features/`, `shared/`, `native/`).
3. Create at least:
   - A domain hook (e.g.: `useFeed()` in `features/feed/hooks`).
   - An API module (`features/feed/api/feedApi.ts`).
4. Document the architecture in an `ARCHITECTURE.md` file in the `src/` folder explaining how each layer relates to the others.

---

## Study Materials

### Articles
- *React Native Architecture for Scale* — guide to structuring large apps.
- *Feature-based Folder Structure in React Native* — focus on modularization by feature.
- *Clean Architecture in Mobile Apps — Mapping to React Native* — maps MVVM/Clean to RN.

---

## Feedback

You've reached the end of the Native Track. We'd love to hear what you thought. Fill out the form in your preferred language:

[Give Feedback](https://forms.gle/75pKeXQxkSZogzxv5)