import { expect, test } from '@playwright/test';
import { LiveLessonPage } from '../pages/LiveLessonPage';
import { LoginPage } from '../pages/LoginPage';
import { note, step } from '../utils/evidence';
import { ensureLiveAttendance, isLocalTarget, resetSessionAttendance } from '../utils/localDb';

/**
 * Issue #37 — students who missed a Live Tuition session can rate it once a recording exists.
 *
 * Fixtures are LOCAL dev-database values (pandai.question.test); override via env to run
 * elsewhere. Each scenario reseeds the attendance rows it depends on, so the suite is
 * repeatable — see tests/utils/localDb.ts.
 */
const USER = process.env.LT_USER ?? 'arianagrande';
const PASSWORD = process.env.LT_PASSWORD ?? '123456';
const CLASS_SLUG = process.env.LT_CLASS_SLUG ?? '7515a5f7e1dc49dc7a4a3538c8fcfc669c98484a';
const SESSION_ID = process.env.LT_SESSION_ID ?? '5443';
const RECORDING_VIDEO = process.env.LT_VIDEO ?? 'kkpnoi-cioihv_1690199768530.mp4';
/** A second ended session the same student DID attend live (needs a live_at attendance row). */
const LIVE_SESSION_ID = process.env.LT_LIVE_SESSION_ID ?? '5421';
const USER_ID = process.env.LT_USER_ID ?? '380704';
const CLASS_ID = process.env.LT_CLASS_ID ?? '2363';
/** An ended session in the same class with recording_url NULL — nothing to rate. */
const NO_RECORDING_SESSION_ID = process.env.LT_NO_RECORDING_SESSION_ID ?? '5688';

test.describe('Live Tuition - rate a session from its recording', () => {
  // Both scenarios write to class_attendances, so each restores its own starting state.
  // Local only: the fixtures are rows in the local application database.
  test.skip(!isLocalTarget(), 'local-only: reseeds rows in the local application database');

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
        'Given the student never attended the session live,',
        'When they open the Live Tuition lesson list and a recording is published,',
        'Then the rating widget is available immediately and asks video quality as a second',
        'dimension — watching the recording first is not required (issue #37 acceptance criterion).',
      ].join('\n'),
    );
  });

  test('a student who missed the live lesson can rate it because a recording exists', async ({ page }) => {
    const login = new LoginPage(page);
    const live = new LiveLessonPage(page);

    // Back to "never attended, never watched" — a previous run leaves watch_at and a rating,
    // which would make the "before watching" assertions pass for the wrong reason.
    resetSessionAttendance(USER_ID, SESSION_ID);

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

    await step(page, 'the rating is offered straight away — no watching required', async () => {
      // The acceptance criterion: a student who missed the live lesson can click the rating
      // button. A published recording is enough; watch_at is never consulted.
      await expect(live.starsFor(SESSION_ID)).toHaveCount(5);
      await expect(live.notAttendedIcon(SESSION_ID)).toHaveCount(0);
    });

    await step(page, 'the widget is flagged as an asynchronous rater', async () => {
      await expect(live.ratingWidget(SESSION_ID)).toHaveAttribute('data-video-rating', '1');
    });

    await step(page, 'the recording player also offers a prompt', async () => {
      await page.goto(`/play/${RECORDING_VIDEO}`);
      // Present in the DOM means the server deemed the viewer eligible; it stays hidden
      // until RECORDING_RATING_PROMPT_AFTER_SECONDS of playback elapses.
      await expect(page.locator('#recording-rating')).toBeAttached();
      await expect(page.locator('#recording-rating')).toBeHidden();
    });

    await step(page, 'back to the lesson list', async () => {
      await live.goto(CLASS_SLUG);
      await live.expectLoaded();
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

    // A live_at row with no rating — otherwise there is nothing to open the modal on.
    ensureLiveAttendance(USER_ID, CLASS_ID, LIVE_SESSION_ID);

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

  test('an ended session with no recording stays unratable for a non-attendee', async ({ page }) => {
    const login = new LoginPage(page);
    const live = new LiveLessonPage(page);

    await note(
      'scenario-info',
      [
        'The rule still has a floor: no recording and no live attendance means nothing to rate.',
        '',
        `Student:  ${USER} (did not attend)`,
        `Session:  ${NO_RECORDING_SESSION_ID} (ended, recording_url is NULL)`,
        '',
        'Given the session has ended but no recording was ever published,',
        'When the student opens the Live Tuition lesson list,',
        'Then no rating widget is offered for that session.',
      ].join('\n'),
    );

    resetSessionAttendance(USER_ID, NO_RECORDING_SESSION_ID);

    await step(page, 'sign in as the student', async () => {
      await login.goto();
      await login.login(USER, PASSWORD);
      await page.waitForURL(/\/app\//, { timeout: 30_000 });
    });

    await step(page, 'open the Live Tuition lesson list', async () => {
      await live.goto(CLASS_SLUG);
      await live.expectLoaded();
    });

    await step(page, 'no rating widget for the session without a recording', async () => {
      await expect(live.ratingCell(NO_RECORDING_SESSION_ID)).toHaveCount(1);
      await expect(live.starsFor(NO_RECORDING_SESSION_ID)).toHaveCount(0);
    });

    await note('final-url', page.url());
  });
});
