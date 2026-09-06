import { generateExam, gradeExam } from './theory.js';
import { HANG_CONFIG } from './theory-config.js';

const state = { hangKey: null, exam: [], answers: {}, secondsLeft: 0, timerId: null };

export function initTheory(questions, { showView, setStatus }) {
  const els = {
    timer: document.getElementById('theory-timer'),
    questions: document.getElementById('theory-questions'),
    resultSummary: document.getElementById('theory-result-summary'),
  };

  function renderExam(exam) {
    els.questions.innerHTML = '';
    exam.forEach((q) => {
      const li = document.createElement('li');
      const p = document.createElement('p');
      p.textContent = q.text;
      li.appendChild(p);
      if (q.image) {
        const img = document.createElement('img');
        img.src = `content/theory/images/${q.image}`;
        img.alt = q.text;
        li.appendChild(img);
      }
      q.choices.forEach((choice, choiceIndex) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `q-${q.id}`;
        input.value = String(choiceIndex);
        input.addEventListener('change', () => {
          state.answers[q.id] = choiceIndex;
        });
        label.appendChild(input);
        label.append(` ${choice}`);
        li.appendChild(label);
      });
      els.questions.appendChild(li);
    });
  }

  function updateTimerDisplay() {
    const secs = Math.max(state.secondsLeft, 0);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    els.timer.textContent = `Thời gian còn lại: ${m}:${String(s).padStart(2, '0')}`;
  }

  function cancelTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function startTimer() {
    cancelTimer();
    updateTimerDisplay();
    state.timerId = setInterval(() => {
      state.secondsLeft -= 1;
      updateTimerDisplay();
      if (state.secondsLeft <= 0) {
        submitExam();
      }
    }, 1000);
  }

  function startExam(hangKey) {
    const config = HANG_CONFIG[hangKey];
    let exam;
    try {
      exam = generateExam(questions, config);
    } catch (err) {
      setStatus(`Lỗi sinh đề: ${err.message}`);
      return;
    }
    state.hangKey = hangKey;
    state.exam = exam;
    state.answers = {};
    state.secondsLeft = config.minutes * 60;
    renderExam(exam);
    startTimer();
    showView('theory-exam');
  }

  function submitExam() {
    cancelTimer();
    const config = HANG_CONFIG[state.hangKey];
    const result = gradeExam(state.exam, state.answers, config);
    els.resultSummary.textContent =
      `Đúng ${result.correct}/${result.total}` +
      (result.lietWrong ? ' — sai câu điểm liệt' : '') +
      ` — ${result.pass ? 'ĐẬU' : 'RỚT'}`;
    showView('theory-result');
  }

  document.getElementById('btn-hang-b').addEventListener('click', () => startExam('B'));
  document.getElementById('btn-hang-c1').addEventListener('click', () => startExam('C1'));
  document.getElementById('theory-submit').addEventListener('click', () => submitExam());
  document.getElementById('theory-retry').addEventListener('click', () => showView('theory-menu'));

  return { cancelTimer };
}
