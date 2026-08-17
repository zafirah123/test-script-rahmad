import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Student "Live Tuition" lesson list: /app/class/view/{slug}/live
 *
 * The rating cell is Blade-rendered (themes/app/views/studentclass/new/live-lesson.blade.php),
 * so the stars are bare <i> elements with no accessible name — the class/id hooks below are
 * the only stable selectors. `data-video-rating` is a deliberate hook, not generated markup.
 */
export class LiveLessonPage {
  readonly page: Page;
  readonly feedbackModal: Locator;
  readonly videoRatingWrapper: Locator;
  readonly videoStars: Locator;
  readonly feedbackInput: Locator;
  readonly submitFeedback: Locator;

  constructor(page: Page) {
    this.page = page;
    this.feedbackModal = page.locator('#feedbackModal');
    this.videoRatingWrapper = page.locator('#video_rating_wrapper');
    this.videoStars = page.locator('.rating__star-video');
    this.feedbackInput = page.locator('#feedback_input');
    this.submitFeedback = page.locator('#submit_feedback');
  }

  async goto(classSlug: string) {
    await this.page.goto(`/app/class/view/${classSlug}/live`);
  }

  /** The interactive star widget for one session, present only when the student may rate. */
  ratingWidget(sessionId: string): Locator {
    return this.page.locator(`.rating.group_${sessionId}`);
  }

  starsFor(sessionId: string): Locator {
    return this.ratingWidget(sessionId).locator('.rating__star');
  }

  /** The rating cell for one session — scoped so the Attendance column's own icon is excluded. */
  ratingCell(sessionId: string): Locator {
    return this.page.locator(`td[data-rating-cell="${sessionId}"]`);
  }

  /** The rating cell's "Not attended" marker, shown when an ended session is not ratable. */
  notAttendedIcon(sessionId: string): Locator {
    return this.ratingCell(sessionId).locator('i.icon-x-circle');
  }

  /** Scoped to the lesson table: Laravel Debugbar injects ~30 other <table> elements. */
  async expectLoaded() {
    await expect(this.page.locator('table.datatable').first()).toBeVisible();
  }

  /** Click the Nth star (1-based) for a session, opening the feedback modal. */
  async openRatingModal(sessionId: string, starPosition: number) {
    await this.starsFor(sessionId).nth(starPosition - 1).click();
    await expect(this.feedbackModal).toBeVisible();
  }

  async pickVideoStar(starPosition: number) {
    await this.videoStars.nth(starPosition - 1).click();
  }
}
