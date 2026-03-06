/* ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===== */

let words = [];
let current = 0;
let currentLevel = "A1";
let currentTopic = "";

/* ===== DOM ===== */

const wordEl = document.getElementById("word");
const translationEl = document.getElementById("translation");
const statsEl = document.getElementById("stats");
const cardInner = document.getElementById("cardInner");

const levelSelect = document.getElementById("levelSelect");
const topicSelect = document.getElementById("topicSelect");

/* ===== SIDEBAR ===== */

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

menuBtn.onclick = () => {
  sidebar.classList.toggle("open");
  overlay.classList.toggle("show");
};

overlay.onclick = () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
};

/* ===== ПЕРЕМЕШИВАНИЕ ===== */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[j]] = [arr[j], arr[i]];

  }
}

/* ===== ПОКАЗ КАРТОЧКИ ===== */

function showCard() {

  if (!words.length) {

    wordEl.textContent = "Выберите тему";
    translationEl.textContent = "";
    statsEl.textContent = "0 / 0";

    return;
  }

  const card = words[current];

  wordEl.textContent = card.word;
  translationEl.textContent = card.translation;

  cardInner.classList.remove("flipped");

  statsEl.textContent = `${current + 1} / ${words.length}`;

}

/* ===== ПЕРЕВОРОТ ===== */

cardInner.addEventListener("click", () => {

  if (!words.length) return;

  cardInner.classList.toggle("flipped");

});

/* ===== НАВИГАЦИЯ ===== */

function nextCard() {

  if (!words.length) return;

  current++;

  if (current >= words.length) current = 0;

  showCard();

}

function prevCard() {

  if (!words.length) return;

  current--;

  if (current < 0) current = words.length - 1;

  showCard();

}

/* ===== КНОПКИ ===== */

document.getElementById("knowBtn").onclick = nextCard;
document.getElementById("repeatBtn").onclick = nextCard;

document.getElementById("repeatBtn").onclick = () => {

  if (!words.length) return;

  const card = words[current];

  card.wrong++;
  card.level = Math.max(0, card.level - 1);

  card.nextReview = Date.now() + 1000 * 60;

  const repeatWord = words.splice(current, 1)[0];

  words.splice(Math.min(current + 2, words.length), 0, repeatWord);

  showCard();
};

document.getElementById("knowBtn").onclick = () => {

  if (!words.length) return;

  const card = words[current];

  card.correct++;
  card.level++;

  const intervals = [
    1000 * 60,
    1000 * 60 * 5,
    1000 * 60 * 30,
    1000 * 60 * 60 * 12
  ];

  const interval = intervals[Math.min(card.level, intervals.length - 1)];

  card.nextReview = Date.now() + interval;

  nextCard();
};

/* ===== ПЕРЕМЕШАТЬ ===== */

document.getElementById("shuffleBtn").onclick = () => {

  shuffle(words);

  current = 0;

  showCard();

};

/* ===== КЛАВИАТУРА ===== */

document.addEventListener("keydown", (e) => {

  if (e.code === "Space") {

    e.preventDefault();

    cardInner.classList.toggle("flipped");

  }

  if (e.code === "ArrowRight") nextCard();

  if (e.code === "ArrowLeft") prevCard();

});

/* ===== СВАЙП ===== */

let startX = 0;

document.addEventListener("touchstart", e => {

  startX = e.touches[0].clientX;

});

document.addEventListener("touchend", e => {

  let endX = e.changedTouches[0].clientX;

  if (startX - endX > 50) nextCard();

  if (endX - startX > 50) prevCard();

});

/* ===== ЗАГРУЗКА ТЕМЫ ===== */

async function loadTopic(level, topic) {

  const response = await fetch(`data/${level}/${topic}.json`);

  const data = await response.json();

 words = data.cards.map(card => ({
  word: card.front,
  translation: card.back,

  level: 0,          // уровень знания
  nextReview: Date.now(),  // когда повторить
  correct: 0,
  wrong: 0
}));

  shuffle(words);

  current = 0;

  showCard();

}

/* ===== ТЕМЫ ===== */

const topicsByLevel = {

  A1: ["familie", "essen", "wohnen"],
  A2: ["arbeit", "reisen"],
  B1: [],
  B2: [],
  C1: []

};

function populateTopics(level) {

  topicSelect.innerHTML = "";

  topicsByLevel[level].forEach(topic => {

    const option = document.createElement("option");

    option.value = topic;

    option.textContent = topic;

    topicSelect.appendChild(option);

  });

  if (topicsByLevel[level].length > 0) {

    currentTopic = topicsByLevel[level][0];

    loadTopic(level, currentTopic);

  }

}

/* ===== СОБЫТИЯ ===== */

levelSelect.addEventListener("change", () => {

  currentLevel = levelSelect.value;

  populateTopics(currentLevel);

});

topicSelect.addEventListener("change", () => {

  currentTopic = topicSelect.value;

  loadTopic(currentLevel, currentTopic);

});


const openStats = document.getElementById("openStats");
const closeStats = document.getElementById("closeStats");
const modal = document.getElementById("statsModal");
const modalStats = document.getElementById("modalStats");

openStats.onclick = () => {

  const learned = words.filter(w => w.level >= 3).length;

  const total = words.length;

  const percent = Math.round((learned / total) * 100);

  modalStats.innerHTML = `
  
  Карточек всего: ${total}<br>
  Выучено: ${learned}<br>
  Прогресс: ${percent}%
  
  `;

  modal.style.display = "flex";

};

closeStats.onclick = () => {
  modal.style.display = "none";
};

/* ===== THEME SWITCH ===== */

const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", () => {

  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    themeToggle.textContent = "🌙";
  } else {
    themeToggle.textContent = "☀️";
  }

});

/* ===== ТЕМНАЯ ТЕМА ===== */

const themeBtn = document.getElementById("themeToggle");

if (themeBtn) {

  // загрузка сохранённой темы
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "🌙";
  }

  themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      themeBtn.textContent = "🌙";
      localStorage.setItem("theme", "dark");
    } else {
      themeBtn.textContent = "☀️";
      localStorage.setItem("theme", "light");
    }

  });

}

/* ===== СТАРТ ===== */

populateTopics(currentLevel);