# Tópico — Arquitetura (Trilha 1: Devs Nativos)

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Definir uma arquitetura base para apps RN médios/grandes
- Organizar pastas por feature e por camada
- Separar claramente:
  - Navegação
  - Estado global
  - Serviços de API
  - Módulos nativos
- Mapear conceitos como MVVM/Clean para RN (View, ViewModel, Use Cases, Repositories)

---


### Video Demonstration

You can watch a demonstration of the architecture in action here:

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Architecting_React_Native_for_Scale.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---
## Mapeamento: MVVM/Clean → React Native

| Conceito Nativo       | React Native                              | Observação |
|-----------------------|-------------------------------------------|------------|
| View (Activity/VC)    | Componentes de Screen RN                  | Camada de UI |
| ViewModel             | Hooks + stores (Zustand/Redux)            | Lógica de apresentação, estado |
| Use Case / Interactor | Funções em camada de domínio/services     | Orquestram regras de negócio |
| Repository            | Adapters para APIs remotas / storage local| Implementação de dados |

---

## Estrutura de projeto sugerida

{% raw %}
```txt
src/
├── app/
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AppDrawer.tsx
│   │   └── AppTabs.tsx
│   ├── store/
│   │   └── authStore.ts
│   └── config/
│       └── env.ts
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   ├── feed/
│   └── profile/
├── shared/
│   ├── components/
│   ├── hooks/
│   └── styles/
└── native/
    ├── modules/
    └── ui/
```
{% endraw %}

- `app/`: infraestrutura (navegação, stores globais, config).
- `features/`: módulos de negócio (auth, feed, profile, etc.).
- `shared/`: componentes e hooks reutilizáveis entre features.
- `native/`: código de integração nativa (modules, UI components).

---

## Estado global (exemplo com Zustand)

{% raw %}
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
{% endraw %}

Uso em uma tela:

{% raw %}
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
      <Text>Autenticado: {isAuthenticated ? 'Sim' : 'Não'}</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
}
```
{% endraw %}

---

## Navegação como infraestrutura

A navegação (Stack/Tab/Drawer) deve ficar em `app/navigation`, fora das features específicas, para evitar acoplamento excessivo.

{% raw %}
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
{% endraw %}

---

## Exercício prático

1. Pegue o app RN criado nos tópicos anteriores (login + drawer + tabs).
2. Reorganize o projeto para seguir a estrutura proposta (`app/`, `features/`, `shared/`, `native/`).
3. Crie ao menos:
   - Um hook de domínio (ex.: `useFeed()` em `features/feed/hooks`).
   - Um módulo de API (`features/feed/api/feedApi.ts`).
4. Documente a arquitetura em um arquivo `ARCHITECTURE.md` na pasta `src/` explicando como cada camada se relaciona.

---

## Materiais de estudo

### Artigos
- *React Native Architecture for Scale* — guia para estruturar apps grandes.
- *Feature-based Folder Structure in React Native* — foco em modularização por feature.
- *Clean Architecture in Mobile Apps — Mapping to React Native* — mapeia MVVM/Clean para RN.

### Vídeos

#### Architecting Large React Native Apps (40 min)

<details>
<summary>Descrição do conteúdo</summary>

O vídeo discute diferentes abordagens de arquitetura para apps RN, comparando estruturas por tipo (screens/components) com estruturas por feature. Mostra como trazer conceitos de MVVM/Clean para o mundo RN, incluindo separação de camadas, orquestração de casos de uso e organização da navegação em um nível de infraestrutura.

Tópicos:
- Feature folders vs camadas horizontais.
- Organizando navegação e estado global.
- Mapeando View/ViewModel/UseCase/Repository para componentes, hooks e services em RN.

</details>
