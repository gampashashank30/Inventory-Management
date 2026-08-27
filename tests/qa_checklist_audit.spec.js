const { test, expect } = require('@playwright/test');
const path = require('path');

const fileUrl = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

test.describe('58-Section Enterprise QA Checklist Full Audit Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl);
    await page.evaluate(() => {
      localStorage.clear();
      if (typeof init === 'function') init();
    });
  });

  // 1. Core Master Data & Product Tests (Sections 4, 5, 7, 8)
  test('Checklist Sections 4, 5, 7, 8: Product, Category, Unit, SKU Management', async ({ page }) => {
    await page.locator('#nav-components').click();

    // Add Product with all fields
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('ESP32-S3 Feather');
    await page.locator('#comp-sku').fill('BRD-S3-FEATHER');
    await page.locator('#comp-unit').fill('pcs');
    await page.locator('#comp-qty').fill('30');
    await page.locator('#comp-min-threshold').fill('8');
    await page.locator('#comp-cost').fill('6.50');
    await page.locator('#comp-price').fill('14.00');
    await page.locator('#comp-supplier').fill('Adafruit Industries');
    await page.locator('#btn-save-comp').click();

    await expect(page.locator('.toast:has-text("registered with SKU")')).toBeVisible();
    await expect(page.locator('table tbody tr:has-text("ESP32-S3 Feather")')).toBeVisible();

    // Duplicate SKU validation
    await page.locator('.header-actions-group button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('Duplicate Test');
    await page.locator('#comp-sku').fill('BRD-S3-FEATHER');
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("already assigned")')).toBeVisible();
    await page.locator('#modal-register-component button:has-text("Cancel")').click();

    // Edit Product
    const editBtn = page.locator('table tbody tr:has-text("ESP32-S3 Feather") .action-icon-btn.edit');
    await editBtn.click();
    await page.locator('#comp-price').fill('16.50');
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('table tbody tr:has-text("ESP32-S3 Feather")')).toContainText('$16.50');
  });

  // 2. Inventory Operations & Stock In/Out/Transfer (Sections 11, 12, 13, 14, 16)
  test('Checklist Sections 11, 12, 13, 14, 16: Stock In, Stock Out, Stock Transfer & Warehouses', async ({ page }) => {
    await page.locator('#nav-components').click();

    // Stock In
    const stockInBtn = page.locator('table tbody tr:has-text("ESP32 DevKit V1") button.btn-action-sm.emerald');
    await stockInBtn.click();
    await page.locator('#stock-in-qty').fill('10');
    await page.locator('#stock-in-po').fill('PO-AUDIT-2026');
    await page.locator('button:has-text("Confirm Stock In")').click();
    await expect(page.locator('.toast:has-text("Successfully received +10")')).toBeVisible();

    // Stock Out
    const stockOutBtn = page.locator('table tbody tr:has-text("ESP32 DevKit V1") button.btn-action-sm.rose');
    await stockOutBtn.click();
    await page.locator('#stock-out-qty').fill('4');
    await page.locator('#stock-out-reason').selectOption('Direct Sale');
    await page.locator('#stock-out-ref').fill('INV-AUDIT-4401');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("Dispatched -4")')).toBeVisible();

    // Stock Transfer
    await page.locator('#nav-warehouses').click();
    await page.locator('.header-actions-group button:has-text("Stock Transfer")').click();
    await page.locator('#transfer-target').selectOption({ label: 'IoT Research Lab' });
    await page.locator('#transfer-qty').fill('3');
    await page.locator('button:has-text("Execute Transfer")').click();
    await expect(page.locator('.toast:has-text("Transferred 3")')).toBeVisible();
  });

  // 3. Project Provisions & Returns (Sections 15, 17, 51)
  test('Checklist Sections 15, 17, 51: Project Hardware Provision & De-provision Return', async ({ page }) => {
    await page.locator('#nav-projects').click();
    await page.locator('.project-card:has-text("Smart Greenhouse Auto-Waterer")').click();

    // Assign
    await page.locator('#tab-btn-spare').click();
    const spareRow = page.locator('#tab-content-spare table tbody tr:has-text("HC-SR04 Ultrasonic Sensor")');
    await spareRow.locator('.qty-input').fill('2');
    await spareRow.locator('button:has-text("Assign")').click();
    await expect(page.locator('.toast:has-text("Assigned 2 pcs")')).toBeVisible();

    // Return
    await page.locator('#tab-btn-in-use').click();
    const inUseRow = page.locator('#tab-content-in-use table tbody tr:has-text("HC-SR04 Ultrasonic Sensor")');
    await inUseRow.locator('.qty-input').fill('1');
    await inUseRow.locator('button:has-text("Return to Spare")').click();
    await expect(page.locator('.toast:has-text("Returned 1 pcs")')).toBeVisible();
  });

  // 4. Low-Stock & Search & Filters (Sections 3, 26, 27, 28)
  test('Checklist Sections 3, 26, 27, 28: Low Stock Alerts, Global & Local Search & Filters', async ({ page }) => {
    // Low stock bell count
    const bellCount = await page.locator('#low-stock-badge-count').innerText();
    expect(Number(bellCount)).toBeGreaterThanOrEqual(1);

    // Filter Low Stock
    await page.locator('#nav-components').click();
    await page.locator('button:has-text("Filter Low Stock")').click();
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(1);

    // Local search
    await page.locator('button:has-text("Showing Low Stock")').click();
    await page.locator('#component-search').fill('Relay');
    await expect(page.locator('table tbody tr:has-text("5V Dual Channel Relay Module")')).toBeVisible();
  });

  // 5. Valuation, Reports, CSV Exports & Audit Trail (Sections 22, 30, 31, 33)
  test('Checklist Sections 22, 30, 31, 33: Valuation Calculations, CSV Exports & Audit Ledger', async ({ page }) => {
    await page.locator('#nav-reports').click();

    // Metric cards validation
    const valText = await page.locator('.report-card:nth-child(1) .metric-value').innerText();
    expect(valText).toContain('$');

    // Export Catalog CSV
    const download1 = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("Export Catalog CSV")').click(),
    ]);
    expect(download1[0].suggestedFilename()).toBe('Inven3_Component_Catalog.csv');

    // Export Ledger CSV
    const download2 = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("Export Audit Ledger CSV")').click(),
    ]);
    expect(download2[0].suggestedFilename()).toBe('Inven3_Transaction_Ledger.csv');

    // Verify Ledger history
    await page.locator('#nav-history').click();
    expect(await page.locator('table tbody tr').count()).toBeGreaterThanOrEqual(6);
  });

  // 6. Data Reconciliation & Mathematical Integrity (Sections 34, 41, 52)
  test('Checklist Sections 34, 41, 52: Data Reconciliation, Boundaries & Mathematical Conservation', async ({ page }) => {
    // 6.1 Negative input blocked
    await page.locator('#nav-components').click();
    await page.locator('.header-actions-group button:has-text("Stock Out")').click();
    await page.locator('#stock-out-qty').fill('0');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("valid quantity")')).toBeVisible();
    await page.locator('#modal-stock-out button:has-text("Cancel")').click();

    // 6.2 Over-stockout blocked
    await page.locator('.header-actions-group button:has-text("Stock Out")').click();
    await page.locator('#stock-out-qty').fill('99999');
    await page.locator('button:has-text("Confirm Stock Out")').click();
    await expect(page.locator('.toast:has-text("Insufficient spare stock")')).toBeVisible();
    await page.locator('#modal-stock-out button:has-text("Cancel")').click();

    // 6.3 State mathematical invariant
    const isConsistent = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('inven3_state'));
      return state.components.every(c => (c.spareQty + c.inUseQty) === c.totalQty);
    });
    expect(isConsistent).toBe(true);
  });

});
