#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../content/audio"

names=(
  xuat-phat nhuong-nguoi-di-bo de-pa-len-doc hang-dinh-vuong-goc
  nga-tu-den-tin-hieu duong-vong-quanh-co ghep-xe-doc giao-duong-sat
  tang-toc-tang-so ghep-xe-ngang ket-thuc
)

for n in "${names[@]}"; do
  ffmpeg -y -f lavfi -i "sine=frequency=880:duration=1" -ac 1 -ar 44100 -q:a 4 "$n.mp3"
done

echo "Đã tạo ${#names[@]} file audio placeholder (beep 1s) tại $(pwd)."
echo "Thay bằng audio TTS thật khi có nội dung — xem README.md."
