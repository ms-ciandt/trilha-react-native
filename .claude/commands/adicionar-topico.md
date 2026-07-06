Você vai adicionar um novo tópico à trilha React Native. Siga este fluxo exato.

## 1. Coletar informações

Pergunte ao usuário (se não informado na mensagem):

1. **Conteúdo**: o usuário deve colar o texto do tópico ou informar o caminho de um arquivo `.md` existente
2. **Trilha**: `trilha-nativo` ou `trilha-web`
3. **Módulo**: `modulo-fundamentos`, `modulo-recursos-nativos`, `modulo-performance`, `modulo-testes`, `modulo-cicd` ou `modulo-arquitetura`
4. **Título do tópico**: nome curto (ex: "Navegação com React Navigation")
5. **Tem vídeo?**: se sim, qual o nome do arquivo `.mp4` em `static/assets/videos/`

## 2. Determinar o número do arquivo

Liste os arquivos existentes na pasta destino (`docs/[trilha]/[modulo]/`) para determinar o próximo número (`NN`).

## 3. Criar o arquivo `.md`

Caminho: `docs/[trilha]/[modulo]/NN-slug-do-titulo.md`

Estrutura obrigatória:

```markdown
---
title: Título Completo do Tópico
---

# Título Completo do Tópico

[BLOCO DE VÍDEO AQUI — se houver]

[conteúdo do tópico]
```

Regras de conteúdo:
- Sem emojis
- Sem `{% raw %}`/`{% endraw %}`
- `trilha-nativo`: comparações com Kotlin/Swift onde relevante
- `trilha-web`: comparações com HTML/CSS/React web onde relevante
- Código React Native focado em New Architecture (RN 0.76+)
- Sem comentários óbvios no código — só comentários que explicam o "porquê"

Bloco de vídeo (inserir logo após o `# Título`, somente se houver `.mp4`):
```html
## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/NOME-DO-ARQUIVO.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
```

## 4. Registrar no sidebars.js

Abra `sidebars.js` e adicione o ID do documento na categoria correta.

O ID é: `[trilha]/[modulo]/[slug-do-arquivo-sem-.md]`

Exemplo para `docs/trilha-nativo/modulo-recursos-nativos/01-camera.md`:
```js
trilhaNativo: [
  // ...
  {
    type: 'category',
    label: 'Recursos Nativos',
    items: [
      'trilha-nativo/modulo-recursos-nativos/01-camera',  // ← adicionar aqui
    ],
  },
]
```

Se a categoria do módulo ainda não existir no sidebar da trilha, criá-la.

## 5. Testar o build

Execute:
```bash
npm run build
```

Se o build falhar com "document ids do not exist", o ID no `sidebars.js` está errado. O erro mostra os IDs disponíveis — use o ID exato listado.

Se o build passar, execute:
```bash
npm run serve
```

Confirme que a página aparece na navegação em `http://localhost:3000/trilha-react-native`.

## 6. Atualizar o CLAUDE.md do módulo

Abra o `CLAUDE.md` dentro da pasta do módulo e adicione o novo arquivo na lista "O que este módulo cobre".

Se a pasta do módulo não tiver `CLAUDE.md`, crie um com:
- Público-alvo
- Status: Em construção
- Lista de arquivos e o que cada um cobre
- O que NÃO repetir do módulo anterior
- Referência: `../../CLAUDE.md`

## 7. Reportar ao usuário

Informe:
- Caminho do arquivo criado
- ID registrado no `sidebars.js`
- Resultado do build (sucesso ou erro encontrado e corrigido)
- URL local para visualizar: `http://localhost:3000/trilha-react-native`
