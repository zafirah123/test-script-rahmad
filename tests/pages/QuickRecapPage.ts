import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The Quick Recap page for a flashcard deck: /flashcard/recap/<deck-slug>/<topic-code>.
 *
 * Served by FlashCardController::readFlashCard with type='recap' (the `quickRecap`
 * method the route names does not exist; the earlier `flashcard/{type}/...` route
 * matches first). Each question is a pair of radio options; picking one and pressing
 * "Check Answer" reveals the result and advances, until the submit button appears.
 */
export class QuickRecapPage {
  readonly page: Page;
  readonly answerOptions: Locator;
  readonly checkAnswerButton: Locator;
  readonly nextQuestionButton: Locator;
  readonly submitButton: Locator;
  readonly correctCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.answerOptions = page.locator('input[type=radio].answer_radio');
    this.checkAnswerButton = page.locator('.button-save-answer');
    this.nextQuestionButton = page.locator('.button-navigation-question');
    this.submitButton = page.locator('.button-submit-answer');
    this.correctCount = page.locator('.correct_count');
  }

  async goto(deckSlug: string, topicCode: string) {
    await this.page.goto(`/flashcard/recap/${deckSlug}/${topicCode}`, {
      waitUntil: 'domcontentloaded',
    });
  }

  /** True when the page actually served questions rather than bouncing the student. */
  async isServingQuestions(): Promise<boolean> {
    return (await this.answerOptions.count()) > 0;
  }

  async expectQuestionsServed() {
    await expect(this.answerOptions.first()).toBeVisible();
  }

  /**
   * Work through every question: pick the first option, confirm, advance. Stops when
   * the submit button surfaces, which the page only does once all questions are answered.
   */
  async answerAllQuestions(maxQuestions = 40) {
    for (let i = 0; i < maxQuestions; i++) {
      if (await this.submitButton.isVisible()) {
        return;
      }

      const option = this.answerOptions.locator('visible=true').first();
      await option.check({ force: true });
      await this.checkAnswerButton.click();

      // The correct/incorrect swal auto-dismisses after 1.5s. Wait for it to clear
      // rather than sleeping — it overlays the navigation button underneath.
      await this.dialog().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});

      if (await this.nextQuestionButton.isVisible()) {
        await this.nextQuestionButton.click();
      }
    }

    throw new Error(`submit button never appeared after ${maxQuestions} questions`);
  }

  async submit() {
    await this.submitButton.click();
  }

  /** The sweetalert dialog, whatever it is reporting. */
  dialog(): Locator {
    return this.page.locator('.swal2-popup');
  }

  dialogTitle(): Locator {
    return this.page.locator('.swal2-title');
  }

  dialogText(): Locator {
    return this.page.locator('#swal2-html-container, .swal2-html-container');
  }
}
