import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildPlaylist, validateStations, validateStandardSet } from '../js/playlist.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stations = JSON.parse(readFileSync(join(__dirname, '../content/stations.json'), 'utf8'));
const standardSet = JSON.parse(readFileSync(join(__dirname, '../content/standard-set.json'), 'utf8'));

test('stations.json không có id trùng', () => {
  assert.deepEqual(validateStations(stations), []);
});

test('standard-set.json có đúng 13 phần tử', () => {
  assert.equal(standardSet.length, 13);
});

test('standard-set.json chỉ dùng id có trong stations.json', () => {
  assert.deepEqual(validateStandardSet(standardSet, stations), []);
});

test('buildPlaylist giữ đúng thứ tự và độ dài, kể cả id lặp lại', () => {
  const ids = ['xuat-phat', 'nga-tu-den-tin-hieu', 'nga-tu-den-tin-hieu', 'ket-thuc'];
  const playlist = buildPlaylist(ids, stations);
  assert.equal(playlist.length, 4);
  assert.equal(playlist[0].id, 'xuat-phat');
  assert.equal(playlist[1].id, 'nga-tu-den-tin-hieu');
  assert.equal(playlist[2].id, 'nga-tu-den-tin-hieu');
  assert.equal(playlist[3].id, 'ket-thuc');
});

test('buildPlaylist báo lỗi rõ ràng khi id không tồn tại', () => {
  assert.throws(() => buildPlaylist(['khong-ton-tai'], stations), /Không tìm thấy station id/);
});
