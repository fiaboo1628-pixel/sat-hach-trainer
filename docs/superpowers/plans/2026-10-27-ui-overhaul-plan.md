# Đại tu giao diện — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `impeccable` for every visual decision here.
> It is already initialised in this repo (`.impeccable/config.json`) and its 2026-10-21 critique
> is the input, not something to redo. Use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to work task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The owner used the app for several days and concluded it needs an overhaul, not polish.
Asked where it hurt, they named four things — and three of them are the same problem: *you cannot
tell where you are*. Every tile wears the same 6px left border, the type scale has eight sizes
within 6 % of each other, navigation is an instant `hidden` toggle with no direction, and sa hình
does not say which bài is playing. So this plan has one thesis and one new door:

1. **Orientation.** Make each screen and each kind of control look like what it is, and make
   moving between them legible. This is one coherent pass, not three cosmetic tickets.
2. **Car mode for Đường trường.** Its own entry from the home screen, designed for someone
   holding a steering wheel.

**Architecture:** Unchanged. Static PWA, vanilla ES modules, no build step, no dependencies, no
`package.json`. `index.html` holds every screen as a `<section>`; `js/app.js` `showView()` toggles
`hidden` against `VIEWS`. Pure logic stays out of DOM files. Nothing here adds a framework.

**Baseline critique:** `.impeccable/critique/2026-10-21T03-07-34Z__index-html.md` (17/40).

## Decisions already made — do not re-litigate

Recorded the way `.impeccable/config.json` records them, so the next worker inherits them:

- **2026-10-21, owner:** the beige frame `#E3E1D6` is intended. The `cream-palette` detector rule
  is ignored for `index.html` on purpose. Do not "fix" it.
- **2026-10-27, owner:** the theory exam **keeps the scrolling list**. No one-question-per-page
  rewrite, even though the real test machine works that way. That shrinks the exam work to the
  cheap missing pieces in task 4.
- **2026-10-27, owner:** Đường trường **gets its own door from the home screen** (car mode), not
  a nicer menu entry.

## What the merged PRs already fixed — verified 2026-10-27, do not redo

The critique is six days old and three PRs landed after it. Re-verified against the code today:

- `q301`/`q302` now have 4 choices each. The P0 data bug is **fixed**.
- `.tile.playing` exists, `#stop-duong-truong` ("⏹ Dừng") exists, soundboard keys are
  `min-height: 4rem` / `font-size: 1.2rem` with a comment stating all 11 keys plus Dừng fit a
  375×667 screen without scrolling. Playing state, stop and sizing are **done**.
- `navigator.wakeLock.request('screen')` is called and released (`js/app.js:292`, `:300`). Wake
  lock is **done**.
- `#now-playing` is a sticky card. Sa hình's off-screen status is **partly done** — see task 3 for
  what is left.

## Watch it live

The owner wants to see each change on screen, not read a diff. The app is a web page, so the
driver is Playwright, not the cua computer-use stack: cua's own platform notes rate browser routes
on GNOME/Wayland read-only, while Playwright drives the page directly and its browsers here are
Nix-built, so nothing is fetched at run time.

```sh
npx serve . -l 8080          # verified working 2026-10-27. NOT python3 -m http.server:
                             # python3 is not installed on this machine.
```

Use the `playwright-headed` MCP server — headed, `--device "Pixel 5"` — so a real phone-sized
window is visible. `browser_navigate` to `http://localhost:8080`, then `browser_snapshot` /
`browser_click`. Keep the phone viewport on for anything about layout: this is a phone app used in
a car, and the critique's P2 is a desktop-only two-column layout.

## Global constraints

- **Bump `CACHE_NAME`** (`sat-hach-trainer-vN`) in `service-worker.js` for every task that changes
  a shipped file, and add new files to `APP_SHELL`. Otherwise installed clients keep the old
  version and the change looks like it never happened. This is the easiest way to ship nothing.
- **Offline first.** Anything the UI depends on is a local file in `APP_SHELL`. A CDN reference is
  a bug (task 1 is exactly that bug).
- `node --test` must pass before and after each task — **bare, no path**. `node --test test/` is
  broken on Node 24 and fails with `MODULE_NOT_FOUND`, which reads as a real bug and is not one.
  27 tests, green as of 2026-10-27.
- Colour must never be the only signal. Three of the findings below are colour-only failures.
- UI copy is Vietnamese; keep the domain wording (hạng B / C1, điểm liệt, sa hình, đường trường).
- No new runtime dependency. Fonts, patterns and transitions ship as local files or CSS.

## Tasks

### 1. Car mode for Đường trường

The owner's first-named pain, and now its own door. What is actually left after the merged PRs:

- `index.html:43` puts `<button class="btn-back">← Quay lại</button>` as the **first element of the
  section**, directly above the keys — a muted text link next to buttons pressed without looking.
  The critique's "Back adjacent" finding survives.
- `<h2>Đường trường</h2>` still takes a row that the keys could use.
- **Playing state collides with a key colour, verified:** `content/soundboard.json` has
  `color: "yellow"` on 2 of 11 keys ("Ting tong", "Tút"), and `#soundboard .tile.playing` paints
  `background: var(--yellow)`. Those two keys look like they are playing at rest, and when they
  really play they differ only by `border-color`. Colour-only, and ambiguous.

- [ ] Add a car-mode entry on the home screen, distinct from the sa hình / lý thuyết tiles — it is
      a mode, not a menu item. Decide its shape with `impeccable`; it should be obvious at a glance
      which tile you press before starting to drive.
- [ ] Inside car mode: keys get the whole screen. No `<h2>`, and the way out must not sit where a
      key press could land on it. Confirm-to-leave is acceptable; a text link above the keys is not.
- [ ] Replace the playing state with something that is not a palette colour and not colour-only
      (motion, a mark, a border treatment — `impeccable`'s call). It must be unmistakable on a
      `yellow` key.
- [ ] Verify in the Pixel 5 viewport: every key plus the way out, no scrolling, and tap targets
      measured rather than eyeballed. Press a yellow key and confirm its playing state reads at
      arm's length.

#### 1b. Soundboard content: a Kết thúc key, and the two gear calls

Owner request, 2026-10-27. Both of the easy parts need **no new audio** — verified against
`content/audio/` today:

- **Kết thúc key.** `ket-thuc.mp3` (16K) already ships: it is the `ket-thuc` station in
  `content/stations.json` and is in `standard-set.json`, so the service worker already precaches
  it. Adding the key is a pure `content/soundboard.json` edit — one entry, zero new files.
- **"Tăng số" → the full call.** `tang-toc-tang-so.mp3` (24K, three times the size of the 8K
  `tang-so.mp3`) already ships as the `tang-toc-tang-so` station. Point key `[3]` at it. Note the
  official wording is **"Tăng tốc, tăng số"** — tăng tốc first — which is both the station name and
  what the audio says. Use that order, not "tăng số tăng tốc độ": the label must match what the
  examiner hears.
- **"Giảm số" has no counterpart.** There is no `giam-toc-giam-so.mp3` and no such station — the
  real test has no giảm equivalent. See the open question below; do not relabel `[4]` to a longer
  phrase while it still plays the 8K `giam-so.mp3`, because in a car a label that disagrees with
  the audio is worse than a short one.

- [ ] Add the Kết thúc key to `content/soundboard.json`, pick its icon and `color` from the
      existing tokens (`blue`/`yellow`/`red` only — it is an end-of-test call, not a fault, so not
      `red`), and bump `CACHE_NAME`.
- [ ] Repoint key `[3]` to `tang-toc-tang-so.mp3` and relabel it "Tăng tốc, tăng số".
- [ ] **This breaks a stated invariant.** `style.css:229` says "Sized so all 11 keys + Dừng fit one
      375×667 screen without scrolling". With Kết thúc there are 12 keys plus Dừng. Re-fit inside
      car mode — dropping the `<h2>` and the back link buys most of the row back — and update that
      comment to the real number. Do not let it quietly start scrolling.
- [ ] `content/soundboard.json` has no validation test, unlike stations and questions. While adding
      an entry, add one: every `audio` exists in `content/audio/`, every `color` is one of the three
      tokens. It is the only shipped content file nothing checks.
- [ ] Verify: press Kết thúc and Tăng tốc, tăng số in the headed browser and listen — the audio
      must be the long call, not the short one.

### 2. Orientation: type scale, tile kinds, page transitions

One pass, because they are one problem. Verified 2026-10-27:

- `style.css` uses eight font sizes — 0.85, 0.9, 1, 1.1, 1.15, 1.2, 1.3, 1.4rem. Adjacent steps
  differ by ~6 %: eight sizes, no hierarchy. This is the `flat-type-hierarchy` finding.
- `style.css:111` is `border-left-width: 6px`, applied as the one tile treatment everywhere — the
  `side-tab` finding, "generic tile-with-left-border structure everywhere".
- `transition`, `animation` and `prefers-reduced-motion` appear **zero** times in `style.css`.
  `showView()` toggles `hidden`, so navigation is an instant cut with no direction.

- [ ] Replace the eight sizes with a scale that has visible steps, as custom properties beside the
      existing colour tokens in `:root`. One scale for the app; do not pick per screen.
- [ ] Give the tile kinds different treatments — menu entry, status, destructive, disabled. The
      critique's persona note says a disabled tile currently looks enabled; that is this task.
- [ ] Give `showView()` a direction-aware transition (forward in, backward out). Change the one
      function, not nine sections. Honour `@media (prefers-reduced-motion: reduce)`, and do not let
      motion be the only cue that navigation happened.
- [ ] Verify: walk home → lý thuyết → thi → kết quả → back in the headed browser and watch it.
      Then turn reduced motion on and walk it again.

### 3. Sa hình: which bài is playing

`#now-playing` is already a sticky card. What the critique still has open: no highlight on the
current row in the list, and stale status surviving a view change.

- [ ] Highlight the current item in the list, not only in the card.
- [ ] Clear playback status when leaving the view, so a stale "đang phát" cannot follow you.
- [ ] Verify: start a standard set, leave to lý thuyết, come back. Nothing stale, and the row
      matches the card.

### 4. Theory exam — list stays, add what is missing

Scope cut by the owner's decision. Verified 2026-10-27: `confirm` and `beforeunload` appear **zero**
times anywhere in `js/`, and question images are rendered with **no `alt` attribute at all** —
worse than the `alt=""` the critique reported.

- [ ] Question numbering and progress (`câu 7/25`) in the scrolling list.
- [ ] `confirm` before submitting, and a `beforeunload` guard while a timed exam runs. Leaving an
      exam must confirm or be recoverable; today it is silently lost.
- [ ] Real `alt` on question images — the question text is the obvious source. 316 images with no
      alt is a screen-reader dead end.
- [ ] Right/wrong must not be colour-only (critique, persona Sam). Same for the ☆ bookmark, whose
      contrast is 1.7:1.
- [ ] Result screen: state the pass rule, and make "Thi lại" actually restart.
- [ ] Verify: one full hạng B exam in the headed browser, submitted, result read. `node --test` green.

### 5. The two the owner asked for that are not pain-driven

- [ ] **Font that exists offline.** `index.html:15` loads Be Vietnam Pro from
      `fonts.googleapis.com`; that URL is **not** in `APP_SHELL` and the family is not in
      fontconfig, so offline — and on a fresh install before the first online load — every screen
      falls back to `system-ui`. Self-host a woff2 subset (vietnamese + latin) in `fonts/`, with
      `@font-face` and `font-display: swap`, only the weights the CSS actually references; drop the
      `<link>`; add the files to `APP_SHELL`; bump `CACHE_NAME`. Verify with DevTools offline and a
      cold cache that `document.fonts.check('1em "Be Vietnam Pro"')` is true.
- [ ] **Background pattern.** There is none today, only flat fills. CSS-only (gradient or inline
      SVG data-URI) is preferred so there is no new file to precache. It must leave `#E3E1D6`
      exactly as it is and must not drop text contrast below WCAG AA — measure the worst case
      (muted text over the busiest part), not the average.

## Open question — blocks part of task 1b

**"Giảm số" wants the same treatment as "Tăng tốc, tăng số", but there is no audio for it.**
`content/audio/` has `giam-so.mp3` (8K) and nothing else; there is no `giam-toc-giam-so.mp3` and no
such station, because the real practical test has no giảm counterpart to the tăng tốc tăng số
station. Three ways out, owner's call:

1. Source or record a `giam-toc-giam-so.mp3` and point `[4]` at it. Only this one gives the
   symmetry the request asked for.
2. Leave `[4]` as "Giảm số" with its current audio. Asymmetric with `[3]`, but every label still
   matches what plays.
3. Relabel `[4]` only. Rejected unless the owner insists: the key would announce one thing and play
   another, to someone driving.

## Out of scope

- An instructor area for Đường trường and Bộ tự ghép — the critique's third open question, still
  unanswered. Ask before building.
- Bộ tự ghép's desktop two-column layout breaking on phone (critique P2), its `✕` next to `↓`, and
  its manual save. Real, but the owner did not name it; raise it, do not fold it in.
- `manifest.webmanifest` colours not matching the CSS, and `color-scheme: light dark` declared
  against fixed light colours.
- `content/soundboard.json` has no content validation test, unlike stations and questions. Worth a
  test; not part of this overhaul.
