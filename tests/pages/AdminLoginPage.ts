import { expect, type Locator, type Page } from '@playwright/test';

export class AdminLoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder(/username or email/i);
    this.passwordInput = page.getByPlaceholder(/your password/i);
    this.submitButton = page.getByRole('button', { name: 'Sign In', exact: true });
  }

  async goto() {
    await this.page.goto('/app/sign-in');
  }

  async expectLoaded() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async login(user: string, password: string) {
    await this.emailInput.fill(user);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}
