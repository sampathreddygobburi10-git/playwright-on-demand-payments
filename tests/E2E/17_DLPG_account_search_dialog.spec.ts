import { test, expect } from '../../fixtures';
import { endpoints, waitForResponse } from '../../network/odc-mocks';

test.describe('DLPG grid — account search dialog @deployTests @odc', () => {
  let sharedGlResp: Awaited<ReturnType<typeof waitForResponse>>;

  test.beforeEach(async ({ page, odcPage }) => {
    [, sharedGlResp] = await Promise.all([
      waitForResponse(page, endpoints.onDemandCheckInitialization),
      waitForResponse(page, endpoints.glCOACall),
      odcPage.gotoOdc(),
    ]);
  });

  test('MODDWTC-2728 || select payee type from dropdown using mouse', async ({ page, odcPage }) => {
    await odcPage.getAccountSearchIcon('0').click();
    await odcPage.byTestId('account-type-input-input-input-field').click();
    await odcPage.byTestId('account-type-input-menu-list-item-8').click();
    await odcPage.byTestId('control-type-input-input-input-field').click();
    await odcPage.byTestId('control-type-input-menu-list-item-0-checkbox').click();
    await odcPage.getFirstAccountDataRadioButtons().first().click();
    await odcPage.getAccountSelectButton().click();
    expect(await odcPage.getAccountCell().inputValue()).not.toBe('');
  });

  test('MODDWTC-9481 || store should be auto selected in the DLPG', async ({ page, odcPage }) => {
    const gl = (await sharedGlResp.json()) as Array<unknown>;
    test.skip(!gl.length, 'No GL accounts in this environment');
    // accounting group picker only exists when grouping flag is on; fall back to store picker
    const accountingPicker = odcPage.getAccountingGroupPicker();
    const hasAccountingPicker = await accountingPicker.isVisible({ timeout: 5000 }).catch(() => false);
    const picker = hasAccountingPicker ? accountingPicker : odcPage.getStorePicker();
    await expect(picker).toBeVisible();
    const storeValue = await picker.inputValue();
    expect(storeValue.trim()).not.toBe('');
  });

  test('MODDWTC-2728 || select payee type from dropdown using keyboard', async ({ page, odcPage }) => {
    const gl = (await sharedGlResp.json()) as Array<Record<string, string>>;
    await odcPage.getAccountSearchIcon('0').click();
    await page.keyboard.press('Tab');
    await odcPage.getAccountDropdownInput().press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await odcPage.getControlDropdownInput().press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(odcPage.getFirstAccountRadioButton(gl[0].accountNumber)).toBeVisible();
    await odcPage.getFirstAccountRadioButton(gl[0].accountNumber).click();
    await odcPage.getAccountSelectButton().click({ force: true });
    expect(await odcPage.getAccountCell().inputValue()).not.toBe('');
  });

  test('MODDWTC-3010 || radio should stay checked after search', async ({ odcPage }) => {
    const gl = (await sharedGlResp.json()) as Array<Record<string, string>>;
    await odcPage.getAccountSearchIcon('0').click();
    await odcPage.getControlDropdownInput().click();
    await odcPage.getControlDropdownData('0').click();
    await odcPage.getFirstAccountRadioButton(gl[0].accountNumber).click({ force: true });
    await expect(odcPage.getFirstAccountRadioButton(gl[0].accountNumber)).toBeChecked();
  });
});