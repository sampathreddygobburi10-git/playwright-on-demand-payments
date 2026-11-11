import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

const MENU_ITEM_TESTID = /^autocomplete-menu-list-item-\d+$/;
const PRINTER_EDIT_DROPDOWN_TESTID =
  /checkSequence(Printer|CheckTray|hOverflowPrinter|OverFlowTray|DmsPrinterNo)/;

export class CheckSequenceDialogPage extends BasePage {
  readonly dialog: Locator;
  readonly selectFormInput: Locator;
  readonly sequenceInput: Locator;
  readonly sequenceMenu: Locator;
  readonly sequenceRequiredError: Locator;
  readonly archiveOnlyCheckbox: Locator;
  readonly printButton: Locator;
  readonly cancelButton: Locator;
  readonly printerSelectionToast: Locator;
  readonly editButton: Locator;
  readonly resetButton: Locator;
  readonly printerEditDropdowns: Locator;

  constructor(page: Page) {
    super(page);
    this.dialog = page.getByTestId('print-check-dialog-wrapper');
    this.selectFormInput = page.getByTestId('select-form-input-input-field');
    this.sequenceInput = page.getByTestId('sequence-input-input-field');
    this.sequenceMenu = page.getByTestId('sequence-input-list');
    this.sequenceRequiredError = page.getByText('Sequence is required');
    this.archiveOnlyCheckbox = page.getByTestId('archive-only-check-box-input');
    this.printButton = this.dialog.getByRole('button', { name: 'Print', exact: true });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.printerSelectionToast = page.getByText(
      'Printer selection is required to print checks.',
    );
    this.editButton = page.getByTestId('edit-btn');
    this.resetButton = page.getByTestId('reset-btn');
    this.printerEditDropdowns = page.getByTestId(PRINTER_EDIT_DROPDOWN_TESTID);
  }

  nextAvailableCheckNo(): Locator {
    return this.page
      .getByText('Next Available Check No.', { exact: true })
      .locator('xpath=following-sibling::span[1]');
  }

  async waitForDialog(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.page.getByText('Next Available Check No.')).toBeVisible();
  }

  async openSequenceMenu(): Promise<void> {
    await this.sequenceInput.click();
    await expect(this.sequenceMenu).toBeVisible();
  }

  async getSequenceOptions(): Promise<string[]> {
    await this.openSequenceMenu();
    return this.sequenceMenu.getByTestId(MENU_ITEM_TESTID).allTextContents();
  }

  async selectSequence(sequence: string): Promise<void> {
    await this.openSequenceMenu();
    await this.sequenceMenu
      .getByTestId(MENU_ITEM_TESTID)
      .filter({ hasText: new RegExp(`^${sequence}$`) })
      .click();
    await expect(this.sequenceInput).toHaveValue(sequence);
  }

  async clearSequence(): Promise<void> {
    await this.sequenceInput.click();
    await this.sequenceInput.fill('x');
    await expect(this.sequenceInput).toHaveValue('');
    await expect(this.sequenceRequiredError).toBeVisible();
  }

  async filterSequences(term: string): Promise<string[]> {
    await this.clearSequence();
    await this.sequenceInput.fill(term);
    await expect(this.sequenceMenu).toBeVisible();
    return this.sequenceMenu.getByTestId(MENU_ITEM_TESTID).allTextContents();
  }

  async selectForm(formName: string): Promise<void> {
    await this.selectFormInput.click();
    await this.page
      .getByTestId(MENU_ITEM_TESTID)
      .filter({ hasText: formName })
      .first()
      .click();
    await expect(this.selectFormInput).toHaveValue(formName);
  }

  async expectSequenceHidden(): Promise<void> {
    await expect(this.sequenceInput).toHaveCount(0);
  }

  async expectPrinterEditOptionsHidden(): Promise<void> {
    await expect(this.page.getByText('Printer', { exact: true })).toBeVisible();
    await expect(this.page.getByText('Overflow Printer', { exact: true })).toBeVisible();
    await expect(this.editButton).toHaveCount(0);
    await expect(this.dialog.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
    await expect(this.resetButton).toHaveCount(0);
    await expect(this.printerEditDropdowns).toHaveCount(0);
  }

  async expectSequence(sequence: string, checkNo: string): Promise<void> {
    await expect(this.sequenceInput).toHaveValue(sequence);
    await expect(this.nextAvailableCheckNo()).toHaveText(checkNo);
  }
}
