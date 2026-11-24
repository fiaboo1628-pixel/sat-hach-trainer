// Bộ chấm điểm đường trường: thuần dữ liệu, không đụng DOM, để test được bằng node --test.
// Session chỉ giữ danh sách sự kiện; điểm và trạng thái luôn tính lại từ đó, nên "hoàn tác"
// chỉ là bỏ sự kiện lỗi cuối cùng.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const START_LIMIT_MS = 30000;
// Hai lần bấm cùng một lệnh trong khoảng này là bấm đúp trên xe, không phải lượt bài mới.
export const REPEAT_COMMAND_MS = 1500;

export function pickRuleSet(ruleSets, examDate, today) {
  const date = DATE.test(examDate || '') ? examDate : today;
  return ruleSets.find((r) => (!r.validFrom || r.validFrom <= date) && (!r.validTo || date <= r.validTo)) ?? ruleSets.at(-1);
}

export function createSession(rules, { hang, gearbox, now }) {
  return { rulesId: rules.id, hang, gearbox, createdAt: now, events: [] };
}

const errorById = (rules, id) => rules.errors.find((e) => e.id === id);
const exerciseById = (rules, id) => rules.exercises.find((e) => e.id === id);
const commands = (session) => session.events.filter((e) => e.type === 'command');
const errorEvents = (session) => session.events.filter((e) => e.type === 'error');

export function score(rules, session) {
  return errorEvents(session).reduce((sum, ev) => sum - (errorById(rules, ev.errorId).points ?? 0), rules.startScore);
}

const isSuspended = (rules, session) => errorEvents(session).some((ev) => errorById(rules, ev.errorId).suspend);

export function status(rules, session) {
  if (session.events.some((e) => e.type === 'finish')) return 'finished';
  if (isSuspended(rules, session)) return 'suspended';
  if (!commands(session).length) return 'idle';
  return score(rules, session) < rules.passMark ? 'failed' : 'running';
}

export function currentExercise(rules, session) {
  const last = commands(session).at(-1);
  return last ? exerciseById(rules, last.exerciseId) : null;
}

// Trước lệnh xuất phát, lỗi kiểm tra trước khi lên xe thuộc về lượt 1 (lượt của bài đầu sắp ra).
const currentTurn = (session) => commands(session).at(-1)?.turn ?? 1;
const firstExercise = (rules) => rules.exercises.find((e) => e.position === 'first');

export function availableErrors(rules, session) {
  const ex = currentExercise(rules, session);
  const ids = ex ? [...ex.errors, ...rules.commonErrors] : [...firstExercise(rules).errors];
  const all = ids.map((id) => errorById(rules, id));
  const rank = (e) => (e.suspend ? 2 : e.detectedBy === 'device' ? 0 : 1);
  return [0, 1, 2].flatMap((r) => all.filter((e) => rank(e) === r));
}

export function startDeadline(session) {
  if (session.events.some((e) => e.type === 'start-crossed')) return null;
  const cmds = commands(session);
  // Đã ra lệnh bài thứ hai thì xe chắc chắn đã qua vạch xuất phát.
  if (cmds.length !== 1) return null;
  return cmds[0].at + START_LIMIT_MS;
}

const rejected = (session, reason) => ({ session, effects: [{ type: 'rejected', reason }] });
const withEvent = (session, event) => ({ ...session, events: [...session.events, event] });

export function reduce(rules, session, action, now) {
  const st = status(rules, session);
  if (st === 'finished') return rejected(session, 'Buổi thi đã kết thúc');

  if (action.type === 'undo') {
    const idx = session.events.map((e) => e.type).lastIndexOf('error');
    if (idx < 0) return rejected(session, 'Chưa có lỗi để hoàn tác');
    // errorAt: lỗi mà người bấm thấy trên nút Hoàn tác; bấm đúp không gỡ thêm lỗi trước đó.
    if (action.errorAt !== undefined && session.events[idx].at !== action.errorAt) return rejected(session, 'Đã hoàn tác lỗi này');
    let next = { ...session, events: session.events.filter((_, i) => i !== idx) };
    // Gỡ lỗi khi đã quá hạn 30 giây: coi như xe đã qua vạch, để đồng hồ không đình chỉ lại ngay.
    const deadline = startDeadline(next);
    if (deadline !== null && now >= deadline) next = withEvent(next, { type: 'start-crossed', at: now });
    return { session: next, effects: [] };
  }
  if (st === 'suspended') return rejected(session, 'Thí sinh đã bị đình chỉ sát hạch');

  if (action.type === 'command') {
    const ex = exerciseById(rules, action.exerciseId);
    if (!ex) return rejected(session, 'Không có bài này');
    const last = currentExercise(rules, session);
    if (st === 'idle' && ex.position !== 'first') return rejected(session, 'Chưa ra lệnh xuất phát');
    if (st !== 'idle' && ex.position === 'first') return rejected(session, 'Đã xuất phát rồi');
    if (last?.position === 'last') return rejected(session, 'Đã ra lệnh kết thúc');
    const lastCmd = commands(session).at(-1);
    if (lastCmd?.exerciseId === ex.id && now - lastCmd.at < REPEAT_COMMAND_MS) return rejected(session, 'Vừa ra lệnh bài này');
    const turn = st === 'idle' ? 1 : currentTurn(session) + 1;
    const next = withEvent(session, { type: 'command', exerciseId: ex.id, turn, at: now });
    return { session: next, effects: [{ type: 'play', audio: ex.commandAudio }] };
  }

  if (action.type === 'start-crossed') {
    if (st === 'idle') return rejected(session, 'Chưa ra lệnh xuất phát');
    return { session: withEvent(session, { type: 'start-crossed', at: now }), effects: [] };
  }

  if (action.type === 'error') {
    const error = errorById(rules, action.errorId);
    if (!error) return rejected(session, 'Không có lỗi này');
    if (st === 'idle' && !firstExercise(rules).errors.includes(error.id)) return rejected(session, 'Chưa ra lệnh xuất phát');
    const turn = currentTurn(session);
    if (!error.perOccurrence && errorEvents(session).some((ev) => ev.errorId === error.id && ev.turn === turn)) {
      return { session, effects: [{ type: 'already-recorded', errorId: error.id }] };
    }
    const next = withEvent(session, { type: 'error', errorId: error.id, turn, at: now });
    const effects = [{ type: 'play', audio: error.audio }];
    const after = status(rules, next);
    if (after === 'suspended') effects.push({ type: 'notice', kind: 'suspended' });
    else if (after === 'failed' && st !== 'failed') effects.push({ type: 'notice', kind: 'failed' });
    return { session: next, effects };
  }

  if (action.type === 'finish') {
    const next = withEvent(session, { type: 'finish', at: now });
    return { session: next, effects: [{ type: 'notice', kind: score(rules, session) >= rules.passMark ? 'passed' : 'failed' }] };
  }

  return rejected(session, 'Thao tác không hợp lệ');
}

export function buildResult(rules, session) {
  const s = score(rules, session);
  const suspended = isSuspended(rules, session);
  const cmds = commands(session);
  // Bị đình chỉ ngay ở bước kiểm tra trước khi lên xe: vẫn ghi lượt 1 cho bài đầu.
  if (!cmds.length && errorEvents(session).length) cmds.push({ exerciseId: firstExercise(rules).id, turn: 1, at: session.createdAt });
  const turns = cmds.map((c) => ({
    exerciseId: c.exerciseId,
    name: exerciseById(rules, c.exerciseId).name,
    turn: c.turn,
    startedAt: c.at,
    errors: errorEvents(session)
      .filter((ev) => ev.turn === c.turn)
      .map((ev) => {
        const e = errorById(rules, ev.errorId);
        return { id: e.id, label: e.label, official: e.official, points: e.points, suspend: e.suspend, citation: e.citation, at: ev.at };
      }),
  }));
  const finish = session.events.find((e) => e.type === 'finish');
  return {
    score: s,
    passed: !suspended && s >= rules.passMark,
    status: status(rules, session),
    document: rules.document,
    rulesId: rules.id,
    hang: session.hang,
    gearbox: session.gearbox,
    createdAt: session.createdAt,
    finishedAt: finish?.at ?? session.events.at(-1)?.at ?? session.createdAt,
    turns,
  };
}
