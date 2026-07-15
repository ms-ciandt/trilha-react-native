---
title: RN Upgrade Helper e Diffs Nativos
---

# RN Upgrade Helper e Diffs Nativos

> O Upgrade Helper e a ferramenta mais importante no fluxo de upgrade do RN. Entender exatamente o que ele mostra — e o que ele nao mostra — e a diferenca entre um upgrade tranquilo e tres dias de falhas de build misteriosas.

---

## Como o Upgrade Helper Funciona Internamente

A ferramenta e alimentada pelo **rn-diff-purge**, um repositorio que mantem um commit por release do RN. Para cada release, a automacao executa:

```bash
npx react-native@NOVA_VERSAO init RnDiffApp --skip-install
# remove o app antigo, commita o novo app
# resultado: um diff git limpo entre quaisquer duas versoes
```

Isso significa que o diff e sempre entre **projetos template sem customizacao** — nao ha codigo de app real. Voce esta vendo exatamente o que `react-native init` gera em cada versao.

A consequencia: o diff mostra o que o template mudou, mas **seu trabalho e mapear essas mudancas para o seu projeto real**. Os arquivos a atualizar sao os mesmos, mas as suas versoes podem ter linhas adicionais, codigo customizado ou uma estrutura completamente diferente.

---

## Lendo o Diff: Categorias de Arquivos

### Categoria 1: Sempre Aplicar (mecanico)

Estes arquivos mudam previsivelmente a cada versao minor e devem ser atualizados exatamente como mostrado:

- `android/gradle/wrapper/gradle-wrapper.properties` — versao do Gradle wrapper
- `android/build.gradle` — classpath do plugin Gradle
- `package.json` — versoes de `react-native`, `react`, `@react-native/metro-config`
- `ios/Podfile` — versao de `platform :ios`, flags de `use_react_native!`

```diff
# android/gradle/wrapper/gradle-wrapper.properties
- distributionUrl=https://services.gradle.org/distributions/gradle-8.6-all.zip
+ distributionUrl=https://services.gradle.org/distributions/gradle-8.10.2-all.zip
```

Aplique isso exatamente — incompatibilidade de versao do Gradle entre o wrapper e o plugin causa erros crípticos do tipo "Could not resolve com.android.tools.build:gradle".

### Categoria 2: Mesclar com Cuidado (semantico)

Estes arquivos tem mudancas estruturais que precisam ser mescladas com seu conteudo customizado:

- `android/app/build.gradle` — pode adicionar novos `buildFeatures`, mudar `compileSdk`, adicionar `namespace`
- `android/app/src/main/AndroidManifest.xml` — pode adicionar flags de activity, permissoes, estilos
- `ios/AppDelegate.swift` (ou `.mm`) — pode mudar o uso de `RCTRootViewFactory`, adicionar novos metodos
- `ios/MyApp.xcodeproj/project.pbxproj` — configuracoes de build, versao do Swift, deployment targets

Para esses, abra seu arquivo lado a lado com o diff do Upgrade Helper e aplique a mudanca semantica — nunca sobrescreva seu arquivo com a versao do template.

### Categoria 3: Revisar e Ignorar se Nao Alterado

- `__tests__/` — mudancas no template de testes; aplique apenas se voce usa o teste gerado
- `.flowconfig` / `.eslintrc.js` — configuracoes de ferramentas; aplique novas regras, ignore as que conflitam com sua configuracao
- `metro.config.js` — aplique mudancas estruturais; preserve seus plugins e aliases customizados

---

## Um Diff Real: Mudancas Principais de 0.75 → 0.76

### `android/app/build.gradle`

```diff
 android {
-    compileSdkVersion 34
+    compileSdkVersion 35

     defaultConfig {
-        targetSdkVersion 34
+        targetSdkVersion 35
-        minSdkVersion 23
+        minSdkVersion 24
     }
 }
```

**Impacto do `targetSdkVersion 35`:** A obrigatoriedade de edge-to-edge do Android 15 e ativada. Cores de fundo da StatusBar param de funcionar. Veja o topico de Configuracoes Nativas.

**Impacto do `minSdkVersion 24`:** Encerra o suporte ao Android 7.0 (API 23) — aproximadamente 0,3% dos dispositivos ativos em 2025. Verifique seus dados de analytics antes de aplicar.

### `ios/Podfile`

```diff
 use_react_native!(
   :path => config[:reactNativePath],
   :hermes_enabled => true,
-  :fabric_enabled => true,
   :app_path => "#{Pod::Config.instance.installation_root}/.."
 )
```

A flag `fabric_enabled` e removida na 0.76 porque o Fabric (o novo renderer) agora esta sempre ativado quando a Nova Arquitetura esta ligada. Manter essa flag na 0.76 causa um aviso de deprecacao no `pod install`.

### `ios/AppDelegate.swift`

```diff
-class AppDelegate: UIResponder, UIApplicationDelegate {
+class AppDelegate: RCTAppDelegate {
   ...
-  var window: UIWindow?
-
-  func application(_ application: UIApplication,
-    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
-    let moduleName: String = "MyApp"
-    let initialProperties: [String: Any]? = nil
-    let rootViewFactory = RCTRootViewFactory(configuration: ...) { ... }
-    self.window = UIWindow(frame: UIScreen.main.bounds)
-    self.window?.rootViewController = UIViewController()
-    ...
+  override func application(_ application: UIApplication,
+    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
+    self.moduleName = "MyApp"
+    self.dependencyProvider = RCTAppDependencyProvider()
+    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
   }
 }
```

`RCTAppDelegate` e a nova classe base. Ela gerencia a inicializacao do RCTHost, a montagem da surface e o lifecycle — voce nao precisa mais configurar a window manualmente. Se seu app tem logica customizada de window/rootViewController, voce sobrescreve o metodo `createRootViewController` em vez disso.

---

## Usando o Diff em um App Brownfield

Em um app brownfield, seu `AppDelegate` nao e um template — ele tem inicializacao customizada, tratamento de deep links, configuracao de push notifications, etc. O Upgrade Helper mostra a mudanca no *template*; voce deve derivar a mudanca *semantica*.

**Fluxo de trabalho:**

1. Abra o diff do Upgrade Helper para o arquivo relevante (ex.: `AppDelegate.swift`)
2. Identifique o que o diff esta *fazendo* semanticamente — nao o que ele diz literalmente:
   - "Adiciona `RCTAppDelegate` como classe base" → adiciona `import React_RCTAppDelegate` + muda a declaracao da classe
   - "Remove configuracao manual da window" → a classe base agora lida com isso
3. Encontre o local equivalente no seu AppDelegate e faca a mesma mudanca semantica
4. Mantenha todo o seu codigo customizado (push notifications, inicializacao de analytics, feature flags)

```swift
// Seu AppDelegate brownfield apos a migracao para 0.76
import UIKit
import React_RCTAppDelegate  // ← adicionado
import React

class AppDelegate: RCTAppDelegate {  // ← alterado de UIResponder

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // Sua inicializacao customizada — mantenha tudo isso
        Analytics.configure(key: Env.analyticsKey)
        PushNotifications.configure()
        FeatureFlags.load()

        // Configuracao do host da Nova Arquitetura via super (0.76+)
        self.moduleName = "MyApp"
        self.dependencyProvider = RCTAppDependencyProvider()
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    // Sobrescreva se precisar de um root view controller customizado
    override func createRootViewController() -> UIViewController {
        let rootVC = super.createRootViewController()
        // aplicar aparencia customizada
        return rootVC
    }
}
```

---

## Verificando se o Diff Foi Aplicado Corretamente

Apos aplicar todas as mudancas, execute esta verificacao de sanidade antes de compilar:

```bash
# Verificar alinhamento de versao do Gradle
cat android/gradle/wrapper/gradle-wrapper.properties | grep distributionUrl
cat android/build.gradle | grep "com.android.tools.build:gradle"
# A versao do plugin Gradle e a versao do wrapper devem ser compativeis

# Verificar se os pods foram resolvidos
cat ios/Podfile.lock | grep "React-Core:"
# Deve mostrar a nova versao do RN, nao a antiga

# Verificar o package.json
node -e "const p = require('./package.json'); console.log(p.dependencies['react-native'])"
# Deve retornar a nova string de versao
```

---

## O CLI do rn-diff-purge (Diffs Locais)

Para uso offline ou pipelines de CI, gere o diff localmente:

```bash
npx rn-diff-purge --from 0.75.4 --to 0.76.7 --output ./upgrade-diff.patch
```

Isso gera um arquivo `.patch` que voce pode inspecionar ou aplicar com `git apply --3way`.

---

## Materiais de Estudo

| Recurso | Descricao |
|---|---|
| [Upgrade Helper — ferramenta web](https://react-native-community.github.io/upgrade-helper/) | Gera diffs arquivo a arquivo entre quaisquer duas versoes do RN |
| [rn-diff-purge — GitHub](https://github.com/react-native-community/rn-diff-purge) | O repositorio por tras do Upgrade Helper — diffs brutos por versao |
| [upgrade-helper — GitHub](https://github.com/react-native-community/upgrade-helper) | Codigo-fonte da UI web |
| [upgrade-helper.md — reactwg](https://github.com/reactwg/react-native-releases/blob/main/docs/upgrade-helper.md) | Guia oficial sobre como usar a ferramenta |
| [Callstack — Upgrade Brownfield 0.71→0.76](https://www.callstack.com/blog/how-to-upgrade-react-native-in-a-brownfield-application) | Walkthrough detalhado de diff nativo em um app brownfield real |

---

Proximo → [Analise de Breaking Changes](./breaking-changes)
