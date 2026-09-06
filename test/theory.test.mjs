import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateExam,
  gradeExam,
  validateQuestionIds,
  validateAnswerIndices,
  validateLietChapterConsistency,
} from '../js/theory.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HANG_CONFIG } from '../js/theory-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const questions = JSON.parse(readFileSync(join(__dirname, '../content/theory/questions.json'), 'utf8'));

const sampleQuestions = [
  { id: 'q1', text: 'Q1', choices: ['a', 'b'], answer: 0, is_liet: false, chapter: 'a', image: null },
  { id: 'q2', text: 'Q2', choices: ['a', 'b'], answer: 1, is_liet: false, chapter: 'a', image: null },
  { id: 'q3', text: 'Q3', choices: ['a', 'b'], answer: 0, is_liet: false, chapter: 'a', image: null },
  { id: 'q4', text: 'Q4', choices: ['a', 'b', 'c'], answer: 2, is_liet: false, chapter: 'b', image: null },
  { id: 'q5', text: 'Q5', choices: ['a', 'b'], answer: 1, is_liet: false, chapter: 'b', image: null },
  { id: 'q6', text: 'Q6', choices: ['a', 'b', 'c'], answer: 2, is_liet: true, chapter: 'tinh-huong-atgt', image: null },
  { id: 'q7', text: 'Q7', choices: ['a', 'b'], answer: 1, is_liet: true, chapter: 'tinh-huong-atgt', image: null },
];

test('generateExam trả đúng số câu, đúng 1 câu điểm liệt, đúng quota mỗi nhóm, không trùng id (chạy nhiều lần)', () => {
  const config = { count: 4, minutes: 10, passScore: 3, groups: { a: 2, b: 1 } };
  for (let i = 0; i < 30; i++) {
    const exam = generateExam(sampleQuestions, config);
    assert.equal(exam.length, 4);
    assert.equal(exam.filter((q) => q.is_liet).length, 1);
    assert.equal(exam.filter((q) => q.chapter === 'a').length, 2);
    assert.equal(exam.filter((q) => q.chapter === 'b').length, 1);
    assert.equal(new Set(exam.map((q) => q.id)).size, 4);
  }
});

test('generateExam báo lỗi khi không có câu điểm liệt nào', () => {
  const noLiet = sampleQuestions.filter((q) => !q.is_liet);
  assert.throws(
    () => generateExam(noLiet, { count: 2, minutes: 1, passScore: 1, groups: { a: 1 } }),
    /điểm liệt/,
  );
});

test('generateExam báo lỗi khi 1 nhóm không đủ câu', () => {
  const config = { count: 10, minutes: 1, passScore: 1, groups: { a: 5, b: 2 } };
  assert.throws(() => generateExam(sampleQuestions, config), /"a"/);
});

test('gradeExam: đủ điểm và đúng hết điểm liệt -> Đậu', () => {
  const exam = [sampleQuestions[0], sampleQuestions[5]];
  const answers = { q1: 0, q6: 2 };
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 2 });
  assert.deepEqual(result, { correct: 2, total: 2, lietWrong: false, pass: true });
});

test('gradeExam: đủ điểm nhưng sai câu điểm liệt -> Rớt', () => {
  const exam = [sampleQuestions[0], sampleQuestions[5]];
  const answers = { q1: 0, q6: 0 };
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 1 });
  assert.equal(result.lietWrong, true);
  assert.equal(result.pass, false);
});

test('gradeExam: đúng hết điểm liệt nhưng thiếu điểm -> Rớt', () => {
  const exam = [sampleQuestions[0], sampleQuestions[1], sampleQuestions[5]];
  const answers = { q1: 1, q2: 0, q6: 2 };
  const result = gradeExam(exam, answers, { count: 3, minutes: 1, passScore: 3 });
  assert.equal(result.correct, 1);
  assert.equal(result.lietWrong, false);
  assert.equal(result.pass, false);
});

test('gradeExam: câu chưa trả lời tính là sai', () => {
  const exam = [sampleQuestions[0], sampleQuestions[5]];
  const answers = { q6: 2 };
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 2 });
  assert.equal(result.correct, 1);
  assert.equal(result.pass, false);
});

test('gradeExam: câu điểm liệt chưa trả lời cũng tính là sai điểm liệt', () => {
  const exam = [sampleQuestions[0], sampleQuestions[5]];
  const answers = { q1: 0 }; // q6 (điểm liệt) chưa trả lời
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 2 });
  assert.equal(result.lietWrong, true);
  assert.equal(result.pass, false);
});

test('validateQuestionIds phát hiện id trùng', () => {
  const dup = [...sampleQuestions, { ...sampleQuestions[0] }];
  assert.deepEqual(validateQuestionIds(dup), ['q1']);
});

test('validateAnswerIndices phát hiện answer ngoài phạm vi choices', () => {
  const bad = [{ id: 'qx', text: '', choices: ['a', 'b'], answer: 5, is_liet: false, chapter: '', image: null }];
  assert.deepEqual(validateAnswerIndices(bad), ['qx']);
});

test('validateLietChapterConsistency phát hiện is_liet và chapter lệch nhau', () => {
  const bad = [
    { id: 'q1', is_liet: true, chapter: 'quy-tac' }, // is_liet nhưng sai chapter
    { id: 'q2', is_liet: false, chapter: 'tinh-huong-atgt' }, // chapter đúng nhưng is_liet sai
    { id: 'q3', is_liet: true, chapter: 'tinh-huong-atgt' }, // khớp, không lỗi
  ];
  assert.deepEqual(validateLietChapterConsistency(bad), ['q1', 'q2']);
});

test('content/theory/questions.json không có id trùng', () => {
  assert.deepEqual(validateQuestionIds(questions), []);
});

test('content/theory/questions.json mọi câu có answer hợp lệ trong choices', () => {
  assert.deepEqual(validateAnswerIndices(questions), []);
});

test('content/theory/questions.json is_liet khớp chapter "tinh-huong-atgt" (2 chiều)', () => {
  assert.deepEqual(validateLietChapterConsistency(questions), []);
});

test('content/theory/questions.json đủ câu điểm liệt và đủ quota từng nhóm cho cả 2 hạng', () => {
  const liet = questions.filter((q) => q.is_liet).length;
  assert.ok(liet >= 1, 'cần ít nhất 1 câu điểm liệt');
  for (const hang of Object.values(HANG_CONFIG)) {
    for (const [chapter, quota] of Object.entries(hang.groups)) {
      const pool = questions.filter((q) => !q.is_liet && q.chapter === chapter).length;
      assert.ok(pool >= quota, `nhóm "${chapter}" cần ít nhất ${quota} câu, có ${pool}`);
    }
  }
});

test('generateExam sinh được đề hợp lệ cho cả 2 hạng từ data thật', () => {
  for (const key of Object.keys(HANG_CONFIG)) {
    const exam = generateExam(questions, HANG_CONFIG[key]);
    assert.equal(exam.length, HANG_CONFIG[key].count);
  }
});
