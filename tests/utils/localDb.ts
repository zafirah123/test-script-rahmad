import { execFileSync } from 'child_process';
import * as path from 'path';

const APP_DIR = process.env.APP_DIR ?? path.resolve(__dirname, '..', '..', '..', 'pandai.question');

/**
 * True only when the run targets a local Herd host. Any DB reset must be gated on this —
 * the helper reaches into the LOCAL application database, which would be the wrong
 * database entirely when BASE_URL points at dev/staging.
 */
export function isLocalTarget(): boolean {
  const base = process.env.BASE_URL ?? 'http://pandai.question.test';
  return /^https?:\/\/[^/]+\.test(\/|$|:)/.test(base);
}

/**
 * Run a snippet of PHP through the application's artisan tinker. Local only.
 * Throws on non-zero exit so a silent failed reset cannot masquerade as a clean fixture.
 */
export function tinker(php: string): string {
  if (!isLocalTarget()) {
    throw new Error(`Refusing to touch the local database while BASE_URL is ${process.env.BASE_URL}`);
  }

  return execFileSync('php', ['artisan', 'tinker', '--execute', php], {
    cwd: APP_DIR,
    encoding: 'utf8',
    timeout: 60_000,
  });
}

/**
 * Drop a student's attendance row for one session, restoring the "never attended, never
 * watched" state the recording-rating scenario starts from.
 */
export function resetSessionAttendance(userId: string | number, sessionId: string | number): void {
  tinker(
    `\\Illuminate\\Support\\Facades\\DB::table('class_attendances')` +
      `->where('user_id', ${Number(userId)})` +
      `->where('tutor_class_id', ${Number(sessionId)})->delete();` +
      `\\App\\Models\\TutorClass::where('id', ${Number(sessionId)})->update(['rating' => null]);`,
  );
}

/**
 * Ensure a student has a live-attendance row for one session (and no rating), so the
 * "live attendee keeps the one-tap flow" scenario has something to assert against.
 */
export function ensureLiveAttendance(
  userId: string | number,
  classId: string | number,
  sessionId: string | number,
): void {
  tinker(
    `\\App\\Models\\ClassAttendance::unguarded(function () {` +
      `\\App\\Models\\ClassAttendance::updateOrCreate(` +
      `['user_id' => ${Number(userId)}, 'tutor_class_id' => ${Number(sessionId)}],` +
      `['class_id' => ${Number(classId)}, 'type' => 'student', 'live_at' => '2025-03-10 10:05:00',` +
      ` 'duration' => 55, 'rating' => null, 'video_rating' => null, 'feedback' => null]` +
      `); });`,
  );
}
