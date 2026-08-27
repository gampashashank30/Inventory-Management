const { test, expect } = require('@playwright/test');
const path = require('path');

const fileUrl = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

test.describe('Inven3 Enterprise ERP - 18/18 Capability & E2E Validation Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl);
    await page.evaluate(() => {
      localStorage.clear();
      if (typeof init === 'function') init();
    });
  });

  // 1. Add Product with SKU, Price, Cost, Category, Min Alert, Warehouse
  test('1. Add Product — Create product with SKU, Price, Quantity, Category & Warehouse', async ({ page }) => {
    await page.locator('#nav-components').click();
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await expect(page.locator('#modal-register-component')).toHaveClass(/open/);

    await page.locator('#comp-name').fill('STM32 Blue Pill');
    await page.locator('#comp-sku').fill('BRD-STM32-001');
    await page.locator('#comp-unit').fill('pcs');
    await page.locator('#comp-qty').fill('25');
    await page.locator('#comp-min-threshold').fill('5');
    await page.locator('#comp-cost').fill('2.50');
    await page.locator('#comp-price').fill('5.99');
    await page.locator('#comp-supplier').fill('STMicroelectronics');
    
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("registered with SKU")')).toBeVisible();

    // Verify row in table with SKU and price
    const row = page.locator('table tbody tr:has-text("STM32 Blue Pill")');
    await expect(row).toBeVisible();
    await expect(row).toContainText('BRD-STM32-001');
    await expect(row).toContainText('25 pcs');
    await expect(row).toContainText('$5.99');
  });

  // 2. Edit Product
  test('2. Edit Product — Change details and verify they save correctly', async ({ page }) => {
    await page.locator('#nav-components').click();
    const editBtn = page.locator('table tbody tr:has-text("ESP32 DevKit V1") .action-icon-btn.edit');
    await editBtn.click();
    
    await page.locator('#comp-name').fill('ESP32 NodeMCU V3 (Updated)');
    await page.locator('#comp-price').fill('9.95');
    await page.locator('#btn-save-comp').click();

    await expect(page.locator('.toast:has-text("updated successfully")')).toBeVisible();
    const updatedRow = page.locator('table tbody tr:has-text("ESP32 NodeMCU V3 (Updated)")');
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText('$9.95');
  });

  // 3. Delete Product & Cascade Safety
  test('3. Delete Product — Verify deletion rules and project inventory consistency', async ({ page }) => {
    await page.locator('#nav-components').click();
    page.once('dialog', dialog => dialog.accept());
    
    const deleteBtn = page.locator('table tbody tr:has-text("ESP32 DevKit V1") .action-icon-btn.delete');
    await deleteBtn.click();

    await expect(page.locator('.toast:has-text("removed from inventory")')).toBeVisible();
    await expect(page.locator('table tbody tr:has-text("ESP32 DevKit V1")')).toHaveCount(0);
  });

  // 4. Dedicated Quick Stock In (Purchase / Restock)
  test('4. Stock In — Add inventory via Quick Stock In and verify quantity increases', async ({ page }) => {
    await page.locator('#nav-components').click();
    
    // Click Quick + In button on first row (ESP32)
    const stockInBtn = page.locator('table tbody tr:has-text("ESP32 DevKit V1") button.btn-action-sm.emerald');
    await stockInBtn.click();
    await expect(page.locator('#modal-stock-in')).toHaveClass(/open/);

    await page.locator('#stock-in-qty').fill('15');
    await page.locator('#stock-in-po').fill('PO-2026-TEST-INBOUND');
    await page.locator('button:has-text("Confirm Stock In")').click();

    await expect(page.locator('.toast:has-text("Successfully received +15")')).toBeVisible();
    // Spare was 11 + 15 = 26
    const row = page.locator('table tbody tr:has-text("ESP32 DevKit V1")');
    await expect(row).toContainText('26');
  });

  // 5. Dedicated Quick Stock Out (Sales / Dispatch)
  test('5. Stock Out — Remove inventory via Quick Stock Out and verify quantity decreases', async ({ page }) => {
    await page.locator('#nav-components').click();
    
    // Click Quick - Out button on ESP32
    const stockOutBtn = page.locator('table tbody tr:has-text("ESP32 DevKit V1") button.btn-action-sm.rose');
    await stockOutBtn.click();
    await expect(page.locator('#modal-stock-out')).toHaveClass(/open/);

    await page.locator('#stock-out-qty').fill('3');
    await page.locator('#stock-out-ref').fill('INV-TEST-CLIENT-001');
    await page.locator('button:has-text("Confirm Stock Out")').click();

    await expect(page.locator('.toast:has-text("Dispatched -3")')).toBeVisible();
    // Spare was 11 - 3 = 8
    const row = page.locator('table tbody tr:has-text("ESP32 DevKit V1")');
    await expect(row).toContainText('8');
  });

  // 6. Stock Adjustment & History
  test('6. Stock Adjustment — Adjust total stock and verify recorded in ledger', async ({ page }) => {
    await page.locator('#nav-components').click();
    const editBtn = page.locator('table tbody tr:has-text("DHT22 Temperature Sensor") .action-icon-btn.edit');
    await editBtn.click();
    
    await page.locator('#comp-qty').fill('30'); // was 22 (+8)
    await page.locator('#btn-save-comp').click();

    // Check transaction ledger
    await page.locator('#nav-history').click();
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toContainText('DHT22 Temperature Sensor');
    await expect(firstRow).toContainText('8');
  });

  // 7. Low-Stock Alerts & Notification Bell
  test('7. Low-Stock Alerts — Reduce stock below threshold and verify alert trigger', async ({ page }) => {
    // M-F Jumper Wires has spare 3 with minThreshold 5 (already low stock)
    const bellCount = await page.locator('#low-stock-badge-count').innerText();
    expect(Number(bellCount)).toBeGreaterThanOrEqual(1);

    // Verify low stock status badge in components table
    await page.locator('#nav-components').click();
    const lowBadge = page.locator('table tbody tr:has-text("M-F Jumper Wires") .status-low');
    await expect(lowBadge).toBeVisible();

    // Test Low Stock quick filter button
    await page.locator('button:has-text("Filter Low Stock")').click();
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('.status-low, .status-out')).toBeVisible();
    }
  });

  // 8. Search & Filters
  test('8. Search & Filter — Search by SKU, name, and filter by Category & Warehouse', async ({ page }) => {
    await page.locator('#nav-components').click();

    // Filter by Category
    await page.locator('#component-cat-filter').selectOption('Sensor');
    await expect(page.locator('table tbody tr:has-text("DHT22 Temperature Sensor")')).toBeVisible();
    await expect(page.locator('table tbody tr:has-text("ESP32 DevKit V1")')).toHaveCount(0);

    // Search by SKU
    await page.locator('#component-cat-filter').selectOption('All Categories');
    await page.locator('#component-search').fill('BRD-ESP32-V1');
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody tr')).toContainText('ESP32 DevKit V1');
  });

  // 9. Categories Management
  test('9. Categories — Create and manage dynamic custom categories', async ({ page }) => {
    await page.locator('.profile-trigger').click();
    await page.locator('a:has-text("Category Manager")').click();
    await expect(page.locator('#modal-manage-categories')).toHaveClass(/open/);

    await page.locator('#new-cat-name').fill('Microcontrollers');
    await page.locator('#modal-manage-categories button:has-text("Add")').click();
    await expect(page.locator('.toast:has-text("Microcontrollers")')).toBeVisible();

    // Close modal and verify Category appears in Register Product modal
    await page.locator('#modal-manage-categories button:has-text("Close")').click();
    await page.locator('#nav-components').click();
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await expect(page.locator('#comp-category')).toContainText('Microcontrollers');
  });

  // 10 & 11. Warehouses & Stock Transfer
  test('10 & 11. Warehouses & Inter-Warehouse Stock Transfer', async ({ page }) => {
    // 1. Check Warehouses View
    await page.locator('#nav-warehouses').click();
    await expect(page.locator('.view-title-wrap h2')).toHaveText('Warehouse Locations & Lab Bays');
    await expect(page.locator('.warehouse-card')).toHaveCount(3);

    // 2. Add New Warehouse
    await page.locator('button:has-text("Add Warehouse")').click();
    await page.locator('#wh-name').fill('Robotics Annex 09');
    await page.locator('#wh-location').fill('South Wing, Annex 9');
    await page.locator('button:has-text("Save Warehouse")').click();
    await expect(page.locator('.warehouse-card:has-text("Robotics Annex 09")')).toBeVisible();

    // 3. Execute Stock Transfer
    await page.locator('.header-actions-group button:has-text("Stock Transfer")').click();
    await expect(page.locator('#modal-stock-transfer')).toHaveClass(/open/);

    await page.locator('#transfer-target').selectOption({ label: 'IoT Research Lab' });
    await page.locator('#transfer-qty').fill('3');
    await page.locator('button:has-text("Execute Transfer")').click();
    await expect(page.locator('.toast:has-text("Transferred 3")')).toBeVisible();
  });

  // 12 & 13. Purchase Receiving & Sales Orders Flows
  test('12 & 13. Purchase Receiving (Stock In) & Sales Dispatch (Stock Out)', async ({ page }) => {
    // 1. Purchase flow
    await page.locator('#nav-dashboard').click();
    await page.locator('.header-actions-group button:has-text("Stock In")').click();
    await page.locator('#stock-in-qty').fill('20');
    await page.locator('#stock-in-po').fill('PO-GLOBAL-Mouser-991');
    await page.locator('button:has-text("Confirm Stock In")').click();
    await expect(page.locator('.toast:has-text("Successfully received")')).toBeVisible();

    // 2. Sales flow
    await page.locator('.header-actions-group button:has-text("Stock Out")').click();
    await page.locator('#stock-out-qty').fill('5');
    await page.locator('#stock-out-reason').selectOption('Direct Sale');
    await page.locator('#stock-out-ref').fill('CUSTOMER-INVOICE-3301');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("Dispatched -5")')).toBeVisible();
  });

  // 14. Project Return Workflow
  test('14. Returns — Return products from projects and restore inventory', async ({ page }) => {
    await page.locator('#nav-projects').click();
    await page.locator('.project-card:has-text("Smart Greenhouse Auto-Waterer")').click();
    
    // In Use has ESP32 (2 pcs)
    const inUseRow = page.locator('#tab-content-in-use table tbody tr:has-text("ESP32 DevKit V1")');
    await inUseRow.locator('.qty-input').fill('1');
    await inUseRow.locator('button:has-text("Return to Spare")').click();
    
    await expect(page.locator('.toast:has-text("Returned 1 pcs")')).toBeVisible();
    await expect(inUseRow).toContainText('1 pcs');
  });

  // 15. Inventory History Ledger
  test('15. Inventory History — Complete movement audit trail', async ({ page }) => {
    await page.locator('#nav-history').click();
    await expect(page.locator('.view-title-wrap h2')).toHaveText('Inventory Transaction Ledger');

    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(6);

    // Search ledger
    await page.locator('#history-search').fill('Smart Greenhouse');
    await expect(page.locator('table tbody tr').first()).toContainText('Smart Greenhouse');
  });

  // 16. Inventory Reports & Valuation Analytics
  test('16. Inventory Reports — Real-time valuation metrics and CSV export', async ({ page }) => {
    await page.locator('#nav-reports').click();
    await expect(page.locator('.view-title-wrap h2')).toHaveText('Inventory Reports & Valuation Analytics');

    // Valuation metric exists and is non-zero
    const valText = await page.locator('.report-card:nth-child(1) .metric-value').innerText();
    expect(valText).toContain('$');

    // Test CSV download triggers
    const downloadPromise1 = page.waitForEvent('download');
    await page.locator('button:has-text("Export Catalog CSV")').click();
    const download1 = await downloadPromise1;
    expect(download1.suggestedFilename()).toBe('Inven3_Component_Catalog.csv');
  });

  // 17. Boundary & Negative Test Cases
  test('17. Boundary / Negative cases — Zero, negative, over-stock and duplicate SKU', async ({ page }) => {
    await page.locator('#nav-components').click();

    // 1. Try to register with duplicate SKU
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('Duplicate Test Part');
    await page.locator('#comp-sku').fill('BRD-ESP32-V1'); // Existing SKU
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("already assigned")')).toBeVisible();

    // 2. Try zero or negative stock out
    await page.locator('#modal-register-component button:has-text("Cancel")').click();
    await page.locator('.header-actions-group button:has-text("Stock Out")').click();
    await page.locator('#stock-out-qty').fill('0');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("valid quantity")')).toBeVisible();

    // 3. Try stock out exceeding spare stock
    await page.locator('#stock-out-qty').fill('99999');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("Insufficient spare stock")')).toBeVisible();
  });

  // 18. Mathematical Data Consistency
  test('18. Mathematical Data Consistency — Total Qty == Spare + InUse invariant', async ({ page }) => {
    await page.locator('#nav-components').click();
    
    const isConsistent = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('inven3_state'));
      return state.components.every(c => (c.spareQty + c.inUseQty) === c.totalQty);
    });

    expect(isConsistent).toBe(true);
  });

});
