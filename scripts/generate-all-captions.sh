#!/usr/bin/env bash
# Transcribe all trilha-android, trilha-web, trilha-masterclass videos to EN VTT,
# then translate each to PT-BR VTT.
#
# Usage:
#   ANTHROPIC_API_KEY=sk-... bash scripts/generate-all-captions.sh [--model base]
#
# Optional: --model tiny|base|small|medium|large-v3  (default: base)
# Idempotent: skips files that already exist.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
VIDEOS_DIR="$ROOT/static/assets/videos"
CAPTIONS_DIR="$ROOT/static/assets/captions"
MODEL="${WHISPER_MODEL:-base}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) MODEL="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "${ANTHROPIC_API_KEY:-}" && -z "${ANTHROPIC_AUTH_TOKEN:-}" ]]; then
  echo "ERROR: neither ANTHROPIC_API_KEY nor ANTHROPIC_AUTH_TOKEN is set." >&2
  exit 1
fi

TRILHAS=(trilha_android trilha_web trilha_masterclass trilha_ios)
FAILED_TRANSLATIONS=()

transcribe_one() {
  local mp4="$1" caption_dir="$2" model="$3"
  local stem; stem="$(basename "$mp4" .mp4)"
  local en_vtt="$caption_dir/${stem}_en.vtt"

  if [[ -f "$en_vtt" ]]; then
    echo "  [skip transcribe] ${stem}_en.vtt"
    return 0
  fi

  echo "  Transcribing $stem..."
  python3 - "$mp4" "$caption_dir" "$model" <<'PYEOF'
import sys
from pathlib import Path
from faster_whisper import WhisperModel

mp4, out_dir_str, model_size = sys.argv[1], sys.argv[2], sys.argv[3]
out_path = Path(out_dir_str)
out_path.mkdir(parents=True, exist_ok=True)
stem = Path(mp4).stem
out_file = out_path / f"{stem}_en.vtt"

print(f"    Loading model '{model_size}'...")
model = WhisperModel(model_size, device="cpu", compute_type="int8")
segments, info = model.transcribe(mp4, language="en", beam_size=5)
print(f"    Language: {info.language} ({info.language_probability:.2f})")

def fmt(s):
    h = int(s // 3600); m = int((s % 3600) // 60); sec = s % 60
    return f"{h:02d}:{m:02d}:{sec:06.3f}"

with open(out_file, "w", encoding="utf-8") as f:
    f.write("WEBVTT\n\n")
    for i, seg in enumerate(segments, 1):
        f.write(f"{i}\n{fmt(seg.start)} --> {fmt(seg.end)}\n{seg.text.strip()}\n\n")

print(f"    Done → {out_file}")
PYEOF
}

for trilha in "${TRILHAS[@]}"; do
  video_dir="$VIDEOS_DIR/$trilha"
  caption_dir="$CAPTIONS_DIR/$trilha"

  if [[ ! -d "$video_dir" ]]; then
    echo "[skip] $video_dir not found"
    continue
  fi

  mkdir -p "$caption_dir"

  echo ""
  echo "=========================================="
  echo "$trilha — transcription"
  echo "=========================================="

  for mp4 in "$video_dir"/*.mp4; do
    [[ -f "$mp4" ]] || continue
    transcribe_one "$mp4" "$caption_dir" "$MODEL"
  done

  echo ""
  echo "$trilha — translation (PT-BR)"

  for en_vtt in "$caption_dir"/*_en.vtt; do
    [[ -f "$en_vtt" ]] || continue
    stem="$(basename "$en_vtt" _en.vtt)"
    pt_vtt="$caption_dir/${stem}.vtt"

    if [[ -f "$pt_vtt" ]]; then
      echo "  [skip translate] ${stem}.vtt"
      continue
    fi

    echo "  Translating $stem..."
    if python3 "$SCRIPT_DIR/vtt-translate.py" "$en_vtt" "$pt_vtt"; then
      echo "  OK → ${stem}.vtt"
    else
      echo "  ERROR translating $stem — will retry on next run"
      FAILED_TRANSLATIONS+=("$trilha/$stem")
      rm -f "$pt_vtt"
    fi
  done
done

echo ""
if [[ ${#FAILED_TRANSLATIONS[@]} -gt 0 ]]; then
  echo "Completed with ${#FAILED_TRANSLATIONS[@]} translation failure(s):"
  for f in "${FAILED_TRANSLATIONS[@]}"; do echo "  - $f"; done
  echo "Re-run to retry."
  exit 1
else
  echo "All captions generated successfully."
fi
