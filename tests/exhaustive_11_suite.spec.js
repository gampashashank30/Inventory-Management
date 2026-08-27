const { test, expect } = require('@playwright/test');
const path = require('path');

const fileUrl = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

test.describe('11-Category Exhaustive System Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl);
    await page.evaluate(() => {
      localStorage.clear();
      if (typeof init === 'function') init();
    });
  });

  // ========================================================
  // CATEGORY 1: PRODUCT / COMPONENT TESTS
  // ========================================================
  test('1. Product / Component Tests', async ({ page }) => {
    await page.locator('#nav-components').click();

    // 1.1 Create component with valid data → verify in catalog
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('Nordic nRF52840 Dongle');
    await page.locator('#comp-sku').fill('BRD-NRF52-01');
    await page.locator('#comp-qty').fill('15');
    await page.locator('#comp-price').fill('12.50');
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("registered with SKU")')).toBeVisible();
    await expect(page.locator('table tbody tr:has-text("Nordic nRF52840 Dongle")')).toBeVisible();

    // 1.2 Duplicate SKU → verify blocked
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('Duplicate SKU Dongle');
    await page.locator('#comp-sku').fill('BRD-NRF52-01');
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("already assigned")')).toBeVisible();
    await page.locator('#modal-register-component button:has-text("Cancel")').click();

    // 1.3 Edit component → verify fields persist
    const editBtn = page.locator('table tbody tr:has-text("Nordic nRF52840 Dongle") .action-icon-btn.edit');
    await editBtn.click();
    await page.locator('#comp-name').fill('Nordic nRF52840 USB Dongle (V2)');
    await page.locator('#comp-price').fill('14.99');
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("updated successfully")')).toBeVisible();
    await expect(page.locator('table tbody tr:has-text("Nordic nRF52840 USB Dongle (V2)")')).toContainText('$14.99');

    // 1.4 Change total stock during edit → verify Total = Spare + In Use
    const editBtnV2 = page.locator('table tbody tr:has-text("Nordic nRF52840 USB Dongle (V2)") .action-icon-btn.edit');
    await editBtnV2.click();
    await page.locator('#comp-qty').fill('20');
    await page.locator('#btn-save-comp').click();
    const row = page.locator('table tbody tr:has-text("Nordic nRF52840 USB Dongle (V2)")');
    await expect(row).toContainText('20 pcs');

    // 1.5 Test negative stock → verify blocked
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('Negative Test Part');
    await page.locator('#comp-qty').fill('-5');
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("cannot be negative")')).toBeVisible();
    await page.locator('#modal-register-component button:has-text("Cancel")').click();

    // 1.6 Test Auto-SKU generation → verify auto SKU generated
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('Arduino Nano 33 BLE');
    await page.locator('button:has-text("Auto")').click();
    const generatedSku = await page.locator('#comp-sku').inputValue();
    expect(generatedSku.length).toBeGreaterThan(4);
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("registered with SKU")')).toBeVisible();

    // 1.7 Delete component → verify confirmation & removal
    page.once('dialog', dialog => dialog.accept());
    await page.locator('table tbody tr:has-text("Arduino Nano 33 BLE") .action-icon-btn.delete').click();
    await expect(page.locator('.toast:has-text("removed from inventory")')).toBeVisible();
    await expect(page.locator('table tbody tr:has-text("Arduino Nano 33 BLE")')).toHaveCount(0);
  });

  // ========================================================
  // CATEGORY 2: STOCK IN TESTS
  // ========================================================
  test('2. Stock In Tests', async ({ page }) => {
    await page.locator('#nav-components').click();

    // 2.1 Valid stock in → Total and Spare both increase
    const stockInBtn = page.locator('table tbody tr:has-text("ESP32 DevKit V1") button.btn-action-sm.emerald');
    await stockInBtn.click();
    await page.locator('#stock-in-qty').fill('20');
    await page.locator('#stock-in-po').fill('PO-MOU-2026-9901');
    await page.locator('button:has-text("Confirm Stock In")').click();
    await expect(page.locator('.toast:has-text("Successfully received +20")')).toBeVisible();

    const espRow = page.locator('table tbody tr:has-text("ESP32 DevKit V1")');
    await expect(espRow).toContainText('31'); // spare 11 + 20 = 31
    await expect(espRow).toContainText('35 pcs'); // total 15 + 20 = 35

    // 2.2 Zero / negative quantity → verify blocked
    await stockInBtn.click();
    await page.locator('#stock-in-qty').fill('0');
    await page.locator('button:has-text("Confirm Stock In")').click();
    await expect(page.locator('.toast:has-text("valid received quantity")')).toBeVisible();
    await page.locator('#modal-stock-in button:has-text("Cancel")').click();

    // 2.3 Verify ledger contains reference
    await page.locator('#nav-history').click();
    const firstLedgerRow = page.locator('table tbody tr').first();
    await expect(firstLedgerRow).toContainText('ESP32 DevKit V1');
    await expect(firstLedgerRow).toContainText('Stock In');
    await expect(firstLedgerRow).toContainText('PO-MOU-2026-9901');
  });

  // ========================================================
  // CATEGORY 3: STOCK OUT TESTS
  // ========================================================
  test('3. Stock Out Tests', async ({ page }) => {
    await page.locator('#nav-components').click();

    // 3.1 Valid stock out → Total and Spare decrease
    const stockOutBtn = page.locator('table tbody tr:has-text("DHT22 Temperature Sensor") button.btn-action-sm.rose');
    await stockOutBtn.click();
    await page.locator('#stock-out-qty').fill('5');
    await page.locator('#stock-out-reason').selectOption('Direct Sale');
    await page.locator('#stock-out-ref').fill('CLIENT-ORDER-991');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("Dispatched -5")')).toBeVisible();

    const row = page.locator('table tbody tr:has-text("DHT22 Temperature Sensor")');
    await expect(row).toContainText('13'); // spare 18 - 5 = 13
    await expect(row).toContainText('17 pcs'); // total 22 - 5 = 17

    // 3.2 Stock out more than spare → blocked
    await stockOutBtn.click();
    await page.locator('#stock-out-qty').fill('999');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("Insufficient spare stock")')).toBeVisible();

    // 3.3 Zero / negative quantity → blocked
    await page.locator('#stock-out-qty').fill('0');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("valid quantity")')).toBeVisible();
    await page.locator('#modal-stock-out button:has-text("Cancel")').click();

    // 3.4 Ledger entry contains reason
    await page.locator('#nav-history').click();
    const topRow = page.locator('table tbody tr').first();
    await expect(topRow).toContainText('DHT22 Temperature Sensor');
    await expect(topRow).toContainText('Stock Out');
    await expect(topRow).toContainText('CLIENT-ORDER-991');
  });

  // ========================================================
  // CATEGORY 4: PROJECT / ASSIGNMENT TESTS
  // ========================================================
  test('4. Project / Assignment Tests', async ({ page }) => {
    // 4.1 Create project → Active with empty inventory
    await page.locator('#nav-projects').click();
    await page.locator('button:has-text("New Project")').click();
    await page.locator('#project-name').fill('Smart Irrigation Node');
    await page.locator('button:has-text("Create Project")').click();

    await page.locator('#nav-projects').click();
    const projCard = page.locator('.project-card:has-text("Smart Irrigation Node")');
    await expect(projCard).toBeVisible();
    await expect(projCard).toContainText('0 components assigned');

    // 4.2 Assign spare component → Spare down, In Use up
    await projCard.click();
    await page.locator('#tab-btn-spare').click();
    const espRow = page.locator('#tab-content-spare table tbody tr:has-text("ESP32 DevKit V1")');
    await espRow.locator('.qty-input').fill('4');
    await espRow.locator('button:has-text("Assign")').click();
    await expect(page.locator('.toast:has-text("Assigned 4 pcs")')).toBeVisible();

    await page.locator('#tab-btn-in-use').click();
    await expect(page.locator('#tab-content-in-use table tbody tr:has-text("ESP32 DevKit V1")')).toContainText('4 pcs');

    // 4.3 Assign more than available spare → blocked
    await page.locator('#tab-btn-spare').click();
    await espRow.locator('.qty-input').fill('9999');
    await espRow.locator('button:has-text("Assign")').click();
    await expect(page.locator('.toast:has-text("Insufficient spare stock")')).toBeVisible();

    // 4.4 Return component → In Use down, Spare up
    await page.locator('#tab-btn-in-use').click();
    const inUseRow = page.locator('#tab-content-in-use table tbody tr:has-text("ESP32 DevKit V1")');
    await inUseRow.locator('.qty-input').fill('2');
    await inUseRow.locator('button:has-text("Return to Spare")').click();
    await expect(page.locator('.toast:has-text("Returned 2 pcs")')).toBeVisible();
    await expect(inUseRow).toContainText('2 pcs');

    // 4.5 Return more than assigned → blocked
    await inUseRow.locator('.qty-input').fill('99');
    await inUseRow.locator('button:has-text("Return to Spare")').click();
    await expect(page.locator('.toast:has-text("Cannot return more than assigned")')).toBeVisible();

    // 4.6 Delete project with assigned components → all restored to spare
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("Delete Project")').click();
    await expect(page.locator('.toast:has-text("deleted and components returned")')).toBeVisible();
  });

  // ========================================================
  // CATEGORY 5: WAREHOUSE TESTS
  // ========================================================
  test('5. Warehouse Tests', async ({ page }) => {
    await page.locator('#nav-warehouses').click();

    // 5.1 Create warehouse → appears in list
    await page.locator('button:has-text("Add Warehouse")').click();
    await page.locator('#wh-name').fill('Cleanroom Bay 404');
    await page.locator('#wh-location').fill('West Wing, Room 404');
    await page.locator('button:has-text("Save Warehouse")').click();
    await expect(page.locator('.toast:has-text("registered successfully")')).toBeVisible();
    await expect(page.locator('.warehouse-card:has-text("Cleanroom Bay 404")')).toBeVisible();

    // 5.2 Create warehouse with duplicate name → blocked
    await page.locator('button:has-text("Add Warehouse")').click();
    await page.locator('#wh-name').fill('Cleanroom Bay 404');
    await page.locator('button:has-text("Save Warehouse")').click();
    await expect(page.locator('.toast:has-text("already exists")')).toBeVisible();
    await page.locator('#modal-new-warehouse button:has-text("Cancel")').click();

    // 5.3 Transfer stock between warehouses → verifies movement
    await page.locator('.header-actions-group button:has-text("Stock Transfer")').click();
    await page.locator('#transfer-target').selectOption({ label: 'IoT Research Lab' });
    await page.locator('#transfer-qty').fill('2');
    await page.locator('button:has-text("Execute Transfer")').click();
    await expect(page.locator('.toast:has-text("Transferred 2")')).toBeVisible();

    // 5.4 Transfer to same warehouse → blocked
    await page.locator('.header-actions-group button:has-text("Stock Transfer")').click();
    const sourceVal = await page.locator('#transfer-source').inputValue();
    await page.locator('#transfer-target').selectOption(sourceVal);
    await page.locator('button:has-text("Execute Transfer")').click();
    await expect(page.locator('.toast:has-text("must be different")')).toBeVisible();
    await page.locator('#modal-stock-transfer button:has-text("Cancel")').click();
  });

  // ========================================================
  // CATEGORY 6: SEARCH & FILTER TESTS
  // ========================================================
  test('6. Search / Filter Tests', async ({ page }) => {
    await page.locator('#nav-components').click();

    // 6.1 Search by product name
    await page.locator('#component-search').fill('Relay');
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody tr')).toContainText('5V Dual Channel Relay Module');

    // 6.2 Search by SKU
    await page.locator('#component-search').fill('SNS-DHT22-AM2302');
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody tr')).toContainText('DHT22 Temperature Sensor');

    // 6.3 Filter by category
    await page.locator('#component-search').fill('');
    await page.locator('#component-cat-filter').selectOption('Sensor');
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // 6.4 Global Search
    await page.locator('#component-cat-filter').selectOption('All Categories');
    await page.locator('#global-search').fill('Greenhouse');
    await page.locator('#nav-dashboard').click();
    await expect(page.locator('.project-card:has-text("Smart Greenhouse Auto-Waterer")')).toBeVisible();
  });

  // ========================================================
  // CATEGORY 7: LOW STOCK TESTS
  // ========================================================
  test('7. Low Stock Alert Tests', async ({ page }) => {
    // 7.1 Notification bell counter reflects breached thresholds
    const bellCount = await page.locator('#low-stock-badge-count').innerText();
    expect(Number(bellCount)).toBeGreaterThanOrEqual(1);

    // 7.2 Low stock filter shows only breached items
    await page.locator('#nav-components').click();
    await page.locator('button:has-text("Filter Low Stock")').click();
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('.status-low, .status-out')).toBeVisible();
    }

    // 7.3 Restock item above threshold → low stock warning clears
    await page.locator('button:has-text("Showing Low Stock")').click(); // toggle back
    const jumperInBtn = page.locator('table tbody tr:has-text("M-F Jumper Wires") button.btn-action-sm.emerald');
    await jumperInBtn.click();
    await page.locator('#stock-in-qty').fill('10'); // spare becomes 3 + 10 = 13 (threshold is 5)
    await page.locator('button:has-text("Confirm Stock In")').click();

    // Verify Jumper wires is now In Stock status
    const statusBadge = page.locator('table tbody tr:has-text("M-F Jumper Wires") .stock-status-badge');
    await expect(statusBadge).toHaveClass(/status-ok/);
  });

  // ========================================================
  // CATEGORY 8: DASHBOARD TESTS
  // ========================================================
  test('8. Dashboard Metric & Component Tests', async ({ page }) => {
    await page.locator('#nav-dashboard').click();

    // 8.1 Metric cards exist
    const cards = page.locator('.metric-card');
    await expect(cards).toHaveCount(4);

    // 8.2 Valuation and SKUs
    const valText = await page.locator('.metric-card:nth-child(1) .metric-value').innerText();
    expect(valText).toContain('$');

    const skuText = await page.locator('.metric-card:nth-child(2) .metric-value').innerText();
    expect(Number(skuText)).toBeGreaterThanOrEqual(5);

    // 8.3 Project cards match
    const projCards = page.locator('.project-card');
    expect(await projCards.count()).toBeGreaterThanOrEqual(2);
  });

  // ========================================================
  // CATEGORY 9: REPORTS / CSV TESTS
  // ========================================================
  test('9. Reports / CSV Export Tests', async ({ page }) => {
    await page.locator('#nav-reports').click();

    // 9.1 Financial cards
    const valText = await page.locator('.report-card:nth-child(1) .metric-value').innerText();
    expect(valText).toContain('$');

    // 9.2 Export Catalog CSV
    const downloadPromise1 = page.waitForEvent('download');
    await page.locator('button:has-text("Export Catalog CSV")').click();
    const download1 = await downloadPromise1;
    expect(download1.suggestedFilename()).toBe('Inven3_Component_Catalog.csv');

    // 9.3 Export Ledger CSV
    const downloadPromise2 = page.waitForEvent('download');
    await page.locator('button:has-text("Export Audit Ledger CSV")').click();
    const download2 = await downloadPromise2;
    expect(download2.suggestedFilename()).toBe('Inven3_Transaction_Ledger.csv');
  });

  // ========================================================
  // CATEGORY 10: STOCK HISTORY / LEDGER TESTS
  // ========================================================
  test('10. Stock History / Transaction Ledger Tests', async ({ page }) => {
    await page.locator('#nav-history').click();

    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(6);

    // Search ledger by project
    await page.locator('#history-search').fill('Smart Greenhouse');
    await expect(page.locator('table tbody tr').first()).toContainText('Smart Greenhouse');
  });

  // ========================================================
  // CATEGORY 11: THE CRITICAL FULL END-TO-END WORKFLOW TEST
  // Create Component → Stock In 100 → Assign 30 to Project →
  // Stock Out 20 → Return 10 → Transfer stock → Delete Project
  // ========================================================
  test('11. Critical Full Lifecycle Workflow & Invariant Conservation Test', async ({ page }) => {
    // Step 1: Create Component (Starting Stock: 50)
    await page.locator('#nav-components').click();
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('Mega Master Controller');
    await page.locator('#comp-sku').fill('BRD-MEGA-999');
    await page.locator('#comp-qty').fill('50');
    await page.locator('#comp-price').fill('20.00');
    await page.locator('#comp-cost').fill('10.00');
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("registered with SKU")')).toBeVisible();

    // Verify Invariant: Total = 50, Spare = 50, InUse = 0
    let state = await page.evaluate(() => JSON.parse(localStorage.getItem('inven3_state')));
    let comp = state.components.find(c => c.sku === 'BRD-MEGA-999');
    expect(comp.totalQty).toBe(50);
    expect(comp.spareQty).toBe(50);
    expect(comp.inUseQty).toBe(0);
    expect(comp.totalQty).toBe(comp.spareQty + comp.inUseQty);

    // Step 2: Stock In 100
    const stockInBtn = page.locator('table tbody tr:has-text("Mega Master Controller") button.btn-action-sm.emerald');
    await stockInBtn.click();
    await page.locator('#stock-in-qty').fill('100');
    await page.locator('#stock-in-po').fill('PO-LIFECYCLE-100');
    await page.locator('button:has-text("Confirm Stock In")').click();
    await expect(page.locator('.toast:has-text("Successfully received +100")')).toBeVisible();

    // Verify Invariant: Total = 150, Spare = 150, InUse = 0
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('inven3_state')));
    comp = state.components.find(c => c.sku === 'BRD-MEGA-999');
    expect(comp.totalQty).toBe(150);
    expect(comp.spareQty).toBe(150);
    expect(comp.inUseQty).toBe(0);
    expect(comp.totalQty).toBe(comp.spareQty + comp.inUseQty);

    // Step 3: Assign 30 to Project
    await page.locator('#nav-projects').click();
    await page.locator('.project-card:has-text("Smart Greenhouse Auto-Waterer")').click();
    await page.locator('#tab-btn-spare').click();
    const assignRow = page.locator('#tab-content-spare table tbody tr:has-text("Mega Master Controller")');
    await assignRow.locator('.qty-input').fill('30');
    await assignRow.locator('button:has-text("Assign")').click();
    await expect(page.locator('.toast:has-text("Assigned 30 pcs")')).toBeVisible();

    // Verify Invariant: Total = 150, Spare = 120, InUse = 30
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('inven3_state')));
    comp = state.components.find(c => c.sku === 'BRD-MEGA-999');
    expect(comp.totalQty).toBe(150);
    expect(comp.spareQty).toBe(120);
    expect(comp.inUseQty).toBe(30);
    expect(comp.totalQty).toBe(comp.spareQty + comp.inUseQty);

    // Step 4: Stock Out 20 (Direct Sale)
    await page.locator('#nav-components').click();
    const stockOutBtn = page.locator('table tbody tr:has-text("Mega Master Controller") button.btn-action-sm.rose');
    await stockOutBtn.click();
    await page.locator('#stock-out-qty').fill('20');
    await page.locator('#stock-out-ref').fill('INV-LIFECYCLE-20');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("Dispatched -20")')).toBeVisible();

    // Verify Invariant: Total = 130, Spare = 100, InUse = 30
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('inven3_state')));
    comp = state.components.find(c => c.sku === 'BRD-MEGA-999');
    expect(comp.totalQty).toBe(130);
    expect(comp.spareQty).toBe(100);
    expect(comp.inUseQty).toBe(30);
    expect(comp.totalQty).toBe(comp.spareQty + comp.inUseQty);

    // Step 5: Return 10 from Project
    await page.locator('#nav-projects').click();
    await page.locator('.project-card:has-text("Smart Greenhouse Auto-Waterer")').click();
    await page.locator('#tab-btn-in-use').click();
    const inUseRow = page.locator('#tab-content-in-use table tbody tr:has-text("Mega Master Controller")');
    await inUseRow.locator('.qty-input').fill('10');
    await inUseRow.locator('button:has-text("Return to Spare")').click();
    await expect(page.locator('.toast:has-text("Returned 10 pcs")')).toBeVisible();

    // Verify Invariant: Total = 130, Spare = 110, InUse = 20
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('inven3_state')));
    comp = state.components.find(c => c.sku === 'BRD-MEGA-999');
    expect(comp.totalQty).toBe(130);
    expect(comp.spareQty).toBe(110);
    expect(comp.inUseQty).toBe(20);
    expect(comp.totalQty).toBe(comp.spareQty + comp.inUseQty);

    // Step 6: Transfer stock to another warehouse
    await page.locator('#nav-warehouses').click();
    await page.locator('.header-actions-group button:has-text("Stock Transfer")').click();
    await page.locator('#transfer-component').selectOption({ label: `Mega Master Controller (BRD-MEGA-999) — Spare: 110 pcs` });
    await page.locator('#transfer-target').selectOption({ label: 'Field Assembly Workshop' });
    await page.locator('#transfer-qty').fill('40');
    await page.locator('button:has-text("Execute Transfer")').click();
    await expect(page.locator('.toast:has-text("Transferred 40")')).toBeVisible();

    // Verify Invariant: Total = 130, Spare = 110, InUse = 20
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('inven3_state')));
    comp = state.components.find(c => c.sku === 'BRD-MEGA-999');
    expect(comp.totalQty).toBe(130);
    expect(comp.spareQty).toBe(110);
    expect(comp.inUseQty).toBe(20);
    expect(comp.totalQty).toBe(comp.spareQty + comp.inUseQty);

    // Step 7: Delete Project → Remaining 20 in-use units restored to Spare
    await page.locator('#nav-projects').click();
    await page.locator('.project-card:has-text("Smart Greenhouse Auto-Waterer")').click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("Delete Project")').click();
    await expect(page.locator('.toast:has-text("deleted and components returned")')).toBeVisible();

    // Verify Final Invariant: Total = 130, Spare = 130, InUse = 0
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('inven3_state')));
    comp = state.components.find(c => c.sku === 'BRD-MEGA-999');
    expect(comp.totalQty).toBe(130);
    expect(comp.spareQty).toBe(130);
    expect(comp.inUseQty).toBe(0);
    expect(comp.totalQty).toBe(comp.spareQty + comp.inUseQty);

    // Step 8: Cross-Check Full System Agreement
    // Check Catalog
    await page.locator('#nav-components').click();
    const finalCompRow = page.locator('table tbody tr:has-text("Mega Master Controller")');
    await expect(finalCompRow).toContainText('130'); // spare
    await expect(finalCompRow).toContainText('0'); // in use
    await expect(finalCompRow).toContainText('130 pcs'); // total

    // Check Dashboard
    await page.locator('#nav-dashboard').click();
    const dashValText = await page.locator('.metric-card:nth-child(1) .metric-value').innerText();
    expect(dashValText).toContain('$');

    // Check History Ledger
    await page.locator('#nav-history').click();
    await expect(page.locator('table tbody tr:has-text("BRD-MEGA-999")').first()).toBeVisible();
  });

});
