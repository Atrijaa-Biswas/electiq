/**
 * config.example.js — Copy to js/config.js and fill in real values.
 * config.js is .gitignored — never commit real keys.
 *
 * Gemini API key: https://aistudio.google.com/app/apikey
 * Firebase config: Firebase Console → Project Settings → Web App
 */

window.ELECTIQ_CONFIG = {
  geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE',
  ga4MeasurementId: 'YOUR_GA4_MEASUREMENT_ID',
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
    measurementId: 'YOUR_GA4_MEASUREMENT_ID'
  }
};
