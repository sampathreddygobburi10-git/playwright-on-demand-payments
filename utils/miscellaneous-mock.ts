import { type Page } from '@playwright/test';
import { NetworkInterceptor } from './network-interceptor';

const MISC_SEARCH_URL_PATTERN = '**/odc/control-search/miscellaneous/**';

export class MiscellaneousMock {
  static async withName2(page: Page): Promise<void> {
    await NetworkInterceptor.mockApiResponse(page, MISC_SEARCH_URL_PATTERN, [
      {
        id: 'MISC001',
        name: { displayName: 'EXETER FINANCE CORPORATION', company: 'EXETER FINANCE CORPORATION' },
        name2: { display: 'EXETER FINANCE CORPORATION NAME 2' },
        address: { line1: '123 Main St', line2: '', city: 'Anytown', state: 'CA', postalCode: '90001', country: 'USA' },
      },
    ]);
  }
}
