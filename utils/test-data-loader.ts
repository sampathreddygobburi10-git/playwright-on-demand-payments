import fs from 'fs';
import path from 'path';
import { frameworkConfig } from '../config/framework.config';

/**
 * Load typed test data from a JSON file stored under `test-data/<dealer>/<spec>.json`.
 *
 * The dealer folder is resolved from `DEALER_TYPE` in `.env` unless overridden.
 * Use this in spec files to keep test inputs out of the code and easy to maintain.
 *
 * @param specFileName - Name of the JSON file **without** the `.json` extension.
 *                       Typically matches the spec file name (e.g. `'login'`).
 * @param dealer       - Optional dealer/tenant folder name. Defaults to
 *                       `DEALER_TYPE` from `.env` (e.g. `'dealer1'`).
 * @returns Parsed JSON file contents typed as `T`.
 * @throws If the file does not exist at the resolved path.
 *
 * @example
 * // File: test-data/dealer1/login.json
 * // { "username": "tom", "password": "secret" }
 *
 * interface LoginData { username: string; password: string; }
 * const data = loadTestData<LoginData>('login');
 * await loginPage.login(data.username, data.password);
 *
 * // Load from a different dealer folder
 * const dealerBData = loadTestData<LoginData>('login', 'dealer2');
 */
export function loadTestData<T>(specFileName: string, dealer?: string): T {
  const dealerType = dealer || frameworkConfig.dealerType;
  const filePath = path.resolve(__dirname, '../test-data', dealerType, `${specFileName}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Test data file not found: ${filePath}\n` +
      `Expected path: test-data/${dealerType}/${specFileName}.json`
    );
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData) as T;
}
