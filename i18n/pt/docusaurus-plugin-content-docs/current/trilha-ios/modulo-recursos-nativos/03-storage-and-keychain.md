---
title: Storage and Keychain in React Native
---

# Storage e Keychain no React Native

## Visão Geral em Vídeo

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/rec_03_storage-and-keychain.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_ios/rec_03_storage-and-keychain.vtt" srclang="pt" label="Português" default>
  Seu navegador não suporta a tag de vídeo.
</video>

O iOS oferece uma hierarquia de armazenamento bem estruturada: `UserDefaults` para preferências leves, `NSFileManager` para o sistema de arquivos, `CoreData` ou `SwiftData` para dados relacionais estruturados, e o Keychain para segredos. O React Native se encaixa naturalmente em cada camada, geralmente por meio de uma biblioteca que envolve a mesma API da plataforma por baixo dos panos.

---

## UserDefaults → react-native-mmkv

`UserDefaults` é um armazenamento síncrono de chave-valor baseado em um arquivo plist. O `AsyncStorage` nativo do React Native cobre o mesmo caso de uso, mas é assíncrono e significativamente mais lento — dados de benchmark dos mantenedores do mmkv mostram que ele é 10–30x mais lento do que um armazenamento síncrono nativo.

O `react-native-mmkv` envolve a biblioteca MMKV da Tencent, o mesmo mecanismo usado no WeChat. Ele usa arquivos mapeados em memória e leituras síncronas, o que espelha o comportamento do `UserDefaults` para desenvolvedores iOS.

```bash
npx expo install react-native-mmkv
```

### Uso básico

```typescript
import { MMKV } from 'react-native-mmkv';

// Create a store — analogous to UserDefaults.standard or a custom suite
const storage = new MMKV();

// Write — synchronous, like UserDefaults.set(_:forKey:)
storage.set('onboardingCompleted', true);
storage.set('userLocale', 'pt-BR');
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

### Armazenamentos isolados (equivalente a suite)

`UserDefaults(suiteName:)` cria armazenamentos isolados para app groups. O MMKV suporta o mesmo padrão:

```typescript
// Separate store per feature — analogous to UserDefaults(suiteName: "com.app.auth")
const authStorage = new MMKV({ id: 'auth-store' });
const cacheStorage = new MMKV({ id: 'cache-store' });
```

### Integração com React usando Zustand

O padrão mais ergonômico no React Native é persistir uma store do Zustand com o MMKV como backend de armazenamento. Isso espelha o que você alcançaria com `@AppStorage` no SwiftUI.

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

### Comparação de desempenho

| Operação | AsyncStorage | react-native-mmkv |
|---|---|---|
| Leitura | async, ~2 ms | sync, ~0.1 ms |
| Escrita | async, ~5 ms | sync, ~0.3 ms |
| Serialização na inicialização | plist sob demanda | mapeado em memória |
| Segurança de thread | apenas thread JS | seguro para múltiplas threads |

Use o MMKV para qualquer dado que você armazenaria anteriormente em `UserDefaults`. Use `AsyncStorage` somente quando uma biblioteca da qual você depende exigir isso como peer dependency.

---

## NSFileManager → expo-file-system

`NSFileManager` expõe os diretórios do sandbox do iOS. O `expo-file-system` envolve o `NSFileManager` no iOS (e o equivalente no Android), expondo a mesma semântica de diretórios por meio de uma API JavaScript.

```bash
npx expo install expo-file-system
```

### Mapeamento de diretórios

| iOS (Swift) | expo-file-system |
|---|---|
| `NSDocumentDirectory` | `FileSystem.documentDirectory` |
| `NSCachesDirectory` | `FileSystem.cacheDirectory` |
| `NSTemporaryDirectory()` | `FileSystem.temporaryDirectory` |

A semântica é idêntica ao que você já conhece:

- `documentDirectory` — elegível para iCloud, com backup pelo iTunes, persiste entre atualizações do app. Use para conteúdo gerado pelo usuário.
- `cacheDirectory` — sem backup, pode ser removido pelo SO sob pressão de armazenamento. Use para assets baixados e dados derivados.
- `temporaryDirectory` — limpo na reinicialização. Use para uploads ou conversões em andamento.

### Leitura e escrita de arquivos

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

### Download de arquivos para cache

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

### Seletor de documentos

O `expo-document-picker` mapeia para `UIDocumentPickerViewController`. Ele retorna uma URI no `cacheDirectory` do app ou uma URI de conteúdo que você pode copiar para o `documentDirectory`:

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

`CoreData` e `SwiftData` são frameworks de persistência de grafo de objetos baseados em SQLite. O React Native não tem um equivalente direto no nível de framework, mas o `expo-sqlite` v2 expõe o SQLite por meio de uma API async moderna, e o `TanStack Query` lida com a camada de cache, invalidação e sincronização com a UI que o `@Query` do SwiftData fornece.

```bash
npx expo install expo-sqlite
npm install @tanstack/react-query
```

### Inicialização do banco de dados

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

### Operações CRUD

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

### TanStack Query como equivalente ao @Query do SwiftData

O `@Query` do SwiftData atualiza automaticamente a view quando a store muda. O TanStack Query replica isso com `useQuery` e `invalidateQueries`:

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

O Keychain do iOS armazena pequenos segredos criptografados pelo Secure Enclave e protegidos pelo código de acesso do dispositivo. O `expo-secure-store` envolve `SecItemAdd` / `SecItemCopyMatching` / `SecItemDelete` e expõe uma API async equivalente às classes de proteção do Keychain.

```bash
npx expo install expo-secure-store
```

### Uso básico

```typescript
import * as SecureStore from 'expo-secure-store';

// Store a secret — analogous to SecItemAdd with kSecValueData
await SecureStore.setItemAsync('authToken', 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');

// Read — analogous to SecItemCopyMatching
const token = await SecureStore.getItemAsync('authToken');

// Delete — analogous to SecItemDelete
await SecureStore.deleteItemAsync('authToken');
```

### Proteção biométrica (kSecAttrAccessibleWhenUnlocked)

Na API do Keychain, `kSecAttrAccessibleWhenUnlocked` restringe o acesso a sessões autenticadas. O `expo-secure-store` mapeia para essa classe por padrão e adiciona requisitos de Face ID / Touch ID por meio de `requireAuthentication`:

```typescript
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

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

### Mapeamento de acessibilidade do Keychain

| Acessibilidade do Keychain iOS | Comportamento no expo-secure-store |
|---|---|
| `kSecAttrAccessibleWhenUnlocked` | Padrão — acessível quando o dispositivo está desbloqueado |
| `kSecAttrAccessibleAfterFirstUnlock` | Não exposto diretamente — use o padrão na maioria dos casos |
| `kSecAccessControlBiometryCurrentSet` | `requireAuthentication: true` |
| `kSecAttrSynchronizable` | Não suportado — sincronização via iCloud Keychain não está disponível |

:::warning Limite de tamanho do Keychain
O Keychain foi projetado para pequenos segredos — tokens, senhas, chaves criptográficas. Não armazene payloads grandes. Se precisar proteger um arquivo grande, armazene a chave de criptografia no Keychain e o arquivo criptografado no `documentDirectory`.
:::

---

## Considerações sobre sincronização com iCloud

O React Native não tem um equivalente direto ao `NSUbiquitousKeyValueStore` ou ao `CloudKit`. Ao migrar um app iOS que usa sincronização com iCloud, avalie cada camada de armazenamento separadamente:

| Mecanismo iOS | Abordagem no React Native |
|---|---|
| `NSUbiquitousKeyValueStore` | Sem equivalente direto — use um backend (Supabase, Firebase) para sincronização entre dispositivos |
| Banco de dados privado do `CloudKit` | Substituir por um backend REST ou GraphQL; nenhuma biblioteca RN envolve o CloudKit nativamente |
| iCloud Drive (entitlement Documents) | `expo-file-system` grava no `documentDirectory`, mas a sincronização com o iCloud Drive requer o entitlement e um config plugin customizado |
| Banco de dados público do CloudKit | Substituir por um backend padrão |

Se o iCloud Drive for um requisito obrigatório, use um bare workflow com o entitlement `com.apple.developer.icloud-container-identifiers` e chame o `NSFileManager` por meio de um TurboModule customizado. Isso é incomum — avalie se uma sincronização orientada por backend atende à mesma necessidade do usuário antes de investir na implementação nativa.

---

## Padrões de Migração de Armazenamento Nativo Existente

Ao integrar uma base de código iOS existente no React Native (integração brownfield), o armazenamento nativo já contém dados do usuário que devem permanecer acessíveis.

### Lendo UserDefaults existentes por meio de um TurboModule

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

Chame isso uma vez na inicialização do app, grave os valores no MMKV e então exclua os originais do `UserDefaults` para evitar fontes duplas de verdade.

### Lendo entradas existentes do Keychain

Se o app existente armazenou tokens com um service name e account conhecidos, leia-os por meio de um TurboModule usando `SecItemCopyMatching` e reescreva-os via `expo-secure-store`. As duas APIs gravam no mesmo Keychain sob o mesmo bundle identifier do app, então as chaves são acessíveis de ambos os lados durante o período de migração.

### Guarda de migração única

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

Execute `runMigrationIfNeeded()` no seu componente raiz ou na sequência de inicialização do app antes de renderizar qualquer tela que dependa de estado persistido.

---

## Escolhendo a Camada Certa

| Caso de uso | Swift (iOS) | React Native |
|---|---|---|
| Feature flags, preferências | `UserDefaults` | `react-native-mmkv` |
| Token de sessão, chave de API | Keychain | `expo-secure-store` |
| Assets baixados, cache derivado | `NSCachesDirectory` | `FileSystem.cacheDirectory` |
| Documentos do usuário, exportações | `NSDocumentDirectory` | `FileSystem.documentDirectory` |
| Dados relacionais estruturados | CoreData / SwiftData | `expo-sqlite` + TanStack Query |
| Dados binários grandes | `NSFileManager` + `documentDirectory` | `expo-file-system` |
| Sincronização entre dispositivos | CloudKit / `NSUbiquitousKeyValueStore` | Backend (Supabase, Firebase) |

O modelo mental se traduz diretamente: os limites de camada que o iOS impõe são os mesmos que o React Native respeita, porque no iOS as mesmas APIs subjacentes estão em uso.
