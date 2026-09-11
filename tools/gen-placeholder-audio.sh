#!/usr/bin/env bash
# 11 station voice files are real audio now (committed 2026-09-11) — this
# script no longer touches them. Only content/audio/ting-tong.mp3 (the
# "vào bài" chime) is still a synthesized placeholder; regenerates it here.
# Swap for a real recording per README.md when available.
set -euo pipefail
cd "$(dirname "$0")/../content/audio"

ffmpeg -y -f lavfi -i "sine=frequency=659.25:duration=0.22" -f lavfi -i "sine=frequency=523.25:duration=0.32" \
  -filter_complex "[0:a]afade=t=out:st=0.17:d=0.05[a0];[1:a]afade=t=out:st=0.24:d=0.08[a1];[a0][a1]concat=n=2:v=0:a=1" \
  -codec:a libmp3lame -q:a 4 ting-tong.mp3

echo "Đã tạo ting-tong.mp3 placeholder (chime 2 nốt) tại $(pwd)."
echo "Thay bằng audio thật khi có nội dung — xem README.md."
