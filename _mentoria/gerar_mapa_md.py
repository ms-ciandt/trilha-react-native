# -*- coding: utf-8 -*-
"""Gera mapa-conhecimento.md a partir de dados_topicos.py.

Uso:
    python3 _mentoria/gerar_mapa_md.py
"""
import os

from dados_topicos import TOPICOS

ESCALA = [
    (1, "Nunca ouvi falar", "Não conhece o termo/conceito"),
    (2, "Já ouvi falar", "Sabe que existe, nunca leu ou viu exemplo"),
    (3, "Entendo o conceito / uso com apoio", "Explica em teoria e/ou já implementou copiando/adaptando exemplo, com suporte"),
    (4, "Aplico sozinho", "Usa no dia a dia sem ajuda, resolve casos comuns sem suporte"),
    (5, "Domino a fundo / referência", "Resolve edge cases, ensina outros, é referência no time para o tópico"),
]

OUT_PATH = os.path.join(os.path.dirname(__file__), "mapa-conhecimento.md")


def build_markdown():
    lines = []
    lines.append("# Mapa de Conhecimento — Mentoria React Native")
    lines.append("")
    lines.append(
        "Lista enxuta de tópicos transversais usada na autoavaliação de conhecimento "
        "dos mentorados. Cada tópico consolida numa descrição curta os subtópicos "
        "reais cobertos pelas trilhas do curso (Web, Android, iOS, Masterclass) — o "
        "curso aprofunda cada um bem além do resumo aqui, isso é intencional: a "
        "planilha existe para ser rápida de preencher, não para substituir o conteúdo."
    )
    lines.append("")
    lines.append(
        "**Gerado automaticamente a partir de `dados_topicos.py` — não edite este "
        "arquivo diretamente.** Para atualizar, edite `dados_topicos.py` e rode "
        "`python3 _mentoria/gerar_mapa_md.py` novamente."
    )
    lines.append("")

    lines.append("## Escala de autoavaliação (1–5)")
    lines.append("")
    lines.append("| Nível | Rótulo | Descrição |")
    lines.append("|---|---|---|")
    for nivel, rotulo, desc in ESCALA:
        lines.append(f"| {nivel} | {rotulo} | {desc} |")
    lines.append("")

    lines.append("## Fluxo de uso")
    lines.append("")
    lines.append(
        "1. Cada mentorado usa sua própria coluna em "
        "`mapa-conhecimento-mentoria.xlsx` (Nome, Time) e preenche uma nota "
        "de 1 a 5 por tópico — sem disputar célula com ninguém.\n"
        "2. A planilha calcula automaticamente, por tópico, a média do grupo, o % "
        "de domínio e sinaliza gaps críticos (média abaixo de 3).\n"
        "3. Os resultados agregados orientam decisões de conteúdo: reforçar "
        "material já existente (gap alto) ou criar tópicos novos (lacunas "
        "identificadas fora deste mapa)."
    )
    lines.append("")

    lines.append("## Tópicos")
    lines.append("")
    lines.append("| Tópico | Descrição | Trilhas onde é abordado |")
    lines.append("|---|---|---|")
    for t in TOPICOS:
        lines.append(f"| **{t['topico']}** | {t['descricao']} | {t['trilhas']} |")
    lines.append("")

    lines.append(f"---\n\nTotal de tópicos mapeados: **{len(TOPICOS)}**")
    lines.append("")

    return "\n".join(lines)


def main():
    content = build_markdown()
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Escrito: {OUT_PATH} ({len(TOPICOS)} tópicos)")


if __name__ == "__main__":
    main()
