/**
 * firebase.js — Firebase Firestore progress tracking
 *
 * Anonymous auth has been removed. All Firestore operations now use
 * the authenticated user's UID from Firebase Auth.
 *
 * Firestore document path: users/{uid}/progress/{...}
 *
 * Graceful degradation: if Firebase is unavailable, falls back to
 * sessionStorage so the UI still works without persistence.
 */

const FirebaseService = (() => {
  let _db = null;
  let _initialized = false;

  // ─── Init ─────────────────────────────────────────────────────────────────

  /**
   * Initialize Firestore. Call once per page.
   * No auth here — auth is managed by AuthService.
   * Returns true if Firestore is ready, false on degradation.
   */
  const init = async () => {
    if (_initialized) return true;

    const config = window.ELECTIQ_CONFIG?.firebase;
    if (!config || config.apiKey === 'YOUR_FIREBASE_API_KEY') {
      return false; // Graceful degradation — not configured
    }

    try {
      const { initializeApp } = window.firebaseApp || {};
      const { getFirestore }  = window.firebaseFirestore || {};
      if (!initializeApp || !getFirestore) return false;

      const app = initializeApp(config);
      _db = getFirestore(app);
      _initialized = true;
      return true;
    } catch (_) {
      return false;
    }
  };

  // ─── UID Helper ───────────────────────────────────────────────────────────

  /**
   * Get the current user's UID from AuthService.
   * Falls back to a sessionStorage-based local ID for graceful degradation.
   */
  const _getUid = () => {
    const user = window.AuthService?.getCurrentUser();
    if (user?.uid) return user.uid;

    // Fallback (shouldn't happen on protected pages, but safe)
    let localId = sessionStorage.getItem('electiq_session_id');
    if (!localId) {
      localId = 'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
      sessionStorage.setItem('electiq_session_id', localId);
    }
    return localId;
  };

  // ─── Save Progress ─────────────────────────────────────────────────────────

  /**
   * Save user progress to Firestore.
   * Path: users/{uid}/progress (merged with existing data)
   * @param {Object} progressData
   */
  const saveProgress = async (progressData) => {
    const uid = _getUid();

    // Always persist to sessionStorage as a fast local backup
    sessionStorage.setItem('electiq_progress', JSON.stringify({
      ...progressData,
      updatedAt: Date.now()
    }));

    if (!_db) await init();
    if (!_db) return; // Graceful degradation

    try {
      const { doc, setDoc, serverTimestamp } = window.firebaseFirestore;
      const ref = doc(_db, 'users', uid);
      await setDoc(ref, {
        ...progressData,
        updatedAt: serverTimestamp()
      }, { merge: true }); // merge: true preserves other fields
    } catch (_) {
      // Silent — sessionStorage already updated
    }
  };

  // ─── Load Progress ─────────────────────────────────────────────────────────

  /**
   * Load user progress from Firestore, falling back to sessionStorage.
   * @returns {Promise<Object|null>}
   */
  const loadProgress = async () => {
    const uid = _getUid();

    if (!_db) await init();

    if (_db) {
      try {
        const { doc, getDoc } = window.firebaseFirestore;
        const ref  = doc(_db, 'users', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data();
      } catch (_) {
        // Fall through to sessionStorage
      }
    }

    const local = sessionStorage.getItem('electiq_progress');
    return local ? JSON.parse(local) : null;
  };

  // ─── Complete Module ───────────────────────────────────────────────────────

  /**
   * Mark a lesson module as completed and advance currentModule pointer.
   * @param {number} moduleIndex — 0-based
   */
  const completeModule = async (moduleIndex) => {
    const progress = await loadProgress() || {};
    const completed = progress.completedModules || [];

    if (!completed.includes(moduleIndex)) completed.push(moduleIndex);

    const updated = {
      ...progress,
      completedModules: completed,
      currentModule:    Math.max(progress.currentModule || 0, moduleIndex + 1),
      lastActivity:     Date.now()
    };

    await saveProgress(updated);
    return updated;
  };

  // ─── Save Quiz Score ───────────────────────────────────────────────────────

  /**
   * Persist a quiz score for a completed module.
   * @param {number} moduleIndex
   * @param {number} score
   * @param {number} total
   */
  const saveQuizScore = async (moduleIndex, score, total) => {
    const progress   = await loadProgress() || {};
    const quizScores = progress.quizScores   || {};
    quizScores[moduleIndex] = { score, total, date: Date.now() };
    await saveProgress({ ...progress, quizScores });
  };

  return { init, saveProgress, loadProgress, completeModule, saveQuizScore };
})();

window.FirebaseService = FirebaseService;
