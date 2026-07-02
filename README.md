# Trilhas de Aprendizado em React Native

Conteúdo educacional organizado em duas trilhas por background do aluno, dividido em módulos progressivos.

---

## Trilhas específicas por background

### 1. Para Devs Nativos (Android/iOS)

| Tópico | Módulo |
|--------|--------|
| JS/TS – dominar a linguagem | Fundamentos |
| Fundamentos React | Fundamentos |
| Fundamentos RN – core components, layout, flexbox | Fundamentos |
| Navegação | Fundamentos |
| Estado e API | Fundamentos |
| Acesso a recursos nativos | Recursos Nativos |
| Integração nativa avançada | Recursos Nativos |
| Performance RN | Performance |
| Testes | Testes |
| CI/CD | CI/CD |
| Arquitetura | Arquitetura |

### 2. Para Devs Web (React)

| Tópico | Módulo |
|--------|--------|
| Ajuste de JS/TS para mobile | Fundamentos |
| Diferenças web vs RN | Fundamentos |
| Fundamentos RN – componentes nativos, estilos, listas | Fundamentos |
| Navegação – Stack/Tab/Drawer | Fundamentos |
| Estado global + APIs | Fundamentos |
| Recursos nativos – permissões, câmera, storage | Recursos Nativos |
| Noções de integração nativa | Recursos Nativos |
| Performance mobile | Performance |
| Testes | Testes |
| CI/CD | CI/CD |
| Arquitetura | Arquitetura |

---

## Estrutura do repositório

```
trilha-react-native/
├── README.md
├── CLAUDE.md                        ← contexto geral para o Claude
├── introducao/                      ← módulo zero, comum às duas trilhas
│   ├── CLAUDE.md
│   ├── 00-welcome.md
│   ├── 01-history-and-architecture.md
│   ├── 02-new-architecture.md
│   └── 03-choose-your-track.md
│
├── trilha-nativo/                   ← para devs Android (Kotlin) / iOS (Swift)
│   ├── modulo-fundamentos/          ← CONCLUÍDO
│   │   ├── CLAUDE.md
│   │   ├── COURSE-fundamentos.md
│   │   ├── 01-js-ts-overview.md
│   │   └── ...
│   ├── modulo-recursos-nativos/     ← a criar
│   ├── modulo-performance/          ← a criar
│   ├── modulo-testes/               ← a criar
│   ├── modulo-cicd/                 ← a criar
│   └── modulo-arquitetura/          ← a criar
│
└── trilha-web/                      ← para devs React web
    ├── modulo-fundamentos/          ← CONCLUÍDO
    │   ├── CLAUDE.md
    │   ├── COURSE-fundamentos.md
    │   ├── 01-adaptando-js-ts.md
    │   └── ...
    ├── modulo-recursos-nativos/     ← a criar
    ├── modulo-performance/          ← a criar
    ├── modulo-testes/               ← a criar
    ├── modulo-cicd/                 ← a criar
    └── modulo-arquitetura/          ← a criar
```

---

## Como contribuir com novos módulos

### Regras de arquitetura

**1. Um módulo = uma pasta**

Cada módulo vive em sua própria pasta. Não misture conteúdo de módulos diferentes.

**2. Nomenclatura dos arquivos**

Arquivos individuais seguem o padrão `NN-slug-do-tema.md`:

```
01-navegacao-stack.md
02-navegacao-tabs.md
03-navegacao-drawer.md
```

**3. Arquivo consolidado obrigatório**

Cada pasta de módulo deve ter um `COURSE-[nome-modulo].md` com todo o conteúdo concatenado em ordem, sem frontmatter, com `---` separando cada seção.

**4. Frontmatter nos arquivos individuais**

```markdown
---
id: nome-do-arquivo
title: Título Completo do Documento
sidebar_label: Título Curto
sidebar_position: 1
---
```

**5. Padrão de conteúdo**

- `trilha-nativo`: comparações Kotlin/Swift → JS/TS → React Native
- `trilha-web`: comparações HTML/CSS/React web → React Native
- Tabelas de mapeamento quando aplicável
- Exercícios práticos ao final
- Links para docs oficiais: [reactnative.dev](https://reactnative.dev), [expo.dev](https://docs.expo.dev), [react.dev](https://react.dev)
- Foco no React Native New Architecture (0.76+, Expo SDK 56)

**6. CLAUDE.md em cada módulo**

Toda pasta de módulo deve ter um `CLAUDE.md` com público-alvo, o que cobre, o que não repetir do módulo anterior e referências internas.

---

## Usando o Claude para criar novos módulos

Use o comando `/novo-modulo` dentro do Claude Code em qualquer pasta do projeto. O Claude vai perguntar a trilha e os tópicos e criar todos os arquivos seguindo o padrão correto.

```bash
cd trilha-react-native
claude
# depois digite: /novo-modulo
```

---

## Status atual

| Módulo | Trilha Nativo | Trilha Web |
|--------|--------------|------------|
| Fundamentos | ✅ Concluído | ✅ Concluído |
| Recursos Nativos | 🔲 A criar | 🔲 A criar |
| Performance | 🔲 A criar | 🔲 A criar |
| Testes | 🔲 A criar | 🔲 A criar |
| CI/CD | 🔲 A criar | 🔲 A criar |
| Arquitetura | 🔲 A criar | 🔲 A criar |
