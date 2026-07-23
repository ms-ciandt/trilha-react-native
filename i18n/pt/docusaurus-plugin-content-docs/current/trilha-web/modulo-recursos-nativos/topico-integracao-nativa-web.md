---
title: Integração Nativa
---

# Tópico — Noções de Integração Nativa (Trilha Web)

### Objetivo do tópico

Ao final, o dev deve conseguir:

- Explicar em alto nível o que é um **Native Module** e um **Native UI Component**
- Saber em quais casos precisa envolver o time nativo (SDKs proprietários, APIs específicas de sistema)
- Consumir um TurboModule existente via `TurboModuleRegistry`
- Ler e interpretar erros vindos da camada nativa (stacktrace no Android/iOS)
- Ter vocabulário para discutir integrações com devs Android/iOS

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Native_Web_Integration_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Mapeamento: Web → React Native / Nativo

| Conceito Web                  | React Native / Nativo               | Observação                                                                 |
|-------------------------------|-------------------------------------|----------------------------------------------------------------------------|
| SDK JS (biblioteca npm)       | TurboModule                         | Implementação em Kotlin/Swift exposta via JSI — tipada e lazy-loaded      |
| Componentes React             | Fabric Native Components            | API de props/eventos é React; renderização é nativa via Fabric            |
| Eventos DOM                   | EventEmitter tipado (spec)          | Eventos gerados na camada nativa recebidos via subscription tipada        |
| Build web (webpack, vite)     | Metro + build Android/iOS           | JS bundle + binários nativos (APK/IPA)                                   |
| API de browser (localStorage) | APIs de plataforma (Android/iOS)    | RN acessa via TurboModules ou libs que usam código nativo internamente    |

---

### Conceitos centrais

#### TurboModules (consumo do ponto de vista Web)

Um **TurboModule** é acessado via `TurboModuleRegistry` — tipado em TypeScript, carregado via JSI sem serialização JSON:

```tsx
// src/native/NativeAppEnv.ts  (spec TypeScript — alimenta o Codegen)
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  getEnvironment(): Promise<string>;
  getBuildNumber(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AppEnv');
```

```tsx
// src/native/appEnv.ts  (wrapper tipado usado pelo restante do app)
import NativeAppEnv from './NativeAppEnv';

type Environment = 'dev' | 'staging' | 'prod';

export function getEnvironment(): Promise<Environment> {
  return NativeAppEnv.getEnvironment() as Promise<Environment>;
}

export function getBuildNumber(): Promise<string> {
  return NativeAppEnv.getBuildNumber();
}
```

Você não precisa saber Kotlin/Swift para isso — apenas:
- Nome do módulo (`AppEnv`).
- Spec TypeScript acordada com o time nativo.
- Tipos de retorno definidos na interface `Spec`.

---

#### Fabric Native Components (consumo do ponto de vista Web)

Um **Fabric Native Component** é um componente React cuja renderização é feita pelo renderizador Fabric na camada nativa.

```tsx
// src/native/NativeMyChart.ts  (spec TypeScript — alimenta o Codegen)
import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type NativeProps = ViewProps & {
  data: ReadonlyArray<number>;
  color?: string;
};

export default codegenNativeComponent<NativeProps>('MyChart') as HostComponent<NativeProps>;
```

```tsx
// Uso em uma tela
import NativeMyChart from '../native/NativeMyChart';

export function SalesChart() {
  return <NativeMyChart data={[10, 20, 30]} color="#3366FF" />;
}
```

Você usa `<NativeMyChart />` como qualquer outro componente React.
A diferença está em:

- Quem implementa `MyChart` é o time nativo (Android/iOS) usando a spec Codegen.
- Problemas de layout/performance podem vir da implementação nativa.
- Props e eventos disponíveis são definidos na spec TypeScript acordada com a equipe nativa.

---

### Erros vindos do nativo (stacktrace)

Em RN, stacktraces podem vir da camada JS ou da camada nativa:

- Erros JS: geralmente apontam para arquivos `.js/.tsx` no stack.
- Erros nativos: podem aparecer com mensagens de Android (`java.lang...`) ou iOS (`-[UIView ...]` etc.)

Seu papel como dev web:

- Conseguir identificar quando o erro **não é** JS puro.
- Ter info mínima para passar para o time nativo:
  - Tela/fluxo onde aconteceu.
  - Passos para reproduzir.
  - Stacktrace completo (Android Logcat / Xcode console).

---

### Exercício prático

Construa um pequeno módulo de integração (do ponto de vista JS), assumindo que o time nativo já implementou o TurboModule `AppEnv` com a spec:

- `getEnvironment(): Promise<string>` — retorna `'dev' | 'staging' | 'prod'`
- `getBuildNumber(): Promise<string>`

1. Implemente a spec e o wrapper:

   ```tsx
   // src/native/NativeAppEnv.ts
   import { TurboModuleRegistry } from 'react-native';
   import type { TurboModule } from 'react-native';

   export interface Spec extends TurboModule {
     getEnvironment(): Promise<string>;
     getBuildNumber(): Promise<string>;
   }

   export default TurboModuleRegistry.getEnforcing<Spec>('AppEnv');
   ```

   ```tsx
   // src/native/appEnv.ts
   import NativeAppEnv from './NativeAppEnv';

   type Environment = 'dev' | 'staging' | 'prod';

   export async function loadAppEnv() {
     const env = (await NativeAppEnv.getEnvironment()) as Environment;
     const buildNumber = await NativeAppEnv.getBuildNumber();
     return { env, buildNumber };
   }
   ```

2. Implemente um hook `useAppEnv()` que:
   - Carrega essas informações na montagem.
   - Exibe um banner diferente para `dev` vs `prod`.

3. Trate o caso de erro (falha de chamada) exibindo uma mensagem padrão em dev.

---

### Materiais de estudo

- [TurboModules Introduction — React Native Docs](https://reactnative.dev/docs/turbo-native-modules-introduction)
- [Fabric Native Components — React Native Docs](https://reactnative.dev/docs/fabric-native-components-introduction)
- Artigo: *React Native for Web Developers — Understanding Native Integration*
- Vídeo: *Native Modules for React Developers (Conceptual Overview)*

---

Next → **[Performance Mobile](../modulo-performance/topico-performance-mobile-web)**
