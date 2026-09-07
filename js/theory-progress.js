// Per-viewer study progress: bookmarked ("lưu") questions and questions
// answered wrong at least once ("câu đã sai"). Pure id-set logic, storage
// injected so it's testable without a DOM/localStorage.
const KEY_SAVED = 'theory-saved-ids';
const KEY_WRONG = 'theory-wrong-ids';

function loadSet(storage, key) {
  try {
    const raw = storage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSet(storage, key, set) {
  try {
    storage.setItem(key, JSON.stringify([...set]));
  } catch {
    // storage blocked (private mode / quota) — progress just won't persist
  }
}

export function createProgressStore(storage) {
  const saved = loadSet(storage, KEY_SAVED);
  const wrong = loadSet(storage, KEY_WRONG);

  return {
    isSaved: (id) => saved.has(id),
    toggleSaved: (id) => {
      if (saved.has(id)) saved.delete(id);
      else saved.add(id);
      saveSet(storage, KEY_SAVED, saved);
    },
    getSavedIds: () => [...saved],

    isWrong: (id) => wrong.has(id),
    // Practice mode calls this after every immediate-feedback answer: wrong
    // answers join the review list, a correct retry clears them from it.
    recordAnswer: (id, correct) => {
      if (correct) wrong.delete(id);
      else wrong.add(id);
      saveSet(storage, KEY_WRONG, wrong);
    },
    getWrongIds: () => [...wrong],
  };
}
