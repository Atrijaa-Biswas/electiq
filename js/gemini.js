/**
 * gemini.js — AI API interactions (powered by Groq)
 *
 * Drop-in replacement for the original Gemini implementation.
 * Exposes the exact same window.GeminiAPI interface so quiz.js,
 * learn.js, and every other consumer works without changes.
 *
 * Model : llama-3.3-70b-versatile  (fast, free-tier, great reasoning)
 * Endpoint: https://api.groq.com/openai/v1/chat/completions  (OpenAI-compatible)
 */

const GeminiAPI = (() => {
  // ─── Constants ─────────────────────────────────────────────────────────────

  const MODEL    = 'llama-3.3-70b-versatile';
  const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

  // Track in-flight requests to prevent simultaneous duplicate calls
  let _activeRequest = false;
  let _debounceTimer = null;

  // ─── Input Sanitization ────────────────────────────────────────────────────

  /**
   * Strips HTML tags and enforces 500-char limit — identical to original.
   */
  const sanitizeInput = (text) => {
    if (typeof text !== 'string') return '';
    return text.replace(/<[^>]*>/g, '').trim().slice(0, 500);
  };

  // ─── Cache Key ─────────────────────────────────────────────────────────────

  const cacheKey = (prefix, identifier) =>
    `electiq_groq_${prefix}_${btoa(encodeURIComponent(identifier)).slice(0, 40)}`;

  // ─── Core API Call ─────────────────────────────────────────────────────────

  /**
   * Calls the Groq chat-completions endpoint.
   *
   * @param {string} systemPrompt  — sets AI persona and constraints
   * @param {string} userMessage   — the actual user question
   * @param {string} cachePrefix   — if provided, caches result in sessionStorage
   * @returns {Promise<string>}    — the AI text response
   */
  const call = async (systemPrompt, userMessage, cachePrefix = null) => {
    // ── Validate API key ──
    const apiKey = window.ELECTIQ_CONFIG?.groqApiKey;
    if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
      throw new Error('Groq API key is not configured. Please set groqApiKey in js/config.js.');
    }

    const cleanMessage = sanitizeInput(userMessage);
    if (!cleanMessage) throw new Error('Please enter a valid question.');

    // ── Check sessionStorage cache ──
    if (cachePrefix) {
      const key = cacheKey(cachePrefix, cleanMessage);
      const cached = sessionStorage.getItem(key);
      if (cached) return cached;
    }

    if (_activeRequest) {
      throw new Error('Please wait — a request is already in progress.');
    }

    _activeRequest = true;

    // ── Build request payload (OpenAI-compatible format) ──
    const payload = {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: cleanMessage }
      ],
      temperature:  0.7,
      max_tokens:   1024,
      top_p:        0.95
    };

    try {
      const response = await fetch(BASE_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      // ── Error handling ──
      if (!response.ok) {
        let errData = {};
        try { errData = await response.json(); } catch (_) {}

        const apiMsg = errData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        console.error('[GroqAPI] Request failed:', {
          status:   response.status,
          endpoint: BASE_URL,
          model:    MODEL,
          apiError: errData
        });
        throw new Error(apiMsg);
      }

      const data = await response.json();
      console.debug('[GroqAPI] Response received:', data);

      // ── Extract text from OpenAI-compatible response ──
      const text = data?.choices?.[0]?.message?.content;

      if (!text) {
        const finishReason = data?.choices?.[0]?.finish_reason;
        console.error('[GroqAPI] No text in response:', { finishReason, data });
        throw new Error('No response received from Groq. Please try again.');
      }

      // ── Cache the result ──
      if (cachePrefix) {
        const key = cacheKey(cachePrefix, cleanMessage);
        try { sessionStorage.setItem(key, text); } catch (_) {}
      }

      return text;

    } finally {
      _activeRequest = false;
    }
  };

  // ─── Debounced Call ────────────────────────────────────────────────────────

  /**
   * Debounced version — used for chat inputs.
   * Waits 500 ms after last keystroke before calling API.
   */
  const callDebounced = (systemPrompt, userMessage, callback, delay = 500) => {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(async () => {
      try {
        const result = await call(systemPrompt, userMessage);
        callback(null, result);
      } catch (err) {
        callback(err, null);
      }
    }, delay);
  };

  // ─── JSON Response Call ────────────────────────────────────────────────────

  /**
   * Calls Groq and expects a JSON response.
   * Strips markdown code fences that models sometimes add despite instructions.
   *
   * @param {string} prompt       — full prompt requesting JSON output
   * @param {string} cachePrefix  — for sessionStorage caching
   * @returns {Promise<any>}      — parsed JSON object/array
   */
  const callForJSON = async (prompt, cachePrefix = null) => {
    const rawText = await call(
      'You are a helpful assistant. Always respond with valid JSON only — no markdown, no explanation, no code fences.',
      prompt,
      cachePrefix
    );

    // Strip ```json … ``` fences models sometimes add despite instructions
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[GroqAPI] JSON parse failed. Raw response:', rawText);
      throw new Error('AI returned an unexpected format. Please try again.');
    }
  };

  // ─── Prompt Factories (identical to original) ──────────────────────────────

  /**
   * Flowmap chat system prompt — scoped to a specific election stage.
   */
  const flowmapSystemPrompt = (stageName) =>
    `You are an expert on Indian elections and democracy. The user is currently reading about the election stage: "${stageName}". Answer their question specifically about this stage in simple, clear language suitable for a first-time voter. Be warm, encouraging, and factual. Keep answers under 150 words unless the question specifically demands more detail.`;

  /**
   * Quiz generation prompt for a given module topic.
   * Returns a JSON array of 4 MCQs.
   */
  const quizPrompt = (moduleTopic) =>
    `Generate exactly 4 multiple choice questions to test understanding of "${moduleTopic}" in the context of Indian elections. Each question must have 4 options labeled A, B, C, D. Mark the correct answer. Format your response as valid JSON only with this exact structure (array of 4 objects): [{"question":"","options":{"A":"","B":"","C":"","D":""},"correct":"A","explanation":""}]. Make questions factual, clear, and appropriate for a first-time voter. No markdown formatting. No code fences. Only the raw JSON array.`;

  /**
   * Voter checklist generation prompt.
   * Returns a JSON array of checklist items grouped by phase.
   */
  const checklistPrompt = () =>
    `Based on completing a full course on Indian elections covering voter registration, nomination, campaigning, voting day, counting, and government formation, generate a personalised voter readiness checklist for a first-time Indian voter. Include 8-10 actionable items they should complete before, during, and after election day. Format as JSON only (array of objects): [{"phase":"Before Election Day","item":"","detail":""}]. Valid phases: "Before Election Day", "On Election Day", "After Election Day". Be practical, warm, and empowering. No markdown. Only the raw JSON array.`;

  /**
   * Score encouragement message prompt.
   */
  const scorePrompt = (score, total, topic) =>
    `A first-time voter just completed a quiz on "${topic}" in Indian elections and scored ${score} out of ${total}. Write a short, warm, encouraging message (2-3 sentences) acknowledging their score and motivating them to keep learning. Be friendly and genuine. Plain text only, no markdown.`;

  // ─── Public API ────────────────────────────────────────────────────────────

  return {
    call,
    callDebounced,
    callForJSON,
    flowmapSystemPrompt,
    quizPrompt,
    checklistPrompt,
    scorePrompt,
    sanitizeInput
  };
})();

// Expose globally — same name as before so all other scripts work unchanged
window.GeminiAPI = GeminiAPI;