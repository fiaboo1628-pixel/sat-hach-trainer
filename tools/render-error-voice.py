"""Rebuild grouped error narration with the airi-voice Python environment.

~/Projects/airi-voice/.venv/bin/python -I tools/render-error-voice.py
Use --output-dir to stage files. Recheck cuts after changing model or voice settings.
"""

import argparse
import json
from pathlib import Path
import subprocess
import tempfile

import numpy as np
from vieneu import Vieneu


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path,
                        default=root / 'content/audio/generated-errors')
    args = parser.parse_args()
    manifest = json.loads((root / 'docs/audio-error-voice.json').read_text())
    if not all('start' in c and 'end' in c for c in manifest['clips']):
        raise ValueError('Align the generated sentence groups before rebuilding clips.')
    tts = Vieneu()
    reference = root / 'content/audio' / manifest['reference_clips'][0]
    tts.add_voice('sat-hach-reference', str(reference), denoise=True, save=False)
    # This build script targets the locally qualified VieNeu v3 Turbo SDK.
    ref = tts._preset_voices['sat-hach-reference']
    preset = tts._preset_voices[manifest['preset_voice']]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    filters = (
        f"apad=pad_dur={manifest['tail_before_tempo']},"
        f"atempo={manifest['tempo']},afade=t=in:d=0.008,adelay=120,"
        f"apad=pad_dur={manifest['tail_after_tempo']},"
        'loudnorm=I=-19:TP=-1.5:LRA=11'
    )
    with tempfile.TemporaryDirectory(prefix='sat-hach-errors-') as temporary:
        temp = Path(temporary)
        for group_index, indices in enumerate(manifest['groups']):
            weight = manifest.get('group_reference_weights', {}).get(
                str(group_index), manifest['reference_weight'])
            anchor = (weight * np.asarray(ref['speaker_emb'])
                      + (1 - weight) * np.asarray(preset['speaker_emb'])).astype(np.float32)
            anchor *= np.linalg.norm(preset['speaker_emb']) / max(np.linalg.norm(anchor), 1e-8)
            voice = dict(preset, speaker_emb=anchor) if weight else manifest['preset_voice']
            np.random.seed(manifest.get('group_seeds', {}).get(str(group_index), 85 + group_index))
            text = manifest.get('group_texts', {}).get(
                str(group_index), ' '.join(manifest['clips'][i]['say'] for i in indices))
            audio = tts.infer(text, voice=voice,
                              temperature=manifest['temperature'],
                              use_ref_codes=True, max_chars=256)
            wav = temp / 'group.wav'
            tts.save(audio, str(wav))
            if any(manifest['clips'][i]['end'] > len(audio) / tts.sample_rate + 0.02
                   for i in indices):
                raise ValueError('Synthesis timing changed; re-align before publishing.')
            # Word timestamps can precede the last phoneme. Every internal cut
            # must lie in a real quiet interval, with 20 ms safety on both sides.
            for index in indices:
                for boundary in (manifest['clips'][index]['start'], manifest['clips'][index]['end']):
                    if 0.025 < boundary < len(audio) / tts.sample_rate - 0.025:
                        window = audio[int((boundary - 0.02) * tts.sample_rate):
                                       int((boundary + 0.02) * tts.sample_rate)]
                        if float(np.sqrt(np.mean(window ** 2))) >= 0.01:
                            raise ValueError('A cut intersects speech; align to silence before publishing.')
            for index in indices:
                clip = manifest['clips'][index]
                target = args.output_dir / Path(clip['audio']).name
                staged = temp / 'clip.mp3'
                subprocess.run(
                    ['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                     # Input duration must precede -i. An output -t would cut
                     # off the slowed speech and the silence added by filters.
                     '-ss', str(clip['start']), '-t', str(clip['end'] - clip['start']),
                     '-i', str(wav), '-af', filters,
                     '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-q:a', '3',
                     str(staged)], check=True,
                )
                subprocess.run(
                    ['ffmpeg', '-nostdin', '-v', 'error', '-i', str(staged),
                     '-f', 'null', '-'], check=True,
                )
                decoded = subprocess.check_output(
                    ['ffmpeg', '-nostdin', '-v', 'error', '-i', str(staged),
                     '-f', 'f32le', '-ar', '48000', '-ac', '1', '-'],
                )
                samples = np.frombuffer(decoded, dtype='<f4')
                expected = ((clip['end'] - clip['start'] + manifest['tail_before_tempo'])
                            / manifest['tempo'] + 0.12 + manifest['tail_after_tempo'])
                if (not np.isfinite(samples).all()
                        or len(samples) / 48000 < expected - 0.15):
                    raise ValueError('Processed speech was truncated or is invalid.')
                tail_samples = int(min(0.35, manifest['tail_after_tempo']) * 48000)
                if np.max(np.abs(samples[-tail_samples:])) >= 0.001:
                    raise ValueError('Processed speech is missing its quiet tail.')
                pending = target.with_suffix('.mp3.tmp')
                pending.write_bytes(staged.read_bytes())
                pending.replace(target)
                print(f"{clip['label']}: {target}", flush=True)


if __name__ == '__main__':
    main()
