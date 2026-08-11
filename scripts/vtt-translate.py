#!/usr/bin/env python3
"""
Translate a WebVTT file from English to Brazilian Portuguese using the Claude API.
Timestamps and WebVTT structure are preserved exactly; only the text cue lines are translated.

Usage:
    python scripts/vtt-translate.py input.vtt output.vtt

Requirements:
    pip install anthropic

The ANTHROPIC_API_KEY environment variable must be set.
"""

import sys
import re
import os
import time
import anthropic

BATCH_SIZE = 5   # cue lines per API call
MAX_RETRIES = 6
RETRY_DELAY = 10  # seconds between retries


def parse_vtt(content: str) -> list[dict]:
    """
    Parse a .vtt file into a list of blocks.
    Each block is one of:
      {"type": "header",    "raw": str}
      {"type": "cue_id",   "raw": str}          # optional numeric/text cue id
      {"type": "timestamp", "raw": str}          # e.g. "00:00:01.000 --> 00:00:03.500"
      {"type": "text",      "raw": str, "idx": int}  # actual caption text (translatable)
      {"type": "blank",     "raw": str}
    """
    lines = content.splitlines(keepends=True)
    blocks = []
    text_idx = 0

    i = 0
    # First line is always the WEBVTT header
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
            # Numeric cue ID immediately before a timestamp line
            blocks.append({"type": "cue_id", "raw": line})
            i += 1
        else:
            blocks.append({"type": "text", "raw": line, "idx": text_idx})
            text_idx += 1
            i += 1

    return blocks


def translate_texts(texts: list[str], client: anthropic.Anthropic) -> list[str]:
    """Send a batch of text cues to Claude and return translated PT-BR lines."""
    numbered = "\n".join(f"{i + 1}. {t.strip()}" for i, t in enumerate(texts))

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            message = client.messages.create(
                model="anthropic.claude-4-6-sonnet",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            "You are translating closed-caption text from a React Native technical "
                            "course video. Translate each numbered line from English to Brazilian "
                            "Portuguese (PT-BR). Keep technical terms (TurboModules, Fabric, JSI, "
                            "Hermes, React Native, Expo, Kotlin, Swift, etc.) in English. "
                            "Return ONLY the translated lines, one per line, with the same numbering. "
                            "Do not add explanations.\n\n"
                            f"{numbered}"
                        ),
                    }
                ],
            )
            break
        except (anthropic.InternalServerError, anthropic.APIStatusError) as e:
            if attempt == MAX_RETRIES:
                raise
            print(f"  API error (attempt {attempt}/{MAX_RETRIES}): {e}. Retrying in {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)

    raw_lines = message.content[0].text.strip().splitlines()
    translated = []
    for line in raw_lines:
        # Strip leading "N. " numbering the model echoes back
        cleaned = re.sub(r"^\d+\.\s*", "", line).strip()
        translated.append(cleaned)

    if len(translated) != len(texts):
        raise ValueError(
            f"Translation count mismatch: sent {len(texts)}, got {len(translated)}"
        )
    return translated


def translate_vtt(input_path: str, output_path: str) -> None:
    with open(input_path, "r", encoding="utf-8") as f:
        content = f.read()

    blocks = parse_vtt(content)

    # Collect all text blocks in order
    text_blocks = [b for b in blocks if b["type"] == "text"]
    all_texts = [b["raw"] for b in text_blocks]

    if not all_texts:
        print("No text cues found — copying file unchanged.")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        return

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Translate in batches
    translated_texts: list[str] = []
    for start in range(0, len(all_texts), BATCH_SIZE):
        batch = all_texts[start : start + BATCH_SIZE]
        print(f"  Translating cues {start + 1}–{start + len(batch)} of {len(all_texts)}...")
        translated_texts.extend(translate_texts(batch, client))

    # Write output, substituting translated text back
    translated_map = {b["idx"]: translated_texts[b["idx"]] for b in text_blocks}

    with open(output_path, "w", encoding="utf-8") as f:
        for block in blocks:
            if block["type"] == "text":
                f.write(translated_map[block["idx"]] + "\n")
            else:
                f.write(block["raw"])

    print(f"  Done → {output_path}")


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python scripts/vtt-translate.py <input.vtt> <output.vtt>")
        sys.exit(1)

    input_path, output_path = sys.argv[1], sys.argv[2]

    if not os.path.isfile(input_path):
        print(f"Error: file not found: {input_path}")
        sys.exit(1)

    if "ANTHROPIC_API_KEY" not in os.environ:
        print("Error: ANTHROPIC_API_KEY environment variable not set.")
        sys.exit(1)

    print(f"Translating {input_path} → {output_path}")
    translate_vtt(input_path, output_path)


if __name__ == "__main__":
    main()
