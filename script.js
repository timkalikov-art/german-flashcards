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
  completed: false,
  mode: "category",
  history: [],
  sourceCards: []
};

const STUDY_STATE_KEY = "flashcardsStudyState";
const STUDY_STATES_KEY = "flashcardsStudyStates";
const FAVORITES_KEY = "flashcardsFavorites";
const FAVORITES_CATEGORY_ID = "__favorites__";
const MAX_HISTORY = 20;
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
const undoBtn = document.getElementById("undoBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const modeSelect = document.getElementById("modeSelect");
const progressBar = document.getElementById("progressBar");
const progressDetails = document.getElementById("progressDetails");
const defaultKnowBtnText = knowBtn?.textContent || "Знаю";
const defaultRepeatBtnText = repeatBtn?.textContent || "Повторить";
const defaultShuffleBtnText = shuffleBtn?.textContent || "Перемешать";

let favoriteKeys = readFavorites();

function resetProgress() {
  state.current = 0;
  state.known = 0;
  state.repeated = 0;
  state.nextRound = [];
  state.initialTotal = 0;
  state.round = 1;
  state.completed = false;
  state.history = [];
}

function getCardKey(card, index = 0) {
  return String(card.id ?? `${card.front}|${card.back}|${index}`);
}

function readFavorites() {
  const saved = readStoredJson(FAVORITES_KEY, []);

  if (!Array.isArray(saved)) return new Set();

  return new Set(saved.map(String));
}

function saveFavorites() {
  writeStoredJson(FAVORITES_KEY, [...favoriteKeys]);
}

function isFavoriteCard(card) {
  return favoriteKeys.has(getCardKey(card));
}

function getFavoriteCards() {
  const favoriteCards = [];
  const seen = new Set();

  getCategories().forEach(category => {
    (category.cards || []).forEach((card, index) => {
      const key = getCardKey(card, index);

      if (!favoriteKeys.has(key) || seen.has(key)) return;

      favoriteCards.push(card);
      seen.add(key);
    });
  });

  return favoriteCards;
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

function readStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Сайт должен работать даже если браузер запретил сохранение.
  }
}

function readAllStudyStates() {
  const savedStates = readStoredJson(STUDY_STATES_KEY, {});

  if (savedStates && typeof savedStates === "object" && !Array.isArray(savedStates)) {
    return savedStates;
  }

  return {};
}

function migrateLegacyStudyState() {
  const legacy = readStoredJson(STUDY_STATE_KEY, null);

  if (!isValidStudyState(legacy)) return;

  const savedStates = readAllStudyStates();

  if (!savedStates[legacy.category]) {
    savedStates[legacy.category] = {
      ...legacy,
      mode: legacy.category === FAVORITES_CATEGORY_ID ? "favorites" : "category",
      history: Array.isArray(legacy.history) ? legacy.history : []
    };

    writeStoredJson(STUDY_STATES_KEY, savedStates);
  }
}

function readStudyState(categoryId = state.category) {
  migrateLegacyStudyState();

  if (!categoryId) return null;

  const savedStates = readAllStudyStates();
  return savedStates[categoryId] || null;
}

function createStudySnapshot() {
  return {
    category: state.category,
    mode: state.mode,
    updatedAt: Date.now(),
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
        .map(item => [item.key, Math.max(Number(item.correctCount) || 0, 0)])
    )
  };
}

function pushHistorySnapshot() {
  state.history.push(createStudySnapshot());

  if (state.history.length > MAX_HISTORY) {
    state.history = state.history.slice(-MAX_HISTORY);
  }
}

function saveStudyState() {
  if (!state.category) return;

  const payload = {
    ...createStudySnapshot(),
    history: state.history.slice(-MAX_HISTORY)
  };

  const savedStates = readAllStudyStates();
  savedStates[state.category] = payload;
  writeStoredJson(STUDY_STATES_KEY, savedStates);
  writeStoredJson(STUDY_STATE_KEY, payload);
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

function applyStudySnapshot(snapshot, cards = state.sourceCards) {
  if (!isValidStudyState(snapshot)) return false;

  const allWords = cards.map(makeWord);

  state.words = restoreWordOrder(allWords, snapshot);
  state.nextRound = restoreWordsByOrder(allWords, snapshot.nextRoundOrder);

  [...state.words, ...state.nextRound].forEach(word => {
    word.correctCount = Math.max(
      Number(snapshot.cardProgress?.[word.key]) || 0,
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
    Math.max(Number(snapshot.current) || 0, 0),
    Math.max(state.words.length - 1, 0)
  );
  state.known = Number(snapshot.known) || 0;
  state.repeated = Number(snapshot.repeated) || 0;
  state.initialTotal = Number(snapshot.initialTotal) || cards.length;
  state.round = Math.max(Number(snapshot.round) || 1, 1);
  state.completed = Boolean(snapshot.completed);

  return true;
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
}

function updateFavoriteButton() {
  if (!favoriteBtn) return;

  const card = state.words[state.current]?.raw;
  const isActive = Boolean(card && isFavoriteCard(card));

  favoriteBtn.textContent = isActive ? "★" : "☆";
  favoriteBtn.classList.toggle("active", isActive);
  favoriteBtn.disabled = !card || state.completed;
  favoriteBtn.setAttribute(
    "aria-label",
    isActive ? "Убрать из избранного" : "Добавить в избранное"
  );
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

    if (undoBtn) {
      undoBtn.disabled = !state.history.length;
    }

    updateFavoriteButton();

    return;
  }

  const hasCards = Boolean(state.words.length);

  if (knowBtn) {
    knowBtn.textContent = defaultKnowBtnText;
    knowBtn.disabled = !hasCards;
  }

  if (repeatBtn) {
    repeatBtn.textContent = defaultRepeatBtnText;
    repeatBtn.disabled = !hasCards;
  }

  if (shuffleBtn) {
    shuffleBtn.textContent = defaultShuffleBtnText;
    shuffleBtn.disabled = !hasCards;
  }

  if (undoBtn) {
    undoBtn.disabled = !state.history.length;
  }

  updateFavoriteButton();
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

function cleanTranslation(value) {
  return String(value || "")
    .replace(/^\d+\s*/, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function firstGermanVariant(value) {
  return String(value || "")
    .split(/[,/;]/)[0]
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

function getPrepositionExample(card) {
  const examples = {
    mit: ["Ich fahre mit dem Bus.", "Я еду на автобусе."],
    ohne: ["Ich trinke Kaffee ohne Zucker.", "Я пью кофе без сахара."],
    nach: ["Ich fahre nach Berlin.", "Я еду в Берлин."],
    vor: ["Ich stehe vor dem Haus.", "Я стою перед домом."],
    für: ["Das Geschenk ist für dich.", "Этот подарок для тебя."],
    von: ["Das Geschenk ist von meiner Mutter.", "Этот подарок от моей мамы."],
    seit: ["Ich lerne seit einem Jahr Deutsch.", "Я учу немецкий уже год."],
    aus: ["Ich komme aus Deutschland.", "Я из Германии."],
    bei: ["Ich wohne bei meiner Familie.", "Я живу у своей семьи."],
    zu: ["Ich gehe zur Schule.", "Я иду в школу."],
    in: ["Ich bin in der Stadt.", "Я в городе."],
    auf: ["Das Buch liegt auf dem Tisch.", "Книга лежит на столе."],
    unter: ["Die Tasche liegt unter dem Tisch.", "Сумка лежит под столом."],
    über: ["Die Lampe hängt über dem Tisch.", "Лампа висит над столом."]
  };

  const match = examples[firstGermanVariant(card.front)];

  if (!match) return null;

  return {
    exampleDe: match[0],
    exampleRu: match[1]
  };
}

function getPronounExample(card) {
  const examples = {
    ich: ["Ich bin hier.", "Я здесь."],
    du: ["Du bist nett.", "Ты милый."],
    er: ["Er ist zu Hause.", "Он дома."],
    sie: ["Sie ist hier.", "Она здесь."],
    es: ["Es ist gut.", "Это хорошо."],
    wir: ["Wir lernen Deutsch.", "Мы учим немецкий."],
    ihr: ["Ihr seid Freunde.", "Вы друзья."],
    Sie: ["Sie sprechen Deutsch.", "Вы говорите по-немецки."]
  };

  const match = examples[String(card.front || "").trim()];

  if (!match) return null;

  return {
    exampleDe: match[0],
    exampleRu: match[1]
  };
}

function getAdverbExample(card) {
  const examples = {
    hier: ["Ich bin hier.", "Я здесь."],
    dort: ["Ich bin dort.", "Я там."],
    irgendwo: ["Ich bin irgendwo in der Stadt.", "Я где-то в городе."],
    nirgends: ["Ich finde es nirgends.", "Я нигде это не нахожу."],
    links: ["Ich gehe nach links.", "Я иду налево."],
    "nach links": ["Ich gehe nach links.", "Я иду налево."],
    rechts: ["Ich gehe nach rechts.", "Я иду направо."],
    "nach rechts": ["Ich gehe nach rechts.", "Я иду направо."],
    vorne: ["Ich sitze vorne.", "Я сижу впереди."],
    hinten: ["Ich sitze hinten.", "Я сижу сзади."],
    vorwärts: ["Ich gehe vorwärts.", "Я иду вперёд."],
    rückwärts: ["Ich gehe rückwärts.", "Я иду назад."],
    geradeaus: ["Ich gehe geradeaus.", "Я иду прямо."],
    zurück: ["Ich gehe zurück.", "Я иду назад."],
    überall: ["Ich sehe überall Menschen.", "Я везде вижу людей."],
    zuerst: ["Zuerst trinke ich Kaffee.", "Сначала я пью кофе."],
    plötzlich: ["Plötzlich regnet es.", "Вдруг пошёл дождь."],
    nie: ["Ich rauche nie.", "Я никогда не курю."],
    wieder: ["Ich komme wieder.", "Я приду снова."],
    jetzt: ["Ich lerne jetzt Deutsch.", "Сейчас я учу немецкий."],
    oft: ["Ich lese oft.", "Я часто читаю."],
    damals: ["Damals war ich ein Kind.", "Тогда я был ребёнком."],
    dringend: ["Ich brauche dringend Hilfe.", "Мне срочно нужна помощь."],
    gewöhnlich: ["Gewöhnlich trinke ich Tee.", "Обычно я пью чай."],
    möglicherweise: ["Möglicherweise kommt er heute.", "Возможно, он придёт сегодня."],
    wahrscheinlich: ["Wahrscheinlich kommt sie später.", "Вероятно, она придёт позже."],
    vielleicht: ["Vielleicht regnet es morgen.", "Может быть, завтра будет дождь."],
    deshalb: ["Deshalb bleibe ich zu Hause.", "Поэтому я остаюсь дома."],
    so: ["Mach es so.", "Сделай это так."],
    auch: ["Ich komme auch.", "Я тоже приду."],
    ebenfalls: ["Ich komme ebenfalls.", "Я тоже приду."],
    nur: ["Ich brauche nur Wasser.", "Мне нужна только вода."],
    genau: ["Das ist genau richtig.", "Это совершенно правильно."],
    etwa: ["Das kostet etwa zehn Euro.", "Это стоит примерно десять евро."],
    ungefähr: ["Das dauert ungefähr eine Stunde.", "Это длится примерно час."],
    fast: ["Ich bin fast fertig.", "Я почти готов."],
    absichtlich: ["Ich mache das absichtlich.", "Я делаю это намеренно."],
    zufällig: ["Ich sehe ihn zufällig.", "Я случайно его вижу."],
    sehr: ["Das ist sehr gut.", "Это очень хорошо."],
    besonders: ["Das ist besonders wichtig.", "Это особенно важно."]
  };

  const match = examples[firstGermanVariant(card.front)];

  if (!match) return null;

  return {
    exampleDe: match[0],
    exampleRu: match[1]
  };
}

function getGeneratedExample(card) {
  if (card.tenses) return null;

  const prepositionExample = getPrepositionExample(card);
  if (prepositionExample) return prepositionExample;

  const pronounExample = getPronounExample(card);
  if (pronounExample) return pronounExample;

  const front = firstGermanVariant(card.front);
  const translation = cleanTranslation(card.back);

  if (!front || !translation || /[!?]$/.test(front)) return null;

  if (
    card.category === "Прилагательные" &&
    /^[a-zäöüß-]+$/.test(front)
  ) {
    return {
      exampleDe: `Er ist sehr ${front}.`,
      exampleRu: `Он очень ${translation}.`
    };
  }

  if (card.category === "Наречия") {
    return getAdverbExample(card);
  }

  if (card.category === "Цвета и формы" && /^[a-zäöüß-]+$/i.test(front)) {
    return {
      exampleDe: `Die Farbe ist ${front}.`,
      exampleRu: `Цвет ${translation}.`
    };
  }

  return null;
}

function getVerbSummary(card) {
  const thirdPerson = (card.tenses || [])
    .find(item => item.pronoun === "er/sie/es");

  if (!thirdPerson) return "";

  const parts = [];

  if (thirdPerson.perfect) {
    parts.push(`Perfekt: ${thirdPerson.perfect}`);
  }

  if (thirdPerson.preterite) {
    parts.push(`Präteritum: ${thirdPerson.preterite}`);
  }

  return parts.join(" · ");
}

function getGrammarSummary(card) {
  const parts = [];
  const verbSummary = getVerbSummary(card);

  if (card.article) {
    parts.push(`Артикль: ${card.article}`);
  }

  if (card.grammar?.case) {
    parts.push(`Падеж: ${card.grammar.case}`);
  }

  if (verbSummary) {
    parts.push(verbSummary);
  }

  return parts.join(" · ");
}

function formatFront(card) {
  const hint = getCardHint(card);

  return `
    <div class="front-word">${escapeHtml(card.front)}</div>
    ${hint ? `<div class="front-hint">(${escapeHtml(hint)})</div>` : ""}
  `;
}

function formatBack(card) {
  const generatedExample = getGeneratedExample(card);
  const exampleDe = card.exampleDe || card.example || generatedExample?.exampleDe || "";
  const exampleRu = card.exampleRu || generatedExample?.exampleRu || "";
  const hasExample = exampleDe || exampleRu;
  const grammarSummary = getGrammarSummary(card);

  return `
    <div class="translation-main">${escapeHtml(card.back)}</div>
    ${grammarSummary ? `<div class="grammar-block">${escapeHtml(grammarSummary)}</div>` : ""}
    ${hasExample ? `
      <div class="example-block">
        ${exampleDe ? `<div class="example-de">${escapeHtml(exampleDe)}</div>` : ""}
        ${exampleRu ? `<div class="example-ru">${escapeHtml(exampleRu)}</div>` : ""}
      </div>
    ` : ""}
  `;
}

function setWordsFromCards(cards, options = {}) {
  state.sourceCards = cards;

  const saved = options.restore ? readStudyState(state.category) : null;
  const canRestore = saved?.category === state.category &&
    isValidStudyState(saved);

  resetProgress();
  state.sourceCards = cards;

  if (canRestore) {
    applyStudySnapshot(saved, cards);
    state.history = Array.isArray(saved.history)
      ? saved.history.filter(isValidStudyState).slice(-MAX_HISTORY)
      : [];
  } else {
    state.words = cards.map(makeWord);
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

function updateProgressDisplay() {
  const total = Math.max(Number(state.initialTotal) || 0, 0);
  const left = state.completed ? 0 : state.words.length + state.nextRound.length;
  const known = Math.min(Math.max(Number(state.known) || 0, 0), total);
  const percent = total ? Math.round((known / total) * 100) : 0;

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }

  if (progressDetails) {
    progressDetails.textContent =
      `Изучено ${known} из ${total} · осталось ${left} · раунд ${state.round}`;
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
    updateProgressDisplay();
    cardInner.classList.remove("flipped");
    saveStudyState();
    return;
  }

  if (!state.words.length) {
    updateControls();
    wordEl.textContent = state.mode === "favorites"
      ? "В избранном пока пусто"
      : "Выберите категорию";
    translationEl.innerHTML = "";
    statsEl.textContent = "0 / 0";
    updateProgressDisplay();
    cardInner.classList.remove("flipped");
    saveStudyState();
    return;
  }

  const card = state.words[state.current];
  card.correctCount = Math.max(Number(card.correctCount) || 0, 0);

  wordEl.innerHTML = card.word;
  translationEl.innerHTML = card.translation;

  const left = state.words.length + state.nextRound.length;

  statsEl.textContent =
    `Раунд ${state.round} · осталось ${left} · прогресс ${card.correctCount}/${REQUIRED_CORRECT_ANSWERS}`;

  updateProgressDisplay();
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

  pushHistorySnapshot();

  const [word] = state.words.splice(state.current, 1);
  word.correctCount = Math.max(Number(word.correctCount) || 0, 0);

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

function undoLastAction() {
  const snapshot = state.history.pop();

  if (!snapshot) return;

  const remainingHistory = state.history.slice();

  if (!applyStudySnapshot(snapshot)) return;

  state.history = remainingHistory;
  showCard();
}

function clearSavedStudyStateForCategory(categoryId) {
  const savedStates = readAllStudyStates();

  if (savedStates[categoryId]) {
    delete savedStates[categoryId];
    writeStoredJson(STUDY_STATES_KEY, savedStates);
  }

  const legacy = readStoredJson(STUDY_STATE_KEY, null);

  if (legacy?.category === categoryId) {
    try {
      localStorage.removeItem(STUDY_STATE_KEY);
    } catch {
      localStorage.setItem(STUDY_STATE_KEY, "");
    }
  }
}

function restartCurrentCategory() {
  const cards = state.mode === "favorites"
    ? getFavoriteCards()
    : getCategories()
      .find(item => item.id === state.category)?.cards;

  if (!Array.isArray(cards)) return;

  clearSavedStudyStateForCategory(state.category);
  resetProgress();
  state.category = state.mode === "favorites"
    ? FAVORITES_CATEGORY_ID
    : state.category;
  state.sourceCards = cards;
  state.words = cards.map(makeWord);
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

if (undoBtn) {
  undoBtn.onclick = undoLastAction;
}

if (favoriteBtn) {
  favoriteBtn.onclick = () => {
    const card = state.words[state.current]?.raw;

    if (!card || state.completed) return;

    const key = getCardKey(card);

    if (favoriteKeys.has(key)) {
      favoriteKeys.delete(key);
    } else {
      favoriteKeys.add(key);
    }

    saveFavorites();
    updateFavoriteButton();

    if (state.mode === "favorites" && !favoriteKeys.has(key)) {
      state.words.splice(state.current, 1);
      state.nextRound = state.nextRound.filter(item => item.key !== key);

      if (state.current >= state.words.length) {
        state.current = 0;
      }

      state.initialTotal = Math.max(state.initialTotal - 1, 0);
      showCard();
    }
  };
}

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
    state.mode = "category";
    resetProgress();
    showCard();
    wordEl.textContent = "Категория не найдена";
    return;
  }

  state.category = category.id;
  state.mode = "category";
  setWordsFromCards(category.cards, { restore: true });
}

function loadFavoritesMode() {
  state.category = FAVORITES_CATEGORY_ID;
  state.mode = "favorites";
  setWordsFromCards(getFavoriteCards(), { restore: true });
}

function loadSelectedMode() {
  if (modeSelect?.value === "favorites") {
    loadFavoritesMode();
  } else {
    loadCategory(topicSelect.value);
  }
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

  migrateLegacyStudyState();

  const savedStates = readAllStudyStates();
  const legacySaved = readStoredJson(STUDY_STATE_KEY, null);
  const saved = isValidStudyState(legacySaved)
    ? legacySaved
    : (
      Object.values(savedStates)
        .filter(isValidStudyState)
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0] ||
      readStudyState(categories[0].id)
    );
  const canRestoreSavedCategory = isValidStudyState(saved);
  const savedCategoryExists = canRestoreSavedCategory && categories
    .some(category => category.id === saved?.category);
  const startCategory = savedCategoryExists
    ? saved.category
    : categories[0].id;

  topicSelect.value = startCategory;

  if (modeSelect && saved?.category === FAVORITES_CATEGORY_ID) {
    modeSelect.value = "favorites";
    loadFavoritesMode();
  } else {
    modeSelect.value = "category";
    loadCategory(startCategory);
  }
}

topicSelect.addEventListener("change", () => {
  if (modeSelect) {
    modeSelect.value = "category";
  }

  loadCategory(topicSelect.value);
  closeSidebar();
});

if (modeSelect) {
  modeSelect.addEventListener("change", () => {
    loadSelectedMode();
    closeSidebar();
  });
}

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
        state.mode = "category";
        if (modeSelect) {
          modeSelect.value = "category";
        }
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
    `Режим: ${state.mode === "favorites" ? "Избранное" : "Категория"}. Всего карточек: ${state.initialTotal}. Изучено: ${state.known}. Повторить: ${state.repeated}. Осталось: ${left}. Раунд: ${state.round}. Нужно правильных ответов: ${REQUIRED_CORRECT_ANSWERS}. В избранном: ${favoriteKeys.size}.`;
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
