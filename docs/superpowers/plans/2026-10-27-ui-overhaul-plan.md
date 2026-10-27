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
2. **Car mode for Đường trường.** Its own entry from the home screen, designed for the passenger
   who calls the stations out while someone else drives.

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

The owner wants to see each change on screen, not read a diff. What actually works, found by
trying it on 2026-10-27:

```sh
npx --yes live-server --port=8080 --no-browser --quiet .
chromium --ozone-platform=wayland --window-size=412,915 --app="http://localhost:8080"
```

`live-server` injects an inline reload script, so every file write lands in that window with no
refresh — which is what "watch it live" needs, and plain `npx serve` does not do. Chromium needs
`--ozone-platform=wayland` under GNOME here or it picks the X11 backend and exits with "Missing X
server or $DISPLAY". The window size approximates a Pixel 5; keep it, because the critique's P2 is
a desktop-only two-column layout and this is a phone app.

**Not the cua computer-use stack, and not for the reason first written here.** Measured: a Chromium
window comes back `accessibility_window_identity_unproven` even on GNOME, where a GTK app does not,
so no element tokens. Reading a page through AT-SPI also gives no DOM, no selectors and no device
emulation. Playwright is the right driver for a web page. (The earlier claim that cua's browser
routes are "read-only on GNOME/Wayland" was repeated from the platform matrix, not measured here.)

A `playwright-headed` MCP server was registered for this, but a newly registered MCP server is not
loadable into a running Claude Code session — `/mcp` only re-attaches servers that were already
there. Hence the Chromium-plus-live-server setup above for the owner's eyes, and the headless
`playwright` MCP for the agent's own verification.

## Global constraints

- **Bump `CACHE_NAME`** (`sat-hach-trainer-vN`) in `service-worker.js` for every task that changes
  a shipped file, and add new files to `APP_SHELL`. Otherwise installed clients keep the old
  version and the change looks like it never happened. This is the easiest way to ship nothing.
- **Offline first.** Anything the UI depends on is a local file in `APP_SHELL`. A CDN reference is
  a bug (task 1 is exactly that bug).
- `node --test` must pass before and after each task — **bare, no path**. `node --test test/` is
  broken on Node 24 and fails with `MODULE_NOT_FOUND`, which reads as a real bug and is not one.
  28 tests, green as of 2026-10-27.
- Colour must never be the only signal. Three of the findings below are colour-only failures.
- UI copy is Vietnamese; keep the domain wording (hạng B / C1, điểm liệt, sa hình, đường trường).
- No new runtime dependency. Fonts, patterns and transitions ship as local files or CSS.

## Tasks

### 1. Car mode for Đường trường

**The usage scene, from the owner on 2026-10-27 — this corrects what the rest of this task
originally assumed.** The person pressing is **the passenger, not the driver**. The phone is a
speaker: it sits loose and nobody is steering while touching it. So car mode is not a blind-press
pad with giant keys — it is the passenger's announcement panel. They do look at the screen when
they press, so full labels are right and twelve keys at once is fine.

That moves the risk. It is not "a mis-press while holding the wheel"; it is **hunting for the
right key under time pressure** and **announcing a fault by accident**. Hence the owner's third
answer: **separate zones** — commands (Xuất phát, Tăng số/Giảm số, Kết thúc) apart from the six
red fault calls, with Dừng apart from both. And the wake lock matters *more* than first thought,
because nothing touches the screen between presses.

Audio is the output that matters. The screen exists to let one person find one key fast.

What is actually left after the merged PRs:

- `index.html:43` puts `<button class="btn-back">← Quay lại</button>` as the **first element of the
  section**, a muted text link immediately above the keys. With a passenger pressing this is less
  about a steering-wheel mis-press and more that the way out looks like nothing and sits where a
  hurried hand sweeps. The critique's "Back adjacent" finding survives, for a different reason.
- `<h2>Đường trường</h2>` still takes a row that the keys could use.
- **Playing state collides with a key colour, verified:** `content/soundboard.json` has
  `color: "yellow"` on 2 of 11 keys ("Ting tong", "Tút"), and `#soundboard .tile.playing` paints
  `background: var(--yellow)`. Those two keys look like they are playing at rest, and when they
  really play they differ only by `border-color`. Colour-only, and ambiguous.

- [x] Add a car-mode entry on the home screen, distinct from the sa hình / lý thuyết tiles — it is
      a mode, not a menu item. It is pressed by whoever is riding along, so it has to be findable by
      someone who did not set the app up and is being handed the phone.
- [x] Inside car mode: the three zones get the screen. The `<h2>` goes only if the zones read without
      it. The way out stops being an unlabelled muted link flush against the first key — finding the
      right key fast is the bar, not key size for its own sake.
- [x] Replace the playing state with something that is not a palette colour and not colour-only
      (motion, a mark, a border treatment — `impeccable`'s call). It must be unmistakable on a
      `yellow` key.
- [x] Verify in the Pixel 5 viewport: every key plus the way out, no scrolling, and tap targets
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

## Where this stopped, 2026-10-27 night

Task 1 is done and committed (`c1438d5`). Task 1b shipped the Kết thúc key and the two gear
calls, and the whole soundboard was re-rendered twice for speaking rate: 1.15 first, then
**1.4** after the owner heard the full set played back through the car speaker and still
found it fast. 1.4 is what `tools/render-soundboard.sh` holds now, and the durations moved
properly at that value (tăng số 1.11 → 1.30s) unlike at 1.15.

**One decision is open: a female voice for the Kết thúc key.** The owner asked for it, which
deliberately breaks the one-voice rule this soundboard was just unified around — Kết thúc is
a different kind of event from the eleven calls, so a different voice is a signal rather than
an inconsistency. Do not "fix" it back.

Progress on that: `vi_VN-vivos-x_low` is the only multi-speaker Vietnamese piper voice (65
speakers) and its config carries no gender metadata. Seven speakers sampled blind (0, 9, 19,
29, 39, 49, 59) were all rejected. Every one of the 65 was then rendered and measured with
`aubiopitch`; the eight highest were 10, 3, 1, 13, 32, 4, 26, 21 (308–374 Hz) and were played
for the owner — that is where the session ended, with no pick made. Note the measured range
is high even for female speech, so treat the ranking as a shortlist, not a diagnosis: it is an
x_low model on a 0.3–0.8s word, and the estimator may be catching harmonics.

If none of the eight work, the conclusion is that this model has no usable female voice, and
the remaining routes are a one-off online TTS render or asking a person to say two words.

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
