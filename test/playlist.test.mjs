import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildPlaylist, validateStations, validateStandardSet } from '../js/playlist.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stations = JSON.parse(readFileSync(join(__dirname, '../content/stations.json'), 'utf8'));
const standardSet = JSON.parse(readFileSync(join(__dirname, '../content/standard-set.json'), 'utf8'));
const soundboard = JSON.parse(readFileSync(join(__dirname, '../content/soundboard.json'), 'utf8'));

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

test('mỗi station trong stations.json có file audio (và cue nếu có) tồn tại trên đĩa', () => {
  const files = stations.flatMap((s) => [s.audio, s.cue].filter(Boolean));
  const missing = files.filter((f) => !existsSync(join(__dirname, '../content/audio', f)));
  assert.deepEqual(missing, []);
});

test('mỗi phím đường trường trong soundboard.json có file audio tồn tại trên đĩa', () => {
  const missing = soundboard.map((k) => k.audio).filter((f) => !existsSync(join(__dirname, '../content/audio', f)));
  assert.deepEqual(missing, []);
});

// `color` chỉ nhận các token nhóm phím trong style.css, không phải màu CSS tự do: một giá trị
// lạ không làm gì cả, phím hiện ra không màu và chỉ phát hiện được bằng mắt.
test('mỗi phím đường trường dùng color là một token hợp lệ', () => {
  const allowed = new Set(['blue', 'yellow', 'red', 'stop']);
  const bad = soundboard.filter((k) => !allowed.has(k.color)).map((k) => `${k.label}: ${k.color}`);
  assert.deepEqual(bad, []);
});

const saHinhErrors = JSON.parse(readFileSync(join(__dirname, '../content/sa-hinh-loi.json'), 'utf8'));

const saHinhNotices = JSON.parse(readFileSync(join(__dirname, '../content/sa-hinh-thong-bao.json'), 'utf8'));

test('mỗi phím lỗi và thông báo sa hình có file audio tồn tại trên đĩa', () => {
  const missing = [...saHinhErrors, ...saHinhNotices].map((k) => k.audio).filter((f) => !existsSync(join(__dirname, '../content/audio', f)));
  assert.deepEqual(missing, []);
});
