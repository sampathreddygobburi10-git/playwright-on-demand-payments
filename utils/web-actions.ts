import { type Page, type Locator } from '@playwright/test';

/**
 * Reusable web action helpers for common UI interactions.
 *
 * `WebActions` is injected via the base fixture as `webActions` and can be used
 * in any spec file.  All methods accept `Locator` objects so locators stay
 * encapsulated in page classes.
 *
 * @example
 * // In a spec file
 * test('example', async ({ webActions, page }) => {
 *   const dropdown = page.locator('select#country');
 *   await webActions.selectDropdownByText(dropdown, 'India');
 * });
 */
export class WebActions {
  constructor(private readonly page: Page) {}

  /**
   * Select an option from a **native** `<select>` element by its visible label text.
   *
   * @param locator - Locator targeting the `<select>` element.
   * @param text    - The visible option label to select (case-sensitive).
   *
   * @example
   * const countryDropdown = page.locator('select#country');
   * await webActions.selectDropdownByText(countryDropdown, 'India');
   */
  async selectDropdownByText(locator: Locator, text: string): Promise<void> {
    await locator.selectOption({ label: text });
  }

  /**
   * Select an option from a **native** `<select>` element by its `value` attribute.
   *
   * @param locator - Locator targeting the `<select>` element.
   * @param value   - The `value` attribute of the `<option>` to select.
   *
   * @example
   * const statusDropdown = page.locator('select#status');
   * await webActions.selectDropdownByValue(statusDropdown, 'active');
   */
  async selectDropdownByValue(locator: Locator, value: string): Promise<void> {
    await locator.selectOption({ value });
  }

  /**
   * Select an option from a **custom (non-native)** dropdown component by
   * clicking the trigger and then clicking the option that matches the given text.
   *
   * @param triggerLocator - Locator for the element that opens the dropdown
   *                         (e.g. the button or div acting as the trigger).
   * @param optionText     - Exact visible text of the option to select.
   *
   * @note This relies on `text=` selector, which matches visible text exactly.
   *       For partial matches wrap the text in a regex when building the locator
   *       inside the page class instead.
   *
   * @example
   * const trigger = page.locator('.custom-select-trigger');
   * await webActions.selectCustomDropdown(trigger, 'New York');
   */
  async selectCustomDropdown(triggerLocator: Locator, optionText: string): Promise<void> {
    await triggerLocator.click();
    await this.page.locator(`text=${optionText}`).click();
  }

  /**
   * Get the text content of a specific cell in an HTML table.
   *
   * @param tableLocator - Locator targeting the `<table>` element.
   * @param row          - 1-based row index (1 = first `<tr>`).
   * @param col          - 1-based column index (1 = first `<td>`).
   * @returns The trimmed text content of the cell, or an empty string.
   *
   * @example
   * const table = page.locator('table#orders');
   * const orderId = await webActions.getTableCellValue(table, 1, 2); // row 1, col 2
   */
  async getTableCellValue(tableLocator: Locator, row: number, col: number): Promise<string> {
    const cell = tableLocator.locator(`tr:nth-child(${row}) td:nth-child(${col})`);
    return (await cell.textContent()) || '';
  }

  /**
   * Click a specific cell in an HTML table.
   *
   * @param tableLocator - Locator targeting the `<table>` element.
   * @param row          - 1-based row index.
   * @param col          - 1-based column index.
   *
   * @example
   * const table = page.locator('table#users');
   * await webActions.clickTableCell(table, 3, 1); // click first cell of row 3
   */
  async clickTableCell(tableLocator: Locator, row: number, col: number): Promise<void> {
    const cell = tableLocator.locator(`tr:nth-child(${row}) td:nth-child(${col})`);
    await cell.click();
  }

  /**
   * Return the number of data rows in a table's `<tbody>`.
   *
   * @param tableLocator - Locator targeting the `<table>` element.
   * @returns Number of `<tr>` elements inside `<tbody>`.
   *
   * @example
   * const table = page.locator('table#results');
   * const count = await webActions.getTableRowCount(table);
   * expect(count).toBe(10);
   */
  async getTableRowCount(tableLocator: Locator): Promise<number> {
    return await tableLocator.locator('tbody tr').count();
  }

  /**
   * Return the text content of every cell in a specific column.
   * Useful for asserting that a column is sorted or contains expected values.
   *
   * @param tableLocator - Locator targeting the `<table>` element.
   * @param colIndex     - 1-based column index.
   * @returns Array of text strings, one per row.
   *
   * @example
   * const table = page.locator('table#products');
   * const prices = await webActions.getTableColumnValues(table, 3); // col 3 = price
   * expect(prices).toContain('$9.99');
   */
  async getTableColumnValues(tableLocator: Locator, colIndex: number): Promise<string[]> {
    const cells = tableLocator.locator(`tbody tr td:nth-child(${colIndex})`);
    return await cells.allTextContents();
  }

  /**
   * Find the first `<tr>` in a table whose text content contains `searchText`.
   * Returns `null` if no matching row is found.
   *
   * @param tableLocator - Locator targeting the `<table>` element.
   * @param searchText   - Text to search for within any cell of each row.
   * @returns The matching row `Locator`, or `null` if not found.
   *
   * @example
   * const table = page.locator('table#invoices');
   * const row = await webActions.searchInTable(table, 'INV-2024-001');
   * if (row) await row.locator('button.edit').click();
   */
  async searchInTable(tableLocator: Locator, searchText: string): Promise<Locator | null> {
    const rows = tableLocator.locator('tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).textContent();
      if (rowText?.includes(searchText)) {
        return rows.nth(i);
      }
    }
    return null;
  }

  /**
   * Ensure a checkbox is checked. If it is already checked, this is a no-op.
   *
   * @param locator - Locator targeting the `<input type="checkbox">` element.
   *
   * @example
   * const termsCheckbox = page.locator('#agree-terms');
   * await webActions.checkCheckbox(termsCheckbox);
   */
  async checkCheckbox(locator: Locator): Promise<void> {
    await locator.check();
  }

  /**
   * Ensure a checkbox is unchecked. If it is already unchecked, this is a no-op.
   *
   * @param locator - Locator targeting the `<input type="checkbox">` element.
   *
   * @example
   * const newsletterCheckbox = page.locator('#newsletter');
   * await webActions.uncheckCheckbox(newsletterCheckbox);
   */
  async uncheckCheckbox(locator: Locator): Promise<void> {
    await locator.uncheck();
  }

  /**
   * Drag the source element and drop it onto the target element.
   * Uses Playwright's built-in `dragTo` which handles pointer events correctly.
   *
   * @param source - Locator for the element to drag.
   * @param target - Locator for the drop destination element.
   *
   * @example
   * const card = page.locator('.kanban-card').first();
   * const column = page.locator('.kanban-column[data-status="done"]');
   * await webActions.dragAndDrop(card, column);
   */
  async dragAndDrop(source: Locator, target: Locator): Promise<void> {
    await source.dragTo(target);
  }

  /**
   * Hover the mouse cursor over an element, triggering CSS `:hover` states
   * and any JavaScript `mouseover` / `mouseenter` event handlers.
   *
   * @param locator - Locator targeting the element to hover over.
   *
   * @example
   * const menuItem = page.locator('nav .products-menu');
   * await webActions.hoverElement(menuItem); // reveals sub-menu
   */
  async hoverElement(locator: Locator): Promise<void> {
    await locator.hover();
  }

  /**
   * Double-click an element (fires `dblclick` event).
   * Commonly used to open edit mode in inline-editable cells or widgets.
   *
   * @param locator - Locator targeting the element to double-click.
   *
   * @example
   * const cell = page.locator('td.editable').first();
   * await webActions.doubleClick(cell); // activates inline editor
   */
  async doubleClick(locator: Locator): Promise<void> {
    await locator.dblclick();
  }

  /**
   * Right-click an element to open its context menu.
   *
   * @param locator - Locator targeting the element to right-click.
   *
   * @example
   * const file = page.locator('.file-item').first();
   * await webActions.rightClick(file); // opens context menu
   */
  async rightClick(locator: Locator): Promise<void> {
    await locator.click({ button: 'right' });
  }

  /**
   * Clear an input field's current value and type new text.
   * Prefer this over `fill()` alone when the field has sticky placeholder
   * behaviour or event listeners that react to change events.
   *
   * @param locator - Locator targeting the input or textarea element.
   * @param text    - New text value to type into the field.
   *
   * @example
   * const searchBox = page.locator('input[name="search"]');
   * await webActions.clearAndType(searchBox, 'playwright automation');
   */
  async clearAndType(locator: Locator, text: string): Promise<void> {
    await locator.clear();
    await locator.fill(text);
  }

  /**
   * Wait for an element to become visible and then click it.
   * Combines `waitForElement` + `click` into a single convenience call.
   *
   * @param locator - Locator targeting the element to wait for and click.
   * @param timeout - Max time in ms to wait for visibility before throwing.
   *                  Defaults to Playwright's built-in action timeout.
   *
   * @example
   * const saveButton = page.locator('button#save');
   * await webActions.waitAndClick(saveButton);
   * await webActions.waitAndClick(saveButton, 10000); // with custom timeout
   */
  async waitAndClick(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click();
  }

  /**
   * Register a one-time listener for a browser dialog (alert / confirm / prompt)
   * and either accept or dismiss it.  **Must be called before the action that
   * triggers the dialog** since dialogs fire synchronously.
   *
   * @param action - `'accept'` to click OK / Confirm, `'dismiss'` to click Cancel.
   * @returns The dialog message text (useful for assertions).
   *
   * @example
   * // Register handler BEFORE clicking the button that triggers the alert
   * const handleAlertPromise = webActions.handleAlert('accept');
   * await page.locator('button#delete').click();
   * const message = await handleAlertPromise;
   * expect(message).toBe('Are you sure you want to delete?');
   */
  async handleAlert(action: 'accept' | 'dismiss'): Promise<string> {
    return new Promise((resolve,reject) => {
      this.page.once('dialog', async (dialog) => {
        try{
          const message = dialog.message();
          if(action === 'accept'){
            await dialog.accept();
          } else{
            await dialog.dismiss();
          }
          resolve(message);
        } catch(error){
          reject(error);
        }
      });
    });
  }

  /**
   * Return a `FrameLocator` for working inside an `<iframe>`.
   * All subsequent locator calls on the returned object are scoped to that frame.
   *
   * @param frameLocator - CSS selector or name of the `<iframe>` element.
   * @returns A Playwright `FrameLocator` scoped to the matching iframe.
   *
   * @example
   * const frame = webActions.switchToFrame('iframe#payment-form');
   * await frame.locator('input#card-number').fill('4111111111111111');
   */
  switchToFrame(frameLocator: string) {
    return this.page.frameLocator(frameLocator);
  }

  /**
   * Count the number of elements matched by a locator.
   *
   * @param locator - Locator whose matches should be counted.
   * @returns Number of matching DOM elements (0 if none found).
   *
   * @example
   * const rows = page.locator('table tbody tr');
   * const count = await webActions.getElementCount(rows);
   * expect(count).toBeGreaterThan(0);
   */
  async getElementCount(locator: Locator): Promise<number> {
    return await locator.count();
  }
}
