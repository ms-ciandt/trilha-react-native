---
title: "Mudancas em Configuracoes Nativas (Edge-to-Edge)"
---

# Mudancas em Configuracoes Nativas (Edge-to-Edge)

> Edge-to-edge e a mudanca mais visualmente impactante na historia recente do RN. Definir `targetSdk = 35` a ativa no Android 15 — e de repente o conteudo transborda para baixo da status bar e da barra de navegacao por gestos em todas as telas.

---

## O Que Mudou e Por Que

No **Android 15 (API 35)**, o Google tornou a renderizacao edge-to-edge obrigatoria para apps que definem o SDK 35 como alvo. A area de conteudo nao termina mais na status bar e na barra de navegacao — ela se expande para preencher a tela inteira, *atras* do chrome do sistema.

Isso e intencional. O Google quer que apps modernos desenhem sob as barras do sistema e gerenciem seus proprios insets. Apps que definem `paddingTop: 24` fixo ou dependem de `StatusBar.setBackgroundColor` agora estao quebrados no Android 15 ao definir SDK 35 como alvo.

O React Native 0.76 definiu `targetSdk = 35` no template diff do Upgrade Helper — tornando isso uma quebra comum para apps que fazem upgrade da 0.75.

---

## O Que Quebra

| API antiga | Status no Android 15 + targetSdk 35 | Correcao |
|---|---|---|
| `StatusBar.setBackgroundColor('#fff')` | No-op silencioso — a status bar e sempre transparente | Remover; usar fundo de View por tras do conteudo |
| Prop `StatusBar.translucent` | Ignorada — todas as status bars sao agora translucidas por padrao | Remover |
| `StatusBar hidden` | Funciona, mas usa modo imersivo — comportamento alterado | Testar manualmente |
| `paddingTop: 24` fixo | Layout parece deslocado ou sobreposto | Substituir por `useSafeAreaInsets().top` |
| `paddingBottom` fixo (barra de navegacao) | Conteudo oculto sob a barra de gestos | Substituir por `useSafeAreaInsets().bottom` |
| `expo-status-bar` (antigo) | Mesmos problemas — encapsula a API quebrada | Atualizar para `react-native-edge-to-edge` |

---

## Sintomas na Tela

```
Antes (targetSdk 34):
┌──────────────────────┐
│  STATUS BAR (bg)     │  ← opaca, com sua cor de fundo
│──────────────────────│
│  SEU HEADER          │
│  seu conteudo        │
│                      │
│──────────────────────│
│  NAV BAR (bg)        │  ← opaca, com sua cor de fundo
└──────────────────────┘

Depois (targetSdk 35, sem correcao):
┌──────────────────────┐
│  STATUS BAR          │
│  SEU HEADER ← erro   │  ← header renderiza sob a status bar
│  seu conteudo        │
│  seu conteudo        │
│  seu conteudo ← erro │  ← conteudo inferior sob a nav bar
│  NAV BAR             │
└──────────────────────┘
```

---

## A Correcao: `react-native-edge-to-edge`

A solucao recomendada pelo time central do React Native e pelo Expo e a biblioteca `react-native-edge-to-edge` de [Mathieu Actherberg (zoontek)](https://github.com/zoontek/react-native-edge-to-edge).

```bash
yarn add react-native-edge-to-edge
cd ios && bundle exec pod install
```

### 1. Ativar no Gradle (Android)

```kotlin
// android/app/build.gradle
android {
    defaultConfig {
        // ...
    }
    buildFeatures {
        // Ativa edge-to-edge — isso chama WindowCompat.setDecorFitsSystemWindows(window, false)
        // automaticamente no codigo gerado do MainActivity
    }
}
```

Ou via propriedade do Gradle (mais limpo):

```properties
# android/gradle.properties
edgeToEdgeEnabled=true
```

### 2. Substituir `StatusBar` por `SystemBars`

```tsx
// Antes — StatusBar do react-native
import { StatusBar } from 'react-native';

function App() {
  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"      // ← quebrado no Android 15
        translucent={false}            // ← quebrado no Android 15
      />
      <MainNavigator />
    </>
  );
}
```

```tsx
// Depois — SystemBars do react-native-edge-to-edge
import { SystemBars } from 'react-native-edge-to-edge';

function App() {
  return (
    <>
      <SystemBars style="dark" />      // ← controla apenas o tint dos icones, sem fundo
      <MainNavigator />
    </>
  );
}
```

### 3. Substituir insets fixos por `useSafeAreaInsets`

```tsx
// Antes — padding fixo
function Header() {
  return (
    <View style={{ paddingTop: 44, backgroundColor: '#0e7490' }}>
      <Text>My App</Text>
    </View>
  );
}
```

```tsx
// Depois — insets dinamicos
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Header() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: '#0e7490' }}>
      <Text>My App</Text>
    </View>
  );
}
```

### 4. Tratar elementos flutuantes e bottom sheets

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function FABButton() {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      style={{
        position: 'absolute',
        bottom: 16 + insets.bottom,   // ← acima da barra de gestos
        right: 16,
      }}
    >
      <Text>+</Text>
    </Pressable>
  );
}
```

---

## Configuracao no Expo (app.json)

```json
{
  "expo": {
    "android": {
      "edgeToEdgeEnabled": true
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 35,
            "targetSdkVersion": 35,
            "minSdkVersion": 24
          }
        }
      ]
    ]
  }
}
```

---

## Se Voce Ainda Nao Esta Pronto para Edge-to-Edge

Se migrar todas as telas de uma vez nao for viavel, voce pode temporariamente manter `targetSdk = 34` enquanto esta na RN 0.76:

```kotlin
// android/app/build.gradle
android {
    compileSdk = 35              // compileSdk pode ser 35
    defaultConfig {
        targetSdk = 34           // targetSdk permanece em 34 — sem edge-to-edge forcado
    }
}
```

Isso ganha tempo. Voce precisara fazer a migracao eventualmente — o Google Play exige que novos releases de apps sejam compilados com o SDK mais recente dentro de um ano de seu lancamento.

---

## Ferramenta de Auditoria: Encontrando Insets Fixos no Seu Codebase

```bash
# Encontrar valores fixos de paddingTop que podem precisar ser dinamicos
grep -r "paddingTop: [0-9]" src/ --include="*.tsx" --include="*.ts"

# Encontrar uso de StatusBar
grep -r "StatusBar" src/ --include="*.tsx" --include="*.ts"

# Encontrar uso de expo-status-bar
grep -r "expo-status-bar" src/ --include="*.tsx" --include="*.ts"
```

Cada resultado e um candidato potencial para migracao de edge-to-edge. Em um app grande, essa lista pode ter 50 a 100 locais. Construa um checklist, migre tela por tela e teste em um dispositivo fisico com Android 15 apos cada lote.

---

## Problemas Comuns de Bibliotecas com Edge-to-Edge

| Biblioteca | Problema | Correcao |
|---|---|---|
| `react-native-modal` | Nao considera insets em versoes antigas | Atualizar para 13.x; encapsular conteudo do `Modal` em `SafeAreaView` |
| `@gorhom/bottom-sheet` | Inset inferior ausente | Passar a prop `bottomInset={insets.bottom}` |
| `react-native-webview` | Conteudo web ignora safe area | Injetar CSS: `env(safe-area-inset-bottom)` via `injectedJavaScript` |
| Headers do `react-navigation` | Header sobrepoe a status bar | Usar a opcao `headerStatusBarHeight` ou atualizar para v7 |
| `react-native-camera-roll` | UI do seletor quebrada | Atualizar para a versao mais recente; a maioria das bibliotecas de UI de camera lida com isso em 2025 |

---

## Outras Mudancas Impactantes em Configuracoes Nativas (Alem do Edge-to-Edge)

### Nova Arquitetura no `gradle.properties`

```properties
# android/gradle.properties
newArchEnabled=true       # padrao nos templates do RN 0.76+
hermesEnabled=true        # o Hermes e obrigatorio com a Nova Arquitetura
```

### CMakeLists.txt (build da Nova Arquitetura)

O RN 0.76 adicionou o CMakeLists.txt ao template para a compilacao C++ da Nova Arquitetura. Se voce e um app brownfield e nao tem esse arquivo, os modulos da Nova Arquitetura nao compilarao.

```bash
# Verificar sua presenca
ls android/app/src/main/jni/CMakeLists.txt
```

### Namespace no `build.gradle` (obrigatorio desde o Gradle 8.x)

```kotlin
// android/app/build.gradle — obrigatorio para Gradle 8+
android {
    namespace = "com.myapp"   // ← deve corresponder ao applicationId
    // ...
}
```

A ausencia de `namespace` causa: `Namespace not specified. Specify a namespace in the module's build file.`

---

## Materiais de Estudo

| Recurso | Descricao |
|---|---|
| [react-native-edge-to-edge — GitHub](https://github.com/zoontek/react-native-edge-to-edge) | A biblioteca recomendada — codigo-fonte, docs, referencia de API |
| [Edge-to-Edge — Discussao Android 15](https://github.com/react-native-community/discussions-and-proposals/discussions/827) | Thread da comunidade explicando a mudanca e o caminho de migracao |
| [Android 15 Edge-to-Edge Fix — 72Technologies](https://www.72technologies.com/blog/android-15-edge-to-edge-react-native-expo) | Codigo antes/depois pratico para Expo e bare workflow |
| [Issue edge-to-edge — #50423](https://github.com/react/react-native/issues/50423) | Issue original no GitHub rastreando a quebra |
| [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context) | Biblioteca para gerenciar insets de safe area (`useSafeAreaInsets`) |
| [useSafeAreaInsets — docs](https://reactnavigation.org/docs/use-safe-area-insets/) | Referencia do hook e exemplos de uso |

---

Proximo → [Diagnostico de Falhas (RN Doctor)](./rn-doctor)
