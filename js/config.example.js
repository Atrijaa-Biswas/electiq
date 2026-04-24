/**
 * config.example.js — Copy to js/config.js and fill in real values.
 * config.js is .gitignored — never commit real credentials.
 *
 * Gemini API key:  https://aistudio.google.com/app/apikey
 * Firebase config: Firebase Console → Project Settings → Web App config
 *
 * Required Firebase services to enable:
 *   → Authentication → Sign-in method → Google (enable)
 *   → Authentication → Sign-in method → Email/Password (enable)
 *   → Firestore Database (production mode)
 *   → Hosting (for deployment)
 *
 * Firestore Security Rules (Firebase Console → Firestore → Rules):
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /users/{userId}/{document=**} {
 *         allow read, write: if request.auth != null
 *                            && request.auth.uid == userId;
 *       }
 *     }
 *   }
 */

window.ELECTIQ_CONFIG = {
  geminiApiKey:    'YOUR_GEMINI_API_KEY_HERE',
  ga4MeasurementId: 'YOUR_GA4_MEASUREMENT_ID',
  firebase: {
    apiKey:            'YOUR_FIREBASE_API_KEY',
    authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
    projectId:         'YOUR_PROJECT_ID',
    storageBucket:     'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId:             'YOUR_APP_ID',
    measurementId:     'YOUR_GA4_MEASUREMENT_ID'
  }
};
