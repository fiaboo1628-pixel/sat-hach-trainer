# Module âm thanh sa hình MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA tĩnh cho phép phát lại tuần tự hiệu lệnh sa hình theo Bộ chuẩn (13 bài,
thứ tự cố định) hoặc Bộ tự ghép (người dùng tự chọn/sắp xếp/lặp bài, lưu local), chạy
offline sau lần tải đầu.

**Architecture:** Không backend. Content tĩnh (`content/*.json` + `content/audio/*.mp3`)
+ HTML/CSS/vanilla JS ES module + service worker cache-first. Bộ tự ghép lưu vào
`localStorage`.

**Tech Stack:** HTML, CSS, JavaScript ES modules (không framework, không build step),
Node.js `node:test` (built-in, cho unit test logic thuần), ffmpeg (sinh audio/icon
placeholder), nginx (host, việc deploy thật để riêng ở README).

**Spec:** `docs/superpowers/specs/2026-09-02-audio-sa-hinh-mvp-design.md`

## Global Constraints

- Không tài khoản, không thanh toán, không backend/database ở MVP này.
- Bộ tự ghép chỉ 1 bộ, không đặt tên, ghi đè mỗi lần lưu.
- Nội dung audio thật (text hiệu lệnh, tín hiệu ting-tong/tút) chưa có — dùng
  placeholder (beep) để code chạy được, thay sau không cần sửa code (chỉ đè file mp3).
- Lỗi audio/localStorage không được làm crash app — luôn có đường lùi (bỏ qua bài lỗi,
  báo trạng thái bằng text).

---

## File Structure

```
sat-hach-trainer/
├── index.html
├── style.css
├── manifest.webmanifest
├── service-worker.js
├── js/
│   ├── playlist.js       # logic thuần: build/validate playlist, dùng chung 2 bộ
│   └── app.js             # DOM wiring: 2 view, play, localStorage
├── content/
│   ├── stations.json      # 11 loại bài
│   ├── standard-set.json  # thứ tự 13 bài của Bộ chuẩn
│   └── audio/*.mp3        # 1 file/loại bài, placeholder lúc đầu
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── tools/
│   └── gen-placeholder-audio.sh
├── test/
│   └── playlist.test.mjs
└── README.md
```

---

### Task 1: Content data & playlist logic

**Files:**
- Create: `content/stations.json`
- Create: `content/standard-set.json`
- Create: `js/playlist.js`
- Test: `test/playlist.test.mjs`

**Interfaces:**
- Produces: `buildPlaylist(stationIds: string[], stations: Station[]): Station[]`,
  `validateStations(stations: Station[]): string[]` (mảng id trùng, rỗng nếu ok),
  `validateStandardSet(standardSet: string[], stations: Station[]): string[]` (mảng id
  lạ không có trong stations, rỗng nếu ok). `Station = { id: string, name: string,
  audio: string }`. Các task UI sau dùng đúng 3 hàm này từ `js/playlist.js`.

- [ ] **Step 1: Viết `content/stations.json`**

```json
[
  { "id": "xuat-phat", "name": "Xuất phát", "audio": "xuat-phat.mp3" },
  { "id": "nhuong-nguoi-di-bo", "name": "Dừng xe nhường đường người đi bộ", "audio": "nhuong-nguoi-di-bo.mp3" },
  { "id": "de-pa-len-doc", "name": "Dừng xe, đề-pa lên dốc", "audio": "de-pa-len-doc.mp3" },
  { "id": "hang-dinh-vuong-goc", "name": "Qua hàng đinh vuông góc (chữ Z)", "audio": "hang-dinh-vuong-goc.mp3" },
  { "id": "nga-tu-den-tin-hieu", "name": "Qua ngã tư có tín hiệu đèn giao thông", "audio": "nga-tu-den-tin-hieu.mp3" },
  { "id": "duong-vong-quanh-co", "name": "Qua đường vòng quanh co (chữ S)", "audio": "duong-vong-quanh-co.mp3" },
  { "id": "ghep-xe-doc", "name": "Ghép xe dọc", "audio": "ghep-xe-doc.mp3" },
  { "id": "giao-duong-sat", "name": "Dừng xe nơi giao nhau đường sắt", "audio": "giao-duong-sat.mp3" },
  { "id": "tang-toc-tang-so", "name": "Tăng tốc, tăng số", "audio": "tang-toc-tang-so.mp3" },
  { "id": "ghep-xe-ngang", "name": "Ghép xe ngang (đỗ song song)", "audio": "ghep-xe-ngang.mp3" },
  { "id": "ket-thuc", "name": "Kết thúc", "audio": "ket-thuc.mp3" }
]
```

- [ ] **Step 2: Viết `content/standard-set.json`**

```json
[
  "xuat-phat", "nhuong-nguoi-di-bo", "de-pa-len-doc", "hang-dinh-vuong-goc",
  "nga-tu-den-tin-hieu", "duong-vong-quanh-co", "nga-tu-den-tin-hieu",
  "ghep-xe-doc", "nga-tu-den-tin-hieu", "giao-duong-sat", "tang-toc-tang-so",
  "ghep-xe-ngang", "ket-thuc"
]
```

- [ ] **Step 3: Viết test trước (`test/playlist.test.mjs`)**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildPlaylist, validateStations, validateStandardSet } from '../js/playlist.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stations = JSON.parse(readFileSync(join(__dirname, '../content/stations.json'), 'utf8'));
const standardSet = JSON.parse(readFileSync(join(__dirname, '../content/standard-set.json'), 'utf8'));

test('stations.json không có id trùng', () => {
  assert.deepEqual(validateStations(stations), []);
});

test('standard-set.json có đúng 13 phần tử', () => {
  assert.equal(standardSet.length, 13);
});

test('standard-set.json chỉ dùng id có trong stations.json', () => {
  assert.deepEqual(validateStandardSet(standardSet, stations), []);
});

test('buildPlaylist giữ đúng thứ tự và độ dài, kể cả id lặp lại', () => {
  const ids = ['xuat-phat', 'nga-tu-den-tin-hieu', 'nga-tu-den-tin-hieu', 'ket-thuc'];
  const playlist = buildPlaylist(ids, stations);
  assert.equal(playlist.length, 4);
  assert.equal(playlist[0].id, 'xuat-phat');
  assert.equal(playlist[1].id, 'nga-tu-den-tin-hieu');
  assert.equal(playlist[2].id, 'nga-tu-den-tin-hieu');
  assert.equal(playlist[3].id, 'ket-thuc');
});

test('buildPlaylist báo lỗi rõ ràng khi id không tồn tại', () => {
  assert.throws(() => buildPlaylist(['khong-ton-tai'], stations), /Không tìm thấy station id/);
});
```

- [ ] **Step 4: Chạy test, xác nhận FAIL vì `js/playlist.js` chưa tồn tại**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../js/playlist.js'`

- [ ] **Step 5: Viết `js/playlist.js`**

```js
export function findStation(stations, id) {
  const station = stations.find((s) => s.id === id);
  if (!station) throw new Error(`Không tìm thấy station id: ${id}`);
  return station;
}

export function buildPlaylist(stationIds, stations) {
  return stationIds.map((id) => findStation(stations, id));
}

export function validateStations(stations) {
  const seen = new Set();
  const dupes = [];
  for (const s of stations) {
    if (seen.has(s.id)) dupes.push(s.id);
    seen.add(s.id);
  }
  return dupes;
}

export function validateStandardSet(standardSet, stations) {
  const knownIds = new Set(stations.map((s) => s.id));
  return standardSet.filter((id) => !knownIds.has(id));
}
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `node --test test/`
Expected: 5 test cases PASS

- [ ] **Step 7: Commit**

```bash
git add content/stations.json content/standard-set.json js/playlist.js test/playlist.test.mjs
git commit -m "feat: content data 13 bài + playlist logic thuần

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01628EA6iGdADAodQt6CZMQ6"
```

---

### Task 2: Placeholder audio + PWA icons

**Files:**
- Create: `tools/gen-placeholder-audio.sh`
- Create (generated by script): `content/audio/*.mp3` (11 file)
- Create (generated by ffmpeg trực tiếp): `icons/icon-192.png`, `icons/icon-512.png`

**Interfaces:**
- Consumes: danh sách 11 id từ `content/stations.json` (Task 1).
- Produces: mỗi station trong `stations.json` có 1 file mp3 thật sự tồn tại tại
  `content/audio/<audio>` — Task 3/4 phát trực tiếp các file này, không quan tâm nội
  dung (beep hay TTS thật).

- [ ] **Step 1: Viết `tools/gen-placeholder-audio.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../content/audio"

names=(
  xuat-phat nhuong-nguoi-di-bo de-pa-len-doc hang-dinh-vuong-goc
  nga-tu-den-tin-hieu duong-vong-quanh-co ghep-xe-doc giao-duong-sat
  tang-toc-tang-so ghep-xe-ngang ket-thuc
)

for n in "${names[@]}"; do
  ffmpeg -y -f lavfi -i "sine=frequency=880:duration=1" -ac 1 -ar 44100 -q:a 4 "$n.mp3"
done

echo "Đã tạo ${#names[@]} file audio placeholder (beep 1s) tại $(pwd)."
echo "Thay bằng audio TTS thật khi có nội dung — xem README.md."
```

- [ ] **Step 2: Chạy script, tạo audio placeholder**

```bash
mkdir -p content/audio icons
chmod +x tools/gen-placeholder-audio.sh
./tools/gen-placeholder-audio.sh
```

Expected: `ls content/audio | wc -l` in ra `11`.

- [ ] **Step 3: Sinh icon PWA placeholder (màu đặc, thay sau khi có logo thật)**

```bash
ffmpeg -y -f lavfi -i "color=c=0x0b5fff:s=192x192" -frames:v 1 icons/icon-192.png
ffmpeg -y -f lavfi -i "color=c=0x0b5fff:s=512x512" -frames:v 1 icons/icon-512.png
```

Expected: `ls icons/` in ra `icon-192.png` và `icon-512.png`.

- [ ] **Step 4: Commit**

```bash
git add tools/gen-placeholder-audio.sh content/audio icons
git commit -m "feat: audio placeholder + icon PWA (sinh bằng ffmpeg, thay khi có nội dung thật)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01628EA6iGdADAodQt6CZMQ6"
```

---

### Task 3: App shell UI — Bộ chuẩn & Bộ tự ghép

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `js/app.js`

**Interfaces:**
- Consumes: `buildPlaylist` từ `js/playlist.js` (Task 1); `content/stations.json`,
  `content/standard-set.json`, `content/audio/*.mp3` (Task 1 & 2).
- Produces: không có module nào khác phụ thuộc vào file này (đây là entrypoint UI).

- [ ] **Step 1: Viết `index.html`**

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sát Hạch Trainer</title>
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <h1>Sát Hạch Trainer</h1>
  </header>

  <main>
    <section id="menu">
      <button id="btn-bo-chuan" type="button">Bộ chuẩn</button>
      <button id="btn-bo-tu-ghep" type="button">Bộ tự ghép</button>
    </section>

    <section id="view-bo-chuan" hidden>
      <h2>Bộ chuẩn (13 bài)</h2>
      <ol id="list-bo-chuan"></ol>
      <button id="play-bo-chuan" type="button">▶ Phát</button>
      <button class="btn-back" type="button">← Quay lại</button>
    </section>

    <section id="view-bo-tu-ghep" hidden>
      <h2>Bộ tự ghép</h2>
      <div class="ghep-columns">
        <div>
          <h3>Bấm để thêm bài</h3>
          <ul id="list-stations"></ul>
        </div>
        <div>
          <h3>Thứ tự đã chọn</h3>
          <ol id="list-selected"></ol>
        </div>
      </div>
      <button id="save-bo-tu-ghep" type="button">💾 Lưu</button>
      <button id="play-bo-tu-ghep" type="button">▶ Phát</button>
      <button class="btn-back" type="button">← Quay lại</button>
    </section>

    <p id="status" role="status"></p>
  </main>

  <audio id="player"></audio>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Viết `style.css` (mobile-first, tối thiểu)**

```css
:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
}

body {
  margin: 0;
  padding: 1rem;
  max-width: 480px;
  margin-inline: auto;
}

button {
  font-size: 1.1rem;
  padding: 0.6rem 1rem;
  margin: 0.25rem;
  min-height: 44px;
}

#menu {
  display: flex;
  gap: 0.5rem;
}

.ghep-columns {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.ghep-columns > div {
  flex: 1 1 140px;
  min-width: 0;
}

ol, ul {
  padding-left: 1.2rem;
}

#status {
  min-height: 1.5em;
  font-weight: bold;
}
```

- [ ] **Step 3: Viết `js/app.js`**

```js
import { buildPlaylist } from './playlist.js';

const STORAGE_KEY = 'bo-tu-ghep';

const els = {
  menu: document.getElementById('menu'),
  viewBoChuan: document.getElementById('view-bo-chuan'),
  viewBoTuGhep: document.getElementById('view-bo-tu-ghep'),
  listBoChuan: document.getElementById('list-bo-chuan'),
  listStations: document.getElementById('list-stations'),
  listSelected: document.getElementById('list-selected'),
  status: document.getElementById('status'),
  player: document.getElementById('player'),
};

let stations = [];
let standardSet = [];
let selected = loadSelected();

async function loadContent() {
  const [stationsRes, standardRes] = await Promise.all([
    fetch('content/stations.json'),
    fetch('content/standard-set.json'),
  ]);
  stations = await stationsRes.json();
  standardSet = await standardRes.json();
}

function loadSelected() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSelected() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    setStatus('Đã lưu bộ tự ghép.');
  } catch {
    setStatus('Không lưu được (trình duyệt chặn bộ nhớ) — Bộ chuẩn vẫn dùng bình thường.');
  }
}

function setStatus(text) {
  els.status.textContent = text;
}

function showView(view) {
  els.menu.hidden = view !== 'menu';
  els.viewBoChuan.hidden = view !== 'bo-chuan';
  els.viewBoTuGhep.hidden = view !== 'bo-tu-ghep';
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function renderList(el, ids, { removable } = {}) {
  el.innerHTML = '';
  ids.forEach((id, index) => {
    const station = stations.find((s) => s.id === id);
    const li = document.createElement('li');
    li.textContent = station ? station.name : `(không rõ: ${id})`;
    if (removable) {
      li.append(
        ' ',
        button('↑', () => moveSelected(index, -1)),
        button('↓', () => moveSelected(index, 1)),
        button('✕', () => removeSelected(index)),
      );
    }
    el.appendChild(li);
  });
}

function renderStationsPicker() {
  els.listStations.innerHTML = '';
  stations.forEach((station) => {
    const li = document.createElement('li');
    li.appendChild(
      button(`+ ${station.name}`, () => {
        selected.push(station.id);
        renderList(els.listSelected, selected, { removable: true });
      }),
    );
    els.listStations.appendChild(li);
  });
}

function moveSelected(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= selected.length) return;
  [selected[index], selected[target]] = [selected[target], selected[index]];
  renderList(els.listSelected, selected, { removable: true });
}

function removeSelected(index) {
  selected.splice(index, 1);
  renderList(els.listSelected, selected, { removable: true });
}

function playPlaylist(ids) {
  if (ids.length === 0) {
    setStatus('Chưa chọn bài nào để phát.');
    return;
  }

  let playlist;
  try {
    playlist = buildPlaylist(ids, stations);
  } catch (err) {
    setStatus(`Lỗi dữ liệu: ${err.message}`);
    return;
  }

  let i = 0;
  let current = null;

  function playNext() {
    if (i >= playlist.length) {
      setStatus('Đã phát xong.');
      return;
    }
    current = playlist[i];
    i += 1;
    setStatus(`Đang phát: ${current.name} (${i}/${playlist.length})`);
    els.player.src = `content/audio/${current.audio}`;
    els.player.play().catch(() => {
      setStatus(`Lỗi phát "${current.name}", bỏ qua, tiếp tục bài kế.`);
      playNext();
    });
  }

  els.player.onended = playNext;
  els.player.onerror = () => {
    setStatus(`Lỗi audio "${current ? current.name : ''}", bỏ qua, tiếp tục bài kế.`);
    playNext();
  };
  playNext();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch(() => setStatus('Không bật được chế độ offline — app vẫn chạy khi có mạng.'));
  }
}

async function main() {
  await loadContent();
  renderList(els.listBoChuan, standardSet);
  renderStationsPicker();
  renderList(els.listSelected, selected, { removable: true });

  document.getElementById('btn-bo-chuan').addEventListener('click', () => showView('bo-chuan'));
  document.getElementById('btn-bo-tu-ghep').addEventListener('click', () => showView('bo-tu-ghep'));
  document.querySelectorAll('.btn-back').forEach((b) => b.addEventListener('click', () => showView('menu')));

  document.getElementById('play-bo-chuan').addEventListener('click', () => playPlaylist(standardSet));
  document.getElementById('save-bo-tu-ghep').addEventListener('click', saveSelected);
  document.getElementById('play-bo-tu-ghep').addEventListener('click', () => playPlaylist(selected));

  showView('menu');
  registerServiceWorker();
}

main();
```

- [ ] **Step 4: Kiểm tra thủ công (bắt buộc, vì đây là UI — không có DOM test tự động
      theo spec)**

```bash
npx serve .
# hoặc: python3 -m http.server 8080
```

Mở trình duyệt, xác nhận từng ý:
- Bấm "Bộ chuẩn" → thấy đúng 13 dòng theo thứ tự trong `standard-set.json`, kể cả 3
  dòng "Qua ngã tư có tín hiệu đèn giao thông".
- Bấm "▶ Phát" ở Bộ chuẩn → nghe beep phát lần lượt, dòng trạng thái đổi theo từng bài,
  kết thúc hiện "Đã phát xong."
- Bấm "Bộ tự ghép" → bấm thêm vài bài (kể cả bấm trùng 1 bài 2 lần) → thấy xuất hiện ở
  cột "Thứ tự đã chọn" theo đúng thứ tự bấm, kể cả lặp.
- Dùng nút ↑ ↓ ✕ → thứ tự/danh sách cập nhật đúng.
- Bấm "💾 Lưu" → tải lại trang (F5) → mở lại "Bộ tự ghép" → danh sách đã chọn vẫn còn
  nguyên (đọc từ `localStorage`).
- Bấm "▶ Phát" ở Bộ tự ghép khi chưa chọn bài nào → hiện "Chưa chọn bài nào để phát."
  (không bị treo/lỗi).

- [ ] **Step 5: Commit**

```bash
git add index.html style.css js/app.js
git commit -m "feat: UI Bộ chuẩn + Bộ tự ghép (vanilla JS, không framework)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01628EA6iGdADAodQt6CZMQ6"
```

---

### Task 4: PWA offline + install

**Files:**
- Create: `manifest.webmanifest`
- Create: `service-worker.js`

**Interfaces:**
- Consumes: `content/stations.json` (đọc lúc `install` để biết danh sách audio cần
  cache); danh sách app-shell cố định khớp với các file tạo ở Task 3.

- [ ] **Step 1: Viết `manifest.webmanifest`**

```json
{
  "name": "Sát Hạch Trainer",
  "short_name": "Sát Hạch",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0b5fff",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Viết `service-worker.js`**

```js
const CACHE_NAME = 'sat-hach-trainer-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/playlist.js',
  './manifest.webmanifest',
  './content/stations.json',
  './content/standard-set.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      const stations = await (await fetch('./content/stations.json')).json();
      const audioUrls = stations.map((s) => `./content/audio/${s.audio}`);
      await cache.addAll(audioUrls);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
```

- [ ] **Step 3: Kiểm tra thủ công offline (bắt buộc, không có cách tự động hoá đáng
      tin cho service worker trong phạm vi MVP này)**

```bash
npx serve .
```

- Mở trình duyệt (Chrome), mở tab đang chạy app 1 lần với mạng bật, chờ vài giây để
  service worker cài xong (DevTools → Application → Service Workers, thấy "activated").
- Vào DevTools → Network, bật "Offline".
- Tải lại trang (F5) → app vẫn load ra, bấm Bộ chuẩn phát được audio bình thường.

- [ ] **Step 4: Commit**

```bash
git add manifest.webmanifest service-worker.js
git commit -m "feat: PWA offline (service worker cache-first) + manifest cài đặt

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01628EA6iGdADAodQt6CZMQ6"
```

---

### Task 5: README — chạy local, thay nội dung thật, deploy

**Files:**
- Create: `README.md`

- [ ] **Step 1: Viết `README.md`**

```markdown
# Sát Hạch Trainer

Module âm thanh sa hình — xem spec đầy đủ tại
`docs/superpowers/specs/2026-09-02-audio-sa-hinh-mvp-design.md`.

## Chạy thử local

Cần 1 static server (service worker yêu cầu http/https, không chạy được khi mở trực
tiếp bằng `file://`):

    npx serve .
    # hoặc
    python3 -m http.server 8080

Mở địa chỉ server báo ra (vd `http://localhost:8080`).

## Chạy test

    node --test test/

## Thay audio placeholder bằng nội dung thật

`content/audio/*.mp3` hiện là beep giả (sinh bởi `tools/gen-placeholder-audio.sh`) để
app chạy được trước khi có nội dung thật. Khi có text hiệu lệnh + tín hiệu thật:

1. Sinh file mp3 thật (TTS cho giọng đọc, hoặc tín hiệu ting-tong/tút riêng), đặt đúng
   tên như field `audio` trong `content/stations.json`, đè lên file placeholder trong
   `content/audio/`.
2. Tăng số version `CACHE_NAME` trong `service-worker.js` (vd `v1` → `v2`) để trình
   duyệt tải audio mới thay vì dùng bản cache cũ.

## Deploy lên M710q (nginx, tự host)

    # trên M710q
    sudo mkdir -p /var/www/sat-hach-trainer
    rsync -av --exclude .git --exclude test --exclude tools \
      ./ user@m710q:/var/www/sat-hach-trainer/

nginx server block tối thiểu:

    server {
        listen 80;
        server_name sat-hach.local;  # đổi theo domain/tailscale hostname thật
        root /var/www/sat-hach-trainer;
        index index.html;
    }
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README chạy local, thay nội dung thật, deploy nginx

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01628EA6iGdADAodQt6CZMQ6"
```
