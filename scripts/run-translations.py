#!/usr/bin/env python3
"""
Translate all *_en.vtt files to PT-BR for trilha_android, trilha_web, trilha_masterclass.
Runs entirely in-process — no subprocess spawning. Skips files already translated.

Usage:
    python3 scripts/run-translations.py
"""

import re
import os
import sys
import time
from pathlib import Path

BATCH_SIZE = 5
MAX_RETRIES = 6
RETRY_DELAY = 10

TRILHAS = ["trilha_android", "trilha_web", "trilha_masterclass"]

ROOT = Path(__file__).parent.parent
CAPTIONS_DIR = ROOT / "static" / "assets" / "captions"


def parse_vtt(content: str) -> list[dict]:
    lines = content.splitlines(keepends=True)
    blocks = []
    text_idx = 0
    i = 0
    if lines and lines[0].strip().startswith("WEBVTT"):
        blocks.append({"type": "header", "raw": lines[0]})
        i = 1
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped == "":
            blocks.append({"type": "blank", "raw": line})
            i += 1
        elif re.match(r"^\d{2}:\d{2}[\d:.]+\s+-->\s+", stripped):
            blocks.append({"type": "timestamp", "raw": line})
            i += 1
        elif re.match(r"^\d+$", stripped) and i + 1 < len(lines) and re.match(
            r"^\d{2}:\d{2}[\d:.]+\s+-->\s+", lines[i + 1].strip()
        ):
            blocks.append({"type": "cue_id", "raw": line})
            i += 1
        else:
            blocks.append({"type": "text", "raw": line, "idx": text_idx})
            text_idx += 1
            i += 1
    return blocks


def translate_batch(texts: list[str], client) -> list[str]:
    numbered = "\n".join(f"{i + 1}. {t.strip()}" for i, t in enumerate(texts))
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            message = client.messages.create(
                model="anthropic.claude-4-6-sonnet",
                max_tokens=512,
                messages=[{
                    "role": "user",
                    "content": (
                        "You are translating closed-caption text from a React Native technical "
                        "course video. Translate each numbered line from English to Brazilian "
                        "Portuguese (PT-BR). Keep technical terms (TurboModules, Fabric, JSI, "
                        "Hermes, React Native, Expo, Kotlin, Swift, etc.) in English. "
                        "Return ONLY the translated lines, one per line, with the same numbering. "
                        "Do not add explanations.\n\n" + numbered
                    ),
                }],
            )
            break
        except Exception as e:
            if attempt == MAX_RETRIES:
                raise
            print(f"    attempt {attempt}/{MAX_RETRIES} failed: {str(e)[:80]}. Retrying in {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)

    raw_lines = message.content[0].text.strip().splitlines()
    translated = [re.sub(r"^\d+\.\s*", "", line).strip() for line in raw_lines]
    if len(translated) != len(texts):
        raise ValueError(f"Count mismatch: sent {len(texts)}, got {len(translated)}")
    return translated


def translate_file(en_path: Path, pt_path: Path, client) -> bool:
    content = en_path.read_text(encoding="utf-8")
    blocks = parse_vtt(content)
    text_blocks = [b for b in blocks if b["type"] == "text"]
    all_texts = [b["raw"] for b in text_blocks]

    if not all_texts:
        pt_path.write_text(content, encoding="utf-8")
        return True

    translated_texts: list[str] = []
    total = len(all_texts)
    for start in range(0, total, BATCH_SIZE):
        batch = all_texts[start: start + BATCH_SIZE]
        print(f"    cues {start + 1}–{start + len(batch)} of {total}...")
        translated_texts.extend(translate_batch(batch, client))

    translated_map = {b["idx"]: translated_texts[b["idx"]] for b in text_blocks}
    out_lines = []
    for block in blocks:
        if block["type"] == "text":
            out_lines.append(translated_map[block["idx"]] + "\n")
        else:
            out_lines.append(block["raw"])

    pt_path.write_text("".join(out_lines), encoding="utf-8")
    return True


def main():
    import anthropic
    # SDK auto-reads ANTHROPIC_AUTH_TOKEN (or ANTHROPIC_API_KEY) from environment
    client = anthropic.Anthropic()

    failed = []
    total_done = 0
    total_skipped = 0

    for trilha in TRILHAS:
        caption_dir = CAPTIONS_DIR / trilha
        if not caption_dir.exists():
            print(f"[skip] {caption_dir} not found")
            continue

        en_files = sorted(caption_dir.glob("*_en.vtt"))
        print(f"\n{'='*50}")
        print(f"{trilha} — {len(en_files)} files to translate")
        print(f"{'='*50}")

        for en_path in en_files:
            stem = en_path.stem[:-3]  # strip _en
            pt_path = caption_dir / f"{stem}.vtt"

            if pt_path.exists():
                print(f"  [skip] {stem}.vtt")
                total_skipped += 1
                continue

            print(f"  Translating {stem}...")
            try:
                translate_file(en_path, pt_path, client)
                print(f"  OK → {stem}.vtt")
                total_done += 1
            except Exception as e:
                print(f"  ERROR: {e}")
                pt_path.unlink(missing_ok=True)
                failed.append(f"{trilha}/{stem}")

    print(f"\n{'='*50}")
    print(f"Done. Translated: {total_done}, Skipped: {total_skipped}, Failed: {len(failed)}")
    if failed:
        print("Failed files:")
        for f in failed:
            print(f"  - {f}")
        sys.exit(1)


if __name__ == "__main__":
    main()
