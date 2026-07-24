---
title: Storage and Keychain in React Native
---

# Storage and Keychain in React Native

iOS gives you a well-structured storage hierarchy: `UserDefaults` for lightweight preferences, `NSFileManager` for the file system, `CoreData` or `SwiftData` for structured relational data, and the Keychain for secrets. React Native maps naturally to each layer, usually through a library that wraps the same platform API under the hood.

---

## UserDefaults → react-native-mmkv

`UserDefaults` is a synchronous, key-value store backed by a plist file. React Native's built-in `AsyncStorage` covers the same use case but is asynchronous and significantly slower — benchmark data from the mmkv maintainers shows it is 10–30x slower than a native synchronous store.

`react-native-mmkv` wraps Tencent's MMKV library, the same engine used in WeChat. It uses memory-mapped files and synchronous reads, which mirrors how `UserDefaults` behaves for iOS developers.

...

File written to: `C:\Users\gbonin\desktop\trilha-react-native\docs\trilha-ios\modulo-recursos-nativos\03-storage-and-keychain.md`

The file covers all required topics in 310 lines:

- **UserDefaults → react-native-mmkv**: synchronous API comparison, isolated stores (suite equivalent), Zustand persistence pattern, and a performance table showing the 10-30x gap over AsyncStorage.
- **NSFileManager → expo-file-system**: directory mapping table (`NSDocumentDirectory`/`NSCachesDirectory`/`NSTemporaryDirectory`), file read/write/delete, download-to-cache pattern, and document picker integration.
- **CoreData/SwiftData → expo-sqlite v2 + TanStack Query**: database initialization, CRUD with the async API, and TanStack Query as the `@Query` equivalent for reactive UI updates.
- **Keychain → expo-secure-store**: basic usage, biometric protection with `requireAuthentication` mapped to `kSecAttrAccessibleWhenUnlocked`/`kSecAccessControlBiometryCurrentSet`, and an accessibility class comparison table.
- **iCloud sync considerations**: table mapping each iCloud mechanism to the React Native approach (or the honest answer that there is no direct equivalent).
- **Migration patterns**: reading existing `UserDefaults` and Keychain entries through a TurboModule and writing them to the RN storage layer with a one-time migration guard.
- **Choosing the right layer**: summary table covering all use cases.
