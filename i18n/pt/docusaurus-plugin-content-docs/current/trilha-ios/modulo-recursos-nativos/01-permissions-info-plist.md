---
title: Permissions e Info.plist
---

# Permissions e Info.plist

Se você vem do desenvolvimento iOS nativo com Swift, sabe que permissões são gerenciadas em dois lugares: o `Info.plist` (declaração estática de intenção) e as APIs de runtime como `AVCaptureDevice.requestAccess` ou `CLLocationManager.requestWhenInUseAuthorization`. No React Native, o modelo é idêntico — você ainda precisa do `Info.plist` e ainda chama APIs de runtime — mas a camada de JavaScript abstrai parte do processo. Este documento cobre tudo que você precisa saber.

---

## Info.plist: NSUsageDescription keys

O sistema iOS exige que todo app declare, no `Info.plist`, uma string de propósito (`NSUsageDescription`) para cada categoria de recurso protegido que o app acessar. A ausência de qualquer uma dessas strings causa crash em runtime com a mensagem `This app has crashed because it attempted to access privacy-sensitive data without a usage description`. O App Store Connect também rejeita binários sem as strings adequadas.

A seguir, cada chave relevante para um app React Native típico:

### Câmera

```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to let you scan QR codes and capture photos for your profile.</string>
```

Ativada quando qualquer código (JS ou módulo nativo) tenta inicializar uma sessão `AVCaptureSession`. No RN, isso ocorre ao usar `expo-camera`, `react-native-camera` ou qualquer biblioteca que acesse `AVCaptureDevice`.

### Microfone

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app uses the microphone to record audio messages.</string>
```

Necessária mesmo quando a câmera é o foco principal — se a sessão de captura incluir áudio (configuração padrão de `expo-camera`), ambas as strings são obrigatórias.

### Biblioteca de fotos (leitura)

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>This app reads your photo library to let you choose a profile picture.</string>
```

Ativada quando o app lê imagens existentes via `PHPhotoLibrary` (por exemplo, ao usar `expo-image-picker` com `mediaTypes: ImagePicker.MediaTypeOptions.Images`).

### Biblioteca de fotos (escrita)

```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>This app saves photos to your library after you capture them.</string>
```

Separada da chave de leitura desde o iOS 11. Necessária apenas quando o app grava na biblioteca — salvar fotos ou vídeos. Se o app só lê, esta chave é desnecessária.

### Localização em uso

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to show nearby places.</string>
```

Chave mínima para qualquer acesso de localização. Cobre o uso enquanto o app está em foreground.

### Localização sempre (background)

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app tracks your location in the background to log your running routes.</string>
```

Necessária quando o app solicita autorização `Always`. O iOS exige que `NSLocationWhenInUseUsageDescription` também esteja presente — as duas coexistem.

> Nota: `NSLocationAlwaysUsageDescription` (sem "AndWhenInUse") foi depreciada no iOS 11 e ignorada a partir do iOS 13. Use somente a chave combinada.

### Contatos

```xml
<key>NSContactsUsageDescription</key>
<string>This app accesses your contacts to help you find friends already using the app.</string>
```

Qualquer acesso ao framework `Contacts` — inclusive leitura somente.

### Calendário e lembretes

```xml
<key>NSCalendarsUsageDescription</key>
<string>This app adds events to your calendar when you schedule a meeting.</string>
```

```xml
<key>NSRemindersUsageDescription</key>
<string>This app creates reminders for your upcoming tasks.</string>
```

São chaves separadas — acessar `EKEntityTypeEvent` requer a primeira, `EKEntityTypeReminder` requer a segunda.

### Bluetooth

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to connect to your fitness device.</string>
```

Obrigatória desde o iOS 13 para qualquer uso de `CoreBluetooth`, mesmo em foreground. A chave antiga `NSBluetoothPeripheralUsageDescription` ainda existe mas é considerada legada.

### Movimento e pedômetro

```xml
<key>NSMotionUsageDescription</key>
<string>This app uses motion data to count your steps.</string>
```

Necessária para acesso ao `CMMotionActivityManager` ou `CMPedometer` via `CoreMotion`.

### Face ID

```xml
<key>NSFaceIDUsageDescription</key>
<string>This app uses Face ID to authenticate securely without a password.</string>
```

Necessária para chamar `LAContext.evaluatePolicy`. Diferente das outras — a ausência não causa crash imediato, mas o sistema recusa a autenticação e retorna o erro `LAErrorBiometryNotAvailable`.

---

## Expo Config Plugins: injeção automática no Info.plist

Em projetos Expo com Managed Workflow ou Bare Workflow usando `expo-prebuild`, você não edita o `Info.plist` manualmente. Em vez disso, as bibliotecas fornecem Config Plugins que injetam as chaves automaticamente durante `npx expo prebuild`.

### Como funciona o padrão `withInfoPlist`

Um Config Plugin é uma função que recebe a configuração Expo e retorna a configuração modificada. O modificador `withInfoPlist` lê e escreve o `Info.plist`:

```js
// plugin/withCameraPermission.js
const { withInfoPlist } = require('@expo/config-plugins');

const withCameraPermission = (config, { cameraPermission, microphonePermission }) => {
  return withInfoPlist(config, (config) => {
    config.modResults['NSCameraUsageDescription'] =
      cameraPermission ?? 'Allow $(PRODUCT_NAME) to access the camera.';
    config.modResults['NSMicrophoneUsageDescription'] =
      microphonePermission ?? 'Allow $(PRODUCT_NAME) to access the microphone.';
    return config;
  });
};

module.exports = withCameraPermission;
```

### Configuração via app.json / app.config.js

A maioria das bibliotecas Expo aceita as strings diretamente no `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "This app uses the camera to scan QR codes.",
          "microphonePermission": "This app records audio during video capture.",
          "recordAudioAndroid": true
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "This app accesses your photos to set a profile picture."
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "This app tracks your location to log routes.",
          "locationWhenInUsePermission": "This app shows your position on the map."
        }
      ]
    ]
  }
}
```

Após alterar as strings, rode `npx expo prebuild --clean` para regenerar os arquivos nativos. O `Info.plist` em `ios/<AppName>/Info.plist` refletirá as mudanças.

> Nunca edite o `Info.plist` gerado manualmente em projetos que usam prebuild — suas alterações serão sobrescritas na próxima execução.

---

## Bare Workflow: edição manual do Info.plist

Em projetos Bare Workflow sem Config Plugins (ou ao adicionar uma biblioteca que não fornece plugin), você edita o `Info.plist` diretamente.

### Localização do arquivo

```
ios/
  <AppName>/
    Info.plist    ← editar aqui
  <AppName>.xcworkspace
```

### Via Xcode (recomendado)

1. Abra `<AppName>.xcworkspace` no Xcode.
2. No Project Navigator, selecione `<AppName>/Info.plist`.
3. Clique em `+` em qualquer linha para adicionar uma nova chave.
4. Digite o nome da chave — o Xcode autocompleta e exibe o nome legível ("Privacy - Camera Usage Description").
5. Na coluna "Value", insira a string de propósito.

Editar via Xcode reduz o risco de erro de digitação no nome da chave.

### Via editor de texto (XML direto)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- ... outras chaves do app ... -->

  <key>NSCameraUsageDescription</key>
  <string>This app uses the camera to capture photos.</string>

  <key>NSPhotoLibraryUsageDescription</key>
  <string>This app reads photos to set your profile picture.</string>

  <key>NSPhotoLibraryAddUsageDescription</key>
  <string>This app saves captured photos to your library.</string>

</dict>
</plist>
```

### Erros comuns que causam rejeição no App Store

- **Nome de chave incorreto**: `NSCameraPermission` em vez de `NSCameraUsageDescription` — a chave errada é silenciosamente ignorada pelo sistema; o app passa nos testes internos mas é rejeitado na revisão.
- **String vazia ou genérica**: `"This app needs access."` — a Apple exige que a string explique o uso específico. Strings vagas são rejeitadas sob a diretriz 5.1.1 (Data Collection and Storage).
- **Chave presente mas recurso não declarado na PrivacyInfo**: a partir do iOS 17, a ausência do `PrivacyInfo.xcprivacy` para APIs que o exigem pode causar rejeição automatizada.

---

## Fluxo de permissão em runtime: modelo iOS vs Android

### O modelo one-shot do iOS

No iOS, o sistema exibe o diálogo de permissão uma única vez. Se o usuário negar, o app nunca mais pode solicitar — o diálogo não reaparece. Para usar o recurso, o usuário precisa ir manualmente em Ajustes > Privacidade e conceder acesso. Isso é fundamentalmente diferente do Android, onde o app pode solicitar novamente (com `shouldShowRequestPermissionRationale` como guia).

**Implicação de UX**: no iOS, você tem uma única chance de apresentar o contexto antes de o diálogo do sistema aparecer. A estratégia recomendada é exibir uma tela de "pré-autorização" (customizada) explicando o valor da funcionalidade, e só então disparar `requestPermissionsAsync`. Isso aumenta significativamente a taxa de concessão.

### Comparação Swift nativo vs React Native

**Swift (UIKit):**

```swift
import AVFoundation

func requestCameraAccess() {
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    switch status {
    case .notDetermined:
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                if granted {
                    self.openCamera()
                } else {
                    self.showSettingsAlert()
                }
            }
        }
    case .authorized:
        openCamera()
    case .denied, .restricted:
        showSettingsAlert()
    @unknown default:
        break
    }
}
```

**React Native (expo-camera):**

```tsx
import { useCameraPermissions } from 'expo-camera';

export function CameraButton() {
  const [permission, requestPermission] = useCameraPermissions();

  const handlePress = async () => {
    if (!permission) return;

    if (permission.status === 'undetermined') {
      const result = await requestPermission();
      if (result.granted) {
        openCamera();
      } else {
        showSettingsPrompt();
      }
      return;
    }

    if (permission.granted) {
      openCamera();
    } else {
      showSettingsPrompt();
    }
  };

  return <Button title="Open Camera" onPress={handlePress} />;
}
```

O padrão é equivalente ao Swift: verificar o status, solicitar se `undetermined`, redirecionar para Ajustes caso `denied`.

---

## expo-modules-core: padrão requestPermissionsAsync

Para bibliotecas baseadas em `expo-modules-core`, a API de permissões segue um padrão consistente:

```tsx
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import { Linking } from 'react-native';

async function requestLocationPermission() {
  // Verificar status atual sem solicitar
  const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  if (existingStatus === 'denied') {
    // iOS: única opção é redirecionar para Ajustes
    await Linking.openSettings();
    return false;
  }

  // existingStatus === 'undetermined' — solicitar
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

async function requestContactsPermission() {
  const { status } = await Contacts.requestPermissionsAsync();
  return status === 'granted';
}
```

### Máquina de estados de permissão

```
undetermined
    │
    │  requestPermissionsAsync()
    │
    ├──── (usuário aceita) ──── granted
    │
    └──── (usuário recusa) ──── denied
                                    │
                                    │  Linking.openSettings()
                                    │
                               [usuário vai em Ajustes
                                e concede manualmente]
                                    │
                                    ▼
                                 granted
                          (verificar na volta ao app)
```

Para detectar quando o usuário volta de Ajustes e pode ter alterado a permissão, use o evento `AppState`:

```tsx
import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import * as Camera from 'expo-camera';

function usePermissionRefresh(onForeground: () => void) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        onForeground();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [onForeground]);
}

// Uso:
usePermissionRefresh(async () => {
  const { granted } = await Camera.getCameraPermissionsAsync();
  setHasPermission(granted);
});
```

---

## PrivacyInfo.xcprivacy (iOS 17+)

A partir do iOS 17, e obrigatório para submissões ao App Store desde maio de 2024, a Apple exige que apps e SDKs de terceiros declarem o uso de "Required Reason APIs" em um arquivo `PrivacyInfo.xcprivacy`.

### O que são Required Reason APIs

São categorias de APIs que podem ser usadas para fingerprinting de dispositivo. A Apple mantém a lista em: [developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api)

Exemplos relevantes para apps RN:
- `NSFileSystemFreeSize` / `NSFileSystemSize` — usado internamente pelo Hermes e algumas bibliotecas
- `UserDefaults` — usado por `@react-native-async-storage/async-storage`
- `NSUserDefaults` — `expo-constants` e outros módulos
- Timestamps do sistema de arquivos (`NSURLContentModificationDateKey`)

### O que o Expo SDK 56 / RN 0.76 gerencia automaticamente

O Expo SDK 56 inclui `PrivacyInfo.xcprivacy` nos módulos que integra (expo-file-system, expo-constants etc.). O React Native 0.76 também inclui o manifesto para o core framework. Você não precisa declarar as APIs usadas por essas bibliotecas — cada pacote declara o próprio manifesto.

### O que você deve adicionar manualmente

Se o seu app chama diretamente alguma Required Reason API (e não por meio de uma biblioteca que já declara), ou se usa uma biblioteca de terceiros sem manifesto de privacidade, você precisa adicionar ou complementar o `PrivacyInfo.xcprivacy`.

**Localização do arquivo:**

```
ios/
  <AppName>/
    PrivacyInfo.xcprivacy    ← criar aqui se não existir
```

**Estrutura do arquivo:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <!-- CA92.1: app stores user preferences -->
        <string>CA92.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <!-- C617.1: show file timestamps to the user -->
        <string>C617.1</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyTracking</key>
  <false/>
</dict>
</plist>
```

Os códigos de razão (como `CA92.1`) vêm da documentação oficial da Apple para cada categoria de API. Usar um código incorreto ou ausente resulta em rejeição automatizada pelo App Store Connect.

---

## App Store Review: evitando rejeições

### Diretriz 5.1.1 — Data Collection and Storage

A Apple rejeita apps quando:

1. **NSUsageDescription está ausente**: o binário usa uma API protegida mas não declarou a string correspondente. O sistema automatizado de revisão detecta o uso de frameworks privados no binário e cruza com o `Info.plist`.

2. **String genérica ou enganosa**: strings como `"Required for app functionality"` são rejeitadas. A string deve especificar o dado coletado e o motivo — preferencialmente mencionando a funcionalidade concreta que o usuário reconhecerá.

3. **Permissão solicitada sem uso correspondente**: solicitar acesso à câmera em um app que não tem nenhuma funcionalidade de câmera visível ao usuário resulta em rejeição por coleta desnecessária de dados.

### Boas práticas para strings de permissão

| Chave | Exemplo ruim | Exemplo bom |
|---|---|---|
| NSCameraUsageDescription | "App needs camera" | "Scan product barcodes and capture photos for your order" |
| NSLocationWhenInUseUsageDescription | "Location access required" | "Show your current position on the delivery map" |
| NSContactsUsageDescription | "Access to contacts" | "Find friends already using the app by matching phone numbers" |

### Checklist antes de submeter

- Toda chave `NSUsageDescription` está presente para cada API usada (verificar todas as bibliotecas de terceiros)
- Nenhuma string está vazia ou genérica
- `PrivacyInfo.xcprivacy` está presente e declara as Required Reason APIs utilizadas
- Permissões de background location (`NSLocationAlwaysAndWhenInUseUsageDescription`) somente estao presentes se o app realmente usa localização em background
- O fluxo de pré-autorização explica o valor da funcionalidade antes de disparar o diálogo do sistema
- O app redireciona corretamente para Ajustes quando a permissão está negada, sem travar o usuário

---

## Referência rápida: biblioteca → chave(s) necessária(s)

| Biblioteca | Chaves obrigatórias |
|---|---|
| expo-camera (foto) | NSCameraUsageDescription |
| expo-camera (vídeo) | NSCameraUsageDescription, NSMicrophoneUsageDescription |
| expo-image-picker (leitura) | NSPhotoLibraryUsageDescription |
| expo-image-picker (salvar) | NSPhotoLibraryAddUsageDescription |
| expo-location (foreground) | NSLocationWhenInUseUsageDescription |
| expo-location (background) | NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription |
| expo-contacts | NSContactsUsageDescription |
| expo-local-authentication | NSFaceIDUsageDescription |
| react-native-bluetooth-classic | NSBluetoothAlwaysUsageDescription |
| expo-sensors (pedometer) | NSMotionUsageDescription |
| expo-calendar | NSCalendarsUsageDescription |

---

O proximo arquivo desta trilha cobre modulos nativos com TurboModules e como expor APIs Swift diretamente ao JavaScript.
