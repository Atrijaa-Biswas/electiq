/**
 * quiz.js — AI-generated quiz logic
 *
 * Responsibilities:
 * - Read module index from URL ?module=N
 * - Call Gemini to generate 4 MCQ questions (cached in sessionStorage)
 * - Render questions as government exam-style answer sheets
 * - Handle answer selection and submission
 * - Show correct/wrong stamps with Gemini explanations
 * - Score summary with Gemini encouragement message
 * - Save score to Firebase
 */

// Module topic names (aligned with learn.js)
const MODULE_TOPICS = [
  'Voter Registration in India',
  'Election Announcement and the Model Code of Conduct in India',
  'Candidate Nomination and Scrutiny in Indian Elections',
  'Election Campaigning rules and regulations in India',
  'Voting Day procedures, EVMs, and VVPAT in India',
  'Vote Counting and Results declaration in Indian Elections',
  'Government Formation and Swearing In after Indian Elections'
];

const MODULE_NAMES = [
  'Voter Registration',
  'Election Announcement & MCC',
  'Candidate Nomination & Scrutiny',
  'Election Campaigning',
  'Voting Day',
  'Vote Counting & Results',
  'Government Formation & Swearing In'
];

// ─── State ─────────────────────────────────────────────────────────────────
let _moduleIndex = 0;
let _questions = [];
let _answers = {}; // questionIndex → selected option key
let _submitted = {}; // questionIndex → true if submitted
let _score = 0;

const qs = (sel, ctx = document) => ctx.querySelector(sel);

// ─── Gemini Quiz Generation ────────────────────────────────────────────────

const generateQuiz = async (moduleIndex) => {
  const topic = MODULE_TOPICS[moduleIndex];

  // Check sessionStorage cache — don't re-fetch if user navigates back
  const cacheKey = `electiq_quiz_${moduleIndex}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (_) { /* ignore corrupt cache */ }
  }

  const prompt = window.GeminiAPI.quizPrompt(topic);
  const questions = await window.GeminiAPI.callForJSON(prompt);

  // Validate the structure
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Gemini returned an unexpected quiz format. Please try again.');
  }

  // Cache the result
  sessionStorage.setItem(cacheKey, JSON.stringify(questions));
  return questions;
};

// ─── Render ────────────────────────────────────────────────────────────────

const renderQuestions = (questions) => {
  const container = qs('#quiz-questions');
  if (!container) return;
  container.innerHTML = '';

  questions.forEach((q, idx) => {
    const card = document.createElement('article');
    card.className = 'question-card';
    card.id = `question-${idx}`;
    card.setAttribute('aria-labelledby', `q-text-${idx}`);

    const optionKeys = ['A', 'B', 'C', 'D'];
    const optionsHTML = optionKeys.map(key => `
      <li class="option-item">
        <button
          class="option-btn"
          data-question="${idx}"
          data-option="${key}"
          type="button"
          aria-pressed="false"
          aria-label="Option ${key}: ${q.options[key]}"
        >
          <span class="option-label">${key}</span>
          <span class="option-text">${q.options[key]}</span>
        </button>
      </li>
    `).join('');

    card.innerHTML = `
      <div class="question-number" aria-hidden="true">${String(idx + 1).padStart(2, '0')}.</div>
      <div class="question-text" id="q-text-${idx}">${q.question}</div>
      <ul class="options-list" role="radiogroup" aria-labelledby="q-text-${idx}">
        ${optionsHTML}
      </ul>
      <button
        class="btn-submit"
        data-question="${idx}"
        type="button"
        disabled
        aria-label="Submit answer for question ${idx + 1}"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2" fill="none"/>
          <path d="M7 12l4 4 6-6" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        Submit Answer
      </button>
      <div class="feedback" id="feedback-${idx}" role="status" aria-live="polite"></div>
    `;

    container.appendChild(card);
  });

  // Attach option listeners
  container.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', handleOptionSelect);
  });

  // Attach submit listeners
  container.querySelectorAll('.btn-submit').forEach(btn => {
    btn.addEventListener('click', handleSubmit);
  });
};

// ─── Event Handlers ────────────────────────────────────────────────────────

const handleOptionSelect = (e) => {
  const btn = e.currentTarget;
  const qIdx = parseInt(btn.dataset.question, 10);
  const opt = btn.dataset.option;

  // Don't allow changing answer after submission
  if (_submitted[qIdx]) return;

  _answers[qIdx] = opt;

  // Update visual state for all options in this question
  const card = qs(`#question-${qIdx}`);
  card.querySelectorAll('.option-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.option === opt);
    b.setAttribute('aria-pressed', b.dataset.option === opt ? 'true' : 'false');
  });

  // Enable submit button
  const submitBtn = card.querySelector('.btn-submit');
  if (submitBtn) submitBtn.disabled = false;
};

const handleSubmit = async (e) => {
  const btn = e.currentTarget;
  const qIdx = parseInt(btn.dataset.question, 10);

  if (_submitted[qIdx]) return;
  if (_answers[qIdx] === undefined) return;

  _submitted[qIdx] = true;
  btn.disabled = true;

  const question = _questions[qIdx];
  const userAnswer = _answers[qIdx];
  const isCorrect = userAnswer === question.correct;

  if (isCorrect) _score++;

  // Disable all option buttons for this question
  const card = qs(`#question-${qIdx}`);
  card.querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.option === question.correct) b.classList.add('correct');
    if (b.dataset.option === userAnswer && !isCorrect) b.classList.add('wrong');
  });

  // Show feedback
  const feedbackEl = qs(`#feedback-${qIdx}`);
  feedbackEl.classList.add('visible');

  if (isCorrect) {
    feedbackEl.innerHTML = `
      <div class="feedback-correct">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="13" fill="#2D6A4F"/>
          <path d="M8 14l4 4 8-8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        CORRECT ✓
      </div>
    `;
  } else {
    feedbackEl.innerHTML = `
      <div class="feedback-wrong">
        <div class="feedback-wrong-title">Incorrect — The correct answer is ${question.correct}</div>
        <p>${question.explanation}</p>
      </div>
    `;
  }

  // Check if all questions answered
  const allDone = _questions.every((_, i) => _submitted[i]);
  if (allDone) {
    setTimeout(showScoreSummary, 600);
  }
};

// ─── Score Summary ─────────────────────────────────────────────────────────

const showScoreSummary = async () => {
  const scoreCard = qs('#score-card');
  if (!scoreCard) return;

  const moduleName = MODULE_NAMES[_moduleIndex];
  const total = _questions.length;
  const nextModuleIndex = _moduleIndex + 1;
  const isLastModule = nextModuleIndex >= MODULE_TOPICS.length;

  // Update score display
  qs('#score-num').textContent = _score;
  qs('#score-total').textContent = total;

  // Next button
  const nextBtn = qs('#btn-score-next');
  if (nextBtn) {
    if (isLastModule) {
      nextBtn.textContent = 'Get My Voter Checklist →';
      nextBtn.href = 'checklist.html';
    } else {
      nextBtn.textContent = `Next Module →`;
      nextBtn.href = `learn.html?resume=${nextModuleIndex}`;
    }
  }

  scoreCard.classList.add('visible');
  scoreCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Save score to Firebase
  try {
    await window.FirebaseService?.saveQuizScore(_moduleIndex, _score, total);
  } catch (_) { /* silent */ }

  // Gemini encouragement message
  const msgEl = qs('#score-message');
  if (msgEl) {
    msgEl.textContent = 'Generating your personalised feedback…';
    try {
      const prompt = window.GeminiAPI.scorePrompt(_score, total, moduleName);
      const message = await window.GeminiAPI.call(
        'You are a warm, encouraging teacher. Keep your response to 2-3 sentences.',
        prompt
      );
      msgEl.textContent = message;
    } catch (_) {
      msgEl.textContent = _score >= 3
        ? `Excellent work on "${moduleName}"! You\'re well on your way to becoming an informed voter.`
        : `Good effort on "${moduleName}"! Every question you explore brings you closer to understanding your democratic rights.`;
    }
  }
};

// ─── Init ─────────────────────────────────────────────────────────────────

const init = async () => {
  // Read module index from URL parameter
  const params = new URLSearchParams(window.location.search);
  _moduleIndex = Math.max(0, Math.min(parseInt(params.get('module') || '0', 10), MODULE_TOPICS.length - 1));

  // Update page header
  const headerLabel = qs('#quiz-module-label');
  if (headerLabel) headerLabel.textContent = `Testing Module ${_moduleIndex + 1}: ${MODULE_NAMES[_moduleIndex]}`;

  const pageTitle = qs('#quiz-page-title');
  if (pageTitle) pageTitle.textContent = `Quiz — ${MODULE_NAMES[_moduleIndex]}`;

  // Initialize Firebase
  try {
    await window.FirebaseService?.init();
  } catch (_) { /* graceful */ }

  // Show loading state
  const container = qs('#quiz-questions');
  if (container) {
    container.innerHTML = `
      <div class="quiz-loading">
        <div class="spinner" aria-label="Generating quiz questions"></div>
        <p>Gemini is crafting your quiz questions…</p>
      </div>
    `;
  }

  // Generate quiz
  try {
    _questions = await generateQuiz(_moduleIndex);
    renderQuestions(_questions);
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div class="error-card" role="alert">
          <strong>Quiz generation failed.</strong><br>
          ${err.message}<br><br>
          Please ensure your Gemini API key is correctly set in js/config.js, then
          <a href="quiz.html?module=${_moduleIndex}">try again</a>.
        </div>
      `;
    }
  }

  // Retry quiz button
  qs('#btn-retry')?.addEventListener('click', () => {
    // Clear cache for this module so a fresh quiz is generated
    sessionStorage.removeItem(`electiq_quiz_${_moduleIndex}`);
    window.location.reload();
  });

  qs('.quiz-page')?.classList.add('page-entry');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
