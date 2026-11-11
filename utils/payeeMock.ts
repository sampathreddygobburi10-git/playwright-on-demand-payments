import { Page } from '@playwright/test';
import { endpoints } from '../network/odc-mocks';
import path from 'node:path';

export const mockPayeeSearch = async (
  page: Page,
  fixture: string,
) => {
  await page.route(endpoints.controlSearchVendors, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      path: path.resolve(__dirname, '../fixtures', fixture),
    });
  });
};