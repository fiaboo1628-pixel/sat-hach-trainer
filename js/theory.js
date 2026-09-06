function pickRandom(pool, n) {
  const copy = [...pool];
  const picked = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return picked;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateExam(questions, config) {
  const lietPool = questions.filter((q) => q.is_liet);
  const normalPool = questions.filter((q) => !q.is_liet);
  if (lietPool.length < 1) {
    throw new Error('Không có câu điểm liệt nào trong ngân hàng câu hỏi.');
  }
  if (normalPool.length < config.count - 1) {
    throw new Error(`Không đủ câu thường (cần ${config.count - 1}, có ${normalPool.length}).`);
  }
  const liet = pickRandom(lietPool, 1);
  const normal = pickRandom(normalPool, config.count - 1);
  return shuffle([...liet, ...normal]);
}

export function gradeExam(examQuestions, answers, config) {
  const correct = examQuestions.filter((q) => answers[q.id] === q.answer).length;
  const lietWrong = examQuestions.some((q) => q.is_liet && answers[q.id] !== q.answer);
  const pass = !lietWrong && correct >= config.passScore;
  return { correct, total: examQuestions.length, lietWrong, pass };
}

export function validateQuestionIds(questions) {
  const seen = new Set();
  const dupes = [];
  for (const q of questions) {
    if (seen.has(q.id)) dupes.push(q.id);
    seen.add(q.id);
  }
  return dupes;
}

export function validateAnswerIndices(questions) {
  return questions
    .filter((q) => !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length)
    .map((q) => q.id);
}
