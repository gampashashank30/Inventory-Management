import { test, expect } from '@playwright/test';

test.describe('Stock In & Stock Out History Audit', () => {
  test('Stock In and Stock Out correctly log entries in Stock History Ledger', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000); // Allow Firebase to sync/load

    // 1. Navigate to Components
    await page.locator('#nav-components').click();
    await page.waitForSelector('#components-tbody tr');

    const firstCompName = (await page.locator('#components-tbody tr .comp-name-cell').first().innerText()).trim();

    // 2. Perform Stock In via Quick Action (+ In)
    await page.locator('#components-tbody tr .btn-action-sm.emerald').first().click();
    await expect(page.locator('#modal-stock-in')).toHaveClass(/open/);

    const testPoRef = `PO-TEST-IN-${Date.now()}`;
    await page.locator('#stock-in-qty').fill('15');
    await page.locator('#stock-in-po').fill(testPoRef);
    await page.locator('#modal-stock-in .btn-success').click();

    await expect(page.locator('#modal-stock-in')).not.toHaveClass(/open/);
    await expect(page.locator('.toast:has-text("Successfully received +15")')).toBeVisible();

    // 3. Perform Stock Out via Quick Action (- Out)
    await page.locator('#components-tbody tr .btn-action-sm.rose').first().click();
    await expect(page.locator('#modal-stock-out')).toHaveClass(/open/);

    const testOutRef = `REF-TEST-OUT-${Date.now()}`;
    await page.locator('#stock-out-qty').fill('3');
    await page.locator('#stock-out-ref').fill(testOutRef);
    await page.locator('#modal-stock-out .btn-warning').click();

    await expect(page.locator('#modal-stock-out')).not.toHaveClass(/open/);
    await expect(page.locator('.toast:has-text("Dispatched -3")')).toBeVisible();

    // 4. Navigate to Stock History view
    await page.locator('#nav-history').click();
    await page.waitForSelector('.table-container table tbody tr');

    // Verify Stock In entry in history table
    const inRow = page.locator(`.table-container table tbody tr:has-text("${testPoRef}")`);
    await expect(inRow).toBeVisible();
    await expect(inRow).toContainText('Stock In');
    await expect(inRow).toContainText('15');

    // Verify Stock Out entry in history table
    const outRow = page.locator(`.table-container table tbody tr:has-text("${testOutRef}")`);
    await expect(outRow).toBeVisible();
    await expect(outRow).toContainText('Stock Out');
    await expect(outRow).toContainText('3');
  });
});
