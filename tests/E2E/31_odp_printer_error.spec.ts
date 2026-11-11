import { type Page, expect } from '@playwright/test';
import { test } from '../../fixtures';
import { OnDemandCheckPage } from '../../pages/on-demand-check.page';
import { CheckSequenceDialogPage } from '../../pages/check-sequence-dialog.page';
import { userData } from '../../../src/mocks/mockData/userData';

const PRINTER_ERROR =
  'Printer details failed to load. Please retry. If issue persists, please contact CDK Support.';
const HARNESS_AUTH_TOKEN = `eyJhbGciOiJub25lIn0.${Buffer.from(
  JSON.stringify({
    accountID: 'odp-printer-e2e-account',
    environmentIdentifier: 'odp-printer-e2e-environment',
    environment: 'develop',
    clusterIdentifier: 'odp-printer-e2e-cluster'
  })
).toString('base64url')}.e2e`;

const ACCOUNT_DATA = [
  {
    companyId: '1',
    accountDescription: 'CHASE BANK',
    type: 'M',
    subType: 'CASH',
    accountNumber: '01234',
    controlType2Code: '0',
    controlTypeCode: '0',
    postingDescriptionRequired: true,
    statCountType: 0,
    productivityTypeCode: 'None',
    postingDescription: ''
  },
  {
    companyId: '1',
    accountDescription: 'CREDIT CARD CLEARING',
    type: 'M',
    subType: 'CASH',
    accountNumber: '01245',
    controlType2Code: '11',
    controlTypeCode: '1',
    postingDescriptionRequired: false,
    statCountType: 0,
    productivityTypeCode: 'None',
    postingDescription: ''
  },
  {
    companyId: '1',
    accountDescription: 'Account 3',
    type: 'M',
    subType: 'PROFIT',
    accountNumber: '0123456',
    controlType2Code: 'type 2 - 2',
    controlTypeCode: '0',
    postingDescriptionRequired: true,
    statCountType: 0,
    productivityTypeCode: 'None',
    postingDescription: ''
  }
];

const TODAY = new Date();
const CURRENT_START = new Date(TODAY.getTime() - 30 * 24 * 60 * 60 * 1000);
const POSTAHEAD_START = new Date(TODAY.getTime() + 30 * 24 * 60 * 60 * 1000);
const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;

const INITIALIZATION_DATA = {
  glCalendar: {
    currentStart: toIsoDate(CURRENT_START),
    postaheadStart: toIsoDate(POSTAHEAD_START),
    glCutoffDate: '',
    glCutoffTime: ''
  },
  glJournalSetup: [
    {
      tenantId: 'odp-printer-e2e',
      requireJEDescription: false,
      allowInterCompanyPostings: true,
      agjeDefaultDocumentType: 'Check',
      franchiseId: null,
      journalId: '12',
      companyId: '1',
      restrictPosting: false,
      journalName: 'NEW TOYOTA LEASE',
      restrictCalendarPost: true,
      repeatPriorControl: null,
      restrictedAccess: false,
      journalEndDate: null,
      journalType: 'Sales',
      journalBeginDate: '2018-11-01'
    }
  ],
  odcSetups: [
    {
      journalNumber: '12',
      companyId: '1',
      cashActNumber: '01245',
      flooringCashActCompany: '1',
      flooringOffsetAccountCompany: '1',
      cashAccountCompany: '1',
      flooringCashActNumber: '20207',
      journalCompanyId: '1',
      flooringOffsetAccountNumber: '',
      flooringJournalNumber: '60',
      offsetAccountNumber: '',
      criReminderDays: 180,
      checkDateFormat: 1,
      offsetAccountCompany: '1',
      flooringJournalCompanyId: '1'
    }
  ],
  cashAccountList: ACCOUNT_DATA,
  interCompanyStores: [],
  errors: null
};

const PRINTER_DETAILS = [
  {
    nextCheckNo: '60117',
    dmsPrinterNo: '2',
    cloudPrinterId: 'odp-e2e-cloud-printer',
    printerId: 'odp-e2e-printer',
    isDefaultPrinter: true,
    isAccountingPrinter: false,
    printerDetails: {
      printerName: 'ODP E2E Printer',
      checkTray: 'Tray 1',
      overFlowTray: 'Tray 1',
      isMICRPrinter: true
    }
  },
  {
    nextCheckNo: null,
    dmsPrinterNo: null,
    cloudPrinterId: 'odp-e2e-cloud-printer',
    printerId: 'odp-e2e-overflow-printer',
    isDefaultPrinter: false,
    isAccountingPrinter: true,
    printerDetails: {
      printerName: 'ODP E2E Overflow Printer',
      checkTray: 'Tray 1',
      overFlowTray: 'Tray 1',
      isMICRPrinter: false
    }
  }
];

type PrinterErrorPlan = number[];

type ApiCounters = {
  printerRequests: number;
  printRequests: number;
  unmockedApiRequests: string[];
  requests: string[];
  responses: string[];
  failedRequests: string[];
  pageErrors: string[];
  consoleErrors: string[];
};

const corsHeaders = (page: Page, requestHeaders: Record<string, string>) => ({
  'access-control-allow-origin': new URL(page.url()).origin,
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers':
    requestHeaders['access-control-request-headers'] ?? '*',
  vary: 'Origin'
});

async function mockApiTraffic(
  page: Page,
  checkSequencing: boolean,
  printerErrorPlan: PrinterErrorPlan
): Promise<ApiCounters> {
  const counters: ApiCounters = {
    printerRequests: 0,
    printRequests: 0,
    unmockedApiRequests: [],
    requests: [],
    responses: [],
    failedRequests: [],
    pageErrors: [],
    consoleErrors: []
  };
  page.on('request', request => {
    counters.requests.push(`${request.method()} ${request.url()}`);
  });
  page.on('response', response => {
    counters.responses.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    counters.failedRequests.push(
      `${request.method()} ${request.url()} ${
        request.failure()?.errorText ?? ''
      }`
    );
  });
  page.on('pageerror', error => counters.pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });
  const flags = [
    ['dms_accounting_check_sequencing', checkSequencing],
    ['dms_accounting_multi_printers_form_selection', false],
    ['dms_accounting_payments_grouping', false],
    ['dms_accounting_multiple_forms_with_same_form_queue_name', false],
    ['dms_accounting_allow_sold_stores_in_user_details', false],
    ['dms_mod_accounting_jwt_token_enable', false]
  ].map(([flag, value]) => ({
    flag,
    value: String(value),
    kind: 'boolean',
    identifier: String(value)
  }));

  await page.route('**/*', async route => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const pathname = requestUrl.pathname;
    const requestCorsHeaders = corsHeaders(page, request.headers());
    const appOrigin = new URL(process.env.BASE_URL ?? page.url()).origin;

    if (requestUrl.origin === appOrigin) {
      await route.continue();
      return;
    }

    if (
      requestUrl.hostname === 'js-agent.newrelic.com' ||
      requestUrl.hostname === 'bam.nr-data.net' ||
      requestUrl.hostname === 'api.amplitude.com' ||
      requestUrl.hostname === 'www.googletagmanager.com'
    ) {
      await route.abort();
      return;
    }

    const authHosts = [process.env.LOGIN_URL, process.env.API_BASE_URL]
      .filter((value): value is string => Boolean(value))
      .map(value => new URL(value).hostname);
    if (authHosts.includes(requestUrl.hostname)) {
      await route.continue();
      return;
    }

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: requestCorsHeaders });
      return;
    }

    if (pathname.includes('/api/1.0/stream')) {
      await route.abort();
      return;
    }

    const fulfillJson = async (status: number, body: unknown) =>
      route.fulfill({
        status,
        headers: {
          ...requestCorsHeaders,
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      });

    if (pathname.endsWith('/client/auth') && request.method() === 'POST') {
      await fulfillJson(200, { authToken: HARNESS_AUTH_TOKEN });
      return;
    }
    if (
      pathname.includes('/client/env/') &&
      pathname.includes('/evaluations')
    ) {
      await fulfillJson(200, flags);
      return;
    }
    if (pathname.includes('/client/metrics/')) {
      await route.fulfill({ status: 202, headers: requestCorsHeaders });
      return;
    }
    if (pathname.includes('/user/details')) {
      await fulfillJson(200, userData);
      return;
    }
    if (pathname.includes('/odc/initialization/')) {
      await fulfillJson(200, INITIALIZATION_DATA);
      return;
    }
    if (pathname.includes('/odc/gl-coa/')) {
      await fulfillJson(200, ACCOUNT_DATA);
      return;
    }
    if (pathname.endsWith('/common-bff/gl-coa')) {
      await fulfillJson(200, ACCOUNT_DATA);
      return;
    }
    if (pathname.endsWith('/saleChains')) {
      await fulfillJson(200, []);
      return;
    }
    if (pathname.includes('/getPrintersWithCheckNumber/')) {
      counters.printerRequests += 1;
      const status =
        printerErrorPlan[counters.printerRequests - 1] ??
        printerErrorPlan.at(-1) ??
        200;
      await fulfillJson(
        status,
        status === 200
          ? PRINTER_DETAILS
          : { message: 'Simulated printer details failure' }
      );
      return;
    }
    if (pathname.endsWith('/print-check') && request.method() === 'POST') {
      counters.printRequests += 1;
      await fulfillJson(200, {
        printerNumber: 'ODP E2E Printer',
        checkNumber: '92930001'
      });
      return;
    }
    if (pathname.includes('/common-bff/control-balance')) {
      await fulfillJson(200, {});
      return;
    }
    if (pathname.includes('/common-bff/printers')) {
      await fulfillJson(200, {
        printers: [],
        errors: null,
        statusCode: null
      });
      return;
    }

    counters.unmockedApiRequests.push(`${request.method()} ${request.url()}`);
    await route.abort();
  });

  return counters;
}

async function prepareCheck(
  page: Page,
  odcPage: OnDemandCheckPage,
  counters: ApiCounters
): Promise<void> {
  try {
    await odcPage.expectAccountingGroupLoaded();
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    const visibleText = await page
      .locator('body')
      .innerText()
      .catch(() => '');
    const authStorage = await page
      .evaluate(() => {
        const rawTokens = localStorage.getItem('okta-token-storage');
        const tokens = rawTokens ? JSON.parse(rawTokens) : {};
        return {
          localStorageKeys: Object.keys(localStorage),
          tokenNames: Object.keys(tokens),
          accessTokenExpiresAt: tokens.accessToken?.expiresAt ?? null,
          idTokenExpiresAt: tokens.idToken?.expiresAt ?? null,
          jwtFlag: localStorage.getItem('JWT_FLAG')
        };
      })
      .catch(() => null);
    throw new Error(
      `${failure}\nBrowser requests:\n${counters.requests.join('\n')}\n` +
        `Page URL: ${page.url()}\n` +
        `Visible page text: ${visibleText}\n` +
        `Auth storage summary: ${JSON.stringify(authStorage)}\n` +
        `Browser responses:\n${counters.responses.join('\n')}\n` +
        `Failed requests:\n${counters.failedRequests.join('\n')}\n` +
        `Unmocked API requests:\n${counters.unmockedApiRequests.join('\n')}\n` +
        `Page errors:\n${counters.pageErrors.join('\n')}\n` +
        `Console errors:\n${counters.consoleErrors.join('\n')}`
    );
  }
  await odcPage.getPayeeTypeField().click();
  await odcPage.getPayeeTypeFreeform().click();
  await expect(odcPage.getPayeeTypeField()).toHaveValue('Freeform');
  await odcPage.getPayeeNameInputField().fill('Printer Regression Check');

  await odcPage.getAmountField(0).click();
  await odcPage.getAmountField(0).fill('1.00');
  await odcPage.getAmountField(0).press('Tab');

  const journalInput = odcPage.inputField('journal-number-input');
  await expect(journalInput).toHaveValue(/^12 - NEW TOYOTA LEASE$/);

  const cashInput = odcPage.inputField('cash-account-input');
  await expect(cashInput).toHaveValue(/01245/);
  await odcPage
    .inputField('posting-description-input')
    .fill('printer regression');
  await odcPage.inputField('control2-input').fill('printer regression');

  await odcPage.getAccountCell().click();
  await odcPage.getAccountCell().fill('01234');
  await expect(odcPage.getAccountSearchMenuListItemText(0)).toBeVisible();
  await odcPage.getAccountSearchMenuListItemText(0).click();

  const gridAmount = odcPage.getAmountCell(0);
  const amountSamples = [await gridAmount.inputValue()];
  await gridAmount.click();
  await gridAmount.selectText();
  amountSamples.push(await gridAmount.inputValue());
  await gridAmount.fill('100');
  amountSamples.push(await gridAmount.inputValue());
  await gridAmount.blur();
  const committedAmount = await gridAmount.inputValue();
  amountSamples.push(committedAmount);
  expect(
    committedAmount,
    `grid amount before/during/after typing: ${JSON.stringify([
      ...amountSamples,
      committedAmount
    ])}`
  ).toMatch(/^\$?1\.00$/);
  await odcPage.getDescriptionCell(0).fill('printer regression');
  await odcPage.getDescriptionCell(0).blur();
  await expect(gridAmount).toHaveValue(/^\$?1\.00$/);

  await expect(odcPage.getODCPrintCheckButton()).toBeVisible();
}

async function openCheckSequenceDialog(
  odcPage: OnDemandCheckPage,
  checkSequenceDialogPage: CheckSequenceDialogPage
): Promise<void> {
  await odcPage.getPrintButton().click();
  await checkSequenceDialogPage.waitForDialog();
}

test.use({ serviceWorkers: 'block' });

test.describe('MODDWTC-13909 || ODP printer load error regression @odc', () => {
  test('keeps print confirmation clear when a post-print printer refresh fails', async ({
    page,
    odcPage,
    checkSequenceDialogPage
  }) => {
    const counters = await mockApiTraffic(page, true, [200, 500]);
    await odcPage.gotoOdc();
    await prepareCheck(page, odcPage, counters);
    await expect.poll(() => counters.printerRequests).toBe(1);

    await openCheckSequenceDialog(odcPage, checkSequenceDialogPage);
    const printButton = checkSequenceDialogPage.printButton;
    await expect(printButton).toBeEnabled();

    const printResponse = page.waitForResponse(
      response =>
        response.url().includes('/print-check') &&
        response.request().method() === 'POST'
    );
    await printButton.click();
    expect((await printResponse).status()).toBe(200);

    const successDialog = page.getByRole('heading', {
      name: 'Did your check print successfully?'
    });
    await expect(successDialog).toBeVisible();
    await expect(page.getByText(PRINTER_ERROR, { exact: true })).toHaveCount(0);
    expect(counters.printRequests).toBe(1);
    expect(counters.printerRequests).toBe(1);

    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect.poll(() => counters.printerRequests).toBe(2);
    await expect(successDialog).toHaveCount(0);
    await expect(page.getByText(PRINTER_ERROR, { exact: true })).toHaveCount(0);
    expect(counters.printRequests).toBe(1);
    expect(counters.unmockedApiRequests).toEqual([]);
  });

  test('shows a completed printer failure only in Print Check and blocks the print request', async ({
    page,
    odcPage,
    checkSequenceDialogPage
  }) => {
    const counters = await mockApiTraffic(page, true, [500, 500]);
    await odcPage.gotoOdc();
    await prepareCheck(page, odcPage, counters);
    await expect.poll(() => counters.printerRequests).toBe(1);
    await expect(page.getByText(PRINTER_ERROR, { exact: true })).toHaveCount(0);

    await openCheckSequenceDialog(odcPage, checkSequenceDialogPage);
    await expect.poll(() => counters.printerRequests).toBe(2);
    await expect(
      checkSequenceDialogPage.dialog.getByText(PRINTER_ERROR)
    ).toBeVisible();
    await expect(checkSequenceDialogPage.printButton).toBeDisabled();
    expect(counters.printRequests).toBe(0);
    expect(counters.unmockedApiRequests).toEqual([]);
  });

  test('retries failed printer details when Print Check is reopened', async ({
    page,
    odcPage,
    checkSequenceDialogPage
  }) => {
    const counters = await mockApiTraffic(page, true, [500, 500, 200]);
    await odcPage.gotoOdc();
    await prepareCheck(page, odcPage, counters);
    await expect.poll(() => counters.printerRequests).toBe(1);

    await openCheckSequenceDialog(odcPage, checkSequenceDialogPage);
    await expect(
      checkSequenceDialogPage.dialog.getByText(PRINTER_ERROR)
    ).toBeVisible();
    await expect.poll(() => counters.printerRequests).toBe(2);
    await checkSequenceDialogPage.cancelButton.click();
    await expect(checkSequenceDialogPage.dialog).toBeHidden();

    await openCheckSequenceDialog(odcPage, checkSequenceDialogPage);
    await expect.poll(() => counters.printerRequests).toBe(3);
    await expect(checkSequenceDialogPage.printButton).toBeEnabled();
    await expect(
      checkSequenceDialogPage.dialog.getByText(PRINTER_ERROR)
    ).toHaveCount(0);

    const printResponse = page.waitForResponse(
      response =>
        response.url().includes('/print-check') &&
        response.request().method() === 'POST'
    );
    await checkSequenceDialogPage.printButton.click();
    expect((await printResponse).status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Did your check print successfully?' })
    ).toBeVisible();
    expect(counters.printRequests).toBe(1);
    expect(counters.unmockedApiRequests).toEqual([]);
  });

  test('preserves the sequencing-off legacy print flow', async ({
    page,
    odcPage
  }) => {
    const counters = await mockApiTraffic(page, false, [500]);
    await odcPage.gotoOdc();
    await prepareCheck(page, odcPage, counters);
    await expect.poll(() => counters.printerRequests).toBe(0);

    const printResponse = page.waitForResponse(
      response =>
        response.url().includes('/print-check') &&
        response.request().method() === 'POST'
    );
    await odcPage.getPrintButton().click();
    expect((await printResponse).status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Did your check print successfully?' })
    ).toBeVisible();
    await expect(page.getByTestId('print-check-dialog-wrapper')).toHaveCount(0);
    await expect(page.getByText(PRINTER_ERROR, { exact: true })).toHaveCount(0);
    expect(counters.printerRequests).toBe(0);
    expect(counters.printRequests).toBe(1);
    expect(counters.unmockedApiRequests).toEqual([]);
  });
});
