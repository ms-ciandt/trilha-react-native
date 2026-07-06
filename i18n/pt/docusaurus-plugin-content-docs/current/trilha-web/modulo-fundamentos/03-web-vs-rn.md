---
title: Web vs React Native — Key Differences
---

# Web vs React Native — Key Differences

> The most important mental model shift for React web developers moving to React Native.

## The Fundamental Difference

| | React (Web) | React Native |
|---|---|---|
| Renders to | DOM — HTML elements | Native views — UIKit / Android Views |
| Styling | CSS files, CSS-in-JS, Tailwind | JavaScript style objects |
| Layout | CSS Flexbox + Grid + Block + Inline | Flexbox only (column-first) |
| Routing | URL-based (React Router, Next.js) | Stack/Tab navigation |
| Fonts | Any web font, Google Fonts CDN | System fonts + loaded custom fonts |
| Scrolling | Browser handles it | `ScrollView` or `FlatList` |
| Animations | CSS animations / Web Animations API | Reanimated, Animated API |
| Deployment | Static hosting, CDN | App Store, Play Store |

---

## Components: HTML → React Native

This is the most immediate change. Every HTML element has an RN equivalent:

```tsx
// Web React
function WebCard() {
    return (
        <div className="card">
            <img src={avatarUrl} alt="Avatar" className="avatar" />
            <div className="content">
                <h2 className="name">{user.name}</h2>
                <p className="bio">{user.bio}</p>
                <button onClick={handleFollow}>Follow</button>
            </div>
        </div>
    );
}
```

```tsx
// React Native — same structure, native components
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

function NativeCard() {
    return (
        <View style={styles.card}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={styles.content}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.bio}>{user.bio}</Text>
                <Pressable onPress={handleFollow} style={styles.button}>
                    <Text style={styles.buttonText}>Follow</Text>
                </Pressable>
            </View>
        </View>
    );
}
```

The tree structure is identical — only the primitives change.

---

## Styling: CSS → StyleSheet

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
<button className="button">Click me</button>
```

```tsx
// React Native (StyleSheet)
const styles = StyleSheet.create({
    button: {
        backgroundColor: '#0064d2',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        // No fontSize/fontWeight on View — those go on Text
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
});

<Pressable style={styles.button}>
    <Text style={styles.buttonText}>Click me</Text>
</Pressable>
```

Key difference: **Text styling properties live on `<Text>`, not on container `<View>`**. There is no CSS inheritance in RN — `color` on a parent `View` does not apply to child `Text` elements.

---

## No CSS Inheritance

This trips up every web developer:

```tsx
// Web — color inherits through the tree
<div style={{ color: 'red' }}>
    <span>This is red</span>  {/* inherits from parent */}
</div>

// React Native — NO inheritance (except nested Text inside Text)
<View style={{ color: 'red' }}>   {/* THIS DOES NOTHING */}
    <Text>This is NOT red</Text>   {/* must set color on Text directly */}
</View>

// The only exception: nested Text inherits from parent Text
<Text style={{ color: 'red' }}>
    This is red <Text style={{ fontWeight: 'bold' }}>and this is bold red</Text>
</Text>
```

---

## No `className`, No CSS Files

You cannot use raw CSS files, CSS Modules, or the web version of `styled-components`. However, two popular alternatives are fully supported:

- **NativeWind** — Tailwind utility classes compiled to StyleSheet (covered in Module 6)
- **styled-components/native** — template literal styles via `import styled from 'styled-components/native'`

The official approach is still `StyleSheet.create`. All three options exist in production apps. In this course:

```tsx
//  Does not work in React Native
<View className="flex-1 bg-white p-4" />        // No Tailwind
<View style="background-color: white; padding: 16px" /> // No CSS strings

//  Works in React Native
<View style={{ flex: 1, backgroundColor: 'white', padding: 16 }} />
<View style={styles.container} />

// NativeWind — Tailwind for React Native (uses the same utility classes)
// This DOES work if you install NativeWind:
<View className="flex-1 bg-white p-4" />  // with NativeWind installed
```

---

## Navigation: URLs → Stacks

```tsx
// Web (React Router / Next.js)
import { Link, useNavigate } from 'react-router-dom';

function NavExample() {
    const navigate = useNavigate();
    return (
        <>
            <Link to="/profile">Go to Profile</Link>
            <button onClick={() => navigate('/home')}>Home</button>
            <button onClick={() => navigate(-1)}>Back</button>
        </>
    );
}
```

```tsx
// React Native with React Navigation (stack-based)
import { useNavigation } from '@react-navigation/native';

function NavExample() {
    const navigation = useNavigation();
    return (
        <>
            <Pressable onPress={() => navigation.navigate('Profile')}><Text>Go to Profile</Text></Pressable>
            <Pressable onPress={() => navigation.navigate('Home')}><Text>Home</Text></Pressable>
            <Pressable onPress={() => navigation.goBack()}><Text>Back</Text></Pressable>
        </>
    );
}
```

React Navigation uses a **stack model** — screens are pushed and popped like a call stack, matching native iOS/Android navigation behavior. If you prefer file-based routing (closer to Next.js), **Expo Router** offers that mental model but is tied to the Expo toolchain — research it separately.

---

## Events: onClick → onPress

```tsx
// Web
<button onClick={handleClick}>Click</button>
<input onChange={handleChange} />
<form onSubmit={handleSubmit}>

// React Native
<Pressable onPress={handlePress}>  // onClick → onPress
<TextInput onChangeText={setText} /> // onChange → onChangeText (gives you the string directly)
// No form elements — just group inputs manually
```

---

## Lists: map() → FlatList

```tsx
// Web — rendering a list with .map()
{users.map(user => (
    <div key={user.id} className="user-card">
        <span>{user.name}</span>
    </div>
))}
```

```tsx
// React Native — for short lists, .map() inside ScrollView is fine
<ScrollView>
    {users.map(user => (
        <View key={user.id} style={styles.userCard}>
            <Text>{user.name}</Text>
        </View>
    ))}
</ScrollView>

// For long lists — use FlatList (virtualized, like a React web virtual list)
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

## Resources

| Resource | Type | Link |
|---|---|---|
| RN Intro for React Web Devs | Official Docs | [reactnative.dev/docs/intro-react](https://reactnative.dev/docs/intro-react) |
| React Navigation | Official | [reactnavigation.org/docs/getting-started](https://reactnavigation.org/docs/getting-started) |
| NativeWind (Tailwind for RN) | Community | [nativewind.dev](https://www.nativewind.dev/) |

---

Next → **[No DOM, No CSS — Styling in Depth](./sem-dom-sem-css)**
