// Giao diện Đường trường: chuẩn bị buổi thi, bàn chấm điểm, phiếu kết quả, lịch sử.
// Chỉ đụng DOM; quy tắc chấm nằm ở road-scoring.js, luật ở content/rules/*.json.
import {
  pickRuleSet, createSession, reduce, score, status, currentExercise,
  availableErrors, startDeadline, buildResult,
} from './road-scoring.js';
import { createHistoryStore } from './road-history.js';

export const STATUS_TEXT = {
  idle: 'Chưa xuất phát',
  running: 'Đang thi',
  failed: 'Không đạt (dưới 80 điểm)',
  suspended: 'Đình chỉ sát hạch',
  finished: 'Đã kết thúc',
};
export const DETECT_TEXT = {
  device: 'Máy thật tự bắt',
  examiner: 'Sát hạch viên bấm',
  'examiner-inferred': 'Sát hạch viên bấm (suy luận)',
};
export const DISCLAIMER = 'Ứng dụng là công cụ tập luyện, không phải phần mềm chấm thi chính thức.';
export const NO_GUIDE = 'Chưa có hướng dẫn chính thức';
export const pointsText = (e) => (e.suspend ? 'Đình chỉ' : `−${e.points}`);
const GEARBOX_TEXT = { manual: 'Số sàn', auto: 'Số tự động' };
// "Thông tư 12/2025/TT-BCA" -> "TT 12/2025": đủ để nhận ra, gọn trên màn hình nhỏ.
export const shortDoc = (doc) => doc.replace('Thông tư ', 'TT ').replace('/TT-BCA', '');

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clock = (ms) => `${Math.floor(ms / 60000)}:${pad(Math.floor(ms / 1000) % 60)}`;
const dateTime = (t) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
export const validity = (r) =>
  r.validTo ? `hiệu lực đến hết ${r.validTo.split('-').reverse().join('/')}` : `hiệu lực từ ${r.validFrom.split('-').reverse().join('/')}`;

// Nhãn theo hộp số: TT 12 ghi cả "số không" lẫn "P" trong một lỗi.
function errorLabel(e, gearbox) {
  if (e.id === 'kt-ve-so') return gearbox === 'auto' ? 'Dừng xe chưa về số P' : 'Dừng xe chưa về số không';
  return e.label;
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

// Một dòng gọn: chỉ tên lỗi; chạm vào mới mở nguyên văn, trích dẫn, ghi chú.
function details(summary, lines) {
  const d = el('details', 'rd-more');
  d.append(el('summary', null, summary));
  lines.filter(Boolean).forEach((line) => d.append(el('small', 'rd-cite', line)));
  return d;
}

// Hộp thoại dùng chung. Trả về value của nút được bấm.
function ask(message, actions) {
  const dialog = $('rd-dialog');
  if (!dialog.showModal) {
    return Promise.resolve(window.confirm(message) ? actions[0].value : actions.at(-1).value);
  }
  $('rd-dialog-text').textContent = message;
  const row = $('rd-dialog-actions');
  row.replaceChildren();
  return new Promise((resolve) => {
    actions.forEach((a) => {
      const b = el('button', a.primary ? 'btn-primary' : 'btn-secondary', a.label);
      b.type = 'button';
      b.addEventListener('click', () => {
        dialog.close();
        resolve(a.value);
      });
      row.append(b);
    });
    dialog.oncancel = () => resolve(actions.at(-1).value);
    dialog.showModal();
    // Nút an toàn (primary) nhận focus, để Enter hay một cú chạm thừa không chọn nhầm việc xoá/thoát.
    row.querySelector('.btn-primary')?.focus();
  });
}

export function renderSheet(container, result, rules) {
  container.replaceChildren();
  const verdict = result.status === 'suspended' ? 'ĐÌNH CHỈ SÁT HẠCH' : result.passed ? 'ĐẠT' : 'KHÔNG ĐẠT';
  container.append(
    el('h2', null, 'Phiếu kết quả sát hạch lái xe trên đường'),
    el('p', 'rd-muted', `${shortDoc(result.document)} · Hạng ${result.hang} · ${GEARBOX_TEXT[result.gearbox]} · ${dateTime(result.createdAt)}`),
  );
  const head = el('div', `rd-verdict rd-verdict-${result.passed ? 'pass' : 'fail'}`);
  head.append(el('strong', null, `${result.score} điểm`), el('span', null, verdict));
  container.append(head);
  const table = el('table', 'guide-table rd-sheet-table');
  const body = el('tbody');
  result.turns.forEach((t) => {
    const row = el('tr', 'rd-turn');
    const cell = el('th', null, t.name);
    cell.colSpan = 3;
    row.append(cell);
    body.append(row);
    if (!t.errors.length) {
      const ok = el('tr');
      const c = el('td', 'rd-muted', 'Không có lỗi');
      c.colSpan = 3;
      ok.append(c);
      body.append(ok);
    }
    t.errors.forEach((e) => {
      const r = el('tr');
      const what = el('td');
      what.append(details(e.label, [e.official, e.citation]));
      r.append(el('td', 'rd-time', dateTime(e.at).slice(0, 5)), what, el('td', e.suspend ? 'guide-out' : null, pointsText(e)));
      body.append(r);
    });
  });
  table.append(body);
  container.append(table, el('p', 'rd-muted', `Căn cứ: ${shortDoc(rules.document)}, ${rules.scope.split(':')[0]}.`), el('p', 'rd-muted', DISCLAIMER));
}

// Trang "Quy định thi đường trường": hai thẻ, mỗi thẻ một bộ luật, sinh từ chính dữ liệu chấm điểm.
export function renderRulesGuide(container, ruleSets, today) {
  container.replaceChildren();
  const tabs = el('div', 'rd-tabs');
  tabs.setAttribute('role', 'tablist');
  const panels = [];
  const current = pickRuleSet(ruleSets, today, today);
  ruleSets.forEach((r) => {
    const tab = el('button', 'btn-secondary', shortDoc(r.document));
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    const panel = el('div', 'rd-guide-panel');
    panel.setAttribute('role', 'tabpanel');
    panel.append(
      el('p', 'rd-applied', `${shortDoc(r.document)} · ${validity(r)}`),
      el('p', 'guide-lead', `Đạt từ ${r.passMark}/${r.startScore} điểm · tối thiểu ${r.minDistanceKm} km · ${r.exercises.length} bài. Chạm vào một lỗi để xem nguyên văn quy định.`),
    );
    const section = (title, errors, watch) => {
      panel.append(el('h3', null, title));
      if (watch) panel.append(el('p', 'rd-watch', `Cần để ý: ${watch}`));
      const table = el('table', 'guide-table');
      const body = el('tbody');
      errors.forEach((e) => {
        const row = el('tr');
        const what = el('td');
        what.append(details(e.label, [e.official, `${DETECT_TEXT[e.detectedBy]} · ${e.citation}`, e.note, e.perOccurrence ? null : r.turnRuleNote]));
        row.append(what, el('td', e.suspend ? 'guide-out' : null, e.suspend ? 'Đình chỉ sát hạch' : `−${e.points}`));
        body.append(row);
      });
      table.append(body);
      panel.append(table);
    };
    const byId = (id) => r.errors.find((e) => e.id === id);
    r.exercises.forEach((ex, i) => section(`${i + 1}. ${ex.name}${ex.conditional ? ' (có điều kiện)' : ''}`, ex.errors.map(byId), ex.watch));
    if (r.commonErrors.length) section('Lỗi tính ở mọi bài', r.commonErrors.map(byId));
    panels.push(panel);
    tab.addEventListener('click', () => select(panels.indexOf(panel)));
    tabs.append(tab);
  });
  const select = (index) => {
    panels.forEach((p, i) => (p.hidden = i !== index));
    [...tabs.children].forEach((t, i) => t.setAttribute('aria-selected', String(i === index)));
  };
  container.append(
    tabs,
    ...panels,
    el('p', 'rd-muted', `${DISCLAIMER} Ứng dụng không thu thập dữ liệu; mọi thứ lưu trên máy của bạn. Cập nhật theo văn bản ngày 2026-11-24.`),
  );
  select(ruleSets.indexOf(current));
}

export function initRoad({ ruleSets, showView, play, stop, storage }) {
  renderRulesGuide($('rd-guide'), ruleSets, localDate());
  const history = createHistoryStore(storage);
  let rules = null;
  let session = null;
  let saved = false; // phiếu của buổi này đã vào lịch sử chưa
  let audioToken = 0;
  let wakeLock = null;
  let toastTimer = null;

  // ---------- Âm thanh ----------
  async function playSequence(items) {
    const token = ++audioToken;
    for (const item of items) {
      if (token !== audioToken) return;
      try {
        await play(`content/audio/${item.audio}`, item.label);
      } catch {
        toast(item.label);
      }
    }
  }

  function toast(text) {
    const t = $('rd-toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  // ---------- Màn chuẩn bị ----------
  const override = $('rd-rules-override');
  ruleSets.forEach((r) => {
    const o = el('option', null, `${shortDoc(r.document)} (${validity(r).replace('hiệu lực ', '').replace(' hết', '')})`);
    o.value = r.id;
    override.append(o);
  });
  const chosenRules = () =>
    override.value === 'auto' ? pickRuleSet(ruleSets, $('rd-date').value, localDate()) : ruleSets.find((r) => r.id === override.value);
  const updateApplied = () => {
    const r = chosenRules();
    $('rd-rules-applied').textContent = `Áp dụng ${shortDoc(r.document)}, ${validity(r)}. Tối thiểu ${r.minDistanceKm} km, ${r.exercises.length} bài.`;
  };
  $('rd-date').value = localDate();
  $('rd-date').addEventListener('change', updateApplied);
  override.addEventListener('change', updateApplied);
  updateApplied();

  $('rd-start').addEventListener('click', async () => {
    rules = chosenRules();
    const pick = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
    session = createSession(rules, { hang: pick('rd-hang'), gearbox: pick('rd-gearbox'), now: Date.now() });
    saved = false;
    showView('duong-truong');
    render();
    requestWake();
  });
  $('rd-open-guide').addEventListener('click', () => showView('huong-dan-dt'));
  $('rd-open-history').addEventListener('click', openHistory);
  $('rd-sheet-history').addEventListener('click', openHistory);
  $('rd-new').addEventListener('click', () => showView('duong-truong-setup'));

  // ---------- Giữ màn hình sáng ----------
  async function requestWake() {
    wakeLock = (await navigator.wakeLock?.request('screen').catch(() => null)) ?? null;
  }
  const consoleVisible = () => !$('view-duong-truong').hidden;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && consoleVisible()) requestWake();
  });

  // ---------- Bàn chấm điểm ----------
  function dispatch(action) {
    const before = status(rules, session);
    const r = reduce(rules, session, action, Date.now());
    session = r.session;
    handleEffects(r.effects, before, action);
    render();
  }

  function handleEffects(effects, before, action) {
    const queue = action.timeout ? [{ audio: rules.notices.startTimeout, label: action.timeout }] : [];
    for (const fx of effects) {
      if (fx.type === 'rejected') toast(fx.reason);
      else if (fx.type === 'already-recorded') toast('Lỗi này đã ghi ở lượt bài này');
      else if (fx.type === 'play') {
        const label = action.type === 'command'
          ? rules.exercises.find((e) => e.id === action.exerciseId).label
          : rules.errors.find((e) => e.id === action.errorId).label;
        if (!action.silent) queue.push({ audio: fx.audio, label });
      } else if (fx.type === 'notice') queue.push({ audio: rules.notices[fx.kind], label: STATUS_TEXT[fx.kind === 'passed' ? 'finished' : fx.kind] });
    }
    const st = status(rules, session);
    if (st === 'finished') {
      queue.push({ audio: `road/diem-${score(rules, session)}.mp3`, label: `${score(rules, session)} điểm` });
      playSequence(queue);
      saveAndShowSheet();
      return;
    }
    playSequence(queue);
    if (st === 'suspended' && before !== 'suspended') saveAndShowSheet();
    else if (st === 'failed' && before !== 'failed') offerStopAfterFail();
  }

  async function offerStopAfterFail() {
    const choice = await ask(
      `Thí sinh còn ${score(rules, session)} điểm, dưới ${rules.passMark}: không đạt.\n${NO_GUIDE}: văn bản không nói có phải dừng ngay không.`,
      [{ label: 'Dừng và xem phiếu', value: 'stop', primary: true }, { label: 'Tập tiếp', value: 'go' }],
    );
    if (choice === 'stop') dispatch({ type: 'finish' });
  }

  function saveAndShowSheet() {
    const result = buildResult(rules, session);
    history.add(result);
    saved = true;
    renderSheet($('rd-sheet'), result, rules);
    $('rd-sheet-undo').hidden = status(rules, session) !== 'suspended';
    wakeLock?.release();
    wakeLock = null;
    showView('duong-truong-ket-qua');
  }

  $('rd-sheet-undo').addEventListener('click', () => {
    stop();
    session = reduce(rules, session, { type: 'undo', errorAt: lastErrorAt() }, Date.now()).session;
    history.remove(session.createdAt);
    saved = false;
    showView('duong-truong');
    render();
    requestWake();
  });

  async function command(ex) {
    if (ex.position === 'last' && rules.minDistanceKm >= 5) {
      const ok = await ask(`Luật mới yêu cầu tối thiểu ${rules.minDistanceKm} km. Đã đủ chưa?`, [
        { label: 'Đã đủ, ra lệnh kết thúc', value: true, primary: true },
        { label: 'Chưa', value: false },
      ]);
      if (!ok) return;
    }
    dispatch({ type: 'command', exerciseId: ex.id });
  }

  function showInfo(e) {
    const lines = [e.official, `Mức trừ: ${e.suspend ? 'Đình chỉ sát hạch' : `${e.points} điểm`}${e.perOccurrence ? ', mỗi lần' : ''}`, DETECT_TEXT[e.detectedBy], e.citation];
    if (e.note) lines.push(e.note);
    ask(lines.join('\n'), [{ label: 'Đóng', value: null, primary: true }]);
  }

  function render() {
    const st = status(rules, session);
    const ex = currentExercise(rules, session);
    $('rd-title').textContent = `${shortDoc(rules.document)} · Hạng ${session.hang}`;
    $('rd-score').textContent = score(rules, session);
    $('rd-state').textContent = STATUS_TEXT[st];
    $('rd-state').dataset.state = st;
    $('rd-exercise').textContent = ex ? ex.name : 'Kiểm tra trước khi lên xe, rồi ra lệnh xuất phát';
    const watchFor = ex ?? rules.exercises.find((e) => e.position === 'first');
    $('rd-watch').textContent = `Cần để ý: ${watchFor.watch}`;

    const locked = st === 'suspended' || st === 'finished';
    const lastDone = ex?.position === 'last';
    const cmds = $('rd-commands');
    cmds.replaceChildren();
    cmds.classList.toggle('rd-cmds-many', rules.exercises.length > 4);
    rules.exercises.forEach((e) => {
      const b = el('button', 'sb-key rd-cmd');
      b.type = 'button';
      b.append(el('span', null, e.label));
      if (e.conditional) b.append(el('small', null, 'có điều kiện'));
      const allowed = !locked && !lastDone && (st === 'idle' ? e.position === 'first' : e.position !== 'first');
      b.disabled = !allowed;
      if (ex?.id === e.id) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', () => command(e));
      cmds.append(b);
    });

    const errs = $('rd-errors');
    errs.replaceChildren();
    availableErrors(rules, session).forEach((e) => {
      const wrap = el('div', `rd-err${e.suspend ? ' rd-err-stop' : ''}`);
      const b = el('button', 'sb-key');
      b.type = 'button';
      b.disabled = locked;
      // Ít chữ trên bàn chấm (chủ app, 2026-11-24): chỉ tên lỗi. Mức trừ và nguồn bắt lỗi xem ở nút i;
      // lỗi đình chỉ vẫn tách riêng bằng màu đỏ đậm.
      b.append(el('span', 'rd-err-label', errorLabel(e, session.gearbox)));
      b.setAttribute('aria-label', `${errorLabel(e, session.gearbox)}, ${e.suspend ? 'đình chỉ' : `trừ ${e.points} điểm`}`);
      b.addEventListener('click', () => dispatch({ type: 'error', errorId: e.id }));
      const info = el('button', 'rd-info', 'i');
      info.type = 'button';
      info.setAttribute('aria-label', `Quy định: ${e.label}`);
      info.addEventListener('click', () => showInfo(e));
      wrap.append(b, info);
      errs.append(wrap);
    });

    const lastErr = session.events.filter((e) => e.type === 'error').at(-1);
    const undo = $('rd-undo');
    undo.disabled = !lastErr || st === 'finished';
    undo.textContent = lastErr ? `Hoàn tác: ${rules.errors.find((e) => e.id === lastErr.errorId).label}` : 'Hoàn tác';
    $('rd-finish').disabled = st === 'idle' || locked;
    tick();
  }

  function tick() {
    if (!session || !consoleVisible()) return;
    const first = session.events.find((e) => e.type === 'command');
    $('rd-clock').textContent = first ? clock(Date.now() - first.at) : '0:00';
    const deadline = startDeadline(session);
    const st = status(rules, session);
    const box = $('rd-countdown');
    box.hidden = !deadline || (st !== 'running' && st !== 'failed');
    if (box.hidden) return;
    const left = Math.ceil((deadline - Date.now()) / 1000);
    $('rd-countdown-sec').textContent = Math.max(left, 0);
    if (left <= 0) {
      const timeout = rules.exercises[0].errors.map((id) => rules.errors.find((e) => e.id === id)).find((e) => e.official.startsWith('Quá 30 giây'));
      dispatch({ type: 'error', errorId: timeout.id, silent: true, timeout: timeout.label });
    }
  }
  setInterval(tick, 500);

  $('rd-crossed').addEventListener('click', () => dispatch({ type: 'start-crossed' }));
  const lastErrorAt = () => session.events.filter((e) => e.type === 'error').at(-1)?.at;
  // Bấm đúp trên xe: lần chạm thứ hai trong 1 giây không gỡ thêm lỗi trước đó.
  let lastUndo = 0;
  $('rd-undo').addEventListener('click', () => {
    if (Date.now() - lastUndo < 1000) return;
    lastUndo = Date.now();
    stop();
    dispatch({ type: 'undo', errorAt: lastErrorAt() });
  });
  $('rd-finish').addEventListener('click', async () => {
    const ex = currentExercise(rules, session);
    if (ex?.position !== 'last') {
      const ok = await ask('Chưa ra lệnh kết thúc. Kết thúc buổi và xem phiếu luôn?', [
        { label: 'Kết thúc buổi', value: true, primary: true },
        { label: 'Thi tiếp', value: false },
      ]);
      if (!ok) return;
    }
    dispatch({ type: 'finish' });
  });

  // ---------- Rời bàn chấm giữa buổi ----------
  const leaveGuard = () => consoleVisible() && session && !saved && session.events.length > 0;
  // Tải lại trang hay đóng tab giữa buổi: trình duyệt tự hỏi lại, vì buổi thi chỉ nằm trong bộ nhớ.
  window.addEventListener('beforeunload', (event) => {
    if (leaveGuard()) event.preventDefault();
  });
  $('rd-leave').addEventListener(
    'click',
    async (event) => {
      if (!leaveGuard()) {
        wakeLock?.release();
        wakeLock = null;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!window.Capacitor && !window.history.state) window.history.pushState({ inApp: true }, '');
      const ok = await ask('Thoát buổi thi? Kết quả sẽ không được lưu.', [
        { label: 'Thoát', value: true },
        { label: 'Ở lại', value: false, primary: true },
      ]);
      if (!ok) return;
      session = null;
      stop();
      wakeLock?.release();
      wakeLock = null;
      showView('duong-truong-setup');
    },
    { capture: true },
  );

  // ---------- Lịch sử ----------
  function openHistory() {
    renderHistory();
    showView('duong-truong-lich-su');
  }
  function renderHistory() {
    const list = $('rd-history');
    list.replaceChildren();
    const items = history.list();
    if (!items.length) list.append(el('li', 'rd-muted', 'Chưa có buổi thi nào.'));
    items.forEach((r) => {
      const li = el('li', 'rd-history-item');
      const open = el('button', 'btn-secondary', `${dateTime(r.createdAt)} · ${shortDoc(r.document)} · ${r.score} điểm · ${r.status === 'suspended' ? 'Đình chỉ' : r.passed ? 'Đạt' : 'Không đạt'}`);
      open.type = 'button';
      open.addEventListener('click', () => {
        renderSheet($('rd-sheet'), r, ruleSets.find((x) => x.id === r.rulesId) ?? ruleSets[0]);
        $('rd-sheet-undo').hidden = true;
        showView('duong-truong-ket-qua');
      });
      const del = el('button', 'rd-info', '×');
      del.type = 'button';
      del.setAttribute('aria-label', 'Xoá buổi này');
      del.addEventListener('click', () => {
        history.remove(r.createdAt);
        renderHistory();
      });
      li.append(open, del);
      list.append(li);
    });
    $('rd-history-clear').disabled = !items.length;
  }
  $('rd-history-clear').addEventListener('click', async () => {
    const ok = await ask('Xoá toàn bộ lịch sử buổi thi trên máy này?', [
      { label: 'Xoá tất cả', value: true },
      { label: 'Không', value: false, primary: true },
    ]);
    if (ok) {
      history.clear();
      renderHistory();
    }
  });

  return { leaveGuard };
}
