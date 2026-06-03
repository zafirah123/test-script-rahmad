import { expect, type Locator, type Page } from '@playwright/test';

export class QuestionBankFormPage {
  readonly page: Page;
  readonly questionTypeSelect: Locator;
  readonly markByAiTypeSelect: Locator;
  readonly rubricIdSelect: Locator;
  readonly rubricThemeTextarea: Locator;
  readonly rubricInstructionTextarea: Locator;
  readonly rubricFormatTextarea: Locator;
  readonly rubricFieldsWrapper: Locator;
  readonly fullMarksInput: Locator;
  readonly keywordToggle: Locator;
  readonly keywordWrapper: Locator;

  constructor(page: Page) {
    this.page = page;
    this.questionTypeSelect = page.locator('select[name="question_type"]');
    this.markByAiTypeSelect = page.locator('#mark_by_ai_type');
    this.rubricIdSelect = page.locator('#rubric_id');
    this.rubricThemeTextarea = page.locator('#rubric_theme');
    this.rubricInstructionTextarea = page.locator('#rubric_instruction');
    this.rubricFormatTextarea = page.locator('#rubric_format');
    this.rubricFieldsWrapper = page.locator('#ai-rubric-fields');
    this.fullMarksInput = page.locator('input[name="full_marks"]');
    this.keywordToggle = page.locator('#keyword_enabled_toggle');
    this.keywordWrapper = page.locator('#keyword_field_wrapper');
  }

  async goto(subjectSlug: string) {
    await this.page.goto(`/questionbank/add-question/${subjectSlug}`);
  }

  async expectLoaded() {
    await expect(this.questionTypeSelect).toBeVisible();
  }

  // Selects in this form are wrapped by Select2 and bound to AngularJS via ng-model.
  // Playwright's native selectOption() can fail because Select2 hides the underlying
  // <select>. Set value + dispatch change directly to satisfy both Angular and Select2.
  private async setSelectValue(selector: string, value: string) {
    await this.page.evaluate(
      ({ selector, value }) => {
        const el = document.querySelector<HTMLSelectElement>(selector);
        if (!el) throw new Error(`select not found: ${selector}`);
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        // Notify Select2 if attached
        if ((window as any).jQuery) {
          (window as any).jQuery(el).trigger('change');
        }
      },
      { selector, value },
    );
  }

  async selectQuestionType(type: 'radio' | 'blanks' | 'numbers') {
    await this.setSelectValue('select[name="question_type"]', type);
  }

  async selectMarkByAiType(mode: '' | 'marking_schemes' | 'rubric' | 'math_grader') {
    await this.setSelectValue('#mark_by_ai_type', mode);
  }
}
