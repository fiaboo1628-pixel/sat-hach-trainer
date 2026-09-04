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
