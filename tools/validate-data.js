#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_FILE = path.join(ROOT, "data_verified.js");
const PRONOUNS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];
const VALID_ARTICLES = new Set(["der", "die", "das"]);
const VALID_GENDERS = new Set(["M", "F", "N", "Pl"]);

function loadData(file) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });

  if (!sandbox.window.FLASHCARDS_DATA) {
    throw new Error("window.FLASHCARDS_DATA was not found");
  }

  return sandbox.window.FLASHCARDS_DATA;
}

function cardSignature(card) {
  return JSON.stringify({
    front: card.front,
    back: card.back,
    category: card.category,
    subcategory: card.subcategory,
    grammar: card.grammar,
    tenses: card.tenses,
    exampleDe: card.exampleDe,
    exampleRu: card.exampleRu
  });
}

function validateData(data) {
  const errors = [];
  const warnings = [];
  const categories = new Set((data.categories || []).map(category => category.name));
  const cards = (data.categories || []).flatMap(category => category.cards || []);
  const ids = new Map();
  const exact = new Map();
  const fronts = new Map();
  const examples = new Map();

  if (!Array.isArray(data.categories)) {
    errors.push("data.categories must be an array");
    return { errors, warnings, cards };
  }

  for (const category of data.categories) {
    if (!category.name) {
      errors.push(`Category without name: ${JSON.stringify(category).slice(0, 120)}`);
    }

    if (!Array.isArray(category.cards)) {
      errors.push(`Category ${category.name || category.id || "(unknown)"} has no cards array`);
      continue;
    }

    for (const card of category.cards) {
      if (ids.has(card.id)) {
        errors.push(`Duplicate ID: ${card.id} (${ids.get(card.id)} / ${card.front})`);
      } else {
        ids.set(card.id, card.front);
      }

      if (!String(card.front || "").trim()) {
        errors.push(`Empty front: ID ${card.id}`);
      }

      if (!String(card.back || "").trim()) {
        errors.push(`Empty back: ID ${card.id}`);
      }

      if (!categories.has(card.category)) {
        errors.push(`Invalid category on ID ${card.id}: ${card.category}`);
      }

      const signature = cardSignature(card);
      if (exact.has(signature)) {
        errors.push(`Exact duplicate: ID ${exact.get(signature)} and ID ${card.id}`);
      } else {
        exact.set(signature, card.id);
      }

      const frontKey = String(card.front || "").trim();
      if (frontKey) {
        if (!fronts.has(frontKey)) fronts.set(frontKey, []);
        fronts.get(frontKey).push(card);
      }

      if (card.grammar) {
        const { article, gender } = card.grammar;

        if (article && !VALID_ARTICLES.has(article)) {
          errors.push(`Invalid article on ID ${card.id}: ${article}`);
        }

        if (gender && !VALID_GENDERS.has(gender)) {
          errors.push(`Invalid gender on ID ${card.id}: ${gender}`);
        }

        const expectedGender = { der: "M", die: "F", das: "N" }[article];
        if (article && gender && expectedGender && gender !== expectedGender && !(article === "die" && gender === "Pl")) {
          errors.push(`Article/gender mismatch on ID ${card.id}: ${article}/${gender}`);
        }

        if (card.grammar.government && typeof card.grammar.government !== "string") {
          errors.push(`Invalid government on ID ${card.id}: must be string`);
        }
      }

      if (card.tenses) {
        if (!Array.isArray(card.tenses)) {
          errors.push(`Malformed tenses on ID ${card.id}: not an array`);
        } else if (card.tenses.length !== PRONOUNS.length) {
          errors.push(`Missing tense rows on ID ${card.id}: expected 6, got ${card.tenses.length}`);
        } else {
          const actualPronouns = card.tenses.map(row => row.pronoun);
          for (let index = 0; index < PRONOUNS.length; index += 1) {
            if (actualPronouns[index] !== PRONOUNS[index]) {
              errors.push(`Invalid pronoun row on ID ${card.id}: expected ${PRONOUNS[index]}, got ${actualPronouns[index]}`);
            }
          }

          for (const row of card.tenses) {
            for (const field of ["present", "perfect", "preterite", "future"]) {
              if (!String(row[field] || "").trim()) {
                errors.push(`Empty tense field on ID ${card.id}: ${row.pronoun}.${field}`);
              }
            }
          }
        }
      }

      if (card.exampleDe && !card.exampleRu) {
        warnings.push(`exampleDe without exampleRu: ID ${card.id}`);
      }

      if (card.exampleRu && !card.exampleDe) {
        warnings.push(`exampleRu without exampleDe: ID ${card.id}`);
      }

      if (card.exampleDe && /\b(undefined|null)\b/i.test(card.exampleDe)) {
        errors.push(`Invalid exampleDe on ID ${card.id}: contains undefined/null`);
      }

      if (card.exampleRu && /\b(undefined|null)\b/i.test(card.exampleRu)) {
        errors.push(`Invalid exampleRu on ID ${card.id}: contains undefined/null`);
      }

      if (card.exampleDe || card.exampleRu) {
        const exampleKey = `${card.exampleDe || ""}|||${card.exampleRu || ""}`;
        if (examples.has(exampleKey)) {
          warnings.push(`Duplicate example: ID ${examples.get(exampleKey)} and ID ${card.id}`);
        } else {
          examples.set(exampleKey, card.id);
        }
      }
    }
  }

  for (const [front, group] of fronts) {
    if (group.length < 2) continue;

    const meanings = new Set(group.map(card => String(card.back || "").trim()));
    const categoriesForFront = new Set(group.map(card => String(card.category || "").trim()));

    warnings.push(
      `Suspicious duplicate front "${front}": ${group.length} cards, ${meanings.size} meanings, ${categoriesForFront.size} categories, IDs ${group.map(card => card.id).join(", ")}`
    );
  }

  return { errors, warnings, cards };
}

function main() {
  const file = path.resolve(process.argv[2] || DEFAULT_FILE);
  let data;

  try {
    data = loadData(file);
  } catch (error) {
    console.error(`VALIDATION FAILED\n${error.message}`);
    process.exit(1);
  }

  const { errors, warnings, cards } = validateData(data);

  console.log(`Validated file: ${file}`);
  console.log(`Cards: ${cards.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (errors.length) {
    console.log("\nErrors:");
    for (const error of errors) console.log(`- ${error}`);
  }

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const warning of warnings.slice(0, 200)) console.log(`- ${warning}`);
    if (warnings.length > 200) {
      console.log(`- ... ${warnings.length - 200} more warnings omitted`);
    }
  }

  if (errors.length) {
    console.log("\nVALIDATION FAILED");
    process.exit(1);
  }

  console.log("\nVALIDATION PASSED");
}

if (require.main === module) {
  main();
}

module.exports = {
  loadData,
  validateData,
  cardSignature
};
