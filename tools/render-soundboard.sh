#!/usr/bin/env bash
# Render every spoken Đường trường key from content/soundboard.json into one consistent voice.
#
# Why this exists: content/audio/ grew two different voice families and the repo recorded
# neither. The 11 station files are 48 kHz (README calls them "giọng AI, thay xong
# 2026-09-11"); the soundboard files were 44.1 kHz from a later, undocumented pass. A board
# where adjacent keys are different voices is the bug; this script is the fix, and it is in
# the repo so the next person does not have to guess again.
#
# Voice: vi_VN-vais1000-medium through `vi-tts`, which is declared in the owner's
# nixos-config (pkgs/piper-voice-vi.nix, pkgs/vi-tts.nix). The corpus is CC-BY-4.0, so the
# README records the attribution. vi-tts already outputs mono 44.1 kHz normalised to about
# -19 LUFS, which is the level the rest of content/audio/ sits at.
#
# What it does NOT touch:
#   - ting-tong.mp3 and tut.mp3 — these are sounds the test machine makes, not words a
#     person says. Speaking them in a TTS voice would be wrong whatever the files contain.
#   - anything outside content/audio/soundboard/ — in particular content/audio/xuat-phat.mp3,
#     which the sa hình stations also use. The soundboard gets its own copy under
#     soundboard/ precisely so the two consumers stop sharing a file; re-rendering the
#     shared one would have changed the station voice to fix the soundboard.
#
# The text spoken is the key's own `label`, so content/soundboard.json stays the single
# source of truth: change a label, rerun this, bump CACHE_NAME.
#
# Tốc độ đọc: owner nghe bốn mức (1.0 / 1.15 / 1.30 / 1.45) qua loa trong xe ngày 2026-10-27 và
# chọn 1.15; nghe lại cả bộ trong app thì vẫn nhanh, nâng lên 1.4 (2026-10-27). Ghi ở đây chứ không truyền tay, để lần render
# sau ra đúng giọng này. Đáng biết: phần lớn thời lượng mỗi clip là khoảng lặng đầu/cuối, nên
# tăng length-scale thêm nữa cũng đổi ít; nếu còn thấy nhanh thì chèn nghỉ bằng dấu câu trong
# `label`, đừng vặn tiếp con số này.
#
# Usage: tools/render-soundboard.sh [--force]
#        Without --force, existing files are left alone, so adding one key re-renders one file.
set -euo pipefail

cd "$(dirname "$0")/.."
force=${1:-}
export VI_TTS_LENGTH_SCALE=1.4    # xem ghi chú tốc độ đọc ở đầu file

command -v vi-tts >/dev/null || {
  echo "vi-tts not on PATH. On Arch it is ~/.local/bin/vi-tts (port of nixos-config pkgs/vi-tts.nix)." >&2
  exit 1
}

mkdir -p content/audio/soundboard

# Only keys whose audio lives under soundboard/ are spoken; the rest are machine sounds.
# Sa hình's error and announcement keys (content/sa-hinh-loi.json, sa-hinh-thong-bao.json) are the same family of in-car spoken keys, so
# they share this voice and directory; `say` overrides `label` where digits would be misread.
# A file used by both boards is rendered once.
node -e '
const keys = [
  ...require("./content/soundboard.json"),
  ...require("./content/sa-hinh-loi.json"),
  ...require("./content/sa-hinh-thong-bao.json"),
];
const seen = new Set();
for (const k of keys) {
  if (!k.audio.startsWith("soundboard/") || seen.has(k.audio)) continue;
  seen.add(k.audio);
  process.stdout.write(k.audio + "\t" + (k.say || k.label) + "\n");
}
' | while IFS=$'\t' read -r rel label; do
  out="content/audio/$rel"
  if [ -f "$out" ] && [ "$force" != "--force" ]; then
    printf 'skip   %s\n' "$rel"
    continue
  fi
  printf 'render %-34s "%s"\n' "$rel" "$label"
  vi-tts "$label" "$out" >/dev/null 2>&1
done

echo
echo "Now bump CACHE_NAME in service-worker.js, or installed clients keep the old audio."
