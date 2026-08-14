---
title: E2E Tests with Detox
---

# E2E Tests with Detox

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/test_05_detox-e2e.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

If you come from native iOS development, you already know XCUITest: a framework that automates real UI interactions, simulating what a user would do on an iPhone or iPad. Detox occupies exactly that space in the React Native ecosystem. It controls a real iOS Simulator, taps elements, types text, scrolls lists, and verifies the visual state of the interface — all from tests written in JavaScript or TypeScript.

The major difference from XCUITest is that Detox runs the same tests on Android too, without rewriting anything. Additionally, since the tests are written in JS, they live alongside the application code and run in the same CI pipeline as the rest of the suite.

## XCUITest versus Detox: conceptual mapping

In XCUITest you write something like this:

```swift
let app = XCUIApplication()
app.launch()

let button = app.buttons["LoginButton"]
XCTAssertTrue(button.exists)
button.tap()

let welcomeLabel = app.staticTexts["Welcome"]
XCTAssertTrue(welcomeLabel.waitForExistence(timeout: 5))
```

The equivalent in Detox:

```js
describe('Login', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('shows welcome after login', async () => {
    await expect(element(by.id('LoginButton'))).toBeVisible();
    await element(by.id('LoginButton')).tap();
    await waitFor(element(by.text('Welcome')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

The structure is the same: locate an element, perform an action, verify the result. Detox's advantages are the JavaScript runner (Jest by default), expressive matchers, and native integration with the React Native bundler for automatic synchronization.

## Installing and configuring Detox

### Global dependencies

Detox uses `applesimutils` to control the Simulator and `xcpretty` to format `xcodebuild` output. Install via Homebrew:

```bash
brew tap wix/brew
brew install applesimutils
```

### Adding Detox to the project

```bash
npm install detox --save-dev
npm install jest-circus --save-dev   # recommended test runner
```

If your project uses Expo with bare workflow, the process is the same. For Expo managed workflow, you need to use `expo-detox` or eject first.

### Initializing the configuration

```bash
npx detox init
```

This command creates the `.detoxrc.js` file at the project root and an `e2e/` folder with a sample test file and a dedicated `jest.config.js`.

### Generated structure

```
e2e/
  firstTest.test.js      ← sample test
  jest.config.js         ← Jest configuration for Detox
.detoxrc.js              ← central Detox configuration
```

## Configuring .detoxrc.js for iOS

```js
/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Debug-iphonesimulator/YourApp.app',
      build:
        'xcodebuild -workspace ios/YourApp.xcworkspace ' +
        '-scheme YourApp ' +
        '-configuration Debug ' +
        '-sdk iphonesimulator ' +
        '-derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Release-iphonesimulator/YourApp.app',
      build:
        'xcodebuild -workspace ios/YourApp.xcworkspace ' +
        '-scheme YourApp ' +
        '-configuration Release ' +
        '-sdk iphonesimulator ' +
        '-derivedDataPath ios/build',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
  },
};
```

Replace `YourApp` with the real name of your workspace and scheme. The `binaryPath` points to the `.app` that `xcodebuild` will generate inside `derivedDataPath`.

### Configuring Jest for E2E

```js
// e2e/jest.config.js
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.{js,ts}'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
```

`maxWorkers: 1` is mandatory — Detox does not support parallel E2E tests on the same Simulator.

## Building the app for Detox

Before running tests, you need to build the app for the Simulator:

```bash
npx detox build --configuration ios.sim.debug
```

Under the hood, Detox executes exactly the `xcodebuild` command defined in `apps.ios.debug.build`. The resulting binary lands in `ios/build/Build/Products/Debug-iphonesimulator/`.

In release mode (recommended for CI, as it disables Fast Refresh and the dev bundler):

```bash
npx detox build --configuration ios.sim.release
```

The build needs to be redone whenever native code changes (new module, change in `AppDelegate`, dependency update with native code). For JS-only changes, Detox reloads the bundle automatically.

## Running the tests

```bash
npx detox test --configuration ios.sim.debug
```

With the Simulator specified in `.detoxrc.js`, Detox will:

1. Start the Simulator (or reuse one already open).
2. Install the compiled `.app`.
3. Start the Metro Bundler if running in debug mode.
4. Execute each test file via Jest.
5. Shut down the Simulator at the end (configurable).

To run a specific file:

```bash
npx detox test --configuration ios.sim.debug e2e/login.test.js
```

To run with detailed output (useful for debugging selectors):

```bash
npx detox test --configuration ios.sim.debug --loglevel verbose
```

## Marking elements with testID

In React Native, you expose elements to Detox via the `testID` prop. On iOS, Detox maps `testID` to UIKit's `accessibilityIdentifier` — exactly what XCUITest uses with `app.buttons["LoginButton"]`.

```tsx
// component
<TouchableOpacity testID="login-button" onPress={handleLogin}>
  <Text>Sign In</Text>
</TouchableOpacity>

<TextInput
  testID="email-input"
  placeholder="Email"
  value={email}
  onChangeText={setEmail}
/>
```

Keep `testID` values stable and descriptive. Avoid dynamic IDs like `item-${index}` in long lists — prefer data-based IDs (`item-${item.id}`).

## Matchers: locating elements

### by.id — accessibility identifier

```js
element(by.id('login-button'))
element(by.id('email-input'))
```

The most robust form. Does not break with text or style changes.

### by.text — visible text

```js
element(by.text('Sign In'))
element(by.text('Welcome to the app'))
```

Useful for elements without `testID`, but fragile to copy and localization changes.

### by.type — native component type

```js
element(by.type('RCTTextInput'))      // TextInput on iOS
element(by.type('RCTScrollView'))     // ScrollView
```

Equivalent to using `XCUIElementType` types in XCUITest. Use only when there is no alternative, as it depends on React Native's internal names.

### Combining matchers

```js
element(by.id('list').withAncestor(by.id('main-screen')))
element(by.text('Confirm').withDescendant(by.id('confirm-icon')))
```

## Actions: interacting with elements

### tap

```js
await element(by.id('login-button')).tap();
```

### typeText

```js
await element(by.id('email-input')).typeText('user@example.com');
await element(by.id('password-input')).typeText('password123');
```

`typeText` types character by character, simulating real keyboard input. To fill a field without simulating typing (faster in integration tests):

```js
await element(by.id('search-input')).replaceText('React Native');
```

### clearText

```js
await element(by.id('search-input')).clearText();
```

### scroll

```js
await element(by.id('product-list')).scroll(300, 'down');
await element(by.id('product-list')).scroll(150, 'up');
```

The first argument is the distance in points, the second is the direction (`'up'`, `'down'`, `'left'`, `'right'`).

### scrollTo

```js
await element(by.id('product-list')).scrollTo('bottom');
await element(by.id('terms-scroll')).scrollTo('top');
```

### swipe

```js
await element(by.id('card')).swipe('left');
await element(by.id('drawer')).swipe('right', 'slow', 0.5);
```

Parameters: direction, speed (`'slow'` or `'fast'`), normalized fraction (0.0 to 1.0).

### longPress

```js
await element(by.id('message-item')).longPress(800); // 800ms
```

## Expectations: verifying state

### toBeVisible

```js
await expect(element(by.id('welcome-screen'))).toBeVisible();
```

Verifies that the element is in the visible area of the screen (not just present in the hierarchy — it needs to be within visible bounds).

### toExist

```js
await expect(element(by.id('error-banner'))).toExist();
```

Verifies only that the element is in the view hierarchy, regardless of whether it is visible.

### toHaveText

```js
await expect(element(by.id('user-name'))).toHaveText('Alice Smith');
```

### not

```js
await expect(element(by.id('loading-spinner'))).not.toBeVisible();
await expect(element(by.id('error-banner'))).not.toExist();
```

## Waiting for async states with waitFor

`waitFor` is the direct equivalent of XCUITest's `waitForExistence(timeout:)`. It keeps polling the element until the condition is satisfied or the timeout expires.

```js
await waitFor(element(by.id('home-screen')))
  .toBeVisible()
  .withTimeout(10000); // 10 seconds
```

Combining with a scroll action (useful for long lists):

```js
await waitFor(element(by.text('Product 42')))
  .toBeVisible()
  .whileElement(by.id('product-list'))
  .scroll(100, 'down');
```

Detox will scroll the list in 100-point increments until the element appears or the timeout is reached.

## Managing the app lifecycle in tests

```js
describe('Authentication flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative(); // reloads the JS bundle without restarting the app
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('logs in successfully', async () => {
    // ...
  });
});
```

To fully restart the app between tests (slower, but guarantees clean state):

```js
beforeEach(async () => {
  await device.launchApp({ newInstance: true });
});
```

## Intercepting iOS permission dialogs

One of the most important differences from XCUITest: the operating system displays native dialogs to request permissions (camera, location, notifications). Detox lets you configure the response to these dialogs at app launch:

```js
await device.launchApp({
  permissions: {
    camera: 'YES',
    location: 'always',
    notifications: 'YES',
    photos: 'YES',
    microphone: 'NO',
  },
});
```

Permissions are configured before the app starts, preventing the dialog from appearing during the test. Accepted values are `'YES'`, `'NO'`, and for location: `'always'`, `'inuse'`, `'never'`.

To test the actual permission request flow, `applesimutils` exposes utilities that Detox uses internally. In general, the recommended approach for E2E tests is to pre-grant permissions and test the app's behavior after the permission has been accepted or denied.

## Complete example: login flow

```js
// e2e/login.test.js
describe('Authentication', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows the login screen when the app opens', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
  });

  it('shows an error for invalid credentials', async () => {
    await element(by.id('email-input')).typeText('wrong@test.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('error-message')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.id('error-message'))).toHaveText(
      'Invalid email or password',
    );
  });

  it('navigates to home after successful login', async () => {
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('correct-password');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(8000);

    await expect(element(by.id('welcome-message'))).toBeVisible();
  });
});
```

## CI on GitHub Actions with macOS runner

Detox tests for iOS require a runner with macOS and Xcode installed. GitHub Actions offers `macos-14` and `macos-15` runners with Xcode pre-installed.

```yaml
# .github/workflows/e2e-ios.yml
name: E2E iOS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e-ios:
    runs-on: macos-14
    timeout-minutes: 60

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install applesimutils
        run: |
          brew tap wix/brew
          brew install applesimutils

      - name: Install CocoaPods
        run: |
          cd ios && pod install
        env:
          NO_FLIPPER: 1

      - name: Build app for Detox
        run: npx detox build --configuration ios.sim.release

      - name: Run Detox tests
        run: npx detox test --configuration ios.sim.release --cleanup --headless

      - name: Upload test artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: detox-artifacts
          path: artifacts/
          retention-days: 7
```

The `--cleanup` flag makes Detox shut down the Simulator at the end. `--headless` runs without displaying the Simulator's graphical interface (required on runners without a display).

To save screenshots and videos of failures, configure `artifacts` in `.detoxrc.js`:

```js
artifacts: {
  rootDir: 'artifacts',
  plugins: {
    screenshot: {
      shouldTakeAutomaticSnapshots: true,
      keepOnlyFailedTestsArtifacts: true,
    },
    video: {
      android: { bitRate: 4000000 },
      simulator: { codec: 'hevc' },
    },
  },
},
```

## Detox versus XCUITest: when to use each

| Criterion | XCUITest | Detox |
|---|---|---|
| Platform | iOS only | iOS and Android |
| Test language | Swift / Objective-C | JavaScript / TypeScript |
| Integrates with Jest | No | Yes |
| Access to deep native APIs | Full | Partial (via `applesimutils`) |
| Build time | Faster (native) | Similar (uses xcodebuild) |
| Single maintenance for both platforms | No | Yes |

For React Native projects, Detox eliminates the need to maintain two separate suites. If your app has critical UI logic that differs per platform, it is worth testing iOS-specific cases in XCUITest and the main flows in Detox.
