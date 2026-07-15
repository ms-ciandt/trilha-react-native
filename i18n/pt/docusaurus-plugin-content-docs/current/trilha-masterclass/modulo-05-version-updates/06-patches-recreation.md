---
title: "Recreacao de Patches (patch-package)"
---

# Recreacao de Patches (patch-package)

> Patches no diretorio `patches/` sao divida tecnica com data de validade. Todo upgrade do RN e uma oportunidade de auditoria — alguns podem ser deletados (a correcao chegou upstream), outros precisam ser recriados, e alguns revelam que uma biblioteca foi abandonada.

---

## Como o patch-package Funciona

O `patch-package` armazena diffs do `node_modules` como arquivos `.patch` no diretorio `patches/`. Em cada `npm install`, ele reaaplica esses diffs via um script `postinstall`.

```json
// package.json
{
  "scripts": {
    "postinstall": "patch-package"
  },
  "devDependencies": {
    "patch-package": "^8.0.0"
  }
}
```

Um arquivo de patch tem o seguinte formato:

```diff
diff --git a/node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java b/node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java
index 3a2b1c..f8e4d1 100644
--- a/node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java
+++ b/node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java
@@ -42,7 +42,7 @@ public class RNCameraModule extends ReactContextBaseJavaModule {
-    private static final int CAMERA_PERMISSION = 1;
+    private static final int CAMERA_PERMISSION = 2;  // corrige conflito com permissao de audio
```

Quando o `react-native-camera` e atualizado, esse diff pode nao mais se aplicar corretamente — o `patch-package` falhara com um erro `Hunk FAILED` e saira com codigo diferente de zero, quebrando seu `npm install`.

---

## Falha de Patch Durante um Upgrade

Apos atualizar uma versao de biblioteca, patches que tocam essa biblioteca podem falhar:

```
$ npm install

> myapp@1.0.0 postinstall
> patch-package

patch-package 8.0.0
Applying patches...
react-native-camera+1.14.0.patch Hunk #1 FAILED at 42.
1 of 1 hunks FAILED -- saving rejects to file
  node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java.rej

ERROR: Failed to apply patch for react-native-camera.
```

Isso e intencional. O patch-package se recusa a aplicar silenciosamente um patch que nao se encaixa — um hunk com falha significa que seu patch pode nao ser mais necessario, ou o codigo foi movido.

---

## Fluxo de Trabalho de Recreacao

### Etapa 1: Verificar se o patch ainda e necessario

Antes de recriar, verifique se a biblioteca upstream corrigiu o problema:

```bash
# Verifique o changelog ou releases da biblioteca
open https://github.com/the-library/releases

# Verifique o arquivo especifico que foi patcheado
cat node_modules/the-library/path/to/file.js | grep "a coisa que voce corrigiu"
```

Se a correcao chegou upstream, **delete o arquivo de patch** e remova a entrada do `postinstall`. Esse e o melhor resultado possivel.

### Etapa 2: Entender o que o patch original fazia

Leia o arquivo `.patch` antes de recriar:

```bash
cat patches/react-native-camera+1.13.0.patch
```

Entenda a *intencao* — nao apenas os numeros de linha. Ele e:
- Uma correcao de bug que nao foi mergeada upstream?
- Um workaround para uma incompatibilidade com outra biblioteca?
- Uma funcionalidade que a biblioteca nao suporta?

### Etapa 3: Aplicar a correcao manualmente na nova versao

Faca a mudanca equivalente na nova versao do arquivo em `node_modules`:

```bash
# Edite o arquivo diretamente no node_modules
code node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java
```

### Etapa 4: Criar o novo arquivo de patch

```bash
# Cria patches/react-native-camera+NOVA_VERSAO.patch
npx patch-package react-native-camera
```

Isso sobrescreve o arquivo de patch antigo (o numero da versao no nome do arquivo e diferente).

### Etapa 5: Testar se o patch se aplica corretamente

```bash
# Simular uma instalacao do zero
rm -rf node_modules
npm install
# Deve mostrar: "react-native-camera+1.14.0.patch  ✔"
```

---

## patch-package vs Alternativas (2025)

| Ferramenta | Gerenciador de Pacotes | Suporte a Monorepo | Como os Patches sao Armazenados |
|---|---|---|---|
| `patch-package` | npm, Yarn v1 | Flag `--patch-dir` | Diretorio `patches/`, arquivos `.patch` |
| `yarn patch` | Yarn Berry (v2+) | Por workspace | Diretorio `.yarn/patches/` |
| `pnpm patch` | pnpm | Por workspace, store compartilhado | `patchedDependencies` no `package.json` |

### `yarn patch` (Yarn Berry)

```bash
# Abrir uma copia temporaria do pacote para edicao
yarn patch react-native-camera

# Faca suas mudancas no diretorio temporario mostrado na saida
# Entao commit o patch:
yarn patch-commit /tmp/xfs-abc123/react-native-camera

# Isso adiciona ao package.json:
# "resolutions": { "react-native-camera@patch:...": "..." }
```

### `pnpm patch`

```bash
# Abrir copia editavel
pnpm patch react-native-camera@1.14.0

# Edite os arquivos no diretorio temporario, entao:
pnpm patch-commit /path/to/temp-dir

# pnpm armazena patches em node_modules/.pnpm/patches/
# e registra no package.json:
# "pnpm": { "patchedDependencies": { "react-native-camera@1.14.0": "patches/react-native-camera@1.14.0.patch" } }
```

**Recomendacao para novos projetos (2025):** use o patching nativo do seu gerenciador de pacotes. O `patch-package` permanece a opcao mais amplamente conhecida para projetos npm e Yarn v1 — o que cobre a maioria dos projetos React Native ainda. Para novos monorepos usando pnpm ou Yarn Berry, use as alternativas nativas.

---

## Inventario de Patches Antes de um Upgrade

Antes de iniciar qualquer upgrade, audite seus patches:

```bash
ls patches/
```

Para cada arquivo de patch, registre:

| Arquivo de patch | Biblioteca patcheada | Motivo do patch | Ainda e necessario? |
|---|---|---|---|
| `react-native-camera+1.13.0.patch` | react-native-camera | Conflito de codigo de permissao | Verificar nova versao |
| `react-native-maps+1.7.1.patch` | react-native-maps | Crash no Android 13 | Provavelmente corrigido na v1.8+ |
| `react-native-video+6.2.0.patch` | react-native-video | Compatibilidade com Hermes | Corrigido na 6.3 |

Bibliotecas onde o patch:
- Toca um arquivo JS → mais facil de recriar; verifique se a logica foi movida
- Toca um arquivo Java/Kotlin → medio; verifique se a estrutura da classe mudou
- Toca um arquivo C++/JSI → mais dificil; esses mudam significativamente entre versoes do RN

---

## Boa Pratica: Documente Cada Patch

Cada arquivo de patch deve ter um comentario correspondente no `package.json` ou em um `patches/README.md`:

```markdown
# patches/README.md

## react-native-camera+1.14.0.patch

**Motivo:** A constante `CAMERA_PERMISSION` (valor 1) conflita com `AUDIO_PERMISSION` (valor 1)
introduzida no RN 0.74. Alterado para valor 2 para evitar a colisao.

**Issue upstream:** https://github.com/react-native-camera/issues/1234

**Status:** PR submetido, nao mergeado. Reverificar no proximo upgrade da biblioteca.

**Afeta:** Somente Android. O dialogo de solicitacao de permissao pode nao aparecer sem esta correcao.

---

## react-native-video+6.2.0.patch

**Motivo:** O Hermes 0.73+ mudou a convencao de chamada de funcao JSI para callbacks.
A biblioteca estava chamando `jsi::Function::call()` sem um guard de runtime.

**Issue upstream:** Corrigido no react-native-video 6.3.1 — **DELETE ESTE PATCH ao atualizar para 6.3+**

**Afeta:** Ambas as plataformas. O app travava no inicio da reproducao de video.
```

Sem documentacao, o proximo desenvolvedor a manter esses patches precisara fazer engenharia reversa da intencao a partir do diff. Esse desenvolvedor com frequencia simplesmente deletara o patch e descobrira o bug em producao.

---

## Materiais de Estudo

| Recurso | Descricao |
|---|---|
| [patch-package — GitHub](https://github.com/ds300/patch-package) | Codigo-fonte, docs, `--patch-dir` para monorepos |
| [patch-package — npm](https://www.npmjs.com/package/patch-package) | Instalacao, uso, configuracao do postinstall |
| [Yarn patch — docs oficiais](https://yarnpkg.com/cli/patch) | Comando de patching nativo do Yarn Berry |
| [pnpm patch — docs oficiais](https://pnpm.io/cli/patch) | Comando de patching nativo do pnpm |
| [patch-package vs yarn patch vs pnpm patch 2026](https://www.pkgpulse.com/guides/patch-package-vs-pnpm-patch-vs-yarn-patch-patching-node-2026) | Comparacao lado a lado incluindo comportamento em monorepo |
| [Patch Package in React Native — Medium](https://medium.com/@renaldhif/patch-package-in-react-native-a-practical-way-to-survive-updates-19a5197c2de6) | Walkthrough pratico de patches especificos para RN |

---

Proximo → [Compatibilidade de Bibliotecas de Terceiros](./library-compatibility)
