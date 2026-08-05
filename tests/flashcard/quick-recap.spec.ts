import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { QuickRecapPage } from '../pages/QuickRecapPage';
import { step, note } from '../utils/evidence';

/**
 * Issue 5545 — "unable to submit but appear in calendar".
 *
 * A student who had already completed a Quick Recap was still served the whole deck.
 * The spaced-repetition schedule was enforced only at submit time, so the rejection
 * ("Anda telah melengkapkan latihan ini") landed after every question was answered —
 * and the popup carried no title, because the endpoint returned no `message` key.
 *
 * This walks the production sequence: complete a recap, then immediately try again.
 */

const USER = process.env.TEST_USER ?? 'baby8';
const PASSWORD = process.env.TEST_PASSWORD ?? '123456';

// baby8 owns a spaced-repetition row for this deck on the local database.
const DECK_SLUG = process.env.RECAP_DECK_SLUG ?? 'adjective-of-age-1646727261';
const TOPIC_CODE = process.env.RECAP_TOPIC_CODE ?? 'KSSR-2022-Y1-BI-03-01';

test.describe('Flashcard - Quick Recap schedule gate', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await note(
      'scenario-info',
      [
        `Title:     ${testInfo.title}`,
        `User:      ${USER}`,
        `Deck:      ${DECK_SLUG}`,
        `Topic:     ${TOPIC_CODE}`,
        `Base URL:  ${process.env.BASE_URL ?? '(default)'}`,
        `Started:   ${new Date().toISOString()}`,
      ].join('\n'),
    );

    const login = new LoginPage(page);
    await login.goto();
    await login.expectLoaded();
    await login.login(USER, PASSWORD);
    await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 30_000 });
  });

  /**
   * The regression itself. Whether the recap starts open or already locked, the student
   * must never be handed a set of questions they will only be refused for answering.
   */
  test('a completed recap is refused up front, not after every question', async ({ page }) => {
    test.setTimeout(180_000); // completing a 20-question deck is slower than the default
    const recap = new QuickRecapPage(page);

    await step(page, 'open quick recap', async () => {
      await recap.goto(DECK_SLUG, TOPIC_CODE);
    });

    const servedQuestions = await recap.isServingQuestions();
    await note('initial-state', servedQuestions ? 'recap was open — completing it first' : 'recap already locked');

    if (servedQuestions) {
      await step(page, 'answer every question', async () => {
        await recap.answerAllQuestions();
      });

      await step(page, 'submit the recap', async () => {
        await recap.submit();
        await expect(recap.dialog()).toBeVisible({ timeout: 30_000 });
      });

      await step(page, 'dismiss the result and leave', async () => {
        await page.keyboard.press('Enter');
        await page.waitForLoadState('domcontentloaded');
      });
    }

    await step(page, 'reopen the same recap', async () => {
      await recap.goto(DECK_SLUG, TOPIC_CODE);
    });

    await note('final-url', page.url());

    await step(page, 'verify no questions are served', async () => {
      expect(
        await recap.isServingQuestions(),
        'a locked recap must not serve questions — that is the reported bug',
      ).toBe(false);
    });
  });

  /**
   * The refusal has to say when to come back. Before the fix the endpoint returned only
   * `errors`, so the view's `new Swal(res.message, ...)` rendered an undefined title.
   */
  test('the refusal names a date instead of showing an untitled popup', async ({ page }) => {
    test.setTimeout(180_000);
    const recap = new QuickRecapPage(page);

    await step(page, 'open quick recap', async () => {
      await recap.goto(DECK_SLUG, TOPIC_CODE);
    });

    if (await recap.isServingQuestions()) {
      await step(page, 'complete the recap to lock it', async () => {
        await recap.answerAllQuestions();
        await recap.submit();
        await expect(recap.dialog()).toBeVisible({ timeout: 30_000 });
        await page.keyboard.press('Enter');
        await page.waitForLoadState('domcontentloaded');
      });
    }

    await step(page, 'reopen and read the refusal', async () => {
      await recap.goto(DECK_SLUG, TOPIC_CODE);
    });

    const body = await page.locator('body').innerText();
    await note('refusal-text', body.slice(0, 1200));

    await step(page, 'verify a month is named', async () => {
      expect(
        body,
        'the student must be told when the recap reopens, not just that it is closed',
      ).toMatch(/\b\d{1,2}\s+(jan|feb|mac|mar|apr|mei|may|jun|jul|ogo|aug|sep|okt|oct|nov|dis|dec)/i);
    });
  });
});
