import { test as base, expect as baseExpect, Locator, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { HomePage } from '../pages/home.page';
import { PrintDialogPage } from '../pages/print-dialog.page';
import { CheckSequenceDialogPage } from '../pages/check-sequence-dialog.page';
import { OnDemandCheckPage } from '../pages/on-demand-check.page';
import { WebActions } from '../utils/web-actions';
import { z } from 'zod';


declare global {
  namespace PlaywrightTest {
      interface Matchers<R, T = unknown> {
      toBeVisibleAndEnabled(): Promise<R>;
      toHaveTextTrimmed(expected: string): Promise<R>;
      toContainTextIgnoreCase(expected: string): Promise<R>;
      toBeWithinRange(min: number, max: number): R;
      toMatchSchema(schema: z.ZodType): R;
    }
  }
}

type CustomFixtures = {
  loginPage: LoginPage;
  homePage: HomePage;
  webActions: WebActions;
  printDialogPage: PrintDialogPage;
  checkSequenceDialogPage: CheckSequenceDialogPage;
  odcPage: OnDemandCheckPage;
};

export const test = base.extend<CustomFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  webActions: async ({ page }, use) => {
    await use(new WebActions(page));
  },
  printDialogPage: async ({ page }, use) => {
    await use(new PrintDialogPage(page));
  },
  checkSequenceDialogPage: async ({ page }, use) => {
    await use(new CheckSequenceDialogPage(page));
  },

  odcPage: async ({ page }, use) => {
    await use(new OnDemandCheckPage(page));
  },
});

export const expect = baseExpect.extend({
  async toBeVisibleAndEnabled(locator: Locator) {
    const assertionName = 'toBeVisibleAndEnabled';
    let pass: boolean;
    try {
      await baseExpect(locator).toBeVisible();
      await baseExpect(locator).toBeEnabled();
      pass = true;
    } catch {
      pass = false;
    }

    return {
      message: () => `expected element to be visible and enabled`,
      pass,
      name: assertionName,
    };
  },

  async toHaveTextTrimmed(locator: Locator, expected: string) {
    const assertionName = 'toHaveTextTrimmed';
    let actual: string;
    try {
      actual = ((await locator.textContent()) || '').trim();
    } catch {
      actual = '';
    }
    const pass = actual === expected;

    return {
      message: () => `expected element to have trimmed text "${expected}" but got "${actual}"`,
      pass,
      name: assertionName,
      expected,
      actual,
    };
  },

  async toContainTextIgnoreCase(locator: Locator, expected: string) {
    const assertionName = 'toContainTextIgnoreCase';
    let actual: string;
    try {
      actual = ((await locator.textContent()) || '').toLowerCase();
    } catch {
      actual = '';
    }
    const pass = actual.includes(expected.toLowerCase());

    return {
      message: () => `expected element text to contain "${expected}" (case-insensitive) but got "${actual}"`,
      pass,
      name: assertionName,
      expected,
      actual,
    };
  },

  toBeWithinRange(actual: number, min: number, max: number) {
    const pass = actual >= min && actual <= max;
    return {
      message: () => `expected ${actual} to be within range [${min}, ${max}]`,
      pass,
      name: 'toBeWithinRange',
      expected: `${min} - ${max}`,
      actual,
    };
  },

  toMatchSchema(actual: unknown, schema: z.ZodType) {
    const result = schema.safeParse(actual);
    return {
      message: () =>
        result.success
          ? 'expected data not to match schema'
          : `Schema validation failed: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      pass: result.success,
      name: 'toMatchSchema',
    };
  },
});

export { type Page };
