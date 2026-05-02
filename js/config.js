/*
 * This file contains sensitive credentials. DO NOT COMMIT to version control.
 * Copy from config.example.js and fill in your own API keys.
 *
 * Obtain credentials from:
 * - Groq API key: https://console.groq.com/keys
 * - Firebase Config: Firebase Console → Project Settings → Web App config
 * - GA4 Measurement ID: Google Analytics → Admin → Property Settings
 */

window.ELECTIQ_CONFIG = {
  groqApiKey: window.ENV?.GROQ_API_KEY || "",

  firebase: {
    apiKey: "AIzaSyBQNYAnv0iDgS7xqecoiEf5FjO37EZpr7Y",
    authDomain: "electiq-29135.firebaseapp.com",
    projectId: "electiq-29135",
    storageBucket: "electiq-29135.firebasestorage.app",
    messagingSenderId: "89338881161",
    appId: "1:89338881161:web:53a0d9ebd44eb0b7099258",
    measurementId: "G-JZ0HHPFGL"
  }
};