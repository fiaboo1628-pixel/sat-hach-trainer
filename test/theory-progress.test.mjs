import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressStore } from '../js/theory-progress.js';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
  };
}

test('toggleSaved thêm/bỏ id, giữ qua lần load lại (persist)', () => {
  const storage = fakeStorage();
  let store = createProgressStore(storage);
  assert.equal(store.isSaved('q1'), false);
  store.toggleSaved('q1');
  assert.equal(store.isSaved('q1'), true);

  store = createProgressStore(storage); // simulate reload
  assert.deepEqual(store.getSavedIds(), ['q1']);
  store.toggleSaved('q1');
  assert.equal(store.isSaved('q1'), false);
});

test('recordAnswer sai thì thêm vào wrong, đúng lại thì bỏ ra', () => {
  const store = createProgressStore(fakeStorage());
  store.recordAnswer('q1', false);
  assert.equal(store.isWrong('q1'), true);
  store.recordAnswer('q1', true);
  assert.equal(store.isWrong('q1'), false);
  assert.deepEqual(store.getWrongIds(), []);
});

test('storage lỗi (vd private mode) không throw, chỉ không persist', () => {
  const badStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  const store = createProgressStore(badStorage);
  assert.doesNotThrow(() => store.toggleSaved('q1'));
  assert.equal(store.isSaved('q1'), true); // in-memory still works this session
});
