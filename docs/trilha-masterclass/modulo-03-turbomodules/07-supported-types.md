---
title: Supported Types and Serialization
---

# Supported Types and Serialization

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_masterclass/mc02_07_supported-types.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> Codegen validates types at **build time**. Invalid types are Codegen errors, not runtime crashes. This is one of the biggest safety improvements over the old bridge — type mismatches become CI failures, not production incidents.

---

## Primitive Types

| TypeScript | Android (Java/Kotlin) | iOS (ObjC++/C++) | Notes |
|---|---|---|---|
| `string` | `String` | `NSString *` | Always by value |
| `boolean` | `boolean` | `BOOL` | |
| `number` | `double` | `double` | All JS numbers are double at the JSI level |
| `Int32` | `int` | `int32_t` | Import from `'react-native/Libraries/Types/CodegenTypes'` |
| `Float` | `float` | `float` | Same import |
| `Double` | `double` | `double` | Same import — explicit intent |

```typescript
import type { Int32, Float, Double } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  setVolume(level: Float): void;          // float on native
  seekTo(positionMs: Int32): void;        // int on native
  computePrecise(value: Double): Double;  // explicit double
  getCount(): number;                     // also double — fine for most cases
}
```

> `Int32` was affected by a bug in some RN versions where Codegen generated `double` instead of `int` in Java. Verify with `./gradlew generateCodegenArtifactsFromSchema` and inspect the output. Reference: [#45659](https://github.com/facebook/react-native/issues/45659).

---

## Object Types

| TypeScript | Android | iOS | Notes |
|---|---|---|---|
| `Object` | `ReadableMap` | `NSDictionary *` | Untyped — avoid in new code |
| `{ key: string; count: number }` | `ReadableMap` | `NSDictionary *` | Typed literal — Codegen validates shape |
| `Readonly<{ key: string; count: number }>` | Same | Same | Preferred — communicates immutability |

**Always prefer typed object literals over `Object`:**

```typescript
// Avoid — Codegen cannot validate the shape
logEvent(name: string, payload: Object): void;

// Prefer — Codegen knows the exact fields
type EventPayload = Readonly<{
  name: string;
  value: number;
  tags: string[];
  metadata: Object;  // only use Object for truly arbitrary data
}>;

logEvent(payload: EventPayload): void;
```

On the native side, typed objects still arrive as `ReadableMap` (Android) / `NSDictionary` (iOS) — but Codegen validates that you are passing the right shape from JS, and the generated dispatch code extracts fields by name at the C++ layer before handing them to your implementation.

---

## Array Types

| TypeScript | Android | iOS |
|---|---|---|
| `Array<string>` | `ReadableArray` | `NSArray<NSString *> *` |
| `Array<number>` | `ReadableArray` | `NSArray<NSNumber *> *` |
| `Array<Readonly<{ id: string; label: string }>>` | `ReadableArray` | `NSArray *` |

Arrays are **read-only at the JSI boundary** — mutations in native are not reflected in JS. Return a new array if you need to communicate changes.

```typescript
export interface Spec extends TurboModule {
  // Returns an immutable snapshot
  getAllKeys(): Array<string>;

  // Takes a read-only list — native must not hold a reference after the call
  setMultipleItems(entries: Array<Readonly<{ key: string; value: string }>>): void;
}
```

---

## Nullable Types

```typescript
export interface Spec extends TurboModule {
  // Nullable return — native returns null when the value is absent
  getCachedUser(id: string): Readonly<UserType> | null;

  // Nullable parameter — native receives null as an explicit absence signal
  configure(options: Readonly<ConfigType> | null): void;

  // Nullable string
  getLastError(): string | null;
}
```

**Important constraint:** `number` cannot be nullable in a TurboModule spec.

```typescript
// NOT valid in a spec — Codegen error
getProgress(): number | null;

// Valid workarounds:
getProgress(): Readonly<{ value: number; hasValue: boolean }> | null;
getProgress(): number; // use -1 as sentinel
```

---

## Async Types: Promise

```typescript
export interface Spec extends TurboModule {
  // Simple async
  fetchData(url: string): Promise<string>;

  // Typed object result
  getUserProfile(id: string): Promise<Readonly<{
    name: string;
    email: string;
    avatarUrl: string | null;
  }>>;

  // Promise<void> — signals completion with no data
  clearCache(): Promise<void>;
}
```

**Android implementation:**

```kotlin
override fun fetchData(url: String, promise: Promise) {
    coroutineScope.launch(Dispatchers.IO) {
        try {
            val result = httpClient.get(url)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("FETCH_ERROR", e.message, e)
        }
    }
}
```

**iOS implementation:**

```objc
- (void)fetchData:(NSString *)url
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSError *error = nil;
        NSString *result = [self->_client GET:url error:&error];
        if (error) {
            reject(@"FETCH_ERROR", error.localizedDescription, error);
        } else {
            resolve(result);
        }
    });
}
```

---

## Callback Types

Valid, but prefer Promises. Use callbacks only when the native API is inherently callback-based and the overhead of wrapping in a Promise is not justified.

```typescript
// Valid — one-shot callback
getDeviceId(callback: (id: string) => void): void;

// Better — composable with async/await
getDeviceId(): Promise<string>;
```

Callbacks cannot be called more than once without creating a new native invocation — use `EventEmitter` for recurring events.

---

## EventEmitter (RN 0.76+)

`EventEmitter` is a spec-level type that generates typed event subscription code on both platforms. It replaces the old `NativeEventEmitter` + `DeviceEventEmitter` pattern.

```typescript
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  startLocationUpdates(intervalMs: number): void;
  stopLocationUpdates(): void;

  readonly onLocationChanged: EventEmitter<Readonly<{
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
  }>>;

  readonly onPermissionChanged: EventEmitter<Readonly<{
    granted: boolean;
    status: string;
  }>>;
}
```

**Emitting from Android:**

```kotlin
// Codegen generates emitOnLocationChanged — no string keys, fully typed
emitOnLocationChanged(Arguments.createMap().apply {
    putDouble("latitude", location.latitude)
    putDouble("longitude", location.longitude)
    putDouble("accuracy", location.accuracy.toDouble())
    putNull("altitude")
})
```

**Emitting from iOS:**

```objc
// Codegen generates this method signature — compiler-checked parameters
[self emitOnLocationChangedWithLatitude:location.coordinate.latitude
                              longitude:location.coordinate.longitude
                               accuracy:location.horizontalAccuracy
                               altitude:nil];
```

**Subscribing in JS:**

```typescript
useEffect(() => {
    NativeLocation.startLocationUpdates(1000);

    const sub = NativeLocation.onLocationChanged((loc) => {
        // loc is fully typed: { latitude, longitude, accuracy, altitude }
        setCoordinates({ lat: loc.latitude, lng: loc.longitude });
    });

    return () => {
        sub.remove();
        NativeLocation.stopLocationUpdates();
    };
}, []);
```

---

## Unsupported Types — Codegen Will Error

| Type | Why unsupported | Alternative |
|---|---|---|
| `number \| null` | Numbers map to primitive types with no null representation in C++ | Use `{ value: number } \| null` or a sentinel |
| `Partial<T>` | Codegen's parser does not resolve utility types | Expand to explicit optional fields |
| `number \| boolean` | Non-string unions not supported in method params | Two separate methods |
| `Map<K, V>` | No JSI equivalent | `Object` or typed object literal |
| `Set<T>` | No JSI equivalent | `Array<T>` with dedup in native |
| Recursive types | Parser cannot resolve cycles | Flatten the structure |
| Generic type params `<T>` | Codegen specs must be concrete | Specialize per method |
| `Tuple` (`[string, number]`) | No JSI equivalent | Use a typed object |

---

## The Serialization Cost That No Longer Exists

With the old bridge, every value was serialized to JSON and back. With JSI/TurboModules:

- `string` → C++ `std::string` → `jsi::String` — zero-copy in Hermes
- `number` → `double` — primitive, no allocation
- `Object` → `jsi::Object` — reference, not a serialized copy
- `Array` → `jsi::Array` — reference, not a serialized copy

The only serialization that still happens is at the **native implementation boundary** — when Kotlin/Swift code builds a `WritableMap` (Android) or `NSDictionary` (iOS) to return to JS. This is unavoidable without pure C++ modules, but the overhead is far smaller than the old JSON-over-queue model.

---

## Study Materials

| Resource | Description |
|---|---|
| [TurboModules Introduction — Appendix](https://reactnative.dev/docs/appendix) | Official type mapping table |
| [Codegen Missing Features — reactwg #91](https://github.com/reactwg/react-native-new-architecture/discussions/91) | Unsupported types list and roadmap |
| [Int32 generates double on Java — #45659](https://github.com/facebook/react-native/issues/45659) | Numeric type generation bug + workaround |
| [EventEmitter PR — facebook/react-native](https://github.com/facebook/react-native/pull/44459) | PR that introduced typed EventEmitter to Codegen specs |

---

Next → [Tests and Mocks for Native Modules](./tests-mocks)
