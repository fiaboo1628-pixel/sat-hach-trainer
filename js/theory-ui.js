import { generateExam, gradeExam } from './theory.js';
import { HANG_CONFIG, CHAPTER_LABELS, CHAPTER_ORDER } from './theory-config.js';
import { createProgressStore } from './theory-progress.js';

const state = { hangKey: null, exam: [], answers: {}, deadline: 0, timerId: null };
const progress = createProgressStore(window.localStorage);

// Shared by "ôn tập" (practice, untimed) and "xem lại bài làm" (exam review):
// one question, a ☆ bookmark, and choices that reveal correct/wrong the
// moment you pick one (unlike the timed exam's plain radio buttons, which
// stay changeable until Nộp bài).
function renderAnsweredCard(q, { userAnswer, onChoose, readOnly }) {
  const li = document.createElement('li');

  const star = document.createElement('button');
  star.type = 'button';
  star.className = 'star-btn';
  const syncStar = () => {
    const on = progress.isSaved(q.id);
    star.textContent = on ? '★' : '☆';
    star.setAttribute('aria-label', on ? 'Bỏ lưu câu này' : 'Lưu câu này để ôn sau');
  };
  syncStar();
  star.addEventListener('click', () => {
    progress.toggleSaved(q.id);
    syncStar();
  });
  li.appendChild(star);

  const p = document.createElement('p');
  p.textContent = q.text;
  li.appendChild(p);
  if (q.image) {
    const img = document.createElement('img');
    img.src = `content/theory/images/${q.image}`;
    img.alt = '';
    img.onerror = () => img.remove();
    li.appendChild(img);
  }

  q.choices.forEach((choice, choiceIndex) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.textContent = choice;
    const answered = userAnswer !== undefined && userAnswer !== null;
    // Review always reveals the correct answer (even for a question you
    // left blank, so you actually learn it); practice reveals only once
    // you've picked something.
    if (readOnly || answered) {
      btn.disabled = true;
      if (choiceIndex === q.answer) btn.classList.add('choice-correct');
      else if (answered && choiceIndex === userAnswer) btn.classList.add('choice-wrong');
    } else {
      btn.addEventListener('click', () => onChoose(choiceIndex));
    }
    li.appendChild(btn);
  });
  return li;
}

export function initTheory(questions, { showView, setStatus }) {
  const els = {
    timer: document.getElementById('theory-timer'),
    questions: document.getElementById('theory-questions'),
    resultSummary: document.getElementById('theory-result-summary'),
    practiceTopics: document.getElementById('practice-topics'),
    practiceTitle: document.getElementById('practice-title'),
    practiceQuestions: document.getElementById('practice-questions'),
    reviewQuestions: document.getElementById('review-questions'),
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
        img.alt = '';
        img.onerror = () => img.remove();
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
    const secs = Math.max(Math.ceil((state.deadline - Date.now()) / 1000), 0);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    els.timer.textContent = `Thời gian còn lại: ${m}:${String(s).padStart(2, '0')}`;
    els.timer.classList.toggle('time-danger', secs <= 60);
    els.timer.classList.toggle('time-warn', secs > 60 && secs <= 300);
    return secs;
  }

  function cancelTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function startTimer() {
    cancelTimer();
    updateTimerDisplay();
    state.timerId = setInterval(() => {
      const secs = updateTimerDisplay();
      if (secs <= 0) {
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
    state.deadline = Date.now() + config.minutes * 60000;
    renderExam(exam);
    startTimer();
    showView('theory-exam');
  }

  function submitExam() {
    cancelTimer();
    const config = HANG_CONFIG[state.hangKey];
    const result = gradeExam(state.exam, state.answers, config);
    state.exam.forEach((q) => progress.recordAnswer(q.id, state.answers[q.id] === q.answer));
    const badge = result.pass
      ? '<span class="badge badge-pass">ĐẬU</span>'
      : '<span class="badge badge-fail">RỚT</span>';
    els.resultSummary.innerHTML =
      `Đúng ${result.correct}/${result.total}` +
      (result.lietWrong ? ' — sai câu điểm liệt' : '') +
      ` — ${badge}`;
    showView('theory-result');
  }

  function reviewExam() {
    els.reviewQuestions.innerHTML = '';
    state.exam.forEach((q) => {
      els.reviewQuestions.appendChild(
        renderAnsweredCard(q, { userAnswer: state.answers[q.id] ?? null, readOnly: true }),
      );
    });
    showView('theory-review');
  }

  // "Ôn tập theo chủ đề": pick a topic (real chapter, hoặc câu đã lưu/đã sai)
  // and browse every question in it untimed, with instant right/wrong
  // feedback per question instead of a submit-at-the-end exam.
  const PSEUDO_TOPICS = [
    { key: '__saved', label: 'Câu đã lưu', cls: 'tile-yellow', pick: () => progress.getSavedIds() },
    { key: '__wrong', label: 'Câu đã từng làm sai', cls: 'tile-yellow', pick: () => progress.getWrongIds() },
  ];

  function questionsForTopic(topicKey) {
    if (topicKey === '__saved' || topicKey === '__wrong') {
      const ids = new Set(PSEUDO_TOPICS.find((t) => t.key === topicKey).pick());
      return questions.filter((q) => ids.has(q.id));
    }
    return questions.filter((q) => q.chapter === topicKey);
  }

  function openPracticeMenu() {
    els.practiceTopics.innerHTML = '';
    const addTile = (key, label, cls) => {
      const count = questionsForTopic(key).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tile ${cls}`;
      btn.textContent = `${label} (${count})`;
      btn.disabled = count === 0;
      btn.addEventListener('click', () => openPracticeTopic(key, label));
      els.practiceTopics.appendChild(btn);
    };
    CHAPTER_ORDER.forEach((key) =>
      addTile(key, CHAPTER_LABELS[key], key === 'tinh-huong-atgt' ? 'tile-red' : 'tile-blue'),
    );
    PSEUDO_TOPICS.forEach((t) => addTile(t.key, t.label, t.cls));
    showView('theory-practice-menu');
  }

  function openPracticeTopic(topicKey, label) {
    const list = questionsForTopic(topicKey);
    els.practiceTitle.textContent = label;
    els.practiceQuestions.innerHTML = '';
    const answered = {};
    list.forEach((q) => {
      const renderCard = () => {
        const li = renderAnsweredCard(q, {
          userAnswer: answered[q.id],
          onChoose: (choiceIndex) => {
            answered[q.id] = choiceIndex;
            progress.recordAnswer(q.id, choiceIndex === q.answer);
            li.replaceWith(renderCard());
          },
        });
        return li;
      };
      els.practiceQuestions.appendChild(renderCard());
    });
    showView('theory-practice');
  }

  document.getElementById('btn-hang-b').addEventListener('click', () => startExam('B'));
  document.getElementById('btn-hang-c1').addEventListener('click', () => startExam('C1'));
  document.getElementById('btn-theory-practice').addEventListener('click', openPracticeMenu);
  // Own listener (not the generic .btn-back in app.js) because coming back
  // from a topic must re-render the menu — counts (câu đã lưu/đã sai) can
  // have changed while browsing that topic.
  document.getElementById('btn-practice-back').addEventListener('click', openPracticeMenu);
  document.getElementById('theory-submit').addEventListener('click', () => submitExam());
  document.getElementById('theory-retry').addEventListener('click', () => showView('theory-menu'));
  document.getElementById('theory-review-btn').addEventListener('click', reviewExam);

  return { cancelTimer };
}
