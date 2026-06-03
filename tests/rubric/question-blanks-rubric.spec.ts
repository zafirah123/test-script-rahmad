import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { QuestionBankFormPage } from '../pages/QuestionBankFormPage';
import { step, note } from '../utils/evidence';

const USER = process.env.ADMIN_USER ?? 'owner';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '123456';
const SUBJECT_SLUG = process.env.QB_SUBJECT_SLUG ?? 'mathematics';

test.describe('Question Bank - AI Rubric integration on `blanks`', () => {
  test.beforeEach(async ({}, testInfo) => {
    await note(
      'scenario-info',
      [
        `Title:        ${testInfo.title}`,
        `User:         ${USER}`,
        `Subject slug: ${SUBJECT_SLUG}`,
        `Base URL:     ${process.env.BASE_URL ?? '(default)'}`,
        `Started:      ${new Date().toISOString()}`,
      ].join('\n'),
    );
  });

  test('blanks question shows AI mode select, rubric picker populates, fields toggle visibility', async ({ page }) => {
    const login = new LoginPage(page);
    const form = new QuestionBankFormPage(page);

    await step(page, 'log in as admin', async () => {
      await login.goto();
      await login.expectLoaded();
      await login.login(USER, PASSWORD);
      await page.waitForURL((url) => !/sign-in/.test(url.pathname), { timeout: 15_000 });
    });

    await step(page, 'open Create Question page', async () => {
      await form.goto(SUBJECT_SLUG);
      await form.expectLoaded();
    });

    await step(page, 'verify Section dividers A/B/C/D are present', async () => {
      await expect(page.locator('.question-form-section.section-a')).toBeVisible();
      await expect(page.locator('.question-form-section.section-b')).toBeVisible();
      // C and D may live below the fold but exist in the DOM
      await expect(page.locator('.question-form-section.section-c')).toHaveCount(1);
      await expect(page.locator('.question-form-section.section-d')).toHaveCount(1);
    });

    await step(page, 'verify Keyword toggle is present', async () => {
      await expect(form.keywordToggle).toBeVisible();
    });

    await step(page, 'select Subjective - Fill in text (blanks)', async () => {
      await form.selectQuestionType('blanks');
      // give Angular a tick to render the AI marking block
      await page.waitForTimeout(500);
    });

    await step(page, 'verify Full Marks + AI mode dropdown appear under Subjective', async () => {
      await expect(form.fullMarksInput).toBeVisible();
      await expect(form.markByAiTypeSelect).toBeVisible();
      const values = await form.markByAiTypeSelect.locator('option').evaluateAll(
        (els) => els.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
      );
      expect(values).toEqual(expect.arrayContaining(['marking_schemes', 'rubric', 'math_grader']));
    });

    await step(page, 'rubric sub-form is hidden initially', async () => {
      await expect(form.rubricFieldsWrapper).toHaveCSS('display', 'none');
    });

    await step(page, 'select AI Rubric mode', async () => {
      await form.selectMarkByAiType('rubric');
      await page.waitForTimeout(300);
    });

    await step(page, 'rubric sub-form becomes visible', async () => {
      await expect(form.rubricFieldsWrapper).not.toHaveCSS('display', 'none');
      await expect(form.rubricThemeTextarea).toBeVisible();
      await expect(form.rubricInstructionTextarea).toBeVisible();
      await expect(form.rubricFormatTextarea).toBeVisible();
    });

    await step(page, 'rubric picker is populated from /rubrics/options', async () => {
      // wait for the AJAX response to populate the dropdown
      await expect.poll(async () => form.rubricIdSelect.locator('option').count(), {
        timeout: 5_000,
      }).toBeGreaterThan(1);
    });

    await step(page, 'verify helper text is shown', async () => {
      await expect(page.getByText(/Additional information for the AI/i)).toBeVisible();
    });

    await note('final-url', page.url());
  });

  test('Mark by AI is hidden for MCQ (radio) and visible for Subjective (blanks)', async ({ page }) => {
    const login = new LoginPage(page);
    const form = new QuestionBankFormPage(page);

    await step(page, 'log in', async () => {
      await login.goto();
      await login.login(USER, PASSWORD);
      await page.waitForURL((url) => !/sign-in/.test(url.pathname), { timeout: 15_000 });
    });

    await step(page, 'open Create Question', async () => {
      await form.goto(SUBJECT_SLUG);
      await form.expectLoaded();
    });

    await step(page, 'pick MCQ - Single Answer (radio): Mark by AI block hidden', async () => {
      await form.selectQuestionType('radio');
      await page.waitForTimeout(300);
      await expect(form.markByAiTypeSelect).toBeHidden();
    });

    await step(page, 'switch to Subjective (blanks): Mark by AI block appears', async () => {
      await form.selectQuestionType('blanks');
      await page.waitForTimeout(300);
      await expect(form.markByAiTypeSelect).toBeVisible();
    });

    await step(page, 'select AI Rubric and confirm Essay fields render with renamed labels', async () => {
      await form.selectMarkByAiType('rubric');
      await page.waitForTimeout(300);
      await expect(form.rubricFieldsWrapper).not.toHaveCSS('display', 'none');
      await expect(page.getByText('Rubric Selection', { exact: false }).first()).toBeVisible();
      await expect(page.getByText('Essay Theme', { exact: false }).first()).toBeVisible();
      await expect(page.getByText('Essay Keyword', { exact: false }).first()).toBeVisible();
      await expect(page.getByText('Essay Format', { exact: false }).first()).toBeVisible();
    });

    await note('final-url', page.url());
  });

  test('in-memory preservation: switching modes keeps rubric values', async ({ page }) => {
    const login = new LoginPage(page);
    const form = new QuestionBankFormPage(page);

    await step(page, 'log in', async () => {
      await login.goto();
      await login.login(USER, PASSWORD);
      await page.waitForURL((url) => !/sign-in/.test(url.pathname), { timeout: 15_000 });
    });

    await step(page, 'open Create Question and pick blanks', async () => {
      await form.goto(SUBJECT_SLUG);
      await form.expectLoaded();
      await form.selectQuestionType('blanks');
      await page.waitForTimeout(500);
      await expect(form.markByAiTypeSelect).toBeVisible();
    });

    await step(page, 'select AI Rubric and fill the three fields', async () => {
      await form.selectMarkByAiType('rubric');
      await page.waitForTimeout(300);
      await expect(form.rubricFieldsWrapper).not.toHaveCSS('display', 'none');
      // wait for picker options
      await expect.poll(async () => form.rubricIdSelect.locator('option').count(), {
        timeout: 5_000,
      }).toBeGreaterThan(1);
      await form.rubricIdSelect.selectOption({ index: 1 });
      await form.rubricThemeTextarea.fill('Sample theme');
      await form.rubricInstructionTextarea.fill('Sample instruction');
      await form.rubricFormatTextarea.fill('Sample format');
    });

    await step(page, 'switch to AI Marking Schemes — rubric fields hide', async () => {
      await form.selectMarkByAiType('marking_schemes');
      await page.waitForTimeout(200);
      await expect(form.rubricFieldsWrapper).toHaveCSS('display', 'none');
    });

    await step(page, 'switch back to AI Rubric — values restored from memory', async () => {
      await form.selectMarkByAiType('rubric');
      await page.waitForTimeout(200);
      await expect(form.rubricFieldsWrapper).not.toHaveCSS('display', 'none');
      await expect(form.rubricThemeTextarea).toHaveValue('Sample theme');
      await expect(form.rubricInstructionTextarea).toHaveValue('Sample instruction');
      await expect(form.rubricFormatTextarea).toHaveValue('Sample format');
      const selected = await form.rubricIdSelect.evaluate((el: HTMLSelectElement) => el.value);
      expect(selected).not.toBe('');
    });

    await note('final-url', page.url());
  });
});
