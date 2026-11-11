import { type Page, type Locator, type Response, type Route } from '@playwright/test';

export class NetworkInterceptor {
  static async interceptRequest(
    page: Page,
    urlPattern: string | RegExp,
    handler: (route: Route) => Promise<void>
  ): Promise<void> {
    await page.route(urlPattern, handler);
  }

  static async mockApiResponse(
    page: Page,
    urlPattern: string | RegExp,
    mockData: unknown,
    status: number = 200
  ): Promise<void> {
    await page.route(urlPattern, async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(mockData),
      });
    });
  }

  static async waitForRequest(
    page: Page,
    urlPattern: string | RegExp,
    timeout: number = 30000
  ): Promise<unknown> {
    const request = await page.waitForRequest(
      (req) => {
        return typeof urlPattern === 'string'
          ? req.url().includes(urlPattern)
          : urlPattern.test(req.url());
      },
      { timeout }
    );
    return {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
    };
  }

  static async waitForResponse(
    page: Page,
    urlPattern: string | RegExp,
    status?: number,
    timeout: number = 30000
  ): Promise<{ status: number; data: unknown }> {
    const response = await page.waitForResponse(
      (resp) => {
        const urlMatch = typeof urlPattern === 'string'
          ? resp.url().includes(urlPattern)
          : urlPattern.test(resp.url());
        const statusMatch = status ? resp.status() === status : true;
        return urlMatch && statusMatch;
      },
      { timeout }
    );
    const data = await response.json().catch(() => null);
    return { status: response.status(), data };
  }

  static async blockRequests(page: Page, patterns: (string | RegExp)[]): Promise<void> {
    for (const pattern of patterns) {
      await page.route(pattern, async (route) => {
        await route.abort();
      });
    }
  }

  static captureNetworkLogs(page: Page): { requests: unknown[]; responses: unknown[] } {
    const logs: { requests: unknown[]; responses: unknown[] } = {
      requests: [],
      responses: [],
    };

    page.on('request', (request) => {
      logs.requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString(),
      });
    });

    page.on('response', (response) => {
      logs.responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date().toISOString(),
      });
    });

    return logs;
  }

  static async abortRequest(page: Page, urlPattern: string | RegExp): Promise<void> {
    await page.route(urlPattern, async (route) => {
      await route.abort();
    });
  }
}
