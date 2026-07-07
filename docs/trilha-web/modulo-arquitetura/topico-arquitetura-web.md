---
title: Architecture
---

# Topic — Architecture (Web Track)

### Topic Goal

By the end, you should be able to:

- Organize a RN app into feature-based folders.
- Separate:
  - Navigation (Stack/Tab/Drawer).
  - Global state (Zustand/Redux).
  - API layer (services).
  - Shared components.
- Document the architecture for the team (README / ARCHITECTURE.md).

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Arch_RN_Apps_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Suggested folder structure

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

### Domain hooks (parallel with React web)

```tsx

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

```

Usage in screen:

```tsx

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

```

---

### Practical exercise

1. Take an RN app with:
   - Login.
   - Feed.
   - Profile.
2. Reorganize the code into:
   - `app/` (navigation, global store).
   - `features/` (auth, feed, profile).
   - `shared/` (reusable components and hooks).
3. Create an `ARCHITECTURE.md` explaining:
   - Where screens live (`screens/`).
   - Where hooks live (`hooks/`).
   - Where API services live (`api/`).
   - Where native modules go (`native/`).

---

### Study Materials

- Blog: *Feature-based Folder Structure in React Native*
- Guide: *React Native Architecture for React Developers*
- Video: *Structuring React Native Apps — From Web to Mobile*

---

## Feedback

You've reached the end of the Web Track. We'd love to hear what you thought. Fill out the form in your preferred language:

[Give Feedback](https://forms.gle/75pKeXQxkSZogzxv5)