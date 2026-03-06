/* =========================
   FLASHCARDS APP
   Стабильная архитектура
========================= */

/* ===== НАСТРОЙКИ ===== */

const state = {
  words: [],
  current: 0,
  level: "A1",
  topic: ""
};

/* ===== DOM ===== */

const wordEl = document.getElementById("word");
const translationEl = document.getElementById("translation");
const statsEl = document.getElementById("stats");
const cardInner = document.getElementById("cardInner");

const levelSelect = document.getElementById("levelSelect");
const topicSelect = document.getElementById("topicSelect");

/* ===== ПЕРЕМЕШАТЬ ===== */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ===== ПОКАЗ КАРТОЧКИ ===== */

function showCard() {

  if (!state.words.length) {

    wordEl.textContent = "Выберите тему";
    translationEl.textContent = "";
    statsEl.textContent = "0 / 0";

    return;
  }

  const card = state.words[state.current];

  wordEl.textContent = card.word;
  translationEl.textContent = card.translation;

  statsEl.textContent =
    `${state.current + 1} / ${state.words.length}`;

  cardInner.classList.remove("flipped");
}

/* ===== ПЕРЕВОРОТ ===== */

function flipCard() {

  if (!state.words.length) return;

  cardInner.classList.toggle("flipped");
}

cardInner.addEventListener("click", flipCard);

/* ===== НАВИГАЦИЯ ===== */

function nextCard() {

  if (!state.words.length) return;

  state.current =
    (state.current + 1) % state.words.length;

  showCard();
}

function prevCard() {

  if (!state.words.length) return;

  state.current =
    (state.current - 1 + state.words.length)
    % state.words.length;

  showCard();
}

/* ===== КНОПКИ ===== */

document.getElementById("knowBtn").onclick = () => {
  nextCard();
};

document.getElementById("repeatBtn").onclick = () => {

  const word = state.words.splice(state.current, 1)[0];

  state.words.splice(
    Math.min(state.current + 3, state.words.length),
    0,
    word
  );

  showCard();
};

document.getElementById("shuffleBtn").onclick = () => {

  shuffle(state.words);

  state.current = 0;

  showCard();
};

/* ===== КЛАВИАТУРА ===== */

document.addEventListener("keydown", (e) => {

  if (e.code === "Space") {

    e.preventDefault();
    flipCard();
  }

  if (e.code === "ArrowRight") nextCard();

  if (e.code === "ArrowLeft") prevCard();
});

/* ===== СВАЙП ===== */

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

/* ===== ЗАГРУЗКА СЛОВ ===== */

async function loadTopic(level, topic) {

  try {

    const response =
      await fetch(`data/${level}/${topic}.json`);

    const data = await response.json();

    state.words = data.cards.map(card => ({
      word: card.front,
      translation: card.back
    }));

    shuffle(state.words);

    state.current = 0;

    showCard();

  } catch (error) {

    console.error("Ошибка загрузки:", error);
  }
}

/* ===== УРОВНИ ===== */

const topics = {

  A1: ["familie", "essen"],
  A2: ["arbeit"],
  B1: [],
  B2: [],
  C1: []
};

function populateTopics(level) {

  topicSelect.innerHTML = "";

  topics[level].forEach(topic => {

    const option = document.createElement("option");

    option.value = topic;
    option.textContent = topic;

    topicSelect.appendChild(option);
  });

  if (topics[level].length) {

    state.topic = topics[level][0];

    loadTopic(level, state.topic);
  }
}

/* ===== SELECT ===== */

levelSelect.addEventListener("change", () => {

  state.level = levelSelect.value;

  populateTopics(state.level);
});

topicSelect.addEventListener("change", () => {

  state.topic = topicSelect.value;

  loadTopic(state.level, state.topic);
});

/* ===== ТЕМА ===== */

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

/* ===== SIDEBAR ===== */

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");

if (menuBtn) {

  menuBtn.onclick = () => {

    sidebar.classList.add("open");
    overlay.classList.add("show");

  };

}

if (overlay) {

  overlay.onclick = () => {

    sidebar.classList.remove("open");
    overlay.classList.remove("show");

  };

}

/* ===== СТАРТ ===== */

populateTopics(state.level);