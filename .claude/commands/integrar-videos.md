Integra vídeos baixados do NotebookLM nas trilhas do projeto trilha-react-native.

## Pré-requisito: gh CLI

Os vídeos são hospedados no GitHub Releases (tag `v0-videos`), **não** no repositório git.  
O `gh` CLI precisa estar instalado e autenticado para fazer o upload.

Verificar antes de continuar:
```bash
gh auth status
```

Se não estiver instalado: `winget install --id GitHub.cli` e depois `gh auth login`.

---

## Argumentos

`$ARGUMENTS` = caminho absoluto da pasta com os vídeos baixados  
Exemplo: `C:\Users\you\Desktop\trilha-android-testing`

Se não for informado, liste as pastas no Desktop que começam com `trilha-` e pergunte qual usar.

---

## 1. Detectar trilha e módulo pelo nome da pasta

Quebre o nome da pasta em palavras separadas por `-`. Aplique as tabelas abaixo:

### Trilha (docs e assets)

| Palavra no nome | Pasta docs          | Subpasta release      |
|-----------------|---------------------|-----------------------|
| `android`       | `trilha-android`    | `trilha_android`      |
| `ios`           | `trilha-ios`        | `trilha_ios`          |
| `web`           | `trilha-web`        | `trilha_web`          |
| `masterclass`   | `trilha-masterclass`| `trilha_masterclass`  |

### Módulo (pasta e prefixo de arquivo)

| Palavra no nome                          | Módulo                    | Prefixo   |
|------------------------------------------|---------------------------|-----------|
| `testing`, `testes`                      | `modulo-testes`           | `test_`   |
| `performance`, `perf`                    | `modulo-performance`      | `perf_`   |
| `fundamentos`, `fundamentals`            | `modulo-fundamentos`      | `fund_`   |
| `recursos`, `resources`, `native`        | `modulo-recursos-nativos` | `rec_`    |
| `cicd`, `ci-cd`, `ci`                    | `modulo-cicd`             | `cicd_`   |
| `arquitetura`, `architecture`            | `modulo-arquitetura`      | `arq_`    |
| `new-architecture`, `new-arch`, `na`     | `modulo-new-architecture` | `na_`     |
| `compose`                                | `modulo-compose-para-rn`  | `compose_`|

Confirme com o usuário antes de continuar se não conseguir identificar trilha ou módulo.

---

## 2. Listar arquivos de vídeo/áudio na pasta

Liste todos os arquivos na pasta ignorando `_debug_screenshot.png` e qualquer arquivo sem extensão de mídia.

Extensões de vídeo: `.mp4`, `.webm`, `.mov`  
Extensões de áudio: `.wav`, `.mp3`, `.ogg`

---

## 3. Listar docs existentes no módulo

Leia o conteúdo de `docs/{trail_docs}/{module}/` para obter os arquivos `.md` existentes.  
Cada arquivo tem o padrão `{NN}-{slug}.md` (ex: `01-jest-unit-tests.md`).

---

## 4. Para cada arquivo de vídeo/áudio encontrado

### 4a. Extrair NN do arquivo baixado

O NotebookLM pode truncar o nome. Use apenas o prefixo numérico de dois dígitos:
- `01-jest-unit-te.wav` → NN = `01`
- `03-mocking-n.wav` → NN = `03`

### 4b. Encontrar o doc correspondente pelo NN

Procure o arquivo em `docs/{trail_docs}/{module}/` cujo nome começa com `{NN}-`.  
Extraia o slug do nome do doc (sem o NN e sem a extensão):
- Doc `01-jest-unit-tests.md` → slug = `jest-unit-tests`

Se não existir doc com esse NN, anote como "sem doc correspondente" e pule para o próximo.

### 4c. Montar o nome final do asset

```
{prefix}{NN}_{slug}{ext_original}
```

Exemplos:
- `test_01_jest-unit-tests.wav`
- `test_03_mocking-native-modules.wav`
- `perf_01_thread-model.mp4`

### 4d. Fazer upload para o GitHub Release

**Não copiar para `static/assets/videos/` — os vídeos vivem apenas no GitHub Release.**

Use `gh release upload` para enviar o arquivo diretamente da pasta do Desktop:

```bash
gh release upload v0-videos "C:\Users\you\Desktop\{pasta_input}\{arquivo_original}" \
  --clobber \
  --repo ms-ciandt/trilha-react-native
```

O `--clobber` sobrescreve se o arquivo já existir com o mesmo nome. Se o nome final (`{prefix}{NN}_{slug}{ext}`) for diferente do nome original, renomeie o arquivo localmente antes do upload:

```bash
# Renomear primeiro (PowerShell)
Copy-Item "C:\Users\you\Desktop\{pasta}\{original}.mp4" `
          "C:\Users\you\Desktop\{pasta}\{nome_final}.mp4"

# Depois fazer upload com o nome final
gh release upload v0-videos "C:\Users\you\Desktop\{pasta}\{nome_final}.mp4" `
  --clobber --repo ms-ciandt/trilha-react-native
```

Verifique que o upload foi bem-sucedido antes de continuar.

### 4d-bis. Atualizar video-durations.json e regenerar content-times.json

Após o upload de cada vídeo, registre o filename e sua duração (em minutos) em `src/data/video-durations.json`. Use 7 como default se a duração real não for conhecida.

```json
// src/data/video-durations.json — adicionar entrada:
"{nome_final}": 7
```

Após processar **todos** os vídeos do lote, rodar:

```bash
npm run compute-times
```

Isso regera `src/data/content-times.json` com os totais atualizados (leitura + vídeo por doc, módulo, trilha e curso). Os dois arquivos devem ser commitados juntos com os docs.

### 4e. Montar o bloco de embed

URL do asset (usando GitHub Release, não caminho local):
```
https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/{nome_final}
```

Para extensões de **vídeo** (`.mp4`, `.webm`, `.mov`):
```html
## Video Overview

<video width="100%" controls controlsList="nodownload">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/{nome_final}" type="video/mp4">
  Your browser does not support the video tag.
</video>
```
Use `type="video/mp4"` para `.mp4`/`.mov`, `type="video/webm"` para `.webm`.

`controlsList="nodownload"` é obrigatório em todo `<video>` — desabilita o botão de download nativo do player.

Se já existir legenda gerada para o vídeo (`.vtt` em `static/assets/captions/{trilha_release}/{stem}_en.vtt` para EN, `{stem}.vtt` para PT — ver `scripts/generate-all-captions.sh`), adicionar a tag `<track>` logo após o `<source>`:

```html
<!-- doc EN -->
<track kind="captions" src="/trilha-react-native/assets/captions/{trilha_release}/{stem}_en.vtt" srclang="en" label="English" default>

<!-- doc PT-BR -->
<track kind="captions" src="/trilha-react-native/assets/captions/{trilha_release}/{stem}.vtt" srclang="pt" label="Português" default>
```

Se a legenda ainda não existir, publique o embed sem a tag `<track>` — não referenciar um `.vtt` inexistente.

Para extensões de **áudio** (`.wav`, `.mp3`, `.ogg`):
```html
## Video Overview

<audio controls style="width:100%">
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/{nome_final}" type="audio/wav">
  Your browser does not support the audio tag.
</audio>
```
Use `type="audio/wav"` para `.wav`, `type="audio/mpeg"` para `.mp3`, `type="audio/ogg"` para `.ogg`.

### 4f. Atualizar o doc EN

Arquivo: `docs/{trail_docs}/{module}/{NN}-{slug}.md`

Leia o arquivo. Localize o bloco placeholder:
```
## Video Overview

> Video for this topic coming soon.
```

Substitua **apenas esse bloco** pelo bloco de embed construído em 4e.

Se o arquivo já tiver um `<video>` ou `<audio>` com URL válida (não "coming soon"), pule sem alterar.

Se o arquivo não tiver `## Video Overview`, adicione o bloco de embed logo após a linha do `# Título` (H1).

### 4g. Atualizar o doc PT-BR

Arquivo: `i18n/pt/docusaurus-plugin-content-docs/current/{trail_docs}/{module}/{NN}-{slug}.md`

Leia o arquivo. Localize o bloco placeholder PT-BR:
```
## Visão Geral em Vídeo

> Vídeo deste tópico em breve.
```

Substitua o bloco pelo embed com o **mesmo caminho de asset** (o arquivo de vídeo é compartilhado entre idiomas).

Se o arquivo não tiver `## Visão Geral em Vídeo`, adicione logo após o H1 com o cabeçalho PT-BR:
```
## Visão Geral em Vídeo
```

---

## 5. Git — branch isolada, commit e push

### 5a. Derivar o nome da branch

A partir do nome da pasta de input, remova `trilha-` do início, adicione `-videos` no final e prefixe com `content/`:

| Pasta input              | Branch                          |
|--------------------------|---------------------------------|
| `trilha-android-testing` | `content/android-testing-videos`|
| `trilha-web-performance` | `content/web-performance-videos`|
| `trilha-ios-cicd`        | `content/ios-cicd-videos`       |

### 5b. Criar a branch a partir de origin/main

Sempre a partir da main remota, independentemente da branch atual — isso garante que instâncias paralelas não se bloqueiem:

```bash
git checkout -b content/android-testing-videos origin/main
```

### 5c. Adicionar apenas os docs modificados

**Não adicionar arquivos de vídeo ao git** — eles estão no GitHub Release e são ignorados pelo `.gitignore`.

Adicionar somente os docs atualizados **mais os arquivos de tempo**:

```bash
git add docs/{trail_docs}/{module}/
git add i18n/pt/docusaurus-plugin-content-docs/current/{trail_docs}/{module}/
git add src/data/video-durations.json src/data/content-times.json
```

Verificar com `git status` antes de commitar para confirmar que **nenhum `.mp4`/`.webm`/`.mov` está staged**.

### 5d. Commit

```
feat(videos): add {trail_docs} {module} cinematic overviews

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 5e. Push

```bash
git push -u origin content/android-testing-videos
```

---

## 6. Reportar

Ao final, apresente um resumo:

```
Trilha detectada : trilha-android
Módulo detectado : modulo-testes
Release tag      : v0-videos

Processados:
  ✓ test_01_jest-unit-tests.mp4  →  upload ok · docs EN + PT-BR atualizados
  ✓ test_02_react-native-testing-library.mp4  →  upload ok · docs EN + PT-BR atualizados
  ✗ test_03_mocking-n.mp4  →  sem doc correspondente (03-*.md não encontrado)

Branch criada    : content/android-testing-videos
Push             : ok — https://github.com/ms-ciandt/trilha-react-native/tree/content/android-testing-videos
```
