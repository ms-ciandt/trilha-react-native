---
title: Listas & Navegação no React Native
---

# Listas & Navegação no React Native

> Você já construiu listas com `.map()` e navegou com React Router. Este módulo mostra as APIs de listas virtualizadas do RN e como o React Navigation gerencia transições de tela no mobile.

## Listas

### Quando Usar o Quê

| Situação | Use |
|-----------|-----|
| Lista estática curta (< ~20 itens) | `ScrollView` + `.map()` |
| Lista longa ou dinâmica | `FlatList` |
| Lista agrupada (como configurações do iOS) | `SectionList` |
| Layout em grade | `FlatList` com `numColumns` |

### `FlatList` — O Carro-chefe

```tsx
interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
}

function ProductList({ products }: { products: Product[] }) {
    const renderProduct = useCallback(({ item }: { item: Product }) => (
        <ProductCard product={item} />
    ), []);

    return (
        <FlatList
            data={products}
            keyExtractor={product => String(product.id)} // sempre converta — String() lida com ids numéricos e string
            renderItem={renderProduct}

            // Performance
            // ️ removeClippedSubviews tem bugs documentados de conteúdo faltando no Android
            // (áreas em branco ao rolar de volta). Meça antes de habilitar em produção.
            // Maior impacto: getItemLayout (itens de altura fixa) e windowSize (padrão 21, tente 5–10).
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            initialNumToRender={8}

            // Layout
            contentContainerStyle={{ padding: 16, gap: 8 }}
            showsVerticalScrollIndicator={false}

            // Estado vazio
            ListEmptyComponent={
                <View style={{ alignItems: 'center', padding: 32 }}>
                    <Text style={{ color: '#9ca3af' }}>Nenhum produto encontrado</Text>
                </View>
            }

            // Carregar mais
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isLoading ? <ActivityIndicator /> : null}

            // Atualizar
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
        />
    );
}
```

### Grade com `numColumns`

```tsx
// Como CSS grid com colunas iguais
<FlatList
    data={images}
    keyExtractor={img => String(img.id)}
    numColumns={3}
    columnWrapperStyle={{ gap: 2 }}
    contentContainerStyle={{ gap: 2 }}
    renderItem={({ item }) => (
        <Image
            source={{ uri: item.url }}
            style={{ flex: 1, aspectRatio: 1 }}  // células quadradas
        />
    )}
/>
```

### `SectionList` — Conteúdo Agrupado

```tsx
interface Section {
    title: string;
    data: Product[];
}

const sections: Section[] = [
    { title: 'Destaques', data: featuredProducts },
    { title: 'Novidades', data: newProducts },
    { title: 'Em Promoção', data: saleProducts },
];

<SectionList
    sections={sections}
    keyExtractor={item => String(item.id)}
    renderItem={({ item }) => <ProductCard product={item} />}
    renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
    )}
    stickySectionHeadersEnabled={true}  // fixo como headers de seção do iOS
/>
```

---

## Navegação com React Navigation

A navegação mobile é fundamentalmente diferente da web. Não existe barra de URL — a navegação é uma **pilha de telas empurradas para a memória**, com gestos nativos (swipe back no iOS, botão voltar do Android) para removê-las.

O **React Navigation** é a biblioteca padrão para isso. Instale em um projeto React Native CLI:

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

### Configurando o Navigator

```tsx
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';

type RootStackParamList = {
    Home: undefined;
    Profile: { userId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
```

### Navegando Entre Telas

```tsx
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function HomeScreen() {
    const navigation = useNavigation<HomeNavProp>();

    return (
        <View>
            {/* Empurrar uma nova tela */}
            <Pressable onPress={() => navigation.navigate('Profile', { userId: '123' })}>
                <Text>Ir para Perfil</Text>
            </Pressable>
            {/* Voltar */}
            <Pressable onPress={() => navigation.goBack()}>
                <Text>Voltar</Text>
            </Pressable>
            {/* Substituir tela atual (sem back) */}
            <Pressable onPress={() => navigation.replace('Home')}>
                <Text>Resetar</Text>
            </Pressable>
        </View>
    );
}
```

### Lendo Parâmetros de Rota

```tsx
import { useRoute, RouteProp } from '@react-navigation/native';

type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;

function ProfileScreen() {
    const route = useRoute<ProfileRouteProp>();
    const { userId } = route.params;

    return <Text>Usuário: {userId}</Text>;
}
```

### Navegação por Tabs

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// npm install @react-navigation/bottom-tabs

const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
```

---

## Roteamento Web vs Navegação Mobile

| Web (React Router / Next.js) | React Native (React Navigation) |
|------------------------------|---------------------------------|
| Baseado em URL, links compartilháveis | Deep links suportados, mas opcionais |
| Botão voltar do browser | Gesto voltar nativo (swipe esquerda no iOS) |
| `<Link to="...">` | `navigation.navigate('NomeDaTela')` |
| `useNavigate()` push/replace | `navigation.navigate()` / `navigation.replace()` |
| Query strings `?key=val` | Objeto `route.params` |
| Modal via rota | `presentation: 'modal'` no Stack.Screen |
| Página 404 | Tela catch-all no navigator |

---

> **Sobre o Expo Router**
>
> Se você usa o **Expo** (em vez do React Native CLI), o **Expo Router** oferece roteamento baseado em arquivos — mais próximo do App Router do Next.js em modelo mental. É uma alternativa válida, mas está vinculada ao toolchain do Expo. Pesquise separadamente em [docs.expo.dev/router/introduction/](https://docs.expo.dev/router/introduction/).

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| Início Rápido React Navigation | Oficial | [reactnavigation.org/docs/getting-started](https://reactnavigation.org/docs/getting-started) |
| React Navigation — Stack Navigator | Oficial | [reactnavigation.org/docs/native-stack-navigator](https://reactnavigation.org/docs/native-stack-navigator) |
| API FlatList | Oficial | [reactnative.dev/docs/flatlist](https://reactnative.dev/docs/flatlist) |
| API SectionList | Oficial | [reactnative.dev/docs/sectionlist](https://reactnative.dev/docs/sectionlist) |
| notJust.dev — Curso Completo (8h) | Vídeo | [youtube.com/@notjustdev](https://www.youtube.com/@notjustdev) |

---

Próximo → **[Navegação](./navegacao-web)**

---

 **Você concluiu a Trilha Web!**

Você agora tem os fundamentos para construir apps React Native reais. Próximos passos:
- Crie seu primeiro projeto Expo: `npx create-expo-app@latest MyApp`
- Experimente o [Expo Snack](https://snack.expo.dev) para experimentos rápidos
- Assista ao [curso gratuito de 8 horas do notJust.dev](https://www.youtube.com/@notjustdev) para um walkthrough completo de projeto
