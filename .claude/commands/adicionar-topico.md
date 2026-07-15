Você vai publicar um tópico na trilha React Native.

Existem dois modos de uso:

---

## Modo A — arquivo já existe

Se o usuário passou um caminho de arquivo (ex: `docs/trilha-nativo/modulo-recursos-nativos/meu-topico.md`), siga direto para o **passo 2** sem fazer perguntas.

## Modo B — conteúdo novo

Se o usuário não passou um caminho, pergunte:

1. **Conteúdo**: cole o texto ou informe o caminho do `.md`
2. **Trilha**: `trilha-nativo` ou `trilha-web`
3. **Módulo**: `modulo-fundamentos`, `modulo-recursos-nativos`, `modulo-performance`, `modulo-testes`, `modulo-cicd` ou `modulo-arquitetura`
4. **Título**: nome curto (ex: "Câmera e Galeria")
5. **Vídeo**: nome do `.mp4` já na subpasta correta de `static/assets/videos/` (ex: `trilha_nativo/fund_11_meu_topico.mp4`) — ou "não tem"

---

## 1. Determinar destino (Modo B apenas)

Liste os arquivos em `docs/[trilha]/[modulo]/` para pegar o próximo número `NN`.

Crie o arquivo em `docs/[trilha]/[modulo]/NN-slug-do-titulo.md`.

---

## 2. Ler o arquivo existente

Leia o arquivo indicado (Modo A) ou recém-criado (Modo B).

---

## 3. Verificar e corrigir o arquivo

Cheque e corrija se necessário — **sem perguntar, apenas corrigir**:

### Frontmatter
Deve ter apenas `title:`. Se estiver faltando ou tiver campos extras (`sidebar_label`, `sidebar_position`, `id`, etc.), substituir por:
```markdown
---
title: Título Do Tópico
---
```
Use o título do H1 como valor de `title` se não houver frontmatter.

### Vídeo

Os vídeos ficam em subpastas de `static/assets/videos/`:
- `introducao/` → vídeos da introdução
- `trilha_nativo/` → trilha nativo (prefixos: `fund_`, `rec_`, `perf_`, `test_`, `cicd_`, `arq_`)
- `trilha_web/` → trilha web (mesmos prefixos)
- `trilha_masterclass/` → reservado

Convenção de nome: `<prefixo-modulo>_<NN>_<slug>.mp4` (ex: `fund_11_camera.mp4`)

Se existir um `.mp4` na subpasta correta, adicionar o bloco logo após o `# Título`:
```html
## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo/fund_11_meu_topico.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
```
- Se o arquivo já tiver um bloco `<video>` com URL `https://` ou `http://`, corrigir para o caminho `/trilha-react-native/assets/videos/<subpasta>/nome.mp4`.
- Se o bloco de vídeo estiver no meio do arquivo (não logo após o H1), movê-lo para o topo.

### Conteúdo
- Remover todas as ocorrências de `{% raw %}` e `{% endraw %}`
- Remover emojis

---

## 4. Registrar no sidebars.js

Abra `sidebars.js`.

O ID do documento é derivado do `title` do frontmatter convertido para slug pelo Docusaurus — **não** é o nome do arquivo.

Exemplos:
- `title: "Navegação"` → slug `navegacao`
- `title: "Utilizando Recursos Nativos"` → slug `utilizando-recursos-nativos`
- `title: "Estado & APIs"` → slug `estado-apis` (& vira -)

ID completo: `[trilha]/[modulo]/[slug]`

Adicione na categoria correta da trilha. Se a categoria do módulo não existir ainda, crie-a:

```js
{
  type: 'category',
  label: 'Nome do Módulo',
  collapsed: false,
  items: [
    'trilha-nativo/modulo-xxx/slug-do-topico',
  ],
},
```

---

## 5. Testar o build

```bash
npm run build
```

Se falhar com "These sidebar document ids do not exist", o build mostra os IDs disponíveis. Use o ID exato listado e corrija o `sidebars.js`. Repita até passar.

---

## 6. Atualizar o CLAUDE.md do módulo

Abra o `CLAUDE.md` dentro da pasta do módulo e adicione o novo arquivo na lista de arquivos.

Se não existir `CLAUDE.md` na pasta, crie com:
- Público-alvo
- Status: Em construção
- Lista de arquivos e o que cada um cobre
- O que não repetir do módulo anterior
- Linha: `Ver também: ../../CLAUDE.md`

---

## 7. Reportar

Informe:
- Caminho do arquivo
- ID registrado no `sidebars.js`
- Correções feitas (frontmatter, vídeo, raw tags)
- Resultado do build
- URL: `http://localhost:3000/trilha-react-native`
