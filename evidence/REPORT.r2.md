# E2E Test Report — pandai.question

- **Generated:** 2026-05-21T02:47:54.652Z
- **Run started:** 2026-05-21T02:47:11.404Z
- **Total duration:** 42.87 s
- **Passed:** 4 · **Failed:** 0 · **Flaky:** 0 · **Skipped:** 0

## Scenarios

| # | Scenario | Status | Duration |
|---|----------|--------|----------|
| 1 | [Authentication - Login — login page renders the form](#1-login-page-renders-the-form) | ✅ passed | 1.53 s |
| 2 | [Authentication - Login — user baby8 can log in with valid credentials](#2-user-baby8-can-log-in-with-valid-credentials) | ✅ passed | 6.91 s |
| 3 | [Authentication - Login — invalid credentials keep the user on the sign-in page](#3-invalid-credentials-keep-the-user-on-the-sign-in-page) | ✅ passed | 4.12 s |
| 4 | [Classic Quiz (Web) — end-to-end classic quiz flow](#4-end-to-end-classic-quiz-flow) | ✅ passed | 41.49 s |

## <a id="1-login-page-renders-the-form"></a>1. login page renders the form

- **Suite:** Authentication - Login
- **Status:** ✅ passed
- **Duration:** 1.53 s
- **Started:** 2026-05-21T02:47:11.716Z
- **Source:** `auth/login.spec.ts:21`

### Scenario info

```
Title:     login page renders the form
User:      dayanaamirah2020
Base URL:  https://app.pandai.org
Started:   2026-05-21T02:47:11.734Z
```

### Steps

**01 · open sign in page**

![01 · open sign in page](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/login-page-renders-the-form/01-open-sign-in-page.png)

**02 · verify form is visible**

![02 · verify form is visible](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/login-page-renders-the-form/02-verify-form-is-visible.png)

---

## <a id="2-user-baby8-can-log-in-with-valid-credentials"></a>2. user baby8 can log in with valid credentials

- **Suite:** Authentication - Login
- **Status:** ✅ passed
- **Duration:** 6.91 s
- **Started:** 2026-05-21T02:47:11.729Z
- **Source:** `auth/login.spec.ts:33`

### Scenario info

```
Title:     user baby8 can log in with valid credentials
User:      dayanaamirah2020
Base URL:  https://app.pandai.org
Started:   2026-05-21T02:47:11.746Z
```

### Steps

**01 · open sign in page**

![01 · open sign in page](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/user-baby8-can-log-in-with-valid-credentials/01-open-sign-in-page.png)

**02 · fill credentials**

![02 · fill credentials](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/user-baby8-can-log-in-with-valid-credentials/02-fill-credentials.png)

**03 · submit login form**

![03 · submit login form](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/user-baby8-can-log-in-with-valid-credentials/03-submit-login-form.png)

**04 · landed on authenticated page**

![04 · landed on authenticated page](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/user-baby8-can-log-in-with-valid-credentials/04-landed-on-authenticated-page.png)

**Final URL:** `https://app.pandai.org/app/home`

---

## <a id="3-invalid-credentials-keep-the-user-on-the-sign-in-page"></a>3. invalid credentials keep the user on the sign-in page

- **Suite:** Authentication - Login
- **Status:** ✅ passed
- **Duration:** 4.12 s
- **Started:** 2026-05-21T02:47:11.712Z
- **Source:** `auth/login.spec.ts:58`

### Scenario info

```
Title:     invalid credentials keep the user on the sign-in page
User:      dayanaamirah2020
Base URL:  https://app.pandai.org
Started:   2026-05-21T02:47:11.729Z
```

### Steps

**01 · open sign in page**

![01 · open sign in page](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/invalid-credentials-keep-the-user-on-the-sign-in-page/01-open-sign-in-page.png)

**02 · fill wrong credentials**

![02 · fill wrong credentials](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/invalid-credentials-keep-the-user-on-the-sign-in-page/02-fill-wrong-credentials.png)

**03 · submit login form**

![03 · submit login form](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/invalid-credentials-keep-the-user-on-the-sign-in-page/03-submit-login-form.png)

**04 · still on sign in page**

![04 · still on sign in page](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/authentication-login/invalid-credentials-keep-the-user-on-the-sign-in-page/04-still-on-sign-in-page.png)

**Final URL:** `https://app.pandai.org/app/sign-in`

---

## <a id="4-end-to-end-classic-quiz-flow"></a>4. end-to-end classic quiz flow

- **Suite:** Classic Quiz (Web)
- **Status:** ✅ passed
- **Duration:** 41.49 s
- **Started:** 2026-05-21T02:47:11.717Z
- **Source:** `quiz/classic-quiz.spec.ts:25`

### Scenario info

```
Title:     end-to-end classic quiz flow
User:      dayanaamirah2020
Subject:   English
Base URL:  https://app.pandai.org
Started:   2026-05-21T02:47:11.737Z
```

### Steps

**01 · 1 open website**

![01 · 1 open website](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/01-1-open-website.png)

**02 · 2 login with credentials**

![02 · 2 login with credentials](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/02-2-login-with-credentials.png)

**03 · 3 navigate to quiz page**

![03 · 3 navigate to quiz page](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/03-3-navigate-to-quiz-page.png)

**04 · 4 select subject and click answer quiz**

![04 · 4 select subject and click answer quiz](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/04-4-select-subject-and-click-answer-quiz.png)

**05 · 5 click start on first active quiz card**

![05 · 5 click start on first active quiz card](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/05-5-click-start-on-first-active-quiz-card.png)

**06 · 6 select option and save answer q1**

![06 · 6 select option and save answer q1](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/06-6-select-option-and-save-answer-q1.png)

**07 · 7 advance through questions with next**

![07 · 7 advance through questions with next](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/07-7-advance-through-questions-with-next.png)

**08 · 8 submit answer on final question**

![08 · 8 submit answer on final question](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/08-8-submit-answer-on-final-question.png)

**09 · 9 click answer next quiz**

![09 · 9 click answer next quiz](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/09-9-click-answer-next-quiz.png)

**10 · 10 confirm yes to load next quiz**

![10 · 10 confirm yes to load next quiz](https://storage.dinoza.store/pandai-e2e/2026-05-21T03-11-50-705Z/classic-quiz-web/end-to-end-classic-quiz-flow/10-10-confirm-yes-to-load-next-quiz.png)

**Final URL:** `https://app.pandai.org/app/quiz/take/my-kssm-f1-bi-20210106?type=new&button=start&submitted=1`

---
