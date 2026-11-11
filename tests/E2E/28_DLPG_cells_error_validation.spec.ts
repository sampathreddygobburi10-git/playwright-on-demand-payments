import { test, expect } from '../../fixtures';
import { endpoints, waitForResponse } from '../../network/odc-mocks';
import { getRandomPaymentDate } from '../../utils/paymentHelper';

test.describe('DLPG grid — control cell error validation @deployTests @odc', () => {
  let sharedInitResp: Awaited<ReturnType<typeof waitForResponse>>;
  let sharedGlResp: Awaited<ReturnType<typeof waitForResponse>>;

  test.beforeEach(async ({ page, odcPage }) => {
    [sharedInitResp, sharedGlResp] = await Promise.all([
      waitForResponse(page, endpoints.onDemandCheckInitialization),
      waitForResponse(page, endpoints.glCOACall),
      odcPage.gotoOdc(),
    ]);
  });

  test('MODDWTC-3079 || controlTypeCode 12 — required but not validated', async ({ page, odcPage }) => {
    const gl = (await sharedGlResp.json()) as Array<Record<string, string>>;
    const account12 = gl.find((a) => a.controlTypeCode === '12');
    test.skip(!account12, 'No GL account with controlTypeCode=12');

    await odcPage.getAccountCell().click();
    await odcPage.getAccountCell().fill(account12!.accountNumber);
    await expect(page.getByTestId('account-search-menu-list-item-0-text')).toBeVisible();
    await page.getByTestId('account-search-menu-list-item-0-text').click();
    await odcPage.getControlCell().focus();
    await odcPage.getControlCell().blur();
    await expect(odcPage.getControlError()).toContainText('Required, not validated');

    await odcPage.getControlCell().fill('test');
    await expect(odcPage.getControlError()).toHaveCount(0);
  });

  test('MODDWTC-4891 || controlTypeCode 10 — field shows "Check No. (To be assigned)"', async ({ page, odcPage }) => {
    const gl = (await sharedGlResp.json()) as Array<Record<string, string>>;
    const account10 = gl.find((a) => a.controlTypeCode === '10');
    test.skip(!account10, 'No GL account with controlTypeCode=10');

    const paymentDate = getRandomPaymentDate(await sharedInitResp.json());
    await odcPage.getDatePickerInput().fill(paymentDate);
    await odcPage.getDatePickerInput().blur();

    await odcPage.getPayeeTypeField().click();
    await odcPage.getPayeeTypeFreeform().click();
    await odcPage.getPayeeNameInputField().fill('test');
    await odcPage.getAmountField(0).clear();
    await odcPage.getAmountField(0).fill('1223.40');
    await odcPage.getAmountField(0).blur();
    await expect(page.getByText('$1,223.40'));
    await odcPage.getDescriptionCell(0).fill('test description');
    await odcPage.inputField('journal-number-input').clear();
    await odcPage.inputField('journal-number-input').fill('70');
    await odcPage.inputField('journal-number-input').press('Tab');
    const cashInput = odcPage.inputField('cash-account-input');
    await cashInput.scrollIntoViewIfNeeded();
    await cashInput.click();
    await cashInput.clear({ force: true });
    await cashInput.fill('2000');
    await cashInput.press('Tab');
    await expect(cashInput).toHaveValue(/2000/);

    await odcPage.getAccountCell().fill(account10!.accountNumber);
    await expect(page.locator('[data-testid="account-search-menu-list-item-0-text"]')).toBeVisible();
    await page.locator('[data-testid="account-search-menu-list-item-0-text"]').click();
    const amountCell0 = odcPage.byTestId('currency-input-0-input-field');
    await expect(amountCell0).toBeVisible();
    await amountCell0.click();
    await amountCell0.press('ControlOrMeta+A');
    await amountCell0.fill('1223.40');
    await amountCell0.press('Tab');
    await expect(amountCell0).toHaveValue(/1,?223\.40/);
    await expect(odcPage.getControlCell()).toHaveValue('Check No. (To be assigned)');
    await expect(odcPage.getODCPrintCheckButton()).toBeVisible();
    await odcPage.getPrintButton().click();
    const errBanner = page.getByText('Please correct the errors below.');
    if (await errBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.info().annotations.push({ type: 'validation-error', description: await page.locator('[data-testid$="-error-text"]').allInnerTexts().then((t) => t.join(' | ')) });
    }
    await expect(errBanner).toHaveCount(0);
  });

  test('MODDWTC-7328 || control field with special characters shows error message', async ({ page, odcPage }) => {
    const gl = (await sharedGlResp.json()) as Array<Record<string, string>>;
    const account = gl.find((a) => a.controlTypeCode === '0' && a.controlType2Code === '0') ?? gl[0];

    const paymentDate = getRandomPaymentDate(await sharedInitResp.json());
    await odcPage.getDatePickerInput().fill(paymentDate);
    await odcPage.getPayeeTypeField().click();
    await odcPage.getPayeeTypeFreeform().click();
    await odcPage.getPayeeNameInputField().fill('test');
    await odcPage.getAmountField(0).click();
    await odcPage.getAmountField(0).clear();
    await odcPage.getAmountField(0).pressSequentially('1223.40');
    await odcPage.getAmountField(0).blur();

    await odcPage.inputField('journal-number-input').clear();
    await odcPage.inputField('journal-number-input').fill('70');
    await odcPage.inputField('journal-number-input').press('Tab');
    const cashInput = odcPage.inputField('cash-account-input');
    await cashInput.scrollIntoViewIfNeeded();
    await cashInput.click();


    await odcPage.getAccountCell().fill(account.accountNumber);
    await expect(page.locator('[data-testid="account-search-menu-list-item-0-text"]')).toBeVisible();
    await page.locator('[data-testid="account-search-menu-list-item-0-text"]').click();
    await odcPage.byTestId('currency-input-0-input-field').fill('1223.40');
    await odcPage.getControlCell().fill('test[[');
    await odcPage.getDescriptionCell(0).fill('test');

    await expect(odcPage.getODCPrintCheckButton()).toBeVisible();
    await odcPage.getPrintButton().click();
    await odcPage.getCheckSequenceDialogPrintCheckButton().click();
    await expect(
      page.getByText(/Enter the control using only letters, numbers, and dashes/),
    ).toBeVisible();
  });

  test('MODDWTC-10550 | MODDWTC-10544 | MODDWTC-10309 || valid control values do not show "Invalid Control" error', async ({ page, odcPage }) => {
    const initBody = await sharedInitResp.json();
    const glBody = (await sharedGlResp.json()) as Array<Record<string, string>>;

    const paymentDate = getRandomPaymentDate(initBody);
    await odcPage.getDatePickerInput().fill(paymentDate);
    await odcPage.getDatePickerInput().blur();
    await odcPage.getPayeeTypeField().click({ force: true });
    await odcPage.getPayeeTypeFreeform().click({ force: true });
    await odcPage.getPayeeNameInputField().fill('test');
    await odcPage.getAmountField(0).clear();
    await odcPage.getAmountField(0).fill('1223.40');
    await odcPage.getAmountField(0).blur();
    await odcPage.inputField('journal-number-input').clear();
    await odcPage.inputField('journal-number-input').fill('70');
    await odcPage.inputField('journal-number-input').press('Tab');
    const cashInput = odcPage.inputField('cash-account-input');
    await cashInput.scrollIntoViewIfNeeded();
    await cashInput.clear({ force: true });
    await cashInput.fill('2000');
    await cashInput.press('Tab');
    await odcPage.getAccountCell().click();
    await odcPage.getAccountCell().fill('2100');
    await expect(page.locator('[data-testid="account-search-menu-list-item-0-text"]')).toBeVisible();
    await page.locator('[data-testid="account-search-menu-list-item-0-text"]').click();
    const amountCell0 = odcPage.getAmountCell(0);
    await expect(amountCell0).toBeVisible();
    await amountCell0.click();
    await amountCell0.press('ControlOrMeta+A');
    await amountCell0.fill('1223.40');
    await amountCell0.press('Tab');
    await expect(amountCell0).toHaveValue(/1,?223\.40/);
    test.info().annotations.push({ type: 'log', description: 'MODDWTC-10550 - Vendor control selected in DLPG should not be marked as invalid' });
    await odcPage.getControlCell().clear();
    await odcPage.getControlCell().fill('350');
    await odcPage.getControlCell().press('Tab');
    await expect(page.getByText('Invalid Control')).toHaveCount(0);
    await odcPage.getDescriptionCell(0).fill('Description for row1');
    await odcPage.getAddRowButton().click();
    await expect(odcPage.getAmountCell(1)).toBeVisible();
    await odcPage.getAccountCell().click({ force: true });
    await odcPage.getAccountCell().fill('2100');
    await expect(page.locator('[data-testid="account-search-menu-list-item-0-text"]')).toBeVisible();
    await page.locator('[data-testid="account-search-menu-list-item-0-text"]').click();
    const amountCell1 = odcPage.getAmountCell(1);
    await expect(amountCell1).toBeVisible();
    await amountCell1.click();
    await amountCell1.press('ControlOrMeta+A');
    await amountCell1.fill('0');
    await amountCell1.press('Tab');
    test.info().annotations.push({ type: 'log', description: 'MODDWTC-10544 - Should allow control with two characters and then a dash' });
    const activeControlInput = odcPage.getControlCell();
    await activeControlInput.click();
    await activeControlInput.clear();
    await activeControlInput.fill('12-');
    await activeControlInput.press('Tab');
    await expect(page.getByText('Invalid Control')).toHaveCount(0);
    await odcPage.getAddRowButton().click();
    await expect(odcPage.getAmountCell(2)).toBeVisible();
    const accountWithControl4 = glBody.find(
      (account) => account.controlTypeCode === '4' && account.controlType2Code === '0',
    );
    await odcPage.getAccountCell().click();
    await odcPage.getAccountSearchIcon(2).click({ force: true });
    await odcPage.accountSearchControlType().click();
    await page.locator('button[data-testid^="control-type-input-menu-list-item-"]').filter({ hasText: 'AR Customer' }).click();
    await page.locator(`[data-testid="radio-select-account-for-${accountWithControl4!.accountNumber}"]`).click();
    await odcPage.getAccountSelectButton().click();
    await odcPage.getAmountCell(2).click();
    await odcPage.getAmountCell(2).pressSequentially('0');
    await odcPage.getAmountCell(2).blur();
    const vendorRequests: string[] = [];
    page.on('request', (req) => {
      if (endpoints.vendorControlSearchBff.test(req.url())) {
        vendorRequests.push(req.url());
      }
    });

    test.info().annotations.push({ type: 'log', description: 'MODDWTC-10309 - Special characters in control search input' });
    const controlRow2 = odcPage.getControlCell();
    await controlRow2.clear();
    await controlRow2.fill('  ');
    await expect(controlRow2).toHaveValue('  ');
    expect(vendorRequests.length).toBe(0);

    await controlRow2.clear();
    await controlRow2.fill('@#');
    await expect(controlRow2).toHaveValue('@#');
    expect(vendorRequests.length).toBe(0);

    await controlRow2.clear();
    await controlRow2.fill('A@#');
    await expect(controlRow2).toHaveValue('A@#');
    expect(vendorRequests.length).toBe(0);

    const [abCustomersReq] = await Promise.all([
      waitForResponse(page, endpoints.customersControlSearchBff),
      (async () => { await controlRow2.clear(); await controlRow2.fill('ab  '); })(),
    ]);
    expect(abCustomersReq).toBeTruthy();

    const [abcCustomersReq] = await Promise.all([
      waitForResponse(page, endpoints.customersControlSearchBff),
      (async () => { await controlRow2.clear(); await controlRow2.fill('ABC  '); })(),
    ]);
    expect(abcCustomersReq.request().url()).toContain('/customers/ABC');

    await controlRow2.clear();
    await controlRow2.fill('100');
    await controlRow2.press('Tab');

    await odcPage.getPrintButton().click();
    const dialogPrintBtn = odcPage.getCheckSequenceDialogPrintCheckButton();
    await expect(dialogPrintBtn).toBeVisible();
    await expect(dialogPrintBtn).toBeEnabled();
    await dialogPrintBtn.click();
    const [printResp]=await Promise.all([
      waitForResponse(page,endpoints.printODCCheck),
      odcPage.getSuccessDialogPrintCheck().click(),
    ])
    test.info().annotations.push({ 
      type: 'log', 
      description: 'MODDWTC-10544 - Should allow control with two characters and then a dash and payload should have same control value' 
    });
    const payload = printResp.request().postDataJSON();
    expect(String(payload?.documentLinePosting?.[1]?.control)).toBe('12');
  });
});