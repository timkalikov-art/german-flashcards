/* ===== НАСТРОЙКИ ===== */
const LEARNED_THRESHOLD = 7; // сколько раз нужно нажать "знаю"

/* ===== ЗАГРУЗКА ИЗ LOCALSTORAGE ===== */
let words = JSON.parse(localStorage.getItem("words")) || [];
let current = 0;


const wordEl = document.getElementById("word");
const translationEl = document.getElementById("translation");
const statsEl = document.getElementById("stats");
const cardInner = document.getElementById("cardInner");

/* ===== СОХРАНЕНИЕ ===== */
function saveProgress() {
  localStorage.setItem("words", JSON.stringify(words));
}

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
    wordEl.textContent = "Загрузите слова";
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

/* ===== СЛЕДУЮЩАЯ ===== */
function nextCard() {
  current = (current + 1) % words.length;
  showCard();
}

/* ===== ПРЕДЫДУЩАЯ ===== */
function prevCard() {
  current = (current - 1 + words.length) % words.length;
  showCard();
}

/* ===== КНОПКИ ===== */
document.getElementById("knowBtn").onclick = () => {
  if (!words.length) return;

  words[current].knowCount = (words[current].knowCount || 0) + 1;
  saveProgress();
  nextCard();
};

document.getElementById("repeatBtn").onclick = () => {
  if (!words.length) return;

  // слово возвращаем ближе в очередь
  const repeatWord = words.splice(current, 1)[0];
  words.splice(Math.min(current + 3, words.length), 0, repeatWord);

  saveProgress();
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

/* ===== ИМПОРТ ===== */
document.getElementById("fileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("fileName").textContent = file.name;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);

      // добавляем knowCount
      words = imported.map(w => ({
        ...w,
        knowCount: 0
      }));

      shuffle(words);
      saveProgress();
      current = 0;
      showCard();

    } catch {
      alert("Ошибка JSON");
    }
  };
  reader.readAsText(file);
});

/* ===== SIDEBAR ===== */
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

document.getElementById("menuBtn").onclick = () => {
  sidebar.classList.add("open");
  overlay.classList.add("show");
};

overlay.onclick = () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
};

/* ===== ТЕМА ===== */
const themeBtn = document.getElementById("themeToggle");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeBtn.textContent = "🌙";
}

themeBtn.onclick = () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  themeBtn.textContent = dark ? "🌙" : "☀️";
  localStorage.setItem("theme", dark ? "dark" : "light");
};

/* ===== СТАТИСТИКА ===== */
const modal = document.getElementById("statsModal");

document.getElementById("openStats").onclick = () => {
  modal.classList.add("show");
  const learned = words.filter(w => w.knowCount >= LEARNED_THRESHOLD).length;
  document.getElementById("modalStats").textContent =
    `Выучено ${learned} из ${words.length}`;
};

document.getElementById("closeStats").onclick = () =>
  modal.classList.remove("show");

/* ===== СТАРТ ===== */
shuffle(words);
showCard();

// ===== Загрузка темы из папки data =====
async function loadTopic(level, topic) {
  try {
    const response = await fetch(`data/${level}/${topic}.json`);
    const data = await response.json();

    // берём cards из JSON и превращаем в формат words
    words = data.cards.map(card => ({
      word: card.front,
      translation: card.back,
      knowCount: 0
    }));

    shuffle(words);
    current = 0;
    saveProgress();
    showCard();

  } catch (error) {
    console.error("Ошибка загрузки:", error);
  }
}

loadTopic("A1", "familie");