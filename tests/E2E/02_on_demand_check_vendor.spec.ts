import { test, expect } from '../../fixtures';
import { endpoints, waitForResponse } from '../../network/odc-mocks';
import { getRandomPaymentDate } from '../../utils/paymentHelper';

test.describe('This e2e workflow describes the workflow to print on demand checks', () => {
  let sharedInitResp: Awaited<ReturnType<typeof waitForResponse>>;
  let sharedGlResp: Awaited<ReturnType<typeof waitForResponse>>;

  test.beforeEach(async ({ page, odcPage }) => {
    [sharedInitResp, sharedGlResp] = await Promise.all([
      waitForResponse(page, endpoints.onDemandCheckInitialization),
      waitForResponse(page, endpoints.glCOACall),
      odcPage.gotoOdc(),
    ]);
  });
  
  test('should be able to write a odc check for vendor payee type @deployTests @odc', async ({ page, odcPage }) => {
    const initBody = await sharedInitResp.json();
    const glCoaBody = (await sharedGlResp.json()) as Array<Record<string, string>>;

    const paymentDate = getRandomPaymentDate(initBody);
    await expect(odcPage.accountingRadio()).toBeChecked();
    await odcPage.expectAccountingGroupLoaded();
    await odcPage.getDatePickerInput().fill(paymentDate);
    await odcPage.getDatePickerInput().blur();

    await odcPage.getPayeeTypeField().click();
    await odcPage.getPayeeTypeMenuItem(1).click();
    await expect(odcPage.getPayeeTypeField()).toHaveValue('Vendor');

    await odcPage.getPayeeNameTypeaheadField().click();
    await odcPage.getPayeeSearchButton().click();
    await odcPage.getPayeeTypeMenuButton().click();
    await odcPage.getVendorTypeMenuButton().click();
    await odcPage.getPayeeTypeSearchInput().fill('CHK-AUTO1');

    const [vendorResp] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchVendors),
      odcPage.getPayeeSearchQueryButton().click(),
    ]);
    const vendorSearchDetails = await vendorResp.json();
    const firstVendor = vendorSearchDetails[0];

    await odcPage.getFirstControlRadioButton(firstVendor.id).click();
    await odcPage.getPayeeSelectButton().click();

    const expectedPayeeValue = firstVendor.name?.display
      ? `${firstVendor.id} - ${firstVendor.name.display}`
      : firstVendor.id;
    await expect(odcPage.getPayeeNameTypeaheadField()).toHaveValue(expectedPayeeValue);
    await expect(odcPage.getPayeeName2Field()).toHaveValue(firstVendor.name2?.display ?? '');
    await expect(odcPage.getAddressLine1()).toHaveValue(firstVendor.address?.line1 ?? '');
    await expect(odcPage.getAddressLine2()).toHaveValue(firstVendor.address?.line2  ?? '');
    await expect(odcPage.getCity()).toHaveValue(firstVendor.address?.city ?? '');
    await expect(odcPage.getState()).toHaveValue(firstVendor.address?.state ?? '');
    await expect(odcPage.getZipCode()).toHaveValue(firstVendor.address?.postalCode ?? '');

    await odcPage.getAmountField(0).click();
    await odcPage.getAmountField(0).pressSequentially('0');
    await odcPage.getAccountCell().click();

    await expect(odcPage.getODCPrintCheckButton()).toBeVisible();
    await odcPage.getPrintButton().click();
    await expect(page.getByText('Account is required.')).toBeVisible();
    if (await odcPage.getToastDismissButton().isVisible({ timeout: 5000 }).catch(() => false)) {
      await odcPage.getToastDismissButton().click();
    }

    await odcPage.inputField('check-memo-input').fill('test check memo');
    await odcPage.getAmountField(0).click();
    await odcPage.getAmountField(0).fill('1345.');
    await odcPage.getAmountField(0).press('Tab');
    await odcPage.inputField('journal-number-input').clear();
    await odcPage.inputField('journal-number-input').fill('70');
    await odcPage.inputField('journal-number-input').press('Enter');
    const cashInput = odcPage.inputField('cash-account-input');
    await cashInput.scrollIntoViewIfNeeded();
    await cashInput.click();
    await odcPage.inputField('posting-description-input').fill('test posting description');

    await expect(odcPage.inputField('control-check-no-input')).toBeDisabled();
    await expect(odcPage.inputField('control-check-no-input')).toHaveValue('To be assigned');

    await odcPage.getPrintButton().click();
    await expect(page.getByText('Account is required.')).toBeVisible();
    await odcPage.getToastDismissButton().click();

    const idx = Math.max(
      0,
      glCoaBody.findIndex((a) => a.controlTypeCode === '0' && a.controlType2Code === '0'),
    );
    await page.getByText('Account is required').click();
    await odcPage.getAccountSearchIcon('0').click();
    await odcPage.getFirstAccountDataRadioButtons().nth(idx).click();
    await odcPage.getAccountSelectButton().click();

    await odcPage.getAmountCell(0).click();
    await odcPage.getAmountCell(0).fill('1345.00');
    await odcPage.getAmountCell(0).blur();
    await odcPage.getCountCell(0).click();
    await odcPage.getCountCell(0).pressSequentially('2');
    await odcPage.getCountCell(0).blur();

    await odcPage.getControlSearchButton(0).click();
    await odcPage.getControlSearchInput().click();
    await odcPage.getVendorControlSearch().click();
    await odcPage.getControlSearchField().fill('CHK-AUTO1');
    await odcPage.getSelectControlByRadio(firstVendor.id).click();
    await odcPage.getControlSelectButton().click();

    await odcPage.getDescriptionCell(0).fill('CHK-AUTO1');
    await odcPage.getDescriptionCell(0).blur();

    await expect(odcPage.getODCPrintCheckButton()).toBeVisible();

    await page.getByText('Dismiss').click();
    await odcPage.getPrintButton().click();
    const [printResp] = await Promise.all([
       waitForResponse(page,endpoints.printODCCheck),
       odcPage.getCheckSequenceDialogPrintCheckButton().click(),
    ]);
    expect(printResp.status()).toBe(200);
  });

  test('MODDWTC-1832 || description should only allow 110 characters', async ({  odcPage }) => {
    const desc = odcPage.getDescriptionField(0);
    const overLimitDescription = 'x'.repeat(111);
    await desc.fill(overLimitDescription);
    await desc.blur();
    await expect(desc).toHaveValue('x'.repeat(110));
  });

  test('MODDWTC-8503 || Update app-dms-on-demand-payments to use new JWT and new ISTIO routing URLs', async () => {
    expect(sharedInitResp.request().url()).toContain('-jwt.');
    expect(sharedGlResp.request().url()).toContain('-jwt.');
  });

  test('MODDWTC-1550 | MODDWTC-11059 || Void ODC check', async ({ page, odcPage }) => {
    const initBody = await sharedInitResp.json();
    const glCoaBody = (await sharedGlResp.json()) as Array<Record<string, string>>;
    const paymentDate = getRandomPaymentDate(initBody);

    await expect(odcPage.accountingRadio()).toBeChecked();
    await odcPage.expectAccountingGroupLoaded();
    await odcPage.getDatePickerInput().fill(paymentDate);
    await odcPage.getDatePickerInput().blur();

    await odcPage.getPayeeTypeField().click();
    await odcPage.getPayeeTypeMenuItem(1).click();
    await expect(odcPage.getPayeeTypeField()).toHaveValue('Vendor');

    await odcPage.getPayeeNameTypeaheadField().click();
    await expect(odcPage.getPayeeSearchButton()).toBeVisible();
    await odcPage.getPayeeSearchButton().click();
    await odcPage.getPayeeTypeMenuButton().click();
    await odcPage.getVendorTypeMenuButton().click();
    await odcPage.getPayeeTypeSearchInput().fill('CHK-AUTO1');

    const [vendorResp] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchVendors),
      odcPage.getPayeeSearchQueryButton().click(),
    ]);
    const vendorSearchDetails = await vendorResp.json();
    const firstVendor = vendorSearchDetails[0];
    await odcPage.getFirstControlRadioButton(firstVendor.id).click();
    await expect(odcPage.getPayeeSelectButton()).toBeVisible();
    await odcPage.getPayeeSelectButton().click();

    const expectedPayeeValue = firstVendor.name?.display
      ? `${firstVendor.id} - ${firstVendor.name.display}`
      : firstVendor.id;
    await expect(odcPage.getPayeeNameTypeaheadField()).toHaveValue(expectedPayeeValue);
    if (firstVendor.name2 != null) {
      await expect(odcPage.getPayeeName2Field()).toHaveValue(firstVendor.name2?.display ?? '');
    }
    await expect(odcPage.getAddressLine1()).toHaveValue(firstVendor.address?.line1 ?? '');
    await expect(odcPage.getAddressLine2()).toHaveValue(firstVendor.address?.line2 ?? '');
    await expect(odcPage.getCity()).toHaveValue(firstVendor.address?.city ?? '');
    await expect(odcPage.getState()).toHaveValue(firstVendor.address?.state ?? '');
    await expect(odcPage.getZipCode()).toHaveValue(firstVendor.address?.postalCode ?? '');
    await expect(odcPage.getODCPrintCheckButton()).toBeVisible();
    await odcPage.getPrintButton().click();
    await expect(page.getByText('Amount is required')).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss' }).click();

    await odcPage.inputField('check-memo-input').fill('test check memo');
    await expect(odcPage.inputField('check-memo-input')).toHaveValue('test check memo');
    await odcPage.getAmountField(0).click();
    await odcPage.getAmountField(0).fill('1345.');
    await odcPage.getAmountField(0).press('Tab');
    await expect(odcPage.getODCPrintCheckButton()).toBeVisible();
    await odcPage.getODCPrintCheckButton().click();
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.getByRole('button', { name: 'Dismiss' })).toBeHidden();
    const journalInput = odcPage.inputField('journal-number-input');
    await journalInput.clear();
    await journalInput.fill('70');
    await journalInput.press('Enter');
    await expect(journalInput).toHaveValue(/^70 - /);
    const cashInput = odcPage.inputField('cash-account-input');
    await cashInput.scrollIntoViewIfNeeded();
    await cashInput.click();

    await odcPage.inputField('posting-description-input').fill('test posting description');
    await expect(odcPage.inputField('posting-description-input')).toHaveValue('test posting description');

    await expect(odcPage.inputField('control-check-no-input')).toBeDisabled();
    await expect(odcPage.inputField('control-check-no-input')).toHaveValue('To be assigned');
    await page.locator('.ag-row').first().locator('[col-id="account"]').click();

    const idx = Math.max(
      0,
      glCoaBody.findIndex((a) => a.controlTypeCode === '0' && a.controlType2Code === '0'),
    );
    await odcPage.getAccountSearchIcon('0').click();
    await odcPage.getFirstAccountDataRadioButtons().nth(idx).click();
    await odcPage.getAccountSelectButton().click();

    await odcPage.getAmountCell(0).clear();
    await odcPage.getAmountCell(0).fill('1345.00');
    await odcPage.getAmountCell(0).blur();
    await odcPage.getCountCell(0).clear();
    await odcPage.getCountCell(0).pressSequentially('2');
    await odcPage.getCountCell(0).blur();

    await expect(odcPage.getControlSearchButton(0)).toBeVisible();
    await odcPage.getControlSearchButton(0).click();
    await odcPage.getControlSearchInput().click();
    await odcPage.getVendorControlSearch().click();
    await odcPage.getControlSearchField().fill('CHK-AUTO1');
    await page.getByTestId('radio-select-control-for-CHK-AUTO1').click();
    await odcPage.getControlSelectButton().click();

    await odcPage.getDescriptionCell(0).fill('CHK-AUTO1');
    await odcPage.getDescriptionCell(0).blur();

    await expect(odcPage.getODCPrintCheckButton()).toBeVisible();
    const dismissBtn = page.getByRole('button', { name: 'Dismiss' });
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
    }
    await odcPage.getPrintButton().click();
    const [printResp] = await Promise.all([
      waitForResponse(page,endpoints.printODCCheck),
      odcPage.getCheckSequenceDialogPrintCheckButton().click(),
    ])

    if (printResp.status() === 200) {
      await odcPage.getPrintChecksDialogVoidButton().click();
      await expect(page.getByRole('heading', { name: 'Check Voided' })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Done' }).click();
  });
});
