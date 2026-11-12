import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateExam,
  gradeExam,
  questionsForLicense,
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

test('content/theory/questions.json không còn rác trích PDF trong đáp án (tiêu đề chương, 2 đáp án dính nhau)', () => {
  const bad = questions.filter((q) => q.choices.some((c) => /CHƯƠNG|\.\s+\d\.\s/.test(c))).map((q) => q.id);
  assert.deepEqual(bad, []);
});

test('câu 302 chọn biển 1 và biển 2 theo đáp án gạch chân của Cục CSGT', () => {
  const question = questions.find((q) => q.id === 'q302');
  assert.equal(question.choices[question.answer], 'Biển 1 và biển 2.');
});

test('content/theory/questions.json is_liet khớp chapter "tinh-huong-atgt" (2 chiều)', () => {
  assert.deepEqual(validateLietChapterConsistency(questions), []);
});

test('ngân hàng có đủ 600 câu, 60 câu điểm liệt và đúng bộ con theo hạng', () => {
  assert.equal(questions.length, 600);
  assert.equal(questions.filter((q) => q.is_liet).length, 60);
  for (const [key, size, critical] of [['A1', 250, 20], ['A', 250, 20], ['B1', 300, 30]]) {
    const bank = questionsForLicense(questions, HANG_CONFIG[key]);
    assert.equal(bank.length, size, key);
    assert.equal(bank.filter((q) => q.is_liet).length, critical, key);
    assert.deepEqual(validateLietChapterConsistency(bank), [], key);
    assert.equal(bank.find((q) => q.id === 'q032').is_liet, false, key);
    assert.equal(bank.find((q) => q.id === 'q032').chapter, 'quy-tac', key);
  }
});

test('sinh đề cho cả 15 hạng đúng ngân hàng, cơ cấu và số câu điểm liệt', () => {
  assert.equal(Object.keys(HANG_CONFIG).length, 15);
  for (const [key, config] of Object.entries(HANG_CONFIG)) {
    const bank = new Map(questionsForLicense(questions, config).map((q) => [q.id, q]));
    for (let attempt = 0; attempt < 10; attempt++) {
      const exam = generateExam(questions, config);
      assert.equal(exam.length, config.count, key);
      assert.equal(new Set(exam.map((q) => q.id)).size, config.count, key);
      assert.equal(exam.filter((q) => q.is_liet).length, 1, key);
      for (const q of exam) assert.deepEqual(q, bank.get(q.id), key);
      for (const [chapters, count] of Object.entries(config.groups)) {
        const quota = exam.filter((q) => !q.is_liet && chapters.split('+').includes(q.chapter));
        assert.equal(quota.length, count, `${key}: ${chapters}`);
      }
    }
  }
});
