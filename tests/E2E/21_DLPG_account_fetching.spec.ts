import { test, expect } from '../../fixtures';
import { endpoints, waitForResponse } from '../../network/odc-mocks';

test.describe('DLPG grid — account fetching @deployTests @odc', () => {
  let sharedUserResp: Awaited<ReturnType<typeof waitForResponse>>;
  let sharedInitResp: Awaited<ReturnType<typeof waitForResponse>>;
  let sharedGlResp: Awaited<ReturnType<typeof waitForResponse>>;

  test.beforeEach(async ({ page, odcPage }) => {
    [sharedUserResp, sharedInitResp, sharedGlResp] = await Promise.all([
      waitForResponse(page, endpoints.getUserDetails),
      waitForResponse(page, endpoints.onDemandCheckInitialization),
      waitForResponse(page, endpoints.glCOACall),
      odcPage.gotoOdc(),
    ]);
  });

  test('MODDWTC-2623 | MODDWTC-3043 || GL COA call uses the correct store on selection', async ({ page, odcPage }) => {
    const userBody = await sharedUserResp.json();
    const defaultStore = userBody.iamUser.assignments[0].stores.find(
      (s: { defaultStore: boolean }) => s.defaultStore === true,
    );

    expect(sharedGlResp.request().headers()['x-store-id']).toBe(defaultStore.storeId);

    const otherStore = (userBody.extendedAccountInfo as Array<{ storeId: string; storeName: string; companyId: string }>).find(
      (s) => s.storeId !== defaultStore.storeId,
    );
    if (!otherStore) test.skip(true, 'No secondary store available in user details');

    const storeIcon = odcPage.getStoreSearchMenuIcon();
    const groupingFlagEnabled = await storeIcon.isVisible({ timeout: 5000 }).catch(() => false);

    if (!groupingFlagEnabled) {
      test.info().skip(true,'dms_accounting_payments_grouping flag is OFF');
      return;
    }

    await storeIcon.click();
    await expect(page.getByRole('button', { name: `${otherStore!.companyId} - ${otherStore!.storeName}` })).toBeVisible();

    const [secondGl] = await Promise.all([
      waitForResponse(page,endpoints.glCOACall),
      page.getByRole('button',{name: `${otherStore!.companyId} - ${otherStore!.storeName}` }).click(),
    ])
    expect(secondGl.request().headers()['x-store-id']).toBe(otherStore!.storeId);

    const body = (await secondGl.json()) as Array<Record<string, unknown>>;
    for (const key of [
      'companyId',
      'accountDescription',
      'accountNumber',
      'type',
      'subType',
      'controlType2Code',
      'controlTypeCode',
      'postingDescriptionRequired',
      'statCountType',
      'productivityTypeCode',
      'pattern',
    ]) {
      expect(body[0]).toHaveProperty(key);
    }
  });

  test('MODDWTC-3721 || productivity field mandatory based on account selected', async ({ page, odcPage }) => {
    const userBody = await sharedUserResp.json();
    const defaultStore = userBody.iamUser.assignments[0].stores.find(
      (s: { defaultStore: boolean }) => s.defaultStore === true,
    );
    expect(sharedGlResp.request().headers()['x-store-id']).toBe(defaultStore.storeId);

    const gl = (await sharedGlResp.json()) as Array<Record<string, string>>;

    const prodAccount = gl.find(
      (a) => a.productivityTypeCode && a.productivityTypeCode !== 'None',
    );
    test.skip(!prodAccount, 'No productivity-required account in GL COA for this environment');

    const nonProdAccount = gl.find(
      (a) => !a.productivityTypeCode || a.productivityTypeCode === 'None',
    );

    const prodSearchTerm = prodAccount!.accountNumber.substring(0, 6);
    const expectedError = `${prodAccount!.productivityTypeCode} Required`;
    const expectedProdValue = `${prodAccount!.accountNumber} - ${prodAccount!.accountDescription}`;
    await odcPage.getAccountCell().pressSequentially(prodSearchTerm);
    await expect(odcPage.getAccountSearchMenuListItemText(0)).toBeVisible();
    await odcPage.getAccountSearchMenuListItem(0).click();
    await expect(odcPage.getAccountCell()).toHaveValue(expectedProdValue);
    await expect(odcPage.getProductivityCell()).toBeVisible();
    await odcPage.getProductivityCell().click();
    await odcPage.inputField('journal-number-input').clear();
    await odcPage.inputField('journal-number-input').pressSequentially('70');
    await odcPage.inputField('journal-number-input').press('Enter');
    await expect(page.getByText(expectedError)).toBeVisible();
    await odcPage.getAccountSearchClearIcon().click();
    await expect(odcPage.getAccountCell()).toHaveValue('');
    await odcPage.getProductivityCell().click();
    await odcPage.getProductivityCell().blur();
    await expect(page.getByText(expectedError)).toHaveCount(0);
    if (nonProdAccount) {
      const nonProdSearchTerm = nonProdAccount.accountNumber.substring(0, 6);
      const expectedNonProdValue = `${nonProdAccount.accountNumber} - ${nonProdAccount.accountDescription}`;

      await odcPage.getAccountCell().pressSequentially(nonProdSearchTerm);
      await expect(odcPage.getAccountSearchMenuListItemText(0)).toBeVisible();
      await odcPage.getAccountSearchMenuListItem(0).click();
      await expect(odcPage.getAccountCell()).toHaveValue(expectedNonProdValue);

      await expect(odcPage.getProductivityCell()).toBeVisible();
      await odcPage.getProductivityCell().click();
      await odcPage.inputField('journal-number-input').clear();
      await odcPage.inputField('journal-number-input').pressSequentially('70');
      await odcPage.inputField('journal-number-input').press('Enter');
      await expect(page.getByText(expectedError)).toHaveCount(0);
    }
  });
});