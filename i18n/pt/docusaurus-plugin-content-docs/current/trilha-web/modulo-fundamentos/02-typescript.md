---
title: TypeScript para Desenvolvedores Web no React Native
---

# TypeScript para Desenvolvedores Web

> Se você já usou TypeScript na web, você está praticamente pronto. Este módulo cobre os tipos e padrões específicos do RN que você vai encontrar.

## Tipos Específicos do React Native

### Tipos de Estilo

```typescript
import { ViewStyle, TextStyle, ImageStyle, StyleProp } from 'react-native';

// Tipos de estilo específicos para cada categoria de componente
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

// StyleProp<T> aceita tanto um estilo único quanto um array de estilos
interface ButtonProps {
    style?: StyleProp<ViewStyle>;       // aceita style ou [style1, style2]
    labelStyle?: StyleProp<TextStyle>;
}
```

### Tipos de Ref de Componente

```typescript
import { useRef } from 'react';
import { TextInput, ScrollView, FlatList } from 'react-native';

const inputRef = useRef<TextInput>(null);
const scrollRef = useRef<ScrollView>(null);
const listRef = useRef<FlatList<unknown>>(null); // substitua unknown pelo seu tipo de item, ex. FlatList<Product>

// Use a ref
inputRef.current?.focus();
scrollRef.current?.scrollTo({ y: 0, animated: true });
listRef.current?.scrollToIndex({ index: 0 });
```

### Tipos de Eventos

```typescript
import {
    NativeSyntheticEvent,
    NativeScrollEvent,
    TextInputChangeEventData,
    GestureResponderEvent,
} from 'react-native';

// Eventos de scroll
function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize } = event.nativeEvent;
    console.log('scrollY:', contentOffset.y);
}

// Mudança no TextInput
function handleChange(event: NativeSyntheticEvent<TextInputChangeEventData>) {
    console.log(event.nativeEvent.text);
}

// Evento de pressão
function handlePress(event: GestureResponderEvent) {
    console.log('pressionado em:', event.nativeEvent.locationX, event.nativeEvent.locationY);
}
```

---

## Tipando a Navegação (React Navigation)

O React Navigation usa uma lista de parâmetros tipada para tornar a navegação type-safe:

```typescript
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, Button } from 'react-native';

// Define a lista de parâmetros para toda a stack
type RootStackParamList = {
    Home: undefined;                    // sem parâmetros
    Profile: { userId: string };        // requer userId
    Settings: { tab?: 'account' | 'privacy' };  // parâmetro opcional
};

// Hook de navegação tipado para a tela Profile
type ProfileNavProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;
type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
    const navigation = useNavigation<ProfileNavProp>();
    const route = useRoute<ProfileRouteProp>();

    // route.params.userId é tipado como `string` — sem casting necessário
    return (
        <View>
            <Text>ID do Usuário: {route.params.userId}</Text>
            <Button title="Voltar" onPress={() => navigation.goBack()} />
            <Button title="Ir para Home" onPress={() => navigation.navigate('Home')} />
        </View>
    );
}
```

---

## Tipando AsyncStorage & Operações Assíncronas

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
    // ️ `as` não é validação em runtime — um valor obsoleto ou com schema alterado passa
    // no TypeScript mas pode corromper silenciosamente o estado do app. Em produção, valide com
    // Zod: `const result = UserSessionSchema.safeParse(JSON.parse(raw))`
    return JSON.parse(raw) as UserSession;
}
```

---

## Padrões Úteis no TypeScript do RN

### Tipando Variantes de Componente

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

### Discriminated Unions para Estado de API

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

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| TypeScript Handbook | Oficial | [typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html) |
| React Native TypeScript | Oficial | [reactnative.dev/docs/typescript](https://reactnative.dev/docs/typescript) |
| Total TypeScript (tutoriais gratuitos) | Community | [totaltypescript.com/tutorials](https://www.totaltypescript.com/tutorials) |

---

Próximo → **[Web vs React Native](./web-vs-rn)**
