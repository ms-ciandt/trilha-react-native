---
title: "React Native Core Components"
sidebar_label: "Core Components"
sidebar_position: 3
---

## Video Overview

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/fund_03_rn_core_components.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/fund_03_rn_core_components.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

## Video Overview

> Vídeo para este tópico em breve.

## Aqui Não Existe XML

No Android você escreve XML de layout e o infla. No React Native não existe XML, não existe `LayoutInflater`, não existe `R.layout.*`. Cada elemento de UI é um componente JavaScript que compila para a view nativa da plataforma.

Quando você escreve `<View>` no React Native, o Fabric (o novo renderer) cria um `android.view.View` real no lado Android — você não está renderizando para uma WebView. Os componentes são nativos, a bridge não existe mais, e o JSI conecta o JS diretamente à camada nativa.

---

## O Mapeamento Fundamental

| View / Widget Android      | Componente React Native | Observações |
|----------------------------|-------------------------|-------------|
| `View`                     | `View`                  | Container genérico, como um `FrameLayout` |
| `TextView`                 | `Text`                  | **Todo texto deve estar dentro de `<Text>`** |
| `ImageView`                | `Image`                 | Imagens locais e remotas |
| `EditText`                 | `TextInput`             | Linha única e multilinha |
| `Button` / `ImageButton`   | `Pressable`             | Nova API — substitui `TouchableOpacity` |
| `RecyclerView`             | `FlatList`              | Lista virtualizada |
| `ScrollView`               | `ScrollView`            | Scroll não virtualizado |
| `BottomSheetDialog`        | `Modal`                 | Overlay/modal |
| `AlertDialog`              | `Alert` (API)           | Alerta nativo do sistema operacional |
| `Switch`                   | `Switch`                | Toggle |
| `ActivityIndicator`        | `ActivityIndicator`     | Spinner de carregamento |
| `ViewPager2`               | `FlatList` horizontal   | `horizontal={true}` + `pagingEnabled` |
| `ConstraintLayout`         | `View` + Flexbox        | Flexbox cuida de todo o layout |
| `LinearLayout` vertical    | `View` (padrão)         | Direção padrão do flex é coluna |
| `LinearLayout` horizontal  | `View` + `flexDirection: 'row'` | |

---

## View — O Container

Toda UI do React Native é uma árvore de componentes `View`. Uma `View` é uma área retangular com layout Flexbox, tratamento de toque e suporte a acessibilidade.

```tsx
import { View } from 'react-native';

function Card() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
      <View style={{ height: 1, backgroundColor: '#eee' }} />
    </View>
  );
}
```

> **Regra**: `View` não pode conter strings brutas. `<View>Hello</View>` lança um erro. Texto deve estar dentro de `<Text>`.

---

## Text — A Única Forma de Renderizar Texto

```tsx
import { Text, StyleSheet } from 'react-native';

function Article() {
  return (
    <>
      <Text style={styles.title}>Breaking News</Text>
      <Text style={styles.body} numberOfLines={3} ellipsizeMode="tail">
        Long article body that will be truncated after 3 lines...
      </Text>
      {/* Text aninhado — herda o estilo do pai */}
      <Text style={styles.body}>
        Regular text with <Text style={{ fontWeight: 'bold' }}>bold</Text> inline.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  body:  { fontSize: 16, lineHeight: 24, color: '#555' },
});
```

### Props principais

| Prop              | Tipo                                      | Comportamento no Android |
|-------------------|-------------------------------------------|--------------------------|
| `numberOfLines`   | `number`                                  | Reticências após N linhas |
| `ellipsizeMode`   | `'head' \| 'middle' \| 'tail' \| 'clip'` | Onde truncar |
| `selectable`      | `boolean`                                 | Pressão longa para selecionar |
| `onPress`         | `() => void`                              | Texto clicável |
| `adjustsFontSizeToFit` | `boolean`                          | Reduz a fonte para caber no container |

---

## Image — Local e Remota

```tsx
import { Image, StyleSheet } from 'react-native';

function Avatar() {
  return (
    <>
      {/* Asset local — empacotado no build */}
      <Image source={require('./assets/avatar.png')} style={styles.avatar} />

      {/* URL remota — requer width/height */}
      <Image
        source={{ uri: 'https://example.com/photo.jpg' }}
        style={styles.avatar}
        resizeMode="cover"
      />
    </>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32 },
});
```

### Valores de resizeMode

| `resizeMode`  | Equivalente no Android         |
|---------------|-------------------------------|
| `cover`       | `centerCrop`                   |
| `contain`     | `fitCenter`                    |
| `stretch`     | `fitXY`                        |
| `center`      | `center`                       |

> Para apps em produção, use [`expo-image`](https://docs.expo.dev/versions/latest/sdk/image/) ou [`react-native-fast-image`](https://github.com/DylanVann/react-native-fast-image) — eles adicionam cache, carregamento progressivo e melhor gerenciamento de memória do que o `Image` nativo.

---

## TextInput — EditText

```tsx
import { TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';

function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <TextInput
      style={styles.input}
      value={query}
      onChangeText={setQuery}           // chamado a cada tecla digitada
      onSubmitEditing={() => search(query)}
      placeholder="Search..."
      placeholderTextColor="#999"
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="default"            // 'email-address' | 'numeric' | 'phone-pad' | ...
      returnKeyType="search"            // muda o label da tecla return do teclado
      clearButtonMode="while-editing"   // apenas iOS — Android usa um ícone separado de limpar
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});
```

> O TextInput do React Native é **controlado** por padrão (como o `EditText` do Android com um `TextWatcher`). A prop `value` determina o texto exibido; `onChangeText` fornece o novo valor para armazenar no estado.

---

## Pressable — O Manipulador de Toque

`Pressable` é a forma moderna de lidar com todas as interações de toque. Substitui os antigos `TouchableOpacity`, `TouchableHighlight` e `TouchableNativeFeedback`.

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => console.log('long press')}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,   // estilo muda enquanto o dedo está pressionado
      ]}
    >
      {({ pressed }) => (
        <Text style={[styles.label, pressed && { opacity: 0.7 }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button:  { backgroundColor: '#6750A4', borderRadius: 8, padding: 14, alignItems: 'center' },
  pressed: { backgroundColor: '#5a4494' },
  label:   { color: '#fff', fontWeight: '600', fontSize: 16 },
});
```

### Hit slop — expandindo a área de toque

```tsx
<Pressable
  onPress={handlePress}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <Text>Tap me</Text>
</Pressable>
```

Isso é equivalente ao `TouchDelegate` do Android — expande a área tocável sem alterar o tamanho visual.

---

## FlatList — O RecyclerView

`FlatList` virtualiza listas longas: apenas os itens próximos ao viewport são montados. Ele desmonta itens à medida que saem do intervalo visível, exatamente como o `RecyclerView`.

```tsx
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface User {
  id: string;
  name: string;
  email: string;
}

function UserList({ users }: { users: User[] }) {
  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
      ListHeaderComponent={<Text style={styles.header}>All Users</Text>}
      onEndReached={() => loadMore()}    // paginação
      onEndReachedThreshold={0.5}        // disparar 50% antes do fim
      refreshing={isRefreshing}
      onRefresh={handleRefresh}          // pull-to-refresh
    />
  );
}
```

### Modelo mental RecyclerView vs FlatList

| Conceito do RecyclerView    | Equivalente no FlatList          |
|-----------------------------|----------------------------------|
| `Adapter.getItemCount`      | `data.length`                    |
| `Adapter.onBindViewHolder`  | `renderItem`                     |
| `DiffUtil.ItemCallback`     | `keyExtractor` + reconciliador React |
| `ItemDecoration`            | `ItemSeparatorComponent`         |
| `addOnScrollListener`       | prop `onScroll`                  |
| Reciclagem de views         | Automática — mesmo mecanismo     |

---

## ScrollView — Não Virtualizado

Use `ScrollView` quando souber que o conteúdo é curto e finito. Para listas dinâmicas, use sempre `FlatList`.

```tsx
import { ScrollView } from 'react-native';

function SettingsScreen() {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"  // importante: toques funcionam com o teclado aberto
    >
      <SettingsSection title="Account" />
      <SettingsSection title="Notifications" />
      <SettingsSection title="Privacy" />
    </ScrollView>
  );
}
```

---

## Modal — Bottom Sheet / Dialog

```tsx
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

function ConfirmDialog({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}   // botão voltar do Android
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Delete item?</Text>
          <Text style={styles.body}>This action cannot be undone.</Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={{ color: '#fff' }}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

---

## ActivityIndicator — Spinner

```tsx
import { ActivityIndicator, View } from 'react-native';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#6750A4" />
    </View>
  );
}
```

---

## SafeAreaView — Lidando com Notches e Barras de Navegação

O Android tem barras do sistema (barra de status, barra de navegação) e celulares modernos têm notches ou câmeras perfuradas. Use `SafeAreaView` do `react-native-safe-area-context` (não o built-in) para tratar os insets corretamente:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {/* o conteúdo fica afastado da UI do sistema */}
    </SafeAreaView>
  );
}
```

---

## Exemplo Interativo

[![Open in Expo Snack](https://img.shields.io/badge/Open%20in-Expo%20Snack-000020?logo=expo)](https://snack.expo.dev/@react-native-community/core-components-and-apis)

---

## Materiais de Estudo

### Documentacao Oficial

- [React Native — Core Components and APIs](https://reactnative.dev/docs/components-and-apis)
- [React Native — View](https://reactnative.dev/docs/view)
- [React Native — Text](https://reactnative.dev/docs/text)
- [React Native — Image](https://reactnative.dev/docs/image)
- [React Native — TextInput](https://reactnative.dev/docs/textinput)
- [React Native — FlatList](https://reactnative.dev/docs/flatlist)
- [React Native — Pressable](https://reactnative.dev/docs/pressable)
- [React Native — Modal](https://reactnative.dev/docs/modal)

### Videos

- [Expo — Core Components Overview](https://www.youtube.com/watch?v=0-S5a0eXPoc)

---

## Proximo Passo

Voce conhece os blocos de construcao. A seguir: como estiliza-los — `StyleSheet`, estilos especificos por plataforma e a API completa de estilizacao.

➡ [Styling in React Native](./04-styling-stylesheet)
