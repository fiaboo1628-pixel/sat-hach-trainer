import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  pickRuleSet, createSession, reduce, score, status, currentExercise,
  availableErrors, startDeadline, buildResult,
} from '../js/road-scoring.js';

const load = (n) => JSON.parse(readFileSync(new URL(`../content/rules/${n}`, import.meta.url), 'utf8'));
const tt12 = load('duong-truong-tt12.json');
const tt108 = load('duong-truong-tt108.json');

// Bộ luật nhỏ để test quy tắc, không phụ thuộc nội dung thật.
const R = {
  id: 'fixture', document: 'Fixture', startScore: 100, passMark: 80,
  exercises: [
    { id: 'a', name: 'Đầu', position: 'first', errors: ['a-5', 'a-dc'] },
    { id: 'b', name: 'Giữa', position: 'any', errors: ['b-10', 'b-each'] },
    { id: 'z', name: 'Cuối', position: 'last', errors: [] },
  ],
  commonErrors: ['c-2', 'c-dc'],
  errors: [
    { id: 'a-5', label: 'A5', official: 'a5', points: 5, suspend: false, perOccurrence: false, detectedBy: 'examiner', citation: 'x', audio: 'road/a5.mp3' },
    { id: 'a-dc', label: 'ADC', official: 'adc', points: null, suspend: true, perOccurrence: false, detectedBy: 'device', citation: 'x', audio: 'road/adc.mp3' },
    { id: 'b-10', label: 'B10', official: 'b10', points: 10, suspend: false, perOccurrence: false, detectedBy: 'examiner-inferred', citation: 'x', audio: 'road/b10.mp3' },
    { id: 'b-each', label: 'BE', official: 'be', points: 5, suspend: false, perOccurrence: true, detectedBy: 'device', citation: 'x', audio: 'road/be.mp3' },
    { id: 'c-2', label: 'C2', official: 'c2', points: 2, suspend: false, perOccurrence: true, detectedBy: 'device', citation: 'x', audio: 'road/c2.mp3' },
    { id: 'c-dc', label: 'CDC', official: 'cdc', points: null, suspend: true, perOccurrence: false, detectedBy: 'examiner', citation: 'x', audio: 'road/cdc.mp3' },
  ],
  notices: { suspended: 'road/s.mp3', failed: 'road/f.mp3', passed: 'road/p.mp3', startTimeout: 'road/t.mp3' },
};

const opts = { hang: 'B', gearbox: 'manual', now: 1000 };
function run(rules, actions) {
  let s = createSession(rules, opts);
  let effects = [];
  actions.forEach((a, i) => {
    const r = reduce(rules, s, a, 2000 + i * 1000);
    s = r.session;
    effects = r.effects;
  });
  return { s, effects };
}
const cmd = (exerciseId) => ({ type: 'command', exerciseId });
const err = (errorId) => ({ type: 'error', errorId });

test('pickRuleSet chọn TT 12 ngày 2027-02-28, TT 108 ngày 2027-03-01, ngày sai thì dùng hôm nay', () => {
  const sets = [tt12, tt108];
  assert.equal(pickRuleSet(sets, '2027-02-28', '2026-11-24').id, 'tt12-2025');
  assert.equal(pickRuleSet(sets, '2027-03-01', '2026-11-24').id, 'tt108-2026');
  assert.equal(pickRuleSet(sets, '', '2027-05-01').id, 'tt108-2026');
  assert.equal(pickRuleSet(sets, 'abc', '2026-11-24').id, 'tt12-2025');
  assert.equal(pickRuleSet(sets, undefined, '2026-11-24').id, 'tt12-2025');
});

test('chưa xuất phát chỉ nhận lệnh bài đầu', () => {
  const s = createSession(R, opts);
  assert.equal(status(R, s), 'idle');
  const r = reduce(R, s, cmd('b'), 2000);
  assert.equal(r.effects[0].type, 'rejected');
  assert.equal(r.session.events.length, 0);
  assert.equal(reduce(R, s, err('c-2'), 2000).effects[0].type, 'rejected');
  assert.equal(reduce(R, s, err('b-10'), 2000).effects[0].type, 'rejected');
  const ok = reduce(R, s, cmd('a'), 2000);
  assert.equal(status(R, ok.session), 'running');
  assert.deepEqual(ok.effects, [{ type: 'play', audio: undefined }]);
});

test('chưa xuất phát vẫn ghi được lỗi của bài đầu (kiểm tra trước khi lên xe), lỗi khác thì không', () => {
  const s = createSession(R, opts);
  assert.deepEqual(availableErrors(R, s).map((e) => e.id), ['a-5', 'a-dc']);
  const r = reduce(R, s, err('a-5'), 1500);
  assert.equal(score(R, r.session), 95);
  assert.equal(status(R, r.session), 'idle');
  const started = reduce(R, r.session, cmd('a'), 2000).session;
  assert.deepEqual(buildResult(R, started).turns[0].errors.map((e) => e.id), ['a-5']);
  assert.equal(reduce(R, started, err('a-5'), 2500).effects[0].type, 'already-recorded');
});

test('đình chỉ trước khi xuất phát vẫn có phiếu', () => {
  const s = run(R, [err('a-dc')]).s;
  assert.equal(status(R, s), 'suspended');
  assert.deepEqual(buildResult(R, s).turns.map((t) => [t.exerciseId, t.errors.length]), [['a', 1]]);
});

test('bài đầu không ra lệnh lại', () => {
  const { s, effects } = run(R, [cmd('a'), cmd('a')]);
  assert.equal(effects[0].type, 'rejected');
  assert.equal(s.events.filter((e) => e.type === 'command').length, 1);
});

test('bài tự do lặp được, mỗi lần là lượt mới', () => {
  let s = run(R, [cmd('a'), cmd('b')]).s;
  s = reduce(R, s, cmd('b'), 60000).session;
  const turns = s.events.filter((e) => e.type === 'command').map((e) => e.turn);
  assert.deepEqual(turns, [1, 2, 3]);
  assert.equal(currentExercise(R, s).id, 'b');
});

test('trừ đúng điểm', () => {
  assert.equal(score(R, run(R, [cmd('a'), err('a-5')]).s), 95);
  assert.equal(score(R, run(R, [cmd('a'), cmd('b'), err('b-10')]).s), 90);
  assert.equal(score(R, run(R, [cmd('a'), err('c-2')]).s), 98);
});

test('lỗi mỗi lần trừ mỗi lần bấm', () => {
  const { s } = run(R, [cmd('a'), cmd('b'), err('b-each'), err('b-each'), err('c-2'), err('c-2')]);
  assert.equal(score(R, s), 100 - 5 - 5 - 2 - 2);
});

test('lỗi không mỗi lần chỉ trừ một lần trong một lượt; lượt sau trừ lại được', () => {
  const twice = run(R, [cmd('a'), cmd('b'), err('b-10'), err('b-10')]);
  assert.equal(score(R, twice.s), 90);
  assert.deepEqual(twice.effects, [{ type: 'already-recorded', errorId: 'b-10' }]);
  const nextTurn = run(R, [cmd('a'), cmd('b'), err('b-10'), cmd('b'), err('b-10')]);
  assert.equal(score(R, nextTurn.s), 80);
});

test('dưới 80 chuyển failed một lần, vẫn ghi lỗi tiếp', () => {
  let s = run(R, [cmd('a'), cmd('b'), err('b-10'), cmd('b'), err('b-10')]).s; // 80
  assert.equal(status(R, s), 'running');
  let r = reduce(R, s, err('b-each'), 9000); // 75
  assert.equal(status(R, r.session), 'failed');
  assert.ok(r.effects.some((e) => e.type === 'notice' && e.kind === 'failed'));
  r = reduce(R, r.session, err('b-each'), 9500); // 70, không báo lại
  assert.equal(score(R, r.session), 70);
  assert.ok(!r.effects.some((e) => e.type === 'notice'));
  r = reduce(R, r.session, cmd('b'), 9600);
  assert.equal(r.effects[0].type, 'play');
});

test('lỗi đình chỉ khoá buổi; hoàn tác thì trở lại running với điểm cũ', () => {
  const { s, effects } = run(R, [cmd('a'), err('a-5'), err('c-dc')]);
  assert.equal(status(R, s), 'suspended');
  assert.ok(effects.some((e) => e.type === 'notice' && e.kind === 'suspended'));
  assert.equal(reduce(R, s, cmd('b'), 9000).effects[0].type, 'rejected');
  assert.equal(reduce(R, s, err('c-2'), 9000).effects[0].type, 'rejected');
  const undone = reduce(R, s, { type: 'undo' }, 9000).session;
  assert.equal(status(R, undone), 'running');
  assert.equal(score(R, undone), 95);
});

test('hoàn tác chỉ gỡ lỗi gần nhất, không gỡ lệnh', () => {
  const { s } = run(R, [cmd('a'), err('a-5'), cmd('b'), { type: 'undo' }]);
  assert.equal(score(R, s), 100);
  assert.equal(s.events.filter((e) => e.type === 'command').length, 2);
  const none = run(R, [cmd('a'), { type: 'undo' }]);
  assert.equal(none.effects[0].type, 'rejected');
});

test('kết thúc khoá cả hoàn tác', () => {
  const { s } = run(R, [cmd('a'), err('a-5'), cmd('z'), { type: 'finish' }]);
  assert.equal(status(R, s), 'finished');
  assert.equal(reduce(R, s, { type: 'undo' }, 9000).effects[0].type, 'rejected');
  assert.equal(reduce(R, s, err('c-2'), 9000).effects[0].type, 'rejected');
  assert.equal(score(R, s), 95);
});

test('kết thúc đủ điểm báo passed', () => {
  const { effects } = run(R, [cmd('a'), cmd('z'), { type: 'finish' }]);
  assert.ok(effects.some((e) => e.type === 'notice' && e.kind === 'passed'));
  const failed = run(R, [cmd('a'), cmd('b'), err('b-10'), cmd('b'), err('b-10'), err('b-each'), cmd('z'), { type: 'finish' }]);
  assert.ok(failed.effects.some((e) => e.type === 'notice' && e.kind === 'failed'));
});

test('sau bài cuối chỉ nhận lỗi, hoàn tác và kết thúc', () => {
  const { s } = run(R, [cmd('a'), cmd('z')]);
  assert.equal(reduce(R, s, cmd('b'), 9000).effects[0].type, 'rejected');
  assert.equal(reduce(R, s, err('c-2'), 9000).effects[0].type, 'play');
});

test('startDeadline là lệnh đầu + 30000, null sau start-crossed', () => {
  const started = run(R, [cmd('a')]).s;
  assert.equal(startDeadline(started), 2000 + 30000);
  const crossed = run(R, [cmd('a'), { type: 'start-crossed' }]).s;
  assert.equal(startDeadline(crossed), null);
  assert.equal(startDeadline(createSession(R, opts)), null);
});

test('availableErrors xếp lỗi máy bắt trước, đình chỉ cuối', () => {
  const s = run(R, [cmd('a'), cmd('b')]).s;
  const ids = availableErrors(R, s).map((e) => e.id);
  assert.deepEqual(ids, ['b-each', 'c-2', 'b-10', 'c-dc']);
});

test('buildResult gom lỗi theo lượt bài, không có lỗi đã hoàn tác', () => {
  const { s } = run(R, [cmd('a'), err('a-5'), cmd('b'), err('b-10'), err('c-2'), { type: 'undo' }, cmd('z'), { type: 'finish' }]);
  const res = buildResult(R, s);
  assert.equal(res.score, 85);
  assert.equal(res.passed, true);
  assert.equal(res.status, 'finished');
  assert.deepEqual(res.turns.map((t) => [t.exerciseId, t.errors.map((e) => e.id)]), [['a', ['a-5']], ['b', ['b-10']], ['z', []]]);
  assert.equal(res.turns[1].errors[0].points, 10);
  assert.equal(typeof res.finishedAt, 'number');
});

test('reduce không sửa session đầu vào', () => {
  const s = run(R, [cmd('a'), err('a-5')]).s;
  const snapshot = structuredClone(s);
  reduce(R, s, err('c-2'), 9000);
  reduce(R, s, { type: 'undo' }, 9000);
  assert.deepEqual(s, snapshot);
});

test('chạy được trên bộ luật thật TT 108', () => {
  const s = run(tt108, [cmd('bai-1'), { type: 'start-crossed' }, cmd('bai-4'), err('b4-chet-may'), err('b4-chet-may'), cmd('bai-5'), err('b5-chet-may'), err('b5-chet-may')]).s;
  assert.equal(score(tt108, s), 85);
});

test('hoàn tác lỗi quá 30 giây thì không còn hạn giờ xuất phát', () => {
  let s = run(R, [cmd('a')]).s; // lệnh lúc 2000, hạn 32000
  s = reduce(R, s, err('a-dc'), 32000).session;
  assert.equal(status(R, s), 'suspended');
  s = reduce(R, s, { type: 'undo' }, 40000).session;
  assert.equal(status(R, s), 'running');
  assert.equal(startDeadline(s), null);
});

test('ra lệnh bài thứ hai nghĩa là xe đã qua vạch: hết hạn giờ', () => {
  const s = run(R, [cmd('a'), cmd('b')]).s;
  assert.equal(startDeadline(s), null);
});

test('bấm lệnh cùng bài hai lần liền trong 1,5 giây chỉ tính một lượt', () => {
  let s = run(R, [cmd('a')]).s;
  s = reduce(R, s, cmd('b'), 10000).session;
  const again = reduce(R, s, cmd('b'), 11000);
  assert.equal(again.effects[0].type, 'rejected');
  assert.equal(again.session.events.length, s.events.length);
  assert.equal(reduce(R, s, cmd('b'), 11600).effects[0].type, 'play');
});

test('hoàn tác chỉ gỡ đúng lỗi được chỉ định, bấm đúp không gỡ hai lỗi', () => {
  let s = run(R, [cmd('a'), err('a-5'), cmd('b'), err('b-10')]).s;
  const lastAt = s.events.filter((e) => e.type === 'error').at(-1).at;
  s = reduce(R, s, { type: 'undo', errorAt: lastAt }, 9000).session;
  const second = reduce(R, s, { type: 'undo', errorAt: lastAt }, 9100);
  assert.equal(second.effects[0].type, 'rejected');
  assert.equal(score(R, second.session), 95);
});
