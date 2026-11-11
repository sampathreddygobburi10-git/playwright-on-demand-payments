import { test, expect } from '../../fixtures';
import { endpoints, waitForRequest, waitForResponse } from '../../network/odc-mocks';
import {
  CheckSequenceMock,
  DEFAULT_SEQUENCE,
  DEFAULT_SEQUENCE_CHECK_NO,
  SEQUENCE_OPTIONS_ASCENDING,
} from '../../utils/check-sequence-mock';
import { HarnessFlags } from '../../utils/harness-flags';
import { getRandomPaymentDate } from '../../utils/paymentHelper';
import type { OnDemandCheckPage } from '../../pages/on-demand-check.page';
import type { Page } from '@playwright/test';

const SEQUENCE_FLAG = 'dms_accounting_multiple_forms_with_same_form_queue_name';

const ALL_FLAGS_ON: Record<string, boolean> = {
  dms_accounting_check_sequencing: true,
  dms_accounting_multi_printers_form_selection: true,
  [SEQUENCE_FLAG]: true,
};

const SEQUENCE_FLAG_OFF: Record<string, boolean> = {
  ...ALL_FLAGS_ON,
  [SEQUENCE_FLAG]: false,
};

const MULTI_PRINTERS_FLAG = 'dms_accounting_multi_printers_form_selection';

const EDIT_BUTTON_FLAG_CONFIGURATIONS = [true, false].flatMap((multiPrinters) =>
  [true, false].map((sameFormQueueName) => ({ multiPrinters, sameFormQueueName })),
);

const onOff = (value: boolean): string => (value ? 'ON' : 'OFF');

type InitBody = Parameters<typeof getRandomPaymentDate>[0] & {
  cashAccountList?: Array<{ accountNumber: string; accountDescription: string }>;
};

async function openPrintCheckDialog(
  page: Page,
  odcPage: OnDemandCheckPage,
  initBody: InitBody,
  glCoaBody: Array<Record<string, string>>,
): Promise<void> {
  await odcPage.expectAccountingGroupLoaded();
  await odcPage.getDatePickerInput().fill(getRandomPaymentDate(initBody));
  await odcPage.getDatePickerInput().blur();

  await odcPage.getPayeeTypeField().click();
  await odcPage.getPayeeTypeFreeform().click();
  await expect(odcPage.getPayeeTypeField()).toHaveValue('Freeform');
  await odcPage.getPayeeNameInputField().fill('AutomationTest');

  await odcPage.getAmountField(0).click();
  await odcPage.getAmountField(0).fill('1.00');
  await odcPage.getAmountField(0).press('Tab');

  const journalInput = odcPage.inputField('journal-number-input');
  await journalInput.clear();
  await journalInput.fill('70');
  await journalInput.press('Enter');

  const cashAccount = initBody.cashAccountList?.[0]?.accountNumber;
  expect(cashAccount, 'initialization returned no cash accounts').toBeTruthy();

  const cashInput = odcPage.inputField('cash-account-input');
  await cashInput.scrollIntoViewIfNeeded();

  const prefilled = await cashInput
    .waitFor({ state: 'visible' })
    .then(() => expect(cashInput).toHaveValue(/\S/, { timeout: 15000 }))
    .then(() => true)
    .catch(() => false);

  if (!prefilled) {
    await cashInput.click();
    await cashInput.pressSequentially(cashAccount!, { delay: 50 });
    const cashOption = page.getByTestId('autocomplete-menu-list-item-0-text');
    await expect(cashOption).toBeVisible();
    await cashOption.click();
  }
  await expect(cashInput).toHaveValue(/\S/);

  await odcPage.inputField('posting-description-input').fill('sequence automation');

  const postingAccount = glCoaBody.find(
    (account) => account.controlTypeCode === '0' && account.controlType2Code === '0',
  );
  await odcPage.getAccountCell().click();
  await odcPage.getAccountCell().fill(postingAccount!.accountNumber);
  await expect(odcPage.getAccountSearchMenuListItemText(0)).toBeVisible();
  await odcPage.getAccountSearchMenuListItemText(0).click();

  await odcPage.getAmountCell(0).click();
  await odcPage.getAmountCell(0).fill('1.00');
  await odcPage.getAmountCell(0).blur();
  await odcPage.getDescriptionCell(0).fill('sequence automation');
  await odcPage.getDescriptionCell(0).blur();

  await expect(odcPage.getODCPrintCheckButton()).toBeVisible();
  await odcPage.getPrintButton().click();
}

test.describe('Print Check dialog — check sequence selection @odc', () => {
  let sharedInitResp: Awaited<ReturnType<typeof waitForResponse>>;
  let sharedGlResp: Awaited<ReturnType<typeof waitForResponse>>;

  const openDialog = async (
    page: Page,
    odcPage: OnDemandCheckPage,
    flags: Record<string, boolean> = ALL_FLAGS_ON,
  ) => {
    await HarnessFlags.set(page, flags);
    await CheckSequenceMock.withMultipleSequences(page);

    [sharedInitResp, sharedGlResp] = await Promise.all([
      waitForResponse(page, endpoints.onDemandCheckInitialization),
      waitForResponse(page, endpoints.glCOACall),
      odcPage.gotoOdc(),
    ]);

    await openPrintCheckDialog(
      page,
      odcPage,
      await sharedInitResp.json(),
      (await sharedGlResp.json()) as Array<Record<string, string>>,
    );
  };

  test('MODDWTC-13168 || Sequence dropdown lists every sequence ascending and defaults to the first default printer', async ({
    page,
    odcPage,
    checkSequenceDialogPage,
  }) => {
    await openDialog(page, odcPage);

    await checkSequenceDialogPage.waitForDialog();
    await expect(checkSequenceDialogPage.sequenceInput).toBeVisible();
    await checkSequenceDialogPage.expectSequence(DEFAULT_SEQUENCE, DEFAULT_SEQUENCE_CHECK_NO);

    expect(await checkSequenceDialogPage.getSequenceOptions()).toEqual(
      SEQUENCE_OPTIONS_ASCENDING,
    );
  });

  test('MODDWTC-13168 || Sequence dropdown is hidden when the form queue has a single default printer', async ({
    page,
    odcPage,
    checkSequenceDialogPage,
  }) => {
    await HarnessFlags.set(page, ALL_FLAGS_ON);
    await CheckSequenceMock.withSingleSequence(page);

    [sharedInitResp, sharedGlResp] = await Promise.all([
      waitForResponse(page, endpoints.onDemandCheckInitialization),
      waitForResponse(page, endpoints.glCOACall),
      odcPage.gotoOdc(),
    ]);
    await openPrintCheckDialog(
      page,
      odcPage,
      await sharedInitResp.json(),
      (await sharedGlResp.json()) as Array<Record<string, string>>,
    );

    await checkSequenceDialogPage.waitForDialog();
    await checkSequenceDialogPage.expectSequenceHidden();
    await expect(checkSequenceDialogPage.nextAvailableCheckNo()).toHaveText(
      DEFAULT_SEQUENCE_CHECK_NO,
    );
  });

  test('MODDWTC-13168 || Selecting a sequence updates the next available check no. and the print payload', async ({
    page,
    odcPage,
    checkSequenceDialogPage,
  }) => {
    await openDialog(page, odcPage);

    await checkSequenceDialogPage.waitForDialog();
    await checkSequenceDialogPage.expectSequence(DEFAULT_SEQUENCE, DEFAULT_SEQUENCE_CHECK_NO);

    await checkSequenceDialogPage.selectSequence('10');
    await expect(checkSequenceDialogPage.nextAvailableCheckNo()).toHaveText('80223');

    await CheckSequenceMock.stubPrintCheck(page);
    const [printRequest] = await Promise.all([
      waitForRequest(page, endpoints.printODCCheck),
      checkSequenceDialogPage.printButton.click(),
    ]);

    const payload = JSON.parse(printRequest.postData() ?? '{}');
    expect(payload.dmsPrinterNo).toBe('10');
    expect(payload.printerId).toBe('printer-seq-10');
  });

  test('MODDWTC-13168 || Typing filters the sequence options', async ({
    page,
    odcPage,
    checkSequenceDialogPage,
  }) => {
    await openDialog(page, odcPage);

    await checkSequenceDialogPage.waitForDialog();
    expect(await checkSequenceDialogPage.filterSequences('1')).toEqual(['1', '10']);

    await checkSequenceDialogPage.selectSequence('1');
    await expect(checkSequenceDialogPage.nextAvailableCheckNo()).toHaveText('70118');
  });

  test('MODDWTC-13168 || Sequence is required and blocks printing while empty', async ({
    page,
    odcPage,
    checkSequenceDialogPage,
  }) => {
    await openDialog(page, odcPage);

    await checkSequenceDialogPage.waitForDialog();
    await checkSequenceDialogPage.clearSequence();

    let printRequested = false;
    page.on('request', (request) => {
      if (endpoints.printODCCheck.test(request.url())) printRequested = true;
    });

    await checkSequenceDialogPage.printButton.click();
    await expect(checkSequenceDialogPage.printerSelectionToast).toBeVisible();
    await expect(checkSequenceDialogPage.dialog).toBeVisible();
    expect(printRequested).toBe(false);

    await checkSequenceDialogPage.selectSequence(DEFAULT_SEQUENCE);
    await expect(checkSequenceDialogPage.sequenceRequiredError).toHaveCount(0);
  });

  test('MODDWTC-13168 || Changing the selected form resets the sequence to that form queue default', async ({
    page,
    odcPage,
    checkSequenceDialogPage,
  }) => {
    await openDialog(page, odcPage);

    await checkSequenceDialogPage.waitForDialog();
    await checkSequenceDialogPage.selectSequence('10');
    await expect(checkSequenceDialogPage.nextAvailableCheckNo()).toHaveText('80223');

    await Promise.all([
      waitForResponse(page, endpoints.fetchFormPrinterWithNextCheckNumber),
      checkSequenceDialogPage.selectForm('CHECKS-OVERFLOW'),
    ]);

    await checkSequenceDialogPage.expectSequence('4', '90111');
    expect(await checkSequenceDialogPage.getSequenceOptions()).toEqual(['3', '4']);
  });

  test('MODDWTC-13168 || Sequence dropdown stays hidden when the feature flag is off', async ({
    page,
    odcPage,
    checkSequenceDialogPage,
  }) => {
    await openDialog(page, odcPage, SEQUENCE_FLAG_OFF);

    await checkSequenceDialogPage.waitForDialog();
    await checkSequenceDialogPage.expectSequenceHidden();
    await expect(checkSequenceDialogPage.nextAvailableCheckNo()).toHaveText(
      DEFAULT_SEQUENCE_CHECK_NO,
    );
    await expect(checkSequenceDialogPage.printButton).toBeEnabled();
  });

  for (const { multiPrinters, sameFormQueueName } of EDIT_BUTTON_FLAG_CONFIGURATIONS) {
    test(`MODDWTC-10846 || Printer Edit button and printer/tray dropdowns are not shown (multi-printers ${onOff(
      multiPrinters,
    )}, same form queue name ${onOff(sameFormQueueName)})`, async ({
      page,
      odcPage,
      checkSequenceDialogPage,
    }) => {
      await openDialog(page, odcPage, {
        ...ALL_FLAGS_ON,
        [MULTI_PRINTERS_FLAG]: multiPrinters,
        [SEQUENCE_FLAG]: sameFormQueueName,
      });

      await checkSequenceDialogPage.waitForDialog();
      await checkSequenceDialogPage.expectPrinterEditOptionsHidden();
    });
  }
});
