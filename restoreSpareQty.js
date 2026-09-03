/**
 * restoreSpareQty.js
 * ════════════════════════════════════════════════════════════════
 * Restores spareQty for all components in Firebase that have been
 * zeroed out — typically caused by running assignComponentsToProjects.js
 * which sets spareQty=0 and inUseQty=totalQty for every component.
 *
 * This script resets all components back to:
 *   spareQty  = totalQty  (all stock is free/spare)
 *   inUseQty  = 0
 *
 * Projects retain their structure but usedComponents are cleared
 * so they don't hold stale assignments that conflict with the
 * restored spare quantities.
 *
 * HOW TO RUN:
 *   node restoreSpareQty.js
 * ════════════════════════════════════════════════════════════════
 */
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set } = require('firebase/database');

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCG5xzCaSJAvmWWFhVD2QYnP8SfyI-TVZM",
  authDomain:        "ggmaad-inventory-management.firebaseapp.com",
  databaseURL:       "https://ggmaad-inventory-management-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "ggmaad-inventory-management",
  storageBucket:     "ggmaad-inventory-management.firebasestorage.app",
  messagingSenderId: "1087958945040",
  appId:             "1:1087958945040:web:d8d5468aace354d2e22995"
};

const app = initializeApp(FIREBASE_CONFIG);
const db  = getDatabase(app);

async function restoreSpareQty() {
  console.log('🔍 Fetching inventory from Firebase...');
  const rootRef  = ref(db, '/');
  const snapshot = await get(rootRef);

  if (!snapshot.exists()) {
    console.log('❌ No data found in Firebase.');
    process.exit(1);
  }

  const data = snapshot.val();

  if (!data.inventory || typeof data.inventory !== 'object') {
    console.log('❌ No inventory node found.');
    process.exit(1);
  }

  const entries = Object.entries(data.inventory);
  console.log(`📦 Found ${entries.length} inventory items.`);

  let zeroed = 0;
  let restored = 0;

  for (const [key, item] of entries) {
    const total = Number(item.totalQty ?? item.totalQuantity ?? 0);
    const spare = Number(item.spareQty ?? item.remainingStock ?? 0);

    if (spare === 0 && total > 0) {
      zeroed++;
      // Restore: all stock is spare, none in-use
      data.inventory[key] = {
        ...item,
        totalQty:       total,
        totalQuantity:  total,
        spareQty:       total,
        remainingStock: total,
        inUseQty:       0,
      };
      restored++;
    }
  }

  // Also reset projects' usedComponents so they don't hold stale assignments
  if (data.projects) {
    const projects = Array.isArray(data.projects)
      ? data.projects
      : Object.values(data.projects).filter(Boolean);

    projects.forEach(p => {
      if (p) p.usedComponents = [];
    });

    data.projects = Array.isArray(data.projects)
      ? projects
      : Object.fromEntries(projects.filter(Boolean).map(p => [p.id, p]));

    console.log(`🗂️  Cleared usedComponents from ${projects.length} projects.`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Items with spareQty=0 found : ${zeroed}`);
  console.log(`   Items restored               : ${restored}`);
  console.log(`   Items already OK (spare > 0) : ${entries.length - zeroed}`);

  if (restored === 0) {
    console.log('\n✅ Nothing to restore — all items already have spare stock > 0.');
    process.exit(0);
  }

  console.log('\n💾 Writing restored data back to Firebase...');
  await set(rootRef, data);
  console.log(`✅ Done! ${restored} components restored to full spare quantity.`);
  console.log('   Reload the app in your browser to see the changes.');
  process.exit(0);
}

restoreSpareQty().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
