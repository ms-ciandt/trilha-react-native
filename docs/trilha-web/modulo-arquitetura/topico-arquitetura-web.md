---
title: Arquitetura
---

# Tópico — Arquitetura (Trilha Web)

### Objetivo do tópico

Ao final, o dev deve conseguir:

- Organizar um app RN em pastas por feature.
- Separar:
  - Navegação (Stack/Tab/Drawer).
  - Estado global (Zustand/Redux).
  - Camada de API (services).
  - Componentes compartilhados.
- Documentar a arquitetura para o time (README / ARCHITECTURE.md).

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Arch_RN_Apps_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Estrutura de pastas sugerida

```txt
src/
 app/
    navigation/
       RootNavigator.tsx
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
       screens/
       components/
       api/
    profile/
 shared/
    components/
    hooks/
    styles/
 native/
     modules/
     ui/
```

---

### Hooks de domínio (paralelo com React web)

```tsx
{% raw %}
// features/feed/hooks/useFeed.ts
import { useEffect, useState } from 'react';
import { fetchFeed } from '../api/feedApi';

export function useFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed()
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}
{% endraw %}
```

Uso em tela:

```tsx
{% raw %}
// features/feed/screens/FeedScreen.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFeed } from '../hooks/useFeed';
import { FeedList } from '../components/FeedList';

export function FeedScreen() {
  const { items, loading } = useFeed();

  if (loading) return <ActivityIndicator />;

  return (
    <View>
      <FeedList items={items} />
    </View>
  );
}
{% endraw %}
```

---

### Exercício prático

1. Pegue um app RN com:
   - Login.
   - Feed.
   - Perfil.
2. Reorganize código em:
   - `app/` (navegação, store global).
   - `features/` (auth, feed, profile).
   - `shared/` (componentes e hooks reutilizáveis).
3. Crie um `ARCHITECTURE.md` explicando:
   - Onde ficam telas (`screens/`).
   - Onde ficam hooks (`hooks/`).
   - Onde ficam serviços de API (`api/`).
   - Onde entram modules nativos (`native/`).

---

### Materiais de estudo

- Blog: *Feature-based Folder Structure in React Native*
- Guia: *React Native Architecture for React Developers*
- Vídeo: *Structuring React Native Apps — From Web to Mobile*
