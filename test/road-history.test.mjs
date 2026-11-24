import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistoryStore, HISTORY_KEY, HISTORY_LIMIT } from '../js/road-history.js';

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}
const result = (createdAt, score = 90) => ({ createdAt, score, turns: [] });

test('khoá lưu và giới hạn', () => {
  assert.equal(HISTORY_KEY, 'duong-truong-lich-su');
  assert.equal(HISTORY_LIMIT, 30);
});

test('add rồi list: mới nhất lên đầu', () => {
  const store = createHistoryStore(fakeStorage());
  store.add(result(1));
  store.add(result(2));
  assert.deepEqual(store.list().map((r) => r.createdAt), [2, 1]);
});

test('add cùng createdAt thì thay bản cũ', () => {
  const store = createHistoryStore(fakeStorage());
  store.add(result(1, 70));
  store.add(result(1, 95));
  assert.deepEqual(store.list().map((r) => r.score), [95]);
});

test('chỉ giữ 30 buổi gần nhất', () => {
  const store = createHistoryStore(fakeStorage());
  for (let i = 1; i <= 35; i++) store.add(result(i));
  const list = store.list();
  assert.equal(list.length, 30);
  assert.equal(list[0].createdAt, 35);
  assert.equal(list.at(-1).createdAt, 6);
});

test('remove theo createdAt và clear', () => {
  const store = createHistoryStore(fakeStorage());
  store.add(result(1));
  store.add(result(2));
  store.remove(1);
  assert.deepEqual(store.list().map((r) => r.createdAt), [2]);
  store.clear();
  assert.deepEqual(store.list(), []);
});

test('giữ được qua lần tải lại', () => {
  const storage = fakeStorage();
  createHistoryStore(storage).add(result(7));
  assert.deepEqual(createHistoryStore(storage).list().map((r) => r.createdAt), [7]);
});

test('dữ liệu hỏng trong storage thì coi như trống, không lỗi', () => {
  assert.deepEqual(createHistoryStore(fakeStorage({ 'duong-truong-lich-su': '{oops' })).list(), []);
  assert.deepEqual(createHistoryStore(fakeStorage({ 'duong-truong-lich-su': '{"a":1}' })).list(), []);
});
