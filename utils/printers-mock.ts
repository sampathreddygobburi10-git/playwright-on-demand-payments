import { type Page } from '@playwright/test';
import { NetworkInterceptor } from './network-interceptor';

const PRINTERS_URL_PATTERN = '**/common-bff/printers**';

export class PrintersMock {
  /** Delays the printers response so the loading state stays visible for `delayMs`. */
  static async delayed(page: Page, delayMs: number = 3000): Promise<void> {
    await NetworkInterceptor.interceptRequest(page, PRINTERS_URL_PATTERN, async (route) => {
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ printers: [], errors: null, statusCode: null }),
      });
    });
  }

  /** Forces a service failure (FR-011). */
  static async error(page: Page): Promise<void> {
    await NetworkInterceptor.mockApiResponse(
      page,
      PRINTERS_URL_PATTERN,
      { printers: [], errors: ['Simulated printers service failure'], statusCode: 500 },
      500,
    );
  }

  /** Forces an empty printer list for the store (FR-012). */
  static async empty(page: Page): Promise<void> {
    await NetworkInterceptor.mockApiResponse(page, PRINTERS_URL_PATTERN, {
      printers: [],
      errors: null,
      statusCode: null,
    });
  }
}
