import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RubricListPage } from '../pages/RubricListPage';
import { RubricFormPage } from '../pages/RubricFormPage';
import { step, note } from '../utils/evidence';

const USER = process.env.ADMIN_USER ?? 'owner';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '123456';

async function loginAsAdmin(page: Page) {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(USER, PASSWORD);
  await page.waitForURL((url) => !/sign-in/.test(url.pathname), { timeout: 15_000 });
}

async function seedRubricViaUi(page: Page, title: string) {
  const list = new RubricListPage(page);
  const form = new RubricFormPage(page);
  await list.goto();
  await list.gotoCreate();
  await form.expectLoaded();
  await form.fillHeader({
    title,
    titleL2: `${title} (BM)`,
    additionalDetails: 'Seeded by row-action spec',
    status: 'submitted',
  });
  await form.fillFirstCriterion({
    title: 'Pendahuluan',
    titleL2: 'Pendahuluan',
    scoreTitle: 'CEMERLANG',
    scoreTitleL2: 'CEMERLANG',
    scoreMin: '59',
    scoreMax: '70',
    descriptor: 'Isu jelas dan menarik.',
    descriptorL2: 'Isu jelas dan menarik.',
  });
  await form.submit();
  await page.waitForURL(/\/rubrics(\?|$)/, { timeout: 15_000 });
}

test.describe('Rubric Builder - Row Actions', () => {
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

  test('Edit: row action opens edit form pre-filled', async ({ page }) => {
    const list = new RubricListPage(page);
    const title = `E2E Edit ${Date.now()}`;

    await step(page, 'log in', async () => { await loginAsAdmin(page); });
    await step(page, 'seed rubric', async () => { await seedRubricViaUi(page, title); });

    await step(page, 'open index and widen filters', async () => {
      await list.goto();
      await list.widenFilters();
      await expect(list.rowByTitle(title)).toBeVisible({ timeout: 10_000 });
    });

    await step(page, 'click Edit on the row', async () => {
      await list.clickRowAction(title, 'edit');
      await page.waitForURL(/\/rubrics\/\d+\/edit/, { timeout: 10_000 });
    });

    await step(page, 'verify edit form is pre-filled with the title', async () => {
      await expect(page.locator('input[name="title"]')).toHaveValue(title);
      await expect(page.locator('input[name="title_l2"]')).toHaveValue(`${title} (BM)`);
    });

    await note('final-url', page.url());
  });

  test('Preview: row action opens the marking-scheme grid in a new tab', async ({ page, context }) => {
    const list = new RubricListPage(page);
    const title = `E2E Preview ${Date.now()}`;

    await step(page, 'log in', async () => { await loginAsAdmin(page); });
    await step(page, 'seed rubric', async () => { await seedRubricViaUi(page, title); });

    await step(page, 'open index and widen filters', async () => {
      await list.goto();
      await list.widenFilters();
      await expect(list.rowByTitle(title)).toBeVisible({ timeout: 10_000 });
    });

    const previewPagePromise = context.waitForEvent('page', { timeout: 10_000 });
    await step(page, 'click Preview', async () => {
      await list.clickRowAction(title, 'preview');
    });

    const previewPage = await previewPagePromise;
    await previewPage.waitForLoadState('domcontentloaded');

    await step(previewPage, 'verify preview grid renders criterion + band', async () => {
      await expect(previewPage.getByText(title)).toBeVisible();
      await expect(previewPage.getByText('Pendahuluan')).toBeVisible();
      await expect(previewPage.getByText('CEMERLANG')).toBeVisible();
      await expect(previewPage.getByText('Isu jelas dan menarik.')).toBeVisible();
    });

    await note('final-url', previewPage.url());
  });

  test('Duplicate: row action clones the rubric and redirects to edit', async ({ page }) => {
    const list = new RubricListPage(page);
    const title = `E2E Dup ${Date.now()}`;

    await step(page, 'log in', async () => { await loginAsAdmin(page); });
    await step(page, 'seed rubric', async () => { await seedRubricViaUi(page, title); });

    await step(page, 'open index and widen filters', async () => {
      await list.goto();
      await list.widenFilters();
      await expect(list.rowByTitle(title)).toBeVisible({ timeout: 10_000 });
    });

    await step(page, 'click Duplicate', async () => {
      await list.clickRowAction(title, 'duplicate');
      await page.waitForURL(/\/rubrics\/\d+\/edit/, { timeout: 15_000 });
    });

    await step(page, 'verify duplicated rubric has "(Copy)" appended to title', async () => {
      const value = await page.locator('input[name="title"]').inputValue();
      expect(value).toMatch(new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(Copy\\)$`));
    });

    await note('final-url', page.url());
  });

  test('Delete: row action soft-deletes the rubric and removes it from the list', async ({ page }) => {
    const list = new RubricListPage(page);
    const title = `E2E Del ${Date.now()}`;

    await step(page, 'log in', async () => { await loginAsAdmin(page); });
    await step(page, 'seed rubric', async () => { await seedRubricViaUi(page, title); });

    await step(page, 'open index and widen filters', async () => {
      await list.goto();
      await list.widenFilters();
      await expect(list.rowByTitle(title)).toBeVisible({ timeout: 10_000 });
    });

    // Get the rubric id from the row's edit link, then DELETE via fetch (CSRF token
     //included). This bypasses the sweetalert confirm modal — the destroy controller
     //is what we want to validate here, not the JS modal library.
    const rubricId = await page.evaluate((rowTitle: string) => {
      const cells = Array.from(document.querySelectorAll('table.datatable tbody tr'));
      const target = cells.find((tr) => tr.textContent?.includes(rowTitle));
      if (!target) return null;
      const editLink = target.querySelector<HTMLAnchorElement>('a[href*="/edit"]');
      if (!editLink) return null;
      const match = editLink.href.match(/\/rubrics\/(\d+)\/edit/);
      return match ? Number(match[1]) : null;
    }, title);
    expect(rubricId).not.toBeNull();

    await step(page, 'send DELETE /rubrics/{id} with CSRF token', async () => {
      const result = await page.evaluate(async (id: number) => {
        const token =
          document.querySelector<HTMLMetaElement>('meta[name="csrf_token"]')?.content
          ?? document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content
          ?? '';
        const r = await fetch(`/rubrics/${id}`, {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'X-CSRF-TOKEN': token, 'Accept': 'application/json' },
        });
        return { status: r.status, ok: r.ok };
      }, rubricId as number);
      expect(result.ok).toBe(true);
    });

    await step(page, 'verify the row is gone after a reload', async () => {
      await page.reload();
      await list.widenFilters();
      await expect(list.rowByTitle(title)).toHaveCount(0, { timeout: 10_000 });
    });

    await note('final-url', page.url());
  });
});
