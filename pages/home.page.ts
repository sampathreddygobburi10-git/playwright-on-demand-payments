import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { expect } from '../fixtures';

export class HomePage extends BasePage {
  private readonly pageHeader: Locator;
  private readonly paymentsTable: Locator;
  private readonly printButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeader = this.page.getByTestId('on-demand-page-header-title-title');
    this.paymentsTable = this.page.getByTestId('on-demand-table');
    this.printButton = this.page.getByTestId('on-demand-print-button');
  }

  getPageHeader(): Locator {
    return this.pageHeader;
  }

  getPaymentsTable(): Locator {
    return this.paymentsTable;
  }

  getPrintButton(): Locator {
    return this.printButton;
  }

  async navigateTo(): Promise<void> {
    await this.navigate('/accounting');
    await this.page.getByTestId('accessible-workflow-payment-management:on-demand-payments').click();
    await this.navigate('/accounting/on-demand-payments');
    await expect(this.pageHeader).toContainText('Payments: On-Demand', { timeout: 30000 });
  }

  async verifyPageHeader(): Promise<void> {
    await expect(this.pageHeader).toContainText('Payments: Register', { timeout: 30000 });
  }

  async openPrintDialog(): Promise<void> {
    await this.waitForElement(this.printButton);
    await this.printButton.click();
  }

  // Legacy stub kept for backwards compat — remove once all specs are migrated
  async verifySearchResultsGrid(): Promise<void> {
    await this.waitForElement(this.paymentsTable);
    await expect(this.paymentsTable).toBeVisible();
  }
}
