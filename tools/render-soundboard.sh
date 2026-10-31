#!/usr/bin/env bash
# Render every spoken clip of the app in one voice: the sa hình station names
# (content/stations.json) and every spoken key of the Đường trường board, the sa hình error keys
# and the sa hình announcements (soundboard.json, sa-hinh-loi.json, sa-hinh-thong-bao.json).
#
# Voice (2026-11-01, owner's choice after hearing eight presets): VieNeu-TTS v3 Turbo, preset
# "Mai Anh", Apache-2.0. The model and its venv live in ~/Projects/airi-voice (override with
# VIENEU_PY); tools/render-voice.py does the speaking and the ffmpeg trim/loudnorm to ~-19 LUFS.
# Before this, stations were an unrecorded 48 kHz AI voice and the keys were piper
# vi_VN-vais1000; one voice for the whole app replaces both.
#
# Not touched: ting-tong.mp3, tut.mp3 and khan-cap.mp3 -- sounds the test machine makes, not
# words. Only keys whose audio is under soundboard/ are spoken; stations are all spoken.
#
# Text spoken: a key's `say`, else its `label`; a station's `name` without the bracketed note
# ("Ghép xe ngang (đỗ song song)" says "Ghép xe ngang"). A file used twice is rendered once.
#
# Usage: tools/render-soundboard.sh [--force]
#        Without --force, existing files are left alone, so adding one key re-renders one file.
set -euo pipefail

cd "$(dirname "$0")/.."
force=${1:-}
py=${VIENEU_PY:-$HOME/Projects/airi-voice/.venv/bin/python}
[ -x "$py" ] || { echo "No VieNeu venv at $py (set VIENEU_PY)." >&2; exit 1; }

mkdir -p content/audio/soundboard

node -e '
const out = [];
for (const s of require("./content/stations.json"))
  out.push([s.audio, s.name.replace(/\s*\(.*\)/, "")]);
for (const k of [
  ...require("./content/soundboard.json"),
  ...require("./content/sa-hinh-loi.json"),
  ...require("./content/sa-hinh-thong-bao.json"),
]) if (k.audio.startsWith("soundboard/")) out.push([k.audio, k.say || k.label]);
const seen = new Set();
for (const [rel, text] of out) {
  if (seen.has(rel)) continue;
  seen.add(rel);
  process.stdout.write("content/audio/" + rel + "\t" + text + "\n");
}
' | while IFS=$'\t' read -r path text; do
  if [ -f "$path" ] && [ "$force" != "--force" ]; then
    printf 'skip   %s\n' "$path" >&2
  else
    printf '%s\t%s\n' "$path" "$text"
  fi
done | "$py" -I tools/render-voice.py

echo
echo "Now bump CACHE_NAME in service-worker.js, or installed clients keep the old audio."
