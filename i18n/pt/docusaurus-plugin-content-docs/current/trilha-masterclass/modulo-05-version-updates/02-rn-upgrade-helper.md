---
title: RN Upgrade Helper e Diffs Nativos
---

# RN Upgrade Helper e Diffs Nativos

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc05_02_rn-upgrade-helper.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc05_02_rn-upgrade-helper.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> O Upgrade Helper é a ferramenta mais importante no fluxo de upgrade do RN. Entender exatamente o que ele mostra — e o que ele não mostra — é a diferença entre um upgrade tranquilo e três dias de falhas de build misteriosas.

---

## Como o Upgrade Helper Funciona Internamente

A ferramenta é alimentada pelo **rn-diff-purge**, um repositório que mantém um commit por release do RN. Para cada release, a automação executa:

```bash
npx react-native@NOVA_VERSAO init RnDiffApp --skip-install
# remove o app antigo, commita o novo app
# resultado: um diff git limpo entre quaisquer duas versões
```

Isso significa que o diff é sempre entre **projetos template sem customização** — não há código de app real. Você está vendo exatamente o que `react-native init` gera em cada versão.

A consequência: o diff mostra o que o template mudou, mas **seu trabalho é mapear essas mudanças para o seu projeto real**. Os arquivos a atualizar são os mesmos, mas as suas versões podem ter linhas adicionais, código customizado ou uma estrutura completamente diferente.

---

## Lendo o Diff: Categorias de Arquivos

### Categoria 1: Sempre Aplicar (mecânico)

Estes arquivos mudam previsivelmente a cada versão minor e devem ser atualizados exatamente como mostrado:

- `android/gradle/wrapper/gradle-wrapper.properties` — versão do Gradle wrapper
- `android/build.gradle` — classpath do plugin Gradle
- `package.json` — versões de `react-native`, `react`, `@react-native/metro-config`
- `ios/Podfile` — versão de `platform :ios`, flags de `use_react_native!`

```diff
# android/gradle/wrapper/gradle-wrapper.properties
- distributionUrl=https://services.gradle.org/distributions/gradle-8.6-all.zip
+ distributionUrl=https://services.gradle.org/distributions/gradle-8.10.2-all.zip
```

Aplique isso exatamente — incompatibilidade de versão do Gradle entre o wrapper e o plugin causa erros crípticos do tipo "Could not resolve com.android.tools.build:gradle".

### Categoria 2: Mesclar com Cuidado (semântico)

Estes arquivos têm mudanças estruturais que precisam ser mescladas com seu conteúdo customizado:

- `android/app/build.gradle` — pode adicionar novos `buildFeatures`, mudar `compileSdk`, adicionar `namespace`
- `android/app/src/main/AndroidManifest.xml` — pode adicionar flags de activity, permissões, estilos
- `ios/AppDelegate.swift` (ou `.mm`) — pode mudar o uso de `RCTRootViewFactory`, adicionar novos métodos
- `ios/MyApp.xcodeproj/project.pbxproj` — configurações de build, versão do Swift, deployment targets

Para esses, abra seu arquivo lado a lado com o diff do Upgrade Helper e aplique a mudança semântica — nunca sobrescreva seu arquivo com a versão do template.

### Categoria 3: Revisar e Ignorar se Não Alterado

- `__tests__/` — mudanças no template de testes; aplique apenas se você usa o teste gerado
- `.flowconfig` / `.eslintrc.js` — configurações de ferramentas; aplique novas regras, ignore as que conflitam com sua configuração
- `metro.config.js` — aplique mudanças estruturais; preserve seus plugins e aliases customizados

---

## Um Diff Real: Mudanças Principais de 0.75 → 0.76

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

**Impacto do `targetSdkVersion 35`:** A obrigatoriedade de edge-to-edge do Android 15 é ativada. Cores de fundo da StatusBar param de funcionar. Veja o tópico de Configurações Nativas.

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

A flag `fabric_enabled` é removida na 0.76 porque o Fabric (o novo renderer) agora está sempre ativado quando a Nova Arquitetura está ligada. Manter essa flag na 0.76 causa um aviso de depreciação no `pod install`.

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

`RCTAppDelegate` é a nova classe base. Ela gerencia a inicialização do RCTHost, a montagem da surface e o lifecycle — você não precisa mais configurar a window manualmente. Se seu app tem lógica customizada de window/rootViewController, você sobrescreve o método `createRootViewController` em vez disso.

---

## Usando o Diff em um App Brownfield

Em um app brownfield, seu `AppDelegate` não é um template — ele tem inicialização customizada, tratamento de deep links, configuração de push notifications, etc. O Upgrade Helper mostra a mudança no *template*; você deve derivar a mudança *semântica*.

**Fluxo de trabalho:**

1. Abra o diff do Upgrade Helper para o arquivo relevante (ex.: `AppDelegate.swift`)
2. Identifique o que o diff está *fazendo* semanticamente — não o que ele diz literalmente:
   - "Adiciona `RCTAppDelegate` como classe base" → adiciona `import React_RCTAppDelegate` + muda a declaração da classe
   - "Remove configuração manual da window" → a classe base agora lida com isso
3. Encontre o local equivalente no seu AppDelegate e faça a mesma mudança semântica
4. Mantenha todo o seu código customizado (push notifications, inicialização de analytics, feature flags)

```swift
// Seu AppDelegate brownfield após a migração para 0.76
import UIKit
import React_RCTAppDelegate  // ← adicionado
import React

class AppDelegate: RCTAppDelegate {  // ← alterado de UIResponder

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // Sua inicialização customizada — mantenha tudo isso
        Analytics.configure(key: Env.analyticsKey)
        PushNotifications.configure()
        FeatureFlags.load()

        // Configuração do host da Nova Arquitetura via super (0.76+)
        self.moduleName = "MyApp"
        self.dependencyProvider = RCTAppDependencyProvider()
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    // Sobrescreva se precisar de um root view controller customizado
    override func createRootViewController() -> UIViewController {
        let rootVC = super.createRootViewController()
        // aplicar aparência customizada
        return rootVC
    }
}
```

---

## Verificando se o Diff Foi Aplicado Corretamente

Após aplicar todas as mudanças, execute esta verificação de sanidade antes de compilar:

```bash
# Verificar alinhamento de versão do Gradle
cat android/gradle/wrapper/gradle-wrapper.properties | grep distributionUrl
cat android/build.gradle | grep "com.android.tools.build:gradle"
# A versão do plugin Gradle e a versão do wrapper devem ser compatíveis

# Verificar se os pods foram resolvidos
cat ios/Podfile.lock | grep "React-Core:"
# Deve mostrar a nova versão do RN, não a antiga

# Verificar o package.json
node -e "const p = require('./package.json'); console.log(p.dependencies['react-native'])"
# Deve retornar a nova string de versão
```

---

## O CLI do rn-diff-purge (Diffs Locais)

Para uso offline ou pipelines de CI, gere o diff localmente:

```bash
npx rn-diff-purge --from 0.75.4 --to 0.76.7 --output ./upgrade-diff.patch
```

Isso gera um arquivo `.patch` que você pode inspecionar ou aplicar com `git apply --3way`.

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [Upgrade Helper — ferramenta web](https://react-native-community.github.io/upgrade-helper/) | Gera diffs arquivo a arquivo entre quaisquer duas versões do RN |
| [rn-diff-purge — GitHub](https://github.com/react-native-community/rn-diff-purge) | O repositório por trás do Upgrade Helper — diffs brutos por versão |
| [upgrade-helper — GitHub](https://github.com/react-native-community/upgrade-helper) | Código-fonte da UI web |
| [upgrade-helper.md — reactwg](https://github.com/reactwg/react-native-releases/blob/main/docs/upgrade-helper.md) | Guia oficial sobre como usar a ferramenta |
| [Callstack — Upgrade Brownfield 0.71→0.76](https://www.callstack.com/blog/how-to-upgrade-react-native-in-a-brownfield-application) | Walkthrough detalhado de diff nativo em um app brownfield real |

---

Próximo → [Análise de Breaking Changes](./breaking-changes)
