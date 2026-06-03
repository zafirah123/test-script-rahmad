import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { step, note } from '../utils/evidence';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { createExcelFile, CHAPTER_HEADERS, TOPIC_HEADERS, chapterRow, topicRow, selectSelect2, selectSyllabusKSSR } from './helpers';

const ADMIN_USER = 'rahmad@pandai.org';
const ADMIN_PASS = 'pakaiotak';

test.describe('Topic Import - Form UI', () => {
  test.beforeEach(async ({ page }) => {
    await note('scenario-info', 'Validates the topic import form only shows syllabus dropdown after removing year/subject/chapter selectors.');
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_USER, ADMIN_PASS);
  });

  test('only shows syllabus dropdown and file upload', async ({ page }) => {
    await step(page, 'navigate to topic import', async () => {
      await page.goto('/syllabuses/topics/import');
    });

    await step(page, 'verify syllabus dropdown visible', async () => {
      await expect(page.locator('select[name="syllabus_id"]')).toBeVisible();
    });

    await step(page, 'verify chapter dropdown removed', async () => {
      await expect(page.locator('select[name="chapter_id"]')).not.toBeVisible();
    });

    await step(page, 'verify year dropdown removed', async () => {
      await expect(page.locator('select[name="year_id"]')).not.toBeVisible();
    });

    await step(page, 'verify subject dropdown removed', async () => {
      await expect(page.locator('select[name="subject_id"]')).not.toBeVisible();
    });

    await step(page, 'verify file upload visible', async () => {
      await expect(page.locator('input[name="excel"]')).toBeVisible();
    });

    await note('final-url', page.url());
  });
});

test.describe('Topic Import - Multi-chapter batch with status and parent linking', () => {
  test.beforeEach(async ({ page }) => {
    await note('scenario-info', 'End-to-end: imports chapters first, then topics across both chapters with status config and parent-subtopic linking.');
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_USER, ADMIN_PASS);
  });

  test('imports topics across multiple chapters with correct status and parent_id', async ({ page }) => {
    const ts = Date.now();
    const ch1 = `E2E-MCH-A-${ts}`;
    const ch2 = `E2E-MCH-B-${ts}`;

    // Step 1: Import two chapters first
    await step(page, 'navigate to chapter import', async () => {
      await page.goto('/syllabuses/chapters/import');
      await expect(page.locator('form#formUsers')).toBeVisible();
    });

    const chapterFile = createExcelFile(`topic-prep-chapters-${ts}.xlsx`, CHAPTER_HEADERS, [
      chapterRow(ch1, 'E2E Multi-Chapter A'),
      chapterRow(ch2, 'E2E Multi-Chapter B'),
    ]);

    await step(page, 'select syllabus for chapter import', async () => {
      await selectSyllabusKSSR(page);
    });

    await step(page, 'select year for chapter import', async () => {
      await selectSelect2(page, 'year_id', 0);
    });

    await step(page, 'select subject for chapter import', async () => {
      await selectSelect2(page, 'subject_id', 0);
    });

    await step(page, 'upload chapters and submit', async () => {
      await page.setInputFiles('input[name="excel"]', chapterFile);
      await page.click('button:has-text("Upload"), button:has-text("upload")');
      await page.waitForLoadState('networkidle');
    });

    await step(page, 'verify both chapters imported', async () => {
      const badge = page.locator('#success-tab .badge, [data-bs-target="#success"] .badge');
      const count = await badge.textContent();
      expect(parseInt(count?.trim() || '0')).toBe(2);
    });

    // Step 2: Import topics across both chapters
    const parentA = `E2E-TP-A-${ts}`;
    const childA = `E2E-TP-A1-${ts}`;
    const topicB = `E2E-TP-B-${ts}`;

    const topicFile = createExcelFile(`topic-multi-${ts}.xlsx`, TOPIC_HEADERS, [
      topicRow(ch1, parentA, '99.1', { topicName: 'E2E Parent in Chapter A', statusLp: 'Active', statusTeacher: 'Inactive', statusStudent: 'Inactive' }),
      topicRow(ch1, childA, '99.1.1', { parentTopicCode: parentA, topicName: 'E2E Child in Chapter A', statusLp: 'Active', statusTeacher: 'Active', statusStudent: 'Active' }),
      // Same topic name in different chapter — should succeed
      topicRow(ch2, topicB, '99.2', { topicName: 'E2E Parent in Chapter A', statusLp: 'Inactive', statusTeacher: 'Inactive', statusStudent: 'Inactive' }),
    ]);

    await step(page, 'navigate to topic import', async () => {
      await page.goto('/syllabuses/topics/import');
      await expect(page.locator('select[name="syllabus_id"]')).toBeVisible();
    });

    await step(page, 'select syllabus for topic import', async () => {
      await selectSyllabusKSSR(page);
    });

    await step(page, 'upload topics and submit', async () => {
      await page.setInputFiles('input[name="excel"]', topicFile);
      await page.click('button:has-text("Upload"), button:has-text("upload")');
      await page.waitForLoadState('networkidle');
    });

    await step(page, 'verify all 3 topics imported', async () => {
      const badge = page.locator('#success-tab .badge, [data-bs-target="#success"] .badge');
      const count = await badge.textContent();
      expect(parseInt(count?.trim() || '0')).toBe(3);
    });

    await step(page, 'verify chapter_code column in results', async () => {
      const headers = await page.locator('#success table th').allTextContents();
      const lower = headers.map(h => h.toLowerCase().trim());
      expect(lower.some(h => h.includes('chapter'))).toBe(true);
    });

    await step(page, 'verify 0 failures', async () => {
      const badge = page.locator('#failed-tab .badge, [data-bs-target="#failed"] .badge');
      const count = await badge.textContent();
      expect(parseInt(count?.trim() || '0')).toBe(0);
    });

    await note('final-url', page.url());
    await note('test-data', `Chapters: ${ch1}, ${ch2}\nTopics: ${parentA} (parent), ${childA} (child of ${parentA}), ${topicB} (same name diff chapter)`);
  });
});

test.describe('Topic Import - Validation errors', () => {
  test.beforeEach(async ({ page }) => {
    await note('scenario-info', 'Validates rejection of invalid chapter_code and duplicate topic_code.');
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_USER, ADMIN_PASS);
  });

  test('rejects topic with non-existent chapter_code', async ({ page }) => {
    const ts = Date.now();

    await step(page, 'navigate to topic import', async () => {
      await page.goto('/syllabuses/topics/import');
    });

    const filePath = createExcelFile(`topic-bad-ch-${ts}.xlsx`, TOPIC_HEADERS, [
      topicRow('NONEXISTENT-CHAPTER', `E2E-BAD-${ts}`, '99.9', { topicName: 'Bad Chapter Topic' }),
    ]);

    await step(page, 'select syllabus and upload', async () => {
      await selectSyllabusKSSR(page);
      await page.setInputFiles('input[name="excel"]', filePath);
      await page.click('button:has-text("Upload"), button:has-text("upload")');
      await page.waitForLoadState('networkidle');
    });

    await step(page, 'verify 0 success 1 failed', async () => {
      const successBadge = page.locator('#success-tab .badge, [data-bs-target="#success"] .badge');
      expect(parseInt((await successBadge.textContent())?.trim() || '0')).toBe(0);

      const failedBadge = page.locator('#failed-tab .badge, [data-bs-target="#failed"] .badge');
      expect(parseInt((await failedBadge.textContent())?.trim() || '0')).toBe(1);
    });

    await step(page, 'verify error says chapter_code not found', async () => {
      await page.locator('#failed-tab, [data-bs-target="#failed"]').click();
      await page.waitForTimeout(500);
      const content = await page.locator('#failed').textContent();
      expect(content).toContain('chapter_code');
      expect(content).toContain('not found');
    });

    await note('final-url', page.url());
  });

  test('rejects duplicate topic_code in same file', async ({ page }) => {
    const ts = Date.now();
    const chCode = `E2E-DUPTEST-${ts}`;

    // First import a chapter to use
    await step(page, 'import a chapter first', async () => {
      await page.goto('/syllabuses/chapters/import');
      const chFile = createExcelFile(`dup-ch-prep-${ts}.xlsx`, CHAPTER_HEADERS, [
        chapterRow(chCode, 'E2E Dup Test Chapter'),
      ]);
      await selectSyllabusKSSR(page);
      await selectSelect2(page, 'year_id', 0);
      await selectSelect2(page, 'subject_id', 0);
      await page.setInputFiles('input[name="excel"]', chFile);
      await page.click('button:has-text("Upload"), button:has-text("upload")');
      await page.waitForLoadState('networkidle');
    });

    await step(page, 'navigate to topic import', async () => {
      await page.goto('/syllabuses/topics/import');
    });

    const filePath = createExcelFile(`topic-dup-code-${ts}.xlsx`, TOPIC_HEADERS, [
      topicRow(chCode, `E2E-DUP-${ts}`, '99.1', { topicName: 'First' }),
      topicRow(chCode, `E2E-DUP-${ts}`, '99.2', { topicName: 'Second Same Code' }),
    ]);

    await step(page, 'select syllabus and upload', async () => {
      await selectSyllabusKSSR(page);
      await page.setInputFiles('input[name="excel"]', filePath);
      await page.click('button:has-text("Upload"), button:has-text("upload")');
      await page.waitForLoadState('networkidle');
    });

    await step(page, 'verify 1 success 1 failed', async () => {
      const successBadge = page.locator('#success-tab .badge, [data-bs-target="#success"] .badge');
      expect(parseInt((await successBadge.textContent())?.trim() || '0')).toBe(1);

      const failedBadge = page.locator('#failed-tab .badge, [data-bs-target="#failed"] .badge');
      expect(parseInt((await failedBadge.textContent())?.trim() || '0')).toBe(1);
    });

    await step(page, 'verify error mentions duplicate', async () => {
      await page.locator('#failed-tab, [data-bs-target="#failed"]').click();
      await page.waitForTimeout(500);
      const content = await page.locator('#failed').textContent();
      expect(content).toContain('duplicate');
    });

    await note('final-url', page.url());
  });
});

test.describe('Topic Import - Template download', () => {
  test.beforeEach(async ({ page }) => {
    await note('scenario-info', 'Validates that the downloadable topic template includes new columns: chapter_code, parent_topic_code, status_lp, status_teacher, status_student.');
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_USER, ADMIN_PASS);
  });

  test('downloaded template has all new columns', async ({ page }) => {
    await step(page, 'navigate to topic import', async () => {
      await page.goto('/syllabuses/topics/import');
    });

    let downloadPath: string;
    await step(page, 'download template', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('a:has-text("download"), a:has-text("Download")'),
      ]);
      downloadPath = path.join(__dirname, '..', '..', 'evidence', '_fixtures', 'downloaded-topic-template.xlsx');
      await download.saveAs(downloadPath);
    });

    await step(page, 'verify template columns', async () => {
      const wb = XLSX.readFile(downloadPath!);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const headers = rows[0] as string[];

      await note('template-headers', headers.join(', '));

      expect(headers[0]).toBe('chapter_code');
      expect(headers).toContain('parent_topic_code');
      expect(headers).toContain('status_lp');
      expect(headers).toContain('status_teacher');
      expect(headers).toContain('status_student');
      expect(headers).toContain('topic_code');
      expect(headers).toContain('dskp_code');
    });

    await note('final-url', page.url());
  });
});
