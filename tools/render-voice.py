"""Speak "<out.mp3>\t<text>" lines from stdin with VieNeu-TTS, one model load for the whole set.

Called by tools/render-soundboard.sh with the airi-voice venv's python; not meant to be run alone.
Voice: VieNeu-TTS v3 Turbo (Apache-2.0), preset "Mai Anh" (nữ, Bắc, phong cách tin tức), chosen
by the owner on 2026-11-01 from eight presets. temperature 0.5 keeps clips of the same set alike.
"""
import os
import subprocess
import sys
import tempfile

from vieneu import Vieneu

VOICE = "Mai Anh"
# VOICE_TEMPO (optional, e.g. 0.85) slows speech without changing pitch; unset keeps the
# original behaviour used for the sa hình stations and keys. The 0.4 s pad keeps a quiet tail
# of at least 350 ms after the tempo change (CLAUDE.md "Audio tail fix").
TEMPO = os.environ.get("VOICE_TEMPO")
# Trim the model's lead/tail silence, leave a short even pad, and level to the ~-19 LUFS the
# machine sounds (ting-tong, tút) sit at.
FILTER = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
          "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
          + (f"apad=pad_dur=0.25,atempo={TEMPO},adelay=120,apad=pad_dur=0.4," if TEMPO else "adelay=120,apad=pad_dur=0.25,")
          + "loudnorm=I=-19:TP=-1.5:LRA=11")

tts = Vieneu()
for line in sys.stdin:
    out, text = line.rstrip("\n").split("\t")
    audio = tts.infer(text, voice=VOICE, temperature=0.5)
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
        tts.save(audio, wav.name)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav.name, "-af", FILTER,
                        "-ar", "48000", "-ac", "1", "-c:a", "libmp3lame", "-q:a", "4", out],
                       check=True)
    print(f"render {out}  \"{text}\"", flush=True)
