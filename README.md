# pandai-e2e

End-to-end tests for [pandai.question](../pandai.question) using [Playwright](https://playwright.dev).

## Setup

```bash
npm install
npx playwright install --with-deps chromium
```

Make sure the application is reachable at the host configured in `.env`:

```
BASE_URL=http://pandai.question.test
TEST_USER=baby8
TEST_PASSWORD=123456
```

The `pandai.question.test` host should resolve to your local dev server (e.g. via Laravel Valve / `/etc/hosts`).

## Running

```bash
npm test                 # headless run
npm run test:headed      # headed
npm run test:ui          # interactive UI mode
npm run report           # open last HTML report
```

## Layout

```
tests/
  pages/           Page Object Models
    LoginPage.ts
  auth/
    login.spec.ts  Login scenarios for user baby8
```

## First scenario

`tests/auth/login.spec.ts` covers:

1. The login page renders the email + password form.
2. `baby8 / 123456` can sign in and leaves `/login`.
3. Wrong password keeps the user on `/login`.
