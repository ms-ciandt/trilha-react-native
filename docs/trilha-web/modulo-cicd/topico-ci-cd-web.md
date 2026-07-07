---
title: CI/CD
---

# Topic — CI/CD (Web Track)

### Topic Goal

By the end, you should be able to:

- Explain that in RN there are:
  - A JS bundle build.
  - A native app build (Android/iOS).
- Configure a simple CI pipeline (e.g. GitHub Actions) that:
  - Runs lint.
  - Runs tests.
  - Builds Android.
- Interpret Android build failures coming from `./gradlew`.

---

### Video Demonstration

<video width="100%" max-width="800px" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/assets/videos/Web_to_RN_CI_CD_Pipelines_-_web.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

### Typical Flow: from Web CI to RN CI

On the web:

- `npm ci`
- `npm run lint`
- `npm test`
- `npm run build`

In RN (Android):

- `npm ci`
- `npm run lint`
- `npm test`
- `cd android && ./gradlew assembleRelease`

GitHub Actions example:

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

### Hands-on Exercise

1. Take a CI workflow you already use in a web project:
   - Checkout.
   - Setup Node.
   - `npm ci`, lint, tests.
2. Adapt it for RN:
   - Adding an Android build step.
   - Uploading an APK artifact.
3. Document for the team:
   - Where to find the generated APK.
   - How to interpret build errors (Gradle log).

---

### Study Materials

- Blog: *GitHub Actions for React Native*
- Guide: *From React Web CI to React Native CI*
- Docs: Gradle, Android build basics

---

Next → **[Architecture](../modulo-arquitetura/topico-arquitetura-web)**