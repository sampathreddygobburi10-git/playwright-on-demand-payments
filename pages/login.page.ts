import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = this.locatorWithFallback('[data-testid="username"]', '#emailId', 'input[name="username"]');
    this.passwordInput = this.locatorWithFallback('[data-testid="password"]', '#password', 'input[name="password"]');
    this.loginButton = this.locatorWithFallback('[data-testid="primary-button"]', 'button[type="submit"]');
  }

  async goToLoginPage(path: string): Promise<void> {
    const targetUrl = path;
    await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
