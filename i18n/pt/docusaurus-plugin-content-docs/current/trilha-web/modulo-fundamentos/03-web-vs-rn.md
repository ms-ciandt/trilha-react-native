---
title: Web vs React Native — Diferenças Principais
---

# Web vs React Native — Diferenças Principais

> A mudança de modelo mental mais importante para desenvolvedores React web migrando para o React Native.

## A Diferença Fundamental

| | React (Web) | React Native |
|---|---|---|
| Renderiza para | DOM — elementos HTML | Views nativas — UIKit / Android Views |
| Estilização | Arquivos CSS, CSS-in-JS, Tailwind | Objetos de estilo JavaScript |
| Layout | CSS Flexbox + Grid + Block + Inline | Apenas Flexbox (coluna por padrão) |
| Roteamento | Baseado em URL (React Router, Next.js) | Navegação Stack/Tab |
| Fontes | Qualquer fonte web, Google Fonts CDN | Fontes do sistema + fontes customizadas carregadas |
| Scroll | O browser gerencia | `ScrollView` ou `FlatList` |
| Animações | Animações CSS / Web Animations API | Reanimated, Animated API |
| Deploy | Hospedagem estática, CDN | App Store, Play Store |

---

## Componentes: HTML → React Native

Esta é a mudança mais imediata. Cada elemento HTML tem um equivalente no RN:

```tsx
// React Web
function WebCard() {
    return (
        <div className="card">
            <img src={avatarUrl} alt="Avatar" className="avatar" />
            <div className="content">
                <h2 className="name">{user.name}</h2>
                <p className="bio">{user.bio}</p>
                <button onClick={handleFollow}>Seguir</button>
            </div>
        </div>
    );
}
```

```tsx
// React Native — mesma estrutura, componentes nativos
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

function NativeCard() {
    return (
        <View style={styles.card}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={styles.content}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.bio}>{user.bio}</Text>
                <Pressable onPress={handleFollow} style={styles.button}>
                    <Text style={styles.buttonText}>Seguir</Text>
                </Pressable>
            </View>
        </View>
    );
}
```

A estrutura da árvore é idêntica — apenas os primitivos mudam.

---

## Estilização: CSS → StyleSheet

```css
/* styles.css */
.button {
    background-color: #0064d2;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: white;
    cursor: pointer;
}
```

```tsx
<button className="button">Clique aqui</button>
```

```tsx
// React Native (StyleSheet)
const styles = StyleSheet.create({
    button: {
        backgroundColor: '#0064d2',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        // Sem fontSize/fontWeight em View — esses vão em Text
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
});

<Pressable style={styles.button}>
    <Text style={styles.buttonText}>Clique aqui</Text>
</Pressable>
```

Diferença chave: **propriedades de estilo de texto ficam em `<Text>`, não no contêiner `<View>`**. Não existe herança de CSS no RN — `color` em um `View` pai não se aplica aos elementos `Text` filhos.

---

## Sem Herança de CSS

Isso pega todo desenvolvedor web:

```tsx
// Web — cor herda pela árvore
<div style={{ color: 'red' }}>
    <span>Isso é vermelho</span>  {/* herda do pai */}
</div>

// React Native — SEM herança (exceto Text aninhado em Text)
<View style={{ color: 'red' }}>   {/* ISSO NÃO FAZ NADA */}
    <Text>Isso NÃO é vermelho</Text>   {/* precisa definir color no Text diretamente */}
</View>

// A única exceção: Text aninhado herda do Text pai
<Text style={{ color: 'red' }}>
    Isso é vermelho <Text style={{ fontWeight: 'bold' }}>e isso é negrito vermelho</Text>
</Text>
```

---

## Sem `className`, Sem Arquivos CSS

Você não pode usar arquivos CSS brutos, CSS Modules ou a versão web do `styled-components`. No entanto, duas alternativas populares são totalmente suportadas:

- **NativeWind** — classes utilitárias Tailwind compiladas para StyleSheet (abordado no Módulo 6)
- **styled-components/native** — estilos via template literal com `import styled from 'styled-components/native'`

A abordagem oficial ainda é `StyleSheet.create`. As três opções existem em apps de produção. Neste curso:

```tsx
//  Não funciona no React Native
<View className="flex-1 bg-white p-4" />        // Sem Tailwind
<View style="background-color: white; padding: 16px" /> // Sem strings CSS

//  Funciona no React Native
<View style={{ flex: 1, backgroundColor: 'white', padding: 16 }} />
<View style={styles.container} />

// NativeWind — Tailwind para React Native (usa as mesmas classes utilitárias)
// FUNCIONA se você instalar o NativeWind:
<View className="flex-1 bg-white p-4" />  // com NativeWind instalado
```

---

## Navegação: URLs → Stacks

```tsx
// Web (React Router / Next.js)
import { Link, useNavigate } from 'react-router-dom';

function NavExample() {
    const navigate = useNavigate();
    return (
        <>
            <Link to="/profile">Ir para Perfil</Link>
            <button onClick={() => navigate('/home')}>Home</button>
            <button onClick={() => navigate(-1)}>Voltar</button>
        </>
    );
}
```

```tsx
// React Native com React Navigation (baseado em stack)
import { useNavigation } from '@react-navigation/native';

function NavExample() {
    const navigation = useNavigation();
    return (
        <>
            <Pressable onPress={() => navigation.navigate('Profile')}><Text>Ir para Perfil</Text></Pressable>
            <Pressable onPress={() => navigation.navigate('Home')}><Text>Home</Text></Pressable>
            <Pressable onPress={() => navigation.goBack()}><Text>Voltar</Text></Pressable>
        </>
    );
}
```

O React Navigation usa um **modelo de stack** — telas são empurradas e removidas como uma pilha de chamadas, correspondendo ao comportamento de navegação nativo do iOS/Android. Se você preferir roteamento baseado em arquivos (mais próximo do Next.js), o **Expo Router** oferece esse modelo mental mas está vinculado ao toolchain do Expo — pesquise separadamente.

---

## Eventos: onClick → onPress

```tsx
// Web
<button onClick={handleClick}>Clique</button>
<input onChange={handleChange} />
<form onSubmit={handleSubmit}>

// React Native
<Pressable onPress={handlePress}>  // onClick → onPress
<TextInput onChangeText={setText} /> // onChange → onChangeText (dá a string diretamente)
// Sem elementos form — apenas agrupe os inputs manualmente
```

---

## Listas: map() → FlatList

```tsx
// Web — renderizando uma lista com .map()
{users.map(user => (
    <div key={user.id} className="user-card">
        <span>{user.name}</span>
    </div>
))}
```

```tsx
// React Native — para listas curtas, .map() dentro de ScrollView está ok
<ScrollView>
    {users.map(user => (
        <View key={user.id} style={styles.userCard}>
            <Text>{user.name}</Text>
        </View>
    ))}
</ScrollView>

// Para listas longas — use FlatList (virtualizada, como uma lista virtual do React web)
<FlatList
    data={users}
    keyExtractor={user => user.id}
    renderItem={({ item }) => (
        <View style={styles.userCard}>
            <Text>{item.name}</Text>
        </View>
    )}
/>
```

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| Intro ao RN para Devs React Web | Docs Oficiais | [reactnative.dev/docs/intro-react](https://reactnative.dev/docs/intro-react) |
| React Navigation | Oficial | [reactnavigation.org/docs/getting-started](https://reactnavigation.org/docs/getting-started) |
| NativeWind (Tailwind para RN) | Community | [nativewind.dev](https://www.nativewind.dev/) |

---

Próximo → **[Sem DOM, Sem CSS — Estilização em Profundidade](./sem-dom-sem-css)**
