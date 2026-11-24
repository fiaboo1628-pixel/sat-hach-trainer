#!/usr/bin/env bash
# Render every spoken clip of the Đường trường console into content/audio/road/:
# command sentences (`commandSay`), error sentences (`say`) and notices from
# content/rules/duong-truong-*.json, plus road/diem-0.mp3 … road/diem-100.mp3 for the final score.
# The list is written to docs/audio-road-voice.json (audio → spoken text) so the check script and
# reviewers can see exactly what each file should say.
#
# Same voice as the rest of the app: VieNeu-TTS v3 Turbo preset "Mai Anh" via tools/render-voice.py,
# slowed to VOICE_TEMPO (default 0.85, like the sa hình station names) and levelled to −19 LUFS.
# Check afterwards: ~/Projects/airi-voice/.venv/bin/python -I tools/check-voice.py
#
# Usage: tools/render-road-voice.sh [--force]   (without --force existing files are kept)
set -euo pipefail

cd "$(dirname "$0")/.."
force=${1:-}
py=${VIENEU_PY:-$HOME/Projects/airi-voice/.venv/bin/python}
[ -x "$py" ] || { echo "No VieNeu venv at $py (set VIENEU_PY)." >&2; exit 1; }
mkdir -p content/audio/road

node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
import { vietNumber } from "./tools/viet-number.mjs";
const NOTICE_SAY = {
  suspended: "Thí sinh bị đình chỉ sát hạch.",
  failed: "Thí sinh không đạt bài sát hạch.",
  passed: "Thí sinh đã đạt bài sát hạch.",
  startTimeout: "Quá ba mươi giây chưa khởi hành xe qua vị trí xuất phát.",
};
const clips = new Map();
const add = (audio, say) => {
  if (clips.has(audio) && clips.get(audio) !== say) throw new Error(`${audio}: "${clips.get(audio)}" vs "${say}"`);
  clips.set(audio, say);
};
for (const n of ["tt12", "tt108"]) {
  const r = JSON.parse(readFileSync(`content/rules/duong-truong-${n}.json`, "utf8"));
  r.exercises.forEach((e) => add(e.commandAudio, e.commandSay));
  r.errors.forEach((e) => add(e.audio, e.say));
  Object.entries(r.notices).forEach(([k, a]) => add(a, NOTICE_SAY[k]));
}
for (let n = 0; n <= 100; n++) add(`road/diem-${n}.mp3`, `${vietNumber(n)} điểm.`);
const list = [...clips].map(([audio, say]) => ({ audio, say }));
writeFileSync("docs/audio-road-voice.json", JSON.stringify({
  engine: "VieNeu-TTS v3 Turbo", preset_voice: "Mai Anh", tempo: Number(process.env.VOICE_TEMPO || 0.85),
  loudness: "-19 LUFS", renderer: "tools/render-road-voice.sh", clips: list,
}, null, 2) + "\n");
'

export VOICE_TEMPO=${VOICE_TEMPO:-0.85}
node -e '
const { clips } = require("./docs/audio-road-voice.json");
const fs = require("fs");
for (const c of clips) {
  const out = `content/audio/${c.audio}`;
  if (process.argv[1] === "--force" || !fs.existsSync(out)) console.log(`${out}\t${c.say}`);
}
' "$force" | "$py" -I tools/render-voice.py
