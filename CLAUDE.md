# Trilha React Native — Contexto Geral

## O que é este projeto

Conteúdo educacional completo para aprender React Native, organizado em duas trilhas por background do aluno e dividido em módulos progressivos.

## Estrutura de pastas

```
introducao/                  ← módulo zero, comum às duas trilhas, leia antes de tudo
trilha-nativo/               ← para devs Android (Kotlin) / iOS (Swift)
  modulo-fundamentos/        ← CONCLUÍDO — ver CLAUDE.md interno
  modulo-recursos-nativos/   ← a criar
  modulo-performance/        ← a criar
  modulo-testes/             ← a criar
  modulo-cicd/               ← a criar
  modulo-arquitetura/        ← a criar
trilha-web/                  ← para devs React web
  modulo-fundamentos/        ← CONCLUÍDO — ver CLAUDE.md interno
  modulo-recursos-nativos/   ← a criar
  modulo-performance/        ← a criar
  modulo-testes/             ← a criar
  modulo-cicd/               ← a criar
  modulo-arquitetura/        ← a criar
```

## Mapeamento tópico → módulo

### Trilha Nativo
- JS/TS, React, RN core components, layout, navegação, estado e API → `modulo-fundamentos`
- Acesso a recursos nativos, integração nativa avançada → `modulo-recursos-nativos`
- Performance RN → `modulo-performance`
- Testes → `modulo-testes`
- CI/CD → `modulo-cicd`
- Arquitetura → `modulo-arquitetura`

### Trilha Web
- Ajuste JS/TS, diferenças web vs RN, componentes nativos, estilos, listas, navegação, estado e APIs → `modulo-fundamentos`
- Recursos nativos, integração nativa → `modulo-recursos-nativos`
- Performance mobile → `modulo-performance`
- Testes → `modulo-testes`
- CI/CD → `modulo-cicd`
- Arquitetura → `modulo-arquitetura`

## Convenções obrigatórias

- Arquivos individuais: `NN-slug-do-tema.md` com frontmatter mínimo (`title` apenas)
- Cada pasta de módulo tem um `COURSE-[nome-modulo].md` consolidando tudo — não publicado no site
- Cada pasta tem seu próprio `CLAUDE.md` com contexto local — não publicado no site
- `trilha-nativo`: analogias com Kotlin/Swift; `trilha-web`: analogias com HTML/CSS/React web
- Comando `/novo-modulo` disponível em `.claude/commands/novo-modulo.md`
- **NÃO usar** `{% raw %}`/`{% endraw %}` — o site usa MkDocs (não Jekyll), blocos de código são renderizados diretamente

## Site (MkDocs)

- Gerador: **MkDocs** com tema **Material**
- Configuração: `mkdocs.yml` na raiz
- Deploy: GitHub Actions (`.github/workflows/deploy.yml`) — push para `main` publica automaticamente
- Navegação declarada em `mkdocs.yml` — ao criar novo módulo, adicionar as páginas na seção `nav:` correspondente
- Ao adicionar novo módulo/arquivo ao nav, adicionar também em `mkdocs.yml` sob a trilha e módulo corretos

## Vídeos

Se existir um arquivo `.mp4` com o mesmo slug do tópico na mesma pasta, adicionar uma seção **"## Video Overview"** no arquivo `.md` correspondente, antes da seção de Resources (ou antes do "Next →" se não houver Resources). Usar sempre este bloco:

```html
## Video Overview

<video width="100%" controls style="border-radius: 8px; margin: 16px 0;">
  <source src="https://alimuramatheus.github.io/trilha-react-native/[caminho-relativo-do-arquivo.mp4]" type="video/mp4">
  Your browser does not support the video tag.
</video>
```

Todos os vídeos ficam em `assets/videos/`. O `[caminho-relativo-do-arquivo.mp4]` é sempre `assets/videos/nome-do-arquivo.mp4` (ex: `assets/videos/01-history-and-architecture.mp4`).

## Tecnologia de referência

- React Native 0.76+ (New Architecture por padrão)
- Expo SDK 56
- JSI, Fabric, TurboModules, Hermes

## Referências internas

- Introdução ao projeto: `introducao/00-welcome.md`
- História e arquitetura: `introducao/01-history-and-architecture.md`
- New Architecture (JSI/Fabric/TurboModules): `introducao/02-new-architecture.md`
- Guia de escolha de trilha: `introducao/03-choose-your-track.md`
- Conteúdo completo trilha nativo fundamentos: `trilha-nativo/modulo-fundamentos/COURSE-fundamentos.md`
- Conteúdo completo trilha web fundamentos: `trilha-web/modulo-fundamentos/COURSE-fundamentos.md`
- README com regras de contribuição: `README.md`
