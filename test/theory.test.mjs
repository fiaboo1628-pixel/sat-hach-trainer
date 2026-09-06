import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExam, gradeExam, validateQuestionIds, validateAnswerIndices } from '../js/theory.js';

const sampleQuestions = [
  { id: 'q1', text: 'Q1', choices: ['a', 'b'], answer: 0, is_liet: false, chapter: 'x', image: null },
  { id: 'q2', text: 'Q2', choices: ['a', 'b'], answer: 1, is_liet: false, chapter: 'x', image: null },
  { id: 'q3', text: 'Q3', choices: ['a', 'b'], answer: 0, is_liet: false, chapter: 'x', image: null },
  { id: 'q4', text: 'Q4', choices: ['a', 'b', 'c'], answer: 2, is_liet: true, chapter: 'x', image: null },
  { id: 'q5', text: 'Q5', choices: ['a', 'b'], answer: 1, is_liet: true, chapter: 'x', image: null },
];

test('generateExam trả đúng số câu, đúng 1 câu điểm liệt, không trùng id (chạy nhiều lần)', () => {
  const config = { count: 3, minutes: 10, passScore: 2 };
  for (let i = 0; i < 30; i++) {
    const exam = generateExam(sampleQuestions, config);
    assert.equal(exam.length, 3);
    assert.equal(exam.filter((q) => q.is_liet).length, 1);
    assert.equal(new Set(exam.map((q) => q.id)).size, 3);
  }
});

test('generateExam báo lỗi khi không có câu điểm liệt nào', () => {
  const noLiet = sampleQuestions.filter((q) => !q.is_liet);
  assert.throws(() => generateExam(noLiet, { count: 2, minutes: 1, passScore: 1 }), /điểm liệt/);
});

test('generateExam báo lỗi khi không đủ câu thường', () => {
  const config = { count: 10, minutes: 1, passScore: 1 };
  assert.throws(() => generateExam(sampleQuestions, config), /câu thường/);
});

test('gradeExam: đủ điểm và đúng hết điểm liệt -> Đậu', () => {
  const exam = [sampleQuestions[0], sampleQuestions[3]];
  const answers = { q1: 0, q4: 2 };
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 2 });
  assert.deepEqual(result, { correct: 2, total: 2, lietWrong: false, pass: true });
});

test('gradeExam: đủ điểm nhưng sai câu điểm liệt -> Rớt', () => {
  const exam = [sampleQuestions[0], sampleQuestions[3]];
  const answers = { q1: 0, q4: 0 };
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 1 });
  assert.equal(result.lietWrong, true);
  assert.equal(result.pass, false);
});

test('gradeExam: đúng hết điểm liệt nhưng thiếu điểm -> Rớt', () => {
  const exam = [sampleQuestions[0], sampleQuestions[1], sampleQuestions[3]];
  const answers = { q1: 1, q2: 0, q4: 2 };
  const result = gradeExam(exam, answers, { count: 3, minutes: 1, passScore: 3 });
  assert.equal(result.correct, 1);
  assert.equal(result.lietWrong, false);
  assert.equal(result.pass, false);
});

test('gradeExam: câu chưa trả lời tính là sai', () => {
  const exam = [sampleQuestions[0], sampleQuestions[3]];
  const answers = { q4: 2 };
  const result = gradeExam(exam, answers, { count: 2, minutes: 1, passScore: 2 });
  assert.equal(result.correct, 1);
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
