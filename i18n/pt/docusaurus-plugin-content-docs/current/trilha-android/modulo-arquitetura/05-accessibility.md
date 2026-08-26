---
title: "Acessibilidade"
sidebar_label: "Acessibilidade"
sidebar_position: 5
---

## Visão Geral em Vídeo

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/arq_05_accessibility.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/arq_05_accessibility.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

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

---

<div className="trail-feedback trail-feedback--android">
  <div className="trail-feedback-icon" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
    <svg viewBox="19.933 68.509 228.155 228.155" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <path d="M101.885 207.092c7.865 0 14.241 6.376 14.241 14.241v61.09c0 7.865-6.376 14.24-14.241 14.24-7.864 0-14.24-6.375-14.24-14.24v-61.09c0-7.864 6.376-14.24 14.24-14.24z" fill="#a4c639"/>
      <path d="M69.374 133.645c-.047.54-.088 1.086-.088 1.638v92.557c0 9.954 7.879 17.973 17.66 17.973h94.124c9.782 0 17.661-8.02 17.661-17.973v-92.557c0-.552-.02-1.1-.066-1.638H69.374z" fill="#a4c639"/>
      <path d="M166.133 207.092c7.865 0 14.241 6.376 14.241 14.241v61.09c0 7.865-6.376 14.24-14.241 14.24-7.864 0-14.24-6.375-14.24-14.24v-61.09c0-7.864 6.376-14.24 14.24-14.24zM46.405 141.882c7.864 0 14.24 6.376 14.24 14.241v61.09c0 7.865-6.376 14.241-14.24 14.241-7.865 0-14.241-6.376-14.241-14.24v-61.09c-.001-7.865 6.375-14.242 14.241-14.242zM221.614 141.882c7.864 0 14.24 6.376 14.24 14.241v61.09c0 7.865-6.376 14.241-14.24 14.241-7.865 0-14.241-6.376-14.241-14.24v-61.09c0-7.865 6.376-14.242 14.241-14.242zM69.79 127.565c.396-28.43 25.21-51.74 57.062-54.812h14.312c31.854 3.073 56.666 26.384 57.062 54.812H69.79z" fill="#a4c639"/>
      <path d="M74.743 70.009l15.022 26.02M193.276 70.009l-15.023 26.02" fill="none" stroke="#a4c639" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M114.878 102.087c.012 3.974-3.277 7.205-7.347 7.216-4.068.01-7.376-3.202-7.388-7.176v-.04c-.011-3.975 3.278-7.205 7.347-7.216 4.068-.011 7.376 3.2 7.388 7.176v.04zM169.874 102.087c.012 3.974-3.277 7.205-7.347 7.216-4.068.01-7.376-3.202-7.388-7.176v-.04c-.011-3.975 3.278-7.205 7.347-7.216 4.068-.011 7.376 3.2 7.388 7.176v.04z" fill="#ffffff"/>
    </svg>
  </div>
  <p className="trail-feedback-title">Você concluiu a Trilha Android Native</p>
  <p className="trail-feedback-sub">Seu feedback ajuda a melhorar o conteúdo. Leva menos de 2 minutos.</p>
  <a
    href="https://forms.gle/75pKeXQxkSZogzxv5"
    target="_blank"
    rel="noopener noreferrer"
    className="trail-feedback-btn"
  >
    Deixar Feedback
  </a>
</div>
