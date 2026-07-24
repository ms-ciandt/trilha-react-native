---
title: Components and Props
---

# Components and Props

No SwiftUI, você define uma struct `View` com propriedades armazenadas e um inicializador. No React Native, você define um **componente** — uma função TypeScript simples — e recebe dados através de **props**. O modelo mental é quase idêntico: os dados fluem de fora para dentro, e a view é renderizada a partir desses dados.

## Parâmetros de init do SwiftUI → Props do React

No SwiftUI, você passa dados para uma view através do seu inicializador:

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

No React Native, as props são um único objeto passado para a função. As interfaces TypeScript substituem as declarações de propriedades armazenadas do Swift:

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

O padrão de desestruturação `{ name, imageURL, size = 48 }` espelha os labels de parâmetros e valores padrão do Swift em uma única etapa.

## Tipando props com interfaces TypeScript

Defina uma `interface` ou `type` dedicado para as props de cada componente. Isso oferece autocomplete, segurança em tempo de compilação e documentação inline — equivalente ao que o Swift oferece através do seu sistema de tipos.

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

Use `interface` quando você espera que o tipo seja estendido (favorável à composição). Use `type` para uniões, interseções ou quando preferir uma sintaxe mais compacta. Ambas funcionam; escolha uma convenção por projeto.

## Props obrigatórias vs opcionais

O Swift distingue não-opcional (`String`) de opcional (`String?`) no nível de tipo. O TypeScript faz o mesmo com o modificador `?` nos membros da interface.

```tsx
interface ButtonProps {
  // Obrigatórias — quem chamar deve sempre fornecer estas
  label: string;
  onPress: () => void;

  // Opcionais — quem chamar pode omitir estas
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  accessibilityLabel?: string;
}
```

Se uma prop obrigatória estiver ausente, o TypeScript gera um erro de compilação no local da chamada — a mesma garantia de segurança que os parâmetros não-opcionais do Swift oferecem.

## Valores padrão de props

No Swift, você define padrões na assinatura do inicializador. No React Native, você os define na desestruturação:

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

`accessibilityLabel = label` é um padrão que referencia outra prop — válido porque a desestruturação é avaliada da esquerda para a direita.

## A prop children — conteúdo @ViewBuilder do SwiftUI

O SwiftUI permite que você passe conteúdo de view usando trailing closures e `@ViewBuilder`:

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

O React Native usa `children` — uma prop especial preenchida automaticamente com tudo que você aninhar entre as tags de abertura e fechamento:

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

`React.ReactNode` é o tipo de children mais amplo — aceita elementos, strings, números, arrays, fragments ou `null`. Use `React.ReactElement` quando precisar garantir um único elemento renderizado.

## Espalhamento de props

Quando você quer repassar um subconjunto conhecido de props para um componente interno, o operador spread evita repetição:

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

`extends TextInputProps` informa ao TypeScript que `StyledInput` aceita todas as props que `TextInput` aceita, além das suas próprias adições. O operador rest (`...inputProps`) coleta tudo que não foi explicitamente desestruturado e repassa adiante.

## React.FC vs declaração de função simples

Você encontrará dois padrões comuns em bases de código React Native:

```tsx
// Padrão A — função simples (recomendado em bases de código modernas)
function Avatar({ name, size = 40 }: AvatarProps) {
  return <View />;
}

// Padrão B — React.FC (convenção mais antiga, ainda amplamente usada)
const Avatar: React.FC<AvatarProps> = ({ name, size = 40 }) => {
  return <View />;
};
```

As diferenças práticas são mínimas hoje em dia. `React.FC` era preferido antigamente porque incluía `children` automaticamente nas props, mas esse comportamento foi removido no React 18 — `children` agora deve ser declarado explicitamente em ambos os padrões. Declarações de funções simples são ligeiramente mais limpas e são o que o time do React recomenda atualmente.

Use o padrão que seu projeto já utiliza. Se estiver começando do zero, prefira declarações de funções simples.

## Componentes genéricos — views genéricas do SwiftUI

O SwiftUI utiliza muito genéricos para views de container reutilizáveis:

```swift
struct SelectableList<Item: Identifiable, Row: View>: View {
    let items: [Item]
    @ViewBuilder let row: (Item) -> Row
    // ...
}
```

O React Native alcança o mesmo resultado com genéricos TypeScript:

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

O uso é type-safe — o TypeScript infere `T` a partir do array `items`:

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

## Padrões de composição

O SwiftUI incentiva views pequenas e combináveis. O React Native funciona da mesma forma. Prefira construir telas complexas a partir de componentes pequenos e focados, em vez de componentes grandes e monolíticos:

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

`StatPill` é definido inline — componentes auxiliares pequenos que são relevantes apenas para um pai podem ficar no mesmo arquivo.

## Componentes controlados vs não controlados

Essa distinção mapeia aproximadamente para a diferença entre `@Binding` (controlado) e `@State` interno (não controlado) do SwiftUI.

**Não controlado** — o componente gerencia seu próprio estado:

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

**Controlado** — o pai gerencia o estado, equivalente a passar um `@Binding`:

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

// O pai controla o estado — visibilidade e controle total
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

Prefira componentes controlados para campos de formulário e qualquer entrada cujo valor precise ser validado, redefinido ou lido pelo pai. Use não controlado quando o pai se preocupa apenas com eventos, não com o valor atual.

## Encaminhamento de ref — analogia com ponteiro UIView

No UIKit, você mantém uma referência a uma subclasse de `UIView` para chamar métodos de forma imperativa — `scrollView.scrollToTop()`, `textField.becomeFirstResponder()`. O React Native usa `ref` com o mesmo propósito.

`forwardRef` permite que um componente exponha sua view nativa subjacente (ou qualquer handle imperativo) ao seu pai:

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

O pai agora pode chamar métodos de `TextInput` diretamente:

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

`passwordRef.current?.focus()` é o equivalente a chamar `passwordField.becomeFirstResponder()` no UIKit. O encadeamento opcional `?.` corresponde ao encadeamento opcional do Swift — se `current` for `null`, a chamada é silenciosamente ignorada.

## Exemplos de uso inline — PreviewProvider do SwiftUI

Os previews do SwiftUI permitem renderizar um componente com dados de exemplo sem executar o app completo. No React Native, o equivalente é um exemplo de uso simples no final do arquivo ou em um arquivo de story/teste separado. Muitas equipes usam a flag `__DEV__` do React Native para proteger um teste rápido:

```tsx
// No final de Card.tsx — remover antes de enviar para produção
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

Para previews mais estruturados, ferramentas como Storybook para React Native e os testes de snapshot integrados do `jest` cumprem o mesmo papel que o `PreviewProvider` em escala.

## Pontos principais

| Swift / SwiftUI | React Native |
|---|---|
| Propriedades armazenadas + parâmetros de `init` | Interface de props + desestruturação |
| `String` (não-opcional) | `prop: string` (obrigatória) |
| `String?` (opcional) | `prop?: string` (opcional) |
| Valores padrão de parâmetros | Valores padrão na desestruturação |
| Trailing closure `@ViewBuilder` | `children: React.ReactNode` |
| Constraint genérica `<T: View>` | Genérico TypeScript `<T>` |
| `@Binding` / `@State` | Componente controlado / não controlado |
| Ponteiro de referência `UIView` | `React.useRef<NativeElement>` |
| `PreviewProvider` | Exemplo com `__DEV__` ou Storybook |

As props são imutáveis da perspectiva do componente — assim como uma `View` do SwiftUI não pode mutar os valores passados ao seu inicializador. O estado (abordado no próximo módulo) lida com valores que mudam ao longo do tempo.
