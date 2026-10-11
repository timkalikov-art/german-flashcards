const fs = require("fs");
const vm = require("vm");

const DATA_FILE = "data_verified.js";
const CHANGES_FILE = "data_changes.csv";

const PRONOUNS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];

function loadData() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(DATA_FILE, "utf8"), sandbox, { filename: DATA_FILE });
  return sandbox.window.FLASHCARDS_DATA;
}

function csv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function appendChange(lines, card, field, before, after, reason) {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  lines.push(
    [
      card.id,
      card.front,
      card.category,
      field,
      typeof before === "string" ? before : JSON.stringify(before),
      typeof after === "string" ? after : JSON.stringify(after),
      reason
    ]
      .map(csv)
      .join(",")
  );
}

function makeTenses({ infinitive, present, perfectParticiple, preterite, aux = "haben" }) {
  const auxes = aux === "sein"
    ? ["bin", "bist", "ist", "sind", "seid", "sind"]
    : ["habe", "hast", "hat", "haben", "habt", "haben"];
  const futureAuxes = ["werde", "wirst", "wird", "werden", "werdet", "werden"];

  return PRONOUNS.map((pronoun, index) => ({
    pronoun,
    present: present[index],
    perfect: `${auxes[index]} ${perfectParticiple}`,
    preterite: preterite[index],
    future: `${futureAuxes[index]} ${infinitive}`
  }));
}

function cloneCard(card) {
  return JSON.parse(JSON.stringify(card));
}

function main() {
  const data = loadData();
  const cards = data.categories.flatMap(category => category.cards);
  const existingIds = new Set(cards.map(card => Number(card.id)));
  let nextId = Math.max(...existingIds) + 1;
  const changes = [];

  function takeId() {
    while (existingIds.has(nextId)) nextId += 1;
    existingIds.add(nextId);
    return nextId++;
  }

  const transport = data.categories.find(category => category.name === "Транспорт");
  const communication = data.categories.find(category => category.name === "Общение и эмоции");
  const card5282 = transport?.cards.find(card => card.id === 5282);
  const card1950 = communication?.cards.find(card => card.id === 1950);

  if (!card5282 || !card1950) {
    throw new Error("Required cards 5282 and/or 1950 were not found");
  }

  const aufsteigenBefore = cloneCard(card5282);
  Object.assign(card5282, {
    front: "aufsteigen",
    back: "взлетать, подниматься",
    tenses: makeTenses({
      infinitive: "aufsteigen",
      present: ["steige auf", "steigst auf", "steigt auf", "steigen auf", "steigt auf", "steigen auf"],
      perfectParticiple: "aufgestiegen",
      preterite: ["stieg auf", "stiegst auf", "stieg auf", "stiegen auf", "stiegt auf", "stiegen auf"],
      aux: "sein"
    }),
    exampleDe: "Das Flugzeug steigt schnell auf.",
    exampleRu: "Самолёт быстро набирает высоту."
  });
  appendChange(
    changes,
    card5282,
    "front/back/tenses/exampleDe/exampleRu",
    aufsteigenBefore,
    card5282,
    "release preparation: split mixed card; kept original ID for aufsteigen and corrected conjugation/example"
  );

  if (!transport.cards.some(card => card.front === "starten" && card.subcategory === card5282.subcategory)) {
    const startenCard = {
      ...cloneCard(card5282),
      id: takeId(),
      front: "starten",
      back: "стартовать, взлетать",
      tenses: makeTenses({
        infinitive: "starten",
        present: ["starte", "startest", "startet", "starten", "startet", "starten"],
        perfectParticiple: "gestartet",
        preterite: ["startete", "startetest", "startete", "starteten", "startetet", "starteten"],
        aux: "sein"
      }),
      exampleDe: "Das Flugzeug startet pünktlich.",
      exampleRu: "Самолёт взлетает вовремя."
    };
    transport.cards.splice(transport.cards.indexOf(card5282) + 1, 0, startenCard);
    appendChange(
      changes,
      startenCard,
      "card",
      "",
      startenCard,
      "release preparation: created separate card from mixed front aufsteigen, starten"
    );
  }

  const hoerenBefore = cloneCard(card1950);
  Object.assign(card1950, {
    front: "hören",
    back: "слушать, слышать",
    tenses: makeTenses({
      infinitive: "hören",
      present: ["höre", "hörst", "hört", "hören", "hört", "hören"],
      perfectParticiple: "gehört",
      preterite: ["hörte", "hörtest", "hörte", "hörten", "hörtet", "hörten"]
    }),
    exampleDe: "Ich höre Musik.",
    exampleRu: "Я слушаю музыку."
  });
  appendChange(
    changes,
    card1950,
    "front/back/tenses/exampleDe/exampleRu",
    hoerenBefore,
    card1950,
    "release preparation: split mixed card; kept original ID for hören and corrected conjugation/example"
  );

  if (!communication.cards.some(card => card.front === "zuhören" && card.subcategory === card1950.subcategory)) {
    const zuhoerenCard = {
      ...cloneCard(card1950),
      id: takeId(),
      front: "zuhören",
      back: "слушать внимательно",
      grammar: {
        ...(card1950.grammar || {}),
        government: "+ Dat."
      },
      tenses: makeTenses({
        infinitive: "zuhören",
        present: ["höre zu", "hörst zu", "hört zu", "hören zu", "hört zu", "hören zu"],
        perfectParticiple: "zugehört",
        preterite: ["hörte zu", "hörtest zu", "hörte zu", "hörten zu", "hörtet zu", "hörten zu"]
      }),
      exampleDe: "Ich höre dir zu.",
      exampleRu: "Я тебя внимательно слушаю."
    };
    communication.cards.splice(communication.cards.indexOf(card1950) + 1, 0, zuhoerenCard);
    appendChange(
      changes,
      zuhoerenCard,
      "card",
      "",
      zuhoerenCard,
      "release preparation: created separate card from mixed front hören, zuhören"
    );
  }

  data.meta.totalCards = data.categories.flatMap(category => category.cards).length;

  fs.writeFileSync(DATA_FILE, `window.FLASHCARDS_DATA = ${JSON.stringify(data, null, 2)};\n`);
  if (changes.length) fs.appendFileSync(CHANGES_FILE, `\n${changes.join("\n")}`);

  console.log(JSON.stringify({
    changedRows: changes.length,
    totalCards: data.meta.totalCards,
    newMaxId: Math.max(...data.categories.flatMap(category => category.cards).map(card => Number(card.id)))
  }, null, 2));
}

main();
