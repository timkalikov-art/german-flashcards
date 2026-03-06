/* ===== ПЕРЕМЕННЫЕ ===== */

let words = [];
let current = 0;

const wordEl = document.getElementById("word");
const translationEl = document.getElementById("translation");
const statsEl = document.getElementById("stats");
const cardInner = document.getElementById("cardInner");

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");

const levelSelect = document.getElementById("levelSelect");
const topicSelect = document.getElementById("topicSelect");


/* ===== SIDEBAR ===== */

menuBtn.onclick = () => {
  sidebar.classList.add("open");
  overlay.classList.add("show");
};

overlay.onclick = () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
};


/* ===== ПЕРЕВОРОТ КАРТОЧКИ ===== */

cardInner.onclick = () => {

  if (!words.length) return;

  cardInner.classList.toggle("flipped");

};


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

  statsEl.textContent = `${current + 1} / ${words.length}`;

  cardInner.classList.remove("flipped");
}


/* ===== СЛЕДУЮЩАЯ ===== */

function nextCard() {

  if (!words.length) return;

  current = (current + 1) % words.length;

  showCard();
}


/* ===== КНОПКИ ===== */

document.getElementById("knowBtn").onclick = nextCard;
document.getElementById("repeatBtn").onclick = nextCard;


/* ===== ПЕРЕМЕШАТЬ ===== */

document.getElementById("shuffleBtn").onclick = () => {

  if (!words.length) return;

  words.sort(() => Math.random() - 0.5);

  current = 0;

  showCard();

};

function prevCard() {

  if (!words.length) return;

  current = (current - 1 + words.length) % words.length;

  showCard();
}


/* ===== ЗАГРУЗКА ТЕМЫ ===== */

async function loadTopic(level, topic) {

  try {

    const response = await fetch(`data/${level}/${topic}.json`);
    const data = await response.json();

    words = data.cards.map(card => ({
      word: card.front,
      translation: card.back
    }));

    current = 0;

    shuffle(words);

    showCard();

  } catch (error) {

    console.error("Ошибка загрузки:", error);

  }

}


/* ===== УРОВНИ ===== */

const topicsByLevel = {

  A1: ["familie", "essen", "wohnen"],
  A2: ["arbeit", "reisen"],
  B1: [],
  B2: [],
  C1: []

};


/* ===== ЗАПОЛНЕНИЕ ТЕМ ===== */

function populateTopics(level) {

  topicSelect.innerHTML = "";

  topicsByLevel[level].forEach(topic => {

    const option = document.createElement("option");

    option.value = topic;
    option.textContent = topic;

    topicSelect.appendChild(option);

  });

  if (topicsByLevel[level].length) {

    loadTopic(level, topicsByLevel[level][0]);

  }

}


/* ===== СОБЫТИЯ ===== */

levelSelect.onchange = () => {

  populateTopics(levelSelect.value);

};

topicSelect.onchange = () => {

  loadTopic(levelSelect.value, topicSelect.value);

};


/* ===== СТАРТ ===== */

populateTopics("A1");