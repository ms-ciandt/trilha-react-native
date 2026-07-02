# Tópico — Noções de Integração Nativa (Trilha Web)

### Objetivo do tópico

Ao final, o dev deve conseguir:

- Explicar em alto nível o que é um **Native Module** e um **Native UI Component**
- Saber em quais casos precisa envolver o time nativo (SDKs proprietários, APIs específicas de sistema)
- Consumir um módulo nativo existente via `NativeModules`
- Ler e interpretar erros vindos da camada nativa (stacktrace no Android/iOS)
- Ter vocabulário para discutir integrações com devs Android/iOS

---

### Mapeamento: Web → React Native / Nativo

| Conceito Web                  | React Native / Nativo               | Observação                                                                 |
|-------------------------------|-------------------------------------|----------------------------------------------------------------------------|
| SDK JS (biblioteca npm)       | SDK nativo + bridge                 | Implementação em Kotlin/Swift exposta como funções JS                     |
| Componentes React             | Native UI Components                | API de props/eventos é React; implementação e renderização são nativas   |
| Eventos DOM                   | Eventos via bridge                  | Eventos gerados na camada nativa e recebidos no JS                        |
| Build web (webpack, vite)     | Metro + build Android/iOS           | JS bundle + binários nativos (APK/IPA)                                   |
| API de browser (localStorage) | APIs de plataforma (Android/iOS)    | RN acessa via módulos nativos ou libs que usam código nativo internamente |

---

### Conceitos centrais

#### Native Modules (consumo do ponto de vista Web)

Um **Native Module** é visto em JS como um objeto em `NativeModules`:

```tsx
import { NativeModules } from 'react-native';

const { AppEnv } = NativeModules;

// AppEnv foi implementado em código nativo (Android/iOS).
// Aqui você só consome seus métodos JS.
```

Os métodos são assíncronos na maioria dos casos (Promise-based):

```tsx
type Environment = 'dev' | 'staging' | 'prod';

async function getEnvironment(): Promise<Environment> {
  if (!AppEnv) {
    throw new Error('AppEnv module not available');
  }

  return AppEnv.getEnvironment();
}
```

Você não precisa saber Kotlin/Swift para isso — apenas:
- Nome do módulo (`AppEnv`).
- Métodos disponíveis (`getEnvironment`, `getBuildNumber`, etc.).
- Tipos esperados de retorno (combinado com o time nativo).

---

#### Native UI Components (consumo do ponto de vista Web)

Um **Native UI Component** é um componente React cuja implementação é nativa.

```tsx
import { requireNativeComponent } from 'react-native';

type MyNativeChartProps = {
  data: number[];
  color?: string;
};

const MyNativeChart = requireNativeComponent<MyNativeChartProps>('MyNativeChart');

export function SalesChart() {
  return <MyNativeChart data={[10, 20, 30]} color="#3366FF" />;
}
```

Você usa `<MyNativeChart />` como qualquer outro componente React.  
A diferença está em:

- Quem implementa `MyNativeChart` é o time nativo (Android/iOS).
- Problemas de layout/performance podem vir da implementação nativa.
- Props e eventos disponíveis são definidos pela equipe nativa.

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

Construa um pequeno módulo de integração (do ponto de vista JS), assumindo que o time nativo já criou `NativeModules.AppEnv` com:

- `getEnvironment(): 'dev' | 'staging' | 'prod'`
- `getBuildNumber(): string`

1. Implemente um serviço JS:

   ```tsx
   import { NativeModules } from 'react-native';

   const { AppEnv } = NativeModules;

   type Environment = 'dev' | 'staging' | 'prod';

   export async function loadAppEnv() {
     if (!AppEnv) {
       throw new Error('AppEnv module not available');
     }

     const env: Environment = await AppEnv.getEnvironment();
     const buildNumber: string = await AppEnv.getBuildNumber();

     return { env, buildNumber };
   }
   ```

2. Implemente um hook `useAppEnv()` que:
   - Carrega essas informações na montagem.
   - Exibe um banner diferente para `dev` vs `prod`.

3. Trate o caso de erro (módulo ausente ou falha de chamada) exibindo uma mensagem padrão em dev.

---

### Materiais de estudo

- [Native Modules Overview — React Native Docs](https://reactnative.dev/docs/native-modules-intro)
- Artigo: *React Native for Web Developers — Understanding Native Integration*
- Vídeo: *Native Modules for React Developers (Conceptual Overview)*
