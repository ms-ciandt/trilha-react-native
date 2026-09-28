#!/usr/bin/env python3
"""
Verify a generated narration .mp4 against the intended script and against a
list of hostile/condescending phrases, using a REAL transcription of the
audio (faster-whisper) — never trust the .vtt the generator hands back.

Why this exists: NotebookLM has, more than once, generated narration whose
actual audio does not match the source .md/script it was given (wrong topic
entirely, or invented hostile framing like "swallow your pride" / "a poor use
of time" / "this material will punish you"). The only reliable check is to
transcribe the real audio and compare it.

Usage:
    python scripts/check-narration.py <video.mp4> [--script path/to/script.txt] [--language en] [--model small]

    # Compare against one of the sections in NARRATION_SCRIPTS.md directly:
    python scripts/check-narration.py /path/00-welcome.mp4 --script NARRATION_SCRIPTS.md --section "00_welcome"

Requirements:
    pip install faster-whisper

Exit codes:
    0 = clean (no hostile phrases found; similarity above threshold if --script given)
    1 = hostile phrase(s) found, or similarity below threshold, or topic looks off
"""

import argparse
import difflib
import re
import sys
from pathlib import Path

# Same trigger list used in the manual .vtt tone audits (TONE_AUDIT_REPORT.md),
# plus the specific phrases confirmed hostile in this project's videos so far.
HOSTILE_PHRASES = [
    "waste of your time", "a poor use of time",
    "waste your time",
    "wasting hours on a generic tutorial", "wasting incredibly valuable time",
    "wasting time stroking your own ego",
    "swallow your pride", "swallow their pride",
    "humility to be an absolute beginner", "absolute beginner again",
    "severe trade-off", "severe compromise",
    "grind to a halt", "grinds to a halt",
    "actively detrimental", "you will hit a wall", "hitting a wall",
    "this material will punish you", "will punish you",
    "stroking your own ego", "ruthlessly acknowledge",
    "bored to tears", "completely lost",
    "a mistake", "critical gaps", "dangerous gaps",
    "existential threat", "zero-sum game",
    "submit to strict", "submit to",
    "harsh", "cautionary",
    "weaponize", "false confidence is your biggest trap", "false confidence",
    "pay a premium for developers", "companies pay a premium",
    "high-stakes", "unfair advantage",
    "cognitive effort and lost productivity",
    # PT-BR equivalents
    "perda de tempo", "perda de seu tempo",
    "engolir o orgulho", "engolir seu orgulho", "engolir sua",
    "humildade de ser um iniciante", "humildade de ser iniciante",
    "compensação severa", "troca severa",
    "severamente prejudicial", "prejudicial se você não",
    "vai te punir", "punir você",
    "acariciar seu ego", "alimentando seu ego",
    "entediado", "completamente perdido",
    "um erro", "lacunas críticas",
    "ameaça existencial", "jogo de soma zero",
    "se submeter a", "se submeter",
]


def load_script_text(script_path: str, section: str | None) -> str:
    text = Path(script_path).read_text(encoding="utf-8")
    if section:
        # Look for a markdown heading ("## ...", "### ...") that CONTAINS the
        # given text, not just any occurrence of the string anywhere in the
        # file (a bare substring search would also match the string showing
        # up in a title, changelog note, etc. earlier in the file).
        # Only match "##"-level (or deeper) headings, never the document's H1
        # title — a top-level title like "# ... 00_welcome ..." would
        # otherwise match before the real "## 1. `00_welcome`" section.
        heading_pattern = re.compile(
            r"^(#{2,6})[^\n]*" + re.escape(section) + r"[^\n]*$", re.MULTILINE
        )
        m = heading_pattern.search(text)
        if not m:
            print(f"WARNING: no heading matching '{section}' found in {script_path}; using whole file", file=sys.stderr)
            return text
        level = len(m.group(1))
        rest = text[m.end():]
        # The section ends at the next heading of the SAME OR SHALLOWER level
        # (e.g. matched "## 1. 00_welcome" ends at the next "##", not at the
        # "### EN"/"### PT-BR" subheadings nested inside it).
        next_heading = re.search(r"\n#{1," + str(level) + r"}\s", rest)
        return rest[: next_heading.start()] if next_heading else rest
    return text


def normalize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-zà-ÿ0-9\s]", " ", text)
    return text.split()


def transcribe(video_path: str, language: str, model_size: str) -> str:
    from faster_whisper import WhisperModel

    print(f"Loading Whisper model '{model_size}'...", file=sys.stderr)
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    print(f"Transcribing {video_path} ...", file=sys.stderr)
    segments, info = model.transcribe(str(video_path), language=language, beam_size=5)
    print(f"Detected language: {info.language} (prob {info.language_probability:.2f})", file=sys.stderr)

    full_text = " ".join(seg.text.strip() for seg in segments)
    return full_text


def scan_hostile(transcript: str) -> list[str]:
    lower = transcript.lower()
    found = []
    for phrase in HOSTILE_PHRASES:
        if phrase.lower() in lower:
            found.append(phrase)
    return found


def similarity(expected: str, actual: str) -> float:
    a = normalize(expected)
    b = normalize(actual)
    return difflib.SequenceMatcher(None, a, b).ratio()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("video", help="Path to the generated .mp4/.wav/.m4a to check")
    parser.add_argument("--script", help="Path to a .txt/.md file with the intended narration script")
    parser.add_argument("--section", help="If --script is a multi-section file (like NARRATION_SCRIPTS.md), the heading text to extract from")
    parser.add_argument("--language", default="en", help="Audio language code (default: en)")
    parser.add_argument("--model", default="small", help="Whisper model: tiny/base/small/medium/large-v3 (default: small)")
    parser.add_argument("--threshold", type=float, default=0.55, help="Minimum word-overlap similarity ratio to pass (default: 0.55)")
    parser.add_argument("--save-transcript", help="Optional path to save the raw transcript text")
    args = parser.parse_args()

    transcript = transcribe(args.video, args.language, args.model)

    if args.save_transcript:
        Path(args.save_transcript).write_text(transcript, encoding="utf-8")
        print(f"Transcript saved to {args.save_transcript}", file=sys.stderr)

    print("\n=== REAL TRANSCRIPT (what the audio actually says) ===")
    print(transcript)

    ok = True

    print("\n=== HOSTILE PHRASE SCAN ===")
    hits = scan_hostile(transcript)
    if hits:
        ok = False
        print(f"FOUND {len(hits)} hostile/condescending phrase(s):")
        for h in hits:
            print(f"  - \"{h}\"")
    else:
        print("Clean — no phrases from the hostile-phrase list were found.")

    if args.script:
        print("\n=== SCRIPT SIMILARITY CHECK (informational only — does not affect PASS/FAIL) ===")
        expected = load_script_text(args.script, args.section)
        ratio = similarity(expected, transcript)
        print(f"Word-overlap similarity to expected script: {ratio:.0%} (reference threshold: {args.threshold:.0%})")
        if ratio < args.threshold:
            print("LOW SIMILARITY — wording differs a lot from the reference script.")
            print("This is expected and OK if you fed NotebookLM the source .md directly")
            print("(it paraphrases in its own words instead of reading the fixed script verbatim).")
            print("Read the REAL TRANSCRIPT above yourself to confirm the topic/content is still correct —")
            print("this check alone cannot tell a paraphrase apart from a wrong-topic video.")
        else:
            print("Similarity OK — audio closely matches the reference script's wording.")

    print("\n=== VERDICT ===")
    print("PASS — safe to publish" if ok else "FAIL — do not publish, review the issues above")
    if ok:
        print("(PASS is based only on the hostile-phrase scan. If --script was given and similarity")
        print(" was low, still read the transcript above to confirm it's on-topic before publishing.)")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
