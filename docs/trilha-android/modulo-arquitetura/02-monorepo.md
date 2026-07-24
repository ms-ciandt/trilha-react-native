---
title: "Monorepo with Turborepo"
sidebar_label: "Monorepo"
sidebar_position: 2
---

## Video Overview

> Video for this topic coming soon.

## Why a Monorepo for React Native

A monorepo lets you share TypeScript types, business logic, API clients, and design tokens between your React Native app, a web app, and a backend — in a single repository with a single version of each dependency.

The Android analogy: a multi-module Gradle project where `:core`, `:data`, and `:ui` modules are separate Gradle modules in the same repo, sharing interfaces.

---

## Structure

```
apps/
  mobile/          ← React Native app (Expo)
  web/             ← Next.js or React web app
packages/
  ui/              ← Shared components (RN + web with react-native-web)
  api-client/      ← Shared axios client + TypeScript types
  utils/           ← Shared pure utilities
  config/          ← Shared ESLint, TypeScript configs
turbo.json
package.json       ← workspace root
```

---

## Setup

```bash
# Create a Turborepo monorepo
npx create-turbo@latest my-app
cd my-app

# Or add Turborepo to an existing project
npm install turbo --save-dev
```

Root `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "turbo": "latest"
  }
}
```

`turbo.json`:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## Shared Package Example: api-client

```
packages/api-client/
  src/
    index.ts
    types.ts
    userApi.ts
    productApi.ts
  package.json
  tsconfig.json
```

```typescript
// packages/api-client/src/types.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
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

```json
// packages/api-client/package.json
{
  "name": "@my-app/api-client",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

In the mobile app:

```json
// apps/mobile/package.json
{
  "dependencies": {
    "@my-app/api-client": "*"
  }
}
```

```typescript
// apps/mobile/src/screens/UserListScreen.tsx
import { userApi } from '@my-app/api-client';
import type { User } from '@my-app/api-client';
```

---

## Metro Config for Monorepo

Metro needs to know about the monorepo's workspace packages:

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

## Running Commands

```bash
# Run dev server for the mobile app only
turbo dev --filter=mobile

# Run tests across all packages
turbo test

# Build everything (respects dependency order)
turbo build

# Run lint only on changed packages
turbo lint --filter=[HEAD^1]
```

---

## Study Materials

- [Turborepo — Getting Started](https://turbo.build/repo/docs)
- [Expo — Monorepo Setup](https://docs.expo.dev/guides/monorepos/)
- [React Native — Metro with Workspaces](https://metrobundler.dev/docs/configuration#watchfolders)

---

## What's Next

Monorepo set up. Next: state management at scale — patterns for large apps with many features and teams.

➡ [State Management at Scale](./03-state-management-at-scale)
