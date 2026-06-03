# CLAUDE.md — pandai-e2e

Guidance for Claude Code when working in this repository.

## Project

End-to-end test suite for **pandai.question** (Laravel app) using **Playwright + TypeScript**.

- Application source: `../pandai.question`
- Target host: `https://pandai.question.test` (local dev, HTTPS, self-signed → `ignoreHTTPSErrors: true`)
- Real login URL: `/app/sign-in` (NOT `/login` — that route renders a legacy/unused form)
- Default test user: `baby8 / 123456` (from `.env`)

## Repository layout

```
pandai-e2e/
├── CLAUDE.md                  ← this file
├── README.md                  ← human-facing quickstart
├── playwright.config.ts       ← always-on screenshot/video/trace, evidence/ output
├── .env / .env.example        ← BASE_URL, TEST_USER, TEST_PASSWORD
├── tests/
│   ├── pages/                 ← Page Object Models (one class per page)
│   ├── utils/
│   │   └── evidence.ts        ← step() + note() helpers
│   ├── auth/                  ← auth scenarios
│   └── <feature>/             ← one folder per feature area
├── scripts/
│   └── compile-evidence.ts    ← walks evidence/ → writes evidence/REPORT.md
└── evidence/                  ← gitignored, generated each run
    ├── <suite>/<test>/        ← per-step PNGs + notes
    ├── _artifacts/<test>/     ← video.webm, trace.zip
    ├── html-report/           ← Playwright HTML report
    ├── results.json           ← machine-readable run results
    └── REPORT.md              ← compiled markdown report (all scenarios)
```

## Authoring workflow (scenario → test → evidence → report)

For every new feature scenario, follow this loop:

### 1. Describe the scenario

Pick a feature folder under `tests/` (create one if it doesn't exist). Name the spec file by feature, e.g. `tests/quiz/start-quiz.spec.ts`.

State the scenario as: **Given / When / Then** in the `test.describe` and `test` titles. The titles become section headers in the compiled report — make them readable.

```ts
test.describe('Quiz - Start quiz flow', () => {
  test('logged-in user can start a quiz from the dashboard', async ({ page }) => { ... });
});
```

### 2. Write the test using POMs + `step()`

- Reuse or add a Page Object in `tests/pages/`. Locate by ARIA role / accessible name first, then `name=`/`id=` as fallback. Avoid CSS classes from Angular templates — they change.
- Wrap every meaningful user action in `step(page, 'label', async () => { ... })` from `tests/utils/evidence.ts`. Each step:
  - shows up as a `test.step` in the trace
  - writes `NN-<label>.png` (numbered, full-page) into `evidence/<suite>/<test>/`
  - attaches the same image into the HTML report
- Use `note('label', text)` to record context (final URL, IDs, computed values) into both the evidence folder and the report.
- Start each test with the `scenario-info` `note()` in a `beforeEach` if the suite needs it — see `tests/auth/login.spec.ts` for the pattern.

### 3. Run + capture evidence

```bash
npm test                              # all specs
npx playwright test tests/<area>      # one area
npx playwright test -g "<title>"      # one scenario by title
```

The config has `screenshot: 'on'`, `video: 'on'`, `trace: 'on'` — every run produces full evidence. Do not change these to `*-on-failure` without asking the user; capturing always is the point.

### 4. Compile the report

```bash
npm run report:compile     # writes evidence/REPORT.md from evidence/results.json
npm run report             # opens the HTML report
```

`scripts/compile-evidence.ts` reads `evidence/results.json`, walks each test's evidence folder, and emits a single markdown file with one section per scenario: status, duration, the `scenario-info` note, every step screenshot inline, and the `final-url` note if present.

Commit the spec file. **Do not commit `evidence/`** (it is gitignored — regenerated each run).

## Conventions

- **One spec per scenario family.** Group related tests (happy path + a couple of negatives) in the same file under one `test.describe`.
- **Selectors:** `getByRole`, `getByLabel`, `getByPlaceholder`. Fall back to `[name=...]`/`#id` only if no accessible name exists. Never rely on Angular-generated classes (`ng-pristine`, etc.).
- **Waits:** prefer `waitForURL` / web-first assertions (`expect(locator).toBeVisible()`) over `waitForTimeout`. The one `waitForTimeout` in the invalid-login test is a deliberate "give server a chance to reject" — replace it with a real signal as soon as one exists (toast, error text).
- **Data:** read credentials and IDs from `.env`. Never hardcode secrets in specs.
- **Idempotency:** tests must be runnable in any order, in parallel. If a scenario mutates state, restore it (logout, delete created resource) in `afterEach`.

## Useful commands

```bash
npm install                              # first-time setup
npx playwright install chromium          # browser binaries
npm test                                 # headless run, full evidence
npm run test:headed                      # see the browser
npm run test:ui                          # Playwright UI mode
npm run test:debug                       # step debugger
npm run report                           # open evidence/html-report
npm run report:compile                   # regenerate evidence/REPORT.md
npm run codegen                          # record a new flow
```

## When adding a brand-new feature area

1. `mkdir tests/<feature>` and add the first spec.
2. Add the Page Object under `tests/pages/<Feature>Page.ts`.
3. Run the spec, open `evidence/<suite>/<test>/` and visually verify the screenshots.
4. Run `npm run report:compile` and check `evidence/REPORT.md` renders the new section cleanly.
5. Ask the user before adding new top-level config (workers, projects, global setup) — defaults are intentional.

## Things to avoid

- Don't downgrade artifact capture to `*-on-failure`. Evidence is a deliverable.
- Don't add waits with magic numbers larger than 2s; investigate the missing signal instead.
- Don't write helpers that hide assertions (`loginAndAssertSuccess`) — assertions belong in the spec so the report shows what was checked.
- Don't create per-test markdown files. The single `evidence/REPORT.md` is the deliverable.
