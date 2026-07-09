/* =========================
   FLASHCARDS APP
   Категории + спряжения
========================= */

const state = {
  words: [],
  current: 0,
  category: "",
  known: 0,
  repeated: 0
};

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

function resetProgress() {
  state.current = 0;
  state.known = 0;
  state.repeated = 0;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBack(card) {
  const rows = card.tenses || [];
  const forms = rows
    .map(row => `
      <div class="conjugation-row">
        <span>${escapeHtml(row.pronoun)}</span>
        <strong>
          ${escapeHtml(row.present)}
          <small>/ ${escapeHtml(row.perfect)} / ${escapeHtml(row.preterite)} / ${escapeHtml(row.future)}</small>
        </strong>
      </div>
    `)
    .join("");

  return `
    <div class="translation-main">${escapeHtml(card.back)}</div>
    <div class="conjugation-list">${forms}</div>
  `;
}

function setWordsFromCards(cards) {
  state.words = cards.map(card => ({
    word: card.front,
    translation: formatBack(card),
    raw: card
  }));

  shuffle(state.words);
  resetProgress();
  showCard();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function showCard() {
  if (!state.words.length) {
    wordEl.textContent = "Выберите категорию";
    translationEl.innerHTML = "";
    statsEl.textContent = "0 / 0";
    cardInner.classList.remove("flipped");
    return;
  }

  const card = state.words[state.current];

  wordEl.textContent = card.word;
  translationEl.innerHTML = card.translation;

  statsEl.textContent =
    `${state.current + 1} / ${state.words.length}`;

  cardInner.classList.remove("flipped");
}

function flipCard() {
  if (!state.words.length) return;

  cardInner.classList.toggle("flipped");
}

cardInner.addEventListener("click", flipCard);

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

document.getElementById("knowBtn").onclick = () => {
  if (!state.words.length) return;

  state.known += 1;
  nextCard();
};

document.getElementById("repeatBtn").onclick = () => {
  if (!state.words.length) return;

  state.repeated += 1;

  const word = state.words.splice(state.current, 1)[0];

  state.words.splice(
    Math.min(state.current + 3, state.words.length),
    0,
    word
  );

  showCard();
};

document.getElementById("shuffleBtn").onclick = () => {
  if (!state.words.length) return;

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
  setWordsFromCards(category.cards);
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

  loadCategory(categories[0].id);
}

topicSelect.addEventListener("change", () => {
  loadCategory(topicSelect.value);
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

        setWordsFromCards(data.cards);

        if (sidebar && overlay) {
          sidebar.classList.remove("open");
          overlay.classList.remove("show");
        }
      } catch (error) {
        console.error("Ошибка импорта:", error);
        fileNameEl.textContent = "Ошибка в JSON-файле";
      }
    };

    reader.readAsText(file);
  });
}

function updateModalStats() {
  modalStats.textContent =
    `Карточек: ${state.words.length}. Знаю: ${state.known}. Повторить: ${state.repeated}. Сейчас: ${statsEl.textContent}.`;
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

populateCategories();
