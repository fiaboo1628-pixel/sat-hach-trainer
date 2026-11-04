# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Offline-capable PWA for Vietnamese driving-test practice (UI and content are in Vietnamese). No build step, no dependencies, no `package.json`: plain ES modules + static JSON/audio/images, served as-is.

Three modules:
- **Sa hình**: a press-to-play board for the passenger, never auto-play (the car does not keep a fixed rhythm). Hạng B, Hạng C1 (B minus `ghep-xe-ngang`) and Bộ tự ghép all open the same board (`view-bo-chuan`): two big sticky keys on top, **Ting tong** (`ting-tong.mp3`, entering a bài) and **Tút** (`tut.mp3`, bài accepted), which are pressed most; a "Bài kế" key that reads the next station name of the set and advances (plus Lùi and Đọc lại); a blue "Thông báo" zone from `content/sa-hinh-thong-bao.json` (Đậu, Trượt; Kết thúc is not a key because every set already ends with the `ket-thuc` station); and the red error keys from `content/sa-hinh-loi.json`. Sets are `content/standard-set.json` or the user's set in localStorage.
- **Đường trường**: a soundboard of twelve road-call cues (`content/soundboard.json`), pressed by the passenger who calls the stations out while someone else drives -- not browsed as a menu. Eight of them are voice files rendered by `tools/render-soundboard.sh` into `content/audio/soundboard/`; Ting tong and Tút are machine sounds the script leaves alone; Xuất phát and Kết thúc play the sa hình station clips. A key that says the same thing as a sa hình station reuses the station file; the sa hình station "Tăng số, tăng tốc độ" plays the Đường trường clip. **One voice for every spoken clip** (owner, 2026-11-01): VieNeu-TTS v3 Turbo preset "Mai Anh", rendered by `tools/render-soundboard.sh` (stations + all keys; `--force` re-renders all) through `tools/render-voice.py` with the venv in `~/Projects/airi-voice` (`VIENEU_PY` to override). Change one key at a time, only what the owner names.
- **Hướng dẫn thi đường trường** (`view-huong-dan-dt`, from the menu under Đường trường): static reading page for learners before the road test -- the four bài, what to do, and each error with its points. The in-car board stays at its 12 keys on purpose; the owner wants the error list read beforehand, not pressed.
- **Lý thuyết** (theory): 600 official questions (`content/theory/questions.json`). Timed mock exams for license classes B / C1, plus untimed per-topic practice with bookmarks and a wrong-answer review list.

## Audio source update (2026-11-04)

Owner requested source-video excerpts instead of TTS for matching cues. All 11
Sa hình stations and the pass notice now use `content/audio/recorded/`; road-board
Xuất phát/Kết thúc share those recordings. Other road commands and nonverbal
sounds retain their previous files. Source timestamps:
`docs/audio-recorded-source.json`. Do not regenerate `recorded/` using TTS;
`tools/render-soundboard.sh` skips it even with `--force`. Older one-voice notes
describe the previous version. Android has not been rebuilt.

Error voice follow-up: Sa hình + road error keys and the fail notice use
`generated-errors/`, synthesized with a clear Mai Anh base, up to 15% reference
speaker anchor, and Mai Anh reference codes (groups 0/2/4 use the clear base), then slowed to 80% tempo. This is an
approximation, not an exact clone. Synthesize in sentence groups and split using
manifest cuts; short standalone cloning failed pronunciation checks.
Manifest: `docs/audio-error-voice.json`; rebuild with
`tools/render-error-voice.py` in the airi-voice environment. Generic TTS rebuilds
must not overwrite these files. Owner specified “Xe chạm vạch”, “Dừng xe chưa đến
vị trí”, “Dừng xe quá vị trí”, “Bạn đã đi sai quy cách thi”, “Quá thời gian một bài”,
and removed “Lên vỉa hè”. Current cache: v44.

Recorded cues now use HTDemucs vocal separation to reduce source backing music.
Rebuild with tools/separate-recorded-audio.py and the original source MP3.
It uses 1 second of source context per side, then trims and adds a 400 ms quiet tail.
The older cut-recorded-audio.py produces mixed audio; do not use it to overwrite
the separated production cues. Separation can leave residual noise/artifacts.

Audio tail fix: cut at measured silence centers, not ASR word boundaries. Preserve
`group_texts` / `group_seeds` overrides: two joined utterances were regenerated with
paragraph breaks. Pad 250 ms before atempo, then 400 ms after it. The renderer
rejects internal cuts with audible energy in the surrounding 40 ms.
FFmpeg duration MUST be an input option (`-ss ... -t ... -i ...`), not an output
limit: the latter truncated slowed speech and padding. Verify output duration
after tempo processing and at least 350 ms quiet tail before publishing.

## Commands

```sh
npx serve . -l 8080               # service worker needs http, not file://. NOT python3 -m
                                  # http.server: python3 is not installed here.
node --test                       # all tests (30). `node --test test/` is BROKEN on
                                  # Node 24 -- it treats the dir as one module and fails
                                  # with MODULE_NOT_FOUND, which looks like a real bug.
node --test test/theory.test.mjs   # one file
node --test --test-name-pattern="<regex>"
```

Deploy is Vercel: `vercel deploy --prod` from the repo root publishes https://sat-hach-trainer.vercel.app (`.vercelignore` drops test/tools/docs). The GitHub repo is private since 2026-10-28, so GitHub Pages is off; push-to-deploy needs the Vercel GitHub app plus `vercel git connect`.

## Architecture

- `index.html` holds every screen as a `<section>`; `js/app.js` `showView()` toggles `hidden` using the `VIEWS` list. Adding a screen means adding both the section (`id="view-<name>"`) and the `VIEWS` entry.
- `js/app.js` loads all four JSON files at startup (stations, standard-set, theory questions, soundboard), runs the audio module, and hands questions to `initTheory` (`js/theory-ui.js`).
- Pure logic is split from DOM code so it is testable in Node: `playlist.js` (station lookup/validation), `theory.js` (`generateExam`, `gradeExam`, data validators), `theory-progress.js` (saved/wrong id sets, storage injected), `theory-config.js` (`HANG_CONFIG` quotas and pass marks, chapter labels/order). `theory-ui.js` and `app.js` are DOM-only.
- Tests also validate the real content files (duplicate ids, answer indices, liệt/chapter consistency, enough questions per group for every `HANG_CONFIG` class).

## Content invariants

- Question shape: `id` (`q001`–`q600`), `text`, `choices`, `answer` (index), `is_liet`, `chapter`, `image` (filename in `content/theory/images/` or `null`).
- `chapter` is one of the 7 slugs in `CHAPTER_LABELS`. `is_liet: true` ⇔ `chapter: "tinh-huong-atgt"`, exactly 60 such questions. `generateExam` picks 1 liệt question and fills the rest from `HANG_CONFIG[...].groups` using non-liệt questions only.
- Soundboard: an array of `{label, audio, color}`; `audio` is a filename in `content/audio/` and `color` is one of `blue`, `yellow`, `red` (the road-sign tokens in `style.css`), not a free-form CSS colour.
- Stations: `id`, `name`, `audio`, `cue` (files in `content/audio/`). `standard-set.json` is an ordered list of station ids (repeats allowed).
- Sa hình errors (`sa-hinh-loi.json`): `{label, audio, say?}`. No points on the keys: the owner removed them as visual noise (2026-10-28). The list follows the hạng B in-yard rules (Thông tư 35/2024 Phụ lục XV mục C, carried into TT 12/2025/TT-BCA). `say` is the spoken text when `label` has digits the TTS would misread. Audio lives in `content/audio/soundboard/` and is rendered by the same script as the Đường trường keys.

## Service worker / caching

`service-worker.js` precaches `APP_SHELL` plus every station audio and every question image on install. **Bump `CACHE_NAME` (`sat-hach-trainer-vN`) whenever any shipped file changes** (JS, CSS, JSON, audio, images), or installed clients keep the old version. Add new JS modules to `APP_SHELL`.

## Docs

Design specs and implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

**Look now (2026-11-01, owner-directed):** warm light pastel, little black -- cream ground `--night: #f7efe3` (name kept), warm charcoal `--ink`, white 3D keys with a solid 4px lip (`--edge` per colour, `--key-edge` default) that sink on press, pastel zone tints, a white exam car with blue-grey glass. The tasteskill inspector warns `palette-cream` on purpose: the owner asked for it. The night-road notes below are history.

**Look (2026-10-28, owner-directed):** the whole app is a night road -- dark tokens in `:root`
(`--night`, `--card-bg`, light `--ink`; `-text` variants of blue/red for text on dark), the
roof-light trio blue/yellow/red of a xe sát hạch for the three of anything (SVG icon + text buttons,
`.set-btn`), Unbounded for titles. The menu is a top-down exam car split into Lý thuyết / Sa hình
/ Đường trường; Sa hình opens its own layer (`view-sa-hinh-menu`). This replaces the beige frame
`#E3E1D6` recorded below as confirmed -- the owner chose the new direction. Polish pass 2026-11-01 (owner: keep the direction, make it cleaner): keys are borderless
`--key` tone steps, two radii (10px keys, 14px blocks), no emoji on keys or buttons, zone
labels in sentence case; Đậu/Trượt tinted green/red.

`.impeccable/` is not scratch state: `critique/` holds the design audits (the 2026-10-21 one
scored the app 17/40 and is the baseline for any UI work), and `config.json` records decisions
the owner has already made -- the beige frame `#E3E1D6` is confirmed as intended, so do not
"fix" it. Read both before changing how anything looks.

Read the relevant spec before changing a module's behavior. The README records where content came from (600-question PDF extraction, the official list of 60 liệt questions, audio licensing); the extraction script is not in the repo.
