# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Offline-capable PWA for Vietnamese driving-test practice (UI and content are in Vietnamese). No build step, no dependencies, no `package.json`: plain ES modules + static JSON/audio/images, served as-is.

Three modules:
- **Sa hình**: a press-to-play board for the passenger, never auto-play (the car does not keep a fixed rhythm). Hạng B, Hạng C1 (B minus `ghep-xe-ngang`) and Bộ tự ghép all open the same board (`view-bo-chuan`): two big sticky keys on top, **Ting tong** (`ting-tong.mp3`, entering a bài) and **Tút** (`tut.mp3`, bài accepted), which are pressed most; a "Bài kế" key that reads the next station name of the set and advances (plus Lùi and Đọc lại); a blue "Thông báo" zone from `content/sa-hinh-thong-bao.json` (Đậu, Trượt; Kết thúc is not a key because every set already ends with the `ket-thuc` station); and the red error keys from `content/sa-hinh-loi.json`. Sets are `content/standard-set.json` or the user's set in localStorage.
- **Đường trường**: a soundboard of twelve road-call cues (`content/soundboard.json`), pressed by the passenger who calls the stations out while someone else drives -- not browsed as a menu. Nine of them are voice files rendered by `tools/render-soundboard.sh` into `content/audio/soundboard/`; Ting tong and Tút are machine sounds the script leaves alone, and Kết thúc reuses the sa hình station clip `ket-thuc.mp3` (owner's choice 2026-10-28, replacing a 0.34 s render; this also closes the open "female voice for Kết thúc" idea). The script needs `vi-tts`; on Arch that is `~/.local/bin/vi-tts` (standalone piper in `~/.local/opt/piper`, voice in `~/.local/share/piper/voices`).
- **Hướng dẫn thi đường trường** (`view-huong-dan-dt`, from the menu under Đường trường): static reading page for learners before the road test -- the four bài, what to do, and each error with its points. The in-car board stays at its 12 keys on purpose; the owner wants the error list read beforehand, not pressed.
- **Lý thuyết** (theory): 600 official questions (`content/theory/questions.json`). Timed mock exams for license classes B / C1, plus untimed per-topic practice with bookmarks and a wrong-answer review list.

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

Deploy is GitHub Pages from `main` (root): pushing `main` publishes https://fiaboo1628-pixel.github.io/sat-hach-trainer/ within a minute or two. The nginx rsync in the README is the old path.

## Architecture

- `index.html` holds every screen as a `<section>`; `js/app.js` `showView()` toggles `hidden` using the `VIEWS` list. Adding a screen means adding both the section (`id="view-<name>"`) and the `VIEWS` entry.
- `js/app.js` loads all four JSON files at startup (stations, standard-set, theory questions, soundboard), runs the audio module, and hands questions to `initTheory` (`js/theory-ui.js`).
- Pure logic is split from DOM code so it is testable in Node: `playlist.js` (station lookup/validation), `theory.js` (`generateExam`, `gradeExam`, data validators), `theory-progress.js` (saved/wrong id sets, storage injected), `theory-config.js` (`HANG_CONFIG` quotas and pass marks, chapter labels/order). `theory-ui.js` and `app.js` are DOM-only.
- Tests also validate the real content files (duplicate ids, answer indices, liệt/chapter consistency, enough questions per group for every `HANG_CONFIG` class).

## Content invariants

- Question shape: `id` (`q001`–`q600`), `text`, `choices`, `answer` (index), `is_liet`, `chapter`, `image` (filename in `content/theory/images/` or `null`).
- `chapter` is one of the 7 slugs in `CHAPTER_LABELS`. `is_liet: true` ⇔ `chapter: "tinh-huong-atgt"`, exactly 60 such questions. `generateExam` picks 1 liệt question and fills the rest from `HANG_CONFIG[...].groups` using non-liệt questions only.
- Soundboard: an array of `{label, icon, audio, color}`; `audio` is a filename in `content/audio/` and `color` is one of `blue`, `yellow`, `red` (the road-sign tokens in `style.css`), not a free-form CSS colour.
- Stations: `id`, `name`, `audio`, `cue` (files in `content/audio/`). `standard-set.json` is an ordered list of station ids (repeats allowed).
- Sa hình errors (`sa-hinh-loi.json`): `{label, icon, audio, say?}`. No points on the keys: the owner removed them as visual noise (2026-10-28). The list follows the hạng B in-yard rules (Thông tư 35/2024 Phụ lục XV mục C, carried into TT 12/2025/TT-BCA). `say` is the spoken text when `label` has digits piper would misread. Audio lives in `content/audio/soundboard/` and is rendered by the same script as the Đường trường keys.

## Service worker / caching

`service-worker.js` precaches `APP_SHELL` plus every station audio and every question image on install. **Bump `CACHE_NAME` (`sat-hach-trainer-vN`) whenever any shipped file changes** (JS, CSS, JSON, audio, images), or installed clients keep the old version. Add new JS modules to `APP_SHELL`.

## Docs

Design specs and implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

**Look (2026-10-28, owner-directed):** the whole app is a night road -- dark tokens in `:root`
(`--night`, `--card-bg`, light `--ink`; `-text` variants of blue/red for text on dark), the
roof-light trio blue/yellow/red of a xe sát hạch for the three of anything (icon + text buttons,
`.set-btn`), Unbounded for titles. The menu is a top-down exam car split into Lý thuyết / Sa hình
/ Đường trường; Sa hình opens its own layer (`view-sa-hinh-menu`). This replaces the beige frame
`#E3E1D6` recorded below as confirmed -- the owner chose the new direction.

`.impeccable/` is not scratch state: `critique/` holds the design audits (the 2026-10-21 one
scored the app 17/40 and is the baseline for any UI work), and `config.json` records decisions
the owner has already made -- the beige frame `#E3E1D6` is confirmed as intended, so do not
"fix" it. Read both before changing how anything looks.

Read the relevant spec before changing a module's behavior. The README records where content came from (600-question PDF extraction, the official list of 60 liệt questions, audio licensing); the extraction script is not in the repo.
