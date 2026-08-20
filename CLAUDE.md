# Trilha React Native — Contexto Geral

## O que é este projeto

Conteúdo educacional completo para aprender React Native, organizado em duas trilhas por background do aluno e dividido em módulos progressivos.

## Estrutura de pastas

```
docs/
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
  trilha-masterclass/          ← trilha avançada (Brownfield, JSI, Fabric, TurboModules, Performance, CI/CD)
    modulo-00-overview/        ← visão geral do curso — arquivo .mdx com JSX
    modulo-01-brownfield/      ← integração brownfield (3 arquivos)
    modulo-02-jsi-fabric/      ← JSI & Fabric (6 arquivos)
    modulo-03-turbomodules/    ← TurboModules (builds on JSI)
    modulo-04-performance-cicd/ ← Performance e CI/CD (4 arquivos)
    modulo-05-upgrade/         ← Upgrade Strategy
_course-refs/                  ← arquivos COURSE-*.md consolidados (fora do docs/, não publicados)
  trilha-nativo/modulo-fundamentos/
  trilha-web/modulo-fundamentos/
  trilha-masterclass/...
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

## Regras de git

- **Nunca commitar diretamente na branch `main`** — sempre criar uma branch separada e abrir um PR
- Formato sugerido para branches: `<tipo>/<slug-do-topico>` (ex.: `content/performance-nativo`, `fix/video-paths`)

## Páginas da plataforma (src/pages/)

Toda nova página em `src/pages/` deve seguir o design system documentado em `.claude/design-system.md` — paleta de cores, anatomia de card, animações de entrada, grid de fundo e hero.

Toda página também precisa de versão traduzida em `i18n/pt/docusaurus-plugin-content-pages/`. Ver seção i18n no design system.

## Convenções obrigatórias

- Arquivos individuais: `NN-slug-do-tema.md` com frontmatter mínimo (`title` apenas)
- Arquivos `.mdx` são usados quando a página precisa de JSX (ex: `modulo-00-overview/00-course-overview.mdx`)
- Cada pasta de módulo tem um `COURSE-[nome-modulo].md` consolidando tudo — ficam em `_course-refs/`, **não dentro de `docs/`** (foram movidos para evitar warnings de build)
- Cada pasta tem seu próprio `CLAUDE.md` com contexto local — não publicado no site
- `trilha-nativo`: analogias com Kotlin/Swift; `trilha-web`: analogias com HTML/CSS/React web
- Comando `/adicionar-topico` disponível em `.claude/commands/adicionar-topico.md`
- Sem emojis em nenhum arquivo de conteúdo
- Sem `{% raw %}`/`{% endraw %}` — o site usa Docusaurus, blocos de código são renderizados diretamente
- Tamanho ideal de arquivo de conteúdo: 150–400 linhas. Acima de 500 linhas, quebrar em múltiplos arquivos

### Bilinguismo obrigatório (EN + PT-BR)

Toda implementação deve cobrir os dois idiomas. As regras de espelhamento são:

| Tipo de arquivo | EN (fonte) | PT-BR (espelho) |
|---|---|---|
| Página (`src/pages/`) | `src/pages/foo.jsx` | `i18n/pt/docusaurus-plugin-content-pages/foo.jsx` |
| Doc de conteúdo (`docs/`) | `docs/<trilha>/.../<arquivo>.md` | `i18n/pt/docusaurus-plugin-content-docs/current/<trilha>/.../<arquivo>.md` |
| CSS module de página | apenas em `src/pages/` — compartilhado entre os dois idiomas, **não duplicar** | — |

- Ao criar ou editar qualquer arquivo em `src/pages/`, criar/atualizar o espelho em `i18n/pt/docusaurus-plugin-content-pages/`
- Ao criar ou editar qualquer doc em `docs/`, criar/atualizar o espelho em `i18n/pt/docusaurus-plugin-content-docs/current/`
- O conteúdo PT-BR não é uma tradução mecânica palavra-por-palavra — mantém o mesmo código, estrutura e exemplos, apenas o texto explicativo é em português
- Se uma página EN ainda não tiver espelho PT-BR, criar junto na mesma tarefa

### New Architecture como padrão absoluto

Todo código de exemplo, snippet, explicação e referência de API deve usar exclusivamente a **New Architecture do React Native (0.76+)**:

- JSX/TSX usando Fabric (renderer) e JSI (bridge) — **sem menção à Bridge assíncrona legada como abordagem atual**
- TurboModules para módulos nativos — não `NativeModules` legado (pode mencionar como contexto histórico, nunca como solução recomendada)
- Fabric Components para componentes nativos — não `requireNativeComponent` legado
- Hermes como engine padrão — sem menção ao JavaScriptCore como padrão atual
- `InteractionManager`, `useNativeDriver: true`, `startTransition` e Concurrent Features disponíveis via New Architecture
- Expo SDK 56+ como ambiente de referência (já usa New Architecture por padrão)
- Se precisar mencionar a arquitetura legada, fazê-lo apenas como contexto histórico de comparação, nunca como caminho recomendado

## Testes unitários

O projeto usa **Vitest + React Testing Library** para testar as páginas JSX em `src/pages/` e seus espelhos PT-BR.

### O que é testado

| Arquivo de teste | Componente coberto |
|---|---|
| `src/__tests__/pages/index.test.jsx` | `src/pages/index.jsx` (home EN) |
| `src/__tests__/pages/index.pt.test.jsx` | `i18n/pt/docusaurus-plugin-content-pages/index.jsx` (home PT-BR) |
| `src/__tests__/pages/about.test.jsx` | `src/pages/about.jsx` (about EN) |
| `src/__tests__/pages/about.pt.test.jsx` | `i18n/pt/docusaurus-plugin-content-pages/about.jsx` (about PT-BR) |

### Strings "frozen" — não alterar sem atualizar o teste

Os testes verificam strings literais presentes no JSX. Alterar qualquer um dos itens abaixo **sem atualizar o teste correspondente quebra a pipeline**:

- Headings H1 (`React Native Academy`, `React Native Academy`, `About This Course`, `Sobre Este Curso`)
- Nomes dos cards de trilha (`Web dev trail`, `Android native trail`, `iOS native trail`, `React Native Masterclass Trail`, `Trilha Web`, `Trilha Android`, `Trilha iOS`, `Trilha React Native MasterClass`)
- Hrefs dos botões Start/Começar e links de masterclass
- Nomes e `alt` text dos contribuidores e revisores
- Tags da stack de referência (`React Native 0.76+`, `Expo SDK 56`, `New Architecture (default)` / `New Architecture (padrão)`, etc.)
- Textos de roles (`Architect` em EN, `Arquiteto` em PT-BR)

### Regra obrigatória ao editar `src/pages/`

Sempre que editar `src/pages/index.jsx`, `src/pages/about.jsx` ou seus espelhos PT-BR:

1. Atualizar o(s) teste(s) correspondente(s) em `src/__tests__/pages/`
2. Rodar `npm test` localmente antes de abrir o PR
3. A pipeline (`deploy.yml`) roda `npm test` antes do build — PR com teste falhando não passa

### Rodar os testes

```bash
npm test          # roda todos os testes
npm test -- --watch   # modo watch durante desenvolvimento
```

## Site (Docusaurus)

- Gerador: **Docusaurus 3** com tema Classic
- Configuração: `docusaurus.config.js` na raiz
- Sidebars: `sidebars.js` na raiz — **toda nova página deve ser registrada aqui**
- Conteúdo: pasta `docs/`
- Vídeos: hospedados no GitHub Release `v0-videos` — **não** em `static/` (gitignored)
- Deploy: GitHub Actions (`.github/workflows/deploy.yml`) — push para `main` publica automaticamente
- Testar local: `npm run build && npm run serve` → `http://localhost:3000/trilha-react-native`
- `markdown.format: 'detect'` habilitado — suporta `.md` e `.mdx` lado a lado
- Footer removido — configurar `footer: undefined` no `docusaurus.config.js`
- Navbar simplificada: apenas About, localeDropdown e GitHub (links de trilha removidos da navbar)
- Navbar com `hideOnScroll: true` — esconde ao rolar para baixo
- Sidebar com `hideable: true` — botão para recolher sidebar

## Adicionando páginas ao site

Ao criar qualquer novo arquivo `.md` em `docs/`, registrá-lo em `sidebars.js` sob a trilha e módulo corretos. O ID do documento é o `title` do frontmatter convertido para slug pelo Docusaurus — use o ID exato que o build reportar se houver erro.

Estrutura do `sidebars.js`:
```js
trilhaNativo: [
  { type: 'category', label: 'Fundamentos', items: ['trilha-nativo/modulo-fundamentos/slug'] },
  { type: 'category', label: 'Recursos Nativos', items: ['trilha-nativo/modulo-recursos-nativos/slug'] },
  // ...
]
```

## Vídeos

Vídeos são hospedados no **GitHub Release `v0-videos`** — **não** ficam dentro do repositório git (`.gitignore` bloqueia `.mp4`/`.webm`/`.mov` em `static/assets/videos/`).

Convenção de nomes: `<prefixo-modulo>_<NN>_<slug>.<ext>`
- `fund_` = modulo-fundamentos
- `rec_`  = modulo-recursos-nativos
- `perf_` = modulo-performance
- `test_` = modulo-testes
- `cicd_` = modulo-cicd
- `arq_`  = modulo-arquitetura

Para adicionar um novo vídeo, use o `/integrar-videos` — ele faz o upload via `gh release upload` e atualiza os docs automaticamente. O `gh` CLI precisa estar instalado e autenticado (`gh auth login`).

Se existir um vídeo para o tópico, adicionar logo após o `# Título` do arquivo `.md`:

```html
## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/fund_01_javascript.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
```

A URL usa sempre `https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/<nome-do-arquivo>`.

## Tecnologia de referência

- React Native 0.76+ (New Architecture por padrão)
- Expo SDK 56
- JSI, Fabric, TurboModules, Hermes

## Referências internas

- Introdução ao projeto: `docs/introducao/00-welcome.md`
- História e arquitetura: `docs/introducao/01-history-and-architecture.md`
- New Architecture (JSI/Fabric/TurboModules): `docs/introducao/02-new-architecture.md`
- Guia de escolha de trilha: `docs/introducao/03-choose-your-track.md`
- Conteúdo completo trilha nativo fundamentos: `_course-refs/trilha-nativo/modulo-fundamentos/COURSE-fundamentos.md`
- Conteúdo completo trilha web fundamentos: `_course-refs/trilha-web/modulo-fundamentos/COURSE-fundamentos.md`
- Design system e padrões visuais: `.claude/design-system.md`
- README com regras de contribuição: `README.md`

## Trilha Masterclass

A trilha avançada (`docs/trilha-masterclass/`) segue padrões visuais próprios:
- Páginas usam classes CSS `.mc-page`, `.mc-header`, `.mc-badge`, `.mc-level-badge`, `.mc-title`, `.mc-subtitle`
- Sidebar tema escuro (`#0a0e1a`) com links ativos em dourado (`#d4a017`)
- Overview do módulo usa `.mdx` com JSX para aplicar o layout visual
- Ver `.claude/design-system.md` para detalhes completos das classes e animações
