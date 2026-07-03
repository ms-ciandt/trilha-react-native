---
title: Native Components for Web Developers
---

# Native Components for Web Developers

> You know React components. RN components work the same way — just different primitive names and a few mobile-specific behaviours.

## The Essential Swap

| Web | React Native | Notes |
|-----|--------------|-------|
| `<div>` | `<View>` | The container for everything |
| `<span>`, `<p>`, `<h1>`–`<h6>` | `<Text>` | ALL text must be in `<Text>` |
| `<img>` | `<Image>` | `source={{ uri }}` for remote, `require()` for local |
| `<input type="text">` | `<TextInput>` | `onChangeText` gives you the string directly |
| `<button>` | `<Pressable>` + `<Text>` | Or `<Button>` for a simple native button |
| `<a>` | `<Pressable>` + `navigation.navigate()` | No `href` on arbitrary elements; links are imperative |
| `<ul>` + infinite scroll | `<FlatList>` | Virtualized, handles large lists |
| `<select>` | Community `<Picker>` or ActionSheet | No built-in dropdown |
| `<textarea>` | `<TextInput multiline />` | Same component, different props |
| `<form>` | None | Group `TextInput`s manually |
| `<video>` | `expo-video` | Platform video player |
| `<input type="checkbox">` | `<Switch>` (toggle) or community lib | |
| `<progress>` | `<ProgressBar>` (community) | |

---

## `<View>` — Think `<div>` but Flexbox-First

```tsx
// Web div
<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div>Item 1</div>
    <div>Item 2</div>
</div>

// React Native View — flex column by default. gap, rowGap, columnGap all supported.
<View style={{ gap: 8 }}>
    <View><Text>Item 1</Text></View>
    <View><Text>Item 2</Text></View>
</View>
```

---

## `<Text>` — All Text Lives Here

The biggest change: you cannot render text outside of a `<Text>` component.

```tsx
// ❌ Text outside Text — CRASH
<View>
    Hello World
</View>

// ✅
<View>
    <Text>Hello World</Text>
</View>

// Inline styles via nested Text (no <strong>, <em>, <span>)
<Text style={{ fontSize: 16 }}>
    This is{' '}
    <Text style={{ fontWeight: 'bold' }}>bold</Text>
    {' '}and this is{' '}
    <Text style={{ fontStyle: 'italic', color: '#0064d2' }}>italic blue</Text>
</Text>
```

---

## `<TextInput>` — The Input Element

```tsx
// Web
<input
    type="text"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="Enter email"
/>

// React Native — onChangeText gives you the string directly (no e.target.value)
<TextInput
    value={email}
    onChangeText={setEmail}          // string, not event
    placeholder="Enter email"
    keyboardType="email-address"
    autoCapitalize="none"
    autoCorrect={false}
/>
```

### Common `TextInput` Props

```tsx
<TextInput
    // Content
    value={text}
    onChangeText={setText}
    defaultValue="initial"         // uncontrolled (like input's defaultValue on web)
    placeholder="Placeholder text"
    placeholderTextColor="#9ca3af"

    // Keyboard type
    keyboardType="default"         // "numeric" | "email-address" | "phone-pad" | "url"
    returnKeyType="next"           // "done" | "next" | "search" | "go"
    secureTextEntry={true}         // Password field

    // Behavior
    multiline={true}               // Textarea-like
    numberOfLines={4}              // Height hint for multiline
    autoFocus={true}
    autoCapitalize="sentences"     // "none" | "words" | "sentences" | "characters"
    autoCorrect={false}

    // Events
    onSubmitEditing={handleSubmit} // Return key pressed
    onFocus={handleFocus}
    onBlur={handleBlur}

    // Styling
    style={styles.input}
/>
```

---

## `<Pressable>` — The Click Handler

On the web, almost any element can have an `onClick`. In RN, you wrap things in `<Pressable>`:

```tsx
// Web — click on anything
<div onClick={handleClick}>Clickable div</div>
<span onClick={handleClick}>Clickable span</span>
<img src={...} onClick={handleClick} />

// React Native — wrap in Pressable
<Pressable onPress={handlePress}>
    <View style={styles.card}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <Text>Card title</Text>
    </View>
</Pressable>

// Pressable with visual feedback (like :hover/:active in CSS)
<Pressable
    onPress={handlePress}
    style={({ pressed }) => ({
        ...styles.button,
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
    })}
>
    <Text style={styles.buttonText}>Press Me</Text>
</Pressable>
```

---

## `<FlatList>` — The Virtualized List

For long lists, `FlatList` is essential — it only renders what's visible on screen:

```tsx
// Web — render all items (fine for short lists)
{items.map(item => <ItemCard key={item.id} item={item} />)}

// React Native — FlatList for potentially long lists
<FlatList
    data={items}
    keyExtractor={item => item.id}
    renderItem={({ item }) => <ItemCard item={item} />}

    // Grid layout (CSS grid equivalent)
    numColumns={2}
    columnWrapperStyle={{ gap: 8 }}  // gap between columns
    contentContainerStyle={{ padding: 16, gap: 8 }} // gap between rows

    // Pull to refresh
    refreshing={isRefreshing}
    onRefresh={handleRefresh}

    // Infinite scroll
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

## Exercises

1. **Convert this web React component** to React Native:
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

2. **Build a search input** with a TextInput that debounces user input by 300ms before calling a `search(query)` function.

3. **Build a settings screen** with three toggle switches (Push Notifications, Dark Mode, Analytics), each persisting its state.

---

Next → **[Styling & Flexbox for Web Devs](./styling-and-flexbox)**
