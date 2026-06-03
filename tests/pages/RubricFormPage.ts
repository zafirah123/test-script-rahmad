import { expect, type Locator, type Page } from '@playwright/test';

export class RubricFormPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly titleL2Input: Locator;
  readonly syllabusSelect: Locator;
  readonly subjectSelect: Locator;
  readonly statusSelect: Locator;
  readonly additionalDetails: Locator;
  readonly addCriteriaBtn: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.locator('input[name="title"]');
    this.titleL2Input = page.locator('input[name="title_l2"]');
    this.syllabusSelect = page.locator('select[name="syllabus_id"]');
    this.subjectSelect = page.locator('select[name="subject_id"]');
    this.statusSelect = page.locator('select[name="status"]');
    this.additionalDetails = page.locator('textarea[name="additional_details"]');
    this.addCriteriaBtn = page.locator('#add-criteria');
    this.submitButton = page.locator('#rubric-form button[type="submit"]');
  }

  async expectLoaded() {
    await expect(this.titleInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async fillHeader(opts: {
    title: string;
    titleL2: string;
    additionalDetails: string;
    status?: string;
  }) {
    await this.titleInput.fill(opts.title);
    await this.titleL2Input.fill(opts.titleL2);
    await this.additionalDetails.fill(opts.additionalDetails);

    // All three selects are Select2-wrapped. Use jQuery's .val(...).trigger('change')
    // (the documented Select2 API for programmatic value changes).
    const setVal = async (selector: string, value?: string) =>
      this.page.evaluate(
        ({ sel, val }) => {
          const $ = (window as any).jQuery;
          if (!$) throw new Error('jQuery not loaded');
          const $el = $(sel);
          let target = val;
          if (!target) {
            const el = document.querySelector<HTMLSelectElement>(sel);
            const opt = Array.from(el?.options ?? []).find((o) => o.value !== '');
            if (!opt) throw new Error(`no options for ${sel}`);
            target = opt.value;
          }
          $el.val(target).trigger('change');
        },
        { sel: selector, val: value },
      );

    await setVal('select[name="syllabus_id"]');
    // Wait for the AJAX-loaded subject options to arrive (loading… → real list)
    await this.page.waitForFunction(
      () => {
        const s = document.querySelector<HTMLSelectElement>('select[name="subject_id"]');
        if (!s || s.disabled) return false;
        // ignore loading placeholder option
        const opts = Array.from(s.options).filter((o) => o.value !== '' && !/loading/i.test(o.textContent ?? ''));
        return opts.length > 0;
      },
      { timeout: 15_000 },
    );
    await setVal('select[name="subject_id"]');
    await setVal('select[name="status"]', opts.status ?? 'submitted');
  }

  async fillFirstCriterion(opts: {
    title: string;
    titleL2: string;
    scoreTitle: string;
    scoreTitleL2: string;
    scoreMin: string;
    scoreMax: string;
    descriptor: string;
    descriptorL2: string;
  }) {
    const block = this.page.locator('.criterion-block').first();
    await block.locator('input[name$="[title]"]').first().fill(opts.title);
    await block.locator('input[name$="[title_l2]"]').first().fill(opts.titleL2);

    const score = block.locator('.score-row').first();
    await score.locator('input[name$="[score_title]"]').fill(opts.scoreTitle);
    await score.locator('input[name$="[score_title_l2]"]').fill(opts.scoreTitleL2);
    await score.locator('input[name$="[score_min]"]').fill(opts.scoreMin);
    await score.locator('input[name$="[score_max]"]').fill(opts.scoreMax);
    await score.locator('textarea[name$="[additional_details]"]').fill(opts.descriptor);
    await score.locator('textarea[name$="[additional_details_l2]"]').fill(opts.descriptorL2);
  }

  async submit() {
    await this.submitButton.click();
  }
}
