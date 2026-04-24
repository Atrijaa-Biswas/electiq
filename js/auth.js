/**
 * auth.js — Firebase Authentication module
 *
 * Responsibilities:
 * - Google Sign-In (OAuth popup)
 * - Email & Password sign-in and registration
 * - Sign-out (clears session cache, redirects)
 * - Auth state observer for route protection
 * - User-friendly error message mapping
 *
 * No anonymous auth. All Firestore operations use the real UID.
 */

const AuthService = (() => {
  // Internal Firebase auth instance (set during init)
  let _auth = null;
  let _currentUser = null;

  // ─── Firebase Error → Plain English ─────────────────────────────────────

  const AUTH_ERROR_MESSAGES = {
    'auth/user-not-found':        "We couldn't find that account. Try registering instead.",
    'auth/wrong-password':        'Incorrect password. Please try again.',
    'auth/email-already-in-use':  'An account with this email exists. Try signing in.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/weak-password':         'Password must be at least 6 characters.',
    'auth/popup-closed-by-user':  'Sign-in cancelled. Please try again.',
    'auth/popup-blocked':         'Sign-in popup was blocked. Please allow popups for this site.',
    'auth/network-request-failed':'Network error. Please check your connection and try again.',
    'auth/too-many-requests':     'Too many attempts. Please wait a moment and try again.',
    'auth/invalid-credential':    'Incorrect email or password. Please try again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    'auth/user-disabled':         'This account has been disabled. Please contact support.',
  };

  const friendlyError = (firebaseError) => {
    const code = firebaseError?.code || '';
    return AUTH_ERROR_MESSAGES[code] || 'Something went wrong. Please try again shortly.';
  };

  // ─── Sanitize Display Name ───────────────────────────────────────────────

  const sanitizeDisplayName = (name) => {
    if (typeof name !== 'string') return '';
    // Strip HTML tags, trim, enforce max 50 chars
    return name.replace(/<[^>]*>/g, '').trim().slice(0, 50);
  };

  // ─── Init ────────────────────────────────────────────────────────────────

  /**
   * Initialize Firebase Auth. Must be called once before any other method.
   * Attaches an onAuthStateChanged listener that keeps _currentUser in sync.
   * @returns {Promise<object|null>} — the current user, or null
   */
  const initAuth = () => {
    return new Promise((resolve) => {
      const { getAuth, onAuthStateChanged } = window.firebaseAuth || {};
      const { initializeApp } = window.firebaseApp || {};
      const config = window.ELECTIQ_CONFIG?.firebase;

      if (!getAuth || !config || config.apiKey === 'YOUR_FIREBASE_API_KEY') {
        // Firebase not configured — resolve with null (graceful degradation)
        resolve(null);
        return;
      }

      try {
        // initializeApp is safe to call multiple times (Firebase deduplicates)
        const app = initializeApp(config);
        _auth = getAuth(app);

        // onAuthStateChanged fires immediately with current state
        const unsubscribe = onAuthStateChanged(_auth, (user) => {
          _currentUser = user;
          unsubscribe(); // Only need the first emission for init
          resolve(user);
        });
      } catch (err) {
        resolve(null);
      }
    });
  };

  // ─── onAuthReady ─────────────────────────────────────────────────────────

  /**
   * Wait for Firebase Auth to resolve the current user.
   * Use this in protected pages to gate content rendering.
   * @param {Function} callback — called with (user) once auth is ready
   */
  const onAuthReady = (callback) => {
    const { getAuth, onAuthStateChanged } = window.firebaseAuth || {};

    if (!getAuth) {
      callback(null);
      return;
    }

    if (_auth) {
      // Auth already initialised — use cached instance
      onAuthStateChanged(_auth, callback);
    } else {
      // Auth not yet initialised — init first
      initAuth().then(() => {
        if (_auth) {
          onAuthStateChanged(_auth, callback);
        } else {
          callback(null);
        }
      });
    }
  };

  // ─── Google Sign-In ──────────────────────────────────────────────────────

  /**
   * Sign in using Google OAuth popup.
   * @returns {Promise<object>} — Firebase UserCredential
   * @throws {Error} with user-friendly message
   */
  const signInWithGoogle = async () => {
    if (!_auth) await initAuth();

    const { GoogleAuthProvider, signInWithPopup } = window.firebaseAuth;

    try {
      const provider = new GoogleAuthProvider();
      // Request profile and email scopes
      provider.addScope('email');
      provider.addScope('profile');

      const credential = await signInWithPopup(_auth, provider);
      _currentUser = credential.user;
      return credential;
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  };

  // ─── Email / Password Sign-In ────────────────────────────────────────────

  /**
   * Sign in with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} — Firebase UserCredential
   * @throws {Error} with user-friendly message
   */
  const signInWithEmail = async (email, password) => {
    if (!_auth) await initAuth();

    const { signInWithEmailAndPassword } = window.firebaseAuth;

    try {
      const credential = await signInWithEmailAndPassword(_auth, email, password);
      _currentUser = credential.user;
      return credential;
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  };

  // ─── Email Registration ───────────────────────────────────────────────────

  /**
   * Register a new user with email, password, and display name.
   * Sends a verification email automatically.
   * @param {string} email
   * @param {string} password
   * @param {string} displayName — sanitized before use
   * @returns {Promise<object>} — Firebase UserCredential
   * @throws {Error} with user-friendly message
   */
  const registerWithEmail = async (email, password, displayName) => {
    if (!_auth) await initAuth();

    const {
      createUserWithEmailAndPassword,
      updateProfile,
      sendEmailVerification
    } = window.firebaseAuth;

    const cleanName = sanitizeDisplayName(displayName) || email.split('@')[0];

    try {
      const credential = await createUserWithEmailAndPassword(_auth, email, password);
      const user = credential.user;

      // Set the display name on the profile
      await updateProfile(user, { displayName: cleanName });

      // Send email verification
      await sendEmailVerification(user);

      _currentUser = user;
      return credential;
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  };

  // ─── Resend Verification Email ────────────────────────────────────────────

  /**
   * Resend verification email to the current user.
   * @throws {Error} with user-friendly message
   */
  const resendVerificationEmail = async () => {
    if (!_currentUser) throw new Error('No signed-in user found.');

    const { sendEmailVerification } = window.firebaseAuth;

    try {
      await sendEmailVerification(_currentUser);
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  };

  // ─── Sign Out ─────────────────────────────────────────────────────────────

  /**
   * Sign the current user out.
   * Clears all session-based cache (quizzes, checklist).
   * Redirects to index.html.
   */
  const signOut = async () => {
    const { signOut: firebaseSignOut } = window.firebaseAuth;

    try {
      // Clear all ElectIQ session cache
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('electiq_')) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));

      if (_auth) await firebaseSignOut(_auth);
      _currentUser = null;

      // Redirect to public landing page
      window.location.href = 'index.html';
    } catch (err) {
      // Force redirect even if signout fails
      window.location.href = 'index.html';
    }
  };

  // ─── Current User ─────────────────────────────────────────────────────────

  /**
   * Return the currently authenticated user, or null.
   * Prefer onAuthReady() for page-level checks.
   */
  const getCurrentUser = () => _currentUser || (_auth ? _auth.currentUser : null);

  /**
   * Get initials from a display name or email (for avatar fallback).
   * e.g. "Priya Sharma" → "PS", "priya@..." → "P"
   */
  const getUserInitials = (user) => {
    if (!user) return '?';
    if (user.displayName) {
      const parts = user.displayName.trim().split(/\s+/);
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    return (user.email || '?')[0].toUpperCase();
  };

  return {
    initAuth,
    onAuthReady,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resendVerificationEmail,
    signOut,
    getCurrentUser,
    getUserInitials
  };
})();

window.AuthService = AuthService;
