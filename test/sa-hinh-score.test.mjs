import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { saHinhScore } from '../js/sa-hinh-score.js';

const keys = JSON.parse(readFileSync(new URL('../content/sa-hinh-loi.json', import.meta.url), 'utf8'));
const byLabel = (label) => keys.find((k) => k.label === label);

test('mọi phím lỗi sa hình có mức trừ hợp lệ hoặc là đình chỉ', () => {
  for (const k of keys) {
    if (k.suspend) assert.equal(k.points, undefined, k.label);
    else assert.ok([1, 5, 10].includes(k.points), `${k.label}: ${k.points}`);
  }
});

test('mức trừ theo TT 12/2025 Phụ lục IV mục C.I', () => {
  assert.equal(byLabel('Xe chạm vạch').points, 5);
  assert.equal(byLabel('Vượt đèn đỏ').points, 10);
  assert.equal(byLabel('Quá tốc độ').points, 1);
  assert.equal(byLabel('Tụt dốc quá 50 cm').suspend, true);
  assert.equal(byLabel('Bạn đã đi sai quy cách thi').suspend, true);
});

test('bắt đầu 100 điểm, đang thi', () => {
  assert.deepEqual(saHinhScore([]), { score: 100, status: 'running' });
});

test('trừ cộng dồn mỗi lần bấm', () => {
  assert.deepEqual(saHinhScore([byLabel('Xe chạm vạch'), byLabel('Xe chạm vạch'), byLabel('Quá tốc độ')]), { score: 89, status: 'running' });
});

test('dưới 80 là không đạt', () => {
  const pressed = [byLabel('Vượt đèn đỏ'), byLabel('Vượt đèn đỏ'), byLabel('Quá tốc độ')];
  assert.deepEqual(saHinhScore(pressed), { score: 79, status: 'failed' });
  assert.deepEqual(saHinhScore(pressed.slice(0, 2)), { score: 80, status: 'running' });
});

test('lỗi đình chỉ không trừ điểm, chuyển sang đình chỉ', () => {
  assert.deepEqual(saHinhScore([byLabel('Xe chạm vạch'), byLabel('Tụt dốc quá 50 cm')]), { score: 95, status: 'suspended' });
});
