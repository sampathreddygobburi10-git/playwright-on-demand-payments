import { test, expect } from '../../fixtures';
import { endpoints, waitForResponse } from '../../network/odc-mocks';
import { HarnessFlags } from '../../utils/harness-flags';
import type { OnDemandCheckPage } from '../../pages/on-demand-check.page';
import type { Locator, Page } from '@playwright/test';

const TEN_KEY_FLAGS = {
  dms_accounting_odp_10_key: true,
  dms_accounting_odp_ten_key_fix: true,
  dms_accounting_odp_new_dlpg: true
};

const openOdc = async (
  page: Page,
  odcPage: OnDemandCheckPage,
  flags: Record<string, boolean> = {}
): Promise<void> => {
  await HarnessFlags.set(page, { ...TEN_KEY_FLAGS, ...flags });
  await Promise.all([
    waitForResponse(page, endpoints.onDemandCheckInitialization),
    waitForResponse(page, endpoints.glCOACall),
    odcPage.gotoOdc()
  ]);
  await odcPage.expectAccountingGroupLoaded();
};

const tenter = async (page: Page, field: Locator): Promise<void> => {
  await field.click();
  await page.keyboard.press('NumpadEnter');
};

const CURRENCY_INPUT_SELECT_DELAY_MS = 150;

const expectAmountFocused = async (
  page: Page,
  field: Locator
): Promise<void> => {
  await expect(field).toBeFocused();
  await page.waitForTimeout(CURRENCY_INPUT_SELECT_DELAY_MS);
};

const typeAmount = async (
  page: Page,
  field: Locator,
  amount: string
): Promise<void> => {
  await field.click();
  await expectAmountFocused(page, field);
  await field.pressSequentially(amount);
};

test.describe('10-key (NumpadEnter) navigation @odc', () => {
  test('MODDWTC-8011 || Should focus shift to Payment date field when 10key ENTER is triggered in the Store dropdown', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await odcPage.getStorePicker().focus();
    await page.keyboard.press('NumpadEnter');

    await expect(odcPage.getDatePickerInput()).toBeFocused();
  });

  test('MODDWTC-8011 || Should move focus from Payment Date to Payee Type without submitting the form when NumpadEnter key is pressed', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await odcPage.getStorePicker().focus();
    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.getDatePickerInput()).toBeFocused();

    await page.keyboard.press('NumpadEnter');

    await expect(odcPage.getPayeeTypeField()).toBeFocused();
    await expect(
      page.getByText('Please correct the errors below.')
    ).toHaveCount(0);
  });

  test('MODDWTC-8013 || Should focus shift to next input field when 10key ENTER is triggered in the current input field', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage, { dms_accounting_payments_grouping: false });

    await tenter(page, odcPage.inputField('check-memo-input'));
    await expect(odcPage.inputField('journal-number-input')).toBeFocused();

    await tenter(page, odcPage.inputField('cash-account-input'));
    await expect(odcPage.inputField('control2-input')).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.inputField('posting-description-input')).toBeFocused();
  });

  test('MODDWTC-8013 || Should move focus from Posting Description into the DLPG grid when NumpadEnter key is pressed', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await tenter(page, odcPage.inputField('posting-description-input'));

    await expect(
      page.locator('.ag-cell[col-id="store"] input').first()
    ).toBeFocused();

    await page.keyboard.press('NumpadEnter');

    await expect(odcPage.getAccountCell().first()).toBeFocused();
    await expect(odcPage.getStorePicker()).not.toBeFocused();
  });

  test('MODDWTC-8013 || Should start editing the first DLPG row when NumpadEnter key is pressed in Posting Description while the row is not in edit mode', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await odcPage.getAccountCell().first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.ag-row-editing')).toHaveCount(0);

    await tenter(page, odcPage.inputField('posting-description-input'));

    await expect(page.locator('.ag-row-editing')).toHaveCount(1);
    await expect(
      page.locator('.ag-cell[col-id="store"] input').first()
    ).toBeFocused();
  });

  test('MODDWTC-8052 || Should shift focus from amount field to description field and from description field to check memo field on NumpadEnter key is pressed when both amount and description is empty', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await odcPage.getAmountField(0).click();
    await expectAmountFocused(page, odcPage.getAmountField(0));
    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.inputField('odc-amount-description-0')).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.inputField('check-memo-input')).toBeFocused();
  });

  test('MODDWTC-8052 || Should focus shift to next input field when 10key ENTER is triggered in the multiline amount input field', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await typeAmount(page, odcPage.getAmountField(0), '100');
    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.inputField('odc-amount-description-0')).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.getAmountField(1)).toBeFocused();
  });

  test('MODDWTC-8052 || Should remove newly added multiline amounts when NumpadEnter key is pressed in description field when both amount field or description fields are empty', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await typeAmount(page, odcPage.getAmountField(0), '100');
    await page.keyboard.press('NumpadEnter');
    await page.keyboard.press('NumpadEnter');
    await expectAmountFocused(page, odcPage.getAmountField(1));

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.inputField('odc-amount-description-1')).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.getAmountField(1)).toHaveCount(0);
    await expect(odcPage.inputField('check-memo-input')).toBeFocused();
  });

  test('MODDWTC-8052 | MODDWTC-9345 || Should user traverse through the DLPG fields using NumpadEnter key', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage, { dms_accounting_payments_grouping: false });

    const storeCell = page.getByTestId('store-search-menu-input-field').first();

    await storeCell.click();
    await expect(storeCell).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.getAccountCell().first()).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.getAmountCell(0)).toBeFocused();

    await odcPage.getAmountCell(0).pressSequentially('123.45');
    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.getControlCell().first()).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.inputField('control2-input-0')).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.getDescriptionCell(0)).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.getCountCell(0)).toBeFocused();
  });

  test('MODDWTC-8052 || Should focus move to store input field when NumpadEnter key is pressed in the page load', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await expect
      .poll(() => page.evaluate(() => document.activeElement?.tagName))
      .toBe('BODY');
    await page.keyboard.press('NumpadEnter');

    await expect(odcPage.getStorePicker()).toBeFocused();
  });

  test('MODDWTC-8052 || Should focus move to amount input field when NumpadEnter key is pressed in the payee search field after >=3 characters entered', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await odcPage.getPayeeNameTypeaheadField().fill('test');
    await tenter(page, odcPage.getPayeeNameTypeaheadField());

    await expect(odcPage.getAmountField(0)).toBeFocused();
  });

  test('MODDWTC-8052 || Should move focus to description field when NumpadEnter key is pressed in Amount field when multiple multiline amounts present', async ({
    page,
    odcPage
  }) => {
    await openOdc(page, odcPage);

    await typeAmount(page, odcPage.getAmountField(0), '100');
    await page.keyboard.press('NumpadEnter');
    await page.keyboard.press('NumpadEnter');
    await expectAmountFocused(page, odcPage.getAmountField(1));

    await tenter(page, odcPage.getZipCode());
    await expectAmountFocused(page, odcPage.getAmountField(0));

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.inputField('odc-amount-description-0')).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expectAmountFocused(page, odcPage.getAmountField(1));

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.inputField('odc-amount-description-1')).toBeFocused();

    await page.keyboard.press('NumpadEnter');
    await expect(odcPage.inputField('check-memo-input')).toBeFocused();
  });
});
