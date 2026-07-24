---
title: "Tratamento de Erros e Monitoramento"
sidebar_label: "Erros e Monitoramento"
sidebar_position: 4
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## O Mesmo Problema, Camada Diferente

Apps Android usam Firebase Crashlytics, Sentry ou Datadog para relatórios de crash. Apps React Native usam os mesmos serviços — mas erros podem originar da camada JS, da camada nativa, ou de ambas.

---

## Sentry para React Native

```bash
npx expo install @sentry/react-native
npx sentry-wizard -i reactNative -p android
```

```typescript
// App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://seu-dsn@sentry.io/project-id',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  enabled: !__DEV__,
});

export default Sentry.wrap(App);
```

---

## Capturando Erros Manualmente

```typescript
async function loadUserProfile(id: string) {
  try {
    return await userApi.getById(id);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'profile', userId: id },
      extra: { endpoint: `/users/${id}` },
    });
    return null;
  }
}

// Breadcrumbs — como logs do Timber que aparecem em relatórios de crash
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'Navegou para ProductDetail',
  data: { productId: '123' },
  level: 'info',
});
```

---

## Contexto do Usuário

```typescript
// Definir após login
Sentry.setUser({ id: user.id, email: user.email, username: user.name });

// Limpar ao fazer logout
Sentry.setUser(null);
```

---

## Tipos de Erro Estruturados

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Sem conexão com a internet') {
    super(message);
    this.name = 'NetworkError';
  }
}

// Interceptor axios — lança erros tipados
api.interceptors.response.use(
  response => response,
  error => {
    if (!error.response) throw new NetworkError();
    if (error.response.status === 401) throw new AuthError();
    throw new ApiError(
      error.response.data?.message ?? 'Requisição falhou',
      error.response.status,
      error.config.url,
    );
  }
);
```

---

## Handler de Erro Global

```typescript
import { ErrorUtils } from 'react-native';

const originalHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error, isFatal) => {
  Sentry.captureException(error, { tags: { fatal: String(isFatal) } });
  originalHandler?.(error, isFatal);
});
```

---

## Materiais de Estudo

- [Sentry — React Native](https://docs.sentry.io/platforms/react-native/)
- [React Native — Tratamento de Erros](https://reactnative.dev/docs/error-handling)

---

## Próximo Passo

➡ [Acessibilidade](./05-accessibility)
