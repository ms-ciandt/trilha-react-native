---
title: "Detox: E2E Tests on Android"
sidebar_label: "Detox E2E"
sidebar_position: 5
---

## Video Overview

> Video for this topic coming soon.

## Espresso → Detox

Detox is the E2E testing framework for React Native — the equivalent of Espresso (UI Automator) for Android. It runs your app on a real emulator or device, drives real gestures, and asserts on real UI state.

| Espresso / UI Automator | Detox |
|------------------------|-------|
| `onView(withId(...))` | `element(by.id('testID'))` |
| `onView(withText(...))` | `element(by.text('Hello'))` |
| `.perform(click())` | `.tap()` |
| `.perform(typeText("..."))` | `.typeText('...')` |
| `.check(matches(isDisplayed()))` | `.toBeVisible()` |
| `waitFor { ... }` | `waitFor(element(...)).toBeVisible().withTimeout(3000)` |
| `ActivityScenario.launch()` | `device.launchApp()` |
| `Intents.intended(...)` | `device.openURL(...)` |

---

## Installation

```bash
npm install --save-dev detox detox-cli @config-plugins/detox
npx detox init
```

### `.detoxrc.js`

```js
module.exports = {
  testRunner: {
    args: { $0: 'jest', config: 'e2e/jest.config.js' },
    jest: { setupTimeout: 120000 },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_7_API_34' },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};
```

---

## Writing E2E Tests

```typescript
// e2e/login.test.ts
describe('Login flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows login screen on launch', async () => {
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('submit-button'))).toBeVisible();
  });

  it('logs in with valid credentials', async () => {
    await element(by.id('email-input')).typeText('gui@example.com');
    await element(by.id('password-input')).typeText('pass123');
    await element(by.id('submit-button')).tap();

    // Wait for navigation to home
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('shows error with invalid credentials', async () => {
    await element(by.id('email-input')).typeText('bad@example.com');
    await element(by.id('password-input')).typeText('wrong');
    await element(by.id('submit-button')).tap();

    await waitFor(element(by.text('Invalid credentials')))
      .toBeVisible()
      .withTimeout(3000);
  });
});
```

---

## Common Actions

```typescript
// Tap
await element(by.id('button')).tap();

// Long press — like Espresso's longClick()
await element(by.id('card')).longPress();

// Type text
await element(by.id('input')).typeText('Hello');
await element(by.id('input')).clearText();
await element(by.id('input')).replaceText('New text');

// Scroll
await element(by.id('scrollView')).scroll(200, 'down');
await element(by.id('scrollView')).scrollTo('bottom');

// Swipe — like ViewActions.swipeLeft()
await element(by.id('card')).swipe('left', 'fast', 0.8);

// Multi-tap
await element(by.id('button')).multiTap(2);
```

---

## Running Tests

```bash
# Build the app first
npx detox build --configuration android.emu.debug

# Run tests on emulator
npx detox test --configuration android.emu.debug

# Run a single test file
npx detox test --configuration android.emu.debug e2e/login.test.ts

# Run in CI (no interactive output)
npx detox test --configuration android.emu.release --headless
```

---

## Study Materials

- [Detox — Getting Started](https://wix.github.io/Detox/docs/introduction/getting-started)
- [Detox — Android Setup](https://wix.github.io/Detox/docs/introduction/android)
- [Detox — API Reference](https://wix.github.io/Detox/docs/api/actions-on-element)

### Videos

- [React Native School — Detox E2E Testing](https://www.youtube.com/watch?v=cbQL4Y0rTJc)

---

## Module Summary

| Topic | What you covered |
|-------|-----------------|
| Jest & Unit Tests | Pure functions, async, mocking, Zustand stores |
| RNTL | Component rendering, queries, events, async |
| Mocking Native | TurboModules, Expo modules, navigation mocks |
| Integration Tests | Full screens with MSW, real state |
| Detox E2E | Real device gestures, navigation flows |
