---
title: "GitHub Actions para React Native"
sidebar_label: "GitHub Actions"
sidebar_position: 2
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## Estrutura do Pipeline

```
Push / PR
  │
  ├── Lint e Type Check (rápido — 1-2 min)
  ├── Testes Unitários e de Integração (médio — 3-5 min)
  └── Build e Deploy (lento — 10-20 min, só na main/release)
```

---

## Workflow 1: Checks de PR

```yaml
# .github/workflows/pr-check.yml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Instalar dependências
        run: npm ci

      - name: Verificação TypeScript
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0

      - name: Testes unitários
        run: npx jest --ci --coverage --coverageReporters=text-summary
```

---

## Workflow 2: Build e Deploy Android

```yaml
# .github/workflows/android-deploy.yml
name: Android Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }

      - name: Instalar dependências
        run: npm ci

      - uses: actions/setup-java@v4
        with: { java-version: '17', distribution: 'temurin' }

      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ hashFiles('**/*.gradle*') }}

      - name: Decodificar keystore
        run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore

      - name: Build release AAB
        working-directory: android
        run: ./gradlew bundleRelease
        env:
          KEYSTORE_PATH: release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}

      - name: Upload para Play Store (interno)
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
          packageName: com.seuapp
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: internal
          status: completed
```

---

## Secrets Necessários

| Secret | Valor |
|--------|-------|
| `KEYSTORE_BASE64` | `base64 -i release.keystore` |
| `KEYSTORE_PASSWORD` | Senha da keystore |
| `KEY_ALIAS` | Alias da chave |
| `KEY_PASSWORD` | Senha da chave |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Conteúdo do JSON da conta de serviço |

---

## Materiais de Estudo

- [GitHub Actions — Android](https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-android)

---

## Próximo Passo

➡ [EAS Build](./03-eas-build)
