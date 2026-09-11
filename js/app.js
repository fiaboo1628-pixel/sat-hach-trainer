import { buildPlaylist } from './playlist.js';
import { initTheory } from './theory-ui.js';

const STORAGE_KEY = 'bo-tu-ghep';

const els = {
  listBoChuan: document.getElementById('list-bo-chuan'),
  listStations: document.getElementById('list-stations'),
  listSelected: document.getElementById('list-selected'),
  status: document.getElementById('status'),
  player: document.getElementById('player'),
};

let stations = [];
let standardSet = [];
let theoryQuestions = [];
let theoryHandle = { cancelTimer: () => {} };
let selected = loadSelected();
let currentPlayback = null;

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

const VIEWS = [
  'menu',
  'bo-chuan',
  'bo-tu-ghep',
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

// Stops whatever is currently playing (if anything) and invalidates its
// callbacks, so a stale playNext()/onended/onerror from a previous playlist
// can never advance playback again. Shared by the Stop button and by
// starting a new playlist (double-tapping Play).
function stopPlayback(message) {
  if (currentPlayback) currentPlayback.cancelled = true;
  currentPlayback = null;
  els.player.onended = null;
  els.player.onerror = null;
  els.player.pause();
  if (message) setStatus(message);
}

const VOICE_PLAYBACK_RATE = 0.85; // giọng đọc chậm hơn cho dễ nghe/phản ứng kịp
const CUE_DELAY_MS = 2500; // nghỉ giữa lúc đọc xong tên bài và tiếng báo nhận bài
const STATION_GAP_MS = 1500; // nghỉ giữa lúc dứt tiếng báo nhận bài và bài kế

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

  stopPlayback();
  const playback = { cancelled: false };
  currentPlayback = playback;

  let i = 0;
  let current = null;

  // Plays one file, then calls onDone exactly once (ended, load error, or
  // play() rejection) — guards against those three firing more than once
  // for the same track.
  function playTrack(src, label, onDone, rate = 1) {
    if (playback.cancelled) return;
    let handled = false;
    const advance = (errMessage) => {
      if (playback.cancelled || handled) return;
      handled = true;
      if (errMessage) setStatus(errMessage);
      onDone();
    };
    els.player.onended = () => advance();
    els.player.onerror = () => advance(`Lỗi audio "${label}", bỏ qua, tiếp tục bài kế.`);
    // iOS Safari: đổi playbackRate ngay khi vừa gán src (trước khi có metadata)
    // hay bị nuốt/giật đúng lúc bắt đầu phát — chốt lại rate khi loadedmetadata
    // bắn ra, lúc pipeline audio đã sẵn sàng.
    els.player.onloadedmetadata = () => {
      els.player.playbackRate = rate;
    };
    els.player.src = src;
    els.player.playbackRate = rate;
    els.player.play().catch(() => advance(`Lỗi phát "${label}", bỏ qua, tiếp tục bài kế.`));
  }

  function playNext() {
    if (playback.cancelled) return;
    if (i >= playlist.length) {
      setStatus('Đã phát xong.');
      return;
    }
    current = playlist[i];
    i += 1;
    setStatus(`Đang phát: ${current.name} (${i}/${playlist.length})`);
    const goToNextAfterGap = () => {
      if (playback.cancelled) return;
      setTimeout(playNext, STATION_GAP_MS);
    };
    // Đọc tên bài trước, rồi mới kêu tín hiệu nhận bài sau một nhịp nghỉ —
    // không phát tín hiệu trước tên bài như trước nữa.
    const playCue = () => {
      if (playback.cancelled) return;
      if (!current.cue) {
        goToNextAfterGap();
        return;
      }
      setTimeout(() => {
        if (playback.cancelled) return;
        playTrack(`content/audio/${current.cue}`, `${current.name} (tín hiệu nhận bài)`, goToNextAfterGap);
      }, CUE_DELAY_MS);
    };
    playTrack(`content/audio/${current.audio}`, current.name, playCue, VOICE_PLAYBACK_RATE);
  }

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
  theoryHandle = initTheory(theoryQuestions, { showView, setStatus });

  document.getElementById('btn-bo-chuan').addEventListener('click', () => showView('bo-chuan'));
  document.getElementById('btn-bo-tu-ghep').addEventListener('click', () => showView('bo-tu-ghep'));
  document.getElementById('btn-ly-thuyet').addEventListener('click', () => showView('theory-menu'));
  document.querySelectorAll('.btn-back').forEach((b) =>
    b.addEventListener('click', () => {
      stopPlayback();
      theoryHandle.cancelTimer();
      showView(b.dataset.back || 'menu');
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

main().catch(() => {
  setStatus('Không tải được dữ liệu bài (content/*.json). Kiểm tra mạng rồi tải lại trang.');
});
