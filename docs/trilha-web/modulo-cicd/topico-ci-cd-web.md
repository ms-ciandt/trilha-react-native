---
title: CI/CD
---

# Tópico — CI/CD (Trilha Web)

### Objetivo do tópico

Ao final, o dev deve conseguir:

- Explicar que em RN há:
  - Build do bundle JS.
  - Build do app nativo (Android/iOS).
- Configurar uma pipeline simples em CI (por exemplo GitHub Actions) que:
  - Roda lint.
  - Roda testes.
  - Faz build Android.
- Interpretar falhas de build Android provenientes de `./gradlew`.

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Web_to_RN_CI_CD_Pipelines_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Fluxo típico: de CI web para CI RN

Na web:

- `npm ci`
- `npm run lint`
- `npm test`
- `npm run build`

Em RN (Android):

- `npm ci`
- `npm run lint`
- `npm test`
- `cd android && ./gradlew assembleRelease`

Exemplo GitHub Actions:

```yaml
name: React Native CI (Web Dev Edition)

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  build-android:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build Android
        run: cd android && ./gradlew assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
```

---

### Exercício prático

1. Pegue um workflow de CI que você já usa em projeto web:
   - Checkout.
   - Setup Node.
   - `npm ci`, lint, tests.
2. Adapte para RN:
   - Adicionando etapa de build Android.
   - Upload de artefato APK.
3. Documente para o time:
   - Onde encontrar o APK gerado.
   - Como interpretar erros de build (log do Gradle).

---

### Materiais de estudo

- Blog: *GitHub Actions for React Native*
- Guia: *From React Web CI to React Native CI*
- Docs: Gradle, Android build basics
