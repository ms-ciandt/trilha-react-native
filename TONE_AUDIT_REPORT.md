# Relatório de auditoria de tom — resultado final

Gerado em 2026-09-24. Este arquivo não é conteúdo do curso — não fica em `docs/`, não é publicado no site, é só um registro de trabalho. Pode apagar quando não precisar mais.

## 0. Resumo executivo

- **Nenhum arquivo `.md`/`.mdx` foi alterado.** Toda a auditoria foi leitura, nenhuma escrita.
- **Cobertura: 100% dos arquivos de conteúdo do curso**, EN + espelho PT-BR — Android (8 módulos), iOS (8 módulos), Web, Masterclass, introdução, `_course-refs/`. Cada arquivo foi lido por completo (não por grep/amostra) por um agente dedicado.
- **Achados de tom hostil em `.md`/`.mdx`: zero.** Todas as trilhas tratam o background do aluno como vantagem, nunca como deficiência.
- **A hostilidade real está nas narrações de vídeo geradas por IA (`.vtt`)**, não no texto-fonte — ver seção 3. Isso já era conhecido de antes desta rodada e permanece a única ação pendente real.
- **Bugs de conteúdo (não relacionados a tom) encontrados no caminho** — ver seção 4. O mais grave: um arquivo inteiro em inglês truncado e substituído por texto de geração de IA.
- **CORREÇÃO (2026-09-28, atualizada): `00_welcome` e `03_choose_track` agora ESTÃO corrigidos e publicados.** Depois de duas tentativas reprovadas cada, novos áudios gerados a partir do `.md` fonte (fluxo revisado, sem script fixo intermediário) foram verificados por transcrição real (faster-whisper) e passaram limpos no scan de frases hostis (`scripts/check-narration.py`, ver seção 5.2 para o histórico das tentativas reprovadas). Os dois vídeos foram enviados ao release `v0-videos` (`--clobber`) e as legendas `.vtt`/`_en.vtt` foram regeneradas a partir da transcrição real e traduzidas para PT-BR.

## 1. Escopo e método

Todo o conteúdo `.md`/`.mdx` do curso, EN + espelho PT-BR:

- `docs/introducao/`
- `docs/trilha-android/` (8 módulos: fundamentos, compose-para-rn, new-architecture, recursos-nativos, performance, testes, cicd, arquitetura)
- `docs/trilha-ios/` (8 módulos: fundamentos, recursos-nativos, new-architecture, performance, testes, cicd, arquitetura)
- `docs/trilha-web/`
- `docs/trilha-masterclass/` (84 arquivos, 6 módulos)
- `docs/rn-advanced-lab/`
- `_course-refs/` (COURSE-*.md consolidados)

Total: 300+ arquivos, nos dois idiomas, cada um lido integralmente por um agente dedicado (não amostragem/grep). Método: varredura de palavras-chave (frustração, desperdício de tempo, severidade, vergonha/orgulho/humildade, comparativos depreciativos como primitivo/obsoleto/inferior/idiota/incompetente/hack/gambiarra, zombaria) seguida de revisão manual parágrafo a parágrafo para separar falso positivo técnico (ex. "tipos primitivos", "bridge legada" como histórico neutro) de hostilidade real.

## 2. Resultado: arquivos `.md`/`.mdx` — nenhuma alteração necessária

| Escopo | Arquivos | Achados de tom hostil |
|---|---|---|
| `docs/trilha-android/` (8 módulos, EN+PT) | 80 | 0 |
| `docs/trilha-ios/` (8 módulos, EN+PT) | 87 | 0 |
| `docs/trilha-web/`, `docs/trilha-masterclass/` (84), `docs/rn-advanced-lab/` (+ espelhos) | 131 | 0 |
| `docs/introducao/` (+ espelho), `_course-refs/*.md` | 11 | 0 |

**Conclusão confirmada por duas rodadas independentes de auditoria (sweep inicial por trilha + releitura granular por módulo): o texto-fonte já está no tom certo.** Toda comparação Android/iOS/Web → React Native é framed como "você já sabe X, isso mapeia para Y" — nunca como "seu conhecimento é inferior/obsoleto". Termos como "legacy bridge", "primitivo", "trivial" aparecem só em contexto técnico neutro (tipos primitivos, histórico da bridge conforme a regra do CLAUDE.md de mencionar arquitetura legada apenas como contexto histórico).

## 3. Onde a hostilidade realmente está: narração gerada por IA (`.vtt`)

**O tom agressivo não vem do `.md`, vem do que o processo de geração de narração (NotebookLM) produz a partir dele.** O mesmo `.md` limpo de `00-welcome.md` virou uma narração com frases como "engolir seu orgulho" — o gerador está dramatizando/inventando esse framing por conta própria, não reproduzindo o que está escrito.

| Arquivo de legenda/narração | Verdict | Precisa de vídeo novo? |
|---|---|---|
| `static/assets/captions/introducao/00_welcome.vtt` + `_en.vtt` | **Corrigido e publicado (2026-09-28) — áudio novo verificado limpo, ver seção 5.2** | Não (concluído) |
| `static/assets/captions/introducao/03_choose_track.vtt` + `_en.vtt` | **Corrigido e publicado (2026-09-28) — áudio novo verificado limpo após 2 tentativas reprovadas, ver seção 5.2** | Não (concluído) |
| `introducao/01_history_architecture(.vtt/_en.vtt)` | Limpo — reconfirmado nesta rodada | Não |
| `trilha_android/arq_01_architecture-patterns(.vtt/_en.vtt)` | Limpo — reconfirmado nesta rodada | Não |
| `trilha_ios/arq_01_architecture-patterns(.vtt/_en.vtt)` | Limpo — reconfirmado nesta rodada | Não |
| `trilha_ios/cicd_03_github_actions_ios(.vtt/_en.vtt)` | Limpo | Não |
| `trilha_ios/cicd_04_eas_build_ios(.vtt/_en.vtt)` | Limpo | Não |
| `trilha_android/rec_04_sensors(.vtt/_en.vtt)` | Limpo | Não |

**Atenção de escopo:** só esses 9 arquivos de legenda foram auditados individualmente (amostra). O restante das legendas em `trilha_android/`, `trilha_ios/`, `trilha_web/`, `trilha_masterclass/` **não foi lido ainda** — se quiser cobertura completa antes de decidir quais vídeos regerar, aviso e eu continuo a varredura.

### Citações exatas — `00_welcome` (confirmado hostil)

EN:
- "As an experienced developer, nothing is more frustrating than learning a new framework, only to have your momentum grind to a halt on page one."
- "...is a complete waste of your time and return on investment."
- "But your trade-off is severe. You have to completely leave behind your preferred native languages..."
- "Native developers face a harsh syntax shift, trading language comfort for the heavy return on investment..."
- "...cross-platform mastery requires the humility to be an absolute beginner again..."
- "Native developers have to swallow their pride and learn CSS style properties, while web developers must submit to strict mobile memory constraints."

PT-BR:
- "é uma completa perda de seu tempo e retorno do investimento"
- "sua compensação é severa"
- "Desenvolvedores nativos enfrentam uma mudança de sintaxe severa"
- "a humildade de ser um iniciante absoluto novamente"
- "Desenvolvedores nativos têm que engolir seu orgulho e aprender propriedades de estilo CSS, enquanto desenvolvedores web devem se submeter a restrições rigorosas de memória móvel."

### Padrão presente em `03_choose_track` (limítrofe)

- "Native developers must trade their deep, comfortable platform fluency for a steep and challenging initial mental shift... But once you clear that hurdle, your native expertise makes you incredibly effective." — sempre com ressalva positiva na frase seguinte.
- "Senior engineers trade the safety of pure JavaScript for the high complexity of native integration layers. It is a steep and demanding climb, but ultimately, it is the only way to achieve true scaling ability."
- Não tem "swallow your pride", não tem "waste of your time", não tem "humility to be an absolute beginner" — mais suave que o `00_welcome`.

### Por que "consertar o `.md`" sozinho não resolve

Como o `.md` de `00-welcome.md` já estava limpo e mesmo assim gerou narração hostil, regerar o vídeo a partir do mesmo `.md` inalterado **não garante** um resultado melhor. Duas opções práticas:

1. **Revisar o rascunho de narração antes de fechar o vídeo**, cortando qualquer frase tipo "trade-off severo" / "engolir o orgulho" reintroduzida.
2. **Fornecer um roteiro de narração pronto** em vez de deixar o gerador criar do zero em cima do `.md`.

Os roteiros alternativos (EN + PT-BR) para `00_welcome` e `03_choose_track` já foram redigidos e entregues nesta conversa anteriormente — disponíveis no histórico da sessão, não repetidos aqui para não inflar este arquivo.

## 4. Bugs de conteúdo encontrados no caminho (não são problema de tom)

Os agentes de auditoria leram cada arquivo por completo e, além do tom, sinalizaram vários problemas de integridade de conteúdo. Nenhum foi corrigido — só reportado.

### 4.1. Prioridade alta: arquivo EN truncado e corrompido

**`docs/trilha-ios/modulo-arquitetura/01-architecture-patterns.md`** — conteúdo real só até a linha ~82 (frontmatter, vídeo, intro, seção MVVM completa). A partir da linha 84, em vez de continuar o artigo, o arquivo contém um parágrafo de meta-comentário de geração de IA descrevendo o que o arquivo *deveria* conter (menciona "323 lines", VIPER, Repository pattern, DI, Zustand, Combine/TanStack Query, thin components, folder structure) — mas esse conteúdo não existe no arquivo, que termina em 87 linhas. O espelho PT-BR está completo e correto (434 linhas, todas as 8 seções presentes). **Ação recomendada: reconstruir o EN a partir da estrutura do PT-BR (traduzido de volta), já que o PT-BR tem o conteúdo completo e correto.**

### 4.2. Arquivos PT-BR com texto de artefato de geração antes do frontmatter

Esses dois arquivos têm uma linha de meta-comentário do processo de geração colada **antes** do `---` do frontmatter, o que pode quebrar o parsing do Docusaurus ou aparecer como texto visível na página publicada:

- `i18n/pt/docusaurus-plugin-content-docs/current/trilha-ios/modulo-fundamentos/06-rn-core-components.md` (linha 1) — texto: "The source file (`06-rn-core-components.md`) doesn't exist yet in either location..."
- `i18n/pt/docusaurus-plugin-content-docs/current/trilha-ios/modulo-cicd/03-github-actions-ios.md` — texto: "The source file is already written in Brazilian Portuguese. Returning it as-is, since no translation is needed."

Em ambos, o conteúdo real (frontmatter + artigo) começa logo depois e está correto — só precisa remover a linha espúria do topo.

### 4.3. Acentuação quebrada em espelhos PT-BR (múltiplos arquivos)

Padrão recorrente: alguns arquivos PT-BR perdem os acentos parcial ou totalmente (ex. "Voce" em vez de "Você", "Documentacao" em vez de "Documentação", "nao" em vez de "não"). Parece um problema de geração/encoding que afeta arquivos específicos, não o módulo inteiro:

- `i18n/pt/.../trilha-ios/modulo-fundamentos/02-typescript-for-swift-devs.md` — corpo inteiro sem acentos
- `i18n/pt/.../trilha-ios/modulo-recursos-nativos/05-turbomodule-swift.md` — corpo inteiro sem acentos
- `i18n/pt/.../trilha-ios/modulo-recursos-nativos/03-storage-and-keychain.md` — sem acentos a partir da seção "Comparação de desempenho"
- `i18n/pt/.../trilha-android/modulo-fundamentos/03-rn-core-components.md` e `05-state-and-apis.md`
- `i18n/pt/.../trilha-android/modulo-new-architecture/04-fabric-component-compose.md` e `05-debugging-new-architecture.md` (degrada a partir de certo ponto do arquivo)
- `i18n/pt/.../trilha-android/modulo-recursos-nativos/03-storage.md` e `05-notifications.md` (só em alguns headings)
- `i18n/pt/.../trilha-android/modulo-performance/01-thread-model.md` e `04-memo-usememo-usecallback.md` (incluindo o `title` do frontmatter)

### 4.4. Diagramas ASCII quebrados

`i18n/pt/.../introducao/01-history-and-architecture.md` e `02-new-architecture.md` — os diagramas ASCII (caixas/setas da Bridge antiga vs. Nova Arquitetura) estão com caracteres de desenho de caixa desalinhados/corrompidos comparado à versão EN limpa.

### 4.5. Gaps de paridade EN/PT-BR (conteúdo faltando, não incorreto)

Contraria a regra do CLAUDE.md de que o PT-BR deve espelhar estrutura e exemplos (só o texto explicativo muda):

- **`docs/trilha-android/modulo-compose-para-rn/`** (todos os 5 arquivos): PT-BR é uma versão abreviada — faltam exemplos de código e seções inteiras presentes no EN (ex. FlexWrap, Intrinsic Sizing, notas de `MainActivity.kt`, deep linking `AndroidManifest.xml`, seção de theming combinado). Além disso, **todos os 10 arquivos (EN+PT)** têm uma seção "## Video Overview" duplicada — uma com o vídeo real embutido, seguida de outra idêntica com placeholder "coming soon" que não foi removido depois que o vídeo foi integrado.
- **`docs/trilha-android/modulo-cicd/`**: gaps menores em 3 arquivos (seção "Caching Strategy" e "Credentials Management" ausentes no PT-BR de `02-github-actions.md` e `03-eas-build.md`; uma sub-seção de debugging R8 incompleta em `04-code-signing-keystore.md`).
- **`docs/trilha-masterclass/modulo-00-overview/00-course-overview.mdx`** (PT-BR): ainda mostra placeholders "Em breve" para os módulos 1-5, enquanto o EN já os lista como completos.

### 4.6. Outros pequenos

- `docs/trilha-masterclass/modulo-03-turbomodules/05-get-vs-getenforcing.md` (PT-BR): typo de encoding — "graciosa" usa um "с" cirílico em vez do "c" latino.

## 5. Decisão pendente sua

1. `03_choose_track` (vídeo) fica na lista de "precisa vídeo novo" ou não?
2. Quer que eu corrija os bugs de conteúdo da seção 4 agora (são edições de texto, não mexem no tom/estrutura do curso), começando pelo item 4.1 (arquivo truncado, prioridade alta)?

## 5.1. Cobertura completa das legendas — atualização de 2026-09-28

Os 272 arquivos `.vtt` restantes (que na rodada anterior não tinham sido lidos individualmente) foram auditados integralmente, um por trilha, cada um por um agente dedicado que leu todos os arquivos do início ao fim (sem grep/amostra):

| Trilha | Arquivos lidos | Hostilidade confirmada | Limítrofe (uso técnico neutro, sem ação) |
|---|---|---|---|
| `trilha_android/` | 80 | 0 | 5 |
| `trilha_ios/` | 86 | 0 | 3 |
| `trilha_web/` | 34 | 0 | 0 |
| `trilha_masterclass/` | 72 | 0 | 12 |
| **Total nesta rodada** | **272** | **0** | **20** |

Somado à rodada anterior (`introducao/`, 8 arquivos: 2 confirmados hostis já corrigidos + 1 limítrofe pendente), a auditoria agora cobre **100% dos 280 arquivos `.vtt` do projeto**.

**Conclusão: fora dos 2 vídeos já corrigidos (`00_welcome`, `01_history_architecture`) e do limítrofe pendente (`03_choose_track`), nenhum outro vídeo do curso precisa ser regerado por motivo de tom.** Os 20 itens limítrofes desta rodada são todos intensificadores técnicos justificados por dado concreto no próprio vídeo (ex.: "gargalo severo de performance" citando 600ms medidos, "risco severo de perder a keystore" descrevendo consequência técnica irreversível, "restrições severas de bateria/memória" sobre limite real de hardware) — nunca dirigidos ao aluno, à stack dele, ou a custo de contratação. Em nenhum arquivo, de nenhuma trilha, apareceu o framing "dev nativo é caro".

Achado lateral (fora do escopo de tom, não é hostilidade — é bug de conteúdo já registrado em `VIDEOS_PARA_GERAR.md` seção 2): os arquivos `test_01` a `test_05` de `trilha_android/` narram da perspectiva de um dev iOS/Swift (XCTest, Xcode) em vez de Android/Kotlin, confirmando o mismatch pós-migração já conhecido.

## 5.2. Correção — `00_welcome` e `03_choose_track` continuam hostis (2026-09-28)

Uma sessão paralela de trabalho no mesmo repo relatou que `00_welcome.mp4` e `03_choose_track.mp4` ainda estavam hostis apesar deste relatório dizer o contrário, além de uma suspeita de troca de arquivos (mesmo MD5 entre um vídeo do Desktop e outro do release). Essa alegação foi verificada de forma independente nesta sessão, usando hash MD5 dos `.mp4` e transcrição real via `faster-whisper` (não a legenda `.vtt` que o próprio gerador entrega — não é uma fonte confiável de verificação, porque ela pode simplesmente descrever o mesmo áudio errado).

**Achados confirmados:**

- `00_welcome.mp4` no release `v0-videos` (MD5 `bc2c1826...`) é byte-idêntico a uma cópia gerada no Desktop com o mesmo MD5. A transcrição real mostra que o áudio narra "auditar sua stack para escolher a trilha" — **não é uma mensagem de boas-vindas**, é o roteiro errado. Contém frases hostis confirmadas: "you will hit a wall immediately", "a poor use of time", "actively detrimental if you lack that specific background", "Attempting this path without strong fundamentals is a mistake... critical gaps". **A afirmação anterior deste relatório de que `00_welcome` já estava "corrigido" estava errada** — o commit anterior só regenerou a legenda `.vtt` para descrever esse mesmo áudio já hostil, o áudio em si nunca foi trocado.
- `03_choose_track.mp4` no release (MD5 `132c15d3...`) e duas tentativas de regeneração feitas no Desktop nesta sessão (`03-choose.mp4`, MD5 `9f44d0bf...`, e `03-choose (1).mp4`) são **três roteiros diferentes entre si, todos hostis**. A alegação da sessão paralela de que dois desses arquivos eram MD5-idênticos estava incorreta — mas a preocupação de fundo (o vídeo está hostil) estava certa.
  - Release: "bored to tears", "completely lost", "wasting hours on a generic tutorial", "Senior engineers trade the safety of pure JavaScript for the high complexity...".
  - Desktop tentativa 1: "wasting incredibly valuable time", "this material will punish you", "wasting time stroking your own ego", "ruthlessly acknowledge what you do not know".
  - Desktop tentativa 2 (`(1).mp4`): "grinds to a halt, costing you dozens of hours of cognitive effort and lost productivity", "leaving dangerous gaps in your foundational knowledge", "weaponize the concepts you already understand", "False confidence is your biggest trap", **"Companies pay a premium for developers who can execute these high-stakes architectural upgrades"** — reintroduz exatamente o framing "dev nativo é caro" que a auditoria original não encontrou em nenhum `.md`.
- `01_history_architecture.mp4` foi reconfirmado limpo em ambas as cópias (release e Desktop) — nenhuma frase hostil na transcrição real.

**Causa raiz confirmada:** apontar o NotebookLM diretamente para o `.md` fonte (mesmo já estando limpo) pode fazer o gerador dramatizar/inventar tom hostil por conta própria — reproduzível, não é um evento isolado, mas também não é garantido a cada geração. A mitigação em uso: verificação obrigatória por transcrição real (`scripts/check-narration.py`, hostile-phrase scan) antes de qualquer upload, com releitura manual do transcript para garantir que o tópico está correto (o scan sozinho não distingue paráfrase aceitável de vídeo fora do tópico).

**Atualização final (2026-09-28):** uma nova geração a partir do `.md` fonte (terceira tentativa para `00_welcome`, terceira para `03_choose_track`) passou limpa no scan de frases hostis e na releitura manual do transcript — ambos os tópicos batem com o conteúdo esperado (boas-vindas / escolha de trilha). Vídeos publicados no release `v0-videos`, legendas `.vtt`/`_en.vtt` regeneradas a partir da transcrição real e traduzidas para PT-BR. `00_welcome`, `01_history_architecture` e `03_choose_track` estão todos corrigidos e publicados — nenhum vídeo de introdução pendente.

## 6. Resumo em uma linha

- **Arquivos `.md`/`.mdx` alterados:** 0 (nenhum precisava, tom já está correto em 100% do conteúdo).
- **Arquivos `.vtt` auditados:** 280/280 (100% de cobertura).
- **Vídeos regerados por tom:** `00_welcome` e `03_choose_track` — ambos corrigidos e publicados em 2026-09-28 (ver seção 5.2 para o histórico de tentativas reprovadas). `01_history_architecture` já estava corrigido. Nenhum outro vídeo do curso precisa de correção.
- **Bugs de conteúdo (não-tom) para corrigir:** 1 arquivo truncado (prioridade alta), 2 arquivos com texto de artefato antes do frontmatter, ~8 arquivos com acentuação quebrada, diagramas ASCII quebrados em 2 arquivos, gaps de paridade EN/PT-BR em ~6 arquivos, mismatch de conteúdo iOS↔Android nos 5 vídeos `test_*` de `trilha_android`.
