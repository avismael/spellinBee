(function () {
  const FALLBACK_WORDS = [
    { id: 1, word: "teacher", meaning: "docente", category: "school", unit: "Unit 1", level: "easy", example: "My teacher is kind." },
    { id: 5, word: "beautiful", meaning: "hermoso o hermosa", category: "adjectives", unit: "Unit 2", level: "hard", example: "The flower is beautiful." }
  ];

  const STORAGE_KEY = "spellingBeeInseMistakes";

  const state = {
    words: [],
    filteredWords: [],
    roundWordIds: [],
    currentWord: null,
    score: 0,
    correct: 0,
    wrong: 0,
    totalAnswered: 0,
    mistakes: [],
    teams: [
      { id: 1, name: "Team A", score: 0 },
      { id: 2, name: "Team B", score: 0 }
    ],
    currentTeamIndex: 0,
    competitionWord: null,
    timerId: null,
    secondsLeft: 60
  };

  function normalizeAnswer(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function isCorrectAnswer(answer, correctWord) {
    return normalizeAnswer(answer) === normalizeAnswer(correctWord);
  }

  function getUniqueValues(words, field) {
    return [...new Set(words.map((word) => word[field]).filter(Boolean))].sort();
  }

  function filterWords(words, filters) {
    return words.filter((word) => {
      const categoryMatch = !filters.category || filters.category === "all" || word.category === filters.category;
      const unitMatch = !filters.unit || filters.unit === "all" || word.unit === filters.unit;
      const levelMatch = !filters.level || filters.level === "all" || word.level === filters.level;
      return categoryMatch && unitMatch && levelMatch;
    });
  }

  function selectNextWord(words, usedIds, random = Math.random) {
    if (!words.length) {
      return { word: null, usedIds: [] };
    }

    const available = words.filter((word) => !usedIds.includes(word.id));
    const pool = available.length ? available : words;
    const nextWord = pool[Math.floor(random() * pool.length)];
    const nextUsedIds = available.length ? [...usedIds, nextWord.id] : [nextWord.id];
    return { word: nextWord, usedIds: nextUsedIds };
  }

  function scoreCompetitionAnswer(teams, teamIndex, points) {
    return teams.map((team, index) => index === teamIndex ? { ...team, score: team.score + points } : team);
  }

  function getWinner(teams) {
    if (!teams.length) return null;
    const highestScore = Math.max(...teams.map((team) => team.score));
    const leaders = teams.filter((team) => team.score === highestScore);
    return leaders.length === 1 ? leaders[0] : null;
  }

  function readMistakes(storage) {
    try {
      return JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    } catch (_error) {
      return [];
    }
  }

  function writeMistakes(storage, mistakes) {
    storage.setItem(STORAGE_KEY, JSON.stringify(mistakes));
  }

  function addMistake(mistakes, word) {
    if (!word || mistakes.some((mistake) => mistake.id === word.id)) {
      return mistakes;
    }
    return [...mistakes, word];
  }

  function getElements() {
    return {
      panels: document.querySelectorAll(".panel"),
      navButtons: document.querySelectorAll("[data-view]"),
      categorySelect: document.getElementById("category-select"),
      unitSelect: document.getElementById("unit-select"),
      levelSelect: document.getElementById("level-select"),
      newRoundBtn: document.getElementById("new-round-btn"),
      listenBtn: document.getElementById("listen-btn"),
      nextWordBtn: document.getElementById("next-word-btn"),
      answerForm: document.getElementById("answer-form"),
      answerInput: document.getElementById("answer-input"),
      feedback: document.getElementById("feedback"),
      meaningDisplay: document.getElementById("meaning-display"),
      exampleDisplay: document.getElementById("example-display"),
      scoreValue: document.getElementById("score-value"),
      correctValue: document.getElementById("correct-value"),
      wrongValue: document.getElementById("wrong-value"),
      progressValue: document.getElementById("progress-value"),
      speakingWord: document.getElementById("speaking-word"),
      speakBtn: document.getElementById("speak-btn"),
      speechResult: document.getElementById("speech-result"),
      manualSpeakingCorrect: document.getElementById("manual-speaking-correct"),
      manualSpeakingWrong: document.getElementById("manual-speaking-wrong"),
      teamNameInput: document.getElementById("team-name-input"),
      addTeamBtn: document.getElementById("add-team-btn"),
      resetCompetitionBtn: document.getElementById("reset-competition-btn"),
      timerValue: document.getElementById("timer-value"),
      currentTeam: document.getElementById("current-team"),
      competitionWord: document.getElementById("competition-word"),
      competitionWordBtn: document.getElementById("competition-word-btn"),
      competitionListenBtn: document.getElementById("competition-listen-btn"),
      competitionWrongBtn: document.getElementById("competition-wrong-btn"),
      pointsButtons: document.querySelectorAll("[data-points]"),
      winnerDisplay: document.getElementById("winner-display"),
      scoreboard: document.getElementById("scoreboard"),
      practiceMistakesBtn: document.getElementById("practice-mistakes-btn"),
      clearMistakesBtn: document.getElementById("clear-mistakes-btn"),
      mistakesList: document.getElementById("mistakes-list"),
      wordBankList: document.getElementById("word-bank-list")
    };
  }

  function speak(text) {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) {
      return false;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function setFeedback(elements, message, type) {
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback ${type || ""}`.trim();
  }

  function populateSelect(select, values, label) {
    select.innerHTML = `<option value="all">All ${label}</option>`;
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function renderFilters(elements) {
    populateSelect(elements.categorySelect, getUniqueValues(state.words, "category"), "categories");
    populateSelect(elements.unitSelect, getUniqueValues(state.words, "unit"), "units");
    populateSelect(elements.levelSelect, getUniqueValues(state.words, "level"), "levels");
  }

  function currentFilters(elements) {
    return {
      category: elements.categorySelect.value,
      unit: elements.unitSelect.value,
      level: elements.levelSelect.value
    };
  }

  function refreshFilteredWords(elements) {
    state.filteredWords = filterWords(state.words, currentFilters(elements));
    state.roundWordIds = [];
  }

  function renderPractice(elements) {
    elements.scoreValue.textContent = state.score;
    elements.correctValue.textContent = state.correct;
    elements.wrongValue.textContent = state.wrong;
    elements.progressValue.textContent = `${state.totalAnswered}/${state.filteredWords.length}`;

    if (!state.currentWord) {
      elements.meaningDisplay.textContent = "No words available";
      elements.exampleDisplay.textContent = "Change the filters or add more words to data/words.json.";
      elements.speakingWord.textContent = "No word selected";
      return;
    }

    elements.meaningDisplay.textContent = state.currentWord.meaning;
    elements.exampleDisplay.textContent = state.currentWord.example;
    elements.speakingWord.textContent = state.currentWord.word;
  }

  function chooseNextPracticeWord(elements) {
    const result = selectNextWord(state.filteredWords, state.roundWordIds);
    state.currentWord = result.word;
    state.roundWordIds = result.usedIds;
    elements.answerInput.value = "";
    renderPractice(elements);
    if (state.currentWord) {
      setFeedback(elements, "Press Listen, then type the English word.", "");
      elements.answerInput.focus();
    }
  }

  function startNewRound(elements, sourceWords) {
    state.score = 0;
    state.correct = 0;
    state.wrong = 0;
    state.totalAnswered = 0;
    state.roundWordIds = [];
    state.filteredWords = sourceWords || filterWords(state.words, currentFilters(elements));
    chooseNextPracticeWord(elements);
  }

  function handleAnswer(elements) {
    if (!state.currentWord) {
      setFeedback(elements, "There is no active word.", "wrong");
      return;
    }

    state.totalAnswered += 1;
    if (isCorrectAnswer(elements.answerInput.value, state.currentWord.word)) {
      state.score += 10;
      state.correct += 1;
      setFeedback(elements, "Correct! Excellent spelling.", "correct");
    } else {
      state.wrong += 1;
      state.mistakes = addMistake(state.mistakes, state.currentWord);
      writeMistakes(window.localStorage, state.mistakes);
      renderMistakes(elements);
      setFeedback(elements, `Incorrect. The correct spelling is ${state.currentWord.word}.`, "wrong");
    }
    renderPractice(elements);
  }

  function renderWordCards(container, words, emptyMessage) {
    container.innerHTML = "";
    if (!words.length) {
      container.innerHTML = `<article><h3>${emptyMessage}</h3></article>`;
      return;
    }

    words.forEach((word) => {
      const card = document.createElement("article");
      card.innerHTML = `
        <h3>${word.word}</h3>
        <p><strong>Meaning:</strong> ${word.meaning}</p>
        <p><strong>Category:</strong> ${word.category} | ${word.unit} | ${word.level}</p>
        <p><strong>Example:</strong> ${word.example}</p>
      `;
      const listenButton = document.createElement("button");
      listenButton.type = "button";
      listenButton.textContent = "Listen";
      listenButton.addEventListener("click", () => speak(word.word));
      card.appendChild(listenButton);
      container.appendChild(card);
    });
  }

  function renderMistakes(elements) {
    renderWordCards(elements.mistakesList, state.mistakes, "No mistakes yet. Practice a round first.");
  }

  function renderWordBank(elements) {
    renderWordCards(elements.wordBankList, state.words, "No words loaded.");
  }

  function showView(elements, viewId) {
    elements.panels.forEach((panel) => panel.classList.toggle("active", panel.id === viewId));
    document.getElementById(viewId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function nextTeam() {
    state.currentTeamIndex = (state.currentTeamIndex + 1) % state.teams.length;
  }

  function renderCompetition(elements) {
    const team = state.teams[state.currentTeamIndex];
    elements.currentTeam.textContent = team ? team.name : "No teams";
    elements.competitionWord.textContent = state.competitionWord ? state.competitionWord.word : "Ready?";
    elements.timerValue.textContent = state.secondsLeft;
    elements.scoreboard.innerHTML = "";

    state.teams.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = index === state.currentTeamIndex ? "active-team" : "";
      card.innerHTML = `<h3>${item.name}</h3><p><strong>${item.score}</strong> points</p>`;
      elements.scoreboard.appendChild(card);
    });

    const winner = getWinner(state.teams);
    elements.winnerDisplay.textContent = winner && winner.score > 0 ? `Current leader: ${winner.name}` : "";
  }

  function startTimer(elements) {
    clearInterval(state.timerId);
    state.secondsLeft = 60;
    renderCompetition(elements);
    state.timerId = setInterval(() => {
      state.secondsLeft -= 1;
      elements.timerValue.textContent = state.secondsLeft;
      if (state.secondsLeft <= 0) {
        clearInterval(state.timerId);
        nextTeam();
        renderCompetition(elements);
      }
    }, 1000);
  }

  function chooseCompetitionWord(elements) {
    const result = selectNextWord(state.words, state.roundWordIds);
    state.competitionWord = result.word;
    state.roundWordIds = result.usedIds;
    startTimer(elements);
    if (state.competitionWord) {
      speak(state.competitionWord.word);
    }
  }

  function awardCompetitionPoints(elements, points) {
    state.teams = scoreCompetitionAnswer(state.teams, state.currentTeamIndex, points);
    nextTeam();
    renderCompetition(elements);
  }

  function resetCompetition(elements) {
    clearInterval(state.timerId);
    state.teams = [
      { id: 1, name: "Team A", score: 0 },
      { id: 2, name: "Team B", score: 0 }
    ];
    state.currentTeamIndex = 0;
    state.competitionWord = null;
    state.secondsLeft = 60;
    renderCompetition(elements);
  }

  function recognizeSpeech(elements) {
    if (!state.currentWord) {
      elements.speechResult.textContent = "Choose a practice word first.";
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      elements.speechResult.textContent = "Speech recognition is not available. Use manual validation.";
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    elements.speechResult.textContent = "Listening... spell the word now.";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.replace(/\s+/g, "");
      const expected = state.currentWord.word.replace(/\s+/g, "");
      const correct = isCorrectAnswer(transcript, expected);
      elements.speechResult.textContent = correct
        ? `Automatic result: correct (${event.results[0][0].transcript})`
        : `Automatic result: try again (${event.results[0][0].transcript})`;
    };
    recognition.onerror = () => {
      elements.speechResult.textContent = "Recognition failed. Use manual validation.";
    };
    recognition.start();
  }

  async function loadWords() {
    try {
      const response = await fetch("data/words.json");
      if (!response.ok) throw new Error("Word bank request failed");
      return await response.json();
    } catch (_error) {
      return FALLBACK_WORDS;
    }
  }

  function bindEvents(elements) {
    elements.navButtons.forEach((button) => button.addEventListener("click", () => showView(elements, button.dataset.view)));
    [elements.categorySelect, elements.unitSelect, elements.levelSelect].forEach((select) => {
      select.addEventListener("change", () => {
        refreshFilteredWords(elements);
        startNewRound(elements);
      });
    });
    elements.newRoundBtn.addEventListener("click", () => startNewRound(elements));
    elements.listenBtn.addEventListener("click", () => speak(state.currentWord?.word));
    elements.nextWordBtn.addEventListener("click", () => chooseNextPracticeWord(elements));
    elements.answerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleAnswer(elements);
    });
    elements.speakBtn.addEventListener("click", () => recognizeSpeech(elements));
    elements.manualSpeakingCorrect.addEventListener("click", () => {
      elements.speechResult.textContent = "Teacher marked the speaking attempt as correct.";
    });
    elements.manualSpeakingWrong.addEventListener("click", () => {
      elements.speechResult.textContent = "Teacher marked the speaking attempt as incorrect. Try again.";
    });
    elements.addTeamBtn.addEventListener("click", () => {
      const name = elements.teamNameInput.value.trim();
      if (!name) return;
      state.teams.push({ id: Date.now(), name, score: 0 });
      elements.teamNameInput.value = "";
      renderCompetition(elements);
    });
    elements.resetCompetitionBtn.addEventListener("click", () => resetCompetition(elements));
    elements.competitionWordBtn.addEventListener("click", () => chooseCompetitionWord(elements));
    elements.competitionListenBtn.addEventListener("click", () => speak(state.competitionWord?.word));
    elements.pointsButtons.forEach((button) => {
      button.addEventListener("click", () => awardCompetitionPoints(elements, Number(button.dataset.points)));
    });
    elements.competitionWrongBtn.addEventListener("click", () => {
      nextTeam();
      renderCompetition(elements);
    });
    elements.practiceMistakesBtn.addEventListener("click", () => {
      if (!state.mistakes.length) return;
      showView(elements, "practice");
      startNewRound(elements, state.mistakes);
    });
    elements.clearMistakesBtn.addEventListener("click", () => {
      state.mistakes = [];
      writeMistakes(window.localStorage, state.mistakes);
      renderMistakes(elements);
    });
  }

  async function init() {
    const elements = getElements();
    state.words = await loadWords();
    state.mistakes = readMistakes(window.localStorage);
    renderFilters(elements);
    refreshFilteredWords(elements);
    bindEvents(elements);
    renderWordBank(elements);
    renderMistakes(elements);
    renderCompetition(elements);
    startNewRound(elements);
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined") {
    module.exports = {
      addMistake,
      filterWords,
      getUniqueValues,
      getWinner,
      isCorrectAnswer,
      normalizeAnswer,
      readMistakes,
      scoreCompetitionAnswer,
      selectNextWord,
      writeMistakes,
      STORAGE_KEY
    };
  }
})();
