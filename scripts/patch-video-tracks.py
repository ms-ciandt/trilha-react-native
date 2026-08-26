#!/usr/bin/env python3
"""
Insert <track> elements into markdown/mdx files that have <video> tags but no captions.

For EN docs (docs/):   inserts srclang="en" pointing to {stem}_en.vtt
For PT docs (i18n/pt/): inserts srclang="pt" pointing to {stem}.vtt

Only inserts a <track> when the corresponding .vtt file already exists under
static/assets/captions/<trilha_dir>/ — videos without generated captions yet
are left untouched.

Usage:
    python scripts/patch-video-tracks.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
CAPTIONS_ROOT = ROOT / "static" / "assets" / "captions"

EN_DOCS_ROOTS = [
    ROOT / "docs" / "trilha-android",
    ROOT / "docs" / "trilha-web",
    ROOT / "docs" / "trilha-masterclass",
    ROOT / "docs" / "trilha-ios",
]

PT_DOCS_ROOTS = [
    ROOT / "i18n" / "pt" / "docusaurus-plugin-content-docs" / "current" / "trilha-android",
    ROOT / "i18n" / "pt" / "docusaurus-plugin-content-docs" / "current" / "trilha-web",
    ROOT / "i18n" / "pt" / "docusaurus-plugin-content-docs" / "current" / "trilha-masterclass",
    ROOT / "i18n" / "pt" / "docusaurus-plugin-content-docs" / "current" / "trilha-ios",
]

SOURCE_RE = re.compile(
    r'(<source src="https://github\.com/ms-ciandt/trilha-react-native/releases/download/[^/]+/([^"]+)\.mp4" type="video/mp4">)'
)
TRACK_RE = re.compile(r'<track\s')


def patch_file(path: Path, lang: str, trilha_dir: str) -> bool:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)
    changed = False
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m = SOURCE_RE.search(line)
        if m:
            # Check if next non-empty line is already a <track>
            next_i = i + 1
            while next_i < len(lines) and lines[next_i].strip() == "":
                next_i += 1
            already_has_track = next_i < len(lines) and TRACK_RE.search(lines[next_i])

            if not already_has_track:
                stem = m.group(2)          # e.g. fund_01_javascript

                if lang == "en":
                    vtt_name = f"{stem}_en.vtt"
                    vtt_path = f"/trilha-react-native/assets/captions/{trilha_dir}/{vtt_name}"
                    track_line = f'  <track kind="captions" src="{vtt_path}" srclang="en" label="English" default>\n'
                else:
                    vtt_name = f"{stem}.vtt"
                    vtt_path = f"/trilha-react-native/assets/captions/{trilha_dir}/{vtt_name}"
                    track_line = f'  <track kind="captions" src="{vtt_path}" srclang="pt" label="Português" default>\n'

                vtt_on_disk = CAPTIONS_ROOT / trilha_dir / vtt_name
                if vtt_on_disk.exists():
                    out.append(line)
                    out.append(track_line)
                    changed = True
                    i += 1
                    continue

        out.append(line)
        i += 1

    if changed:
        path.write_text("".join(out), encoding="utf-8")
        print(f"  patched: {path.relative_to(ROOT)}")
    return changed


def patch_roots(roots, lang):
    total = 0
    for root in roots:
        if not root.exists():
            print(f"  [skip] {root} — not found")
            continue
        trilha_dir = root.name.replace("-", "_")   # e.g. trilha-ios -> trilha_ios
        for f in sorted(root.rglob("*.md")) + sorted(root.rglob("*.mdx")):
            if patch_file(f, lang, trilha_dir):
                total += 1
    return total


def main():
    print("Patching EN docs...")
    n_en = patch_roots(EN_DOCS_ROOTS, "en")

    print("\nPatching PT-BR docs...")
    n_pt = patch_roots(PT_DOCS_ROOTS, "pt")

    print(f"\nDone. EN files patched: {n_en}, PT files patched: {n_pt}")


if __name__ == "__main__":
    main()
