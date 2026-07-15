---
title: "TurboModuleRegistry: get vs getEnforcing"
---

# TurboModuleRegistry: `get` vs `getEnforcing`

> Esta é a decisão de API mais consequente que você toma por módulo. A escolha errada ou causa crash silencioso (null ignorado) ou crash ruidoso no momento errado (`getEnforcing` incorreto). Conheça as semânticas exatas.

---

## Assinaturas de Tipo

```typescript
// Extraído das definições TypeScript do react-native
declare namespace TurboModuleRegistry {
  // Retorna T | null — o módulo pode não estar registrado
  function get<T extends TurboModule>(name: string): T | null;

  // Retorna T — lança imediatamente se o módulo não estiver registrado
  function getEnforcing<T extends TurboModule>(name: string): T;
}
```

Ambas as chamadas são avaliadas **no momento do carregamento do módulo** — quando o arquivo de spec é `import`ado pela primeira vez. Isso significa que a verificação ocorre uma vez, não a cada chamada.

---

## `get<T>` — Anulável, Seguro

```typescript
const NativeAnalytics = TurboModuleRegistry.get<Spec>('NativeAnalytics');
// Tipo: Spec | null

// Todo ponto de chamada deve tratar o null
NativeAnalytics?.track('page_view');

if (NativeAnalytics !== null) {
  const count = NativeAnalytics.getQueueSize();
}
```

**Comportamento:** se o módulo não estiver registrado no binário nativo, retorna `null`. Nenhuma exceção é lançada — o chamador decide o que fazer.

**Use quando:**
- O módulo é opcional (analytics, relatório de crashes, feature flags)
- O módulo existe apenas em uma plataforma
- Você está escrevendo uma biblioteca que roda em ambientes não nativos (Storybook, web, Expo Go)
- Você quer degradação gracioса em vez de crash

---

## `getEnforcing<T>` — Não Anulável, Estrito

```typescript
const NativeStorage = TurboModuleRegistry.getEnforcing<Spec>('NativeStorage');
// Tipo: Spec (nunca null — o TypeScript confia em você)

// Sem verificação de null necessária
NativeStorage.setItem('theme', 'dark');
```

**Comportamento:** se o módulo não estiver registrado, lança um `Invariant Violation` imediatamente no momento do carregamento do módulo. O bundle JS falha ao inicializar.

**Use quando:**
- O módulo é obrigatório — sua ausência é um erro de programação, não uma condição de runtime
- Você tem certeza de que o módulo está registrado em toda plataforma que executará esse código
- Você quer comportamento fail-fast que expõe bugs de registro ausente durante o desenvolvimento

---

## O Erro Exato

Quando `getEnforcing` falha, a mensagem de erro informa exatamente o que deu errado:

```
Invariant Violation: TurboModuleRegistry.getEnforcing(...):
  'NativeStorage' could not be found.
  Verify that a module by this name is registered in the native binary.
  Bridgeless mode: true.
  TurboModule interop: true.
  Modules loaded: ("NativeModules":["Networking","Timing",...] "TurboModules":["PlatformConstants",...])
```

A lista `Modules loaded` informa exatamente quais módulos estão disponíveis no binário — use-a para diagnosticar registros ausentes.

**Causas raiz desse erro:**

| Causa | Correção |
|---|---|
| Pacote não adicionado ao `MainApplication.kt` | Adicione `NativeMyModulePackage()` a `getPackages()` |
| `modulesProvider` ausente no `codegenConfig.ios` do `package.json` | Adicione o mapeamento `NativeModule: "ClassProvider"` |
| Incompatibilidade de string de nome com `getName()` / `moduleName` | Sincronize a string na spec com o valor de retorno do `getName()` nativo |
| Binário nativo não reconstruído após adicionar o módulo | Reconstrua o nativo (`./gradlew assembleDebug` / clean build no Xcode) |
| `getEnforcing` chamado incondicionalmente em uma plataforma onde o módulo não existe | Envolva com `Platform.select()` ou use `get()` |

---

## Matriz de Decisão

```
O app crasha ou degrada se este módulo estiver ausente?
│
├── Crasha (recurso central, perda de dados) → getEnforcing
│   │
│   └── Mas pode estar ausente em uma plataforma?
│       ├── SIM → Platform.select + getEnforcing por plataforma
│       └── NÃO  → getEnforcing incondicionalmente
│
└── Degrada graciosamente → get
    │
    ├── Recurso completamente opcional (analytics, flags)?
    │   └── get + encadeamento opcional (?.)
    │
    └── Recurso precisa de um fallback funcional?
        └── Abstração de serviço com Noop (Padrão 3 do tópico anterior)
```

---

## Erro Comum: `getEnforcing` + Módulo Específico de Plataforma

Este padrão crasha na plataforma onde o módulo não existe:

```typescript
// ERRADO — crasha no Android se o módulo for apenas iOS
export default TurboModuleRegistry.getEnforcing<Spec>('NativeHealthKit');
```

Abordagem correta:

```typescript
// CORRETO — comportamento explícito por plataforma
export default Platform.select({
  ios: TurboModuleRegistry.getEnforcing<Spec>('NativeHealthKit'),
  android: null,
}) ?? null;
```

Ou, se ambas as plataformas têm o módulo mas com nomes diferentes:

```typescript
export default Platform.select({
  ios: TurboModuleRegistry.getEnforcing<iOSSpec>('NativeHealthKit'),
  android: TurboModuleRegistry.getEnforcing<AndroidSpec>('NativeGoogleFit'),
});
```

---

## Temporalidade: Quando a Chamada é Avaliada?

```typescript
// Isso executa no momento do import — quando o JS carrega este módulo pela primeira vez
export default TurboModuleRegistry.getEnforcing<Spec>('NativeStorage');
```

Se `NativeStorage` não estiver registrado, a exceção dispara **quando este arquivo é importado pela primeira vez**, não quando o app inicia. Isso pode fazer o crash parecer vir do lugar errado nos stack traces.

Com `get()`:

```typescript
// Também executa no momento do import — mas retorna null em vez de lançar exceção
export default TurboModuleRegistry.get<Spec>('NativeStorage');
// null se propaga silenciosamente para todos os chamadores — mais fácil de raciocinar
```

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [TurboModuleRegistry source — react-native](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/TurboModule/TurboModuleRegistry.js) | A implementação JS real — 30 linhas, vale a leitura |
| [getEnforcing fails in brownfield — #49246](https://github.com/facebook/react-native/issues/49246) | Análise real de crash: módulo não registrado em uma superfície específica |
| [0.76 TurboModuleRegistry error on iOS new arch — #48760](https://github.com/facebook/react-native/issues/48760) | Problema de registro específico de plataforma pós-atualização |

---

Próximo → [Guards de Disponibilidade (isAvailable)](./availability-guards)
