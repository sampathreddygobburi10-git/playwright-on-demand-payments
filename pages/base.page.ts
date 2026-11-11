import { type Page, type Locator } from '@playwright/test';
import { frameworkConfig } from '../config/framework.config';

/**
 * Base page class that all page objects extend.
 *
 * Provides a rich set of reusable browser interaction helpers so page classes
 * stay focused on page-specific logic.  Every method is async-safe and uses
 * timeouts sourced from `framework.config.ts`.
 *
 * @example
 * // Extend BasePage in a page object
 * export class DashboardPage extends BasePage {
 *   private readonly heading: Locator;
 *   constructor(page: Page) {
 *     super(page);
 *     this.heading = page.locator('h1');
 *   }
 * }
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Navigate to a path relative to the configured `BASE_URL`.
   *
   * @param path - URL path to navigate to (e.g. `'/login'`, `'/dashboard'`).
   *               The full URL is resolved as `BASE_URL + path`.
   * @returns Promise that resolves when `domcontentloaded` fires.
   *
   * @example
   * await this.navigate('/login');
   * await this.navigate('/users/123/profile');
   */
  async navigate(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Return the current document title of the page.
   *
   * @returns The page `<title>` string.
   *
   * @example
   * const title = await this.getTitle();
   * expect(title).toBe('Dashboard | MyApp');
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Wait for the page to reach a specific load state.
   *
   * @param state - Target load state to wait for:
   *   - `'load'` — fires when all resources (images, scripts) are loaded (default).
   *   - `'domcontentloaded'` — fires earlier, when the HTML is parsed.
   *   - `'networkidle'` — fires when there are no more than 2 active network connections for 500 ms.
   * @returns Promise that resolves when the page reaches the given state.
   *
   * @example
   * // Wait for full page load (default)
   * await this.waitForPageLoad();
   *
   * // Wait only until HTML is parsed (faster, useful for SPAs)
   * await this.waitForPageLoad('domcontentloaded');
   *
   * // Wait until all network traffic settles
   * await this.waitForPageLoad('networkidle');
   */
  async waitForPageLoad(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load'): Promise<void> {
    await this.page.waitForLoadState(state);
  }

  /**
   * Pause test execution and open Playwright Inspector for interactive debugging.
   *
   * @note Only use during local debugging — remove before committing.
   *
   * @example
   * await this.navigate('/checkout');
   * await this.pause(); // Inspector opens here; resume manually
   * await this.clickSubmit();
   */
  async pause(): Promise<void> {
    await this.page.pause();
  }

  /**
   * Wait for an API response whose URL matches the given pattern, then return
   * its JSON body.  Useful for asserting network calls that a UI action triggers.
   *
   * @param urlPattern - A substring (`string`) or `RegExp` matched against the
   *                     response URL.
   * @param status     - Optional HTTP status code to additionally filter on
   *                     (e.g. `200`, `201`).
   * @param timeout    - Max wait time in ms. Defaults to `DEFAULT_TIMEOUT` from `.env`.
   * @returns Parsed JSON body of the matched response, or `null` if the body is
   *          not JSON.
   *
   * @example
   * // Wait for any response whose URL contains '/api/orders'
   * const body = await this.waitForApiResponse('/api/orders');
   *
   * // Wait specifically for a 201 Created response
   * const created = await this.waitForApiResponse('/api/orders', 201);
   *
   * // Use a regex to match versioned endpoints
   * const data = await this.waitForApiResponse(/\/v\d+\/users/, 200, 5000);
   */
  async waitForApiResponse(urlPattern: string | RegExp, status?: number, timeout?: number): Promise<unknown> {
    const response = await this.page.waitForResponse(
      (resp) => {
        const urlMatch = typeof urlPattern === 'string'
          ? resp.url().includes(urlPattern)
          : urlPattern.test(resp.url());
        const statusMatch = status ? resp.status() === status : true;
        return urlMatch && statusMatch;
      },
      { timeout: timeout || frameworkConfig.defaultTimeout }
    );
    return response.json().catch(() => null);
  }

  /**
   * Capture a full-page screenshot.  Respects the `SCREENSHOT_MODE` setting
   * in `.env` — does nothing when mode is `'off'`.
   *
   * @param name - Optional filename (without extension). Defaults to a
   *               timestamp-based name. Saved to `test-results/screenshots/`.
   *
   * @example
   * // Auto-named screenshot
   * await this.takeScreenshot();
   *
   * // Named screenshot
   * await this.takeScreenshot('after-submit');
   */
  async takeScreenshot(name?: string): Promise<void> {
    if (frameworkConfig.screenshotMode === 'off') return;
    const screenshotName = name || `screenshot-${Date.now()}`;
    await this.page.screenshot({
      path: `test-results/screenshots/${screenshotName}.png`,
      fullPage: true,
    });
  }

  /**
   * Wait until an element becomes visible in the viewport.
   *
   * @param locator - Playwright `Locator` targeting the element.
   * @param timeout - Max wait time in ms. Defaults to `DEFAULT_TIMEOUT` from `.env`.
   * @throws If the element does not become visible within the timeout.
   *
   * @example
   * await this.waitForElement(this.submitButton);
   * await this.waitForElement(this.modal, 5000); // 5-second custom timeout
   */
  async waitForElement(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({
      state: 'visible',
      timeout: timeout || frameworkConfig.defaultTimeout,
    });
  }

  /**
   * Scroll the element into the visible area of the viewport.
   * Useful before interacting with elements that are below the fold.
   *
   * @param locator - Playwright `Locator` targeting the element to scroll to.
   *
   * @example
   * await this.scrollToElement(this.footer);
   * await this.scrollToElement(this.saveButton);
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Return the trimmed text content of an element.
   * Returns an empty string if the element has no text content.
   *
   * @param locator - Playwright `Locator` targeting the element.
   * @returns The text content string (never `null`).
   *
   * @example
   * const message = await this.getTextContent(this.flashMessage);
   * expect(message).toContain('Success');
   */
  async getTextContent(locator: Locator): Promise<string> {
    return (await locator.textContent()) || '';
  }

  /**
   * Check whether an element is currently visible on the page.
   * Does **not** throw if the element is hidden — returns `false` instead.
   *
   * @param locator - Playwright `Locator` targeting the element.
   * @returns `true` if the element is visible, `false` otherwise.
   *
   * @example
   * const visible = await this.isVisible(this.errorBanner);
   * if (visible) { ... }
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /**
   * Wait until there are no more than 2 in-flight network connections for
   * at least 500 ms — indicating the page has finished loading dynamic content.
   *
   * @param timeout - Unused parameter kept for API compatibility. The actual
   *                  timeout is controlled by Playwright's default.
   *
   * @example
   * await this.navigate('/dashboard');
   * await this.waitForNetworkIdle(); // ensure all XHR/fetch calls have settled
   */
  async waitForNetworkIdle(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Simulate pressing a keyboard key or key combination.
   *
   * @param key - Key name as a string. Supports single keys (`'Enter'`, `'Tab'`,
   *              `'Escape'`) and combos (`'Control+A'`, `'Shift+Tab'`).
   * @see https://playwright.dev/docs/api/class-keyboard#keyboard-press
   *
   * @example
   * await this.pressKey('Enter');
   * await this.pressKey('Escape');
   * await this.pressKey('Control+A'); // select all
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Set file(s) on an `<input type="file">` element.
   *
   * @param locator  - Playwright `Locator` targeting the file input element.
   * @param filePath - Absolute or workspace-relative path to the file to upload.
   *                   For multiple files, pass an array of paths.
   *
   * @example
   * await this.uploadFile(this.fileInput, 'test-files/sample.pdf');
   * await this.uploadFile(this.fileInput, ['test-files/a.png', 'test-files/b.png']);
   */
  async uploadFile(locator: Locator, filePath: string | string[]): Promise<void> {
    await locator.setInputFiles(filePath);
  }

  /**
   * Return the full URL of the current page.
   *
   * @returns The current page URL as a string.
   *
   * @example
   * const url = this.getCurrentUrl();
   * expect(url).toContain('/secure');
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Reload the current page and wait until `domcontentloaded` fires.
   *
   * @example
   * await this.refreshPage(); // useful to reset page state between steps
   */
  async refreshPage(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Create a resilient locator that tries multiple selector strategies and
   * matches the first one present on the page.  Uses Playwright's built-in
   * `.or()` chaining — if none of the selectors matches, the locator resolves
   * to zero elements (no automatic throw at definition time).
   *
   * This is the recommended approach for cross-browser resilience, multi-version
   * UI support, or when an element can appear with different attributes
   * depending on context (e.g. `data-testid` vs `aria-label` vs CSS fallback).
   *
   * @param selectors - One or more Playwright selector strings in priority order.
   *                    The first selector is tried first; subsequent ones act as
   *                    fallbacks via `.or()` chaining.
   * @returns A `Locator` that matches any element matched by any of the given
   *          selectors.
   *
   * @note If **more than one** selector matches simultaneously (strict mode),
   *       Playwright will throw.  Fallback selectors should be mutually exclusive
   *       — i.e. only one should exist on the page at a time.
   *
   * @example
   * // Primary: data-testid (preferred); fallback: aria-label; final: CSS
   * this.loginButton = this.locatorWithFallback(
   *   '[data-testid="login-btn"]',
   *   '[aria-label="Sign in"]',
   *   'button[type="submit"]'
   * );
   *
   * // Handles both old and new heading selectors across app versions
   * this.pageTitle = this.locatorWithFallback('h1.title', 'h2.page-header');
   */
  protected locatorWithFallback(...selectors: string[]): Locator {
    if (selectors.length === 0) {
      throw new Error('locatorWithFallback requires at least one selector');
    }
    let locator = this.page.locator(selectors[0]);
    for (let i = 1; i < selectors.length; i++) {
      locator = locator.or(this.page.locator(selectors[i]));
    }
    return locator;
  }

  /*
    * Wait for a specified number of seconds.  Useful for debugging or when a fixed wait is necessary (though prefer dynamic waits when possible).
    *
    * @param seconds - Number of seconds to wait.
    *
    * @example
    * await this.waitForTimeout(5); // wait for 5 seconds
    */  
  async waitForTimeout(seconds: number): Promise<void> {
    if (seconds > 30) {
      console.warn(`waitForTimeout: Waiting for ${seconds} seconds is unusually long and may indicate a test issue.`);
      throw new Error("More than 30 seconds is not suggested as it can indicate a test issue or lead to unnecessarily long test runs. Use with caution. \n If you need to wait for a long time, consider using dynamic waits (e.g. waitForApiResponse, waitForElement) instead of a fixed timeout.");
      
    }      
    await this.page.waitForTimeout(seconds * 1000);
  }
}
