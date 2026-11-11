import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class OnDemandCheckPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  byTestId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  inputField(id: string): Locator {
    return this.page.locator(`[data-testid="${id}-input-field"]`);
  }

  static odcPath(): string {
    if (process.env.ODC_PATH) return process.env.ODC_PATH;
    return (process.env.BASE_URL ?? '').includes('localhost')
      ? '/odc'
      : '/accounting/on-demand-payments';
  }

  async gotoOdc(): Promise<void> {
    await this.page.goto(OnDemandCheckPage.odcPath(), { waitUntil: 'domcontentloaded' });
  }

  // ---------- radio / check type ----------
  radioGroup(testId: string, label: string): Locator {
    return this.page.getByRole('radiogroup', { name: label }).or(
      this.page.locator(`[data-testid="${testId}"]`),
    );
  }

  accountingRadio(): Locator {
    return this.page.locator('input#accounting');
  }

  // ---------- date picker ----------
  getDatePickerInput(): Locator {
    return this.page.locator('[data-testid="payment-date-datepicker-odc-date-input-input-field"]');
  }

  // ---------- payee type / name ----------
  getPayeeTypeField(): Locator {
    return this.page.locator('[data-testid="payee-type-dropdown-input-field"]');
  }

  getPayeeTypeButton(): Locator {
    return this.page.locator('[data-testid="base-payee-type-dropdown"]');
  }

  getPayeeTypeMenuItem(index: number): Locator {
    return this.page.locator(`[data-testid="menu-item-${index}"]`);
  }

  getPayeeTypeMenuItemByLabel(label: string): Locator {
    return this.page.getByRole('button', { name: label });
  }

  getPayeeTypeVendor(): Locator {
    return this.getPayeeTypeMenuItemByLabel('Vendor');
  }

  getPayeeTypeFreeform(): Locator {
    return this.getPayeeTypeMenuItemByLabel('Freeform');
  }

  getPayeeTypeEmployee(): Locator {
    return this.getPayeeTypeMenuItemByLabel('Employee');
  }

  getPayeeTypeMiscellaneous(): Locator {
    return this.getPayeeTypeMenuItemByLabel('Miscellaneous');
  }

  getPayeeNameTypeaheadField(): Locator {
    return this.page.locator('[data-testid="payee-name-type-ahead-input-input-field"]');
  }

  getPayeeNameInputField(): Locator {
    return this.page.locator('[data-testid="payee-name-input-input-field"]');
  }

  getPayeeName2Field(): Locator {
    return this.page.locator('[data-testid="payee-name2-input-field"]');
  }

  getPayeeSearchButton(): Locator {
    return this.page.locator('[data-testid="payee-search-btn"]');
  }

  getPayeeSearchIcon(): Locator {
    return this.page.locator('[data-testid="payee-search-btn-icon"]');
  }

  getAddNameButton(): Locator {
    return this.page.locator('[data-testid="add-new-name-btn-icon"]');
  }

  // ---------- payee search dialog ----------
  getPayeeTypeMenuButton(): Locator {
    return this.page.locator('[data-testid="base-odp-payee-search-type-dropdown"]');
  }

  getVendorTypeMenuButton(): Locator {
    return this.page.locator('[data-testid="menu-item-1-text"]');
  }

  getPayeeTypeSearchInput(): Locator {
    // data-testid targets a wrapper div; the actual <input> is the first child
    return this.page.locator('[data-testid="odp-payee-search-input"] input');
  }

  getPayeeSearchQueryButton(): Locator {
    return this.page.locator('[data-testid="odp-payee-search-button"]');
  }

  getFirstControlRadioButton(id: string): Locator {
    return this.page.locator(`[data-testid="odp-payee-search-radio-${id}"]`);
  }

  getPayeeSelectButton(): Locator {
    return this.page.locator('#select-odp-payee-search-dialog').or(
      this.page.getByRole('button', { name: 'Select' }),
    );
  }

  // ---------- address fields ----------
  getAddressLine1(): Locator {
    return this.page.locator('[data-testid="address-line1-input-input-field"]');
  }

  getAddressLine2(): Locator {
    return this.page.locator('[data-testid="address-line2-input-input-field"]');
  }

  getCity(): Locator {
    return this.page.locator('[data-testid="city-input-input-field"]');
  }

  getState(): Locator {
    return this.page.locator('[data-testid="state-input-input-field"]');
  }

  getZipCode(): Locator {
    return this.page.locator('[data-testid="zip-code-input-input-field"]');
  }

  // ---------- amount fields (header + DLPG) ----------
  getAmountField(index: number | string): Locator {
    return this.page.locator(`[data-testid="odc-amount-input-${index}-input-field"]`);
  }

  getAmountCell(index: number): Locator {
    return this.page.locator(`[data-testid="currency-input-${index}-input-field"]`);
  }

  getCountCell(index: number): Locator {
    return this.page.locator(`[data-testid="count-input-${index}-input-field"]`);
  }

  getDescriptionCell(index: number): Locator {
    return this.page.locator(`[data-testid="description-input-${index}-input-field"]`);
  }

  getDescriptionField(index: number): Locator {
    return this.page.getByRole('textbox', { name: 'Description' }).nth(index);
  }

  // ---------- accounting group / store ----------
  getAccountingGroupPicker(): Locator {
    return this.page.getByRole('textbox', { name: 'Accounting Group' });
  }

  getStorePicker(): Locator {
    return this.page
      .locator('[data-testid="ap-payments-accounting-group-dropdown-input-field"]')
      .or(this.page.locator('[data-testid="ap-payments-store-dropdown-input-field"]'));
  }

  getStoreSearchMenuIcon(): Locator {
    return this.page.getByTestId('store-search-menu-storybook-icon');
  }

  // ---------- account search cell / dialog ----------
  getAccountCell(): Locator {
    return this.page.getByTestId('account-search-menu-input-field');
  }

  getAccountSearchIcon(index: number | string): Locator {
    return this.page.locator(`[data-testid="search-row-button-${index}-account-cell"]`);
  }

  getAccountSelectButton(): Locator {
    return this.page.locator('#select-account-search-dialog');
  }

  getAccountSearchMenuListItem(index: number): Locator {
    return this.page.locator(`[data-testid="account-search-menu-list-item-${index}"]`);
  }

  getAccountSearchMenuListItemText(index: number): Locator {
    return this.page.locator(`[data-testid="account-search-menu-list-item-${index}-text"]`);
  }

  getAccountSearchClearIcon(): Locator {
    return this.page.getByTestId('account-search-menu-clear-icon');
  }

  getAccountDropdownInput(): Locator {
    return this.page.getByRole('dialog').getByTestId('account-type-input-input-input-field');
  }

  // type is the visible label text of the option (e.g. 'Asset', 'Operating Expense')
  getAccountDropdownData(type: string): Locator {
    return this.page.getByRole('checkbox', { name: type });
  }

  getFirstAccountDataRadioButtons(): Locator {
    return this.page.locator('[data-testid^="radio-select-account-for-"]');
  }

  getFirstAccountRadioButton(accountNumber: string): Locator {
    return this.page.locator(`[data-testid="radio-select-account-for-${accountNumber}"]`);
  }

  // ---------- control search cell / dialog ----------
  getControlCell(): Locator {
    return this.page.getByTestId('control-search-menu-input-field');
  }

  getControlSearchButton(index: number): Locator {
    return this.page.getByTestId(`search-row-button-${index}-control-cell`);
  }

  getControlSearchInput(): Locator {
    return this.page.locator('[data-testid="control-type-menu-input-menu-input-input-field"]');
  }

  getControlSearchField(): Locator {
    return this.page.locator('#control-search-input-field');
  }

  getControlError(): Locator {
    return this.page.locator('[data-testid="control-search-menu-error-text"]');
  }

  getVendorControlSearch(): Locator {
    return this.page.locator('[data-testid="control-type-menu-input-menu-item-2"]');
  }

  getControlSelectButton(): Locator {
    return this.page.locator('#select-control-search-dialog').or(
      this.page.getByRole('button', { name: 'Select' }),
    );
  }

  getControlDropdownInput(): Locator {
    return this.page.locator(`[data-testid="control-type-input-input-input-field"]`);
  }

  getControlDropdownData(code: string): Locator {
    return this.page.locator(`[data-testid="control-type-input-menu-list-item-${code}-checkbox"]`);
  }

  getSelectControlByRadio(id: string): Locator {
    return this.page.locator(`[data-testid="radio-select-control-for-${id}"]`);
  }

  accountSearchControlType(): Locator {
    return this.page.getByTestId('base-control-type-input-input');
  }

  accountControlTypeMenu(): Locator {
    return this.page.getByTestId('control-type-input-menu-container');
  }

  // ---------- DLPG grid ----------
  getAddRowButton(): Locator {
    return this.page.getByTestId('add-row-button');
  }

  getProductivityCell(): Locator {
    return this.page.getByTestId('productivity-cell-input-id');
  }

  // ---------- print / dialogs ----------
  getODCPrintCheckButton(): Locator {
    return this.page.locator('[data-testid="print-checks-button"]');
  }

  getPrintButton(): Locator {
    return this.page.getByRole('button', { name: 'Print Check' });
  }

  getCheckSequenceDialogPrintCheckButton(): Locator {
    return this.page.getByRole('button', { name: 'Print' });
  }

  getPrintChecksDialogVoidButton(): Locator {
    return this.page.getByRole('button', { name: /void this check/i });
  }

  getSuccessDialogPrintCheck():Locator {
    return this.page.getByRole('button',{name: 'Yes'});
  }
  
  getToastDismissButton(): Locator {
    return this.page.getByRole('button', { name: 'Close' });
  }

  // ---------- keyboard util ----------
  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async pressShiftTab(): Promise<void> {
    await this.page.keyboard.press('Shift+Tab');
  }

  async expectAccountingGroupLoaded(): Promise<void> {
    const group = this.getAccountingGroupPicker();
    const store = this.getStorePicker();
    await expect(group.or(store).first()).toBeVisible();
    const target = (await group.count()) ? group : store;
    await expect(target).not.toHaveValue('');
  }
}
