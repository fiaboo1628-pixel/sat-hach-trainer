import test from 'node:test';
import assert from 'node:assert/strict';
import { vietNumber } from '../tools/viet-number.mjs';

test('số đọc thành chữ cho câu đọc điểm', () => {
  const cases = {
    0: 'không', 1: 'một', 5: 'năm', 10: 'mười', 11: 'mười một', 14: 'mười bốn', 15: 'mười lăm',
    20: 'hai mươi', 21: 'hai mươi mốt', 24: 'hai mươi tư', 25: 'hai mươi lăm', 55: 'năm mươi lăm',
    70: 'bảy mươi', 79: 'bảy mươi chín', 80: 'tám mươi', 85: 'tám mươi lăm', 91: 'chín mươi mốt', 100: 'một trăm',
  };
  for (const [n, words] of Object.entries(cases)) assert.equal(vietNumber(Number(n)), words, n);
});
