---
title: Styling — StyleSheet, Platform e Sombras
---

# Styling — StyleSheet, Platform e Sombras

O sistema de estilo do React Native tem uma filosofia diferente do CSS tradicional e do SwiftUI. Nao existe heranca de estilos em cascata, nao existe seletor de classe, e todo layout usa Flexbox por padrao. Para um desenvolvedor Swift, a analogia mais proxima e criar um `ViewModifier` para cada componente — isolado, explicito e sem efeitos colaterais em outros componentes.

---

## SwiftUI ViewModifier → StyleSheet.create()

Em SwiftUI voce encadeia modificadores diretamente na view:

```swift
Text("Olá")
    .font(.headline)
    .foregroundColor(.blue)
    .padding(16)
    .background(Color.white)
    .cornerRadius(8)
```

Em React Native voce define estilos em um objeto e os aplica via prop `style`:

```tsx
import { Text, View, StyleSheet } from 'react-native';

export default function Card() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Olá</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
  },
  titulo: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});
```

`StyleSheet.create()` nao e obrigatorio — voce pode passar objetos literais — mas ele valida as propriedades em desenvolvimento e permite que o runtime otimize o envio dos estilos para a thread nativa. Prefira sempre usa-lo.

---

## UIColor / SwiftUI Color → Formatos de cor no RN

React Native aceita quatro formatos de cor em qualquer propriedade que espere cor:

| Formato | Exemplo |
|---|---|
| Hexadecimal | `'#007AFF'` |
| Hex com alpha | `'#007AFF99'` |
| `rgba()` | `'rgba(0, 122, 255, 0.6)'` |
| Cores nomeadas (CSS) | `'tomato'`, `'dodgerblue'` |

```tsx
const styles = StyleSheet.create({
  primario: { color: '#007AFF' },
  secundario: { color: 'rgba(0, 122, 255, 0.6)' },
  fundo: { backgroundColor: '#F2F2F7' },
  borda: { borderColor: '#C6C6C8' },
});
```

Nao existe um tipo `Color` como em Swift. Tudo e string. Em projetos TypeScript mais robustos, e comum criar constantes tipadas:

```ts
export const Colors = {
  azul: '#007AFF' as const,
  cinza: '#8E8E93' as const,
  fundo: '#F2F2F7' as const,
} satisfies Record<string, string>;
```

---

## UIKit Appearance API → Estilos globais com tema

Em UIKit voce usa `UIAppearance` para definir estilos globais:

```swift
UINavigationBar.appearance().tintColor = .systemBlue
UILabel.appearance().font = UIFont.systemFont(ofSize: 17)
```

React Native nao tem um mecanismo de aparencia global embutido equivalente. A abordagem padrao e criar um modulo de tema e importa-lo onde necessario:

```ts
// theme.ts
export const theme = {
  colors: {
    primario: '#007AFF',
    secundario: '#5856D6',
    texto: '#1C1C1E',
    textoSecundario: '#8E8E93',
    fundo: '#F2F2F7',
    superficie: '#FFFFFF',
    separador: '#C6C6C8',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const },
    title1: { fontSize: 28, fontWeight: '700' as const },
    headline: { fontSize: 17, fontWeight: '600' as const },
    body: { fontSize: 17, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
  },
};
```

Os componentes consomem o tema importando diretamente ou via Context:

```tsx
import { theme } from '../theme';

const styles = StyleSheet.create({
  titulo: {
    ...theme.typography.headline,
    color: theme.colors.texto,
    marginBottom: theme.spacing.sm,
  },
});
```

---

## Dynamic Type → accessibilityFontScale

Em iOS, Dynamic Type respeita a preferencia de tamanho de fonte do sistema. React Native nao escala fontes automaticamente — por padrao, `Text` tem `allowFontScaling={true}`, o que respeita a configuracao de acessibilidade do dispositivo.

Para controlar esse comportamento:

```tsx
// Respeita acessibilidade (padrão)
<Text style={styles.body}>Conteúdo</Text>

// Desativa escalonamento (use com cautela)
<Text allowFontScaling={false} style={styles.label}>Rótulo</Text>

// Define um limite máximo de escala
<Text maxFontSizeMultiplier={1.5} style={styles.body}>Conteúdo</Text>
```

Para replicar o comportamento de Dynamic Type com tamanhos semanticos, use `PixelRatio`:

```tsx
import { PixelRatio } from 'react-native';

const escala = PixelRatio.getFontScale();

const styles = StyleSheet.create({
  body: {
    fontSize: 17 * Math.min(escala, 1.5),
  },
});
```

---

## Dark Mode: @Environment(.colorScheme) → useColorScheme()

Em SwiftUI voce le o esquema de cores via environment:

```swift
@Environment(\.colorScheme) var colorScheme

var body: some View {
    Text("Olá")
        .foregroundColor(colorScheme == .dark ? .white : .black)
}
```

Em React Native, o hook equivalente e `useColorScheme()`:

```tsx
import { useColorScheme, View, Text, StyleSheet } from 'react-native';

export default function TelaExemplo() {
  const esquema = useColorScheme(); // 'light' | 'dark' | null

  const estilosDinamicos = {
    container: {
      backgroundColor: esquema === 'dark' ? '#1C1C1E' : '#F2F2F7',
    },
    texto: {
      color: esquema === 'dark' ? '#FFFFFF' : '#1C1C1E',
    },
  };

  return (
    <View style={[styles.base, estilosDinamicos.container]}>
      <Text style={[styles.texto, estilosDinamicos.texto]}>Modo atual: {esquema}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    padding: 16,
  },
  texto: {
    fontSize: 17,
  },
});
```

Para projetos maiores, o padrao recomendado e encapsular o tema em um Context que ja resolve o dark mode internamente:

```tsx
import { useColorScheme } from 'react-native';
import { createContext, useContext } from 'react';
import { temaClaro, temaEscuro } from './themes';

const TemaContext = createContext(temaClaro);

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const esquema = useColorScheme();
  const tema = esquema === 'dark' ? temaEscuro : temaClaro;
  return <TemaContext.Provider value={tema}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);
```

---

## Platform.OS e Platform.select()

Para estilos exclusivos de plataforma, use `Platform`:

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
  },
  sombra: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
});
```

`Platform.select()` recebe um objeto com chaves `'ios'`, `'android'`, `'web'` e `'default'`, e retorna o valor correspondente a plataforma atual. E type-safe e mais legivel do que multiplos `if (Platform.OS === ...)`.

---

## Sombras: UIView.layer.shadow* → RN iOS/Android

Em UIKit, sombras sao configuradas via `CALayer`:

```swift
view.layer.shadowColor = UIColor.black.cgColor
view.layer.shadowOffset = CGSize(width: 0, height: 2)
view.layer.shadowOpacity = 0.15
view.layer.shadowRadius = 4
```

Em React Native, o mapeamento e quase direto para iOS:

```tsx
const styles = StyleSheet.create({
  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,

    // iOS — mapeia diretamente para CALayer
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
```

No Android, sombras funcionam com a propriedade `elevation` (Material Design):

```tsx
const styles = StyleSheet.create({
  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,

    // Android — elevation cria sombra + ripple area
    elevation: 4,

    // iOS ignorará elevation; Android ignorará shadow*
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
```

Para sombras cross-platform sem repeticao, use `Platform.select()`:

```tsx
const sombra = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  android: {
    elevation: 4,
  },
}) ?? {};

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...sombra,
  },
});
```

---

## SwiftUI .font() → fontFamily / fontSize / fontWeight

Em SwiftUI:

```swift
Text("Título")
    .font(.system(size: 28, weight: .bold, design: .rounded))
```

Em React Native, tipografia e controlada pelas propriedades de estilo do `Text`:

```tsx
const styles = StyleSheet.create({
  titulo: {
    fontSize: 28,
    fontWeight: '700',      // '100' a '900' ou 'bold'/'normal'
    fontStyle: 'normal',    // 'normal' | 'italic'
    letterSpacing: 0.5,
    lineHeight: 36,
  },
  corpo: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
  },
});
```

---

## Fontes customizadas: UIFont vs fontFamily

Em iOS com UIKit, voce registra a fonte no `Info.plist` e usa `UIFont(name:size:)`. Em React Native o processo e similar — a fonte precisa ser linkada no projeto nativo e depois referenciada por nome exato:

Com Expo:

```json
// app.json
{
  "expo": {
    "fonts": ["./assets/fonts/Inter-Regular.ttf"]
  }
}
```

```tsx
import { useFonts } from 'expo-font';

export default function App() {
  const [fontsCarregadas] = useFonts({
    'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
  });

  if (!fontsCarregadas) return null;

  return <TelaInicial />;
}
```

```tsx
const styles = StyleSheet.create({
  titulo: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
  },
  corpo: {
    fontFamily: 'Inter-Regular',
    fontSize: 17,
  },
});
```

O nome usado em `fontFamily` deve ser exatamente o nome com que a fonte foi registrada no `useFonts`, nao o nome do arquivo.

---

## StyleSheet.flatten

Quando voce compos estilos via arrays, `StyleSheet.flatten()` resolve o array em um unico objeto — util para introspeccao ou para passar estilos para bibliotecas que esperam um objeto plano:

```tsx
const estiloBase = StyleSheet.create({
  texto: { fontSize: 17, color: '#1C1C1E' },
});

const estiloDestaque = { fontWeight: '700' as const };

// Array de estilos (o último sobrescreve os anteriores)
<Text style={[estiloBase.texto, estiloDestaque]}>Destaque</Text>

// Resolvendo para objeto plano
const estiloResolvido = StyleSheet.flatten([estiloBase.texto, estiloDestaque]);
// { fontSize: 17, color: '#1C1C1E', fontWeight: '700' }
```

---

## Estilos dinamicos a partir de estado

Em SwiftUI, a view re-renderiza automaticamente quando o estado muda. Em React Native, o mesmo acontece — voce usa o estado para calcular estilos inline ou combinar classes via array:

```tsx
import { useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export default function BotaoToggle() {
  const [ativo, setAtivo] = useState(false);

  return (
    <Pressable
      onPress={() => setAtivo(v => !v)}
      style={[styles.botao, ativo && styles.botaoAtivo]}
    >
      <Text style={[styles.rotulo, ativo && styles.rotuloAtivo]}>
        {ativo ? 'Ativo' : 'Inativo'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
  },
  botaoAtivo: {
    backgroundColor: '#007AFF',
  },
  rotulo: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8E8E93',
  },
  rotuloAtivo: {
    color: '#FFFFFF',
  },
});
```

Para estilos que dependem de valores numericos (progresso, posicao), use objetos inline:

```tsx
<View style={[styles.barra, { width: `${progresso}%` }]} />
```

---

## Alternativas: styled-components e NativeWind

Para equipes vindas de React web ou que preferem uma sintaxe diferente, existem duas alternativas populares ao `StyleSheet` nativo:

**styled-components/native** — mesma API do styled-components web, adaptada para React Native:

```tsx
import styled from 'styled-components/native';

const Cartao = styled.View`
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  shadow-color: #000000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.12;
  shadow-radius: 8px;
`;

const Titulo = styled.Text`
  font-size: 17px;
  font-weight: 600;
  color: #1c1c1e;
`;
```

**NativeWind** — Tailwind CSS para React Native. Usa classes utilitarias no lugar de objetos de estilo:

```tsx
import { View, Text } from 'react-native';

export default function Cartao() {
  return (
    <View className="bg-white rounded-xl p-4 shadow-md">
      <Text className="text-lg font-semibold text-gray-900">Título</Text>
    </View>
  );
}
```

Ambas as abordagens sao validas, mas o `StyleSheet` nativo continua sendo a escolha padrao para projetos novos — oferece melhor desempenho em casos de renderizacao intensiva e nao requer dependencias adicionais.

---

## Resumo comparativo

| Swift / SwiftUI | React Native |
|---|---|
| `.modifier(ViewModifier)` | `style={styles.classe}` |
| `UIColor`, `Color` | string hex / rgba / named |
| `UIAppearance` | modulo de tema + Context |
| `Dynamic Type` | `allowFontScaling`, `maxFontSizeMultiplier` |
| `@Environment(.colorScheme)` | `useColorScheme()` |
| `UIView.layer.shadow*` | `shadowColor/Offset/Opacity/Radius` (iOS) |
| `UIView.elevation` (Material) | `elevation` (Android) |
| `.font(.system(size:weight:))` | `fontSize`, `fontWeight`, `fontFamily` |
| `UIFont(name:size:)` | `fontFamily` + `useFonts()` |
