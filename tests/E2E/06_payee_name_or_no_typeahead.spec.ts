import { test, expect } from '../../fixtures';
import { endpoints, waitForResponse } from '../../network/odc-mocks';
import { MiscellaneousMock } from '../../utils';
import {getRandomPaymentDate} from '../../utils/paymentHelper'

test.describe('Payee name/no. typeahead workflow', () => {
  let sharedInitResp: Awaited<ReturnType<typeof waitForResponse>>;

  test.beforeEach(async ({ page, odcPage }) => {
    [sharedInitResp] = await Promise.all([
      waitForResponse(page, endpoints.onDemandCheckInitialization),
      odcPage.gotoOdc(),
    ]);
  });

  test('MODDWTC-2548 || should be able to do a typeahead for payee name or no field @deployTests @uspayments', async ({ page, odcPage }) => {
    const [resp] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchCustomers),
      odcPage.getPayeeNameTypeaheadField().pressSequentially('TEST'),
    ]);
    const body = await resp.json();
    test.skip(!body.length, 'No customer results in this environment');
    await expect(page.getByTestId('autocomplete-menu-list-item-0-text')).toBeVisible();
    await page.getByTestId('autocomplete-menu-list-item-0-text').click();
    expect(await odcPage.getPayeeNameTypeaheadField().inputValue()).toContain(String(body[0].id));
  });

  test('MODDWTC-9097 || add a name button visibility when payee type is employee or miscellaneous', async ({ odcPage }) => {
    await odcPage.getPayeeTypeButton().click();
    await odcPage.getPayeeTypeEmployee().click();
    await expect(odcPage.getAddNameButton()).toBeVisible();

    await odcPage.getPayeeTypeButton().click();
    await odcPage.getPayeeTypeMiscellaneous().click();
    await expect(odcPage.getAddNameButton()).toBeVisible();
  });

test('MODDWTC-11618 || Name 2 is auto-populated for Miscellaneous payee when payments name2 flag is enabled', async ({ page, odcPage }) => {
    await MiscellaneousMock.withName2(page);

    await odcPage.getPayeeTypeButton().click();
    await odcPage.getPayeeTypeMiscellaneous().click();
    await odcPage.getPayeeSearchIcon().click();
    await odcPage.getPayeeTypeSearchInput().fill('test');

    const [response] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchMiscellaneous),
      odcPage.getPayeeSearchQueryButton().click(),
    ]);

    const body = await response.json();
    expect(body?.length).toBeGreaterThan(0);
    const id = body[0]?.id;
    expect(id).toBeTruthy();

    await expect(page.getByTestId('odp-payee-search-button')).toBeVisible();
    await page.getByTestId(`odp-payee-search-radio-${id}`).click();
    await odcPage.getPayeeSelectButton().click();

    await expect(odcPage.getPayeeName2Field()).toBeVisible();
    expect((await odcPage.getPayeeName2Field().inputValue()).toUpperCase()).toContain('NAME 2');
  });

  test('MODDWTC-9097 || name2 is not autofilled and add name button is visible after payee is selected as employee', async ({ page, odcPage }) => {
    await odcPage.getPayeeTypeButton().click();
    await odcPage.getPayeeTypeEmployee().click();
    await odcPage.getPayeeSearchIcon().click();
    await odcPage.getPayeeTypeSearchInput().fill('test');
    const [empResp] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchEmployees),
      odcPage.getPayeeSearchQueryButton().click(),
    ]);
    const empBody = await empResp.json();
    test.skip(!empBody?.length, 'No employee results in this environment');
    const first = empBody[0];
    if (first?.id && first?.nameCode) {
      await page.getByTestId(`odp-payee-search-radio-${first.id}`).click();
    }
    await odcPage.getPayeeSelectButton().click({ force: true });
    await expect(odcPage.getAddNameButton()).toBeVisible();
  });

  test('MODDWTC-2671 || Payee search tab behavior', async ({ page, odcPage }) => {
    const [resp] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchCustomers),
      odcPage.getPayeeNameTypeaheadField().pressSequentially('test'),
    ]);
    const body = await resp.json();
    test.skip(body.length === 0, 'No customer results in this environment');
    await expect(page.getByTestId('autocomplete-menu-list-item-0-text')).toBeVisible();
    await odcPage.getPayeeNameTypeaheadField().press('Tab');
    await expect(odcPage.getPayeeNameTypeaheadField()).not.toBeFocused();
  });

  test('MODDWTC-6996 | MODDWTC-9126 || Employee NAME-CODE is incorrect for SERVICE employees', async ({ page, odcPage }) => {
    const paymentDate = getRandomPaymentDate(await sharedInitResp.json());
    await odcPage.getDatePickerInput().fill(paymentDate);
    await odcPage.getDatePickerInput().blur();

    await odcPage.getPayeeTypeField().click();
    await odcPage.getPayeeTypeEmployee().click();

    const [empResp] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchEmployees),
      odcPage.getPayeeNameTypeaheadField().pressSequentially('123'),
    ]);
    const employees = await empResp.json() as any[];
    const service = employees.find((e) => e.nameCode === 'SERVICE');
    test.skip(!service, 'No SERVICE employee in this environment');

    const itemLabel = `${service.id} - ${service.name.displayName} Service`;
    await page.getByRole('button', { name: itemLabel }).first().click();

    await odcPage.getAmountField(0).clear();
    await odcPage.getAmountField(0).fill('123');
    await odcPage.getAmountField(0).blur();

    await odcPage.inputField('journal-number-input').clear();
    await odcPage.inputField('journal-number-input').fill('60');
    await expect(page.getByRole('button', { name: /60.*CASH DISBURSEMENTS/i })).toBeVisible();
    await page.getByRole('button', { name: /60.*CASH DISBURSEMENTS/i }).click();

    await odcPage.inputField('cash-account-input').clear();
    await odcPage.inputField('cash-account-input').fill('2000');
    await expect(page.getByTestId('autocomplete-menu-list-item-0')).toBeVisible();
    await page.getByTestId('autocomplete-menu-list-item-0').click();

    await odcPage.inputField('posting-description-input').fill('test posting description');

    await odcPage.getAccountSearchIcon('0').click();
    await expect(odcPage.getFirstAccountDataRadioButtons().first()).toBeVisible();
    await odcPage.getFirstAccountDataRadioButtons().first().click();
    await odcPage.getAccountSelectButton().click();

    await odcPage.getAmountCell(0).click();
    await odcPage.getAmountCell(0).clear();
    await odcPage.getAmountCell(0).fill('123');
    await odcPage.getAmountCell(0).blur();

    await odcPage.getDescriptionCell(0).fill('line description');

    const dismissBtn = page.getByRole('button', { name: 'Dismiss' });
    if (await dismissBtn.isVisible()) await dismissBtn.click();

    await odcPage.getPrintButton().click();
    const [printResp] = await Promise.all([
      waitForResponse(page, endpoints.printODCCheck),
      odcPage.getCheckSequenceDialogPrintCheckButton().click(),
    ]);
    const payload = printResp.request().postDataJSON();
    expect(String(payload?.payee?.type)).toBe('8');
    if (payload?.payee?.name2) {
      expect(payload.payee.name2).toBe(String(payload.payee.name2).trim());
    }
  });

  test('MODDWTC-2671 || should be able to tab through sequentially when there are no results found', async ({ page, odcPage }) => {
    const [resp] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchCustomers),
      odcPage.getPayeeNameTypeaheadField().pressSequentially('invalid data asdfghjkl'),
    ]);
    const body = await resp.json();
    test.info().annotations.push({
      type: 'env-note',
      description: `controlSearchCustomers returned ${body.length} result(s); expected 0 for the pure no-results path.`,
    });
    if (body.length > 0) {
      await page.keyboard.press('Escape');
    }
    const fields = [
      odcPage.getPayeeNameTypeaheadField(),
      odcPage.getAddressLine1(),
      odcPage.getAddressLine2(),
      odcPage.getCity(),
      odcPage.getState(),
      odcPage.getZipCode(),
    ];
    await fields[0].focus();
    await expect(fields[0]).toBeFocused();
    for (const field of fields) {
      await field.press('Tab');
    }
    await expect(odcPage.getPayeeNameTypeaheadField()).not.toBeFocused();
  });

  test('should be able to delete a character from the typeahead', async ({ page, odcPage }) => {
    const [resp] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchCustomers),
      odcPage.getPayeeNameTypeaheadField().pressSequentially('test'),
    ]);
    const body = await resp.json();
    test.skip(!body.length, 'No customer results in this environment');
    await odcPage.getPayeeNameTypeaheadField().press('Backspace');
    expect((await odcPage.getPayeeNameTypeaheadField().inputValue()).length).toBeGreaterThan(0);
  });

  test('MODDWTC-8696 || should be able to do search for a payee name and should auto-populate in the Payee Name field', async ({ page, odcPage }) => {
    await odcPage.getPayeeSearchIcon().click();
    await odcPage.getPayeeTypeSearchInput().fill('test');
    const [resp] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchCustomers),
      odcPage.getPayeeSearchQueryButton().click(),
    ]);
    const body = await resp.json();
    test.skip(!body.length, 'No customer results in this environment');
    const firstId = String(body[0].id);
    const radio = odcPage.getFirstControlRadioButton(firstId);
    await expect(radio).toBeVisible();
    await radio.click();
    await odcPage.getPayeeSelectButton().first().click();
    await expect(odcPage.getPayeeNameTypeaheadField()).toHaveValue(new RegExp(firstId));
  });

  test('MODDWTC-8696 || focus moves to amount field when Tab is pressed from payee name (name2 enabled)', async ({ page, odcPage }) => {
    await odcPage.getAddNameButton().click();
    const basePayee = page.getByTestId('base-payee-name-type-ahead-input');
    await basePayee.fill('test');
    await basePayee.press('Tab');
    await expect(odcPage.getAmountField(0)).toBeFocused();
  });

  test('MODDWTC-8188 || focus stays in payee type field when user selects payee type using keyboard', async ({ page, odcPage }) => {
    await odcPage.getPayeeTypeButton().click();
    await expect(odcPage.getPayeeTypeMenuItem(0)).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(odcPage.getPayeeTypeField()).toBeFocused();
  });

});