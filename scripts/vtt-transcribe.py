#!/usr/bin/env python3
"""
Transcribe .mp4 videos to WebVTT files using faster-whisper (local, free).
Outputs one .vtt file per .mp4 into the specified output directory.

Usage:
    python scripts/vtt-transcribe.py <video_dir> <output_dir> [--language en]

Requirements:
    pip install faster-whisper

On first run, downloads the Whisper model (~150 MB for 'base', ~600 MB for 'medium').
Use 'base' for a quick draft or 'medium'/'large-v3' for better accuracy.
"""

import sys
import os
import argparse
from pathlib import Path


def transcribe_dir(video_dir: str, output_dir: str, language: str, model_size: str) -> None:
    from faster_whisper import WhisperModel

    video_path = Path(video_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    mp4_files = sorted(video_path.glob("*.mp4"))
    if not mp4_files:
        print(f"No .mp4 files found in {video_dir}")
        return

    print(f"Loading Whisper model '{model_size}'...")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    for mp4 in mp4_files:
        out_file = out_path / (mp4.stem + ".vtt")
        print(f"\nTranscribing {mp4.name} → {out_file.name}")

        segments, info = model.transcribe(
            str(mp4),
            language=language,
            beam_size=5,
        )

        print(f"  Detected language: {info.language} (prob {info.language_probability:.2f})")

        with open(out_file, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for i, seg in enumerate(segments, start=1):
                start = _fmt(seg.start)
                end = _fmt(seg.end)
                text = seg.text.strip()
                f.write(f"{i}\n{start} --> {end}\n{text}\n\n")

        print(f"  Done → {out_file}")


def _fmt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Transcribe .mp4 files to .vtt via faster-whisper")
    parser.add_argument("video_dir", help="Directory containing .mp4 files")
    parser.add_argument("output_dir", help="Directory to write .vtt files")
    parser.add_argument("--language", default="en", help="Audio language code (default: en)")
    parser.add_argument("--model", default="base", help="Whisper model size: tiny/base/small/medium/large-v3 (default: base)")
    args = parser.parse_args()

    transcribe_dir(args.video_dir, args.output_dir, args.language, args.model)


if __name__ == "__main__":
    main()
