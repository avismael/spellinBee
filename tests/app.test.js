const test = require("node:test");
const assert = require("node:assert/strict");

const {
  addMistake,
  assignTeamKeyToTeam,
  assignNextTeamKey,
  buildCelebrationMessage,
  buildCompetitionPrompt,
  buildSpellingProgress,
  buildSpeechText,
  canTeamBuzz,
  formatTeamKey,
  formatSpeechRecognitionError,
  extractSpokenLetters,
  formatCompetitionWord,
  formatHiddenValue,
  findBestVoice,
  filterWords,
  getCompetitionShortcutAction,
  getWordsForCategory,
  groupWordsByCategory,
  getWinner,
  isTeamKeyAvailable,
  isCorrectAnswer,
  isEditableTarget,
  isSpellingComplete,
  normalizeAnswer,
  readMistakes,
  removeUnexpectedDuplicateLetters,
  renameTeamById,
  removeTeamById,
  readVoiceSettings,
  resolveBuzzerTeam,
  scoreCompetitionAnswer,
  scoreVoice,
  selectNextWord,
  writeMistakes,
  writeVoiceSettings,
  VOICE_SETTINGS_KEY,
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

test("groups word bank entries by category", () => {
  assert.deepEqual(groupWordsByCategory(words), [
    { category: "adjectives", words: [words[1]] },
    { category: "school", words: [words[0], words[2]] }
  ]);
});

test("gets the words for one word bank category", () => {
  assert.deepEqual(getWordsForCategory(words, "school"), [words[0], words[2]]);
  assert.deepEqual(getWordsForCategory(words, "adjectives"), [words[1]]);
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

test("assigns the next available buzzer key", () => {
  const teams = [{ key: "a" }, { key: "s" }];
  assert.equal(assignNextTeamKey(teams), "d");
});

test("validates that a buzzer key is unique per team", () => {
  const teams = [{ id: 1, key: "a" }, { id: 2, key: "s" }];
  assert.equal(isTeamKeyAvailable(teams, 1, "a"), true);
  assert.equal(isTeamKeyAvailable(teams, 1, "s"), false);
});

test("reassigns a buzzer key only when available", () => {
  const teams = [{ id: 1, key: "a" }, { id: 2, key: "s" }];
  assert.deepEqual(assignTeamKeyToTeam(teams, 1, "d"), [{ id: 1, key: "d" }, { id: 2, key: "s" }]);
  assert.deepEqual(assignTeamKeyToTeam(teams, 1, "s"), teams);
});

test("removes teams while keeping the minimum competition size", () => {
  const teams = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.deepEqual(removeTeamById(teams, 3), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(removeTeamById([{ id: 1 }, { id: 2 }], 2), [{ id: 1 }, { id: 2 }]);
});

test("renames a team only when the new name is not empty", () => {
  const teams = [{ id: 1, name: "Team A" }, { id: 2, name: "Team B" }];
  assert.deepEqual(renameTeamById(teams, 1, "Blue Bees"), [{ id: 1, name: "Blue Bees" }, { id: 2, name: "Team B" }]);
  assert.deepEqual(renameTeamById(teams, 1, "   "), teams);
});

test("resolves a team from a buzzer key", () => {
  const teams = [{ id: 1, key: "a" }, { id: 2, key: "s" }];
  assert.deepEqual(resolveBuzzerTeam("S", teams), teams[1]);
  assert.equal(resolveBuzzerTeam("x", teams), null);
});

test("allows buzz only for eligible teams", () => {
  assert.equal(canTeamBuzz(1, [], true, false), true);
  assert.equal(canTeamBuzz(1, [1], true, false), false);
  assert.equal(canTeamBuzz(1, [], false, false), false);
  assert.equal(canTeamBuzz(1, [], true, true), false);
});

test("maps keyboard shortcuts for judge controls", () => {
  assert.equal(getCompetitionShortcutAction("N"), "new-word");
  assert.equal(getCompetitionShortcutAction("0"), "mark-incorrect");
  assert.equal(getCompetitionShortcutAction("?"), "");
});

test("formats team key labels for the scoreboard", () => {
  assert.equal(formatTeamKey("a"), "A");
  assert.equal(formatTeamKey(";"), ";");
});

test("detects editable DOM targets", () => {
  const editableTarget = { closest: (selector) => selector === "input, select, textarea, [contenteditable='true']" ? {} : null };
  const plainTarget = { closest: () => null };
  assert.equal(isEditableTarget(editableTarget), true);
  assert.equal(isEditableTarget(plainTarget), false);
  assert.equal(isEditableTarget(null), false);
});

test("hides competition word until revealed", () => {
  assert.equal(formatCompetitionWord(null, false), "Ready?");
  assert.equal(formatCompetitionWord({ word: "teacher" }, false), "Hidden word");
  assert.equal(formatCompetitionWord({ word: "teacher" }, true), "teacher");
});

test("builds competition prompt for the current word", () => {
  assert.equal(buildCompetitionPrompt(null), "Choose a word first.");
  assert.equal(buildCompetitionPrompt({ word: "teacher" }), "Your word is teacher.");
});

test("builds celebration messages for correct answers", () => {
  assert.equal(buildCelebrationMessage(null), "Congratulations! Correct answer.");
  assert.equal(buildCelebrationMessage({ word: "teacher" }), "Congratulations! teacher is correct.");
});

test("formats hidden values until revealed", () => {
  assert.equal(formatHiddenValue("My teacher is kind.", false, "Hidden phrase"), "Hidden phrase");
  assert.equal(formatHiddenValue("My teacher is kind.", true, "Hidden phrase"), "My teacher is kind.");
  assert.equal(formatHiddenValue("", true, "Hidden phrase"), "Hidden phrase");
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

test("prefers natural English voices when available", () => {
  const voices = [
    { name: "Spanish Desktop", lang: "es-ES", localService: true, voiceURI: "Spanish Desktop" },
    { name: "Microsoft David", lang: "en-US", localService: true, voiceURI: "Microsoft David" },
    { name: "Google US English", lang: "en-US", localService: false, voiceURI: "Google US English" }
  ];
  assert.equal(scoreVoice(voices[0]), -1);
  assert.equal(findBestVoice(voices).name, "Google US English");
  assert.equal(findBestVoice(voices, "Microsoft David").name, "Microsoft David");
});

test("builds speech text with optional example context", () => {
  const word = { word: "teacher", example: "My teacher is kind." };
  assert.equal(buildSpeechText(word, false), "teacher");
  assert.equal(buildSpeechText(word, true), "teacher. My teacher is kind.");
});

test("extracts spoken spelling letters", () => {
  assert.equal(extractSpokenLetters("t e a c h e r"), "teacher");
  assert.equal(extractSpokenLetters("tee ee ay sea aitch ee are"), "teacher");
});

test("removes unexpected duplicate spoken letters", () => {
  assert.equal(removeUnexpectedDuplicateLetters("cat", "see see ay tea"), "cat");
  assert.equal(removeUnexpectedDuplicateLetters("letter", "el ee tea tea ee are"), "letter");
});

test("builds spelling progress slots", () => {
  assert.deepEqual(buildSpellingProgress("cat", "see ay"), [
    { letter: "c", value: "c", correct: true, filled: true },
    { letter: "a", value: "a", correct: true, filled: true },
    { letter: "t", value: "", correct: false, filled: false }
  ]);
});

test("detects completed spoken spelling", () => {
  assert.equal(isSpellingComplete("cat", "see ay tea"), true);
  assert.equal(isSpellingComplete("cat", "see ay"), false);
  assert.equal(isSpellingComplete("cat", "see ay tea extra"), false);
});

test("explains speech recognition errors", () => {
  assert.match(formatSpeechRecognitionError({ error: "not-allowed" }), /Microphone permission/);
  assert.match(formatSpeechRecognitionError({ error: "no-speech" }), /No speech/);
  assert.match(formatSpeechRecognitionError({ error: "network" }), /internet connection/);
  assert.match(formatSpeechRecognitionError({ error: "unknown" }), /Speech recognition failed/);
});

test("persists voice settings", () => {
  const storage = new Map();
  const fakeStorage = {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value)
  };
  writeVoiceSettings(fakeStorage, { selectedVoiceName: "Google US English", voiceRate: 0.72 });
  assert.equal(storage.has(VOICE_SETTINGS_KEY), true);
  assert.deepEqual(readVoiceSettings(fakeStorage), { selectedVoiceName: "Google US English", voiceRate: 0.72 });
});
