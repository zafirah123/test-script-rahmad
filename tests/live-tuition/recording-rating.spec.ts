import { expect, test } from '@playwright/test';
import { LiveLessonPage } from '../pages/LiveLessonPage';
import { LoginPage } from '../pages/LoginPage';
import { note, step } from '../utils/evidence';

/**
 * Issue #37 — students who missed a Live Tuition session can rate it from the recording.
 *
 * Fixtures are LOCAL dev-database values (pandai.question.test). Override via env when
 * running elsewhere. The chosen student must start with NO class_attendances row for the
 * session, otherwise the "before watching" assertion is meaningless — see README note.
 */
const USER = process.env.LT_USER ?? 'arianagrande';
const PASSWORD = process.env.LT_PASSWORD ?? '123456';
const CLASS_SLUG = process.env.LT_CLASS_SLUG ?? '7515a5f7e1dc49dc7a4a3538c8fcfc669c98484a';
const SESSION_ID = process.env.LT_SESSION_ID ?? '5443';
const RECORDING_VIDEO = process.env.LT_VIDEO ?? 'kkpnoi-cioihv_1690199768530.mp4';
/** A second ended session the same student DID attend live (needs a live_at attendance row). */
const LIVE_SESSION_ID = process.env.LT_LIVE_SESSION_ID ?? '5421';

test.describe('Live Tuition - rate a session from its recording', () => {
  test.beforeEach(async () => {
    await note(
      'scenario-info',
      [
        'Issue #37 — allow students who missed the live session to rate it.',
        '',
        `Student:  ${USER} (premium, enrolled, did NOT attend this session live)`,
        `Class:    ${CLASS_SLUG}`,
        `Session:  ${SESSION_ID} (ended, recording published through our own /play page)`,
        `Video:    ${RECORDING_VIDEO}`,
        '',
        'Given the student never attended the session live and never watched the recording,',
        'When they open the recording and return to the Live Tuition lesson list,',
        'Then the rating widget becomes available and asks video quality as a second dimension.',
      ].join('\n'),
    );
  });

  test('watching the recording unlocks the rating, including the video-quality question', async ({ page }) => {
    const login = new LoginPage(page);
    const live = new LiveLessonPage(page);

    await step(page, 'open sign-in page', async () => {
      await login.goto();
      await login.expectLoaded();
    });

    await step(page, 'sign in as the student', async () => {
      await login.login(USER, PASSWORD);
      await page.waitForURL(/\/app\//, { timeout: 30_000 });
    });

    await step(page, 'open the Live Tuition lesson list', async () => {
      await live.goto(CLASS_SLUG);
      await live.expectLoaded();
    });

    await step(page, 'before watching: no rating offered for this session', async () => {
      await expect(live.starsFor(SESSION_ID)).toHaveCount(0);
      await expect(live.notAttendedIcon(SESSION_ID)).toBeVisible();
    });

    await note(
      'before-watching',
      'No interactive stars for the session, and the "Not attended" marker is visible.\n' +
        'Before this change the cell rendered empty (the icon carried d-none), so the student\n' +
        'had no explanation for the missing rating.',
    );

    await step(page, 'open the recording in our player', async () => {
      await page.goto(`/play/${RECORDING_VIDEO}`);
    });

    await step(page, 'player offers the rating prompt once watch time passes', async () => {
      // Server-side gating: present in the DOM means eligible. It stays hidden until the
      // watch threshold (RECORDING_RATING_PROMPT_AFTER_SECONDS) elapses during playback.
      await expect(page.locator('#recording-rating')).toBeAttached();
      await expect(page.locator('#recording-rating')).toBeHidden();
    });

    await step(page, 'return to the lesson list — rating is now offered', async () => {
      await live.goto(CLASS_SLUG);
      await live.expectLoaded();
      await expect(live.starsFor(SESSION_ID)).toHaveCount(5);
    });

    await step(page, 'the widget is flagged as an asynchronous rater', async () => {
      await expect(live.ratingWidget(SESSION_ID)).toHaveAttribute('data-video-rating', '1');
    });

    await step(page, 'open the rating modal on 4 stars', async () => {
      await live.openRatingModal(SESSION_ID, 4);
    });

    await step(page, 'the video-quality question is asked', async () => {
      await expect(live.videoRatingWrapper).toBeVisible();
      await expect(live.videoStars).toHaveCount(5);
    });

    await step(page, 'rate video quality and add feedback', async () => {
      await live.pickVideoStar(3);
      await live.feedbackInput.fill('Watched the recording — audio was a little quiet.');
    });

    await step(page, 'submit the rating', async () => {
      await live.submitFeedback.click();
      await expect(page.locator('.swal-modal, .sweet-alert')).toBeVisible({ timeout: 15_000 });
    });

    await note('final-url', page.url());
  });

  test('a live attendee keeps the one-tap flow with no video-quality question', async ({ page }) => {
    const login = new LoginPage(page);
    const live = new LiveLessonPage(page);

    await note(
      'scenario-info',
      [
        'The live rating flow must be unchanged by issue #37.',
        '',
        `Student:  ${USER}`,
        `Session:  ${LIVE_SESSION_ID} (ended, student HAS a live_at attendance row)`,
        '',
        'Given the student attended this session live,',
        'When they open the rating modal,',
        'Then the video-quality question is not asked — one star, one tap, as before.',
      ].join('\n'),
    );

    await step(page, 'sign in as the student', async () => {
      await login.goto();
      await login.login(USER, PASSWORD);
      await page.waitForURL(/\/app\//, { timeout: 30_000 });
    });

    await step(page, 'open the Live Tuition lesson list', async () => {
      await live.goto(CLASS_SLUG);
      await live.expectLoaded();
    });

    await step(page, 'the live attendee is offered the rating', async () => {
      await expect(live.starsFor(LIVE_SESSION_ID)).toHaveCount(5);
    });

    await step(page, 'the widget carries no async flag', async () => {
      await expect(live.ratingWidget(LIVE_SESSION_ID)).not.toHaveAttribute('data-video-rating', '1');
    });

    await step(page, 'the modal asks the overall star only', async () => {
      await live.openRatingModal(LIVE_SESSION_ID, 5);
      await expect(live.videoRatingWrapper).toBeHidden();
    });

    await note('final-url', page.url());
  });
});
