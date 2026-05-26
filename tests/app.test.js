const test = require("node:test");
const assert = require("node:assert/strict");

const {
  addMistake,
  filterWords,
  getWinner,
  isCorrectAnswer,
  normalizeAnswer,
  readMistakes,
  scoreCompetitionAnswer,
  selectNextWord,
  writeMistakes,
  STORAGE_KEY
} = require("../app.js");

const words = [
  { id: 1, word: "teacher", category: "school", unit: "Unit 1", level: "easy" },
  { id: 2, word: "beautiful", category: "adjectives", unit: "Unit 2", level: "hard" },
  { id: 3, word: "student", category: "school", unit: "Unit 1", level: "easy" }
];

test("normalizes written answers", () => {
  assert.equal(normalizeAnswer("  Teacher  "), "teacher");
  assert.equal(isCorrectAnswer("Teacher", "teacher"), true);
  assert.equal(isCorrectAnswer("beautifull", "beautiful"), false);
});

test("filters words by category, unit and level", () => {
  const filtered = filterWords(words, { category: "school", unit: "Unit 1", level: "easy" });
  assert.deepEqual(filtered.map((word) => word.id), [1, 3]);
});

test("selects words without repeating until pool is exhausted", () => {
  const first = selectNextWord(words.slice(0, 2), [], () => 0);
  assert.equal(first.word.id, 1);
  const second = selectNextWord(words.slice(0, 2), first.usedIds, () => 0);
  assert.equal(second.word.id, 2);
  const third = selectNextWord(words.slice(0, 2), second.usedIds, () => 0);
  assert.equal(third.word.id, 1);
  assert.deepEqual(third.usedIds, [1]);
});

test("stores each mistake only once", () => {
  const oneMistake = addMistake([], words[0]);
  const duplicated = addMistake(oneMistake, words[0]);
  assert.equal(duplicated.length, 1);
});

test("scores competition teams immutably", () => {
  const teams = [{ name: "Team A", score: 0 }, { name: "Team B", score: 0 }];
  const updated = scoreCompetitionAnswer(teams, 1, 10);
  assert.equal(updated[1].score, 10);
  assert.equal(teams[1].score, 0);
});

test("detects a unique competition winner", () => {
  assert.deepEqual(getWinner([{ name: "A", score: 10 }, { name: "B", score: 5 }]), { name: "A", score: 10 });
  assert.equal(getWinner([{ name: "A", score: 10 }, { name: "B", score: 10 }]), null);
});

test("persists mistakes with the configured storage key", () => {
  const storage = new Map();
  const fakeStorage = {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value)
  };
  writeMistakes(fakeStorage, [words[0]]);
  assert.equal(storage.has(STORAGE_KEY), true);
  assert.deepEqual(readMistakes(fakeStorage), [words[0]]);
});
