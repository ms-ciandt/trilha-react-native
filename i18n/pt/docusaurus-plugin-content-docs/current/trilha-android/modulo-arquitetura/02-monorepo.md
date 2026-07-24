---
title: "Monorepo com Turborepo"
sidebar_label: "Monorepo"
sidebar_position: 2
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## Por que um Monorepo para React Native

Um monorepo permite compartilhar tipos TypeScript, lógica de negócio, clientes de API e design tokens entre o app React Native, um app web e um backend — em um único repositório com uma única versão de cada dependência.

A analogia Android: um projeto Gradle multi-módulo onde `:core`, `:data` e `:ui` são módulos Gradle separados no mesmo repositório, compartilhando interfaces.

---

## Estrutura

```
apps/
  mobile/          ← App React Native (Expo)
  web/             ← App Next.js ou React web
packages/
  ui/              ← Componentes compartilhados
  api-client/      ← Cliente axios compartilhado + tipos TypeScript
  utils/           ← Utilitários puros compartilhados
  config/          ← Configs ESLint, TypeScript compartilhadas
turbo.json
package.json       ← raiz do workspace
```

---

## Configuração

```bash
npx create-turbo@latest meu-app
```

```json
// turbo.json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

---

## Pacote Compartilhado: api-client

```typescript
// packages/api-client/src/types.ts
export interface User {
  id: string;
  name: string;
  email: string;
}
```

```typescript
// packages/api-client/src/userApi.ts
import axios from 'axios';
import type { User } from './types';

const client = axios.create({ baseURL: process.env.API_URL });

export const userApi = {
  getAll: () => client.get<User[]>('/users').then(r => r.data),
  getById: (id: string) => client.get<User>(`/users/${id}`).then(r => r.data),
};
```

No app mobile:

```typescript
import { userApi } from '@meu-app/api-client';
import type { User } from '@meu-app/api-client';
```

---

## Configuração do Metro para Monorepo

```js
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
```

---

## Executando Comandos

```bash
turbo dev --filter=mobile       # só o app mobile
turbo test                      # todos os pacotes
turbo build                     # tudo (respeita ordem de dependência)
turbo lint --filter=[HEAD^1]    # só pacotes alterados
```

---

## Materiais de Estudo

- [Turborepo — Primeiros Passos](https://turbo.build/repo/docs)
- [Expo — Configuração de Monorepo](https://docs.expo.dev/guides/monorepos/)

---

## Próximo Passo

➡ [Estado em Escala](./03-state-management-at-scale)
