---
title: "Storage & File System"
sidebar_label: "Storage"
sidebar_position: 3
---

## Video Overview

> Video for this topic coming soon.

## Storage Options Mapped from Android

| Android API | React Native equivalent | Use case |
|-------------|------------------------|----------|
| `SharedPreferences` | MMKV / AsyncStorage | Key-value preferences |
| `Room` (SQLite) | `expo-sqlite` | Relational / structured data |
| `File` (internal storage) | `expo-file-system` | Read/write arbitrary files |
| `MediaStore` / `SAF` | `expo-document-picker` | User picks a file |
| `ContentResolver` | `expo-media-library` | Access photos/videos |
| `EncryptedSharedPreferences` | MMKV with encryption | Sensitive key-value data |

> MMKV was covered in the Fundamentals module (State & APIs). This module focuses on file system access and SQLite.

---

## expo-file-system — File, Internal and Cache Storage

```bash
npx expo install expo-file-system
```

### Directory constants

```tsx
import * as FileSystem from 'expo-file-system';

// Equivalent of Android's Context.getFilesDir()
FileSystem.documentDirectory;
// file:///data/user/0/com.yourapp/files/

// Equivalent of Context.getCacheDir()
FileSystem.cacheDirectory;
// file:///data/user/0/com.yourapp/cache/

// Temporary downloads directory
FileSystem.temporaryDirectory;
```

### Reading and writing files

```tsx
import * as FileSystem from 'expo-file-system';

const FILE_PATH = FileSystem.documentDirectory + 'user-settings.json';

// Write
async function saveSettings(settings: object) {
  await FileSystem.writeAsStringAsync(
    FILE_PATH,
    JSON.stringify(settings),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
}

// Read
async function loadSettings(): Promise<object | null> {
  const info = await FileSystem.getInfoAsync(FILE_PATH);
  if (!info.exists) return null;

  const content = await FileSystem.readAsStringAsync(FILE_PATH);
  return JSON.parse(content);
}

// Delete
await FileSystem.deleteAsync(FILE_PATH, { idempotent: true });

// Copy
await FileSystem.copyAsync({
  from: FileSystem.cacheDirectory + 'temp.jpg',
  to: FileSystem.documentDirectory + 'photo.jpg',
});
```

### Downloading files

```tsx
async function downloadPDF(url: string): Promise<string> {
  const dest = FileSystem.documentDirectory + 'report.pdf';

  const { uri } = await FileSystem.downloadAsync(url, dest);
  return uri; // local file path
}

// With progress tracking — like OkHttp's progressListener
async function downloadWithProgress(
  url: string,
  onProgress: (progress: number) => void
): Promise<string> {
  const dest = FileSystem.documentDirectory + 'file.zip';

  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    dest,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      const progress = totalBytesWritten / totalBytesExpectedToWrite;
      onProgress(progress);
    }
  );

  const result = await downloadResumable.downloadAsync();
  return result?.uri ?? '';
}
```

### Listing directory contents

```tsx
async function listDocuments() {
  const files = await FileSystem.readDirectoryAsync(
    FileSystem.documentDirectory!
  );
  // ['user-settings.json', 'photo.jpg', ...]
  return files;
}
```

---

## expo-sqlite — Relational Data

`expo-sqlite` provides a SQLite database — the same engine as Android's `android.database.sqlite.SQLiteDatabase`, but accessed from JavaScript.

```bash
npx expo install expo-sqlite
```

### Opening a database

```tsx
import * as SQLite from 'expo-sqlite';

// Opens or creates the database file
const db = SQLite.openDatabaseSync('myapp.db');
```

### Schema creation — like Room @Database

```tsx
// Run once at app startup — equivalent to Room's @Database with createFromAsset
db.execSync(`
  CREATE TABLE IF NOT EXISTS users (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title   TEXT NOT NULL,
    body    TEXT
  );
`);
```

### CRUD operations

```tsx
// INSERT — like Room @Insert
function insertUser(name: string, email: string): number {
  const result = db.runSync(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    name, email
  );
  return result.lastInsertRowId;
}

// SELECT — like Room @Query
function getAllUsers(): User[] {
  return db.getAllSync<User>('SELECT * FROM users ORDER BY created_at DESC');
}

function getUserById(id: number): User | null {
  return db.getFirstSync<User>('SELECT * FROM users WHERE id = ?', id);
}

// UPDATE
function updateUser(id: number, name: string) {
  db.runSync('UPDATE users SET name = ? WHERE id = ?', name, id);
}

// DELETE
function deleteUser(id: number) {
  db.runSync('DELETE FROM users WHERE id = ?', id);
}
```

### Async operations (non-blocking)

```tsx
// Use async versions to avoid blocking the JS thread
async function loadUsers(): Promise<User[]> {
  return await db.getAllAsync<User>(
    'SELECT * FROM users ORDER BY name ASC'
  );
}

// Async inside useEffect
function UserListScreen() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    db.getAllAsync<User>('SELECT * FROM users').then(setUsers);
  }, []);

  return (
    <FlatList
      data={users}
      keyExtractor={u => String(u.id)}
      renderItem={({ item }) => <Text>{item.name}</Text>}
    />
  );
}
```

### Transactions — like Room @Transaction

```tsx
function transferPoints(fromId: number, toId: number, points: number) {
  db.withTransactionSync(() => {
    db.runSync(
      'UPDATE users SET points = points - ? WHERE id = ?',
      points, fromId
    );
    db.runSync(
      'UPDATE users SET points = points + ? WHERE id = ?',
      points, toId
    );
    // If any runSync throws, the transaction is rolled back automatically
  });
}
```

### Using with React Query

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => db.getAllAsync<User>('SELECT * FROM users'),
  });
}

function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) =>
      db.runAsync('INSERT INTO users (name, email) VALUES (?, ?)', name, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
```

---

## expo-document-picker — Storage Access Framework

Equivalent to Android's `Intent.ACTION_OPEN_DOCUMENT` / `StorageAccessFramework`:

```bash
npx expo install expo-document-picker
```

```tsx
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

async function pickAndReadFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'text/plain', 'image/*'],
    copyToCacheDirectory: true, // copies to app cache — safe to read
    multiple: false,
  });

  if (result.canceled) return;

  const file = result.assets[0];
  console.log('Name:', file.name);
  console.log('Size:', file.size);
  console.log('MIME:', file.mimeType);

  // Read the file content
  if (file.mimeType === 'text/plain') {
    const content = await FileSystem.readAsStringAsync(file.uri);
    console.log('Content:', content);
  }

  return file;
}
```

---

## Secure Storage — Keystore Equivalent

For sensitive data (tokens, keys), use `expo-secure-store` — backed by Android Keystore on Android and Keychain on iOS:

```bash
npx expo install expo-secure-store
```

```tsx
import * as SecureStore from 'expo-secure-store';

// Write — encrypted, hardware-backed on Android
await SecureStore.setItemAsync('auth_token', 'eyJhbGc...');

// Read
const token = await SecureStore.getItemAsync('auth_token');

// Delete
await SecureStore.deleteItemAsync('auth_token');

// Check availability (some emulators lack Keystore)
const available = await SecureStore.isAvailableAsync();
```

> `expo-secure-store` uses Android Keystore (`KeyGenerator` + `KeyStore`) — the same system you'd use in native Android for `EncryptedSharedPreferences`. Values are AES-256 encrypted and tied to the device.

---

## Study Materials

### Official Documentation

- [expo-file-system — Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [expo-sqlite — Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [expo-document-picker — Documentation](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [expo-secure-store — Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Android — Data and file storage overview](https://developer.android.com/training/data-storage)

### Videos

- [Simon Grimm — expo-sqlite Tutorial](https://www.youtube.com/watch?v=AoMmDW_SeGc)

---

## What's Next

Storage covered. Next: sensors and device APIs — accelerometer, gyroscope, GPS, vibration, and screen brightness, all mapped from Android's SensorManager and LocationManager.

➡ [Sensors & Device APIs](./04-sensors-device-apis)
