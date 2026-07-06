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
- Comando `/adicionar-topico` disponível em `.claude/commands/adicionar-topico.md`
- Sem emojis em nenhum arquivo de conteúdo
- Sem `{% raw %}`/`{% endraw %}` — o site usa Docusaurus, blocos de código são renderizados diretamente

## Site (Docusaurus)

- Gerador: **Docusaurus 3** com tema Classic
- Configuração: `docusaurus.config.js` na raiz
- Sidebars: `sidebars.js` na raiz — **toda nova página deve ser registrada aqui**
- Conteúdo: pasta `docs/`
- Assets estáticos (vídeos): pasta `static/assets/videos/`
- Deploy: GitHub Actions (`.github/workflows/deploy.yml`) — push para `main` publica automaticamente
- Testar local: `npm run build && npm run serve` → `http://localhost:3000/trilha-react-native`

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

Vídeos ficam em `static/assets/videos/`. Se existir um `.mp4` para o tópico, adicionar logo após o `# Título` do arquivo `.md`:

```html
## Video Overview

<video width="100%" controls>
  <source src="/trilha-react-native/assets/videos/NOME-DO-ARQUIVO.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
```

A URL usa sempre `/trilha-react-native/assets/videos/nome.mp4` — funciona local (`npm run serve`) e em produção.

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
