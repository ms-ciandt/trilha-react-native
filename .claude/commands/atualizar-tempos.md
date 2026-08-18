Atualiza os tempos de leitura e duração de vídeos do curso após novos vídeos serem adicionados.

## Contexto

O site exibe badges de tempo em cada página de conteúdo (`[glasses] N min read` / `[eye] N min watch`)
e um totalizador na home (`7 h 26 min reading · 11 h 53 min watching`).

Esses dados vêm de dois arquivos gerados:
- `src/data/video-durations.json` — duração real de cada vídeo (scraped via Playwright do site publicado)
- `src/data/content-times.json` — tempo de leitura (word count / 200 wpm) + duração do vídeo, por doc e agregado por módulo/trilha/total

Sempre que novos vídeos forem adicionados ao GitHub Release `v0-videos` e embutidos nos `.md`,
esses arquivos precisam ser regenerados e commitados.

## Pré-requisito

O site publicado precisa estar no ar (GitHub Pages) com os novos vídeos já embutidos nos docs.
O scraper navega o site real para ler `video.duration` do browser — não funciona localmente.

Verificar que o deploy foi feito antes de continuar:
```
https://ms-ciandt.github.io/trilha-react-native/
```

## Passo 1 — Scrape das durações reais

Navega todas as páginas publicadas e lê `video.duration` de cada `<video>` element.
Usa Playwright via `mcp/notebook-downloader/node_modules/playwright`.

```bash
node scripts/scrape-video-durations.mjs
```

- Concorrência padrão: 5 páginas simultâneas (~3–4 min para 142 páginas)
- Salva progresso a cada batch em `src/data/video-durations.json` — se interrompido, reiniciar do zero
- Para concorrência diferente: `node scripts/scrape-video-durations.mjs --concurrency 3`
- Ao final imprime o total de vídeos encontrados e o tempo total acumulado

Páginas sem `<video>` (ex: iOS fundamentos pendentes) são ignoradas silenciosamente.

## Passo 2 — Recomputa tempos de leitura e totais

Lê todos os `.md`/`.mdx` em `docs/`, conta palavras (strip code blocks + HTML), une com as durações
scraped e gera os agregados por doc, módulo, trilha e total.

```bash
node scripts/compute-times.mjs
```

Saída: `src/data/content-times.json`. Imprime ao final:
```
Processed 142 docs.
Total reading time: X.X hours
Total video time:   X.X hours
```

## Passo 3 — Criar branch, commitar e abrir PR

Os dois arquivos gerados devem ser commitados juntos:

```bash
git checkout -b content/atualizar-tempos-$(date +%Y%m%d)
git add src/data/video-durations.json src/data/content-times.json
git commit -m "feat(data): update video durations and reading times"
git push -u origin HEAD
```

Abrir PR para `main`.

## O que NÃO fazer

- Não commitar `static/assets/videos/` — vídeos ficam no GitHub Release, não no repo
- Não editar `video-durations.json` manualmente — sempre regenerar via scraper
- Não rodar o scraper contra o servidor local (`npm run serve`) — ele precisa do site publicado
  com os vídeos nos URLs do GitHub Release

## Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `scripts/scrape-video-durations.mjs` | Playwright agent — lê `video.duration` de cada página |
| `scripts/compute-times.mjs` | Gera `content-times.json` a partir dos docs + durações |
| `src/data/video-durations.json` | `{ "filename.mp4": minutes }` — output do scraper |
| `src/data/content-times.json` | Agregados por doc/módulo/trilha/total — input do site |
| `src/theme/DocItem/Content/index.jsx` | Swizzle Docusaurus — injeta badges em cada página |
| `src/components/TimeBadges.jsx` | Componente de badge (leitura + vídeo) |
