(function () {
  const FALLBACK_WORDS = [
    { id: 1, word: "teacher", meaning: "docente", category: "school", unit: "Unit 1", level: "easy", example: "My teacher is kind." },
    { id: 5, word: "beautiful", meaning: "hermoso o hermosa", category: "adjectives", unit: "Unit 2", level: "hard", example: "The flower is beautiful." }
  ];

  const STORAGE_KEY = "spellingBeeInseMistakes";
  const VOICE_SETTINGS_KEY = "spellingBeeInseVoiceSettings";
  const PREFERRED_VOICE_NAMES = ["natural", "online", "neural", "google", "microsoft", "zira", "aria", "jenny", "samantha", "daniel"];
  const SPEAKING_SECONDS = 60;
  const COMPETITION_SECONDS = 60;
  const DEFAULT_TEAM_KEYS = ["a", "s", "d", "f", "j", "k", "l", ";"];
  const COMPETITION_SHORTCUTS = {
    n: "new-word",
    b: "open-buzzer",
    c: "close-buzzer",
    v: "say-word",
    e: "read-example",
    w: "reveal-word",
    p: "reveal-phrase",
    h: "hide-clues",
    1: "score-10",
    2: "score-5-pronunciation",
    3: "score-5-sentence",
    4: "score-5-no-hint",
    0: "mark-incorrect",
    r: "reset-competition"
  };

  function buildDefaultTeams() {
    return [
      { id: 1, name: "Team A", score: 0, key: DEFAULT_TEAM_KEYS[0] },
      { id: 2, name: "Team B", score: 0, key: DEFAULT_TEAM_KEYS[1] }
    ];
  }

  const state = {
    words: [],
    filteredWords: [],
    roundWordIds: [],
    currentWord: null,
    score: 0,
    correct: 0,
    wrong: 0,
    totalAnswered: 0,
    currentWordRevealed: false,
    currentExampleRevealed: false,
    speakingPracticeWord: null,
    spokenLetters: "",
    speakingWordIds: [],
    speakingCompleted: false,
    speakingAdvanceTimer: null,
    speakingTimerId: null,
    speakingRecognition: null,
    speakingRecognitionWanted: false,
    speakingRecognitionTranscript: "",
    speakingRecognitionCurrentTranscript: "",
    speakingSecondsLeft: SPEAKING_SECONDS,
    mistakes: [],
    teams: buildDefaultTeams(),
    competitionWord: null,
    competitionWordRevealed: false,
    competitionExampleRevealed: false,
    competitionUsedWordIds: [],
    buzzedTeamId: null,
    buzzerOpen: false,
    buzzerLocked: false,
    eliminatedTeamIdsForRound: [],
    competitionStatusMessage: "Round ready. Press New Word.",
    projectorSplitMode: true,
    timerId: null,
    secondsLeft: COMPETITION_SECONDS,
    selectedWordBankCategory: "",
    activeLibraryTab: "mistakes",
    voices: [],
    selectedVoiceName: "",
    voiceRate: 0.78,
    voicePitch: 1.02
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

  function groupWordsByCategory(words) {
    const groups = words.reduce((map, word) => {
      const key = word.category || "uncategorized";
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(word);
      return map;
    }, {});

    return Object.keys(groups)
      .sort()
      .map((category) => ({ category, words: groups[category] }));
  }

  function getWordsForCategory(words, category) {
    return words.filter((word) => (word.category || "uncategorized") === category);
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

  function formatTeamKey(key) {
    return key === ";" ? ";" : String(key || "").toUpperCase();
  }

  function assignNextTeamKey(teams, availableKeys = DEFAULT_TEAM_KEYS) {
    const usedKeys = new Set(teams.map((team) => team.key).filter(Boolean));
    return availableKeys.find((key) => !usedKeys.has(key)) || "";
  }

  function isTeamKeyAvailable(teams, teamId, key) {
    return !teams.some((team) => team.id !== teamId && team.key === key);
  }

  function assignTeamKeyToTeam(teams, teamId, key, availableKeys = DEFAULT_TEAM_KEYS) {
    if (!availableKeys.includes(key) || !isTeamKeyAvailable(teams, teamId, key)) {
      return teams;
    }

    return teams.map((team) => team.id === teamId ? { ...team, key } : team);
  }

  function removeTeamById(teams, teamId, minimumTeams = 2) {
    if (teams.length <= minimumTeams) {
      return teams;
    }

    return teams.filter((team) => team.id !== teamId);
  }

  function renameTeamById(teams, teamId, name) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      return teams;
    }

    return teams.map((team) => team.id === teamId ? { ...team, name: trimmedName } : team);
  }

  function resolveBuzzerTeam(key, teams) {
    const normalizedKey = String(key || "").toLowerCase();
    return teams.find((team) => team.key === normalizedKey) || null;
  }

  function canTeamBuzz(teamId, eliminatedTeamIds, buzzerOpen, buzzerLocked) {
    return Boolean(teamId) && buzzerOpen && !buzzerLocked && !eliminatedTeamIds.includes(teamId);
  }

  function getCompetitionShortcutAction(key) {
    return COMPETITION_SHORTCUTS[String(key || "").toLowerCase()] || "";
  }

  function isEditableTarget(target) {
    if (!target || typeof target.closest !== "function") return false;
    return Boolean(target.closest("input, select, textarea, [contenteditable='true']"));
  }

  function formatCompetitionWord(word, revealed) {
    if (!word) return "Ready?";
    return revealed ? word.word : "Hidden word";
  }

  function formatHiddenValue(value, revealed, hiddenText) {
    return value && revealed ? value : hiddenText;
  }

  function buildCompetitionPrompt(word) {
    return word ? `Your word is ${word.word}.` : "Choose a word first.";
  }

  function buildCelebrationMessage(word) {
    return word ? `Congratulations! ${word.word} is correct.` : "Congratulations! Correct answer.";
  }

  function extractSpokenLetters(transcript) {
    const letterWords = {
      a: "a", ay: "a", b: "b", be: "b", bee: "b", c: "c", see: "c", sea: "c", d: "d", dee: "d",
      e: "e", ee: "e", f: "f", ef: "f", g: "g", gee: "g", h: "h", aitch: "h", i: "i", eye: "i",
      j: "j", jay: "j", k: "k", kay: "k", l: "l", el: "l", m: "m", em: "m", n: "n", en: "n",
      o: "o", oh: "o", p: "p", pee: "p", q: "q", cue: "q", queue: "q", r: "r", are: "r",
      s: "s", ess: "s", t: "t", tea: "t", tee: "t", u: "u", you: "u", v: "v", vee: "v",
      w: "w", doubleyou: "w", x: "x", ex: "x", y: "y", why: "y", z: "z", zee: "z", zed: "z"
    };
    return String(transcript || "")
      .toLowerCase()
      .replace(/double\s+you/g, "doubleyou")
      .split(/[^a-z]+/)
      .filter(Boolean)
      .map((token) => letterWords[token] || (token.length === 1 ? token : token.replace(/[^a-z]/g, "")))
      .join("")
      .replace(/[^a-z]/g, "");
  }

  function buildSpellingProgress(word, spokenLetters) {
    const target = normalizeAnswer(word).replace(/[^a-z]/g, "");
    const spoken = extractSpokenLetters(spokenLetters).slice(0, target.length);
    return target.split("").map((letter, index) => ({
      letter,
      value: spoken[index] || "",
      correct: spoken[index] === letter,
      filled: Boolean(spoken[index])
    }));
  }

  function isSpellingComplete(word, spokenLetters) {
    const target = normalizeAnswer(word).replace(/[^a-z]/g, "");
    return Boolean(target) && extractSpokenLetters(spokenLetters) === target;
  }

  function formatSpeechRecognitionError(error) {
    const code = typeof error === "string" ? error : error?.error;
    const messages = {
      "not-allowed": "Microphone permission was blocked. Allow microphone access, then try again or use manual validation.",
      "service-not-allowed": "Speech recognition is blocked by this browser or connection. Try Chrome or Edge on HTTPS/localhost, or use manual validation.",
      "no-speech": "No speech was detected. Speak clearly after pressing Start Spelling, or use manual validation.",
      "audio-capture": "No microphone was found. Check the microphone, then try again or use manual validation.",
      network: "Speech recognition needs an internet connection in this browser. Check the connection or use manual validation.",
      aborted: "Speech recognition was stopped. Press Start Spelling to try again.",
      "language-not-supported": "English speech recognition is not supported by this browser. Try Chrome or Edge, or use manual validation."
    };
    return messages[code] || "Speech recognition failed. Try Chrome or Edge with microphone permission, or use manual validation.";
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

  function scoreVoice(voice) {
    const name = `${voice.name || ""} ${voice.voiceURI || ""}`.toLowerCase();
    const lang = String(voice.lang || "").toLowerCase();
    if (!lang.startsWith("en")) return -1;

    const qualityScore = PREFERRED_VOICE_NAMES.reduce((score, keyword, index) => {
      return name.includes(keyword) ? Math.max(score, 30 - index) : score;
    }, 0);
    const localeScore = lang === "en-us" ? 10 : lang === "en-gb" ? 8 : 5;
    const localScore = voice.localService ? 2 : 4;
    return qualityScore + localeScore + localScore;
  }

  function findBestVoice(voices, selectedVoiceName) {
    if (!Array.isArray(voices) || !voices.length) return null;
    const selected = voices.find((voice) => voice.name === selectedVoiceName);
    if (selected) return selected;

    return voices
      .filter((voice) => scoreVoice(voice) >= 0)
      .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || voices[0];
  }

  function buildSpeechText(word, includeExample) {
    if (!word) return "";
    return includeExample && word.example ? `${word.word}. ${word.example}` : word.word;
  }

  function readVoiceSettings(storage) {
    try {
      const settings = JSON.parse(storage.getItem(VOICE_SETTINGS_KEY) || "{}");
      return {
        selectedVoiceName: settings.selectedVoiceName || "",
        voiceRate: Number(settings.voiceRate || 0.78)
      };
    } catch (_error) {
      return { selectedVoiceName: "", voiceRate: 0.78 };
    }
  }

  function writeVoiceSettings(storage, settings) {
    storage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
  }

  function getElements() {
    return {
      views: document.querySelectorAll(".view"),
      navButtons: document.querySelectorAll("[data-view]"),
      appNav: document.querySelector(".app-shell-nav"),
      menuToggle: document.getElementById("menu-toggle"),
      categorySelect: document.getElementById("category-select"),
      unitSelect: document.getElementById("unit-select"),
      levelSelect: document.getElementById("level-select"),
      newRoundBtn: document.getElementById("new-round-btn"),
      listenBtn: document.getElementById("listen-btn"),
      listenContextBtn: document.getElementById("listen-context-btn"),
      nextWordBtn: document.getElementById("next-word-btn"),
      voiceSelect: document.getElementById("voice-select"),
      voiceRate: document.getElementById("voice-rate"),
      testVoiceBtn: document.getElementById("test-voice-btn"),
      answerForm: document.getElementById("answer-form"),
      answerInput: document.getElementById("answer-input"),
      answerSubmitBtn: document.querySelector("#answer-form button[type='submit']"),
      feedback: document.getElementById("feedback"),
      meaningDisplay: document.getElementById("meaning-display"),
      practiceState: document.getElementById("practice-state"),
      practiceActiveFilters: document.getElementById("practice-active-filters"),
      practiceRemainingValue: document.getElementById("practice-remaining-value"),
      practiceCategoryValue: document.getElementById("practice-category-value"),
      practiceUnitValue: document.getElementById("practice-unit-value"),
      practiceLevelValue: document.getElementById("practice-level-value"),
      practiceWordDisplay: document.getElementById("practice-word-display"),
      exampleDisplay: document.getElementById("example-display"),
      revealPracticeWordBtn: document.getElementById("reveal-practice-word-btn"),
      revealPracticeExampleBtn: document.getElementById("reveal-practice-example-btn"),
      hidePracticeCluesBtn: document.getElementById("hide-practice-clues-btn"),
      scoreValue: document.getElementById("score-value"),
      correctValue: document.getElementById("correct-value"),
      wrongValue: document.getElementById("wrong-value"),
      progressValue: document.getElementById("progress-value"),
      speakingWord: document.getElementById("speaking-word"),
      speakingTimerStopBtn: document.getElementById("speaking-timer-stop-btn"),
      speakingTimerValue: document.getElementById("speaking-timer-value"),
      spellingSlots: document.getElementById("spelling-slots"),
      newSpeakingWordBtn: document.getElementById("new-speaking-word-btn"),
      listenSpeakingWordBtn: document.getElementById("listen-speaking-word-btn"),
      clearSpeakingBtn: document.getElementById("clear-speaking-btn"),
      manualSpellingInput: document.getElementById("manual-spelling-input"),
      speakBtn: document.getElementById("speak-btn"),
      speechResult: document.getElementById("speech-result"),
      manualSpeakingCorrect: document.getElementById("manual-speaking-correct"),
      manualSpeakingWrong: document.getElementById("manual-speaking-wrong"),
      teamNameInput: document.getElementById("team-name-input"),
      competitionTeamKeys: document.getElementById("competition-team-keys"),
      addTeamBtn: document.getElementById("add-team-btn"),
      resetCompetitionBtn: document.getElementById("reset-competition-btn"),
      timerValue: document.getElementById("timer-value"),
      currentTeam: document.getElementById("current-team"),
      competitionStatusMessage: document.getElementById("competition-status-message"),
      competitionWord: document.getElementById("competition-word"),
      competitionWordLabel: document.getElementById("competition-word-label"),
      competitionMeaning: document.getElementById("competition-meaning"),
      competitionExample: document.getElementById("competition-example"),
      competitionLevel: document.getElementById("competition-level"),
      competitionWordBtn: document.getElementById("competition-word-btn"),
      competitionOpenBuzzerBtn: document.getElementById("competition-open-buzzer-btn"),
      competitionCloseBuzzerBtn: document.getElementById("competition-close-buzzer-btn"),
      competitionListenBtn: document.getElementById("competition-listen-btn"),
      competitionExampleBtn: document.getElementById("competition-example-btn"),
      revealWordBtn: document.getElementById("reveal-word-btn"),
      revealExampleBtn: document.getElementById("reveal-example-btn"),
      hideWordBtn: document.getElementById("hide-word-btn"),
      competitionWrongBtn: document.getElementById("competition-wrong-btn"),
      pointsButtons: document.querySelectorAll("[data-points]"),
      winnerDisplay: document.getElementById("winner-display"),
      scoreboard: document.getElementById("scoreboard"),
      competitionRoot: document.getElementById("competition"),
      practiceMistakesBtn: document.getElementById("practice-mistakes-btn"),
      clearMistakesBtn: document.getElementById("clear-mistakes-btn"),
      mistakesList: document.getElementById("mistakes-list"),
      libraryTabButtons: document.querySelectorAll("[data-library-tab]"),
      libraryPanels: document.querySelectorAll("[data-library-panel]"),
      wordBankList: document.getElementById("word-bank-list"),
      copyrightYear: document.getElementById("copyright-year")
    };
  }

  function speak(text, options = {}) {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) {
      return false;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = Number(options.rate || state.voiceRate || 0.78);
    utterance.pitch = Number(options.pitch || state.voicePitch || 1.02);
    const voice = findBestVoice(state.voices, state.selectedVoiceName);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-US";
    }
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function speakWord(word, includeExample = false) {
    return speak(buildSpeechText(word, includeExample));
  }

  function playCompetitionRoundCue(onComplete = () => {}) {
    if (typeof window === "undefined") {
      onComplete();
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      onComplete();
      return;
    }

    try {
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.12);
      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.07, audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);
      oscillator.onended = () => {
        audioContext.close().catch(() => {});
        onComplete();
      };
    } catch (_error) {
      onComplete();
    }
  }

  function setFeedback(elements, message, type) {
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback ${type || ""}`.trim();
  }

  function launchConfetti() {
    if (typeof document === "undefined") return;

    const burst = document.createElement("div");
    burst.className = "confetti-burst";
    const colors = ["#f7b801", "#2557d6", "#178f5a", "#c63d37", "#8b5cf6"];
    for (let index = 0; index < 36; index += 1) {
      const piece = document.createElement("span");
      piece.style.setProperty("--x", `${Math.cos(index) * (90 + (index % 6) * 18)}px`);
      piece.style.setProperty("--y", `${Math.sin(index) * (70 + (index % 5) * 16)}px`);
      piece.style.setProperty("--r", `${index * 23}deg`);
      piece.style.background = colors[index % colors.length];
      burst.appendChild(piece);
    }
    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), 1200);
  }

  function celebrateCorrectAnswer(word) {
    launchConfetti();
    speak(buildCelebrationMessage(word), { rate: 0.82, pitch: 1.08 });
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

  function renderVoices(elements) {
    const previousValue = elements.voiceSelect.value || state.selectedVoiceName;
    const englishVoices = state.voices.filter((voice) => scoreVoice(voice) >= 0).sort((a, b) => scoreVoice(b) - scoreVoice(a));
    elements.voiceSelect.innerHTML = `<option value="">Best available English voice</option>`;

    englishVoices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      elements.voiceSelect.appendChild(option);
    });

    elements.voiceSelect.value = englishVoices.some((voice) => voice.name === previousValue) ? previousValue : "";
  }

  function loadBrowserVoices(elements) {
    if (!window.speechSynthesis) return;
    state.voices = window.speechSynthesis.getVoices();
    renderVoices(elements);
    window.speechSynthesis.onvoiceschanged = () => {
      state.voices = window.speechSynthesis.getVoices();
      renderVoices(elements);
    };
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
    state.speakingWordIds = [];
  }

  function formatPracticeFilters(elements) {
    const labels = [
      ["Category", elements.categorySelect.value],
      ["Unit", elements.unitSelect.value],
      ["Level", elements.levelSelect.value]
    ]
      .filter(([, value]) => value && value !== "all")
      .map(([label, value]) => `${label}: ${value}`);

    return labels.length ? labels.join(" | ") : "All words";
  }

  function renderPractice(elements) {
    const hasWord = Boolean(state.currentWord);
    const hasPool = state.filteredWords.length > 0;
    const remainingWords = Math.max(state.filteredWords.length - state.roundWordIds.length, 0);
    const clueVisible = state.currentWordRevealed || state.currentExampleRevealed;

    elements.scoreValue.textContent = state.score;
    elements.correctValue.textContent = state.correct;
    elements.wrongValue.textContent = state.wrong;
    elements.progressValue.textContent = `${state.totalAnswered}/${state.filteredWords.length}`;
    elements.practiceActiveFilters.textContent = formatPracticeFilters(elements);
    elements.practiceRemainingValue.textContent = String(remainingWords);
    elements.practiceState.textContent = !hasPool
      ? "No words match these filters"
      : !hasWord
        ? "Round ready"
        : clueVisible
          ? "Clues visible"
          : "Ready to listen";

    [
      elements.listenBtn,
      elements.listenContextBtn,
      elements.revealPracticeWordBtn,
      elements.revealPracticeExampleBtn,
      elements.hidePracticeCluesBtn,
      elements.answerInput,
      elements.answerSubmitBtn
    ].forEach((element) => {
      element.disabled = !hasWord;
    });
    elements.nextWordBtn.disabled = !hasPool;
    elements.answerInput.placeholder = hasWord ? "Type the English word" : "No word available with these filters";

    if (!hasWord) {
      elements.meaningDisplay.textContent = "No words available";
      elements.practiceWordDisplay.textContent = "Hidden word";
      elements.exampleDisplay.textContent = "Change the filters or add more words to data/words.json.";
      elements.practiceCategoryValue.textContent = "-";
      elements.practiceUnitValue.textContent = "-";
      elements.practiceLevelValue.textContent = "-";
      return;
    }

    elements.meaningDisplay.textContent = state.currentWord.meaning;
    elements.practiceCategoryValue.textContent = state.currentWord.category || "-";
    elements.practiceUnitValue.textContent = state.currentWord.unit || "-";
    elements.practiceLevelValue.textContent = state.currentWord.level || "-";
    elements.practiceWordDisplay.textContent = formatHiddenValue(state.currentWord.word, state.currentWordRevealed, "Hidden word");
    elements.exampleDisplay.textContent = formatHiddenValue(state.currentWord.example, state.currentExampleRevealed, "Hidden phrase");
  }

  function renderSpeaking(elements) {
    const word = state.speakingPracticeWord;
    elements.speakingWord.textContent = word ? `${word.meaning} (${word.level})` : "No word selected";
    elements.speakingTimerValue.textContent = state.speakingSecondsLeft;
    elements.spellingSlots.innerHTML = "";

    if (!word) {
      elements.spellingSlots.innerHTML = "<span>Choose a random word to start.</span>";
      return;
    }

    buildSpellingProgress(word.word, state.spokenLetters).forEach((slot) => {
      const cell = document.createElement("span");
      cell.className = ["spelling-slot", slot.filled ? "filled" : "", slot.filled && !slot.correct ? "wrong" : ""].filter(Boolean).join(" ");
      cell.textContent = slot.filled ? slot.value.toUpperCase() : "_";
      elements.spellingSlots.appendChild(cell);
    });
  }

  function stopSpeakingTimer() {
    if (state.speakingTimerId) {
      window.clearInterval(state.speakingTimerId);
      state.speakingTimerId = null;
    }
  }

  function stopSpeakingAdvanceTimer() {
    if (state.speakingAdvanceTimer) {
      window.clearTimeout(state.speakingAdvanceTimer);
      state.speakingAdvanceTimer = null;
    }
  }

  function stopSpeakingRecognition(elements) {
    state.speakingRecognitionWanted = false;
    if (!state.speakingRecognition) return;
    const recognition = state.speakingRecognition;
    state.speakingRecognition = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch (_error) {
      try {
        recognition.stop();
      } catch (__error) {}
    }
  }

  function stopSpeakingActivity(elements, message = "Speaking practice paused. Choose a word to resume.") {
    stopSpeakingTimer();
    stopSpeakingAdvanceTimer();
    stopSpeakingRecognition(elements);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (elements?.speechResult) {
      elements.speechResult.textContent = message;
    }
  }

  function scheduleNextSpeakingWord(elements, delay = 1200) {
    stopSpeakingAdvanceTimer();
    state.speakingAdvanceTimer = window.setTimeout(() => {
      state.speakingAdvanceTimer = null;
      if (!document.getElementById("spell-aloud")?.classList.contains("active")) return;
      chooseSpeakingWord(elements);
    }, delay);
  }

  function startSpeakingTimer(elements) {
    stopSpeakingTimer();
    state.speakingSecondsLeft = SPEAKING_SECONDS;
    renderSpeaking(elements);
    if (!state.speakingPracticeWord) return;

    state.speakingTimerId = window.setInterval(() => {
      if (!document.getElementById("spell-aloud")?.classList.contains("active")) {
        stopSpeakingActivity(elements);
        return;
      }
      state.speakingSecondsLeft -= 1;
      elements.speakingTimerValue.textContent = state.speakingSecondsLeft;
      if (state.speakingSecondsLeft <= 0) {
        stopSpeakingTimer();
        stopSpeakingRecognition(elements);
        state.speakingCompleted = true;
        elements.speechResult.textContent = "Time is up. Next word coming up...";
        scheduleNextSpeakingWord(elements);
      }
    }, 1000);
  }

  function chooseSpeakingWord(elements) {
    const pool = state.filteredWords.length ? state.filteredWords : state.words;
    const result = selectNextWord(pool, state.speakingWordIds);
    state.speakingPracticeWord = result.word;
    state.speakingWordIds = result.usedIds;
    state.spokenLetters = "";
    state.speakingRecognitionTranscript = "";
    state.speakingRecognitionCurrentTranscript = "";
    state.speakingCompleted = false;
    state.speakingSecondsLeft = SPEAKING_SECONDS;
    stopSpeakingTimer();
    stopSpeakingAdvanceTimer();
    stopSpeakingRecognition(elements);
    elements.manualSpellingInput.value = "";
    elements.speechResult.textContent = "Listen to the word, then press Start Spelling.";
    renderSpeaking(elements);
    startSpeakingTimer(elements);
    speakWord(state.speakingPracticeWord);
  }

  function completeSpeakingWord(elements, transcript) {
    if (!state.speakingPracticeWord || state.speakingCompleted) return;

    state.speakingCompleted = true;
    stopSpeakingTimer();
    elements.speechResult.textContent = transcript
      ? `Correct! Completed from: ${transcript}. Next word coming up...`
      : "Correct! Next word coming up...";
    celebrateCorrectAnswer(state.speakingPracticeWord);
    scheduleNextSpeakingWord(elements, 1800);
  }

  function chooseNextPracticeWord(elements, feedbackMessage = "Press Listen, then type the English word.") {
    const result = selectNextWord(state.filteredWords, state.roundWordIds);
    state.currentWord = result.word;
    state.roundWordIds = result.usedIds;
    state.currentWordRevealed = false;
    state.currentExampleRevealed = false;
    elements.answerInput.value = "";
    renderPractice(elements);
    if (state.currentWord) {
      setFeedback(elements, feedbackMessage, "");
      elements.answerInput.focus();
    } else {
      setFeedback(elements, "No words match these filters. Change the filters or start a new round.", "wrong");
    }
  }

  function startNewRound(elements, sourceWords) {
    state.score = 0;
    state.correct = 0;
    state.wrong = 0;
    state.totalAnswered = 0;
    state.currentWordRevealed = false;
    state.currentExampleRevealed = false;
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
      celebrateCorrectAnswer(state.currentWord);
      chooseNextPracticeWord(elements, "Correct! Next word ready. Press Listen.");
      return;
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
      listenButton.addEventListener("click", () => speakWord(word));
      card.appendChild(listenButton);
      container.appendChild(card);
    });
  }

  function renderMistakes(elements) {
    renderWordCards(elements.mistakesList, state.mistakes, "No mistakes yet. Practice a round first.");
  }

  function renderWordBank(elements) {
    elements.wordBankList.innerHTML = "";
    if (!state.words.length) {
      elements.wordBankList.innerHTML = `<article><h3>No words loaded.</h3></article>`;
      return;
    }

    if (state.selectedWordBankCategory) {
      const detail = document.createElement("section");
      detail.className = "word-bank-detail";

      const header = document.createElement("div");
      header.className = "word-bank-detail-header";

      const backButton = document.createElement("button");
      backButton.type = "button";
      backButton.className = "word-bank-back-button";
      backButton.textContent = "Back to categories";
      backButton.addEventListener("click", () => {
        state.selectedWordBankCategory = "";
        renderWordBank(elements);
      });

      const detailWords = getWordsForCategory(state.words, state.selectedWordBankCategory);
      const title = document.createElement("div");
      title.innerHTML = `
        <h3>${state.selectedWordBankCategory}</h3>
        <p>${detailWords.length} words in this category</p>
      `;

      header.appendChild(backButton);
      header.appendChild(title);
      detail.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "word-list word-bank-category-grid";
      renderWordCards(grid, detailWords, "No words in this category.");
      detail.appendChild(grid);
      elements.wordBankList.appendChild(detail);
      return;
    }

    groupWordsByCategory(state.words).forEach((group) => {
      const section = document.createElement("button");
      section.type = "button";
      section.className = "word-bank-category";
      section.addEventListener("click", () => {
        state.selectedWordBankCategory = group.category;
        renderWordBank(elements);
      });

      const heading = document.createElement("div");
      heading.className = "word-bank-category-header";
      heading.innerHTML = `
        <h3>${group.category}</h3>
        <p>${group.words.length} words</p>
      `;

      const preview = document.createElement("p");
      preview.className = "word-bank-category-preview";
      preview.textContent = group.words.slice(0, 3).map((word) => word.word).join(", ");

      const hint = document.createElement("span");
      hint.className = "word-bank-category-hint";
      hint.textContent = "Click to review words";

      section.appendChild(heading);
      section.appendChild(preview);
      section.appendChild(hint);
      elements.wordBankList.appendChild(section);
    });
  }

  function renderLibraryTabs(elements) {
    elements.libraryTabButtons.forEach((button) => {
      const isActive = button.dataset.libraryTab === state.activeLibraryTab;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    elements.libraryPanels.forEach((panel) => {
      panel.hidden = panel.dataset.libraryPanel !== state.activeLibraryTab;
    });
  }

  function showView(elements, viewId) {
    const leavingSpeaking = viewId !== "spell-aloud" && document.getElementById("spell-aloud")?.classList.contains("active");
    if (leavingSpeaking) {
      stopSpeakingActivity(elements);
    }
    elements.views.forEach((view) => view.classList.toggle("active", view.id === viewId));
    elements.navButtons.forEach((button) => button.classList.toggle("current-view", button.dataset.view === viewId));
    elements.appNav.classList.remove("menu-open");
    elements.menuToggle.setAttribute("aria-expanded", "false");
    document.getElementById(viewId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function stopCompetitionTimer() {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  function startCompetitionTimer(elements) {
    stopCompetitionTimer();
    state.secondsLeft = COMPETITION_SECONDS;
    elements.timerValue.textContent = state.secondsLeft;
    state.timerId = setInterval(() => {
      state.secondsLeft -= 1;
      elements.timerValue.textContent = state.secondsLeft;
      if (state.secondsLeft <= 0) {
        stopCompetitionTimer();
        state.buzzerOpen = false;
        state.buzzerLocked = false;
        state.buzzedTeamId = null;
        state.competitionStatusMessage = "Time is up. Reopen the buzzer or choose a new word.";
        renderCompetition(elements);
      }
    }, 1000);
  }

  function getBuzzedTeam(teams, buzzedTeamId) {
    return teams.find((team) => team.id === buzzedTeamId) || null;
  }

  function getEligibleBuzzTeams(teams, eliminatedTeamIds) {
    return teams.filter((team) => !eliminatedTeamIds.includes(team.id));
  }

  function lockCompetitionBuzzer(elements, teamId) {
    const team = getBuzzedTeam(state.teams, teamId);
    if (!canTeamBuzz(teamId, state.eliminatedTeamIdsForRound, state.buzzerOpen, state.buzzerLocked) || !team) {
      return false;
    }

    stopCompetitionTimer();
    state.buzzedTeamId = teamId;
    state.buzzerLocked = true;
    state.buzzerOpen = false;
    state.competitionStatusMessage = `${team.name} buzzed first. Judge the answer.`;
    renderCompetition(elements);
    return true;
  }

  function clearCompetitionBuzzer() {
    state.buzzedTeamId = null;
    state.buzzerOpen = false;
    state.buzzerLocked = false;
  }

  function startCompetitionRound(elements) {
    const result = selectNextWord(state.words, state.competitionUsedWordIds);
    state.competitionWord = result.word;
    state.competitionUsedWordIds = result.usedIds;
    state.competitionWordRevealed = false;
    state.competitionExampleRevealed = false;
    state.eliminatedTeamIdsForRound = [];
    clearCompetitionBuzzer();
    stopCompetitionTimer();
    state.secondsLeft = COMPETITION_SECONDS;
    if (!state.competitionWord) {
      state.competitionStatusMessage = "No words available.";
      renderCompetition(elements);
      return;
    }

    openCompetitionBuzzer(elements);
    playCompetitionRoundCue(() => speakWord(state.competitionWord));
  }

  function openCompetitionBuzzer(elements) {
    if (!state.competitionWord) {
      state.competitionStatusMessage = "Choose a new word before opening the buzzer.";
      renderCompetition(elements);
      return;
    }

    const eligibleTeams = getEligibleBuzzTeams(state.teams, state.eliminatedTeamIdsForRound);
    if (!eligibleTeams.length) {
      state.competitionStatusMessage = "All teams already tried this word. Choose a new word.";
      renderCompetition(elements);
      return;
    }

    state.buzzedTeamId = null;
    state.buzzerLocked = false;
    state.buzzerOpen = true;
    state.competitionStatusMessage = "New round started. Buzzer open.";
    startCompetitionTimer(elements);
    renderCompetition(elements);
  }

  function closeCompetitionBuzzer(elements, message = "Buzzer closed.") {
    stopCompetitionTimer();
    state.buzzerOpen = false;
    state.buzzerLocked = false;
    state.buzzedTeamId = null;
    state.competitionStatusMessage = message;
    renderCompetition(elements);
  }

  function markCompetitionIncorrect(elements) {
    if (!state.competitionWord) {
      state.competitionStatusMessage = "Start a round before marking an answer.";
      renderCompetition(elements);
      return;
    }

    const team = getBuzzedTeam(state.teams, state.buzzedTeamId);
    if (!team) {
      state.competitionStatusMessage = "No buzzed team to mark incorrect.";
      renderCompetition(elements);
      return;
    }

    stopCompetitionTimer();
    state.eliminatedTeamIdsForRound = [...state.eliminatedTeamIdsForRound, team.id];
    clearCompetitionBuzzer();
    state.competitionStatusMessage = getEligibleBuzzTeams(state.teams, state.eliminatedTeamIdsForRound).length
      ? `${team.name} was incorrect. Judge can reopen the buzzer.`
      : "All teams already tried this word. Choose a new word.";
    renderCompetition(elements);
  }

  function awardCompetitionPoints(elements, points) {
    const team = getBuzzedTeam(state.teams, state.buzzedTeamId);
    if (!team) {
      state.competitionStatusMessage = "A team must buzz first before awarding points.";
      renderCompetition(elements);
      return;
    }

    const teamIndex = state.teams.findIndex((item) => item.id === team.id);
    if (teamIndex === -1) return;
    state.teams = scoreCompetitionAnswer(state.teams, teamIndex, points);
    stopCompetitionTimer();
    state.buzzerOpen = false;
    state.buzzerLocked = true;
    state.competitionStatusMessage = `${team.name} scored ${points} points. Choose a new word for the next round.`;
    renderCompetition(elements);
  }

  function resetCompetition(elements) {
    stopCompetitionTimer();
    state.teams = buildDefaultTeams();
    state.competitionWord = null;
    state.competitionWordRevealed = false;
    state.competitionExampleRevealed = false;
    state.competitionUsedWordIds = [];
    state.eliminatedTeamIdsForRound = [];
    clearCompetitionBuzzer();
    state.secondsLeft = COMPETITION_SECONDS;
    state.competitionStatusMessage = "Competition reset. Press New Word.";
    renderCompetition(elements);
  }

  function renderCompetition(elements) {
    const buzzedTeam = getBuzzedTeam(state.teams, state.buzzedTeamId);
    elements.currentTeam.textContent = buzzedTeam ? buzzedTeam.name : state.buzzerOpen ? "Waiting for buzzers" : "No team selected";
    elements.competitionStatusMessage.textContent = state.competitionStatusMessage;
    elements.competitionWord.textContent = formatCompetitionWord(state.competitionWord, state.competitionWordRevealed);
    elements.competitionWordLabel.textContent = state.competitionWordRevealed ? "Answer revealed" : "Word is hidden";
    elements.competitionMeaning.textContent = state.competitionWord ? state.competitionWord.meaning : "Start a round to show the clue.";
    elements.competitionExample.textContent = formatHiddenValue(state.competitionWord?.example, state.competitionExampleRevealed, "Hidden phrase");
    elements.competitionLevel.textContent = state.competitionWord ? `${state.competitionWord.category} | ${state.competitionWord.unit} | ${state.competitionWord.level}` : "-";
    elements.timerValue.textContent = state.secondsLeft;
    elements.competitionOpenBuzzerBtn.disabled = !state.competitionWord || state.buzzerOpen || !getEligibleBuzzTeams(state.teams, state.eliminatedTeamIdsForRound).length;
    elements.competitionCloseBuzzerBtn.disabled = !state.buzzerOpen && !state.buzzedTeamId;
    elements.competitionWrongBtn.disabled = !state.buzzedTeamId;
    elements.scoreboard.innerHTML = "";

    state.teams.forEach((item) => {
      const card = document.createElement("article");
      const classes = [];
      if (item.id === state.buzzedTeamId) classes.push("buzzed-team");
      if (state.eliminatedTeamIdsForRound.includes(item.id)) classes.push("eliminated-team");
      card.className = classes.join(" ");
      const status = item.id === state.buzzedTeamId
        ? "Buzzed"
        : state.eliminatedTeamIdsForRound.includes(item.id)
          ? "Tried"
          : state.buzzerOpen
            ? "Ready"
            : "Waiting";
      card.innerHTML = `<p>${status}</p><h3>${item.name}</h3><strong>${item.score}</strong><span>Key ${formatTeamKey(item.key)}</span>`;
      elements.scoreboard.appendChild(card);
    });

    if (elements.competitionTeamKeys) {
      elements.competitionTeamKeys.innerHTML = "";
      state.teams.forEach((team) => {
        const row = document.createElement("label");
        row.className = "team-key-row";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "team-name-editor";
        nameInput.dataset.teamId = String(team.id);
        nameInput.value = team.name;
        nameInput.setAttribute("aria-label", `${team.name} name`);

        const select = document.createElement("select");
        select.dataset.teamId = String(team.id);
        DEFAULT_TEAM_KEYS.forEach((key) => {
          const option = document.createElement("option");
          option.value = key;
          option.textContent = formatTeamKey(key);
          option.selected = team.key === key;
          option.disabled = !isTeamKeyAvailable(state.teams, team.id, key) && team.key !== key;
          select.appendChild(option);
        });

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "team-remove-button";
        removeButton.dataset.teamId = String(team.id);
        removeButton.textContent = "Remove";
        removeButton.disabled = state.teams.length <= 2;

        row.appendChild(nameInput);
        row.appendChild(select);
        row.appendChild(removeButton);
        elements.competitionTeamKeys.appendChild(row);
      });
    }

    const winner = getWinner(state.teams);
    elements.winnerDisplay.textContent = winner && winner.score > 0 ? `Current leader: ${winner.name}` : "";
  }

  function recognizeSpeech(elements, preserveTranscript = false) {
    if (!state.speakingPracticeWord) {
      elements.speechResult.textContent = "Choose a random word first.";
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      elements.speechResult.textContent = "Speech recognition is not available. Use manual validation.";
      return;
    }

    if (!preserveTranscript) {
      stopSpeakingRecognition(elements);
    }
    state.speakingRecognitionWanted = true;
    if (!preserveTranscript) {
      state.speakingRecognitionTranscript = "";
      state.speakingRecognitionCurrentTranscript = "";
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    elements.speechResult.textContent = "Listening... spell the word now.";
    recognition.onresult = (event) => {
      if (state.speakingCompleted || !document.getElementById("spell-aloud")?.classList.contains("active")) return;
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          state.speakingRecognitionTranscript = `${state.speakingRecognitionTranscript} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }
      const fullTranscript = `${state.speakingRecognitionTranscript} ${interimTranscript}`.trim();
      state.speakingRecognitionCurrentTranscript = fullTranscript;
      state.spokenLetters = extractSpokenLetters(fullTranscript);
      renderSpeaking(elements);
      if (isSpellingComplete(state.speakingPracticeWord.word, state.spokenLetters)) {
        state.speakingRecognitionWanted = false;
        completeSpeakingWord(elements, fullTranscript);
        recognition.stop();
        return;
      }
      elements.speechResult.textContent = `Recognized: ${fullTranscript}`;
    };
    recognition.onerror = (event) => {
      if (state.speakingCompleted || !document.getElementById("spell-aloud")?.classList.contains("active")) return;
      if (["not-allowed", "service-not-allowed", "language-not-supported"].includes(event.error)) {
        state.speakingRecognitionWanted = false;
      }
      elements.speechResult.textContent = formatSpeechRecognitionError(event);
    };
    recognition.onend = () => {
      if (state.speakingRecognition === recognition) {
        state.speakingRecognition = null;
      }
      if (state.speakingRecognitionCurrentTranscript) {
        state.speakingRecognitionTranscript = state.speakingRecognitionCurrentTranscript;
      }
      if (state.speakingRecognitionWanted && !state.speakingCompleted && document.getElementById("spell-aloud")?.classList.contains("active")) {
        window.setTimeout(() => {
          if (!state.speakingRecognitionWanted || state.speakingRecognition || state.speakingCompleted) return;
          recognizeSpeech(elements, true);
        }, 180);
      }
    };
    try {
      recognition.start();
      state.speakingRecognition = recognition;
      if (!state.speakingTimerId && !state.speakingCompleted) {
        startSpeakingTimer(elements);
      }
    } catch (error) {
      state.speakingRecognitionWanted = false;
      elements.speechResult.textContent = formatSpeechRecognitionError(error);
    }
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

  function handleCompetitionAction(elements, action) {
    switch (action) {
      case "new-word":
        startCompetitionRound(elements);
        break;
      case "open-buzzer":
        openCompetitionBuzzer(elements);
        break;
      case "close-buzzer":
        closeCompetitionBuzzer(elements, "Buzzer closed by judge.");
        break;
      case "say-word":
        speak(buildCompetitionPrompt(state.competitionWord));
        break;
      case "read-example":
        speakWord(state.competitionWord, true);
        break;
      case "reveal-word":
        state.competitionWordRevealed = true;
        renderCompetition(elements);
        break;
      case "reveal-phrase":
        state.competitionExampleRevealed = true;
        renderCompetition(elements);
        break;
      case "hide-clues":
        state.competitionWordRevealed = false;
        state.competitionExampleRevealed = false;
        renderCompetition(elements);
        break;
      case "score-10":
        awardCompetitionPoints(elements, 10);
        break;
      case "score-5-pronunciation":
      case "score-5-sentence":
      case "score-5-no-hint":
        awardCompetitionPoints(elements, 5);
        break;
      case "mark-incorrect":
        markCompetitionIncorrect(elements);
        break;
      case "reset-competition":
        resetCompetition(elements);
        break;
      default:
        break;
    }
  }

  function handleCompetitionKeydown(elements, event) {
    if (!document.getElementById("competition")?.classList.contains("active") || isEditableTarget(event.target)) {
      return;
    }

    const buzzedTeam = resolveBuzzerTeam(event.key, state.teams);
    if (buzzedTeam && canTeamBuzz(buzzedTeam.id, state.eliminatedTeamIdsForRound, state.buzzerOpen, state.buzzerLocked)) {
      event.preventDefault();
      lockCompetitionBuzzer(elements, buzzedTeam.id);
      return;
    }

    const action = getCompetitionShortcutAction(event.key);
    if (!action) return;
    event.preventDefault();
    handleCompetitionAction(elements, action);
  }

  function bindEvents(elements) {
    elements.menuToggle.addEventListener("click", () => {
      const isOpen = elements.appNav.classList.toggle("menu-open");
      elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
    elements.navButtons.forEach((button) => button.addEventListener("click", () => showView(elements, button.dataset.view)));
    [elements.categorySelect, elements.unitSelect, elements.levelSelect].forEach((select) => {
      select.addEventListener("change", () => {
        refreshFilteredWords(elements);
        startNewRound(elements);
      });
    });
    elements.newRoundBtn.addEventListener("click", () => startNewRound(elements));
    elements.listenBtn.addEventListener("click", () => speakWord(state.currentWord));
    elements.listenContextBtn.addEventListener("click", () => speakWord(state.currentWord, true));
    elements.revealPracticeWordBtn.addEventListener("click", () => {
      state.currentWordRevealed = true;
      renderPractice(elements);
    });
    elements.revealPracticeExampleBtn.addEventListener("click", () => {
      state.currentExampleRevealed = true;
      renderPractice(elements);
    });
    elements.hidePracticeCluesBtn.addEventListener("click", () => {
      state.currentWordRevealed = false;
      state.currentExampleRevealed = false;
      renderPractice(elements);
    });
    elements.voiceSelect.addEventListener("change", () => {
      state.selectedVoiceName = elements.voiceSelect.value;
      writeVoiceSettings(window.localStorage, { selectedVoiceName: state.selectedVoiceName, voiceRate: state.voiceRate });
    });
    elements.voiceRate.addEventListener("input", () => {
      state.voiceRate = Number(elements.voiceRate.value);
      writeVoiceSettings(window.localStorage, { selectedVoiceName: state.selectedVoiceName, voiceRate: state.voiceRate });
    });
    elements.testVoiceBtn.addEventListener("click", () => speak("Beautiful. My teacher is kind."));
    elements.nextWordBtn.addEventListener("click", () => {
      chooseNextPracticeWord(elements);
      speakWord(state.currentWord);
    });
    elements.answerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleAnswer(elements);
    });
    elements.speakBtn.addEventListener("click", () => recognizeSpeech(elements));
    elements.speakingTimerStopBtn.addEventListener("click", () => {
      stopSpeakingActivity(elements, "Speaking activity stopped. Press Start Spelling to resume.");
    });
    elements.newSpeakingWordBtn.addEventListener("click", () => chooseSpeakingWord(elements));
    elements.listenSpeakingWordBtn.addEventListener("click", () => speakWord(state.speakingPracticeWord));
    elements.clearSpeakingBtn.addEventListener("click", () => {
      state.spokenLetters = "";
      elements.manualSpellingInput.value = "";
      elements.speechResult.textContent = "Cleared. Try spelling again.";
      renderSpeaking(elements);
    });
    elements.manualSpellingInput.addEventListener("input", () => {
      if (state.speakingCompleted) return;
      state.spokenLetters = extractSpokenLetters(elements.manualSpellingInput.value);
      renderSpeaking(elements);
      if (isSpellingComplete(state.speakingPracticeWord?.word, state.spokenLetters)) {
        completeSpeakingWord(elements, elements.manualSpellingInput.value);
      }
    });
    elements.manualSpeakingCorrect.addEventListener("click", () => {
      if (state.speakingPracticeWord) {
        completeSpeakingWord(elements);
      } else {
        elements.speechResult.textContent = "Choose a random word first.";
      }
    });
    elements.manualSpeakingWrong.addEventListener("click", () => {
      elements.speechResult.textContent = "Teacher marked the speaking attempt as incorrect. Try again.";
    });
    elements.addTeamBtn.addEventListener("click", () => {
      const name = elements.teamNameInput.value.trim();
      if (!name) return;
      const key = assignNextTeamKey(state.teams);
      if (!key) {
        state.competitionStatusMessage = "No buzzer key is available for more teams.";
        renderCompetition(elements);
        return;
      }
      state.teams.push({ id: Date.now(), name, score: 0, key });
      elements.teamNameInput.value = "";
      state.competitionStatusMessage = `${name} added with buzzer key ${formatTeamKey(key)}.`;
      renderCompetition(elements);
    });
    elements.competitionTeamKeys.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement) {
        const teamId = Number(target.dataset.teamId);
        const nextKey = String(target.value || "").toLowerCase();
        const currentTeam = state.teams.find((team) => team.id === teamId);
        if (!currentTeam) return;

        if (!isTeamKeyAvailable(state.teams, teamId, nextKey)) {
          target.value = currentTeam.key;
          state.competitionStatusMessage = `Key ${formatTeamKey(nextKey)} is already assigned to another team.`;
          renderCompetition(elements);
          return;
        }

        state.teams = assignTeamKeyToTeam(state.teams, teamId, nextKey);
        state.competitionStatusMessage = `${currentTeam.name} now uses key ${formatTeamKey(nextKey)}.`;
        renderCompetition(elements);
        return;
      }

      if (target instanceof HTMLInputElement && target.classList.contains("team-name-editor")) {
        const teamId = Number(target.dataset.teamId);
        const currentTeam = state.teams.find((team) => team.id === teamId);
        if (!currentTeam) return;
        const renamedTeams = renameTeamById(state.teams, teamId, target.value);
        if (renamedTeams === state.teams) {
          target.value = currentTeam.name;
          return;
        }

        const renamedTeam = renamedTeams.find((team) => team.id === teamId);
        state.teams = renamedTeams;
        state.competitionStatusMessage = `${renamedTeam.name} was renamed.`;
        renderCompetition(elements);
      }
    });
    elements.competitionTeamKeys.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement) || !target.classList.contains("team-remove-button")) return;
      const teamId = Number(target.dataset.teamId);
      const team = state.teams.find((item) => item.id === teamId);
      if (!team) return;
      const nextTeams = removeTeamById(state.teams, teamId);
      if (nextTeams === state.teams) {
        state.competitionStatusMessage = "At least two teams are required for competition.";
        renderCompetition(elements);
        return;
      }

      state.teams = nextTeams;
      state.eliminatedTeamIdsForRound = state.eliminatedTeamIdsForRound.filter((id) => id !== teamId);
      if (state.buzzedTeamId === teamId) {
        clearCompetitionBuzzer();
        stopCompetitionTimer();
        state.competitionStatusMessage = `${team.name} was removed. Judge can reopen the buzzer.`;
      } else {
        state.competitionStatusMessage = `${team.name} was removed from the competition.`;
      }
      renderCompetition(elements);
    });
    elements.resetCompetitionBtn.addEventListener("click", () => resetCompetition(elements));
    elements.competitionWordBtn.addEventListener("click", () => handleCompetitionAction(elements, "new-word"));
    elements.competitionOpenBuzzerBtn.addEventListener("click", () => handleCompetitionAction(elements, "open-buzzer"));
    elements.competitionCloseBuzzerBtn.addEventListener("click", () => handleCompetitionAction(elements, "close-buzzer"));
    elements.competitionListenBtn.addEventListener("click", () => handleCompetitionAction(elements, "say-word"));
    elements.competitionExampleBtn.addEventListener("click", () => handleCompetitionAction(elements, "read-example"));
    elements.revealWordBtn.addEventListener("click", () => handleCompetitionAction(elements, "reveal-word"));
    elements.revealExampleBtn.addEventListener("click", () => handleCompetitionAction(elements, "reveal-phrase"));
    elements.hideWordBtn.addEventListener("click", () => handleCompetitionAction(elements, "hide-clues"));
    elements.pointsButtons.forEach((button) => {
      button.addEventListener("click", () => awardCompetitionPoints(elements, Number(button.dataset.points)));
    });
    elements.competitionWrongBtn.addEventListener("click", () => handleCompetitionAction(elements, "mark-incorrect"));
    document.addEventListener("keydown", (event) => handleCompetitionKeydown(elements, event));
    elements.libraryTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.activeLibraryTab = button.dataset.libraryTab;
        renderLibraryTabs(elements);
      });
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
    const voiceSettings = readVoiceSettings(window.localStorage);
    state.selectedVoiceName = voiceSettings.selectedVoiceName;
    state.voiceRate = voiceSettings.voiceRate;
    elements.voiceRate.value = state.voiceRate;
    state.words = await loadWords();
    state.mistakes = readMistakes(window.localStorage);
    state.activeLibraryTab = state.mistakes.length ? "mistakes" : "word-bank";
    renderFilters(elements);
    refreshFilteredWords(elements);
    bindEvents(elements);
    renderWordBank(elements);
    renderMistakes(elements);
    renderLibraryTabs(elements);
    renderSpeaking(elements);
    renderCompetition(elements);
    elements.copyrightYear.textContent = new Date().getFullYear();
    loadBrowserVoices(elements);
    startNewRound(elements);
    showView(elements, "home");
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  if (typeof module !== "undefined") {
    module.exports = {
      addMistake,
      assignTeamKeyToTeam,
      buildCelebrationMessage,
      buildSpeechText,
      buildCompetitionPrompt,
      canTeamBuzz,
      buildSpellingProgress,
      formatTeamKey,
      formatSpeechRecognitionError,
      formatCompetitionWord,
      formatHiddenValue,
      getCompetitionShortcutAction,
      extractSpokenLetters,
      findBestVoice,
      filterWords,
      assignNextTeamKey,
      getWordsForCategory,
      groupWordsByCategory,
      getUniqueValues,
      getWinner,
      isTeamKeyAvailable,
      isSpellingComplete,
      isCorrectAnswer,
      isEditableTarget,
      normalizeAnswer,
      readMistakes,
      renameTeamById,
      removeTeamById,
      resolveBuzzerTeam,
      scoreCompetitionAnswer,
      scoreVoice,
      selectNextWord,
      writeMistakes,
      writeVoiceSettings,
      readVoiceSettings,
      VOICE_SETTINGS_KEY,
      STORAGE_KEY
    };
  }
})();
