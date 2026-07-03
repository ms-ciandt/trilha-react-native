---
id: components-and-props
title: Components & Props in Depth
sidebar_label: Components & Props
sidebar_position: 5
---

# Components & Props in Depth

## Component Composition

React's power comes from composing small, focused components. Each component does one thing well.

{% raw %}
```tsx
// Small, focused components
function Avatar({ uri, size = 40 }: { uri: string; size?: number }) {
    return (
        <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
        />
    );
}

function UserName({ name, isVerified }: { name: string; isVerified: boolean }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontWeight: 'bold' }}>{name}</Text>
            {isVerified && <Text>✓</Text>}
        </View>
    );
}

// Composed into a larger component
function UserCard({ user }: { user: User }) {
    return (
        <View style={styles.card}>
            <Avatar uri={user.avatarUrl} size={48} />
            <UserName name={user.name} isVerified={user.isVerified} />
        </View>
    );
}
```
{% endraw %}

---

## Children Props

The `children` prop lets you build container/wrapper components — like Compose's `content: @Composable () -> Unit` slot:

{% raw %}
```tsx
interface SectionProps {
    title: string;
    children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

// Usage
<Section title="Recent Activity">
    <ActivityItem text="Liked a photo" />
    <ActivityItem text="Posted a comment" />
</Section>
```
{% endraw %}

---

## Prop Drilling vs Context

When you need to pass data through many levels of components, **Context** avoids the "prop drilling" problem — like a Compose `CompositionLocal` or a SwiftUI `@EnvironmentObject`:

{% raw %}
```tsx
import { createContext, useContext, useState } from 'react';

// 1. Create context
interface ThemeContextType {
    isDark: boolean;
    toggle: () => void;
}
const ThemeContext = createContext<ThemeContextType | null>(null);

// 2. Provide it at the top of your tree
function App() {
    const [isDark, setIsDark] = useState(false);

    return (
        <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(d => !d) }}>
            <NavigationContainer>
                <MainStack />
            </NavigationContainer>
        </ThemeContext.Provider>
    );
}

// 3. Consume anywhere in the tree — no prop passing needed
function ThemedButton() {
    const theme = useContext(ThemeContext);
    if (!theme) throw new Error('ThemedButton must be inside ThemeContext.Provider');

    return (
        <Pressable
            onPress={theme.toggle}
            style={{ backgroundColor: theme.isDark ? '#333' : '#fff' }}
        >
            <Text>Toggle Theme</Text>
        </Pressable>
    );
}
```
{% endraw %}

---

## Rendering Lists

Instead of `RecyclerView` (Android) or `UITableView/UICollectionView` (iOS), React Native uses `FlatList`:

{% raw %}
```tsx
interface Item { id: string; title: string; }

const DATA: Item[] = [
    { id: '1', title: 'First Item' },
    { id: '2', title: 'Second Item' },
    { id: '3', title: 'Third Item' },
];

function ItemRow({ item }: { item: Item }) {
    return (
        <View style={styles.row}>
            <Text>{item.title}</Text>
        </View>
    );
}

function MyList() {
    return (
        <FlatList
            data={DATA}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ItemRow item={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
    );
}
```
{% endraw %}

`FlatList` is lazy — like `RecyclerView`, it only renders items visible on screen.

---

## Conditional Rendering Patterns

{% raw %}
```tsx
// Pattern 1: Early return (cleanest for loading/error states)
function UserScreen({ userId }: { userId: string }) {
    const { user, loading, error } = useUser(userId);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorView message={error} />;
    if (!user) return <EmptyState />;

    return <UserProfile user={user} />;
}

// Pattern 2: Ternary (for inline two-branch)
<Text>{isOnline ? '🟢 Online' : '🔴 Offline'}</Text>

// Pattern 3: && (for optional content)
{errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

// Pattern 4: Switch (for multiple mutually exclusive states)
function StatusBadge({ status }: { status: 'pending' | 'active' | 'closed' }) {
    const config = {
        pending: { color: '#f59e0b', label: 'Pending' },
        active:  { color: '#10b981', label: 'Active' },
        closed:  { color: '#6b7280', label: 'Closed' },
    }[status];

    return (
        <View style={[styles.badge, { backgroundColor: config.color }]}>
            <Text style={styles.badgeText}>{config.label}</Text>
        </View>
    );
}
```
{% endraw %}

---

## Key Prop for Lists

When rendering arrays, React needs a stable `key` to track which items changed:

{% raw %}
```tsx
// BAD — using array index as key (causes bugs when list reorders)
{users.map((user, index) => <UserRow key={index} user={user} />)}

// GOOD — use a stable unique identifier
{users.map(user => <UserRow key={user.id} user={user} />)}
```
{% endraw %}

---

## `React.memo` — Preventing Unnecessary Re-renders

By default, a child component re-renders whenever its parent re-renders — even if its own props haven't changed. `React.memo` wraps a component and skips the re-render when props are shallowly equal.

{% raw %}
```tsx
// Without memo — re-renders on every parent render, even if user is the same
function UserRow({ user }: { user: User }) {
    return <Text>{user.name}</Text>;
}

// With memo — skips re-render when user reference hasn't changed
const UserRow = React.memo(function UserRow({ user }: { user: User }) {
    return <Text>{user.name}</Text>;
});
```
{% endraw %}

`React.memo` pairs with `useCallback` — both are needed for a FlatList row to truly avoid unnecessary re-renders:

{% raw %}
```tsx
function UserList() {
    const [users, setUsers] = useState<User[]>([]);

    // stable function reference across parent renders
    const handlePress = useCallback((id: string) => {
        router.push(`/user/${id}`);
    }, []);

    return (
        <FlatList
            data={users}
            keyExtractor={u => u.id}
            renderItem={({ item }) => (
                <UserRow user={item} onPress={handlePress} />
            )}
        />
    );
}

const UserRow = React.memo(function UserRow({
    user,
    onPress,
}: {
    user: User;
    onPress: (id: string) => void;
}) {
    return (
        <Pressable onPress={() => onPress(user.id)}>
            <Text>{user.name}</Text>
        </Pressable>
    );
});
```
{% endraw %}

**Kotlin/Compose parallel:** `React.memo` is analogous to Compose's stable parameter system — a composable with stable inputs skips recomposition when they haven't changed.

:::caution Don't over-apply memo
Profile before you memoize. For cheap components or short lists the memo comparison overhead can exceed the render cost it avoids.
:::

---

## Exercises

1. **Build a `TagList` component** that takes `tags: string[]` and renders each as a colored pill badge. Make the color configurable via props.

2. **Convert this imperative Android code** to a declarative React Native component:
   ```kotlin
   // Android: show/hide a "Pro" badge based on user tier
   if (user.tier == "pro") {
       proBadge.visibility = View.VISIBLE
       proBadge.text = "PRO"
   } else {
       proBadge.visibility = View.GONE
   }
   ```

3. **Build a `Section` wrapper** (as shown above) and use it to group a list of items under a title, with a "See all" button that triggers a callback.

---

Next → **[State & Hooks in Depth](./state-and-hooks)**
