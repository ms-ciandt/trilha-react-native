---
title: "Detox: Testes E2E no Android"
sidebar_label: "Detox E2E"
sidebar_position: 5
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## Espresso → Detox

| Espresso / UI Automator | Detox |
|------------------------|-------|
| `onView(withId(...))` | `element(by.id('testID'))` |
| `onView(withText(...))` | `element(by.text('Texto'))` |
| `.perform(click())` | `.tap()` |
| `.perform(typeText("..."))` | `.typeText('...')` |
| `.check(matches(isDisplayed()))` | `.toBeVisible()` |
| `waitFor { ... }` | `waitFor(element(...)).toBeVisible().withTimeout(3000)` |
| `ActivityScenario.launch()` | `device.launchApp()` |

---

## Escrevendo Testes E2E

```typescript
// e2e/login.test.ts
describe('Fluxo de Login', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('exibe tela de login ao abrir o app', async () => {
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('submit-button'))).toBeVisible();
  });

  it('faz login com credenciais válidas', async () => {
    await element(by.id('email-input')).typeText('gui@example.com');
    await element(by.id('password-input')).typeText('pass123');
    await element(by.id('submit-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('exibe erro com credenciais inválidas', async () => {
    await element(by.id('email-input')).typeText('errado@example.com');
    await element(by.id('password-input')).typeText('errado');
    await element(by.id('submit-button')).tap();

    await waitFor(element(by.text('Credenciais inválidas')))
      .toBeVisible()
      .withTimeout(3000);
  });
});
```

---

## Ações Comuns

```typescript
await element(by.id('button')).tap();
await element(by.id('button')).longPress();
await element(by.id('input')).typeText('Olá');
await element(by.id('input')).clearText();
await element(by.id('scrollView')).scroll(200, 'down');
await element(by.id('scrollView')).scrollTo('bottom');
await element(by.id('card')).swipe('left', 'fast', 0.8);
```

---

## Executando os Testes

```bash
# Build do app
npx detox build --configuration android.emu.debug

# Rodar testes no emulador
npx detox test --configuration android.emu.debug

# Rodar um arquivo específico
npx detox test --configuration android.emu.debug e2e/login.test.ts
```

---

## Materiais de Estudo

- [Detox — Primeiros Passos](https://wix.github.io/Detox/docs/introduction/getting-started)
- [Detox — Configuração Android](https://wix.github.io/Detox/docs/introduction/android)

---

## Resumo do Módulo

| Tópico | O que você cobriu |
|--------|------------------|
| Jest e Testes Unitários | Funções puras, async, mocking, Zustand |
| RNTL | Renderização, queries, eventos, async |
| Mockando Nativos | TurboModules, Expo modules, navegação |
| Testes de Integração | Telas completas com MSW, estado real |
| Detox E2E | Gestos em dispositivo real, fluxos de navegação |
