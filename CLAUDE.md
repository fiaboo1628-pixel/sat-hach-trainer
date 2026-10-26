# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Offline-capable PWA for Vietnamese driving-test practice (UI and content are in Vietnamese). No build step, no dependencies, no `package.json`: plain ES modules + static JSON/audio/images, served as-is.

Three modules:
- **Sa hình audio**: plays practical-test station announcements (name audio, then a "ting-tong" cue) as a standard set (`content/standard-set.json`) or a user-built set saved in localStorage.
- **Đường trường**: a soundboard of eleven road-call cues (`content/soundboard.json`), meant to be pressed while driving rather than browsed as a menu.
- **Lý thuyết** (theory): 600 official questions (`content/theory/questions.json`). Timed mock exams for license classes B / C1, plus untimed per-topic practice with bookmarks and a wrong-answer review list.

## Commands

```sh
npx serve . -l 8080               # service worker needs http, not file://. NOT python3 -m
                                  # http.server: python3 is not installed here.
node --test                       # all tests (27). `node --test test/` is BROKEN on
                                  # Node 24 -- it treats the dir as one module and fails
                                  # with MODULE_NOT_FOUND, which looks like a real bug.
node --test test/theory.test.mjs   # one file
node --test --test-name-pattern="<regex>"
```

Deploy is an rsync of the repo (minus `.git`, `test`, `tools`) to an nginx static root; see README.

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

## Service worker / caching

`service-worker.js` precaches `APP_SHELL` plus every station audio and every question image on install. **Bump `CACHE_NAME` (`sat-hach-trainer-vN`) whenever any shipped file changes** (JS, CSS, JSON, audio, images), or installed clients keep the old version. Add new JS modules to `APP_SHELL`.

## Docs

Design specs and implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

`.impeccable/` is not scratch state: `critique/` holds the design audits (the 2026-10-21 one
scored the app 17/40 and is the baseline for any UI work), and `config.json` records decisions
the owner has already made -- the beige frame `#E3E1D6` is confirmed as intended, so do not
"fix" it. Read both before changing how anything looks.

Read the relevant spec before changing a module's behavior. The README records where content came from (600-question PDF extraction, the official list of 60 liệt questions, audio licensing); the extraction script is not in the repo.
