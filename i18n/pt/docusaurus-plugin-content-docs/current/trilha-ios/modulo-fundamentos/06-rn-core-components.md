The source file (`06-rn-core-components.md`) doesn't exist yet in either location. The task description provides the content summary. Since the source file described has iOS-specific content (UIKit/SwiftUI mapping) distinct from the general trilha-nativo version I just read, I need to produce the PT-BR translation of the iOS-specific content as described. Based on the task description's detailed breakdown of the file structure, I'll produce the translation.

---
title: RN Core Components — Mapeamento UIKit e SwiftUI
---

# RN Core Components — Mapeamento UIKit e SwiftUI

> O React Native vem com um conjunto de componentes nativos que mapeiam diretamente para views nativas da plataforma. Nao existe HTML aqui — cada componente renderiza UI nativa de verdade.

## Mapeamento Completo de Componentes

| UIKit | SwiftUI | React Native |
|-------|---------|--------------|
| `UILabel` | `Text` | `<Text>` |
| `UIImageView` | `Image` | `<Image>` |
| `UIButton` | `Button` | `<Button>` / `<Pressable>` / `<TouchableOpacity>` |
| `UIScrollView` | `ScrollView` | `<ScrollView>` |
| `UITableView` | `List` | `<FlatList>` |
| `UICollectionView` | `LazyVGrid` / `LazyHGrid` | `<FlatList numColumns={N}>` |
| `UIStackView` (vertical) | `VStack` | `<View style={{ flexDirection: 'column' }}>` |
| `UIStackView` (horizontal) | `HStack` | `<View style={{ flexDirection: 'row' }}>` |
| `UITextField` | `TextField` | `<TextInput>` |
| `UISwitch` | `Toggle` | `<Switch>` |
| `UIActivityIndicatorView` / `UIProgressView` | `ProgressView` | `<ActivityIndicator>` |
| `UIView` com `safeAreaInsets` | `safeAreaInset` / `.ignoresSafeArea` | `<SafeAreaView>` |
| `UIApplication.setStatusBarStyle` | `.statusBar` modifier | `<StatusBar>` |

---

## `<Text>` — Equivalente ao UILabel

No UIKit, `UILabel` exibe texto estático. No SwiftUI, o componente se chama `Text`. No React Native, o equivalente e `<Text>`:

```tsx
import { Text } from 'react-native';

// UIKit: label.text = "Ola, mundo"
// SwiftUI: Text("Ola, mundo")
<Text style={{ fontSize: 16, color: '#333' }}>Ola, mundo</Text>
```

Propriedades principais:

| Prop | Equivalente UIKit/SwiftUI | Descricao |
|------|--------------------------|-----------|
| `numberOfLines` | `label.numberOfLines` / `.lineLimit()` | Limita o numero de linhas exibidas |
| `ellipsizeMode` | `label.lineBreakMode` / `.truncationMode()` | Onde truncar o texto |
| `selectable` | `label.isUserInteractionEnabled` | Permite selecao do texto |
| `onPress` | `UITapGestureRecognizer` | Texto clicavel |

```tsx
<Text
    style={{ fontSize: 18, fontWeight: 'bold' }}
    numberOfLines={2}
    ellipsizeMode="tail"
    selectable={true}
    onPress={() => console.log('texto pressionado')}
>
    Este e um texto longo que sera truncado apos duas linhas quando exceder o limite definido.
</Text>

{/* Texto aninhado — equivalente a NSAttributedString ou Text inline no SwiftUI */}
<Text>
    Texto normal <Text style={{ fontWeight: 'bold' }}>parte em negrito</Text> normal novamente
</Text>
```

---

## `<Image>` — Equivalente ao UIImageView

No UIKit, `UIImageView` exibe imagens locais e remotas. No React Native, use `<Image>`:

```tsx
import { Image } from 'react-native';

// Imagem remota — equivalente a carregar com URLSession + UIImageView
<Image
    source={{ uri: 'https://example.com/foto.jpg' }}
    style={{ width: 200, height: 200, borderRadius: 100 }}
    resizeMode="cover"  // "cover" | "contain" | "stretch" | "center"
/>

// Imagem local — equivalente a UIImage(named:) com assets do projeto
<Image
    source={require('./assets/logo.png')}
    style={{ width: 100, height: 40 }}
/>
```

| `resizeMode` | Equivalente UIKit | Comportamento |
|--------------|-------------------|---------------|
| `"cover"` | `.scaleAspectFill` | Preenche o frame, pode cortar |
| `"contain"` | `.scaleAspectFit` | Cabe no frame, pode ter espacos |
| `"stretch"` | `.scaleToFill` | Distorce para preencher |
| `"center"` | `.center` | Centraliza sem redimensionar |

:::tip Use expo-image para producao
Para melhor performance (cache, transicoes, placeholders blur hash), use `expo-image`:
```tsx
import { Image } from 'expo-image';
<Image source="https://..." style={{ width: 200, height: 200 }} contentFit="cover" />
```
:::

---

## `<Button>`, `<Pressable>` e `<TouchableOpacity>` — Equivalente ao UIButton

No UIKit, `UIButton` e o componente de botao padrao. No React Native, existem tres opcoes:

```tsx
import { Button, Pressable, TouchableOpacity, Text } from 'react-native';

// Button — simples, sem customizacao visual
<Button title="Salvar" onPress={() => {}} color="#007AFF" />

// TouchableOpacity — reduce a opacidade ao pressionar (comportamento familiar do iOS)
<TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
    <Text>Pressione aqui</Text>
</TouchableOpacity>

// Pressable — API moderna, mais flexivel
<Pressable
    onPress={() => console.log('pressionado')}
    onLongPress={() => console.log('pressao longa')}
    style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
    ]}
>
    {({ pressed }) => (
        <Text style={pressed ? styles.textPressed : styles.text}>
            Pressione-me
        </Text>
    )}
</Pressable>
```

### hitSlop — Expandindo a area de toque

No UIKit, `UIButton.contentEdgeInsets` expande a area clicavel. No React Native, use `hitSlop`:

```tsx
// UIKit: button.contentEdgeInsets = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
<Pressable
    onPress={() => {}}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
    <Text>Botao pequeno, area de toque grande</Text>
</Pressable>
```

Use `Pressable` para todo codigo novo. `TouchableOpacity` continua funcionando mas e considerado legado. `Button` e util apenas para prototipagem rapida.

---

## `<ScrollView>` — Equivalente ao UIScrollView

`UIScrollView` e o componente de rolagem base do UIKit. O equivalente no React Native e `<ScrollView>`:

```tsx
import { ScrollView } from 'react-native';

function DetalhesProduto() {
    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}              // comportamento de bounce do iOS
            contentContainerStyle={{ padding: 16 }}
        >
            {/* conteudo que excede a tela */}
        </ScrollView>
    );
}
```

`ScrollView` renderiza todos os filhos imediatamente. Use-o para conteudo de tamanho fixo e pequeno (formularios, telas de detalhe). Para listas longas e dinamicas, use `FlatList`.

---

## `<FlatList>` — Equivalente ao UITableView e UICollectionView

### FlatList vs UITableView — reutilizacao de celulas

No UIKit, `UITableView` reutiliza celulas com o padrao `register`/`dequeueReusableCell`. O React Native faz isso automaticamente com `FlatList`:

```tsx
// UIKit:
// tableView.register(PostCell.self, forCellReuseIdentifier: "PostCell")
// let cell = tableView.dequeueReusableCell(withIdentifier: "PostCell", for: indexPath) as! PostCell

// React Native:
import { FlatList } from 'react-native';

interface Post { id: string; title: string; body: string; }

function FeedPosts({ posts }: { posts: Post[] }) {
    return (
        <FlatList
            data={posts}
            keyExtractor={post => post.id}
            renderItem={({ item }) => <PostCard post={item} />}

            // Props de performance
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}

            // Pull-to-refresh — equivalente a UIRefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}

            // Carregar mais ao rolar — equivalente a scrollViewDidScroll
            onEndReached={carregarMais}
            onEndReachedThreshold={0.5}

            // Estado vazio
            ListEmptyComponent={<FeedVazio />}

            // Header / Footer
            ListHeaderComponent={<HeaderFeed />}
            ListFooterComponent={carregandoMais ? <ActivityIndicator /> : null}
        />
    );
}
```

### Otimizacao com getItemLayout

Se todos os itens tiverem altura fixa, use `getItemLayout` para evitar medicoes dinamicas — equivalente a implementar `tableView(_:heightForRowAt:)` com valor constante:

```tsx
<FlatList
    data={posts}
    renderItem={({ item }) => <PostCard post={item} />}
    getItemLayout={(data, index) => ({
        length: 80,    // altura fixa de cada item
        offset: 80 * index,
        index,
    })}
/>
```

### numColumns — equivalente ao UICollectionView

Para grids estilo `UICollectionView`, use a prop `numColumns`:

```tsx
// UIKit: UICollectionViewFlowLayout com 3 colunas
// React Native:
<FlatList
    data={fotos}
    numColumns={3}
    keyExtractor={foto => foto.id}
    renderItem={({ item }) => (
        <Image
            source={{ uri: item.url }}
            style={{ width: '33.33%', aspectRatio: 1 }}
        />
    )}
/>
```

---

## `<ScrollView>` vs `<FlatList>`

| | `ScrollView` | `FlatList` |
|---|---|---|
| Renderiza todos os filhos | Sim (imediatamente) | Nao (lazy/virtualizado) |
| Bom para | Conteudo curto, formularios, telas de detalhe | Listas longas e dinamicas |
| Performance com 1000+ itens | Ruim | Boa |
| Pull-to-refresh | Via `RefreshControl` | Prop `refreshing` embutida |
| Equivalente iOS | `UIScrollView` | `UITableView` / `UICollectionView` |

---

## `<TextInput>` — Equivalente ao UITextField

No UIKit, `UITextField` e `UITextView` sao os campos de entrada de texto. No React Native, ambos sao cobertos por `<TextInput>`:

```tsx
import { useState } from 'react';
import { TextInput, View } from 'react-native';

function FormLogin() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');

    return (
        <View>
            <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
            />
            <TextInput
                value={senha}
                onChangeText={setSenha}
                placeholder="Senha"
                secureTextEntry={true}      // equivalente a isSecureTextEntry
                returnKeyType="done"
                onSubmitEditing={() => login()}
            />
        </View>
    );
}
```

| Prop | Equivalente UIKit | Descricao |
|------|-------------------|-----------|
| `keyboardType` | `keyboardType` | Tipo de teclado exibido |
| `secureTextEntry` | `isSecureTextEntry` | Campo de senha |
| `autoCapitalize` | `autocapitalizationType` | Capitalizacao automatica |
| `returnKeyType` | `returnKeyType` | Rotulo da tecla return |
| `onSubmitEditing` | `textFieldShouldReturn` | Chamado ao pressionar return |
| `multiline` | usa `UITextView` | Campo de multiplas linhas |

---

## `<Switch>` — Equivalente ao UISwitch e Toggle

No UIKit, `UISwitch`. No SwiftUI, `Toggle`. No React Native, `<Switch>`:

```tsx
import { Switch } from 'react-native';
import { useState } from 'react';

function ConfiguracaoNotificacoes() {
    const [ativado, setAtivado] = useState(false);

    return (
        <Switch
            value={ativado}
            onValueChange={setAtivado}
            trackColor={{ false: '#767577', true: '#34C759' }} // verde padrao iOS
            thumbColor="#fff"
            ios_backgroundColor="#3e3e3e"
        />
    );
}
```

---

## `<ActivityIndicator>` — Equivalente ao UIActivityIndicatorView

No UIKit, `UIActivityIndicatorView`. No SwiftUI, `ProgressView`. No React Native, `<ActivityIndicator>`:

```tsx
import { ActivityIndicator } from 'react-native';

<ActivityIndicator
    size="large"           // "small" | "large" | number
    color="#007AFF"        // azul padrao iOS
    animating={carregando} // mostrar/ocultar sem desmontar
/>
```

---

## `<SafeAreaView>` — Lidando com Notch e Home Indicator

No UIKit, voce usa `safeAreaInsets` ou `safeAreaLayoutGuide` para respeitar o notch do iPhone e o home indicator. No React Native, use `<SafeAreaView>`:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

function Tela() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            {/* Conteudo protegido do notch e do home indicator */}
        </SafeAreaView>
    );
}
```

:::tip Use react-native-safe-area-context
O `SafeAreaView` nativo do React Native funciona apenas no iOS. Use o pacote community `react-native-safe-area-context` para comportamento cross-platform consistente.
:::

---

## `<StatusBar>` — Controlando a Barra de Status

No UIKit, voce usa `UIApplication.shared.setStatusBarStyle` ou o `preferredStatusBarStyle` do view controller. No React Native, use o componente `<StatusBar>`:

```tsx
import { StatusBar } from 'react-native';

function MinhaApp() {
    return (
        <>
            <StatusBar
                barStyle="dark-content"   // "default" | "light-content" | "dark-content"
                backgroundColor="#fff"   // apenas Android
            />
            {/* restante da UI */}
        </>
    );
}
```

---

## `<KeyboardAvoidingView>` — Evitar que o Teclado Cubra Inputs

No UIKit, voce observava `keyboardWillShowNotification` e ajustava constraints ou `contentInset` manualmente. No SwiftUI, o teclado e evitado automaticamente em muitos casos. No React Native, use `KeyboardAvoidingView`:

```tsx
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

function TelaLogin() {
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

A prop `behavior` difere por plataforma:

| Plataforma | `behavior` | O que faz |
|------------|------------|-----------|
| iOS | `'padding'` | Adiciona padding abaixo do conteudo para empurra-lo para cima |
| Android | `'height'` | Reduz a altura da view para caber acima do teclado |

`keyboardShouldPersistTaps="handled"` no `ScrollView` garante que clicar em um botao enquanto o teclado esta aberto acione o `onPress` do botao em vez de apenas fechar o teclado.

:::tip
Se `KeyboardAvoidingView` ainda nao for suficiente, `react-native-keyboard-controller` oferece mais controle com animacoes suaves vinculadas ao frame do teclado — comportamento muito mais proximo do que o SwiftUI oferece automaticamente.
:::

---

## Exercicios

1. **Construa um `CartaoUsuario`** que exibe uma imagem de avatar remota, um nome e um badge opcional de "verificado". Use `<Image>`, `<Text>` e `<View>`. Adicione um wrapper `<Pressable>` com `hitSlop` que registra o nome do usuario quando pressionado.

2. **Construa uma tela de configuracoes** com tres campos `TextInput` (nome de usuario, email, bio). Conecte todos ao estado. Adicione um botao "Salvar" que fica desabilitado ate que os tres campos estejam preenchidos.

3. **Construa uma lista paginada** usando `FlatList` com `onEndReached`. Comece com 10 itens. Cada vez que o usuario rolar ate o fim, adicione mais 10. Mostre um `ActivityIndicator` no `ListFooterComponent` enquanto carrega. Adicione `getItemLayout` se todos os itens tiverem altura fixa.

---

## Recursos

| Recurso | Tipo | Link |
|---------|------|------|
| RN Core Components | Docs Oficiais | [reactnative.dev/docs/components-and-apis](https://reactnative.dev/docs/components-and-apis) |
| expo-image | Docs Expo | [docs.expo.dev/versions/latest/sdk/image/](https://docs.expo.dev/versions/latest/sdk/image/) |
| react-native-safe-area-context | Community | [github.com/AppAndFlow/react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context) |
| react-native-keyboard-controller | Community | [github.com/kirillzyusko/react-native-keyboard-controller](https://github.com/kirillzyusko/react-native-keyboard-controller) |
