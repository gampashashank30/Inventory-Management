/**
 * cleanTestData.js
 * Removes all Playwright-injected test items from Firebase RTDB
 * Run: node cleanTestData.js
 */
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set } = require('firebase/database');

let FIREBASE_CONFIG;
try {
  FIREBASE_CONFIG = require('./firebase-config.js').FIREBASE_CONFIG;
} catch (e) {
  FIREBASE_CONFIG = {
    apiKey:            process.env.FIREBASE_API_KEY || "",
    authDomain:        process.env.FIREBASE_AUTH_DOMAIN || "ggmaad-inventory-management.firebaseapp.com",
    databaseURL:       process.env.FIREBASE_DATABASE_URL || "https://ggmaad-inventory-management-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         process.env.FIREBASE_PROJECT_ID || "ggmaad-inventory-management",
    storageBucket:     process.env.FIREBASE_STORAGE_BUCKET || "ggmaad-inventory-management.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1087958945040",
    appId:             process.env.FIREBASE_APP_ID || "1:1087958945040:web:d8d5468aace354d2e22995"
  };
}

const app = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(app);

const TEST_ID_PATTERNS = [
  /^bench-/i,
  /^stress-sku-/i,
  /^top10-perf-/i,
];

const TEST_SKU_PATTERNS = [
  /^BENCH-/i,
  /^STRESS-/i,
  /^TOP10-/i,
  /^FEATHER-S3-/i,
  /^XSS-/i,
  /^AUD-/i,
  /^INT-TEST/i,
];

const TEST_NAME_SUBSTRINGS = [
  'zero stock sample item',
  'negative test item',
  'negative part test',
  'duplicate sku item',
  'invalid stock part',
  'esp32-s3 feather pro',
  'audit test sensor esp32-c3',
  'top10 core node',
  'top10 core persistence node',
  'fast switching diode 1n4148',
  'industrial component test sku',
  'stress test diode',
  'top10 persistence part',
  'negative part test',
  'invalid stock part',
  'zero stock sample',
];

function isTestItem(item) {
  const id = (item.id || '').toLowerCase();
  const sku = (item.sku || '');
  const name = (item.name || '').toLowerCase();

  if (TEST_ID_PATTERNS.some(r => r.test(id))) return true;
  if (TEST_SKU_PATTERNS.some(r => r.test(sku))) return true;
  if (TEST_NAME_SUBSTRINGS.some(n => name.includes(n))) return true;
  return false;
}

async function cleanTestData() {
  console.log('🔍 Fetching data from Firebase...');
  const rootRef = ref(db, '/');
  const snapshot = await get(rootRef);
  
  if (!snapshot.exists()) {
    console.log('❌ No data found in Firebase.');
    process.exit(0);
  }

  const data = snapshot.val();
  
  // Clean inventory
  let before = 0, after = 0;
  if (data.inventory) {
    const entries = Object.entries(data.inventory);
    before = entries.length;
    const cleaned = {};
    for (const [key, item] of entries) {
      if (!isTestItem(item)) {
        cleaned[key] = item;
      }
    }
    after = Object.keys(cleaned).length;
    data.inventory = cleaned;
  }
  
  // Clean stockHistory — remove entries with test SKUs
  if (data.stockHistory) {
    const histEntries = Array.isArray(data.stockHistory) 
      ? data.stockHistory 
      : Object.values(data.stockHistory);
    
    const cleanedHistory = histEntries.filter(h => {
      const sku = (h.sku || '');
      const name = (h.componentName || '').toLowerCase();
      if (TEST_SKU_PATTERNS.some(r => r.test(sku))) return false;
      if (TEST_NAME_SUBSTRINGS.some(n => name.includes(n))) return false;
      return true;
    }).map((h, i) => ({ ...h, sNo: i + 1 }));
    
    data.stockHistory = cleanedHistory;
    console.log(`📜 History: cleaned from ${histEntries.length} to ${cleanedHistory.length} records`);
  }

  console.log(`🗑️  Inventory: removed ${before - after} test items (${before} → ${after})`);
  
  // Write cleaned data back
  console.log('💾 Writing cleaned data to Firebase...');
  await set(rootRef, data);
  console.log(`✅ Done! Firebase is clean. ${after} real components remain.`);
  process.exit(0);
}

cleanTestData().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
