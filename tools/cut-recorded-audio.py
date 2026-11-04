"""Rebuild recorded cues: python3 tools/cut-recorded-audio.py <source-audio>."""

import argparse
import json
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    root = Path(__file__).resolve().parent.parent
    manifest = json.loads((root / "docs/audio-recorded-source.json").read_text())
    for clip in manifest["clips"]:
        target = root / "content/audio" / clip["audio"]
        target.parent.mkdir(parents=True, exist_ok=True)
        duration = clip["end"] - clip["start"]
        filters = (
            "highpass=f=90,afade=t=in:d=0.012,"
            f"afade=t=out:st={duration - 0.035:.3f}:d=0.035,"
            "loudnorm=I=-19:TP=-1.5:LRA=11"
        )
        subprocess.run(
            ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
             "-ss", str(clip["start"]), "-i", str(source), "-t", str(duration),
             "-vn", "-af", filters, "-ar", "48000", "-ac", "1",
             "-c:a", "libmp3lame", "-q:a", "3", str(target)],
            check=True,
        )
        print(clip["audio"])


if __name__ == "__main__":
    main()
