---
title: "Módulo 3: Componentes Core do React Native"
---

# Módulo 3: Componentes Core do React Native

> O React Native vem com um conjunto de componentes nativos que mapeiam diretamente para views da plataforma. Não existe HTML aqui — cada componente renderiza UI nativa de verdade.

## O Mapeamento Fundamental

| HTML Web | Android | iOS | React Native |
|----------|---------|-----|--------------|
| `<div>` | `ViewGroup` / `FrameLayout` | `UIView` | `<View>` |
| `<p>`, `<span>`, `<h1>` | `TextView` | `UILabel` | `<Text>` |
| `<img>` | `ImageView` | `UIImageView` | `<Image>` |
| `<input>` | `EditText` | `UITextField` | `<TextInput>` |
| `<button>` | `Button` | `UIButton` | `<Button>` / `<Pressable>` |
| `<ul>` + `<li>` | `RecyclerView` | `UITableView` | `<FlatList>` / `<SectionList>` |
| `<ScrollView>` | `ScrollView` | `UIScrollView` | `<ScrollView>` |
| `<select>` | `Spinner` | `UIPickerView` | `<Picker>` (community) |

---

## `<View>` — O Contêiner Universal

`View` é o bloco de construção fundamental. Renderiza como `ViewGroup` no Android e `UIView` no iOS:

```tsx
import { View, StyleSheet } from 'react-native';

function Card() {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                {/* conteúdo do header */}
            </View>
            <View style={styles.body}>
                {/* conteúdo do body */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        elevation: 3, // sombra Android
    },
    header: { padding: 16 },
    body: { padding: 16, paddingTop: 0 },
});
```

---

## `<Text>` — Todo Texto Deve Ser Envolvido

Ao contrário do HTML web onde texto pode flutuar livremente, **no React Native todo texto deve estar dentro de `<Text>`**:

```tsx
// ERRO: texto fora de Text
<View>
    Olá Mundo  {/* Isso vai crashar */}
</View>

// CORRETO
<View>
    <Text>Olá Mundo</Text>
</View>
```

Funcionalidades de Text:
```tsx
<Text
    style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}
    numberOfLines={2}           // Trunca após 2 linhas (como ellipsize no Android)
    ellipsizeMode="tail"        // "tail" | "head" | "middle" | "clip"
    selectable={true}           // Permite seleção de texto
    onPress={() => {}}          // Texto pode ser clicável
>
    Este é um texto longo que será truncado após duas linhas.
</Text>

{/* Text aninhado — estilização inline */}
<Text>
    Texto normal <Text style={{ fontWeight: 'bold' }}>parte em negrito</Text> normal novamente
</Text>
```

---

## `<Image>` — Imagens Locais e Remotas

```tsx
import { Image } from 'react-native';

// Imagem remota
<Image
    source={{ uri: 'https://example.com/photo.jpg' }}
    style={{ width: 200, height: 200, borderRadius: 100 }}
    resizeMode="cover"  // "cover" | "contain" | "stretch" | "center"
/>

// Imagem local (require resolve em tempo de build — como recursos drawable)
<Image
    source={require('./assets/logo.png')}
    style={{ width: 100, height: 40 }}
/>
```

:::tip Use Expo Image para produção
Para melhor performance (cache, transições, placeholders blur hash), use `expo-image`:
```tsx
import { Image } from 'expo-image';
<Image source="https://..." style={{ width: 200, height: 200 }} contentFit="cover" />
```
:::

---

## `<TextInput>` — Entrada do Usuário

Como `EditText` (Android) ou `UITextField`/`UITextView` (iOS):

```tsx
import { useState } from 'react';
import { TextInput, View } from 'react-native';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <View>
            <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"     // Mostra teclado de email
                autoCapitalize="none"
                autoComplete="email"
            />
            <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Senha"
                secureTextEntry={true}            // Campo de senha
                returnKeyType="done"              // Label da tecla return do teclado
                onSubmitEditing={() => login()}   // Chamado quando a tecla return é pressionada
            />
        </View>
    );
}
```

---

## `<Pressable>` — Áreas Clicáveis

Prefira `Pressable` em vez de `TouchableOpacity` para código novo (é a API moderna):

```tsx
import { Pressable } from 'react-native';

<Pressable
    onPress={() => console.log('pressionado')}
    onLongPress={() => console.log('pressão longa')}
    style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed, // feedback visual
    ]}
>
    {({ pressed }) => (
        <Text style={pressed ? styles.textPressed : styles.text}>
            Pressione-me
        </Text>
    )}
</Pressable>
```

---

## `<FlatList>` — Listas Virtualizadas

O equivalente do `RecyclerView` (Android) ou `UITableView` (iOS) — renderiza apenas os itens visíveis:

```tsx
import { FlatList } from 'react-native';

interface Post { id: string; title: string; body: string; }

function PostFeed({ posts }: { posts: Post[] }) {
    return (
        <FlatList
            data={posts}
            keyExtractor={post => post.id}
            renderItem={({ item }) => <PostCard post={item} />}

            // Props de performance
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}

            // Pull-to-refresh (como SwipeRefreshLayout no Android)
            refreshing={isRefreshing}
            onRefresh={handleRefresh}

            // Carrega mais ao rolar
            onEndReached={loadMore}
            onEndReachedThreshold={0.5} // aciona quando 50% do fim

            // Estado vazio
            ListEmptyComponent={<EmptyFeed />}

            // Header / Footer
            ListHeaderComponent={<FeedHeader />}
            ListFooterComponent={isLoadingMore ? <ActivityIndicator /> : null}
        />
    );
}
```

---

## `<ScrollView>` vs `<FlatList>`

| | `ScrollView` | `FlatList` |
|---|---|---|
| Renderiza todos os filhos | Sim (imediatamente) | Não (lazy/virtualizado) |
| Bom para | Conteúdo curto, formulários, telas de detalhe | Listas longas e dinâmicas |
| Performance com 1000+ itens | Ruim | Boa |
| Pull-to-refresh | Via `RefreshControl` | Prop `refreshing` embutida |

---

## `<SafeAreaView>` — Lidando com Notches e Home Indicators

Essencial para notches do iPhone e barras de navegação do Android:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

function Screen() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            {/* Conteúdo está protegido do notch/home indicator */}
        </SafeAreaView>
    );
}
```

:::tip Use react-native-safe-area-context
O `SafeAreaView` nativo do React Native funciona apenas no iOS. Use o pacote community `react-native-safe-area-context` para comportamento cross-platform consistente.
:::

---

## `<Modal>` — Overlays

```tsx
import { Modal } from 'react-native';

function ConfirmDialog({ visible, onConfirm, onCancel }: Props) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"    // "none" | "slide" | "fade"
            onRequestClose={onCancel} // Botão voltar do Android
        >
            <View style={styles.backdrop}>
                <View style={styles.dialog}>
                    <Text>Tem certeza?</Text>
                    <Button title="Sim" onPress={onConfirm} />
                    <Button title="Não" onPress={onCancel} />
                </View>
            </View>
        </Modal>
    );
}
```

---

## `<KeyboardAvoidingView>` — Evitar que o Teclado Cubra Inputs

Um dos problemas mais comuns no primeiro dia com RN: o teclado sobe e cobre um campo de texto. `KeyboardAvoidingView` desloca o layout para manter os inputs visíveis.

```tsx
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

function LoginScreen() {
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView keyboardShouldPersistTaps="handled">
                <TextInput placeholder="Email" keyboardType="email-address" />
                <TextInput placeholder="Senha" secureTextEntry />
                <Button title="Entrar" onPress={handleLogin} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
```

A prop `behavior` difere por plataforma — este é um dos exemplos mais claros da realidade cross-platform do RN:

| Plataforma | `behavior` | O que faz |
|----------|-----------|--------------|
| iOS | `'padding'` | Adiciona padding abaixo do conteúdo para empurrá-lo para cima |
| Android | `'height'` | Reduz a altura da view para caber acima do teclado |

`keyboardShouldPersistTaps="handled"` no `ScrollView` garante que clicar em um botão enquanto o teclado está aberto acione o `onPress` do botão em vez de apenas fechar o teclado.

:::tip
Se `KeyboardAvoidingView` ainda não for suficiente, `react-native-keyboard-controller` oferece mais controle com animações suaves vinculadas ao frame do teclado.
:::

---

## `<ActivityIndicator>` — Spinner de Carregamento

```tsx
<ActivityIndicator
    size="large"          // "small" | "large" | number
    color="#0064d2"
    animating={isLoading}  // mostrar/ocultar sem desmontar
/>
```

---

## Exercícios

1. **Construa um `UserCard`** que exibe uma imagem de avatar remota, um nome e um badge opcional de "verificado". Use `<Image>`, `<Text>` e `<View>`. Adicione um wrapper `<Pressable>` que registra o nome do usuário quando pressionado.

2. **Construa uma tela de configurações** com três campos `TextInput` (nome de usuário, email, bio). Conecte todos ao estado. Adicione um botão "Salvar" que fica desabilitado até que os três campos estejam preenchidos.

3. **Construa uma lista paginada** usando `FlatList` com `onEndReached`. Comece com 10 itens. Cada vez que o usuário rolar até o fim, adicione mais 10. Mostre um `ActivityIndicator` no `ListFooterComponent` enquanto carrega.

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| Componentes Core RN | Docs Oficiais | [reactnative.dev/docs/components-and-apis](https://reactnative.dev/docs/components-and-apis) |
| expo-image | Docs Expo | [docs.expo.dev/versions/latest/sdk/image/](https://docs.expo.dev/versions/latest/sdk/image/) |
| react-native-safe-area-context | Community | [github.com/AppAndFlow/react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context) |

---

Próximo → **[Layout & Flexbox](./layout-and-flexbox)**
