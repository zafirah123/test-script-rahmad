import { test, expect } from '@playwright/test';
import { step, note } from '../utils/evidence';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { createExcelFile, CHAPTER_HEADERS, chapterRow, selectSelect2, selectSyllabusKSSR } from './helpers';

const ADMIN_USER = 'rahmad@pandai.org';
const ADMIN_PASS = 'pakaiotak';

test.describe('Chapter Import - Code-only uniqueness', () => {
  test.beforeEach(async ({ page }) => {
    await note('scenario-info', 'Validates that chapter import uses chapter_code as sole unique key. Duplicate chapter_name with different codes should be accepted.');
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_USER, ADMIN_PASS);
  });

  test('duplicate chapter_name with different code succeeds, duplicate code fails', async ({ page }) => {
    const ts = Date.now();

    await step(page, 'navigate to chapter import', async () => {
      await page.goto('/syllabuses/chapters/import');
      await expect(page.locator('form#formUsers')).toBeVisible();
    });

    const filePath = createExcelFile(`chapter-dup-name-${ts}.xlsx`, CHAPTER_HEADERS, [
      chapterRow(`E2E-CH-A-${ts}`, 'E2E Same Name Chapter'),
      chapterRow(`E2E-CH-B-${ts}`, 'E2E Same Name Chapter', { statusLp: 'Inactive', statusTeacher: 'Inactive', statusStudent: 'Inactive' }),
      chapterRow(`E2E-CH-A-${ts}`, 'E2E Duplicate Code Row'),
    ]);

    await step(page, 'select syllabus', async () => {
      await selectSyllabusKSSR(page);
    });

    await step(page, 'select year', async () => {
      await selectSelect2(page, 'year_id', 0);
    });

    await step(page, 'select subject', async () => {
      await selectSelect2(page, 'subject_id', 0);
    });

    await step(page, 'upload excel and submit', async () => {
      await page.setInputFiles('input[name="excel"]', filePath);
      await page.evaluate(() => {
        const form = document.getElementById('formUsers') as HTMLFormElement;
        if (form) form.submit();
      });
      await page.waitForLoadState('networkidle');
    });

    await step(page, 'verify success count is 2', async () => {
      const badge = page.locator('#success-tab .badge, [data-bs-target="#success"] .badge');
      const count = await badge.textContent();
      expect(parseInt(count?.trim() || '0')).toBe(2);
    });

    await step(page, 'verify failed count is 1', async () => {
      const badge = page.locator('#failed-tab .badge, [data-bs-target="#failed"] .badge');
      const count = await badge.textContent();
      expect(parseInt(count?.trim() || '0')).toBe(1);
    });

    await step(page, 'verify failed reason is duplicate code', async () => {
      await page.locator('#failed-tab, [data-bs-target="#failed"]').click();
      await page.waitForTimeout(500);
      const content = await page.locator('#failed').textContent();
      expect(content).toContain('duplicate');
    });

    await note('final-url', page.url());
  });
});
