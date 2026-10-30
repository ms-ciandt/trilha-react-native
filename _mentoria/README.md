# Mentoria — Mapa de Conhecimento

Ferramenta de autoavaliação de conhecimento para a mentoria de React Native.
Não é conteúdo do curso: fica fora de `docs/`, não segue as regras de
bilinguismo/sidebar/testes do site.

## Objetivo

Mapear os tópicos transversais mais relevantes cobertos pelo curso (Web,
Android, iOS, Masterclass, incluindo os labs práticos do `rn-advanced-lab`),
numa lista enxuta e rápida de preencher, coletar autoavaliação de cada
mentorado numa escala de 1 a 5, e agregar os dados para identificar:

- **Gaps de conteúdo existente** — tópicos com nota média baixa entre os
  mentorados, indicando que o material atual pode precisar de reforço,
  mais exemplos ou um vídeo.
- **Possíveis tópicos novos** — lacunas percebidas pelos mentorados que não
  estão cobertas neste mapa (registrar fora da planilha, em conversa/retro).

A lista de tópicos é deliberadamente enxuta (~20 itens) e transversal às
trilhas — cada tópico traz uma descrição curta resumindo os subtópicos reais
que o curso aborda. O curso aprofunda cada um deles bem além do resumo aqui;
isso é intencional, a planilha existe para ser rápida de preencher, não para
substituir o conteúdo. A trilha Introdução (módulo zero) não entra na
planilha — seus conceitos de New Architecture já estão absorvidos no tópico
"Fabric, JSI & TurboModules".

## Arquivos

| Arquivo | Papel |
|---|---|
| `dados_topicos.py` | **Fonte única de dados.** Lista de tópicos (topico, descricao, trilhas onde é abordado). Editar aqui, nunca direto no `.md` ou `.xlsx`. |
| `gerar_mapa_md.py` | Gera `mapa-conhecimento.md` a partir de `dados_topicos.py`. |
| `gerar_planilha.py` | Gera `mapa-conhecimento-mentoria.xlsx` a partir de `dados_topicos.py`. |
| `mapa-conhecimento.md` | Documento de referência legível (lista completa de tópicos + escala). |
| `mapa-conhecimento-mentoria.xlsx` | Planilha de coleta — enviar para os mentorados preencherem. |
| `.venv/` | Ambiente Python isolado com `openpyxl` (não versionado, ver `.gitignore`). |

## Como regenerar os artefatos

Depois de editar `dados_topicos.py` (adicionar/remover/ajustar tópicos):

```bash
cd _mentoria
./.venv/bin/python gerar_mapa_md.py
./.venv/bin/python gerar_planilha.py
```

Se o `.venv` não existir (ex.: clone novo do repo):

```bash
cd _mentoria
python3 -m venv .venv
./.venv/bin/pip install openpyxl
./.venv/bin/python gerar_mapa_md.py
./.venv/bin/python gerar_planilha.py
```

**Atenção:** regenerar `mapa-conhecimento-mentoria.xlsx` sobrescreve o
arquivo do zero — se mentorados já preencheram notas na planilha em uso,
não rode `gerar_planilha.py` por cima dela sem antes copiar as respostas
preenchidas para a nova versão.

## Estrutura da planilha

Uma única aba (`Mapa de Conhecimento`), **tópicos na vertical (à esquerda),
mentorados na horizontal (à direita)** — pensado para preenchimento
colaborativo simultâneo: cada pessoa usa sua própria coluna, sem disputar
célula com ninguém.

- **Colunas A-C (à esquerda, congeladas)** — `Tópico | Descrição | Trilhas`,
  uma linha por tópico (21 no total), sempre visíveis ao rolar
  horizontalmente entre as colunas de pessoa.
- **Colunas D-F (resumo do grupo, congeladas)** — por tópico: `Média do
  grupo`, `% Domínio do grupo` (com escala de cor vermelho→verde) e `Gap
  Crítico do grupo` (marca `"GAP"` quando a média do tópico, entre todos os
  mentorados, é menor que 3).
- **Linhas 4-5 (topo de cada coluna de pessoa)** — `Nome do mentorado` e
  `Time`.
- **Linha 6 (cabeçalho)** — rótulos fixos das colunas A-F e o aviso "Notas
  dos mentorados (1-5)" sobre as colunas de pessoa.
- **Coluna G em diante** — uma coluna em branco pré-formatada por
  mentorado: preenche Nome/Time no topo e uma nota de 1 a 5 (dropdown) em
  cada linha de tópico.
- **Última linha (`Média Geral (pessoa)`)** — média de todas as notas
  daquela coluna/pessoa.

As fórmulas de resumo do grupo (`AVERAGE` por linha) cobrem um intervalo
fixo de 40 colunas de cadastro — dá margem para crescer a turma sem
precisar mexer em fórmula (ver seção abaixo se precisar de mais).

### Escala de autoavaliação (1–5)

| Nível | Rótulo |
|---|---|
| 1 | Nunca ouvi falar |
| 2 | Já ouvi falar |
| 3 | Entendo o conceito / uso com apoio |
| 4 | Aplico sozinho |
| 5 | Domino a fundo / referência |

### Adicionando mais pessoas

O modelo já vem com 40 colunas de cadastro pré-formatadas (dropdown de
nota, bordas), pensado para turmas maiores que a inicial de ~15 pessoas —
basta usar as colunas em branco seguintes, nenhuma fórmula precisa mudar.

Se ultrapassar as 40 colunas: insira novas colunas **antes** da última
coluna de cadastro (nunca depois da última, para não ficar fora do
intervalo usado pelas fórmulas de resumo do grupo) e copie a
formatação/validação de uma coluna existente. Alternativamente, edite
`NUM_COLUNAS_PESSOAS` em `gerar_planilha.py` e regenere a planilha do zero
antes de distribuir (mais simples se ainda não há respostas coletadas).

## Fluxo sugerido de uso

1. Distribuir `mapa-conhecimento-mentoria.xlsx` para os mentorados — pode
   ser compartilhado como um único arquivo/link (ex.: importado para o
   Google Sheets): cada mentorado usa sua própria coluna, então não há
   disputa de célula ao preencher ao mesmo tempo.
2. Cada mentorado preenche Nome, Time (no topo) e uma nota (1-5) por
   tópico na sua coluna.
3. As colunas D-F já mostram o resumo agregado do grupo em tempo real —
   tópicos com `Gap Crítico do grupo = GAP` indicam prioridade de reforço
   de conteúdo.
4. Cruzar com feedback qualitativo dos mentorados para levantar tópicos
   que nem estão no mapa (candidatos a novo conteúdo).
5. Se a taxonomia de tópicos mudar, atualizar `dados_topicos.py` e
   regenerar ambos os artefatos.
