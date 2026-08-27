const { test, expect } = require('@playwright/test');
const path = require('path');

const fileUrl = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

test.describe('Full 18-Point E2E Capability & Gap Analysis Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // 1. Add Product
  test('1. Add Product — Check fields (SKU, Price, Qty, Category, etc.)', async ({ page }) => {
    await page.locator('#nav-components').click();
    await page.locator('button:has-text("Register Product")').click();
    
    // Check available form fields
    const hasName = await page.locator('#comp-name').isVisible();
    const hasCategory = await page.locator('#comp-category').isVisible();
    const hasQty = await page.locator('#comp-qty').isVisible();
    const hasUnit = await page.locator('#comp-unit').isVisible();
    const hasSupplier = await page.locator('#comp-supplier').isVisible();
    
    // Check enterprise fields (SKU, Price)
    const hasSKU = await page.locator('#comp-sku, [name="sku"]').isVisible().catch(() => false);
    const hasPrice = await page.locator('#comp-price, [name="price"]').isVisible().catch(() => false);

    console.log(`[Feature 1 Add Product Result] Name: ${hasName}, Category: ${hasCategory}, Qty: ${hasQty}, SKU: ${hasSKU}, Price: ${hasPrice}`);
    expect(hasName && hasCategory && hasQty).toBeTruthy();
    // Record gap for SKU & Price
    if (!hasSKU || !hasPrice) {
      console.log('GAP: SKU and Unit Price fields are not present in product registration form.');
    }
  });

  // 2. Edit Product
  test('2. Edit Product — Verify updates save and reflect correctly', async ({ page }) => {
    await page.locator('#nav-components').click();
    const firstEditBtn = page.locator('.action-icon-btn.edit').first();
    await firstEditBtn.click();
    
    await page.locator('#comp-name').fill('ESP32 DevKit V1 - Modified');
    await page.locator('#btn-save-comp').click();

    await expect(page.locator('table tbody')).toContainText('ESP32 DevKit V1 - Modified');
  });

  // 3. Delete Product
  test('3. Delete Product — Verify deletion rules & project consistency', async ({ page }) => {
    await page.locator('#nav-components').click();
    page.once('dialog', dialog => dialog.accept());
    
    // Delete first item (ESP32) which is currently used in projects
    const deleteBtn = page.locator('table tbody tr:has-text("ESP32 DevKit V1") .action-icon-btn.delete');
    await deleteBtn.click();

    // Verify removed from table
    await expect(page.locator('table tbody tr:has-text("ESP32 DevKit V1")')).toHaveCount(0);
    
    // Verify projects consistency (unassigned from project without breaking app)
    await page.locator('#nav-projects').click();
    await page.locator('.project-card').first().click();
    await expect(page.locator('#tab-content-in-use table tbody tr:has-text("ESP32 DevKit V1")')).toHaveCount(0);
  });

  // 4. Stock In
  test('4. Stock In — Check direct Stock-In module vs Edit stock increase', async ({ page }) => {
    await page.locator('#nav-components').click();
    const hasStockInBtn = await page.locator('button:has-text("Stock In"), #btn-stock-in').isVisible().catch(() => false);
    console.log(`[Feature 4 Stock In] Dedicated Stock-In UI present: ${hasStockInBtn}`);
    
    // In current app, stock in is achieved by editing totalQty upwards
    const editBtn = page.locator('table tbody tr:has-text("DHT22 Temperature Sensor") .action-icon-btn.edit');
    await editBtn.click();
    await page.locator('#comp-qty').fill('30'); // increased from 22 to 30 (+8)
    await page.locator('#btn-save-comp').click();

    await expect(page.locator('table tbody tr:has-text("DHT22 Temperature Sensor")')).toContainText('30 pcs');
  });

  // 5. Stock Out
  test('5. Stock Out — Check direct Stock-Out module vs Project assignment', async ({ page }) => {
    const hasStockOutBtn = await page.locator('button:has-text("Stock Out"), #btn-stock-out').isVisible().catch(() => false);
    console.log(`[Feature 5 Stock Out] Dedicated Stock-Out UI present: ${hasStockOutBtn}`);
    
    // Stock out is currently handled via Project Assignment
    await page.locator('#nav-projects').click();
    await page.locator('.project-card').first().click();
    await page.locator('#tab-btn-spare').click();
    
    const spareRow = page.locator('#tab-content-spare table tbody tr:has-text("HC-SR04 Ultrasonic Sensor")');
    await spareRow.locator('.qty-input').fill('2');
    await spareRow.locator('button:has-text("Assign")').click();

    // Verify spare decreased
    await page.locator('#nav-components').click();
    const compRow = page.locator('table tbody tr:has-text("HC-SR04 Ultrasonic Sensor")');
    await expect(compRow).toContainText('6'); // 8 spare - 2 assigned = 6
  });

  // 6. Stock Adjustment
  test('6. Stock Adjustment — Adjust stock and verify history log', async ({ page }) => {
    await page.locator('#nav-components').click();
    const editBtn = page.locator('table tbody tr:has-text("M-F Jumper Wires") .action-icon-btn.edit');
    await editBtn.click();
    await page.locator('#comp-qty').fill('8'); // from 5 to 8 (+3)
    await page.locator('#btn-save-comp').click();

    // Check history ledger for adjustment entry
    await page.locator('#nav-history').click();
    await expect(page.locator('table tbody tr').first()).toContainText('M-F Jumper Wires');
    await expect(page.locator('table tbody tr').first()).toContainText('3');
  });

  // 7. Low-Stock Alerts
  test('7. Low-Stock Alerts — Threshold alerts and notification badge', async ({ page }) => {
    const hasLowStockAlert = await page.locator('.low-stock-alert, #low-stock-badge').isVisible().catch(() => false);
    console.log(`[Feature 7 Low Stock Alert] Dynamic low stock threshold / alert badge present: ${hasLowStockAlert}`);
  });

  // 8. Search & Filter
  test('8. Search & Filter — Filter by product name, details and category', async ({ page }) => {
    await page.locator('#nav-components').click();
    
    // Category filter
    await page.locator('#component-cat-filter').selectOption('Sensor');
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    
    // Search input
    await page.locator('#component-search').fill('DHT22');
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody tr')).toContainText('DHT22');
  });

  // 9. Categories Management
  test('9. Categories — Custom Category Creation & Editing', async ({ page }) => {
    const hasCategoryManager = await page.locator('#nav-categories, button:has-text("Manage Categories")').isVisible().catch(() => false);
    console.log(`[Feature 9 Categories Manager] Custom Category CRUD module present: ${hasCategoryManager}`);
  });

  // 10 & 11. Warehouses & Stock Transfer
  test('10 & 11. Multi-Warehouse & Inter-Warehouse Stock Transfer', async ({ page }) => {
    const hasWarehouseNav = await page.locator('#nav-warehouses, [data-view="warehouses"]').isVisible().catch(() => false);
    const hasTransferBtn = await page.locator('button:has-text("Transfer Stock"), #btn-transfer').isVisible().catch(() => false);
    console.log(`[Feature 10 Warehouses] Multi-warehouse location module present: ${hasWarehouseNav}`);
    console.log(`[Feature 11 Stock Transfer] Inter-warehouse stock transfer module present: ${hasTransferBtn}`);
  });

  // 12, 13 & 14. Purchase Orders, Sales Orders & Returns
  test('12, 13, 14. Purchase Orders, Sales & Returns', async ({ page }) => {
    const hasPurchasing = await page.locator('#nav-purchases, #nav-orders').isVisible().catch(() => false);
    const hasSales = await page.locator('#nav-sales, #nav-pos').isVisible().catch(() => false);
    console.log(`[Feature 12 Purchase/Receiving] Purchase Order module present: ${hasPurchasing}`);
    console.log(`[Feature 13 Sales Orders] Sales/POS module present: ${hasSales}`);

    // Returns: Project Return is implemented
    await page.locator('#nav-projects').click();
    await page.locator('.project-card').first().click();
    const hasReturnBtn = await page.locator('button:has-text("Return to Spare")').first().isVisible().catch(() => false);
    console.log(`[Feature 14 Returns] Hardware Project Return function present: ${hasReturnBtn}`);
    expect(hasReturnBtn).toBeTruthy();
  });

  // 15. Inventory History
  test('15. Inventory History Ledger — Verify complete movement recording', async ({ page }) => {
    await page.locator('#nav-history').click();
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(6);
    
    // Verify columns: S.No, Date, Component Name, Qty Change, Action, Project/Context
    const headers = page.locator('table thead tr th');
    await expect(headers.nth(0)).toContainText('S.No');
    await expect(headers.nth(2)).toContainText('Component Name');
    await expect(headers.nth(3)).toContainText('Qty Change');
  });

  // 16. Inventory Reports
  test('16. Inventory Reports & Export Module', async ({ page }) => {
    const hasReportsNav = await page.locator('#nav-reports, button:has-text("Export CSV"), button:has-text("Generate Report")').isVisible().catch(() => false);
    console.log(`[Feature 16 Reports] Dedicated Reports & CSV Export module present: ${hasReportsNav}`);
  });

  // 17. Boundary & Negative Cases
  test('17. Boundary / Negative Test Cases', async ({ page }) => {
    // 1. Cannot assign 0 or negative quantity
    await page.locator('#nav-projects').click();
    await page.locator('.project-card').first().click();
    await page.locator('#tab-btn-spare').click();
    
    const spareRow = page.locator('#tab-content-spare table tbody tr').first();
    await spareRow.locator('.qty-input').fill('0');
    await spareRow.locator('button:has-text("Assign")').click();
    await expect(page.locator('.toast:has-text("valid quantity")')).toBeVisible();

    // 2. Cannot exceed available spare stock
    await spareRow.locator('.qty-input').fill('99999');
    await spareRow.locator('button:has-text("Assign")').click();
    await expect(page.locator('.toast:has-text("Insufficient spare stock")')).toBeVisible();

    // 3. Cannot save component without a name
    await page.locator('#nav-components').click();
    await page.locator('button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('');
    await page.locator('#btn-save-comp').click();
    await expect(page.locator('.toast:has-text("Component name is required")')).toBeVisible();
  });

  // 18. Data Consistency / Mathematical Integrity
  test('18. Mathematical Data Consistency Verification', async ({ page }) => {
    await page.locator('#nav-components').click();
    
    // Evaluate sum of (Spare + InUse) == TotalQty across all catalog items
    const isMathematicallyConsistent = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('inven3_state'));
      return state.components.every(c => (c.spareQty + c.inUseQty) === c.totalQty);
    });

    expect(isMathematicallyConsistent).toBe(true);
  });

});
