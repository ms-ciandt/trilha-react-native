---
title: Componentes Nativos para Desenvolvedores Web
---

# Componentes Nativos para Desenvolvedores Web

> Você conhece componentes React. Os componentes do RN funcionam do mesmo jeito — apenas nomes primitivos diferentes e alguns comportamentos específicos de mobile.

## A Troca Essencial

| Web | React Native | Notas |
|-----|--------------|-------|
| `<div>` | `<View>` | O contêiner para tudo |
| `<span>`, `<p>`, `<h1>`–`<h6>` | `<Text>` | TODO texto deve estar em `<Text>` |
| `<img>` | `<Image>` | `source={{ uri }}` para remoto, `require()` para local |
| `<input type="text">` | `<TextInput>` | `onChangeText` dá a string diretamente |
| `<button>` | `<Pressable>` + `<Text>` | Ou `<Button>` para um botão nativo simples |
| `<a>` | `<Pressable>` + `navigation.navigate()` | Sem `href` em elementos arbitrários; links são imperativos |
| `<ul>` + scroll infinito | `<FlatList>` | Virtualizado, lida com listas grandes |
| `<select>` | `<Picker>` community ou ActionSheet | Sem dropdown nativo |
| `<textarea>` | `<TextInput multiline />` | Mesmo componente, props diferentes |
| `<form>` | Nenhum | Agrupe `TextInput`s manualmente |
| `<video>` | `expo-video` | Player de vídeo da plataforma |
| `<input type="checkbox">` | `<Switch>` (toggle) ou lib community | |
| `<progress>` | `<ProgressBar>` (community) | |

---

## `<View>` — Pense em `<div>` mas Flexbox-First

```tsx
// div Web
<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div>Item 1</div>
    <div>Item 2</div>
</div>

// React Native View — flex column por padrão. gap, rowGap, columnGap todos suportados.
<View style={{ gap: 8 }}>
    <View><Text>Item 1</Text></View>
    <View><Text>Item 2</Text></View>
</View>
```

---

## `<Text>` — Todo Texto Vive Aqui

A maior mudança: você não pode renderizar texto fora de um componente `<Text>`.

```tsx
//  Texto fora de Text — CRASH
<View>
    Olá Mundo
</View>

// 
<View>
    <Text>Olá Mundo</Text>
</View>

// Estilos inline via Text aninhado (sem <strong>, <em>, <span>)
<Text style={{ fontSize: 16 }}>
    Isto é{' '}
    <Text style={{ fontWeight: 'bold' }}>negrito</Text>
    {' '}e isto é{' '}
    <Text style={{ fontStyle: 'italic', color: '#0064d2' }}>itálico azul</Text>
</Text>
```

---

## `<TextInput>` — O Elemento de Input

```tsx
// Web
<input
    type="text"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="Digite o email"
/>

// React Native — onChangeText dá a string diretamente (sem e.target.value)
<TextInput
    value={email}
    onChangeText={setEmail}          // string, não evento
    placeholder="Digite o email"
    keyboardType="email-address"
    autoCapitalize="none"
    autoCorrect={false}
/>
```

### Props Comuns do `TextInput`

```tsx
<TextInput
    // Conteúdo
    value={text}
    onChangeText={setText}
    defaultValue="inicial"          // não controlado (como defaultValue do input na web)
    placeholder="Texto placeholder"
    placeholderTextColor="#9ca3af"

    // Tipo de teclado
    keyboardType="default"         // "numeric" | "email-address" | "phone-pad" | "url"
    returnKeyType="next"           // "done" | "next" | "search" | "go"
    secureTextEntry={true}         // Campo de senha

    // Comportamento
    multiline={true}               // Similar a textarea
    numberOfLines={4}              // Dica de altura para multiline
    autoFocus={true}
    autoCapitalize="sentences"     // "none" | "words" | "sentences" | "characters"
    autoCorrect={false}

    // Eventos
    onSubmitEditing={handleSubmit} // Tecla return pressionada
    onFocus={handleFocus}
    onBlur={handleBlur}

    // Estilização
    style={styles.input}
/>
```

---

## `<Pressable>` — O Handler de Clique

Na web, quase qualquer elemento pode ter um `onClick`. No RN, você envolve coisas em `<Pressable>`:

```tsx
// Web — clique em qualquer coisa
<div onClick={handleClick}>Div clicável</div>
<span onClick={handleClick}>Span clicável</span>
<img src={...} onClick={handleClick} />

// React Native — envolva em Pressable
<Pressable onPress={handlePress}>
    <View style={styles.card}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <Text>Título do card</Text>
    </View>
</Pressable>

// Pressable com feedback visual (como :hover/:active no CSS)
<Pressable
    onPress={handlePress}
    style={({ pressed }) => ({
        ...styles.button,
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
    })}
>
    <Text style={styles.buttonText}>Pressione-me</Text>
</Pressable>
```

---

## `<FlatList>` — A Lista Virtualizada

Para listas longas, `FlatList` é essencial — renderiza apenas o que está visível na tela:

```tsx
// Web — renderiza todos os itens (ok para listas curtas)
{items.map(item => <ItemCard key={item.id} item={item} />)}

// React Native — FlatList para listas potencialmente longas
<FlatList
    data={items}
    keyExtractor={item => item.id}
    renderItem={({ item }) => <ItemCard item={item} />}

    // Layout em grade (equivalente ao CSS grid)
    numColumns={2}
    columnWrapperStyle={{ gap: 8 }}  // gap entre colunas
    contentContainerStyle={{ padding: 16, gap: 8 }} // gap entre linhas

    // Pull to refresh
    refreshing={isRefreshing}
    onRefresh={handleRefresh}

    // Scroll infinito
    onEndReached={loadMore}
    onEndReachedThreshold={0.3}
/>
```

---

## `<Switch>` — Toggle

```tsx
import { Switch } from 'react-native';

const [isEnabled, setIsEnabled] = useState(false);

<Switch
    value={isEnabled}
    onValueChange={setIsEnabled}
    trackColor={{ false: '#d1d5db', true: '#0064d2' }}
    thumbColor={isEnabled ? '#ffffff' : '#f4f3f4'}
/>
```

---

## Exercícios

1. **Converta este componente React web** para React Native:
   ```tsx
   function UserCard({ user }: { user: User }) {
       return (
           <div className="card" onClick={() => navigate(`/users/${user.id}`)}>
               <img src={user.avatar} alt="avatar" className="avatar" />
               <div className="info">
                   <h3>{user.name}</h3>
                   <p>{user.email}</p>
               </div>
           </div>
       );
   }
   ```

2. **Construa um input de busca** com um TextInput que debounce o input do usuário em 300ms antes de chamar uma função `search(query)`.

3. **Construa uma tela de configurações** com três toggle switches (Notificações Push, Modo Escuro, Analytics), cada um persistindo seu estado.

---

Próximo → **[Estilização & Flexbox para Devs Web](./estilos-flexbox)**
