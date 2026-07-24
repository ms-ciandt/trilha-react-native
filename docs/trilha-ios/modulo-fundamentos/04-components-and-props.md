---
title: Components and Props
---

# Components and Props

In SwiftUI, you define a `View` struct with stored properties and an initializer. In React Native, you define a **component** — a plain TypeScript function — and receive data through **props**. The mental model is almost identical: data flows in from the outside, the view renders from that data.

## SwiftUI View init parameters → React props

In SwiftUI, you pass data into a view through its initializer:

```swift
struct AvatarView: View {
    let name: String
    let imageURL: URL
    var size: CGFloat = 48

    var body: some View {
        // ...
    }
}

// Usage
AvatarView(name: "Ana Lima", imageURL: url)
AvatarView(name: "Ana Lima", imageURL: url, size: 64)
```

In React Native, props are a single object passed to the function. TypeScript interfaces replace Swift's stored-property declarations:

```tsx
import { View, Text, Image } from 'react-native';

interface AvatarProps {
  name: string;
  imageURL: string;
  size?: number;
}

function AvatarView({ name, imageURL, size = 48 }: AvatarProps) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Image source={{ uri: imageURL }} style={{ width: size, height: size }} />
      <Text>{name}</Text>
    </View>
  );
}
```

The destructuring pattern `{ name, imageURL, size = 48 }` mirrors Swift's parameter labels and default values in one step.

## Typing props with TypeScript interfaces

Define a dedicated `interface` or `type` for every component's props. This gives you autocomplete, compile-time safety, and inline documentation — equivalent to what Swift gives you through its type system.

```tsx
interface CardProps {
  title: string;
  subtitle: string;
  accentColor: string;
  onPress: () => void;
  badge?: string;
}

function Card({ title, subtitle, accentColor, onPress, badge }: CardProps) {
  return (
    <Pressable onPress={onPress} style={{ borderLeftColor: accentColor, borderLeftWidth: 4, padding: 16 }}>
      <Text style={{ fontWeight: 'bold' }}>{title}</Text>
      <Text>{subtitle}</Text>
      {badge !== undefined && <Text style={{ color: accentColor }}>{badge}</Text>}
    </Pressable>
  );
}
```

Use `interface` when you expect the type to be extended (composition-friendly). Use `type` for unions, intersections, or when you prefer a more compact syntax. Either works; pick one convention per project.

## Required vs optional props

Swift distinguishes non-optional (`String`) from optional (`String?`) at the type level. TypeScript does the same with the `?` modifier on interface members.

```tsx
interface ButtonProps {
  // Required — caller must always supply these
  label: string;
  onPress: () => void;

  // Optional — caller may omit these
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  accessibilityLabel?: string;
}
```

If a required prop is missing, TypeScript raises a compile error at the call site — the same safety guarantee Swift's non-optional parameters provide.

## Default prop values

In Swift you set defaults in the initializer signature. In React Native, you set them in the destructuring assignment:

```tsx
function Button({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  accessibilityLabel = label,
}: ButtonProps) {
  const backgroundColor =
    variant === 'primary' ? '#007AFF' :
    variant === 'secondary' ? '#5856D6' : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      style={{ backgroundColor, padding: 12, borderRadius: 8, opacity: disabled ? 0.5 : 1 }}
    >
      <Text style={{ color: variant === 'ghost' ? '#007AFF' : '#fff' }}>{label}</Text>
    </Pressable>
  );
}
```

`accessibilityLabel = label` is a default that references another prop — valid because destructuring evaluates left-to-right.

## The children prop — SwiftUI @ViewBuilder content

SwiftUI allows you to pass view content using trailing closures and `@ViewBuilder`:

```swift
struct Section<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading) {
            Text(title).font(.headline)
            content()
        }
    }
}

// Usage
Section(title: "Recent") {
    ItemRow(item: items[0])
    ItemRow(item: items[1])
}
```

React Native uses `children` — a special prop automatically populated by anything you nest between the opening and closing tags:

```tsx
import { View, Text, StyleSheet } from 'react-native';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  heading: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
});

// Usage
function Feed() {
  return (
    <Section title="Recent">
      <ItemRow item={items[0]} />
      <ItemRow item={items[1]} />
    </Section>
  );
}
```

`React.ReactNode` is the widest children type — it accepts elements, strings, numbers, arrays, fragments, or `null`. Use `React.ReactElement` when you need to guarantee a single rendered element.

## Spreading props

When you want to forward a known subset of props to an inner component, the spread operator avoids repetition:

```tsx
import { TextInput, TextInputProps } from 'react-native';

interface StyledInputProps extends TextInputProps {
  label: string;
  errorMessage?: string;
}

function StyledInput({ label, errorMessage, ...inputProps }: StyledInputProps) {
  return (
    <View>
      <Text style={{ marginBottom: 4 }}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[
          { borderWidth: 1, borderColor: errorMessage ? '#FF3B30' : '#C6C6C8', borderRadius: 8, padding: 12 },
          inputProps.style,
        ]}
      />
      {errorMessage && <Text style={{ color: '#FF3B30', fontSize: 12 }}>{errorMessage}</Text>}
    </View>
  );
}
```

`extends TextInputProps` tells TypeScript that `StyledInput` accepts every prop that `TextInput` accepts, plus its own additions. The rest operator (`...inputProps`) collects everything not explicitly destructured and passes it through.

## React.FC vs plain function declaration

You will encounter two common patterns in React Native codebases:

```tsx
// Pattern A — plain function (recommended in modern codebases)
function Avatar({ name, size = 40 }: AvatarProps) {
  return <View />;
}

// Pattern B — React.FC (older convention, still widely used)
const Avatar: React.FC<AvatarProps> = ({ name, size = 40 }) => {
  return <View />;
};
```

The practical differences are minimal today. `React.FC` was once preferred because it automatically included `children` in props, but that behavior was removed in React 18 — `children` must now be declared explicitly in both patterns. Plain function declarations are slightly cleaner and are what the React team recommends going forward.

Use whichever your project already uses. If starting fresh, prefer plain function declarations.

## Generic components — SwiftUI generic views

SwiftUI leans heavily on generics for reusable container views:

```swift
struct SelectableList<Item: Identifiable, Row: View>: View {
    let items: [Item]
    @ViewBuilder let row: (Item) -> Row
    // ...
}
```

React Native achieves the same with TypeScript generics:

```tsx
interface SelectableListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, selected: boolean) => React.ReactNode;
  onSelectionChange: (item: T) => void;
}

function SelectableList<T>({
  items,
  keyExtractor,
  renderItem,
  onSelectionChange,
}: SelectableListProps<T>) {
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  return (
    <View>
      {items.map((item) => {
        const key = keyExtractor(item);
        return (
          <Pressable
            key={key}
            onPress={() => {
              setSelectedKey(key);
              onSelectionChange(item);
            }}
          >
            {renderItem(item, key === selectedKey)}
          </Pressable>
        );
      })}
    </View>
  );
}
```

Usage is type-safe — TypeScript infers `T` from the `items` array:

```tsx
<SelectableList
  items={languages}
  keyExtractor={(lang) => lang.id}
  renderItem={(lang, selected) => (
    <Text style={{ fontWeight: selected ? 'bold' : 'normal' }}>{lang.name}</Text>
  )}
  onSelectionChange={(lang) => console.log(lang.name)}
/>
```

## Composition patterns

SwiftUI encourages small, composable views. React Native works the same way. Prefer building complex screens from small, focused components rather than large monolithic ones:

```tsx
interface ProfileHeaderProps {
  displayName: string;
  handle: string;
  avatarURL: string;
  followerCount: number;
  followingCount: number;
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontWeight: '700', fontSize: 17 }}>{value.toLocaleString()}</Text>
      <Text style={{ color: '#8E8E93', fontSize: 13 }}>{label}</Text>
    </View>
  );
}

function ProfileHeader({ displayName, handle, avatarURL, followerCount, followingCount }: ProfileHeaderProps) {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <AvatarView name={displayName} imageURL={avatarURL} size={64} />
        <View>
          <Text style={{ fontWeight: '700', fontSize: 20 }}>{displayName}</Text>
          <Text style={{ color: '#8E8E93' }}>@{handle}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 32 }}>
        <StatPill label="Followers" value={followerCount} />
        <StatPill label="Following" value={followingCount} />
      </View>
    </View>
  );
}
```

`StatPill` is defined inline — small helper components that are only relevant to one parent can live in the same file.

## Controlled vs uncontrolled components

This distinction maps roughly to the difference between SwiftUI's `@Binding` (controlled) and internal `@State` (uncontrolled).

**Uncontrolled** — the component owns its state:

```tsx
function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = React.useState('');

  return (
    <TextInput
      value={query}
      onChangeText={(text) => {
        setQuery(text);
        onSearch(text);
      }}
      placeholder="Search"
    />
  );
}
```

**Controlled** — the parent owns the state, equivalent to passing a `@Binding`:

```tsx
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Search"
    />
  );
}

// Parent drives the state — full visibility and control
function Screen() {
  const [query, setQuery] = React.useState('');
  const results = useSearch(query);

  return (
    <>
      <SearchBar value={query} onChangeText={setQuery} />
      <ResultsList results={results} />
    </>
  );
}
```

Prefer controlled components for form fields and any input whose value needs to be validated, reset, or read by the parent. Use uncontrolled when the parent only cares about events, not the current value.

## Ref forwarding — UIView pointer analogy

In UIKit, you hold a reference to a `UIView` subclass to call methods on it imperatively — `scrollView.scrollToTop()`, `textField.becomeFirstResponder()`. React Native uses `ref` for the same purpose.

`forwardRef` lets a component expose its underlying native view (or any imperative handle) to its parent:

```tsx
import { TextInput, TextInputProps, View, Text } from 'react-native';

interface FormInputProps extends TextInputProps {
  label: string;
}

const FormInput = React.forwardRef<TextInput, FormInputProps>(
  ({ label, ...rest }, ref) => {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ marginBottom: 4, fontSize: 14, color: '#3C3C43' }}>{label}</Text>
        <TextInput
          ref={ref}
          style={{ borderWidth: 1, borderColor: '#C6C6C8', borderRadius: 8, padding: 12 }}
          {...rest}
        />
      </View>
    );
  }
);

FormInput.displayName = 'FormInput';
```

The parent can now call `TextInput` methods directly:

```tsx
function LoginForm() {
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

  return (
    <View>
      <FormInput
        ref={emailRef}
        label="Email"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <FormInput
        ref={passwordRef}
        label="Password"
        secureTextEntry
        returnKeyType="done"
      />
    </View>
  );
}
```

`passwordRef.current?.focus()` is the equivalent of calling `passwordField.becomeFirstResponder()` in UIKit. The `?.` optional chaining matches Swift's optional chaining — if `current` is `null`, the call is silently skipped.

## Inline usage examples — SwiftUI PreviewProvider

SwiftUI previews let you render a component with sample data without running the full app. In React Native, the equivalent is a simple usage example at the bottom of the file or in a separate story/test file. Many teams use React Native's `__DEV__` flag to guard a quick smoke test:

```tsx
// At the bottom of Card.tsx — remove before shipping to production
if (__DEV__) {
  const CardExample = () => (
    <Card
      title="Swift to React Native"
      subtitle="Module 4 — Components and Props"
      accentColor="#007AFF"
      onPress={() => console.log('pressed')}
      badge="NEW"
    />
  );
}
```

For more structured previews, tools like Storybook for React Native and the built-in `jest` snapshot tests serve the same role as `PreviewProvider` at scale.

## Key takeaways

| Swift / SwiftUI | React Native |
|---|---|
| Stored properties + `init` parameters | Props interface + destructuring |
| `String` (non-optional) | `prop: string` (required) |
| `String?` (optional) | `prop?: string` (optional) |
| Default parameter values | Default values in destructuring |
| `@ViewBuilder` trailing closure | `children: React.ReactNode` |
| Generic `<T: View>` constraint | TypeScript generic `<T>` |
| `@Binding` / `@State` | Controlled / uncontrolled component |
| `UIView` reference pointer | `React.useRef<NativeElement>` |
| `PreviewProvider` | `__DEV__` example or Storybook |

Props are immutable from the component's perspective — just like a SwiftUI `View` cannot mutate the values passed into its initializer. State (covered in the next module) handles values that change over time.
