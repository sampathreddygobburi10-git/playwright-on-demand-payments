import { test, expect } from '../../fixtures';
import { endpoints, waitForResponse } from '../../network/odc-mocks';
import { mockPayeeSearch } from '../../utils/payeeMock';
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
  
  test(
  'MODDWTC-13602 || should print ODC check when payee display and company names are empty',
  async ({ page, odcPage }) => {
    const initBody = await sharedInitResp.json();

    const glCoaBody =
      (await sharedGlResp.json()) as Array<Record<string, string>>;

    const paymentDate = getRandomPaymentDate(initBody);

    await mockPayeeSearch(
      page,
      'payee-empty-name.json',
    );

    await expect(odcPage.accountingRadio()).toBeChecked();

    await odcPage.expectAccountingGroupLoaded();


    await odcPage.getDatePickerInput().fill(paymentDate);

    await odcPage.getDatePickerInput().blur();
 
    await odcPage.getPayeeTypeField().click();

    await odcPage.getPayeeTypeMenuItem(1).click();

    await expect(
      odcPage.getPayeeTypeField(),
    ).toHaveValue('Vendor');

    await odcPage.getPayeeNameTypeaheadField().click();

    await odcPage.getPayeeSearchButton().click();

    await odcPage.getPayeeTypeMenuButton().click();

    await odcPage.getVendorTypeMenuButton().click();

    await odcPage
      .getPayeeTypeSearchInput()
      .fill('CHK-AUTO4');

    const [payeeResponse] = await Promise.all([
      waitForResponse(page, endpoints.controlSearchVendors),
      odcPage.getPayeeSearchQueryButton().click(),
    ]);

    const payees = await payeeResponse.json();
    expect(payees).toEqual([
      expect.objectContaining({
        id: 'CHK-AUTO4',
        name: { display: '', company: '' },
      }),
    ]);

    await odcPage
      .getFirstControlRadioButton('CHK-AUTO4')
      .click();

    await odcPage.getPayeeSelectButton().click();

    await expect(
      odcPage.getPayeeNameTypeaheadField(),
    ).toHaveValue('CHK-AUTO4');

    await expect(
      odcPage.getPayeeName2Field(),
    ).toHaveValue('');

    await expect(
      odcPage.getAddressLine1(),
    ).toHaveValue('');

    await expect(
      odcPage.getAddressLine2(),
    ).toHaveValue('');

    await expect(
      odcPage.getCity(),
    ).toHaveValue('');

    await expect(
      odcPage.getState(),
    ).toHaveValue('');

    await expect(
      odcPage.getZipCode(),
    ).toHaveValue('');

    await odcPage
      .inputField('check-memo-input')
      .fill('test check memo');

    await odcPage.getAmountField(0).click();

    await odcPage
      .getAmountField(0)
      .fill('1345.');

    await odcPage
      .getAmountField(0)
      .press('Tab');

    await odcPage
      .inputField('journal-number-input')
      .clear();

    await odcPage
      .inputField('journal-number-input')
      .fill('70');

    await odcPage
      .inputField('journal-number-input')
      .press('Enter');

    const cashInput = odcPage.inputField(
      'cash-account-input',
    );

    await cashInput.scrollIntoViewIfNeeded();

    await cashInput.click();

    await odcPage
      .inputField('posting-description-input')
      .fill('test posting description');

    await expect(
      odcPage.inputField('control-check-no-input'),
    ).toBeDisabled();

    await expect(
      odcPage.inputField('control-check-no-input'),
    ).toHaveValue('To be assigned');

    const idx = Math.max(
      0,
      glCoaBody.findIndex(
        (account) =>
          account.controlTypeCode === '0' &&
          account.controlType2Code === '0',
      ),
    );

    await odcPage
      .getAccountSearchIcon('0')
      .click();

    await odcPage
      .getFirstAccountDataRadioButtons()
      .nth(idx)
      .click();

    await odcPage
      .getAccountSelectButton()
      .click();

    await odcPage
      .getAmountCell(0)
      .click();

    await odcPage
      .getAmountCell(0)
      .fill('1345.00');

    await odcPage
      .getAmountCell(0)
      .blur();

    await odcPage
      .getCountCell(0)
      .click();

    await odcPage
      .getCountCell(0)
      .pressSequentially('2');

    await odcPage
      .getCountCell(0)
      .blur();

    await odcPage
      .getControlSearchButton(0)
      .click();

    await odcPage
      .getControlSearchInput()
      .click();

    await odcPage
      .getVendorControlSearch()
      .click();

    await odcPage
      .getControlSearchField()
      .fill('CHK-AUTO4');

    await odcPage
      .getSelectControlByRadio('CHK-AUTO4')
      .click();

    await odcPage
      .getControlSelectButton()
      .click();

    await odcPage
      .getDescriptionCell(0)
      .fill('CHK-AUTO4');

    await odcPage
      .getDescriptionCell(0)
      .blur();

    await expect(
      odcPage.getODCPrintCheckButton(),
    ).toBeVisible();

    await odcPage.getPrintButton().click();

    const [printRequest, printResponse] =
      await Promise.all([
        page.waitForRequest(
          (request) =>
            endpoints.printODCCheck.test(request.url()) &&
            request.method() === 'POST',
        ),

        page.waitForResponse(
          (response) =>
            endpoints.printODCCheck.test(response.url()) &&
            response.request().method() ===
              'POST',
        ),

        odcPage
          .getCheckSequenceDialogPrintCheckButton()
          .click(),
      ]);


    const printPayload =
      printRequest.postDataJSON();

    expect(printPayload.payee).toBeDefined();

    expect(printPayload.payee.id).toBe(
      'CHK-AUTO4',
    );

    expect(printPayload.payee.name).toBe(
      'CHK-AUTO4',
    );

    expect(printPayload.payee.name).not.toBe('');

    expect(printResponse.status()).toBe(200);
  },
);
});