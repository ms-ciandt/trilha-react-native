---
title: Comunicação e Navegação
---

## 6. Comunicação: Nativo ↔ RN

Existem cinco canais distintos. Use a ferramenta certa para cada situação.

### Canal 1: Props iniciais (nativo → RN, sentido único, no momento da montagem)

Dados passados ao criar a surface. Imutáveis após a montagem.

```kotlin
// Android
val props = Bundle().apply {
    putString("userId", session.userId)
    putString("theme", appTheme.name)
    putInt("cartCount", cart.size)
}
val surface = reactHost.createSurface(activity, "HomeTab", props)
```

```swift
// iOS
let surface = RCTFabricSurface(
    surfacePresenter: host.surfacePresenter,
    moduleName: "HomeTab",
    initialProperties: [
        "userId": session.userId,
        "theme": appTheme.rawValue,
        "cartCount": cart.count,
    ]
)
```

### Canal 2: Native Modules / TurboModules (JS → Nativo, request/response)

A camada JS chama o nativo de forma síncrona (JSI) ou assíncrona. A direção padrão é JS → Nativo.

```typescript
// Lado JS: wrapper tipado
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  getUserProfile(userId: string): Promise<UserProfile>;
  clearCache(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('UserModule');
```

```kotlin
// Android: implementação do TurboModule
class UserModule(reactContext: ReactApplicationContext) :
    NativeBrownfieldUserModuleSpec(reactContext) {

    override fun getName() = NAME

    override fun getUserProfile(userId: String, promise: Promise) {
        // Bridge para o seu serviço existente
        UserRepository.get(userId)
            .observe(ProcessLifecycleOwner.get()) { profile ->
                promise.resolve(Arguments.makeNativeMap(mapOf(
                    "id" to profile.id,
                    "name" to profile.displayName,
                    "avatarUrl" to profile.avatarUrl,
                )))
            }
    }

    override fun clearCache() {
        UserRepository.clearCache()
    }

    companion object {
        const val NAME = "UserModule"
    }
}
```

### Canal 3: Event Emitter (Nativo → JS, eventos push)

O nativo envia eventos sem aguardar uma chamada JS. Use para eventos assíncronos do sistema.

```kotlin
// Android: enviar evento de qualquer thread
class NetworkModule(private val reactContext: ReactApplicationContext) :
    NativeEventEmitter(reactContext) {

    fun sendConnectivityChange(isConnected: Boolean) {
        val event = Arguments.createMap().apply {
            putBoolean("isConnected", isConnected)
            putString("type", if (isConnected) "wifi" else "none")
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("NetworkStatusChanged", event)
    }
}
```

```swift
// iOS: enviar evento de qualquer thread
func sendConnectivityChange(isConnected: Bool) {
    bridge?.eventDispatcher().sendDeviceEvent(
        withName: "NetworkStatusChanged",
        body: [
            "isConnected": isConnected,
            "type": isConnected ? "wifi" : "none",
        ]
    )
}
```

```typescript
// JS: assinar o evento
import { NativeEventEmitter, NativeModules } from 'react-native';

const emitter = new NativeEventEmitter(NativeModules.NetworkModule);

function useNetworkStatus() {
    const [connected, setConnected] = useState(true);

    useEffect(() => {
        const sub = emitter.addListener('NetworkStatusChanged', (event) => {
            setConnected(event.isConnected);
        });
        return () => sub.remove();
    }, []);

    return connected;
}
```

### Canal 4: Atualização de props após a montagem (Nativo → RN)

Para atualizar as props de uma surface já montada, você precisa passar pela API da surface — não é possível chamar um setState do React a partir do nativo.

```kotlin
// Android
surface.updateProps(Bundle().apply {
    putInt("cartCount", newCount)
})
```

```swift
// iOS
surface.updateProperties(["cartCount": newCount])
```

No lado JS, as novas props chegam como um re-render normal — o componente enxerga o `props.cartCount` atualizado.

### Canal 5: Chamando métodos RN a partir do Nativo (Nativo → JS, imperativo)

Raramente necessário, mas às vezes inevitável — por exemplo, o nativo quer disparar uma animação JS ou limpar um formulário.

```kotlin
// Android: chamar uma função JS por nome via AppRegistry
reactHost.jsCallInvoker?.invokeAsync {
    reactContext
        .getJSModule(RCTEventEmitter::class.java)
        // ou via DeviceEventEmitter no lado JS
}
```

Um padrão mais limpo: expor um módulo nativo em que o lado JS registra um callback no momento da montagem; em seguida, o nativo chama o callback quando necessário.

```typescript
// JS: registrar um "receptor de comandos"
useEffect(() => {
    const sub = DeviceEventEmitter.addListener('ClearFormCommand', () => {
        formRef.current?.reset();
    });
    return () => sub.remove();
}, []);
```

```kotlin
// Nativo: disparar o comando
reactContext
    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
    .emit("ClearFormCommand", null)
```

---

## 7. Compartilhamento de Estado e Sessão

Estado compartilhado é o problema mais difícil do brownfield. Não existe memória global compartilhada entre o heap nativo e o heap JS — você precisa serializar.

### Arquitetura: fonte única de verdade

Decida onde a verdade reside **antes** de escrever código. As duas opções viáveis:

```
Opção A — Nativo é a fonte de verdade
  Nativo ──escreve──► SharedStorage ──lê──► JS
  JS ──chama TurboModule──► Serviço nativo ──escreve──► SharedStorage

Opção B — JS é a fonte de verdade
  JS ──escreve──► SharedStorage ──lê──► Nativo
  Nativo ──chama de volta ao JS via EventEmitter──► JS atualiza SharedStorage
```

Evite escritas bidirecionais — você criará condições de corrida.

### MMKV — armazenamento chave-valor compartilhado mais rápido

O [MMKV](https://github.com/mrousavy/react-native-mmkv) usa a mesma biblioteca MMKV nativa em ambas as camadas, então o nativo e o JS compartilham o mesmo arquivo (com segurança entre processos).

```kotlin
// Android nativo — escrever a partir do Kotlin
import com.tencent.mmkv.MMKV

val mmkv = MMKV.defaultMMKV()
mmkv.encode("session_token", authManager.currentToken)
mmkv.encode("user_id", session.userId)
```

```typescript
// JS — ler imediatamente, sem overhead de serialização
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const token = storage.getString('session_token');  // mesmo valor
const userId = storage.getString('user_id');
```

A instância do MMKV pode ser configurada com um app group compartilhado no iOS (para compartilhamento com extensions) e um modo de processo dedicado no Android.

### AsyncStorage 3.0 — API de acesso nativo

O AsyncStorage 3.0 expõe uma API `StorageRegistry` no lado nativo:

```kotlin
// Android — escrever no AsyncStorage a partir do Kotlin
import com.reactnativecommunity.asyncstorage.StorageRegistry

StorageRegistry.getStorage(reactContext).set(
    key = "lastSyncTime",
    value = System.currentTimeMillis().toString()
)
```

```swift
// iOS — escrever a partir do Swift
import RNCAsyncStorage

RNCAsyncStorage.shared().setObject(
    Date().ISO8601Format(),
    forKey: "lastSyncTime"
)
```

[Guia oficial brownfield — AsyncStorage 3.0](https://react-native-async-storage.github.io/3.0/integrations/brownfield/)

### Padrão de bootstrap de sessão

Passe o token de sessão como prop inicial e mantenha-o sincronizado via eventos:

```kotlin
// No login — criar surface com contexto de sessão
val surface = reactHost.createSurface(
    activity = this,
    moduleName = "HomeTab",
    initialProps = Bundle().apply {
        putString("sessionToken", auth.token)
        putString("userId", auth.userId)
        putLong("sessionExpiry", auth.expiryMs)
    }
)

// Na renovação do token — notificar o JS
reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
    .emit("SessionRefreshed", Arguments.createMap().apply {
        putString("newToken", newToken)
        putLong("expiresAt", newExpiry)
    })
```

```typescript
// JS: consumir sessão das props + ouvir renovações
export default function HomeTab({ sessionToken, userId }: SessionProps) {
    const [token, setToken] = useState(sessionToken);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('SessionRefreshed', (e) => {
            setToken(e.newToken);
            httpClient.updateAuthHeader(e.newToken);
        });
        return () => sub.remove();
    }, []);

    // ...
}
```

---

## 8. Navegação Híbrida: Nativo ↔ RN

A navegação é a parte mais complexa do brownfield porque dois sistemas de navegação precisam parecer um único ao usuário.

### Os dois modelos mentais

**Nativo em primeiro lugar:** o stack de navegação nativo é a fonte única de verdade. Uma tela RN é apenas mais um item no stack — o `NavController` / `UINavigationController` nativo controla o comportamento de voltar, as transições e o botão de voltar.

**JS em primeiro lugar:** o `NavigationContainer` está na raiz, e as telas nativas são abertas via uma chamada TurboModule que faz push de um `UIViewController` / `Fragment` nativo. Isso só é viável se o RN controla a raiz do app, o que é raro em brownfield de verdade.

Para brownfield genuíno, **nativo em primeiro lugar é o modelo correto**.

### Android: fazendo push de um Fragment RN para o NavController nativo

```kotlin
// Em qualquer lugar no seu grafo de navegação nativo
fun navigateToRNCheckout(navController: NavController, orderId: String) {
    navController.navigate(
        R.id.action_productDetail_to_rnCheckout,
        Bundle().apply { putString("orderId", orderId) }
    )
}
```

No XML do grafo de navegação:

```xml
<!-- res/navigation/main_graph.xml -->
<fragment
    android:id="@+id/rnCheckoutFragment"
    android:name="com.myapp.CheckoutRNFragment"
    android:label="Checkout" />

<action
    android:id="@+id/action_productDetail_to_rnCheckout"
    app:destination="@id/rnCheckoutFragment"
    app:enterAnim="@anim/slide_in_right"
    app:exitAnim="@anim/slide_out_left" />
```

O botão de voltar do sistema e a navegação por gestos do Android fazem pop do Fragment automaticamente — nenhum código extra necessário.

### iOS: fazendo push de um ViewController RN para o UINavigationController

```swift
// A partir de qualquer UIViewController no seu fluxo existente
func navigateToRNCheckout(orderId: String) {
    let vc = CheckoutRNViewController()
    vc.orderId = orderId
    vc.title = "Checkout"
    navigationController?.pushViewController(vc, animated: true)
}
```

O gesto de deslizar para voltar funciona automaticamente porque o `UINavigationController` controla o gesto. A surface RN não o intercepta.

### Navegando do RN de volta para o nativo

Isso requer um TurboModule que chama a navegação nativa de forma imperativa.

```typescript
// src/modules/NativeNavigation.ts
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
    goBack(): void;
    navigateTo(screenName: string, params: Object): void;
    openNativeModal(modalId: string): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeNavigation');
```

```kotlin
// Implementação Android
class NativeNavigationModule(
    private val reactContext: ReactApplicationContext,
    private val navigationRouter: NativeNavigationRouter, // abstração de navegação do seu app
) : NativeNativeNavigationSpec(reactContext) {

    override fun getName() = NAME

    override fun goBack() {
        UiThreadUtil.runOnUiThread {
            navigationRouter.goBack()
        }
    }

    override fun navigateTo(screenName: String, params: ReadableMap) {
        UiThreadUtil.runOnUiThread {
            navigationRouter.navigate(screenName, params.toBundle())
        }
    }

    override fun openNativeModal(modalId: String) {
        UiThreadUtil.runOnUiThread {
            navigationRouter.openModal(modalId)
        }
    }

    companion object { const val NAME = "NativeNavigation" }
}
```

```swift
// Implementação iOS
@objc(NativeNavigation)
final class NativeNavigationModule: NSObject, RCTBridgeModule {

    static func moduleName() -> String { "NativeNavigation" }

    // Deve rodar na main thread — todo trabalho de UI
    static func requiresMainQueueSetup() -> Bool { true }

    @objc func goBack() {
        DispatchQueue.main.async {
            AppNavigationRouter.shared.goBack()
        }
    }

    @objc func navigateTo(_ screenName: String, params: NSDictionary) {
        DispatchQueue.main.async {
            AppNavigationRouter.shared.navigate(to: screenName, params: params as? [String: Any] ?? [:])
        }
    }
}
```

Uso a partir do lado RN:

```typescript
import NativeNavigation from '../modules/NativeNavigation';

function CheckoutScreen() {
    const handleSuccess = useCallback(() => {
        // Navegar para uma tela de confirmação nativa
        NativeNavigation.navigateTo('OrderConfirmation', { orderId });
    }, [orderId]);

    const handleClose = useCallback(() => {
        NativeNavigation.goBack();
    }, []);

    return (
        <View style={styles.container}>
            <CheckoutForm onSuccess={handleSuccess} onCancel={handleClose} />
        </View>
    );
}
```

### Tratando deep links

Deep links que chegam na camada nativa e devem abrir uma tela RN:

```kotlin
// Android: na sua Activity que trata deep links
override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    val uri = intent?.data ?: return

    when {
        uri.path?.startsWith("/checkout") == true -> {
            val orderId = uri.getQueryParameter("orderId") ?: return
            navigateToRNCheckout(orderId)
        }
        else -> nativeRouter.handleDeepLink(uri)
    }
}
```

Para a abordagem de contrato tipado da Callstack, veja [@callstack/brownfield-navigation](https://www.callstack.com/blog/handling-navigation-in-react-native-brownfield-apps).

---

## Materiais de Estudo

### Documentacao Oficial

| Recurso | Descricao |
|---|---|
| [Integration with Existing Apps](https://reactnative.dev/docs/integration-with-existing-apps) | Passo a passo oficial para Android + iOS |
| [Communication — iOS](https://reactnative.dev/docs/communication-ios) | Passagem de props, chamadas nativas, envio de eventos (iOS) |
| [Communication — Android](https://reactnative.dev/docs/communication-android) | O mesmo para Android |
| [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction) | Modulos nativos da Nova Arquitetura com Codegen |

### Bibliotecas

| Biblioteca | Finalidade | Link |
|---|---|---|
| `react-native-brownfield` | Singleton host + helpers para multiplas surfaces | [GitHub](https://github.com/callstack/react-native-brownfield) |
| `react-native-sandbox` | Runtimes JS isolados por surface | [GitHub](https://github.com/callstackincubator/react-native-sandbox) |
| `react-native-mmkv` | Armazenamento chave-valor compartilhado, nativo + JS | [GitHub](https://github.com/mrousavy/react-native-mmkv) |
| `@callstack/brownfield-navigation` | Contrato de navegacao tipado nativo <-> RN | [Post no blog](https://www.callstack.com/blog/handling-navigation-in-react-native-brownfield-apps) |

### Aprofundamentos — Blogs e Talks

| Recurso | Autor | O que voce vai aprender |
|---|---|---|
| [Add RN to Signal iOS](https://swmansion.com/blog/add-react-native-to-the-signal-open-source-app-part-1-ios-ffb61819031e/) | Software Mansion | Setup do RCTHost, integracao com UINavigationController, decisoes em escala de app real |
| [Add RN to Signal Android](https://blog.swmansion.com/add-react-native-to-the-signal-open-source-app-part-2-android-803c1b726582) | Software Mansion | ReactHost, back-stack de Fragment, repasse de lifecycle |
| [iOS Brownfield the Easy Way](https://www.callstack.com/blog/ios-brownfield-app-with-react-native-in-an-easy-way) | Callstack | API iOS do `react-native-brownfield`, caminho de migracao para Nova Arquitetura |
| [Android Brownfield the Easy Way](https://www.callstack.com/blog/android-brownfield-app-with-react-native-in-an-easy-way) | Callstack | Singleton `ReactInstanceManager`, `ReactFragment`, lifecycle de Activity |
| [Running Multiple RN Instances](https://www.callstack.com/blog/running-multiple-instances-of-react-native-in-sandbox) | Callstack | Isolamento em sandbox para super-apps, postMessage entre sandboxes |
| [Brownfield Integration: Exploring the Limits](https://www.youtube.com/watch?v=mOg29UnIMMA) | App.js Conf 2024 / Software Mansion | Talk de 35 min — casos extremos em producao, escala de 12 M de usuarios |
| [Async Storage 3.0 Brownfield](https://react-native-async-storage.github.io/3.0/integrations/brownfield/) | Community | API nativa `StorageRegistry` para leitura do AsyncStorage a partir do Kotlin/Swift |
| [Expo Brownfield Overview](https://docs.expo.dev/brownfield/overview/) | Expo | Abordagens integrada vs. isolada, setup por plataforma |

### Discussoes do Working Group (especificos da Nova Arquitetura)

| Thread | Ponto-chave |
|---|---|
| [reactwg #142 — TurboModules em apps existentes](https://github.com/reactwg/react-native-new-architecture/discussions/142) | Padroes de registro quando o nativo controla a maior parte da logica |
| [reactwg #143 — Fabric com Swift](https://github.com/reactwg/react-native-new-architecture/discussions/143) | Por que o Fabric exige Obj-C++ (nao pode ser chamado de Swift puro) |
| [reactwg #182 — ReactFragment + Nova Arch](https://github.com/reactwg/react-native-new-architecture/discussions/182) | Crash do ReactFragment (NullPointerException) corrigido no 0.76 |
| [PR #46980 — ReactActivity expoe ReactHost](https://github.com/facebook/react-native/pull/46980) | Novo getter `getReactHost()`, elimina necessidade de subclassificar ReactHostDelegate |

### Referencia Interativa

| Ferramenta | Finalidade |
|---|---|
| [flokol120/react-native-brownfield-examples](https://github.com/flokol120/react-native-brownfield-examples) | Repositorio com uma branch por capitulo: TurboModule, Fabric, sincronizacao de estado, event emitter — passo a passo do zero |

---

Proximo → **[TurboModules](../modulo-02-turbomodules/what-is-turbomodules/)**
