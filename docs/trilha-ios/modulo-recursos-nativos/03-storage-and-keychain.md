---
title: Storage and Keychain in React Native
---

# Storage and Keychain in React Native

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/rec_03_storage-and-keychain.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

iOS gives you a well-structured storage hierarchy: `UserDefaults` for lightweight preferences, `NSFileManager` for the file system, `CoreData` or `SwiftData` for structured relational data, and the Keychain for secrets. React Native maps naturally to each layer, usually through a library that wraps the same platform API under the hood.

---

## UserDefaults → react-native-mmkv

`UserDefaults` is a synchronous, key-value store backed by a plist file. React Native's built-in `AsyncStorage` covers the same use case but is asynchronous and significantly slower — benchmark data from the mmkv maintainers shows it is 10–30x slower than a native synchronous store.

`react-native-mmkv` wraps Tencent's MMKV library, the same engine used in WeChat. It uses memory-mapped files and synchronous reads, which mirrors how `UserDefaults` behaves for iOS developers.

```bash
npx expo install react-native-mmkv
```

### Basic usage

```typescript
import { MMKV } from 'react-native-mmkv';

// Create a store — analogous to UserDefaults.standard or a custom suite
const storage = new MMKV();

// Write — synchronous, like UserDefaults.set(_:forKey:)
storage.set('onboardingCompleted', true);
storage.set('userLocale', 'en-US');
storage.set('retryCount', 3);

// Read — synchronous, typed, like UserDefaults.bool(forKey:)
const completed = storage.getBoolean('onboardingCompleted'); // boolean | undefined
const locale = storage.getString('userLocale');              // string | undefined
const retries = storage.getNumber('retryCount');             // number | undefined

// Delete — analogous to UserDefaults.removeObject(forKey:)
storage.delete('retryCount');

// Store complex objects as JSON strings, just as you would with UserDefaults + Codable
const user = { id: '42', name: 'Beatriz' };
storage.set('currentUser', JSON.stringify(user));
const raw = storage.getString('currentUser');
const parsed = raw ? JSON.parse(raw) : null;
```

### Isolated stores (suite equivalent)

`UserDefaults(suiteName:)` creates isolated stores for app groups. MMKV supports the same pattern:

```typescript
// Separate store per feature — analogous to UserDefaults(suiteName: "com.app.auth")
const authStorage = new MMKV({ id: 'auth-store' });
const cacheStorage = new MMKV({ id: 'cache-store' });
```

### React integration with Zustand

The most ergonomic pattern in React Native is persisting a Zustand store with MMKV as the storage backend. This mirrors what you would achieve with `@AppStorage` in SwiftUI.

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const zustandStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

interface SettingsStore {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  setTheme: (theme: 'light' | 'dark') => void;
}

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'light',
      notificationsEnabled: true,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
```

### Performance comparison

| Operation | AsyncStorage | react-native-mmkv |
|-----------|-------------|-------------------|
| Read | async, ~2 ms | sync, ~0.1 ms |
| Write | async, ~5 ms | sync, ~0.3 ms |
| Startup serialization | on-demand plist | memory-mapped |
| Thread safety | JS thread only | multi-thread safe |

Use MMKV for any data you would previously store in `UserDefaults`. Use `AsyncStorage` only when a library you depend on requires it as a peer dependency.

---

## NSFileManager → expo-file-system

`NSFileManager` exposes iOS sandbox directories. `expo-file-system` wraps `NSFileManager` on iOS (and its Android equivalent), exposing the same directory semantics through a JavaScript API.

```bash
npx expo install expo-file-system
```

### Directory mapping

| iOS (Swift) | expo-file-system |
|-------------|-----------------|
| `NSDocumentDirectory` | `FileSystem.documentDirectory` |
| `NSCachesDirectory` | `FileSystem.cacheDirectory` |
| `NSTemporaryDirectory()` | `FileSystem.temporaryDirectory` |

The semantics are identical to what you already know:

- `documentDirectory` — iCloud-eligible, iTunes-backed, persists across app updates. Use for user-generated content.
- `cacheDirectory` — no backup, may be removed by the OS under storage pressure. Use for downloaded assets and derived data.
- `temporaryDirectory` — cleared on reboot. Use for in-progress uploads or conversions.

### Reading and writing files

```typescript
import * as FileSystem from 'expo-file-system';

// Analogous to FileManager.default.contentsOfDirectory(atPath:)
const listDirectory = async () => {
  const contents = await FileSystem.readDirectoryAsync(
    FileSystem.documentDirectory!
  );
  console.log(contents); // string[] of file names
};

// Write a text file — analogous to String.write(to:atomically:encoding:)
const writeFile = async () => {
  const path = FileSystem.documentDirectory + 'notes.txt';
  await FileSystem.writeAsStringAsync(path, 'Hello from React Native', {
    encoding: FileSystem.EncodingType.UTF8,
  });
};

// Read a text file — analogous to String(contentsOf:encoding:)
const readFile = async () => {
  const path = FileSystem.documentDirectory + 'notes.txt';
  const content = await FileSystem.readAsStringAsync(path);
  return content;
};

// Get file metadata — analogous to FileManager.attributesOfItem(atPath:)
const getInfo = async (uri: string) => {
  const info = await FileSystem.getInfoAsync(uri);
  // info.exists, info.size, info.modificationTime, info.isDirectory
  return info;
};

// Delete a file — analogous to FileManager.removeItem(at:)
const deleteFile = async (uri: string) => {
  await FileSystem.deleteAsync(uri, { idempotent: true });
};
```

### Downloading files to cache

```typescript
import * as FileSystem from 'expo-file-system';

const downloadAsset = async (url: string, filename: string) => {
  const localUri = FileSystem.cacheDirectory + filename;
  const info = await FileSystem.getInfoAsync(localUri);

  // Only download if not cached — same pattern as URLCache in iOS
  if (info.exists) {
    return localUri;
  }

  const { uri } = await FileSystem.downloadAsync(url, localUri);
  return uri;
};
```

### Document picker

`expo-document-picker` maps to `UIDocumentPickerViewController`. It returns a URI in the app's `cacheDirectory` or a content URI you can copy to `documentDirectory`:

```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const pickAndSave = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return;

  const file = result.assets[0];
  const destination = FileSystem.documentDirectory + file.name;

  await FileSystem.copyAsync({
    from: file.uri,
    to: destination,
  });

  return destination;
};
```

---

## CoreData / SwiftData → expo-sqlite + TanStack Query

`CoreData` and `SwiftData` are SQLite-backed object-graph persistence frameworks. React Native has no direct framework-level equivalent, but `expo-sqlite` v2 exposes SQLite through a modern async API, and `TanStack Query` handles the caching, invalidation, and UI-sync layer that SwiftData's `@Query` provides.

```bash
npx expo install expo-sqlite
npm install @tanstack/react-query
```

### Database initialization

```typescript
import * as SQLite from 'expo-sqlite';

// Open or create a database — analogous to NSPersistentContainer(name:)
const db = await SQLite.openDatabaseAsync('app.db');

// Run migrations at startup
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);
```

### CRUD operations

```typescript
// INSERT — analogous to context.insert(_:)
const insertNote = async (note: { id: string; title: string; body: string }) => {
  await db.runAsync(
    'INSERT INTO notes (id, title, body, created_at) VALUES (?, ?, ?, ?)',
    note.id,
    note.title,
    note.body,
    Date.now()
  );
};

// SELECT — analogous to a SwiftData @Query fetch
const fetchNotes = async () => {
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    body: string;
    created_at: number;
  }>('SELECT * FROM notes ORDER BY created_at DESC');
  return rows;
};

// UPDATE
const updateNote = async (id: string, title: string, body: string) => {
  await db.runAsync(
    'UPDATE notes SET title = ?, body = ? WHERE id = ?',
    title,
    body,
    id
  );
};

// DELETE — analogous to context.delete(_:)
const deleteNote = async (id: string) => {
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
};
```

### TanStack Query as the SwiftData @Query equivalent

SwiftData's `@Query` automatically updates the view when the store changes. TanStack Query replicates this with `useQuery` and `invalidateQueries`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: fetchNotes,
  });
}

function useDeleteNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    // Invalidate and re-fetch after deletion — analogous to @Query auto-refresh
    onSuccess: () => client.invalidateQueries({ queryKey: ['notes'] }),
  });
}

// In a component:
function NotesList() {
  const { data: notes, isLoading } = useNotes();
  const { mutate: remove } = useDeleteNote();

  if (isLoading) return <ActivityIndicator />;

  return (
    <FlatList
      data={notes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <NoteRow note={item} onDelete={() => remove(item.id)} />
      )}
    />
  );
}
```

---

## Keychain → expo-secure-store

The iOS Keychain stores small encrypted secrets protected by the Secure Enclave and the device passcode. `expo-secure-store` wraps `SecItemAdd` / `SecItemCopyMatching` / `SecItemDelete` and exposes an async API equivalent to the Keychain's protection classes.

```bash
npx expo install expo-secure-store
```

### Basic usage

```typescript
import * as SecureStore from 'expo-secure-store';

// Store a secret — analogous to SecItemAdd with kSecValueData
await SecureStore.setItemAsync('authToken', 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');

// Read — analogous to SecItemCopyMatching
const token = await SecureStore.getItemAsync('authToken');

// Delete — analogous to SecItemDelete
await SecureStore.deleteItemAsync('authToken');
```

### Biometric protection (kSecAttrAccessibleWhenUnlocked)

In the Keychain API, `kSecAttrAccessibleWhenUnlocked` restricts access to authenticated sessions. `expo-secure-store` maps to that class by default and adds Face ID / Touch ID requirements through `requireAuthentication`:

```typescript
import * as SecureStore from 'expo-secure-store';

// Store with biometric requirement — equivalent to kSecAccessControlBiometryCurrentSet
await SecureStore.setItemAsync('privateKey', sensitiveValue, {
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to access your private key',
});

// Reading will automatically trigger Face ID / Touch ID prompt
const key = await SecureStore.getItemAsync('privateKey', {
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to access your private key',
});
```

### Keychain accessibility mapping

| iOS Keychain accessibility | expo-secure-store behavior |
|---------------------------|---------------------------|
| `kSecAttrAccessibleWhenUnlocked` | Default — accessible when device is unlocked |
| `kSecAttrAccessibleAfterFirstUnlock` | Not directly exposed — use default in most cases |
| `kSecAccessControlBiometryCurrentSet` | `requireAuthentication: true` |
| `kSecAttrSynchronizable` | Not supported — iCloud Keychain sync is unavailable |

:::warning Keychain size limit
The Keychain is designed for small secrets — tokens, passwords, cryptographic keys. Do not store large payloads. If you need to protect a large file, store the encryption key in the Keychain and the encrypted file in `documentDirectory`.
:::

---

## iCloud Sync Considerations

React Native has no direct equivalent to `NSUbiquitousKeyValueStore` or `CloudKit`. When migrating an iOS app that uses iCloud sync, evaluate each storage layer separately:

| iOS mechanism | React Native approach |
|---------------|-----------------------|
| `NSUbiquitousKeyValueStore` | No direct equivalent — use a backend (Supabase, Firebase) for cross-device sync |
| `CloudKit` private database | Replace with a REST or GraphQL backend; no RN library wraps CloudKit natively |
| iCloud Drive (Documents entitlement) | `expo-file-system` writes to `documentDirectory`, but iCloud Drive sync requires the entitlement and a custom config plugin |
| `CloudKit` public database | Replace with a standard backend |

If iCloud Drive is a hard requirement, use a bare workflow with the `com.apple.developer.icloud-container-identifiers` entitlement and call `NSFileManager` through a custom TurboModule. This is uncommon — evaluate whether a backend-driven sync meets the same user need before investing in the native implementation.

---

## Migrating Existing Native Storage

When integrating an existing iOS codebase into React Native (brownfield integration), native storage already contains user data that must remain accessible.

### Reading existing UserDefaults through a TurboModule

```swift
// ios/MyModule/MyModuleImpl.swift
import Foundation

@objc(MyModule)
class MyModule: NSObject {
  @objc func getMigratedPreferences(_ resolve: RCTPromiseResolveBlock,
                                     reject: RCTPromiseRejectBlock) {
    let defaults = UserDefaults.standard
    let payload: [String: Any] = [
      "onboardingCompleted": defaults.bool(forKey: "onboardingCompleted"),
      "userLocale": defaults.string(forKey: "userLocale") ?? "",
      "retryCount": defaults.integer(forKey: "retryCount"),
    ]
    resolve(payload)
  }
}
```

Call this once at app startup, write the values to MMKV, then delete the originals from `UserDefaults` to avoid duplicate sources of truth.

### Reading existing Keychain entries

If the existing app stored tokens with a known service name and account, read them through a TurboModule using `SecItemCopyMatching` and rewrite them via `expo-secure-store`. Both APIs write to the same Keychain under the same app bundle identifier, so keys are accessible from both sides during the migration window.

### One-time migration guard

```typescript
import { MMKV } from 'react-native-mmkv';
import NativeMyModule from './specs/NativeMyModule';

const storage = new MMKV();

async function runMigrationIfNeeded() {
  const migrated = storage.getBoolean('nativeMigrationCompleted');
  if (migrated) return;

  const prefs = await NativeMyModule.getMigratedPreferences();
  storage.set('onboardingCompleted', prefs.onboardingCompleted);
  storage.set('userLocale', prefs.userLocale);

  storage.set('nativeMigrationCompleted', true);
}
```

Run `runMigrationIfNeeded()` in your root component or app initialization sequence before rendering any screen that depends on persisted state.

---

## Choosing the Right Layer

| Use case | Swift (iOS) | React Native |
|----------|-------------|--------------|
| Feature flags, preferences | `UserDefaults` | `react-native-mmkv` |
| Session token, API key | Keychain | `expo-secure-store` |
| Downloaded assets, derived cache | `NSCachesDirectory` | `FileSystem.cacheDirectory` |
| User documents, exports | `NSDocumentDirectory` | `FileSystem.documentDirectory` |
| Structured relational data | CoreData / SwiftData | `expo-sqlite` + TanStack Query |
| Large binary data | `NSFileManager` + `documentDirectory` | `expo-file-system` |
| Cross-device sync | CloudKit / `NSUbiquitousKeyValueStore` | Backend (Supabase, Firebase) |

The mental model translates directly: the layer boundaries iOS enforces are the same ones React Native respects, because on iOS the same underlying APIs are in use.
