import { buildPlaylist } from './playlist.js';
import { initTheory } from './theory-ui.js';
import { initRoad } from './road-ui.js';

const STORAGE_KEY = 'bo-tu-ghep';

const els = {
  listStations: document.getElementById('list-stations'),
  listSelected: document.getElementById('list-selected'),
  shTitle: document.getElementById('sh-board-title'),
  shCurrent: document.getElementById('sh-current'),
  shSequence: document.getElementById('sh-sequence'),
  shAudioState: document.getElementById('sh-audio-state'),
  shNext: document.getElementById('sh-next'),
  shErrors: document.getElementById('sh-errors'),
  shNotices: document.getElementById('sh-notices'),
  status: document.getElementById('status'),
  player: document.getElementById('player'),
};

let stations = [];
let standardSet = [];
let roadRules = [];
let saHinhErrors = [];
let saHinhNotices = [];
let wakeLock = null;
let theoryQuestions = [];
let theoryHandle = { cancelTimer: () => {} };
let selected = loadSelected();
// Bảng bấm sa hình: các bài của bộ đang mở, và chỉ số bài sẽ đọc khi bấm "Bài kế".
let board = [];
let nextIdx = 0;
let lastStationIndex = null;
// Việc phải làm khi tiếng đang phát dừng (hết tự nhiên hay bị phím khác cắt ngang).
let onPlaybackDone = null;

async function loadContent() {
  const [stationsRes, standardRes, theoryRes, tt12Res, tt108Res, errorsRes, noticesRes] = await Promise.all([
    fetch('content/stations.json'),
    fetch('content/standard-set.json'),
    fetch('content/theory/questions.json'),
    fetch('content/rules/duong-truong-tt12.json'),
    fetch('content/rules/duong-truong-tt108.json'),
    fetch('content/sa-hinh-loi.json'),
    fetch('content/sa-hinh-thong-bao.json'),
  ]);
  stations = await stationsRes.json();
  standardSet = await standardRes.json();
  theoryQuestions = await theoryRes.json();
  roadRules = [await tt12Res.json(), await tt108Res.json()];
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
  'duong-truong-setup',
  'duong-truong',
  'duong-truong-ket-qua',
  'duong-truong-lich-su',
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
  syncHistory(view);
}

// Nút Back của Android (và của trình duyệt) lùi một màn như nút "← Quay lại", thay vì thoát app.
// Ngoài menu luôn giữ đúng một mục lịch sử để Back có chỗ bắt; về menu thì trả mục đó lại.
let ignorePop = false;
function syncHistory(view) {
  if (window.Capacitor) return; // bản Android bắt nút Back bằng plugin App, xem main()
  if (view !== 'menu' && !history.state) history.pushState({ inApp: true }, '');
  else if (view === 'menu' && history.state) {
    ignorePop = true;
    history.back();
  }
}

function goBackOneScreen() {
  const visible = document.querySelector('main > section:not([hidden])');
  visible?.querySelector('.btn-back, .btn-back-practice')?.click();
}

window.addEventListener('popstate', () => {
  if (ignorePop) {
    ignorePop = false;
    return;
  }
  goBackOneScreen();
});

// Android: WebView bỏ qua mục lịch sử thêm lúc không có thao tác chạm, nên không dựa vào lịch sử
// mà nghe thẳng nút Back: ở menu thì thoát app, màn khác thì lùi một màn.
window.Capacitor?.Plugins?.App?.addListener('backButton', () => {
  if (!document.getElementById('menu').hidden) window.Capacitor.Plugins.App.exitApp();
  else goBackOneScreen();
});

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
function updateAudioState(message) {
  els.shAudioState.textContent = message;
}

function stopPlayback(message) {
  els.player.onended = null;
  els.player.onloadedmetadata = null;
  // Phím gắn ontimeupdate để chạy vạch tiến trình; không xoá là nó còn ghi --played lên phím
  // cũ suốt lần phát sau.
  els.player.ontimeupdate = null;
  els.player.onerror = null;
  els.player.pause();
  document.querySelector('.playing')?.classList.remove('playing');
  const done = onPlaybackDone;
  onPlaybackDone = null;
  done?.();
  updateAudioState(message || 'Sẵn sàng phát');
}

// Phát một clip, trả về promise xong khi phát hết (hoặc bị phím khác cắt), lỗi khi không phát được.
// Dùng cho Đường trường, nơi tiếng gắn với sự kiện chấm điểm chứ không với một phím cố định.
function playClip(src, label) {
  return new Promise((resolve, reject) => {
    const fail = (error) => {
      onPlaybackDone = null;
      stopPlayback(`Lỗi phát: ${label}`);
      reject(error);
    };
    stopPlayback();
    onPlaybackDone = resolve;
    updateAudioState(`Đang phát: ${label}`);
    els.player.onended = () => stopPlayback();
    els.player.onerror = () => fail(new Error(label));
    els.player.src = src;
    els.player.playbackRate = 1;
    els.player.play().catch((error) => {
      if (error.name !== 'AbortError') fail(error);
    });
  });
}

const VOICE_PLAYBACK_RATE = 0.85; // giọng đọc tên bài sa hình chậm hơn cho dễ nghe/phản ứng kịp

// Một phím: phát ngay, cắt tiếng đang phát. Dùng chung cho Đường trường và bảng bấm sa hình.
function playKey(b, src, label, rate = 1, onDone = null) {
  stopPlayback();
  onPlaybackDone = onDone;
  b.classList.add('playing');
  updateAudioState(`Đang phát: ${label}`);
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
  els.player.play().catch((error) => {
    if (error.name !== 'AbortError') stopPlayback(`Lỗi phát: ${label}`);
  });
}

// Một phím âm thanh: chỉ nhãn (bỏ emoji 2026-11-01 -- màu khu đã chỉ loại phím), bấm là phát.
function soundKey(key) {
  const b = button(key.label, () => playKey(b, `content/audio/${key.audio}`, key.label));
  b.className = 'sb-key';
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
    small.textContent = `Lượt phát kế ${nextIdx + 1}/${board.length}`;
    big.textContent = `▶ ${station.name}`;
  } else {
    small.textContent = `Đã đọc hết ${board.length} lượt`;
    big.textContent = '↺ Về bài đầu';
  }
  els.shNext.append(small, big);
  els.shCurrent.textContent = lastStationIndex === null
    ? 'Chưa phát bài nào'
    : `${lastStationIndex + 1}. ${board[lastStationIndex].name}`;
  for (const [index, item] of Array.from(els.shSequence.children).entries()) {
    if (index === nextIdx) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  }
  document.getElementById('sh-replay').disabled = lastStationIndex === null;
  document.getElementById('sh-back').disabled = nextIdx === 0;

}

// Lúc đang đọc, phím hiện đúng bài đang đọc; đọc xong (hoặc bị phím khác cắt) mới chuyển sang
// bài kế -- trước đây chữ nhảy sang bài sau ngay khi loa vừa bắt đầu đọc bài này.
function readStation(i) {
  const station = board[i];
  if (!station) return;
  stopPlayback();
  lastStationIndex = i;
  nextIdx = i + 1;
  const small = document.createElement('small');
  const big = document.createElement('span');
  small.textContent = `Đang đọc lượt ${i + 1}/${board.length}`;
  big.textContent = station.name;
  els.shNext.replaceChildren(small, big);
  playKey(els.shNext, `content/audio/${station.audio}`, station.name, VOICE_PLAYBACK_RATE, renderBoardNext);
}

async function openStandardSet(ids, label) {
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
  lastStationIndex = null;
  els.shTitle.textContent = `Sa hình · ${label}`;
  els.shSequence.replaceChildren(...board.map((station) => {
    const item = document.createElement('li');
    item.textContent = station.name;
    return item;
  }));
  els.shSequence.parentElement.open = false;
  renderBoardNext();
  showView('bo-chuan');
  // Bảng bấm cũng dùng trong xe, như Đường trường: giữ màn hình sáng.
  wakeLock = await navigator.wakeLock?.request('screen').catch(() => null);
}

function registerServiceWorker() {
  // Bản Android (Capacitor) đã mang sẵn mọi file trong APK: không cần service worker.
  if (window.Capacitor) return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch(() => setStatus('Không bật được chế độ offline — app vẫn chạy khi có mạng.'));
  }
}

async function main() {
  await loadContent();
  renderStationsPicker();
  renderSaHinhErrors();
  renderList(els.listSelected, selected, { removable: true });
  theoryHandle = initTheory(theoryQuestions, { showView, setStatus });

  document.getElementById('btn-bo-chuan').addEventListener('click', () => openStandardSet(standardSet, 'Hạng B · Lộ trình mẫu'));
  // Sa hình hạng C1 không có bài ghép xe ngang.
  document.getElementById('btn-bo-chuan-c1').addEventListener('click', () =>
    openStandardSet(standardSet.filter((id) => id !== 'ghep-xe-ngang'), 'Hạng C1 · Lộ trình mẫu'),
  );
  initRoad({ ruleSets: roadRules, showView, play: playClip, stop: () => stopPlayback(), storage: localStorage });
  document.getElementById('btn-duong-truong').addEventListener('click', () => showView('duong-truong-setup'));
  document.getElementById('stop-sa-hinh').addEventListener('click', () => stopPlayback());
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
      stopPlayback();
      nextIdx = 0;
      lastStationIndex = null;
      renderBoardNext();
      return;
    }
    readStation(nextIdx);
  });
  document.getElementById('sh-replay').addEventListener('click', () => {
    if (lastStationIndex === null) return;
    const index = nextIdx;
    readStation(lastStationIndex);
    nextIdx = index;
  });
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
  cue('sh-khan-cap', 'khan-cap.mp3', 'Khẩn cấp');
  document.getElementById('save-bo-tu-ghep').addEventListener('click', saveSelected);
  document.getElementById('play-bo-tu-ghep').addEventListener('click', () => openStandardSet(selected, 'Tự ghép'));

  showView('menu');
  registerServiceWorker();
}

main().catch(() => {
  setStatus('Không tải được dữ liệu bài (content/*.json). Kiểm tra mạng rồi tải lại trang.');
});
