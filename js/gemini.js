/**
 * gemini.js — All Google Gemini API interactions
 *
 * Responsibilities:
 * - Single function to call Gemini API
 * - Input sanitization (strip HTML, limit length)
 * - Debouncing to prevent rapid-fire requests
 * - Response caching via sessionStorage
 * - Graceful error handling with full console logging for debugging
 *
 * Model: gemini-2.0-flash  (current stable, fast, free-tier supported)
 * API version: v1           (stable — v1beta dropped support for older model paths)
 * Endpoint: https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent
 */

const GeminiAPI = (() => {
  // ─── Constants ────────────────────────────────────────────────────────────

  const MODEL        = 'gemini-2.0-flash';
  const API_VERSION  = 'v1';
  const BASE_URL     = 'https://generativelanguage.googleapis.com';

  // Track in-flight requests to prevent simultaneous duplicate calls
  let _activeRequest = false;
  let _debounceTimer = null;

  // ─── Input Sanitization ───────────────────────────────────────────────────

  /**
   * Sanitizes user input before sending to Gemini.
   * Strips HTML tags and enforces 500-char limit.
   */
  const sanitizeInput = (text) => {
    if (typeof text !== 'string') return '';
    return text.replace(/<[^>]*>/g, '').trim().slice(0, 500);
  };

  // ─── Cache Key ────────────────────────────────────────────────────────────

  const cacheKey = (prefix, identifier) =>
    `electiq_gemini_${prefix}_${btoa(encodeURIComponent(identifier)).slice(0, 40)}`;

  // ─── Core API Call ────────────────────────────────────────────────────────

  /**
   * Core Gemini API call using the REST endpoint.
   *
   * Endpoint: POST /v1/models/gemini-2.0-flash:generateContent?key=...
   *
   * @param {string} systemPrompt — sets AI persona and constraints
   * @param {string} userMessage  — the actual user question
   * @param {string} cachePrefix  — if provided, caches result in sessionStorage
   * @returns {Promise<string>}   — the Gemini text response
   */
  const call = async (systemPrompt, userMessage, cachePrefix = null) => {
    // ── Validate API key ──
    const apiKey = window.ELECTIQ_CONFIG?.geminiApiKey;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('Gemini API key is not configured. Please set geminiApiKey in js/config.js.');
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

    // ── Build endpoint ──
    // Using v1 (stable) with gemini-2.0-flash
    const endpoint = `${BASE_URL}/${API_VERSION}/models/${MODEL}:generateContent?key=${apiKey}`;

    // ── Build request body ──
    // Format: contents → role: user → parts → text
    // System instruction is prepended as part of the user turn since
    // the REST v1 endpoint does not accept a separate systemInstruction field
    // in the same way the SDK does — this approach works reliably across all clients.
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\n${cleanMessage}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature:      0.7,
        maxOutputTokens:  1024,
        topP:             0.95
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    try {
      const response = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });

      // ── Error handling with full logging ──
      if (!response.ok) {
        let errData = {};
        try { errData = await response.json(); } catch (_) {}

        const apiMsg = errData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        console.error('[GeminiAPI] Request failed:', {
          status:   response.status,
          endpoint,
          model:    MODEL,
          apiError: errData
        });
        throw new Error(apiMsg);
      }

      const data = await response.json();

      // Log raw response in dev for debugging (harmless in production)
      console.debug('[GeminiAPI] Response received:', data);

      // ── Extract text from response ──
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        const blockReason = data?.candidates?.[0]?.finishReason;
        const safetyRatings = data?.candidates?.[0]?.safetyRatings;
        console.error('[GeminiAPI] No text in response:', { blockReason, safetyRatings, data });
        throw new Error(
          blockReason === 'SAFETY'
            ? 'Response blocked by safety filters. Please rephrase your question.'
            : 'No response received from Gemini. Please try again.'
        );
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

  // ─── Debounced Call ───────────────────────────────────────────────────────

  /**
   * Debounced version — used for chat inputs.
   * Waits 500ms after last keystroke before calling API.
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

  // ─── JSON Response Call ───────────────────────────────────────────────────

  /**
   * Calls Gemini and expects a JSON response.
   * Strips markdown code fences that Gemini sometimes wraps around JSON.
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

    // Strip ```json ... ``` fences Gemini sometimes adds despite instructions
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[GeminiAPI] JSON parse failed. Raw response:', rawText);
      throw new Error('Gemini returned an unexpected format. Please try again.');
    }
  };

  // ─── Prompt Factories ─────────────────────────────────────────────────────

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

  // ─── Public API ───────────────────────────────────────────────────────────

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

// Expose globally for use across all page scripts
window.GeminiAPI = GeminiAPI;
