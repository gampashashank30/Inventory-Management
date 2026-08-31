const { test, expect } = require('@playwright/test');
const path = require('path');

const fileUrl = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

test.describe('Categories Filter and Dropdown Verification', () => {
  test('Verify Capacitors, Resistors, Batteries and other categories appear in filter and dropdowns', async ({ page }) => {
    await page.goto(fileUrl);
    // Wait for components view navigation
    await page.click('#nav-components');
    await page.waitForSelector('#component-cat-filter');

    // 1. Check all options inside #component-cat-filter
    const catOptions = await page.$$eval('#component-cat-filter option', options => options.map(o => o.textContent.trim()));
    console.log('Category filter options:', catOptions);

    expect(catOptions).toContain('All Categories');
    expect(catOptions).toContain('Capacitors');
    expect(catOptions).toContain('Resistors');
    expect(catOptions).toContain('Batteries');
    expect(catOptions).toContain('Sensors');
    expect(catOptions).toContain('Microcontrollers');

    // 2. Select Capacitors in filter
    await page.selectOption('#component-cat-filter', 'Capacitors');
    await page.waitForTimeout(300);

    const rows = page.locator('#components-tbody tr');
    const rowCount = await rows.count();
    console.log(`Capacitors filtered rows: ${rowCount}`);
    if (rowCount > 0 && !(await rows.first().locator('td').first().innerText()).includes('No components match')) {
      const firstCatBadge = await rows.first().locator('.cat-badge').innerText();
      expect(firstCatBadge.toLowerCase()).toContain('capacitor');
    }

    // 3. Select Resistors in filter
    await page.selectOption('#component-cat-filter', 'Resistors');
    await page.waitForTimeout(300);

    const resRowCount = await rows.count();
    console.log(`Resistors filtered rows: ${resRowCount}`);
    if (resRowCount > 0 && !(await rows.first().locator('td').first().innerText()).includes('No components match')) {
      const firstCatBadge = await rows.first().locator('.cat-badge').innerText();
      expect(firstCatBadge.toLowerCase()).toContain('resistor');
    }

    // 4. Check Register Product modal category dropdown
    await page.click('button:has-text("Register Product")');
    await page.waitForSelector('#modal-register-component.open');
    const modalCatOptions = await page.$$eval('#comp-category option', options => options.map(o => o.textContent.trim()));
    console.log('Register modal category options:', modalCatOptions);

    expect(modalCatOptions).toContain('Capacitors');
    expect(modalCatOptions).toContain('Resistors');
    expect(modalCatOptions).toContain('Batteries');

    await page.click('#modal-register-component .btn-close-modal');
  });
});
