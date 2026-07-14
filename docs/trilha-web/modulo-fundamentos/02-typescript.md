---
title: TypeScript for Web Developers in React Native
---

# TypeScript for Web Developers

## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_web/fund_02_typescript.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> If you've used TypeScript on the web, you're mostly ready. This module covers the RN-specific types and patterns you'll encounter.

## React Native–Specific Types

### Style Types

```typescript
import { ViewStyle, TextStyle, ImageStyle, StyleProp } from 'react-native';

// Specific style types for each component category
const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: '#fff',
};

const labelStyle: TextStyle = {
    fontSize: 16,
    fontWeight: 'bold',
};

const avatarStyle: ImageStyle = {
    width: 40,
    height: 40,
    borderRadius: 20,
};

// StyleProp<T> allows both a single style and an array of styles
interface ButtonProps {
    style?: StyleProp<ViewStyle>;       // accepts style or [style1, style2]
    labelStyle?: StyleProp<TextStyle>;
}
```

### Component Ref Types

```typescript
import { useRef } from 'react';
import { TextInput, ScrollView, FlatList } from 'react-native';

const inputRef = useRef<TextInput>(null);
const scrollRef = useRef<ScrollView>(null);
const listRef = useRef<FlatList<unknown>>(null); // replace unknown with your item type, e.g. FlatList<Product>

// Use the ref
inputRef.current?.focus();
scrollRef.current?.scrollTo({ y: 0, animated: true });
listRef.current?.scrollToIndex({ index: 0 });
```

### Event Types

```typescript
import {
    NativeSyntheticEvent,
    NativeScrollEvent,
    TextInputChangeEventData,
    GestureResponderEvent,
} from 'react-native';

// Scroll events
function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize } = event.nativeEvent;
    console.log('scrollY:', contentOffset.y);
}

// TextInput change
function handleChange(event: NativeSyntheticEvent<TextInputChangeEventData>) {
    console.log(event.nativeEvent.text);
}

// Press event
function handlePress(event: GestureResponderEvent) {
    console.log('pressed at:', event.nativeEvent.locationX, event.nativeEvent.locationY);
}
```

---

## Typing Navigation (React Navigation)

React Navigation uses a typed param list to make navigation type-safe:

```typescript
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, Button } from 'react-native';

// Define the param list for the entire stack
type RootStackParamList = {
    Home: undefined;                    // no params
    Profile: { userId: string };        // requires userId
    Settings: { tab?: 'account' | 'privacy' };  // optional param
};

// Typed navigation hook for the Profile screen
type ProfileNavProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;
type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
    const navigation = useNavigation<ProfileNavProp>();
    const route = useRoute<ProfileRouteProp>();

    // route.params.userId is typed as `string` — no casting needed
    return (
        <View>
            <Text>User ID: {route.params.userId}</Text>
            <Button title="Go Back" onPress={() => navigation.goBack()} />
            <Button title="Go Home" onPress={() => navigation.navigate('Home')} />
        </View>
    );
}
```

---

## Typing AsyncStorage & Async Operations

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserSession {
    userId: string;
    token: string;
    expiresAt: number;
}

async function saveSession(session: UserSession): Promise<void> {
    await AsyncStorage.setItem('session', JSON.stringify(session));
}

async function loadSession(): Promise<UserSession | null> {
    const raw = await AsyncStorage.getItem('session');
    if (!raw) return null;
    // ️ `as` is not runtime validation — a stale or schema-changed value passes
    // TypeScript but can silently corrupt app state. In production, validate with
    // Zod: `const result = UserSessionSchema.safeParse(JSON.parse(raw))`
    return JSON.parse(raw) as UserSession;
}
```

---

## Useful Patterns in RN TypeScript

### Typing Component Variants

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
}
```

### Discriminated Unions for API State

```typescript
type AsyncState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: string };

function useAsyncState<T>() {
    const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });
    // ...
    return state;
}
```

---

## Resources

| Resource | Type | Link |
|---|---|---|
| TypeScript Handbook | Official | [typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html) |
| React Native TypeScript | Official | [reactnative.dev/docs/typescript](https://reactnative.dev/docs/typescript) |
| Total TypeScript (free tutorials) | Community | [totaltypescript.com/tutorials](https://www.totaltypescript.com/tutorials) |

---

Next → **[Web vs React Native](./web-vs-rn)**