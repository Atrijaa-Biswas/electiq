/**
 * firebase.js — Firebase Firestore progress tracking + Anonymous Auth
 *
 * Responsibilities:
 * - Initialize Firebase app
 * - Sign in anonymously (no login required)
 * - Save/load user progress to Firestore
 * - Firestore security: each user can only read/write their own document
 * - Graceful degradation if Firebase is unavailable
 */

const FirebaseService = (() => {
  let _db = null;
  let _auth = null;
  let _userId = null;
  let _initialized = false;

  /**
   * Initialize Firebase and sign in anonymously.
   * Must be called before any other method.
   * Returns the anonymous user ID.
   */
  const init = async () => {
    if (_initialized) return _userId;

    const config = window.ELECTIQ_CONFIG?.firebase;
    if (!config || config.apiKey === 'YOUR_FIREBASE_API_KEY') {
      // Graceful degradation — Firebase not configured
      _userId = sessionStorage.getItem('electiq_session_id') || _generateLocalId();
      sessionStorage.setItem('electiq_session_id', _userId);
      return _userId;
    }

    try {
      // Import Firebase modules from CDN (loaded in HTML)
      const { initializeApp } = window.firebaseApp || {};
      const { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } = window.firebaseFirestore || {};
      const { getAuth, signInAnonymously } = window.firebaseAuth || {};

      if (!initializeApp) throw new Error('Firebase SDK not loaded');

      const app = initializeApp(config);
      _db = getFirestore(app);
      _auth = getAuth(app);

      const credential = await signInAnonymously(_auth);
      _userId = credential.user.uid;

      _initialized = true;
      return _userId;

    } catch (err) {
      // Fallback to session-based ID if Firebase fails
      _userId = sessionStorage.getItem('electiq_session_id') || _generateLocalId();
      sessionStorage.setItem('electiq_session_id', _userId);
      return _userId;
    }
  };

  /** Generate a local session ID when Firebase is unavailable */
  const _generateLocalId = () =>
    'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2);

  /**
   * Save user progress to Firestore.
   * Document path: users/{userId}
   * @param {Object} progressData — e.g. { currentModule: 3, completedModules: [1,2,3] }
   */
  const saveProgress = async (progressData) => {
    if (!_userId) await init();

    // Always save to sessionStorage as backup
    sessionStorage.setItem('electiq_progress', JSON.stringify({
      ...progressData,
      updatedAt: Date.now()
    }));

    if (!_db || !_initialized) return; // Graceful degradation

    try {
      const { doc, setDoc, serverTimestamp } = window.firebaseFirestore;
      const userRef = doc(_db, 'users', _userId);
      await setDoc(userRef, {
        ...progressData,
        updatedAt: serverTimestamp()
      }, { merge: true }); // merge: true preserves existing fields
    } catch (err) {
      // Silent fail — progress is in sessionStorage at minimum
    }
  };

  /**
   * Load user progress from Firestore (or sessionStorage fallback).
   * @returns {Promise<Object|null>} — progress object or null if none found
   */
  const loadProgress = async () => {
    if (!_userId) await init();

    // Try Firestore first
    if (_db && _initialized) {
      try {
        const { doc, getDoc } = window.firebaseFirestore;
        const userRef = doc(_db, 'users', _userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) return snap.data();
      } catch (err) {
        // Fall through to sessionStorage
      }
    }

    // Fallback: sessionStorage
    const local = sessionStorage.getItem('electiq_progress');
    return local ? JSON.parse(local) : null;
  };

  /**
   * Mark a lesson module as completed.
   * @param {number} moduleIndex — 0-based module index
   */
  const completeModule = async (moduleIndex) => {
    const progress = await loadProgress() || {};
    const completed = progress.completedModules || [];

    if (!completed.includes(moduleIndex)) {
      completed.push(moduleIndex);
    }

    const updated = {
      ...progress,
      completedModules: completed,
      currentModule: Math.max(progress.currentModule || 0, moduleIndex + 1),
      lastActivity: Date.now()
    };

    await saveProgress(updated);
    return updated;
  };

  /**
   * Save quiz score for a module.
   * @param {number} moduleIndex
   * @param {number} score
   * @param {number} total
   */
  const saveQuizScore = async (moduleIndex, score, total) => {
    const progress = await loadProgress() || {};
    const quizScores = progress.quizScores || {};
    quizScores[moduleIndex] = { score, total, date: Date.now() };

    await saveProgress({ ...progress, quizScores });
  };

  /** Get the anonymous user ID (for display or logging) */
  const getUserId = () => _userId;

  return { init, saveProgress, loadProgress, completeModule, saveQuizScore, getUserId };
})();

window.FirebaseService = FirebaseService;
