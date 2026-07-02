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

- Arquivos individuais: `NN-slug-do-tema.md` com frontmatter (`id`, `title`, `sidebar_label`, `sidebar_position`)
- Cada pasta de módulo tem um `COURSE-[nome-modulo].md` consolidando tudo sem frontmatter
- Cada pasta tem seu próprio `CLAUDE.md` com contexto local
- `trilha-nativo`: analogias com Kotlin/Swift; `trilha-web`: analogias com HTML/CSS/React web
- Comando `/novo-modulo` disponível em `.claude/commands/novo-modulo.md`

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
