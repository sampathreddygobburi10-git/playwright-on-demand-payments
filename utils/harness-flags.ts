import { type Page } from '@playwright/test';
import { urlPatterns } from '../network/odc-mocks';

export type HarnessEvaluation = {
  flag: string;
  value: string;
  kind?: string;
  identifier?: string;
};

export class HarnessFlags {
  static async set(page: Page, flags: Record<string, boolean>): Promise<void> {
    await page.route(urlPatterns.harnessStream, async (route) => {
      await route.abort();
    });

    await page.route(urlPatterns.harnessEvaluations, async (route) => {
      const response = await route.fetch();
      const evaluations = (await response.json().catch(() => [])) as HarnessEvaluation[];
      const patched = Array.isArray(evaluations) ? [...evaluations] : [];

      Object.entries(flags).forEach(([flag, value]) => {
        const existing = patched.findIndex((evaluation) => evaluation.flag === flag);
        const forced: HarnessEvaluation = {
          flag,
          value: String(value),
          kind: 'boolean',
          identifier: String(value),
        };
        if (existing >= 0) {
          patched[existing] = { ...patched[existing], ...forced };
        } else {
          patched.push(forced);
        }
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(patched),
      });
    });
  }

  static async forceOn(page: Page, flagNames: string[]): Promise<void> {
    await HarnessFlags.set(
      page,
      Object.fromEntries(flagNames.map((flag) => [flag, true])),
    );
  }
}
