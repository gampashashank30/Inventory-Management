/**
 * Firebase Real-Time Configuration Template
 *
 * Instructions:
 * 1. Duplicate this file and name it `firebase-config.js`
 * 2. Replace the placeholder values with your actual Firebase project settings
 * 3. Never commit `firebase-config.js` to version control
 */
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_FIREBASE_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

if (typeof window !== 'undefined') {
  window.FIREBASE_CONFIG = FIREBASE_CONFIG;
  window.FIREBASE_DB_URL = FIREBASE_CONFIG.databaseURL;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIREBASE_CONFIG };
}
