---
title: "Recriação de Patches (patch-package)"
---

# Recriação de Patches (patch-package)

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/mc05_06_patches-recreation.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_masterclass/mc05_06_patches-recreation.vtt" srclang="pt" label="Português" default>
  Your browser does not support the video tag.
</video>

> Patches no diretório `patches/` são dívida técnica com data de validade. Todo upgrade do RN é uma oportunidade de auditoria — alguns podem ser deletados (a correção chegou upstream), outros precisam ser recriados, e alguns revelam que uma biblioteca foi abandonada.

---

## Como o patch-package Funciona

O `patch-package` armazena diffs do `node_modules` como arquivos `.patch` no diretório `patches/`. Em cada `npm install`, ele reaplica esses diffs via um script `postinstall`.

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
+    private static final int CAMERA_PERMISSION = 2;  // corrige conflito com permissão de áudio
```

Quando o `react-native-camera` é atualizado, esse diff pode não mais se aplicar corretamente — o `patch-package` falhará com um erro `Hunk FAILED` e sairá com código diferente de zero, quebrando seu `npm install`.

---

## Falha de Patch Durante um Upgrade

Após atualizar uma versão de biblioteca, patches que tocam essa biblioteca podem falhar:

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

Isso é intencional. O patch-package se recusa a aplicar silenciosamente um patch que não se encaixa — um hunk com falha significa que seu patch pode não ser mais necessário, ou o código foi movido.

---

## Fluxo de Trabalho de Recriação

### Etapa 1: Verificar se o patch ainda é necessário

Antes de recriar, verifique se a biblioteca upstream corrigiu o problema:

```bash
# Verifique o changelog ou releases da biblioteca
open https://github.com/the-library/releases

# Verifique o arquivo específico que foi patcheado
cat node_modules/the-library/path/to/file.js | grep "a coisa que você corrigiu"
```

Se a correção chegou upstream, **delete o arquivo de patch** e remova a entrada do `postinstall`. Esse é o melhor resultado possível.

### Etapa 2: Entender o que o patch original fazia

Leia o arquivo `.patch` antes de recriar:

```bash
cat patches/react-native-camera+1.13.0.patch
```

Entenda a *intenção* — não apenas os números de linha. Ele é:
- Uma correção de bug que não foi mergeada upstream?
- Um workaround para uma incompatibilidade com outra biblioteca?
- Uma funcionalidade que a biblioteca não suporta?

### Etapa 3: Aplicar a correção manualmente na nova versão

Faça a mudança equivalente na nova versão do arquivo em `node_modules`:

```bash
# Edite o arquivo diretamente no node_modules
code node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java
```

### Etapa 4: Criar o novo arquivo de patch

```bash
# Cria patches/react-native-camera+NOVA_VERSAO.patch
npx patch-package react-native-camera
```

Isso sobrescreve o arquivo de patch antigo (o número da versão no nome do arquivo é diferente).

### Etapa 5: Testar se o patch se aplica corretamente

```bash
# Simular uma instalação do zero
rm -rf node_modules
npm install
# Deve mostrar: "react-native-camera+1.14.0.patch  ✔"
```

---

## patch-package vs Alternativas (2025)

| Ferramenta | Gerenciador de Pacotes | Suporte a Monorepo | Como os Patches são Armazenados |
|---|---|---|---|
| `patch-package` | npm, Yarn v1 | Flag `--patch-dir` | Diretório `patches/`, arquivos `.patch` |
| `yarn patch` | Yarn Berry (v2+) | Por workspace | Diretório `.yarn/patches/` |
| `pnpm patch` | pnpm | Por workspace, store compartilhado | `patchedDependencies` no `package.json` |

### `yarn patch` (Yarn Berry)

```bash
# Abrir uma cópia temporária do pacote para edição
yarn patch react-native-camera

# Faça suas mudanças no diretório temporário mostrado na saída
# Então commit o patch:
yarn patch-commit /tmp/xfs-abc123/react-native-camera

# Isso adiciona ao package.json:
# "resolutions": { "react-native-camera@patch:...": "..." }
```

### `pnpm patch`

```bash
# Abrir cópia editável
pnpm patch react-native-camera@1.14.0

# Edite os arquivos no diretório temporário, então:
pnpm patch-commit /path/to/temp-dir

# pnpm armazena patches em node_modules/.pnpm/patches/
# e registra no package.json:
# "pnpm": { "patchedDependencies": { "react-native-camera@1.14.0": "patches/react-native-camera@1.14.0.patch" } }
```

**Recomendação para novos projetos (2025):** use o patching nativo do seu gerenciador de pacotes. O `patch-package` permanece a opção mais amplamente conhecida para projetos npm e Yarn v1 — o que cobre a maioria dos projetos React Native ainda. Para novos monorepos usando pnpm ou Yarn Berry, use as alternativas nativas.

---

## Inventário de Patches Antes de um Upgrade

Antes de iniciar qualquer upgrade, audite seus patches:

```bash
ls patches/
```

Para cada arquivo de patch, registre:

| Arquivo de patch | Biblioteca patcheada | Motivo do patch | Ainda é necessário? |
|---|---|---|---|
| `react-native-camera+1.13.0.patch` | react-native-camera | Conflito de código de permissão | Verificar nova versão |
| `react-native-maps+1.7.1.patch` | react-native-maps | Crash no Android 13 | Provavelmente corrigido na v1.8+ |
| `react-native-video+6.2.0.patch` | react-native-video | Compatibilidade com Hermes | Corrigido na 6.3 |

Bibliotecas onde o patch:
- Toca um arquivo JS → mais fácil de recriar; verifique se a lógica foi movida
- Toca um arquivo Java/Kotlin → médio; verifique se a estrutura da classe mudou
- Toca um arquivo C++/JSI → mais difícil; esses mudam significativamente entre versões do RN

---

## Boa Prática: Documente Cada Patch

Cada arquivo de patch deve ter um comentário correspondente no `package.json` ou em um `patches/README.md`:

```markdown
# patches/README.md

## react-native-camera+1.14.0.patch

**Motivo:** A constante `CAMERA_PERMISSION` (valor 1) conflita com `AUDIO_PERMISSION` (valor 1)
introduzida no RN 0.74. Alterado para valor 2 para evitar a colisão.

**Issue upstream:** https://github.com/react-native-camera/issues/1234

**Status:** PR submetido, não mergeado. Reverificar no próximo upgrade da biblioteca.

**Afeta:** Somente Android. O diálogo de solicitação de permissão pode não aparecer sem esta correção.

---

## react-native-video+6.2.0.patch

**Motivo:** O Hermes 0.73+ mudou a convenção de chamada de função JSI para callbacks.
A biblioteca estava chamando `jsi::Function::call()` sem um guard de runtime.

**Issue upstream:** Corrigido no react-native-video 6.3.1 — **DELETE ESTE PATCH ao atualizar para 6.3+**

**Afeta:** Ambas as plataformas. O app travava no início da reprodução de vídeo.
```

Sem documentação, o próximo desenvolvedor a manter esses patches precisará fazer engenharia reversa da intenção a partir do diff. Esse desenvolvedor com frequência simplesmente deletará o patch e descobrirá o bug em produção.

---

## Materiais de Estudo

| Recurso | Descrição |
|---|---|
| [patch-package — GitHub](https://github.com/ds300/patch-package) | Código-fonte, docs, `--patch-dir` para monorepos |
| [patch-package — npm](https://www.npmjs.com/package/patch-package) | Instalação, uso, configuração do postinstall |
| [Yarn patch — docs oficiais](https://yarnpkg.com/cli/patch) | Comando de patching nativo do Yarn Berry |
| [pnpm patch — docs oficiais](https://pnpm.io/cli/patch) | Comando de patching nativo do pnpm |
| [patch-package vs yarn patch vs pnpm patch 2026](https://www.pkgpulse.com/guides/patch-package-vs-pnpm-patch-vs-yarn-patch-patching-node-2026) | Comparação lado a lado incluindo comportamento em monorepo |
| [Patch Package in React Native — Medium](https://medium.com/@renaldhif/patch-package-in-react-native-a-practical-way-to-survive-updates-19a5197c2de6) | Walkthrough prático de patches específicos para RN |

---

Próximo → [Compatibilidade de Bibliotecas de Terceiros](./library-compatibility)
