import { buildPlaylist } from './playlist.js';
import { initTheory } from './theory-ui.js';

const STORAGE_KEY = 'bo-tu-ghep';

const els = {
  listStations: document.getElementById('list-stations'),
  listSelected: document.getElementById('list-selected'),
  soundboard: document.getElementById('soundboard'),
  shNext: document.getElementById('sh-next'),
  shErrors: document.getElementById('sh-errors'),
  shNotices: document.getElementById('sh-notices'),
  status: document.getElementById('status'),
  player: document.getElementById('player'),
};

let stations = [];
let standardSet = [];
let soundboard = [];
let saHinhErrors = [];
let saHinhNotices = [];
let wakeLock = null;
let theoryQuestions = [];
let theoryHandle = { cancelTimer: () => {} };
let selected = loadSelected();
// Bảng bấm sa hình: các bài của bộ đang mở, và chỉ số bài sẽ đọc khi bấm "Bài kế".
let board = [];
let nextIdx = 0;
// Việc phải làm khi tiếng đang phát dừng (hết tự nhiên hay bị phím khác cắt ngang).
let onPlaybackDone = null;

async function loadContent() {
  const [stationsRes, standardRes, theoryRes, soundboardRes, errorsRes, noticesRes] = await Promise.all([
    fetch('content/stations.json'),
    fetch('content/standard-set.json'),
    fetch('content/theory/questions.json'),
    fetch('content/soundboard.json'),
    fetch('content/sa-hinh-loi.json'),
    fetch('content/sa-hinh-thong-bao.json'),
  ]);
  stations = await stationsRes.json();
  standardSet = await standardRes.json();
  theoryQuestions = await theoryRes.json();
  soundboard = await soundboardRes.json();
  saHinhErrors = await errorsRes.json();
  saHinhNotices = await noticesRes.json();
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
    setStatus('Không lưu được (trình duyệt chặn bộ nhớ) — Hạng B/C1 vẫn dùng bình thường.');
  }
}

function setStatus(text) {
  els.status.textContent = text;
}

const VIEWS = [
  'menu',
  'sa-hinh-menu',
  'bo-chuan',
  'bo-tu-ghep',
  'duong-truong',
  'huong-dan-dt',
  'theory-menu',
  'theory-exam',
  'theory-result',
  'theory-review',
  'theory-practice-menu',
  'theory-practice',
];

function showView(view) {
  VIEWS.forEach((v) => {
    const elId = v === 'menu' ? 'menu' : `view-${v}`;
    document.getElementById(elId).hidden = v !== view;
  });
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

// Cắt tiếng đang phát (nếu có) và bỏ dấu "đang phát" trên phím của nó.
function stopPlayback(message) {
  els.player.onended = null;
  els.player.onloadedmetadata = null;
  // Phím gắn ontimeupdate để chạy vạch tiến trình; không xoá là nó còn ghi --played lên phím
  // cũ suốt lần phát sau.
  els.player.ontimeupdate = null;
  els.player.pause();
  document.querySelector('.playing')?.classList.remove('playing');
  const done = onPlaybackDone;
  onPlaybackDone = null;
  done?.();
  if (message) setStatus(message);
}

const VOICE_PLAYBACK_RATE = 0.85; // giọng đọc tên bài sa hình chậm hơn cho dễ nghe/phản ứng kịp

// Một phím: phát ngay, cắt tiếng đang phát. Dùng chung cho Đường trường và bảng bấm sa hình.
function playKey(b, src, label, rate = 1, onDone = null) {
  stopPlayback();
  onPlaybackDone = onDone;
  b.classList.add('playing');
  // --played lái vạch chạy trong .playing::after: trạng thái đang phát phải đọc được
  // mà không dựa vào màu, vì có phím vốn đã là màu vàng.
  b.style.setProperty('--played', '0');
  els.player.ontimeupdate = () => {
    const total = els.player.duration;
    if (total) b.style.setProperty('--played', (els.player.currentTime / total).toFixed(3));
  };
  els.player.onended = () => stopPlayback();
  // iOS Safari: đổi playbackRate ngay khi vừa gán src (trước khi có metadata) hay bị nuốt —
  // chốt lại rate khi loadedmetadata bắn ra, lúc pipeline audio đã sẵn sàng.
  els.player.onloadedmetadata = () => {
    els.player.playbackRate = rate;
  };
  els.player.src = src;
  els.player.playbackRate = rate;
  els.player.play().catch(() => stopPlayback(`Lỗi phát "${label}".`));
}

// Ba khu của Đường trường. `color` trong soundboard.json đã mã hoá sẵn nhóm — lệnh, tín hiệu,
// báo lỗi — nên đây là đọc ra thứ có trong data, không phải đặt thêm phân loại mới. Người bấm
// là người ngồi cạnh, đang tìm một phím dưới áp lực: tách khu để không hô nhầm một lỗi.
const SOUNDBOARD_ZONES = [
  { color: 'blue', label: 'Lệnh' },
  { color: 'yellow', label: 'Tín hiệu' },
  { color: 'red', label: 'Báo lỗi' },
];

// Đường trường: each key plays its clip right away, cutting off whatever was playing.
function renderSoundboard() {
  SOUNDBOARD_ZONES.forEach((zone) => {
    const keys = soundboard.filter((key) => key.color === zone.color);
    if (!keys.length) return;

    const section = document.createElement('section');
    section.className = `sb-zone sb-zone-${zone.color}`;
    const heading = document.createElement('h3');
    heading.textContent = zone.label;
    section.append(heading);

    const grid = document.createElement('div');
    grid.className = 'sb-grid';
    keys.forEach((key) => grid.appendChild(soundKey(key)));

    section.append(grid);
    els.soundboard.appendChild(section);
  });
}

// Một phím âm thanh: biểu tượng + nhãn, bấm là phát.
function soundKey(key) {
  const b = button(key.label, () => playKey(b, `content/audio/${key.audio}`, key.label));
  const icon = document.createElement('span');
  icon.textContent = key.icon;
  icon.setAttribute('aria-hidden', 'true');
  b.prepend(icon, ' ');
  b.className = 'tile sb-key';
  return b;
}

function renderSaHinhErrors() {
  saHinhErrors.forEach((key) => els.shErrors.appendChild(soundKey(key)));
  saHinhNotices.forEach((key) => els.shNotices.appendChild(soundKey(key)));
}

// "Bài kế" đọc tên bài ở nextIdx rồi dời con trỏ sang bài sau; hết bộ thì phím quay về đầu.
function renderBoardNext() {
  const station = board[nextIdx];
  els.shNext.textContent = '';
  const small = document.createElement('small');
  const big = document.createElement('span');
  if (station) {
    small.textContent = `Bài kế ${nextIdx + 1}/${board.length}`;
    big.textContent = `▶ ${station.name}`;
  } else {
    small.textContent = `Đã đọc hết ${board.length} bài`;
    big.textContent = '↺ Về bài đầu';
  }
  els.shNext.append(small, big);
}

// Lúc đang đọc, phím hiện đúng bài đang đọc; đọc xong (hoặc bị phím khác cắt) mới chuyển sang
// bài kế -- trước đây chữ nhảy sang bài sau ngay khi loa vừa bắt đầu đọc bài này.
function readStation(i) {
  const station = board[i];
  if (!station) return;
  nextIdx = i + 1;
  const small = document.createElement('small');
  const big = document.createElement('span');
  small.textContent = `Đang đọc ${i + 1}/${board.length}`;
  big.textContent = station.name;
  els.shNext.replaceChildren(small, big);
  playKey(els.shNext, `content/audio/${station.audio}`, station.name, VOICE_PLAYBACK_RATE, renderBoardNext);
}

async function openStandardSet(ids) {
  if (ids.length === 0) {
    setStatus('Chưa chọn bài nào.');
    return;
  }
  try {
    board = buildPlaylist(ids, stations);
  } catch (err) {
    setStatus(`Lỗi dữ liệu: ${err.message}`);
    return;
  }
  nextIdx = 0;
  renderBoardNext();
  showView('bo-chuan');
  // Bảng bấm cũng dùng trong xe, như Đường trường: giữ màn hình sáng.
  wakeLock = await navigator.wakeLock?.request('screen').catch(() => null);
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
  renderStationsPicker();
  renderSoundboard();
  renderSaHinhErrors();
  renderList(els.listSelected, selected, { removable: true });
  theoryHandle = initTheory(theoryQuestions, { showView, setStatus });

  document.getElementById('btn-bo-chuan').addEventListener('click', () => openStandardSet(standardSet));
  // Sa hình hạng C1 không có bài ghép xe ngang.
  document.getElementById('btn-bo-chuan-c1').addEventListener('click', () =>
    openStandardSet(standardSet.filter((id) => id !== 'ghep-xe-ngang')),
  );
  document.getElementById('btn-duong-truong').addEventListener('click', async () => {
    showView('duong-truong');
    // Giữ màn hình sáng khi đang dạy trên xe.
    // shortcut: mất khóa nếu chuyển app rồi quay lại, cần thì bắt visibilitychange để xin lại.
    wakeLock = await navigator.wakeLock?.request('screen').catch(() => null);
  });
  document.getElementById('stop-duong-truong').addEventListener('click', () => stopPlayback());
  document.getElementById('btn-sa-hinh').addEventListener('click', () => showView('sa-hinh-menu'));
  document.getElementById('btn-bo-tu-ghep').addEventListener('click', () => showView('bo-tu-ghep'));
  document.getElementById('btn-huong-dan-dt').addEventListener('click', () => showView('huong-dan-dt'));
  document.getElementById('btn-ly-thuyet').addEventListener('click', () => showView('theory-menu'));
  document.querySelectorAll('.btn-back').forEach((b) =>
    b.addEventListener('click', () => {
      stopPlayback();
      wakeLock?.release();
      wakeLock = null;
      theoryHandle.cancelTimer();
      showView(b.dataset.back || 'menu');
    }),
  );

  els.shNext.addEventListener('click', () => {
    if (nextIdx >= board.length) {
      nextIdx = 0;
      renderBoardNext();
      return;
    }
    readStation(nextIdx);
  });
  document.getElementById('sh-replay').addEventListener('click', () => readStation(Math.max(nextIdx - 1, 0)));
  document.getElementById('sh-back').addEventListener('click', () => {
    stopPlayback();
    nextIdx = Math.max(nextIdx - 1, 0);
    renderBoardNext();
  });
  const cue = (id, file, label) => {
    const b = document.getElementById(id);
    b.addEventListener('click', () => playKey(b, `content/audio/${file}`, label));
  };
  cue('sh-ting-tong', 'ting-tong.mp3', 'Ting tong');
  cue('sh-tut', 'tut.mp3', 'Tút');
  document.getElementById('save-bo-tu-ghep').addEventListener('click', saveSelected);
  document.getElementById('play-bo-tu-ghep').addEventListener('click', () => openStandardSet(selected));

  showView('menu');
  // Đèn xuất phát chạy một lần lúc mở app.
  document.body.classList.add('lights-run');
  // Gỡ đi khi chạy xong: menu bị ẩn/hiện lại thì animation CSS chạy lại từ đầu.
  setTimeout(() => document.body.classList.replace('lights-run', 'lights-go'), 3500);
  registerServiceWorker();
}

main().catch(() => {
  setStatus('Không tải được dữ liệu bài (content/*.json). Kiểm tra mạng rồi tải lại trang.');
});
