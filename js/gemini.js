/**
 * gemini.js — All Google Gemini API interactions
 *
 * Responsibilities:
 * - Single function to call Gemini API (gemini-1.5-flash)
 * - Input sanitization (strip HTML, limit length)
 * - Debouncing to prevent rapid-fire requests
 * - Response caching via sessionStorage
 * - Graceful error handling
 */

const GeminiAPI = (() => {
  // Track in-flight requests to prevent simultaneous duplicate calls
  let _activeRequest = false;
  let _debounceTimer = null;

  /**
   * Sanitizes user input before sending to Gemini.
   * Strips HTML tags and enforces 500-char limit.
   */
  const sanitizeInput = (text) => {
    if (typeof text !== 'string') return '';
    // Strip any HTML tags
    const stripped = text.replace(/<[^>]*>/g, '').trim();
    // Enforce character limit
    return stripped.slice(0, 500);
  };

  /**
   * Generates a cache key from the prompt for sessionStorage.
   * We cache quiz results so navigating back doesn't re-fetch.
   */
  const cacheKey = (prefix, identifier) =>
    `electiq_gemini_${prefix}_${btoa(encodeURIComponent(identifier)).slice(0, 40)}`;

  /**
   * Core Gemini API call using the REST endpoint.
   * @param {string} systemPrompt — sets AI persona and constraints
   * @param {string} userMessage  — the actual user question
   * @param {string} cachePrefix — if provided, caches result in sessionStorage
   * @returns {Promise<string>}   — the Gemini text response
   */
  const call = async (systemPrompt, userMessage, cachePrefix = null) => {
    const apiKey = window.ELECTIQ_CONFIG?.geminiApiKey;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('Gemini API key is not configured. Please set up js/config.js.');
    }

    const cleanMessage = sanitizeInput(userMessage);
    if (!cleanMessage) throw new Error('Please enter a valid question.');

    // Check sessionStorage cache first
    if (cachePrefix) {
      const key = cacheKey(cachePrefix, cleanMessage);
      const cached = sessionStorage.getItem(key);
      if (cached) return cached;
    }

    if (_activeRequest) {
      throw new Error('Please wait — a request is already in progress.');
    }

    _activeRequest = true;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\nUser: ${cleanMessage}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.95
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error('No response received from Gemini. Please try again.');

      // Save to cache if prefix provided
      if (cachePrefix) {
        const key = cacheKey(cachePrefix, cleanMessage);
        sessionStorage.setItem(key, text);
      }

      return text;

    } finally {
      _activeRequest = false;
    }
  };

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

  /**
   * Calls Gemini and expects a JSON response.
   * Strips markdown code fences that Gemini sometimes adds.
   * @param {string} prompt — full prompt requesting JSON output
   * @param {string} cachePrefix — for sessionStorage caching
   * @returns {Promise<any>} — parsed JSON
   */
  const callForJSON = async (prompt, cachePrefix = null) => {
    const rawText = await call(
      'You are a helpful assistant. Always respond with valid JSON only — no markdown, no explanation.',
      prompt,
      cachePrefix
    );

    // Strip ```json ... ``` fences Gemini sometimes adds
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    return JSON.parse(cleaned);
  };

  /**
   * Flowmap chat system prompt factory.
   * Scoped to a specific election stage.
   */
  const flowmapSystemPrompt = (stageName) =>
    `You are an expert on Indian elections and democracy. The user is currently reading about the stage: "${stageName}". Answer their questions specifically about this stage in simple, clear language suitable for a first-time voter. Be warm, encouraging, and factual. Keep answers under 150 words unless the question demands more.`;

  /**
   * Quiz generation prompt for a given module topic.
   */
  const quizPrompt = (moduleTopic) =>
    `Generate exactly 4 multiple choice questions to test understanding of "${moduleTopic}" in the context of Indian elections. Each question must have 4 options labeled A, B, C, D. Mark the correct answer. Format your response as valid JSON only with this exact structure: [{"question":"","options":{"A":"","B":"","C":"","D":""},"correct":"A","explanation":""}]. Make questions factual, clear, and appropriate for a first-time voter. No markdown formatting.`;

  /**
   * Checklist generation prompt.
   */
  const checklistPrompt = () =>
    `Based on completing a full course on Indian elections covering voter registration, nomination, campaigning, voting day, counting, and government formation, generate a personalised voter checklist for a first-time Indian voter. Include 8-10 actionable items they should complete before, during, and after election day. Format as JSON only: [{"phase":"Before Election Day","item":"","detail":""}]. Be practical, warm, and empowering. No markdown formatting.`;

  /**
   * Score encouragement message prompt.
   */
  const scorePrompt = (score, total, topic) =>
    `A first-time voter just completed a quiz on "${topic}" in Indian elections and scored ${score} out of ${total}. Write a short, warm, encouraging message (2-3 sentences) acknowledging their score and motivating them to keep learning. Be friendly and genuine.`;

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

// Expose globally
window.GeminiAPI = GeminiAPI;
