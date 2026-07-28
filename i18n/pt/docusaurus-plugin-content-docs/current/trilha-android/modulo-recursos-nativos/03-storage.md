---
title: "Storage & File System"
sidebar_label: "Storage"
sidebar_position: 3
---

## Video Overview

> Video para este tópico em breve.

## Opções de Storage Mapeadas do Android

| API Android | Equivalente React Native | Caso de uso |
|-------------|-------------------------|-------------|
| `SharedPreferences` | MMKV / AsyncStorage | Preferências chave-valor |
| `Room` (SQLite) | `expo-sqlite` | Dados relacionais / estruturados |
| `File` (armazenamento interno) | `expo-file-system` | Leitura/escrita de arquivos arbitrários |
| `MediaStore` / `SAF` | `expo-document-picker` | Usuário seleciona um arquivo |
| `ContentResolver` | `expo-media-library` | Acesso a fotos/vídeos |
| `EncryptedSharedPreferences` | MMKV com criptografia | Dados sensíveis chave-valor |

> O MMKV foi abordado no módulo de Fundamentos (State & APIs). Este módulo foca no acesso ao sistema de arquivos e ao SQLite.

---

## expo-file-system — File, Internal e Cache Storage

```bash
npx expo install expo-file-system
```

### Constantes de diretório

```tsx
import * as FileSystem from 'expo-file-system';

// Equivalente ao Context.getFilesDir() do Android
FileSystem.documentDirectory;
// file:///data/user/0/com.yourapp/files/

// Equivalente ao Context.getCacheDir()
FileSystem.cacheDirectory;
// file:///data/user/0/com.yourapp/cache/

// Diretório temporário de downloads
FileSystem.temporaryDirectory;
```

### Leitura e escrita de arquivos

```tsx
import * as FileSystem from 'expo-file-system';

const FILE_PATH = FileSystem.documentDirectory + 'user-settings.json';

// Escrever
async function saveSettings(settings: object) {
  await FileSystem.writeAsStringAsync(
    FILE_PATH,
    JSON.stringify(settings),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
}

// Ler
async function loadSettings(): Promise<object | null> {
  const info = await FileSystem.getInfoAsync(FILE_PATH);
  if (!info.exists) return null;

  const content = await FileSystem.readAsStringAsync(FILE_PATH);
  return JSON.parse(content);
}

// Deletar
await FileSystem.deleteAsync(FILE_PATH, { idempotent: true });

// Copiar
await FileSystem.copyAsync({
  from: FileSystem.cacheDirectory + 'temp.jpg',
  to: FileSystem.documentDirectory + 'photo.jpg',
});
```

### Download de arquivos

```tsx
async function downloadPDF(url: string): Promise<string> {
  const dest = FileSystem.documentDirectory + 'report.pdf';

  const { uri } = await FileSystem.downloadAsync(url, dest);
  return uri; // caminho local do arquivo
}

// Com rastreamento de progresso — como o progressListener do OkHttp
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

### Listando conteúdo de diretório

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

## expo-sqlite — Dados Relacionais

O `expo-sqlite` fornece um banco de dados SQLite — o mesmo engine do `android.database.sqlite.SQLiteDatabase` do Android, mas acessado a partir do JavaScript.

```bash
npx expo install expo-sqlite
```

### Abrindo um banco de dados

```tsx
import * as SQLite from 'expo-sqlite';

// Abre ou cria o arquivo de banco de dados
const db = SQLite.openDatabaseSync('myapp.db');
```

### Criação de schema — como o @Database do Room

```tsx
// Executar uma vez na inicialização do app — equivalente ao @Database do Room com createFromAsset
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

### Operações CRUD

```tsx
// INSERT — como o @Insert do Room
function insertUser(name: string, email: string): number {
  const result = db.runSync(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    name, email
  );
  return result.lastInsertRowId;
}

// SELECT — como o @Query do Room
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

### Operações assíncronas (sem bloqueio)

```tsx
// Use as versões async para evitar bloquear a thread JS
async function loadUsers(): Promise<User[]> {
  return await db.getAllAsync<User>(
    'SELECT * FROM users ORDER BY name ASC'
  );
}

// Async dentro do useEffect
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

### Transações — como o @Transaction do Room

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
    // Se qualquer runSync lançar uma exceção, a transação é revertida automaticamente
  });
}
```

### Usando com React Query

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

Equivalente ao `Intent.ACTION_OPEN_DOCUMENT` / `StorageAccessFramework` do Android:

```bash
npx expo install expo-document-picker
```

```tsx
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

async function pickAndReadFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'text/plain', 'image/*'],
    copyToCacheDirectory: true, // copia para o cache do app — seguro para leitura
    multiple: false,
  });

  if (result.canceled) return;

  const file = result.assets[0];
  console.log('Name:', file.name);
  console.log('Size:', file.size);
  console.log('MIME:', file.mimeType);

  // Ler o conteúdo do arquivo
  if (file.mimeType === 'text/plain') {
    const content = await FileSystem.readAsStringAsync(file.uri);
    console.log('Content:', content);
  }

  return file;
}
```

---

## Armazenamento Seguro — Equivalente ao Keystore

Para dados sensíveis (tokens, chaves), use `expo-secure-store` — respaldado pelo Android Keystore no Android e pelo Keychain no iOS:

```bash
npx expo install expo-secure-store
```

```tsx
import * as SecureStore from 'expo-secure-store';

// Escrever — criptografado, com hardware-backing no Android
await SecureStore.setItemAsync('auth_token', 'eyJhbGc...');

// Ler
const token = await SecureStore.getItemAsync('auth_token');

// Deletar
await SecureStore.deleteItemAsync('auth_token');

// Verificar disponibilidade (alguns emuladores não têm Keystore)
const available = await SecureStore.isAvailableAsync();
```

> O `expo-secure-store` usa o Android Keystore (`KeyGenerator` + `KeyStore`) — o mesmo sistema que você usaria no Android nativo para o `EncryptedSharedPreferences`. Os valores são criptografados com AES-256 e vinculados ao dispositivo.

---

## Material de Estudo

### Documentacao Oficial

- [expo-file-system — Documentacao](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [expo-sqlite — Documentacao](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [expo-document-picker — Documentacao](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [expo-secure-store — Documentacao](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Android — Visao geral de armazenamento de dados e arquivos](https://developer.android.com/training/data-storage)

### Videos

- [Simon Grimm — Tutorial expo-sqlite](https://www.youtube.com/watch?v=AoMmDW_SeGc)

---

## Proximo Passo

Storage concluido. A seguir: sensores e APIs do dispositivo — acelerometro, giroscopio, GPS, vibracao e brilho de tela, todos mapeados a partir do SensorManager e LocationManager do Android.

➡ [Sensores e APIs do Dispositivo](./04-sensors-device-apis)
