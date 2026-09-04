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
let currentPlayback = null;

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
  let handled = true; // guards against onended/onerror/play().catch() double-firing for the same track

  function playNext() {
    if (playback.cancelled) return;
    if (i >= playlist.length) {
      setStatus('Đã phát xong.');
      return;
    }
    current = playlist[i];
    i += 1;
    handled = false;
    setStatus(`Đang phát: ${current.name} (${i}/${playlist.length})`);
    els.player.src = `content/audio/${current.audio}`;
    els.player.play().catch(() => {
      if (playback.cancelled || handled) return;
      handled = true;
      setStatus(`Lỗi phát "${current.name}", bỏ qua, tiếp tục bài kế.`);
      playNext();
    });
  }

  els.player.onended = () => {
    if (playback.cancelled || handled) return;
    handled = true;
    playNext();
  };
  els.player.onerror = () => {
    if (playback.cancelled || handled) return;
    handled = true;
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
  document.querySelectorAll('.btn-back').forEach((b) =>
    b.addEventListener('click', () => {
      stopPlayback();
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

main().catch(() => {
  setStatus('Không tải được dữ liệu bài (content/*.json). Kiểm tra mạng rồi tải lại trang.');
});
