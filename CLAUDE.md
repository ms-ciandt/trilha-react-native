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
  trilha-masterclass/          ← trilha avançada (Brownfield, TurboModules, Fabric, Performance, CI/CD)
    modulo-00-overview/        ← visão geral do curso — arquivo .mdx com JSX
    modulo-01-brownfield/      ← integração brownfield (3 arquivos)
    modulo-02-turbomodules/    ← TurboModules
    modulo-03-fabric-jsi/      ← Fabric & JSI (6 arquivos)
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

## Site (Docusaurus)

- Gerador: **Docusaurus 3** com tema Classic
- Configuração: `docusaurus.config.js` na raiz
- Sidebars: `sidebars.js` na raiz — **toda nova página deve ser registrada aqui**
- Conteúdo: pasta `docs/`
- Assets estáticos (vídeos): pasta `static/assets/videos/`
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

Vídeos ficam em `static/assets/videos/`, organizados por trilha:

```
static/assets/videos/
  introducao/          ← vídeos dos arquivos em docs/introducao/
  trilha_nativo/       ← vídeos da trilha nativo (fund_, rec_, perf_, test_, cicd_, arq_)
  trilha_web/          ← vídeos da trilha web (mesmo prefixo)
  trilha_masterclass/  ← reservado
```

Convenção de nomes: `<prefixo-modulo>_<NN>_<slug>.mp4`
- `fund_` = modulo-fundamentos
- `rec_`  = modulo-recursos-nativos
- `perf_` = modulo-performance
- `test_` = modulo-testes
- `cicd_` = modulo-cicd
- `arq_`  = modulo-arquitetura

Se existir um `.mp4` para o tópico, adicionar logo após o `# Título` do arquivo `.md`:

```html
## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/trilha_nativo/fund_01_javascript.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
```

A URL usa sempre `/trilha-react-native/assets/videos/<subpasta>/nome.mp4` — funciona local (`npm run serve`) e em produção.

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
