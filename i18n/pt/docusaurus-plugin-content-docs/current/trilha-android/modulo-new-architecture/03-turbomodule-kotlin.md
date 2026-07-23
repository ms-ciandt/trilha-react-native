---
title: "TurboModules em Kotlin"
sidebar_label: "TurboModules"
sidebar_position: 3
---

## Visão Geral em Vídeo

> Vídeo deste tópico em breve.

## O que é um TurboModule

Um TurboModule é um **módulo nativo para a Nova Arquitetura**. Ele substitui o padrão `ReactContextBaseJavaModule` por uma implementação orientada ao Codegen, com tipagem segura e suporte ao JSI.

| Módulo Nativo Antigo | TurboModule |
|----------------------|-------------|
| `ReactContextBaseJavaModule` | Classe Kotlin que implementa uma interface gerada pelo Codegen |
| Anotação `@ReactMethod` | Método definido na spec TypeScript |
| Somente async (Promise/Callback) | Síncrono ou assíncrono |
| Argumentos serializados em JSON | Tipos de valor JS diretos via JSI |
| Registrado na inicialização | Carregado sob demanda (lazy) |
| Sem tipagem segura end-to-end | TS spec → Codegen → interface Kotlin — totalmente tipado |

---

## Passo 1: A Spec TypeScript

A spec é o **contrato** entre JavaScript e Kotlin. É um arquivo TypeScript que o Codegen lê para gerar toda a cola C++/JNI.

```typescript
// src/specs/NativeDeviceInfoModule.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getDeviceModel(): string;
  getAndroidVersion(): number;
  getBatteryLevel(): Promise<number>;
  getNetworkType(): Promise<'wifi' | 'cellular' | 'none'>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeDeviceInfoModule');
```

---

## Passo 2: Configurar o Codegen

```json
{
  "name": "your-app",
  "codegenConfig": {
    "name": "AppSpecs",
    "type": "modules",
    "jsSrcsDir": "src/specs",
    "android": { "javaPackageName": "com.yourapp" }
  }
}
```

```bash
cd android && ./gradlew generateCodegenArtifactsFromSchema
```

---

## Passo 3: Implementação em Kotlin

```kotlin
package com.yourapp

import android.os.BatteryManager
import android.os.Build
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class NativeDeviceInfoModule(
    reactContext: ReactApplicationContext
) : NativeDeviceInfoModuleSpec(reactContext) {

    override fun getName() = "NativeDeviceInfoModule"

    override fun getDeviceModel(): String = "${Build.MANUFACTURER} ${Build.MODEL}"

    override fun getAndroidVersion(): Double = Build.VERSION.SDK_INT.toDouble()

    override fun getBatteryLevel(promise: Promise) {
        try {
            val bm = reactApplicationContext
                .getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            promise.resolve(bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY).toDouble())
        } catch (e: Exception) {
            promise.reject("BATTERY_ERROR", e.message, e)
        }
    }

    override fun getNetworkType(promise: Promise) {
        try {
            val cm = reactApplicationContext
                .getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val caps = cm.getNetworkCapabilities(cm.activeNetwork)
            val type = when {
                caps == null -> "none"
                caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
                else -> "none"
            }
            promise.resolve(type)
        } catch (e: Exception) {
            promise.reject("NETWORK_ERROR", e.message, e)
        }
    }

    override fun readFile(path: String, promise: Promise) {
        try {
            promise.resolve(java.io.File(path).readText())
        } catch (e: Exception) {
            promise.reject("FILE_READ_ERROR", "Não foi possível ler $path: ${e.message}", e)
        }
    }

    override fun writeFile(path: String, content: String, promise: Promise) {
        try {
            java.io.File(path).writeText(content)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FILE_WRITE_ERROR", "Não foi possível escrever $path: ${e.message}", e)
        }
    }
}
```

---

## TurboModule com Coroutines — Padrão Completo

A API baseada em Promise funciona, mas as coroutines Kotlin são mais idiomáticas. Esta seção cobre o padrão completo de produção: gerenciamento de escopo, seleção de dispatcher, cancelamento e streaming de dados para o JS via `callbackFlow`.

```kotlin
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
```

### Gerenciamento de Escopo: Nunca Vaze um CoroutineScope

O erro mais comum é criar um `CoroutineScope(Dispatchers.IO)` anônimo dentro de cada método — cada chamada cria um escopo sem ciclo de vida, então as coroutines podem sobreviver ao módulo ou executar após o contexto React ser destruído.

O padrão correto espelha o `viewModelScope` do ViewModel Android: um único escopo vinculado ao ciclo de vida do módulo, cancelado quando o módulo é invalidado.

```kotlin
class NativeDeviceInfoModule(
    reactContext: ReactApplicationContext
) : NativeDeviceInfoModuleSpec(reactContext) {

    // SupervisorJob: falha de um filho não cancela os outros
    private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun invalidate() {
        super.invalidate()
        moduleScope.cancel() // cancela todas as coroutines em andamento
    }
}
```

### Seleção de Dispatcher

| Tipo de trabalho | Dispatcher | Motivo |
|-----------------|-----------|--------|
| I/O de arquivo, rede, BD | `Dispatchers.IO` | Pool dimensionado para espera |
| Processamento intensivo de CPU | `Dispatchers.Default` | Pool dimensionado para cores de CPU |
| APIs do sistema Android | `Dispatchers.Main` | Alguns serviços exigem a thread principal |
| Resolver/rejeitar Promise | Qualquer | Promise é thread-safe |

```kotlin
override fun readFile(path: String, promise: Promise) {
    moduleScope.launch {
        try {
            val content = withContext(Dispatchers.IO) {
                java.io.File(path).readText()   // I/O bloqueante — correto no dispatcher IO
            }
            promise.resolve(content)
        } catch (e: CancellationException) {
            throw e                              // sempre re-lançar CancellationException
        } catch (e: Exception) {
            promise.reject("FILE_READ_ERROR", "Não foi possível ler $path: ${e.message}", e)
        }
    }
}

override fun processLargeDataset(data: ReadableArray, promise: Promise) {
    moduleScope.launch {
        try {
            val result = withContext(Dispatchers.Default) {
                // CPU-bound: parse e transformação — correto no dispatcher Default
                (0 until data.size()).map { i -> transformItem(data.getMap(i)) }
            }
            val output = Arguments.createArray()
            result.forEach { output.pushMap(it) }
            promise.resolve(output)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            promise.reject("PROCESSING_ERROR", e.message, e)
        }
    }
}
```

### Cancelamento: Respeitando a Concorrência Estruturada

```kotlin
private val activeJobs = mutableMapOf<String, Job>()

override fun startLongOperation(operationId: String, promise: Promise) {
    activeJobs[operationId]?.cancel() // cancela operação anterior com mesmo ID

    val job = moduleScope.launch {
        try {
            val result = withContext(Dispatchers.IO) { performLongOperation() }
            promise.resolve(result)
        } catch (e: CancellationException) {
            promise.reject("CANCELLED", "Operação $operationId foi cancelada")
            throw e
        } catch (e: Exception) {
            promise.reject("OPERATION_ERROR", e.message, e)
        } finally {
            activeJobs.remove(operationId)
        }
    }

    activeJobs[operationId] = job
}

override fun cancelOperation(operationId: String, promise: Promise) {
    activeJobs[operationId]?.cancel()
    activeJobs.remove(operationId)
    promise.resolve(true)
}
```

### callbackFlow — Streaming de Dados para o JS

Para fluxos contínuos (atualizações de sensor, observador de arquivo, eventos BLE), `callbackFlow` converte APIs Android baseadas em callback em um `Flow` de coroutine:

```kotlin
override fun startStream(intervalMs: Double, promise: Promise) {
    streamJob?.cancel()

    streamJob = moduleScope.launch {
        val sensorFlow = callbackFlow {
            val sm = reactApplicationContext
                .getSystemService(Context.SENSOR_SERVICE) as SensorManager
            val sensor = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

            val listener = object : SensorEventListener {
                override fun onSensorChanged(event: SensorEvent) { trySend(event) }
                override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}
            }

            sm.registerListener(listener, sensor, intervalMs.toInt() * 1000)

            // awaitClose executa quando o Flow é cancelado — limpa o listener
            awaitClose { sm.unregisterListener(listener) }
        }

        sensorFlow
            .conflate()   // descarta valores antigos se o JS não acompanhar
            .collect { event ->
                val params = Arguments.createMap().apply {
                    putDouble("x", event.values[0].toDouble())
                    putDouble("y", event.values[1].toDouble())
                    putDouble("z", event.values[2].toDouble())
                }
                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onAccelerometerData", params)
            }
    }

    promise.resolve(true)
}
```

---

## CMakeLists.txt — Quando Você Precisa de C++ em um TurboModule

Dois cenários exigem C++ diretamente:

1. **Envolver uma biblioteca C++** (OpenCV, SQLite, codec de áudio, crypto)
2. **Escrever um JSI HostObject diretamente** sem Codegen (máxima performance)

### Estrutura do Projeto

```
android/app/src/main/
  cpp/
    CMakeLists.txt
    NativeStorage.cpp
    NativeStorage.h
  java/com/yourapp/
    NativeStorageModule.kt
```

### CMakeLists.txt Explicado

```cmake
cmake_minimum_required(VERSION 3.13)
project(NativeStorage)

find_package(ReactAndroid REQUIRED CONFIG)

add_library(NativeStorage SHARED NativeStorage.cpp)

target_link_libraries(
    NativeStorage
    ReactAndroid::jsi
    ReactAndroid::react_nativemodule_core
    ReactAndroid::reactnativejni
    android
    log
)
```

Configure no `build.gradle`:

```groovy
android {
    defaultConfig {
        externalNativeBuild {
            cmake {
                cppFlags "-std=c++17 -fexceptions -frtti"
                arguments "-DANDROID_STL=c++_shared"
                abiFilters "arm64-v8a", "armeabi-v7a"
            }
        }
    }
    externalNativeBuild {
        cmake {
            path "src/main/cpp/CMakeLists.txt"
            version "3.22.1"
        }
    }
}
```

---

## O Bloco `react {}` do Gradle

Cada flag controla diretamente como o Metro, o Hermes e a Nova Arquitetura se comportam em tempo de build:

```groovy
// android/app/build.gradle
react {
    // Raiz do projeto JS (onde fica o package.json)
    root = file("../../")        // monorepo: dois níveis acima
    entryFile = file("../../index.js")

    // Hermes — padrão true no RN 0.70+, obrigatório para Nova Arquitetura
    hermesEnabled = true

    // Bundle JS em builds de release (padrão true)
    bundleInRelease = true

    // Bundle JS em builds de debug (padrão false — Metro serve ao vivo)
    bundleInDebug = false

    // Nova Arquitetura (Fabric + TurboModules + JSI sem bridge)
    // Padrão true no RN 0.76+
    newArchEnabled = true
}
```

### As flags mais importantes na prática

```groovy
react {
    hermesEnabled = true      // nunca desativar em produção
    newArchEnabled = true     // ativa Fabric, TurboModules, JSI sem bridge

    // Para monorepos — aponta para a raiz correta
    root = file("../../")
    entryFile = file("../../index.js")
}
```

---

## Carregamento Defensivo: getEnforcing vs get

```typescript
// getEnforcing — lança se o módulo não estiver disponível
export default TurboModuleRegistry.getEnforcing<Spec>('NativeDeviceInfoModule');

// get — retorna null se não disponível
const NativeDeviceInfo = TurboModuleRegistry.get<Spec>('NativeDeviceInfoModule');

function useDeviceInfo() {
  if (!NativeDeviceInfo) {
    return { model: 'desconhecido', androidVersion: 0 };
  }
  return {
    model: NativeDeviceInfo.getDeviceModel(),
    androidVersion: NativeDeviceInfo.getAndroidVersion(),
  };
}
```

---

## Go Deeper — React Native Masterclass

- [O que é TurboModules](/trilha-masterclass/modulo-03-turbomodules/what-is-turbomodules)
- [Specs TypeScript](/trilha-masterclass/modulo-03-turbomodules/specs-typescript)
- [Codegen](/trilha-masterclass/modulo-03-turbomodules/codegen)
- [get vs getEnforcing](/trilha-masterclass/modulo-03-turbomodules/get-vs-getenforcing)
- [Tipos Suportados](/trilha-masterclass/modulo-03-turbomodules/supported-types)
- [Testes e Mocks](/trilha-masterclass/modulo-03-turbomodules/tests-mocks)

---

## Materiais de Estudo

- [React Native — TurboModules](https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules)
- [React Native — Codegen](https://reactnative.dev/docs/the-new-architecture/pillars-codegen)
- [Nicola Corti — Building TurboModules](https://www.youtube.com/watch?v=B3BUnhMtXQQ)
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) — TurboModule de produção com JSI

---

## Próximo Passo

➡ [Fabric Native Component com Jetpack Compose](./04-fabric-component-compose)
