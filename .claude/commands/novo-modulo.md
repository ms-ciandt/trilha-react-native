Você vai criar um novo módulo para a trilha React Native seguindo a arquitetura do projeto.

## Antes de começar

Leia o `CLAUDE.md` da raiz do projeto para entender a estrutura geral e o mapeamento de tópicos por módulo. Depois leia o `CLAUDE.md` do módulo anterior para saber o que já foi coberto e não deve ser repetido.

## Receba as informações necessárias

Pergunte ao usuário:
1. Qual trilha? (`trilha-nativo` ou `trilha-web`)
2. Qual módulo? (`modulo-recursos-nativos`, `modulo-performance`, `modulo-testes`, `modulo-cicd` ou `modulo-arquitetura`)
3. Quais tópicos devem ser cobertos? (se não informado, consulte o `CLAUDE.md` da raiz para os tópicos mapeados para este módulo)

## Módulos disponíveis e seus tópicos

### trilha-nativo
- `modulo-recursos-nativos` — acesso a recursos nativos, integração nativa avançada
- `modulo-performance` — performance RN
- `modulo-testes` — testes
- `modulo-cicd` — CI/CD
- `modulo-arquitetura` — arquitetura

### trilha-web
- `modulo-recursos-nativos` — recursos nativos (permissões, câmera, storage), noções de integração nativa
- `modulo-performance` — performance mobile
- `modulo-testes` — testes
- `modulo-cicd` — CI/CD
- `modulo-arquitetura` — arquitetura

## Estrutura a criar

```
trilha-[trilha]/modulo-[nome]/
├── CLAUDE.md
├── COURSE-[nome].md       ← gerado ao final, consolida tudo
├── 01-[topico].md
├── 02-[topico].md
└── ...
```

## Padrão de cada arquivo .md individual

Todo arquivo deve começar com frontmatter:

```markdown
---
id: nome-do-arquivo
title: Título Completo
sidebar_label: Título Curto
sidebar_position: 1
---
```

Seguido do conteúdo com:
- Introdução contextualizada para o público da trilha
- Para `trilha-nativo`: comparações com Kotlin/Swift onde relevante
- Para `trilha-web`: comparações com equivalentes web onde relevante
- Exemplos de código em React Native (foco no New Architecture, RN 0.76+, Expo SDK 56)
- Tabelas de mapeamento quando aplicável
- Exercícios práticos ao final
- Links para docs oficiais relevantes (reactnative.dev, expo.dev, react.dev)

## CLAUDE.md do módulo

Crie o `CLAUDE.md` dentro da pasta do módulo com:
- Público-alvo
- Status (Em construção)
- Lista dos arquivos e o que cada um cobre
- O que NÃO repetir (referenciando o módulo anterior)
- Nome do arquivo consolidado
- Próximo módulo na sequência
- Referências para `../../CLAUDE.md`

## COURSE-[nome].md

Após criar todos os arquivos individuais, gere o consolidado:
- Cabeçalho com título e descrição do módulo
- Conteúdo de cada arquivo em ordem, sem frontmatter
- Separador `---` entre cada seção

## Ao finalizar

Atualize o `README.md` da raiz:
- Mude o status do módulo de `🔲 A criar` para `✅ Concluído`

Atualize o `CLAUDE.md` da raiz:
- Mude o status do módulo de `← a criar` para `← CONCLUÍDO`
