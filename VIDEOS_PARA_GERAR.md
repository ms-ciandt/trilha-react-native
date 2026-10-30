# Vídeos para gerar/regenerar após a auditoria de tom

Arquivo de controle, não é conteúdo do curso — pode apagar depois de usar.

## 1. Trilha introdução (3 vídeos — roteiros já entregues na conversa)

- [ ] `00_welcome.mp4` — hostil confirmado (frases "complete waste of your time", "swallow your pride", "humility to be an absolute beginner again" ainda presentes no `.vtt` atual). Roteiro EN+PT-BR já entregue.
- [ ] `01_history_architecture.mp4` — cortar trecho "gastar tempo e dinheiro em nativo para desempenho fluido" + "zero-sum game / existential threat", pular direto pro hackathon de 2013. Roteiro EN+PT-BR entregue nesta sessão.
- [ ] `03_choose_track.mp4` — cortar trecho ~2:50 ("inevitable friction of diagnosing mobile-specific performance bottlenecks...") e trecho ~3:42 ("Senior engineers trade the safety of pure JavaScript for the high complexity of native integration layers..."). Roteiro EN+PT-BR entregue nesta sessão.

**Sem ação:** `02_new_architecture.mp4` — feedback positivo ("muito bem explicado e direto ao ponto"), nenhuma mudança pedida.

## 2. Trilha Android — módulo Testes (5 vídeos, roteiros já entregues em sessão anterior)

- [ ] `test_01_jest-unit-tests.mp4`
- [ ] `test_02_react-native-testing-library.mp4`
- [ ] `test_03_mocking-native-modules.mp4`
- [ ] `test_04_integration-tests.mp4`
- [ ] `test_05_detox-e2e.mp4`

Motivo: conteúdo de áudio/vídeo estava trocado com o de iOS (migração do GitHub Release de Ago/2026 sobrescreveu os arquivos originais).

## 3. Trilha Android — módulo Arquitetura (3 vídeos, roteiros já entregues em sessão anterior)

- [ ] `arq_01_architecture-patterns.mp4`
- [ ] `arq_04_error-handling-monitoring.mp4`
- [ ] `arq_05_accessibility.mp4`

Mesmo motivo do item 2 (mismatch Android/iOS pós-migração).

---

## Fluxo para cada vídeo

1. Copiar o roteiro (EN ou PT-BR, conforme o NotebookLM) do histórico da conversa.
2. Gerar áudio/vídeo no NotebookLM.
3. Rodar `/integrar-videos` para subir via `gh release upload` (mesmo nome de arquivo sobrescreve o atual no release `v0-videos`) e atualizar os `.vtt`.
4. Marcar o item como concluído nesta lista.

Total: **11 vídeos** a regenerar.
