---
title: Testes E2E com Detox
---

# Testes E2E com Detox

Se você vem do desenvolvimento iOS nativo, já conhece o XCUITest: um framework que automatiza interações reais na interface do aplicativo, simulando o que um usuário faria em um iPhone ou iPad. O Detox ocupa exatamente esse espaço no ecossistema React Native. Ele controla um Simulador iOS real, toca em elementos, digita texto, rola listas e verifica o estado visual da interface — tudo a partir de testes escritos em JavaScript ou TypeScript.

A grande diferença em relação ao XCUITest é que o Detox roda os mesmos testes no Android também, sem reescrever nada. Além disso, como os testes são escritos em JS, eles vivem junto com o código da aplicação e rodam no mesmo pipeline de CI que o restante da suite.

## XCUITest versus Detox: mapeamento conceitual

No XCUITest você escreve algo assim:

```swift
let app = XCUIApplication()
app.launch()

let button = app.buttons["LoginButton"]
XCTAssertTrue(button.exists)
button.tap()

let welcomeLabel = app.staticTexts["Bem-vindo"]
XCTAssertTrue(welcomeLabel.waitForExistence(timeout: 5))
```

O equivalente em Detox:

```js
describe('Login', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('exibe boas-vindas após login', async () => {
    await expect(element(by.id('LoginButton'))).toBeVisible();
    await element(by.id('LoginButton')).tap();
    await waitFor(element(by.text('Bem-vindo')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

A estrutura é a mesma: localizar um elemento, executar uma ação, verificar o resultado. A vantagem do Detox é o runner JavaScript (Jest por padrão), os matchers expressivos e a integração nativa com o bundler do React Native para sincronização automática.

## Instalando e configurando o Detox

### Dependências globais

O Detox usa o `applesimutils` para controlar o Simulador e o `xcpretty` para formatar a saída do `xcodebuild`. Instale via Homebrew:

```bash
brew tap wix/brew
brew install applesimutils
```

### Adicionando o Detox ao projeto

```bash
npm install detox --save-dev
npm install jest-circus --save-dev   # test runner recomendado
```

Se o seu projeto usa Expo com bare workflow, o processo é o mesmo. Para Expo managed workflow, é necessário usar `expo-detox` ou ejetar primeiro.

### Inicializando a configuração

```bash
npx detox init
```

Esse comando cria o arquivo `.detoxrc.js` na raiz do projeto e uma pasta `e2e/` com um arquivo de teste de exemplo e um `jest.config.js` dedicado.

### Estrutura gerada

```
e2e/
  firstTest.test.js      ← teste de exemplo
  jest.config.js         ← configuração do Jest para Detox
.detoxrc.js              ← configuração central do Detox
```

## Configurando o .detoxrc.js para iOS

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

Substitua `YourApp` pelo nome real do seu workspace e scheme. O `binaryPath` aponta para o `.app` que o `xcodebuild` vai gerar dentro de `derivedDataPath`.

### Configurando o Jest para E2E

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

O `maxWorkers: 1` é obrigatório — Detox não suporta testes E2E em paralelo no mesmo Simulador.

## Compilando o app para Detox

Antes de rodar os testes, é necessário compilar o app para o Simulador:

```bash
npx detox build --configuration ios.sim.debug
```

Por trás dos panos, o Detox executa exatamente o comando `xcodebuild` definido em `apps.ios.debug.build`. O binário resultante fica em `ios/build/Build/Products/Debug-iphonesimulator/`.

Em modo release (recomendado para CI, pois desativa o Fast Refresh e o bundler dev):

```bash
npx detox build --configuration ios.sim.release
```

O build precisa ser refeito sempre que o código nativo mudar (novo módulo, alteração em `AppDelegate`, atualização de dependência com código nativo). Para mudanças apenas em JS, o Detox recarrega o bundle automaticamente.

## Rodando os testes

```bash
npx detox test --configuration ios.sim.debug
```

Com o Simulador especificado no `.detoxrc.js`, o Detox vai:

1. Iniciar o Simulador (ou reutilizar um já aberto).
2. Instalar o `.app` compilado.
3. Iniciar o Metro Bundler se estiver rodando em debug.
4. Executar cada arquivo de teste via Jest.
5. Desligar o Simulador ao final (configurável).

Para rodar um arquivo específico:

```bash
npx detox test --configuration ios.sim.debug e2e/login.test.js
```

Para rodar com saída detalhada (útil para depurar seletores):

```bash
npx detox test --configuration ios.sim.debug --loglevel verbose
```

## Marcando elementos com testID

No React Native, você expõe elementos para o Detox via a prop `testID`. No iOS, o Detox mapeia `testID` para o `accessibilityIdentifier` do UIKit — exatamente o que o XCUITest usa com `app.buttons["LoginButton"]`.

```tsx
// componente
<TouchableOpacity testID="login-button" onPress={handleLogin}>
  <Text>Entrar</Text>
</TouchableOpacity>

<TextInput
  testID="email-input"
  placeholder="Email"
  value={email}
  onChangeText={setEmail}
/>
```

Mantenha os `testID` estáveis e descritivos. Evite IDs dinâmicos como `item-${index}` em listas longas — prefira IDs baseados em dados (`item-${item.id}`).

## Matchers: localizando elementos

### by.id — identificador de acessibilidade

```js
element(by.id('login-button'))
element(by.id('email-input'))
```

A forma mais robusta. Não quebra com mudanças de texto ou estilo.

### by.text — texto visível

```js
element(by.text('Entrar'))
element(by.text('Bem-vindo ao app'))
```

Útil para elementos sem `testID`, mas frágil a mudanças de copy e localização.

### by.type — tipo de componente nativo

```js
element(by.type('RCTTextInput'))      // TextInput no iOS
element(by.type('RCTScrollView'))     // ScrollView
```

Equivale a usar tipos de `XCUIElementType` no XCUITest. Use apenas quando não houver alternativa, pois depende de nomes internos do React Native.

### Combinando matchers

```js
element(by.id('list').withAncestor(by.id('main-screen')))
element(by.text('Confirmar').withDescendant(by.id('confirm-icon')))
```

## Actions: interagindo com elementos

### tap

```js
await element(by.id('login-button')).tap();
```

### typeText

```js
await element(by.id('email-input')).typeText('usuario@exemplo.com');
await element(by.id('password-input')).typeText('senha123');
```

O `typeText` digita caractere por caractere, simulando entrada real do teclado. Para preencher um campo sem simular digitação (mais rápido em testes de integração):

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

O primeiro argumento é a distância em pontos, o segundo é a direção (`'up'`, `'down'`, `'left'`, `'right'`).

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

Parâmetros: direção, velocidade (`'slow'` ou `'fast'`), fração normalizada (0.0 a 1.0).

### longPress

```js
await element(by.id('message-item')).longPress(800); // 800ms
```

## Expectations: verificando o estado

### toBeVisible

```js
await expect(element(by.id('welcome-screen'))).toBeVisible();
```

Verifica se o elemento está na área visível da tela (não necessariamente existente na hierarquia — precisa estar dentro dos limites visíveis).

### toExist

```js
await expect(element(by.id('error-banner'))).toExist();
```

Verifica apenas se o elemento está na hierarquia de views, independente de estar visível.

### toHaveText

```js
await expect(element(by.id('user-name'))).toHaveText('Ana Souza');
```

### not

```js
await expect(element(by.id('loading-spinner'))).not.toBeVisible();
await expect(element(by.id('error-banner'))).not.toExist();
```

## Aguardando estados assíncronos com waitFor

O `waitFor` é o equivalente direto de `waitForExistence(timeout:)` do XCUITest. Ele fica consultando o elemento até a condição ser satisfeita ou o tempo expirar.

```js
await waitFor(element(by.id('home-screen')))
  .toBeVisible()
  .withTimeout(10000); // 10 segundos
```

Combinando com ação de scroll (útil para listas longas):

```js
await waitFor(element(by.text('Produto 42')))
  .toBeVisible()
  .whileElement(by.id('product-list'))
  .scroll(100, 'down');
```

O Detox vai rolar a lista em incrementos de 100 pontos até o elemento aparecer ou o timeout ser atingido.

## Gerenciando o ciclo de vida do app nos testes

```js
describe('Fluxo de autenticacao', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative(); // recarrega o bundle JS sem reiniciar o app
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('realiza login com sucesso', async () => {
    // ...
  });
});
```

Para reiniciar o app completamente entre testes (mais lento, mas garante estado limpo):

```js
beforeEach(async () => {
  await device.launchApp({ newInstance: true });
});
```

## Interceptando diálogos de permissão do iOS

Uma das diferenças mais importantes do iOS em relação ao XCUITest: o sistema operacional exibe diálogos nativos para solicitar permissões (câmera, localização, notificações). O Detox permite configurar a resposta a esses diálogos na inicialização do app:

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

As permissões são configuradas antes do app iniciar, evitando que o diálogo apareça durante o teste. Os valores aceitos são `'YES'`, `'NO'`, e para localização: `'always'`, `'inuse'`, `'never'`.

Para testar o fluxo de solicitação de permissão propriamente dito, o `applesimutils` expõe utilitários que o Detox usa internamente. Em geral, a abordagem recomendada para testes E2E é pré-conceder as permissões e testar o comportamento do app depois que a permissão foi aceita ou negada.

## Exemplo completo: fluxo de login

```js
// e2e/login.test.js
describe('Autenticacao', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('exibe a tela de login ao abrir o app', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
  });

  it('exibe erro para credenciais invalidas', async () => {
    await element(by.id('email-input')).typeText('errado@teste.com');
    await element(by.id('password-input')).typeText('senhaerrada');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('error-message')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.id('error-message'))).toHaveText(
      'Email ou senha incorretos',
    );
  });

  it('navega para a home apos login bem-sucedido', async () => {
    await element(by.id('email-input')).typeText('usuario@exemplo.com');
    await element(by.id('password-input')).typeText('senha-correta');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(8000);

    await expect(element(by.id('welcome-message'))).toBeVisible();
  });
});
```

## CI no GitHub Actions com runner macOS

Testes Detox para iOS exigem um runner com macOS e Xcode instalado. O GitHub Actions oferece runners `macos-14` e `macos-15` com Xcode pré-instalado.

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

O flag `--cleanup` faz o Detox desligar o Simulador ao final. O `--headless` roda sem exibir a interface gráfica do Simulador (necessário em runners sem display).

Para salvar screenshots e vídeos das falhas, configure o `artifacts` no `.detoxrc.js`:

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

## Detox versus XCUITest: quando usar cada um

| Criterio | XCUITest | Detox |
|---|---|---|
| Plataforma | Apenas iOS | iOS e Android |
| Linguagem dos testes | Swift / Objective-C | JavaScript / TypeScript |
| Integra com Jest | Nao | Sim |
| Acesso a APIs nativas profundas | Total | Parcial (via `applesimutils`) |
| Tempo de build | Mais rapido (nativo) | Similar (usa xcodebuild) |
| Manutencao unica para ambas as plataformas | Nao | Sim |

Para projetos React Native, o Detox elimina a necessidade de manter duas suites separadas. Se o seu app tem logica critica de UI diferente por plataforma, vale testar casos especificos de iOS em XCUITest e os fluxos principais em Detox.
