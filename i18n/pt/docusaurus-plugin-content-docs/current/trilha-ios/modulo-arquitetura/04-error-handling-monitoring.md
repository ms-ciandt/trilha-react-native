---
title: Error Handling and Monitoring
---

# Tratamento de Erros e Monitoramento

O Swift oferece garantias fortes em tempo de compilacao sobre propagacao de erros: `throws`, `Result<T, E>` e erros tipados capturam problemas antes que eles cheguem a producao. O React Native move boa parte dessa disciplina para o tempo de execucao, mas os padroes se correspondem bem assim que voce entende os equivalentes. Este arquivo cobre toda a pilha — do modelamento tipado de erros em TypeScript ate a simbolizacao de crashes em producao.

## Swift Result<T, E> para TypeScript

Em Swift voce modela operacoes falhaveis com `Result`:

```swift
enum NetworkError: Error {
    case unauthorized
    case notFound(String)
    case serverError(Int)
}

func fetchUser(id: String) async -> Result<User, NetworkError> {
    // ...
}
```

O TypeScript nao possui sum types nativos, mas voce pode replicar o mesmo padrao:

```typescript
type NetworkError =
  | { kind: 'unauthorized' }
  | { kind: 'notFound'; resource: string }
  | { kind: 'serverError'; code: number };

type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function fetchUser(id: string): Promise<Result<User, NetworkError>> {
  const response = await fetch(`/users/${id}`);

  if (response.status === 401) {
    return { ok: false, error: { kind: 'unauthorized' } };
  }
  if (response.status === 404) {
    return { ok: false, error: { kind: 'notFound', resource: id } };
  }
  if (!response.ok) {
    return { ok: false, error: { kind: 'serverError', code: response.status } };
  }

  const user: User = await response.json();
  return { ok: true, value: user };
}
```

O consumo do resultado e exaustivo quando voce usa um switch com um discriminante:

```typescript
const result = await fetchUser(userId);

if (!result.ok) {
  switch (result.error.kind) {
    case 'unauthorized':
      navigateToLogin();
      break;
    case 'notFound':
      showNotFound(result.error.resource);
      break;
    case 'serverError':
      showRetryPrompt(result.error.code);
      break;
  }
  return;
}

renderUser(result.value);
```

Este e o equivalente em TypeScript do `switch` exaustivo do Swift sobre um enum — o compilador sinaliza casos nao tratados se voce configurar `noImplicitReturns` e manter a uniao fechada.

## Error Boundaries

O Swift nao possui contencao de erros em nivel de arvore de componentes porque UIKit e SwiftUI nao expoe esse mecanismo. O React Native herda o mecanismo de Error Boundary do React, que captura erros de renderizacao lancados por qualquer componente filho e permite renderizar uma UI de fallback em vez de travar toda a tela.

Um error boundary e um componente de classe que implementa `componentDidCatch`:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
```

Envolva telas ou modulos de funcionalidade no limite onde um erro deve ser contido:

```tsx
<ErrorBoundary
  fallback={<ScreenError message="Something went wrong" />}
  onError={(error, info) => Sentry.captureException(error, { extra: { componentStack: info.componentStack } })}
>
  <ProfileScreen />
</ErrorBoundary>
```

Error boundaries nao capturam erros em handlers de eventos, codigo assicrono ou modulos nativos — esses casos requerem try/catch ou o padrao Result descrito acima.

## SDK do Sentry para React Native

O Sentry para React Native usa o mesmo DSN que sua integracao nativa do Sentry para iOS. Se seu app iOS ja reporta para um projeto Sentry, voce pode rotear os crashes do React Native para o mesmo projeto — o dashboard exibe eventos nativos e JS lado a lado.

Instalacao:

```bash
npx expo install @sentry/react-native
```

Inicialize no ponto de entrada do seu app, antes de qualquer outro codigo ser executado:

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://<key>@sentry.io/<project>',
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  tracesSampleRate: 0.2,
  profilesSampleRate: 0.1,
  attachScreenshot: true,
  enableNativeCrashHandling: true,
});
```

`enableNativeCrashHandling: true` conecta ao mesmo reporter de crashes nativo que o SDK Sentry Cocoa usa. Um unico DSN cobre os dois lados.

### Error Boundary com Sentry

Combine os dois para que erros de renderizacao nao capturados sejam reportados automaticamente:

```typescript
export class SentryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    Sentry.withScope((scope) => {
      scope.setExtra('componentStack', info.componentStack);
      scope.setTag('boundary', 'render');
      Sentry.captureException(error);
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <FullScreenError error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

Para erros fora da renderizacao (rede, logica de negocio), chame `Sentry.captureException` diretamente:

```typescript
try {
  await submitOrder(cart);
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: 'checkout' },
    extra: { cartItemCount: cart.items.length },
  });
  showErrorToast('Order failed. Please try again.');
}
```

## Integracao com Crashlytics

Se seu projeto usa Firebase Crashlytics junto ou no lugar do Sentry:

```bash
npx expo install @react-native-firebase/app @react-native-firebase/crashlytics
```

Reporte erros nao fatais:

```typescript
import crashlytics from '@react-native-firebase/crashlytics';

function reportNonFatal(error: Error, context: Record<string, string> = {}): void {
  Object.entries(context).forEach(([key, value]) => {
    crashlytics().setAttribute(key, value);
  });
  crashlytics().recordError(error);
}
```

Marque um limite fatal (sera exibido como fatal no dashboard do Crashlytics):

```typescript
function reportFatal(error: Error): never {
  crashlytics().setAttribute('fatal', 'true');
  crashlytics().recordError(error);
  throw error; // re-throw para propagar normalmente
}
```

A distincao entre fatal e nao fatal espelha o que voce faz com o SDK do Crashlytics para iOS: `Crashlytics.crashlytics().record(error:)` para nao fatais, deixando o processo realmente travar para os fatais.

## Simbolizacao de Crashes do Hermes

O Hermes compila JavaScript para bytecode em tempo de build. Quando um crash ocorre em producao, o stack trace referencia offsets de bytecode — nao os numeros de linha originais do seu TypeScript. A simbolizacao requer dois artefatos:

- Bundle `.dSYM` do build nativo do iOS (para os frames do engine Hermes)
- Source map gerado durante o build do bundle JS (para os frames do seu proprio JS)

Faca upload de ambos para o Sentry usando o `sentry-cli`:

```bash
# Construir o bundle JS e o source map
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --sourcemap-output ios/main.jsbundle.map

# Upload do source map
sentry-cli releases files <release-version> upload-sourcemaps \
  --dist <build-number> \
  ios/main.jsbundle.map \
  --rewrite

# Upload do dSYM (produzido pelo archive do Xcode)
sentry-cli upload-dif --org <org> --project <project> path/to/dSYMs/
```

No seu pipeline de CI (Fastlane ou GitHub Actions), execute essas etapas apos cada build de producao. O script de fase de build do Xcode que o SDK do Sentry instala cuida do upload do `.dSYM` automaticamente se voce o mantiver habilitado — o upload do source map e a adicao especifica do React Native.

## Estrategia de Retry para Erros de Rede com TanStack Query

`os_unfair_lock` e logica de retry no URLSession requerem implementacao manual em Swift. O TanStack Query fornece isso de forma declarativa:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    retry: (failureCount, error) => {
      // Nao tentar novamente em erros do cliente
      if (error instanceof NetworkError && error.statusCode < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
  });
}
```

`retryDelay` com backoff exponencial espelha o que voce implementaria manualmente com `DispatchQueue.asyncAfter` em Swift. O limite de 30 segundos evita retries descontrolados em conexoes instáveis.

Para mutations (operacoes de escrita), faça retry apenas em requisicoes idempotentes:

```typescript
const submitOrder = useMutation({
  mutationFn: postOrder,
  retry: 0, // pedidos nao sao idempotentes — nunca fazer retry automatico
  onError: (error) => {
    Sentry.captureException(error, { tags: { operation: 'submitOrder' } });
    showErrorBanner('Order could not be submitted.');
  },
});
```

## Logging: os.log para console.log com Logging Remoto

Em Swift, `os.log` grava logs estruturados no sistema de logging unificado, visiveis no Console.app com filtragem por subsystem e category. O React Native nao possui um sistema equivalente nativo, mas voce pode aplicar a mesma disciplina sobre o `console`:

```typescript
type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'fault';

interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warning(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  fault(message: string, error: Error, meta?: Record<string, unknown>): void;
}

function createLogger(subsystem: string, category: string): Logger {
  const prefix = `[${subsystem}/${category}]`;

  return {
    debug: (message, meta) => {
      if (__DEV__) console.debug(prefix, message, meta ?? '');
    },
    info: (message, meta) => {
      console.info(prefix, message, meta ?? '');
    },
    warning: (message, meta) => {
      console.warn(prefix, message, meta ?? '');
      Sentry.addBreadcrumb({ level: 'warning', message, data: meta, category });
    },
    error: (message, error, meta) => {
      console.error(prefix, message, error, meta ?? '');
      if (error) Sentry.captureException(error, { extra: meta });
    },
    fault: (message, error, meta) => {
      console.error(prefix, '[FATAL]', message, error, meta ?? '');
      Sentry.captureException(error, {
        level: 'fatal',
        tags: { fatal: 'true' },
        extra: meta,
      });
    },
  };
}

// Uso espelha a convencao de subsystem/category do os.log
export const networkLogger = createLogger('com.myapp', 'network');
export const authLogger = createLogger('com.myapp', 'auth');
```

### Integracao com Datadog RUM

O SDK do Datadog para React Native integra-se com RUM (Real User Monitoring) da mesma forma que o SDK do Datadog para iOS:

```typescript
import { DdSdkReactNative, DdSdkReactNativeConfiguration, DdLogs } from '@datadog/mobile-react-native';

const config = new DdSdkReactNativeConfiguration(
  '<client-token>',
  '<environment>',
  '<application-id>',
  true,  // rastrear interacoes do usuario
  true,  // rastrear recursos
  true,  // rastrear erros
);

await DdSdkReactNative.initialize(config);

// Log em varios niveis — roteado para o Datadog Log Management
DdLogs.info('User signed in', { userId });
DdLogs.error('Payment failed', { orderId, reason: error.message });
```

Se seu time ja usa o Datadog para iOS, o mesmo nome de servico e tags de ambiente produzem uma visao unificada entre sessoes nativas e React Native.

## Classificacao entre Fatal e Nao Fatal

A classificacao que importa no seu dashboard de monitoramento:

| Categoria | Exemplos | Acao |
|---|---|---|
| Nao fatal | Timeout de rede, erro de validacao, 404 | Logar, reportar ao Sentry como nao fatal, exibir erro inline |
| Fatal (JS) | Excecao nao capturada, crash de renderizacao sem boundary | Capturado pelo handler global do Sentry, app pode se recuperar |
| Fatal (nativo) | Crash de modulo nativo, OOM | Simbolizacao via `.dSYM` necessaria, Crashlytics registra |

Para erros nao fatais, sempre apresente opcoes de recuperacao ao usuario e registre contexto suficiente para reproduzir o problema. Para erros fatais, deixe os handlers globais capturar o crash e concentre o esforco de engenharia em reduzir sua frequencia por meio de error boundaries proativos e padroes de Result tipados nas bordas da sua camada de dados.

O principio e o mesmo que em Swift: empurre o tratamento de erros ate o limite onde voce pode realmente responder a ele, e deixe os erros tipados fluir pelo meio do seu call stack sem engolir silenciosamente.
