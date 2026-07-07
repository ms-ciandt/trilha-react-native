---
title: História & Arquitetura do React Native
---

# História & Arquitetura do React Native

## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="/trilha-react-native/assets/videos/intro_01_history_and_architecture.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## A História em Cinco Atos

### Ato 1 — O Problema (2012)
O Facebook tinha um aplicativo web mobile para seu feed de notícias. Era lento. Os engenheiros tentaram envolvê-lo em uma WebView nos aplicativos móveis — ainda parecia lento comparado ao nativo. A lacuna entre a velocidade de desenvolvimento web e a performance de apps nativos era um problema real de negócio.

### Ato 2 — O Hackathon (2013)
O engenheiro do Facebook Jordan Walke já havia criado o **React** para a web (2013). Outro engenheiro, **Christopher Chedeau** (vjeux), começou a experimentar uma forma de rodar React no mobile. O insight-chave: _e se a camada de renderização fosse nativa, mas a camada de lógica fosse JavaScript?_

### Ato 3 — Open Source (Março de 2015)
O React Native foi anunciado na conferência F8 do Facebook e disponibilizado como open source. A versão inicial suportava apenas iOS. O suporte ao Android veio seis meses depois. A promessa: **"Aprenda uma vez, escreva em qualquer lugar"** (não "escreva uma vez, rode em qualquer lugar" — o código RN é consciente da plataforma por design).

### Ato 4 — Crescimento & Problemas de Crescimento (2015–2022)
A adoção do RN explodiu. Microsoft, Shopify, Walmart, Discord e milhares de startups o utilizaram. Mas a arquitetura original de **"Bridge"** tinha limitações reais:

- Toda a comunicação JS↔Native era **assíncrona** e **serializada em JSON**
- Não era possível chamar código nativo de forma síncrona — mesmo para algo simples como ler um valor de layout
- A bridge era um **gargalo**: operações de alta frequência como animações atrasavam
- O React Concurrent Mode era **incompatível** com a bridge antiga

### Ato 5 — A Nova Arquitetura (2022–2024, pronta para produção em Out 2024)
Após anos de trabalho incremental, a **Nova Arquitetura** foi lançada como padrão no React Native **0.76** (outubro de 2024). Foi uma reescrita fundamental dos internos — não um patch, mas uma nova fundação.

---

## Arquitetura Antiga vs Nova Arquitetura

### Arquitetura Antiga (a Bridge)

```

  Thread JavaScript                               
  (seu código de app, React, lógica de negócio)   

                    
         ▼
           A Bridge              ← Serialização JSON
           (async, em lotes)       em cada mensagem
         
                    
▼
  Thread Native                                   
  (UIKit no iOS, Views Android)                   

```

Toda interação — desenhar um pixel, responder a um gesto, medir texto — tinha que cruzar essa bridge como uma mensagem JSON serializada. Era como enviar uma carta toda vez que você queria falar com seu vizinho.

### Nova Arquitetura (JSI + Fabric + TurboModules)

```

  Engine JavaScript (Hermes)                      
  ↕ JSI: referências diretas a objetos C++        
  (sem serialização, pode ser síncrono)           

         ↕ camada C++ compartilhada
  
  Fabric Renderer     TurboModules            
  (novo motor UI)     (módulos nativos lazy) 
  
         ↕                       ↕

  Camada de Plataforma                            
  UIKit / SwiftUI (iOS) | Android Views / Compose 

```

#### Os Três Pilares

| Pilar | O que substitui | O que faz |
|-------|----------------|-----------|
| **JSI** (JavaScript Interface) | A Bridge | Bindings diretos C++ ↔ JS — síncronos, sem serialização JSON |
| **Fabric** | UIManager / ViewManager | Novo motor de renderização em C++ compartilhado; habilita layout síncrono, React concorrente |
| **TurboModules** | NativeModules | Módulos nativos carregados de forma lazy via JSI; inicialização mais rápida |

---

## Por Que o React Native É Excelente em 2026

### 1. Verdadeiramente Cross-Platform com Aparência Nativa
Ao contrário de frameworks baseados em web (Cordova, Ionic), o React Native renderiza **componentes nativos reais** — não HTML em uma WebView. Um `<Button>` no RN renderiza um `UIButton` no iOS e um `android.widget.Button` no Android.

### 2. A Nova Arquitetura Fecha a Lacuna de Performance
Com JSI, a medição de layout é síncrona. Animações via **Reanimated 3** rodam inteiramente na thread de UI — 60/120fps sem tráfego na bridge. A lacuna de performance em relação ao nativo puro agora é negligível para a maioria das aplicações.

### 3. Suporte ao React Concurrent Mode
O Fabric habilita recursos do React 18/19: **Suspense**, **useTransition**, **startTransition** — os mesmos recursos concorrentes que tornam o React web rápido agora funcionam no mobile também.

### 4. Expo como Toolchain Alternativa
**Expo** é um framework popular construído em cima do React Native que simplifica a configuração do projeto e adiciona bibliotecas de primeira parte. Ele oferece:
- Atualizações over-the-air com **EAS Update**
- Acesso a módulos nativos sem Xcode/Android Studio na maioria dos casos
- Roteamento baseado em arquivos com **Expo Router** (uma alternativa ao React Navigation)
- Interop direto com **SwiftUI** e **Jetpack Compose**

**Este curso usa React Native CLI + React Navigation** — a base da indústria que você encontrará na maioria das codebases em produção. O Expo (incluindo Expo Router) é uma alternativa válida com seus próprios trade-offs; se quiser explorá-lo, a [documentação do Expo](https://docs.expo.dev) é um excelente ponto de partida.

### 5. Uma Linguagem, Duas Plataformas
Escreva TypeScript uma vez. Publique para iOS e Android. Seu Kotlin/Swift fica para os módulos específicos de plataforma que realmente precisam — mas a maior parte da lógica do app é compartilhada.

### 6. Ecossistema Enorme
- **React Navigation** para navegação (ou **Expo Router** se usar Expo)
- **React Query** / **Zustand** / **Jotai** para gerenciamento de estado
- **MMKV** para armazenamento rápido, **Reanimated** para animações, **Skia** para gráficos 2D
- Todo o tooling JavaScript/TypeScript que você já conhece (ESLint, Prettier, Vitest)

### 7. Apoiado por Meta, Microsoft, Shopify e Expo
A Nova Arquitetura foi co-desenvolvida pela Meta e Microsoft. A Shopify reescreveu seu aplicativo principal em RN. O framework não é um projeto paralelo — tem os recursos e a pressão de produção de grandes empresas.

---

## Comparação de Plataformas: A Mesma Tela

Vamos ver uma simples tela "Hello World" nas quatro plataformas:

**Web (React)**
```jsx
// React web
function App() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h1 style={{ color: '#0064d2' }}>Olá, Mundo!</h1>
    </div>
  );
}
```

**Android (Kotlin)**
```kotlin
// activity_main.xml + MainActivity.kt
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        // layout XML define o TextView com gravity="center"
    }
}
```

**iOS (Swift)**
```swift
// SwiftUI
struct ContentView: View {
    var body: some View {
        VStack {
            Spacer()
            Text("Olá, Mundo!")
                .font(.title)
                .foregroundColor(.blue)
            Spacer()
        }
    }
}
```

**React Native (roda em iOS e Android)**
```jsx
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Olá, Mundo!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#0064d2',
    fontWeight: 'bold',
  },
});
```

Observe:
- RN usa `View` em vez de `div`, `Text` em vez de `h1`
- Estilos são objetos JavaScript, não arquivos CSS
- `flex: 1` significa "preencher todo o espaço disponível" — mesmo modelo flexbox do CSS web
- O mesmo arquivo produz um `UILabel` nativo no iOS e um `TextView` nativo no Android

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| RN 0.76 — Anúncio da Nova Arquitetura | Blog Oficial | [reactnative.dev/blog/2024/10/23/release-0.76-new-architecture](https://reactnative.dev/blog/2024/10/23/release-0.76-new-architecture) |
| Mergulho profundo na Nova Arquitetura | Docs Oficiais | [reactnative.dev/architecture/landing-page](https://reactnative.dev/architecture/landing-page) |
| História do RN (Wikipedia) | Referência | [en.wikipedia.org/wiki/React_Native](https://en.wikipedia.org/wiki/React_Native) |
| Expo SDK 56 Changelog | Oficial | [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56) |

---

Próximo → **[Mergulho Profundo na Nova Arquitetura](./new-architecture)**
