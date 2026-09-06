# Module thi thử lý thuyết — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Lý thuyết" (theory mock-exam) feature to the existing sat-hach-trainer
PWA: pick hạng B or C1, get a randomly generated exam that mirrors the real exam's
mechanics (stratified draw guaranteeing exactly 1 điểm liệt question), take it with a
countdown timer, and see a pass/fail result.

**Architecture:** Same static PWA, vanilla JS, no framework, no backend — matches the
existing sa hình module exactly. Pure exam logic (`js/theory.js`) is separated from DOM
wiring (`js/theory-ui.js`) so the scoring/generation logic is unit-testable without a
browser, mirroring how `js/playlist.js` is separated from `js/app.js` today. Ships
against a 40-question placeholder bank now; the real 600-question bank (still pending
source selection per the spec) is a pure content swap later — no code changes.

**Tech Stack:** Vanilla JS (ES modules), `node --test` for unit tests, existing
service-worker cache-first PWA setup.

**Spec:** `docs/superpowers/specs/2026-09-06-ly-thuyet-mvp-design.md`

## Global Constraints

- No backend, no database, no accounts/login (spec: "Không backend, không database,
  không tài khoản").
- No paywall/payment in this MVP (spec: "miễn phí toàn bộ, chưa làm paywall/tài
  khoản").
- No framework — plain ES modules, matching the rest of the codebase.
- Question `id` must be a stable key independent of scrape/array order (spec uses
  `q001`–`q600` for the real bank; placeholder data here uses the same `qNNN` shape so
  the swap-in later is a pure data replacement).
- `is_liet` is data, not code logic — the exam algorithm must treat it as an opaque
  flag, never hardcode which ids are điểm liệt.
- Exam generation must be stratified (1 câu điểm liệt + N-1 câu thường), never uniform
  random over the whole bank — see spec's "Thuật toán sinh đề" section.
- Real 600-question content, scraping, and image QA are explicitly out of scope for
  this plan (spec: "Việc còn mở (chặn nội dung thật, không chặn code)") — this plan
  only ships code + placeholder data.

---

### Task 1: Pure exam logic (`js/theory.js`)

**Files:**
- Create: `js/theory.js`
- Test: `test/theory.test.mjs`

**Interfaces:**
- Consumes: nothing (pure module, no imports from the rest of the app).
- Produces (used by later tasks):
  - `generateExam(questions: Question[], config: {count, minutes, passScore}) -> Question[]`
    — throws `Error` if the bank has no điểm liệt question, or fewer than
    `count - 1` non-điểm liệt questions.
  - `gradeExam(examQuestions: Question[], answers: Record<id, choiceIndex>, config: {count, minutes, passScore}) -> {correct: number, total: number, lietWrong: boolean, pass: boolean}`
  - `validateQuestionIds(questions: Question[]) -> string[]` (duplicate ids)
  - `validateAnswerIndices(questions: Question[]) -> string[]` (ids whose `answer` is
    not a valid index into `choices`)
  - `Question` shape: `{ id: string, text: string, choices: string[], answer: number, is_liet: boolean, chapter: string, image: string|null }`

- [ ] **Step 1: Write the failing tests**

Create `test/theory.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExam, gradeExam, validateQuestionIds, validateAnswerIndices } from '../js/theory.js';

const sampleQuestions = [
  { id: 'q1', text: 'Q1', choices: ['a', 'b'], answer: 0, is_liet: false, chapter: 'x', image: null },
  { id: 'q2', text: 'Q2', choices: ['a', 'b'], answer: 1, is_liet: false, chapter: 'x', image: null },
  { id: 'q3', text: 'Q3', choices: ['a', 'b'], answer: 0, is_liet: false, chapter: 'x', image: null },
  { id: 'q4', text: 'Q4', choices: ['a', 'b', 'c'], answer: 2, is_liet: true, chapter: 'x', image: null },
  { id: 'q5', text: 'Q5', choices: ['a', 'b'], answer: 1, is_liet: true, chapter: 'x', image: null },
];

test('generateExam trả đúng số câu, đúng 1 câu điểm liệt, không trùng id (chạy nhiều lần)', () => {
  const config = { count: 3, minutes: 10, passScore: 2 };
  for (let i = 0; i < 30; i++) {
    const exam = generateExam(sampleQuestions, config);
    assert.equal(exam.length, 3);
    assert.equal(exam.filter((q) => q.is_liet).length, 1);
    assert.equal(new Set(exam.map((q) => q.id)).size, 3);
  }
});

test('generateExam báo lỗi khi không có câu điểm liệt nào', () => {
  const noLiet = sampleQuestions.filter((q) => !q.is_liet);
  assert.throws(() => generateExam(noLiet, { count: 2, minutes: 1, passScore: 1 }), /điểm liệt/);
});

test('generateExam báo lỗi khi không đủ câu thường', () => {
  const config = { count: 10, minutes: 1, passScore: 1 };
  assert.throws(() => generateExam(sampleQuestions, config), /câu thường/);
});

test('gradeExam: đủ điểm và đúng hết điểm liệt -> Đậu', () => {
  const exam = [sampleQuestions[0], sampleQuestions[3]];
  const answers = { q1: 0, q4: 2 };
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 2 });
  assert.deepEqual(result, { correct: 2, total: 2, lietWrong: false, pass: true });
});

test('gradeExam: đủ điểm nhưng sai câu điểm liệt -> Rớt', () => {
  const exam = [sampleQuestions[0], sampleQuestions[3]];
  const answers = { q1: 0, q4: 0 };
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 1 });
  assert.equal(result.lietWrong, true);
  assert.equal(result.pass, false);
});

test('gradeExam: đúng hết điểm liệt nhưng thiếu điểm -> Rớt', () => {
  const exam = [sampleQuestions[0], sampleQuestions[1], sampleQuestions[3]];
  const answers = { q1: 1, q2: 0, q4: 2 };
  const result = gradeExam(exam, answers, { count: 3, minutes: 1, passScore: 3 });
  assert.equal(result.correct, 1);
  assert.equal(result.lietWrong, false);
  assert.equal(result.pass, false);
});

test('gradeExam: câu chưa trả lời tính là sai', () => {
  const exam = [sampleQuestions[0], sampleQuestions[3]];
  const answers = { q4: 2 };
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 2 });
  assert.equal(result.correct, 1);
  assert.equal(result.pass, false);
});

test('validateQuestionIds phát hiện id trùng', () => {
  const dup = [...sampleQuestions, { ...sampleQuestions[0] }];
  assert.deepEqual(validateQuestionIds(dup), ['q1']);
});

test('validateAnswerIndices phát hiện answer ngoài phạm vi choices', () => {
  const bad = [{ id: 'qx', text: '', choices: ['a', 'b'], answer: 5, is_liet: false, chapter: '', image: null }];
  assert.deepEqual(validateAnswerIndices(bad), ['qx']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/theory.test.mjs`
Expected: FAIL — `js/theory.js` does not exist yet (module not found).

- [ ] **Step 3: Write the implementation**

Create `js/theory.js`:

```js
function pickRandom(pool, n) {
  const copy = [...pool];
  const picked = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return picked;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateExam(questions, config) {
  const lietPool = questions.filter((q) => q.is_liet);
  const normalPool = questions.filter((q) => !q.is_liet);
  if (lietPool.length < 1) {
    throw new Error('Không có câu điểm liệt nào trong ngân hàng câu hỏi.');
  }
  if (normalPool.length < config.count - 1) {
    throw new Error(`Không đủ câu thường (cần ${config.count - 1}, có ${normalPool.length}).`);
  }
  const liet = pickRandom(lietPool, 1);
  const normal = pickRandom(normalPool, config.count - 1);
  return shuffle([...liet, ...normal]);
}

export function gradeExam(examQuestions, answers, config) {
  const correct = examQuestions.filter((q) => answers[q.id] === q.answer).length;
  const lietWrong = examQuestions.some((q) => q.is_liet && answers[q.id] !== q.answer);
  const pass = !lietWrong && correct >= config.passScore;
  return { correct, total: examQuestions.length, lietWrong, pass };
}

export function validateQuestionIds(questions) {
  const seen = new Set();
  const dupes = [];
  for (const q of questions) {
    if (seen.has(q.id)) dupes.push(q.id);
    seen.add(q.id);
  }
  return dupes;
}

export function validateAnswerIndices(questions) {
  return questions
    .filter((q) => !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length)
    .map((q) => q.id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/theory.test.mjs`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add js/theory.js test/theory.test.mjs
git commit -m "feat: sinh đề + chấm điểm lý thuyết (phân tầng điểm liệt)"
```

---

### Task 2: Placeholder question bank

**Files:**
- Create: `js/theory-config.js`
- Create: `content/theory/questions.json`
- Modify: `test/theory.test.mjs` (add content-validation tests)

**Interfaces:**
- Consumes: `validateQuestionIds`, `validateAnswerIndices`, `generateExam` from
  `js/theory.js` (Task 1).
- Produces: `HANG_CONFIG: { B: {count:30, minutes:20, passScore:27}, C1: {count:35, minutes:22, passScore:32} }`
  (used by Task 3's UI), and `content/theory/questions.json` (used by Task 3's UI and
  Task 4's service worker).

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `test/theory.test.mjs` (also add the two new imports at the top —
change the existing import line to
`import { generateExam, gradeExam, validateQuestionIds, validateAnswerIndices } from '../js/theory.js';`
plus these new lines right after it):

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HANG_CONFIG } from '../js/theory-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const questions = JSON.parse(readFileSync(join(__dirname, '../content/theory/questions.json'), 'utf8'));
```

Then append these tests at the end of the file:

```js
test('content/theory/questions.json không có id trùng', () => {
  assert.deepEqual(validateQuestionIds(questions), []);
});

test('content/theory/questions.json mọi câu có answer hợp lệ trong choices', () => {
  assert.deepEqual(validateAnswerIndices(questions), []);
});

test('content/theory/questions.json đủ câu điểm liệt/câu thường cho cả 2 hạng', () => {
  const liet = questions.filter((q) => q.is_liet).length;
  const normal = questions.length - liet;
  assert.ok(liet >= 1, 'cần ít nhất 1 câu điểm liệt');
  assert.ok(normal >= HANG_CONFIG.C1.count - 1, `cần ít nhất ${HANG_CONFIG.C1.count - 1} câu thường cho hạng C1`);
});

test('generateExam sinh được đề hợp lệ cho cả 2 hạng từ data thật', () => {
  for (const key of Object.keys(HANG_CONFIG)) {
    const exam = generateExam(questions, HANG_CONFIG[key]);
    assert.equal(exam.length, HANG_CONFIG[key].count);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/theory.test.mjs`
Expected: FAIL — `js/theory-config.js` and `content/theory/questions.json` don't exist.

- [ ] **Step 3: Create the config and placeholder data**

Create `js/theory-config.js`:

```js
export const HANG_CONFIG = {
  B: { count: 30, minutes: 20, passScore: 27 },
  C1: { count: 35, minutes: 22, passScore: 32 },
};
```

Create `content/theory/questions.json` — 40 placeholder questions (4 flagged
`is_liet`), clearly marked `[Mẫu]` so nobody mistakes them for real exam content:

```json
[
  { "id": "q001", "text": "[Mẫu] Câu hỏi thử số 1 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q002", "text": "[Mẫu] Câu hỏi thử số 2 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q003", "text": "[Mẫu] Câu hỏi thử số 3 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q004", "text": "[Mẫu] Câu hỏi thử số 4 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": true, "chapter": "mau", "image": null },
  { "id": "q005", "text": "[Mẫu] Câu hỏi thử số 5 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q006", "text": "[Mẫu] Câu hỏi thử số 6 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q007", "text": "[Mẫu] Câu hỏi thử số 7 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q008", "text": "[Mẫu] Câu hỏi thử số 8 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q009", "text": "[Mẫu] Câu hỏi thử số 9 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q010", "text": "[Mẫu] Câu hỏi thử số 10 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q011", "text": "[Mẫu] Câu hỏi thử số 11 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q012", "text": "[Mẫu] Câu hỏi thử số 12 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q013", "text": "[Mẫu] Câu hỏi thử số 13 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q014", "text": "[Mẫu] Câu hỏi thử số 14 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": true, "chapter": "mau", "image": null },
  { "id": "q015", "text": "[Mẫu] Câu hỏi thử số 15 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q016", "text": "[Mẫu] Câu hỏi thử số 16 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q017", "text": "[Mẫu] Câu hỏi thử số 17 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q018", "text": "[Mẫu] Câu hỏi thử số 18 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q019", "text": "[Mẫu] Câu hỏi thử số 19 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q020", "text": "[Mẫu] Câu hỏi thử số 20 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q021", "text": "[Mẫu] Câu hỏi thử số 21 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q022", "text": "[Mẫu] Câu hỏi thử số 22 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q023", "text": "[Mẫu] Câu hỏi thử số 23 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q024", "text": "[Mẫu] Câu hỏi thử số 24 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 1, "is_liet": true, "chapter": "mau", "image": null },
  { "id": "q025", "text": "[Mẫu] Câu hỏi thử số 25 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q026", "text": "[Mẫu] Câu hỏi thử số 26 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q027", "text": "[Mẫu] Câu hỏi thử số 27 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q028", "text": "[Mẫu] Câu hỏi thử số 28 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q029", "text": "[Mẫu] Câu hỏi thử số 29 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q030", "text": "[Mẫu] Câu hỏi thử số 30 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q031", "text": "[Mẫu] Câu hỏi thử số 31 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q032", "text": "[Mẫu] Câu hỏi thử số 32 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q033", "text": "[Mẫu] Câu hỏi thử số 33 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q034", "text": "[Mẫu] Câu hỏi thử số 34 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": true, "chapter": "mau", "image": null },
  { "id": "q035", "text": "[Mẫu] Câu hỏi thử số 35 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q036", "text": "[Mẫu] Câu hỏi thử số 36 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q037", "text": "[Mẫu] Câu hỏi thử số 37 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q038", "text": "[Mẫu] Câu hỏi thử số 38 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q039", "text": "[Mẫu] Câu hỏi thử số 39 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B", "Đáp án C"], "answer": 0, "is_liet": false, "chapter": "mau", "image": null },
  { "id": "q040", "text": "[Mẫu] Câu hỏi thử số 40 — chọn đáp án đúng.", "choices": ["Đáp án A", "Đáp án B"], "answer": 1, "is_liet": false, "chapter": "mau", "image": null }
]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/theory.test.mjs`
Expected: PASS (14 tests total).

- [ ] **Step 5: Run the full test suite**

Run: `node --test test/`
Expected: PASS (all tests across both `playlist.test.mjs` and `theory.test.mjs`).

- [ ] **Step 6: Commit**

```bash
git add js/theory-config.js content/theory/questions.json test/theory.test.mjs
git commit -m "feat: bộ câu hỏi lý thuyết placeholder (40 câu mẫu) + cấu hình hạng B/C1"
```

---

### Task 3: Exam UI + wiring into the app

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Create: `js/theory-ui.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `generateExam`, `gradeExam` from `js/theory.js` (Task 1); `HANG_CONFIG`
  from `js/theory-config.js` (Task 2); `content/theory/questions.json` (Task 2,
  fetched by `app.js`).
- Produces: `initTheory(questions: Question[], ctx: {showView: (view:string)=>void, setStatus: (text:string)=>void}) -> {cancelTimer: () => void}`
  — the `cancelTimer` return value is called by `app.js`'s existing `.btn-back`
  handler so leaving the exam view mid-countdown doesn't leave a stray timer running.

No automated test for this task (DOM wiring, same as the rest of `app.js` — the
project's existing pattern tests pure logic only, not DOM). Manual test at the end.

- [ ] **Step 1: Add markup to `index.html`**

Add a third button inside the existing `<section id="menu">` (after the
`btn-bo-tu-ghep` button):

```html
      <button id="btn-ly-thuyet" type="button">Lý thuyết</button>
```

Add three new `<section>` blocks after the closing `</section>` of
`id="view-bo-tu-ghep"`, before `<p id="status" role="status"></p>`:

```html
    <section id="view-theory-menu" hidden>
      <h2>Thi thử lý thuyết</h2>
      <button id="btn-hang-b" type="button">Hạng B (30 câu / 20 phút)</button>
      <button id="btn-hang-c1" type="button">Hạng C1 (35 câu / 22 phút)</button>
      <button class="btn-back" type="button">← Quay lại</button>
    </section>

    <section id="view-theory-exam" hidden>
      <h2>Đang làm bài</h2>
      <p id="theory-timer" role="status"></p>
      <ol id="theory-questions"></ol>
      <button id="theory-submit" type="button">Nộp bài</button>
      <button class="btn-back" type="button">← Quay lại</button>
    </section>

    <section id="view-theory-result" hidden>
      <h2>Kết quả</h2>
      <p id="theory-result-summary"></p>
      <button id="theory-retry" type="button">Thi lại</button>
      <button class="btn-back" type="button">← Quay lại</button>
    </section>
```

- [ ] **Step 2: Add minimal styling to `style.css`**

Append:

```css
#theory-questions > li {
  margin-bottom: 1rem;
}

#theory-questions label {
  display: block;
  margin: 0.25rem 0;
}

#theory-timer {
  font-weight: bold;
}
```

- [ ] **Step 3: Create `js/theory-ui.js`**

```js
import { generateExam, gradeExam } from './theory.js';
import { HANG_CONFIG } from './theory-config.js';

const state = { hangKey: null, exam: [], answers: {}, secondsLeft: 0, timerId: null };

export function initTheory(questions, { showView, setStatus }) {
  const els = {
    timer: document.getElementById('theory-timer'),
    questions: document.getElementById('theory-questions'),
    resultSummary: document.getElementById('theory-result-summary'),
  };

  function renderExam(exam) {
    els.questions.innerHTML = '';
    exam.forEach((q) => {
      const li = document.createElement('li');
      const p = document.createElement('p');
      p.textContent = q.text;
      li.appendChild(p);
      if (q.image) {
        const img = document.createElement('img');
        img.src = `content/theory/images/${q.image}`;
        img.alt = q.text;
        li.appendChild(img);
      }
      q.choices.forEach((choice, choiceIndex) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `q-${q.id}`;
        input.value = String(choiceIndex);
        input.addEventListener('change', () => {
          state.answers[q.id] = choiceIndex;
        });
        label.appendChild(input);
        label.append(` ${choice}`);
        li.appendChild(label);
      });
      els.questions.appendChild(li);
    });
  }

  function updateTimerDisplay() {
    const secs = Math.max(state.secondsLeft, 0);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    els.timer.textContent = `Thời gian còn lại: ${m}:${String(s).padStart(2, '0')}`;
  }

  function cancelTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function startTimer() {
    cancelTimer();
    updateTimerDisplay();
    state.timerId = setInterval(() => {
      state.secondsLeft -= 1;
      updateTimerDisplay();
      if (state.secondsLeft <= 0) {
        submitExam();
      }
    }, 1000);
  }

  function startExam(hangKey) {
    const config = HANG_CONFIG[hangKey];
    let exam;
    try {
      exam = generateExam(questions, config);
    } catch (err) {
      setStatus(`Lỗi sinh đề: ${err.message}`);
      return;
    }
    state.hangKey = hangKey;
    state.exam = exam;
    state.answers = {};
    state.secondsLeft = config.minutes * 60;
    renderExam(exam);
    startTimer();
    showView('theory-exam');
  }

  function submitExam() {
    cancelTimer();
    const config = HANG_CONFIG[state.hangKey];
    const result = gradeExam(state.exam, state.answers, config);
    els.resultSummary.textContent =
      `Đúng ${result.correct}/${result.total}` +
      (result.lietWrong ? ' — sai câu điểm liệt' : '') +
      ` — ${result.pass ? 'ĐẬU' : 'RỚT'}`;
    showView('theory-result');
  }

  document.getElementById('btn-hang-b').addEventListener('click', () => startExam('B'));
  document.getElementById('btn-hang-c1').addEventListener('click', () => startExam('C1'));
  document.getElementById('theory-submit').addEventListener('click', () => submitExam());
  document.getElementById('theory-retry').addEventListener('click', () => showView('theory-menu'));

  return { cancelTimer };
}
```

- [ ] **Step 4: Wire it into `js/app.js`**

Modify the import line at the top of `js/app.js` (currently
`import { buildPlaylist } from './playlist.js';`) to also import `initTheory`:

```js
import { buildPlaylist } from './playlist.js';
import { initTheory } from './theory-ui.js';
```

Replace the `els` object (currently lines 5-14) — drop `menu`, `viewBoChuan`,
`viewBoTuGhep` (no longer needed once `showView` is table-driven below) and keep the
rest:

```js
const els = {
  listBoChuan: document.getElementById('list-bo-chuan'),
  listStations: document.getElementById('list-stations'),
  listSelected: document.getElementById('list-selected'),
  status: document.getElementById('status'),
  player: document.getElementById('player'),
};
```

Add a module-level variable near `let stations = [];` (around line 16):

```js
let theoryQuestions = [];
let theoryHandle = { cancelTimer: () => {} };
```

Modify `loadContent()` (currently lines 21-28) to also fetch the theory questions:

```js
async function loadContent() {
  const [stationsRes, standardRes, theoryRes] = await Promise.all([
    fetch('content/stations.json'),
    fetch('content/standard-set.json'),
    fetch('content/theory/questions.json'),
  ]);
  stations = await stationsRes.json();
  standardSet = await standardRes.json();
  theoryQuestions = await theoryRes.json();
}
```

Replace `showView` (currently lines 52-56) with a table-driven version that covers
the new views without hand-maintaining a hidden-flag per element:

```js
const VIEWS = ['menu', 'bo-chuan', 'bo-tu-ghep', 'theory-menu', 'theory-exam', 'theory-result'];

function showView(view) {
  VIEWS.forEach((v) => {
    const elId = v === 'menu' ? 'menu' : `view-${v}`;
    document.getElementById(elId).hidden = v !== view;
  });
}
```

In `main()` (currently lines 186-209), add the theory button wiring and `initTheory`
call, and make the `.btn-back` handler cancel the theory timer too. Replace the whole
function body with:

```js
async function main() {
  await loadContent();
  renderList(els.listBoChuan, standardSet);
  renderStationsPicker();
  renderList(els.listSelected, selected, { removable: true });
  theoryHandle = initTheory(theoryQuestions, { showView, setStatus });

  document.getElementById('btn-bo-chuan').addEventListener('click', () => showView('bo-chuan'));
  document.getElementById('btn-bo-tu-ghep').addEventListener('click', () => showView('bo-tu-ghep'));
  document.getElementById('btn-ly-thuyet').addEventListener('click', () => showView('theory-menu'));
  document.querySelectorAll('.btn-back').forEach((b) =>
    b.addEventListener('click', () => {
      stopPlayback();
      theoryHandle.cancelTimer();
      showView('menu');
    }),
  );

  document.getElementById('play-bo-chuan').addEventListener('click', () => playPlaylist(standardSet));
  document.getElementById('stop-bo-chuan').addEventListener('click', () => stopPlayback('Đã dừng.'));
  document.getElementById('save-bo-tu-ghep').addEventListener('click', saveSelected);
  document.getElementById('play-bo-tu-ghep').addEventListener('click', () => playPlaylist(selected));
  document.getElementById('stop-bo-tu-ghep').addEventListener('click', () => stopPlayback('Đã dừng.'));

  showView('menu');
  registerServiceWorker();
}
```

- [ ] **Step 5: Run the automated test suite (regression check)**

Run: `node --test test/`
Expected: PASS — this task touches no logic covered by existing tests, this just
confirms nothing broke.

- [ ] **Step 6: Manual test in a browser**

```bash
npx serve .
```

Open the served URL, click "Lý thuyết" → "Hạng B (30 câu / 20 phút)". Confirm: 30
questions render, each with radio choices; the timer counts down from 20:00; clicking
an answer selects it; "Nộp bài" shows a result with "Đúng X/30" and ĐẬU/RỚT; "Thi lại"
returns to the hạng-select screen; "← Quay lại" from the exam screen returns to the
main menu. Repeat for "Hạng C1" (35 câu / 22 phút).

- [ ] **Step 7: Commit**

```bash
git add index.html style.css js/theory-ui.js js/app.js
git commit -m "feat: UI thi thử lý thuyết (chọn hạng, làm bài có đếm giờ, kết quả)"
```

---

### Task 4: Offline caching for the theory module

**Files:**
- Modify: `service-worker.js`

**Interfaces:**
- Consumes: the list of new static assets from Tasks 2-3
  (`js/theory.js`, `js/theory-config.js`, `js/theory-ui.js`,
  `content/theory/questions.json`) and the `image` field of each question object (for
  future real content — currently all `null` in the placeholder bank, so this adds no
  URLs yet, but the code path is exercised once real images land).

- [ ] **Step 1: Bump the cache version and extend the app shell**

Modify `service-worker.js`. Change line 1 from `'sat-hach-trainer-v1'` to
`'sat-hach-trainer-v2'`, and add the new files to `APP_SHELL` (after
`'./js/playlist.js'`):

```js
const CACHE_NAME = 'sat-hach-trainer-v2';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/playlist.js',
  './js/theory.js',
  './js/theory-config.js',
  './js/theory-ui.js',
  './manifest.webmanifest',
  './content/stations.json',
  './content/standard-set.json',
  './content/theory/questions.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
```

- [ ] **Step 2: Cache theory question images alongside station audio**

Modify the `install` handler to also fetch `questions.json` and cache any image URLs
it references, the same way it already does for station audio:

```js
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      const stations = await (await fetch('./content/stations.json')).json();
      const audioUrls = stations.map((s) => `./content/audio/${s.audio}`);
      await cache.addAll(audioUrls);
      const questions = await (await fetch('./content/theory/questions.json')).json();
      const imageUrls = questions.filter((q) => q.image).map((q) => `./content/theory/images/${q.image}`);
      await cache.addAll(imageUrls);
    })(),
  );
  self.skipWaiting();
});
```

- [ ] **Step 3: Manual test**

```bash
npx serve .
```

Open the app in a browser, let it load once (registers the service worker). Open dev
tools → Application → Service Workers, confirm `sat-hach-trainer-v2` is active and the
old `v1` cache is gone. Turn off network (or dev tools "Offline" throttling), reload —
confirm both "Sa hình" and "Lý thuyết" still work fully offline.

- [ ] **Step 4: Commit**

```bash
git add service-worker.js
git commit -m "feat: cache offline cho module lý thuyết (bump CACHE_NAME v2)"
```

---

### Task 5: Document the placeholder → real content swap-in

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a section documenting the swap-in steps**

Add this section to `README.md`, right after the existing "Thay audio placeholder
bằng nội dung thật" section:

```markdown
## Thay bộ câu hỏi lý thuyết placeholder bằng 600 câu thật

`content/theory/questions.json` hiện là 40 câu mẫu (`[Mẫu] ...`) để app chạy được
trước khi có nội dung thật — xem
`docs/superpowers/specs/2026-09-06-ly-thuyet-mvp-design.md` mục "Việc còn mở" (chọn
nguồn cào, cào 600 câu, QA ảnh) trước khi thay. Khi đã có data thật đã qua QA:

1. Đè `content/theory/questions.json` bằng 600 câu thật, giữ đúng `id` theo số câu
   chính thức (`q001`–`q600`) và đúng shape hiện có (`text`, `choices`, `answer`,
   `is_liet`, `chapter`, `image`).
2. Đặt ảnh biển báo/sa hình vào `content/theory/images/`, tên file khớp field `image`
   của từng câu.
3. Tăng số version `CACHE_NAME` trong `service-worker.js` (vd `v2` → `v3`) để trình
   duyệt tải nội dung mới thay vì dùng bản cache cũ.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: hướng dẫn thay data lý thuyết placeholder bằng nội dung thật"
```
