---
id: utilizando-recursos-nativos
title: "Utilizando Recursos Nativos"
sidebar_label: "Utilizando Recursos Nativos"
sidebar_position: 1
---

# Tópico 1 — Utilizando Recursos Nativos (Trilha 1: Devs Web/React)

---

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Entender o modelo de permissões mobile (muito mais restritivo que o browser)
- Solicitar, verificar e tratar permissões bloqueadas
- Capturar fotos com expo-camera
- Acessar geolocalização
- Usar storage local
- Enviar e receber notificações push
- Saber quando e como pesquisar libs no ecossistema Expo

---

## O que NÃO existe no mobile (mas existe no browser)

| API Browser | Por que não existe no RN | Alternativa |
|-------------|-------------------------|-------------|
| `navigator.geolocation` | Sem `window`/`navigator` | `expo-location` |
| `navigator.mediaDevices.getUserMedia()` | Sem WebRTC / DOM | `expo-camera` / `react-native-vision-camera` |
| `Notification API` | Sem Service Workers | `expo-notifications` |
| `localStorage` | Sem DOM Storage | MMKV / AsyncStorage |
| `File API` | Sem FileSystem web | `expo-file-system` / `react-native-fs` |
| `Clipboard API` | Parcialmente diferente | `expo-clipboard` |
| `fetch` | ✅ Existe! | Funciona igual |
| `WebSocket` | ✅ Existe! | Funciona igual |

---

## O modelo de permissões no mobile

No browser, o modelo é binário: o usuário aceita ou rejeita no diálogo do navegador, e você reage a isso. No mobile, o modelo é mais restritivo e tem estados adicionais que mudam o comportamento do app.

A diferença mais importante é o estado `BLOCKED`: no iOS, o sistema exibe o diálogo de permissão **uma única vez** — se o usuário negar, o OS nunca mais mostra esse diálogo. O app não pode forçar uma nova exibição; só pode redirecionar para as Configurações do sistema. No Android, o comportamento variou entre versões: a partir do Android 11, o sistema também pode bloquear permissões automaticamente se o app não for usado por um tempo.

Outro estado sem equivalente no browser é o `LIMITED`, introduzido no iOS 14 para a biblioteca de fotos: o usuário pode escolher quais fotos específicas o app pode acessar, em vez de dar acesso total ao rolo. Seu app precisa tratar esse estado de forma diferente de `GRANTED`.

```
Permissão não verificada
        ↓
    check()  ←─── sempre verifique antes de pedir
        ↓
┌──────────────────┐
│ DENIED (padrão)  │ → request() → dialog para o usuário
│ GRANTED          │ → pode usar o recurso
│ BLOCKED          │ → usuário negou e "nunca perguntar novamente"
│ LIMITED (iOS)    │ → acesso parcial (ex: fotos selecionadas)
│ UNAVAILABLE      │ → recurso não existe no dispositivo
└──────────────────┘
```

A razão de sempre chamar `check()` antes de `request()` é precisa: se o status já é `BLOCKED`, chamar `request()` não faz nada — nenhum diálogo aparece, nenhum erro é lançado. Sem o check, o botão da sua UI parece quebrado para o usuário.

> **Estado BLOCKED é irreversível pelo app** — você só pode redirecionar o usuário para as Configurações do sistema. É o equivalente a "permissão permanentemente negada" e requer atenção especial no UX.

---

## 1. Permissões com react-native-permissions

```bash
npm install react-native-permissions
cd ios && pod install
```

**Podfile (iOS)** — descomentar o que for usar:
```ruby
setup_permissions(['Camera', 'LocationWhenInUse', 'PhotoLibrary'])
```

**Info.plist (iOS):**
```xml
<key>NSCameraUsageDescription</key>
<string>Usamos a câmera para você tirar fotos do produto.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Usamos sua localização para mostrar lojas próximas.</string>
```

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### Hook reutilizável de permissão

```tsx
import { check, request, PERMISSIONS, RESULTS, openSettings, Permission } from 'react-native-permissions';
import { Platform, Alert } from 'react-native';

export async function requestPermission(
  iosPermission: Permission,
  androidPermission: Permission,
  featureName: string
): Promise<boolean> {
  const permission = Platform.select({
    ios: iosPermission,
    android: androidPermission,
  })!;

  const currentStatus = await check(permission);

  if (currentStatus === RESULTS.GRANTED) return true;

  if (currentStatus === RESULTS.BLOCKED) {
    Alert.alert(
      `Permissão para ${featureName} bloqueada`,
      `Você bloqueou o acesso. Habilite nas configurações do dispositivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Configurações', onPress: openSettings },
      ]
    );
    return false;
  }

  const result = await request(permission);
  return result === RESULTS.GRANTED;
}

// Uso
const granted = await requestPermission(
  PERMISSIONS.IOS.CAMERA,
  PERMISSIONS.ANDROID.CAMERA,
  'câmera'
);
```

---

## 2. Câmera com expo-camera

### Por que não funciona igual ao browser

No browser, `getUserMedia()` retorna um `MediaStream` que você conecta a um elemento `<video>` no DOM. Tudo é web API, não há hardware direto.

No mobile, não existe DOM. A câmera é hardware acessado via APIs nativas de baixo nível: `Camera2`/`CameraX` no Android e `AVFoundation` no iOS. `expo-camera` encapsula esse acesso nativo em um componente React — `<CameraView>` — que renderiza o preview da câmera como uma View nativa na tela, não um elemento HTML.

O ref funciona como ferramenta de acesso imperativo à câmera: `cameraRef.current?.takePictureAsync()` dispara o shutter no hardware e retorna um objeto com a URI do arquivo salvo localmente. Essa URI é um caminho no filesystem do dispositivo (ex: `file:///var/mobile/...`), não uma URL de rede.

```bash
npx expo install expo-camera
```

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { View, Button, Image, StyleSheet } from 'react-native';

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Tela de permissão — similar ao `getUserMedia` no browser
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Button title="Permitir acesso à câmera" onPress={requestPermission} />
      </View>
    );
  }

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.8,
      base64: false, // URI local, não base64
    });
    setPhotoUri(photo?.uri ?? null);
  }

  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />
        <Button title="Tirar outra" onPress={() => setPhotoUri(null)} />
      </View>
    );
  }

  return (
    <CameraView ref={cameraRef} style={styles.camera} facing="back">
      <View style={styles.buttonContainer}>
        <Button title="Fotografar" onPress={takePicture} />
      </View>
    </CameraView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  buttonContainer: { position: 'absolute', bottom: 40, alignSelf: 'center' },
  preview: { width: '100%', height: '80%', resizeMode: 'contain' },
});
```

---

## 3. Geolocalização com expo-location

### Por que não funciona igual ao browser

`navigator.geolocation.getCurrentPosition()` existe no browser e funciona via Web API — o navegador abstrai a fonte de localização (GPS, Wi-Fi, IP). No React Native, não existe `window.navigator` — o runtime é Hermes (JS engine), não um browser.

A localização mobile é mais poderosa do que no browser e por isso mais regulada. No browser, o usuário aceita ou nega no nível da aba. No mobile, existe a distinção entre **foreground** (localização enquanto o app está visível) e **background** (localização quando o app está em segundo plano ou fechado). Background location requer permissão separada nas duas plataformas, justificativa para as stores e tem impacto direto na bateria — você só deve solicitar se o app genuinamente precisar (apps de delivery, fitness, rastreamento).

O parâmetro `accuracy` determina qual fonte de hardware é usada. `High` ativa o GPS, que é preciso mas consome bateria. `Balanced` usa a fusão de GPS + Wi-Fi + rede celular (FusedLocationProvider no Android), que equilibra precisão e consumo. Para apps que só precisam saber a cidade ou bairro do usuário, `Low` é suficiente e muito mais eficiente.

```bash
npx expo install expo-location
```

```tsx
import * as Location from 'expo-location';

// Equivalente ao navigator.geolocation.getCurrentPosition()
async function getLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    alert('Permissão de localização negada');
    return;
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };
}

// Monitoramento contínuo (equivalente ao watchPosition)
async function watchLocation(onUpdate: (coords: { lat: number; lng: number }) => void) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;

  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 3000 },
    (location) => {
      onUpdate({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    }
  );

  return () => subscription.remove(); // cleanup
}
```

---

## 4. Notificações Push com expo-notifications

### Por que é tão diferente do browser

A Web Notification API usa Service Workers — scripts que o browser mantém rodando em background para receber mensagens via Push API. No mobile não existe esse conceito: quem mantém a conexão aberta e entrega as notificações é o **sistema operacional**, não o app.

O fluxo real de uma notificação push no mobile é:

```
Seu backend → FCM (Android) / APNs (iOS) → SO → app
```

O dispositivo abre uma conexão persistente com os servidores do Google (FCM) ou da Apple (APNs). Quando seu backend quer notificar o usuário, ele não manda direto para o dispositivo — ele faz um request autenticado para o FCM ou APNs, que entrega ao dispositivo pela conexão que já está aberta. Isso significa que o app pode estar fechado: a notificação chega via SO, não via JavaScript.

O `expoPushToken` retornado por `getExpoPushTokenAsync()` é um identificador que o Expo usa como intermediário. O Expo tem seus próprios servidores que recebem seu request e repassam para o FCM ou APNs correto, evitando que você precise configurar credenciais separadas para iOS e Android. Em produção com alto volume, equipes costumam migrar para envio direto ao FCM/APNs para ter controle total.

O `setNotificationHandler` controla o que acontece quando uma notificação chega enquanto o app está em **foreground**. Sem ele, notificações recebidas com o app aberto são silenciosas. O comportamento em background e com o app fechado é controlado pelo sistema operacional.

```bash
npx expo install expo-notifications expo-device
```

```tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';

// Configuração global do comportamento ao receber notificação
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Notificações push não funcionam no simulador');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data; // envie este token para o seu backend
}

// Hook para gerenciar notificações na tela
export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    registerForPushNotifications();

    // Listener para notificações recebidas com o app aberto
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notificação recebida:', notification);
      }
    );

    return () => {
      notificationListener.current?.remove();
    };
  }, []);
}
```

---

## Como encontrar libs no ecossistema Expo

No browser, você busca `npm install <pacote>` e geralmente o pacote roda. No React Native, muitas libs têm código nativo (Java/Kotlin para Android, Objective-C/Swift para iOS) que precisa ser compilado junto com o app. Isso muda a dinâmica de escolha de dependência.

Quando você precisa de um recurso nativo, siga essa ordem:

1. **[docs.expo.dev](https://docs.expo.dev)** — Se existe uma lib `expo-*`, ela é a primeira opção. Libs do Expo são testadas em conjunto com a versão do Expo SDK que você usa, têm manutenção garantida pelo time do Expo e funcionam com Expo Go durante o desenvolvimento sem precisar de build nativo.
2. **[reactnative.directory](https://reactnative.directory)** — Diretório da comunidade com filtros por plataforma, suporte a New Architecture e data de última atualização. Prefira libs marcadas como compatíveis com New Architecture.
3. **npm** com filtro `react-native-*` como último recurso.

A compatibilidade com **New Architecture** (JSI + TurboModules) é um critério importante: libs que ainda usam o modelo antigo de bridge podem ter problemas de performance ou deprecação futura. O React Native Directory indica isso explicitamente.

> Sempre verifique a data do último commit e o número de issues abertas antes de adotar uma lib de terceiro em produção.

---

## Diferenças que pegam o dev web de surpresa

| Expectativa (web) | Realidade (mobile) |
|------------------|-------------------|
| Permissão é simples: aceitar ou negar | 5 estados possíveis: GRANTED, DENIED, BLOCKED, LIMITED, UNAVAILABLE |
| Câmera via `getUserMedia` | Componente React (`<CameraView>`) com ref para tirar foto |
| `navigator.geolocation.getCurrentPosition` | Função assíncrona com permissão explícita |
| `new Notification(...)` | Sistema complexo com tokens, servidores push (APNs/FCM) |
| `localStorage.setItem` | `storage.set(key, value)` síncrono (MMKV) |

---

## Exercício prático

1. Crie uma tela que solicita permissão de câmera com UX para o estado `BLOCKED`
2. Implemente captura de foto e exiba a preview
3. Salve a URI da foto no MMKV para persistir entre sessões
4. Mostre a localização atual do usuário em um `Text`
5. Configure notificações push e exiba o token gerado

---

## Materiais de estudo

### Artigos e Docs
- [Expo Permissions Guide — Documentação oficial](https://docs.expo.dev/guides/permissions/)
- [Expo Camera — Documentação oficial](https://docs.expo.dev/versions/latest/sdk/camera/)
- [VisionCamera — Getting Started](https://react-native-vision-camera.com/docs/guides)
- [Master React Native Permissions — CoderCrafter](https://codercrafter.in/blogs/react-native/master-react-native-permissions-a-no-bs-guide-to-camera-location-access)
- [Comprehensive Guide to Permissions in React Native 2025](https://www.iamrajklwr.com/blogs/a-comprehensive-guide-to-managing-permissions-in-react-native-2025)
- [How to Handle Platform-Specific Permissions — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-permissions/view)
- [react-native-permissions — GitHub](https://github.com/zoontek/react-native-permissions)
- [Implementing Camera Functionality in React Native — LogRocket (Dez 2024)](https://blog.logrocket.com/implementing-camera-functionality-react-native/)
- [PermissionsAndroid — Documentação oficial React Native](https://reactnative.dev/docs/permissionsandroid)

---

Next → **[Integração Nativa](./topico-integracao-nativa-web)**
