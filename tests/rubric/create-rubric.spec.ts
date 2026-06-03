import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RubricListPage } from '../pages/RubricListPage';
import { RubricFormPage } from '../pages/RubricFormPage';
import { step, note } from '../utils/evidence';

const USER = process.env.ADMIN_USER ?? 'owner';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '123456';

test.describe('Rubric Builder - Admin CRUD', () => {
  test.beforeEach(async ({}, testInfo) => {
    await note(
      'scenario-info',
      [
        `Title:    ${testInfo.title}`,
        `User:     ${USER}`,
        `Base URL: ${process.env.BASE_URL ?? '(default)'}`,
        `Started:  ${new Date().toISOString()}`,
      ].join('\n'),
    );
  });

  test('admin can open Rubric List and Create form', async ({ page }) => {
    const login = new LoginPage(page);
    const list = new RubricListPage(page);
    const form = new RubricFormPage(page);

    await step(page, 'log in as admin', async () => {
      await login.goto();
      await login.expectLoaded();
      await login.login(USER, PASSWORD);
      await page.waitForURL((url) => !/sign-in/.test(url.pathname), { timeout: 15_000 });
    });

    await step(page, 'open Rubric List', async () => {
      await list.goto();
      await list.expectLoaded();
    });

    await step(page, 'open Create Rubric form', async () => {
      await list.gotoCreate();
      await form.expectLoaded();
    });

    await note('final-url', page.url());
  });

  test('admin can create a rubric end-to-end', async ({ page }) => {
    const login = new LoginPage(page);
    const list = new RubricListPage(page);
    const form = new RubricFormPage(page);
    const uniqueTitle = `E2E Rubric ${Date.now()}`;

    await step(page, 'log in as admin', async () => {
      await login.goto();
      await login.expectLoaded();
      await login.login(USER, PASSWORD);
      await page.waitForURL((url) => !/sign-in/.test(url.pathname), { timeout: 15_000 });
    });

    await step(page, 'open Create Rubric form', async () => {
      await list.goto();
      await list.gotoCreate();
      await form.expectLoaded();
    });

    await step(page, 'fill rubric header', async () => {
      await form.fillHeader({
        title: uniqueTitle,
        titleL2: `${uniqueTitle} (BM)`,
        additionalDetails: 'Created by e2e test',
        status: 'submitted',
      });
    });

    await step(page, 'fill first criterion + score', async () => {
      await form.fillFirstCriterion({
        title: 'Pendahuluan',
        titleL2: 'Pendahuluan',
        scoreTitle: 'CEMERLANG',
        scoreTitleL2: 'CEMERLANG',
        scoreMin: '59',
        scoreMax: '70',
        descriptor: 'Isu semasa dinyatakan dengan jelas dan menarik.',
        descriptorL2: 'Isu semasa dinyatakan dengan jelas dan menarik.',
      });
    });

    await step(page, 'submit rubric', async () => {
      await form.submit();
      await page.waitForURL(/\/rubrics(\?|$)/, { timeout: 15_000 });
    });

    await step(page, 'verify rubric appears in DataTable', async () => {
      // DataTable loads via AJAX with default filters that may hide the row.
      // Pick "All" status and "All time" to make the test deterministic.
      await page.locator('#filter-status').selectOption('all');
      await page.locator('#filter-time-range').selectOption('');
      await page.locator('#apply-filter').click();
      await expect(page.getByText(uniqueTitle).first()).toBeVisible({ timeout: 10_000 });
    });

    await note('final-url', page.url());
    await note('rubric-title', uniqueTitle);
  });
});
