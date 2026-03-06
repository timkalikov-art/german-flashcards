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

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

/* ===== SIDEBAR ===== */

menuBtn.onclick = () => {

sidebar.classList.toggle("open");
overlay.classList.toggle("show");

};

overlay.onclick = () => {

sidebar.classList.remove("open");
overlay.classList.remove("show");

};

/* ===== ПЕРЕМЕШИВАНИЕ ===== */

function shuffle(array) {

for (let i = array.length - 1; i > 0; i--) {

```
const j = Math.floor(Math.random() * (i + 1));

[array[i], array[j]] = [array[j], array[i]];
```

}

}

/* ===== ПОКАЗ КАРТОЧКИ ===== */

function showCard() {

if (!words.length) {

```
wordEl.textContent = "Выберите тему";
translationEl.textContent = "";
statsEl.textContent = "0 / 0";

return;
```

}

const card = words[current];

wordEl.textContent = card.word;
translationEl.textContent = card.translation;

cardInner.classList.remove("flipped");

statsEl.textContent = `${current + 1} / ${words.length}`;

}

/* ===== ПЕРЕВОРОТ ===== */

cardInner.onclick = () => {

if (!words.length) return;

cardInner.classList.toggle("flipped");

};

/* ===== СЛЕДУЮЩАЯ КАРТОЧКА ===== */

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

/* ===== КНОПКА ЗНАЮ ===== */

document.getElementById("knowBtn").onclick = () => {

nextCard();

};

/* ===== КНОПКА ПОВТОРИТЬ ===== */

document.getElementById("repeatBtn").onclick = () => {

if (!words.length) return;

const repeatWord = words.splice(current, 1)[0];

words.push(repeatWord);

showCard();

};

/* ===== ПЕРЕМЕШАТЬ ===== */

document.getElementById("shuffleBtn").onclick = () => {

shuffle(words);
current = 0;
showCard();

};

/* ===== ЗАГРУЗКА ТЕМЫ ===== */

async function loadTopic(level, topic) {

try {

```
const response = await fetch(`data/${level}/${topic}.json`);
const data = await response.json();

words = data.cards.map(card => ({
  word: card.front,
  translation: card.back
}));

shuffle(words);

current = 0;

showCard();
```

}

catch (error) {

```
console.error("Ошибка загрузки:", error);
```

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

```
const option = document.createElement("option");

option.value = topic;
option.textContent = topic;

topicSelect.appendChild(option);
```

});

if (topicsByLevel[level].length > 0) {

```
currentTopic = topicsByLevel[level][0];

loadTopic(level, currentTopic);
```

}

}

/* ===== СМЕНА УРОВНЯ ===== */

levelSelect.onchange = () => {

currentLevel = levelSelect.value;

populateTopics(currentLevel);

};

/* ===== СМЕНА ТЕМЫ ===== */

topicSelect.onchange = () => {

currentTopic = topicSelect.value;

loadTopic(currentLevel, currentTopic);

};

/* ===== КЛАВИАТУРА ===== */

document.addEventListener("keydown", (e) => {

  if (e.code === "Space") {
    e.preventDefault();
    cardInner.classList.toggle("flipped");
  }

  if (e.code === "ArrowRight") {
    nextCard();
  }

  if (e.code === "ArrowLeft") {
    prevCard();
  }

});

/* ===== СВАЙПЫ ===== */

let startX = 0;

document.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {

  let endX = e.changedTouches[0].clientX;

  if (endX - startX > 50) {
    prevCard();
  }

  if (startX - endX > 50) {
    nextCard();
  }

});

/* ===== СТАРТ ===== */

populateTopics(currentLevel);
