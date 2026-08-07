/* =========================
   FLASHCARDS APP
   Категории + спряжения
========================= */

const state = {
  words: [],
  current: 0,
  category: "",
  known: 0,
  repeated: 0,
  nextRound: [],
  initialTotal: 0,
  round: 1,
  completed: false
};

const STUDY_STATE_KEY = "flashcardsStudyState";
const REQUIRED_CORRECT_ANSWERS = 3;

const wordEl = document.getElementById("word");
const translationEl = document.getElementById("translation");
const statsEl = document.getElementById("stats");
const cardInner = document.getElementById("cardInner");

const topicSelect = document.getElementById("topicSelect");
const fileInput = document.getElementById("fileInput");
const fileNameEl = document.getElementById("fileName");
const statsModal = document.getElementById("statsModal");
const modalStats = document.getElementById("modalStats");
const openStatsBtn = document.getElementById("openStats");
const closeStatsBtn = document.getElementById("closeStats");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");
const knowBtn = document.getElementById("knowBtn");
const repeatBtn = document.getElementById("repeatBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const defaultKnowBtnText = knowBtn?.textContent || "Знаю";
const defaultRepeatBtnText = repeatBtn?.textContent || "Повторить";

function resetProgress() {
  state.current = 0;
  state.known = 0;
  state.repeated = 0;
  state.nextRound = [];
  state.initialTotal = 0;
  state.round = 1;
  state.completed = false;
}

function getCardKey(card, index = 0) {
  return String(card.id ?? `${card.front}|${card.back}|${index}`);
}

function makeWord(card, index = 0) {
  return {
    key: getCardKey(card, index),
    word: formatFront(card),
    translation: formatBack(card),
    raw: card,
    correctCount: 0
  };
}

function readStudyState() {
  try {
    return JSON.parse(localStorage.getItem(STUDY_STATE_KEY)) || null;
  } catch {
    return null;
  }
}

function saveStudyState() {
  if (!state.category) return;

  const payload = {
    category: state.category,
    current: state.current,
    known: state.known,
    repeated: state.repeated,
    initialTotal: state.initialTotal,
    round: state.round,
    completed: state.completed,
    order: state.words.map(item => item.key),
    nextRoundOrder: state.nextRound.map(item => item.key),
    cardProgress: Object.fromEntries(
      [...state.words, ...state.nextRound]
        .map(item => [item.key, item.correctCount])
    )
  };

  try {
    localStorage.setItem(STUDY_STATE_KEY, JSON.stringify(payload));
  } catch {
    // Сайт должен работать даже если браузер запретил сохранение.
  }
}

function isValidStudyState(saved) {
  return Boolean(
    saved &&
    typeof saved.category === "string" &&
    Array.isArray(saved.order) &&
    Array.isArray(saved.nextRoundOrder) &&
    Number.isFinite(Number(saved.current)) &&
    Number.isFinite(Number(saved.known)) &&
    Number.isFinite(Number(saved.repeated)) &&
    Number.isFinite(Number(saved.initialTotal)) &&
    Number.isFinite(Number(saved.round)) &&
    typeof saved.completed === "boolean" &&
    saved.cardProgress &&
    typeof saved.cardProgress === "object"
  );
}

function restoreWordsByOrder(words, order) {
  if (!Array.isArray(order)) return [];

  const savedOrder = order.map(String);
  const byKey = new Map(words.map(word => [word.key, word]));

  return savedOrder
    .map(key => byKey.get(String(key)))
    .filter(Boolean);
}

function restoreWordOrder(words, saved) {
  if (!isValidStudyState(saved)) {
    return words;
  }

  return restoreWordsByOrder(words, saved.order);
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
}

function updateControls() {
  if (state.completed) {
    if (knowBtn) {
      knowBtn.textContent = "Начать заново";
      knowBtn.disabled = false;
    }

    if (repeatBtn) {
      repeatBtn.disabled = true;
    }

    if (shuffleBtn) {
      shuffleBtn.disabled = true;
    }

    return;
  }

  if (knowBtn) {
    knowBtn.textContent = defaultKnowBtnText;
    knowBtn.disabled = false;
  }

  if (repeatBtn) {
    repeatBtn.textContent = defaultRepeatBtnText;
    repeatBtn.disabled = false;
  }

  if (shuffleBtn) {
    shuffleBtn.disabled = false;
  }
}

function getCardKey(card, index = 0) {
  return String(card.id ?? `${card.front}|${card.back}|${index}`);
}

function makeWord(card, index = 0) {
  return {
    key: getCardKey(card, index),
    word: formatFront(card),
    translation: formatBack(card),
    raw: card
  };
}

function readStudyState() {
  try {
    return JSON.parse(localStorage.getItem(STUDY_STATE_KEY)) || null;
  } catch {
    return null;
  }
}

function saveStudyState() {
  if (!state.category || !state.words.length) return;

  const payload = {
    category: state.category,
    current: state.current,
    known: state.known,
    repeated: state.repeated,
    order: state.words.map(item => item.key)
  };

  try {
    localStorage.setItem(STUDY_STATE_KEY, JSON.stringify(payload));
  } catch {
    // Сайт должен работать даже если браузер запретил сохранение.
  }
}

function restoreWordOrder(words, saved) {
  if (!saved?.order?.length) {
    return words;
  }

  const savedOrder = saved.order.map(String);
  const savedKeys = new Set(savedOrder);
  const byKey = new Map(words.map(word => [word.key, word]));
  const restored = savedOrder
    .map(key => byKey.get(String(key)))
    .filter(Boolean);
  const missing = words.filter(word => !savedKeys.has(word.key));

  return [...restored, ...missing];
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCardHint(card) {
  const row = (card.tenses || [])
    .find(item => item.pronoun === "er/sie/es");

  if (row?.perfect) {
    return row.perfect;
  }

  return card.grammar?.case || "";
}

function formatFront(card) {
  const hint = getCardHint(card);

  return `
    <div class="front-word">${escapeHtml(card.front)}</div>
    ${hint ? `<div class="front-hint">(${escapeHtml(hint)})</div>` : ""}
  `;
}

function formatBack(card) {
  const exampleDe = card.exampleDe || card.example || "";
  const exampleRu = card.exampleRu || "";
  const hasExample = exampleDe || exampleRu;

  return `
    <div class="translation-main">${escapeHtml(card.back)}</div>
    ${hasExample ? `
      <div class="example-block">
        ${exampleDe ? `<div class="example-de">${escapeHtml(exampleDe)}</div>` : ""}
        ${exampleRu ? `<div class="example-ru">${escapeHtml(exampleRu)}</div>` : ""}
      </div>
    ` : ""}
  `;
}

function setWordsFromCards(cards, options = {}) {
  const saved = options.restore ? readStudyState() : null;
  const canRestore = saved?.category === state.category &&
    isValidStudyState(saved);
  const allWords = cards.map(makeWord);

  resetProgress();

  if (canRestore) {
    state.words = restoreWordOrder(allWords, saved);
    state.nextRound = restoreWordsByOrder(allWords, saved.nextRoundOrder);
    [...state.words, ...state.nextRound].forEach(word => {
      word.correctCount = Math.max(
        Number(saved.cardProgress?.[word.key]) || 0,
        0
      );
    });
    state.words = state.words.filter(
      word => word.correctCount < REQUIRED_CORRECT_ANSWERS
    );
    state.nextRound = state.nextRound.filter(
      word => word.correctCount < REQUIRED_CORRECT_ANSWERS
    );
    state.current = Math.min(
      Math.max(Number(saved.current) || 0, 0),
      Math.max(state.words.length - 1, 0)
    );
    state.known = Number(saved.known) || 0;
    state.repeated = Number(saved.repeated) || 0;
    state.initialTotal = Number(saved.initialTotal) || cards.length;
    state.round = Math.max(Number(saved.round) || 1, 1);
    state.completed = saved.completed ||
      (!state.words.length && !state.nextRound.length);
  } else {
    state.words = allWords;
    state.initialTotal = state.words.length;
    shuffle(state.words);
  }

  showCard();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function showCard() {
  updateControls();

  if (state.completed) {
    wordEl.textContent = "Категория пройдена 🎉";
    translationEl.innerHTML =
      `<div class="translation-main">Все карточки изучены</div>`;
    statsEl.textContent =
      `Изучено ${state.known} из ${state.initialTotal}`;
    cardInner.classList.remove("flipped");
    saveStudyState();
    return;
  }

  if (!state.words.length) {
    updateControls();
    wordEl.textContent = "Выберите категорию";
    translationEl.innerHTML = "";
    statsEl.textContent = "0 / 0";
    cardInner.classList.remove("flipped");
    return;
  }

  const card = state.words[state.current];

  wordEl.innerHTML = card.word;
  translationEl.innerHTML = card.translation;

  const left = state.words.length + state.nextRound.length;

  statsEl.textContent =
    `Раунд ${state.round} · осталось ${left} · прогресс ${card.correctCount}/${REQUIRED_CORRECT_ANSWERS}`;

  cardInner.classList.remove("flipped");
  saveStudyState();
}

function flipCard() {
  if (!state.words.length || state.completed) return;

  cardInner.classList.toggle("flipped");
}

cardInner.addEventListener("click", flipCard);

function nextCard() {
  if (!state.words.length || state.completed) return;

  if (state.current === state.words.length - 1) {
    shuffle(state.words);
    state.current = 0;
  } else {
    state.current += 1;
  }

  showCard();
}

function prevCard() {
  if (!state.words.length || state.completed) return;

  state.current =
    (state.current - 1 + state.words.length)
    % state.words.length;

  showCard();
}

function finishCurrentCard(shouldRepeat) {
  if (!state.words.length || state.completed) return;

  const [word] = state.words.splice(state.current, 1);

  if (shouldRepeat) {
    word.correctCount = 0;
    state.repeated += 1;
    state.nextRound.push(word);
  } else {
    word.correctCount += 1;

    if (word.correctCount >= REQUIRED_CORRECT_ANSWERS) {
      state.known += 1;
    } else {
      state.nextRound.push(word);
    }
  }

  if (state.current >= state.words.length) {
    state.current = 0;
  }

  if (!state.words.length) {
    if (state.nextRound.length) {
      state.words = state.nextRound;
      state.nextRound = [];
      state.current = 0;
      state.round += 1;
      shuffle(state.words);
    } else {
      state.completed = true;
      state.current = 0;
    }
  }

  showCard();
}

function clearSavedStudyStateForCategory(categoryId) {
  const saved = readStudyState();

  if (saved?.category !== categoryId) return;

  try {
    localStorage.removeItem(STUDY_STATE_KEY);
  } catch {
    localStorage.setItem(STUDY_STATE_KEY, "");
  }
}

function restartCurrentCategory() {
  const category = getCategories()
    .find(item => item.id === state.category);

  if (!category || !Array.isArray(category.cards)) return;

  clearSavedStudyStateForCategory(state.category);
  resetProgress();
  state.category = category.id;
  state.words = category.cards.map(makeWord);
  state.initialTotal = state.words.length;
  state.words.forEach(word => {
    word.correctCount = 0;
  });
  shuffle(state.words);
  showCard();
}

knowBtn.onclick = () => {
  if (state.completed) {
    restartCurrentCategory();
    return;
  }

  finishCurrentCard(false);
};

repeatBtn.onclick = () => {
  if (state.completed) return;

  finishCurrentCard(true);
};

shuffleBtn.onclick = () => {
  if (!state.words.length || state.completed) return;

  shuffle(state.words);
  state.current = 0;
  showCard();
};

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    flipCard();
  }

  if (e.code === "ArrowRight") nextCard();

  if (e.code === "ArrowLeft") prevCard();
});

let startX = 0;

cardInner.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

cardInner.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0].clientX;
  const diff = endX - startX;

  if (diff > 50) prevCard();

  if (diff < -50) nextCard();
});

function getCategories() {
  return window.FLASHCARDS_DATA?.categories || [];
}

function loadCategory(categoryId) {
  const category = getCategories()
    .find(item => item.id === categoryId);

  if (!category || !Array.isArray(category.cards)) {
    state.words = [];
    state.category = "";
    resetProgress();
    showCard();
    wordEl.textContent = "Категория не найдена";
    return;
  }

  state.category = category.id;
  setWordsFromCards(category.cards, { restore: true });
}

function populateCategories() {
  const categories = getCategories();

  topicSelect.innerHTML = "";

  if (!categories.length) {
    const option = document.createElement("option");

    option.value = "";
    option.textContent = "Нет категорий";

    topicSelect.appendChild(option);
    topicSelect.disabled = true;
    showCard();
    return;
  }

  topicSelect.disabled = false;

  categories.forEach(category => {
    const option = document.createElement("option");

    option.value = category.id;
    option.textContent = category.name;

    topicSelect.appendChild(option);
  });

  const saved = readStudyState();
  const canRestoreSavedCategory = isValidStudyState(saved);
  const savedCategoryExists = canRestoreSavedCategory && categories
    .some(category => category.id === saved?.category);
  const startCategory = savedCategoryExists
    ? saved.category
    : categories[0].id;

  topicSelect.value = startCategory;
  loadCategory(startCategory);
}

topicSelect.addEventListener("change", () => {
  loadCategory(topicSelect.value);
  closeSidebar();
});

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (!file) return;

    fileNameEl.textContent = file.name;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (!Array.isArray(data.cards)) {
          throw new Error("В JSON нет массива cards");
        }

        state.category = `import:${file.name}`;
        setWordsFromCards(data.cards);

        closeSidebar();
      } catch (error) {
        console.error("Ошибка импорта:", error);
        fileNameEl.textContent = "Ошибка в JSON-файле";
      }
    };

    reader.readAsText(file);
  });
}

function updateModalStats() {
  const left = state.completed
    ? 0
    : state.words.length + state.nextRound.length;

  modalStats.textContent =
    `Всего карточек: ${state.initialTotal}. Изучено: ${state.known}. Повторить: ${state.repeated}. Осталось: ${left}. Раунд: ${state.round}. Нужно правильных ответов: ${REQUIRED_CORRECT_ANSWERS}.`;
}

if (openStatsBtn && closeStatsBtn && statsModal) {
  openStatsBtn.onclick = () => {
    updateModalStats();
    statsModal.classList.add("show");
  };

  closeStatsBtn.onclick = () => {
    statsModal.classList.remove("show");
  };

  statsModal.onclick = (event) => {
    if (event.target === statsModal) {
      statsModal.classList.remove("show");
    }
  };
}

const themeBtn = document.getElementById("themeToggle");

if (themeBtn) {
  const saved = localStorage.getItem("theme");

  if (saved === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "🌙";
  }

  themeBtn.onclick = () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      themeBtn.textContent = "🌙";
      localStorage.setItem("theme", "dark");
    } else {
      themeBtn.textContent = "☀️";
      localStorage.setItem("theme", "light");
    }
  };
}

if (menuBtn) {
  menuBtn.onclick = () => {
    sidebar.classList.add("open");
    overlay.classList.add("show");
  };
}

if (overlay) {
  overlay.onclick = closeSidebar;
}

populateCategories();
