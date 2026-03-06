/* ===== НАСТРОЙКИ ===== */
const LEARNED_THRESHOLD = 7;

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

  const w = words[current];

  wordEl.textContent = w.word;
  translationEl.textContent = w.translation;

  const learned = words.filter(w => w.knowCount >= LEARNED_THRESHOLD).length;
  statsEl.textContent = `${learned} / ${words.length}`;

  cardInner.classList.remove("flipped");
}

/* ===== ПЕРЕВОРОТ ===== */
function flipCard() {
  if (!words.length) return;
  cardInner.classList.toggle("flipped");
}

cardInner.addEventListener("click", flipCard);

/* ===== НАВИГАЦИЯ ===== */
function nextCard() {
  if (!words.length) return;
  current = (current + 1) % words.length;
  showCard();
}

function prevCard() {
  if (!words.length) return;
  current = (current - 1 + words.length) % words.length;
  showCard();
}

/* ===== SIDEBAR ===== */

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

if (menuBtn && sidebar && overlay) {

  menuBtn.addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("show");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  });

}

/* ===== КНОПКИ ===== */
document.getElementById("knowBtn").onclick = () => {
  if (!words.length) return;

  words[current].knowCount = (words[current].knowCount || 0) + 1;
  nextCard();
};

document.getElementById("repeatBtn").onclick = () => {
  if (!words.length) return;

  const repeatWord = words.splice(current, 1)[0];
  words.splice(Math.min(current + 3, words.length), 0, repeatWord);

  showCard();
};

/* ===== КЛАВИАТУРА ===== */
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    flipCard();
  }
  if (e.code === "ArrowRight") nextCard();
  if (e.code === "ArrowLeft") prevCard();
});

/* ===== ЗАГРУЗКА ТЕМЫ ===== */
async function loadTopic(level, topic) {
  try {
    const response = await fetch(`data/${level}/${topic}.json`);
    const data = await response.json();

    words = data.cards.map(card => ({
      word: card.front,
      translation: card.back,
      knowCount: 0
    }));

    shuffle(words);
    current = 0;
    showCard();

  } catch (error) {
    console.error("Ошибка загрузки:", error);
  }
}

/* ===== УРОВНИ И ТЕМЫ ===== */
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

levelSelect.addEventListener("change", () => {
  currentLevel = levelSelect.value;
  populateTopics(currentLevel);
});

topicSelect.addEventListener("change", () => {
  currentTopic = topicSelect.value;
  loadTopic(currentLevel, currentTopic);
});

/* ===== СТАРТ ===== */
populateTopics(currentLevel);

/* ===== SWIPE ДЛЯ ТЕЛЕФОНА ===== */

let touchStartX = 0;
let touchEndX = 0;

/* ===== МОБИЛЬНЫЙ SWIPE ===== */

let startX = 0;
let startY = 0;

const card = document.getElementById("card");

card.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
});

card.addEventListener("touchend", (e) => {

  let endX = e.changedTouches[0].clientX;
  let endY = e.changedTouches[0].clientY;

  let diffX = endX - startX;
  let diffY = endY - startY;

  /* игнорируем вертикальные движения */
  if (Math.abs(diffX) < Math.abs(diffY)) return;

  /* свайп вправо */
  if (diffX > 60) {
    nextCard();
  }

  /* свайп влево */
  if (diffX < -60) {
    nextCard();
  }

});

cardInner.addEventListener("touchend", e => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {

  const diff = touchEndX - touchStartX;

  // свайп вправо
  if (diff > 60) {
    nextCard();
  }

  // свайп влево
  if (diff < -60) {
    nextCard();
  }

}