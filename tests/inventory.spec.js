const { test, expect } = require('@playwright/test');
const path = require('path');

const fileUrl = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

test.describe('Inven3 - Inventory Management Functionality Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before starting clean
    await page.goto(fileUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Step 1: Verify Dashboard Stats & Global Search', async ({ page }) => {
    // 1. Verify metric values
    const metrics = page.locator('.metric-card');
    await expect(metrics).toHaveCount(4);
    
    // Active projects should show '2' (since Smart Greenhouse and IoT Home Weather Hub are Active)
    const activeProjectsText = await page.locator('.metric-card:nth-child(1) .metric-value').innerText();
    expect(Number(activeProjectsText)).toBeGreaterThanOrEqual(2);

    // Unique parts should show 5
    const uniquePartsText = await page.locator('.metric-card:nth-child(2) .metric-value').innerText();
    expect(uniquePartsText).toBe('5');

    // 2. Test Global Search
    const searchInput = page.locator('#global-search');
    await searchInput.fill('ESP32');
    
    // Should filter projects/components
    const compRows = page.locator('.content-panel table tbody tr');
    await expect(compRows).toHaveCount(1);
    await expect(compRows.first()).toContainText('ESP32 DevKit V1');

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('.content-panel table tbody tr')).toHaveCount(5);
  });

  test('Step 2: Component Management (Register, Filter, Edit, Delete)', async ({ page }) => {
    // Navigate to Components
    await page.locator('#nav-components').click();
    await expect(page.locator('.view-title-wrap h2')).toHaveText('Component Inventory');

    // 1. Register New Component
    await page.locator('button:has-text("Register Product")').click();
    await expect(page.locator('#modal-register-component')).toHaveClass(/open/);

    await page.locator('#comp-name').fill('Raspberry Pi Pico W');
    await page.locator('#comp-category').selectOption('Board');
    await page.locator('#comp-unit').fill('pcs');
    await page.locator('#comp-qty').fill('10');
    await page.locator('#comp-supplier').fill('Raspberry Pi Foundation');
    await page.locator('#comp-notes').fill('Microcontroller with Wi-Fi');

    await page.locator('#btn-save-comp').click();

    // Verify toast
    await expect(page.locator('.toast:has-text("Raspberry Pi Pico W")')).toBeVisible();

    // Verify row added in table
    const picoRow = page.locator('table tbody tr:has-text("Raspberry Pi Pico W")');
    await expect(picoRow).toBeVisible();
    await expect(picoRow).toContainText('10 pcs');

    // 2. Test Category Filtering
    const catFilter = page.locator('#component-cat-filter');
    await catFilter.selectOption('Board');
    
    // Should only show Board items
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('Board');
    }

    // Reset filter
    await catFilter.selectOption('All');

    // 3. Edit Component
    await picoRow.locator('.action-icon-btn.edit').click();
    await expect(page.locator('#modal-register-component')).toHaveClass(/open/);
    await page.locator('#comp-qty').fill('12');
    await page.locator('#btn-save-comp').click();

    // Verify updated stock
    await expect(picoRow).toContainText('12 pcs');

    // 4. Delete Component
    page.once('dialog', dialog => dialog.accept());
    await picoRow.locator('.action-icon-btn.delete').click();
    await expect(page.locator('table tbody tr:has-text("Raspberry Pi Pico W")')).toHaveCount(0);
  });

  test('Step 3 & 4: Project Lifecycle, Assignment & Return Workflow', async ({ page }) => {
    // 1. Create New Project
    await page.locator('#nav-projects').click();
    await page.locator('button:has-text("New Project")').click();
    await expect(page.locator('#modal-new-project')).toHaveClass(/open/);

    await page.locator('#project-name').fill('Smart Hydroponics Tower');
    await page.locator('#project-desc').fill('Automated nutrient dosing and water monitoring system');
    await page.locator('button:has-text("Create Project")').click();

    // Verify redirect/creation
    await page.locator('#nav-projects').click();
    const projCard = page.locator('.project-card:has-text("Smart Hydroponics Tower")');
    await expect(projCard).toBeVisible();

    // 2. Open Project Detail
    await projCard.click();
    await expect(page.locator('.view-title-wrap h2')).toHaveText('Smart Hydroponics Tower');

    // 3. Assign Component from Spare Registry
    await page.locator('#tab-btn-spare').click();
    const esp32SpareRow = page.locator('#tab-content-spare table tbody tr:has-text("ESP32 DevKit V1")');
    await expect(esp32SpareRow).toBeVisible();
    
    await esp32SpareRow.locator('.qty-input').fill('2');
    await esp32SpareRow.locator('button:has-text("Assign")').click();
    await expect(page.locator('.toast:has-text("Assigned 2 pcs")')).toBeVisible();

    // 4. Check In Use Tab
    await page.locator('#tab-btn-in-use').click();
    const inUseRow = page.locator('#tab-content-in-use table tbody tr:has-text("ESP32 DevKit V1")');
    await expect(inUseRow).toBeVisible();
    await expect(inUseRow).toContainText('2 pcs');

    // 5. Return 1 Unit
    await inUseRow.locator('.qty-input').fill('1');
    await inUseRow.locator('button:has-text("Return to Spare")').click();
    await expect(page.locator('.toast:has-text("Returned 1 pcs")')).toBeVisible();
    await expect(inUseRow).toContainText('1 pcs');

    // 6. Direct Component Registration on Project
    await page.locator('button:has-text("Add New Component")').click();
    await expect(page.locator('#modal-register-component')).toHaveClass(/open/);
    await page.locator('#comp-name').fill('Water Level Sensor');
    await page.locator('#comp-category').selectOption('Sensor');
    await page.locator('#comp-qty').fill('3');
    await page.locator('#comp-supplier').fill('DFRobot');
    await page.locator('#btn-save-comp').click();

    // Verify direct assignment
    await expect(page.locator('#tab-content-in-use table tbody tr:has-text("Water Level Sensor")')).toContainText('3 pcs');
  });

  test('Step 5: Transaction History Ledger Verification', async ({ page }) => {
    // Navigate to Stock History
    await page.locator('#nav-history').click();
    await expect(page.locator('.view-title-wrap h2')).toHaveText('Inventory Transaction Ledger');

    // Verify ledger table rows
    const historyRows = page.locator('table tbody tr');
    const count = await historyRows.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // Test Search in History
    const historySearch = page.locator('#history-search');
    await historySearch.fill('ESP32');
    const filteredRows = page.locator('table tbody tr');
    await expect(filteredRows.first()).toContainText('ESP32');
  });

  test('Step 6: Cascade Project Deletion & Restoring Spares', async ({ page }) => {
    // Open projects
    await page.locator('#nav-projects').click();
    const projCard = page.locator('.project-card:has-text("Smart Greenhouse Auto-Waterer")');
    await projCard.click();

    // Delete project with confirmation
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("Delete Project")').click();

    // Verify redirection to dashboard
    await expect(page.locator('.view-title-wrap h2')).toHaveText('Dashboard');
    await expect(page.locator('.toast:has-text("deleted and components returned")')).toBeVisible();
  });

  test('Step 7: LocalStorage State Persistence', async ({ page }) => {
    // Register a unique part
    await page.locator('#nav-components').click();
    await page.locator('button:has-text("Register Product")').click();
    await page.locator('#comp-name').fill('Persistent Test Component');
    await page.locator('#comp-qty').fill('5');
    await page.locator('#btn-save-comp').click();

    // Reload page
    await page.reload();

    // Verify data remains present
    await page.locator('#nav-components').click();
    await expect(page.locator('table tbody tr:has-text("Persistent Test Component")')).toBeVisible();
  });

});
