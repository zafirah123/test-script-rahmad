import { expect, type Locator, type Page } from '@playwright/test';

export class RubricListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /rubric list/i });
    this.createButton = page.getByRole('link', { name: /^create$/i });
  }

  async goto() {
    await this.page.goto('/rubrics');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async gotoCreate() {
    await this.createButton.click();
    await this.page.waitForURL(/\/rubrics\/create/);
  }

  /** Show all statuses + all time so any seeded rubric is findable. */
  async widenFilters() {
    await this.page.locator('#filter-status').selectOption('all');
    await this.page.locator('#filter-time-range').selectOption('');
    await this.page.locator('#apply-filter').click();
  }

  rowByTitle(title: string) {
    return this.page.locator('tr', { hasText: title }).first();
  }

  /** Open the row action dropdown menu and click the matching item. */
  async clickRowAction(title: string, action: 'edit' | 'preview' | 'duplicate' | 'delete') {
    const row = this.rowByTitle(title);
    const labels: Record<typeof action, RegExp> = {
      edit: /edit/i,
      preview: /preview/i,
      duplicate: /duplicate/i,
      delete: /delete/i,
    };
    // Bring the row into view first — under parallel load the row may be off-screen
    // and Bootstrap's dropdown won't render the menu in a usable position.
    await row.scrollIntoViewIfNeeded();
    await row.locator('.more-dropdown').click();
    const menuItem = row.locator('.dropdown-menu a').filter({ hasText: labels[action] }).first();
    await menuItem.click({ force: true, timeout: 5_000 });
  }
}
