/**
 * ════════════════════════════════════════════════════════════════
 *  GG MAAD Inventory — Full Setup Script
 *  - Forces 6 projects into Firebase
 *  - Assigns the FULL totalQty of each component to a project
 *  - Distributes component types equally (e.g. 60 per project)
 *
 *  HOW TO RUN:
 *  1. Open http://localhost:3000 in browser
 *  2. Wait for "🟢 Live" sync status to appear
 *  3. Open DevTools → Console (F12)
 *  4. Paste this entire script and press Enter
 * ════════════════════════════════════════════════════════════════
 */
(function setupProjectsAndAssignComponents() {

  // ── Safety check ──────────────────────────────────────────────
  if (typeof state === 'undefined' || typeof saveState === 'undefined') {
    console.error('❌ App not ready. Wait for the page to fully load.');
    return;
  }

  const components = state.components || [];
  if (components.length === 0) {
    console.error('❌ No components in state. Wait for Firebase to sync and try again.');
    return;
  }

  console.log(`✅ Found ${components.length} components. Setting up 6 projects...`);

  // ── Step 1: Define the 6 projects (reset usedComponents to []) ─
  state.projects = [
    { id: 'proj-1', name: 'Green Guard',        description: 'Smart environmental monitoring system using ESP32 and DHT22 sensors to track air quality, temperature, and humidity across agricultural and urban green zones.',                                            status: 'Active', createdDate: '2026-05-10', usedComponents: [] },
    { id: 'proj-2', name: 'Gas Guard',           description: 'Industrial gas leak detection and real-time alert system with ESP32 edge nodes and sensor arrays for hazardous environment monitoring.',                                                                   status: 'Active', createdDate: '2026-05-22', usedComponents: [] },
    { id: 'proj-3', name: 'Aqua Sense',          description: 'Automated water quality and reservoir level sensing solution using ultrasonic sensors and DHT22 for smart irrigation and flood detection.',                                                               status: 'Active', createdDate: '2026-06-01', usedComponents: [] },
    { id: 'proj-4', name: 'Street Wise',         description: 'Intelligent street lighting automation with ESP32-controlled relay modules for adaptive brightness based on real-time ambient light and traffic density.',                                                status: 'Active', createdDate: '2026-06-15', usedComponents: [] },
    { id: 'proj-5', name: 'Pulse Connect',       description: 'Wearable IoT health monitoring system capturing vital signs with DHT22 thermal sensors and HC-SR04 pulse detection, streaming data to a central health dashboard.',                                      status: 'Active', createdDate: '2026-07-04', usedComponents: [] },
    { id: 'proj-6', name: 'Sehavi Enterprises',  description: 'Enterprise IoT deployment for smart factory floor automation using relay-controlled actuators and ESP32 edge compute nodes for production line monitoring and control.',                                   status: 'Active', createdDate: '2026-07-20', usedComponents: [] }
  ];

  const projects   = state.projects;
  const numProjects = projects.length;

  // ── Step 2: Reset ALL components → full spare, zero in-use ────
  components.forEach(c => {
    c.inUseQty = 0;
    c.spareQty = Number(c.totalQty) || 0;
  });

  // ── Step 3: Shuffle components randomly ───────────────────────
  const shuffled = [...components].sort(() => Math.random() - 0.5);

  // ── Step 4: Calculate how many component TYPES per project ────
  const perProject = Math.floor(shuffled.length / numProjects);
  const remainder  = shuffled.length % numProjects;

  console.log(`📦 ${shuffled.length} components ÷ ${numProjects} projects`);
  console.log(`   → ${perProject} component types per project (${remainder} leftover go to first ${remainder} projects)`);

  // ── Step 5: Assign FULL qty of each component to its project ──
  if (!Array.isArray(state.stockHistory)) state.stockHistory = [];

  projects.forEach((proj, pIdx) => {
    // Give extra 1 component to first `remainder` projects
    const extra = pIdx < remainder ? 1 : 0;
    const start = pIdx * perProject + Math.min(pIdx, remainder);
    const count = perProject + extra;
    const slice = shuffled.slice(start, start + count);

    let totalUnits = 0;

    slice.forEach(comp => {
      const qty = Number(comp.totalQty) || 0;
      if (qty <= 0) return;

      // Move ALL units to this project
      comp.inUseQty = qty;
      comp.spareQty = 0;

      proj.usedComponents.push({ componentId: comp.id, qty });
      totalUnits += qty;

      // Log to history
      const maxSNo = state.stockHistory.reduce((m, h) => Math.max(m, Number(h?.sNo) || 0), 0);
      const today  = new Date().toISOString().split('T')[0];
      state.stockHistory.push({
        sNo:           maxSNo + 1,
        date:          today,
        sku:           comp.sku           || '',
        componentName: comp.name          || 'Unknown',
        qty:           qty,
        action:        'Assigned to Project',
        reason:        'Bulk Equal Distribution (Full Qty)',
        projectName:   proj.name,
        warehouseName: getWarehouseName(comp.warehouseId)
      });
    });

    console.log(`✅ ${proj.name.padEnd(20)} → ${slice.length} SKUs / ${totalUnits} total units`);
  });

  // ── Step 6: Summary table ──────────────────────────────────────
  console.table(
    projects.map(p => ({
      'Project':     p.name,
      'SKUs':        p.usedComponents.length,
      'Total Units': p.usedComponents.reduce((s, uc) => s + (uc.qty || 0), 0)
    }))
  );

  // ── Step 7: Force save to Firebase ────────────────────────────
  saveState();
  render();
  triggerToast(`✅ ${shuffled.length} components (full qty each) distributed across ${numProjects} projects!`);
  console.log('🎉 Done! All data saved to Firebase.');

})();
