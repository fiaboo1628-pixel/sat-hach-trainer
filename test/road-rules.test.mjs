import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(`content/rules/${name}`, root), 'utf8'));
const tt12 = load('duong-truong-tt12.json');
const tt108 = load('duong-truong-tt108.json');
const SETS = [tt12, tt108];
const byId = (rules, id) => rules.errors.find((e) => e.id === id);
const exerciseErrors = (rules, index) => rules.exercises[index].errors.map((id) => byId(rules, id));

test('mỗi bộ luật có đủ khoá bắt buộc', () => {
  for (const r of SETS) {
    for (const key of ['id', 'document', 'scope', 'citationBase']) assert.equal(typeof r[key], 'string', key);
    assert.equal(r.startScore, 100);
    assert.equal(r.passMark, 80);
    assert.equal(typeof r.minDistanceKm, 'number');
    assert.ok(Array.isArray(r.exercises) && r.exercises.length);
    assert.ok(Array.isArray(r.commonErrors));
    assert.ok(Array.isArray(r.errors) && r.errors.length);
    for (const n of ['suspended', 'failed', 'passed', 'startTimeout']) assert.equal(typeof r.notices[n], 'string', n);
    for (const ex of r.exercises) {
      for (const key of ['id', 'name', 'label', 'commandAudio', 'watch', 'citation']) assert.equal(typeof ex[key], 'string', `${ex.id}.${key}`);
      assert.ok(['first', 'last', 'any'].includes(ex.position), ex.id);
      assert.equal(typeof ex.conditional, 'boolean', ex.id);
      assert.ok(Array.isArray(ex.errors), ex.id);
    }
    for (const e of r.errors) {
      for (const key of ['id', 'label', 'official', 'citation', 'audio', 'say']) assert.equal(typeof e[key], 'string', `${e.id}.${key}`);
      assert.equal(typeof e.suspend, 'boolean', e.id);
      assert.equal(typeof e.perOccurrence, 'boolean', e.id);
      assert.ok(['device', 'examiner', 'examiner-inferred'].includes(e.detectedBy), e.id);
    }
  }
});

test('id bài và id lỗi không trùng', () => {
  for (const r of SETS) {
    const ex = r.exercises.map((e) => e.id);
    const er = r.errors.map((e) => e.id);
    assert.equal(new Set(ex).size, ex.length, r.id);
    assert.equal(new Set(er).size, er.length, r.id);
  }
});

test('mọi id lỗi được tham chiếu đều tồn tại', () => {
  for (const r of SETS) {
    const ids = new Set(r.errors.map((e) => e.id));
    for (const ex of r.exercises) for (const id of ex.errors) assert.ok(ids.has(id), `${r.id} ${ex.id} → ${id}`);
    for (const id of r.commonErrors) assert.ok(ids.has(id), `${r.id} common → ${id}`);
  }
});

test('mức trừ hợp lệ', () => {
  for (const r of SETS) {
    for (const e of r.errors) {
      if (e.suspend) assert.equal(e.points, null, e.id);
      else assert.ok([2, 5, 10].includes(e.points), `${e.id}: ${e.points}`);
    }
  }
});

test('mọi lỗi có nguyên văn và trích dẫn', () => {
  for (const r of SETS) {
    for (const e of r.errors) {
      assert.ok(e.official.trim().length > 5, e.id);
      assert.ok(e.citation.trim().length > 3, e.id);
    }
  }
});

test('đúng một bài đầu và một bài cuối', () => {
  for (const r of SETS) {
    assert.equal(r.exercises.filter((e) => e.position === 'first').length, 1, r.id);
    assert.equal(r.exercises.filter((e) => e.position === 'last').length, 1, r.id);
    assert.equal(r.exercises[0].position, 'first');
    assert.equal(r.exercises.at(-1).position, 'last');
  }
});

test('hiệu lực không chồng nhau', () => {
  assert.equal(tt12.validFrom, null);
  assert.equal(tt12.validTo, '2027-02-28');
  assert.equal(tt108.validFrom, '2027-03-01');
  assert.equal(tt108.validTo, null);
});

test('TT 12 có 4 bài, TT 108 có 12 bài; bài 3 và 11 có điều kiện', () => {
  assert.equal(tt12.exercises.length, 4);
  assert.equal(tt108.exercises.length, 12);
  assert.equal(tt108.exercises[2].conditional, true);
  assert.equal(tt108.exercises[10].conditional, true);
  assert.equal(tt108.exercises.filter((e) => e.conditional).length, 2);
});

test('mọi file âm thanh tồn tại', { todo: 'audio rendered in Task 6' }, () => {
  for (const r of SETS) {
    const files = [
      ...r.exercises.map((e) => e.commandAudio),
      ...r.errors.map((e) => e.audio),
      ...Object.values(r.notices),
    ];
    for (const f of files) assert.ok(existsSync(new URL(`content/audio/${f}`, root)), f);
  }
});

test('TT 12: các mức trừ chốt theo văn bản', () => {
  const find = (text) => tt12.errors.find((e) => e.official.includes(text));
  assert.equal(find('Quá 30 giây').suspend, true);
  const so3 = find('Sử dụng từ tay số 3 trở lên khi tốc độ xe chạy dưới 20 km/h');
  assert.equal(so3.points, 2);
  assert.equal(so3.perOccurrence, true);
  assert.equal(find('Vi phạm quy tắc giao thông đường bộ').points, 10);
  assert.equal(find('chết máy').perOccurrence, true);
  assert.ok(!tt12.errors.some((e) => /Vào số sai|Vào sai số/.test(e.label + e.official)));
});

test('TT 108: các mức trừ chốt theo văn bản', () => {
  const belt = exerciseErrors(tt108, 0).find((e) => e.official.startsWith('Không thắt dây an toàn'));
  assert.equal(belt.points, 10);
  assert.equal(belt.detectedBy, 'device');
  const stall4 = exerciseErrors(tt108, 3).find((e) => e.official.includes('chết máy'));
  const stall5 = exerciseErrors(tt108, 4).find((e) => e.official.includes('chết máy'));
  assert.equal(stall4.perOccurrence, false);
  assert.equal(stall5.perOccurrence, true);
  assert.equal(exerciseErrors(tt108, 0).find((e) => e.official.startsWith('Quá 30 giây')).suspend, true);
});
