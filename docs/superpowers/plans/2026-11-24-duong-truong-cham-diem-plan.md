# Đường trường: bàn chấm điểm theo luật — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 12-key road soundboard with a scoring console that runs a road test under TT 12/2025 (until 28/02/2027) or TT 108/2026 (from 01/03/2027), deducts points per the regulation, announces every command and error by voice, and ends with a result sheet.

**Architecture:** Each rule set is a JSON file in `content/rules/`. A pure, Node-testable reducer (`js/road-scoring.js`) derives score and status from an event log, so undo is "drop the last error event". A DOM-only module (`js/road-ui.js`) renders setup, console, result sheet, rules guide and about page from that data. New voice clips live in `content/audio/road/`, rendered with the existing VieNeu Mai Anh pipeline.

**Tech Stack:** Plain ES modules, static JSON/MP3, `node --test`, service-worker PWA. Audio: Python venv `~/Projects/airi-voice` (VieNeu-TTS v3 Turbo), ffmpeg, faster-whisper for the listening check.

**Spec:** `docs/superpowers/specs/2026-11-24-duong-truong-cham-diem-design.md` (read it first). Verbatim rule text: `docs/research/2026-11-24-tt108-phu-luc-iii.md` (TT 108) and `docs/research/nguon/tt12-2025.txt` (TT 12, Phụ lục IV mục C.II, around lines 1741–2204).

## Global Constraints

- No build step, no npm dependencies, no `package.json`; ES modules served as-is (CLAUDE.md).
- Pure logic in testable modules, DOM code separate; tests run with `node --test` (never `node --test test/`).
- Every shipped-file change bumps `CACHE_NAME` in `service-worker.js` (currently `sat-hach-trainer-v51`); new JS/JSON go into `APP_SHELL`; new audio is precached.
- Start score **100**, pass **≥ 80** for both rule sets.
- TT 12 valid through **2027-02-28**; TT 108 from **2027-03-01**. Inclusive boundaries.
- Penalties allowed: 2, 5, 10, or đình chỉ. UI word is **"Đình chỉ sát hạch"**, never "Bị loại" or "truất quyền".
- Every error carries its **verbatim** regulation text and a citation; ambiguous rules carry the label **"Chưa có hướng dẫn chính thức"**.
- One voice for every spoken clip: VieNeu-TTS v3 Turbo preset **Mai Anh**, mono 48 kHz, −19 LUFS, ≥ 350 ms quiet tail. Never overwrite `content/audio/recorded/` or `content/audio/generated-errors/`.
- Look: owner's 2026-11-01 direction (cream ground, white 3D keys, blue/yellow/red road-sign tokens in `style.css`). Read `.impeccable/` before styling.
- App is free, collects no data; persistence is `localStorage` only.
- Disclaimer copy (exact): "Ứng dụng là công cụ tập luyện, không phải phần mềm chấm thi chính thức."

## Review Focus

1. **Double taps in a moving car** — a second tap on a non-"mỗi lần" error in the same bài turn must not deduct again (tests in Task 2).
2. **Undo after đình chỉ** — undoing the suspending error restores the previous status and score; undo after "Kết thúc buổi" does nothing (Task 2).
3. **Exam date exactly on a boundary** (2027-02-28 / 2027-03-01) and a missing/invalid date picks today (Task 2).
4. **Leaving mid-session** (back button, Android back, tab hidden) — confirm prompt, and wake lock re-acquired on `visibilitychange` (Task 4).
5. **A clip that fails to load or play** — points still deducted and the label shown large; no exception (Task 4).

---

### Task 1: Rule data files and data validation tests

**Files:**
- Create: `content/rules/duong-truong-tt12.json`, `content/rules/duong-truong-tt108.json`
- Create: `test/road-rules.test.mjs`

**Interfaces:**
- Produces — rule-set JSON shape (all later tasks rely on these exact keys):
  ```
  { id, document, scope, validFrom: "YYYY-MM-DD"|null, validTo: "YYYY-MM-DD"|null,
    startScore: 100, passMark: 80, minDistanceKm,
    exercises: [{ id, name, label, position: "first"|"last"|"any", conditional: bool,
                  commandAudio, watch, citation, errors: [errorId] }],
    commonErrors: [errorId],
    errors: [{ id, label, official, points: 2|5|10|null, suspend: bool, perOccurrence: bool,
               detectedBy: "device"|"examiner"|"examiner-inferred", citation, audio, say,
               note?: string, manualGearboxOnly?: bool }],
    notices: { suspended, failed, passed, startTimeout } }
  ```
  `points` is `null` exactly when `suspend` is true. Audio paths are relative to `content/audio/` and point into `road/` for new clips (existing files may be reused when `say` matches the old clip's words exactly). `watch` is the plain-language "cần để ý" line built from the exercise's "Yêu cầu đạt được".

- [ ] **Step 1: Write failing tests** in `test/road-rules.test.mjs`, loading both files with `readFileSync`:
  - `mỗi bộ luật có đủ khoá bắt buộc` — every key above present with the right type.
  - `id bài và id lỗi không trùng` — within each file.
  - `mọi id lỗi được tham chiếu đều tồn tại` — exercise `errors` and `commonErrors` resolve.
  - `mức trừ hợp lệ` — `points ∈ {2,5,10}` xor (`suspend === true && points === null`).
  - `mọi lỗi có nguyên văn và trích dẫn` — `official` and `citation` non-empty.
  - `đúng một bài đầu và một bài cuối` — exactly one `first`, one `last`.
  - `hiệu lực không chồng nhau` — TT 12 `validTo === "2027-02-28"`, TT 108 `validFrom === "2027-03-01"`.
  - `TT 12 có 4 bài, TT 108 có 12 bài` and TT 108 exercises 3 and 11 have `conditional: true`.
  - `mọi file âm thanh tồn tại` — every `commandAudio`, error `audio` and notice exists under `content/audio/` (this test is expected to fail until Task 6; mark it with `{ todo: 'audio rendered in Task 6' }` and remove the todo in Task 6).
  - Spot checks pinning values from the spec: TT 12 `quá 30 giây` error is `suspend`; TT 12 "Sử dụng từ tay số 3 trở lên khi tốc độ xe chạy dưới 20 km/h" has `points: 2, perOccurrence: true`; TT 12 "Vi phạm quy tắc giao thông đường bộ" is 10; TT 108 Bài 1 "Không thắt dây an toàn" is 10 with `detectedBy: "device"`; TT 108 Bài 4 chết máy has `perOccurrence: false`, Bài 5 chết máy `perOccurrence: true`.

- [ ] **Step 2: Run** `node --test test/road-rules.test.mjs` — expected FAIL (files missing).

- [ ] **Step 3: Write both JSON files.** Copy names and `official` texts verbatim: TT 12 from `docs/research/nguon/tt12-2025.txt` (C.II.2.2.2 tables; spec §10 is the summary), TT 108 from `docs/research/2026-11-24-tt108-phu-luc-iii.md` §2 (all 12 bài). Decisions fixed here:
  - TT 12 general errors go in `commonErrors`; TT 108 errors are defined **per exercise** with unique ids (e.g. `b4-chet-may`), sharing audio files where the words match.
  - `detectedBy` follows the research tags: `[A]` → `device`, `[SHV]` → `examiner`, `[SHV?]` and `[?]` → `examiner-inferred`.
  - Add `note: "Chưa có hướng dẫn chính thức"` plus a one-line reason on: the "mỗi lượt bài" charging rule (put it on `commonErrors` of TT 12 via each error), TT 108 "Tay số không phù hợp với tốc độ", every gear error (with `manualGearboxOnly: true` for TT 12's 15 m / 100 m / số 3 errors), and the TT 108 Bài 1 −5 vs đình chỉ overlap.
  - TT 12 Kết thúc error text keeps both "số không" and "P" verbatim; the UI picks the label by gearbox (Task 4).
  - `startTimeout` notice and the `quá 30 giây` error exist in both sets (Bài 1 / Xuất phát).
  - Fix the four wrong labels listed in spec §9; do not carry "Vào số sai" over.

- [ ] **Step 4: Run** `node --test` — all pass (the audio test reports as todo).

- [ ] **Step 5: Manual cross-check.** Compare every `points`/`suspend` against the source tables; append a table "lỗi → mức trừ → nguồn → đã kiểm" to `docs/work-log.md` under a new 2026-11-24 heading.

- [ ] **Step 6: Commit** `feat(road): rule data for TT 12/2025 and TT 108/2026`.

---

### Task 2: Scoring engine (pure)

**Files:**
- Create: `js/road-scoring.js`
- Create: `test/road-scoring.test.mjs`

**Interfaces:**
- Consumes: rule-set objects from Task 1.
- Produces:
  - `pickRuleSet(ruleSets: RuleSet[], examDate: string|undefined, today: string): RuleSet` — date `YYYY-MM-DD`; invalid/missing → `today`.
  - `createSession(rules: RuleSet, { hang: "B"|"C1", gearbox: "manual"|"auto", now: number }): Session` — `Session = { rulesId, hang, gearbox, createdAt, events: Event[] }`.
  - `reduce(rules, session, action, now): { session, effects: Effect[] }` — never mutates input. Actions: `{type:"command", exerciseId}`, `{type:"error", errorId}`, `{type:"start-crossed"}`, `{type:"undo"}`, `{type:"finish"}`. Effects: `{type:"play", audio}`, `{type:"notice", kind:"suspended"|"failed"|"passed"|"startTimeout"}`, `{type:"rejected", reason}`, `{type:"already-recorded", errorId}`.
  - `score(rules, session): number`, `status(rules, session): "idle"|"running"|"failed"|"suspended"|"finished"`, `currentExercise(rules, session): Exercise|null`, `availableErrors(rules, session): Error[]` (current exercise's errors, then `commonErrors`; device-detected first, suspending last), `startDeadline(session): number|null` (first command time + 30000 until `start-crossed`), `buildResult(rules, session): Result` (`{ score, passed, status, document, hang, gearbox, createdAt, finishedAt, turns: [{ exerciseId, name, turn, startedAt, errors: [{ id, label, official, points, suspend, citation, at }] }] }`).
- Rules the reducer enforces:
  - `idle` accepts only the `first` exercise command; the `first` exercise cannot be commanded again; any `any` exercise repeats, each command opens a new turn; after the `last` exercise is commanded only errors, undo and `finish` are accepted.
  - Error with `perOccurrence:false` already recorded in the current turn → no event, `already-recorded` effect.
  - `suspend` error → status `suspended`, `notice suspended`; further commands/errors rejected; undo allowed.
  - Score drops below `passMark` → status `failed` once, `notice failed`; commands and errors still accepted (practice continues).
  - `finish` → status `finished` (locks everything incl. undo); `notice passed` if score ≥ passMark and not suspended, otherwise `failed`.
  - `undo` removes the latest `error` event only; status and score are re-derived.

- [ ] **Step 1: Write failing tests** with a small inline fixture rule set plus the real TT 12 file:
  - `pickRuleSet chọn TT 12 ngày 2027-02-28, TT 108 ngày 2027-03-01, ngày sai thì dùng hôm nay`.
  - `chưa xuất phát chỉ nhận lệnh bài đầu`; `bài đầu không ra lệnh lại`; `bài tự do lặp được, mỗi lần là lượt mới`.
  - `trừ đúng điểm` (−5, −10, −2) and `lỗi mỗi lần trừ mỗi lần bấm`.
  - `lỗi không mỗi lần chỉ trừ một lần trong một lượt; lượt sau trừ lại được`.
  - `dưới 80 chuyển failed một lần, vẫn ghi lỗi tiếp`.
  - `lỗi đình chỉ khoá buổi; hoàn tác thì trở lại running với điểm cũ`.
  - `kết thúc khoá cả hoàn tác`; `kết thúc đủ điểm báo passed`.
  - `startDeadline là lệnh đầu + 30000, null sau start-crossed`.
  - `availableErrors xếp lỗi máy bắt trước, đình chỉ cuối`.
  - `buildResult gom lỗi theo lượt bài, không có lỗi đã hoàn tác`.
  - `reduce không sửa session đầu vào` (deep-equal snapshot before/after).

- [ ] **Step 2: Run** `node --test test/road-scoring.test.mjs` — FAIL (module missing).
- [ ] **Step 3: Implement `js/road-scoring.js`** — score and status are folds over `events`; no stored score.
- [ ] **Step 4: Run** `node --test` — all pass.
- [ ] **Step 5: Commit** `feat(road): pure scoring engine with undo and two rule sets`.

---

### Task 3: Session history store (pure)

**Files:**
- Create: `js/road-history.js`, `test/road-history.test.mjs`

**Interfaces:**
- Consumes: `Result` from Task 2.
- Produces: `createHistoryStore(storage): { list(): Result[], add(result: Result): void, remove(createdAt: number): void, clear(): void }` — key `duong-truong-lich-su`, newest first, keeps the latest **30**; corrupted JSON in storage → empty list, no throw. Same storage-injection style as `js/theory-progress.js`.

- [ ] **Step 1: Failing tests:** add/list order, cap at 30, remove by `createdAt`, clear, survives reload (new store, same storage), garbage in storage → `[]`.
- [ ] **Step 2: Run** `node --test test/road-history.test.mjs` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test` — pass.
- [ ] **Step 5: Commit** `feat(road): local session history`.

---

### Task 4: Setup screen, scoring console and result sheet (DOM)

**Files:**
- Create: `js/road-ui.js`
- Modify: `index.html` (replace `view-duong-truong`; add `view-duong-truong-setup`, `view-duong-truong-ket-qua`, `view-duong-truong-lich-su`), `js/app.js` (`VIEWS`, menu button wiring, export/reuse of `playKey`/`stopPlayback`, remove `renderSoundboard`, `soundKey`, `SOUNDBOARD_ZONES`, `soundboard` loading), `style.css`.

**Interfaces:**
- Consumes: Task 1 JSON, Task 2 functions, Task 3 store.
- Produces: `initRoad({ showView, play: (src, label) => Promise<void>, stop: () => void, storage }): { leaveGuard(): boolean }` called from `main()` in `app.js`; `leaveGuard()` returns true when a running session needs confirmation.

Behaviour (spec §5.1–5.4b, §5.7):
- **Setup:** exam date (`<input type="date">`, default today) → shows "Áp dụng {document} ({validity})"; manual override select; hạng B/C1; gearbox Số sàn / Số tự động (gồm xe điện); "Bắt đầu buổi thi"; links to rules guide and history.
- **Console**, top to bottom: sticky status bar (score large, status word, current exercise name, elapsed time); for TT 108 before the start command the Bài 1 pre-check errors; command keys (blue) — only valid ones enabled per `reduce` rules; "cần để ý" line of the current exercise; error keys from `availableErrors` each showing −5/−10/−2/"Đình chỉ" and a small "Máy thật tự bắt" tag when `detectedBy === "device"`; an ⓘ affordance per key opening `official`, points, `citation`, `note`; "Hoàn tác: {label}" button; "Kết thúc buổi".
- After the first command: a 30 s countdown with the big key "Xe đã qua vạch xuất phát" (`start-crossed`); at deadline dispatch the `quá 30 giây` error automatically.
- Effects: `play` → play clip; on load/play failure show the label in a large toast and continue. `already-recorded` → the key flashes "Đã ghi ở lượt này" (no sound, no deduction). `rejected` → short toast with the reason (e.g. "Chưa ra lệnh xuất phát"). On finish, play the passed/failed notice followed by `road/diem-<score>.mp3`. `failed` → dialog "Dừng và xem phiếu" / "Tập tiếp" with the "Chưa có hướng dẫn chính thức" line. `suspended` → announce, then open result sheet (undo still offered on the sheet's header until the user leaves).
- TT 108 "Kết thúc" command asks "Luật mới yêu cầu tối thiểu 5 km. Đã đủ chưa?" before dispatching.
- Gearbox `auto`: TT 12 Kết thúc label says "số P"; errors with `manualGearboxOnly` show the note.
- **Result sheet** (Mẫu số 03 fields): document, hạng, gearbox, date/time, per-turn errors with time and citation, total, ĐẠT/KHÔNG ĐẠT/ĐÌNH CHỈ; saved to history on finish/suspend. **History** view lists results, opens one, deletes one/all.
- Leaving a running session (back buttons, `popstate`) asks "Thoát buổi thi? Kết quả sẽ không được lưu."; wake lock requested on entering the console and re-requested on `visibilitychange` → visible.

- [ ] **Step 1:** Remove the old road soundboard code paths from `app.js` and `index.html`; `node --test` still passes.
- [ ] **Step 2:** Build setup + console + result + history per above.
- [ ] **Step 3: Verify in the browser** at 375×812 (`python3 -m http.server 8080` in repo root): run a TT 12 session (start, cross line, tăng số, two errors, double-tap a non-"mỗi lần" error, undo, kết thúc) and a TT 108 session (pre-check error, Bài 4 twice, suspend via "Không thực hiện theo hiệu lệnh", undo, continue, under-80 dialog, 5 km prompt, finish). Score, status, sheet and history must match the engine rules; no console errors; status bar, commands and device-detected errors of the current bài visible without scrolling.
- [ ] **Step 4: Verify failure paths:** rename one clip temporarily → toast shows, points deducted; reload mid-session → back to setup without crash; back button mid-session → confirm prompt.
- [ ] **Step 5:** Add `js/road-scoring.js`, `js/road-history.js`, `js/road-ui.js`, both rule JSON files to `APP_SHELL`; remove `./content/soundboard.json`; bump `CACHE_NAME`.
- [ ] **Step 6: Commit** `feat(road): scoring console, result sheet and history`.

---

### Task 5: Rules guide and about page generated from data

**Files:**
- Modify: `index.html` (replace the hand-written `view-huong-dan-dt` body with an empty container; add `view-gioi-thieu`), `js/road-ui.js` (`renderRulesGuide(ruleSets)`), `js/app.js` (menu link to Giới thiệu), `style.css`.

**Interfaces:**
- Consumes: Task 1 JSON.
- Produces: guide with two tabs TT 12 / TT 108 (default = rule set for today), per exercise: name, "cần để ý", table of errors (label, points or "Đình chỉ sát hạch", detectedBy tag, note), document + validity at top. About page: rule documents and their dates, "Cập nhật theo văn bản ngày 2026-11-24", the disclaimer copy from Global Constraints, "Ứng dụng không thu thập dữ liệu; mọi thứ lưu trên máy của bạn.", contact via the existing Zalo and Gmail links from the home screen.

- [ ] **Step 1:** Implement both views.
- [ ] **Step 2: Verify in browser:** every error in both JSON files appears once in the guide with the same points as the console; no hard-coded rule text remains in `index.html` (`grep -n "Bị loại\|thắng tay" index.html` → no road-test hits).
- [ ] **Step 3:** Bump `CACHE_NAME`; commit `feat(road): data-driven rules guide and about page`.

---

### Task 6: Voice clips for both rule sets

**Files:**
- Create: `docs/audio-road-voice.json` (manifest: one entry per clip `{ audio: "road/<slug>.mp3", say, group }` plus the same top-level settings keys as `docs/audio-error-voice.json`, with `reference_weight: 0`, `tempo: 0.8`)
- Create: `tools/check-voice.py` (ASR check)
- Modify: `tools/render-error-voice.py` (add `--manifest PATH`; default stays `docs/audio-error-voice.json`)
- Create: `content/audio/road/*.mp3`
- Modify: `test/road-rules.test.mjs` (drop the audio `todo`)

**Interfaces:**
- Consumes: every `commandAudio`, error `audio`/`say` and `notices` path in Task 1 that does not already exist.
- Produces: the MP3 files; `tools/check-voice.py --manifest docs/audio-road-voice.json` prints per clip: ASR text, similarity to `say` (normalised: lowercase, no punctuation), duration, quiet-tail ms, and exits non-zero if any clip has similarity < 0.85 or tail < 350 ms.

- [ ] **Step 1: Ask the owner before installing** (≈ several GB: VieNeu model, faster-whisper model). Then create `~/Projects/airi-voice/.venv` with `vieneu` (the SDK `tools/render-voice.py` imports) and `faster-whisper`; confirm `~/Projects/airi-voice/.venv/bin/python -I -c "from vieneu import Vieneu"` succeeds.
- [ ] **Step 2:** Write the manifest; group 3–6 sentences per synthesis group as the existing pipeline requires (short standalone sentences fail pronunciation). Numbers and units spelled out in `say` ("bốn nghìn vòng một phút", "ba mươi giây"). Final score is read as two clips: the `passed`/`failed` notice, then `road/diem-<n>.mp3` "<n> điểm" for every n from 0 to 100 that the engine can produce (render 0–100; Task 4 plays the notice then the score clip).
- [ ] **Step 3:** Render into a staging dir: `~/Projects/airi-voice/.venv/bin/python -I tools/render-error-voice.py --manifest docs/audio-road-voice.json --output-dir /tmp/road-voice`; align cuts at measured silence centres per CLAUDE.md "Audio tail fix" (ffmpeg `-ss/-t` as input options).
- [ ] **Step 4: Run** `tools/check-voice.py` on the staging dir; re-render failing groups (new seed via `group_seeds`, or `group_texts` with paragraph breaks) until it exits 0.
- [ ] **Step 5:** Copy into `content/audio/road/`; remove the `todo`; `node --test` passes; precache `road/` in `service-worker.js`; bump `CACHE_NAME`.
- [ ] **Step 6:** Build one preview file (all clips in manifest order, 0.6 s gaps) into `~/Projects/sat-hach-audio-preview/road-preview.mp3` and **send it to the owner for approval**. Do not deploy before approval.
- [ ] **Step 7: Commit** `feat(road): Mai Anh voice clips for TT 12 and TT 108`.

---

### Task 7: Docs, cleanup and release check

**Files:**
- Modify: `CLAUDE.md` (Đường trường module description: scoring console, rule files, "12 keys" note replaced by the 2026-11-24 owner decision; README citations TT 12/2025 PL IV C.II + TT 108/2026 PL III; cache number), `README.md` (road section + sources in `docs/research/nguon/`), `docs/work-log.md`.
- Delete: `content/soundboard.json` only if `grep -rn soundboard.json js index.html service-worker.js tools` finds nothing (tools/render-soundboard.sh may still read it — if so, keep the file and note it).

- [ ] **Step 1:** Update docs as above.
- [ ] **Step 2: Release check:** `node --test` all pass; fresh browser profile at 375×812 loads offline after first visit (DevTools offline) and plays a road clip; both rule sets run end to end once more.
- [ ] **Step 3: Commit** `docs(road): document scoring console and rule sources`. Deploy (`vercel deploy --prod`) and Android rebuild only when the owner asks.
