"""Listen back to rendered clips: speech recognition text vs the intended sentence, plus quiet tail.

~/Projects/airi-voice/.venv/bin/python -I tools/check-voice.py [--manifest docs/audio-road-voice.json]
       [--audio-dir content/audio] [--only road/a.mp3,road/b.mp3]

Prints one line per clip and exits 1 if any clip scores below --min-ratio (default 0.85) or has
less than 350 ms of quiet tail. Recognition is an aid, not proof: a human still listens to the
preview before release.
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']


def viet_number(n):
    if n == 100:
        return 'một trăm'
    if n < 10:
        return DIGITS[n]
    tens, unit = divmod(n, 10)
    head = 'mười' if tens == 1 else f'{DIGITS[tens]} mươi'
    if unit == 0:
        return head
    if unit == 5:
        return f'{head} lăm'
    if unit == 1 and tens > 1:
        return f'{head} mốt'
    if unit == 4 and tens > 1:
        return f'{head} tư'
    return f'{head} {DIGITS[unit]}'


def normalise(text):
    text = unicodedata.normalize('NFC', text.lower())
    text = re.sub(r'\d+', lambda m: viet_number(int(m.group())) if int(m.group()) <= 100 else m.group(), text)
    text = re.sub(r'[^\w\s]', ' ', text)
    return ' '.join(text.split())


def decode(path):
    raw = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path),
                                   '-f', 'f32le', '-ar', '16000', '-ac', '1', '-'])
    return np.frombuffer(raw, dtype='<f4')


def main():
    root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--manifest', type=Path, default=root / 'docs/audio-road-voice.json')
    ap.add_argument('--audio-dir', type=Path, default=root / 'content/audio')
    ap.add_argument('--only', default='')
    ap.add_argument('--min-ratio', type=float, default=0.85)
    ap.add_argument('--model', default='large-v3-turbo')
    args = ap.parse_args()
    clips = json.loads(args.manifest.read_text())['clips']
    if args.only:
        wanted = set(args.only.split(','))
        clips = [c for c in clips if c['audio'] in wanted]
    model = WhisperModel(args.model, device='cpu', compute_type='int8')
    failed = []
    for c in clips:
        path = args.audio_dir / c['audio']
        if not path.exists():
            failed.append(c['audio'])
            print(f"MISSING {c['audio']}")
            continue
        samples = decode(path)
        tail = samples[-int(0.35 * 16000):]
        tail_ok = len(samples) > 0.6 * 16000 and float(np.max(np.abs(tail))) < 0.01
        segments, _ = model.transcribe(samples, language='vi', beam_size=5, vad_filter=False,
                                       condition_on_previous_text=False)
        heard = ' '.join(s.text for s in segments)
        ratio = difflib.SequenceMatcher(None, normalise(c['say']), normalise(heard)).ratio()
        ok = ratio >= args.min_ratio and tail_ok
        if not ok:
            failed.append(c['audio'])
        print(f"{'OK  ' if ok else 'FAIL'} {ratio:.2f} tail={'ok' if tail_ok else 'BAD'} "
              f"{len(samples) / 16000:.2f}s {c['audio']} | want: {c['say']} | heard: {heard.strip()}", flush=True)
    print(f'{len(clips) - len(failed)}/{len(clips)} passed')
    if failed:
        print('FAILED: ' + ','.join(failed))
        sys.exit(1)


if __name__ == '__main__':
    main()
