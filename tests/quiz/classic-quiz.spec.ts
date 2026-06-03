import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { step, note } from '../utils/evidence';

const USER = process.env.QUIZ_USER ?? 'dayanaamirah2020';
const PASSWORD = process.env.QUIZ_PASSWORD ?? '82COMPUTERpong';
const SUBJECT = process.env.QUIZ_SUBJECT ?? 'English';

test.describe('Classic Quiz (Web)', () => {
  test.setTimeout(5 * 60 * 1000);

  test.beforeEach(async ({}, testInfo) => {
    await note(
      'scenario-info',
      [
        `Title:     ${testInfo.title}`,
        `User:      ${USER}`,
        `Subject:   ${SUBJECT}`,
        `Base URL:  ${process.env.BASE_URL ?? '(default)'}`,
        `Started:   ${new Date().toISOString()}`,
      ].join('\n'),
    );
  });

  test('end-to-end classic quiz flow', async ({ page }) => {
    const login = new LoginPage(page);

    // 1. Go to website ------------------------------------------------------
    await step(page, '1 open website', async () => {
      await login.goto();
      await login.expectLoaded();
    });

    // 2. Login --------------------------------------------------------------
    await step(page, '2 login with credentials', async () => {
      await login.login(USER, PASSWORD);
      await page.waitForURL((url) => !/sign-in/.test(url.pathname), { timeout: 30_000 });
      await expect(page).not.toHaveURL(/sign-in/);
    });
    await note('dashboard-url', page.url());

    // 3. Navigate to Quiz page ---------------------------------------------
    await step(page, '3 navigate to quiz page', async () => {
      // /app/quizzes/ is the classic quiz listing showing subject cards with
      // "Answer Quiz" links. /app/quiz is the new-UI dashboard without them.
      await page.goto('/app/quizzes/');
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await expect(page).toHaveURL(/\/app\/quizzes/);
    });

    // 4. Select subject ----------------------------------------------------
    await step(page, '4 select subject and click answer quiz', async () => {
      // Each subject card contains a subject pill label (e.g. "English") and
      // an "Answer Quiz" link on the right with a chevron icon.
      const subjectPill = page
        .getByText(new RegExp(`^\\s*${SUBJECT}\\s*$`, 'i'))
        .filter({ visible: true })
        .first();
      await subjectPill.waitFor({ state: 'visible', timeout: 30_000 });
      await subjectPill.scrollIntoViewIfNeeded();

      // Find the smallest ancestor card that also contains the "Answer Quiz" link.
      const card = subjectPill.locator(
        'xpath=ancestor::*[.//*[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "answer quiz")]][1]',
      );
      const answerQuiz = card
        .getByRole('link', { name: /answer quiz/i })
        .or(card.getByRole('button', { name: /answer quiz/i }))
        .first();
      await answerQuiz.scrollIntoViewIfNeeded();
      await answerQuiz.click({ force: true });
      await page.waitForLoadState('networkidle').catch(() => undefined);
    });

    // 5. Quiz entry — click Start on the first active quiz card ------------
    await step(page, '5 click start on first active quiz card', async () => {
      const start = page
        .getByRole('button', { name: /^\s*start\s*$/i })
        .or(page.getByRole('link', { name: /^\s*start\s*$/i }))
        .first();
      await start.waitFor({ state: 'visible', timeout: 30_000 });
      await start.scrollIntoViewIfNeeded();
      await start.click({ force: true });
      await page.waitForLoadState('networkidle').catch(() => undefined);
    });

    // 6. Quiz interaction — select option + Save Answer (Q1) ---------------
    await step(page, '6 select option and save answer (q1)', async () => {
      // If the question was already answered in a prior session, there will be
      // no enabled radio / Save Answer — just a Next button. In that case,
      // record the state and move on; step 7 will continue from here.
      const enabledRadio = page.locator('input[type="radio"]:not(:disabled)').first();
      const save = page.getByRole('button', { name: /save answer/i }).first();

      if (!(await save.isVisible({ timeout: 5_000 }).catch(() => false))) {
        return; // Already answered; nothing to save on this question.
      }

      if (await enabledRadio.isVisible().catch(() => false)) {
        await enabledRadio.check({ force: true });
      }
      await save.scrollIntoViewIfNeeded();
      await save.click({ force: true });
      await page.waitForLoadState('networkidle').catch(() => undefined);
    });

    // 7. Quiz navigation — click Next through remaining questions ----------
    await step(page, '7 advance through questions with next', async () => {
      const submitAnswer = page.getByRole('button', { name: /submit answer/i });
      const next = page
        .getByRole('button', { name: /next/i })
        .or(page.getByRole('link', { name: /next/i }))
        .filter({ hasNotText: /answer next quiz/i });
      const save = page.getByRole('button', { name: /save answer/i });

      const popup = page.locator('.swal2-popup, .swal2-container, .modal.show, [role="dialog"]');

      const waitForPopupGone = async () => {
        await popup.first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
      };

      for (let i = 0; i < 30; i++) {
        if (await submitAnswer.first().isVisible().catch(() => false)) break;

        await waitForPopupGone();

        if (await next.first().isVisible().catch(() => false)) {
          await next.first().scrollIntoViewIfNeeded().catch(() => undefined);
          await next.first().click({ force: true });
          await page.waitForLoadState('networkidle').catch(() => undefined);
        }

        if (await submitAnswer.first().isVisible().catch(() => false)) break;

        const radio = page.locator('input[type="radio"]:not(:disabled)').first();
        if (await radio.isVisible().catch(() => false)) {
          await radio.check({ force: true }).catch(() => undefined);
        }
        await waitForPopupGone();
        if (await save.first().isVisible().catch(() => false)) {
          await save.first().scrollIntoViewIfNeeded().catch(() => undefined);
          await save.first().click({ force: true });
          await page.waitForLoadState('networkidle').catch(() => undefined);
        }
      }
      await waitForPopupGone();
      await expect(submitAnswer.first()).toBeVisible({ timeout: 30_000 });
    });

    // 8. Submit final answer -----------------------------------------------
    await step(page, '8 submit answer on final question', async () => {
      // Make sure the feedback popup from the previous question is gone before
      // submitting — it can swallow the click.
      await page
        .locator('.swal2-popup, .swal2-container, .modal.show, [role="dialog"]')
        .first()
        .waitFor({ state: 'hidden', timeout: 10_000 })
        .catch(() => undefined);

      const submitAnswer = page.getByRole('button', { name: /submit answer/i }).first();
      await submitAnswer.scrollIntoViewIfNeeded();

      // Retry the submit a few times — the click sometimes lands while the
      // feedback overlay is still fading out, in which case the page does not
      // transition. We re-click until "Answer Next Quiz" appears.
      const resultSignal = page
        .getByRole('button', { name: /answer next quiz/i })
        .or(page.getByRole('link', { name: /answer next quiz/i }))
        .or(page.getByRole('heading', { name: /result|complete|score|finish|summary/i }))
        .or(page.getByText(/your score|quiz completed|results|finished|congratulation|successfully completed/i))
        .first();

      for (let attempt = 0; attempt < 4; attempt++) {
        if (await resultSignal.isVisible().catch(() => false)) break;
        if (await submitAnswer.isVisible().catch(() => false)) {
          await submitAnswer.click({ force: true });
        }
        // Auto-accept any "Are you sure?" confirm modal.
        const confirmYes = page
          .locator('.swal2-confirm, .modal.show .btn-primary, [role="dialog"] button')
          .filter({ hasText: /^\s*(yes|ok|confirm|submit)/i })
          .first();
        if (await confirmYes.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await confirmYes.click({ force: true });
        }
        await page.waitForLoadState('networkidle').catch(() => undefined);
        await page.waitForTimeout(1500);
      }

      await expect(resultSignal).toBeVisible({ timeout: 15_000 });
    });

    // 9. Click "Answer Next Quiz" -----------------------------------------
    await step(page, '9 click answer next quiz', async () => {
      const next = page
        .getByRole('button', { name: /answer next quiz/i })
        .or(page.getByRole('link', { name: /answer next quiz/i }))
        .first();
      await next.waitFor({ state: 'visible', timeout: 30_000 });
      await next.scrollIntoViewIfNeeded();
      await next.click({ force: true });

      // A confirmation modal may pop up. If it does, fine; if not, this step
      // simply records the click and step 10 will try to confirm or proceed.
      const yes = page
        .getByRole('button', { name: /^\s*yes/i })
        .or(page.locator('.swal2-confirm'))
        .first();
      await yes.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
    });

    // 10. Confirm with "Yes!" ---------------------------------------------
    await step(page, '10 confirm yes to load next quiz', async () => {
      const yes = page
        .getByRole('button', { name: /^\s*yes/i })
        .or(page.locator('.swal2-confirm'))
        .first();
      if (await yes.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await yes.click({ force: true });
      }
      await page.waitForLoadState('networkidle').catch(() => undefined);

      // Expect the next quiz to load — a fresh question or Start button appears.
      const freshQuiz = page
        .getByRole('button', { name: /^\s*start\s*$/i })
        .or(page.locator('input[type="radio"]'))
        .or(page.getByRole('button', { name: /save answer/i }))
        .first();
      await expect(freshQuiz).toBeVisible({ timeout: 30_000 });
    });

    await note('final-url', page.url());
  });
});
