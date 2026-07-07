---
title: "Módulo 1: Adaptando JS/TS para Mobile"
---

# Módulo 1: Adaptando JavaScript/TypeScript para Mobile

> Você já conhece JavaScript e React. Este módulo é sobre a mudança de modelo mental de construir para browsers para construir para dispositivos móveis.

## A Diferença de Ambiente

Quando você escreve React para a web, seu código roda em um browser com:
- O DOM (`document`, `window`, `navigator`)
- CSS completo (cada propriedade, cada seletor)
- Requisições de rede via `fetch` ou `XMLHttpRequest`
- `localStorage`, `sessionStorage`, cookies
- Uma barra de URL e roteamento via mudanças de URL

Quando você escreve React Native, seu JS roda no **Hermes** (um motor JS mobile) com:
- **Sem DOM** — sem `document`, sem `window`, sem `innerHTML`
- **Sem CSS** — apenas um subconjunto de propriedades de layout/estilo como objetos JS
- `fetch` ainda funciona (polyfillado)
- **Sem `localStorage`** — use `AsyncStorage` ou `MMKV`
- **Sem roteamento por URL** — a navegação é baseada em stack/tab

---

## O Que Ainda Funciona (Inalterado)

A maior parte do seu conhecimento JavaScript transfere diretamente:

```typescript
//  Tudo isso funciona igual no React Native

// JS Core
const arr = [1, 2, 3].map(n => n * 2);
const { name, age } = user;
const message = `Olá, ${name}!`;

// Async/await
const data = await fetch('https://api.example.com/data');
const json = await data.json();

// Promises
Promise.all([fetchUsers(), fetchPosts()]).then(([users, posts]) => { ... });

// Métodos de array
users.filter(u => u.active).sort((a, b) => a.name.localeCompare(b.name));

// Tipos TypeScript
interface User { id: string; name: string; }
type Status = 'loading' | 'success' | 'error';

// Todos os hooks React
useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer
```

---

## O Que Muda

### Storage

```typescript
// Web
localStorage.setItem('token', value);
const token = localStorage.getItem('token');

// React Native — AsyncStorage (assíncrono!)
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('token', value);
const token = await AsyncStorage.getItem('token');

// React Native — MMKV (síncrono, muito mais rápido, recomendado)
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV();
storage.set('token', value);
const token = storage.getString('token');
```

### Detecção de Plataforma

```typescript
// Web
if (navigator.userAgent.includes('Mobile')) { ... }

// React Native
import { Platform } from 'react-native';
if (Platform.OS === 'ios') { ... }
if (Platform.OS === 'android') { ... }
Platform.select({ ios: '#f2f2f7', android: '#ffffff', default: '#fff' });
```

### Linking & Deep Links

```typescript
// Web
window.open('https://example.com');
window.location.href = 'mailto:hello@example.com';

// React Native
import { Linking } from 'react-native';
await Linking.openURL('https://example.com');
await Linking.openURL('mailto:hello@example.com');
await Linking.openURL('tel:+15555555');
```

### Clipboard

```typescript
// Web
navigator.clipboard.writeText('hello');

// React Native
import * as Clipboard from 'expo-clipboard';
await Clipboard.setStringAsync('hello');
```

---

## Conceitos Mobile Específicos que Você Vai Precisar

### 1. Safe Areas
Telas mobile têm notches, dynamic islands e home indicators. Conteúdo pode ficar escondido atrás deles.

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

// Sempre envolva suas telas em SafeAreaView
function HomeScreen() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            {/* Seu conteúdo está seguro aqui */}
        </SafeAreaView>
    );
}
```

### 2. Keyboard Avoidance
O teclado sobe pela parte de baixo e pode cobrir campos de input.

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

function LoginForm() {
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            style={{ flex: 1 }}
            // behavior="height" no Android comprime o contêiner e frequentemente
            // esconde inputs. Use "padding" em ambas as plataformas, ou configure
            // softwareKeyboardLayoutMode: "resize" no app.json e pule o KAV no Android.
        >
            <TextInput placeholder="Email" />
            <TextInput placeholder="Senha" secureTextEntry />
        </KeyboardAvoidingView>
    );
}
```

### 3. Gesture Handling
Apps mobile respondem a swipes, pinches e long presses — não apenas taps:

```tsx
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

function SwipeCard() {
    const translateX = useSharedValue(0);
    const [dismissed, setDismissed] = useState(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const swipe = Gesture.Pan()
        .onUpdate(event => {
            translateX.value = event.translationX;
        })
        .onEnd(() => {
            translateX.value = withSpring(0);
            // ️ Callbacks de gesture rodam na UI thread.
            // Para chamar setters de estado React, navegação ou qualquer função JS,
            // você deve envolver com runOnJS — caso contrário ocorre um crash grave:
            // "Calling into JavaScript from native is only allowed via JSI bridge"
            runOnJS(setDismissed)(true);
        });

    return (
        <GestureDetector gesture={swipe}>
            <Animated.View style={animatedStyle}>
                <Text>Deslize-me</Text>
            </Animated.View>
        </GestureDetector>
    );
}
```

### 4. Status Bar
A barra fina no topo da tela com horário e bateria:

```tsx
import { StatusBar } from 'expo-status-bar';

function App() {
    return (
        <>
            <StatusBar style="dark" />
            {/* ... */}
        </>
    );
}
```

---

## A Configuração do TypeScript

Projetos Expo vêm com TypeScript pré-configurado. Pontos importantes:

```json
// tsconfig.json — o que o Expo gera
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

O `expo/tsconfig.base` já configura aliases de caminho, resolução de módulos para React Native e configurações de JSX. Você não precisa configurar isso manualmente.

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| Expo Docs — Get Started | Oficial | [docs.expo.dev/get-started/introduction/](https://docs.expo.dev/get-started/introduction/) |
| Configuração de Ambiente RN | Docs Oficiais | [reactnative.dev/docs/environment-setup](https://reactnative.dev/docs/environment-setup) |
| react-native-safe-area-context | Community | [github.com/AppAndFlow/react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context) |

---

Próximo → **[TypeScript para Devs Web](./typescript)**
