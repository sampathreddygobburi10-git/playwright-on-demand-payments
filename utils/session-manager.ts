import { type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_DIR = path.resolve(__dirname, '../../.auth');

/**
 * Manages Playwright browser storage state (cookies + localStorage) so that
 * tests can reuse an existing authenticated session instead of logging in for
 * every test run.
 *
 * Controlled by two `.env` flags:
 * - `USE_SESSION_STORAGE=true`  — enables session persistence.
 * - `ALREADY_SESSION_STORAGE_AVAILABLE=true` — skips the login step if a
 *   session file already exists.
 *
 * Session files are stored under `.auth/` which should be git-ignored.
 *
 * @example
 * // In global-setup.ts — save session after first login
 * await SessionManager.saveSessionStorage(page);
 *
 * // In a test — check before deciding whether to log in
 * if (!SessionManager.sessionStorageExists()) {
 *   await loginPage.login(username, password);
 *   await SessionManager.saveSessionStorage(page);
 * }
 */
export class SessionManager {
  /**
   * Serialize the current browser context's cookies and localStorage into a
   * JSON file under `.auth/`.  Creates the `.auth/` directory if needed.
   *
   * @param page     - Playwright `Page` whose context state should be saved.
   * @param fileName - Output filename (default: `'session.json'`).
   *
   * @example
   * await loginPage.login('user@test.com', 'password');
   * await SessionManager.saveSessionStorage(page); // saves to .auth/session.json
   */
  static async saveSessionStorage(page: Page, fileName: string = 'session.json'): Promise<void> {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    const storageState = await page.context().storageState();
    const filePath = path.join(AUTH_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(storageState, null, 2));
  }

  /**
   * Return the absolute path to a session file — useful for passing to
   * Playwright's `storageState` browser context option.
   *
   * @param fileName - Session file name (default: `'session.json'`).
   * @returns Absolute path string to `.auth/<fileName>`.
   *
   * @example
   * const ctx = await browser.newContext({
   *   storageState: SessionManager.getSessionStoragePath(),
   * });
   */
  static getSessionStoragePath(fileName: string = 'session.json'): string {
    return path.join(AUTH_DIR, fileName);
  }

  /**
   * Check whether a session file exists on disk.
   * Use this to decide whether to skip the login flow.
   *
   * @param fileName - Session file name (default: `'session.json'`).
   * @returns `true` if the file exists, `false` otherwise.
   *
   * @example
   * if (!SessionManager.sessionStorageExists()) {
   *   await loginPage.login(user, pass);
   *   await SessionManager.saveSessionStorage(page);
   * }
   */
  static sessionStorageExists(fileName: string = 'session.json'): boolean {
    return fs.existsSync(path.join(AUTH_DIR, fileName));
  }

  /**
   * Delete a session file from disk, forcing the next run to perform a
   * fresh login.
   *
   * @param fileName - Session file name to delete (default: `'session.json'`).
   *
   * @example
   * // Tear-down: reset auth state after a test that changes user permissions
   * SessionManager.clearSessionStorage();
   */
  static clearSessionStorage(fileName: string = 'session.json'): void {
    const filePath = path.join(AUTH_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
