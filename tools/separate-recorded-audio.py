"""Remove music from the user-supplied source using Demucs 4.1.0 / htdemucs.

Install demucs, torch, torchaudio and numpy in a separate environment, then run
this script with that environment's Python and the original source MP3 path.
Model weights download on first use. Intermediate stems stay outside the repo.
"""

import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile


def run(*args):
    subprocess.run(list(map(str, args)), check=True)


def export_clips(stems, root, manifest):
    for clip in manifest['clips']:
        duration = clip['end'] - clip['start']
        # Each model input includes one second of context on either side.
        # Trim as INPUT options so appended quiet tail cannot be truncated.
        run('ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', '1', '-t', duration,
            '-i', stems / clip['id'] / 'vocals.wav', '-af',
            'highpass=f=90,afade=t=in:d=0.012,apad=pad_dur=0.4,'
            'loudnorm=I=-19:TP=-1.5:LRA=11',
            '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-q:a', '3',
            root / 'content/audio' / clip['audio'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--stems', type=Path, help='Reuse existing htdemucs stems')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    manifest = json.loads((root / 'docs/audio-recorded-source.json').read_text())
    if args.stems:
        export_clips(args.stems, root, manifest)
        return
    source = args.source.resolve(strict=True)
    with tempfile.TemporaryDirectory(prefix='sat-hach-separation-') as directory:
        work = Path(directory)
        inputs = []
        for clip in manifest['clips']:
            target = work / (clip['id'] + '.wav')
            run('ffmpeg', '-nostdin', '-v', 'error', '-y',
                '-ss', clip['start'] - 1, '-t', clip['end'] - clip['start'] + 2,
                '-i', source, '-ar', '44100', '-ac', '2', target)
            inputs.append(target)
        run(sys.executable, '-m', 'demucs', '-n', 'htdemucs', '--two-stems',
            'vocals', '-d', 'cpu', '-j', '1', '--shifts', '1',
            '-o', work / 'output', *inputs)
        export_clips(work / 'output/htdemucs', root, manifest)


if __name__ == '__main__':
    main()
