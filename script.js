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

  if (card.grammar?.article) {
    const isPlural = card.grammar.gender === "Pl";

    return {
      exampleDe: isPlural
        ? `Hier sind ${front}.`
        : `Hier ist ${front}.`,
      exampleRu: isPlural
        ? `Здесь ${translation}.`
        : `Здесь ${translation}.`
    };
  }

  if (card.category === "Прилагательные") {
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
  card.correctCount = Math.max(Number(card.correctCount) || 0, 0);

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
