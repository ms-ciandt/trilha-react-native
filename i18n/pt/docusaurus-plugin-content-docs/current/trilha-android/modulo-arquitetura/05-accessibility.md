---
title: "Acessibilidade"
sidebar_label: "Acessibilidade"
sidebar_position: 5
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## Acessibilidade Android → React Native

| Android | React Native |
|---------|-------------|
| `contentDescription` | `accessibilityLabel` |
| `importantForAccessibility="no"` | `importantForAccessibility="no"` |
| `accessibilityRole` (ex: ROLE_BUTTON) | `accessibilityRole="button"` |
| `setAccessibilityLiveRegion(POLITE)` | `accessibilityLiveRegion="polite"` |
| TalkBack | TalkBack (Android) / VoiceOver (iOS) |

---

## Props Principais

```tsx
function BotaoAcessivel({ onPress, label, hint }: {
  onPress: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: false }}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}
```

---

## Formulários Acessíveis

```tsx
function FormularioAcessivel() {
  const [email, setEmail] = useState('');

  return (
    <View>
      <Text nativeID="email-label">Endereço de email</Text>
      <TextInput
        accessibilityLabelledBy="email-label"
        accessibilityLabel="Endereço de email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enviar formulário"
        accessibilityState={{ disabled: !email }}
        disabled={!email}
        onPress={() => {}}
      >
        <Text>Enviar</Text>
      </Pressable>
    </View>
  );
}
```

---

## Ocultando Elementos Decorativos

```tsx
<Pressable accessibilityLabel="Excluir item" accessibilityRole="button">
  <Image
    source={require('./trash-icon.png')}
    accessible={false}
    importantForAccessibility="no"
  />
  <Text>Excluir</Text>
</Pressable>
```

---

## Regiões Dinâmicas

```tsx
function StatusCarregamento({ isLoading, resultCount }: {
  isLoading: boolean;
  resultCount: number;
}) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      accessibilityLabel={
        isLoading ? 'Carregando resultados' : `${resultCount} resultados encontrados`
      }
    >
      {isLoading ? 'Carregando...' : `${resultCount} resultados`}
    </Text>
  );
}
```

---

## Testando Acessibilidade

```tsx
test('botão excluir é acessível', () => {
  render(<BotaoExcluir onDelete={jest.fn()} />);
  const btn = screen.getByRole('button', { name: 'Excluir item' });
  expect(btn).toBeTruthy();
});
```

```bash
# Ativar TalkBack no emulador
adb shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
```

---

## Materiais de Estudo

- [React Native — Acessibilidade](https://reactnative.dev/docs/accessibility)
- [Android — Acessibilidade](https://developer.android.com/guide/topics/ui/accessibility)

---

## Resumo da Trilha

Você concluiu a Trilha Android Nativo. Currículo completo:

| Módulo | Tópicos |
|--------|---------|
| Fundamentos | JavaScript, TypeScript, Core Components, Styling, State & APIs |
| Recursos Nativos | Permissões, Camera, Storage, Sensores, Notificações |
| Performance | Threads, FlatList, Reanimated, memo, Bundle |
| Nova Arquitetura | Hermes, JSI, TurboModules, Fabric+Compose, Debugging |
| Compose → RN | @Composable, Estado, Layout, Navegação, Theming |
| Testes | Jest, RNTL, Mocking, Integração, Detox |
| CI/CD | Fastlane, GitHub Actions, EAS Build, Assinatura, OTA |
| Arquitetura | Padrões, Monorepo, Estado em Escala, Erros, Acessibilidade |

Para tópicos avançados, continue para a **[React Native MasterClass](/trilha-masterclass/modulo-00-overview/course-overview)**.
