---
title: Componentes & Props em Profundidade
---

# Componentes & Props em Profundidade

## Composição de Componentes

O poder do React vem da composição de componentes pequenos e focados. Cada componente faz uma coisa bem feita.

```tsx
// Componentes pequenos e focados
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
            {isVerified && <Text>Verificado</Text>}
        </View>
    );
}

// Composto em um componente maior
function UserCard({ user }: { user: User }) {
    return (
        <View style={styles.card}>
            <Avatar uri={user.avatarUrl} size={48} />
            <UserName name={user.name} isVerified={user.isVerified} />
        </View>
    );
}
```

---

## Props Children

A prop `children` permite construir componentes contêiner/wrapper — como o slot `content: @Composable () -> Unit` do Compose:

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

// Uso
<Section title="Atividade Recente">
    <ActivityItem text="Curtiu uma foto" />
    <ActivityItem text="Postou um comentário" />
</Section>
```

---

## Prop Drilling vs Context

Quando você precisa passar dados por muitos níveis de componentes, o **Context** evita o problema de "prop drilling" — como um `CompositionLocal` no Compose ou um `@EnvironmentObject` no SwiftUI:

```tsx
import { createContext, useContext, useState } from 'react';

// 1. Cria o context
interface ThemeContextType {
    isDark: boolean;
    toggle: () => void;
}
const ThemeContext = createContext<ThemeContextType | null>(null);

// 2. Fornece no topo da árvore
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

// 3. Consome em qualquer lugar da árvore — sem passar props
function ThemedButton() {
    const theme = useContext(ThemeContext);
    if (!theme) throw new Error('ThemedButton deve estar dentro de ThemeContext.Provider');

    return (
        <Pressable
            onPress={theme.toggle}
            style={{ backgroundColor: theme.isDark ? '#333' : '#fff' }}
        >
            <Text>Alternar Tema</Text>
        </Pressable>
    );
}
```

---

## Renderizando Listas

Em vez de `RecyclerView` (Android) ou `UITableView/UICollectionView` (iOS), o React Native usa `FlatList`:

```tsx
interface Item { id: string; title: string; }

const DATA: Item[] = [
    { id: '1', title: 'Primeiro Item' },
    { id: '2', title: 'Segundo Item' },
    { id: '3', title: 'Terceiro Item' },
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

`FlatList` é lazy — como o `RecyclerView`, renderiza apenas os itens visíveis na tela.

---

## Padrões de Renderização Condicional

```tsx
// Padrão 1: Retorno antecipado (mais limpo para estados de loading/erro)
function UserScreen({ userId }: { userId: string }) {
    const { user, loading, error } = useUser(userId);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorView message={error} />;
    if (!user) return <EmptyState />;

    return <UserProfile user={user} />;
}

// Padrão 2: Ternário (para dois branches inline)
<Text>{isOnline ? ' Online' : ' Offline'}</Text>

// Padrão 3: && (para conteúdo opcional)
{errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

// Padrão 4: Switch (para múltiplos estados mutuamente exclusivos)
function StatusBadge({ status }: { status: 'pending' | 'active' | 'closed' }) {
    const config = {
        pending: { color: '#f59e0b', label: 'Pendente' },
        active:  { color: '#10b981', label: 'Ativo' },
        closed:  { color: '#6b7280', label: 'Encerrado' },
    }[status];

    return (
        <View style={[styles.badge, { backgroundColor: config.color }]}>
            <Text style={styles.badgeText}>{config.label}</Text>
        </View>
    );
}
```

---

## Prop Key em Listas

Ao renderizar arrays, o React precisa de uma `key` estável para rastrear quais itens mudaram:

```tsx
// RUIM — usar índice do array como key (causa bugs quando a lista é reordenada)
{users.map((user, index) => <UserRow key={index} user={user} />)}

// BOM — use um identificador único e estável
{users.map(user => <UserRow key={user.id} user={user} />)}
```

---

## `React.memo` — Prevenindo Re-renderizações Desnecessárias

Por padrão, um componente filho re-renderiza sempre que o pai re-renderiza — mesmo que suas próprias props não tenham mudado. `React.memo` envolve um componente e pula a re-renderização quando as props são superficialmente iguais.

```tsx
// Sem memo — re-renderiza a cada render do pai, mesmo que user seja o mesmo
function UserRow({ user }: { user: User }) {
    return <Text>{user.name}</Text>;
}

// Com memo — pula a re-renderização quando a referência de user não mudou
const UserRow = React.memo(function UserRow({ user }: { user: User }) {
    return <Text>{user.name}</Text>;
});
```

`React.memo` funciona em conjunto com `useCallback` — ambos são necessários para uma linha de FlatList realmente evitar re-renderizações desnecessárias:

```tsx
function UserList() {
    const [users, setUsers] = useState<User[]>([]);

    // referência de função estável entre renders do pai
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

**Paralelo Kotlin/Compose:** `React.memo` é análogo ao sistema de parâmetros estáveis do Compose — um composable com entradas estáveis pula a recomposição quando elas não mudaram.

:::caution Não aplique memo em excesso
Faça profiling antes de memoizar. Para componentes simples ou listas curtas, o overhead da comparação do memo pode superar o custo de renderização que ele evita.
:::

---

## Exercícios

1. **Construa um componente `TagList`** que recebe `tags: string[]` e renderiza cada uma como um badge colorido em forma de pílula. Torne a cor configurável via props.

2. **Converta este código imperativo Android** para um componente React Native declarativo:
   ```kotlin
   // Android: mostrar/ocultar um badge "Pro" com base no tier do usuário
   if (user.tier == "pro") {
       proBadge.visibility = View.VISIBLE
       proBadge.text = "PRO"
   } else {
       proBadge.visibility = View.GONE
   }
   ```

3. **Construa um wrapper `Section`** (como mostrado acima) e use-o para agrupar uma lista de itens sob um título, com um botão "Ver todos" que aciona um callback.

---

Próximo → **[Estado & Hooks em Profundidade](./state-and-hooks)**
