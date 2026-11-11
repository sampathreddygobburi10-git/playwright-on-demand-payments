import { expect, type Locator, type Page } from '@playwright/test';

const PRINTER_OPTION_TESTID = /^printer-select-dropdown-\d+$/;

export class PrintDialogPage {
  readonly page: Page;
  readonly dialog: Locator;

  readonly printerInput: Locator;
  readonly paperSizeInput: Locator;
  readonly trayInput: Locator;
  readonly copiesInput: Locator;
  readonly orientationInput: Locator;

  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  readonly printerMenu: Locator;
  readonly printerLoading: Locator;
  readonly printerError: Locator;
  readonly printerEmpty: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog', { name: /print: dialog/i });

    this.printerInput = this.dialog.getByTestId('printer-select-dropdown-input-field');
    this.paperSizeInput = this.dialog.getByTestId('paper-select-dropdown-input-field');
    this.trayInput = this.dialog.getByTestId('tray-select-dropdown-input-field');
    this.copiesInput = this.dialog.getByTestId('copy-input-input-field');
    this.orientationInput = this.dialog.getByTestId('orientation-select-dropdown-input-field');

    this.cancelButton = this.dialog.getByRole('button', { name: /cancel/i });
    this.confirmButton = this.dialog.getByRole('button', { name: /confirm/i });

    this.printerMenu = this.page.getByTestId('menu-container-printer-select-dropdown');
    this.printerLoading = this.dialog.getByTestId('printer-loading');
    this.printerError = this.dialog.getByTestId('printer-error');
    this.printerEmpty = this.dialog.getByTestId('printer-empty');
  }

  async openPrinterMenu(): Promise<void> {
    await this.printerInput.click();
    await expect(this.printerMenu).toBeVisible();
  }

  async getPrinterOptionLabels(): Promise<string[]> {
    await this.openPrinterMenu();
    const labels = await this.printerMenu.getByTestId(PRINTER_OPTION_TESTID).allTextContents();
    await this.page.getByRole('heading', { name: /print: select options/i }).click();
    await expect(this.printerMenu).not.toBeVisible();

    return labels;
  }

  async selectPrinterByIndex(index: number): Promise<void> {
    await this.openPrinterMenu();
    await this.printerMenu.getByTestId(`printer-select-dropdown-${index}`).click();
    await expect(this.printerMenu).not.toBeVisible();
  }

  async getSelectedPrinter(): Promise<string> {
    return this.printerInput.inputValue();
  }

  async getSelectedTray(): Promise<string> {
    return this.trayInput.inputValue();
  }

  async getSelectedPaperSize(): Promise<string> {
    return this.paperSizeInput.inputValue();
  }

  async verifyLoadingState(): Promise<void> {
    await expect(this.printerLoading).toBeVisible();
    await expect(this.printerInput).not.toBeVisible();
    await expect(this.confirmButton).toBeDisabled();
  }

  async verifyErrorState(): Promise<void> {
    await expect(this.printerError).toBeVisible();
    await expect(this.printerError).toContainText(/failed to retrieve printer\(s\), please contact cdk/i);
    await expect(this.trayInput).not.toBeVisible();
    await expect(this.paperSizeInput).not.toBeVisible();
    await expect(this.confirmButton).toBeDisabled();
  }

  async verifyEmptyState(): Promise<void> {
    await expect(this.printerEmpty).toBeVisible();
    await expect(this.printerEmpty).toContainText(/no printers are available for this store/i);
    await expect(this.trayInput).not.toBeVisible();
    await expect(this.paperSizeInput).not.toBeVisible();
    await expect(this.confirmButton).toBeDisabled();
  }

  async verifyVisible(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /print: select options/i })).toBeVisible();
  }

  async verifyPrintControlsVisible(): Promise<void> {
    await expect(this.printerInput).toBeVisible();
    await expect(this.paperSizeInput).toBeVisible();
    await expect(this.trayInput).toBeVisible();
    await expect(this.copiesInput).toBeVisible();
    await expect(this.orientationInput).toBeVisible();

    await expect(this.dialog.getByText(/single sided/i)).toBeVisible();
    await expect(this.dialog.getByText(/double sided/i)).toBeVisible();

    await expect(this.cancelButton).toBeVisible();
    await expect(this.confirmButton).toBeVisible();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();

    await expect(this.dialog).not.toBeVisible();
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  async setCopies(value: string): Promise<void> {
    await this.copiesInput.fill(value);
  }

  async blurCopies(): Promise<void> {
    await this.copiesInput.blur();
  }

  async expectCopiesValue(value: string): Promise<void> {
    await expect(this.copiesInput).toHaveValue(value);
  }

  /**
   * Exercise every copies-input scenario:
   * default value, valid entry, non-numeric stripping, minimum clamping,
   * leading-zero normalization, and the empty-on-blur reset.
   */
  async verifyCopiesInputScenarios(): Promise<void> {
    // Defaults to a single copy.
    await this.expectCopiesValue('1');

    // A valid numeric value is accepted as typed.
    await this.setCopies('5');
    await this.expectCopiesValue('5');

    // Non-numeric characters are stripped from the value.
    await this.setCopies('1a2b3');
    await this.expectCopiesValue('123');

    // Values below the minimum are clamped up to 1.
    await this.setCopies('0');
    await this.expectCopiesValue('1');

    // Leading zeros are normalized away.
    await this.setCopies('007');
    await this.expectCopiesValue('7');

    // The field may be cleared while editing, then resets to 1 on blur.
    await this.setCopies('');
    await this.expectCopiesValue('');
    await this.blurCopies();
    await this.expectCopiesValue('1');
  }
}
