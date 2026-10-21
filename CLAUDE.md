# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Offline-capable PWA for Vietnamese driving-test practice (UI and content are in Vietnamese). No build step, no dependencies, no `package.json`: plain ES modules + static JSON/audio/images, served as-is.

Two modules:
- **Sa hình audio**: plays practical-test station announcements (name audio, then a "ting-tong" cue) as a standard set (`content/standard-set.json`) or a user-built set saved in localStorage.
- **Lý thuyết** (theory): 600 official questions (`content/theory/questions.json`). Timed mock exams for license classes B / C1, plus untimed per-topic practice with bookmarks and a wrong-answer review list.

## Commands

```sh
python3 -m http.server 8080        # or: npx serve .  (service worker needs http, not file://)
node --test test/                  # all tests
node --test test/theory.test.mjs   # one file
node --test --test-name-pattern="<regex>" test/
```

Deploy is an rsync of the repo (minus `.git`, `test`, `tools`) to an nginx static root; see README.

## Architecture

- `index.html` holds every screen as a `<section>`; `js/app.js` `showView()` toggles `hidden` using the `VIEWS` list. Adding a screen means adding both the section (`id="view-<name>"`) and the `VIEWS` entry.
- `js/app.js` loads all three JSON files at startup, runs the audio module, and hands questions to `initTheory` (`js/theory-ui.js`).
- Pure logic is split from DOM code so it is testable in Node: `playlist.js` (station lookup/validation), `theory.js` (`generateExam`, `gradeExam`, data validators), `theory-progress.js` (saved/wrong id sets, storage injected), `theory-config.js` (`HANG_CONFIG` quotas and pass marks, chapter labels/order). `theory-ui.js` and `app.js` are DOM-only.
- Tests also validate the real content files (duplicate ids, answer indices, liệt/chapter consistency, enough questions per group for every `HANG_CONFIG` class).

## Content invariants

- Question shape: `id` (`q001`–`q600`), `text`, `choices`, `answer` (index), `is_liet`, `chapter`, `image` (filename in `content/theory/images/` or `null`).
- `chapter` is one of the 7 slugs in `CHAPTER_LABELS`. `is_liet: true` ⇔ `chapter: "tinh-huong-atgt"`, exactly 60 such questions. `generateExam` picks 1 liệt question and fills the rest from `HANG_CONFIG[...].groups` using non-liệt questions only.
- Stations: `id`, `name`, `audio`, `cue` (files in `content/audio/`). `standard-set.json` is an ordered list of station ids (repeats allowed).

## Service worker / caching

`service-worker.js` precaches `APP_SHELL` plus every station audio and every question image on install. **Bump `CACHE_NAME` (`sat-hach-trainer-vN`) whenever any shipped file changes** (JS, CSS, JSON, audio, images), or installed clients keep the old version. Add new JS modules to `APP_SHELL`.

## Docs

Design specs and implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Read the relevant spec before changing a module's behavior. The README records where content came from (600-question PDF extraction, the official list of 60 liệt questions, audio licensing); the extraction script is not in the repo.
